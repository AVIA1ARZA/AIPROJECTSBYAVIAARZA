import { Business, Department, Job, Candidate } from "./types";

export const initialBusinesses: Business[] = [
  {
    id: "biz-1",
    name: "נובה סופט בע\"מ",
    industry: "הייטק ותוכנה",
    location: "תל אביב (היברידי)",
    size: "11-50 עובדים",
    description: "חברת סטארטאפ המפתחת פלטפורמות ענן מתקדמות ופתרונות ניהול מבוססי AI לחברות קמעונאיות.",
    createdAt: "2026-06-01T08:00:00Z",
    questions: [
      {
        id: "q-1",
        question: "מהו תחום הפעילות המרכזי של החברה?",
        category: "industry",
        type: "select",
        options: ["פינטק", "בריאות/טק", "ביטוח", "קמעונאות", "סייבר", "אחר"],
        placeholder: "פרט כאן במידת הצורך..."
      },
      {
        id: "q-2",
        question: "מהו המודל העסקי המרכזי?",
        category: "industry",
        type: "select",
        options: ["B2B SaaS", "B2C", "B2B2C", "פרויקטאלי", "שירותים מנוהלים"],
        placeholder: "פרט כאן במידת הצורך..."
      },
      {
        id: "q-3",
        question: "מהו גודל החברה הנוכחי?",
        category: "scale",
        type: "select",
        options: ["1-10", "11-50", "51-200", "201-1000", "1000+"],
        placeholder: "פרט כאן במידת הצורך..."
      },
      {
        id: "q-4",
        question: "איך היית מגדיר את קצב העבודה?",
        category: "culture",
        type: "select",
        options: ["דינמי ומשתנה", "יציב ומובנה"],
        placeholder: "פרט כאן במידת הצורך..."
      }
    ],
    answers: {
      "q-1_select": "הייטק ותוכנה",
      "q-1": "סטארטאפ בתחום הקמעונאות הדיגיטלית.",
      "q-2_select": "B2B SaaS",
      "q-3_select": "11-50",
      "q-4_select": "דינמי ומשתנה",
      "q-4": "תרבות של סטארטאפ קלאסי - קצב מהיר, משימות דינמיות."
    },
    dnaSummary: "נובה סופט היא חברת סטארטאפ צעירה ותוססת (גילאי 25-40) הפועלת במודל היברידי מתל אביב בקצב מהיר ודינמי. החברה שמה דגש עליון על עובדים עצמאיים עם ראש גדול ויחסי אנוש מעולים שיכולים להשתלב חברתית ומקצועית, ומחפשים הזדמנות לצמוח במהירות בסביבה חדשנית וגמישה."
  },
  {
    id: "biz-2",
    name: "גולדשטיין ושות' - פירמת רואי חשבון",
    industry: "פירמת רואי חשבון",
    location: "רמת גן (משרד)",
    size: "51-200 עובדים",
    description: "פירמת רואי חשבון מובילה המתמחה בביקורת לחברות ציבוריות, מיסוי בינלאומי וייעוץ כלכלי.",
    createdAt: "2026-07-01T09:00:00Z",
    questions: [
      {
        id: "aq-1",
        question: "מהן ההתמחויות המרכזיות של הפירמה?",
        category: "industry",
        type: "select",
        options: ["ביקורת", "מסים", "ייעוץ כלכלי", "ניהול סיכונים", "ליווי הנפקות"],
        placeholder: "פרט כאן..."
      },
      {
        id: "aq-2",
        question: "כיצד הפירמה מתמודדת עם תקופות 'עונת הלחץ' (Busy Season)?",
        category: "culture",
        type: "select",
        options: ["שעות עבודה אינטנסיביות", "תגבור של כוח אדם חיצוני", "חלוקת עומסים גמישה"],
        placeholder: "פרט כאן..."
      }
    ],
    answers: {
      "aq-1_select": "ביקורת",
      "aq-2_select": "שעות עבודה אינטנסיביות"
    },
    dnaSummary: "פירמת גולדשטיין ושות' מתאפיינת בתרבות ארגונית שמרנית ומקצועית מאוד, המקדשת דיוק, אתיקה מקצועית ועמידה קפדנית בלוחות זמנים. העבודה מתבצעת בעיקר מהמשרד בבורסה ברמת גן, ובמהלך עונת הדוחות קיימת ציפייה למחויבות גבוהה ושעות עבודה מאומצות. אנחנו מחפשים אנשי מקצוע יסודיים, בעלי יכולת אנליטית גבוהה ותודעת שירות מעולה ללקוחות הפירמה."
  },
  {
    id: "other-business",
    name: "כללי / ללא שיוך",
    industry: "כללי",
    location: "כל הארץ",
    size: "N/A",
    description: "עסק כללי עבור משרות שאינן משויכות לישות עסקית ספציפית.",
    questions: [],
    answers: {},
    dnaSummary: "פרופיל כללי - גמישות והתאמה רחבה.",
    createdAt: new Date().toISOString()
  }
];

