import React, { useState, useEffect, useMemo } from 'react';
import type { CompletedQuestion } from './components/CompletedQueriesView';
import { PracticeView } from './components/PracticeView';

const ERDView = React.lazy(() => import('./components/ERDView').then(m => ({ default: m.ERDView })));
const CompletedQueriesView = React.lazy(() => import('./components/CompletedQueriesView').then(m => ({ default: m.CompletedQueriesView })));
const LearningMaterialsView = React.lazy(() => import('./components/LearningMaterialsView').then(m => ({ default: m.LearningMaterialsView })));
const SavedMaterialsView = React.lazy(() => import('./components/SavedMaterialsView').then(m => ({ default: m.SavedMaterialsView })));
const ExamsView = React.lazy(() => import('./components/ExamsView').then(m => ({ default: m.ExamsView })));
const DailyView = React.lazy(() => import('./components/DailyView').then(m => ({ default: m.DailyView })));
import { cn } from './lib/utils';
import { Database, GraduationCap, ShieldCheck, CheckCircle2, History, LogIn, LogOut, Loader2, User as UserIcon, BookOpen, Bookmark, ArrowLeft, CheckSquare, Flame, Sparkles, Shield } from 'lucide-react';
import { auth, loginWithGoogle, logout, db, handleFirestoreError, OperationType, getUserProfile, UserProfile, getPerformanceAnalysis, PerformanceAnalysisData, getUserQuestions, UserQuestion, DBModel, saveUserProfile } from './firebase';
import { INSURANCE_SCHEMA } from './constants';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { useLanguage } from './context/LanguageContext';
import { calculateStreak } from './utils/streak';
import { motion } from 'motion/react';

type TabType = 'practice' | 'erd' | 'completed' | 'learning' | 'daily' | 'exams' | 'saved';

