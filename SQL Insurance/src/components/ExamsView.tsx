import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Timer, AlertCircle, CheckCircle2, XCircle, ChevronLeft, ChevronRight, 
  Play, Pause, Award, RotateCcw, FileText, Settings, Sparkles, Database, 
  Code, ShieldCheck, CheckSquare, HelpCircle, Loader2, ArrowRight,
  BookOpen, Eye, ArrowLeft, BrainCircuit
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CodeMirror from '@uiw/react-codemirror';
import { sql, PostgreSQL } from '@codemirror/lang-sql';
import { completeFromList } from '@codemirror/autocomplete';

import { FALLBACK_QUESTIONS, Table, INSURANCE_SCHEMA } from '../constants';
import { simulateSqlExecution, gradeSqlQuery, Question, GradeResult } from '../services/geminiService';
import { UserProfile } from '../firebase';
import { cn, formatSql } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

// Topic classifications
const INSURANCE_TOPIC_NAMES: Record<string, { he: string; en: string }> = {
  'lifecycle': { he: 'מחזור חיי פוליסה', en: 'Policy Lifecycle' },
  'endorsements': { he: 'תוספות ושינויים', en: 'Endorsements & Changes' },
  'index-linkage': { he: 'הצמדה למדד וריביות', en: 'Index Linkage & Interest' },
  'underwriting': { he: 'חיתום וסיכונים', en: 'Underwriting & Risks' },
  'claims-reserves': { he: 'תביעות ורזרבות', en: 'Claims & Reserves' },
  'reinsurance': { he: 'ביטוח משנה', en: 'Reinsurance' },
  'regulation': { he: 'רגולציה ודיווח', en: 'Regulation & Reporting' },
  'basics': { he: 'יסודות הביטוח', en: 'Insurance Basics' }
};

const SQL_TOPIC_NAMES: Record<string, { he: string; en: string }> = {
  'select-where': { he: 'SELECT & WHERE', en: 'SELECT & WHERE' },
  'joins': { he: 'JOINs - חיבורים', en: 'JOINs - Joins & Joins' },
  'group-by': { he: 'GROUP BY & אגרגציות', en: 'GROUP BY & Aggregations' },
  'case-when': { he: 'CASE WHEN - תנאים', en: 'CASE WHEN - Conditions' },
  'coalesce': { he: 'COALESCE וערכים חסרים', en: 'COALESCE & Missing Values' },
  'ctes': { he: 'CTEs ותת-שאילתות', en: 'CTEs & Subqueries' },
  'window-functions': { he: 'פונקציות חלון', en: 'Window Functions' },
  'stored-procedures': { he: 'פרוצדורות מובנות', en: 'Stored Procedures' }
};

function getSqlTopicIds(q: Question): string[] {
  const sqlText = (q.correctSql || '').toLowerCase();
  const titleDesc = ((q.title || '') + ' ' + (q.description || '')).toLowerCase();
  const ids: string[] = [];

  if (sqlText.includes('join') || titleDesc.includes("ג'וין") || titleDesc.includes("חיבור טבלאות") || titleDesc.includes("קשר")) {
    ids.push('joins');
  }
  if (sqlText.includes('group by') || sqlText.includes('sum(') || sqlText.includes('avg(') || sqlText.includes('count(') || sqlText.includes('max(') || sqlText.includes('min(') || titleDesc.includes('סיכום') || titleDesc.includes('ממוצע') || titleDesc.includes('ספיר') || titleDesc.includes('אגרגצי') || titleDesc.includes('קיבוץ')) {
    ids.push('group-by');
  }
  if (sqlText.includes('case when') || titleDesc.includes('תנאי') || titleDesc.includes('case') || titleDesc.includes('סיווג')) {
    ids.push('case-when');
  }
  if (sqlText.includes('coalesce') || sqlText.includes('ifnull') || sqlText.includes('nullif') || sqlText.includes('is null') || sqlText.includes('is not null') || titleDesc.includes('נתונים חסרים') || titleDesc.includes('ברירת מחדל')) {
    ids.push('coalesce');
  }
  if (sqlText.includes('with ') || sqlText.includes('cte') || (sqlText.includes('select ') && sqlText.split('select').length > 2) || titleDesc.includes('תת') || titleDesc.includes('cte') || titleDesc.includes('משנה') || titleDesc.includes('ארגון')) {
    ids.push('ctes');
  }
  if (sqlText.includes('over (') || sqlText.includes('partition by') || sqlText.includes('row_number(') || sqlText.includes('rank(') || sqlText.includes('lag(') || sqlText.includes('lead(') || titleDesc.includes('חלון') || titleDesc.includes('מצטבר') || titleDesc.includes('דירוג')) {
    ids.push('window-functions');
  }
  if (sqlText.includes('procedure') || sqlText.includes('sp_') || sqlText.includes('exec ') || sqlText.includes('create procedure') || titleDesc.includes('פרוצדורה') || titleDesc.includes('stored procedure') || titleDesc.includes('אוטומציה')) {
    ids.push('stored-procedures');
  }

  if (ids.length === 0 || sqlText.includes('where') || titleDesc.includes('סינון') || titleDesc.includes('שליפה')) {
    ids.push('select-where');
  }

  return ids;
}

