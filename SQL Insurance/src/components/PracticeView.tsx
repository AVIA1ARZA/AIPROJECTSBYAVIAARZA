import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  generateInsuranceQuestion,
  gradeSqlQuery,
  simulateSqlExecution,
  Question,
  GradeResult,
  ExecutionResult,
  UserProfile,
  analyzeUserQuestion,
  generateQuestionVariations,
  analyzeSqlPerformance,
  SQLPerformanceAnalysis,
} from "../services/geminiService";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../context/LanguageContext";
import {
  Play,
  Database,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  Lightbulb,
  Send,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Download,
  FileSpreadsheet,
  PlusCircle,
  MessageSquarePlus,
  BookOpen,
  Target,
  Zap,
  Gauge,
  X,
  Check,
  Code,
  Terminal,
  GitCompare,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import Markdown from "react-markdown";
import { InteractiveText } from "./InteractiveText";
import { SqlDictionaryPanel } from "./SqlDictionaryPanel";
import { FollowUpChat } from "./FollowUpChat";
import { cn, formatSql, extractTextFromChildren } from "../lib/utils";
import { extractCTEs } from "../lib/sqlParser";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import {
  sql,
  PostgreSQL,
  MySQL,
  MSSQL,
  StandardSQL,
} from "@codemirror/lang-sql";
import { completeFromList } from "@codemirror/autocomplete";
import { INSURANCE_SCHEMA } from "../constants";
import {
  db,
  auth,
  handleFirestoreError,
  OperationType,
  saveUserQuestion,
  saveUserProfile,
  saveOrUpdateBestAttempt,
  saveSpecificSessionAttempt,
  PerformanceAnalysisData,
  UserQuestion,
  CompletedQuestion,
  DBModel,
  saveTip,
  getAccessToken,
  loginWithGoogle,
} from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { getUnderPracticedTopics } from "../lib/topicAnalysis";
import { Bookmark, BookmarkCheck } from "lucide-react";

// Prepare common functions for autocomplete
const COMMON_SQL_FUNCTIONS = [
  "SUM",
  "AVG",
  "COUNT",
  "MIN",
  "MAX",
  "DATEDIFF",
  "DATEADD",
  "GETDATE",
  "YEAR",
  "MONTH",
  "DAY",
  "COALESCE",
  "NULLIF",
  "CAST",
  "CONVERT",
  "UPPER",
  "LOWER",
  "LEN",
  "SUBSTRING",
  "REPLACE",
  "ROUND",
  "ABS",
  "CURRENT_TIMESTAMP",
  "NOW",
  "DATE",
  "EXTRACT",
];

export interface AdaptiveMetrics {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  expertSolved: number;
  determinedDifficulty: "Easy" | "Medium" | "Hard" | "Expert";
}

export function evaluateAdaptiveMetrics(completedQuestions: CompletedQuestion[]): AdaptiveMetrics {
  const correctCompleted = completedQuestions.filter(q => q.isCorrect);
  const totalSolved = correctCompleted.length;
  const easySolved = correctCompleted.filter(q => q.difficulty === "Easy" || q.difficulty === "קל").length;
  const mediumSolved = correctCompleted.filter(q => q.difficulty === "Medium" || q.difficulty === "בינוני").length;
  const hardSolved = correctCompleted.filter(q => q.difficulty === "Hard" || q.difficulty === "קשה").length;
  const expertSolved = correctCompleted.filter(q => q.difficulty === "Expert" || q.difficulty === "מומחה").length;

  let determinedDifficulty: "Easy" | "Medium" | "Hard" | "Expert" = "Easy";

  if (totalSolved === 0) {
    determinedDifficulty = "Easy";
  } else if (easySolved < 3) {
    determinedDifficulty = "Easy";
  } else if (mediumSolved < 3) {
    determinedDifficulty = "Medium";
  } else if (hardSolved < 3) {
    determinedDifficulty = "Hard";
  } else {
    determinedDifficulty = "Expert";
  }

  return {
    totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    expertSolved,
    determinedDifficulty
  };
}

interface PracticeViewProps {
  onComplete: () => void;
  history?: string[];
  completedQuestions?: CompletedQuestion[];
  targetedTopic?: string | null;
  targetedDifficulty?: "Easy" | "Medium" | "Hard" | "Expert" | "Adaptive" | null;
  onClearTargetedTopic?: () => void;
  userProfile?: UserProfile | null;
  performanceAnalysis?: PerformanceAnalysisData | null;
  userQuestions?: UserQuestion[];
  onStartTargetedPractice?: (
    topic: string,
    difficulty?: "Easy" | "Medium" | "Hard" | "Expert" | "Adaptive",
  ) => void;
  activeSchema?: DBModel;
  initialQuestion?: Question | null;
  onClearInitialQuestion?: () => void;
}

const CODE_MIRROR_SETUP = {
  lineNumbers: true,
  foldGutter: true,
  highlightActiveLine: true,
};

const SqlCodeEditor = React.forwardRef<
  ReactCodeMirrorRef,
  {
    initialValue: string;
    onChange: (value: string) => void;
    editorExtensions: any[];
    basicSetup: any;
    isHe: boolean;
    setIsEditorFocused: (focused: boolean) => void;
    setIsQuestionExpanded: (expanded: boolean) => void;
  }
>(
  (
    {
      initialValue,
      onChange,
      editorExtensions,
      basicSetup,
      isHe,
      setIsEditorFocused,
      setIsQuestionExpanded,
    },
    ref,
  ) => {
    const [localVal, setLocalVal] = useState(initialValue);
    const debounceTimerRef = useRef<any>(null);

    // Sync with initialValue changes (when question changes / draft is loaded)
    useEffect(() => {
      setLocalVal(initialValue);
    }, [initialValue]);

    // Clean up timer on unmount
    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    const handleLocalChange = (val: string) => {
      setLocalVal(val);

      // Keep parent in sync: if transitioning from empty to non-empty (or vice-versa),
      // update instantly so that tool action buttons disable/enable state responds in real-time.
      const parentEmpty = !initialValue.trim();
      const localEmpty = !val.trim();
      if (parentEmpty !== localEmpty) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        onChange(val);
        return;
      }

      // Otherwise, debounce updates by 350ms to prevent heavy parent re-renders while typing
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onChange(val);
      }, 350);
    };

    const flushChange = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      onChange(localVal);
    };

    return (
      <CodeMirror
        ref={ref}
        value={localVal}
        height="100%"
        theme="dark"
        extensions={editorExtensions}
        onChange={handleLocalChange}
        onFocus={() => {
          setIsEditorFocused(true);
          if (window.innerWidth < 768) {
            setIsQuestionExpanded(true);
          }
        }}
        onBlur={() => {
          flushChange();
          setIsEditorFocused(false);
        }}
        placeholder={
          isHe
            ? "-- כתוב את השאילתה שלך כאן..."
            : "-- Write your SQL query here..."
        }
        className="h-full text-sm font-mono text-left ltr"
        basicSetup={basicSetup}
      />
    );
  },
);

SqlCodeEditor.displayName = "SqlCodeEditor";

