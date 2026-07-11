import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'he';

export interface TranslationDictionary {
  appName: string;
  elementaryTraining: string;
  tab_practice: string;
  tab_erd: string;
  tab_completed: string;
  tab_learning: string;
  tab_exams: string;
  tab_daily: string;
  logout: string;
  loadingProfile: string;
  loadingSystem: string;
  login_desc: string;
  login_google: string;
  secure_env: string;
  user: string;
  erd_title: string;
  erd_desc: string;
  erd_insurance_tables: string;
  erd_relationship_tip: string;
  cq_title: string;
  cq_desc: string;
  cq_no_queries: string;
  cq_score: string;
  cq_date: string;
  cq_difficulty: string;
  lp_title: string;
  lp_desc: string;
  lp_under_practiced: string;
  lp_achievements: string;
  exams_title: string;
  exams_desc: string;
  exams_questions_count: string;
  exams_recommend_time: string;
  exams_start: string;
  exams_score_range: string;
  exams_unanswered: string;
  exams_submit: string;
  exams_view_solution: string;
  exams_difficulty: string;
  exams_sql_topics: string;
  exams_ins_topics: string;
  exams_new: string;
  exams_setup_title: string;
  exams_pool_matching: string;
  exams_minutes: string;
  exams_points: string;
  exams_memo_title: string;
  exams_memo_desc1: string;
  exams_memo_desc2: string;
  exams_memo_desc3: string;
  exams_nav_title: string;
  exams_nav_status: string;
  exams_sandbox_desc: string;
  exams_run_query: string;
  exams_running_sim: string;
  exams_sandbox_title: string;
  exams_rows_returned: string;
  exams_syntax_error: string;
  exams_no_query_run: string;
  exams_rel_table_details: string;
  exams_table_tip: string;
  exams_delayed_title: string;
  exams_delayed_desc: string;
  exams_graded_results: string;
  exams_total_score: string;
  exams_solved_count: string;
  exams_feedback_details: string;
  exams_your_answer: string;
  exams_correct_answer: string;
  exams_explanation_ai: string;
  exams_feedback_ai: string;
  profile_setup_title: string;
  profile_setup_desc: string;
  profile_setup_insurance_exp: string;
  profile_setup_sql_exp: string;
  profile_setup_complete: string;
}