export const initialDepartments: Department[] = [
  {
    id: "dept-1",
    businessId: "biz-1",
    name: "פיתוח ותוכנה (R&D)",
    dnaSummary: "מחלקת הפיתוח של נובה סופט מתאפיינת בעבודה סינרגטית גבוהה, שימוש בטכנולוגיות מודרניות כמו React ו-Node.js, ודגש על דליברי מהיר של קוד איכותי בסביבה דינמית.",
    createdAt: "2026-06-01T08:05:00Z"
  },
  {
    id: "dept-2",
    businessId: "biz-1",
    name: "מוצר ועיצוב",
    dnaSummary: "צוות המוצר שלנו פועל בחיבור הדוק בין צרכי השוק לטכנולוגיה, עם דגש על חוויית משתמש (UX) מעולה וקבלת החלטות מבוססת נתונים.",
    createdAt: "2026-06-01T08:10:00Z"
  },
  {
    id: "dept-3",
    businessId: "biz-1",
    name: "שיווק ודיגיטל",
    dnaSummary: "צוות השיווק פועל בזירה הגלובלית, עם אוריינטציה חזקה לביצועים (Performance), יצירתיות בלתי פוסקת ועבודה מהירה מול שווקים משתנים.",
    createdAt: "2026-06-01T08:15:00Z"
  },
  {
    id: "dept-4",
    businessId: "biz-2",
    name: "מחלקת ביקורת (Audit)",
    dnaSummary: "מחלקת הביקורת היא לב הפעילות של הפירמה. העבודה דורשת הכרה מעמיקה של תקני IFRS, עבודה מול לקוחות קבועים וליווי של צוותים זוטרים על ידי סניורים.",
    createdAt: "2026-07-01T09:10:00Z"
  }
];