export const PracticeView: React.FC<PracticeViewProps> = ({
  onComplete,
  history = [],
  completedQuestions = [],
  targetedTopic,
  targetedDifficulty,
  onClearTargetedTopic,
  userProfile,
  performanceAnalysis,
  userQuestions = [],
  onStartTargetedPractice,
  activeSchema,
  initialQuestion,
  onClearInitialQuestion,
}) => {
  const { isHe, language } = useLanguage();
  const [question, setQuestion] = useState<Question | null>(null);
  const [userSql, setUserSql] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [executionResult, setExecutionResult] =
    useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    "Easy" | "Medium" | "Hard" | "Expert" | "Adaptive"
  >("Easy");
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isQuestionExpanded, setIsQuestionExpanded] = useState(true);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [isSqlEditorCollapsed, setIsSqlEditorCollapsed] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [isExportingToSheets, setIsExportingToSheets] = useState(false);

  const handleExportGoogleSheets = async () => {
    if (!executionResult || executionResult.isError) return;
    
    setIsExportingToSheets(true);
    try {
      let token = getAccessToken();
      
      // If no token, we might need to re-login to get one
      if (!token) {
        const confirmLogin = window.confirm(
          isHe 
          ? "נדרשת התחברות לחשבון Google כדי לייצא ל-Sheets. האם להתחבר?" 
          : "Google login is required to export to Sheets. Sign in?"
        );
        if (!confirmLogin) {
          setIsExportingToSheets(false);
          return;
        }
        await loginWithGoogle();
        token = getAccessToken();
      }

      if (!token) {
        throw new Error(isHe ? "לא ניתן היה לקבל הרשאה לייצוא." : "Failed to get authorization for export.");
      }

      // Create a new spreadsheet
      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            title: `SQL Export - ${activeSchema.name} - ${new Date().toLocaleDateString()}`,
          },
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to create spreadsheet');
      }
      
      const spreadsheet = await createResponse.json();
      const spreadsheetId = spreadsheet.spreadsheetId;
      const sheetName = spreadsheet.sheets[0].properties.title;

      // Prepare data
      const values = [
        executionResult.columns,
        ...executionResult.rows.map(row => row.map(cell => cell === null ? 'NULL' : cell))
      ];

      // Update values
      const updateResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values,
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to update spreadsheet cells');
      }

      // Open in new tab
      window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
      
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || (isHe ? 'שגיאה בייצוא ל-Google Sheets' : 'Error exporting to Google Sheets'));
    } finally {
      setIsExportingToSheets(false);
    }
  };
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hintsShownCount, setHintsShownCount] = useState(0);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bestAttempt, setBestAttempt] = useState<{
    sql: string;
    result: GradeResult;
  } | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showQuestionChat, setShowQuestionChat] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(() => {
    const saved = localStorage.getItem("sql_show_recommendations");
    return saved !== null ? saved === "true" : true;
  });
  const [tabletActivePanel, setTabletActivePanel] = useState<'both' | 'editor' | 'question'>('both');
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const processedInitialQuestionIdRef = useRef<string | null>(null);
  const lastActiveSchemaIdRef = useRef<string | null>(null);

  const adaptiveMetrics = useMemo(() => {
    return evaluateAdaptiveMetrics(completedQuestions);
  }, [completedQuestions]);

  const currentCompletedInfo = useMemo(() => {
    if (!submissionId || !completedQuestions) return null;
    return completedQuestions.find((cq) => cq.id === submissionId) || null;
  }, [submissionId, completedQuestions]);

  const [currentSessionDocId, setCurrentSessionDocId] = useState<string | null>(null);
  const [showPrevQuery, setShowPrevQuery] = useState(false);

  const [sessionStartTime, setSessionStartTime] = useState(new Date());

  useEffect(() => {
    setSessionStartTime(new Date());
  }, [question?.id]);

  const previousAttempts = useMemo(() => {
    if (!question || !completedQuestions) return [];
    
    // Filter matches and ensure they are strictly from BEFORE this session started
    const matches = completedQuestions.filter((cq) => {
      const isMatch = cq.questionId === question.id || cq.questionTitle === question.title;
      if (!isMatch) return false;
      
      const cqTs = cq.timestamp as any;
      if (!cqTs) return false;
      
      const cqDate = cqTs.toDate ? cqTs.toDate() : new Date(cqTs);
      return cqDate < sessionStartTime;
    });
    return matches;
  }, [question, completedQuestions, sessionStartTime]);

  const bestPreviousAttempt = useMemo(() => {
    if (previousAttempts.length === 0) return null;
    return [...previousAttempts].reduce((best, cur) => (cur.score > best.score ? cur : best), previousAttempts[0]);
  }, [previousAttempts]);

  const [isAnalyzingPerformance, setIsAnalyzingPerformance] = useState(false);
  const [performanceAnalysisResult, setPerformanceAnalysisResult] = useState<SQLPerformanceAnalysis | null>(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showSchemaInPanel, setShowSchemaInPanel] = useState(false);
  const [outputViewMode, setOutputViewMode] = useState<'table' | 'json'>('table');
  const [savedTipsIds, setSavedTipsIds] = useState<Set<string>>(new Set());

  const handleSaveToMaterials = async (text: string, category: string = 'general') => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      await saveTip(
        auth.currentUser.uid, 
        text, 
        category,
        question?.id,
        question?.title,
        'practice_question'
      );
      setSavedTipsIds(prev => {
        const next = new Set(prev);
        next.add(text);
        return next;
      });
    } catch (err) {
      console.error("Error saving tip:", err);
      setError("חלה שגיאה בשמירת החומר הלימודי.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    localStorage.setItem(
      "sql_show_recommendations",
      showRecommendations.toString(),
    );
  }, [showRecommendations]);

  useEffect(() => {
    if (targetedDifficulty) {
      setSelectedDifficulty(targetedDifficulty);
    }
  }, [targetedDifficulty]);

  // Load draft when question changes
  useEffect(() => {
    if (question) {
      const savedDraft = localStorage.getItem(`sql_draft_${question.id}`);
      if (savedDraft) {
        setUserSql(savedDraft);
      } else {
        setUserSql("");
      }
    } else {
      setUserSql("");
    }
  }, [question?.id]);

  useEffect(() => {
    setCurrentSessionDocId(null);
    setShowPrevQuery(false);
  }, [question?.id]);

  // Save draft whenever SQL changes
  useEffect(() => {
    if (question && userSql.trim()) {
      localStorage.setItem(`sql_draft_${question.id}`, userSql);
    }
  }, [userSql, question?.id]);

  // Dynamic SQL Schema for autocomplete (stable during typing)
  const sqlSchema = useMemo(() => {
    const schema: Record<string, string[]> = {};

    // Add active schema or base schema
    const targetTables = activeSchema?.tables || INSURANCE_SCHEMA;
    targetTables.forEach((table) => {
      schema[table.name] = table.columns.map((col) => col.name);
    });

    // Add custom columns from user profile (for elementary insurance schema)
    if (activeSchema?.id === "insurance" && userProfile?.customSchema) {
      userProfile.customSchema.forEach((col) => {
        if (!schema[col.table]) {
          schema[col.table] = [];
        }
        if (!schema[col.table].includes(col.name)) {
          schema[col.table].push(col.name);
        }
      });
    }

    return schema;
  }, [activeSchema?.id, userProfile?.customSchema]);

  // Memoized CodeMirror extensions to prevent re-instantiation on every render/keystroke
  const editorExtensions = useMemo(() => {
    return [
      sql({
        schema: sqlSchema,
        upperCaseKeywords: true,
        dialect: PostgreSQL,
      }),
      PostgreSQL.language.data.of({
        autocomplete: completeFromList(
          COMMON_SQL_FUNCTIONS.map((f) => ({
            label: f,
            type: "function",
            boost: 1,
          })),
        ),
      }),
      EditorView.theme({
        "&": {
          backgroundColor: "#0B0F19",
          color: "#E2E8F0",
        },
        ".cm-content": {
          caretColor: "#D4FF00",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "14px",
        },
        ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#D4FF00" },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "#D4FF0033" },
        ".cm-activeLine": { backgroundColor: "#D4FF0008" },
        ".cm-gutters": {
          backgroundColor: "#0B0F19",
          color: "#475569",
          border: "none",
        },
        ".cm-activeLineGutter": { backgroundColor: "#D4FF0008", color: "#D4FF00" },
      }, { dark: true }),
    ];
  }, [sqlSchema]);

  const fetchNewQuestion = async (
    diff?: "Easy" | "Medium" | "Hard" | "Expert" | "Adaptive",
    useFallback = false,
    topic?: string,
  ) => {
    // Clear previous question and draft when explicitly moving to a new folder
    localStorage.removeItem("sql_active_question");
    if (question) {
      localStorage.removeItem(`sql_draft_${question.id}`);
    }

    setIsGenerating(true);
    setSubmissionId(null);
    setError(null);
    setResult(null);
    setBestAttempt(null);
    setShowChat(false);
    setShowQuestionChat(false);
    setUserSql("");
    setShowSolution(false);
    setExecutionResult(null);
    setShowOutput(false);
    setAttempts(0);
    setHintsShownCount(0);
    setIsQuestionExpanded(true);
    try {
      const activeDiff = diff || selectedDifficulty;
      let calculatedMetrics = undefined;
      if (activeDiff === "Adaptive") {
        calculatedMetrics = evaluateAdaptiveMetrics(completedQuestions);
      }

      const q = await generateInsuranceQuestion(
        activeDiff,
        history,
        useFallback,
        topic || targetedTopic || undefined,
        userProfile,
        userQuestions,
        activeSchema?.tables,
        language,
        calculatedMetrics,
      );
      setQuestion(q);
      // Save newly generated question as active
      localStorage.setItem("sql_active_question", JSON.stringify(q));
    } catch (err: any) {
      console.error("Error generating question:", err);
      const errorMsg = err.message || "";
      if (errorMsg === "GOOGLE_LOAD_ERROR") {
        setError(
          "שרתי ה-AI של גוגל עמוסים כרגע. המערכת תנסה שוב באופן אוטומטי בעוד מספר רגעים.",
        );
      } else if (errorMsg === "MISSING_API_KEY") {
        setError("מפתח ה-API חסר. אנא הגדר אותו בלשונית Secrets.");
      } else {
        setError("אירעה שגיאה בייצור השאלה. אנא נסה שוב.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const schemaChanged = lastActiveSchemaIdRef.current !== null && lastActiveSchemaIdRef.current !== activeSchema?.id;
    lastActiveSchemaIdRef.current = activeSchema?.id || null;

    if (initialQuestion) {
      if (processedInitialQuestionIdRef.current === initialQuestion.id) {
        return;
      }
      processedInitialQuestionIdRef.current = initialQuestion.id;

      setQuestion(initialQuestion);
      localStorage.setItem("sql_active_question", JSON.stringify(initialQuestion));
      setSubmissionId(null);
      setError(null);
      setResult(null);
      setBestAttempt(null);
      setShowChat(false);
      setShowQuestionChat(false);
      setUserSql("");
      setShowSolution(false);
      setExecutionResult(null);
      setShowOutput(false);
      setAttempts(0);
      setHintsShownCount(0);
      setIsQuestionExpanded(true);
      onClearInitialQuestion?.();
      return;
    }

    if (schemaChanged) {
      // Clear current question and generate a new one specifically for the new schema
      localStorage.removeItem("sql_active_question");
      fetchNewQuestion();
      return;
    }

    const savedQuestion = localStorage.getItem("sql_active_question");
    if (savedQuestion && !targetedTopic) {
      try {
        const parsedQuestion = JSON.parse(savedQuestion);
        // Only trigger update if the question reference/id is actually different
        if (!question || question.id !== parsedQuestion.id) {
          setQuestion(parsedQuestion);
        }
      } catch (e) {
        console.error("Error parsing saved question", e);
        fetchNewQuestion();
      }
    } else if (!question) {
      // Only fetch a new question if we do not already have one
      fetchNewQuestion();
    }
  }, [activeSchema?.id, targetedTopic, initialQuestion]);

  const handleGrade = async () => {
    if (!question || !userSql.trim() || attempts >= 3 || result?.score === 100)
      return;
    setIsGrading(true);
    setError(null);
    try {
      const res = await gradeSqlQuery(
        userSql,
        question,
        userProfile,
        activeSchema?.tables,
        language,
      );
      setResult(res);
      setAttempts((prev) => prev + 1);

      // Auto-save this attempt to get a submissionId for possible chat
      if (auth.currentUser) {
        try {
          const sId = await saveSpecificSessionAttempt(auth.currentUser.uid, currentSessionDocId, {
            questionId: question.id,
            questionTitle: question.title,
            questionDescription: question.description,
            difficulty: question.difficulty,
            correctSql: question.correctSql,
            userSql: userSql,
            score: res.score,
            isCorrect: res.isCorrect,
            explanation: res.explanation,
            role: userProfile?.role || null,
            department: userProfile?.department || null,
          });
          setSubmissionId(sId);
          setCurrentSessionDocId(sId);
        } catch (error) {
          console.error("Error auto-saving attempt:", error);
        }
      }

      // Track best attempt for final saving
      if (!bestAttempt || res.score > bestAttempt.result.score) {
        setBestAttempt({ sql: userSql, result: res });
      }
    } catch (err: any) {
      console.error("Error grading query:", err);
      const errorMsg = err.message || "";
      if (errorMsg === "GOOGLE_LOAD_ERROR") {
        setError("שרתי ה-AI עמוסים כרגע. המערכת תבצע בדיקה בסיסית בלבד.");
      } else {
        setError("אירעה שגיאה בבדיקת השאילתה. אנא נסה שוב.");
      }
    } finally {
      setIsGrading(false);
    }
  };

  const handleComplete = async () => {
    if (question && auth.currentUser) {
      onComplete();
      if (question) {
        localStorage.removeItem(`sql_draft_${question.id}`);
      }
      localStorage.removeItem("sql_active_question");
      fetchNewQuestion();
    }
  };

  const handlePerformanceAnalysis = async () => {
    if (!userSql.trim()) return;
    setIsAnalyzingPerformance(true);
    setPerformanceAnalysisResult(null);
    setShowPerformanceModal(true);
    try {
      const res = await analyzeSqlPerformance(
        userSql,
        activeSchema?.tables,
        language
      );
      setPerformanceAnalysisResult(res);
    } catch (err) {
      console.error("Error analyzing SQL performance:", err);
    } finally {
      setIsAnalyzingPerformance(false);
    }
  };

  const handleExecute = async () => {
    if (!question || !userSql.trim()) return;

    // Get selected text if any, otherwise use full SQL
    let sqlToRun = userSql;
    if (editorRef.current?.view) {
      const { state } = editorRef.current.view;
      const selection = state.sliceDoc(
        state.selection.main.from,
        state.selection.main.to,
      );
      if (selection.trim()) {
        sqlToRun = selection;
      }
    }

    setIsExecuting(true);
    setShowOutput(true);
    setError(null);
    try {
      const res = await simulateSqlExecution(
        sqlToRun,
        question,
        userProfile,
        activeSchema?.tables,
        language,
      );
      setExecutionResult(res);
      if (res.isError && res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      console.error("Error executing query:", err);
      setError(err.message || "אירעה שגיאה בהרצת השאילתה.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExportCSV = () => {
    if (!executionResult || executionResult.isError) return;

    // Use BOM for Hebrew support in Excel
    const BOM = "\uFEFF";
    const headers = executionResult.columns.join(",");
    const rows = executionResult.rows
      .map((row) =>
        row
          .map((cell) => {
            const str = cell === null ? "NULL" : String(cell);
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      )
      .join("\n");

    const csvContent = `${BOM}${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sql_export_${activeSchema.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to Submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isGrading && userSql.trim() && question && result?.score !== 100 && attempts < 3) {
          e.preventDefault();
          handleGrade();
        }
      }
      
      // Ctrl+Shift+K to Clear Query
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setUserSql("");
        if (editorRef.current?.view) {
          editorRef.current.view.dispatch({
            changes: { from: 0, to: editorRef.current.view.state.doc.length, insert: "" }
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userSql, isGrading, question, result, attempts, handleGrade]);

  const handleAddQuestion = async () => {
    if (!newQuestionText.trim() || !auth.currentUser) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const targetTables = activeSchema?.tables || INSURANCE_SCHEMA;
      const analysis = await analyzeUserQuestion(
        newQuestionText,
        targetTables,
        language,
      );

      if (!analysis.isValid) {
        setError(
          analysis.errorMessage ||
            "לא ניתן כרגע להכניס את השאלה למערכת, יש לפנות למנהל",
        );
        setIsAddingQuestion(false);
        return;
      }

      // If valid, save the question
      const newQuestion: Question = {
        id: `user-${Math.random().toString(36).substr(2, 5)}`,
        title: analysis.title,
        description: newQuestionText,
        difficulty: analysis.insights.difficultyHint,
        correctSql: analysis.correctSql,
      };

      await saveUserQuestion(auth.currentUser.uid, {
        ...newQuestion,
        insights: analysis.insights,
      });

      // Generate and save variations (Easy and Hard)
      try {
        const variations = await generateQuestionVariations(
          newQuestion,
          targetTables,
          language,
        );

        await Promise.all([
          saveUserQuestion(auth.currentUser.uid, {
            ...variations.easy,
            insights: {
              ...analysis.insights,
              difficultyHint: "Easy",
            },
          }),
          saveUserQuestion(auth.currentUser.uid, {
            ...variations.hard,
            insights: {
              ...analysis.insights,
              difficultyHint: "Hard",
            },
          }),
        ]);
      } catch (vErr) {
        console.error("Error generating/saving variations:", vErr);
        // We don't block the user if variations fail, but we log it
      }

      // Update profile with insights and schema if needed
      const currentCustomSchema = userProfile?.customSchema || [];
      const updatedCustomSchema = [...currentCustomSchema];
      let schemaChanged = false;

      if (analysis.suggestedColumns.length > 0) {
        analysis.suggestedColumns.forEach((col) => {
          if (
            !updatedCustomSchema.find(
              (c) => c.table === col.table && c.name === col.name,
            )
          ) {
            updatedCustomSchema.push(col);
            schemaChanged = true;
          }
        });
      }

      const profileUpdate: Partial<UserProfile> = {
        role: analysis.insights.roleHint || userProfile?.role,
        department: analysis.insights.departmentHint || userProfile?.department,
      };

      if (schemaChanged) {
        profileUpdate.customSchema = updatedCustomSchema;
      }

      await saveUserProfile(auth.currentUser.uid, profileUpdate);

      setQuestion(newQuestion);
      setUserSql("");
      setResult(null);
      setExecutionResult(null);
      setShowOutput(false);
      setIsAddingQuestion(false);
      setNewQuestionText("");
    } catch (err) {
      console.error("Error adding question:", err);
      setError("אירעה שגיאה בניתוח השאלה.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderMarkdownWithInteractivity = (children: any) => {
    return React.Children.map(children, (child) => {
      if (typeof child === "string") {
        return <InteractiveText text={child} />;
      }
      return child;
    });
  };

  const markdownComponents = {
    p: ({ children }: any) => {
      const text = extractTextFromChildren(children);
      const isSaved = savedTipsIds.has(text);
      
      return (
        <div className="group relative">
          <p className="mb-2 pl-8">{renderMarkdownWithInteractivity(children)}</p>
          {text.length > 20 && (
            <button
              onClick={() => handleSaveToMaterials(text, 'general')}
              disabled={isSaved}
              className={cn(
                "absolute left-0 top-0 p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                isSaved ? "text-emerald-500 bg-emerald-50" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
              )}
              title={isSaved ? (isHe ? "נשמר בחומרים" : "Saved to materials") : (isHe ? "שמור לחומרים הלימודיים שלי" : "Save to my learning materials")}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          )}
        </div>
      );
    },
    li: ({ children }: any) => {
      const text = extractTextFromChildren(children);
      const isSaved = savedTipsIds.has(text);

      return (
        <div className="group relative">
          <li className="mb-1 pl-8">{renderMarkdownWithInteractivity(children)}</li>
          {text.length > 10 && (
            <button
              onClick={() => handleSaveToMaterials(text, 'general')}
              disabled={isSaved}
              className={cn(
                "absolute left-0 top-0 p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                isSaved ? "text-emerald-500 bg-emerald-50" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
              )}
              title={isSaved ? (isHe ? "נשמר בחומרים" : "Saved to materials") : (isHe ? "שמור לחומרים הלימודיים שלי" : "Save to my learning materials")}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          )}
        </div>
      );
    },
    strong: ({ children }: any) => (
      <strong className="font-bold">
        {renderMarkdownWithInteractivity(children)}
      </strong>
    ),
    em: ({ children }: any) => (
      <em className="italic">{renderMarkdownWithInteractivity(children)}</em>
    ),
    code: ({ children, inline }: any) => {
      if (inline) {
        return (
          <code className="bg-blue-50 px-1.5 py-0.5 rounded text-blue-800 font-mono text-[11px] font-bold border border-blue-100 mx-0.5">
            {renderMarkdownWithInteractivity(children)}
          </code>
        );
      }
      return (
        <code className="block p-3 my-2 bg-slate-900 text-emerald-400 rounded-lg font-mono text-xs border border-slate-800 shadow-inner overflow-x-auto ltr">
          {children}
        </code>
      );
    },
  };

  const underPracticedTopics = useMemo(() => {
    return getUnderPracticedTopics(completedQuestions, 3);
  }, [completedQuestions]);

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] overflow-hidden">
      {/* Top Bar */}
      <div
        className={cn(
          "bg-[#161C2A] text-white border-b-4 border-slate-900 px-4 md:px-6 py-2 md:py-2.5 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0 transition-all duration-300 select-none",
          isEditorFocused && "max-md:hidden",
        )}
        dir={isHe ? "rtl" : "ltr"}
      >
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 w-full md:w-auto">
          {/* Labeled Difficulty Control Board */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 bg-slate-900/60 border-2 border-slate-800 p-2 rounded-none w-full md:w-auto">
            <div className="flex items-center gap-2 px-1 text-right shrink-0">
              <Gauge size={16} className="text-[#D4FF00]" />
              <span className="text-[12px] font-mono font-black uppercase tracking-widest text-[#D4FF00]">
                {isHe ? "בורר רמת קושי (AI TARGET):" : "AI TARGET DIFFICULTY:"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(["Easy", "Medium", "Hard", "Expert", "Adaptive"] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => {
                    setSelectedDifficulty(diff);
                    onClearInitialQuestion?.();
                    fetchNewQuestion(diff);
                  }}
                  className={cn(
                    "px-3 md:px-4 py-1.5 font-mono font-black text-[11px] md:text-sm transition-all duration-150 cursor-pointer rounded-none border-2",
                    selectedDifficulty === diff
                      ? "bg-[#D4FF00] text-slate-950 border-[#D4FF00] translate-y-[-1px] shadow-[0_2px_0_0_#9DCF00]"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                  )}
                >
                  {diff === "Easy"
                    ? isHe
                      ? "קל"
                      : "EASY"
                    : diff === "Medium"
                      ? isHe
                        ? "בינוני"
                        : "MEDIUM"
                      : diff === "Hard"
                        ? isHe
                          ? "קשה"
                          : "HARD"
                        : diff === "Expert"
                          ? isHe
                            ? "מומחה"
                            : "EXPERT"
                          : isHe
                            ? "אדפטיבי"
                            : "ADAPTIVE"}
                </button>
              ))}
            </div>
          </div>

          {!showRecommendations &&
            performanceAnalysis &&
            performanceAnalysis.suggestedTopics.length > 0 && (
              <button
                onClick={() => setShowRecommendations(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-[#1E2538] border-2 border-slate-850 text-slate-300 font-mono text-[10px] md:text-xs font-black uppercase hover:text-white hover:border-[#D4FF00] transition-colors cursor-pointer rounded-none"
                title={isHe ? "הצג המלצות" : "Show recommendations"}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">
                  {isHe ? "הצג המלצות" : "RECOMMENDATIONS"}
                </span>
              </button>
            )}

          <button
            onClick={() => {
              onClearTargetedTopic?.();
              onClearInitialQuestion?.();
              fetchNewQuestion();
            }}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#D4FF00] text-slate-950 border-2 border-slate-950 hover:bg-white hover:text-slate-950 hover:border-white transition-all disabled:opacity-50 text-[10px] md:text-xs font-mono font-black uppercase tracking-wider cursor-pointer shrink-0 rounded-none"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            {isHe ? "שאלה חדשה" : "NEW QUESTION"}
          </button>

          <button
            onClick={() => setIsDictionaryOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 rounded-[4px] hover:text-[#0F172A] hover:border-[#0F172A] transition-all text-[10px] md:text-xs font-bold border border-slate-200 cursor-pointer shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            {isHe ? "מילון SQL" : "SQL Dictionary"}
          </button>

          {underPracticedTopics.length > 0 && showRecommendations && (
            <div className="flex items-center gap-2 bg-amber-50/40 p-1 rounded-[4px] border border-amber-200 animate-in fade-in slide-in-from-top-2">
              <span className="hidden lg:block text-[10px] text-amber-700 font-bold uppercase tracking-widest px-2">
                {isHe ? "נושאים שלא תרגלת מספיק:" : "Under-practiced topics:"}
              </span>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {underPracticedTopics.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => onStartTargetedPractice?.(topic)}
                    className={cn(
                      "px-3 py-1 rounded-[3px] text-[10px] md:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                      targetedTopic === topic
                        ? "bg-amber-600 text-white"
                        : "text-amber-700 hover:text-amber-900 hover:bg-amber-100/50",
                    )}
                  >
                    <Target className="w-3 h-3" />
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {performanceAnalysis &&
            performanceAnalysis.suggestedTopics.length > 0 &&
            showRecommendations && (
              <div className="flex items-center gap-2 bg-[#0F172A] p-1 rounded-[4px] border border-slate-800 animate-in fade-in slide-in-from-top-2">
                <span className="hidden lg:block text-[10px] text-slate-400 font-bold uppercase tracking-widest px-2">
                  {isHe ? "מומלץ עבורך:" : "Recommended for you:"}
                </span>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {performanceAnalysis.suggestedTopics.map((topic, idx) => (
                    <button
                      key={idx}
                      onClick={() => onStartTargetedPractice?.(topic)}
                      className={cn(
                        "px-3 py-1 rounded-[3px] text-[10px] md:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                        targetedTopic === topic
                          ? "bg-white text-[#0F172A]"
                          : "text-slate-300 hover:text-white hover:bg-slate-800",
                      )}
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      {topic}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowRecommendations(false)}
                  className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-[3px] transition-all cursor-pointer"
                  aria-label={isHe ? "הסתר המלצות" : "Hide recommendations"}
                  title={isHe ? "הסתר המלצות" : "Hide recommendations"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

          <button
            onClick={() => setIsAddingQuestion(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white text-emerald-700 rounded-[4px] border border-emerald-300 hover:bg-emerald-50 transition-colors text-[10px] md:text-xs font-bold cursor-pointer shrink-0"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            {isHe ? "הוסף שאלה עסקית" : "Add Business Question"}
          </button>

          {targetedTopic && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-[4px] text-slate-700 text-[10px] md:text-xs font-bold animate-in fade-in slide-in-from-right-2">
              <Sparkles className="w-3 h-3 text-amber-500" />
              {isHe ? "תרגול ממוקד:" : "Targeted Practice:"} {targetedTopic}
              <button
                onClick={onClearTargetedTopic}
                className="hover:text-[#0F172A] transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {question && (
            <div
              className={cn(
                "px-2.5 py-1 rounded-[4px] text-[10px] md:text-xs font-mono font-bold uppercase tracking-wider",
                question.difficulty === "Easy"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : question.difficulty === "Medium"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : question.difficulty === "Hard"
                      ? "bg-red-50 text-red-750 border border-red-200"
                      : "bg-purple-50 text-purple-750 border border-purple-200",
              )}
            >
              {isHe ? "רמה:" : "Difficulty:"}{" "}
              {question.difficulty === "Easy"
                ? isHe
                  ? "קל"
                  : "Easy"
                : question.difficulty === "Medium"
                  ? isHe
                    ? "בינוני"
                    : "Medium"
                  : question.difficulty === "Hard"
                    ? isHe
                      ? "קשה"
                      : "Hard"
                    : isHe
                      ? "מומחה"
                      : "Expert"}
            </div>
          )}
        </div>
        {/* Tablet view collapse/expand panel selector */}
        <div className="hidden md:flex lg:hidden items-center bg-slate-50 p-1 rounded-[4px] border border-slate-200 gap-1 self-center scale-95 origin-center">
          <button
            onClick={() => setTabletActivePanel('both')}
            className={cn(
              "px-3 py-1.5 rounded-[2px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              tabletActivePanel === 'both'
                ? "bg-[#0F172A] text-white"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            {isHe ? "הכל" : "Show Both"}
          </button>
          <button
            onClick={() => {
              setTabletActivePanel('question');
              setIsQuestionExpanded(true); // Ensure question is open when showing details only
            }}
            className={cn(
              "px-3 py-1.5 rounded-[2px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              tabletActivePanel === 'question'
                ? "bg-[#0F172A] text-white"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            {isHe ? "כווץ תרגול" : "Collapse Practice"}
          </button>
          <button
            onClick={() => setTabletActivePanel('editor')}
            className={cn(
              "px-3 py-1.5 rounded-[2px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              tabletActivePanel === 'editor'
                ? "bg-[#0F172A] text-white"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            {isHe ? "כווץ שאלה" : "Collapse Question"}
          </button>
        </div>

        <div className="hidden md:block text-slate-400 text-sm font-mono">
          Insurance SQL Practice v1.0
        </div>
      </div>

      <div className="flex flex-1 flex-col md:flex-row overflow-hidden pb-16 md:pb-0">
        {/* Right Side: SQL Editor */}
        <div
          className={cn(
            "w-full flex flex-col bg-white transition-all duration-300 relative border-l border-slate-200",
            isSqlEditorCollapsed
              ? "h-11 overflow-hidden md:w-14 md:h-full md:min-w-14"
              : cn(
                  "md:w-1/2 lg:w-[60%] xl:w-[65%]",
                  isQuestionExpanded ? "max-md:h-[40vh] md:h-full" : "max-md:flex-1 md:h-full"
                ),
            // Tablet Active Panel Support: Allows collapsing/maximizing this panel
            tabletActivePanel === 'question' && "md:hidden",
            tabletActivePanel === 'editor' && "md:w-full md:flex-1 md:h-full",
          )}
        >
          {isSqlEditorCollapsed ? (
            /* Collapsed State Bar */
            <div
              onClick={() => setIsSqlEditorCollapsed(false)}
              className="w-full h-full flex md:flex-col justify-between items-center bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer p-2.5 md:py-8 border-b md:border-b-0 md:border-r border-slate-200"
              title={isHe ? "לחץ להגדלת עורך השאילתות" : "Click to expand query editor"}
            >
              {/* Mobile/Tablet Collapsed View (Horizontal) */}
              <div className="flex md:hidden w-full items-center justify-between px-2">
                <div className="flex items-center gap-2 text-slate-600 font-mono text-xs font-bold uppercase tracking-wider">
                  <Terminal className="w-4 h-4 text-slate-500" />
                  <span>{isHe ? "עורך שאילתות (מכווץ)" : "QUERY EDITOR (COLLAPSED)"}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSqlEditorCollapsed(false);
                  }}
                  className="flex items-center gap-1 text-slate-700 hover:text-[#0F172A] bg-white px-2.5 py-1 rounded-[4px] text-xs font-bold border border-slate-200 cursor-pointer transition-all"
                >
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                  <span>{isHe ? "הצג עורך" : "Expand Editor"}</span>
                </button>
              </div>

              {/* Desktop Collapsed View (Vertical Dock) */}
              <div className="hidden md:flex flex-col items-center gap-6 h-full w-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSqlEditorCollapsed(false);
                  }}
                  className="p-1.5 rounded-[4px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-750 cursor-pointer transition-all active:scale-95 group"
                  title={isHe ? "הצג עורך" : "Expand Editor"}
                >
                  <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
                </button>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-slate-500 font-mono text-[10px] font-bold tracking-widest uppercase [writing-mode:vertical-lr] rotate-180 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-400 -rotate-90 select-none" />
                    <span className="select-none tracking-widest">{isHe ? "עורך שאילתות" : "SQL EDITOR"}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-1.5 md:py-2 bg-[#161C2A] text-[#D4FF00] text-[10px] md:text-xs font-mono font-black tracking-widest flex justify-between items-center border-b-2 border-slate-950">
                <div className="flex items-center gap-2">
                  <Terminal size={14} />
                  <span>SQL_EDITOR::WORKSPACE</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsSqlEditorCollapsed(!isSqlEditorCollapsed)}
                    className="flex items-center gap-1 text-slate-400 hover:text-[#D4FF00] bg-slate-900/50 hover:bg-slate-900 px-2.5 py-1.5 rounded-none text-[10px] font-mono font-black uppercase border border-slate-800 hover:border-[#D4FF00] transition-all cursor-pointer"
                  >
                    {isSqlEditorCollapsed ? (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>{isHe ? "הצג עורך" : "EXPAND"}</span>
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>{isHe ? "כווץ עורך" : "COLLAPSE"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden relative bg-[#0B0F19]" dir="ltr">
                <SqlCodeEditor
                  ref={editorRef}
                  initialValue={userSql}
                  onChange={(value) => setUserSql(value)}
                  editorExtensions={editorExtensions}
                  basicSetup={CODE_MIRROR_SETUP}
                  isHe={isHe}
                  setIsEditorFocused={setIsEditorFocused}
                  setIsQuestionExpanded={setIsQuestionExpanded}
                />
              </div>
                   {/* Execution Output Area */}
          <AnimatePresence>
            {showOutput && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="bg-white border-t border-slate-200 overflow-hidden flex flex-col max-h-[45%] md:max-h-[40%] lg:max-h-[35%]"
              >
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAFAFA] border-b border-slate-200">
                  <div className="flex items-center gap-2 text-[#0F172A] text-xs font-bold uppercase tracking-wider">
                    <TableIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isHe ? "פלט שאילתה" : "Query Output"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-[4px] border border-slate-200 text-[10px] font-bold">
                      <button
                        onClick={() => setOutputViewMode('table')}
                        className={cn(
                          "px-2 py-0.5 rounded-[2px] transition-all cursor-pointer",
                          outputViewMode === 'table'
                            ? "bg-[#0F172A] text-white"
                            : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {isHe ? "טבלה" : "Table"}
                      </button>
                      <button
                        onClick={() => setOutputViewMode('json')}
                        className={cn(
                          "px-2 py-0.5 rounded-[2px] transition-all cursor-pointer",
                          outputViewMode === 'json'
                            ? "bg-[#0F172A] text-white"
                            : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        JSON
                      </button>
                    </div>
                    {executionResult && !executionResult.isError && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleExportCSV}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-[4px] transition-all cursor-pointer text-[10px] font-bold"
                          title={isHe ? "ייצוא ל-CSV" : "Export to CSV"}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>{isHe ? "CSV" : "Export CSV"}</span>
                        </button>
                        <button
                          onClick={handleExportGoogleSheets}
                          disabled={isExportingToSheets}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-[4px] transition-all cursor-pointer text-[10px] font-bold disabled:opacity-50"
                          title={isHe ? "ייצוא ל-Google Sheets" : "Export to Google Sheets"}
                        >
                          {isExportingToSheets ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                             <Download className="w-3.5 h-3.5" />
                          )}
                          <span>{isHe ? "Sheets" : "Export Sheets"}</span>
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => setShowOutput(false)}
                      className="text-slate-500 hover:text-[#0F172A] p-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4 bg-white">
                  {isExecuting ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-[#0F172A]" />
                      <span className="text-xs font-medium">{isHe ? "מריץ שאילתה..." : "Running query..."}</span>
                    </div>
                  ) : executionResult ? (
                    executionResult.isError ? (
                      <div className="bg-red-50 border border-red-200 rounded-[4px] p-5 font-mono text-xs text-red-700 flex flex-col gap-3 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-2 font-black uppercase tracking-widest text-[10px] text-red-600 border-b border-red-200 pb-2">
                           <AlertCircle size={14} />
                           <span>SQL SYSTEM ERROR REPORT</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="whitespace-pre-wrap font-bold text-[13px] leading-relaxed">
                            {executionResult.error || (isHe ? "אירעה שגיאת תחביר או לוגיקה בשאילתה." : "A syntax or logic error occurred in the query.")}
                          </p>
                          <div className="text-[10px] text-red-500/80 mt-2 italic">
                            {isHe 
                              ? "בדוק את שמות הטבלאות, העמודות והתחביר שלך מול סכימת הנתונים." 
                              : "Check your table names, columns, and syntax against the data schema."}
                          </div>
                        </div>
                      </div>
                    ) : outputViewMode === 'json' ? (
                      <div className="bg-[#F8FAFC] rounded-[4px] border border-slate-200 p-4 font-mono text-xs text-slate-800 overflow-auto max-h-[300px]" dir="ltr">
                        <pre className="whitespace-pre">
                          {JSON.stringify(
                            executionResult.rows.map(row => {
                              const item: Record<string, any> = {};
                              executionResult.columns.forEach((col, idx) => {
                                item[col] = row[idx];
                              });
                              return item;
                            }),
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-[4px] border border-slate-200">
                        <table className="w-full text-left border-collapse text-xs font-mono bg-white">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                              {executionResult.columns.map((col, i) => (
                                <th
                                  key={i}
                                  className="px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-slate-600 text-left border-b border-slate-200 relative group"
                                >
                                  {col}
                                  {executionResult.columnExpressions && executionResult.columnExpressions[i] && (
                                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 bg-[#0F172A] text-slate-200 text-[10px] p-2.5 rounded-[4px] shadow-xl border border-slate-800 min-w-[150px] font-normal normal-case">
                                      <div className="text-amber-400 font-bold mb-1">{isHe ? 'לוגיקת בנייה:' : 'Build Logic:'}</div>
                                      {executionResult.columnExpressions[i]}
                                    </div>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="text-slate-700 divide-y divide-slate-100">
                            {executionResult.rows.map((row, i) => (
                              <tr
                                key={i}
                                className="hover:bg-slate-50/50 transition-colors border-b border-slate-100"
                              >
                                {row
                                  .slice(0, executionResult.columns.length)
                                  .map((cell, j) => (
                                    <td
                                      key={j}
                                      className="px-4 py-3 whitespace-nowrap text-slate-800 text-left"
                                    >
                                      {cell === null ? (
                                        <span className="text-red-500 bg-red-50 border border-red-200 px-1 rounded text-[9px] font-bold">
                                          NULL
                                        </span>
                                      ) : (
                                        String(cell)
                                      )}
                                    </td>
                                  ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="p-2.5 bg-[#FAFAFA] text-[10px] font-mono text-slate-500 border-t border-slate-200 text-right">
                          {isHe ? `סה"כ שורות: ${executionResult.rowCount}` : `Total rows: ${executionResult.rowCount}`}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs font-medium">
                      {isHe ? "ממתין להרצת פלט..." : "No results received"}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 md:gap-4 shrink-0 shadow-none">
            <div className="flex gap-2.5 w-full md:w-auto">
              <button
                onClick={() => {
                  setUserSql("");
                  if (editorRef.current?.view) {
                    editorRef.current.view.dispatch({
                      changes: { from: 0, to: editorRef.current.view.state.doc.length, insert: "" }
                    });
                  }
                }}
                disabled={!userSql.trim()}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-1.5 bg-white text-slate-500 border border-slate-200 rounded-[4px] hover:bg-slate-50 hover:text-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-bold text-[10px] md:text-xs cursor-pointer group"
                title="Ctrl+Shift+K"
              >
                <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-45deg] transition-transform" />
                <span>{isHe ? "נקה" : "Clear"}</span>
                <span className="hidden lg:inline-flex items-center gap-0.5 ml-1 px-1 bg-slate-100 text-[9px] text-slate-400 rounded">
                  ⇧K
                </span>
              </button>

              <button
                onClick={handleExecute}
                disabled={isExecuting || !userSql.trim() || !question}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4.5 py-1.5 bg-[#0F172A] text-white rounded-[4px] hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs md:text-sm cursor-pointer whitespace-nowrap uppercase tracking-wider"
              >
                {isExecuting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-xs font-sans">↗</span>
                )}
                <span>{isHe ? "הרץ שאילתה" : "RUN QUERY"}</span>
              </button>

              <button
                onClick={handlePerformanceAnalysis}
                disabled={isAnalyzingPerformance || !userSql.trim()}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-1.5 bg-white text-amber-700 border border-amber-300 rounded-[4px] hover:bg-amber-50/50 hover:border-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs md:text-sm cursor-pointer whitespace-nowrap"
              >
                {isAnalyzingPerformance ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                )}
                {isHe ? "ניתוח ביצועים (AI)" : "Analyze Performance (AI)"}
              </button>
            </div>

            <button
              onClick={handleGrade}
              disabled={
                isGrading ||
                !userSql.trim() ||
                !question ||
                result?.score === 100 ||
                attempts >= 3
              }
              className="flex-1 md:flex-none flex flex-col items-center justify-center gap-1 px-5 md:px-7 py-1.5 bg-slate-900 text-white rounded-[4px] border border-slate-900 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs md:text-sm cursor-pointer shadow-sm shadow-[#0F172A]/10"
            >
              <div className="flex items-center gap-2">
                {isGrading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Grading...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit for Grading</span>
                    <span className="hidden lg:inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 bg-white/10 text-[9px] text-white/50 rounded border border-white/10">
                      <span className="scale-75">⌘</span>↵
                    </span>
                  </>
                )}
              </div>
              {attempts > 0 &&
                attempts < 3 &&
                result?.score !== 100 &&
                !isHe &&
                !isGrading && (
                  <span className="text-[10px] opacity-80 font-normal">
                    Attempts remaining: {3 - attempts}
                  </span>
                )}
              {attempts >= 3 &&
                result?.score !== 100 &&
                !isHe &&
                !isGrading && (
                  <span className="text-[10px] text-amber-300 font-normal">
                    All attempts used
                  </span>
                )}
            </button>
          </div>
        </>
      )}
    </div>

        {/* Left Side: Question & Feedback */}
        <div
          className={cn(
            "w-full flex flex-col border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 transition-all duration-300 ease-in-out bg-white",
            isSqlEditorCollapsed
              ? "md:flex-1 md:max-w-full"
              : "md:w-1/2 lg:w-[40%] xl:w-[35%]",
            isEditorFocused
              ? "max-md:h-[35vh] md:h-full"
              : !isQuestionExpanded
                ? "max-md:h-auto md:h-full"
                : "max-md:flex-1 md:h-full",
            // Tablet Active Panel Support: Allows collapsing/maximizing this panel
            tabletActivePanel === 'editor' && "md:hidden",
            tabletActivePanel === 'question' && "md:w-full md:flex-1 md:h-full",
          )}
          dir="rtl"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50/50 border border-red-200 rounded-[4px] flex flex-col gap-3 text-red-700 text-sm shadow-none"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="flex-1 font-medium">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-650 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchNewQuestion()}
                  className="px-3 py-1.5 bg-red-100/60 hover:bg-red-200/60 text-red-800 rounded-[4px] font-bold transition-all text-xs cursor-pointer border border-red-200"
                >
                  נסה שוב עכשיו
                </button>
                <button
                  onClick={() => fetchNewQuestion(undefined, true)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-[4px] font-bold transition-all text-xs cursor-pointer border border-slate-200"
                >
                  השתמש בשאלת גיבוי
                </button>
              </div>
            </motion.div>
          )}

          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-6 py-12">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-[#0F172A]" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-bold text-[#0F172A]">
                  מייצר שאילתה עסקית מורכבת...
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  זה עשוי לקחת כמה שניות עקב מורכבות הלוגיקה הביטוחית.
                </p>
              </div>
            </div>
          ) : question ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4 md:space-y-6"
            >
              {/* Adaptive Learning Progress Panel */}
              {selectedDifficulty === "Adaptive" && (
                <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-4 md:p-5 space-y-3 animate-in fade-in slide-in-from-top-2 shadow-none">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                      <div className="text-right">
                        <h2 className="font-bold text-[#0F172A] text-sm md:text-base tracking-tight">
                          {isHe ? "למידה אדפטיבית מותאמת אישית" : "Personalized Adaptive Learning"}
                        </h2>
                        <p className="text-[10px] md:text-xs text-slate-500 font-medium">
                          {isHe ? "רמת קושי המשתפרת ומתאימה את עצמה להתקדמות האישית שלך." : "Difficulty is tailored perfectly to your individual progress."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-105 border border-slate-200 px-3 py-1 rounded-[4px] text-slate-700 text-xs font-bold">
                      <span>{isHe ? "רמה מחושבת:" : "Calculated Level:"}</span>
                      <span className="bg-[#0F172A] text-white px-1.5 py-0.5 rounded-[2px] text-[10px] tracking-wide uppercase">
                        {adaptiveMetrics.determinedDifficulty === "Easy"
                          ? (isHe ? "קל" : "Easy")
                          : adaptiveMetrics.determinedDifficulty === "Medium"
                          ? (isHe ? "בינוני" : "Medium")
                          : adaptiveMetrics.determinedDifficulty === "Hard"
                          ? (isHe ? "קשה" : "Hard")
                          : (isHe ? "מומחה" : "Expert")}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className={cn("p-2 rounded-[4px] transition-all", adaptiveMetrics.determinedDifficulty === "Easy" ? "bg-slate-50 border border-[#0F172A] text-[#0F172A] font-bold" : "bg-white border border-slate-150 text-slate-500")}>
                      <div className="text-[10px] uppercase font-mono tracking-wider">{isHe ? "קל" : "Easy"}</div>
                      <div className="text-sm font-black mt-0.5">{adaptiveMetrics.easySolved} / 3</div>
                    </div>
                    <div className={cn("p-2 rounded-[4px] transition-all", adaptiveMetrics.determinedDifficulty === "Medium" ? "bg-slate-50 border border-[#0F172A] text-[#0F172A] font-bold" : "bg-white border border-slate-150 text-slate-500")}>
                      <div className="text-[10px] uppercase font-mono tracking-wider">{isHe ? "בינוני" : "Medium"}</div>
                      <div className="text-sm font-black mt-0.5">{adaptiveMetrics.mediumSolved} / 3</div>
                    </div>
                    <div className={cn("p-2 rounded-[4px] transition-all", adaptiveMetrics.determinedDifficulty === "Hard" ? "bg-slate-50 border border-[#0F172A] text-[#0F172A] font-bold" : "bg-white border border-slate-150 text-slate-500")}>
                      <div className="text-[10px] uppercase font-mono tracking-wider">{isHe ? "קשה" : "Hard"}</div>
                      <div className="text-sm font-black mt-0.5">{adaptiveMetrics.hardSolved} / 3</div>
                    </div>
                    <div className={cn("p-2 rounded-[4px] transition-all", adaptiveMetrics.determinedDifficulty === "Expert" ? "bg-slate-50 border border-[#0F172A] text-[#0F172A] font-bold" : "bg-white border border-slate-150 text-slate-500")}>
                      <div className="text-[10px] uppercase font-mono tracking-wider">{isHe ? "מומחה" : "Expert"}</div>
                      <div className="text-sm font-black mt-0.5">{adaptiveMetrics.expertSolved} פתורים</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-[4px] border border-slate-200 leading-relaxed text-right font-medium">
                    {adaptiveMetrics.determinedDifficulty === "Easy" && (
                      isHe 
                        ? "המערכת מזהה שאתה בצעדיך הראשונים או מרענן את הידע. נתחיל משאילתות SELECT בסיסיות וסינון פשוט לעבר ביטחון מלא!"
                        : "The system detects you are starting out or refreshing. Let's practice simple SELECT and filtering to build a rock-solid foundation!"
                    )}
                    {adaptiveMetrics.determinedDifficulty === "Medium" && (
                      isHe 
                        ? "מעולה! שלטת בבסיס בהצלחה. כעת המערכת חושפת אותך לשילובי JOIN, קיבוץ ב-GROUP BY וסינונים מתקדמים."
                        : "Great job! You've mastered the basics. The system is introducing multiple JOINs, GROUP BY, and aggregations."
                    )}
                    {adaptiveMetrics.determinedDifficulty === "Hard" && (
                      isHe 
                        ? "רמה גבוהה ביותר! שלטת בקיבוצים ובשילובים. כעת נפגוש שאילתות משנה (Subqueries), שימוש ב-CTEs ולוגיקה עסקית מורכבת."
                        : "Impressive progress! You've mastered aggregations. Now introducing CTEs, advanced subqueries, and complex business logic."
                    )}
                    {adaptiveMetrics.determinedDifficulty === "Expert" && (
                      isHe 
                        ? "איזה אשף! הגעת לרמת העל של מיישמי נתונים. המערכת תאתגר אותך עם פונקציות חלון (Window), אופטימיזציה ולוגיקה אקטוארית מטורפת!"
                        : "Master-level achieved! Presenting advanced window functions, reinsurance reconciliation, and performance-optimized queries."
                    )}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div
                  className={cn(
                    "flex items-center justify-between sticky top-0 lg:top-0 bg-white z-20 py-2 border-b border-slate-100 lg:border-none -mx-4 px-4 lg:mx-0 lg:px-0 transition-all duration-300",
                    isEditorFocused && "max-md:hidden",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <h1 className="text-lg lg:text-2xl font-bold text-[#0F172A] text-right tracking-tight">
                      {question.title}
                    </h1>
                    {bestPreviousAttempt && (
                      <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] uppercase font-black tracking-widest border border-emerald-200 animate-in fade-in zoom-in duration-500 shrink-0">
                        <BookmarkCheck className="w-3 h-3" />
                        {isHe ? "פתור" : "SOLVED"}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsQuestionExpanded(!isQuestionExpanded)}
                    className="lg:hidden flex items-center gap-1.5 text-slate-700 text-xs font-bold bg-slate-50 px-2.5 py-1 rounded-[4px] border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    {isQuestionExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                        הסתר שאלה
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                        הצג שאלה
                      </>
                    )}
                  </button>
                </div>

                {/* Persistent Solved Before Indicator (Outside collapsing block) */}
                {bestPreviousAttempt && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="p-4 bg-amber-500/10 border-2 border-amber-500/25 rounded-none text-right space-y-3 relative overflow-hidden my-3 shadow-[4px_4px_0_0_rgba(245,158,11,0.2)]"
                  >
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500" />
                    <div className="flex items-center justify-between gap-3 pr-2">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-amber-500 p-1.5 border border-amber-600 shadow-[2px_2px_0_0_rgba(0,0,0,0.1)]">
                          <Bookmark className="w-4 h-4 text-white fill-white/20" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-sans font-black text-sm text-amber-900 uppercase tracking-tight">
                            {isHe ? "כבר פתרת שאלה זו בעבר!" : "YOU HAVE SOLVED THIS BEFORE!"}
                          </span>
                          <span className="text-[10px] text-amber-700 font-mono font-bold">
                            {isHe ? "ניסיון עבר מתועד במערכת" : "PAST ATTEMPT RECORDED"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1 text-xs font-mono font-black border border-amber-600 shadow-[3px_3px_0_0_rgba(180,83,9,0.3)]">
                          <span>{isHe ? "ציון שיא:" : "BEST SCORE:"}</span>
                          <span className="text-white drop-shadow-sm">{bestPreviousAttempt.score}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white/50 border border-amber-500/10 p-3 pr-4 -mr-2 relative group italic">
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {isHe 
                          ? `השאלה פוענחה בהצלחה ב-${(() => {
                              const ts = bestPreviousAttempt.timestamp as any;
                              if (!ts) return "";
                              const d = ts.toDate ? ts.toDate() : new Date(ts);
                              return d.toLocaleDateString('he-IL');
                            })()}. מוצג סנכרון לפתרון הקודם שלך להשוואה בזמן אמת.` 
                          : `Successfully solved on ${(() => {
                              const ts = bestPreviousAttempt.timestamp as any;
                              if (!ts) return "";
                              const d = ts.toDate ? ts.toDate() : new Date(ts);
                              return d.toLocaleDateString();
                            })()}. Real-time sync with your past attempt is enabled below.`}
                      </p>
                    </div>

                    <div className="pt-2 pr-2 flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPrevQuery(!showPrevQuery);
                        }}
                        className="flex items-center gap-2 text-[11px] text-amber-900 hover:text-white font-black transition-all bg-amber-500/10 hover:bg-amber-500 border-2 border-amber-500 px-4 py-2 rounded-none uppercase tracking-widest shadow-[3px_3px_0_0_rgba(245,158,11,0.2)] active:translate-y-0.5 active:shadow-none"
                      >
                        <Code className="w-4 h-4" />
                        <span>{showPrevQuery ? (isHe ? "הסתר פתרון עבר" : "HIDE PAST SOLUTION") : (isHe ? "הצג פתרון עבר" : "VIEW PAST SOLUTION")}</span>
                      </button>
                      
                      <div className="h-px flex-1 bg-amber-500/20" />
                    </div>
                  </motion.div>
                )}

                {showPrevQuery && bestPreviousAttempt && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 overflow-hidden border border-slate-200 bg-slate-950 rounded-none text-left"
                          dir="ltr"
                        >
                          <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-[10px] font-mono text-slate-400">
                            <span>PREVIOUS_SUBMISSION.SQL</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setUserSql(bestPreviousAttempt.userSql || '');
                                if (editorRef.current?.view) {
                                  editorRef.current.view.dispatch({
                                    changes: { from: 0, to: editorRef.current.view.state.doc.length, insert: bestPreviousAttempt.userSql || '' }
                                  });
                                }
                              }}
                              className="text-amber-500 hover:text-amber-400 font-bold cursor-pointer bg-transparent border-none p-0"
                            >
                              Copy to Editor
                            </button>
                          </div>
                          <SyntaxHighlighter
                            language="sql"
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              padding: '0.75rem',
                              fontSize: '11px',
                              backgroundColor: '#0f172a'
                            }}
                          >
                            {formatSql(bestPreviousAttempt.userSql || '')}
                          </SyntaxHighlighter>
                        </motion.div>
                      )}
                <AnimatePresence initial={false}>
                  {(isQuestionExpanded ||
                    (isEditorFocused && window.innerWidth < 768)) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-4"
                    >
                      <div className="p-4 bg-[#FAFAFA] rounded-[4px] border border-[#E2E8F0] shadow-none text-right leading-relaxed text-slate-800 text-sm md:text-base relative group">
                        {bestPreviousAttempt && (
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                            <div className="bg-emerald-500 w-1.5 h-1.5 rounded-full animate-pulse" />
                            <span className="text-[10px] font-mono font-bold text-emerald-600 tracking-tighter">
                              {isHe ? "תוצאות עבר קיימות" : "HISTORIC DATA AVAILABLE"}
                            </span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">
                          {question.description}
                        </p>
                      </div>

                      {/* AI Mentor Clarification Chat */}
                      <div className="space-y-4">
                        {!showQuestionChat && (
                          <button
                            onClick={() => setShowQuestionChat(true)}
                            className="flex items-center justify-center gap-2 w-full py-2 bg-white text-slate-700 rounded-[4px] border border-[#E2E8F0] hover:border-slate-400 hover:text-[#0F172A] transition-all font-bold text-xs cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            {isHe ? "עזרה מהמנטור: יש לי שאלה על הניסוח..." : "Mentor Help: I have a question about the wording..."}
                          </button>
                        )}

                        <AnimatePresence>
                          {showQuestionChat && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <FollowUpChat
                                question={question}
                                userProfile={userProfile}
                                onClose={() => setShowQuestionChat(false)}
                                schema={activeSchema?.tables}
                                onSave={handleSaveToMaterials}
                                savedTips={savedTipsIds}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Hints Section */}
                      {(question.difficulty === "Hard" ||
                        question.difficulty === "Expert") && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() =>
                                setHintsShownCount((prev) => prev + 1)
                              }
                              disabled={
                                hintsShownCount >= 2 ||
                                !question.hints ||
                                hintsShownCount >= question.hints.length
                              }
                              className="flex items-center gap-2 px-3 py-1.5 bg-white text-amber-800 rounded-[4px] border border-amber-300/50 hover:bg-slate-50 hover:border-amber-400 transition-all disabled:opacity-50 disabled:grayscale text-xs font-bold cursor-pointer"
                            >
                              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                              {hintsShownCount >= 2
                                ? "נוצלו כל הרמזים"
                                : `בקש רמז (${2 - hintsShownCount} נותרו)`}
                            </button>

                            {hintsShownCount > 0 && (
                              <span className="text-[10px] text-amber-600 font-medium">
                                רמזים מסייעים:
                              </span>
                            )}
                          </div>

                          <div className="space-y-2">
                            {question.hints &&
                              question.hints
                                .slice(0, hintsShownCount)
                                .map((hint, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-2.5 bg-amber-50/50 border-r-4 border-amber-300 text-slate-700 text-xs shadow-sm rounded-l-lg animate-in fade-in slide-in-from-right-1"
                                  >
                                    {hint}
                                  </motion.div>
                                ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-6 rounded-none border-4 shadow-[8px_8px_0_0_#0F172A] space-y-4 text-right",
                      result.score >= 75
                        ? "bg-emerald-50 border-emerald-500/40"
                        : "bg-rose-50 border-rose-500/40",
                    )}
                  >
                      <div className="flex items-center justify-between flex-row-reverse">
                        <div className="flex items-center gap-4 flex-row-reverse">
                          {result.score >= 75 ? (
                            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                          ) : (
                            <XCircle className="w-10 h-10 text-rose-600" />
                          )}
                          <div>
                            <h3
                              className={cn(
                                "text-2xl font-mono font-black uppercase tracking-tighter",
                                result.score >= 75
                                  ? "text-emerald-800"
                                  : "text-rose-800",
                              )}
                            >
                              SCORE:: {result.score}%
                            </h3>
                            <div className="group relative">
                              <InteractiveText
                                className={cn(
                                  "text-sm font-sans font-bold block leading-relaxed",
                                  result.score >= 75
                                    ? "text-emerald-900"
                                    : "text-rose-900",
                                  isHe ? "pr-8" : "pl-8"
                                )}
                                text={result.feedback}
                              />
                            <button
                              onClick={() => handleSaveToMaterials(result.feedback, 'general')}
                              className={cn(
                                "absolute top-0 p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer",
                                isHe ? "right-0" : "left-0",
                                savedTipsIds.has(result.feedback) ? "text-emerald-500" : "text-slate-400 hover:text-blue-500"
                              )}
                              title={savedTipsIds.has(result.feedback) ? (isHe ? "נשמר בחומרים" : "Saved to materials") : (isHe ? "שמור לחומרים" : "Save to materials")}
                            >
                              {savedTipsIds.has(result.feedback) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      "prose prose-slate max-w-none text-sm p-5 rounded-none border-2",
                      result.score >= 75 
                        ? "bg-emerald-50 text-emerald-950 border-emerald-500/30" 
                        : "bg-rose-50 text-rose-950 border-rose-500/30"
                    )}>
                      <Markdown components={markdownComponents as any}>
                        {result.explanation}
                      </Markdown>
                    </div>

                    {bestPreviousAttempt && (
                      <div className="mt-5 border-4 border-slate-900 bg-white p-4 shadow-[4px_4px_0_0_#0F172A] space-y-4 text-right">
                        <div className="flex items-center justify-between gap-2 border-b-2 border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <GitCompare className="w-5 h-5 text-indigo-600" />
                            <h4 className="font-sans font-black text-sm text-slate-800">
                              {isHe ? "לוח השוואת ניסיונות פתרון" : "Attempts Comparison Board"}
                            </h4>
                          </div>
                          <div className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-2.5 py-1 border border-slate-200">
                            SIDE-BY-SIDE COMPARE
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Previous Attempt */}
                          <div className="flex flex-col border-2 border-dotted border-slate-200 p-3 space-y-2.5 bg-slate-50 relative">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-slate-400" />
                                {isHe ? "הניסיון הקודם (הכי טוב)" : "Previous Attempt (Best)"}
                              </span>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-200/50 text-slate-800">
                                {bestPreviousAttempt.score}%
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {(() => {
                                const ts = bestPreviousAttempt.timestamp as any;
                                if (!ts) return "";
                                const d = ts.toDate ? ts.toDate() : new Date(ts);
                                return d.toLocaleString('he-IL');
                              })()}
                            </div>
                            <div className="overflow-x-auto border border-slate-200 bg-slate-950 rounded-none max-h-48 text-left" dir="ltr">
                              <SyntaxHighlighter
                                language="sql"
                                style={vscDarkPlus}
                                customStyle={{
                                  margin: 0,
                                  padding: '0.5rem',
                                  fontSize: '10px',
                                  backgroundColor: 'transparent'
                                }}
                              >
                                {formatSql(bestPreviousAttempt.userSql || '')}
                              </SyntaxHighlighter>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed max-h-24 overflow-y-auto italic">
                              {bestPreviousAttempt.explanation}
                            </p>
                          </div>

                          {/* Current Attempt */}
                          <div className="flex flex-col border-2 border-slate-900 p-3 space-y-2.5 bg-white relative">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                                {isHe ? "הניסיון הנוכחי" : "Current Attempt"}
                              </span>
                              <span className={cn(
                                "text-xs font-mono font-bold px-2 py-0.5",
                                result.score >= 75 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              )}>
                                {result.score}%
                              </span>
                            </div>
                            <div className="text-[10px] text-indigo-500 font-mono">
                              {isHe ? "הרגע" : "Just now"}
                            </div>
                            <div className="overflow-x-auto border border-slate-200 bg-slate-950 rounded-none max-h-48 text-left" dir="ltr">
                              <SyntaxHighlighter
                                language="sql"
                                style={vscDarkPlus}
                                customStyle={{
                                  margin: 0,
                                  padding: '0.5rem',
                                  fontSize: '10px',
                                  backgroundColor: 'transparent'
                                }}
                              >
                                {formatSql(userSql || '')}
                              </SyntaxHighlighter>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed max-h-24 overflow-y-auto italic">
                              {result.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {result.performanceWarning && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 shadow-sm border-r-4 border-r-amber-500"
                      >
                        <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                          <AlertTriangle className="w-4 h-4" />
                          שיפור ביצועים (Real-world Analysis)
                        </div>
                        <div className="group relative">
                          <p className={cn("text-amber-700 text-xs leading-relaxed font-medium", isHe ? "pr-8" : "pl-8")}>
                            {result.performanceWarning}
                          </p>
                          <button
                            onClick={() => handleSaveToMaterials(result.performanceWarning || '', 'general')}
                            className={cn(
                              "absolute top-0 p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-sm border border-amber-200 bg-white",
                              isHe ? "right-0" : "left-0",
                              savedTipsIds.has(result.performanceWarning || '') ? "text-emerald-500" : "text-amber-500"
                            )}
                            title={savedTipsIds.has(result.performanceWarning || '') ? (isHe ? "נשמר בחומרים" : "Saved to materials") : (isHe ? "שמור לחומרים" : "Save to materials")}
                          >
                            {savedTipsIds.has(result.performanceWarning || '') ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                          </button>
                        </div>
                        {result.optimizedSql && (
                          <div className="space-y-2 pt-1 border-t border-amber-100 group relative">
                            <div className="flex justify-between items-center pr-8">
                              <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                                הצעה לאופטימיזציה:
                              </div>
                              <button
                                onClick={() => handleSaveToMaterials(`Optimized SQL Reference:\n\n${result.optimizedSql}`, 'general')}
                                className={cn(
                                  "absolute top-0 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-sm border border-amber-200 bg-white",
                                  isHe ? "right-0" : "left-0",
                                  savedTipsIds.has(`Optimized SQL Reference:\n\n${result.optimizedSql}`) ? "text-emerald-500" : "text-amber-500"
                                )}
                                title={savedTipsIds.has(`Optimized SQL Reference:\n\n${result.optimizedSql}`) ? (isHe ? "נשמר בחומרים" : "Saved to materials") : (isHe ? "שמור פתרון מייטבי כחומר לימודי" : "Save optimized solution as material")}
                              >
                                {savedTipsIds.has(`Optimized SQL Reference:\n\n${result.optimizedSql}`) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                              </button>
                            </div>
                            <SyntaxHighlighter
                              language="sql"
                              style={vscDarkPlus}
                              customStyle={{
                                borderRadius: "0.75rem",
                                padding: "1rem",
                                fontSize: "11px",
                                margin: 0,
                              }}
                            >
                              {formatSql(result.optimizedSql)}
                            </SyntaxHighlighter>
                          </div>
                        )}
                      </motion.div>
                    )}

                    <div className="flex flex-col gap-4 mt-4">
                      {!showChat && (
                        <button
                          onClick={() => setShowChat(true)}
                          className="flex items-center justify-center gap-2 w-full py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all font-bold text-xs"
                        >
                          <MessageSquarePlus className="w-4 h-4" />
                          יש לי שאלה על התשובה...
                        </button>
                      )}

                      <AnimatePresence>
                        {showChat && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <FollowUpChat
                              submissionId={submissionId!}
                              question={question}
                              userSql={userSql}
                              result={result}
                              userProfile={userProfile}
                              onClose={() => setShowChat(false)}
                              schema={activeSchema?.tables}
                              initialHistory={currentCompletedInfo?.chatHistory || []}
                              onSave={handleSaveToMaterials}
                              savedTips={savedTipsIds}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
                      <button
                        onClick={() => setShowSolution(!showSolution)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                      >
                        <Lightbulb className="w-4 h-4" />
                        {showSolution ? "הסתר פתרון" : "הצג פתרון נכון"}
                      </button>

                      <button
                        onClick={handleComplete}
                        disabled={isSaving}
                        className={cn(
                          "flex items-center gap-2 px-6 py-2 rounded-xl transition-all font-bold text-sm shadow-lg",
                          isSaving && "opacity-50 cursor-not-allowed",
                          attempts >= 3 && result.score < 100
                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 scale-105"
                            : "bg-slate-800 text-white hover:bg-slate-900 shadow-slate-200",
                        )}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            שומר...
                          </>
                        ) : (
                          <>
                            {attempts >= 3 && result.score < 100
                              ? "נוצלו הניסיונות - שמור והמשך"
                              : "סיימתי, שמור ועבור הלאה"}
                            <ChevronLeft className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>

                    {showSolution && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 overflow-hidden"
                      >
                        <SyntaxHighlighter
                          language="sql"
                          style={vscDarkPlus}
                          customStyle={{
                            borderRadius: "0.75rem",
                            padding: "1rem",
                            fontSize: "0.875rem",
                          }}
                        >
                          {formatSql(question.correctSql)}
                        </SyntaxHighlighter>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full bg-white">
              <Database className="w-16 h-16 mb-6 opacity-10" />
              <div className="text-center space-y-2">
                <p className="text-base font-bold text-slate-700">{isHe ? "לחץ על כפתור 'שאלה חדשה' כדי להתחיל" : "Click 'New Question' to start"}</p>
                <p className="text-xs text-slate-400">{isHe ? "המערכת תייצר עבורך אתגר SQL מותאם אישית" : "The AI will generate a personalized SQL challenge for you"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Question Modal */}
      <AnimatePresence>
        {isAddingQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
              dir="rtl"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquarePlus className="w-6 h-6 text-emerald-600" />
                    הוספת שאלה עסקית חדשה
                  </h2>
                  <button
                    onClick={() => setIsAddingQuestion(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <p className="text-slate-600 text-sm">
                  נתקלת בשאלה עסקית ביומיום? הכנס אותה כאן. המערכת תנתח את
                  השאלה, תוסיף עמודות למסד הנתונים במידת הצורך ותלמד להתאים לך
                  שאלות דומות בעתיד.
                </p>

                <textarea
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="למשל: 'הצג את כל הפוליסות שבוטלו בחודש האחרון לפי שם הסוכן ומספר הטלפון שלו'..."
                  className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm resize-none"
                />

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleAddQuestion}
                    disabled={isAnalyzing || !newQuestionText.trim()}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        מנתח שאלה...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        נתח והוסף למערכת
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsAddingQuestion(false)}
                    className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SQL Performance Analyzer Modal */}
      <AnimatePresence>
        {showPerformanceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir={isHe ? "rtl" : "ltr"}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col font-sans"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-905 text-white shrink-0 bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 rounded-xl text-slate-900">
                    <Zap className="w-5 h-5 fill-amber-300" />
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-extrabold tracking-tight">
                      {isHe ? "מנתח ביצועי שאילתות AI" : "AI SQL Query Performance Analyzer"}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {isHe ? "ניתוח בזמן אמת של עלויות ריצה, SARGability ואינדקסים" : "Real-time query plan costing, SARGability & index scan analysis"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPerformanceModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-2 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                {isAnalyzingPerformance ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <div className="text-center">
                      <p className="text-slate-800 font-bold text-base animate-pulse">
                        {isHe ? "מנתח נתיבי ריצה ועלויות..." : "Analyzing query execution paths..."}
                      </p>
                      <p className="text-slate-400 text-xs mt-2 max-w-sm mx-auto">
                        {isHe
                          ? "סורק עבור מציאת מפתחות קרטזיים חסרים, פונקציות מסוג non-SARGable, ושאילתות משנה יתרות..."
                          : "Scanning for missing join conditions, non-SARGable WHERE filters, and sorting overhead on large tables..."}
                      </p>
                    </div>
                  </div>
                ) : performanceAnalysisResult ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-right">
                    {/* Left Column: Score, Checklist, Bottlenecks */}
                    <div className="lg:col-span-7 space-y-6">
                      {/* Performance Metric */}
                      <div className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-6 shadow-sm">
                        <div className="relative shrink-0 flex items-center justify-center">
                          <div className={cn(
                            "w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 shadow-sm",
                            performanceAnalysisResult.performanceScore >= 90
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                              : performanceAnalysisResult.performanceScore >= 70
                              ? "border-amber-500 bg-amber-50 text-amber-800"
                              : "border-rose-500 bg-rose-50 text-rose-800"
                          )}>
                            <span className="text-2xl font-black">{performanceAnalysisResult.performanceScore}</span>
                            <span className="text-[9px] uppercase font-bold tracking-wider">SCORE</span>
                          </div>
                        </div>

                        <div className="text-center sm:text-right flex-1">
                          <h3 className="text-base font-black text-slate-800">
                            {performanceAnalysisResult.performanceScore >= 90
                              ? (isHe ? "שאילתה יעילה מאוד" : "Excellent Query Efficiency")
                              : performanceAnalysisResult.performanceScore >= 70
                              ? (isHe ? "דרוש שיפור קל" : "Needs Minor Optimization")
                              : (isHe ? "בעיות ביצועים קריטיות!" : "Critical Performance Bottlenecks Found!")}
                          </h3>
                          <p className="text-slate-500 text-xs mt-1 leading-relaxed font-medium">
                            {isHe 
                              ? `ציון יעילות הריצה של השאילתה שלך הוא ${performanceAnalysisResult.performanceScore}/100. ${performanceAnalysisResult.hasBottlenecks ? "זיהינו צווארי בקבוק שכדאי לתקן כדי לשפר משמעותית את זמן הריצה." : "מצוין! הקוד שכתבת עומד בסטנדרטים של סביבת פרודקשן אמיתית."}`
                              : `Your query efficiency index is ${performanceAnalysisResult.performanceScore}/100. ${performanceAnalysisResult.hasBottlenecks ? "Our analysis flagged key optimization areas to implement." : "Great job, your query is clean and optimized."}`}
                          </p>
                        </div>
                      </div>

                      {/* Performance Checklist */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                        <h4 className="text-slate-800 font-bold text-xs flex items-center gap-2 border-b border-slate-100 pb-2">
                          <Gauge className="w-4 h-4 text-indigo-500" />
                          {isHe ? "צ'קליסט תקינות ביצועים" : "Performance Health Checklist"}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {performanceAnalysisResult.performanceChecklist.map((check, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5">
                              {check.passed ? (
                                <div className="p-0.5 rounded-full bg-emerald-100 text-emerald-700 mt-0.5">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="p-0.5 rounded-full bg-rose-100 text-rose-700 mt-0.5">
                                  <X className="w-3 h-3 stroke-[3]" />
                                </div>
                              )}
                              <div className="text-right">
                                <h5 className="font-bold text-xs text-slate-800">{check.checkName}</h5>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">{check.explanation}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Detected Bottlenecks List */}
                      {performanceAnalysisResult.hasBottlenecks && performanceAnalysisResult.bottlenecks.length > 0 ? (
                        <div className="space-y-3">
                          <h4 className="text-slate-800 font-bold text-xs flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            {isHe ? "צווארי בקבוק שזוהו בשאילתה" : "Identified Bottlenecks"}
                          </h4>
                          {performanceAnalysisResult.bottlenecks.map((bottleneck, bIdx) => (
                            <div key={bIdx} className="p-4 bg-white border border-slate-200 rounded-2xl border-r-4 border-r-rose-500 space-y-2 shadow-sm text-right">
                              <div className="flex items-center justify-between">
                                <h5 className="font-extrabold text-rose-900 text-xs sm:text-sm">
                                  {bottleneck.title}
                                </h5>
                                <span className={cn(
                                  "px-2 py-0.5 text-[8px] font-black rounded-full uppercase tracking-wider",
                                  bottleneck.impact === 'High' 
                                    ? "bg-rose-100 text-rose-800" 
                                    : bottleneck.impact === 'Medium'
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-blue-100 text-blue-800"
                                )}>
                                  {bottleneck.impact} Impact
                                </span>
                              </div>
                              <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                                {bottleneck.description}
                              </p>
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-700 font-medium space-y-1">
                                <div className="text-slate-400 text-[9px] uppercase tracking-wider font-extrabold">
                                  {isHe ? "פתרון מוצע:" : "Remedy:"}
                                </div>
                                <div className="text-xs text-slate-700 leading-relaxed">{bottleneck.remedy}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-center gap-3">
                          <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700">
                            <Check className="w-5 h-5 stroke-[3]" />
                          </div>
                          <div className="text-right">
                            <h5 className="font-extrabold text-xs sm:text-sm">{isHe ? "לא נמצאו צווארי בקבוק מהותיים!" : "No significant bottlenecks found!"}</h5>
                            <p className="text-xs text-emerald-600 leading-relaxed font-medium mt-0.5">
                              {isHe 
                                ? "השאילתה מנצלת אינדקסים כראוי, נמנעת מחיבורים יתירים או מכפלות קרטזיות, ואינה מכילה פונקציות חוסמות." 
                                : "Query is styled cleanly, conforms to sargability indices, and avoids redundant join or cross-join conditions."}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Code Comparison & DB2 / Actionable Tips */}
                    <div className="lg:col-span-5 space-y-6 text-right">
                      {/* Solution / Tips / Recommendations */}
                      <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl space-y-4 shadow-lg">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <h4 className="font-extrabold text-xs sm:text-sm">{isHe ? "טיפים מעשיים לאופטימיזציה" : "Actionable Optimization Tips"}</h4>
                        </div>
                        <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside leading-relaxed font-medium pr-1">
                          {performanceAnalysisResult.actionableTips.map((tip, tIdx) => (
                            <li key={tIdx} className="hover:text-white transition-colors">{tip}</li>
                          ))}
                        </ul>

                        {performanceAnalysisResult.db2SpecificAdvice && (
                          <div className="pt-3 border-t border-white/10 text-[10px] text-slate-405 space-y-1 leading-relaxed text-slate-400">
                            <div className="text-amber-400 font-black uppercase text-[8px] tracking-widest mb-1">
                              {isHe ? "סביבת מערכות ליבה (IBM DB2 / AS400):" : "Enterprise DB2 / AS400 Insights:"}
                            </div>
                            <p className="font-medium italic">
                              {performanceAnalysisResult.db2SpecificAdvice}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Optimized SQL view */}
                      {performanceAnalysisResult.optimizedSql && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-slate-800 font-bold text-xs flex items-center gap-2">
                              <Code className="w-4 h-4 text-blue-500" />
                              {isHe ? "שאילתה אופטימלית מוצעת" : "Proposed Optimized SQL"}
                            </h4>
                            <button
                              onClick={() => {
                                setUserSql(performanceAnalysisResult.optimizedSql!);
                                setShowPerformanceModal(false);
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-lg shadow transition-all cursor-pointer"
                            >
                              {isHe ? "עדכן את העורך" : "Apply to Editor"}
                            </button>
                          </div>
                          
                          <div className="overflow-hidden rounded-xl border border-slate-200">
                            <SyntaxHighlighter
                              language="sql"
                              style={vscDarkPlus}
                              customStyle={{
                                margin: 0,
                                padding: '1rem',
                                fontSize: '11px',
                                borderRadius: '0.75rem',
                              }}
                            >
                              {formatSql(performanceAnalysisResult.optimizedSql)}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    {isHe ? "לא התקבל ניתוח ביצועים עבור השאילתה הזו." : "No analysis details received."}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  onClick={() => setShowPerformanceModal(false)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black rounded-xl transition-all cursor-pointer"
                >
                  {isHe ? "סגור" : "Close"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SqlDictionaryPanel
        isOpen={isDictionaryOpen}
        onClose={() => setIsDictionaryOpen(false)}
      />
    </div>
  );
};
