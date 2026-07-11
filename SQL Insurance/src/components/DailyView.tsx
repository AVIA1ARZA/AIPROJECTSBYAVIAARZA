import React, { useState, useEffect } from "react";
import { 
  getDailyExercises, 
  saveDailyExercises, 
  markDailyExerciseCompleted, 
  CompletedQuestion,
  db
} from "../firebase";
import { generateDailyExercises, Question } from "../services/geminiService";
import { useLanguage } from "../context/LanguageContext";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  CheckCircle2, 
  Play, 
  Flame, 
  Loader2, 
  Target, 
  AlertCircle,
  HelpCircle,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { auth } from "../firebase";

interface DailyViewProps {
  completed: CompletedQuestion[];
  userProfile: any;
  onSelectQuestion: (question: Question) => void;
  activeSchema?: any;
}

export const DailyView: React.FC<DailyViewProps> = ({
  completed,
  userProfile,
  onSelectQuestion,
  activeSchema
}) => {
  const { isHe, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [exercisesData, setExercisesData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Get current date string in YYYY-MM-DD
  const getTodayDateStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const loadOrCreateDailyExercises = async (forceRegenerate = false) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    setLoading(true);
    setError(null);
    const dateStr = getTodayDateStr();

    try {
      if (!forceRegenerate) {
        const existing = await getDailyExercises(userId, dateStr);
        if (existing) {
          setExercisesData(existing);
          setLoading(false);
          return;
        }
      }

      // If not existing or force regenerate, let's call Gemini to generate exactly 5 exercises based on weaknesses!
      setGenerating(true);
      const generated = await generateDailyExercises(
        completed,
        userProfile,
        activeSchema?.tables,
        language
      );

      await saveDailyExercises(userId, dateStr, generated.weaknesses, generated.exercises);
      
      const loaded = await getDailyExercises(userId, dateStr);
      setExercisesData(loaded);
    } catch (err) {
      console.error("Error loading/generating daily questions:", err);
      setError(
        isHe 
          ? "נכשלנו בטעינת התרגול היומי המותאם אישית. אנא נסה שוב." 
          : "Failed to load personalized daily exercises. Please try again."
      );
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  useEffect(() => {
    loadOrCreateDailyExercises();
  }, [auth.currentUser?.uid]);

  // Helper: detect if a specific exercise is completed
  const isCompleted = (exerciseId: string) => {
    if (!exercisesData) return false;
    // Method 1: Check cached list of completedIds
    if (exercisesData.completedIds?.includes(exerciseId)) return true;
    
    // Method 2: Check completed history matching the exercises' correct SQL or properties (as reactive backup)
    const exercise = exercisesData.exercises?.find((e: any) => e.id === exerciseId);
    if (!exercise) return false;
    return completed.some(cq => 
      cq.isCorrect && 
      (cq.questionTitle === exercise.title || (cq as any).question?.title === exercise.title)
    );
  };

  const handleSelectExercise = async (exercise: any) => {
    // Navigate user first
    onSelectQuestion(exercise);
  };

  const calculateProgressPercent = () => {
    if (!exercisesData || !exercisesData.exercises?.length) return 0;
    const finishedCount = exercisesData.exercises.filter((ex: any) => isCompleted(ex.id)).length;
    return Math.round((finishedCount / exercisesData.exercises.length) * 100);
  };

  const getFinishedCount = () => {
    if (!exercisesData || !exercisesData.exercises?.length) return 0;
    return exercisesData.exercises.filter((ex: any) => isCompleted(ex.id)).length;
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-8 text-right font-sans select-none" dir={isHe ? "rtl" : "ltr"}>
      {/* 1. Header Bento Block - Neo Industrial Design with Corner Marks */}
      <div className="relative border-4 border-slate-900 bg-[#161C2A] p-6 sm:p-8 rounded-none overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Core aesthetic highlights */}
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#D4FF00]" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#D4FF00]" />

        <div className="space-y-3 z-10 w-full md:max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#D4FF00] bg-[#D4FF00]/10 border border-[#D4FF00] px-2.5 py-1">
              {isHe ? "תוכנית למידה אישית מבוססת AI" : "AI HYPER-PERSONALIZED PATH"}
            </span>
            <div className="flex items-center gap-1.5 text-rose-500 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider">
              <Flame size={12} className="fill-current" />
              <span>{completed.filter(q => q.isCorrect).length} {isHe ? "פתרונות" : "SOLVED"}</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-mono leading-none">
            {isHe ? "אימון יומי מותאם אישית" : "DAILY AI INSTANCE"}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-sans leading-relaxed">
            {isHe 
              ? "ה-AI סורק את ההיסטוריה שלך בזמן אמת ומזקק 5 משימות ממוקדות לעקיפת חולשות ומיקסום השליטה שלך."
              : "An algorithmic assessment engine targets your exact weak zones to construct 5 granular laboratory drills."}
          </p>
        </div>

        <button
          onClick={() => loadOrCreateDailyExercises(true)}
          disabled={loading || generating}
          style={{ cursor: "pointer" }}
          className="relative z-15 w-full md:w-auto px-5 py-3 text-xs font-mono font-black uppercase tracking-wider border-2 border-[#D4FF00] bg-transparent text-[#D4FF00] hover:bg-[#D4FF00] hover:text-slate-950 transition-all duration-150 rounded-none disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {isHe ? "סנכרן וייצר מחדש (AI)" : "REGENERATE INSTANCE (AI)"}
        </button>
      </div>

      {loading || generating ? (
        <div className="border-4 border-slate-900 bg-[#161C2A] py-16 px-6 text-center rounded-none flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 text-[#D4FF00] animate-spin" />
          <p className="text-[#D4FF00] font-mono text-sm uppercase tracking-widest font-black animate-pulse">
            {generating 
              ? (isHe ? "מנתח היסטוריית הגשות ומזקק וקטורי שיפור..." : "ASSESSING QUERIES & COMPILING DRILLS...") 
              : (isHe ? "טוען הדמיית משימות..." : "INITIALIZING DRILL BUFFERS...")}
          </p>
        </div>
      ) : error ? (
        <div className="border-4 border-rose-600 bg-rose-950/20 p-6 rounded-none flex items-start gap-4">
          <AlertCircle className="text-rose-500 w-8 h-8 flex-shrink-0 mt-0.5" />
          <div className="space-y-3">
            <h3 className="font-mono font-black text-rose-500 uppercase text-sm tracking-wider">
              {isHe ? "שגיאה בחיבור למנוע ה-AI" : "COMPILATION OR ENGINE ERROR"}
            </h3>
            <p className="text-slate-300 text-sm">{error}</p>
            <button
              onClick={() => loadOrCreateDailyExercises()}
              className="px-4 py-2 text-xs font-mono font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white rounded-none border border-slate-950 transition-colors"
            >
              {isHe ? "אתחל מחדש" : "RETRY CONNECT"}
            </button>
          </div>
        </div>
      ) : exercisesData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main List: 2/3 Width */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
              <h3 className="text-xs font-mono font-black uppercase tracking-widest text-[#D4FF00]">
                {isHe ? "משימות מעבדה להיום" : "ACTIVE DAILY BUFFER"}
              </h3>
              <span className="text-xs font-mono text-slate-500 uppercase">
                [05 {isHe ? "משימות זוהו" : "TASKS TOTAL"}]
              </span>
            </div>

            <div className="space-y-4">
              {exercisesData.exercises?.map((ex: any, idx: number) => {
                const finished = isCompleted(ex.id);
                return (
                  <div
                    key={ex.id || idx}
                    onClick={() => !finished && handleSelectExercise(ex)}
                    style={{ cursor: finished ? "default" : "pointer" }}
                    className={`group relative border-4 border-slate-900 p-5 sm:p-6 transition-all duration-150 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${
                      finished 
                        ? "bg-slate-900/40 border-slate-900/60 opacity-60" 
                        : "bg-[#161C2A] border-slate-900 hover:border-[#D4FF00] hover:bg-[#1E2538] hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex-1 space-y-2.5 text-right" dir={isHe ? "rtl" : "ltr"}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-black text-[#D4FF00] bg-[#D4FF00]/10 border border-[#D4FF00]/20 px-2 py-0.5 rounded-none">
                          {isHe ? `משימה 0${idx + 1}` : `DRILL 0${idx + 1}`}
                        </span>
                        
                        {/* Difficulty Badge - Neo Monospace style */}
                        <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 tracking-wider ${
                          ex.difficulty === "Easy" || ex.difficulty === "קל"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : ex.difficulty === "Medium" || ex.difficulty === "בינוני"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" 
                            : ex.difficulty === "Hard" || ex.difficulty === "קשה"
                            ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        }`}>
                          {isHe 
                            ? (ex.difficulty === "Easy" ? "קל" : ex.difficulty === "Medium" ? "בינוני" : ex.difficulty === "Hard" ? "קשה" : "מומחה")
                            : ex.difficulty}
                        </span>

                        {/* Weakness Category Targeted */}
                        {ex.weaknessCategory && (
                          <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5">
                            {ex.weaknessCategory.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <h4 className="text-base sm:text-lg font-mono font-black text-white leading-tight">
                        {ex.title}
                      </h4>
                      
                      <p className="text-slate-300 text-sm leading-relaxed max-w-2xl font-sans font-light">
                        {ex.description}
                      </p>

                      {ex.hints && ex.hints.length > 0 && !finished && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                          <HelpCircle size={12} className="text-[#D4FF00]" />
                          <span>{isHe ? "מכיל רמזים מסייעים במערכת" : "HINTS BUFFER AVAILABLE"}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 self-end sm:self-center">
                      {finished ? (
                        <div className="flex items-center gap-1.5 text-[#D4FF00] bg-[#D4FF00]/10 border-2 border-[#D4FF00] px-4 py-2 font-mono font-black text-xs uppercase rounded-none">
                          <CheckCircle2 size={13} />
                          <span>{isHe ? "הושלם" : "COMPLETED"}</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectExercise(ex);
                          }}
                          style={{ cursor: "pointer" }}
                          className="px-4 py-2 border-2 border-slate-950 bg-[#D4FF00] text-slate-950 hover:bg-white hover:text-slate-950 font-mono font-black text-xs uppercase tracking-wider rounded-none flex items-center gap-1.5 transition-colors"
                        >
                          <span>{isHe ? "הפעל סימולטור" : "EXECUTE LAB"}</span>
                          <Play size={10} className="fill-current" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: 1/3 Width Stats & Weaknesses */}
          <div className="space-y-6">
            
            {/* 2. Progress Tracker Box */}
            <div className="border-4 border-slate-900 bg-[#161C2A] p-6 rounded-none space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1 text-right">
                  <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                    {exercisesData.date}
                  </span>
                  <h4 className="text-xs font-mono font-black uppercase text-white tracking-wider">
                    {isHe ? "משימות שהושלמו היום" : "DAILY QUOTA STATUS"}
                  </h4>
                </div>
                <div className="text-xl font-mono font-black text-[#D4FF00]">
                  {getFinishedCount()}/5
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-3 bg-slate-950 border border-slate-800 rounded-none overflow-hidden relative">
                <div 
                  className="h-full bg-[#D4FF00] transition-all duration-500 rounded-none"
                  style={{ width: `${calculateProgressPercent()}%` }}
                />
              </div>

              <div className="text-xs leading-relaxed text-slate-400 font-sans text-right">
                {calculateProgressPercent() === 100 ? (
                  <div className="flex items-center gap-2 text-[#D4FF00] font-mono font-bold uppercase">
                    <CheckCircle2 size={14} className="fill-current text-[#D4FF00]" />
                    <span>{isHe ? "מעולה! הושלם בהצלחה!" : "100% QUOTA ACCOMPLISHED"}</span>
                  </div>
                ) : (
                  <span>
                    {isHe 
                      ? `נותרו עוד ${5 - getFinishedCount()} תרגילים מותאמים להשלמת היעד היומי.` 
                      : `${5 - getFinishedCount()} exercises remain to close active weaknesses.`}
                  </span>
                )}
              </div>
            </div>

            {/* 3. Identified Weaknesses Bento Block */}
            <div className="border-4 border-slate-900 bg-[#161C2A] p-6 rounded-none space-y-4">
              <div className="flex items-center gap-2 text-white border-b border-slate-800 pb-3 justify-start" dir="rtl">
                <Target size={16} className="text-[#D4FF00]" />
                <h4 className="text-xs font-mono font-black uppercase tracking-wider text-right">
                  {isHe ? "חולשות מנותחות ב-SQL" : "WEAK SPOT ASSESSMENTS"}
                </h4>
              </div>
              
              <div className="space-y-2.5">
                {exercisesData.weaknesses?.map((weakness: string, idx: number) => (
                  <div key={idx} className="bg-[#1C2333] border border-slate-800 p-3 rounded-none flex items-center gap-3 justify-start" dir="rtl">
                    <span className="w-5 h-5 bg-[#D4FF00] text-slate-950 font-mono font-black text-[10px] flex items-center justify-center rounded-none flex-shrink-0">
                      0{idx + 1}
                    </span>
                    <span className="text-xs font-sans text-slate-300 font-light leading-snug text-right">
                      {weakness}
                    </span>
                  </div>
                ))}
                {(!exercisesData.weaknesses || exercisesData.weaknesses.length === 0) && (
                  <div className="text-slate-500 text-xs font-mono text-center py-4">
                    {isHe ? "לא זוהו חולשות משמעותיות בשלב זה." : "NO CRITICAL WEAK SPOTS TRACKED"}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="border-4 border-slate-900 bg-[#161C2A] py-20 text-center rounded-none space-y-4">
          <BookOpen className="mx-auto w-12 h-12 text-slate-600" />
          <p className="text-slate-400 font-mono text-sm uppercase tracking-wider">
            {isHe 
              ? "לא נמצאו משימות יומיות פעילות בבפר."
              : "DRILL STORAGE BUFFER EMPTY"}
          </p>
          <button 
            onClick={() => loadOrCreateDailyExercises()}
            className="px-4 py-2 border border-[#D4FF00] bg-transparent text-[#D4FF00] hover:bg-[#D4FF00] hover:text-slate-950 text-xs font-mono font-black uppercase rounded-none transition"
          >
            {isHe ? "אתחל תרגילים" : "INITIALIZE INSTANCE"}
          </button>
        </div>
      )}
    </div>
  );
}