export const initialJobs: Job[] = [
  {
    id: "job-1",
    businessId: "biz-1",
    departmentId: "dept-1",
    departmentName: "פיתוח ותוכנה (R&D)",
    title: "מפתח/ת React & Tailwind בכיר/ה",
    location: "תל אביב (היברידי)",
    description: "אנחנו מחפשים מפתח/ת פרונטאנד מנוסה שיצטרף לצוות הליבה שלנו כדי לבנות מוצרי SaaS מורכבים וחווית משתמש מדהימה.",
    requirements: "לפחות 4 שנות ניסיון בפיתוח React, הבנה עמוקה של TypeScript, ניסיון מעשי עם Tailwind CSS, היכרות עם Framer Motion או motion, ניסיון בעבודה מול API של REST/GraphQL, חוש עיצובי מפותח ויכולת עבודה עצמאית.",
    createdAt: "2026-06-10T10:00:00Z"
  },
  {
    id: "job-2",
    businessId: "biz-1",
    departmentId: "dept-2",
    departmentName: "מוצר ועיצוב",
    title: "מנהל/ת מוצר דיגיטלי (Product Manager)",
    location: "הרצליה",
    description: "הובלת מחזור החיים השלם של מוצרים דיגיטליים, החל משלב הגדרת הרעיון, דרך כתיבת אפיון ועד להשקה מוצלחת בשוק.",
    requirements: "לפחות 3 שנות ניסיון כמנהל מוצר במוצרי B2B, ניסיון מוכח בכתיבת מסמכי PRD/אפיון באנגלית ובעברית, שליטה בכלי ניתוח נתונים (Mixpanel/Amplitude), רקע טכני יתרון משמעותי, עבודה Agile/Scrum.",
    createdAt: "2026-06-12T14:30:00Z"
  },
  {
    id: "job-3",
    businessId: "biz-1",
    departmentId: "dept-3",
    departmentName: "שיווק ודיגיטל",
    title: "איש/ת שיווק דיגיטלי ורשתות חברתיות",
    location: "רמת גן (עבודה מהבית חלקית)",
    description: "ניהול קמפיינים ממומנים בגוגל ופייסבוק, הפקת קריאייטיבים, כתיבת תוכן שיווקי וניהול דפי המותג ברשתות החברתיות.",
    requirements: "לפחות שנתיים ניסיון בניהול תקציבי שיווק ממומנים של $5000+ בחודש, שליטה מעולה ב-Meta Ads Manager וקמפייני PPC בגוגל, יכולת מוכחת בכתיבת קופירייטינג שנון, עריכת סרטונים קצרים (Reels/TikTok) - יתרון משמעותי.",
    createdAt: "2026-06-15T09:15:00Z"
  }
];

