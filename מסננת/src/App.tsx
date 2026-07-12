import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Briefcase, 
  Users, 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Trash2, 
  Search, 
  Building, 
  MapPin, 
  Mail, 
  Phone, 
  Sparkles, 
  Download, 
  UploadCloud, 
  RefreshCw, 
  ArrowLeft, 
  ChevronRight, 
  UserCheck, 
  UserX, 
  Clock, 
  SlidersHorizontal,
  CheckCircle2,
  FileSpreadsheet,
  Settings,
  HelpCircle,
  TrendingUp,
  Award,
  ChevronDown,
  Info,
  Layers,
  Heart,
  ChevronLeft,
  History,
  ClipboardList,
  Columns,
  LayoutGrid,
  Bell,
  Check,
  Calendar,
  X,
  Eye,
  Star,
  Lock,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { Business, Department, Team, Job, Candidate, CandidateStatus, SuitabilityCategory, RankedRequirement, ActivityLogEntry, CaseStudy, CaseStudyPreference } from "./types";
import { initialBusinesses, initialDepartments, initialTeams, initialJobs, initialCandidates } from "./data";

export default function App() {
  // --- UI STATES ---
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalEditingLogId, setTaskModalEditingLogId] = useState<string | null>(null);
  const [taskModalJobId, setTaskModalJobId] = useState("");
  const [taskModalCandidateId, setTaskModalCandidateId] = useState("");
  const [taskModalAction, setTaskModalAction] = useState("");
  const [taskModalNote, setTaskModalNote] = useState("");
  const [taskModalReminderDate, setTaskModalReminderDate] = useState("");
  const [taskModalIsCompleted, setTaskModalIsCompleted] = useState(false);
  const [taskModalStrengths, setTaskModalStrengths] = useState("");
  const [taskModalWeaknesses, setTaskModalWeaknesses] = useState("");

  // --- DATABASE STATES ---
  const [businesses, setBusinesses] = useState<Business[]>([]);
  
  // Ensure "Other" business always exists
  useEffect(() => {
    if (businesses.length > 0 && !businesses.find(b => b.id === 'other-business')) {
      const otherBiz: Business = {
        id: 'other-business',
        name: 'כללי / ללא שיוך',
        industry: 'כללי',
        location: 'כל הארץ',
        size: 'N/A',
        description: 'עסק כללי עבור משרות שאינן משויכות לישות עסקית ספציפית.',
        questions: [],
        answers: {},
        dnaSummary: 'פרופיל כללי - גמישות והתאמה רחבה.',
        createdAt: new Date().toISOString()
      };
      setBusinesses(prev => [...prev, otherBiz]);
    }
  }, [businesses]);
  const [activeBusinessId, setActiveBusinessId] = useState<string>("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // --- NAVIGATION STATE ---
  // Four tabs:
  // "business-setup" - הקמת עסק ושאלון DNA של ה-AI
  // "new-job" - הקמת משרה (תחת מחלקה ועסק)
  // "existing-jobs" - משרות קיימות וסינון קורות חיים
  // "candidates-status" - סטטוס מועמדים
  const [currentTab, setCurrentTab] = useState<"business-setup" | "new-job" | "existing-jobs" | "candidates-status" | "compare-candidates" | "recruitment-calendar">("business-setup");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [compareCandidateIds, setCompareCandidateIds] = useState<string[]>([]);

  // --- NEW BUSINESS FORM STATE ---
  const [bizName, setBizName] = useState("");
  const [bizIndustry, setBizIndustry] = useState("");
  const [bizLocation, setBizLocation] = useState("");
  const [bizSize, setBizSize] = useState("11-50 עובדים");
  const [bizDescription, setBizDescription] = useState("");

  // AI Questionnaire state
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [tempQuestions, setTempQuestions] = useState<any[]>([]);
  const [tempAnswers, setTempAnswers] = useState<Record<string, string>>({});
  const [isSynthesizingDna, setIsSynthesizingDna] = useState(false);

  // --- NEW DEPARTMENT FORM STATE ---
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [isGeneratingDeptQuestions, setIsGeneratingDeptQuestions] = useState(false);
  const [tempDeptQuestions, setTempDeptQuestions] = useState<any[]>([]);
  const [tempDeptAnswers, setTempDeptAnswers] = useState<Record<string, string>>({});
  const [isSynthesizingDeptDna, setIsSynthesizingDeptDna] = useState(false);
  const [isDeptOnboarding, setIsDeptOnboarding] = useState(false);
  
  // --- NEW TEAM FORM STATE ---
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [targetDeptIdForTeam, setTargetDeptIdForTeam] = useState("");
  const [isSynthesizingTeamDna, setIsSynthesizingTeamDna] = useState(false);
  const [isTeamOnboarding, setIsTeamOnboarding] = useState(false);
  const [tempTeamQuestions, setTempTeamQuestions] = useState<any[]>([]);
  const [tempTeamAnswers, setTempTeamAnswers] = useState<Record<string, string>>({});
  const [newTeamNameForOnboarding, setNewTeamNameForOnboarding] = useState("");
  const [targetDeptIdForTeamOnboarding, setTargetDeptIdForTeamOnboarding] = useState("");

  // --- CALIBRATION STATES ---
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationCaseIndex, setCalibrationCaseIndex] = useState(0);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [currentRankings, setCurrentRankings] = useState<string[]>([]);
  const [currentExplanation, setCurrentExplanation] = useState("");
  const [calibrationPreferences, setCalibrationPreferences] = useState<CaseStudyPreference[]>([]);
  const [calibratingJobId, setCalibratingJobId] = useState<string | null>(null);

  // --- NEW JOB FORM STATE ---
  const [selectedBusinessIdForNewJob, setSelectedBusinessIdForNewJob] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobRequirements, setJobRequirements] = useState("");
  const [jobJDText, setJobJDText] = useState("");
  const [isAnalyzingJD, setIsAnalyzingJD] = useState(false);
  const [extractedRankedRequirements, setExtractedRankedRequirements] = useState<RankedRequirement[]>([]);

  // --- SCREENING FORM STATE ---
  const [cvText, setCvText] = useState("");
  const [cvFiles, setCvFiles] = useState<File[]>([]);
  const [isScreening, setIsScreening] = useState(false);
  const [screeningProgress, setScreeningProgress] = useState({ current: 0, total: 0 });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Screening execution state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("קורא קורות חיים...");
  const [error, setError] = useState("");
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);

  // --- FILTER & STATUS STATES ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterJobId, setFilterJobId] = useState<string>("all");
  const [filterSuitability, setFilterSuitability] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [skillSearch, setSkillSearch] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [localRecruiterRating, setLocalRecruiterRating] = useState<number | undefined>(undefined);
  const [localInternalNotes, setLocalInternalNotes] = useState<string>("");

  // --- AUTO REJECT STATES ---
  const [autoRejectEnabled, setAutoRejectEnabled] = useState<boolean>(() => {
    return localStorage.getItem("screener_auto_reject_enabled") === "true";
  });
  const [autoRejectMinScore, setAutoRejectMinScore] = useState<number>(() => {
    const saved = localStorage.getItem("screener_auto_reject_min_score");
    return saved ? parseInt(saved, 10) : 50;
  });
  const [autoRejectUnsuitable, setAutoRejectUnsuitable] = useState<boolean>(() => {
    return localStorage.getItem("screener_auto_reject_unsuitable") !== "false";
  });

  const saveAutoRejectSettings = (enabled: boolean, minScore: number, unsuitable: boolean) => {
    setAutoRejectEnabled(enabled);
    setAutoRejectMinScore(minScore);
    setAutoRejectUnsuitable(unsuitable);
    localStorage.setItem("screener_auto_reject_enabled", String(enabled));
    localStorage.setItem("screener_auto_reject_min_score", String(minScore));
    localStorage.setItem("screener_auto_reject_unsuitable", String(unsuitable));
  };

  useEffect(() => {
    if (selectedCandidate) {
      setLocalRecruiterRating(selectedCandidate.recruiterRating);
      setLocalInternalNotes(selectedCandidate.internalNotes || "");
    } else {
      setLocalRecruiterRating(undefined);
      setLocalInternalNotes("");
    }
  }, [selectedCandidate?.id]);

  const [emailTemplateType, setEmailTemplateType] = useState<"interview" | "rejection">("interview");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isEmailBoxOpen, setIsEmailBoxOpen] = useState(false);
  const [lastCreatedLogId, setLastCreatedLogId] = useState<string | null>(null);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  useEffect(() => {
    if (!selectedCandidate) {
      setEmailSubject("");
      setEmailBody("");
      return;
    }

    const job = jobs.find(j => j.id === selectedCandidate.jobId);
    const biz = job ? businesses.find(b => b.id === job.businessId) : null;
    const candidateName = selectedCandidate.name;
    const jobTitle = job?.title || "המשרה";
    const companyName = biz?.name || "חברתנו";

    if (emailTemplateType === "interview") {
      setEmailSubject(`זימון לראיון עבור משרת ${jobTitle} - ${companyName}`);
      setEmailBody(
`שלום ${candidateName},

שמחנו מאוד לקבל את מועמדותך למשרת ${jobTitle} בחברת ${companyName}.

לאחר שבחנו את קורות החיים שלך בעיון, נשמח להזמין אותך לראיון טלפוני ראשוני על מנת להכיר טוב יותר ולדבר על התפקיד.

נשמח אם תוכל/י להשיב למייל זה עם מספר מועדים נוחים עבורך לשיחה במהלך הימים הקרובים.

בברכה,
צוות הגיוס של ${companyName}`
      );
    } else {
      setEmailSubject(`עדכון בנוגע למועמדותך למשרת ${jobTitle} - ${companyName}`);
      setEmailBody(
`שלום ${candidateName},

אנו רוצים להודות לך על העניין שהבעת בחברת ${companyName} ועל הזמן שהקדשת להגשת מועמדותך למשרת ${jobTitle}.

קיבלנו פניות רבות ממועמדים מצוינים, ולאחר תהליך סינון קפדני, החלטנו להתקדם עם מועמדים שפרופיל הניסיון שלהם תואם בצורה המדויקת ביותר את דרישות המשרה הנוכחיות.

אנו נשמור את פרטיך במאגר הגיוס שלנו למשרות רלוונטיות בעתיד, ומאחלים לך המון בהצלחה בהמשך הדרך המקצועית.

בברכה,
צוות הגיוס של ${companyName}`
      );
    }
  }, [selectedCandidate?.id, emailTemplateType, jobs, businesses]);

  const [newLogAction, setNewLogAction] = useState("");
  const [newLogNote, setNewLogNote] = useState("");
  const [newLogReminderDate, setNewLogReminderDate] = useState("");
  const [newLogStrengths, setNewLogStrengths] = useState("");
  const [newLogWeaknesses, setNewLogWeaknesses] = useState("");
  const [showCvModal, setShowCvModal] = useState(false);

  // --- EDITING STATES ---
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [viewingSummaryEntity, setViewingSummaryEntity] = useState<any | null>(null);
  const [summaryType, setSummaryType] = useState<"business" | "department" | "team" | "job" | null>(null);

  // --- TOAST SYSTEM ---
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // --- USER GUIDE STATES ---
  const [showUserGuide, setShowUserGuide] = useState<boolean>(() => {
    try {
      return localStorage.getItem("masenat_guide_dismissed") !== "true";
    } catch {
      return true;
    }
  });
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [guideStep, setGuideStep] = useState<number>(0);

  // Load from localStorage on mount
  useEffect(() => {
    const savedBusinesses = localStorage.getItem("screener_businesses");
    const savedDepts = localStorage.getItem("screener_departments");
    const savedTeams = localStorage.getItem("screener_teams");
    const savedJobs = localStorage.getItem("screener_jobs");
    const savedCandidates = localStorage.getItem("screener_candidates");

    // 1. Businesses
    let finalBiz = initialBusinesses;
    if (savedBusinesses) {
      try {
        const parsed = JSON.parse(savedBusinesses);
        const hasFictional = parsed.some((b: any) => b.id === "biz-fictional");
        if (!hasFictional) {
          const fictionalBiz = initialBusinesses.find(b => b.id === "biz-fictional");
          if (fictionalBiz) parsed.push(fictionalBiz);
        }
        finalBiz = parsed;
      } catch (e) {
        console.error("Error parsing saved businesses", e);
      }
    }
    setBusinesses(finalBiz);
    localStorage.setItem("screener_businesses", JSON.stringify(finalBiz));

    // Default to the fictional demo business if it exists
    const hasFictionalInFinal = finalBiz.some(b => b.id === "biz-fictional");
    if (hasFictionalInFinal) {
      setActiveBusinessId("biz-fictional");
    } else if (finalBiz.length > 0) {
      setActiveBusinessId(finalBiz[0].id);
    }

    // 2. Departments
    let finalDepts = initialDepartments;
    if (savedDepts) {
      try {
        const parsed = JSON.parse(savedDepts);
        const fictionalDepts = initialDepartments.filter(d => d.businessId === "biz-fictional");
        fictionalDepts.forEach(fDept => {
          if (!parsed.some((d: any) => d.id === fDept.id)) {
            parsed.push(fDept);
          }
        });
        finalDepts = parsed;
      } catch (e) {
        console.error("Error parsing saved departments", e);
      }
    }
    setDepartments(finalDepts);
    localStorage.setItem("screener_departments", JSON.stringify(finalDepts));

    // 3. Teams
    let finalTeams = initialTeams;
    if (savedTeams) {
      try {
        const parsed = JSON.parse(savedTeams);
        const fictionalTeams = initialTeams.filter(t => t.businessId === "biz-fictional");
        fictionalTeams.forEach(fTeam => {
          if (!parsed.some((t: any) => t.id === fTeam.id)) {
            parsed.push(fTeam);
          }
        });
        finalTeams = parsed;
      } catch (e) {
        console.error("Error parsing saved teams", e);
      }
    }
    setTeams(finalTeams);
    localStorage.setItem("screener_teams", JSON.stringify(finalTeams));

    // 4. Jobs
    let finalJobs = initialJobs;
    if (savedJobs) {
      try {
        const parsed = JSON.parse(savedJobs);
        const fictionalJobs = initialJobs.filter(j => j.businessId === "biz-fictional");
        fictionalJobs.forEach(fJob => {
          if (!parsed.some((j: any) => j.id === fJob.id)) {
            parsed.push(fJob);
          }
        });
        finalJobs = parsed;
      } catch (e) {
        console.error("Error parsing saved jobs", e);
      }
    }
    setJobs(finalJobs);
    localStorage.setItem("screener_jobs", JSON.stringify(finalJobs));

    // 5. Candidates
    let finalCandidates = initialCandidates;
    if (savedCandidates) {
      try {
        const parsed = JSON.parse(savedCandidates);
        const fictionalCands = initialCandidates.filter(c => c.id.startsWith("cand-fictional-"));
        fictionalCands.forEach(fCand => {
          if (!parsed.some((c: any) => c.id === fCand.id)) {
            parsed.push(fCand);
          }
        });
        finalCandidates = parsed;
      } catch (e) {
        console.error("Error parsing saved candidates", e);
      }
    }
    setCandidates(finalCandidates);
    localStorage.setItem("screener_candidates", JSON.stringify(finalCandidates));
  }, []);

  // Helper functions to save state & sync to localStorage
  const saveBusinesses = (updated: Business[]) => {
    setBusinesses(updated);
    localStorage.setItem("screener_businesses", JSON.stringify(updated));
  };

  const saveDepartments = (updated: Department[]) => {
    setDepartments(updated);
    localStorage.setItem("screener_departments", JSON.stringify(updated));
  };

  const saveTeams = (updated: Team[]) => {
    setTeams(updated);
    localStorage.setItem("screener_teams", JSON.stringify(updated));
  };

  const saveJobs = (updated: Job[]) => {
    setJobs(updated);
    localStorage.setItem("screener_jobs", JSON.stringify(updated));
  };

  const saveCandidates = (updated: Candidate[]) => {
    setCandidates(updated);
    localStorage.setItem("screener_candidates", JSON.stringify(updated));
  };

  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Find active business helper
  const activeBusiness = businesses.find(b => b.id === activeBusinessId);

  // Handle Business Onboarding & AI Questionnaire generation
  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim() || !bizIndustry.trim()) {
      triggerToast("שם העסק ותחום העיסוק הם שדות חובה", "error");
      return;
    }

    setIsGeneratingQuestions(true);
    setTempQuestions([]);
    setTempAnswers({});

    try {
      const response = await fetch("/api/generate-business-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bizName,
          industry: bizIndustry,
          size: bizSize,
          description: bizDescription
        })
      });

      if (!response.ok) {
        throw new Error("נכשלה יצירת שאלות הסינון מול השרת");
      }

      const data = await response.json();
      if (data.questions && Array.isArray(data.questions)) {
        setTempQuestions(data.questions);
        triggerToast("שאלות ההתאמה המותאמות אישית הופקו בהצלחה!", "success");
      } else {
        throw new Error("פורמט שאלות שגוי שהתקבל מהשרת");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "שגיאה בחיבור ל-AI. השתמש בשאלות ברירת מחדל.", "error");
      // Fallback questions following the new structure
      const fallbacks = [
        { id: "q-1", category: "industry", question: "מהו תחום הפעילות המרכזי של החברה?", type: "select", options: ["פינטק", "בריאות/טק", "ביטוח", "קמעונאות", "סייבר", "אחר"], placeholder: "פרט כאן במידת הצורך..." },
        { id: "q-2", category: "industry", question: "מהו המודל העסקי המרכזי?", type: "select", options: ["B2B SaaS", "B2C", "B2B2C", "פרויקטאלי", "שירותים מנוהלים"], placeholder: "פרט כאן במידת הצורך..." },
        { id: "q-3", category: "scale", question: "מהו גודל החברה הנוכחי?", type: "select", options: ["1-10", "11-50", "51-200", "201-1000", "1000+"], placeholder: "פרט כאן במידת הצורך..." },
        { id: "q-4", category: "culture", question: "איך היית מגדיר את קצב העבודה?", type: "select", options: ["דינמי ומשתנה", "יציב ומובנה"], placeholder: "פרט כאן במידת הצורך..." },
        { id: "q-5", category: "market", question: "מיהו קהל היעד המרכזי?", type: "select", options: ["שוק מקומי", "ארה\"ב", "אירופה", "גלובלי"], placeholder: "פרט כאן במידת הצורך..." }
      ];
      setTempQuestions(fallbacks);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const renderQuestionsByCategory = () => {
    const categories: Record<string, string> = {
      industry: "פרופיל ותעשייה",
      scale: "גודל ושלב אבולוציוני",
      culture: "תרבות ארגונית ו-DNA",
      market: "שוק יעד ושפה"
    };

    return Object.entries(categories).map(([catKey, catLabel]) => {
      const catQuestions = tempQuestions.filter(q => q.category === catKey);
      if (catQuestions.length === 0) return null;

      return (
        <div key={catKey} className="space-y-4">
          <h4 className="text-sm font-bold text-neutral-pink-700 bg-neutral-pink-50 px-3 py-1.5 rounded-lg border-r-4 border-neutral-pink-400">
            {catLabel}
          </h4>
          <div className="grid grid-cols-1 gap-5">
            {catQuestions.map((q, idx) => (
              <div key={q.id} className="space-y-2 p-4 bg-white rounded-2xl border border-neutral-pink-100 shadow-sm hover:shadow-md transition-shadow">
                <label className="block text-xs font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-pink-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span>{q.question}</span>
                </label>
                
                <div className="flex flex-col gap-3">
                  {q.type === "select" && q.options && (
                    <select
                      value={tempAnswers[`${q.id}_select`] || ""}
                      onChange={(e) => setTempAnswers({ ...tempAnswers, [`${q.id}_select`]: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-neutral-pink-200 bg-neutral-pink-50/10 focus:outline-none focus:border-neutral-pink-400 text-xs"
                    >
                      <option value="">בחר תשובה מתאימה...</option>
                      {q.options.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                  
                  <textarea
                    rows={2}
                    placeholder={q.placeholder}
                    value={tempAnswers[q.id] || ""}
                    onChange={(e) => setTempAnswers({ ...tempAnswers, [q.id]: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-pink-200 bg-neutral-pink-50/20 focus:outline-none focus:border-neutral-pink-400 focus:ring-1 focus:ring-neutral-pink-300 text-xs transition"
                  />
                  <p className="text-[10px] text-gray-400 italic">* ניתן להרחיב ולהוסיף פרטים מעבר לסימון התשובה</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  // Submit AI answers & Synthesize DNA
  const handleSynthesizeDNA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSynthesizingDna(true);

    try {
      const response = await fetch("/api/synthesize-business-dna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bizName,
          industry: bizIndustry,
          description: bizDescription,
          answers: tempAnswers,
          questions: tempQuestions
        })
      });

      let summaryText = "";
      if (response.ok) {
        const data = await response.json();
        summaryText = data.dnaSummary;
      } else {
        summaryText = `עסק בתחום ${bizIndustry} המעסיק כ-${bizSize}. סביבת העבודה מאופיינת בקצב עבודה ${tempAnswers["q-4_select"] || "דינמי"} ובסגנון ${tempAnswers["q-2_select"] || "SaaS"}.`;
      }

      if (editingBusiness) {
        const updated = businesses.map(b => {
          if (b.id === editingBusiness.id) {
            return {
              ...b,
              name: bizName,
              industry: bizIndustry,
              location: bizLocation || "לא צוין",
              size: bizSize,
              description: bizDescription,
              questions: tempQuestions,
              answers: tempAnswers,
              dnaSummary: summaryText,
            };
          }
          return b;
        });
        saveBusinesses(updated);
        setEditingBusiness(null);
        triggerToast("פרופיל ה-DNA של העסק עודכן בהצלחה!", "success");
      } else {
        const newBiz: Business = {
          id: "biz-" + Date.now(),
          name: bizName,
          industry: bizIndustry,
          location: bizLocation || "לא צוין",
          size: bizSize,
          description: bizDescription,
          questions: tempQuestions,
          answers: tempAnswers,
          dnaSummary: summaryText,
          createdAt: new Date().toISOString()
        };

        const updated = [newBiz, ...businesses];
        saveBusinesses(updated);
        setActiveBusinessId(newBiz.id);

        // Create a default department for the new business
        const defaultDept: Department = {
          id: "dept-" + Date.now(),
          businessId: newBiz.id,
          name: "צוות כללי / פיתוח",
          createdAt: new Date().toISOString()
        };
        saveDepartments([defaultDept, ...departments]);
        triggerToast("פרופיל ה-DNA של העסק הוקם וסוכם בהצלחה!", "success");
      }

      // Clear onboarding forms
      setBizName("");
      setBizIndustry("");
      setBizLocation("");
      setBizDescription("");
      setTempQuestions([]);
      setTempAnswers({});
      
      // Auto-navigate to jobs to start hiring
      setCurrentTab("new-job");
    } catch (err: any) {
      console.error(err);
      triggerToast("נכשלה יצירת הפרופיל. נסו שוב.", "error");
    } finally {
      setIsSynthesizingDna(false);
    }
  };

  // Create Department under selected business - triggers question generation
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) {
      triggerToast("שם המחלקה אינו יכול להיות ריק", "error");
      return;
    }
    if (!activeBusinessId) {
      triggerToast("אנא בחרו עסק תחילה", "error");
      return;
    }

    setIsGeneratingDeptQuestions(true);
    try {
      const biz = businesses.find(b => b.id === activeBusinessId);
      const response = await fetch("/api/generate-department-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bizName: biz?.name,
          bizIndustry: biz?.industry,
          deptName: newDeptName.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTempDeptQuestions(data.questions);
        setIsDeptOnboarding(true);
        triggerToast(`הופק שאלון התאמה למחלקת ${newDeptName}`);
      } else {
        throw new Error("Failed to generate questions");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("שגיאה בהפקת שאלון ה-AI. נסה שוב.", "error");
      // Fallback for department
      const fallbacks = [
        { id: "dq-1", category: "function", question: "מהו סוג המחלקה?", type: "select", options: ["פיתוח", "מכירות", "שירות לקוחות", "כספים", "שיווק", "HR", "תפעול", "מוצר"], placeholder: "פרט כאן..." },
        { id: "dq-2", category: "function", question: "מהו היעד המרכזי (KPI) של המחלקה?", type: "text", placeholder: "למשל: דליברי מהיר של קוד, הגדלת מכירות..." },
        { id: "dq-3", category: "structure", question: "מהו גודל הצוות הישיר אליו המועמד ייכנס?", type: "select", options: ["2-5 אנשים", "6-15 אנשים", "15+ אנשים"], placeholder: "פרט כאן..." }
      ];
      setTempDeptQuestions(fallbacks);
      setIsDeptOnboarding(true);
    } finally {
      setIsGeneratingDeptQuestions(false);
    }
  };

  const handleSynthesizeDeptDNA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSynthesizingDeptDna(true);

    try {
      const biz = businesses.find(b => b.id === activeBusinessId);
      const response = await fetch("/api/synthesize-department-dna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bizName: biz?.name,
          deptName: newDeptName,
          answers: tempDeptAnswers,
          questions: tempDeptQuestions
        })
      });

      let summaryText = "";
      if (response.ok) {
        const data = await response.json();
        summaryText = data.dnaSummary;
      } else {
        summaryText = `מחלקה בתוך ${biz?.name}. סביבת עבודה מאופיינת בניהול ${tempDeptAnswers["dq-1_select"] || "מקומי"}.`;
      }

      if (editingDepartment) {
        const updated = departments.map(d => {
          if (d.id === editingDepartment.id) {
            return {
              ...d,
              name: newDeptName.trim(),
              questions: tempDeptQuestions,
              answers: tempDeptAnswers,
              dnaSummary: summaryText,
            };
          }
          return d;
        });
        saveDepartments(updated);
        setEditingDepartment(null);
        triggerToast(`פרופיל ה-DNA של מחלקת ${newDeptName} עודכן בהצלחה!`, "success");
      } else {
        const newDept: Department = {
          id: "dept-" + Date.now(),
          businessId: activeBusinessId!,
          name: newDeptName.trim(),
          questions: tempDeptQuestions,
          answers: tempDeptAnswers,
          dnaSummary: summaryText,
          createdAt: new Date().toISOString()
        };

        saveDepartments([newDept, ...departments]);
        setSelectedDeptId(newDept.id);
        triggerToast(`פרופיל ה-DNA של מחלקת ${newDeptName} הוקם בהצלחה!`, "success");
      }
      
      // Clear
      setNewDeptName("");
      setTempDeptQuestions([]);
      setTempDeptAnswers({});
      setIsDeptOnboarding(false);
      setShowAddDeptModal(false);
    } catch (err: any) {
      console.error(err);
      triggerToast("נכשלה יצירת המחלקה. נסו שוב.", "error");
    } finally {
      setIsSynthesizingDeptDna(false);
    }
  };

  const renderDeptQuestionsByCategory = () => {
    const categories: Record<string, string> = {
      function: "ייעוד המחלקה וסוג הפעילות",
      structure: "מבנה ארגוני ודינמיקה צוותית",
      ecosystem: "הסביבה המקצועית והטכנולוגית",
      culture: "תת-תרבות וממשקי עבודה"
    };

    return Object.entries(categories).map(([catKey, catLabel]) => {
      const catQuestions = tempDeptQuestions.filter(q => q.category === catKey);
      if (catQuestions.length === 0) return null;

      return (
        <div key={catKey} className="space-y-3">
          <h4 className="text-[11px] font-bold text-neutral-pink-700 bg-neutral-pink-50 px-3 py-1 rounded-lg border-r-4 border-neutral-pink-400">
            {catLabel}
          </h4>
          <div className="space-y-4">
            {catQuestions.map((q, idx) => (
              <div key={q.id} className="space-y-1.5 p-3 bg-neutral-pink-50/10 rounded-xl border border-neutral-pink-100">
                <label className="block text-[10px] font-semibold text-gray-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-neutral-pink-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span>{q.question}</span>
                </label>
                
                <div className="flex flex-col gap-2">
                  {q.type === "select" && q.options && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {q.options.map((opt: string) => {
                        const selections = (tempDeptAnswers[`${q.id}_select`] as unknown as string[]) || [];
                        const isChecked = selections.includes(opt);
                        return (
                          <label key={opt} className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition ${isChecked ? 'bg-neutral-pink-50 border-neutral-pink-200' : 'bg-white border-gray-100'}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const newSelections = e.target.checked 
                                  ? [...selections, opt]
                                  : selections.filter(s => s !== opt);
                                setTempDeptAnswers({ ...tempDeptAnswers, [`${q.id}_select`]: newSelections as any });
                              }}
                              className="w-3 h-3 text-neutral-pink-500 border-gray-300 rounded focus:ring-neutral-pink-400"
                            />
                            <span className="text-[9px] text-gray-700">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  
                  <textarea
                    rows={2}
                    placeholder={q.placeholder}
                    value={tempDeptAnswers[q.id] || ""}
                    onChange={(e) => setTempDeptAnswers({ ...tempDeptAnswers, [q.id]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-pink-200 bg-white focus:outline-none focus:border-neutral-pink-400 text-[10px] transition"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  const renderTeamQuestions = () => {
    return tempTeamQuestions.map((q, idx) => (
      <div key={q.id} className="space-y-1.5 p-3 bg-neutral-pink-50/10 rounded-xl border border-neutral-pink-100">
        <label className="block text-[10px] font-semibold text-gray-900 flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-neutral-pink-500 text-white text-[9px] flex items-center justify-center font-bold">
            {idx + 1}
          </span>
          <span>{q.question}</span>
        </label>
        
        <div className="flex flex-col gap-2">
          {q.type === "select" && q.options && (
            <div className="grid grid-cols-2 gap-2 mt-1">
              {q.options.map((opt: string) => {
                const selections = (tempTeamAnswers[`${q.id}_select`] as unknown as string[]) || [];
                const isChecked = selections.includes(opt);
                return (
                  <label key={opt} className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition ${isChecked ? 'bg-neutral-pink-50 border-neutral-pink-200' : 'bg-white border-gray-100'}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const newSelections = e.target.checked 
                          ? [...selections, opt]
                          : selections.filter(s => s !== opt);
                        setTempTeamAnswers({ ...tempTeamAnswers, [`${q.id}_select`]: newSelections as any });
                      }}
                      className="w-3 h-3 text-neutral-pink-500 border-gray-300 rounded focus:ring-neutral-pink-400"
                    />
                    <span className="text-[9px] text-gray-700">{opt}</span>
                  </label>
                );
              })}
            </div>
          )}
          
          <textarea
            rows={2}
            placeholder={q.placeholder}
            value={tempTeamAnswers[q.id] || ""}
            onChange={(e) => setTempTeamAnswers({ ...tempTeamAnswers, [q.id]: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-neutral-pink-200 bg-white focus:outline-none focus:border-neutral-pink-400 text-[10px] transition"
          />
        </div>
      </div>
    ));
  };

  const renderCvModal = () => {
    if (!selectedCandidate || !showCvModal) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-300">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white w-full h-full max-w-5xl rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-neutral-pink-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-pink-100 flex items-center justify-center text-neutral-pink-600 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{selectedCandidate.name} - קורות חיים</h3>
                <p className="text-[10px] text-gray-400">{selectedCandidate.fileName || "הזנה ידנית"}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowCvModal(false)}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-grow overflow-auto bg-gray-50 p-6 flex justify-center">
            {selectedCandidate.pdfBase64 ? (
              <object
                data={`data:${selectedCandidate.pdfMimeType || 'application/pdf'};base64,${selectedCandidate.pdfBase64}`}
                type={selectedCandidate.pdfMimeType || 'application/pdf'}
                className="w-full h-full rounded-xl shadow-lg border border-gray-200"
              >
                <div className="p-12 text-center bg-white rounded-2xl shadow-sm border border-gray-100">
                  <AlertCircle className="w-12 h-12 text-rose-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-bold mb-2">לא ניתן להציג את הקובץ ישירות בדפדפן</p>
                  <a 
                    href={`data:${selectedCandidate.pdfMimeType || 'application/pdf'};base64,${selectedCandidate.pdfBase64}`}
                    download={selectedCandidate.fileName || "cv.pdf"}
                    className="text-neutral-pink-500 font-bold hover:underline"
                  >
                    לחץ כאן להורדת הקובץ
                  </a>
                </div>
              </object>
            ) : selectedCandidate.cvText ? (
              <div className="w-full max-w-3xl bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-right">
                <pre className="whitespace-pre-wrap text-xs text-gray-700 leading-relaxed font-sans rtl">
                  {selectedCandidate.cvText}
                </pre>
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-2xl shadow-sm border border-gray-100 self-center">
                <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400 font-bold">לא נמצא תוכן קורות חיים להצגה</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  const renderActivityLog = () => {
    if (!selectedCandidate) return null;

    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <History className="w-4 h-4 text-neutral-pink-500" />
          <h4 className="text-xs font-bold text-gray-900">תיעוד פעולות ויומן מועמד</h4>
        </div>

        {/* Add Entry Form */}
        <div className="bg-neutral-pink-50/30 p-3 rounded-2xl border border-neutral-pink-100 space-y-3">
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={newLogAction}
                onChange={(e) => setNewLogAction(e.target.value)}
                className="text-[11px] bg-white border border-neutral-pink-200 px-2 py-1.5 rounded-lg focus:outline-none"
              >
                <option value="">בחר סוג פעולה...</option>
                <option value="ראיון טלפוני">ראיון טלפוני 📞</option>
                <option value="ראיון מקצועי">ראיון מקצועי 💻</option>
                <option value="ראיון HR">ראיון HR 🤝</option>
                <option value="משימת בית">נשלחה משימת בית 📝</option>
                <option value="שיחת עדכון">שיחת עדכון 🔄</option>
                <option value="הצעה">הוגשה הצעה 📄</option>
                <option value="משימה הבאה">משימה הבאה 📌</option>
                <option value="אחר">אחר (הערה כללית)</option>
              </select>
              <input 
                type="text"
                placeholder="הערה קצרה (אופציונלי)..."
                value={newLogNote}
                onChange={(e) => setNewLogNote(e.target.value)}
                className="text-[11px] bg-white border border-neutral-pink-200 px-2 py-1.5 rounded-lg focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 shrink-0">הגדר תזכורת למשימה:</span>
              <input 
                type="datetime-local"
                value={newLogReminderDate}
                onChange={(e) => setNewLogReminderDate(e.target.value)}
                className="text-[10px] bg-white border border-neutral-pink-200 px-2 py-1 rounded-lg focus:outline-none flex-grow"
              />
            </div>

            {/* Conditional Strengths/Weaknesses for Interview or Test */}
            {(newLogAction.includes("ראיון") || newLogAction.includes("משימת בית")) && (
              <div className="grid grid-cols-2 gap-2 border-t border-neutral-pink-100/50 pt-2">
                <div>
                  <label className="text-[9px] font-bold text-emerald-700 block mb-1">נקודות חוזקה שעלו:</label>
                  <textarea 
                    rows={2}
                    placeholder="מה הרשים אתכם במיוחד?"
                    value={newLogStrengths}
                    onChange={(e) => setNewLogStrengths(e.target.value)}
                    className="w-full text-[10px] bg-white border border-emerald-100 p-2 rounded-lg focus:outline-none focus:border-emerald-300 transition"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-rose-700 block mb-1">נקודות חולשה / דגשים:</label>
                  <textarea 
                    rows={2}
                    placeholder="איפה היו פחות משכנעים?"
                    value={newLogWeaknesses}
                    onChange={(e) => setNewLogWeaknesses(e.target.value)}
                    className="w-full text-[10px] bg-white border border-rose-100 p-2 rounded-lg focus:outline-none focus:border-rose-300 transition"
                  />
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={handleAddActivityLog}
            disabled={!newLogAction}
            className={`w-full py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 transition ${
              newLogAction ? "bg-neutral-pink-500 text-white hover:bg-neutral-pink-600" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Plus className="w-3 h-3" />
            תיעוד הפעולה
          </button>
        </div>

        {/* Log Entries List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
          {(!selectedCandidate.activityLog || selectedCandidate.activityLog.length === 0) ? (
            <p className="text-[10px] text-gray-400 text-center py-4 italic">טרם תועדו פעולות עבור מועמד זה</p>
          ) : (
            selectedCandidate.activityLog.map((log) => {
              const isOverdue = log.reminderDate && !log.isCompleted && new Date(log.reminderDate) < new Date();
              
              return (
                <div key={log.id} className={`p-2.5 rounded-xl border flex items-start gap-3 transition-colors ${
                  log.reminderDate ? (log.isCompleted ? 'bg-emerald-50/30 border-emerald-100' : (isOverdue ? 'bg-rose-50/40 border-rose-200' : 'bg-amber-50/30 border-amber-100')) : 'bg-white border-gray-100 shadow-sm'
                }`}>
                  <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    {log.reminderDate ? (
                      <button 
                        onClick={() => toggleReminderStatus(log.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition ${log.isCompleted ? 'bg-emerald-500 border-emerald-500' : (isOverdue ? 'border-rose-400 hover:bg-rose-100' : 'border-gray-300 hover:border-amber-400')}`}
                        title={log.isCompleted ? "סמן כלא בוצע" : "סמן כבוצע"}
                      >
                        {log.isCompleted && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-pink-400" />
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[11px] font-bold ${log.isCompleted ? 'text-gray-400 line-through' : (isOverdue ? 'text-rose-700' : 'text-gray-800')}`}>
                        {log.action}
                        {log.reminderDate && <span className={`mr-1 ${isOverdue ? 'text-rose-600' : 'text-amber-600'}`}>⏰</span>}
                      </span>
                      <span className="text-[9px] text-gray-400">{new Date(log.timestamp).toLocaleDateString('he-IL')} {new Date(log.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {log.note && <p className={`text-[10px] italic leading-tight ${log.isCompleted ? 'text-gray-300 line-through' : (isOverdue ? 'text-rose-600/70' : 'text-gray-500')}`}>{log.note}</p>}
                    
                    {log.strengths && (
                      <div className="mt-2 p-1.5 bg-emerald-50/50 rounded-lg border border-emerald-100/50">
                        <span className="text-[9px] font-bold text-emerald-700 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> חוזקות:
                        </span>
                        <p className="text-[10px] text-gray-600 leading-tight">{log.strengths}</p>
                      </div>
                    )}
                    {log.weaknesses && (
                      <div className="mt-1.5 p-1.5 bg-rose-50/50 rounded-lg border border-rose-100/50">
                        <span className="text-[9px] font-bold text-rose-700 flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" /> חולשות:
                        </span>
                        <p className="text-[10px] text-gray-600 leading-tight">{log.weaknesses}</p>
                      </div>
                    )}

                    {log.reminderDate && (
                      <div className={`mt-1.5 flex items-center gap-1 text-[9px] font-bold ${log.isCompleted ? 'text-emerald-600 opacity-60' : (isOverdue ? 'text-rose-600' : 'text-amber-700 animate-pulse')}`}>
                        <Bell className={`w-2.5 h-2.5 ${isOverdue ? 'animate-bounce' : ''}`} />
                        <span>{log.isCompleted ? 'בוצע במועד: ' : (isOverdue ? 'עבר זמן ביצוע: ' : 'תזכורת לביצוע: ')} {new Date(log.reminderDate).toLocaleDateString('he-IL')} {new Date(log.reminderDate).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderCandidateRadarChart = (candidate: Candidate) => {
    if (!candidate.skillScores || Object.keys(candidate.skillScores).length === 0) return null;

    const data = Object.entries(candidate.skillScores).map(([key, value]) => ({
      subject: key,
      A: value,
      fullMark: 100,
    }));

    return (
      <div className="bg-white p-4 rounded-2xl border border-neutral-pink-100 shadow-sm h-[280px] w-full flex flex-col items-center mb-4">
        <h4 className="text-[11px] font-bold text-gray-800 mb-2 w-full text-right border-r-2 border-neutral-pink-500 pr-2">
          ניתוח מיומנויות (AI Skills Radar)
        </h4>
        <div className="w-full h-full flex-grow">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
              <PolarGrid stroke="#fbcfe8" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#6b7280', fontSize: 9, fontWeight: 500 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={false}
                axisLine={false}
              />
              <Radar
                name={candidate.name}
                dataKey="A"
                stroke="#ec4899"
                fill="#ec4899"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderSuitabilityBreakdown = (candidate: Candidate) => {
    if (!candidate.skillScores || Object.keys(candidate.skillScores).length === 0) return null;

    return (
      <div className="bg-white p-5 rounded-2xl border border-neutral-pink-100 shadow-sm space-y-4 mb-4">
        <div className="flex items-center justify-between border-b border-neutral-pink-50 pb-3">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-neutral-pink-500" />
            פירוט ציון התאמה (Score Breakdown)
          </h4>
          <span className="text-xl font-black text-neutral-pink-600 bg-neutral-pink-50 px-3 py-1 rounded-xl">
            {candidate.suitabilityScore}
          </span>
        </div>
        <div className="space-y-4">
          {Object.entries(candidate.skillScores).map(([skill, score]) => (
            <div key={skill} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700">{skill}</span>
                <span className={`font-black ${score >= 90 ? 'text-green-600' : score >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {score}%
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  className={`h-full ${score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                />
              </div>
              {candidate.skillExplanations && candidate.skillExplanations[skill] && (
                <p className="text-[10px] text-gray-500 italic bg-gray-50/50 p-2 rounded-lg border border-gray-100 leading-relaxed">
                  {candidate.skillExplanations[skill]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCompareCandidates = () => {
    const selectedToCompare = candidates.filter(c => compareCandidateIds.includes(c.id));
    
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-white/95 p-6 rounded-3xl border border-neutral-pink-200/80 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">השוואת מועמדים</h2>
              <p className="text-xs text-gray-500 mt-1">בחרו 2 או 3 מועמדים מתוך רשימת המועמדים כדי להשוות ביניהם</p>
            </div>
            <button 
              onClick={() => setCompareCandidateIds([])}
              className="text-xs text-rose-500 font-bold hover:underline"
            >
              נקה את כל הבחירות
            </button>
          </div>

          {selectedToCompare.length < 2 ? (
            <div className="py-20 text-center">
              <LayoutGrid className="w-16 h-16 text-neutral-pink-200 mx-auto mb-4" />
              <p className="text-sm font-bold text-gray-600">בחרו לפחות 2 מועמדים להשוואה</p>
              <p className="text-xs text-gray-400 mt-2">
                עברו ללשונית "סטטוס מועמדים" וסמנו את תיבות הבחירה לצד המועמדים הרלוונטיים.
              </p>
              <button 
                onClick={() => setCurrentTab("candidates-status")}
                className="mt-6 px-6 py-2.5 bg-neutral-pink-500 text-white rounded-full text-xs font-bold hover:bg-neutral-pink-600 transition"
              >
                חזרה לרשימת המועמדים
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right">
                <thead>
                  <tr>
                    <th className="p-4 bg-gray-50 border-b border-neutral-pink-100 text-xs font-bold text-gray-500 w-48">קריטריון השוואה</th>
                    {selectedToCompare.map(c => (
                      <th key={c.id} className="p-4 bg-white border-b border-neutral-pink-100 min-w-[200px]">
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full bg-neutral-pink-100 flex items-center justify-center text-neutral-pink-600 font-bold text-lg mb-2">
                            {c.name.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-gray-900">{c.name}</span>
                          <span className="text-[10px] text-gray-400">{jobs.find(j => j.id === c.jobId)?.title}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr>
                    <td className="p-4 border-b border-neutral-pink-50 font-bold text-gray-700 bg-neutral-pink-50/20">ציון התאמה AI</td>
                    {selectedToCompare.map(c => (
                      <td key={c.id} className="p-4 border-b border-neutral-pink-50 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${
                            c.suitabilityScore >= 90 ? "bg-emerald-500" : c.suitabilityScore >= 75 ? "bg-blue-500" : "bg-amber-500"
                          }`}>
                            {c.suitabilityScore}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${suitabilityColors[c.suitabilityCategory as SuitabilityCategory]?.bg} ${suitabilityColors[c.suitabilityCategory as SuitabilityCategory]?.text}`}>
                            {suitabilityColors[c.suitabilityCategory as SuitabilityCategory]?.label}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 border-b border-neutral-pink-50 font-bold text-gray-700 bg-neutral-pink-50/20">כישורים מרכזיים</td>
                    {selectedToCompare.map(c => (
                      <td key={c.id} className="p-4 border-b border-neutral-pink-50">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {c.skills.slice(0, 6).map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200 text-[9px]">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 border-b border-neutral-pink-50 font-bold text-gray-700 bg-neutral-pink-50/20">ניסיון רלוונטי</td>
                    {selectedToCompare.map(c => (
                      <td key={c.id} className="p-4 border-b border-neutral-pink-50 text-center font-medium text-gray-700">
                        {c.summary.split('.')[0]}.
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 border-b border-neutral-pink-50 font-bold text-gray-700 bg-neutral-pink-50/20">סיכום המלצת AI</td>
                    {selectedToCompare.map(c => (
                      <td key={c.id} className="p-4 border-b border-neutral-pink-50">
                        <p className="text-[10px] text-gray-600 leading-relaxed text-right line-clamp-4">
                          {c.recommendation}
                        </p>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 border-b border-neutral-pink-50 font-bold text-gray-700 bg-neutral-pink-50/20">פעולות</td>
                    {selectedToCompare.map(c => (
                      <td key={c.id} className="p-4 border-b border-neutral-pink-50 text-center">
                        <button 
                          onClick={() => {
                            setSelectedCandidate(c);
                            setCurrentTab("candidates-status");
                          }}
                          className="px-4 py-1.5 bg-neutral-pink-50 text-neutral-pink-600 border border-neutral-pink-200 rounded-full text-[10px] font-bold hover:bg-neutral-pink-100 transition"
                        >
                          צפייה בתיק מועמד
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRecruitmentCalendar = () => {
    // Get all activities with reminders across all candidates
    const allScheduledTasks = candidates.flatMap(cand => 
      (cand.activityLog || [])
        .filter(log => log.reminderDate)
        .map(log => ({
          ...log,
          candidateName: cand.name,
          candidateId: cand.id,
          jobTitle: jobs.find(j => j.id === cand.jobId)?.title || "משרה לא ידועה"
        }))
    ).sort((a, b) => new Date(a.reminderDate!).getTime() - new Date(b.reminderDate!).getTime());

    // Simple Monthly Grid Logic
    const startOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    const endOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
    
    // Adjust for Sunday-based week (Hebrew standard)
    const daysInMonth = endOfMonth.getDate();
    const startDay = startOfMonth.getDay(); // 0 = Sunday
    
    const calendarDays = [];
    // Padding for start of month
    for (let i = 0; i < startDay; i++) {
      calendarDays.push(null);
    }
    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), i));
    }

    const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
    const dayNames = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 bg-white/95 p-6 rounded-3xl border border-neutral-pink-200/80 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-neutral-pink-500" />
                  יומן גיוס מרכזי
                </h2>
                <button
                  onClick={() => handleOpenAddTask()}
                  className="bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-full shadow-sm transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>משימה חדשה</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold min-w-[100px] text-center">
                  {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                </span>
                <button 
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {dayNames.map(day => <div key={day}>{day}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} className="h-16 sm:h-24 bg-gray-50/30 rounded-xl"></div>;
                
                const isToday = date.toDateString() === new Date().toDateString();
                const dayTasks = allScheduledTasks.filter(task => 
                  new Date(task.reminderDate!).toDateString() === date.toDateString()
                );

                return (
                  <div 
                    key={date.toISOString()} 
                    onClick={() => handleOpenAddTask(date)}
                    className={`h-16 sm:h-24 p-1 sm:p-1.5 border rounded-xl flex flex-col gap-1 transition-all cursor-pointer ${
                      isToday ? "border-neutral-pink-300 bg-neutral-pink-50/30 hover:bg-neutral-pink-50/50" : "border-gray-100 bg-white hover:border-neutral-pink-100 hover:bg-gray-50/50"
                    }`}
                  >
                    <span className={`text-[10px] font-bold ${isToday ? "text-neutral-pink-600" : "text-gray-400"}`}>
                      {date.getDate()}
                    </span>
                    <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col gap-1">
                      {dayTasks.map(task => (
                        <div 
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditTask(task);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold truncate cursor-pointer transition-colors shadow-sm ${
                            task.isCompleted 
                              ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100" 
                              : "bg-neutral-pink-100 hover:bg-neutral-pink-200 text-neutral-pink-800 border border-neutral-pink-200"
                          }`}
                          title={`${task.candidateName}: ${task.action}`}
                        >
                          {task.action} - {task.candidateName}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task List / Agenda */}
          <div className="bg-white/95 p-6 rounded-3xl border border-neutral-pink-200/80 shadow-md">
            <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-neutral-pink-500" />
              משימות קרובות (אג'נדה)
            </h3>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {allScheduledTasks.filter(t => !t.isCompleted && new Date(t.reminderDate!) >= new Date()).slice(0, 10).length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400 italic">אין משימות קרובות מתוזמנות</div>
              ) : (
                allScheduledTasks.filter(t => !t.isCompleted && new Date(t.reminderDate!) >= new Date()).slice(0, 10).map(task => (
                  <div 
                    key={task.id} 
                    className="p-3 bg-neutral-pink-50/50 border border-neutral-pink-100 rounded-2xl flex flex-col gap-1 group hover:border-neutral-pink-300 transition-colors cursor-pointer"
                    onClick={() => {
                      handleOpenEditTask(task);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-neutral-pink-600">{task.action}</span>
                      <span className="text-[9px] text-gray-400 font-mono">
                        {new Date(task.reminderDate!).toLocaleDateString('he-IL')} {new Date(task.reminderDate!).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-gray-800">{task.candidateName}</div>
                    <div className="text-[9px] text-gray-500 truncate">{task.jobTitle}</div>
                    {task.note && <div className="mt-1 text-[9px] text-gray-400 italic border-t border-neutral-pink-100 pt-1">{task.note}</div>}
                  </div>
                ))
              )}

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">משימות שבוצעו לאחרונה</h4>
                <div className="space-y-2">
                  {allScheduledTasks.filter(t => t.isCompleted).slice(-3).reverse().map(task => (
                    <div key={task.id} className="flex items-center gap-2 text-[10px] text-emerald-600/70">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{task.action} ({task.candidateName})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRankedRequirementsEditor = () => {
    if (extractedRankedRequirements.length === 0) return null;

    return (
      <div className="mt-4 bg-white p-4 rounded-2xl border border-neutral-pink-200 shadow-sm animate-in fade-in slide-in-from-top-4">
        <h4 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-neutral-pink-500" />
          דירוג חשיבות הדרישות (AI Extracted)
        </h4>
        <div className="space-y-2.5">
          {extractedRankedRequirements.map((req) => (
            <div key={req.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-gray-50/30 hover:bg-neutral-pink-50/20 transition group">
              <div className="flex-1 text-[11px] text-gray-700 leading-tight">
                {req.text}
              </div>
              <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-100 shadow-inner">
                {(['must', 'important', 'nice_to_have'] as const).map((level) => {
                  const labels: Record<string, string> = { must: 'חובה', important: 'חשוב', nice_to_have: 'יתרון' };
                  const colors: Record<string, string> = { 
                    must: 'bg-red-500 text-white', 
                    important: 'bg-orange-500 text-white', 
                    nice_to_have: 'bg-blue-500 text-white' 
                  };
                  const isSelected = req.importance === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        setExtractedRankedRequirements(prev => 
                          prev.map(r => r.id === req.id ? { ...r, importance: level } : r)
                        );
                      }}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${isSelected ? colors[level] : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {labels[level]}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setExtractedRankedRequirements(prev => prev.filter(r => r.id !== req.id))}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Job creation handler
  const handleAnalyzeJD = async () => {
    if (!jobJDText.trim()) {
      triggerToast("יש להזין טקסט של תיאור משרה לניתוח", "error");
      return;
    }
    
    setIsAnalyzingJD(true);
    try {
      const biz = businesses.find(b => b.id === activeBusinessId);
      const dept = departments.find(d => d.id === selectedDeptId);
      const team = teams.find(t => t.id === selectedTeamId);
      
      const response = await fetch("/api/analyze-job-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdText: jobJDText,
          bizName: biz?.name,
          bizIndustry: biz?.industry,
          bizDna: biz?.dnaSummary,
          deptName: dept?.name,
          deptDna: dept?.dnaSummary,
          teamName: team?.name,
          teamDna: team?.dnaSummary
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.extractedTitle) setJobTitle(data.extractedTitle);
        setJobRequirements(data.combinedHebrewList || "");
        
        if (data.requirementsForRanking && Array.isArray(data.requirementsForRanking)) {
          const formatted: RankedRequirement[] = data.requirementsForRanking.map((req: string, idx: number) => ({
            id: `req-${idx}-${Date.now()}`,
            text: req,
            importance: 'important'
          }));
          setExtractedRankedRequirements(formatted);
        }

        triggerToast("ניתוח המשרה הושלם! דרישות גלויות ונסתרות הופקו.", "success");

        // START CALIBRATION PHASE
        try {
          const calResponse = await fetch("/api/generate-case-studies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobTitle: data.extractedTitle || jobTitle,
              jobRequirements: data.combinedHebrewList || jobRequirements,
              bizDna: biz?.dnaSummary,
              deptDna: dept?.dnaSummary
            })
          });
          if (calResponse.ok) {
            const calData = await calResponse.json();
            setCaseStudies(calData.caseStudies);
            setIsCalibrating(true);
            setCalibrationCaseIndex(0);
            setCurrentRankings([]);
            setCurrentExplanation("");
            setCalibrationPreferences([]);
          }
        } catch (calErr) {
          console.error("Calibration generation failed", calErr);
        }

      } else {
        throw new Error("Failed to analyze JD");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("נכשל ניתוח ה-JD. נסו שוב או הזינו ידנית.", "error");
    } finally {
      setIsAnalyzingJD(false);
    }
  };

  const renderCalibrationUI = () => {
    if (!isCalibrating || caseStudies.length === 0) return null;

    const currentCase = caseStudies[calibrationCaseIndex];
    if (!currentCase) return null;

    const handleNextCase = () => {
      if (currentRankings.length < 3) {
        triggerToast("אנא דרגו את כל המועמדים לפני המעבר לשלב הבא", "error");
        return;
      }

      const pref: CaseStudyPreference = {
        caseStudyId: currentCase.id,
        ranking: currentRankings,
        explanation: currentExplanation
      };

      const updatedPrefs = [...calibrationPreferences, pref];
      setCalibrationPreferences(updatedPrefs);

      if (calibrationCaseIndex < caseStudies.length - 1) {
        setCalibrationCaseIndex(calibrationCaseIndex + 1);
        setCurrentRankings([]);
        setCurrentExplanation("");
      } else {
        // Calibration finished
        setIsCalibrating(false);
        triggerToast("שלב הכיול הושלם בהצלחה! ה-AI למד את ההעדפות שלך.", "success");
      }
    };

    const toggleRanking = (candId: string) => {
      if (currentRankings.includes(candId)) {
        setCurrentRankings(currentRankings.filter(id => id !== candId));
      } else {
        setCurrentRankings([...currentRankings, candId]);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-8 bg-neutral-pink-500 text-white shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                <h2 className="text-2xl font-bold italic tracking-tight">כיול העדפות גיוס (Calibration)</h2>
              </div>
              <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full border border-white/30">
                קייס {calibrationCaseIndex + 1} מתוך {caseStudies.length}
              </span>
            </div>
            <p className="text-sm opacity-90 leading-relaxed max-w-2xl">
              כדי שה-AI יבין בדיוק את ה"טעם" שלך, אנא דרג את המועמדים הפיקטיביים הבאים והסבר מדוע בחרת כך.
            </p>
          </div>

          <div className="p-8 overflow-y-auto flex-grow custom-scrollbar space-y-8">
            <div className="bg-neutral-pink-50 p-6 rounded-3xl border border-neutral-pink-100 italic text-sm text-neutral-pink-800 leading-relaxed shadow-inner">
              <span className="font-bold block mb-2 text-xs uppercase tracking-widest text-neutral-pink-400">התרחיש (Scenario):</span>
              "{currentCase.scenarioDescription}"
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentCase.candidates.map((cand) => {
                const rankIndex = currentRankings.indexOf(cand.id);
                const isSelected = rankIndex !== -1;
                
                return (
                  <div 
                    key={cand.id}
                    onClick={() => toggleRanking(cand.id)}
                    className={`relative p-5 rounded-[32px] border-2 cursor-pointer transition-all duration-300 flex flex-col gap-4 group ${
                      isSelected 
                        ? "border-neutral-pink-500 bg-neutral-pink-50/50 shadow-lg" 
                        : "border-gray-100 hover:border-neutral-pink-200 bg-white hover:shadow-md"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute -top-3 -right-3 w-10 h-10 bg-neutral-pink-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md border-4 border-white animate-bounce-subtle">
                        {rankIndex + 1}
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover:text-neutral-pink-600 transition-colors">{cand.name}</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">פרופיל מועמד/ת פיקטיבי</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter block mb-1">כישורים:</span>
                        <div className="flex flex-wrap gap-1">
                          {cand.keySkills.map(s => (
                            <span key={s} className="text-[9px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-medium">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter block mb-1">תכונות בולטות:</span>
                        <div className="flex flex-wrap gap-1">
                          {cand.personalityTraits.map(t => (
                            <span key={t} className="text-[9px] px-2 py-0.5 bg-neutral-pink-100 text-neutral-pink-700 rounded-md font-medium">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-600 leading-relaxed italic border-r-2 border-neutral-pink-100 pr-3 py-1">
                      {cand.profileSummary}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-pink-500" />
                למה בחרת בדירוג הזה? (הסבר חופשי ל-AI)
              </label>
              <textarea 
                rows={3}
                placeholder="למשל: בחרתי את רותי במקום הראשון כי למרות שהיא ג'וניורית, היא מגיעה עם רקע מחברות Big 4 וזה חשוב לנו לתרבות הדיוק..."
                value={currentExplanation}
                onChange={(e) => setCurrentExplanation(e.target.value)}
                className="w-full px-6 py-4 rounded-[28px] border border-neutral-pink-200 focus:border-neutral-pink-500 focus:ring-4 focus:ring-neutral-pink-100 outline-none transition text-sm leading-relaxed"
              />
            </div>
          </div>

          <div className="p-8 bg-gray-50 border-t border-gray-100 shrink-0 flex items-center justify-between">
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <Info className="w-4 h-4" />
              הדירוג שלך ישפיע ישירות על ציון ה"suitability" של מועמדים אמיתיים בהמשך.
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setIsCalibrating(false);
                  triggerToast("דילגת על שלב הכיול. ניתן לכייל את המערכת בכל עת כדי לשפר את הדיוק.", "info");
                }}
                className="px-6 py-3 border border-gray-200 text-gray-500 rounded-full font-bold hover:bg-gray-100 transition text-sm"
              >
                דלג על הכיול
              </button>
              <button 
                onClick={handleNextCase}
                className="px-8 py-3 bg-neutral-pink-500 text-white rounded-full font-bold shadow-lg hover:bg-neutral-pink-600 transition flex items-center gap-2 text-sm"
              >
                <span>{calibrationCaseIndex < caseStudies.length - 1 ? "לקייס הבא" : "סיים כיול ושמור"}</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobTitle.trim()) {
      triggerToast("אנא מלאו שם משרה", "error");
      return;
    }

    if (activeBusinessId === "all-businesses" && !selectedBusinessIdForNewJob) {
      triggerToast("אנא בחרו עסק לשיוך המשרה", "error");
      return;
    }

    const finalBusinessId = activeBusinessId === "all-businesses" ? selectedBusinessIdForNewJob : (activeBusinessId || undefined);
    const resolvedBiz = businesses.find(b => b.id === finalBusinessId);

    const dept = departments.find(d => d.id === selectedDeptId);
    const team = teams.find(t => t.id === selectedTeamId);

    if (editingJob) {
      const updated = jobs.map(j => j.id === editingJob.id ? {
        ...j,
        title: jobTitle,
        location: jobLocation || resolvedBiz?.location || "לא צוין",
        description: jobDescription,
        requirements: jobRequirements,
        departmentId: selectedDeptId || undefined,
        teamId: selectedTeamId || undefined,
        departmentName: dept ? dept.name : (selectedDeptId ? "כללי" : undefined),
        teamName: team ? team.name : undefined,
        rankedRequirements: extractedRankedRequirements,
        calibrationPreferences: calibrationPreferences,
      } : j);
      saveJobs(updated);
      setEditingJob(null);
      triggerToast("המשרה עודכנה בהצלחה", "success");
    } else {
      const newJob: Job = {
        id: "job-" + Date.now(),
        businessId: finalBusinessId,
        departmentId: selectedDeptId || undefined,
        teamId: selectedTeamId || undefined,
        departmentName: dept ? dept.name : (selectedDeptId ? "כללי" : undefined),
        teamName: team ? team.name : undefined,
        title: jobTitle,
        location: jobLocation || resolvedBiz?.location || "לא צוין",
        description: jobDescription,
        requirements: jobRequirements,
        rankedRequirements: extractedRankedRequirements,
        calibrationPreferences: calibrationPreferences,
        createdAt: new Date().toISOString()
      };

      const updatedJobs = [newJob, ...jobs];
      saveJobs(updatedJobs);
      setSelectedJob(newJob);
      triggerToast("המשרה החדשה הוקמה בהצלחה!", "success");
    }
    
    // Clear Form
    setJobTitle("");
    setJobLocation("");
    setJobDescription("");
    setJobRequirements("");
    setJobJDText("");
    setSelectedDeptId("");
    setSelectedTeamId("");
    setSelectedBusinessIdForNewJob("");
    setExtractedRankedRequirements([]);
    setCalibrationPreferences([]);
    setCaseStudies([]);

    // Auto redirect to Existing Jobs to screen
    setCurrentTab("existing-jobs");
  };

  // Drag and Drop helpers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setCvFiles(prev => [...prev, ...droppedFiles]);
      setCvText(""); // prioritize the files
      triggerToast(`${droppedFiles.length} קבצים נטענו בהצלחה`, "info");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setCvFiles(prev => [...prev, ...selectedFiles]);
      setCvText(""); // prioritize the files
      triggerToast(`${selectedFiles.length} קבצים נטענו בהצלחה`, "info");
    }
  };

  // Screen/Analyze CV trigger
  const handleScreenCV = async () => {
    if (!selectedJob) {
      triggerToast("אנא בחר משרה מתוך הרשימה תחילה", "error");
      return;
    }

    if (cvFiles.length === 0 && !cvText.trim()) {
      triggerToast("אנא הקלד קורות חיים או העלה קבצים לסינון", "error");
      return;
    }

    setIsScreening(true);
    setScreeningProgress({ current: 0, total: cvFiles.length || 1 });
    setError("");

    try {
      const dept = departments.find(d => d.id === selectedJob.departmentId);
      const team = teams.find(t => t.id === selectedJob.teamId);
      const commonPayload: any = {
        jobTitle: selectedJob.title,
        jobRequirements: selectedJob.requirements,
        jobDescription: selectedJob.description,
        rankedRequirements: selectedJob.rankedRequirements,
        businessName: activeBusiness?.name,
        businessDna: activeBusiness?.dnaSummary,
        departmentName: dept?.name,
        departmentDna: dept?.dnaSummary,
        teamName: team?.name,
        teamDna: team?.dnaSummary
      };

      const processSingleCandidate = async (text: string, currentFile: File | null) => {
        const payload = { ...commonPayload };
        if (currentFile) {
          const base64String = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result as string;
              resolve(res.split(",")[1]);
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(currentFile);
          });
          payload.pdfBase64 = base64String;
          payload.pdfMimeType = currentFile.type;
        } else {
          payload.cvText = text;
        }

        const response = await fetch("/api/screen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errJson = await response.json();
          throw new Error(errJson.error || "נכשלה תקשורת הניתוח מול השרת");
        }

        const result = await response.json();
        
        let initialStatus: CandidateStatus = "new";
        let initialLogs: ActivityLogEntry[] = [];

        const isLowScore = result.suitabilityScore < autoRejectMinScore;
        const isUnsuitableCat = autoRejectUnsuitable && result.suitabilityCategory === "unsuitable";

        if (autoRejectEnabled && (isLowScore || isUnsuitableCat)) {
          initialStatus = "rejected";
          initialLogs.push({
            id: "log-auto-" + Date.now() + Math.random().toString(36).substr(2, 3),
            timestamp: new Date().toISOString(),
            action: "דחייה אוטומטית חכמה 🚫",
            note: `המועמד/ת הועבר/ה אוטומטית לסטטוס דחוי לפי הגדרות סינון ה-HR במערכת.\n\nקריטריונים שהופעלו:\n${
              isLowScore ? `- ציון התאמה (${result.suitabilityScore}/100) נמוך מסף המינימום (${autoRejectMinScore})\n` : ""
            }${
              isUnsuitableCat ? "- קטגוריית ההתאמה המערכתית נקבעה כ'לא מתאים'\n" : ""
            }`
          });
        }

        const newCandidate: Candidate = {
          ...result,
          id: "cand-" + Date.now() + Math.random().toString(36).substr(2, 5),
          jobId: selectedJob.id,
          status: initialStatus,
          appliedAt: new Date().toISOString(),
          fileName: currentFile ? currentFile.name : "הזנה מילולית ידנית",
          cvText: text || undefined,
          pdfBase64: currentFile ? payload.pdfBase64 : undefined,
          pdfMimeType: currentFile ? payload.pdfMimeType : undefined,
          activityLog: initialLogs
        };

        return newCandidate;
      };

      let newCandidates: Candidate[] = [];

      if (cvFiles.length > 0) {
        for (let i = 0; i < cvFiles.length; i++) {
          setScreeningProgress({ current: i + 1, total: cvFiles.length });
          const cand = await processSingleCandidate("", cvFiles[i]);
          newCandidates.push(cand);
        }
      } else {
        const cand = await processSingleCandidate(cvText, null);
        newCandidates.push(cand);
      }

      const updatedCandidates = [...newCandidates, ...candidates];
      saveCandidates(updatedCandidates);
      
      if (newCandidates.length === 1) {
        setEvaluationResult(newCandidates[0]);
      }

      triggerToast(`סריקת ${newCandidates.length} מועמדים הושלמה בהצלחה!`, "success");
      
      // Reset
      setCvFiles([]);
      setCvText("");
      setFilterJobId(selectedJob.id);
      setCurrentTab("candidates-status");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "שגיאה בגישה לניתוח ה-AI. ודא שמפתח ה-API תקין בהגדרות.");
      triggerToast("ניתוח קורות החיים נכשל", "error");
    } finally {
      setIsScreening(false);
      setScreeningProgress({ current: 0, total: 0 });
    }
  };

  // Change Candidate Status
  const handleUpdateCandidateStatus = (candidateId: string, newStatus: CandidateStatus) => {
    const updated = candidates.map(c => {
      if (c.id === candidateId) {
        return { ...c, status: newStatus };
      }
      return c;
    });
    saveCandidates(updated);
    
    // Sync active popup
    if (selectedCandidate && selectedCandidate.id === candidateId) {
      setSelectedCandidate({ ...selectedCandidate, status: newStatus });
    }

    triggerToast("סטטוס המועמד עודכן בהצלחה", "info");
  };

  // Delete Candidate
  const handleDeleteCandidate = (candidateId: string) => {
    const updated = candidates.filter(c => c.id !== candidateId);
    saveCandidates(updated);
    setSelectedCandidate(null);
    setCompareCandidateIds(prev => prev.filter(id => id !== candidateId));
    triggerToast("המועמד נמחק בהצלחה", "info");
    setDeleteConfirmId(null);
  };

  const handleUpdateRecruiterFeedback = (candidateId: string, rating: number | undefined, notes: string) => {
    const updated = candidates.map(c => {
      if (c.id === candidateId) {
        return { ...c, recruiterRating: rating, internalNotes: notes };
      }
      return c;
    });
    saveCandidates(updated);
    
    // Sync active popup
    if (selectedCandidate && selectedCandidate.id === candidateId) {
      setSelectedCandidate({ ...selectedCandidate, recruiterRating: rating, internalNotes: notes });
    }
    
    triggerToast("הערות הדירוג והמשוב הפנימי נשמרו בהצלחה", "success");
  };

  const handleAddActivityLog = () => {
    if (!selectedCandidate || !newLogAction.trim()) return;

    const newEntry: ActivityLogEntry = {
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      action: newLogAction,
      note: newLogNote,
      reminderDate: newLogReminderDate || undefined,
      isCompleted: newLogReminderDate ? false : undefined,
      strengths: (newLogAction.includes("ראיון") || newLogAction.includes("משימת בית")) ? newLogStrengths : undefined,
      weaknesses: (newLogAction.includes("ראיון") || newLogAction.includes("משימת בית")) ? newLogWeaknesses : undefined
    };

    const updatedCandidates = candidates.map(c => {
      if (c.id === selectedCandidate.id) {
        return {
          ...c,
          activityLog: [newEntry, ...(c.activityLog || [])]
        };
      }
      return c;
    });

    saveCandidates(updatedCandidates);
    setSelectedCandidate({
      ...selectedCandidate,
      activityLog: [newEntry, ...(selectedCandidate.activityLog || [])]
    });
    setNewLogAction("");
    setNewLogNote("");
    setNewLogReminderDate("");
    setNewLogStrengths("");
    setNewLogWeaknesses("");
    setNewLogWeaknesses("");
    triggerToast("הפעולה תועדה בהצלחה", "success");
  };

  const handleSendQuickEmail = () => {
    if (!selectedCandidate) return;
    if (!selectedCandidate.email) {
      triggerToast("לא הוזן אימייל עבור המועמד/ת", "error");
      return;
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      triggerToast("יש למלא את נושא ותוכן האימייל", "error");
      return;
    }

    const mailLogId = "email-log-" + Date.now();
    const mailtoUrl = `mailto:${selectedCandidate.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Add activity log entry as draft/pending
    const actionLabel = emailTemplateType === "interview" ? "הוכנה טיוטה: זימון לראיון" : "הוכנה טיוטה: מכתב דחייה";
    const newEntry: ActivityLogEntry = {
      id: mailLogId,
      timestamp: new Date().toISOString(),
      action: actionLabel,
      note: `נושא: ${emailSubject}\n\nתוכן המייל:\n${emailBody}`
    };

    const updatedCandidates = candidates.map(c => {
      if (c.id === selectedCandidate.id) {
        return {
          ...c,
          activityLog: [newEntry, ...(c.activityLog || [])]
        };
      }
      return c;
    });

    saveCandidates(updatedCandidates);
    setSelectedCandidate({
      ...selectedCandidate,
      activityLog: [newEntry, ...(selectedCandidate.activityLog || [])]
    });

    setLastCreatedLogId(mailLogId);
    setShowEmailConfirmation(true);

    // Trigger local mail app
    window.location.href = mailtoUrl;

    triggerToast("טיוטת המייל הוכנה ונפתחה בתוכנת הדואר שלך!", "success");
  };

  const handleConfirmEmailSent = (actuallySent: boolean) => {
    if (!selectedCandidate || !lastCreatedLogId) return;

    const updatedCandidates = candidates.map(c => {
      if (c.id === selectedCandidate.id) {
        const updatedLogs = (c.activityLog || []).map(log => {
          if (log.id === lastCreatedLogId) {
            let nextAction = log.action;
            if (actuallySent) {
              nextAction = log.action.replace("הוכנה טיוטה: ", "נשלח: ");
            } else {
              nextAction = log.action.replace("הוכנה טיוטה: ", "נשמר כטיוטה: ");
            }
            return { ...log, action: nextAction };
          }
          return log;
        });
        return { ...c, activityLog: updatedLogs };
      }
      return c;
    });

    saveCandidates(updatedCandidates);
    
    // Also update selected candidate view
    const updatedLogs = (selectedCandidate.activityLog || []).map(log => {
      if (log.id === lastCreatedLogId) {
        let nextAction = log.action;
        if (actuallySent) {
          nextAction = log.action.replace("הוכנה טיוטה: ", "נשלח: ");
        } else {
          nextAction = log.action.replace("הוכנה טיוטה: ", "נשמר כטיוטה: ");
        }
        return { ...log, action: nextAction };
      }
      return log;
    });
    
    setSelectedCandidate({
      ...selectedCandidate,
      activityLog: updatedLogs
    });

    setShowEmailConfirmation(false);
    setLastCreatedLogId(null);
    
    if (actuallySent) {
      triggerToast("הסטטוס עודכן: המייל נשלח בהצלחה! ✅", "success");
    } else {
      triggerToast("הסטטוס נשמר כטיוטה בלבד ⏳", "info");
    }
  };

  const handleCancelEmailLog = () => {
    if (!selectedCandidate || !lastCreatedLogId) return;

    const updatedCandidates = candidates.map(c => {
      if (c.id === selectedCandidate.id) {
        const updatedLogs = (c.activityLog || []).filter(log => log.id !== lastCreatedLogId);
        return { ...c, activityLog: updatedLogs };
      }
      return c;
    });

    saveCandidates(updatedCandidates);
    
    // Also update selected candidate view
    const updatedLogs = (selectedCandidate.activityLog || []).filter(log => log.id !== lastCreatedLogId);
    
    setSelectedCandidate({
      ...selectedCandidate,
      activityLog: updatedLogs
    });

    setShowEmailConfirmation(false);
    setLastCreatedLogId(null);
    triggerToast("רישום הפעולה בוטל ונמחק מההיסטוריה 🗑️", "info");
  };

  const handleRunAutoRejection = (jobIdFilter: string = "all") => {
    let count = 0;
    const updatedCandidates = candidates.map(c => {
      // Only process candidates in relevant jobId, and only those not already hired or rejected
      const matchesJob = jobIdFilter === "all" || c.jobId === jobIdFilter;
      const canBeRejected = c.status !== "rejected" && c.status !== "hired";
      
      const isLowScore = c.suitabilityScore < autoRejectMinScore;
      const isUnsuitableCat = autoRejectUnsuitable && c.suitabilityCategory === "unsuitable";

      if (matchesJob && canBeRejected && (isLowScore || isUnsuitableCat)) {
        count++;
        const newEntry: ActivityLogEntry = {
          id: "log-bulk-auto-" + Date.now() + Math.random().toString(36).substr(2, 3),
          timestamp: new Date().toISOString(),
          action: "דחייה אוטומטית חכמה 🚫",
          note: `המועמד/ת הועבר/ה אוטומטית לסטטוס דחוי לפי הגדרות סינון ה-HR במערכת.\n\nקריטריונים שהופעלו:\n${
            isLowScore ? `- ציון התאמה (${c.suitabilityScore}/100) נמוך מסף המינימום (${autoRejectMinScore})\n` : ""
          }${
            isUnsuitableCat ? "- קטגוריית ההתאמה המערכתית נקבעה כ'לא מתאים'\n" : ""
          }`
        };

        return {
          ...c,
          status: "rejected" as CandidateStatus,
          activityLog: [newEntry, ...(c.activityLog || [])]
        };
      }
      return c;
    });

    if (count > 0) {
      saveCandidates(updatedCandidates);
      
      // Update selectedCandidate if it was modified
      if (selectedCandidate) {
        const updatedSelected = updatedCandidates.find(c => c.id === selectedCandidate.id);
        if (updatedSelected) {
          setSelectedCandidate(updatedSelected);
        }
      }

      triggerToast(`בוצע סינון! ${count} מועמדים הועברו לסטטוס 'נדחה'`, "success");
    } else {
      triggerToast("לא נמצאו מועמדים נוספים העונים על קריטריוני הדחייה", "info");
    }
  };

  const handleOpenAddTask = (date?: Date) => {
    setTaskModalEditingLogId(null);
    
    let defaultJobId = "";
    let defaultCandidateId = "";
    
    if (selectedCandidate) {
      defaultJobId = selectedCandidate.jobId;
      defaultCandidateId = selectedCandidate.id;
    } else if (filterJobId && filterJobId !== "all") {
      defaultJobId = filterJobId;
      const matchingCands = candidates.filter(c => c.jobId === filterJobId);
      if (matchingCands.length > 0) {
        defaultCandidateId = matchingCands[0].id;
      }
    } else if (jobs.length > 0) {
      defaultJobId = jobs[0].id;
      const matchingCands = candidates.filter(c => c.jobId === jobs[0].id);
      if (matchingCands.length > 0) {
        defaultCandidateId = matchingCands[0].id;
      }
    }

    setTaskModalJobId(defaultJobId);
    setTaskModalCandidateId(defaultCandidateId);
    setTaskModalAction("ראיון טלפוני");
    setTaskModalNote("");
    
    let dateStr = "";
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}T09:00`;
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    setTaskModalReminderDate(dateStr);
    setTaskModalIsCompleted(false);
    setTaskModalStrengths("");
    setTaskModalWeaknesses("");
    setTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: any) => {
    setTaskModalEditingLogId(task.id);
    setTaskModalCandidateId(task.candidateId);
    
    const cand = candidates.find(c => c.id === task.candidateId);
    if (cand) {
      setTaskModalJobId(cand.jobId);
    } else {
      setTaskModalJobId("");
    }
    
    setTaskModalAction(task.action);
    setTaskModalNote(task.note || "");
    setTaskModalReminderDate(task.reminderDate || "");
    setTaskModalIsCompleted(!!task.isCompleted);
    setTaskModalStrengths(task.strengths || "");
    setTaskModalWeaknesses(task.weaknesses || "");
    setTaskModalOpen(true);
  };

  const handleSaveTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!taskModalCandidateId) {
      triggerToast("נא לבחור מועמד עבור המשימה", "error");
      return;
    }
    if (!taskModalAction.trim()) {
      triggerToast("נא להזין כותרת למשימה", "error");
      return;
    }
    if (!taskModalReminderDate) {
      triggerToast("נא לבחור תאריך ושעה למשימה", "error");
      return;
    }

    const updatedCandidates = candidates.map(cand => {
      if (taskModalEditingLogId) {
        const hasLog = (cand.activityLog || []).some(log => log.id === taskModalEditingLogId);
        if (hasLog) {
          if (cand.id !== taskModalCandidateId) {
            return {
              ...cand,
              activityLog: (cand.activityLog || []).filter(log => log.id !== taskModalEditingLogId)
            };
          } else {
            return {
              ...cand,
              activityLog: (cand.activityLog || []).map(log => {
                if (log.id === taskModalEditingLogId) {
                  return {
                    ...log,
                    action: taskModalAction,
                    note: taskModalNote || undefined,
                    reminderDate: taskModalReminderDate,
                    isCompleted: taskModalIsCompleted,
                    strengths: (taskModalAction.includes("ראיון") || taskModalAction.includes("משימת בית")) ? taskModalStrengths : undefined,
                    weaknesses: (taskModalAction.includes("ראיון") || taskModalAction.includes("משימת בית")) ? taskModalWeaknesses : undefined
                  };
                }
                return log;
              })
            };
          }
        }
      }

      if (cand.id === taskModalCandidateId) {
        if (taskModalEditingLogId) {
          const newEntry: ActivityLogEntry = {
            id: taskModalEditingLogId,
            timestamp: new Date().toISOString(),
            action: taskModalAction,
            note: taskModalNote || undefined,
            reminderDate: taskModalReminderDate,
            isCompleted: taskModalIsCompleted,
            strengths: (taskModalAction.includes("ראיון") || taskModalAction.includes("משימת בית")) ? taskModalStrengths : undefined,
            weaknesses: (taskModalAction.includes("ראיון") || taskModalAction.includes("משימת בית")) ? taskModalWeaknesses : undefined
          };
          return {
            ...cand,
            activityLog: [newEntry, ...(cand.activityLog || [])]
          };
        } else {
          const newEntry: ActivityLogEntry = {
            id: "log-" + Date.now(),
            timestamp: new Date().toISOString(),
            action: taskModalAction,
            note: taskModalNote || undefined,
            reminderDate: taskModalReminderDate,
            isCompleted: taskModalIsCompleted,
            strengths: (taskModalAction.includes("ראיון") || taskModalAction.includes("משימת בית")) ? taskModalStrengths : undefined,
            weaknesses: (taskModalAction.includes("ראיון") || taskModalAction.includes("משימת בית")) ? taskModalWeaknesses : undefined
          };
          return {
            ...cand,
            activityLog: [newEntry, ...(cand.activityLog || [])]
          };
        }
      }

      return cand;
    });

    saveCandidates(updatedCandidates);
    if (selectedCandidate) {
      const updatedSelectedCand = updatedCandidates.find(c => c.id === selectedCandidate.id);
      if (updatedSelectedCand) {
        setSelectedCandidate(updatedSelectedCand);
      }
    }
    setTaskModalOpen(false);
    triggerToast(taskModalEditingLogId ? "המשימה עודכנה בהצלחה" : "המשימה נוספה ליומן בהצלחה", "success");
  };

  const handleDeleteTask = (logId: string) => {
    const updatedCandidates = candidates.map(cand => {
      return {
        ...cand,
        activityLog: (cand.activityLog || []).filter(log => log.id !== logId)
      };
    });
    saveCandidates(updatedCandidates);
    if (selectedCandidate) {
      const updatedSelectedCand = updatedCandidates.find(c => c.id === selectedCandidate.id);
      if (updatedSelectedCand) {
        setSelectedCandidate(updatedSelectedCand);
      }
    }
    setTaskModalOpen(false);
    triggerToast("המשימה נמחקה מהיומן", "info");
  };

  const renderGuideModal = () => {
    if (!showGuideModal) return null;

    const steps = [
      {
        title: "שלב 1: אפיון ה-DNA של החברה",
        icon: <Building className="w-8 h-8 text-neutral-pink-500" />,
        color: "bg-neutral-pink-50",
        description: "כדי לסנן קורות חיים בהתאמה מדויקת, עלינו להגדיר תחילה מי אתם.",
        bullets: [
          "הקימו עסק וענו על מספר שאלות קצרות המיוצרות במיוחד עבור סוג החברה שלכם.",
          "ה-AI ינתח ויזקק את 'חתימת ה-DNA' הארגונית והתרבותית שלכם.",
          "תוכלו להוסיף מחלקות וצוותים ספציפיים (לדוגמה: מחלקת פיתוח, צוות Frontend) כדי לאפיין את ה-DNA הפנימי המדויק ביותר שלהם."
        ]
      },
      {
        title: "שלב 2: הקמת משרה ודרישות",
        icon: <Plus className="w-8 h-8 text-neutral-pink-500" />,
        color: "bg-neutral-pink-50",
        description: "מגדירים את מאפייני המשרה ותחומי העניין בצורה נוחה.",
        bullets: [
          "תוכלו להדביק תיאור משרה מלא (Job Description) ישירות בטקסט חופשי.",
          "מנגנון ה-AI החכם יפרק את התיאור אוטומטית לקריטריונים ברורים ומדורגים.",
          "הדרישות יחולקו לקטגוריות כגון: ניסיון מקצועי, השכלה, כלים טכנולוגיים ותכונות אופי המשתלבות עם ה-DNA הכללי."
        ]
      },
      {
        title: "שלב 3: העלאת קורות חיים ודירוג AI",
        icon: <UploadCloud className="w-8 h-8 text-neutral-pink-500" />,
        color: "bg-neutral-pink-50",
        description: "מכניסים את קורות החיים למסננת ומקבלים תובנות עומק מיידיות.",
        bullets: [
          "גררו קבצי קורות חיים (PDF / DOCX) או הדביקו אותם כטקסט חופשי.",
          "ה-AI יבצע השוואה רב-ממדית בין המועמד לבין ה-DNA של החברה, המחלקה והמשרה.",
          "לכל מועמד ייקבע ציון התאמה משוקלל עם הסבר מנומק, פירוט חוזקות, חולשות, ואפילו התאמה תרבותית ספציפית לצוות."
        ]
      },
      {
        title: "שלב 4: השוואה מתקדמת ולוח משימות",
        icon: <LayoutGrid className="w-8 h-8 text-neutral-pink-500" />,
        color: "bg-neutral-pink-50",
        description: "מעדכנים סטטוסים, משווים זה לצד זה ומקדמים את המועמדים.",
        bullets: [
          "סמנו מועמדים ברשימה כדי לפתוח את תפריט ההשוואה המהיר ולהשוות ביניהם ראש-בראש.",
          "הוסיפו ועירכו משימות, ראיונות או תזכורות ישירות מתוך לוח המשימות (ביומן או באג'נדה) ע\"י לחיצה על יום בלוח או על משימה קיימת. בטופס המשימה ניתן לבחור משרה בראש הטופס כדי להציג רק מועמדים הרלוונטיים לאותה משרה.",
          "תעדו שיחות, עדכנו סטטוסים ועקבו אחר תהליך הגיוס בתיק המועמד הדינמי.",
          "השאירו 'דירוג כוכבים' אישי והערות פנימיות חסויות לצוות בכרטיס המועמד, המאפשרים הערכה אנושית שאינה מבוססת AI ואינה חשופה למועמד."
        ]
      }
    ];

    const currentStepData = steps[guideStep];

    return (
      <div className="fixed inset-0 bg-neutral-pink-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-right">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white p-6 sm:p-8 rounded-[2rem] border border-neutral-pink-200 shadow-2xl w-full max-w-2xl relative text-right"
        >
          {/* Top Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100 flex rounded-t-[2rem] overflow-hidden">
            {steps.map((_, idx) => (
              <div 
                key={idx}
                className={`h-full transition-all duration-300 ${idx <= guideStep ? "bg-neutral-pink-500" : "bg-gray-100"}`}
                style={{ width: `${100 / steps.length}%` }}
              />
            ))}
          </div>

          <div className="flex items-start justify-between mb-6 pt-2">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${currentStepData.color} flex items-center justify-center shadow-inner`}>
                {currentStepData.icon}
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-pink-500 block">צעד {guideStep + 1} מתוך {steps.length}</span>
                <h3 className="text-xl font-bold text-gray-900">
                  {currentStepData.title}
                </h3>
              </div>
            </div>
            <button 
              onClick={() => {
                setShowGuideModal(false);
              }}
              className="w-8 h-8 rounded-full hover:bg-neutral-pink-50 flex items-center justify-center text-gray-400 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 mb-8">
            <p className="text-sm font-bold text-gray-700 leading-relaxed bg-neutral-pink-50/40 p-3.5 rounded-2xl border border-neutral-pink-100/40">
              {currentStepData.description}
            </p>

            <ul className="space-y-3">
              {currentStepData.bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-600 leading-relaxed">
                  <div className="w-5 h-5 rounded-full bg-neutral-pink-100 text-neutral-pink-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-pink-100 pt-5">
            <button
              onClick={() => {
                setShowGuideModal(false);
                try {
                  localStorage.setItem("masenat_guide_dismissed", "true");
                } catch (e) {}
                triggerToast("המדריך הוסתר. תוכלו לפתוח אותו שוב בכל עת בלחיצה על 'מדריך הפעלה' בראש המסך.", "info");
              }}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600 px-3 py-2 rounded-full hover:bg-gray-50 transition"
            >
              אל תציג שוב
            </button>

            <div className="flex gap-2">
              {guideStep > 0 && (
                <button
                  onClick={() => setGuideStep(prev => prev - 1)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 rounded-full hover:bg-gray-100 transition"
                >
                  הקודם
                </button>
              )}
              {guideStep < steps.length - 1 ? (
                <button
                  onClick={() => setGuideStep(prev => prev + 1)}
                  className="bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-sm transition"
                >
                  הבא
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowGuideModal(false);
                    try {
                      localStorage.setItem("masenat_guide_dismissed", "true");
                    } catch (e) {}
                    triggerToast("שתהיה עבודה פוריה וגיוס מוצלח! 🎉", "success");
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-sm transition"
                >
                  הבנתי, סיימנו! 🚀
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderSummaryModal = () => {
    if (!viewingSummaryEntity || !summaryType) return null;

    const getTitle = () => {
      switch (summaryType) {
        case "business": return `פרופיל DNA - עסק: ${viewingSummaryEntity.name}`;
        case "department": return `פרופיל DNA - מחלקה: ${viewingSummaryEntity.name}`;
        case "team": return `פרופיל DNA - צוות: ${viewingSummaryEntity.name}`;
        case "job": return `הגדרות משרה: ${viewingSummaryEntity.title}`;
        default: return "סיכום הגדרות";
      }
    };

    const questions = viewingSummaryEntity.questions || [];
    const answers = viewingSummaryEntity.answers || {};

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        >
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-neutral-pink-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-pink-100 flex items-center justify-center text-neutral-pink-600">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-gray-900">{getTitle()}</h3>
            </div>
            <button 
              onClick={() => { setViewingSummaryEntity(null); setSummaryType(null); }}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-grow overflow-auto p-6 space-y-6 custom-scrollbar">
            {/* DNA Summary Section */}
            {viewingSummaryEntity.dnaSummary && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-pink-600 flex items-center gap-2 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  סיכום DNA מאופיין (AI):
                </h4>
                <div className="p-4 bg-neutral-pink-50/40 rounded-2xl border border-neutral-pink-100 text-sm text-gray-700 leading-relaxed italic">
                  {viewingSummaryEntity.dnaSummary}
                </div>
              </div>
            )}

            {/* Questions & Answers Section */}
            {questions.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                  <Info className="w-4 h-4" />
                  תשובות לשאלון האפיון:
                </h4>
                <div className="space-y-4">
                  {questions.map((q: any) => (
                    <div key={q.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-2">
                      <p className="text-xs font-bold text-gray-800">{q.question}</p>
                      <div className="flex flex-col gap-1.5">
                        {answers[`${q.id}_select`] && (
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(answers[`${q.id}_select`]) ? (
                              answers[`${q.id}_select`].map((opt: string) => (
                                <span key={opt} className="px-2 py-0.5 bg-white border border-neutral-pink-200 text-neutral-pink-600 rounded-full text-[10px] font-bold">
                                  {opt}
                                </span>
                              ))
                            ) : (
                              <span className="px-2 py-0.5 bg-white border border-neutral-pink-200 text-neutral-pink-600 rounded-full text-[10px] font-bold">
                                {answers[`${q.id}_select`]}
                              </span>
                            )}
                          </div>
                        )}
                        {answers[q.id] && (
                          <p className="text-[11px] text-gray-600 leading-normal">{answers[q.id]}</p>
                        )}
                        {!answers[q.id] && !answers[`${q.id}_select`] && (
                          <p className="text-[11px] text-gray-300 italic">לא הוזנה תשובה</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : summaryType === "job" && viewingSummaryEntity.rankedRequirements ? (
               <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                    <History className="w-4 h-4" />
                    דרישות משרה מדורגות:
                  </h4>
                  <div className="space-y-2">
                    {viewingSummaryEntity.rankedRequirements.map((req: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                        <span className="text-xs text-gray-700">{req.requirement}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          req.weight >= 8 ? 'bg-rose-50 text-rose-600' : 
                          req.weight >= 5 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          משקל: {req.weight}
                        </span>
                      </div>
                    ))}
                  </div>
               </div>
            ) : (
              <p className="text-center text-gray-400 py-8 text-sm italic">לא נמצא מידע נוסף להצגה</p>
            )}
          </div>
          
          <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end">
            <button 
              onClick={() => { setViewingSummaryEntity(null); setSummaryType(null); }}
              className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-50 transition shadow-sm"
            >
              סגור חלון
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderTaskModal = () => {
    if (!taskModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300 text-right overflow-y-auto" dir="rtl">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 50 }}
          className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-3xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-neutral-pink-200/80 mb-0 sm:mb-auto"
        >
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-neutral-pink-50/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neutral-pink-100 flex items-center justify-center text-neutral-pink-600 shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-black text-gray-900">
                {taskModalEditingLogId ? "עריכת משימה" : "הוספת משימה חדשה ליומן"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setTaskModalOpen(false)}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveTask} className="flex-grow overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-5 custom-scrollbar">
            {/* Job selection (added selector as requested) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">משרה קשורה למשימה *</label>
              <select
                disabled={taskModalEditingLogId !== null}
                value={taskModalJobId}
                onChange={(e) => {
                  const newJobId = e.target.value;
                  setTaskModalJobId(newJobId);
                  const filteredCands = candidates.filter(c => c.jobId === newJobId);
                  if (filteredCands.length > 0) {
                    setTaskModalCandidateId(filteredCands[0].id);
                  } else {
                    setTaskModalCandidateId("");
                  }
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-neutral-pink-300 focus:border-neutral-pink-500 transition outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                required
              >
                <option value="" disabled>בחר משרה...</option>
                {jobs.map((j) => {
                  const biz = businesses.find(b => b.id === j.businessId);
                  const label = biz ? `${j.title} (${biz.name})` : j.title;
                  return (
                    <option key={j.id} value={j.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Candidate selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">מועמד קשור *</label>
              <select
                disabled={taskModalEditingLogId !== null}
                value={taskModalCandidateId}
                onChange={(e) => setTaskModalCandidateId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-neutral-pink-300 focus:border-neutral-pink-500 transition outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                required
              >
                <option value="" disabled>בחר מועמד...</option>
                {candidates
                  .filter((cand) => !taskModalJobId || cand.jobId === taskModalJobId)
                  .map((cand) => {
                    const job = jobs.find((j) => j.id === cand.jobId);
                    return (
                      <option key={cand.id} value={cand.id}>
                        {cand.name} ({job?.title || "משרה לא ידועה"})
                      </option>
                    );
                  })}
              </select>
              {candidates.filter((cand) => !taskModalJobId || cand.jobId === taskModalJobId).length === 0 && (
                <p className="text-[10px] text-rose-500 italic mt-1">אין מועמדים רשומים למשרה זו במערכת.</p>
              )}
            </div>

            {/* Task Action / Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">סוג המשימה / הפעולה *</label>
              <input
                type="text"
                placeholder="הזינו שם לפעולה (למשל: ראיון טלפוני)"
                value={taskModalAction}
                onChange={(e) => setTaskModalAction(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-neutral-pink-300 focus:border-neutral-pink-500 transition outline-none"
                required
              />
              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["ראיון טלפוני 📞", "ראיון זום 💻", "ראיון פרונטלי 🤝", "משימת בית 🏠", "שיחת הצעת שכר 📄"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTaskModalAction(preset.replace(/[\u1F600-\u1F64F]|[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim())}
                    className="text-[10px] bg-gray-100 hover:bg-neutral-pink-100 hover:text-neutral-pink-700 text-gray-600 px-2.5 py-1 rounded-full transition font-bold cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Date and Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">תאריך ושעה *</label>
              <input
                type="datetime-local"
                value={taskModalReminderDate}
                onChange={(e) => setTaskModalReminderDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-neutral-pink-300 focus:border-neutral-pink-500 transition outline-none"
                required
              />
            </div>

            {/* Task notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">הערות ותוכן המשימה</label>
              <textarea
                rows={3}
                placeholder="הערות או פרטים נוספים (למשל: לעבור על הניסיון ב-React, לשלוח זימון ליומן...)"
                value={taskModalNote}
                onChange={(e) => setTaskModalNote(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-neutral-pink-300 focus:border-neutral-pink-500 transition outline-none resize-none"
              />
            </div>

            {/* Is Completed (only when editing) */}
            {taskModalEditingLogId && (
              <div className="flex items-center gap-2 p-3 bg-gray-50/50 border border-gray-100 rounded-2xl">
                <input
                  type="checkbox"
                  id="task-completed-chk"
                  checked={taskModalIsCompleted}
                  onChange={(e) => setTaskModalIsCompleted(e.target.checked)}
                  className="w-4 h-4 text-neutral-pink-500 focus:ring-neutral-pink-300 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="task-completed-chk" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                  סמן משימה זו כהושלמה ✔️
                </label>
              </div>
            )}

            {/* Strengths & Weaknesses if applicable */}
            {(taskModalAction.includes("ראיון") || taskModalAction.includes("משימ")) && (
              <div className="space-y-3 p-4 bg-neutral-pink-50/20 border border-neutral-pink-100 rounded-2xl">
                <h4 className="text-[11px] font-bold text-neutral-pink-800 uppercase tracking-wider mb-2">סיכום משוב (אופציונלי):</h4>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-600 block">נקודות חוזקה שעלו:</label>
                  <input
                    type="text"
                    placeholder="למשל: הבנה ארכיטקטונית עמוקה, תקשורתי"
                    value={taskModalStrengths}
                    onChange={(e) => setTaskModalStrengths(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-neutral-pink-300 transition outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-600 block">נקודות לשיפור/חולשה:</label>
                  <input
                    type="text"
                    placeholder="למשל: פחות ניסיון בניהול צוותים גדולים"
                    value={taskModalWeaknesses}
                    onChange={(e) => setTaskModalWeaknesses(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-neutral-pink-300 transition outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-4 border-t border-gray-100 gap-3">
              {taskModalEditingLogId ? (
                <div className="flex gap-2 justify-center sm:justify-start w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const cand = candidates.find((c) => c.id === taskModalCandidateId);
                      if (cand) {
                        setSelectedCandidate(cand);
                        setCurrentTab("candidates-status");
                        setTaskModalOpen(false);
                        triggerToast(`מעבר לתיק של ${cand.name}`, "info");
                      }
                    }}
                    className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-neutral-pink-200 text-neutral-pink-600 rounded-full text-xs font-bold hover:bg-neutral-pink-50 transition shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>תיק מועמד</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(taskModalEditingLogId)}
                    className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>מחק</span>
                  </button>
                </div>
              ) : (
                <div className="hidden sm:block" />
              )}

              <div className="flex gap-2 justify-end w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="flex-1 sm:flex-initial px-4 sm:px-5 py-2 sm:py-2.5 bg-white border border-gray-200 text-gray-500 rounded-full text-xs font-bold hover:bg-gray-50 transition shadow-sm cursor-pointer text-center"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial px-5 sm:px-6 py-2 sm:py-2.5 bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer text-center"
                >
                  שמור משימה ✨
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    );
  };

  const toggleReminderStatus = (logId: string) => {
    if (!selectedCandidate) return;

    const updatedCandidates = candidates.map(c => {
      if (c.id === selectedCandidate.id) {
        const updatedLog = (c.activityLog || []).map(log => {
          if (log.id === logId) {
            return { ...log, isCompleted: !log.isCompleted };
          }
          return log;
        });
        return { ...c, activityLog: updatedLog };
      }
      return c;
    });

    saveCandidates(updatedCandidates);
    
    const updatedSelectedLog = (selectedCandidate.activityLog || []).map(log => {
      if (log.id === logId) {
        return { ...log, isCompleted: !log.isCompleted };
      }
      return log;
    });

    setSelectedCandidate({
      ...selectedCandidate,
      activityLog: updatedSelectedLog
    });
  };

  // Delete Job
  const handleDeleteJob = (jobId: string) => {
    const updatedJobs = jobs.filter(j => j.id !== jobId);
    saveJobs(updatedJobs);
    
    const updatedCands = candidates.filter(c => c.jobId !== jobId);
    saveCandidates(updatedCands);

    if (selectedJob && selectedJob.id === jobId) {
      setSelectedJob(null);
    }
    triggerToast("המשרה והמועמדים הקשורים אליה נמחקו", "info");
    setDeleteConfirmId(null);
  };

  // Delete Business
  const handleDeleteBusiness = (bizId: string) => {
    if (bizId === 'other-business') {
      triggerToast("לא ניתן למחוק את העסק הכללי", "error");
      return;
    }
    if (businesses.length <= 1) {
      triggerToast("חייב להישאר לפחות עסק אחד מוגדר במערכת", "error");
      return;
    }

    const updatedBiz = businesses.filter(b => b.id !== bizId);
    saveBusinesses(updatedBiz);

    // Find all jobs of this business
    const targetJobs = jobs.filter(j => j.businessId === bizId);
    const targetJobIds = targetJobs.map(j => j.id);

    const updatedJobs = jobs.filter(j => j.businessId !== bizId);
    saveJobs(updatedJobs);

    const updatedDepts = departments.filter(d => d.businessId !== bizId);
    saveDepartments(updatedDepts);

    const updatedTeams = teams.filter(t => t.businessId !== bizId);
    saveTeams(updatedTeams);

    const updatedCands = candidates.filter(c => !targetJobIds.includes(c.jobId));
    saveCandidates(updatedCands);

    // Set active business to another one if the deleted one was active
    if (activeBusinessId === bizId) {
      const nextBiz = updatedBiz[0];
      setActiveBusinessId(nextBiz.id);
      setSelectedJob(null);
    }

    triggerToast("העסק וכל נתוניו נמחקו בהצלחה", "info");
    setDeleteConfirmId(null);
  };

  // Delete Department
  const handleDeleteDepartment = (deptId: string) => {
    const updatedDepts = departments.filter(d => d.id !== deptId);
    saveDepartments(updatedDepts);
    
    // Cleanup teams
    const updatedTeams = teams.filter(t => t.departmentId !== deptId);
    saveTeams(updatedTeams);

    // Find jobs of this department
    const targetJobs = jobs.filter(j => j.departmentId === deptId);
    const targetJobIds = targetJobs.map(j => j.id);
    
    const updatedJobs = jobs.filter(j => j.departmentId !== deptId);
    saveJobs(updatedJobs);
    
    // Cleanup candidates of these jobs
    const updatedCands = candidates.filter(c => !targetJobIds.includes(c.jobId));
    saveCandidates(updatedCands);
    
    if (selectedDeptId === deptId) {
      setSelectedDeptId("");
    }
    
    triggerToast("המחלקה, הצוותים והמשרות תחתיה נמחקו", "info");
    setDeleteConfirmId(null);
  };

  const [targetTeamIdForOnboarding, setTargetTeamIdForOnboarding] = useState<string | null>(null);

  // Team Handlers
  const handleCreateTeam = async (deptId: string, name: string, teamId?: string) => {
    if (!name.trim()) {
      triggerToast("נא להזין שם לצוות", "error");
      return;
    }
    
    const biz = businesses.find(b => b.id === activeBusinessId);
    const dept = departments.find(d => d.id === deptId);
    if (!biz || !dept) return;

    setIsSynthesizingTeamDna(true);
    try {
      const response = await fetch("/api/generate-team-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bizName: biz.name,
          deptName: dept.name,
          teamName: name,
          deptDna: dept.dnaSummary
        })
      });

      if (!response.ok) throw new Error("נכשלה יצירת שאלות לצוות");
      
      const data = await response.json();
      setTempTeamQuestions(data.questions || []);
      setNewTeamNameForOnboarding(name);
      setTargetDeptIdForTeamOnboarding(deptId);
      setTargetTeamIdForOnboarding(teamId || null);
      setIsTeamOnboarding(true);
      triggerToast(`ה-AI מכין שאלון אפיון עבור צוות ${name}...`, "info");
    } catch (err: any) {
      console.error(err);
      triggerToast("שגיאה בהפקת שאלון צוות", "error");
    } finally {
      setIsSynthesizingTeamDna(false);
    }
  };

  const handleDeleteTeam = (teamId: string) => {
    const updatedTeams = teams.filter(t => t.id !== teamId);
    saveTeams(updatedTeams);
    
    // Update jobs to remove teamId
    const updatedJobs = jobs.map(j => {
      if (j.teamId === teamId) {
        return { ...j, teamId: undefined, teamName: undefined };
      }
      return j;
    });
    saveJobs(updatedJobs);
    
    triggerToast("הצוות נמחק בהצלחה", "info");
    setDeleteConfirmId(null);
  };

  const handleSynthesizeTeamDNA = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const biz = businesses.find(b => b.id === activeBusinessId);
    const dept = departments.find(d => d.id === targetDeptIdForTeamOnboarding);
    
    if (!biz || !dept) return;

    setIsSynthesizingTeamDna(true);
    try {
      const response = await fetch("/api/synthesize-team-dna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: biz.name,
          deptName: dept.name,
          teamName: newTeamNameForOnboarding,
          deptDna: dept.dnaSummary,
          answers: tempTeamAnswers,
          questions: tempTeamQuestions
        })
      });

      if (!response.ok) throw new Error("נכשלה סינתזת ה-DNA לצוות");
      
      const data = await response.json();
      
      if (targetTeamIdForOnboarding) {
        // Update existing
        const updated = teams.map(t => {
          if (t.id === targetTeamIdForOnboarding) return { 
            ...t, 
            name: newTeamNameForOnboarding.trim(),
            dnaSummary: data.dnaSummary 
          };
          return t;
        });
        saveTeams(updated);
        triggerToast(`ה-DNA של צוות ${newTeamNameForOnboarding} עודכן בהצלחה!`, "success");
      } else {
        // Create new
        const newTeam: Team = {
          id: "team-" + Date.now(),
          businessId: activeBusinessId,
          departmentId: targetDeptIdForTeamOnboarding,
          name: newTeamNameForOnboarding.trim(),
          dnaSummary: data.dnaSummary,
          createdAt: new Date().toISOString()
        };
        saveTeams([...teams, newTeam]);
        triggerToast(`הצוות ${newTeam.name} אופיין והוקם בהצלחה!`, "success");
      }
      
      // Reset
      setIsTeamOnboarding(false);
      setTempTeamQuestions([]);
      setTempTeamAnswers({});
      setNewTeamNameForOnboarding("");
      setTargetDeptIdForTeamOnboarding("");
      setTargetTeamIdForOnboarding(null);
      
    } catch (err: any) {
      console.error(err);
      triggerToast("שגיאה באפיון DNA לצוות", "error");
    } finally {
      setIsSynthesizingTeamDna(false);
    }
  };

  // Translate category labels in UI
  const suitabilityColors: Record<SuitabilityCategory, { bg: string, text: string, border: string, label: string }> = {
    excellent: { 
      bg: "bg-emerald-50", 
      text: "text-emerald-700", 
      border: "border-emerald-200", 
      label: "התאמה מושלמת 🌟" 
    },
    good: { 
      bg: "bg-rose-50/50", 
      text: "text-rose-700", 
      border: "border-rose-200", 
      label: "מתאים 👍" 
    },
    borderline: { 
      bg: "bg-amber-50", 
      text: "text-amber-700", 
      border: "border-amber-200", 
      label: "גבולי ⚖️" 
    },
    unsuitable: { 
      bg: "bg-gray-100", 
      text: "text-gray-600", 
      border: "border-gray-300", 
      label: "לא מתאים 🚫" 
    }
  };

  const statusMap: Record<CandidateStatus, { label: string, color: string, ring: string }> = {
    new: { label: "חדש במערכת", color: "bg-[#fbe8e8] text-pink-700", ring: "border-pink-200" },
    interview_pending: { label: "ממתין לראיון", color: "bg-blue-50 text-blue-700", ring: "border-blue-200" },
    interviewed: { label: "עבר ראיון", color: "bg-amber-50 text-amber-700", ring: "border-amber-200" },
    rejected: { label: "לא רלוונטי / נדחה", color: "bg-gray-100 text-gray-700", ring: "border-gray-200" },
    hired: { label: "התקבל / גויס", color: "bg-emerald-50 text-emerald-700", ring: "border-emerald-200" }
  };

  // Filter departments by active business
  const filteredDepts = activeBusinessId === "all-businesses" 
    ? departments 
    : departments.filter(d => d.businessId === activeBusinessId);

  // Filter jobs by active business
  const filteredJobs = activeBusinessId === "all-businesses" 
    ? jobs 
    : jobs.filter(j => j.businessId === activeBusinessId);

  // Count candidates for job card badge
  const getCandidateCountForJob = (jobId: string) => {
    return candidates.filter(c => c.jobId === jobId).length;
  };

  // Filter candidates list
  const filteredCandidates = candidates.filter(cand => {
    // Search filter
    const matchesSearch = 
      cand.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      cand.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cand.fileName && cand.fileName.toLowerCase().includes(searchTerm.toLowerCase()));

    // Get the job of this candidate to verify business
    const job = jobs.find(j => j.id === cand.jobId);
    const matchesBusiness = activeBusinessId === "all-businesses" || !job || job.businessId === activeBusinessId;

    // Job filter
    const matchesJob = filterJobId === "all" || cand.jobId === filterJobId;

    // Suitability filter
    const matchesSuitability = filterSuitability === "all" || cand.suitabilityCategory === filterSuitability;

    // Status filter
    const matchesStatus = 
      filterStatus === "all" || 
      (filterStatus === "waiting_for_treatment" 
        ? (cand.status === "new" || cand.status === "interview_pending") 
        : cand.status === filterStatus);

    // Skill specific filter
    const matchesSkillSearch = !skillSearch || cand.skills.some(s => s.toLowerCase().includes(skillSearch.toLowerCase()));

    return matchesSearch && matchesBusiness && matchesJob && matchesSuitability && matchesStatus && matchesSkillSearch;
  });

  const baseBusinessCandidates = candidates.filter(cand => {
    const job = jobs.find(j => j.id === cand.jobId);
    const matchesBusiness = activeBusinessId === "all-businesses" || !job || job.businessId === activeBusinessId;
    const matchesJob = filterJobId === "all" || cand.jobId === filterJobId;
    return matchesBusiness && matchesJob;
  });

  const kpiNewCount = baseBusinessCandidates.filter(c => c.status === "new").length;
  const kpiInterviewPendingCount = baseBusinessCandidates.filter(c => c.status === "interview_pending").length;
  const kpiTotalWaitingCount = kpiNewCount + kpiInterviewPendingCount;

  const handleExportCSV = () => {
    if (filteredCandidates.length === 0) {
      triggerToast("אין מועמדים לייצוא", "info");
      return;
    }

    const headers = ["שם מועמד", "משרה", "ציון התאמה", "קטגוריית התאמה", "תאריך הגשה", "סיכום המלצה"];
    const rows = filteredCandidates.map(c => [
      c.name,
      jobs.find(j => j.id === c.jobId)?.title || "לא ידוע",
      c.suitabilityScore,
      suitabilityColors[c.suitabilityCategory as SuitabilityCategory]?.label || (c.suitabilityCategory as string),
      new Date(c.appliedAt).toLocaleDateString('he-IL'),
      `"${c.recommendation.replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      "\uFEFF" + headers.join(","), // Add BOM for Excel Hebrew support
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `candidates_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    triggerToast("הקובץ יוצא בהצלחה", "success");
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-pink-50 text-gray-800">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-full shadow-lg border text-sm font-medium backdrop-blur-md ${
              toast.type === "success" 
                ? "bg-emerald-50/95 text-emerald-800 border-emerald-200" 
                : toast.type === "error" 
                ? "bg-rose-50/95 text-rose-800 border-rose-200" 
                : "bg-neutral-pink-100/95 text-neutral-pink-900 border-neutral-pink-200"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-current animate-pulse"></span>
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elegant Rose Header */}
      <header className="border-b border-neutral-pink-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 lg:gap-4">
            
            <div className="flex items-center justify-between gap-3 text-right">
              {/* Logo & Info */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-neutral-pink-400 to-rose-300 flex items-center justify-center text-white shadow-sm shadow-neutral-pink-200">
                  <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-gray-900 flex items-center gap-1.5">
                    <span>מסננת</span>
                    <span className="text-[9px] bg-neutral-pink-200 text-neutral-pink-800 px-2 py-0.5 rounded-full font-normal">
                      סינון קורות חיים & DNA
                    </span>
                  </h1>
                </div>
              </div>

              {/* User Guide Trigger Button */}
              <button
                onClick={() => {
                  setGuideStep(0);
                  setShowGuideModal(true);
                  triggerToast("פותח מדריך שימוש במערכת", "info");
                }}
                className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-pink-600 hover:text-neutral-pink-700 bg-neutral-pink-50 hover:bg-neutral-pink-100/60 px-2.5 py-1.5 rounded-full border border-neutral-pink-200/60 transition shrink-0 cursor-pointer"
                title="מדריך תפעול שלב-אחר-שלב"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">מדריך הפעלה</span>
                <span className="sm:hidden">מדריך</span>
              </button>

              {/* Compact Active Business Selector on mobile */}
              <div className="lg:hidden flex items-center gap-1 bg-white border border-neutral-pink-200 px-2 py-1 rounded-full shadow-sm max-w-[150px]">
                <Building className="w-3.5 h-3.5 text-neutral-pink-500 flex-shrink-0" />
                <select 
                  value={activeBusinessId} 
                  onChange={(e) => {
                    setActiveBusinessId(e.target.value);
                    setSelectedJob(null);
                    setFilterJobId("all");
                    setSelectedDeptId("");
                    triggerToast(`ניהול רב-עסקי מרוכז הופעל`, "info");
                  }}
                  className="bg-transparent border-none text-[10px] font-bold text-gray-800 focus:outline-none focus:ring-0 pl-3 pr-1 cursor-pointer truncate"
                >
                  <option value="all-businesses">🌍 כל העסקים במקביל</option>
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subtle Navigation Switcher - Scrollable horizontally on mobile */}
            <div className="flex items-center bg-gray-100/60 p-1 rounded-xl border border-gray-200 shadow-inner overflow-x-auto scrollbar-none flex-nowrap w-full lg:w-auto gap-0.5">
              <button 
                onClick={() => setCurrentTab("business-setup")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${currentTab === "business-setup" ? "bg-white text-neutral-pink-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>ניהול עסקים</span>
              </button>
              <button 
                onClick={() => setCurrentTab("new-job")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${currentTab === "new-job" ? "bg-white text-neutral-pink-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>הקמת משרה</span>
              </button>
              <button 
                onClick={() => setCurrentTab("existing-jobs")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${currentTab === "existing-jobs" ? "bg-white text-neutral-pink-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>ניהול משרות</span>
              </button>
              <button 
                onClick={() => setCurrentTab("candidates-status")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${currentTab === "candidates-status" ? "bg-white text-neutral-pink-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>מועמדים</span>
              </button>
              <button 
                onClick={() => setCurrentTab("compare-candidates")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${currentTab === "compare-candidates" ? "bg-white text-neutral-pink-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>השוואה ({compareCandidateIds.length})</span>
              </button>
              <button 
                onClick={() => setCurrentTab("recruitment-calendar")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${currentTab === "recruitment-calendar" ? "bg-white text-neutral-pink-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>לוח משימות</span>
              </button>
            </div>

            {/* Quick Business Selector (Desktop only) */}
            <div className="hidden lg:flex items-center gap-2 bg-white/90 border border-neutral-pink-200 px-3.5 py-1.5 rounded-full shadow-sm">
              <Building className="w-4 h-4 text-neutral-pink-500" />
              <span className="text-[10px] text-gray-400 font-semibold ml-1">עסק פעיל:</span>
              <select 
                value={activeBusinessId} 
                onChange={(e) => {
                  setActiveBusinessId(e.target.value);
                  setSelectedJob(null);
                  setFilterJobId("all");
                  setSelectedDeptId("");
                  triggerToast(`ניהול רב-עסקי מרוכז הופעל`, "info");
                }}
                className="bg-transparent border-none text-xs font-bold text-gray-800 focus:outline-none focus:ring-0 pl-4 pr-1 cursor-pointer"
              >
                <option value="all-businesses">🌍 כל העסקים במקביל</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">

        {/* Interactive operation guide */}
        <AnimatePresence>
          {showUserGuide && (
            <motion.div 
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="mb-8 bg-gradient-to-br from-neutral-pink-50/90 to-rose-50/50 p-5 rounded-3xl border border-neutral-pink-200/80 shadow-sm relative overflow-hidden text-right"
            >
              {/* Decorative sparkles */}
              <div className="absolute top-0 left-0 p-8 opacity-10 pointer-events-none">
                <Sparkles className="w-32 h-32 text-neutral-pink-400" />
              </div>
              
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-neutral-pink-200 text-neutral-pink-800">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">מדריך מהיר: כיצד להפיק את המרב ממערכת "מסננת"?</h3>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    מערכת "מסננת" עוזרת לכם לסנן קורות חיים לא רק על סמך מילים יבשות, אלא על פי ה-DNA התרבותי, המקצועי והצוותי הייחודי של החברה שלכם. עקבו אחר השלבים או דפדפו בלשוניות לקבלת הסבר מפורט.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => {
                      setGuideStep(0);
                      setShowGuideModal(true);
                      triggerToast("פותח מדריך שימוש במערכת", "info");
                    }}
                    className="bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white text-[10px] font-bold px-4 py-2 rounded-full transition shadow-sm whitespace-nowrap cursor-pointer"
                  >
                    למדריך שלב-אחר-שלב 🚀
                  </button>
                  <button
                    onClick={() => {
                      setShowUserGuide(false);
                      try {
                        localStorage.setItem("masenat_guide_dismissed", "true");
                      } catch (e) {}
                      triggerToast("המדריך הוסתר. תוכלו לפתוח אותו שוב בכל עת בלחיצה על 'מדריך הפעלה' בראש המסך.", "info");
                    }}
                    className="text-gray-400 hover:text-gray-600 text-[10px] font-bold hover:bg-white/80 border border-gray-200/80 px-3 py-2 rounded-full transition whitespace-nowrap cursor-pointer"
                  >
                    דלג / אל תציג שוב
                  </button>
                </div>
              </div>

              {/* 4 Interactive Columns describing the workflow */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-4 border-t border-neutral-pink-200/50">
                <div className="bg-white/60 p-3.5 rounded-2xl border border-neutral-pink-100/60">
                  <span className="text-[10px] font-bold text-neutral-pink-500 block mb-1">שלב 1 • ה-DNA הארגוני</span>
                  <h4 className="text-xs font-bold text-gray-800 mb-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-neutral-pink-500" />
                    אפיון החברה והצוות
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    הקימו עסק, ענו על מספר שאלות קצרות, וה-AI יזקק את פרופיל ה-DNA התרבותי שלכם.
                  </p>
                </div>

                <div className="bg-white/60 p-3.5 rounded-2xl border border-neutral-pink-100/60">
                  <span className="text-[10px] font-bold text-neutral-pink-500 block mb-1">שלב 2 • הוספת משרה</span>
                  <h4 className="text-xs font-bold text-gray-800 mb-1 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5 text-neutral-pink-500" />
                    דרישות ותחומי עניין
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    הגדירו כותרת ודרישות תפקיד, או הדביקו תיאור קיים (JD) והמערכת תפרק אותו אוטומטית לקריטריונים.
                  </p>
                </div>

                <div className="bg-white/60 p-3.5 rounded-2xl border border-neutral-pink-100/60">
                  <span className="text-[10px] font-bold text-neutral-pink-500 block mb-1">שלב 3 • סינון קורות חיים</span>
                  <h4 className="text-xs font-bold text-gray-800 mb-1 flex items-center gap-1">
                    <UploadCloud className="w-3.5 h-3.5 text-neutral-pink-500" />
                    העלאה וניתוח AI
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    גררו קבצי קורות חיים. המערכת תבצע השוואה ל-DNA ותקבע ציון התאמה משוקלל עם הסברים מנומקים.
                  </p>
                </div>

                <div className="bg-white/60 p-3.5 rounded-2xl border border-neutral-pink-100/60">
                  <span className="text-[10px] font-bold text-neutral-pink-500 block mb-1">שלב 4 • קבלת החלטות</span>
                  <h4 className="text-xs font-bold text-gray-800 mb-1 flex items-center gap-1">
                    <LayoutGrid className="w-3.5 h-3.5 text-neutral-pink-500" />
                    השוואה ולוח משימות
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    השוו קבוצת מועמדים בטבלה רב-ממדית, ונהלו (הוסיפו ועירכו) משימות וראיונות ישירות מלוח המשימות המובנה.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 1: Business Setup & AI DNA Interview (הקמת עסק ושאלון DNA) */}
        {currentTab === "business-setup" && (
          <div className="space-y-8">
            
            {/* List of existing businesses with details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Existing Businesses panel */}
              <div className="bg-white/95 p-6 rounded-3xl border border-neutral-pink-200/80 shadow-md space-y-4">
                <div className="border-b border-neutral-pink-100 pb-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Building className="w-5 h-5 text-neutral-pink-500" />
                    <span>עסקים רשומים ({businesses.length})</span>
                  </h3>
                  <button 
                    onClick={() => {
                      setEditingBusiness(null);
                      setBizName("");
                      setBizIndustry("");
                      setBizLocation("");
                      setBizDescription("");
                      setShowBusinessModal(true);
                    }}
                    className="p-1.5 rounded-full bg-neutral-pink-500 text-white hover:bg-neutral-pink-600 transition shadow-sm"
                    title="הוסף עסק"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {businesses.map((b) => {
                    const isSelected = activeBusinessId === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          setActiveBusinessId(b.id);
                          setSelectedJob(null);
                          setSelectedDeptId("");
                        }}
                        className={`p-4 rounded-2xl border text-right cursor-pointer transition ${
                          isSelected
                            ? "bg-neutral-pink-100/40 border-neutral-pink-400 ring-1 ring-neutral-pink-300"
                            : "bg-neutral-pink-50/10 border-neutral-pink-200/60 hover:bg-neutral-pink-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-sm font-bold text-gray-900">{b.name}</h4>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-pink-200 text-neutral-pink-800">
                              {b.industry}
                            </span>
                            {b.id !== 'other-business' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingBusiness(b);
                                    setBizName(b.name);
                                    setBizIndustry(b.industry);
                                    setBizLocation(b.location);
                                    setBizSize(b.size);
                                    setBizDescription(b.description);
                                    setShowBusinessModal(true);
                                    triggerToast(`עריכת עסק: ${b.name}`, "info");
                                  }}
                                  className="text-gray-400 hover:text-neutral-pink-600 p-1 rounded-full transition"
                                  title="ערוך עסק"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (deleteConfirmId === b.id) {
                                      handleDeleteBusiness(b.id);
                                    } else {
                                      setDeleteConfirmId(b.id);
                                      setTimeout(() => setDeleteConfirmId(null), 3000); // Reset after 3s
                                    }
                                  }}
                                  className={`p-1 rounded-full transition flex items-center gap-1 ${
                                    deleteConfirmId === b.id 
                                      ? "bg-rose-500 text-white px-2" 
                                      : "text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                                  }`}
                                  title={deleteConfirmId === b.id ? "אשר מחיקה" : "מחק עסק"}
                                >
                                  {deleteConfirmId === b.id ? (
                                    <>
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span className="text-[10px] font-bold">בטוח?</span>
                                    </>
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-2">{b.description || "אין תיאור מוגדר"}</p>
                        
                        {b.dnaSummary && (
                          <div className="mt-2 bg-white/60 p-2.5 rounded-xl border border-neutral-pink-200/50 text-[11px] text-neutral-pink-800 leading-relaxed">
                            <span className="font-bold block text-neutral-pink-950 mb-0.5">פרופיל DNA מסונטז:</span>
                            <span className="line-clamp-2">{b.dnaSummary}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add / Setup Business Module */}
              <div className="lg:col-span-2 bg-white/95 p-6 rounded-3xl border border-neutral-pink-200/80 shadow-md">
                
                {/* Switch between Onboarding flow vs Active Selected Business Details */}
                {tempQuestions.length > 0 ? (
                  
                  // Question answers screen (AI dynamic interview)
                  <form onSubmit={handleSynthesizeDNA} className="space-y-5">
                    <div className="bg-neutral-pink-500 text-white p-4 -mx-6 -mt-6 rounded-t-3xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 animate-spin" />
                        <div>
                          <h3 className="text-base font-bold">ראיון אפיון ה-DNA של {bizName}</h3>
                          <p className="text-xs text-rose-100">השאלון הבא הופק במיוחד על ידי ה-AI</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setTempQuestions([])}
                        className="text-xs bg-neutral-pink-600 hover:bg-neutral-pink-700 px-3 py-1.5 rounded-full transition"
                      >
                        חזור לטופס
                      </button>
                    </div>

                    <div className="space-y-6 pt-3">
                      {renderQuestionsByCategory()}
                    </div>

                    <div className="flex justify-end pt-3 border-t border-neutral-pink-100">
                      <button
                        type="submit"
                        disabled={isSynthesizingDna}
                        className="bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-full shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSynthesizingDna ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>מסנתז פרופיל DNA ב-AI...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>סיים וסכם פרופיל DNA של העסק ✨</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                ) : (
                  
                  // Business Detail Form or Details view
                  <div className="space-y-6">
                    
                    {/* If we are in "All Businesses" mode, render a master dashboard */}
                    {activeBusinessId === "all-businesses" && (
                      <div className="space-y-6 animate-fadeIn">
                        {/* Upper Section with stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white p-4 rounded-2xl border border-neutral-pink-100 shadow-sm flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-gray-400">עסקים רשומים</span>
                            <div className="flex items-baseline gap-2 mt-2">
                              <span className="text-2xl font-black text-neutral-pink-600">{businesses.length}</span>
                              <Building className="w-4 h-4 text-neutral-pink-300" />
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-2xl border border-neutral-pink-100 shadow-sm flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-gray-400">משרות פתוחות</span>
                            <div className="flex items-baseline gap-2 mt-2">
                              <span className="text-2xl font-black text-neutral-pink-600">{jobs.length}</span>
                              <Briefcase className="w-4 h-4 text-neutral-pink-300" />
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-2xl border border-neutral-pink-100 shadow-sm flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-gray-400">מועמדים שנסרקו</span>
                            <div className="flex items-baseline gap-2 mt-2">
                              <span className="text-2xl font-black text-neutral-pink-600">{candidates.length}</span>
                              <Users className="w-4 h-4 text-neutral-pink-300" />
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-2xl border border-neutral-pink-100 shadow-sm flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-gray-400">גויסו בהצלחה 🎉</span>
                            <div className="flex items-baseline gap-2 mt-2">
                              <span className="text-2xl font-black text-emerald-600">{candidates.filter(c => c.status === "hired").length}</span>
                              <Sparkles className="w-4 h-4 text-emerald-300" />
                            </div>
                          </div>
                        </div>

                        {/* Middle Section: Active jobs by business */}
                        <div className="bg-neutral-pink-50/20 p-5 rounded-2xl border border-neutral-pink-200/50 space-y-4 text-right">
                          <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1">
                            <Briefcase className="w-4 h-4 text-neutral-pink-500" />
                            משרות פעילות בכלל הארגונים:
                          </h4>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-right border-collapse">
                              <thead>
                                <tr className="border-b border-neutral-pink-100 text-gray-400 font-bold">
                                  <th className="py-2 px-3">שם המשרה</th>
                                  <th className="py-2 px-3">שיוך לעסק</th>
                                  <th className="py-2 px-3">מחלקה וצוות</th>
                                  <th className="py-2 px-3 text-center">מועמדים</th>
                                  <th className="py-2 px-3 text-left">פעולות</th>
                                </tr>
                              </thead>
                              <tbody>
                                {jobs.map(j => {
                                  const biz = businesses.find(b => b.id === j.businessId);
                                  const candCount = getCandidateCountForJob(j.id);
                                  return (
                                    <tr key={j.id} className="border-b border-neutral-pink-50 hover:bg-neutral-pink-50/30 transition">
                                      <td className="py-2.5 px-3 font-bold text-gray-800">{j.title}</td>
                                      <td className="py-2.5 px-3">
                                        <span className="px-2 py-0.5 rounded-full bg-neutral-pink-100 text-neutral-pink-800 font-bold text-[10px]">
                                          {biz?.name || "עסק שנמחק"}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-gray-500">
                                        {j.departmentName || "כללי"} {j.teamName ? `(${j.teamName})` : ""}
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-bold text-neutral-pink-600">{candCount}</td>
                                      <td className="py-2.5 px-3 text-left">
                                        <div className="flex items-center gap-2 justify-end">
                                          <button
                                            onClick={() => {
                                              setSelectedJob(j);
                                              setFilterJobId(j.id);
                                              setCurrentTab("candidates-status");
                                              triggerToast(`מסונן לפי ${j.title}`, "info");
                                            }}
                                            className="text-[10px] font-bold text-neutral-pink-600 hover:text-white hover:bg-neutral-pink-500 border border-neutral-pink-200 px-2 py-1 rounded-full transition cursor-pointer"
                                          >
                                            צפה במועמדים
                                          </button>
                                          {biz && (
                                            <button
                                              onClick={() => {
                                                setActiveBusinessId(biz.id);
                                                triggerToast(`העסק ${biz.name} הופעל כעת`, "success");
                                              }}
                                              className="text-[10px] font-bold text-gray-500 hover:text-white hover:bg-gray-500 border border-gray-200 px-2 py-1 rounded-full transition cursor-pointer"
                                            >
                                              נהל עסק
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {jobs.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="py-6 text-center text-gray-400 italic">אין משרות פעילות במערכת כעת. עברו ללשונית "פרסום משרה" כדי להתחיל.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Prompt explanation */}
                        <div className="text-[11px] text-gray-500 leading-relaxed bg-neutral-pink-100/50 p-3 rounded-xl border border-neutral-pink-200/30">
                          <strong>מצב ניהול רב-עסקי מופעל 🌍</strong> במצב זה ניתן לראות ולנהל את כלל העסקים, המחלקות, המשרות והמועמדים במרוכז. כדי להתמקד בעסק ספציפי, באפשרותכם לבחור אותו מתוך רשימת העסקים בצד ימין או דרך בורר העסקים בראש המסך.
                        </div>
                      </div>
                    )}

                    {/* If there is an active business, we display its current DNA info or offer to create a new one */}
                    {activeBusiness && (
                      <div className="bg-neutral-pink-100/20 p-5 rounded-2xl border border-neutral-pink-200/50 space-y-4">
                        <div className="flex items-center justify-between border-b border-neutral-pink-200/40 pb-2">
                          <div>
                            <h3 className="text-base font-bold text-neutral-pink-900">{activeBusiness.name}</h3>
                            <p className="text-xs text-gray-400">{activeBusiness.industry} • {activeBusiness.size} • {activeBusiness.location}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-semibold">
                              פרופיל DNA מסונטז בהצלחה
                            </span>
                            <button 
                              onClick={() => {
                                setEditingBusiness(activeBusiness);
                                setBizName(activeBusiness.name);
                                setBizIndustry(activeBusiness.industry);
                                setBizLocation(activeBusiness.location);
                                setBizSize(activeBusiness.size);
                                setBizDescription(activeBusiness.description);
                                setShowBusinessModal(true);
                              }}
                              className="text-[10px] font-bold text-gray-500 hover:text-neutral-pink-600 bg-white border border-gray-200 px-3 py-1 rounded-full transition shadow-sm flex items-center gap-1"
                              title="ערוך עסק"
                            >
                              <Settings className="w-3 h-3" />
                              ערוך
                            </button>
                          </div>
                          <button 
                            onClick={() => { setViewingSummaryEntity(activeBusiness); setSummaryType("business"); }}
                            className="text-[10px] font-bold text-neutral-pink-600 hover:text-neutral-pink-700 bg-white border border-neutral-pink-200 px-3 py-1 rounded-full transition shadow-sm flex items-center gap-1.5"
                          >
                            <Info className="w-3 h-3" />
                            צפה בתשובות ובפרופיל
                          </button>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1">
                            <Award className="w-4 h-4 text-neutral-pink-500" />
                            פרופיל ה-DNA והתרבות הארגונית המסוכם:
                          </h4>
                          <p className="text-xs text-gray-600 leading-relaxed bg-white p-3.5 rounded-xl border border-neutral-pink-100 shadow-sm font-medium">
                            {activeBusiness.dnaSummary || "לא סוכם עדיין פרופיל DNA לעסק זה."}
                          </p>
                        </div>

                        <div className="text-[11px] text-gray-500 leading-relaxed bg-neutral-pink-100/50 p-3 rounded-xl border border-neutral-pink-200/30">
                          <strong>איך זה משפיע על הסינון?</strong> כאשר תבצעו סריקה וסינון לקורות חיים של מועמדים תחת המשרות של <span className="font-semibold">{activeBusiness.name}</span>, מנוע ה-AI ינתח את מסמך קורות החיים גם מול הגדרות ה-DNA האלו כדי לקבוע האם המועמד מתאים חברתית, דמוגרפית ומנטלית לעבודה שלכם.
                        </div>

                        {/* Departments Management */}
                        {activeBusiness.id !== 'other-business' && (
                          <div className="pt-4 border-t border-neutral-pink-200/40">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                <Layers className="w-4 h-4 text-neutral-pink-500" />
                                ניהול מחלקות ({filteredDepts.length}):
                              </h4>
                              <button
                                onClick={() => setShowAddDeptModal(true)}
                                className="text-[10px] font-bold bg-neutral-pink-500 text-white px-2.5 py-1 rounded-full hover:bg-neutral-pink-600 transition flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>הוסף מחלקה</span>
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                              {filteredDepts.map(d => {
                                const deptTeams = teams.filter(t => t.departmentId === d.id);
                                return (
                                  <div key={d.id} className="bg-white rounded-2xl border border-neutral-pink-100 shadow-sm hover:border-neutral-pink-200 transition p-4 space-y-4">
                                    <div className="flex items-center justify-between border-b border-neutral-pink-50 pb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-neutral-pink-50 flex items-center justify-center">
                                          <Layers className="w-4 h-4 text-neutral-pink-500" />
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-sm font-bold text-gray-800">{d.name}</span>
                                          {d.dnaSummary && <span className="text-[10px] text-neutral-pink-600 font-semibold">DNA מאופיין וסוכם</span>}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => { setViewingSummaryEntity(d); setSummaryType("department"); }}
                                          className="text-gray-300 hover:text-neutral-pink-500 p-1.5 rounded-full transition hover:bg-neutral-pink-50"
                                          title="צפה בתשובות האפיון"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={() => {
                                            setEditingDepartment(d);
                                            setNewDeptName(d.name);
                                            setShowAddDeptModal(true);
                                          }}
                                          className="text-gray-300 hover:text-neutral-pink-500 p-1.5 rounded-full transition hover:bg-neutral-pink-50"
                                          title="ערוך מחלקה"
                                        >
                                          <Settings className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={() => {
                                            if (deleteConfirmId === d.id) {
                                              handleDeleteDepartment(d.id);
                                            } else {
                                              setDeleteConfirmId(d.id);
                                              setTimeout(() => setDeleteConfirmId(null), 3000);
                                            }
                                          }}
                                          className={`p-1.5 rounded-full transition flex items-center gap-1 ${
                                            deleteConfirmId === d.id 
                                              ? "bg-rose-500 text-white px-2" 
                                              : "text-gray-300 hover:text-rose-600 hover:bg-rose-50"
                                          }`}
                                          title={deleteConfirmId === d.id ? "אשר מחיקה" : "מחק מחלקה"}
                                        >
                                          {deleteConfirmId === d.id ? (
                                            <>
                                              <Trash2 className="w-3.5 h-3.5" />
                                              <span className="text-[10px] font-bold">בטוח?</span>
                                            </>
                                          ) : (
                                            <Trash2 className="w-4 h-4" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
  
                                    {/* Teams Section within Department */}
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <h5 className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5 uppercase tracking-wider">
                                          <Users className="w-3.5 h-3.5" />
                                          צוותים במחלקה ({deptTeams.length}):
                                        </h5>
                                      </div>
  
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {deptTeams.map(t => (
                                          <div key={t.id} className="flex items-center justify-between p-2.5 bg-neutral-pink-50/30 rounded-xl border border-neutral-pink-100/50 group">
                                            <div className="flex flex-col overflow-hidden">
                                              <span className="text-xs font-bold text-gray-700 truncate">{t.name}</span>
                                              {t.dnaSummary ? (
                                                <span className="text-[9px] text-neutral-pink-500 font-medium truncate" title={t.dnaSummary}>DNA ייחודי לצוות אופיין</span>
                                              ) : (
                                                <button 
                                                  onClick={() => handleCreateTeam(d.id, t.name, t.id)}
                                                  disabled={isSynthesizingTeamDna}
                                                  className="text-[9px] text-gray-400 hover:text-neutral-pink-500 flex items-center gap-1 mt-0.5 transition"
                                                >
                                                  <Sparkles className="w-2.5 h-2.5" />
                                                  <span>אפיין DNA צוותי</span>
                                                </button>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-0.5">
                                              {t.dnaSummary && (
                                                <button 
                                                  onClick={() => { setViewingSummaryEntity(t); setSummaryType("team"); }}
                                                  className="text-gray-300 hover:text-neutral-pink-500 p-1 rounded-full transition"
                                                  title="צפה באפיון הצוות"
                                                >
                                                  <Eye className="w-3 h-3" />
                                                </button>
                                              )}
                                              <button 
                                                onClick={() => {
                                                  setEditingTeam(t);
                                                  setNewTeamName(t.name);
                                                  setShowTeamModal(true);
                                                }}
                                                className="text-gray-300 hover:text-neutral-pink-500 p-1 transition opacity-0 group-hover:opacity-100"
                                                title="ערוך צוות"
                                              >
                                                <Settings className="w-3 h-3" />
                                              </button>
                                              <button 
                                                onClick={() => {
                                                  if (deleteConfirmId === t.id) {
                                                    handleDeleteTeam(t.id);
                                                  } else {
                                                    setDeleteConfirmId(t.id);
                                                    setTimeout(() => setDeleteConfirmId(null), 3000);
                                                  }
                                                }}
                                                className={`p-1 transition flex items-center gap-1 rounded-lg ${
                                                  deleteConfirmId === t.id 
                                                    ? "bg-rose-500 text-white px-1.5 opacity-100" 
                                                    : "text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"
                                                }`}
                                                title={deleteConfirmId === t.id ? "אשר מחיקה" : "מחק צוות"}
                                              >
                                                {deleteConfirmId === t.id ? (
                                                  <>
                                                    <Trash2 className="w-3 h-3" />
                                                    <span className="text-[9px] font-bold">בטוח?</span>
                                                  </>
                                                ) : (
                                                  <Trash2 className="w-3 h-3" />
                                                )}
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                        
                                        {/* Add Team Inline Input */}
                                        <div className="flex items-center gap-1 p-1.5 bg-white rounded-xl border border-dashed border-neutral-pink-200">
                                          <input 
                                            type="text"
                                            placeholder="שם צוות חדש..."
                                            id={`new-team-input-${d.id}`}
                                            className="flex-1 bg-transparent border-none text-[10px] focus:ring-0 px-2 h-7"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                const val = (e.target as HTMLInputElement).value;
                                                if (val) {
                                                  handleCreateTeam(d.id, val);
                                                  (e.target as HTMLInputElement).value = "";
                                                }
                                              }
                                            }}
                                          />
                                          <button 
                                            onClick={() => {
                                              const input = document.getElementById(`new-team-input-${d.id}`) as HTMLInputElement;
                                              if (input.value) {
                                                handleCreateTeam(d.id, input.value);
                                                input.value = "";
                                              }
                                            }}
                                            className="w-7 h-7 rounded-lg bg-neutral-pink-500 text-white flex items-center justify-center hover:bg-neutral-pink-600 transition"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              {filteredDepts.length === 0 && (
                                <p className="text-[10px] text-gray-400 italic col-span-full py-4 text-center border-2 border-dashed border-neutral-pink-100 rounded-3xl">אין עדיין מחלקות רשומות לעסק זה. הוסף אחת כדי להתחיל להקים צוותים ומשרות.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Create / Edit Business Section - MOVED TO MODAL */}
                    <div className="border-t border-neutral-pink-100 pt-5 flex justify-center">
                      <button 
                        onClick={() => {
                          setEditingBusiness(null);
                          setBizName("");
                          setBizIndustry("");
                          setBizLocation("");
                          setBizDescription("");
                          setShowBusinessModal(true);
                        }}
                        className="bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-sm transition flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>הקמת עסק נוסף במערכת</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Create New Job (הקמת משרה חדשה) */}
        {currentTab === "new-job" && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            {renderCalibrationUI()}
            
            {/* Custom Job Creation Form */}
            <div className="bg-white/95 p-8 rounded-3xl border border-neutral-pink-200/80 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingJob ? `עריכת משרה: ${editingJob.title}` : "פרסום משרה חדשה"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {activeBusinessId === "all-businesses" ? (
                      <span className="text-neutral-pink-600 font-bold italic">נא לבחור עסק לשיוך המשרה מתוך הרשימה בטופס</span>
                    ) : activeBusinessId ? (
                      <>משויך לעסק: <span className="font-bold text-neutral-pink-600">{activeBusiness?.name}</span></>
                    ) : (
                      <span className="text-neutral-pink-600 font-bold italic">הקמת משרה ללא שיוך מוקדם לעסק (יוגדר בהמשך)</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {editingJob && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingJob(null);
                        setJobTitle("");
                        setJobLocation("");
                        setJobDescription("");
                        setJobRequirements("");
                        setJobJDText("");
                        setSelectedDeptId("");
                        setSelectedTeamId("");
                        setExtractedRankedRequirements([]);
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                      ביטול עריכה
                    </button>
                  )}
                  {/* Inline Add Department */}
                  <button
                    type="button"
                    onClick={() => setShowAddDeptModal(true)}
                    className="text-xs font-bold bg-neutral-pink-100 text-neutral-pink-800 px-3.5 py-1.5 rounded-full hover:bg-neutral-pink-200 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>מחלקה חדשה</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-4">
                <div className="bg-neutral-pink-500/5 p-4 rounded-2xl border border-neutral-pink-200/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-neutral-pink-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-neutral-pink-500" />
                      ניתוח דרישות חכם (AI JD Analysis)
                    </label>
                    <button
                      type="button"
                      onClick={handleAnalyzeJD}
                      disabled={isAnalyzingJD || !jobJDText.trim()}
                      className="text-[10px] font-bold bg-neutral-pink-500 text-white px-3 py-1 rounded-full hover:bg-neutral-pink-600 disabled:bg-gray-300 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {isAnalyzingJD ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      נתח דרישות גלויות ונסתרות ✨
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="הדבק כאן את תיאור המשרה המלא (Job Description) כדי שה-AI יחלץ דרישות ויסיק דרישות נסתרות על בסיס ה-DNA של העסק..."
                    value={jobJDText}
                    onChange={(e) => setJobJDText(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-neutral-pink-200 bg-white focus:outline-none focus:border-neutral-pink-400 text-[11px] leading-relaxed"
                  />
                  <p className="text-[10px] text-gray-400 italic">ה-AI יסיק דרישות כמו "עבודה תחת לחץ" או "ניסיון בסביבה רגולטורית" על בסיס פרופיל העסק והמחלקה.</p>
                  
                  {renderRankedRequirementsEditor()}
                </div>

                {activeBusinessId === "all-businesses" && (
                  <div className="bg-neutral-pink-50/30 p-4 rounded-2xl border border-neutral-pink-200/50 mb-6 space-y-2">
                    <label className="block text-xs font-bold text-gray-800 flex items-center gap-1">
                      <Building className="w-4 h-4 text-neutral-pink-500" />
                      <span>שיוך לעסק ספציפי *</span>
                    </label>
                    <select
                      value={selectedBusinessIdForNewJob}
                      onChange={(e) => {
                        setSelectedBusinessIdForNewJob(e.target.value);
                        setSelectedDeptId("");
                        setSelectedTeamId("");
                      }}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-pink-200 bg-white focus:outline-none focus:border-neutral-pink-400 text-xs transition font-semibold"
                    >
                      <option value="">-- בחרו את העסק שעבורו מיועדת המשרה --</option>
                      {businesses.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  <div className="md:col-span-1.5">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">שם המשרה / תפקיד *</label>
                    <input 
                      type="text"
                      required
                      placeholder="לדוגמה: מפתח Full Stack בכיר..."
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-pink-200 bg-neutral-pink-50/20 focus:outline-none focus:border-neutral-pink-400 text-xs transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">מחלקה בעסק</label>
                    <select
                      value={selectedDeptId}
                      onChange={(e) => {
                        setSelectedDeptId(e.target.value);
                        setSelectedTeamId(""); // Reset team when department changes
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-pink-200 bg-neutral-pink-50/20 focus:outline-none focus:border-neutral-pink-400 text-xs transition"
                    >
                      <option value="">-- בחר מחלקה (אופציונלי כעת) --</option>
                      {(activeBusinessId === "all-businesses"
                        ? departments.filter(d => d.businessId === selectedBusinessIdForNewJob)
                        : filteredDepts
                      ).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">צוות (אופציונלי)</label>
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      disabled={!selectedDeptId}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-pink-200 bg-neutral-pink-50/20 focus:outline-none focus:border-neutral-pink-400 text-xs transition disabled:opacity-50"
                    >
                      <option value="">-- ללא שיוך לצוות --</option>
                      {teams.filter(t => t.departmentId === selectedDeptId).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">מיקום (או דרישת שטח)</label>
                    <input 
                      type="text"
                      placeholder="לדוגמה: הרצליה (היברידי)"
                      value={jobLocation}
                      onChange={(e) => setJobLocation(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-pink-200 bg-neutral-pink-50/20 focus:outline-none focus:border-neutral-pink-400 text-xs transition"
                    />
                  </div>

                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white rounded-full px-8 py-3 text-xs sm:text-sm font-bold transition duration-300 shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>הקם משרה לעסק</span>
                  </button>
                </div>

              </form>
            </div>

          </div>
        )}

        {/* Tab 3: Existing Jobs & Screening (משרות קיימות וסינון קורות חיים) */}
        {currentTab === "existing-jobs" && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Job Grid select */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">משרות פתוחות עבור {activeBusiness?.name}</h2>
                  <p className="text-xs text-gray-500">בחרו את המשרה המבוקשת מטה, ואז העלו קורות חיים של מועמד/ת.</p>
                </div>
                <button 
                  onClick={() => setCurrentTab("new-job")}
                  className="bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white text-xs font-bold rounded-full px-6 py-3 transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-neutral-pink-200 self-start"
                >
                  <Plus className="w-4 h-4" />
                  <span>הקמת משרה חדשה</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredJobs.length === 0 ? (
                  <div className="col-span-full bg-white/75 p-10 text-center rounded-3xl border border-dashed border-neutral-pink-300/60">
                    <Briefcase className="w-10 h-10 text-neutral-pink-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-700 mb-1">אין עדיין משרות לעסק זה</p>
                    <p className="text-xs text-gray-400 mb-4">הקימו משרה חדשה תחת העסק בלשונית הקודמת</p>
                    <button 
                      onClick={() => setCurrentTab("new-job")}
                      className="bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white text-xs font-bold rounded-full px-5 py-2.5 transition cursor-pointer"
                    >
                      צור משרה ראשונה עכשיו
                    </button>
                  </div>
                ) : (
                  filteredJobs.map((job) => {
                    const isSelected = selectedJob?.id === job.id;
                    const cCount = getCandidateCountForJob(job.id);
                    return (
                      <div 
                        key={job.id}
                        onClick={() => {
                          setSelectedJob(job);
                          setEvaluationResult(null);
                          setError("");
                        }}
                        className={`p-5 rounded-3xl border cursor-pointer relative transition duration-300 bg-white shadow-sm flex flex-col justify-between ${
                          isSelected 
                            ? "border-neutral-pink-500 ring-2 ring-neutral-pink-200" 
                            : "border-neutral-pink-200/80 hover:border-neutral-pink-400 hover:shadow"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-neutral-pink-100 text-neutral-pink-800">
                              {job.departmentName}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-neutral-pink-600 bg-neutral-pink-200/50 px-2.5 py-0.5 rounded-full">
                                {cCount} מועמדים
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingJob(job);
                                  setJobTitle(job.title);
                                  setJobLocation(job.location);
                                  setJobDescription(job.description);
                                  setJobRequirements(job.requirements);
                                  setExtractedRankedRequirements(job.rankedRequirements || []);
                                  setSelectedDeptId(job.departmentId || "");
                                  setSelectedTeamId(job.teamId || "");
                                  setCurrentTab("new-job");
                                }}
                                className="p-1 rounded-full text-gray-400 hover:text-neutral-pink-600 hover:bg-neutral-pink-50 transition"
                                title="ערוך משרה"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingSummaryEntity(job);
                                  setSummaryType("job");
                                }}
                                className="p-1 rounded-full text-gray-400 hover:text-neutral-pink-600 hover:bg-neutral-pink-50 transition"
                                title="צפה בהגדרות המשרה"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (deleteConfirmId === job.id) {
                                    handleDeleteJob(job.id);
                                  } else {
                                    setDeleteConfirmId(job.id);
                                    setTimeout(() => setDeleteConfirmId(null), 3000);
                                  }
                                }}
                                className={`p-1 rounded-full transition flex items-center gap-1 ${
                                  deleteConfirmId === job.id 
                                    ? "bg-rose-500 text-white px-2 opacity-100" 
                                    : "text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                                }`}
                                title={deleteConfirmId === job.id ? "אשר מחיקה" : "מחק משרה"}
                              >
                                {deleteConfirmId === job.id ? (
                                  <>
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold">בטוח?</span>
                                  </>
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <h3 className="text-base font-bold text-gray-900 mb-1">{job.title}</h3>
                          
                          <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-3">
                            <MapPin className="w-3.5 h-3.5 inline text-neutral-pink-400" />
                            <span>{job.location}</span>
                          </p>
                          
                          <p className="text-[11px] text-gray-400 line-clamp-2 h-8 leading-relaxed mb-4">
                            {job.requirements}
                          </p>
                        </div>

                        <div className="border-t border-neutral-pink-100/50 pt-3 flex items-center justify-between text-[11px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>הוקמה: {new Date(job.createdAt).toLocaleDateString('he-IL')}</span>
                          </span>
                          {isSelected && (
                            <span className="text-neutral-pink-600 font-bold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-neutral-pink-500"></span>
                              <span>פעילה לסינון</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Screening Workspace */}
            {selectedJob && (
              <div className="border border-neutral-pink-200/90 rounded-3xl bg-white/95 p-6 shadow-md space-y-6">
                
                {/* Active profile stats header */}
                <div className="bg-neutral-pink-50/60 p-4 rounded-2xl border border-neutral-pink-100/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-pink-500 uppercase">המשרה שנבחרה לסריקה:</span>
                    <h3 className="text-lg font-bold text-gray-900">{selectedJob.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">מחלקה: {selectedJob.departmentName} {selectedJob.teamName ? `| צוות: ${selectedJob.teamName}` : ""} | מיקום: {selectedJob.location}</p>
                  </div>
                  {activeBusiness?.dnaSummary && (
                    <div className="bg-white px-3.5 py-2 rounded-xl border border-neutral-pink-200/60 shadow-sm max-w-sm">
                      <span className="text-[10px] font-bold text-neutral-pink-600 block mb-0.5">סגנון ותרבות ה-DNA של העסק:</span>
                      <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{activeBusiness.dnaSummary}</p>
                    </div>
                  )}
                </div>

                {/* Left (Inputs) and Right (AI report) */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  
                  {/* Left Side: Upload / Textarea */}
                  <div className="space-y-5">
                    <h4 className="text-sm font-bold text-gray-900">העלאת קובץ או הדבקת טקסט קורות חיים</h4>
                    
                    {/* File Drop area */}
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition min-h-44 flex flex-col items-center justify-center gap-3 relative overflow-hidden ${
                        dragActive 
                          ? "border-neutral-pink-500 bg-neutral-pink-100/40" 
                          : cvFiles.length > 0 
                          ? "border-emerald-400 bg-emerald-50/20"
                          : "border-neutral-pink-200 hover:border-neutral-pink-400 hover:bg-neutral-pink-50/40"
                      }`}
                    >
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        multiple
                        accept="application/pdf,text/plain" 
                        onChange={handleFileChange}
                        className="hidden" 
                      />

                      {isScreening && screeningProgress.total > 0 && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 animate-in fade-in">
                          <div className="w-full max-w-[240px] h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                            <motion.div 
                              className="h-full bg-neutral-pink-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${(screeningProgress.current / screeningProgress.total) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs font-bold text-gray-800">מעבד מועמדים... ({screeningProgress.current}/{screeningProgress.total})</p>
                          <p className="text-[10px] text-gray-400 mt-1">{loadingMessage}</p>
                        </div>
                      )}

                      <div className="w-12 h-12 rounded-2xl bg-neutral-pink-100 flex items-center justify-center text-neutral-pink-500">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 mb-1">גררו לכאן קבצי קורות חיים או לחצו לבחירה</p>
                        <p className="text-[10px] text-gray-400">ניתן להעלות מספר קבצים במקביל (PDF או טקסט)</p>
                      </div>
                    </div>

                    {/* File List Display */}
                    {cvFiles.length > 0 && (
                      <div className="bg-white rounded-2xl border border-neutral-pink-100 p-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">קבצים שנבחרו ({cvFiles.length}):</h5>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setCvFiles([]);
                            }}
                            className="text-[10px] text-rose-500 font-bold hover:underline"
                          >
                            נקה הכל
                          </button>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1.5 custom-scrollbar pr-2">
                          {cvFiles.map((f, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-neutral-pink-50/50 rounded-xl border border-neutral-pink-100/50 group">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className="w-3.5 h-3.5 text-neutral-pink-400" />
                                <span className="text-[10px] text-gray-700 font-medium truncate max-w-[200px]">{f.name}</span>
                                <span className="text-[9px] text-gray-400">({(f.size / 1024).toFixed(0)} KB)</span>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCvFiles(prev => prev.filter((_, idx) => idx !== i));
                                }}
                                className="text-gray-300 hover:text-rose-500 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center text-gray-400 text-[10px]">
                      <div className="flex-grow h-px bg-neutral-pink-200"></div>
                      <span className="px-3">או הדביקו טקסט קורות חיים באופן ידני</span>
                      <div className="flex-grow h-px bg-neutral-pink-200"></div>
                    </div>

                    {/* Text area paste */}
                    <textarea
                      rows={5}
                      placeholder="הדביקו כאן את תוכן קורות החיים..."
                      value={cvText}
                      onChange={(e) => {
                        setCvText(e.target.value);
                        if (e.target.value.trim()) {
                          setCvFiles([]);
                        }
                      }}
                      className="w-full px-4 py-3 rounded-2xl border border-neutral-pink-200 bg-neutral-pink-50/20 focus:outline-none focus:border-neutral-pink-400 text-xs transition"
                    />

                    {/* Submit Button */}
                    <button
                      onClick={handleScreenCV}
                      disabled={isScreening || (cvFiles.length === 0 && !cvText.trim())}
                      className={`w-full py-4 rounded-full font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        isScreening 
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                          : "bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white shadow-neutral-pink-200 hover:scale-[1.01] active:scale-[0.99]"
                      }`}
                    >
                      {isScreening ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>מבצע סריקה קבוצתית...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 text-rose-200" />
                          <span>{cvFiles.length > 1 ? `נתח ${cvFiles.length} מועמדים ב-AI ✨` : 'נתח קורות חיים והתאם ל-DNA ✨'}</span>
                        </>
                      )}
                    </button>

                    {error && (
                      <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">שגיאה בתהליך הניתוח</p>
                          <p className="mt-1 leading-relaxed">{error}</p>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Right Side: Analysis Output */}
                  <div className="border-t xl:border-t-0 xl:border-r border-neutral-pink-200/50 xl:pr-8 xl:pt-0 pt-8">
                    
                    <AnimatePresence mode="wait">
                      
                      {isLoading && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-full flex flex-col items-center justify-center py-12 text-center"
                        >
                          <div className="relative mb-6">
                            <div className="absolute inset-0 rounded-full bg-neutral-pink-300/40 animate-ping"></div>
                            <div className="relative w-16 h-16 rounded-full bg-neutral-pink-100 flex items-center justify-center text-neutral-pink-500 border border-neutral-pink-300">
                              <Sparkles className="w-7 h-7 animate-pulse" />
                            </div>
                          </div>
                          
                          <p className="text-sm font-bold text-neutral-pink-800 animate-pulse">{loadingMessage}</p>
                          <p className="text-[11px] text-gray-400 mt-2 max-w-xs leading-relaxed">אנחנו קוראים את קורות החיים ומבצעים הצלבה חכמה הן עם דרישות המשרה והן עם ה-DNA של העסק.</p>
                        </motion.div>
                      )}

                      {!isLoading && !evaluationResult && (
                        <div className="h-full flex flex-col items-center justify-center py-16 text-center text-gray-400">
                          <FileText className="w-12 h-12 text-neutral-pink-200 mb-4" />
                          <p className="text-sm font-bold">ממתין להעלאת קורות חיים</p>
                          <p className="text-xs max-w-xs mt-1 leading-relaxed">העלו קובץ או הדביקו טקסט קורות חיים של מועמד/ת, וה-AI יבצע ניתוח HR מקיף בשניות.</p>
                        </div>
                      )}

                      {!isLoading && evaluationResult && (
                        <motion.div 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          {/* Score and Category Header */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-pink-50/50 p-4 rounded-2xl border border-neutral-pink-200/60">
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-gray-400">מועמד שנמצא:</span>
                              <h3 className="text-base font-bold text-gray-900">{evaluationResult.name || "לא נמצא שם בקו\"ח"}</h3>
                              <p className="text-[11px] text-gray-500">{evaluationResult.email || "אין מייל"} | {evaluationResult.phone || "אין טלפון"}</p>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* circular score badge */}
                              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-neutral-pink-400 to-rose-300 flex flex-col items-center justify-center text-white shadow-sm">
                                <span className="text-lg font-bold leading-none">{evaluationResult.suitabilityScore}</span>
                                <span className="text-[9px] opacity-90 leading-none mt-1">התאמה</span>
                              </div>

                              <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${suitabilityColors[evaluationResult.suitabilityCategory as SuitabilityCategory]?.bg} ${suitabilityColors[evaluationResult.suitabilityCategory as SuitabilityCategory]?.text} ${suitabilityColors[evaluationResult.suitabilityCategory as SuitabilityCategory]?.border}`}>
                                {suitabilityColors[evaluationResult.suitabilityCategory as SuitabilityCategory]?.label || evaluationResult.suitabilityCategory}
                              </span>
                            </div>
                          </div>

                          {/* Cohesive Summary */}
                          <div className="space-y-1.5">
                            <h5 className="text-xs font-bold text-gray-900">חוות דעת HR וסיכום התאמה (כולל DNA):</h5>
                            <p className="text-xs text-gray-600 bg-white p-3 rounded-xl border border-neutral-pink-100 shadow-sm leading-relaxed">
                              {evaluationResult.summary}
                            </p>
                          </div>

                          {/* Strengths & Weaknesses Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <h5 className="text-xs font-bold text-emerald-700">חוזקות בולטות והתאמות:</h5>
                              <ul className="text-xs text-gray-600 space-y-1 bg-emerald-50/30 p-3 rounded-xl border border-emerald-100 list-disc list-inside">
                                {evaluationResult.strengths?.map((str: string, i: number) => (
                                  <li key={i}>{str}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="space-y-1.5">
                              <h5 className="text-xs font-bold text-rose-700">פערים או נקודות לחקירה:</h5>
                              <ul className="text-xs text-gray-600 space-y-1 bg-rose-50/20 p-3 rounded-xl border border-rose-100 list-disc list-inside">
                                {evaluationResult.weaknesses?.map((weak: string, i: number) => (
                                  <li key={i}>{weak}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Skills badges */}
                          <div className="space-y-1">
                            <h5 className="text-xs font-bold text-gray-800">מיומנויות וכישורים שזוהו:</h5>
                            <div className="flex flex-wrap gap-1">
                              {evaluationResult.skills?.map((skill: string, i: number) => (
                                <span key={i} className="text-[10px] bg-neutral-pink-100 text-neutral-pink-800 px-2 py-0.5 rounded-md border border-neutral-pink-200">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Recommendation and Save candidate action */}
                          <div className="bg-neutral-pink-100/30 p-3 rounded-xl border border-neutral-pink-200/50">
                            <span className="text-[10px] font-bold text-neutral-pink-800">המלצה להמשך תהליך הגיוס:</span>
                            <p className="text-xs text-gray-700 font-medium">{evaluationResult.recommendation}</p>
                            <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              המועמד נשמר אוטומטית במערכת
                            </p>
                          </div>

                        </motion.div>
                      )}

                    </AnimatePresence>

                  </div>

                </div>

              </div>
            )}

          </div>
        )}

        {currentTab === "compare-candidates" && renderCompareCandidates()}
        {currentTab === "recruitment-calendar" && renderRecruitmentCalendar()}

        {/* Tab 4: Candidates Status Dashboard (סטטוס מועמדים) */}
        {currentTab === "candidates-status" && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Status Cards (כרטיסי סטטוס לתעדוף עבודה) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: New Candidates */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilterStatus(filterStatus === "new" ? "all" : "new")}
                className={`p-5 rounded-3xl border transition-all duration-300 cursor-pointer shadow-sm relative overflow-hidden flex items-center justify-between ${
                  filterStatus === "new"
                    ? "bg-rose-500 text-white border-rose-600 ring-2 ring-rose-300 shadow-rose-100"
                    : "bg-white hover:bg-rose-50/20 border-rose-100 hover:border-rose-200"
                }`}
              >
                <div className="space-y-1 text-right" dir="rtl">
                  <span className={`text-[10px] font-bold tracking-wider ${filterStatus === "new" ? "text-rose-100" : "text-rose-600"}`}>
                    חדשים במערכת ✨
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">{kpiNewCount}</span>
                    <span className={`text-[10px] ${filterStatus === "new" ? "text-rose-100" : "text-gray-400"}`}>מועמדים</span>
                  </div>
                  <p className={`text-[10px] ${filterStatus === "new" ? "text-white/90" : "text-gray-500"}`}>
                    {filterStatus === "new" ? "מציג חדשים בלבד (לחצו לביטול)" : "לחצו לסינון מועמדים חדשים"}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  filterStatus === "new" ? "bg-white/20 text-white" : "bg-rose-50 text-rose-500"
                }`}>
                  <Sparkles className="w-6 h-6" />
                </div>
              </motion.div>

              {/* Card 2: Interview Pending */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilterStatus(filterStatus === "interview_pending" ? "all" : "interview_pending")}
                className={`p-5 rounded-3xl border transition-all duration-300 cursor-pointer shadow-sm relative overflow-hidden flex items-center justify-between ${
                  filterStatus === "interview_pending"
                    ? "bg-blue-500 text-white border-blue-600 ring-2 ring-blue-300 shadow-blue-100"
                    : "bg-white hover:bg-blue-50/20 border-blue-100 hover:border-blue-200"
                }`}
              >
                <div className="space-y-1 text-right" dir="rtl">
                  <span className={`text-[10px] font-bold tracking-wider ${filterStatus === "interview_pending" ? "text-blue-100" : "text-blue-600"}`}>
                    ממתינים לראיון 📞
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">{kpiInterviewPendingCount}</span>
                    <span className={`text-[10px] ${filterStatus === "interview_pending" ? "text-blue-100" : "text-gray-400"}`}>מועמדים</span>
                  </div>
                  <p className={`text-[10px] ${filterStatus === "interview_pending" ? "text-white/90" : "text-gray-500"}`}>
                    {filterStatus === "interview_pending" ? "מציג ממתינים לראיון (לחצו לביטול)" : "לחצו לסינון מועמדים לראיון"}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  filterStatus === "interview_pending" ? "bg-white/20 text-white" : "bg-blue-50 text-blue-500"
                }`}>
                  <Clock className="w-6 h-6" />
                </div>
              </motion.div>

              {/* Card 3: Total waiting for treatment */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilterStatus(filterStatus === "waiting_for_treatment" ? "all" : "waiting_for_treatment")}
                className={`p-5 rounded-3xl border transition-all duration-300 cursor-pointer shadow-sm relative overflow-hidden flex items-center justify-between ${
                  filterStatus === "waiting_for_treatment"
                    ? "bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300 shadow-amber-100"
                    : "bg-amber-50/10 hover:bg-amber-50/30 border-amber-100/70 hover:border-amber-200"
                }`}
              >
                <div className="space-y-1 text-right" dir="rtl">
                  <span className={`text-[10px] font-bold tracking-wider ${filterStatus === "waiting_for_treatment" ? "text-amber-100" : "text-amber-700"}`}>
                    סה״כ ממתינים לטיפול ⏳
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">{kpiTotalWaitingCount}</span>
                    <span className={`text-[10px] ${filterStatus === "waiting_for_treatment" ? "text-amber-100" : "text-amber-600"}`}>מועמדים</span>
                  </div>
                  <p className={`text-[10px] ${filterStatus === "waiting_for_treatment" ? "text-white/90" : "text-gray-500"}`}>
                    {filterStatus === "waiting_for_treatment" ? "מציג את כל הממתינים (לחצו לביטול)" : "לחצו להצגת כל הממתינים לטיפול"}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  filterStatus === "waiting_for_treatment" ? "bg-white/20 text-white" : "bg-amber-100/50 text-amber-600"
                }`}>
                  <ClipboardList className="w-6 h-6" />
                </div>
              </motion.div>
            </div>

            {/* Filter controls */}
            <div className="bg-white/95 p-5 rounded-3xl border border-neutral-pink-200/80 shadow-md">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                
                {/* Search Bar */}
                <div className="w-full lg:w-1/3 relative">
                  <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="text"
                    placeholder="חיפוש לפי שם, כישור או שם קובץ קו'ח..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 rounded-full border border-neutral-pink-200 focus:outline-none focus:border-neutral-pink-400 text-xs text-right"
                  />
                </div>

                {/* Selectors and Filters */}
                <div className="w-full lg:w-auto flex flex-wrap items-center gap-3 justify-end">
                  
                  {/* Job Filter */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-neutral-pink-50/40 border border-neutral-pink-200 px-3 py-1 rounded-full">
                    <Briefcase className="w-3.5 h-3.5 text-neutral-pink-500" />
                    <span>משרה:</span>
                    <select 
                      value={filterJobId} 
                      onChange={(e) => setFilterJobId(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-gray-800 focus:outline-none focus:ring-0 pl-3 pr-1 max-w-[200px] truncate"
                    >
                      <option value="all">כל המשרות</option>
                      {filteredJobs.map(j => {
                        const biz = businesses.find(b => b.id === j.businessId);
                        const label = activeBusinessId === "all-businesses" && biz
                          ? `${j.title} (${biz.name})`
                          : j.title;
                        return (
                          <option key={j.id} value={j.id}>{label}</option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Suitability Filter */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-neutral-pink-50/40 border border-neutral-pink-200 px-3 py-1 rounded-full">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-pink-500" />
                    <span>התאמת AI:</span>
                    <select 
                      value={filterSuitability} 
                      onChange={(e) => setFilterSuitability(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-gray-800 focus:outline-none focus:ring-0 pl-3 pr-1"
                    >
                      <option value="all">כל דרגות ההתאמה</option>
                      <option value="excellent">התאמה מושלמת 🌟</option>
                      <option value="good">מתאים 👍</option>
                      <option value="borderline">גבולי ⚖️</option>
                      <option value="unsuitable">לא מתאים 🚫</option>
                    </select>
                  </div>

                  {/* Skill Search */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-neutral-pink-50/40 border border-neutral-pink-200 px-3 py-1 rounded-full">
                    <Search className="w-3.5 h-3.5 text-neutral-pink-500" />
                    <span>סינון כישור:</span>
                    <input 
                      type="text"
                      placeholder="חפש כישור..."
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-gray-800 focus:outline-none focus:ring-0 w-24 text-right placeholder:font-normal"
                    />
                  </div>

                  {/* Recruitment Status Filter */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-neutral-pink-50/40 border border-neutral-pink-200 px-3 py-1 rounded-full">
                    <History className="w-3.5 h-3.5 text-neutral-pink-500" />
                    <span>סטטוס גיוס:</span>
                    <select 
                      value={filterStatus} 
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-gray-800 focus:outline-none focus:ring-0 pl-3 pr-1"
                    >
                      <option value="all">כל הסטטוסים</option>
                      <option value="waiting_for_treatment">ממתינים לטיפול (חדש / ראיון) ⏳</option>
                      {Object.keys(statusMap).map(st => (
                        <option key={st} value={st}>{statusMap[st as CandidateStatus].label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Export Button */}
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 text-xs font-bold bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full hover:bg-emerald-200 transition shadow-sm cursor-pointer"
                    title="ייצוא רשימת מועמדים ל-CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ייצוא מנהלים (CSV)</span>
                  </button>

                </div>

              </div>
            </div>

            {/* Auto Screening & Reject Rules Panel */}
            <div className="bg-gradient-to-br from-neutral-pink-50/20 to-white p-5 rounded-3xl border border-neutral-pink-200/60 shadow-md space-y-4 text-right animate-fadeIn" dir="rtl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-pink-200/30 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-neutral-pink-100 flex items-center justify-center text-neutral-pink-600 shrink-0">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900">מנגנון סינון ודחייה אוטומטית חכמה ⚡</h4>
                    <p className="text-[10px] text-gray-400">חוסך זמן יקר על ידי אוטומציה של סינון ראשוני של מועמדים לא מתאימים</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${autoRejectEnabled ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
                    {autoRejectEnabled ? "● סינון אוטומטי פעיל" : "● סינון אוטומטי כבוי"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                
                {/* Rule configuration parameters */}
                <div className="md:col-span-8 flex flex-col justify-between gap-4">
                  <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-neutral-pink-100/60 shadow-sm">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-gray-800 block">הפעל סינון אוטומטי למועמדים חדשים:</span>
                      <p className="text-[10px] text-gray-400">כל קובץ קו"ח חדש שיוערך יסונן ישירות לסטטוס 'נדחה' אם הוא עונה לחוקים</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        checked={autoRejectEnabled} 
                        onChange={(e) => saveAutoRejectSettings(e.target.checked, autoRejectMinScore, autoRejectUnsuitable)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-pink-500"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Minimum Score Threshold Input */}
                    <div className="bg-white p-3.5 rounded-2xl border border-neutral-pink-100/60 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">סף ציון התאמה מינימלי:</span>
                        <span className="bg-neutral-pink-100 text-neutral-pink-800 px-2 py-0.5 rounded-lg text-[10px] font-bold">מתחת ל-{autoRejectMinScore}</span>
                      </div>
                      <input 
                        type="range" 
                        min="20" 
                        max="80" 
                        value={autoRejectMinScore} 
                        onChange={(e) => saveAutoRejectSettings(autoRejectEnabled, parseInt(e.target.value, 10), autoRejectUnsuitable)}
                        className="w-full accent-neutral-pink-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400">
                        <span>20 (סינון מקל)</span>
                        <span>80 (סינון מחמיר)</span>
                      </div>
                    </div>

                    {/* Suitability Category checkbox rule */}
                    <div className="bg-white p-3.5 rounded-2xl border border-neutral-pink-100/60 shadow-sm flex flex-col justify-between space-y-2">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-gray-800 block">סינון לפי קטגוריית התאמה:</span>
                        <p className="text-[10px] text-gray-400">דחה מועמדים שרמת ההתאמה המערכתית שלהם היא "לא מתאים"</p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer self-start">
                        <input 
                          type="checkbox" 
                          checked={autoRejectUnsuitable} 
                          onChange={(e) => saveAutoRejectSettings(autoRejectEnabled, autoRejectMinScore, e.target.checked)}
                          className="rounded border-gray-300 text-neutral-pink-600 focus:ring-neutral-pink-500 h-4 w-4 cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-gray-700">דחה מועמדים "לא מתאימים" 🚫</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Bulk execution dashboard */}
                <div className="md:col-span-4 bg-neutral-pink-50/40 p-4 rounded-2xl border border-neutral-pink-200/40 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5 text-right">
                    <span className="text-[10px] font-bold text-neutral-pink-700 block">הרצה יזומה על מועמדים קיימים 🔍</span>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      באפשרותכם להריץ את כללי הסינון כעת על כל המועמדים הקיימים במערכת כדי לסנן אותם בלחיצת כפתור אחת.
                    </p>
                  </div>
                  <div className="space-y-2 mt-auto">
                    <button
                      type="button"
                      onClick={() => handleRunAutoRejection(filterJobId)}
                      className="w-full py-2 px-4 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer text-center"
                    >
                      <UserX className="w-4 h-4 shrink-0" />
                      <span>הפעל סינון על מועמדים קיימים ⚡</span>
                    </button>
                    <p className="text-[9px] text-gray-400 text-center">
                      * מועמד שיסונן יועבר ל'נדחה' ויקבל תיעוד מפורט בלוג הפעילות שלו.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Candidate List Card layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 cols: candidate grid */}
              <div className="lg:col-span-2 space-y-4">
                
                {filteredCandidates.length === 0 ? (
                  <div className="bg-white/80 p-16 text-center rounded-3xl border border-dashed border-neutral-pink-300/50">
                    <Users className="w-12 h-12 text-neutral-pink-200 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-600">אין מועמדים העונים על תנאי הסינון</p>
                    <p className="text-xs text-gray-400 mt-1">נסו לשנות את מסנני המשרה או ההתאמה ממעל, או בצעו סינונים נוספים בלשונית הקודמת.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence mode="popLayout">
                      {filteredCandidates.map((cand) => {
                        const job = jobs.find(j => j.id === cand.jobId);
                        const isSelected = selectedCandidate?.id === cand.id;
                        return (
                          <motion.div 
                            key={cand.id}
                            layout
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                            onClick={() => setSelectedCandidate(cand)}
                            className={`p-4 rounded-3xl border bg-white shadow-sm hover:shadow transition duration-300 cursor-pointer text-right flex flex-col justify-between ${
                              isSelected 
                                ? "border-neutral-pink-500 ring-2 ring-neutral-pink-200" 
                                : "border-neutral-pink-100"
                            }`}
                          >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${suitabilityColors[cand.suitabilityCategory as SuitabilityCategory]?.bg} ${suitabilityColors[cand.suitabilityCategory as SuitabilityCategory]?.text}`}>
                                  {suitabilityColors[cand.suitabilityCategory as SuitabilityCategory]?.label}
                                </span>
                                <input 
                                  type="checkbox"
                                  checked={compareCandidateIds.includes(cand.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (e.target.checked) {
                                      if (compareCandidateIds.length < 3) {
                                        setCompareCandidateIds([...compareCandidateIds, cand.id]);
                                      } else {
                                        triggerToast("ניתן להשוות עד 3 מועמדים במקביל", "info");
                                      }
                                    } else {
                                      setCompareCandidateIds(compareCandidateIds.filter(id => id !== cand.id));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-neutral-pink-300 text-neutral-pink-600 focus:ring-neutral-pink-500"
                                />
                              </div>
                              
                              <span className="text-[10px] text-gray-400">
                                {new Date(cand.appliedAt).toLocaleDateString('he-IL')}
                              </span>
                            </div>

                            <h3 className="text-sm font-bold text-gray-900 mb-0.5 flex items-center gap-2">
                              {cand.name}
                              {(cand.activityLog || []).some(log => log.reminderDate && !log.isCompleted) && (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] rounded-full font-bold animate-pulse shadow-sm border border-amber-200">
                                  <Bell className="w-2 h-2" />
                                  משימה פתוחה
                                </span>
                              )}
                            </h3>
                            {cand.recruiterRating && (
                              <div className="flex items-center gap-0.5 mb-1.5 text-amber-500" dir="rtl">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-3 h-3 ${i < cand.recruiterRating! ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} 
                                  />
                                ))}
                                <span className="text-[9px] text-amber-600 font-bold mr-1">(הערכת צוות פנימית)</span>
                              </div>
                            )}
                            <p className="text-[11px] text-neutral-pink-700 font-semibold mb-2 flex items-center gap-1.5 flex-wrap">
                              {activeBusinessId === "all-businesses" && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-pink-600 text-white flex items-center gap-0.5">
                                  <Building className="w-2.5 h-2.5" />
                                  {businesses.find(b => b.id === job?.businessId)?.name || "עסק כללי"}
                                </span>
                              )}
                              <span>עבור: {job?.title || "משרה שנמחקה"}</span>
                              {job?.teamName ? <span className="text-gray-400">({job.teamName})</span> : ""}
                            </p>
                            
                            <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-3">
                              {cand.summary}
                            </p>

                            <div className="flex flex-wrap gap-1 mb-4">
                              {cand.skills.slice(0, 4).map((skill, i) => (
                                <span key={i} className="text-[9px] bg-neutral-pink-50 text-neutral-pink-800 px-1.5 py-0.5 rounded border border-neutral-pink-100">
                                  {skill}
                                </span>
                              ))}
                              {cand.skills.length > 4 && (
                                <span className="text-[9px] text-gray-400 font-bold px-1">
                                  +{cand.skills.length - 4} נוספים
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="border-t border-neutral-pink-100/50 pt-3 flex items-center justify-between">
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <span className="w-5 h-5 rounded-full bg-neutral-pink-100 text-neutral-pink-700 text-[10px] font-bold flex items-center justify-center">
                                {cand.suitabilityScore}
                              </span>
                              <span>ציון</span>
                            </span>

                            {/* Status Pill dropdown selector */}
                            <div className="flex items-center gap-1">
                              <select 
                                value={cand.status} 
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleUpdateCandidateStatus(cand.id, e.target.value as CandidateStatus)}
                                className="text-[10px] font-bold bg-neutral-pink-100/60 border border-neutral-pink-200 px-2 py-1 rounded-full text-gray-700 cursor-pointer focus:outline-none"
                              >
                                <option value="new">חדש 🆕</option>
                                <option value="interview_pending">ממתין לראיון 👥</option>
                                <option value="interviewed">עבר ראיון 🗣️</option>
                                <option value="rejected">נדחה 🚫</option>
                                <option value="hired">התקבל 🎉</option>
                              </select>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (deleteConfirmId === cand.id) {
                                    handleDeleteCandidate(cand.id);
                                  } else {
                                    setDeleteConfirmId(cand.id);
                                    setTimeout(() => setDeleteConfirmId(null), 3000);
                                  }
                                }}
                                className={`p-1 rounded-full transition flex items-center gap-1 ${
                                  deleteConfirmId === cand.id 
                                    ? "bg-rose-500 text-white px-2" 
                                    : "text-gray-300 hover:text-rose-500 hover:bg-rose-50"
                                }`}
                                title={deleteConfirmId === cand.id ? "אשר מחיקה" : "מחק מועמד"}
                              >
                                {deleteConfirmId === cand.id ? (
                                  <>
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold">בטוח?</span>
                                  </>
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              </div>

              {/* Right Col: Candidate Detail popup */}
              <div className="bg-white/95 p-6 rounded-3xl border border-neutral-pink-200/80 shadow-md h-fit">
                {selectedCandidate ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-pink-100 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{selectedCandidate.name}</h3>
                        <p className="text-xs text-gray-400">{selectedCandidate.email || "אין מייל שצוין"}</p>
                      </div>
                      <button 
                        onClick={() => {
                          if (deleteConfirmId === `detail-${selectedCandidate.id}`) {
                            handleDeleteCandidate(selectedCandidate.id);
                          } else {
                            setDeleteConfirmId(`detail-${selectedCandidate.id}`);
                            setTimeout(() => setDeleteConfirmId(null), 3000);
                          }
                        }}
                        className={`p-1.5 rounded-full transition flex items-center gap-1 ${
                          deleteConfirmId === `detail-${selectedCandidate.id}` 
                            ? "bg-rose-500 text-white px-2" 
                            : "text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                        }`}
                        title={deleteConfirmId === `detail-${selectedCandidate.id}` ? "אשר מחיקה" : "מחק מועמד"}
                      >
                        {deleteConfirmId === `detail-${selectedCandidate.id}` ? (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">בטוח?</span>
                          </>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-neutral-pink-50/50 p-2.5 rounded-xl border border-neutral-pink-200/30">
                        <span className="text-[10px] text-gray-400 block">טלפון:</span>
                        <span className="font-bold text-gray-800">{selectedCandidate.phone || "לא מצוין"}</span>
                      </div>
                      <div className="bg-neutral-pink-50/50 p-2.5 rounded-xl border border-neutral-pink-200/30">
                        <span className="text-[10px] text-gray-400 block">מקור קובץ:</span>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-gray-800 truncate block text-[10px]" title={selectedCandidate.fileName}>
                            {selectedCandidate.fileName || "הזנה מילולית"}
                          </span>
                          {(selectedCandidate.pdfBase64 || selectedCandidate.cvText) && (
                            <button 
                              onClick={() => setShowCvModal(true)}
                              className="text-neutral-pink-500 hover:text-neutral-pink-700 transition"
                              title="צפה בקו'ח"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Suitability and Score */}
                    <div className="flex items-center justify-between bg-neutral-pink-500/5 p-3 rounded-xl border border-neutral-pink-200/50 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 block">דרגת התאמה והצלב:</span>
                        <span className={`font-bold ${suitabilityColors[selectedCandidate.suitabilityCategory as SuitabilityCategory]?.text}`}>
                          {suitabilityColors[selectedCandidate.suitabilityCategory as SuitabilityCategory]?.label}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] text-gray-400 block">ציון AI:</span>
                        <span className="font-bold text-base text-neutral-pink-700">{selectedCandidate.suitabilityScore}/100</span>
                      </div>
                    </div>

                    {renderCandidateRadarChart(selectedCandidate)}
                    {renderSuitabilityBreakdown(selectedCandidate)}

                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-gray-900">סיכום התאמה והשפעת ה-DNA:</h4>
                      <p className="text-xs text-gray-600 leading-relaxed bg-neutral-pink-50/20 p-3 rounded-xl border border-neutral-pink-100">
                        {selectedCandidate.summary}
                      </p>
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div className="space-y-2">
                      <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-100 text-xs space-y-1">
                        <span className="font-bold text-emerald-800">חוזקות מועמד/ת:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-gray-600 leading-relaxed">
                          {selectedCandidate.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>

                      <div className="bg-rose-50/20 p-3 rounded-xl border border-rose-100 text-xs space-y-1">
                        <span className="font-bold text-rose-800">פערים ונקודות בדיקה:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-gray-600 leading-relaxed">
                          {selectedCandidate.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div className="bg-neutral-pink-100/50 p-3 rounded-xl border border-neutral-pink-200/50 text-xs">
                      <span className="font-bold text-neutral-pink-800 block mb-0.5">המלצת גיוס יישומית:</span>
                      <p className="text-gray-700 font-medium leading-relaxed">{selectedCandidate.recommendation}</p>
                    </div>

                    {/* Recruiter Rating and Internal Notes (Confidential Team Evaluation) */}
                    <div className="bg-amber-50/20 p-4 rounded-2xl border border-amber-200/50 text-xs space-y-3 text-right" dir="rtl">
                      <div className="flex items-center gap-2 border-b border-amber-200/30 pb-2">
                        <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-bold text-gray-900 block text-xs">הערכת מגייס פנימית (חסוי לצוות) 🔒</span>
                          <span className="text-[9px] text-gray-500 block">אינו נגיש למועמד ואינו מבוסס על ניתוח AI</span>
                        </div>
                      </div>

                      {/* Stars Rating */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-700 block">דירוג כוכבים אישי:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((starVal) => {
                            const isFilled = localRecruiterRating !== undefined && starVal <= localRecruiterRating;
                            return (
                              <button
                                key={starVal}
                                type="button"
                                onClick={() => setLocalRecruiterRating(starVal)}
                                className="p-0.5 hover:scale-110 transition cursor-pointer"
                                title={`דירוג ${starVal} כוכבים`}
                              >
                                <Star 
                                  className={`w-5 h-5 ${isFilled ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-300"}`} 
                                />
                              </button>
                            );
                          })}
                          {localRecruiterRating !== undefined && (
                            <button
                              type="button"
                              onClick={() => setLocalRecruiterRating(undefined)}
                              className="text-[9px] text-gray-400 hover:text-rose-500 mr-2 underline cursor-pointer"
                            >
                              איפוס
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Confidential Notes */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-700 block">הערות פנימיות חסויות לצוות:</span>
                        <textarea
                          rows={3}
                          placeholder="הוסיפו הערות פנימיות חסויות (למשל: דרישות שכר, התרשמות ראשונית, מוטיבציה, דגשים לבדיקת ממליצים...)"
                          value={localInternalNotes}
                          onChange={(e) => setLocalInternalNotes(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-300 focus:border-amber-400 transition resize-none leading-relaxed placeholder:text-[10px] placeholder:text-gray-400"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpdateRecruiterFeedback(selectedCandidate.id, localRecruiterRating, localInternalNotes)}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-full shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Lock className="w-3 h-3" />
                        <span>שמור הערכה פנימית 💾</span>
                      </button>
                    </div>

                    {/* Change Status select */}
                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] text-gray-400 font-bold block">עדכן סטטוס מועמד/ת שוטף:</span>
                      <div className="flex flex-wrap gap-1">
                        {(["new", "interview_pending", "interviewed", "rejected", "hired"] as CandidateStatus[]).map((st) => (
                          <button
                            key={st}
                            onClick={() => handleUpdateCandidateStatus(selectedCandidate.id, st)}
                            className={`px-2 py-1 rounded-full text-[10px] font-bold transition border ${
                              selectedCandidate.status === st 
                                ? "bg-neutral-pink-500 text-white border-transparent" 
                                : "bg-neutral-pink-100/50 text-neutral-pink-800 border-neutral-pink-200 hover:bg-neutral-pink-100"
                            }`}
                          >
                            {statusMap[st].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Email Dispatcher (תקשורת מהירה וטמפלטים) */}
                    <div className="bg-neutral-pink-50/40 p-4 rounded-2xl border border-neutral-pink-200/40 text-xs space-y-3 text-right" dir="rtl">
                      <div className="flex items-center justify-between border-b border-neutral-pink-200/30 pb-2">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-neutral-pink-600 shrink-0" />
                          <span className="font-bold text-gray-900 text-xs">שליחת מייל מהיר וטמפלטים ✉️</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEmailBoxOpen(!isEmailBoxOpen)}
                          className="text-[10px] text-neutral-pink-600 hover:text-neutral-pink-700 font-bold underline cursor-pointer"
                        >
                          {isEmailBoxOpen ? "הסתר ✖" : "הצג עורך ✎"}
                        </button>
                      </div>

                      {isEmailBoxOpen && (
                        <div className="space-y-3 animate-fadeIn">
                          {/* Template Type selection */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-400 font-bold block">בחרו תבנית פנייה:</span>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setEmailTemplateType("interview")}
                                className={`py-1.5 px-3 rounded-xl border font-bold text-[10px] text-center transition cursor-pointer ${
                                  emailTemplateType === "interview"
                                    ? "bg-neutral-pink-100 border-neutral-pink-300 text-neutral-pink-800"
                                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                📞 זימון לראיון ראשוני
                              </button>
                              <button
                                type="button"
                                onClick={() => setEmailTemplateType("rejection")}
                                className={`py-1.5 px-3 rounded-xl border font-bold text-[10px] text-center transition cursor-pointer ${
                                  emailTemplateType === "rejection"
                                    ? "bg-rose-100 border-rose-300 text-rose-800"
                                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                🚫 מכתב סיום תהליך (דחייה)
                              </button>
                            </div>
                          </div>

                          {/* Email subject input */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-700 block">נושא המכתב:</label>
                            <input
                              type="text"
                              value={emailSubject}
                              onChange={(e) => setEmailSubject(e.target.value)}
                              placeholder="הזינו נושא למייל..."
                              className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-neutral-pink-300 focus:border-neutral-pink-400 transition"
                            />
                          </div>

                          {/* Email body text area */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-700 block">תוכן המייל (ניתן לערוך בחופשיות):</label>
                            <textarea
                              rows={6}
                              value={emailBody}
                              onChange={(e) => setEmailBody(e.target.value)}
                              placeholder="הקלידו או ערכו את תוכן ההודעה..."
                              className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-neutral-pink-300 focus:border-neutral-pink-400 transition resize-none leading-relaxed"
                            />
                          </div>

                          {/* Trigger Send */}
                          <button
                            type="button"
                            onClick={handleSendQuickEmail}
                            className="w-full py-2.5 bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white font-bold text-xs rounded-full shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Send className="w-4 h-4" />
                            <span>הכן טיוטה ופתח בתוכנת המייל ✉️</span>
                          </button>

                          {/* Interactive Audit Confirmation */}
                          {showEmailConfirmation && (
                            <div className="mt-3 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-right space-y-3 animate-fadeIn">
                              <div className="flex items-center gap-2 text-amber-800">
                                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                                <span className="font-bold">בקרה: האם המייל אכן נשלח בתוכנת הדואר? 📬</span>
                              </div>
                              <p className="text-gray-600 text-[11px] leading-relaxed">
                                פתחנו עבורך את הטיוטה בתוכנת המייל החיצונית. אנא אשרו כאן האם שלחתם את ההודעה בפועל כדי לשמור על תיעוד היסטורי מדויק ומבוקר בתיק המועמד:
                              </p>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmEmailSent(true)}
                                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-xl shadow transition cursor-pointer text-center"
                                >
                                  כן, המייל נשלח בפועל! ✅
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmEmailSent(false)}
                                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-xl shadow transition cursor-pointer text-center"
                                >
                                  השאר כטיוטה בלבד ⏳
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEmailLog}
                                  className="py-2 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-[10px] rounded-xl transition cursor-pointer text-center"
                                >
                                  בטל תיעוד 🗑️
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {renderActivityLog()}
                  </div>
                ) : (
                  <div className="py-20 text-center text-gray-400">
                    <Users className="w-10 h-10 text-neutral-pink-200 mx-auto mb-3 animate-bounce" />
                    <p className="text-xs font-bold">בחרו מועמד/ת מן הרשימה כדי לראות את כרטיס הסינון המלא והמפורט שלו</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Floating comparison bar at the bottom */}
      <AnimatePresence>
        {compareCandidateIds.length > 0 && currentTab !== "compare-candidates" && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md border border-neutral-pink-200 shadow-xl px-5 py-3 rounded-full flex items-center gap-4 w-[90%] sm:w-auto justify-between sm:justify-start"
          >
            <span className="text-xs font-bold text-gray-800">
              נבחרו {compareCandidateIds.length} מועמדים להשוואה
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentTab("compare-candidates")}
                className="bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white text-[11px] sm:text-xs font-bold px-4 py-2 rounded-full shadow transition shrink-0 cursor-pointer"
              >
                השווה כעת
              </button>
              <button
                onClick={() => setCompareCandidateIds([])}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-full transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="border-t border-neutral-pink-200/70 bg-white/40 py-5 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} מסננת - מסנן קורות חיים חכם מבוסס AI • עיצוב ורדרד ניטרלי</p>
          <div className="flex gap-4">
            <span>היררכיה מלאה: עסק ← מחלקה ← משרה ← מועמד</span>
          </div>
        </div>
      </footer>

      {/* Inline Business Modal */}
      <AnimatePresence>
        {showBusinessModal && (
          <div className="fixed inset-0 bg-neutral-pink-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-right">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-3xl border border-neutral-pink-200 shadow-xl w-full max-w-lg text-right"
            >
              <div className="flex items-center gap-2 mb-4">
                {editingBusiness ? <Settings className="w-5 h-5 text-neutral-pink-500" /> : <Plus className="w-5 h-5 text-neutral-pink-500" />}
                <h3 className="text-base font-bold text-gray-900">
                  {editingBusiness ? `עריכת עסק: ${editingBusiness.name}` : "הקמת עסק נוסף במערכת"}
                </h3>
              </div>

              <form onSubmit={handleCreateBusiness} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">שם העסק / החברה *</label>
                    <input
                      type="text"
                      required
                      placeholder="למשל: קפה סלון, נובה סופט"
                      value={bizName}
                      onChange={(e) => setBizName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-pink-200 bg-neutral-pink-50/20 focus:outline-none focus:border-neutral-pink-400 focus:ring-1 focus:ring-neutral-pink-300 text-xs transition text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">תחום עיסוק *</label>
                    <input
                      type="text"
                      required
                      placeholder="למשל: הייטק, מסעדנות, רואי חשבון"
                      list="industry-suggestions-modal"
                      value={bizIndustry}
                      onChange={(e) => setBizIndustry(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-pink-200 bg-neutral-pink-50/20 focus:outline-none focus:border-neutral-pink-400 focus:ring-1 focus:ring-neutral-pink-300 text-xs transition text-right"
                    />
                    <datalist id="industry-suggestions-modal">
                      <option value="הייטק וטכנולוגיה" />
                      <option value="פירמת רואי חשבון" />
                      <option value="מסעדנות ואירוח" />
                      <option value="קמעונאות" />
                      <option value="פיננסים ושוק ההון" />
                      <option value="עריכת דין" />
                      <option value="שירות לקוחות" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">מיקום מרכזי (עיר/אזור)</label>
                    <input
                      type="text"
                      placeholder="למשל: תל אביב, חיפה, מרוחק"
                      value={bizLocation}
                      onChange={(e) => setBizLocation(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-pink-200 bg-neutral-pink-50/20 focus:outline-none focus:border-neutral-pink-400 focus:ring-1 focus:ring-neutral-pink-300 text-xs transition text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">גודל העסק וכמות עובדים</label>
                    <select
                      value={bizSize}
                      onChange={(e) => setBizSize(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-pink-200 bg-neutral-pink-50/20 focus:outline-none focus:border-neutral-pink-400 text-xs transition text-right"
                    >
                      <option value="1-10 עובדים">1-10 עובדים (עסק קטן)</option>
                      <option value="11-50 עובדים">11-50 עובדים (סטארטאפ/עסק בינוני)</option>
                      <option value="51-200 עובדים">51-200 עובדים (חברה גדולה)</option>
                      <option value="200+ עובדים">200+ עובדים (ארגון גדול)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">תיאור קצר של העסק ופועלו</label>
                  <textarea
                    rows={3}
                    placeholder="ספרו בכמה מילים על השירותים או המוצרים שלכם..."
                    value={bizDescription}
                    onChange={(e) => setBizDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-pink-200 bg-neutral-pink-50/20 focus:outline-none focus:border-neutral-pink-400 focus:ring-1 focus:ring-neutral-pink-300 text-xs transition text-right"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {editingBusiness ? (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = businesses.map(b => b.id === editingBusiness.id ? {
                          ...b,
                          name: bizName,
                          industry: bizIndustry,
                          location: bizLocation,
                          size: bizSize,
                          description: bizDescription
                        } : b);
                        saveBusinesses(updated);
                        setEditingBusiness(null);
                        setBizName("");
                        setBizIndustry("");
                        setBizLocation("");
                        setBizDescription("");
                        setShowBusinessModal(false);
                        triggerToast("פרטי העסק עודכנו בהצלחה", "success");
                      }}
                      className="text-[10px] font-bold text-gray-400 hover:text-neutral-pink-600 underline"
                    >
                      עדכן פרטים בלבד (ללא אפיון מחדש)
                    </button>
                  ) : <div />}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBusinessModal(false);
                        setEditingBusiness(null);
                        setBizName("");
                        setBizIndustry("");
                        setBizLocation("");
                        setBizDescription("");
                      }}
                      className="px-6 py-2.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition text-xs font-bold"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      disabled={isGeneratingQuestions}
                      className="bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white font-bold text-xs rounded-full px-6 py-2.5 transition flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      {isGeneratingQuestions ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>מנתח ומפיק שאלון...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>{editingBusiness ? 'עדכן ונהל אפיון DNA ✨' : 'המשך לאפיון DNA ✨'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inline Team Modal */}
      <AnimatePresence>
        {showTeamModal && (
          <div className="fixed inset-0 bg-neutral-pink-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-right">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-3xl border border-neutral-pink-200 shadow-xl w-full max-w-sm text-right"
            >
              <h3 className="text-base font-bold text-gray-900 mb-2">
                {editingTeam ? `עריכת צוות: ${editingTeam.name}` : 'הוספת צוות חדש'}
              </h3>
              <p className="text-xs text-gray-400 mb-4 text-right">
                עדכנו את שם הצוות במחלקה
              </p>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                if (editingTeam) {
                  const updated = teams.map(t => t.id === editingTeam.id ? { ...t, name: newTeamName } : t);
                  saveTeams(updated);
                  triggerToast("הצוות עודכן בהצלחה");
                }
                setEditingTeam(null);
                setNewTeamName("");
                setShowTeamModal(false);
              }} className="space-y-4 text-right">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">שם הצוות</label>
                  <input 
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="לדוגמה: צוות פיתוח backend..."
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-pink-200 bg-neutral-pink-50/20 focus:outline-none focus:border-neutral-pink-400 focus:ring-1 focus:ring-neutral-pink-300 text-xs transition text-right"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTeamModal(false)}
                    className="px-6 py-2.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition text-xs font-bold"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    className="bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white font-bold text-xs rounded-full px-6 py-2.5 transition flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    עדכן שם צוות
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inline Department Modal */}
      <AnimatePresence>
        {showAddDeptModal && (
          <div className="fixed inset-0 bg-neutral-pink-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-right">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`bg-white p-6 rounded-3xl border border-neutral-pink-200 shadow-xl w-full text-right transition-all ${isDeptOnboarding ? 'max-w-2xl' : 'max-w-sm'}`}
            >
              <h3 className="text-base font-bold text-gray-900 mb-2">
                {isDeptOnboarding ? `שאלון התאמה: מחלקת ${newDeptName}` : editingDepartment ? `עריכת מחלקה: ${editingDepartment.name}` : 'הוספת מחלקה חדשה לעסק'}
              </h3>
              <p className="text-xs text-gray-400 mb-4 text-right">
                {isDeptOnboarding 
                  ? 'ענו על השאלות כדי לעזור ל-AI להבין את ה-DNA הספציפי של המחלקה' 
                  : editingDepartment ? 'עדכנו את שם המחלקה בעסק' : `המחלקה תשויך לעסק הפעיל: ${activeBusiness?.name}`
                }
              </p>
              
              {!isDeptOnboarding ? (
                <form onSubmit={handleCreateDepartment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">שם המחלקה</label>
                    <input 
                      type="text"
                      required
                      placeholder="לדוגמה: כספים, הנדסה, תפעול..."
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-neutral-pink-200 bg-neutral-pink-50/20 focus:outline-none focus:border-neutral-pink-400 text-xs text-right"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {editingDepartment ? (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = departments.map(d => d.id === editingDepartment.id ? { ...d, name: newDeptName } : d);
                          saveDepartments(updated);
                          setEditingDepartment(null);
                          setNewDeptName("");
                          setShowAddDeptModal(false);
                          triggerToast("שם המחלקה עודכן בהצלחה", "success");
                        }}
                        className="text-[10px] font-bold text-gray-400 hover:text-neutral-pink-600 underline"
                      >
                        עדכן שם בלבד (ללא אפיון מחדש)
                      </button>
                    ) : <div />}
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddDeptModal(false);
                          setEditingDepartment(null);
                          setNewDeptName("");
                        }}
                        className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 rounded-full"
                      >
                        ביטול
                      </button>
                      <button
                        type="submit"
                        disabled={isGeneratingDeptQuestions}
                        className="bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white font-bold text-xs px-5 py-2 rounded-full shadow-sm flex items-center gap-2"
                      >
                        {isGeneratingDeptQuestions ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>מפיק שאלון...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{editingDepartment ? 'עדכן ונהל אפיון DNA ✨' : 'המשך לשאלון DNA ✨'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSynthesizeDeptDNA} className="space-y-6">
                  <div className="max-h-[60vh] overflow-y-auto px-1 space-y-6 custom-scrollbar text-right">
                    {renderDeptQuestionsByCategory()}
                  </div>

                  <div className="flex justify-end gap-2.5 border-t border-neutral-pink-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsDeptOnboarding(false)}
                      className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 rounded-full"
                    >
                      חזור
                    </button>
                    <button
                      type="submit"
                      disabled={isSynthesizingDeptDna}
                      className="bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-sm flex items-center gap-2"
                    >
                      {isSynthesizingDeptDna ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>מסנתז DNA מחלקתי...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>סיים והקם מחלקה ✨</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Team Onboarding Modal */}
      <AnimatePresence>
        {isTeamOnboarding && (
          <div className="fixed inset-0 bg-neutral-pink-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white p-8 rounded-[2.5rem] border border-neutral-pink-200 shadow-2xl w-full max-w-2xl text-right overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-neutral-pink-400 to-neutral-pink-600" />
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-pink-100 flex items-center justify-center text-neutral-pink-500 shadow-inner">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">אפיון DNA לצוות: {newTeamNameForOnboarding}</h3>
                    <p className="text-xs text-gray-400">ה-AI הפיק שאלון ממוקד לצוות הספציפי בתוך המחלקה</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsTeamOnboarding(false)}
                  className="w-10 h-10 rounded-full hover:bg-neutral-pink-50 flex items-center justify-center text-gray-400 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSynthesizeTeamDNA} className="space-y-6">
                <div className="max-h-[50vh] overflow-y-auto px-2 space-y-5 custom-scrollbar text-right">
                  <div className="bg-neutral-pink-50/50 p-4 rounded-2xl border border-neutral-pink-100 mb-6">
                    <p className="text-xs text-neutral-pink-800 leading-relaxed font-medium">
                      הצוות פועל תחת מחלקת <span className="font-bold underlineDecoration-neutral-pink-300">{departments.find(d => d.id === targetDeptIdForTeamOnboarding)?.name}</span>. 
                      השאלות הבאות נועדו לחדד את האופי הייחודי של הצוות הזה.
                    </p>
                  </div>
                  {renderTeamQuestions()}
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-neutral-pink-100 mt-4">
                  <p className="text-[10px] text-gray-400 italic">* השאלון מתמקד באופי הצוות והסביבה, לא בתפקידך האישי</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsTeamOnboarding(false)}
                      className="px-6 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      disabled={isSynthesizingTeamDna}
                      className="bg-neutral-pink-500 hover:bg-neutral-pink-600 text-white font-bold text-sm px-8 py-2.5 rounded-full shadow-lg shadow-neutral-pink-200 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isSynthesizingTeamDna ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>מאפיין DNA...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>צור צוות ואפיין DNA ✨</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {renderGuideModal()}
      {renderCvModal()}
      {renderSummaryModal()}
      <AnimatePresence>
        {taskModalOpen && renderTaskModal()}
      </AnimatePresence>
    </div>
  );
}