function getInsuranceTopicIds(q: Question): string[] {
  const sqlText = (q.correctSql || '').toLowerCase();
  const titleDesc = ((q.title || '') + ' ' + (q.description || '')).toLowerCase();
  const ids: string[] = [];

  if (titleDesc.includes('מחזור חיי') || titleDesc.includes('הצעה') || titleDesc.includes('הפקה') || titleDesc.includes('חידוש') || titleDesc.includes('ביטול') || titleDesc.includes('הקפאה') || titleDesc.includes('סטטוס') || sqlText.includes('status') || titleDesc.includes('lifecycle')) {
    ids.push('lifecycle');
  }
  if (titleDesc.includes('תוספת') || titleDesc.includes('שינוי') || titleDesc.includes('החזר') || titleDesc.includes('יחסי') || titleDesc.includes('pro-rata') || sqlText.includes('endorsement') || titleDesc.includes('endorsements') || titleDesc.includes('mta')) {
    ids.push('endorsements');
  }
  if (
    titleDesc.includes('הצמדה') || 
    titleDesc.includes('מדד') || 
    titleDesc.includes('ריבית') || 
    titleDesc.includes('סילוקין') || 
    titleDesc.includes('הפרשי הצמד') || 
    titleDesc.includes('הפרש') ||
    (titleDesc.includes('פרמיה') && (titleDesc.includes('מדד') || titleDesc.includes('הצמד') || titleDesc.includes('ריבית') || sqlText.includes('index')))
  ) {
    ids.push('index-linkage');
  }
  if (titleDesc.includes('חיתום') || titleDesc.includes('סיכון') || titleDesc.includes('underwriting') || titleDesc.includes('הנחה') || titleDesc.includes('העמסה') || titleDesc.includes('גורמי סיכון')) {
    ids.push('underwriting');
  }
  if (titleDesc.includes('תביעה') || titleDesc.includes('תביעות') || titleDesc.includes('רזרב') || titleDesc.includes('reserve') || titleDesc.includes('שמאי') || titleDesc.includes('נזק') || sqlText.includes('claim') || sqlText.includes('reserve') || titleDesc.includes('reserves')) {
    ids.push('claims-reserves');
  }
  if (titleDesc.includes('משנה') || titleDesc.includes('שימור') || titleDesc.includes('reinsurance') || titleDesc.includes('treaty') || titleDesc.includes('quota share') || titleDesc.includes('ceded')) {
    ids.push('reinsurance');
  }
  if (titleDesc.includes('רגולציה') || titleDesc.includes('דיווח') || titleDesc.includes('סולבנסי') || titleDesc.includes('ממשק') || titleDesc.includes('ציות') || titleDesc.includes('compliance') || titleDesc.includes('reporting')) {
    ids.push('regulation');
  }

  if (ids.length === 0 || titleDesc.includes('יסוד') || titleDesc.includes('מבנה פוליסה') || titleDesc.includes('מבנה הפוליסה') || titleDesc.includes('מקיף') || titleDesc.includes('חובה') || titleDesc.includes('צד ג') || titleDesc.includes('פרמיה') || titleDesc.includes('הפוליסה')) {
    ids.push('basics');
  }

  return ids;
}

interface ExamQuestion {
  question: Question;
  userSql: string;
  gradeResult?: GradeResult;
  isGraded: boolean;
  scoreAwarded?: number;
}

interface ExamsViewProps {
  userProfile: UserProfile | null;
}

const COMMON_SQL_FUNCTIONS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS NULL',
  'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'ON', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT',
  'SUM', 'AVG', 'COUNT', 'MAX', 'MIN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'COALESCE', 'WITH',
  'ROW_NUMBER()', 'OVER', 'PARTITION BY', 'LAG', 'LEAD', 'JULIANDAY', 'STRFTIME', 'COALESCE', 'IFNULL', 'NULLIF'
];

const CODE_MIRROR_SETUP = {
  lineNumbers: true,
  foldGutter: true,
  highlightActiveLine: true,
};