export const initialCandidates: Candidate[] = [
  {
    id: "cand-1",
    jobId: "job-1",
    name: "יובל אריאל",
    email: "yuval.ariel@example.com",
    phone: "054-1234567",
    skills: ["React", "TypeScript", "Tailwind CSS", "Motion/Framer", "REST APIs", "Redux", "Vite", "Responsive Design"],
    suitabilityScore: 94,
    suitabilityCategory: "excellent",
    summary: "יובל הוא מפתח פרונטאנד עצמאי, מוכשר ביותר עם מעל ל-5 שנות ניסיון מקצועי ממוקד ב-React ו-TypeScript. הוא הציג פרויקטים מרשימים ומורכבים שנבנו ב-Vite ורמת הגימור שלהם גבוהה במיוחד. בנוסף, יש לו ניסיון רב בשימוש ב-Tailwind CSS לפיתוח מהיר ונקי של עיצובים רספונסיביים מורכבים.",
    strengths: [
      "ניסיון מוכח ועשיר במיוחד ב-React ובטכנולוגיות המבוקשות (React 18, Custom Hooks, TS)",
      "הבנה עמוקה של ספריות אנימציה (Motion) המעוררת את הממשק לחיים",
      "תיק עבודות מרשים המדגים חוש אסתטי ועיצובי יוצא דופן של ממשקים מורכבים",
      "כישורים חברתיים מעולים ורעב ללמוד ולהתקדם"
    ],
    weaknesses: [
      "אין ניסיון נרחב בפיתוח צד שרת (Backend) - אך מצהיר על נכונות ללמוד זאת בהמשך"
    ],
    recommendation: "להזמין לראיון פרונטלי במיידי. מדובר במועמד מצוין שמציג התאמה מקסימלית לצוות ולדרישות הטכניות.",
    skillScores: {
      "React/Frontend": 98,
      "TypeScript": 95,
      "UI/UX & Design": 90,
      "Architecture": 85,
      "Soft Skills": 92,
      "DNA Fit": 94
    },
    skillExplanations: {
      "React/Frontend": "מומחיות מוכחת ב-React עם ניסיון בפרויקטים מורכבים.",
      "TypeScript": "שימוש מתקדם ב-TypeScript כולל Generics ו-Types מורכבים.",
      "UI/UX & Design": "הבנה עמוקה בעיצוב ממשקים וחווית משתמש.",
      "Architecture": "ניסיון טוב בתכנון מערכות, אם כי יש מקום לשיפור ב-Microservices.",
      "Soft Skills": "יכולת תקשורת מצוינת ועבודה בצוות.",
      "DNA Fit": "ערכי המועמד תואמים בדיוק את התרבות הארגונית של החברה."
    },
    status: "interview_pending",
    appliedAt: "2026-06-11T11:20:00Z",
    fileName: "Yuval_Ariel_CV.pdf",
    activityLog: [
      {
        id: "l1",
        timestamp: "2026-06-12T10:00:00Z",
        action: "ראיון טלפוני",
        note: "שיחה מעולה, נשמע מאוד מקצועי ומתאים ל-DNA של הצוות."
      }
    ]
  },
  {
    id: "cand-2",
    jobId: "job-1",
    name: "דניאל קליין",
    email: "daniel.k@example.com",
    phone: "052-9876543",
    skills: ["React", "JavaScript", "HTML5", "CSS3", "Bootstrap", "Git", "GitHub"],
    suitabilityScore: 68,
    suitabilityCategory: "borderline",
    summary: "דניאל הוא מפתח ג'וניור מפתחות עם כחצי שנה של שירות כפרילנסר וקורס פיתוח אינטנסיבי. הוא מראה פוטנציאל גבוה, אך חסר את שנות הניסיון הרבות והבקיאות הנדרשת ב-TypeScript ו-Tailwind (הוא בעיקר משתמש ב-Bootstrap ו-Pure CSS).",
    strengths: [
      "מוטיבציה גבוהה במיוחד ופרויקטים אישיים נחמדים המציגים יכולת פתרון בעיות בסיסית",
      "ידע חזק ב-JavaScript גנרי וארכיטקטורה בסיסית של React",
      "יכולת למידה מהירה ורצון רב להשקיע"
    ],
    weaknesses: [
      "חוסר ניסיון משמעותי במערכות מורכבות/פרויקטים ארגוניים",
      "אין ידע מעשי ב-TypeScript, המהווה דרישה מרכזית במשרה",
      "אין היכרות עם Tailwind CSS"
    ],
    recommendation: "פרופיל ג'וניור שאינו עונה על הצורך של מפתח בכיר. כרגע לא מומלץ להמשיך למשרה הנוכחית, אך שווה לשמור את קורות החיים למשרת מתחילים עתידית.",
    skillScores: {
      "React/Frontend": 70,
      "JavaScript": 75,
      "UI/UX & Design": 65,
      "Self Learning": 85,
      "Experience": 30,
      "DNA Fit": 80
    },
    skillExplanations: {
      "React/Frontend": "ידע בסיסי טוב אך חסר ניסיון בפרויקטים רחבי היקף.",
      "JavaScript": "הבנה טובה של יסודות השפה.",
      "UI/UX & Design": "יכולות עיצוב סבירות, דורש הכוונה.",
      "Self Learning": "מוטיבציה גבוהה ללמידה עצמית של טכנולוגיות חדשות.",
      "Experience": "ניסיון דל יחסית למשרה בכירה.",
      "DNA Fit": "גישה חיובית שמתאימה לצוות צעיר ודינמי."
    },
    status: "new",
    appliedAt: "2026-06-13T08:45:00Z",
    fileName: "Daniel_Klein_Resume.pdf",
    activityLog: []
  },
  {
    id: "cand-3",
    jobId: "job-2",
    name: "סמדר רון",
    email: "smadar.ron@example.com",
    phone: "050-4445556",
    skills: ["Product Strategy", "PRD Writing", "Agile", "Amplitude", "Jira", "UI/UX Specs", "Roadmap Planning"],
    suitabilityScore: 88,
    suitabilityCategory: "good",
    summary: "סמדר מחזיקה ב-4 שנות ניסיון כמנהלת מוצר בחברות פינטק בינלאומיות. היא בעלת יכולת מוכחת של כתיבת אפיונים מפורטים גם באנגלית וגם בעברית, וניווט בתוך ספרינטים מורכבים מול צוותי הנדסה מרובים.",
    strengths: [
      "ניסיון עבודה חזק בחברות SaaS בינלאומיות ועבודה מקיפה ב-Agile Scrum",
      "שליטה מצוינת באפיון חווית משתמש (UX) מורכבת וכתיבת PRDs מלאים",
      "ידע מעולה בניהול מבוסס נתונים תוך שימוש בכלי אנליטיקה (Amplitude/Jira)"
    ],
    weaknesses: [
      "ניסיון מועט יחסית בצד הדאטה העמוק ומערכות בינה מלאכותית, אשר יהווה חלק מהדומיין החדש"
    ],
    recommendation: "להמשיך לראיון טלפוני ראשוני. המועמדת להוטה ומזג הטיפוס שלה מתאים מאוד לארגון.",
    skillScores: {
      "Product Strategy": 92,
      "Agile/Methodology": 95,
      "Data Analysis": 80,
      "Tech Savviness": 70,
      "Soft Skills": 90,
      "DNA Fit": 88
    },
    skillExplanations: {
      "Product Strategy": "חשיבה אסטרטגית מצוינת וניסיון בהובלת מוצרים.",
      "Agile/Methodology": "מומחית בתהליכי Agile וניהול צוותים.",
      "Data Analysis": "יכולת ניתוח נתונים טובה מאוד להסקת מסקנות עסקיות.",
      "Tech Savviness": "הבנה טכנולוגית מספקת, אך לא ברמה של מפתח.",
      "Soft Skills": "כריזמטית ובעלת יכולת הנעת עובדים.",
      "DNA Fit": "מתאימה מאוד לתרבות ה-Startup המהירה."
    },
    status: "new",
    appliedAt: "2026-06-14T15:10:00Z",
    fileName: "Smadar_Ron_Product_CV.pdf",
    activityLog: []
  },
  {
    id: "cand-4",
    jobId: "job-3",
    name: "אילן נגר",
    email: "ilan.nagar@example.com",
    phone: "053-1112233",
    skills: ["Social Media", "Co-writing", "Content Creation", "Instagram", "TikTok"],
    suitabilityScore: 45,
    suitabilityCategory: "unsuitable",
    summary: "אילן הוא חובב רשתות חברתיות שפעל בעיקר כיוצר תוכן עצמאי בערוץ שלו ללא ניסיון ארגוני מוגדר. הוא חסר הבנה בצד הממומן העמוק (Meta Campaign Budget Optimization) המהווה לפחות 60% מהתפקיד.",
    strengths: [
      "כתיבה טובה, קלילה, הומוריסטית ועדכנית במדיה החברתית",
      "כריזמה עצמית ויכולת עריכת וידאו קצרה (Reels)"
    ],
    weaknesses: [
      "אין ניסיון מעשי בניהול תקציבים ממומנים גדולים",
      "אין היכרות עם Google Analytics, Google Ads, או תהליכי המרה",
      "חוסר הבנה בקמפיינים מבוססי החזר השקעה (ROI) ועבודה מול לקוחות"
    ],
    recommendation: "לסרב מועמדות. הניסיון דל מדי ואינו כולל את הגדרת הליבה של השיווק הממומן המבוקש.",
    skillScores: {
      "Content Creation": 85,
      "Creativity": 80,
      "Paid Marketing": 20,
      "Data/Analytics": 15,
      "Strategy": 30,
      "DNA Fit": 40
    },
    status: "rejected",
    appliedAt: "2026-06-15T10:30:00Z",
    fileName: "Ilan_Marketing_Resume.docx",
    activityLog: []
  }
];
