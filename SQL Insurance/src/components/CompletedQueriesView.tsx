import React, { useState, useEffect, useMemo } from 'react';
import { Question, GradeResult, analyzePerformance, PerformanceAnalysis, UserProfile, recoverCorrectSql, analyzeSelectedQueries, SelectedQueriesAnalysis, compareTwoQueries, ComparisonResult, LearningAnalysis, analyzeLearningFailures } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Clock, ChevronLeft, BarChart3, Target, Sparkles, Loader2, ArrowLeft, RotateCcw, AlertTriangle, Wand2, Filter, ArrowUpDown, Search, Bookmark, BookmarkCheck, Trash2, Highlighter, GitCompare, X, Bot, MessageSquare, BrainCircuit, Lightbulb } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Markdown from 'react-markdown';
import { cn, formatSql, extractTextFromChildren } from '../lib/utils';
import { db, savePerformanceAnalysis, auth, SavedTip, getSavedTips, saveTip, deleteSavedTip, updateSavedTip, PerformanceAnalysisData } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { FALLBACK_QUESTIONS } from '../constants';
import { FollowUpChat } from './FollowUpChat';
import { useLanguage } from '../context/LanguageContext';

export interface CompletedQuestion {
  id?: string;
  question: Question;
  userSql: string;
  timestamp: Date;
  score: number;
  isCorrect: boolean;
  explanation: string;
  role?: string;
  department?: string;
  chatHistory?: { role: 'user' | 'model'; content: string }[];
  chatSummary?: string;
}

function getQuestionTechnicalTopics(item: CompletedQuestion): string[] {
  // המרה ל-any עוקפת את הנוקשות של המהדר ומאפשרת בדיקה בטוחה לחלוטין בזמן ריצה
  const correctSql = (item as any).question?.correctSql || (item as any).correctSql || '';
  const sqlText = ((item.userSql || '') + ' ' + correctSql).toLowerCase();
  const tags: string[] = [];
  
  if (sqlText.includes('join')) {
    tags.push('ג׳וינים וחיבורי טבלאות');
  }
  if (sqlText.includes('group by') || sqlText.includes('sum(') || sqlText.includes('avg(') || sqlText.includes('count(') || sqlText.includes('max(') || sqlText.includes('min(')) {
    tags.push('אגרגציות וקיבוץ');
  }
  if (sqlText.includes('with ') || sqlText.includes('(select ') || (sqlText.includes('select ') && sqlText.split('select').length > 2)) {
    tags.push('תתי-שאילתות ו-CTEs');
  }
  if (sqlText.includes('julianday') || sqlText.includes('strftime') || sqlText.includes('date(')) {
    tags.push('פונקציות תאריך וזמן');
  }
  if (sqlText.includes('over (') || sqlText.includes('partition by') || sqlText.includes('row_number()') || sqlText.includes('rank()')) {
    tags.push('פונקציות חלון');
  }
  if (sqlText.includes('case when') || sqlText.includes('coalesce') || sqlText.includes('ifnull')) {
    tags.push('תנאים וביטויים מותנים');
  }
  if (tags.length === 0) {
    tags.push('שאילתות בסיסיות');
  }
  return tags;
}

function getQuestionInsuranceTopics(item: CompletedQuestion): string[] {
  // הגנה זהה גם עבור פונקציית תחומי הביטוח למטה
  const category = (item as any).question?.category || (item as any).category || '';
  if (!category) return ['כללי'];
  return [category];
}

interface ParsedHighlight {
  raw: string;
  text: string;
  color: string;
}

const parseHighlight = (h: string): ParsedHighlight => {
  if (typeof h !== 'string') return { raw: String(h), text: String(h), color: 'yellow' };
  const match = h.match(/^(yellow|pink|orange|blue|green):::(.*)$/s);
  if (match) {
    return {
      raw: h,
      color: match[1],
      text: match[2]
    };
  }
  return {
    raw: h,
    text: h,
    color: 'yellow'
  };
};

const serializeHighlight = (text: string, color: string): string => {
  return `${color}:::${text}`;
};

const HIGHLIGHTER_COLORS = [
  { key: 'yellow', label: 'צהוב', bg: 'bg-yellow-250', border: 'border-yellow-400', hoverBg: 'hover:bg-yellow-300', text: 'text-yellow-800' },
  { key: 'pink', label: 'ורוד', bg: 'bg-pink-200', border: 'border-pink-400', hoverBg: 'hover:bg-pink-300', text: 'text-pink-800' },
  { key: 'orange', label: 'כתום', bg: 'bg-orange-200', border: 'border-orange-400', hoverBg: 'hover:bg-orange-300', text: 'text-orange-800' },
  { key: 'blue', label: 'תכלת', bg: 'bg-sky-200', border: 'border-sky-400', hoverBg: 'hover:bg-sky-300', text: 'text-sky-800' },
  { key: 'green', label: 'ירוק', bg: 'bg-emerald-250', border: 'border-emerald-400', hoverBg: 'hover:bg-emerald-300', text: 'text-emerald-800' },
];

interface Props {
  completed: CompletedQuestion[];
  onStartTargetedPractice: (topic: string) => void;
  userProfile?: UserProfile | null;
  performanceAnalysis?: PerformanceAnalysisData | null;
  onUpdatePerformanceAnalysis?: (analysis: PerformanceAnalysisData) => void;
  isActive?: boolean;
  onNavigateToTab?: (tab: 'practice' | 'erd' | 'completed' | 'learning' | 'daily' | 'exams' | 'saved') => void;
  savedTipsCount?: number;
}