const translations: Record<Language, TranslationDictionary> = {
  he: {
    appName: 'SQL Insurance',
    elementaryTraining: 'פלטפורמת תרגול SQL לענף הביטוח',
    tab_practice: 'תרגול שאילתות',
    tab_erd: 'תרשים ERD',
    tab_completed: 'שאילתות שביצעתי',
    tab_learning: 'חומרי למידה',
    tab_exams: 'מבחנים',
    tab_daily: 'יומי',
    logout: 'התנתק',
    loadingProfile: 'טוען פרופיל משתמש...',
    loadingSystem: 'טוען את המערכת...',
    login_desc: 'התחבר כדי לשמור את היסטוריית התרגולים שלך, לעקוב אחר ההתקדמות ולגשת לתרגילים מכל מכשיר.',
    login_google: 'התחבר עם Google',
    secure_env: 'סביבת אימון מאובטחת',
    user: 'משתמש',
    erd_title: 'תרשים מבנה מסד הנתונים (ERD)',
    erd_desc: 'תרשים זה מתאר את מבנה הטבלאות, העמודות וקשרי הגומלין ביניהן בעולם הליבה הביטוחי של אלמנטרי.',
    erd_insurance_tables: 'טבלאות ליבה ביטוחיות',
    erd_relationship_tip: 'לחץ על טבלה כדי להדגיש את קשרי הגומלין שלה עם טבלאות אחרות.',
    cq_title: 'היסטוריית שאילתות ביצוע',
    cq_desc: 'שאילתות SQL שהרצת והגשת, כולל ציונים, פידבקים ופתרונות של מנוע ה-AI.',
    cq_no_queries: 'לא נמצאו שאילתות בהיסטוריה שלך',
    cq_score: 'ציון',
    cq_date: 'תאריך',
    cq_difficulty: 'דרגת קושי',
    lp_title: 'תהליך למידה והתקדמות',
    lp_desc: 'ניתוח ביצועים אישי של נושאי ה-SQL והמושגים הביטוחיים השונים.',
    lp_under_practiced: 'נושאים שדורשים תירגול',
    lp_achievements: 'הישגים שרכשת',
    exams_title: 'סימולטור מבחנים מקצועי ב-SQL וביטוח',
    exams_desc: 'מערכת הערכה מתקדמת המשלבת ניתוח משקלי של דרגות קושי וחיתוך חוקים ביטוחיים.',
    exams_questions_count: 'סך השאלות במבחן:',
    exams_recommend_time: 'זמן פתרון מומלץ ומותאם:',
    exams_start: 'התחל סימולציית מבחן',
    exams_score_range: 'טווח ציון אבטחה:',
    exams_unanswered: 'נותרו ללא מענה:',
    exams_submit: 'הגש מבחן פתור',
    exams_view_solution: 'צפי בפתרון והסבר',
    exams_difficulty: 'דרגות קושי',
    exams_sql_topics: 'נושאי SQL / שאילתות',
    exams_ins_topics: 'נושאי ביטוח',
    exams_new: 'מבחן חדש',
    exams_setup_title: 'קביעת כמות שאלות המבחן',
    exams_pool_matching: 'מאגר שאלות מתאימות:',
    exams_minutes: 'דקות',
    exams_points: 'נקודות',
    exams_memo_title: 'מידע חשוב לנבחנים:',
    exams_memo_desc1: 'במהלך המבחן תוכלי להריץ ולבדוק את השאילתה שלך על גבי מנוע ביטוחי אמיתי.',
    exams_memo_desc2: 'לא יינתנו רמזים, פידבקים או פתרונות במהלך המבחן עצמו.',
    exams_memo_desc3: 'רק לאחר הגשת המבחן (או תום הזמן המוקצב), המערכת תבצע בדיקה מעמיקה לכל שאילתה ותציג ציונים ופידבקים מפורטים.',
    exams_nav_title: 'ניווט שאלות',
    exams_nav_status: 'מצב התקדמות פתרונות:',
    exams_sandbox_desc: 'הריצי פילטר לבדיקה מול מסד הנתונים כדי לוודא שאינך מקבלת שגיאות סינטקס.',
    exams_run_query: 'הרץ שאילתה',
    exams_running_sim: 'מריץ סימולציה...',
    exams_sandbox_title: 'תוצאת סימולציה',
    exams_rows_returned: 'שורות הוחזרו',
    exams_syntax_error: 'שגיאת מנוע SQL:',
    exams_no_query_run: 'לא הורצה שאילתה עבור שאלה זו עדיין',
    exams_rel_table_details: 'פרטי טבלאות קשורות:',
    exams_table_tip: 'השתמשי בטבלאות ממפת ה-ERD. זכרי שחיבור תביעות לתשלומי תביעות דורש מעבר בטבלת Claimants באמצעות claimant_id.',
    exams_delayed_title: 'פתרון ורמזים דחויים',
    exams_delayed_desc: 'המערכת נמצאת במצב בחינה רשמי. לא ניתן לראות רמזים או שאילתה פתורה עד לסיום והגשת כל השאלות.',
    exams_graded_results: 'תוצאות והערכת מבחן',
    exams_total_score: 'ציון מבחן משוקלל',
    exams_solved_count: 'שאלות שנפתרו בהצלחה:',
    exams_feedback_details: 'פירוט פתרונות ופידבקים לכל שאלה במבחן:',
    exams_your_answer: 'התשובה שכתבת:',
    exams_correct_answer: 'תשובה נכונה מומלצת:',
    exams_explanation_ai: 'הסבר ה-SQL הביטוחי:',
    exams_feedback_ai: 'פידבק והערכת AI:',
    profile_setup_title: 'הגדרת פרופיל למידה',
    profile_setup_desc: 'כדי שנתאים את חווית התרגול והשאלות לרמה המקצועית שלך, נשמח להכיר אותך טוב יותר.',
    profile_setup_insurance_exp: 'ניסיון מקצועי בעולם הביטוח:',
    profile_setup_sql_exp: 'ניסיון קודם בכתיבת שאילתות SQL:',
    profile_setup_complete: 'שמור והמשך לתרגול'
  },
  en: {
    appName: 'SQL Insurance',
    elementaryTraining: 'Actuarial SQL Practice & Training Platform',
    tab_practice: 'SQL Practice',
    tab_erd: 'ERD Database Schema',
    tab_completed: 'Query History',
    tab_learning: 'Study Materials',
    tab_exams: 'Exams',
    tab_daily: 'Daily',
    logout: 'Logout',
    loadingProfile: 'Loading user profile...',
    loadingSystem: 'Loading system...',
    login_desc: 'Sign in to save your practice history, track progress, and access exercises from any device.',
    login_google: 'Sign in with Google',
    secure_env: 'Secure Training Environment',
    user: 'User',
    erd_title: 'Database Schema Diagram (ERD)',
    erd_desc: 'This diagram describes the elementary insurance core database structure, including tables, columns and relationships.',
    erd_insurance_tables: 'Core Insurance Tables',
    erd_relationship_tip: 'Click on a table to highlight its relationships with other tables.',
    cq_title: 'Query History & Submissions',
    cq_desc: 'SQL queries you have executed and submitted, including scores, feedabcks, and AI models answers.',
    cq_no_queries: 'No queries found in your history',
    cq_score: 'Score',
    cq_date: 'Date',
    cq_difficulty: 'Difficulty',
    lp_title: 'Learning Progress & Dashboards',
    lp_desc: 'Personalized Performance Analysis on SQL Topics and Insurance Domains.',
    lp_under_practiced: 'Topics Needing Practice',
    lp_achievements: 'Unlocked Achievements',
    exams_title: 'Actuarial & SQL Exam Simulator',
    exams_desc: 'Advanced assessment system combining weighted difficulty levels and policy rule slicing.',
    exams_questions_count: 'Total Exam Questions:',
    exams_recommend_time: 'Recommended Allocated Time:',
    exams_start: 'Start Exam Simulation',
    exams_score_range: 'Score Range Margin:',
    exams_unanswered: 'Remaining Unanswered:',
    exams_submit: 'Submit Exam',
    exams_view_solution: 'View Solutions & Feedback',
    exams_difficulty: 'Difficulties',
    exams_sql_topics: 'SQL / Query Topics',
    exams_ins_topics: 'Insurance Domains',
    exams_new: 'New Exam',
    exams_setup_title: 'Configure Exam Questions',
    exams_pool_matching: 'Matching Pool Questions:',
    exams_minutes: 'minutes',
    exams_points: 'points',
    exams_memo_title: 'Important Exam Guidelines:',
    exams_memo_desc1: 'During the exam, you can execute and test your query against a live insurance database.',
    exams_memo_desc2: 'No hints, reviews, or correct answers are displayed during the active exam session.',
    exams_memo_desc3: 'Upon submission or timeout, the AI engine evaluates all queries, calculating weighted scores and structured feedback.',
    exams_nav_title: 'Exam Navigation',
    exams_nav_status: 'Solution Progress Status:',
    exams_sandbox_desc: 'Run queries to inspect execution rows and eliminate SQL syntax or relational errors.',
    exams_run_query: 'Execute Query',
    exams_running_sim: 'Running simulation...',
    exams_sandbox_title: 'Sandbox Response',
    exams_rows_returned: 'rows returned',
    exams_syntax_error: 'SQL Engine Error:',
    exams_no_query_run: 'No query executed for this question yet',
    exams_rel_table_details: 'Related Table Details:',
    exams_table_tip: 'Use standard ERD schema tables. Remember that joining claims to claim payouts requires passing through Claimants via claimant_id.',
    exams_delayed_title: 'Hints & Solutions Locked',
    exams_delayed_desc: 'The exam is in official mode. Hints and reference solutions are hidden until final submission.',
    exams_graded_results: 'Graded Exam Results',
    exams_total_score: 'Weighted Exam Score',
    exams_solved_count: 'Successfully Solved Questions:',
    exams_feedback_details: 'Detailed Solutions & Feeback per Question:',
    exams_your_answer: 'Your submitted query:',
    exams_correct_answer: 'Recommended correct query:',
    exams_explanation_ai: 'Actuarial SQL Explanation:',
    exams_feedback_ai: 'AI Grading Analysis:',
    profile_setup_title: 'Configure Your Learning Profile',
    profile_setup_desc: 'To fit exercises and training guidelines to your background, we would love to know more about you.',
    profile_setup_insurance_exp: 'Insurance Professional Background:',
    profile_setup_sql_exp: 'Prior SQL Query Experience:',
    profile_setup_complete: 'Save & Start Training'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationDictionary) => string;
  dir: 'rtl' | 'ltr';
  isHe: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved === 'en' || saved === 'he') ? (saved as Language) : 'he';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: keyof TranslationDictionary): string => {
    return translations[language][key] || translations['he'][key] || String(key);
  };

  const dir = language === 'he' ? 'rtl' : 'ltr';
  const isHe = language === 'he';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, isHe }}>
      <div dir={dir} style={{ direction: dir }} className="h-full w-full">
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
