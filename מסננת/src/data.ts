import { Business, Department, Team, Job, Candidate } from "./types";

export const initialBusinesses: Business[] = [
  {
    id: "biz-fictional",
    name: "טק-פלואו פתרונות תוכנה",
    industry: "הייטק ובינה מלאכותית",
    location: "חיפה (היברידי)",
    size: "11-50 עובדים",
    description: "חברה מובילה לפיתוח פתרונות SaaS מבוססי בינה מלאכותית וניהול חכם של תהליכים ארגוניים.",
    createdAt: "2026-07-10T08:00:00Z",
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
      }
    ],
    answers: {
      "q-1_select": "הייטק ובינה מלאכותית",
      "q-2_select": "B2B SaaS"
    },
    dnaSummary: "טק-פלואו משלבת מצוינות טכנולוגית בלתי מתפשרת עם תרבות ארגונית פתוחה, תומכת ומעודדת חדשנות. אנו שמים דגש רב על פיתוח מקצועי, איזון בית-עבודה ועבודה בצוותים קטנים וממוקדים."
  },
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
        question: "כיצד הפירמה מתמודדת WITH תקופות 'עונת הלחץ' (Busy Season)?",
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
    createdAt: "2026-07-12T00:00:00Z"
  }
];

export const initialDepartments: Department[] = [
  {
    id: "dept-fictional-1",
    businessId: "biz-fictional",
    name: "מחלקת פיתוח והנדסה (Engineering)",
    dnaSummary: "הלב הטכנולוגי של החברה, העוסק בפיתוח אלגוריתמים מתקדמים, מודלים של למידת מכונה וארכיטקטורת ענן מורכבת.",
    createdAt: "2026-07-10T08:05:00Z"
  },
  {
    id: "dept-fictional-2",
    businessId: "biz-fictional",
    name: "מחלקת מוצר וחווית משתמש (Product & Design)",
    dnaSummary: "המחלקה האחראית על עיצוב המוצר, ממשק המשתמש וחוויית המשתמש, תוך דגש על פשטות, אסתטיקה ושימושיות.",
    createdAt: "2026-07-10T08:10:00Z"
  },
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

export const initialTeams: Team[] = [
  {
    id: "team-fictional-1",
    businessId: "biz-fictional",
    departmentId: "dept-fictional-1",
    name: "צוות אלגוריתמים ו-AI (Core AI Team)",
    dnaSummary: "צוות מחקר ופיתוח מהיר המתמחה בעיבוד שפה טבעית (NLP), ממודלי שפה (LLMs) ופתרון בעיות מורכבות.",
    createdAt: "2026-07-10T08:15:00Z"
  },
  {
    id: "team-fictional-2",
    businessId: "biz-fictional",
    departmentId: "dept-fictional-2",
    name: "צוות עיצוב וממשק (UI/UX Team)",
    dnaSummary: "צוות יצירתי המתמקד במיקרו-אינטראקציות, טיפוגרפיה, אסתטיקה מודרנית ועיצוב ממשקים עוצמתיים.",
    createdAt: "2026-07-10T08:20:00Z"
  }
];

export const initialJobs: Job[] = [
  {
    id: "job-fictional-1",
    businessId: "biz-fictional",
    departmentId: "dept-fictional-1",
    teamId: "team-fictional-1",
    departmentName: "מחלקת פיתוח והנדסה (Engineering)",
    teamName: "צוות אלגוריתמים ו-AI (Core AI Team)",
    title: "מפתח/ת בינה מלאכותית ולמידת מכונה (AI Engineer)",
    location: "חיפה (היברידי)",
    description: "אנו מחפשים מהנדס/ת AI מנוסה להצטרפות לצוות ה-Core AI שלנו. התפקיד כולל פיתוח ואינטגרציה של מודלי שפה, אופטימיזציה של פרומפטים ובניית סוכני AI חכמים.",
    requirements: "לפחות 3 שנות ניסיון בפיתוח Python, ניסיון מעשי בעבודה עם ספריות ML (PyTorch/TensorFlow), ניסיון מעשי עם APIs של LLMs (כמו Gemini, OpenAI), ידע בעיבוד שפה טבעית (NLP), ויכולת פתרון בעיות אלגוריתמיות מורכבות.",
    createdAt: "2026-07-11T10:00:00Z"
  },
  {
    id: "job-fictional-2",
    businessId: "biz-fictional",
    departmentId: "dept-fictional-2",
    teamId: "team-fictional-2",
    departmentName: "מחלקת מוצר וחווית משתמש (Product & Design)",
    teamName: "צוות עיצוב וממשק (UI/UX Team)",
    title: "מעצב/ת חווית משתמש בכיר/ה (Senior Product Designer)",
    location: "חיפה (היברידי)",
    description: "אנו מחפשים מעצב/ת מוצר מוכשר/ת עם חוש אסתטי מפותח ותשוקה ליצירת ממשקים פשוטים ומרהיבים למוצרי ה-SaaS שלנו.",
    requirements: "לפחות 4 שנות ניסיון בעיצוב מוצרים דיגיטליים (SaaS יתרון משמעותי), שליטה אבסולוטית ב-Figma, ניסיון ביצירת Design Systems, הבנה מעמיקה בחקר משתמשים ומיקרו-אינטראקציות, תיק עבודות מרשים חובה.",
    createdAt: "2026-07-11T11:00:00Z"
  },
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
    id: "cand-fictional-1",
    jobId: "job-fictional-1",
    name: "רוני אלטמן",
    email: "roni.altman@example.com",
    phone: "054-7778899",
    skills: ["Python", "PyTorch", "NLP", "LLMs", "LangChain", "Machine Learning", "Prompt Engineering"],
    suitabilityScore: 92,
    suitabilityCategory: "excellent",
    summary: "רוני היא מהנדסת אלגוריתמים מוכשרת עם רקע אקדמי וניסיון מעשי עשיר בבניית סוכני AI ועיבוד שפה טבעית. היא הציגה פרויקטים מתקדמים של אינטגרציית מודלי שפה והתאמה אישית של סוכנים לצרכים ארגוניים.",
    strengths: [
      "ניסיון מעמיק ומעשי ב-Python ובספריות ML מובילות",
      "הבנה עמוקה של עולמות ה-LLM וכלים מודרניים כמו LangChain",
      "יכולת עבודה עצמאית גבוהה ויכולת פתרון בעיות מורכבות"
    ],
    weaknesses: [
      "פחות ניסיון בעבודה בסביבות ענן מורכבות (AWS/GCP), אם כי יש לה היכרות בסיסית"
    ],
    recommendation: "להזמין לראיון טכני בהקדם האפשרי. היא מתאימה בצורה מדהימה לדרישות התפקיד ול-DNA של הצוות.",
    skillScores: {
      "Python/ML": 95,
      "LLMs & NLP": 94,
      "Architecture": 88,
      "Problem Solving": 96,
      "Soft Skills": 85,
      "DNA Fit": 92
    },
    skillExplanations: {
      "Python/ML": "שליטה מעולה ב-Python ופיתוח מודלי למידת מכונה.",
      "LLMs & NLP": "ניסיון מעשי עשיר עם מודלי שפה וספריות לעיבוד שפה טבעית.",
      "Architecture": "הבנה טובה של תכנון מערכות תוכנה חכמות.",
      "Problem Solving": "חשיבה אנליטית יוצאת דופן ופתרון בעיות מורכבות.",
      "Soft Skills": "תקשורת טובה, עובדת מצוין בצוות ומסבירה רעיונות מורכבים בבהירות.",
      "DNA Fit": "רמת מחויבות גבוהה ורצון לחדשנות התואמים את רוח טק-פלואו."
    },
    status: "new",
    appliedAt: "2026-07-11T12:00:00Z",
    fileName: "Roni_Altman_CV.pdf",
    activityLog: []
  },
  {
    id: "cand-fictional-2",
    jobId: "job-fictional-2",
    name: "תומר שגב",
    email: "tomer.segev@example.com",
    phone: "052-5556677",
    skills: ["Figma", "UI/UX Design", "Design Systems", "Prototyping", "User Research", "Interaction Design"],
    suitabilityScore: 89,
    suitabilityCategory: "good",
    summary: "תומר הוא מעצב מוצר יצירתי ומנוסה מאוד עם תיק עבודות מרשים של פלטפורמות SaaS מורכבות. יש לו עין חדה לטיפוגרפיה, מרווחים, ואנימציות ממשק, וניסיון עבודה קרוב עם מפתחי פרונטאנד.",
    strengths: [
      "שליטה מוחלטת ב-Figma ובניית Design Systems מורכבים וסקיילביליים",
      "חשיבה עיצובית ממוקדת משתמש ורקע חזק בחקר משתמשים",
      "יחסי אנוש מעולים ויכולת שיתוף פעולה הדוק עם צוותי הפיתוח"
    ],
    weaknesses: [
      "ניסיון פחות עשיר בעיצוב לאפליקציות מובייל Native (רוב הניסיון שלו הוא ב-Web SaaS)"
    ],
    recommendation: "מועמד חזק מאוד עם תיק עבודות בולט. מומלץ להתקדם איתו לראיון פורטפוליו.",
    skillScores: {
      "Figma": 98,
      "UI/UX Design": 92,
      "Design Systems": 95,
      "Collaboration": 90,
      "User Research": 82,
      "DNA Fit": 89
    },
    skillExplanations: {
      "Figma": "מומחיות מוחלטת בבנייה ותחזוקה של רכיבים ופרוטוטייפים ב-Figma.",
      "UI/UX Design": "הבנה מעולה באסתטיקה מודרנית וחוויית משתמש חלקה.",
      "Design Systems": "ניסיון מוכח ביצירת ותיעוד שפה עיצובית אחידה לחברה.",
      "Collaboration": "תקשורת מצוינת עם מתכנתים לצורך יישום מדויק של העיצובים.",
      "User Research": "יכולת טובה לבצע ראיונות משתמשים ולתרגם פידבקים לשיפורים.",
      "DNA Fit": "יצירתיות, פתיחות מחשבתית ורוח צוותית התואמים את ה-DNA של טק-פלואו."
    },
    status: "interview_pending",
    appliedAt: "2026-07-11T13:00:00Z",
    fileName: "Tomer_Segev_Portfolio_CV.pdf",
    activityLog: [
      {
        id: "l-fictional-1",
        timestamp: "2026-07-12T09:00:00Z",
        action: "ראיון טלפוני",
        note: "שיחה נהדרת, מציג בגרות מקצועית גבוהה ותיאום ציפיות מעולה."
      }
    ]
  },
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
    recommendation: "להזמין לראיון פרונטאנד מקיף עם ראש הצוות. מדובר במועמד מצוין.",
    skillScores: {
      "React/Frontend": 95,
      "TypeScript": 92,
      "UI/UX & Design": 88,
      "Architecture": 85,
      "Soft Skills": 90,
      "DNA Fit": 94
    },
    skillExplanations: {
      "React/Frontend": "מומחיות מוכחת ב-React עם ניסיון בפרויקטים מורכבים.",
      "TypeScript": "שימוש מתקדם ב-TypeScript כולל Generics ו-Types מורכבים.",
      "UI/UX & Design": "הבנה עמוקה בעיצוב ממשקים וחווית משתמש.",
      "Architecture": "הבנה טובה של תכנון מערכות, אם כי יש מקום לשיפור ב-Microservices.",
      "Soft Skills": "יכולת תקשורת מצוינת ועבודה בצוות.",
      "DNA Fit": "ערכי המועמד תואמים בדיוק את התרבות הארגונית של החברה."
    },
    status: "new",
    appliedAt: "2026-06-12T09:30:00Z",
    fileName: "Yuval_Ariel_CV.pdf",
    activityLog: []
  },
  {
    id: "cand-2",
    jobId: "job-1",
    name: "דניאל קליין",
    email: "daniel.k@example.com",
    phone: "050-9876543",
    skills: ["HTML", "CSS", "JavaScript", "React", "Git", "Bootstrap"],
    suitabilityScore: 68,
    suitabilityCategory: "borderline",
    summary: "דניאל הוא בוגר קורס פיתוח Fullstack טרי שמחפש את תפקידו הראשון בתעשייה. יש לו מוטיבציה פנטסטית ויכולת למידה עצמית גבוהה, אך הוא עדיין חסר ניסיון מעשי בפרויקטים מורכבים בסקייל גדול, ובשימוש בטכנולוגיות מתקדמות כמו TypeScript ו-Tailwind CSS.",
    strengths: [
      "מוטיבציה גבוהה מאוד ותשוקה אמיתית לתחום הפיתוח",
      "יכולת למידה עצמית מוכחת (בנה מספר פרויקטים אישיים במהלך הקורס)",
      "יחסי אנוש טובים וגישה חיובית"
    ],
    weaknesses: [
      "חוסר ניסיון תעסוקתי/מעשי בפרויקטים אמיתיים",
      "היכרות שטחית בלבד עם TypeScript וספריות ניהול סטייט מורכבות",
      "קושי בתכנון ארכיטקטורה מורכבת של קוד"
    ],
    recommendation: "אינו מתאים למשרה הבכירה הנוכחית. מומלץ לשמור את קורות החיים למשרת מתחילים עתידית.",
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