export const CompletedQueriesView: React.FC<Props> = ({ 
  completed, 
  onStartTargetedPractice, 
  userProfile,
  performanceAnalysis,
  onUpdatePerformanceAnalysis,
  isActive = false,
  onNavigateToTab,
  savedTipsCount = 0
}) => {
  const { t, isHe, language, dir } = useLanguage();
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(() => {
    if (performanceAnalysis) {
      return {
        strengths: performanceAnalysis.strengths,
        weaknesses: performanceAnalysis.weaknesses,
        recommendations: performanceAnalysis.recommendations,
        suggestedTopics: performanceAnalysis.suggestedTopics
      };
    }
    return null;
  });

  // Sync state if performanceAnalysis prop changes
  useEffect(() => {
    if (performanceAnalysis) {
      setAnalysis({
        strengths: performanceAnalysis.strengths,
        weaknesses: performanceAnalysis.weaknesses,
        recommendations: performanceAnalysis.recommendations,
        suggestedTopics: performanceAnalysis.suggestedTopics
      });
    }
  }, [performanceAnalysis]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [repairingIds, setRepairingIds] = useState<Set<string>>(new Set());
  const [expandedChatIds, setExpandedChatIds] = useState<Set<string>>(new Set());
  const [savedTips, setSavedTips] = useState<SavedTip[]>([]);
  const [loadingSavedTips, setLoadingSavedTips] = useState(false);
  const [activeSelection, setActiveSelection] = useState<{ tipId: string; selectedText: string } | null>(null);
  const [highlighterColor, setHighlighterColor] = useState<string>('yellow');

  // Custom Selection & Analysis States
  const [selectedQueryIds, setSelectedQueryIds] = useState<Set<string>>(new Set());
  const [customAnalysis, setCustomAnalysis] = useState<SelectedQueriesAnalysis | null>(null);
  const [isAnalyzingSelected, setIsAnalyzingSelected] = useState(false);
  const [customAnalysisError, setCustomAnalysisError] = useState<string | null>(null);

  // Learning Analysis States
  const [learningAnalysis, setLearningAnalysis] = useState<LearningAnalysis | null>(null);
  const [isAnalyzingLearning, setIsAnalyzingLearning] = useState(false);
  const [learningAnalysisError, setLearningAnalysisError] = useState<string | null>(null);

  // Comparison States
  const [comparingItems, setComparingItems] = useState<{ item1: CompletedQuestion; item2: CompletedQuestion } | null>(null);
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Active chat state
  const [activeChatItemId, setActiveChatItemId] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterTechTopic, setFilterTechTopic] = useState<string>('all');
  const [filterInsuranceTopic, setFilterInsuranceTopic] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');

  const technicalTopics = [
    'ג\'וינים וחיבורי טבלאות',
    'אגרגציות וקיבוץ',
    'תתי-שאילתות ו-CTEs',
    'פונקציות תאריך וזמן',
    'פונקציות חלון',
    'תנאים וביטויים מותנים',
    'שאילתות בסיסיות'
  ];

  const insuranceTopics = [
    'מבוטחים ופוליסות',
    'תביעות ותובעים',
    'תשלומי תביעות',
    'שמאים והערכות נזק',
    'סוכנים, סוכנויות ותקציבים',
    'מוצרים וענפי ביטוח',
    'כללי / מנהלתי'
  ];

  // Deduplicate history: only keep the highest score per question
  const deduplicatedCompleted = useMemo(() => {
    const bestByQuestion = new Map<string, CompletedQuestion>();
    
    completed.forEach(item => {
      // Use question title as a more reliable key for grouping similar questions if IDs are randomized
      const key = (item as any).title || item.question?.title || item.question?.id || item.id;
      if (!key) return;
      
      const existing = bestByQuestion.get(key);
      if (!existing || item.score > existing.score) {
        bestByQuestion.set(key, item);
      }
    });

    return Array.from(bestByQuestion.values());
  }, [completed]);

  // Master selector of processing and sorting
  const processedCompleted = useMemo(() => {
    // Tag them for sorting/filtering
    const items = deduplicatedCompleted.map(item => {
      const techTags = getQuestionTechnicalTopics(item);
      const insTags = getQuestionInsuranceTopics(item);
      return {
        ...item,
        techTags,
        insTags
      };
    });

    // 1. Search filter
    let filtered = items.filter(item => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.question.title.toLowerCase().includes(term) ||
        item.question.description.toLowerCase().includes(term) ||
        (item.userSql || '').toLowerCase().includes(term)
      );
    });

    // 2. Difficulty Filter
    if (filterDifficulty !== 'all') {
      filtered = filtered.filter(item => item.question.difficulty === filterDifficulty);
    }

    // 2.5 Status Filter (Correct vs. Incorrect)
    if (filterStatus !== 'all') {
      const wantCorrect = filterStatus === 'correct';
      filtered = filtered.filter(item => item.isCorrect === wantCorrect);
    }

    // 3. Tech topic Filter
    if (filterTechTopic !== 'all') {
      filtered = filtered.filter(item => item.techTags.includes(filterTechTopic));
    }

    // 4. Insurance topic Filter
    if (filterInsuranceTopic !== 'all') {
      filtered = filtered.filter(item => item.insTags.includes(filterInsuranceTopic));
    }

    // 5. Sorting
    const difficultyWeight = { 'Easy': 1, 'Medium': 2, 'Hard': 3, 'Expert': 4 };
 return filtered.sort((a: any, b: any) => {
    const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
    const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
    return timeB - timeA; // מציג מהחדש ביותר לישן ביותר
  });
  }, [deduplicatedCompleted, searchTerm, filterDifficulty, filterTechTopic, filterInsuranceTopic, filterStatus, sortBy]);

  useEffect(() => {
    if (isActive && deduplicatedCompleted.length >= 3 && !analysis) {
      handleAnalyze();
    }
  }, [deduplicatedCompleted, isActive, analysis]);

  useEffect(() => {
    if (!auth.currentUser) {
      setSavedTips([]);
      return;
    }

    setLoadingSavedTips(true);
    const q = query(
      collection(db, 'saved_tips'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tips = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          text: data.text,
          category: data.category,
          sourceId: data.sourceId,
          sourceTitle: data.sourceTitle,
          sourceType: data.sourceType,
          savedAt: data.savedAt?.toDate() || new Date(),
          highlightedLines: data.highlightedLines || []
        } as SavedTip;
      });

      // Sort in memory by savedAt descending to bypass Firestore composite index requirements
      const sortedTips = tips.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
      setSavedTips(sortedTips);
      setLoadingSavedTips(false);
    }, (error) => {
      console.error("Error listening to saved tips in CompletedQueriesView:", error);
      setLoadingSavedTips(false);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const handleToggleSaveTip = async (text: string, category: string, sourceId?: string, sourceTitle?: string, sourceType?: string) => {
    if (!auth.currentUser) return;
    const existingIndex = savedTips.findIndex(t => t.text === text);
    if (existingIndex > -1) {
      const tipToDelete = savedTips[existingIndex];
      try {
        await deleteSavedTip(tipToDelete.id);
      } catch (error) {
        console.error("Error deleting tip:", error);
      }
    } else {
      try {
        await saveTip(auth.currentUser.uid, text, category, sourceId, sourceTitle, sourceType);
      } catch (error) {
        console.error("Error saving tip:", error);
      }
    }
  };

  const handleDeleteSavedTip = async (id: string) => {
    try {
      await deleteSavedTip(id);
    } catch (error) {
      console.error("Error deleting tip:", error);
    }
  };

  const handleToggleLineHighlight = async (tipId: string, lineText: string, chosenColor?: string) => {
    const tip = savedTips.find(t => t.id === tipId);
    if (!tip) return;

    const currentHighlights = tip.highlightedLines || [];
    let updatedHighlights: string[];

    // Parse existing to see if our text is already highlighted
    const parsed = currentHighlights.map(h => parseHighlight(h));
    const exists = parsed.find(p => p.text === lineText);

    if (exists) {
      // Remove it (regardless of its color)
      updatedHighlights = currentHighlights.filter(h => {
        const parsedH = parseHighlight(h);
        return parsedH.text !== lineText;
      });
    } else {
      // Add it with the chosen color (or default)
      const color = chosenColor || 'yellow';
      const serialized = serializeHighlight(lineText, color);
      updatedHighlights = [...currentHighlights, serialized];
    }

    // Snappy UI update
    setSavedTips(prev => prev.map(t => t.id === tipId ? { ...t, highlightedLines: updatedHighlights } : t));

    try {
      await updateSavedTip(tipId, { highlightedLines: updatedHighlights });
    } catch (error) {
      console.error("Error updating tip highlight in firebase:", error);
    }
  };

  const handleTextSelection = (tipId: string) => {
    const selection = window.getSelection();
    if (!selection) return;
    const selectedText = selection.toString().trim();
    
    // We make sure the selection is valid, more than 1 character and exists in the actual tip text
    if (selectedText && selectedText.length > 1) {
      const tip = savedTips.find(t => t.id === tipId);
      if (tip && tip.text.includes(selectedText)) {
        setActiveSelection({ tipId, selectedText });
      }
    }
  };

  const clearSelection = () => {
    setActiveSelection(null);
    try {
      window.getSelection()?.removeAllRanges();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection) return;
      const selectedText = selection.toString().trim();
      
      if (selectedText && selectedText.length > 1) {
        // Find which tip contains this selected text
        const matchingTip = savedTips.find(t => t.text.includes(selectedText));
        if (matchingTip) {
          setActiveSelection({ tipId: matchingTip.id, selectedText });
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [savedTips]);

  useEffect(() => {
    if (!activeSelection) return;

    const handleGlobalClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest('.saved-tip-card') || 
        target.closest('.selection-helper-menu')
      ) {
        return;
      }
      clearSelection();
    };

    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [activeSelection]);

  const renderTextWithHighlights = (tipId: string, text: string, highlights: string[]) => {
    if (!highlights || highlights.length === 0) {
      return <span className="whitespace-pre-line leading-relaxed">{text}</span>;
    }

    // Parse valid highlights & sort descending so we match larger chunks first and prevent nested mismatching
    const parsed = (highlights || [])
      .map(h => parseHighlight(h))
      .filter((ph) => ph.text.trim().length > 0)
      .sort((a, b) => b.text.length - a.text.length);

    if (parsed.length === 0) {
      return <span className="whitespace-pre-line leading-relaxed">{text}</span>;
    }

    interface MatchSegment {
      start: number;
      end: number;
      text: string;
      color: string;
    }

    const matches: MatchSegment[] = [];

    parsed.forEach((ph) => {
      let index = text.indexOf(ph.text);
      while (index !== -1) {
        const overlaps = matches.some(m => 
          (index >= m.start && index < m.end) || 
          (index + ph.text.length > m.start && index + ph.text.length <= m.end) ||
          (m.start >= index && m.start < index + ph.text.length)
        );

        if (!overlaps) {
          matches.push({
            start: index,
            end: index + ph.text.length,
            text: ph.text,
            color: ph.color
          });
        }
        index = text.indexOf(ph.text, index + 1);
      }
    });

    matches.sort((a, b) => a.start - b.start);

    const segments: React.ReactNode[] = [];
    let currentIndex = 0;

    matches.forEach((match, index) => {
      if (match.start > currentIndex) {
        segments.push(
          <span key={`text-${currentIndex}`} className="whitespace-pre-line leading-relaxed">
            {text.substring(currentIndex, match.start)}
          </span>
        );
      }

      const colorData = HIGHLIGHTER_COLORS.find(c => c.key === match.color) || HIGHLIGHTER_COLORS[0];

      segments.push(
        <mark
          key={`highlight-${match.start}-${index}`}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleLineHighlight(tipId, match.text);
          }}
          className={cn(
            "font-bold px-1.5 py-0.5 rounded-sm cursor-pointer transition-all mx-0.5 inline-block select-none",
            "hover:bg-red-100 hover:text-red-900 hover:border-red-400 border-b-2",
            colorData.bg,
            colorData.border
          )}
          title="לחץ להסרת המרקר"
          style={{ WebkitTapHighlightColor: 'rgba(239, 68, 68, 0.4)' }}
        >
          {match.text}
        </mark>
      );

      currentIndex = match.end;
    });

    if (currentIndex < text.length) {
      segments.push(
        <span key={`text-end`} className="whitespace-pre-line leading-relaxed">
          {text.substring(currentIndex)}
        </span>
      );
    }

    return <>{segments}</>;
  };

  const isTipSaved = (text: string) => {
    return savedTips.some(t => t.text === text);
  };

  const handleToggleQuerySelection = (itemId: string) => {
    setSelectedQueryIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleAnalyzeSelected = async () => {
    if (selectedQueryIds.size === 0) return;
    setIsAnalyzingSelected(true);
    setCustomAnalysisError(null);
    try {
      const selectedItems = deduplicatedCompleted.filter((item, index) => {
        const id = item.id || (item.question.id + '-' + index);
        return selectedQueryIds.has(id);
      });

      if (selectedItems.length === 0) {
        throw new Error("No matching queries found");
      }

      const res = await analyzeSelectedQueries(selectedItems, userProfile, undefined, language);
      setCustomAnalysis(res);
      setTimeout(() => {
        const el = document.getElementById('custom-analysis-results');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    } catch (error) {
      console.error("Custom analysis error:", error);
      setCustomAnalysisError(isHe ? "נכשלנו בניתוח השאילתות שבחרת. אנא נסה שנית בעוד מספר רגעים." : "Failed to analyze selected queries. Please try again in a few moments.");
    } finally {
      setIsAnalyzingSelected(false);
    }
  };

  const handleLearningAnalysis = async () => {
    if (selectedQueryIds.size === 0) return;
    setIsAnalyzingLearning(true);
    setLearningAnalysisError(null);
    try {
      const selectedItems = deduplicatedCompleted.filter((item, index) => {
        const id = item.id || (item.question.id + '-' + index);
        return selectedQueryIds.has(id);
      });

      if (selectedItems.length === 0) {
        throw new Error("No matching queries found");
      }

      const res = await analyzeLearningFailures(selectedItems, userProfile, undefined, language);
      setLearningAnalysis(res);
      setTimeout(() => {
        const el = document.getElementById('learning-analysis-results');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    } catch (error) {
      console.error("Learning analysis error:", error);
      setLearningAnalysisError(isHe ? "נכשלנו ביצירת ניתוח הלמידה. אנא נסה שנית." : "Failed to generate learning analysis. Please try again.");
    } finally {
      setIsAnalyzingLearning(false);
    }
  };

  const triggerComparison = async (item1: CompletedQuestion, item2: CompletedQuestion) => {
    setIsComparing(true);
    setComparisonError(null);
    setComparisonResult(null);
    try {
      const result = await compareTwoQueries(
        item1.question,
        {
          sql: item1.userSql,
          score: item1.score,
          isCorrect: item1.isCorrect,
          explanation: item1.explanation
        },
        {
          sql: item2.userSql,
          score: item2.score,
          isCorrect: item2.isCorrect,
          explanation: item2.explanation
        },
        undefined,
        language
      );
      setComparisonResult(result);
    } catch (err) {
      console.error("Comparison load error:", err);
      setComparisonError(isHe ? "שגיאה בחיבור לשרתי ה-AI לצורך הפקת השוואה." : "Error retrieving AI comparison.");
    } finally {
      setIsComparing(false);
    }
  };

  const handleCompareSelected = async () => {
    const selected = deduplicatedCompleted.filter((item, index) => {
      const id = item.id || (item.question.id + '-' + index);
      return selectedQueryIds.has(id);
    });
    if (selected.length !== 2) return;

    setComparingItems({ item1: selected[0], item2: selected[1] });
    setComparisonModalOpen(true);
    triggerComparison(selected[0], selected[1]);
  };

  const handleOpenInlineComparison = (item: CompletedQuestion) => {
    // find all other attempts for this exact question
    const otherAttempts = deduplicatedCompleted.filter(other => 
      other.question.title === item.question.title && 
      (other.id !== item.id || other.timestamp.getTime() !== item.timestamp.getTime())
    );

    if (otherAttempts.length === 0) {
      alert(isHe 
        ? "לא נמצאו ניסיונות הגשה נוספים לשאלה זו לצורך ביצוע השוואה פנימית. נסה להגיש פתרונות נוספים וחדשים לתנאי שאילתה זו!" 
        : "No other submission attempts found for this question to conduct a side-by-side comparison. Try writing and submitting an alternative solution first!"
      );
      return;
    }

    // pre-select the current item and the first available other attempt
    setComparingItems({ item1: item, item2: otherAttempts[0] });
    setComparisonModalOpen(true);
    triggerComparison(item, otherAttempts[0]);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await analyzePerformance(deduplicatedCompleted, userProfile, undefined, language);
      setAnalysis(res);
      if (auth.currentUser) {
        await savePerformanceAnalysis(auth.currentUser.uid, res);
      }
      if (onUpdatePerformanceAnalysis) {
        onUpdatePerformanceAnalysis({
          ...res,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleChatExpansion = (id: string) => {
    setExpandedChatIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRepair = async (item: CompletedQuestion) => {
    if (!item.id) return;
    
    setRepairingIds(prev => new Set(prev).add(item.id!));
    try {
      // 1. Try fallback
      const fallback = FALLBACK_QUESTIONS.find(f => 
        f.title === item.question.title || 
        f.description === item.question.description
      );
      let solution = fallback?.correctSql;
      
      // 2. If not in fallback, use AI
      if (!solution) {
        solution = await recoverCorrectSql(item.question.title, item.question.description, undefined, language);
      }
      
      if (solution) {
        await updateDoc(doc(db, 'completed_questions', item.id), {
          correctSql: solution
        });
      }
    } catch (error) {
      console.error("Repair error:", error);
    } finally {
      setRepairingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id!);
        return next;
      });
    }
  };

  if (completed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 bg-slate-50" dir={dir}>
        <Clock className="w-16 h-16 opacity-20" />
        <p className="text-xl font-medium">{isHe ? "עדיין לא ביצעת שאילתות" : "No queries executed yet"}</p>
        <p className="text-sm">{isHe ? "הגש שאילתה בטאב התרגול כדי לראות אותה כאן" : "Submit a query in the practice view to see it here"}</p>
      </div>
    );
  }

  // Calculate stats
  const difficulties = ['Easy', 'Medium', 'Hard', 'Expert'] as const;
  const stats = difficulties.map(diff => {
    const items = deduplicatedCompleted.filter((c: any) => (c.difficulty || c.question?.difficulty) === diff);
    const avgScore = items.length > 0 
      ? Math.round(items.reduce((acc, curr) => acc + curr.score, 0) / items.length)
      : 0;
    return { difficulty: diff, avgScore, count: items.length };
  });

  const getMarkdownComponents = (sourceId?: string, sourceTitle?: string, sourceType?: string) => ({
    p: ({ children }: any) => {
      const text = extractTextFromChildren(children);
      const tip = savedTips.find(t => t.text === text);
      const isSaved = !!tip;
      if (tip && tip.highlightedLines && tip.highlightedLines.length > 0) {
        return (
          <div className="group relative">
            <p className="mb-2">{renderTextWithHighlights(tip.id, text, tip.highlightedLines)}</p>
            <button
              onClick={() => handleToggleSaveTip(text, 'general', sourceId, sourceTitle, sourceType)}
              className="absolute left-0 top-0 p-1 rounded-lg text-emerald-500 bg-emerald-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
            >
              <BookmarkCheck className="w-4 h-4" />
            </button>
          </div>
        );
      }
      return (
        <div className="group relative">
          <p className="mb-2">{children}</p>
          {text.length > 20 && (
            <button
              onClick={() => handleToggleSaveTip(text, 'general', sourceId, sourceTitle, sourceType)}
              className={cn(
                "absolute left-0 top-0 p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer",
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
      const tip = savedTips.find(t => t.text === text);
      const isSaved = !!tip;
      if (tip && tip.highlightedLines && tip.highlightedLines.length > 0) {
        return (
          <div className="group relative">
            <li className="mb-1">{renderTextWithHighlights(tip.id, text, tip.highlightedLines)}</li>
            <button
              onClick={() => handleToggleSaveTip(text, 'general', sourceId, sourceTitle, sourceType)}
              className="absolute left-0 top-0 p-1 rounded-lg text-emerald-500 bg-emerald-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
            >
              <BookmarkCheck className="w-4 h-4" />
            </button>
          </div>
        );
      }
      return (
        <div className="group relative">
          <li className="mb-1">{children}</li>
          {text.length > 10 && (
            <button
              onClick={() => handleToggleSaveTip(text, 'general', sourceId, sourceTitle, sourceType)}
              className={cn(
                "absolute left-0 top-0 p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer",
                isSaved ? "text-emerald-500 bg-emerald-50" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
              )}
              title={isSaved ? (isHe ? "נשמר בחומרים" : "Saved to materials") : (isHe ? "שמור לחומרים הלימודיים שלי" : "Save to my learning materials")}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          )}
        </div>
      );
    }
  });

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 md:p-8 pb-20 md:pb-8" dir={dir}>
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
        
        {/* Local Quick Jump Navigation Bar between History and Saved */}
        {onNavigateToTab && (
          <div className="flex justify-center">
            <div className="bg-slate-200/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-300/60 dark:border-slate-700/60 font-sans shadow-xs flex items-center gap-1">
              <button
                disabled
                className="px-5 py-2 rounded-xl text-xs font-black transition-all cursor-default flex items-center gap-2 bg-white text-blue-600 shadow-sm"
              >
                <Clock className="w-4 h-4 text-slate-500" />
                <span>{isHe ? "היסטוריית שאילתות" : "Execution History"}</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                  {deduplicatedCompleted.length}
                </span>
              </button>
              <button
                onClick={() => onNavigateToTab('saved')}
                className="px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 text-slate-600 hover:text-slate-900"
              >
                <Bookmark className="w-4 h-4 text-amber-500" />
                <span>{isHe ? "חומרים ששמרתי" : "Saved Materials"}</span>
                {savedTipsCount > 0 && (
                  <span className="bg-slate-300/60 text-slate-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                    {savedTipsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{isHe ? "שאילתות שביצעתי" : "Queries History"}</h2>
            <p className="text-slate-500 mt-1 md:mt-2 text-sm md:text-base">{isHe ? "היסטוריית התרגול והביצועים שלך" : "Your SQL exercises track record and history"}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs md:text-sm font-bold text-blue-600 bg-blue-50 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-blue-100">
              {isHe ? "סה\"כ תרגילים: " : "Total exercises: "}{deduplicatedCompleted.length}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {stats.map((stat) => (
            <div key={stat.difficulty} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-1">
              <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">
                {stat.difficulty === 'Easy' ? (isHe ? 'קל' : 'Easy') : stat.difficulty === 'Medium' ? (isHe ? 'בינוני' : 'Medium') : stat.difficulty === 'Hard' ? (isHe ? 'קשה' : 'Hard') : (isHe ? 'מומחה' : 'Expert')}
              </span>
              <div className="text-2xl md:text-3xl font-black text-slate-800">{stat.avgScore}%</div>
              <span className="text-[10px] text-slate-500">{stat.count} {isHe ? "שאילתות" : "queries"}</span>
              <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    stat.difficulty === 'Easy' ? "bg-green-500" :
                    stat.difficulty === 'Medium' ? "bg-orange-500" :
                    stat.difficulty === 'Hard' ? "bg-red-500" : "bg-purple-500"
                  )}
                  style={{ width: `${stat.avgScore}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* AI Analysis Section */}
        <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] -mr-32 -mt-32" />
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">ניתוח ביצועים חכם (AI)</h3>
                  <p className="text-slate-400 text-xs">תובנות מבוססות על היסטוריית התרגול שלך</p>
                </div>
              </div>
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                עדכן ניתוח
              </button>
            </div>

            {isAnalyzing ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-slate-400 animate-pulse">מנתח את השאילתות שלך...</p>
              </div>
            ) : analysis ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      נקודות חוזקה
                    </h4>
                    <ul className="space-y-2">
                      {analysis.strengths.map((s, i) => {
                        const saved = isTipSaved(s);
                        return (
                          <li key={i} className="text-sm text-slate-300 flex items-start justify-between gap-2 group/tip p-1 rounded-lg hover:bg-slate-800/40 transition-colors">
                            <span className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                              {s}
                            </span>
                            <button
                              onClick={() => handleToggleSaveTip(s, 'general', 'performance-analysis', (isHe ? 'ניתוח ביצועים חכם' : 'Smart Performance Analysis'), 'performance_analysis')}
                              className="opacity-60 md:opacity-0 md:group-hover/tip:opacity-100 hover:opacity-100 text-slate-400 hover:text-emerald-400 transition-all p-1"
                              title={saved ? "הסר מהשמורים" : "שמור טיפ"}
                            >
                              {saved ? <BookmarkCheck className="w-4.5 h-4.5 text-emerald-400" /> : <Bookmark className="w-4.5 h-4.5" />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      נושאים לחיזוק
                    </h4>
                    <ul className="space-y-2">
                      {analysis.weaknesses.map((w, i) => {
                        const saved = isTipSaved(w);
                        return (
                          <li key={i} className="text-sm text-slate-300 flex items-start justify-between gap-2 group/tip p-1 rounded-lg hover:bg-slate-800/40 transition-colors">
                            <span className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                              {w}
                            </span>
                            <button
                              onClick={() => handleToggleSaveTip(w, 'weakness', 'performance-analysis', (isHe ? 'ניתוח ביצועים חכם' : 'Smart Performance Analysis'), 'performance_analysis')}
                              className="opacity-60 md:opacity-0 md:group-hover/tip:opacity-100 hover:opacity-100 text-slate-400 hover:text-amber-400 transition-all p-1"
                              title={saved ? "הסר מהשמורים" : "שמור טיפ"}
                            >
                              {saved ? <BookmarkCheck className="w-4.5 h-4.5 text-amber-400" /> : <Bookmark className="w-4.5 h-4.5" />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        המלצות אישיות
                      </h4>
                      <button
                        onClick={() => handleToggleSaveTip(analysis.recommendations, 'recommendation', 'performance-analysis', (isHe ? 'ניתוח ביצועים חכם' : 'Smart Performance Analysis'), 'performance_analysis')}
                        className="opacity-80 hover:opacity-100 text-slate-400 hover:text-blue-400 transition-all p-1"
                        title={isTipSaved(analysis.recommendations) ? "הסר מהשמורים" : "שמור המלצה זו"}
                      >
                        {isTipSaved(analysis.recommendations) ? (
                          <BookmarkCheck className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Bookmark className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {analysis.recommendations}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">תרגול ממוקד מומלץ:</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.suggestedTopics.map((topic, i) => (
                        <button
                          key={i}
                          onClick={() => onStartTargetedPractice(topic)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 group"
                        >
                          {topic}
                          <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-4">
                <p className="text-slate-500 text-sm">בצע לפחות 3 שאילתות כדי לקבל ניתוח ביצועים מותאם אישית.</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={cn("w-2 h-2 rounded-full", i <= deduplicatedCompleted.length ? "bg-blue-600" : "bg-slate-800")} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Learning Analysis Result Section */}
        <AnimatePresence>
          {learningAnalysis && (
            <motion.div
              id="learning-analysis-results"
              initial={{ opacity: 0, scale: 0.98, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 30 }}
              className="bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-950 rounded-3xl p-6 md:p-8 text-white shadow-2xl border border-emerald-500/30 relative overflow-hidden space-y-8"
            >
              {/* background effects */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/10 blur-[100px] -mr-40 -mt-40 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/5 blur-[80px] -ml-20 -mb-20 pointer-events-none" />

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 border-b border-emerald-500/10 pb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-600/20 p-3 rounded-2xl border border-emerald-500/30">
                    <BrainCircuit className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-emerald-400">
                      {isHe ? "ניתוח למידה: למה לא 100?" : "Learning Analysis: Why not 100?"}
                    </h3>
                    <p className="text-emerald-400/60 text-xs font-bold mt-1 tracking-wide uppercase">
                      {isHe ? "זיהוי כשלים מרכזיים והסברים ייעודיים" : "Core failures identification & focused explanations"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setLearningAnalysis(null)}
                  className="px-4 py-2 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 rounded-xl text-xs font-bold transition-all border border-emerald-500/20 cursor-pointer shadow-sm hover:scale-105"
                >
                  {isHe ? "סגור ניתוח" : "Dismiss"}
                </button>
              </div>

              {/* General Summary */}
              <div className="relative z-10 bg-emerald-900/10 border border-emerald-500/10 p-6 rounded-2xl">
                <p className="text-sm md:text-base text-slate-200 leading-relaxed italic whitespace-pre-wrap">
                  {learningAnalysis.generalSummary}
                </p>
              </div>

              {/* Core Failures Cards */}
              <div className="space-y-6 relative z-10">
                <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  {isHe ? "הכשלים המרכזיים שזוהו" : "Identified Core Failures"}
                </h4>
                
                <div className="grid grid-cols-1 gap-6">
                  {learningAnalysis.coreFailures.map((failure, fIdx) => {
                    const saveText = `${failure.topic}:\n\n${failure.explanation}\n\nדוגמא לפתרון נכון:\n${failure.exampleSolution}`;
                    const isSaved = isTipSaved(saveText);
                    return (
                      <motion.div
                        key={fIdx}
                        initial={{ opacity: 0, x: isHe ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: fIdx * 0.1 }}
                        className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden"
                      >
                        <div className="p-6 md:p-8 space-y-6">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <h5 className="text-lg font-black text-emerald-400">{failure.topic}</h5>
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                {isHe ? "הסבר מהותי והקשר עסקי" : "Conceptual Explanation & Context"}
                              </div>
                            </div>
                            <button
                              onClick={() => handleToggleSaveTip(saveText, 'general', 'performance-analysis', (isHe ? 'ניתוח ביצועים חכם' : 'Smart Performance Analysis'), 'performance_analysis')}
                              className={cn(
                                "p-2 rounded-xl border transition-all cursor-pointer group shadow-sm",
                                isSaved 
                                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" 
                                  : "bg-slate-900 border-slate-700 hover:border-emerald-500 text-slate-400 hover:text-emerald-400"
                              )}
                              title={isSaved ? (isHe ? "הסר מהשמורים" : "Remove from Saved") : (isHe ? "שמור לחומרים הלימודיים שלי" : "Save as learning material")}
                            >
                              {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                  {failure.explanation}
                                </p>
                              </div>
                              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
                                <div className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">
                                  {isHe ? "למה זה מונע ציון 100?" : "Why this prevents a score of 100?"}
                                </div>
                                <p className="text-xs text-red-200/80 leading-relaxed font-bold">
                                  {failure.whyItPrevents100}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="space-y-2">
                                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                  {isHe ? "דוגמא נכונה ומבנה חשיבה" : "Correct Example & Thinking Process"}
                                </div>
                                <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
                                  <SyntaxHighlighter
                                    language="sql"
                                    style={vscDarkPlus}
                                    customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.8rem' }}
                                  >
                                    {formatSql(failure.exampleSolution)}
                                  </SyntaxHighlighter>
                                </div>
                                <p className="text-xs text-slate-400 italic mt-2 leading-relaxed">
                                  {failure.exampleExplanation}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Action Plan */}
              <div className="relative z-10 bg-gradient-to-r from-emerald-600/10 to-indigo-600/10 border border-emerald-500/20 p-6 md:p-8 rounded-3xl flex flex-col md:flex-row items-center gap-6">
                <div className="bg-emerald-500 p-4 rounded-2xl shadow-lg shadow-emerald-500/20">
                  <Target className="w-8 h-8 text-emerald-950" />
                </div>
                <div className="space-y-2 text-center md:text-right flex-1">
                  <h4 className="text-lg font-black text-emerald-50">{isHe ? "תוכנית פעולה לשיפור הציון" : "Score Improvement Action Plan"}</h4>
                  <p className="text-sm text-emerald-100/80 leading-relaxed font-bold">
                    {learningAnalysis.actionPlan}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Customized Selected Queries AI Deep-Dive */}
        <AnimatePresence>
          {customAnalysis && (
            <motion.div
              id="custom-analysis-results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-slate-950 rounded-3xl p-6 md:p-8 text-white shadow-2xl border border-blue-500/30 relative overflow-hidden space-y-6"
            >
              <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 blur-[120px] -ml-40 -mt-40 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500/10 blur-[100px] -mr-40 -mb-40 pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-tr from-blue-600 to-emerald-600 p-2.5 rounded-xl text-white shadow-lg">
                    <Sparkles className="w-6 h-6 text-yellow-300" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-100 via-emerald-100 to-indigo-100">
                      {isHe ? "ניתוח AI מעמיק וממוקד" : "Targeted Deep-Dive AI Analysis"}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      {isHe ? "תוצאות ניתוח ממוקד של השאילתות שבחרת" : "Deep analysis specifically customized for your selected queries"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCustomAnalysis(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-xl text-xs font-bold font-sans transition-all border border-slate-700/60 shadow-xs cursor-pointer"
                >
                  {isHe ? "סגור ניתוח" : "Dismiss Analysis"}
                </button>
              </div>

              {/* General Assessment */}
              <div className="relative z-10 bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl md:p-6 space-y-2.5">
                <div className="flex justify-between items-start gap-4">
                  <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    {isHe ? "הערכת ביצועים כללית לשאילתות אלו" : "General Technical Assessment"}
                  </h4>
                  <button
                    onClick={() => handleToggleSaveTip(customAnalysis.generalAssessment, 'general', 'performance-analysis', (isHe ? 'ניתוח ביצועים חכם' : 'Smart Performance Analysis'), 'performance_analysis')}
                    className="p-1.5 px-3 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-400 hover:text-white text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer"
                    title={isTipSaved(customAnalysis.generalAssessment) ? (isHe ? "הסר מהשמורים" : "Remove from Saved") : (isHe ? "שמור הערכה כללית" : "Save General Assessment")}
                  >
                    {isTipSaved(customAnalysis.generalAssessment) ? (
                      <>
                        <BookmarkCheck className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                        <span className="text-[10px] text-emerald-400 font-extrabold">{isHe ? "שמור" : "Saved"}</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" />
                        <span className="text-[10px] font-bold">{isHe ? "שמור" : "Save"}</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-semibold">
                  {customAnalysis.generalAssessment}
                </p>
              </div>

              {/* Technical notes query breakdown */}
              <div className="space-y-4 relative z-10">
                <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  {isHe ? "ניתוח מפרט טכני לכל שאילתה" : "Detailed Query Technical Breakdown"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customAnalysis.technicalNotes.map((note, nIdx) => {
                    const noteText = isHe 
                      ? `=== ניתוח שאילתה: ${note.queryTitle} ===\n\n${note.improvements}`
                      : `=== Query Analysis: ${note.queryTitle} ===\n\n${note.improvements}`;
                    const isNoteSaved = isTipSaved(noteText);

                    return (
                      <div key={nIdx} className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="text-sm font-extrabold text-slate-100">{note.queryTitle}</h5>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleSaveTip(noteText, 'recommendation', 'performance-analysis', (isHe ? 'ניתוח ביצועים חכם' : 'Smart Performance Analysis'), 'performance_analysis')}
                                className="p-1 px-2 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                                title={isNoteSaved ? (isHe ? "הסר מהשמורים" : "Remove from Saved") : (isHe ? "שמור ניתוח שאילתה" : "Save Query Analysis")}
                              >
                                {isNoteSaved ? (
                                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                                ) : (
                                  <Bookmark className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <span className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-bold",
                                note.score >= 90 ? "bg-green-500/20 text-green-400" :
                                note.score >= 70 ? "bg-orange-500/20 text-orange-400" :
                                "bg-red-500/20 text-red-400"
                              )}>
                                {note.score}%
                              </span>
                            </div>
                          </div>

                          {/* Strengths */}
                          {note.strengths && note.strengths.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{isHe ? "נקודות חוזקה:" : "Technical Strengths:"}</span>
                              <ul className="space-y-1">
                                {note.strengths.map((st, i) => (
                                  <li key={i} className="text-xs text-slate-300 flex items-center gap-1.5 leading-relaxed">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                    <span>{st}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Weaknesses */}
                          {note.weaknesses && note.weaknesses.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{isHe ? "חלונות לשיפור / צווארי בקבוק:" : "Weaknesses / Potential Flaws:"}</span>
                              <ul className="space-y-1">
                                {note.weaknesses.map((we, i) => (
                                  <li key={i} className="text-xs text-slate-300 flex items-center gap-1.5 leading-relaxed">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                    <span>{we}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Improvements Markdown */}
                        {note.improvements && (
                          <div className="border-t border-slate-800 pt-3 mt-1 text-xs text-slate-350 leading-relaxed font-medium bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 markdown-body">
                            <Markdown components={getMarkdownComponents('performance-analysis', (isHe ? 'ניתוח ביצועים חכם' : 'Smart Performance Analysis'), 'performance_analysis')}>{note.improvements}</Markdown>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Key Takeaway & Custom Personal Challenge */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10 pt-2">
                <div className="md:col-span-1 bg-gradient-to-tr from-amber-500/10 to-orange-500/10 border border-orange-500/20 p-5 rounded-2xl flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-widest">{isHe ? "תובנת על מעשית" : "Overarching Action Lesson"}</span>
                      <button
                        onClick={() => handleToggleSaveTip(customAnalysis.keyTakeaway, 'general', 'performance-analysis', (isHe ? 'ניתוח ביצועים חכם' : 'Smart Performance Analysis'), 'performance_analysis')}
                        className="p-1 rounded-lg hover:bg-slate-900/60 text-slate-400 hover:text-white transition-all cursor-pointer"
                        title={isTipSaved(customAnalysis.keyTakeaway) ? (isHe ? "הסר מהשמורים" : "Remove from Saved") : (isHe ? "שמור תובנה" : "Save Takeaway")}
                      >
                        {isTipSaved(customAnalysis.keyTakeaway) ? (
                          <BookmarkCheck className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                        ) : (
                          <Bookmark className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed font-bold">
                      {customAnalysis.keyTakeaway}
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-500 italic">
                    {isHe ? "* מומלץ לשנן בעת פתירת שאילתות דומות" : "* Keep in mind during similar problems"}
                  </div>
                </div>

                {customAnalysis.focusedExercise && (
                  <div className="md:col-span-2 bg-gradient-to-tr from-blue-600/10 to-emerald-600/10 border border-emerald-500/20 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded">
                            {isHe ? "אתגר AI מובנה" : "Personalized Challenge"}
                          </span>
                          <h5 className="text-sm font-black text-slate-100">{customAnalysis.focusedExercise.title}</h5>
                        </div>

                        {/* Exercise Bookmark toggling button */}
                        <button
                          onClick={() => {
                            const exerciseText = isHe 
                              ? `=== אתגר AI: ${customAnalysis.focusedExercise.title} ===\n${customAnalysis.focusedExercise.description}\n\n💡 רמז קוד: ${customAnalysis.focusedExercise.challengeHint}`
                              : `=== AI Challenge: ${customAnalysis.focusedExercise.title} ===\n${customAnalysis.focusedExercise.description}\n\n💡 Code Tip: ${customAnalysis.focusedExercise.challengeHint}`;
                            handleToggleSaveTip(exerciseText, 'recommendation', 'performance-analysis', (isHe ? 'ניתוח ביצועים חכם' : 'Smart Performance Analysis'), 'performance_analysis');
                          }}
                          className="p-1 px-2.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-400 hover:text-white text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                          title={isTipSaved(
                            isHe 
                              ? `=== אתגר AI: ${customAnalysis.focusedExercise.title} ===\n${customAnalysis.focusedExercise.description}\n\n💡 רמז קוד: ${customAnalysis.focusedExercise.challengeHint}`
                              : `=== AI Challenge: ${customAnalysis.focusedExercise.title} ===\n${customAnalysis.focusedExercise.description}\n\n💡 Code Tip: ${customAnalysis.focusedExercise.challengeHint}`
                          ) ? (isHe ? "הסר מהשמורים" : "Remove from Saved") : (isHe ? "שמור אתגר זה" : "Save Challenge")}
                        >
                          {isTipSaved(
                            isHe 
                              ? `=== אתגר AI: ${customAnalysis.focusedExercise.title} ===\n${customAnalysis.focusedExercise.description}\n\n💡 רמז קוד: ${customAnalysis.focusedExercise.challengeHint}`
                              : `=== AI Challenge: ${customAnalysis.focusedExercise.title} ===\n${customAnalysis.focusedExercise.description}\n\n💡 Code Tip: ${customAnalysis.focusedExercise.challengeHint}`
                          ) ? (
                            <>
                              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                              <span className="text-[10px] text-emerald-400 font-extrabold">{isHe ? "שמור" : "Saved"}</span>
                            </>
                          ) : (
                            <>
                              <Bookmark className="w-3.5 h-3.5" />
                              <span className="text-[10px]">{isHe ? "שמור" : "Save"}</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                        {customAnalysis.focusedExercise.description}
                      </p>
                      {customAnalysis.focusedExercise.challengeHint && (
                        <p className="text-[10px] text-emerald-400 font-bold">
                          💡 {isHe ? "רמז קוד:" : "Code Tip:"} {customAnalysis.focusedExercise.challengeHint}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onStartTargetedPractice(customAnalysis.focusedExercise.description)}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all shrink-0 active:scale-95 cursor-pointer flex items-center gap-1.5 self-end sm:self-center"
                    >
                      <span>{isHe ? "התחל תרגול האתגר" : "Start Practice"}</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History List with Filter and Sort Options */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-slate-800">היסטוריית שאילתות</h3>
            <div className="text-xs text-slate-500 font-medium">
              מציג <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{processedCompleted.length}</span> מתוך {deduplicatedCompleted.length} שאילתות
            </div>
          </div>

          {/* Interactive Filters Panel */}
          <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
              {/* Free-text Search */}
              <div className="sm:col-span-2 md:col-span-4 lg:col-span-2 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="חיפוש חופשי (כותרת, תיאור, קוד)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-right"
                />
              </div>

              {/* Status Filter */}
              <div className="sm:col-span-1 md:col-span-4 lg:col-span-2 relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none text-right cursor-pointer"
                >
                  <option value="all">כל השאילתות / התשובות</option>
                  <option value="correct">פתרונות נכונים ותקינים</option>
                  <option value="incorrect">תשובות שגויות או טעויות</option>
                </select>
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Filter className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Difficulty Filter */}
              <div className="sm:col-span-1 md:col-span-4 lg:col-span-2 relative">
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none text-right cursor-pointer"
                >
                  <option value="all">כל דרגות הקושי</option>
                  <option value="Easy">קל (Easy)</option>
                  <option value="Medium">בינוני (Medium)</option>
                  <option value="Hard">קשה (Hard)</option>
                  <option value="Expert">מומחה (Expert)</option>
                </select>
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Filter className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Technical Topic Filter */}
              <div className="sm:col-span-1 md:col-span-4 lg:col-span-2 relative">
                <select
                  value={filterTechTopic}
                  onChange={(e) => setFilterTechTopic(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none text-right cursor-pointer text-ellipsis overflow-hidden"
                >
                  <option value="all">כל הנושאים הטכניים</option>
                  {technicalTopics.map((topic, i) => (
                    <option key={i} value={topic}>{topic}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Filter className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Insurance Topic Filter */}
              <div className="sm:col-span-1 md:col-span-4 lg:col-span-2 relative">
                <select
                  value={filterInsuranceTopic}
                  onChange={(e) => setFilterInsuranceTopic(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none text-right cursor-pointer text-ellipsis overflow-hidden"
                >
                  <option value="all">כל הנושאים הביטוחיים</option>
                  {insuranceTopics.map((topic, i) => (
                    <option key={i} value={topic}>{topic}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Filter className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Sorting Filter */}
              <div className="sm:col-span-1 md:col-span-4 lg:col-span-2 relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none text-right cursor-pointer text-ellipsis overflow-hidden"
                >
                  <option value="date-desc">תאריך: מהחדש לישן</option>
                  <option value="date-asc">תאריך: מהישן לחדש</option>
                  <option value="score-desc">ציון: מהגבוה לנמוך</option>
                  <option value="score-asc">ציון: מהנמוך לגבוה</option>
                  <option value="diff-asc">קושי: מהקל לקשה</option>
                  <option value="diff-desc">קושי: מהקשה לקל</option>
                </select>
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Clear Filters Indicator & Button */}
            {(searchTerm || filterDifficulty !== 'all' || filterTechTopic !== 'all' || filterInsuranceTopic !== 'all' || filterStatus !== 'all' || sortBy !== 'date-desc') && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="text-slate-400 text-xs italic">
                  מופעלים מסננים מותאמים אישית
                </div>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterDifficulty('all');
                    setFilterTechTopic('all');
                    setFilterInsuranceTopic('all');
                    setFilterStatus('all');
                    setSortBy('date-desc');
                  }}
                  className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  נקה את כל המסננים
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4 md:space-y-6">
            {processedCompleted.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-3 shadow-sm">
                <Filter className="w-12 h-12 mx-auto opacity-20 text-slate-500" />
                <p className="font-bold text-base text-slate-700">לא נמצאו שאילתות מתאימות</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">לא הצלחנו למצוא שאילתות שעונות על מסנני החיפוש, דרגת הקושי, סטטוס הפתרון, הנושא הטכני או הביטוחי שהגדרת. נסה לאפס את המסננים או לשנות את תנאי החיפוש.</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterDifficulty('all');
                    setFilterTechTopic('all');
                    setFilterInsuranceTopic('all');
                    setFilterStatus('all');
                    setSortBy('date-desc');
                  }}
                  className="mt-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 border border-blue-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  איפוס מסננים
                </button>
              </div>
            ) : (
              processedCompleted.map((item, index) => {
                const itemId = item.id || (item.question.id + '-' + index);
                const isSelected = selectedQueryIds.has(itemId);
                return (
                  <motion.div
                    key={itemId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "bg-white rounded-xl md:rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all relative",
                      isSelected ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-200"
                    )}
                  >
                    <div className="p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start gap-4 md:gap-6">
                      
                      {/* Interactive Selection Checkbox */}
                      <div className="pt-1.5 flex shrink-0 self-start">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleQuerySelection(itemId);
                          }}
                          className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer relative group",
                            isSelected 
                              ? "bg-blue-600 border-blue-600 text-white shadow" 
                              : "border-slate-300 hover:border-slate-450 bg-white"
                          )}
                          title={isSelected ? "בטל בחירה" : "בחר לניתוח ממוקד"}
                        >
                          <div className={cn(
                            "w-2.2 h-2.2 rounded-full bg-white transition-all duration-200",
                            isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-40 group-hover:bg-slate-400"
                          )} />
                        </button>
                      </div>

                      <div className="flex-1 space-y-3 md:space-y-4 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className={cn(
                          "px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider shrink-0",
                          item.question.difficulty === 'Easy' ? "bg-green-100 text-green-700" :
                          item.question.difficulty === 'Medium' ? "bg-orange-100 text-orange-700" :
                          item.question.difficulty === 'Hard' ? "bg-red-100 text-red-700" :
                          "bg-purple-100 text-purple-700"
                        )}>
                          {item.question.difficulty === 'Easy' ? 'קל' : item.question.difficulty === 'Medium' ? 'בינוני' : item.question.difficulty === 'Hard' ? 'קשה' : 'מומחה'}
                        </div>

                        {/* Tech Tag Badges */}
                        {item.techTags.map((tag, tIdx) => (
                          <span key={`tech-${tIdx}`} className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-100/40 shrink-0">
                            {tag}
                          </span>
                        ))}

                        {/* Insurance Tag Badges */}
                        {item.insTags.map((tag, iIdx) => (
                          <span key={`ins-${iIdx}`} className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100/40 shrink-0">
                            {tag}
                          </span>
                        ))}

                        <span className="text-[10px] md:text-xs text-slate-400 flex items-center gap-1 sm:mr-auto pl-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {item.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} {item.timestamp.toLocaleDateString('he-IL')}
                        </span>
                      </div>
                    
                    <h3 className="text-lg md:text-xl font-bold text-slate-800">{item.question.title}</h3>
                    <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                      {item.question.description}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center gap-3 sm:gap-2 min-w-0 sm:min-w-[120px] w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div className={cn(
                      "w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 md:border-4 shrink-0",
                      item.isCorrect ? "bg-green-50 border-green-200 text-green-600" : "bg-red-50 border-red-200 text-red-600"
                    )}>
                      <span className="text-lg md:text-xl font-bold">{item.score}</span>
                    </div>
                    <span className={cn(
                      "text-[10px] md:text-xs font-bold px-2 md:px-3 py-1 rounded-lg",
                      item.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {item.isCorrect ? "עבר בהצלחה" : "נדרש שיפור"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInlineComparison(item);
                      }}
                      className="mt-1 w-full text-[10px] font-bold font-sans text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 border border-blue-200 rounded-lg py-1 px-1.5 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="השווה ניסיון זה עם ניסיונות אחרים לתרגיל זה לצפייה בשינויי ביצועים ותוצאות"
                    >
                      <GitCompare className="w-3 h-3" />
                      השווה ניסיונות
                    </button>
                    {(item.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeChatItemId === itemId) {
                            setActiveChatItemId(null);
                          } else {
                            setActiveChatItemId(itemId);
                          }
                        }}
                        className={cn(
                          "mt-1 w-full text-[10px] font-bold font-sans rounded-lg py-1 px-1.5 transition-all flex items-center justify-center gap-1 cursor-pointer border",
                          activeChatItemId === itemId 
                            ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700" 
                            : "text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 border-blue-200"
                        )}
                        title="התכתב ישירות עם מנטור ה-AI לגבי שאילתה ספציפית זו"
                      >
                        <MessageSquare className="w-3 h-3" />
                        {activeChatItemId === itemId ? "סגור צ'אט" : (item.chatHistory && item.chatHistory.length > 0 ? "המשך צ'אט" : "שאל את המנטור")}
                      </button>
                    )}
                  </div>
                </div>

                <div className={cn(
                  "bg-slate-50 p-4 md:p-6 border-t border-slate-100 grid grid-cols-1 gap-4 md:gap-6",
                  item.score < 100 ? "lg:grid-cols-3" : "lg:grid-cols-2"
                )}>
                  <div className="space-y-2 md:space-y-3">
                    <h4 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">השאילתה שלך</h4>
                    <div className="rounded-lg md:rounded-xl overflow-hidden border border-slate-200">
                      <SyntaxHighlighter
                        language="sql"
                        style={vscDarkPlus}
                        customStyle={{ margin: 0, padding: '0.75rem md:1rem', fontSize: '0.7rem md:0.75rem' }}
                      >
                        {formatSql(item.userSql)}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <h4 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">משוב והסבר</h4>
                    <div className="bg-white p-3 md:p-4 rounded-lg md:rounded-xl border border-slate-200 text-xs md:text-sm text-slate-700 leading-relaxed">
                      <div className="markdown-body">
                        <Markdown components={getMarkdownComponents(item.id, item.question.title, 'query')}>{item.explanation}</Markdown>
                      </div>
                    </div>
                  </div>
                  {item.chatSummary && (
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] md:text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                          <Sparkles className="w-3 h-3" />
                          סיכום הדיאלוג עם המנטור
                        </h4>
                        {item.chatHistory && item.chatHistory.length > 0 && (
                          <button
                            onClick={() => toggleChatExpansion(item.id || index.toString())}
                            className="text-[10px] font-bold text-slate-500 hover:text-blue-600 transition-colors"
                          >
                            {expandedChatIds.has(item.id || index.toString()) ? 'סגור התכתבות' : 'צפה בהתכתבות המלאה'}
                          </button>
                        )}
                      </div>
                        <div className="group relative">
                          <div className={cn("bg-blue-50/50 p-3 md:p-4 rounded-lg md:rounded-xl border border-blue-100 text-xs md:text-sm text-slate-700 leading-relaxed italic", isHe ? "pr-8" : "pl-8")}>
                            {item.chatSummary}
                          </div>
                          <button
                            onClick={() => handleToggleSaveTip(item.chatSummary || '', 'general', item.id, item.question.title, 'query')}
                            className={cn(
                              "absolute top-2 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-sm border border-blue-100 bg-white",
                              isHe ? "right-1" : "left-1",
                              isTipSaved(item.chatSummary || '') ? "text-emerald-500" : "text-slate-400 hover:text-blue-500"
                            )}
                            title={isTipSaved(item.chatSummary || '') ? (isHe ? "נשמר בחומרים" : "Saved to materials") : (isHe ? "שמור לחומרים הלימודיים שלי" : "Save to my learning materials")}
                          >
                            {isTipSaved(item.chatSummary || '') ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                          </button>
                        </div>

                      {expandedChatIds.has(item.id || index.toString()) && item.chatHistory && (
                        <div className="mt-3 space-y-3 pt-3 border-t border-blue-100/50">
                          {item.chatHistory.map((msg, mIdx) => (
                            <div key={mIdx} className={cn(
                              "flex flex-col space-y-1",
                              msg.role === 'user' ? "items-start" : "items-end"
                            )}>
                              <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">
                                {msg.role === 'user' ? 'את/ה' : 'מנטור AI'}
                              </span>
                              <div className={cn(
                                "max-w-[90%] p-3 rounded-2xl text-xs",
                                msg.role === 'user' 
                                  ? "bg-white border border-slate-200 text-slate-700 rounded-tr-none" 
                                  : "bg-blue-600 text-white rounded-tl-none shadow-sm"
                              )}>
                                <div className="markdown-body">
                                  <Markdown components={msg.role === 'model' ? getMarkdownComponents(item.id, item.question.title, 'query') : {}}>{msg.content}</Markdown>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {item.score < 100 && (
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] md:text-xs font-bold text-emerald-600 uppercase tracking-widest">פתרון נכון לדוגמא</h4>
                        {!item.question.correctSql && (
                          <button
                            onClick={() => handleRepair(item)}
                            disabled={repairingIds.has(item.id || '')}
                            className="text-[9px] md:text-[10px] flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors disabled:opacity-50 border border-emerald-100"
                          >
                            {repairingIds.has(item.id || '') ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <Wand2 className="w-2.5 h-2.5" />
                            )}
                            שחזר פתרון
                          </button>
                        )}
                      </div>
                      
                      {item.question.correctSql ? (
                        <div className="rounded-lg md:rounded-xl overflow-hidden border border-emerald-200">
                          <SyntaxHighlighter
                            language="sql"
                            style={vscDarkPlus}
                            customStyle={{ margin: 0, padding: '0.75rem md:1rem', fontSize: '0.7rem md:0.75rem' }}
                          >
                            {formatSql(item.question.correctSql)}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <div className="p-4 bg-white/50 rounded-lg md:rounded-xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center min-h-[80px]">
                          <p className="text-[10px] text-slate-500 italic">
                            {repairingIds.has(item.id || '') 
                              ? "משחזר פתרון באמצעות AI..." 
                              : "הפתרון לא נשמר. לחץ על 'שחזר פתרון' כדי להפיק אותו."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {activeChatItemId === itemId && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-200 p-4 md:p-6 bg-slate-50/50"
                    >
                      <div className="max-w-4xl mx-auto">
                        <FollowUpChat
                          submissionId={item.id!}
                          question={item.question}
                          userSql={item.userSql}
                          result={{
                            score: item.score,
                            isCorrect: item.isCorrect,
                            explanation: item.explanation,
                            feedback: item.explanation
                          }}
                          userProfile={userProfile}
                          initialHistory={item.chatHistory || []}
                          onClose={() => setActiveChatItemId(null)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          }))}
          </div>
        </div>
      </div>      {/* Floating Selected Queries Action Bar */}
      <AnimatePresence>
        {selectedQueryIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-5 py-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-700/50 z-50 max-w-[90vw] min-w-[340px] sm:w-[580px]"
          >
            <div className="text-center sm:text-right">
              <p className="text-sm font-bold flex items-center gap-1.5 justify-center sm:justify-end">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{isHe ? `נבחרו ${selectedQueryIds.size} שאילתות` : `${selectedQueryIds.size} queries selected`}</span>
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                {isHe ? "לחצי להפקת ניתוח ממוקד או להשוואת 2 ניסיונות!" : "Profound AI deep-dive analysis & compare!"}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleLearningAnalysis}
                disabled={isAnalyzingLearning}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-55 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                {isAnalyzingLearning ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{isHe ? "מנתח למידה..." : "Analyzing..."}</span>
                  </>
                ) : (
                  <>
                    <BrainCircuit className="w-3.5 h-3.5" />
                    <span>{isHe ? "ניתוח למידה" : "Learning Analysis"}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleAnalyzeSelected}
                disabled={isAnalyzingSelected}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-55 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                {isAnalyzingSelected ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{isHe ? "מנתח..." : "Analyzing..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isHe ? "ניתוח ממוקד" : "Targeted Analysis"}</span>
                  </>
                )}
              </button>

              {selectedQueryIds.size === 2 && (
                <button
                  onClick={handleCompareSelected}
                  disabled={isComparing}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-55 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  {isComparing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>{isHe ? "משווה..." : "Comparing..."}</span>
                    </>
                  ) : (
                    <>
                      <GitCompare className="w-3.5 h-3.5" />
                      <span>{isHe ? "השוואה ביניהם" : "Compare"}</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedQueryIds(new Set());
                  setCustomAnalysis(null);
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-755 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {isHe ? "ביטול" : "Cancel"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Query Comparison Modal */}
      <AnimatePresence>
        {comparisonModalOpen && comparingItems && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden font-sans my-8"
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-6 flex items-start justify-between gap-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 p-2.5 rounded-xl text-white">
                    <GitCompare className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-lg md:text-xl font-black">
                      {isHe ? "השוואת ביצועים ותוצאות בין פתרונות" : "Query Performance & Results Comparison"}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      {isHe ? `תרגיל: ${comparingItems.item1.question.title}` : `Exercise: ${comparingItems.item1.question.title}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setComparisonModalOpen(false);
                    setComparingItems(null);
                    setComparisonResult(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg p-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Core content */}
              <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto text-right">
                {/* Side-by-Side SQL Queries */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-left">
                  {/* Query A */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded">
                        {isHe ? "שאילתה א' (Query 1)" : "Query A"}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {isHe ? `ציון: ${comparingItems.item1.score}%` : `Score: ${comparingItems.item1.score}%`} | {comparingItems.item1.isCorrect ? (isHe ? "תקין" : "Correct") : (isHe ? "מיועד לשיפור" : "Needs Improvement")}
                      </span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-xs text-xs">
                      <SyntaxHighlighter
                        language="sql"
                        style={vscDarkPlus}
                        customStyle={{ margin: 0, padding: '1rem', maxHeight: '180px', overflowY: 'auto' }}
                      >
                        {formatSql(comparingItems.item1.userSql)}
                      </SyntaxHighlighter>
                    </div>
                  </div>

                  {/* Query B */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded">
                        {isHe ? "שאילתה ב' (Query 2)" : "Query B"}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {isHe ? `ציון: ${comparingItems.item2.score}%` : `Score: ${comparingItems.item2.score}%`} | {comparingItems.item2.isCorrect ? (isHe ? "תקין" : "Correct") : (isHe ? "מיועד לשיפור" : "Needs Improvement")}
                      </span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-xs text-xs">
                      <SyntaxHighlighter
                        language="sql"
                        style={vscDarkPlus}
                        customStyle={{ margin: 0, padding: '1rem', maxHeight: '180px', overflowY: 'auto' }}
                      >
                        {formatSql(comparingItems.item2.userSql)}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                </div>

                {/* Loading / Error States */}
                {isComparing ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    <p className="text-sm font-bold text-slate-705 animate-pulse text-center">
                      {isHe ? "משווה את השאילתות ומנתח ביצועים ב-AI..." : "Comparing queries and calculating performance differences..."}
                    </p>
                    <p className="text-xs text-slate-400 text-center">
                      {isHe ? "ה-AI בודק עלויות JOIN, תקינות תוצאות ויעילות סינון בזמן אמת..." : "Analysing join costs, partition operations and date filtering logic in real time..."}
                    </p>
                  </div>
                ) : comparisonError ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-650 flex items-center gap-3 justify-start" dir="rtl">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span className="text-xs md:text-sm font-semibold">{comparisonError}</span>
                  </div>
                ) : comparisonResult ? (
                  <div className="space-y-6 animate-fadeIn" dir="rtl">
                    {/* General Assessment / Overview */}
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                      <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                        {isHe ? "סקירה כללית והבדלים עקרוניים" : "General Overview & Structural Differences"}
                      </h4>
                      <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-semibold">
                        {comparisonResult.explanation}
                      </p>
                    </div>

                    {/* Parametric Comparison Table */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{isHe ? "טבלת השוואה מפרטית" : "Parametric Comparison Matrix"}</h4>
                      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold">
                              <th className="p-3 w-1/4 pb-3 text-right">{isHe ? "פרמטר השוואה" : "Comparison Aspect"}</th>
                              <th className="p-3 w-3/8 text-blue-800 text-right">{isHe ? "שאילתה א'" : "Query A"}</th>
                              <th className="p-3 w-3/8 text-purple-800 text-right">{isHe ? "שאילתה ב'" : "Query B"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 text-slate-650 bg-white">
                            {comparisonResult.comparisonTable.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50/50">
                                <td className="p-3 font-bold bg-slate-50 text-slate-700 border-l border-slate-150">{row.parameter}</td>
                                <td className="p-3 text-slate-700 leading-relaxed">{row.query1}</td>
                                <td className="p-3 text-slate-700 leading-relaxed">{row.query2}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Detailed Analysis of Performance and Results */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Performance */}
                      <div className="bg-gradient-to-tr from-amber-500/5 to-orange-500/5 border border-amber-500/10 p-5 rounded-2xl space-y-2">
                        <h4 className="text-xs font-bold text-amber-700 uppercase tracking-widest">⚡ {isHe ? "הבדלים בביצועים (Performance)" : "Performance & Execution Cost"}</h4>
                        <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-medium">
                          {comparisonResult.performanceComparison}
                        </p>
                      </div>

                      {/* Expected Results */}
                      <div className="bg-gradient-to-tr from-blue-500/5 to-cyan-500/5 border border-blue-500/10 p-5 rounded-2xl space-y-2">
                        <h4 className="text-xs font-bold text-blue-700 uppercase tracking-widest">📊 {isHe ? "דיוק השאילתה והבדלי תוצאה" : "Result Set Accuracy & Correctness"}</h4>
                        <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-medium">
                          {comparisonResult.resultsComparison}
                        </p>
                      </div>
                    </div>

                    {/* AI Recommendation Box */}
                    <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 p-6 rounded-2xl flex items-start gap-4">
                      <div className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-md shrink-0">
                        <Target className="w-5 h-5" />
                      </div>
                      <div className="space-y-1.5 text-right">
                        <h4 className="text-sm font-black text-emerald-950">{isHe ? "המלצת ה-AI המקצועית" : "Tutor Expert Recommendation"}</h4>
                        <p className="text-xs md:text-sm text-emerald-900 leading-relaxed font-bold">
                          {comparisonResult.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => {
                    setComparisonModalOpen(false);
                    setComparingItems(null);
                    setComparisonResult(null);
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer font-sans"
                >
                  {isHe ? "סגור ועבור חזרה להיסטוריה" : "Close Comparison"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