export function ExamsView({ userProfile }: ExamsViewProps) {
  const { t, isHe, language } = useLanguage();
  // Navigation states: 'setup' | 'active' | 'grading' | 'results'
  const [examState, setExamState] = useState<'setup' | 'active' | 'grading' | 'results'>('setup');
  
  // Customization filters
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(['Easy', 'Medium', 'Hard', 'Expert']);
  const [selectedInsuranceTopics, setSelectedInsuranceTopics] = useState<string[]>(Object.keys(INSURANCE_TOPIC_NAMES));
  const [selectedSqlTopics, setSelectedSqlTopics] = useState<string[]>(Object.keys(SQL_TOPIC_NAMES));

  // Active Exam states
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [totalAllocatedTime, setTotalAllocatedTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pauseTimeRemaining, setPauseTimeRemaining] = useState<number>(300); // 5 minutes max

  // Simulation execution state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  // Results state
  const [examScore, setExamScore] = useState<number>(0);
  const [reviewedQuestionIndex, setReviewedQuestionIndex] = useState<number>(0);

  // Grading process states
  const [gradingProgress, setGradingProgress] = useState<number>(0);
  const [gradingStatusText, setGradingStatusText] = useState<string>('מתחיל בדיקה...');

  // Timer Ref
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Difficulty weights
  const getDifficultyWeight = (diff: string): number => {
    switch (diff) {
      case 'Easy': return 1;
      case 'Medium': return 2;
      case 'Hard': return 3;
      case 'Expert': return 4;
      default: return 1;
    }
  };

  const decodeDifficulty = (diff: string): string => {
    switch (diff) {
      case 'Easy': return 'קל';
      case 'Medium': return 'בינוני';
      case 'Hard': return 'קשה';
      case 'Expert': return 'מומחה';
      default: return diff;
    }
  };

  const getDifficultyColor = (diff: string): string => {
    switch (diff) {
      case 'Easy': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Medium': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Hard': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Expert': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Filter pool of questions based on choices
  const getFilteredQuestionPool = (): Question[] => {
    const questionsList = FALLBACK_QUESTIONS as unknown as Question[];
    return questionsList.filter(q => {
      // Filter by difficulty
      if (selectedDifficulties.length > 0 && !selectedDifficulties.includes(q.difficulty)) {
        return false;
      }
      
      // Filter by insurance topic
      const insTopics = getInsuranceTopicIds(q);
      const hasInsTopic = insTopics.some(id => selectedInsuranceTopics.includes(id));
      if (selectedInsuranceTopics.length > 0 && !hasInsTopic) {
        return false;
      }

      // Filter by sql topic
      const sqlTopics = getSqlTopicIds(q);
      const hasSqlTopic = sqlTopics.some(id => selectedSqlTopics.includes(id));
      if (selectedSqlTopics.length > 0 && !hasSqlTopic) {
        return false;
      }

      return true;
    });
  };

  const toggleDifficulty = (diff: string) => {
    setSelectedDifficulties(prev => 
      prev.includes(diff) 
        ? (prev.length > 1 ? prev.filter(d => d !== diff) : prev) 
        : [...prev, diff]
    );
  };

  const toggleInsuranceTopic = (id: string) => {
    setSelectedInsuranceTopics(prev => 
      prev.includes(id) 
        ? (prev.length > 1 ? prev.filter(t => t !== id) : prev) 
        : [...prev, id]
    );
  };

  const toggleSqlTopic = (id: string) => {
    setSelectedSqlTopics(prev => 
      prev.includes(id) 
        ? (prev.length > 1 ? prev.filter(t => t !== id) : prev) 
        : [...prev, id]
    );
  };

  // Calculate allocated time based on the selected questions or current filters config
  const calculateAllocatedTimeSeconds = (questions: Question[]): number => {
    let seconds = 0;
    questions.forEach(q => {
      if (q.difficulty === 'Easy') seconds += 2 * 60;
      else if (q.difficulty === 'Medium') seconds += 4 * 60;
      else if (q.difficulty === 'Hard') seconds += 6 * 60;
      else if (q.difficulty === 'Expert') seconds += 10 * 60;
    });
    return seconds;
  };

  // Start exam setup
  const handleStartExam = () => {
    const pool = getFilteredQuestionPool();
    if (pool.length === 0) {
      alert('לא נמצאו שאלות תואמות להגדרות הסינון שנבחרו. נסי לסמן יותר נושאים או דרגות קושי.');
      return;
    }

    // Shuffle pool
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    // Take requested count
    const selectedQuestions = shuffled.slice(0, Math.min(questionCount, pool.length));

    // Map to ExamQuestions
    const initialExamQuestions: ExamQuestion[] = selectedQuestions.map(q => ({
      question: q,
      userSql: `-- שאלה: ${q.title}\n-- כתוב את ה-SQL שלך כאן...\n\n`,
      isGraded: false
    }));

    const totalSeconds = calculateAllocatedTimeSeconds(selectedQuestions);

    setExamQuestions(initialExamQuestions);
    setCurrentQuestionIndex(0);
    setTotalAllocatedTime(totalSeconds);
    setTimeRemaining(totalSeconds);
    setPauseTimeRemaining(300);
    setIsPaused(false);
    setStartTime(new Date());
    setSimulationResult(null);
    setSimulationError(null);
    setExamState('active');
  };

  // Handle countdown timer ticker
  useEffect(() => {
    if (examState === 'active') {
      timerIntervalRef.current = setInterval(() => {
        if (!isPaused) {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              clearInterval(timerIntervalRef.current!);
              // Timeout -> auto submit
              handleSubmitExam(true);
              return 0;
            }
            return prev - 1;
          });
        } else {
          // While paused, count down the break timer
          setPauseTimeRemaining(prev => {
            if (prev <= 1) {
              setIsPaused(false);
              return 300; // Reset for next pause maybe? Or just keep it at 0.
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [examState, isPaused]);

  const handleRunSimulation = async () => {
    const currentQ = examQuestions[currentQuestionIndex];
    if (!currentQ.userSql.trim()) {
      setSimulationError('נא לכתוב קוד שאילתת SQL לפני הרצה');
      return;
    }

    setIsSimulating(true);
    setSimulationResult(null);
    setSimulationError(null);

    try {
      const result = await simulateSqlExecution(currentQ.userSql, currentQ.question, userProfile, undefined, language);
      if (result.columns.includes('שגיאה') && result.rows.length === 1) {
        setSimulationError(result.rows[0][0]);
      } else {
        setSimulationResult(result);
      }
    } catch (err: any) {
      setSimulationError(err.message || 'אירעה שגיאה בסימולציית ההרצה של מנוע מסד הנתונים');
    } finally {
      setIsSimulating(false);
    }
  };

  // Grade the exam after submission
  const handleSubmitExam = async (isAutoTimeout = false) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsSubmitModalOpen(false);
    setEndTime(new Date());
    setExamState('grading');
    setGradingProgress(0);
    setGradingStatusText('שולח פתרונות לבדיקה במנוע ה-AI...');

    // We will grade each question sequentially with a delayed loader animation
    const gradedResults: ExamQuestion[] = [];
    let totalWeight = 0;
    
    examQuestions.forEach(eq => {
      totalWeight += getDifficultyWeight(eq.question.difficulty);
    });

    for (let i = 0; i < examQuestions.length; i++) {
      const eq = examQuestions[i];
      setGradingStatusText(`בודק ומעריך שאלה ${i + 1} מתוך ${examQuestions.length}: "${eq.question.title}"...`);
      setGradingProgress(Math.round(((i) / examQuestions.length) * 100));

      try {
        const grade = await gradeSqlQuery(eq.userSql, eq.question, userProfile, undefined, language);
        
        // Calculate points weight award for this difficulty
        const weight = getDifficultyWeight(eq.question.difficulty);
        const maxPointsForQuestion = (weight / totalWeight) * 100;
        const scoreAwarded = (grade.score / 100) * maxPointsForQuestion;

        gradedResults.push({
          ...eq,
          isGraded: true,
          gradeResult: grade,
          scoreAwarded: scoreAwarded
        });
      } catch (err) {
        console.error(`Error grading question index ${i}:`, err);
        // Fallback grade in case of error
        const isBlank = !eq.userSql || eq.userSql.includes('כתוב את ה-SQL שלך כאן');
        const calcAward = isBlank ? 0 : (0.5 * (getDifficultyWeight(eq.question.difficulty) / totalWeight) * 100);

        gradedResults.push({
          ...eq,
          isGraded: true,
          gradeResult: {
            score: isBlank ? 0 : 50,
            feedback: isBlank ? 'שאילתה ריקה - לא התקבל מענה' : 'שגיאת AI בחישוב. קוד נבדק בסימולציה תבניתית.',
            isCorrect: false,
            explanation: `נראה שיש עומס תקשורתי מול מנוע ההערכה. הפתרון הנכון המבוקש הוא:\n\n${eq.question.correctSql}`
          },
          scoreAwarded: calcAward
        });
      }

      // Small sleep to ensure a sleek presentation of the process checking
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setGradingProgress(100);
    setGradingStatusText('מעבד ציונים סופיים ומחשב משקלות...');

    // Calculate final weighted sum
    let totalScoreAwarded = 0;
    gradedResults.forEach(gr => {
      totalScoreAwarded += gr.scoreAwarded || 0;
    });

    // Round score nicely
    const finalRoundedScore = Math.max(0, Math.min(100, Math.round(totalScoreAwarded)));

    setExamQuestions(gradedResults);
    setExamScore(finalRoundedScore);
    setExamState('results');
    setReviewedQuestionIndex(0);
  };

  const getUnansweredCount = (): number => {
    return examQuestions.filter(eq => {
      const code = eq.userSql.replace(/--.*$/gm, '').trim();
      return code.length === 0;
    }).length;
  };

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Autocomplete metadata schema for CodeMirror (memoized)
  const sqlSchema = useMemo(() => {
    const schema: Record<string, string[]> = {};
    INSURANCE_SCHEMA.forEach((table) => {
      schema[table.name] = table.columns.map((col) => col.name);
    });
    return schema;
  }, []);

  // Create auto-completions on SQL schema (memoized)
  const completeSqlList = useMemo(() => {
    return COMMON_SQL_FUNCTIONS.map(f => ({
      label: f,
      type: "keyword",
      boost: 99
    }));
  }, []);

  // Memoized CodeMirror extensions for maximum performance
  const editorExtensions = useMemo(() => {
    return [
      sql({
        schema: sqlSchema,
        upperCaseKeywords: true,
        dialect: PostgreSQL
      }),
      PostgreSQL.language.data.of({
        autocomplete: completeFromList(completeSqlList)
      })
    ];
  }, [sqlSchema, completeSqlList]);

  return (
    <div className="h-full flex flex-col bg-slate-50 relative" dir="rtl">
      
      {/* HEADER SECTION */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-blue-100 text-blue-800 rounded-full text-xs font-black uppercase tracking-wider">נשק אקטוארי</span>
            <h1 className="text-xl md:text-2xl font-black text-slate-950 flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-blue-600" />
              סימולטור מבחנים מקצועי ב-SQL וביטוח
            </h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            מערכת הערכה מתקדמת המשלבת ניתוח משקלי של דרגות קושי וחיתוך חוקים ביטוחיים.
          </p>
        </div>

        {examState === 'active' && (
          <div className="flex items-center gap-4 bg-slate-900 text-white rounded-2xl p-2 px-5 shadow-lg shadow-slate-900/10 self-stretch md:self-auto justify-between md:justify-start">
            <div className="flex items-center gap-2 font-mono font-bold text-lg">
              <Timer className={cn("w-5 h-5 animate-pulse", timeRemaining < 120 ? "text-red-500" : "text-blue-400")} />
              <span className={cn(timeRemaining < 120 ? "text-red-400" : "text-slate-200")}>
                {formatTimer(timeRemaining)}
              </span>
            </div>
            
            {/* Pause Control */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-slate-300 transition-all border border-slate-700"
              title={isPaused ? (isHe ? "המשך מבחן" : "Resume Exam") : (isHe ? "הפסקה (עד 5 דק')" : "Pause (Up to 5 min)")}
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
            </button>

            <div className="h-4 w-px bg-slate-800"></div>
            <button
              onClick={() => {
                const unanswered = getUnansweredCount();
                if (unanswered > 0) {
                  setIsSubmitModalOpen(true);
                } else {
                  handleSubmitExam(false);
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow"
            >
              <Award className="w-3.5 h-3.5" />
              הגש מבחן פתור
            </button>
          </div>
        )}

        {examState === 'results' && (
          <button
            onClick={() => setExamState('setup')}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-200"
          >
            <RotateCcw className="w-4 h-4" />
            מבחן חדש
          </button>
        )}
      </div>

      {/* SETUP PHASE SCREEN */}
      {examState === 'setup' && (
        <div className="flex-grow p-4 md:p-8 overflow-y-auto max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Customization Left Column Options */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Quick Config Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Settings className="w-5 h-5 text-blue-600" />
                    קביעת כמות שאלות המבחן
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-sm font-bold text-slate-700">סך השאלות במבחן:</span>
                    <span className="text-2xl font-black text-blue-600 font-mono">{questionCount}</span>
                  </div>

                  <div className="px-2">
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="1"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1.5 px-0.5">
                      <span>שאלה 1</span>
                      <span>5</span>
                      <span>10</span>
                      <span>15 שאלות</span>
                    </div>
                  </div>
                </div>

                {/* Advanced toggler */}
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2.5 px-4 rounded-xl transition-all"
                  >
                    <Settings className="w-4 h-4" />
                    {showAdvanced ? 'הסתר סינוני שאלות מתקדמים' : 'הצג סינוני שאלות מתקדמים (אופציונלי)'}
                  </button>
                </div>
              </div>

              {/* Advanced Filters panel */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-6"
                  >
                    
                    {/* Difficulty and Classification filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Difficulties selection */}
                      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                          דרגות קושי (לפחות אחת):
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {['Easy', 'Medium', 'Hard', 'Expert'].map(diff => {
                            const isSelected = selectedDifficulties.includes(diff);
                            return (
                              <button
                                key={diff}
                                type="button"
                                onClick={() => toggleDifficulty(diff)}
                                className={cn(
                                  "p-3 rounded-2xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1",
                                  isSelected 
                                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10" 
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                )}
                              >
                                <span>{decodeDifficulty(diff)}</span>
                                <span className={cn("text-[9px] font-normal", isSelected ? "text-blue-100" : "text-slate-400")}>
                                  משקל {getDifficultyWeight(diff)} נק'
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* SQL Topic Families selection */}
                      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                          {t('exams_sql_topics')}:
                        </h3>
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                          {Object.entries(SQL_TOPIC_NAMES).map(([id, name]) => {
                            const isSelected = selectedSqlTopics.includes(id);
                            return (
                              <label
                                key={id}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-xl border text-xs cursor-pointer transition-all",
                                  isSelected 
                                    ? "bg-slate-100 border-blue-300 text-slate-900" 
                                    : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSqlTopic(id)}
                                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="font-medium">{name[language]}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Insurance Topics Block */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                      <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                        <span>{t('exams_ins_topics')}:</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedInsuranceTopics(Object.keys(INSURANCE_TOPIC_NAMES))}
                            className="text-[10px] text-blue-600 hover:underline font-black"
                          >
                            {isHe ? "סמן הכל" : "Select All"}
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setSelectedInsuranceTopics([Object.keys(INSURANCE_TOPIC_NAMES)[0]])}
                            className="text-[10px] text-blue-600 hover:underline font-black"
                          >
                            {isHe ? "נקה" : "Clear"}
                          </button>
                        </div>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.entries(INSURANCE_TOPIC_NAMES).map(([id, name]) => {
                          const isSelected = selectedInsuranceTopics.includes(id);
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => toggleInsuranceTopic(id)}
                              className={cn(
                                "p-2.5 rounded-xl border text-xs font-bold transition-all text-center truncate",
                                isSelected 
                                  ? "bg-blue-50 border-blue-400 text-blue-800" 
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              {name[language]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Config Right Info summary card */}
            <div className="space-y-6">
              
              {/* Exam Allocation Calculator box */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 leading-none">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    קביעת זמנים ונקודות
                  </h3>
                  <h2 className="text-2xl font-black text-slate-100 mt-2">פירוט המבחן המיועד</h2>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Question match count badge */}
                  <div className="flex justify-between items-center py-2 border-b border-slate-800">
                    <span className="text-slate-400">מאגר שאלות מתאימות:</span>
                    <span className="font-mono bg-slate-800 p-1 px-2.5 text-slate-200 rounded-lg">
                      {getFilteredQuestionPool().length} שאלות
                    </span>
                  </div>

                  {/* Calculated dynamic timing */}
                  <div className="flex justify-between items-center py-2 border-b border-slate-800">
                    <span className="text-slate-400">זמן פתרון מומלץ ומותאם:</span>
                    <span className="font-mono bg-emerald-500/20 text-emerald-400 p-1 px-2.5 rounded-lg font-black text-sm">
                      {Math.ceil(calculateAllocatedTimeSeconds(getFilteredQuestionPool().slice(0, questionCount)) / 60)} דקות
                    </span>
                  </div>

                  {/* Points scaling weight */}
                  <div className="flex justify-between items-start py-2">
                    <span className="text-slate-400">טווח ציון אבטחה:</span>
                    <div className="text-left">
                      <span className="font-mono text-slate-200 font-bold">0 - 100 נקודות</span>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal max-w-[160px]">
                        שאלות ברמת קושי גבוהה יותר (כמו מומחה או קשה) מקבלות משקל ציון וניקוד גבוה בהתאמה!
                      </p>
                    </div>
                  </div>
                </div>

                {/* START ACTION BUTON */}
                <button
                  type="button"
                  onClick={handleStartExam}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 group cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                  התחל סימולציית מבחן
                </button>
              </div>

              {/* Instructions memo */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-900 space-y-3 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  מידע חשוב לנבחנים:
                </div>
                <ul className="list-disc leading-snug list-inside space-y-1.5 text-slate-700">
                  <li>במהלך המבחן תוכלי להריץ ולבדוק את השאילתה שלך על גבי מנוע ביטוחי אמיתי.</li>
                  <li><strong>לא יינתנו רמזים, פידבקים או פתרונות במהלך המבחן עצמו.</strong></li>
                  <li>רק לאחר הגשת המבחן (או תום הזמן המוקצב), המערכת תבצע בדיקה מעמיקה לכל שאילתה ותציג ציונים ופידבקים מפורטים.</li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ACTIVE TEST PHASE SCREEN */}
      {examState === 'active' && examQuestions.length > 0 && (
        <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
          
          {/* Right Sidebar - Questions selectors List */}
          <div className="w-full md:w-64 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">ניווט שאלות</span>
              <h2 className="text-sm font-extrabold text-slate-900 mt-1">מצב התקדמות פתרונות:</h2>
            </div>

            <div className="p-2 space-y-1 flex-1">
              {examQuestions.map((eq, idx) => {
                const isSelected = idx === currentQuestionIndex;
                const isDrafted = eq.userSql.replace(/--.*$/gm, '').trim().length > 0;
                
                return (
                  <button
                    key={eq.question.id}
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      setSimulationResult(null);
                      setSimulationError(null);
                    }}
                    className={cn(
                      "w-full text-right p-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-between gap-3",
                      isSelected 
                        ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                    )}
                  >
                    <div className="flex flex-col gap-1 items-start">
                      <span className={cn("text-[10px]", isSelected ? "text-slate-400" : "text-slate-500")}>
                        שאלה {idx + 1}
                      </span>
                      <span className="font-extrabold truncate max-w-[140px]">
                        {eq.question.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-md font-bold shrink-0",
                        isSelected ? "bg-slate-800 text-slate-300" : getDifficultyColor(eq.question.difficulty)
                      )}>
                        {decodeDifficulty(eq.question.difficulty)}
                      </span>
                      
                      {/* Solved blue-dot indicator */}
                      {isDrafted ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-400/50" title="נכתב מענה"></div>
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2 justify-between">
              <span className="text-[10px] text-slate-400 font-bold">נותרו ללא מענה:</span>
              <span className="font-mono text-xs font-black bg-blue-100 text-blue-900 p-1 px-2.5 rounded-lg">
                {getUnansweredCount()} מתוך {examQuestions.length}
              </span>
            </div>
          </div>

          {/* Active Workspace center panel */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Split Left: Code Editor & Result Sandbox */}
            <div className="flex-1 flex flex-col bg-[#1e1e1e] border-l border-slate-800 relative z-15 min-h-0">
              
              {/* Header Editor panel */}
              <div className="bg-[#2d2d2d] px-4 py-2.5 flex justify-between items-center text-slate-300 text-xs font-mono select-none border-b border-zinc-800 shrink-0">
                <span className="font-bold tracking-wider text-slate-200">WORKFLOW WORKSPACE - {currentQuestionIndex + 1} / {examQuestions.length}</span>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70"></div>
                </div>
              </div>

              {/* CodeMirror input Editor */}
              <div className="flex-1 overflow-auto bg-[#1e1e1e] min-h-[140px]" dir="ltr">
                <CodeMirror
                  value={examQuestions[currentQuestionIndex].userSql}
                  placeholder="-- Write your SQL query here..."
                  height="100%"
                  theme="dark"
                  extensions={editorExtensions}
                  onChange={(val) => {
                    const updated = [...examQuestions];
                    updated[currentQuestionIndex].userSql = val;
                    setExamQuestions(updated);
                  }}
                  className="h-full text-sm font-mono text-left ltr"
                  basicSetup={CODE_MIRROR_SETUP}
                />
              </div>

              {/* Sandbox Run Action bar */}
              <div className="bg-[#2d2d2d] p-3 border-t border-zinc-800 flex justify-between items-center shrink-0">
                <p className="text-[10px] text-slate-400 max-w-sm font-bold">
                  Run query to test against the database and make sure you have no syntax errors.
                </p>
                <button
                  type="button"
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow disabled:opacity-50"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Running query...
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5" />
                      Run Query
                    </>
                  )}
                </button>
              </div>

              {/* Sandbox simulation response panel */}
              <div className="h-44 bg-[#151515] text-[#ccc] border-t border-zinc-800 flex flex-col shrink-0 min-h-0 overflow-hidden font-mono text-xs">
                <div className="bg-zinc-900 border-b border-zinc-800 p-2 text-[10px] text-slate-400 font-extrabold select-none tracking-widest flex justify-between select-none">
                  <span>SANDBOX COMPILATION RESULT</span>
                  {simulationResult && <span>{simulationResult.rowCount} rows returned</span>}
                </div>
                <div className="flex-1 overflow-auto p-3">
                  {simulationError && (
                    <div className="bg-red-500/10 border border-red-500/20 p-2.5 text-red-400 rounded-lg flex items-start gap-2 max-w-xl">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <div className="leading-relaxed">
                        <span className="font-bold block text-sm">SQL Engine Error:</span>
                        {simulationError}
                      </div>
                    </div>
                  )}

                  {!simulationError && simulationResult && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse min-w-max">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-400">
                            {simulationResult.columns.map((col: string, cIdx: number) => (
                              <th key={cIdx} className="p-1 px-3 text-xs font-bold uppercase tracking-wider font-mono">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {simulationResult.rows.map((row: any[], rIdx: number) => (
                            <tr key={rIdx} className="hover:bg-zinc-900/50">
                              {row.map((val: any, valIdx: number) => (
                                <td key={valIdx} className="p-1 px-3 text-zinc-300 font-mono text-[11px]">
                                  {val === null || val === undefined ? <span className="text-zinc-600">NULL</span> : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!simulationError && !simulationResult && (
                    <div className="h-full flex items-center justify-center text-zinc-500 text-center flex-col gap-2">
                      <Code className="w-8 h-8 text-zinc-600 animate-pulse" />
                      <span>No query has been executed for this question yet</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Split Right: Question Details and Hints absence */}
            <div className="w-full md:w-80 bg-white border-r border-slate-200 p-6 flex flex-col justify-between shrink-0 overflow-y-auto">
              <div className="space-y-6">
                
                {/* Meta Badge difficulty */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-[10px] bg-blue-50 text-blue-800 p-1 px-2 rounded-md font-extrabold uppercase">שאלה {currentQuestionIndex + 1}</span>
                  <span className={cn(
                    "text-xs p-1 px-2.5 rounded-full font-black border",
                    getDifficultyColor(examQuestions[currentQuestionIndex].question.difficulty)
                  )}>
                    {decodeDifficulty(examQuestions[currentQuestionIndex].question.difficulty)}
                  </span>
                </div>

                <div className="space-y-3">
                  <h2 className="text-base font-black text-slate-900 leading-tight">
                    {examQuestions[currentQuestionIndex].question.title}
                  </h2>
                  <p className="text-slate-600 text-xs leading-relaxed font-semibold bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {examQuestions[currentQuestionIndex].question.description}
                  </p>
                </div>

                {/* DB ERD Help tip */}
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <Database className="w-4 h-4 text-blue-600" />
                    פרטי טבלאות קשורות:
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    השתמשי בטבלאות ממפת ה-ERD. זכרי שחיבור תביעות לתשלומי תביעות דורש מעבר בטבלת <code className="bg-slate-100 p-0.5 rounded font-mono font-bold">Claimants</code> באמצעות <code className="bg-slate-100 p-0.5 rounded font-mono">claimant_id</code>.
                  </p>
                </div>

                {/* Delayed Solution Hint warning block */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                  <HelpCircle className="w-5 h-5 text-slate-400 mx-auto" />
                  <h4 className="text-xs font-black text-slate-700">פתרון ורמזים דחויים</h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    המערכת נמצאת במצב בחינה רשמי. לא ניתן לראות רמזים או שאילתה פתורה עד לסיום והגשת כל השאלות.
                  </p>
                </div>

              </div>

              {/* Prev / Next question navigation controls below */}
              <div className="flex gap-2.5 pt-6 border-t border-slate-100 mt-6 md:mt-0">
                <button
                  type="button"
                  onClick={() => {
                    if (currentQuestionIndex > 0) {
                      setCurrentQuestionIndex(currentQuestionIndex - 1);
                      setSimulationResult(null);
                      setSimulationError(null);
                    }
                  }}
                  disabled={currentQuestionIndex === 0}
                  className="flex-1 p-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                  שאלה קודמת
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentQuestionIndex < examQuestions.length - 1) {
                      setCurrentQuestionIndex(currentQuestionIndex + 1);
                      setSimulationResult(null);
                      setSimulationError(null);
                    }
                  }}
                  disabled={currentQuestionIndex === examQuestions.length - 1}
                  className="flex-1 p-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  שאלה הבאה
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* COMPILATION AND EVALUATION LOADER SCREEN */}
      {examState === 'grading' && (
        <div className="flex-grow flex flex-col items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full text-center space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
            <div className="relative w-24 h-24 mx-auto">
              {/* Outer spinning ring */}
              <div className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin"></div>
              {/* Inner glowing core */}
              <div className="absolute inset-2.5 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                <BrainCircuit className="w-10 h-10 text-blue-600 animate-pulse" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-xl font-black text-slate-950">מנתח ומעריך את הביצועים שלך</h1>
              <p className="text-sm text-slate-500 font-medium">{gradingStatusText}</p>
            </div>

            <div className="space-y-2">
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300 shadow" 
                  style={{ width: `${gradingProgress}%` }}
                ></div>
              </div>
              <span className="font-mono text-xs font-bold text-slate-400">{gradingProgress}% הושלם</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl text-[11px] text-slate-400 leading-relaxed font-medium">
              כלי הערכת ה-AI שלנו משווה את שאילתת המענה שלך המיועדת להקשר העסקי, מנתח את יעילות הלופים, ומחשב אופטימיזציה למיליוני שורות דאטא.
            </div>
          </div>
        </div>
      )}

      {/* POST-TEST RESULTS SCORES & DETAILS DIALOG SCREEN */}
      {examState === 'results' && examQuestions.length > 0 && (
        <div className="flex-grow flex flex-col bg-slate-50 overflow-hidden">
          
          {/* Upper Summary Cards Row */}
          <div className="p-6 bg-white border-b border-slate-200 shrink-0">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6 items-center justify-between">
              
              <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-right">
                
                {/* Visual scorecard gauge */}
                <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
                    <circle 
                      cx="64" cy="64" r="56" fill="transparent" 
                      stroke={examScore >= 80 ? '#10b981' : examScore >= 55 ? '#3b82f6' : '#f43f5e'} 
                      strokeWidth="10" 
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - examScore / 100)}`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-black font-mono tracking-tight text-slate-950">{examScore}</span>
                    <span className="text-[10px] font-black text-slate-400 tracking-wider">ציון סופי</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-black text-slate-950">
                    {examScore >= 90 ? 'מצוין! סילבוס שילוב ברמת אנליסט' : examScore >= 80 ? 'מרשים מאוד! היגיון פתרון מעולה' : examScore >= 55 ? 'עברת את המבחן!' : 'ציון מתחת לסף השליטה'}
                  </h2>
                  <p className="text-slate-500 text-xs max-w-lg font-semibold leading-relaxed">
                    שאלות קשות ומורכבות קיבלו משקל השפעה גדול בהרבה. המערכת סימצה את הקוד שלך, ביצעה השוואה פונקציונלית למבני ה-CTE ואינדקסי הפוליסה ודרגה ציון משוקלל.
                  </p>
                </div>
              </div>

              {/* Highlighting stats parameters blocks */}
              <div className="flex gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 self-stretch md:self-auto justify-center">
                <div className="text-center px-4 border-l border-slate-200">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase block select-none">משך הזמן</span>
                  <span className="text-sm font-black text-slate-800 font-mono block mt-1">
                    {Math.round((endTime!.getTime() - startTime!.getTime()) / 60000)} דקות
                  </span>
                </div>
                <div className="text-center px-4 border-l border-slate-200">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase block select-none">שאלות מדוייקות</span>
                  <span className="text-sm font-black text-slate-800 font-mono block mt-1">
                    {examQuestions.filter(eq => eq.gradeResult?.isCorrect).length} / {examQuestions.length}
                  </span>
                </div>
                <div className="text-center px-4">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase block select-none">אחוז דיוק ממוצע</span>
                  <span className="text-sm font-black text-emerald-600 font-mono block mt-1">
                    {Math.round(examQuestions.reduce((acc, eq) => acc + (eq.gradeResult?.score || 0), 0) / examQuestions.length)}%
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Lower Review Split panel */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl mx-auto w-full p-4 md:p-6 gap-6 min-h-0">
            
            {/* Summary details List list layout on right */}
            <div className="w-full md:w-80 flex flex-col shrink-0 min-h-0 overflow-y-auto space-y-2 bg-white border border-slate-200 p-4 rounded-3xl shadow-sm">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">סקירה שאלות:</span>
              
              {examQuestions.map((eq, idx) => {
                const isSelected = idx === reviewedQuestionIndex;
                const score = eq.gradeResult?.score ?? 0;
                
                return (
                  <button
                    key={eq.question.id}
                    onClick={() => setReviewedQuestionIndex(idx)}
                    className={cn(
                      "w-full text-right p-3.5 rounded-2xl text-xs font-bold transition-all border flex flex-col gap-2 relative overflow-hidden",
                      isSelected 
                        ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                    )}
                  >
                    {/* Tiny visual strip status */}
                    <div className={cn(
                      "absolute top-0 bottom-0 right-0 w-1.5",
                      eq.gradeResult?.isCorrect ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-rose-500"
                    )}></div>

                    <div className="flex justify-between items-center w-full mr-2">
                      <span className={cn("text-[10px]", isSelected ? "text-slate-400" : "text-slate-500")}>
                        שאלה {idx + 1}
                      </span>
                      <span className={cn(
                        "text-[10px] font-mono font-black border p-0.5 px-1.5 rounded-md",
                        eq.gradeResult?.isCorrect 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                          : score >= 50 
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                            : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      )}>
                        ציון {score}
                      </span>
                    </div>

                    <span className="font-black truncate block w-full text-right pr-2">
                      {eq.question.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Expended details of review selected Question with solutions */}
            <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col min-h-0 overflow-y-auto">
              {(() => {
                const eq = examQuestions[reviewedQuestionIndex];
                if (!eq) return null;
                const rScore = eq.gradeResult?.score ?? 0;
                
                return (
                  <div className="p-6 md:p-8 space-y-8 flex-grow">
                    
                    {/* Section 1: Title and Score Breakdown */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
                      <div className="space-y-1">
                        <span className="text-xs text-blue-600 font-extrabold uppercase">פידבק מפורט - שאלה {reviewedQuestionIndex + 1}</span>
                        <h2 className="text-lg md:text-xl font-black text-slate-900 leading-tight">
                          {eq.question.title}
                        </h2>
                      </div>

                      <div className="flex flex-col items-center sm:items-end gap-1.5 self-stretch sm:self-auto">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "p-1.5 px-3.5 rounded-full text-xs font-black border flex items-center gap-1 shrink-0",
                            eq.gradeResult?.isCorrect
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : rScore >= 50
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            {eq.gradeResult?.isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500" />
                            )}
                            {eq.gradeResult?.isCorrect ? 'עבר בהצלחה' : rScore >= 50 ? 'נחוץ שיפור מינורי' : 'לא עבר'}
                          </span>

                          <span className="font-mono text-2xl font-black text-slate-900">
                            {rScore}<span className="text-sm font-normal text-slate-400">/100</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">
                          ניקוד משקל יחסי במבחן: {eq.scoreAwarded ? eq.scoreAwarded.toFixed(1) : 0} נק'
                        </span>
                      </div>
                    </div>

                    {/* Section 2: Question and Requirements */}
                    <div className="space-y-2">
                      <h3 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 select-none">דרישת השאלה והגדרות עסקיות:</h3>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-relaxed text-xs text-slate-700 font-bold">
                        {eq.question.description}
                      </div>
                    </div>

                    {/* Section 3: Comparative code display */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* User's SQL submitted */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs uppercase text-slate-400 font-extrabold tracking-wider select-none">קוד שהגשת במענה:</h4>
                          <span className="text-[10px] text-slate-400 font-bold font-mono">User Code</span>
                        </div>
                        <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs max-h-72 overflow-y-auto">
                          <SyntaxHighlighter 
                            language="sql" 
                            style={vscDarkPlus}
                            customStyle={{ margin: 0, padding: '16px', background: '#1e1e1e' }}
                          >
                            {formatSql(eq.userSql)}
                          </SyntaxHighlighter>
                        </div>
                      </div>

                      {/* Correct / Reference SQL solution */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs uppercase text-slate-400 font-extrabold tracking-wider select-none">פתרון נכון רפרנס במערכת:</h4>
                          <span className="text-[10px] text-blue-600 font-bold font-mono">Reference SQL</span>
                        </div>
                        <div className="rounded-2xl border border-blue-100 overflow-hidden text-xs max-h-72 overflow-y-auto shadow-sm">
                          <SyntaxHighlighter 
                            language="sql" 
                            style={vscDarkPlus}
                            customStyle={{ margin: 0, padding: '16px', background: '#1e1e1e' }}
                          >
                            {formatSql(eq.question.correctSql)}
                          </SyntaxHighlighter>
                        </div>
                      </div>

                    </div>

                    {/* Section 4: Performance explanation & Detailed review analysis */}
                    <div className="space-y-4">
                      
                      {/* Detailed comparison feedback explanation */}
                      <div className="p-5 bg-blue-50/40 border border-blue-100 rounded-2xl space-y-3">
                        <h4 className="text-xs font-black text-blue-950 flex items-center gap-1.5 leading-none">
                          <Eye className="w-4 h-4 text-blue-600" />
                          ניתוח פתרון ופידבק מנוע AI:
                        </h4>
                        
                        <div className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-medium">
                          {eq.gradeResult?.explanation}
                        </div>
                      </div>

                      {/* Performance warning check if any */}
                      {eq.gradeResult?.performanceWarning && (
                        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                          <div className="space-y-1 text-xs leading-relaxed">
                            <span className="font-black text-amber-950 block">אזהרת אופטימיזציה / ביצועים במאגר גדול:</span>
                            <p>{eq.gradeResult.performanceWarning}</p>
                            {eq.gradeResult.optimizedSql && (
                              <div className="mt-3 overflow-hidden rounded-xl border border-amber-200">
                                <SyntaxHighlighter 
                                  language="sql" 
                                  style={vscDarkPlus}
                                  customStyle={{ margin: 0, padding: '12px', background: '#1e1e1e' }}
                                >
                                  {formatSql(eq.gradeResult.optimizedSql)}
                                </SyntaxHighlighter>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>

                  </div>
                );
              })()}
            </div>

          </div>

        </div>
      )}

      {/* PAUSE OVERLAY */}
      <AnimatePresence>
        {isPaused && examState === 'active' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 p-8 md:p-12 rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col items-center text-center max-w-md w-full relative overflow-hidden"
            >
              {/* Decorative background element */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl"></div>

              <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-8 border border-blue-500/20 shadow-inner">
                <Timer className="w-12 h-12 text-blue-400 animate-pulse" />
              </div>
              
              <h2 className="text-3xl font-black mb-3 tracking-tight">{isHe ? "הפסקה מתוזמנת" : "Timed Break"}</h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium">
                {isHe 
                  ? "החלטת לקחת פסק זמן קצר. המבחן מושהה כרגע ואינו גוזל זמן פתרון. שימי לב שהמבחן יחזור לפעולה באופן אוטומטי בתום 5 דקות." 
                  : "You've decided to take a short break. The exam is paused and no time is being consumed. Please note the exam will automatically resume after 5 minutes."}
              </p>
              
              <div className="bg-slate-950/80 p-6 rounded-3xl mb-10 w-full border border-slate-800 shadow-inner">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">{isHe ? "זמן שנותר להפסקה" : "Break time remaining"}</span>
                <div className="text-5xl font-black text-blue-400 font-mono">
                  {formatTimer(pauseTimeRemaining)}
                </div>
              </div>

              <button
                onClick={() => setIsPaused(false)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-600/20 active:scale-95 group"
              >
                <Play className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
                {isHe ? "חזרה למבחן" : "Resume Exam"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION SUBMISSION MODAL DIALOG */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden"
              dir="rtl"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500 rounded-2xl text-white">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">האם להגיש את המבחן?</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">נותרו שאלות ללא מענה פתור</p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 leading-relaxed font-bold">
                  שם לב: נותרו <span className="text-sm font-black text-amber-700">{getUnansweredCount()}</span> שאלות שלא כתבת עבורן שורות קוד שאילתת SQL כלל. הגשת המבחן תסקור אותן בציון 0 באופן אוטומטי.
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => handleSubmitExam(false)}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-black text-xs transition-all shadow-md shadow-blue-500/15"
                  >
                    הגש בכל זאת
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs transition-all border border-slate-200"
                  >
                    חזור למבחן
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