export default function App() {
  const { language, setLanguage, t, dir, isHe } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('practice');
  const [completedQuestions, setCompletedQuestions] = useState<CompletedQuestion[]>([]);
  const [savedTipsCount, setSavedTipsCount] = useState<number>(0);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [performanceAnalysis, setPerformanceAnalysis] = useState<PerformanceAnalysisData | null>(null);
  const [userQuestions, setUserQuestions] = useState<UserQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const streak = useMemo(() => {
    return calculateStreak(completedQuestions.map(q => q.timestamp));
  }, [completedQuestions]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [targetedTopic, setTargetedTopic] = useState<string | null>(null);
  const [targetedDifficulty, setTargetedDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Expert' | null>(null);
  const [selectedDailyQuestion, setSelectedDailyQuestion] = useState<any>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [apiKeySuccess, setApiKeySuccess] = useState(false);

  const handleGuestLogin = () => {
    // עדכון הסטייט של המשתמש למצב אורח מיוחד
    setUser({
      uid: 'guest-mode',
      displayName: 'מגייס/ת או מראיין/ת (אורח)',
      email: 'guest@portfolio.com',
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: []
    } as any);

    // עדכון הפרופיל כדי שהמערכת תדע שהאורח כבר השלים הגדרות ראשוניות
    setProfile({
      role: 'Guest Viewer',
      department: 'Recruitment',
      setupCompleted: true,
      updatedAt: new Date()
    } as any);
    
    setLoading(false);
  };

  const [activeSchemaId, setActiveSchemaId] = useState<string>(() => {
    return localStorage.getItem('active_schema_id') || 'insurance';
  });

  const [localDatabases, setLocalDatabases] = useState<DBModel[]>(() => {
    try {
      const saved = localStorage.getItem('local_databases');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allDatabases = useMemo(() => {
    const defaultInsurance: DBModel = {
      id: 'insurance',
      name: language === 'he' ? 'ענף ביטוח אלמנטרי' : 'Elementary Insurance',
      description: language === 'he' ? 'מבוטחים, פוליסות, סוכנים, תביעות, שמאים, ותשלומים של חברת ביטוח.' : 'Insureds, policies, agents, claims, estimators, and payments of an insurance company.',
      tables: INSURANCE_SCHEMA
    };

    const profileDbs = profile?.customDatabases || [];
    const merged = [defaultInsurance, ...profileDbs];

    localDatabases.forEach(localDb => {
      if (!merged.some(db => db.id === localDb.id)) {
        merged.push(localDb);
      }
    });

    return merged;
  }, [profile?.customDatabases, localDatabases, language]);

  const activeSchema = useMemo(() => {
    return allDatabases.find(db => db.id === activeSchemaId) || allDatabases[0];
  }, [allDatabases, activeSchemaId]);

  useEffect(() => {
    if (profile?.activeSchemaId) {
      setActiveSchemaId(profile.activeSchemaId);
    }
  }, [profile?.activeSchemaId]);

  const handleSelectSchema = async (schemaId: string) => {
    setActiveSchemaId(schemaId);
    localStorage.setItem('active_schema_id', schemaId);
    if (user && !profileError) {
      await saveUserProfile(user.uid, { activeSchemaId: schemaId });
    }
  };

  const handleSaveCustomSchema = async (newSchema: DBModel) => {
    if (profileError) {
      alert(isHe ? "לא ניתן לשמור שינויים כשאתה במצב אופליין או כשיש שגיאת חיבור." : "Cannot save changes while offline or when there is a connection error.");
      return;
    }
    // Find existing database to archive its current state to history
    const existing = allDatabases.find(db => db.id === newSchema.id);
    let schemaToSave = { ...newSchema };

    if (existing && existing.id !== 'insurance') {
      const historyItem = {
        id: `v-${Date.now()}`,
        name: existing.name,
        description: existing.description,
        tables: JSON.parse(JSON.stringify(existing.tables)),
        createdAt: new Date().toISOString()
      };
      schemaToSave.history = [historyItem, ...(existing.history || [])].slice(0, 10);
    }

    const updatedLocal = [...localDatabases.filter(db => db.id !== schemaToSave.id), schemaToSave];
    setLocalDatabases(updatedLocal);
    localStorage.setItem('local_databases', JSON.stringify(updatedLocal));

    if (user) {
      const currentProfileDbs = profile?.customDatabases || [];
      const updatedProfileDbs = [...currentProfileDbs.filter(db => db.id !== schemaToSave.id), schemaToSave];
      await saveUserProfile(user.uid, {
        customDatabases: updatedProfileDbs,
        activeSchemaId: schemaToSave.id
      });
      setProfile(prev => prev ? { ...prev, customDatabases: updatedProfileDbs, activeSchemaId: schemaToSave.id } : null);
    }
    
    setActiveSchemaId(schemaToSave.id);
    localStorage.setItem('active_schema_id', schemaToSave.id);
  };

  const handleDeleteSchema = async (schemaId: string) => {
    if (schemaId === 'insurance') return; // Cannot delete base schema
    if (profileError) {
      alert(isHe ? "לא ניתן למחוק כשאתה במצב אופליין." : "Cannot delete while offline.");
      return;
    }

    const updateDbList = (dbs: DBModel[]) => 
      dbs.map(db => db.id === schemaId ? { ...db, isDeleted: true } : db);

    setLocalDatabases(prev => updateDbList(prev));
    const newLocal = updateDbList(localDatabases);
    localStorage.setItem('local_databases', JSON.stringify(newLocal));

    if (user && profile) {
      const updatedProfileDbs = updateDbList(profile.customDatabases || []);
      await saveUserProfile(user.uid, { customDatabases: updatedProfileDbs });
      setProfile({ ...profile, customDatabases: updatedProfileDbs });
    }

    if (activeSchemaId === schemaId) {
      const firstActive = allDatabases.find(db => db.id !== schemaId && !db.isDeleted);
      if (firstActive) handleSelectSchema(firstActive.id);
    }
  };

  const handleRestoreSchema = async (schemaId: string) => {
    if (profileError) {
      alert(isHe ? "לא ניתן לשחזר כשאתה במצב אופליין." : "Cannot restore while offline.");
      return;
    }
    const updateDbList = (dbs: DBModel[]) => 
      dbs.map(db => db.id === schemaId ? { ...db, isDeleted: false } : db);

    setLocalDatabases(prev => updateDbList(prev));
    const newLocal = updateDbList(localDatabases);
    localStorage.setItem('local_databases', JSON.stringify(newLocal));

    if (user && profile) {
      const updatedProfileDbs = updateDbList(profile.customDatabases || []);
      await saveUserProfile(user.uid, { customDatabases: updatedProfileDbs });
      setProfile({ ...profile, customDatabases: updatedProfileDbs });
    }
  };

  const handleUpdateSchemaMetadata = async (schemaId: string, name: string, description: string) => {
    if (profileError) {
      alert(isHe ? "לא ניתן לעדכן כשאתה במצב אופליין." : "Cannot update while offline.");
      return;
    }
    const updateDbList = (dbs: DBModel[]) => 
      dbs.map(db => db.id === schemaId ? { ...db, name, description } : db);

    setLocalDatabases(prev => updateDbList(prev));
    const newLocal = updateDbList(localDatabases);
    localStorage.setItem('local_databases', JSON.stringify(newLocal));

    if (user && profile) {
      const updatedProfileDbs = updateDbList(profile.customDatabases || []);
      await saveUserProfile(user.uid, { customDatabases: updatedProfileDbs });
      setProfile({ ...profile, customDatabases: updatedProfileDbs });
    }
  };

  useEffect(() => {
    // Check if API key is configured
    const checkKey = () => {
      const key = import.meta.env.VITE_GEMINI_API_KEY;
      const isMissing = !key || key === "AIzaSyAi0SHQtfOuAqQFH_DtmopzU2myWS278f4";
      setApiKeyMissing(isMissing);
      
      // If it's not missing and not the default one, show success for a few seconds
      if (!isMissing) {
        setApiKeySuccess(true);
        setTimeout(() => setApiKeySuccess(false), 5000);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setLoadingProfile(true);
        setProfileError(false);
        // Start essential profile fetch
        const res = await getUserProfile(currentUser.uid);
        let userProfile: UserProfile | null = null;
        
        if (res === 'error') {
          // Transient error (like offline)
          setProfileError(true);
          userProfile = {
            department: 'General',
            role: 'Technical',
            setupCompleted: true,
            updatedAt: new Date(),
          } as UserProfile;
        } else if (!res) {
          // Truly a new user
          const defaultProfile: any = {
            department: 'General',
            role: 'Technical',
            setupCompleted: true,
            updatedAt: new Date(),
            customDatabases: [],
            customSchema: []
          };
          await saveUserProfile(currentUser.uid, defaultProfile);
          userProfile = { ...defaultProfile } as UserProfile;
        } else {
          userProfile = res;
          if (!userProfile.setupCompleted) {
            await saveUserProfile(currentUser.uid, { setupCompleted: true });
            userProfile.setupCompleted = true;
          }
        }

        setProfile(userProfile);
        setLoadingProfile(false);

        // Fetch non-blocking data in background
        getPerformanceAnalysis(currentUser.uid).then(setPerformanceAnalysis);
        getUserQuestions(currentUser.uid).then(setUserQuestions);
      } else {
        setProfile(null);
        setPerformanceAnalysis(null);
        setUserQuestions([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);


  const handleStartTargetedPractice = (topic: string, difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert') => {
    setTargetedTopic(topic);
    if (difficulty) {
      setTargetedDifficulty(difficulty);
    } else {
      setTargetedDifficulty(null);
    }
    setActiveTab('practice');
  };

  useEffect(() => {
    if (!user) {
      setCompletedQuestions([]);
      return;
    }

const targetUid = user?.uid === 'guest-mode' ? 'vvYYxgC6UMO3uUPbt2qvpDJx9f92' : user?.uid;

const q = query(
  collection(db, 'completed_questions'),
  where('userId', '==', targetUid),
  orderBy('timestamp', 'desc')
);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const questions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
          question: {
            id: data.questionId,
            title: data.questionTitle,
            description: data.questionDescription,
            difficulty: data.difficulty,
            correctSql: data.correctSql,
          }
        } as CompletedQuestion;
      });
      setCompletedQuestions(questions);
    }, (error) => {
      if (error.code === 'failed-precondition') {
        // Fallback for missing index: Fetch without order and sort in memory
        const fallbackQ = query(
          collection(db, 'completed_questions'),
          where('userId', '==', user.uid),
          limit(100)
        );
        onSnapshot(fallbackQ, (fallbackSnapshot) => {
          const fbQuestions = fallbackSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate() || new Date(),
              question: {
                id: data.questionId,
                title: data.questionTitle,
                description: data.questionDescription,
                difficulty: data.difficulty,
                correctSql: data.correctSql,
              }
            } as CompletedQuestion;
          });
          setCompletedQuestions(fbQuestions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        });
      } else {
        handleFirestoreError(error, OperationType.LIST, 'completed_questions');
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSavedTipsCount(0);
      return;
    }

    const q = query(
      collection(db, 'saved_tips'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSavedTipsCount(snapshot.size);
    }, (error) => {
      console.error("Error subscribing to saved tips count:", error);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center space-y-8 overflow-hidden relative" dir={dir}>
        {/* Crisp industrial wire grid layout overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative h-40 w-40 md:h-48 md:w-48"
        >
          {/* Distinct, solid rectangular block with thick sharp border and no drop shadow */}
          <div className="bg-[#111827] p-8 border-4 border-[#D4FF00] rounded-none relative z-10 w-full h-full flex items-center justify-center">
            <div className="relative">
              <Database className="w-12 h-12 md:w-16 md:h-16 text-[#D4FF00] animate-pulse" />
              <div className="absolute -inset-2 border border-[#D4FF00]/20 animate-[spin_12s_linear_infinite]" />
            </div>
          </div>
        </motion.div>

        <div className="space-y-4 max-w-md relative z-10 font-mono">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-widest uppercase">
              Ocular SQL <span className="text-[#D4FF00] font-sans text-xs uppercase bg-[#D4FF00]/10 px-2 py-0.5 border border-[#D4FF00]/30 tracking-widest align-middle ml-1">SYSTEM INSTANCE</span>
            </h1>
            <div className="h-1 w-16 bg-[#D4FF00] mx-auto mt-2" />
          </div>
          
          <p className="text-slate-405 font-sans text-xs md:text-sm leading-relaxed tracking-normal px-4">
            {isHe 
              ? "מכיל את סביבת הלמידה התעשייתית שלך... קורא מדדי ביצוע טקטיים."
              : "Reconstructing custom sandbox environment... compiling real-time telemetry inputs."}
          </p>
          
          <div className="pt-2 flex flex-col items-center gap-4">
            <div className="w-40 h-2 bg-slate-900 overflow-hidden border-2 border-slate-700 relative">
              <motion.div 
                initial={{ left: "-100%" }}
                animate={{ left: "100%" }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 bottom-0 w-1/3 bg-[#D4FF00]"
              />
            </div>
            
            <div className="flex justify-center gap-6 opacity-60 text-[9px] uppercase tracking-widest font-black text-slate-400">
               <div className="flex items-center gap-1">
                 <Shield className="w-3 h-3 text-[#D4FF00]" /> SYSTEM.SECURE
               </div>
               <div className="flex items-center gap-1">
                 <Sparkles className="w-3 h-3 text-[#D4FF00]" /> COGNITIVE.AI
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-6 relative font-sans" dir={dir}>
        {/* Subtle engineering blueprint lines */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="absolute top-4 right-4 flex items-center bg-white p-1 border-2 border-slate-950 rounded-none">
          <button
            onClick={() => setLanguage('he')}
            className={cn(
              "px-3 py-1 text-xs font-bold transition-all rounded-none cursor-pointer",
              language === 'he' ? "bg-slate-950 text-white" : "text-slate-500 hover:text-slate-950"
            )}
          >
            עברית
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={cn(
              "px-3 py-1 text-xs font-bold transition-all rounded-none cursor-pointer",
              language === 'en' ? "bg-slate-950 text-white" : "text-slate-500 hover:text-slate-950"
            )}
          >
            English
          </button>
          <button
          onClick={handleGuestLogin}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 mt-3 bg-slate-950 text-white border-2 border-slate-950 rounded-none hover:bg-slate-800 transition-colors duration-200 font-bold"
        >
          🔑 כניסה מהירה כאורח (מצב דמו)
        </button>
        </div>

        <div className="max-w-md w-full bg-white rounded-none p-8 md:p-10 border-4 border-slate-950 text-center space-y-8 relative">
          {/* Cyber Volt Corner Indicator Tag */}
          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#D4FF00]" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#D4FF00]" />

          <div className="flex flex-col items-center gap-4">
            <div className="bg-slate-950 p-4 border-2 border-[#D4FF00] rounded-none">
              <ShieldCheck className="w-10 h-10 text-[#D4FF00]" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950">SQL INSURANCE PORTAL</h1>
              <p className="text-slate-500 text-xs font-mono uppercase tracking-wider mt-1">{t('elementaryTraining')}</p>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-slate-650 leading-relaxed text-sm font-sans px-2">
              {t('login_desc')}
            </p>
            <button
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-slate-950 rounded-none hover:bg-[#D4FF00]/10 hover:border-[#D4FF00] transition-colors font-black text-slate-950 uppercase tracking-wider cursor-pointer text-xs"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 shrink-0" />
              {t('login_google')}
            </button>
          </div>

          <div className="pt-6 border-t border-slate-200 text-[9px] text-slate-400 uppercase tracking-widest font-mono font-bold">
            {t('secure_env')}
          </div>
        </div>
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F8FAFC] gap-4" dir={dir}>
        <Loader2 className="w-10 h-10 text-slate-950 animate-spin" />
        <p className="text-slate-600 font-mono text-xs uppercase tracking-wider">{t('loadingProfile')}</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-screen bg-[#FAFAFA] text-slate-900 font-sans antialiased" dir={dir}>
      {/* Main Header - Pristine Bento Industrial Grid */}
      <header className="bg-slate-950 text-white px-4 md:px-8 py-3 md:py-4 flex justify-between items-center shrink-0 border-b-4 border-slate-950 z-20 font-mono relative">
        {/* Subtle top indicator band */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#D4FF00]" />

        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-slate-900 p-2 border-2 border-[#D4FF00] rounded-none">
            <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-[#D4FF00]" />
          </div>
          <div className="hidden sm:block text-left">
            <h1 className="text-sm md:text-md font-black tracking-widest uppercase text-white leading-none">SQL.INSURANCE</h1>
            <p className="text-[8px] md:text-[9px] text-[#D4FF00] uppercase tracking-widest font-bold mt-1 font-mono">{t('elementaryTraining')}</p>
          </div>
        </div>

        {/* Desktop Bento Navigation Bar */}
        <nav className="hidden md:flex bg-slate-900 p-1 border-2 border-slate-950 rounded-none gap-1">
          <button
            onClick={() => setActiveTab('practice')}
            className={cn(
              "flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-1.5 rounded-none text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
              activeTab === 'practice' 
                ? "bg-[#D4FF00] text-slate-950 border border-slate-950" 
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            {t('tab_practice')}
          </button>
          
          <button
            onClick={() => setActiveTab('daily')}
            className={cn(
              "flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-1.5 rounded-none text-xs font-black uppercase tracking-wider transition-all cursor-pointer relative",
              activeTab === 'daily' 
                ? "bg-[#D4FF00] text-slate-950 border border-slate-950" 
                : "text-[#D4FF00] bg-[#D4FF00]/5 hover:bg-[#D4FF00]/15 border border-[#D4FF00]/20"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-400/90 shrink-0 fill-orange-400/20" />
            {t('tab_daily')}
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 animate-pulse border border-slate-900" />
          </button>

          <button
            onClick={() => setActiveTab('erd')}
            className={cn(
              "flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-1.5 rounded-none text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
              activeTab === 'erd' 
                ? "bg-[#D4FF00] text-slate-950 border border-slate-950" 
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            {t('tab_erd')}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={cn(
              "flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-1.5 rounded-none text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
              activeTab === 'completed' 
                ? "bg-[#D4FF00] text-slate-950 border border-slate-950" 
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <History className="w-3.5 h-3.5 shrink-0" />
            {t('tab_completed')}
          </button>
          <button
            onClick={() => setActiveTab('learning')}
            className={cn(
              "flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-1.5 rounded-none text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
              activeTab === 'learning' 
                ? "bg-[#D4FF00] text-slate-950 border border-slate-950" 
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            {t('tab_learning')}
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={cn(
              "flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-1.5 rounded-none text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
              activeTab === 'exams' 
                ? "bg-[#D4FF00] text-slate-950 border border-slate-950" 
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <CheckSquare className="w-3.5 h-3.5 shrink-0" />
            {t('tab_exams')}
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={cn(
              "flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-1.5 rounded-none text-xs font-black uppercase tracking-wider transition-all cursor-pointer relative",
              activeTab === 'saved' 
                ? "bg-[#D4FF00] text-slate-950 border border-slate-950" 
                : "text-[#D4FF00] bg-[#D4FF00]/5 hover:bg-[#D4FF00]/15 border border-[#D4FF00]/20"
            )}
          >
            <Bookmark className="w-3.5 h-3.5 shrink-0" />
            <span>{isHe ? 'שמורים' : 'Saved'}</span>
            {savedTipsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-[8.5px] font-black h-4 px-1 flex items-center justify-center border border-slate-900">{savedTipsCount}</span>
            )}
          </button>
        </nav>

        <div className="flex items-center gap-3 md:gap-4 font-mono">
          {/* Streak Counter - Compact Neo-Bento Node */}
          {user && (
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-none border border-slate-800 transition-all",
                streak > 0 
                  ? "bg-slate-900 border-[#D4FF00] text-[#D4FF00]" 
                  : "bg-slate-900 border-slate-800 text-slate-500"
              )}
              title={isHe ? `רצף של ${streak} ימים!` : `${streak} day streak!`}
            >
              <Flame className={cn(
                "w-4 h-4 md:w-5 md:h-5 transition-all duration-300", 
                streak > 0 ? "text-[#D4FF00] animate-pulse fill-[#D4FF00]/10" : "text-slate-600"
              )} />
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-black tracking-tight leading-none">{streak}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">
                  ⚡
                </span>
              </div>
            </motion.div>
          )}

          {/* Global Toggle switcher - Bento Language Indicator */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-none p-0.5">
            <button
              onClick={() => setLanguage('he')}
              className={cn(
                "px-2 py-1 rounded-none text-[10px] font-black transition-all cursor-pointer uppercase",
                language === 'he' ? "bg-[#D4FF00] text-slate-950" : "text-slate-400 hover:text-slate-200"
              )}
            >
              עב
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                "px-2 py-1 rounded-none text-[10px] font-black transition-all cursor-pointer uppercase",
                language === 'en' ? "bg-[#D4FF00] text-slate-950" : "text-slate-400 hover:text-slate-200"
              )}
            >
              EN
            </button>
          </div>

          <div className="hidden sm:flex flex-col items-start md:items-end text-right font-mono">
            <span className="font-extrabold text-[#F8FAFC] text-[11px] leading-tight max-w-[120px] truncate">{user.displayName || t('user')}</span>
            <button onClick={logout} className="text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer text-[9px] uppercase tracking-widest mt-0.5">
              <LogOut className="w-2.5 h-2.5" />
              {t('logout')}
            </button>
          </div>
          
          {/* Rectangular / Square Avatar image Frame */}
          {user.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-8 h-8 md:w-10 md:h-10 rounded-none border-2 border-[#D4FF00] object-cover" />
          ) : (
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-none bg-slate-900 border-2 border-slate-700 flex items-center justify-center font-bold text-[#D4FF00] text-xs">
              <UserIcon className="w-4 h-4" />
            </div>
          )}
        </div>
      </header>

      {/* Mobile Navigation (Bottom Bar) - Redesigned to Industrial Neo-Minimalist */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t-4 border-slate-950 flex justify-around items-center py-2 px-2 z-50 font-mono">
        <button
          onClick={() => setActiveTab('practice')}
          className={cn(
            "flex flex-col items-center gap-0.5 py-1 px-2 rounded-none transition-all cursor-pointer",
            activeTab === 'practice' ? "text-[#D4FF00]" : "text-slate-500"
          )}
        >
          <GraduationCap className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">{language === 'he' ? 'תרגול' : 'Practice'}</span>
        </button>

        <button
          onClick={() => setActiveTab('daily')}
          className={cn(
            "flex flex-col items-center gap-0.5 py-1 px-2 rounded-none transition-all cursor-pointer relative",
            activeTab === 'daily' ? "text-[#D4FF00]" : "text-[#D4FF00]/60"
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">{language === 'he' ? 'יומי' : 'Daily'}</span>
          <span className="absolute top-0 right-1 w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
        </button>

        <button
          onClick={() => setActiveTab('erd')}
          className={cn(
            "flex flex-col items-center gap-0.5 py-1 px-2 rounded-none transition-colors cursor-pointer",
            activeTab === 'erd' ? "text-[#D4FF00]" : "text-slate-500"
          )}
        >
          <Database className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">ERD</span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={cn(
            "flex flex-col items-center gap-0.5 py-1 px-2 rounded-none transition-colors cursor-pointer",
            activeTab === 'completed' ? "text-[#D4FF00]" : "text-slate-500"
          )}
        >
          <History className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">{language === 'he' ? 'היסטוריה' : 'History'}</span>
        </button>

        <button
          onClick={() => setActiveTab('learning')}
          className={cn(
            "flex flex-col items-center gap-0.5 py-1 px-2 rounded-none transition-colors cursor-pointer",
            activeTab === 'learning' ? "text-[#D4FF00]" : "text-slate-500"
          )}
        >
          <BookOpen className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">{language === 'he' ? 'חומרים' : 'Learn'}</span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={cn(
            "flex flex-col items-center gap-0.5 py-1 px-2 rounded-none transition-colors cursor-pointer",
            activeTab === 'exams' ? "text-[#D4FF00]" : "text-slate-500"
          )}
        >
          <CheckSquare className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">{language === 'he' ? 'מבחנים' : 'Exams'}</span>
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={cn(
            "flex flex-col items-center gap-0.5 py-1 px-2 rounded-none transition-colors cursor-pointer relative",
            activeTab === 'saved' ? "text-[#D4FF00]" : "text-slate-500"
          )}
        >
          <Bookmark className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">{language === 'he' ? 'שמורים' : 'Saved'}</span>
          {savedTipsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-[8px] font-black h-3.5 min-w-3.5 flex items-center justify-center border border-slate-950 px-0.5">{savedTipsCount}</span>
          )}
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {apiKeyMissing && (
          <div className="absolute top-4 left-4 right-4 z-[100] bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500" dir="rtl">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 p-2 rounded-xl text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-sm">מפתח ה-API לא הוגדר</h3>
                <p className="text-amber-700 text-xs">ה-AI לא יעבוד עד שתגדירי GEMINI_API_KEY בלשונית Secrets.</p>
              </div>
            </div>
            <div className="text-[10px] text-amber-600 font-mono bg-amber-100 px-2 py-1 rounded border border-amber-200">
              Secrets &gt; Environment Variables
            </div>
          </div>
        )}
        {apiKeySuccess && (
          <div className="absolute top-4 left-4 right-4 z-[100] bg-emerald-50 border-2 border-emerald-200 p-4 rounded-2xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500" dir="rtl">
            <div className="bg-emerald-500 p-2 rounded-xl text-white">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-900 text-sm">המפתח הוגדר בהצלחה!</h3>
              <p className="text-emerald-700 text-xs">ה-AI מחובר כעת למכסה הפרטית שלך.</p>
            </div>
          </div>
        )}
        <React.Suspense fallback={
          <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 gap-3" dir={dir}>
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-slate-500 font-medium text-xs">{isHe ? 'טוען קומפוננטה...' : 'Loading module...'}</p>
          </div>
        }>
          {activeTab === 'practice' && (
            <div className="h-full w-full">
              <PracticeView 
                onComplete={() => setActiveTab('completed')} 
                history={completedQuestions.map(q => q.question.title)}
                completedQuestions={completedQuestions.map(q => ({
                  ...q,
                  questionId: q.question.id,
                  questionTitle: q.question.title,
                  questionDescription: q.question.description,
                  difficulty: q.question.difficulty,
                  correctSql: q.question.correctSql,
                  userId: user?.uid || ''
                }) as any)} // Temporary cast to satisfy the flat interface expected by PracticeView
                targetedTopic={targetedTopic}
                targetedDifficulty={targetedDifficulty}
                onClearTargetedTopic={() => { setTargetedTopic(null); setTargetedDifficulty(null); }}
                userProfile={profile}
                performanceAnalysis={performanceAnalysis}
                userQuestions={userQuestions}
                onStartTargetedPractice={handleStartTargetedPractice}
                activeSchema={activeSchema}
                initialQuestion={selectedDailyQuestion}
                onClearInitialQuestion={() => setSelectedDailyQuestion(null)}
              />
            </div>
          )}
          {activeTab === 'erd' && (
            <div className="h-full w-full">
              <ERDView 
                isActive={activeTab === 'erd'} 
                userProfile={profile} 
                activeSchema={activeSchema}
                allDatabases={allDatabases}
                onSelectSchema={handleSelectSchema}
                onSaveSchema={handleSaveCustomSchema}
                onDeleteSchema={handleDeleteSchema}
                onRestoreSchema={handleRestoreSchema}
                onUpdateSchemaMetadata={handleUpdateSchemaMetadata}
              />
            </div>
          )}
          {activeTab === 'completed' && (
            <div className="h-full w-full">
              <CompletedQueriesView 
                completed={completedQuestions} 
                onStartTargetedPractice={handleStartTargetedPractice}
                userProfile={profile}
                performanceAnalysis={performanceAnalysis}
                onUpdatePerformanceAnalysis={setPerformanceAnalysis}
                isActive={activeTab === 'completed'}
                onNavigateToTab={setActiveTab}
                savedTipsCount={savedTipsCount}
              />
            </div>
          )}
          {activeTab === 'learning' && (
            <div className="h-full w-full">
              <LearningMaterialsView onStartTargetedPractice={handleStartTargetedPractice} completed={completedQuestions} />
            </div>
          )}
          {activeTab === 'exams' && (
            <div className="h-full w-full">
              <ExamsView userProfile={profile} />
            </div>
          )}
          {activeTab === 'saved' && (
            <div className="h-full w-full">
              <SavedMaterialsView 
                onNavigateToTab={setActiveTab} 
                completedCount={completedQuestions.length} 
              />
            </div>
          )}
          {activeTab === 'daily' && (
            <div className="h-full w-full">
              <DailyView 
                onSelectQuestion={(question) => {
                  setSelectedDailyQuestion(question);
                  setActiveTab('practice');
                }}
                completed={completedQuestions as any}
                userProfile={profile}
                activeSchema={activeSchema}
              />
            </div>
          )}
        </React.Suspense>
      </main>

      {/* Footer / Status Bar */}
    </div>
  );
}
