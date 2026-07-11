export interface Material {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  description: string;
  insuranceContext: string;
  example: string;
  tips: string[];
}

export interface InsuranceTopic {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  description: string;
  keyConcepts: string[];
  businessLogic: string;
}

export const SQL_MATERIALS: Material[] = [
  {
    id: 'select-where',
    title: 'SELECT & WHERE - שליפה וסינון בסיסי',
    difficulty: 'Easy',
    description: 'אלו הם הכלים הבסיסיים ביותר ב-SQL. SELECT מגדיר אילו עמודות נרצה לראות, ו-WHERE מגדיר אילו שורות יעברו את הסינון. הבנה מעמיקה של WHERE כוללת שימוש באופרטורים כמו LIKE (לחיפוש טקסט חלקי), IN (לבדיקה מול רשימה), ו-BETWEEN (לטווחים).',
    insuranceContext: 'שליפת רשימת פוליסות פעילות עבור מבוטח ספציפי, סינון רכבים לפי שנת ייצור, או איתור פוליסות שהופקו בטווח תאריכים מסוים לצורך דוח מכירות יומי.',
    example: `SELECT policy_id, start_date, premium, status
FROM policies
WHERE status = 'Active' 
  AND customer_id IN (12345, 67890)
  AND premium BETWEEN 1000 AND 5000
  AND policy_name LIKE '%מקיף%';`,
    tips: [
      'השתמש ב-AND ו-OR בחוכמה; זכור ש-AND קודם ל-OR אלא אם משתמשים בסוגריים.',
      'ביצוניות: סינון על עמודות עם אינדקס (כמו מפתח ראשי או ת"ז) יהיה מהיר משמעותית.',
      'השתמש ב-IS NULL כדי למצוא שורות שבהן חסר מידע, שכן NULL אינו שווה לכלום (אפילו לא לעצמו).',
      'שימוש ב-% ב-LIKE בתחילת מחרוזת עלול להאט את השאילתה בבסיסי נתונים גדולים.'
    ]
  },
  {
    id: 'logical-operators',
    title: 'AND, OR & NOT - תנאים מורכבים ולוגיקה בוליאנית',
    difficulty: 'Easy',
    description: 'כאשר נרצה לבצע סינונים מתקדמים המבוססים על מספר קריטריונים בו-זמנית, נשתמש באופרטורים לוגיים לחיתוך או איחוד קבוצות. AND דורש שכל התנאים יתקיימו בו-זמנית; OR דורש שלפחות תנאי אחד יתקיים; NOT הופך את התוצאה. סדר הקדימויות החשוב ביותר הוא ש-AND תמיד מבוצע לפני OR, ולכן שימוש בסוגריים חיוני כדי לקבץ תנאי OR בצורה נכונה!',
    insuranceContext: 'מציאת מבוטחים שהם גם נהגים צעירים או חדשים המתגוררים בתל אביב או בירושלים, או זיהוי תביעות חריגות בענף רכב מקיף בעלות אופי ספציפי.',
    example: `SELECT * 
FROM Insured 
WHERE (is_young_driver = 1 OR is_new_driver = 1) 
  AND (city = 'תל אביב' OR city = 'ירושלים')
  AND NOT age > 75;`,
    tips: [
      'שימו לב לסדר קדימויות: אופרטור AND תמיד קודם ל-OR. חובה להשתמש בסוגריים (brackets) כדי להבטיח שהלוגיקה תחושב כמצופה כאשר משלבים ביניהם.',
      'אופרטור OR מגדיל את תוצאות השאילתה על ידי איחוד קבוצות, בעוד AND מצמצם אותן על ידי חיתוך.',
      'ניתן לשלב IN כדי לפשט משפטי OR ארוכים על אותה עמודה (למשל, WHERE city IN (\'תל אביב\', \'ירושלים\') במקום city = \'תל אביב\' OR city = \'ירושלים\').',
      'ביצועים: בבסיסי נתונים גדולים, שימוש מרובה ב-OR על עמודות שונות עלול להקשות על שימוש אופטימלי באינדקסים, ולכן לעיתים מומלץ למצוא דרכי ייעול.'
    ]
  },
  {
    id: 'joins',
    title: 'JOINs - חיבור טבלאות וקשרים',
    difficulty: 'Medium',
    description: 'בעולם הביטוח הנתונים מפוזרים בין טבלאות רבות (לקוחות, פוליסות, רכבים, תביעות). JOIN מאפשר לנו לחבר אותם לישות אחת. INNER JOIN יחזיר רק התאמות מלאות, בעוד LEFT JOIN ישמור על כל הנתונים מהטבלה הראשית גם אם אין להם "זנב" בטבלה השנייה.',
    insuranceContext: 'חיבור טבלת פוליסות לטבלת לקוחות כדי להציג את שם המבוטח, או חיבור פוליסות לתביעות כדי לראות אילו פוליסות "תובעניות" יותר.',
    example: `SELECT 
    p.policy_id, 
    c.first_name + ' ' + c.last_name as full_name,
    COALESCE(cl.claim_amount, 0) as claim_sum
FROM policies p
JOIN customers c ON p.customer_id = c.customer_id
LEFT JOIN claims cl ON p.policy_id = cl.policy_id
WHERE p.status = 'Active';`,
    tips: [
      'תמיד תעדיף LEFT JOIN כשאתה רוצה לוודא שלא איבדת נתונים מהטבלה המרכזית (למשל: פוליסות ללא תביעות).',
      'הקפד על שימוש ב-Aliases (כינויים) קצרים וברורים לטבלאות כדי למנוע בלבול בעמודות עם שמות זהים.',
      'הימנע מ-CROSS JOIN אלא אם אתה באמת צריך מכפלה קרטזית (נדיר מאוד בביטוח).',
      'בדיקת כפילויות: וודא שהקשר הוא 1:1 או 1:N; קשר של N:N ללא טבלת קשר יגרום לניפוח נתונים.'
    ]
  },
  {
    id: 'group-by',
    title: 'GROUP BY & Aggregations - ניתוח נתונים וסיכומים',
    difficulty: 'Medium',
    description: 'פונקציות סיכום (SUM, AVG, COUNT, MAX, MIN) מאפשרות לנו להפוך רשימות ארוכות לתובנות עסקיות. GROUP BY קובע את רמת הפירוט (למשל: סיכום לפי סוכן, לפי חודש או לפי סוג רכב).',
    insuranceContext: 'חישוב סך הפרמיות שהופקו על ידי כל סוכן, ממוצע סכום התביעה לפי דגם רכב, או ספירת כמות הפוליסות החדשות בכל מחוז.',
    example: `SELECT 
    agent_id, 
    COUNT(policy_id) as total_policies,
    SUM(premium) as total_premium,
    AVG(premium) as avg_premium_per_policy
FROM policies
WHERE start_date >= '2024-01-01'
GROUP BY agent_id
HAVING SUM(premium) > 500000
ORDER BY total_premium DESC;`,
    tips: [
      'ההבדל בין WHERE ל-HAVING: הראשון מסנן שורות לפני הסיכום, השני מסנן קבוצות אחרי הסיכום.',
      'ניתן להשתמש ב-DISTINCT בתוך COUNT כדי לספור לקוחות ייחודיים ולא רק פוליסות.',
      'זכור: כל עמודה שמופיעה ב-SELECT ואינה בתוך פונקציית סיכום חייבת להופיע ב-GROUP BY.',
      'שימוש ב-ROLLUP (במנועים תומכים) מאפשר לקבל שורות סיכום ביניים וסיכום כללי בשאילתה אחת.'
    ]
  },
  {
    id: 'case-when',
    title: 'CASE WHEN - לוגיקה עסקית מותנית',
    difficulty: 'Medium',
    description: 'זוהי הדרך של SQL לבצע לוגיקה של IF-THEN-ELSE. זהו כלי קריטי למיישמי חוזים שצריכים לסווג נתונים או לבצע חישובים משתנים בהתאם לתנאים מורכבים.',
    insuranceContext: 'סיווג פוליסות לקטגוריות סיכון לפי גיל, קביעת אחוז עמלה משתנה לפי סוג מוצר, או יצירת "דגלים" (Flags) לזיהוי תביעות חריגות.',
    example: `SELECT 
    policy_id, 
    premium,
    CASE 
        WHEN premium > 10000 THEN 'VIP'
        WHEN premium > 5000 THEN 'Gold'
        WHEN status = 'Cancelled' THEN 'Inactive'
        ELSE 'Standard'
    END as segment,
    CASE WHEN claim_count > 2 THEN 1 ELSE 0 END as is_high_risk
FROM policies;`,
    tips: [
      'הסדר חשוב! CASE עוצר בתנאי הראשון שמתקיים.',
      'ניתן להשתמש ב-CASE בתוך SUM כדי לבצע "סיכום מותנה" (למשל: סיכום פרמיה רק לפוליסות רכב בתוך שאילתה כללית).',
      'תמיד תסיים ב-ELSE כדי למנוע קבלת NULL במקרים לא צפויים.',
      'ניתן לקנן CASE בתוך CASE, אך מומלץ להימנע מכך לטובת קריאות הקוד.'
    ]
  },
  {
    id: 'coalesce',
    title: 'COALESCE & NULL Handling - ניהול נתונים חסרים',
    difficulty: 'Hard',
    description: 'בעולם האמיתי, נתונים הם לעיתים קרובות חסרים (NULL). COALESCE מחזיר את הערך הראשון שאינו NULL מרשימה. זהו כלי חיוני למניעת שגיאות בחישובים מתמטיים (שכן כל פעולה עם NULL מחזירה NULL).',
    insuranceContext: 'הצגת מספר טלפון חלופי אם הראשי חסר, קביעת ערך ברירת מחדל של 0 לעמלה שטרם חושבה, או איחוד כתובות ממקורות שונים.',
    example: `SELECT 
    p.policy_id, 
    p.premium + COALESCE(p.fees, 0) as total_to_pay,
    COALESCE(c.mobile_phone, c.home_phone, 'לא הוזן טלפון') as contact_info
FROM policies p
JOIN customers c ON p.customer_id = c.customer_id;`,
    tips: [
      'NULLIF הוא הכלי המשלים: הוא הופך ערך מסוים (כמו 0) ל-NULL כדי למנוע שגיאות חילוק ב-0.',
      'ב-SQL Server, הפונקציה ISNULL דומה אך מקבלת רק שני ארגומנטים. COALESCE הוא סטנדרט ANSI וגמיש יותר.',
      'זכור ש-COALESCE מחזיר את סוג הנתונים של הארגומנט הראשון - וודא שכל הארגומנטים תואמים בסוגם.',
      'שימוש ב-COALESCE ב-JOINs יכול לעזור בחיבור טבלאות כשיש מפתחות חלופיים.'
    ]
  },
  {
    id: 'ctes',
    title: 'CTEs (WITH) - ארגון שאילתות מורכבות',
    difficulty: 'Hard',
    description: 'Common Table Expressions מאפשרים לנו להגדיר "טבלאות זמניות" בתוך השאילתה. זה הופך קוד מפלצתי לקוד קריא, מודולרי וקל לתחזוקה. זהו הסטנדרט המקצועי לכתיבת שאילתות מורכבות.',
    insuranceContext: 'ביצוע חישוב מקדים של סך התביעות לכל פוליסה, ואז שימוש בתוצאה בתוך שאילתה אחרת שמחשבת יחס הפסד (Loss Ratio) או רווחיות.',
    example: `WITH MonthlySales AS (
    SELECT agent_id, SUM(premium) as sales
    FROM policies
    WHERE start_date >= '2024-01-01'
    GROUP BY agent_id
),
TopAgents AS (
    SELECT agent_id FROM MonthlySales WHERE sales > 100000
)
SELECT a.agent_name, ms.sales
FROM agents a
JOIN MonthlySales ms ON a.agent_id = ms.agent_id
WHERE a.agent_id IN (SELECT agent_id FROM TopAgents);`,
    tips: [
      'CTEs עדיפים על שאילתות משנה (Subqueries) כי הם מאפשרים להשתמש באותה תוצאה מספר פעמים בשאילתה אחת.',
      'הם משפרים משמעותית את היכולת לדבג (Debug) את הקוד - ניתן להריץ כל חלק בנפרד.',
      'קיימים גם CTEs רקורסיביים (Recursive) המשמשים לטיפול במבנים היררכיים (כמו עץ ארגוני של סוכנויות).',
      'שים לב: ברוב בסיסי הנתונים, CTE אינו נשמר בזיכרון (Materialized) אלא מורץ מחדש בכל פעם שקוראים לו.'
    ]
  },
  {
    id: 'window-functions',
    title: 'Window Functions - אנליטיקה מתקדמת',
    difficulty: 'Expert',
    description: 'פונקציות חלון מאפשרות לבצע חישובים על קבוצת שורות (חלון) מבלי לאבד את הפירוט של השורה הבודדת. זהו הכלי החזק ביותר לניתוח מגמות, דירוגים וחישובים מצטברים.',
    insuranceContext: 'דירוג סוכנים לפי מכירות בתוך כל מחוז, חישוב פרמיה מצטברת לאורך השנה, או מציאת הפער בימים בין שתי תביעות עוקבות של אותו לקוח.',
    example: `SELECT 
    policy_id, 
    agent_id, 
    premium,
    SUM(premium) OVER (PARTITION BY agent_id ORDER BY start_date) as running_total,
    RANK() OVER (PARTITION BY region ORDER BY premium DESC) as rank_in_region,
    LAG(premium) OVER (PARTITION BY customer_id ORDER BY start_date) as previous_policy_premium
FROM policies;`,
    tips: [
      'PARTITION BY הוא כמו GROUP BY, אבל הוא לא "מכווץ" את השורות.',
      'ORDER BY בתוך ה-OVER קובע את סדר החישוב (קריטי לחישובים מצטברים או פונקציות כמו LAG/LEAD).',
      'LEAD ו-LAG מאפשרים להסתכל על השורה הבאה או הקודמת - מושלם להשוואת חידושי פוליסות.',
      'שימוש ב-ROW_NUMBER() הוא הדרך הטובה ביותר למצוא את "השורה האחרונה" (למשל: הסטטוס העדכני ביותר של תביעה).'
    ]
  },
  {
    id: 'stored-procedures',
    title: 'Stored Procedures - אוטומציה ולוגיקה בשרת',
    difficulty: 'Expert',
    description: 'פרוצדורה היא תוכנית קטנה השמורה בבסיס הנתונים. היא יכולה לקבל פרמטרים, לבצע לוגיקה מורכבת (כולל עדכונים ומחיקות), ולהחזיר תוצאות. זהו הכלי המרכזי למימוש תהליכים עסקיים אוטומטיים.',
    insuranceContext: 'תהליך סוף חודש לחישוב עמלות, עדכון אוטומטי של סטטוס פוליסות שפג תוקפן, או הפקת דוחות מורכבים הדורשים מספר שלבי עיבוד.',
    example: `CREATE PROCEDURE sp_UpdatePolicyStatus
    @ProcessDate DATE,
    @AffectedRows INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE policies
        SET status = 'Expired'
        WHERE end_date < @ProcessDate AND status = 'Active';
        
        SET @AffectedRows = @@ROWCOUNT;
    END TRY
    BEGIN CATCH
        PRINT 'Error occurred during update';
    END CATCH
END;`,
    tips: [
      'פרוצדורות משפרות ביצועים כי הן עוברות קומפילציה פעם אחת ונשמרות בזיכרון השרת.',
      'הן מאפשרות אבטחה טובה יותר - ניתן לתת למשתמש הרשאה להריץ פרוצדורה מבלי לתת לו הרשאה ישירה לטבלאות.',
      'השתמש בפרמטרים של OUTPUT כדי להחזיר ערכים בודדים (כמו סטטוס הצלחה).',
      'תמיד כלול טיפול בשגיאות (TRY...CATCH) כדי למנוע קריסת תהליכים באמצע.'
    ]
  },
  {
    id: 'data-transformation',
    title: 'Data Transformation - עריכת וניקוי נתונים',
    difficulty: 'Medium',
    description: 'בעבודה מול מסד נתונים של חברת ביטוח, אנו נתקלים לעיתים קרובות בנתונים המגיעים ממערכות ישנות או בפורמטים לא אחידים. ניקוי נתונים (Data Cleaning) הוא תהליך של הפיכת הנתונים לפורמט אחיד ותקין לצורך ניתוח.',
    insuranceContext: 'השלמת תעודות זהות ל-9 ספרות עם אפסים מובילים, איחוד פורמטים של תאריכים המגיעים ממערכות שונות, או ניקוי תווים מיוחדים משמות של מבוטחים.',
    example: `SELECT 
    LPAD(insured_id, 9, '0') as clean_id,
    STRFTIME('%d/%m/%Y', approval_date) as formatted_date,
    REPLACE(full_name, '-', ' ') as cleaned_name,
    COALESCE(discount_from_bank, 0) as fixed_discount
FROM Policies;`,
    tips: [
      'השתמש ב-LPAD כדי לוודא שמזהים (כמו ת"ז או מספר פוליסה) תמיד באורך קבוע.',
      'פונקציות תאריך כמו STRFTIME או TO_CHAR חיוניות ליצירת דוחות בפורמט קריא.',
      'תמיד בדוק את הנתונים המקוריים לפני הניקוי כדי לוודא שאינך מאבד מידע חשוב.',
      'COALESCE הוא החבר הכי טוב שלך כשאתה רוצה להימנע מ-NULL בחישובים מספריים.'
    ]
  },
  {
    id: 'limiting-ranking',
    title: 'LIMIT & TOP - הגבלת תוצאות ודירוג',
    difficulty: 'Easy',
    description: 'לפעמים אנחנו לא צריכים את כל אלפי השורות בטבלה, אלא רק את ה-Top 10 או את התוצאות האחרונות. פסוקיות LIMIT ו-TOP מאפשרות לנו לשלוט בכמות הנתונים שחוזרת.',
    insuranceContext: 'זיהוי 5 הלקוחות עם הפרמיה הגבוהה ביותר, הצגת 10 התביעות האחרונות שנפתחו, או שליפת "מדגם" של פוליסות לבדיקת בקרה.',
    example: `SELECT policy_id, premium, full_name
FROM Policies
ORDER BY premium DESC
LIMIT 5;
260: 
261: -- ב-AS400 (DB2) עובדים עם FETCH FIRST:
262: -- SELECT policy_id FROM Policies ORDER BY premium DESC FETCH FIRST 5 ROWS ONLY;`,
    tips: [
      'תמיד השתמש ב-ORDER BY כשאתה מגביל תוצאות. ללא מיון, ה-LIMIT יחזיר שורות אקראיות.',
      'במערכות AS400/DB2 (נפוץ בחברות ביטוח), השתמש ב-FETCH FIRST n ROWS ONLY.',
      'LIMIT הוא הסטנדרט ב-SQLite, PostgreSQL ו-MySQL.',
      'שילוב של LIMIT ו-OFFSET מאפשר ליצור "דפדוף" (Pagination) במערכות מידע.'
    ]
  },
  {
    id: 'advanced-logic',
    title: 'Advanced Logic - תת-שאילתות ו-CTEs',
    difficulty: 'Expert',
    description: 'כאשר נדרשים חישובים מורכבים המבוססים על תוצאות ביניים, אנו משתמשים בתת-שאילתות (Subqueries) או בטבלאות זמניות (CTEs).',
    insuranceContext: 'מציאת פוליסות שהן מעל הממוצע של המחלקה שלהן, זיהוי סוכנים שלא מכרו מוצר מסוים באמצעות EXCEPT, או בניית דוח רב-שלבי שמחשב קודם תביעות ואז פרמיות.',
    example: `-- CTE שימוש ב
WITH AgentTotalSales AS (
  SELECT agent_id, SUM(premium) as total
  FROM Policies
  GROUP BY agent_id
)
SELECT a.agent_name, s.total
FROM Agents a
JOIN AgentTotalSales s ON a.agent_id = s.agent_id
WHERE s.total > 100000;

-- שימוש בתת-שאילתה (IN)
SELECT * FROM Insured 
WHERE insured_id IN (SELECT insured_id FROM Claims);`,
    tips: [
      'CTEs הופכים את הקוד לקריא ומאורגן יותר מאשר תת-שאילתות מקוננות.',
      'השתמש ב-UNION ALL אם אינך צריך להסיר כפילויות, זה הרבה יותר מהיר מ-UNION.',
      'תת-שאילתות ב-WHERE (כמו IN או EXISTS) הן כלי עוצמתי לסינון קבוצות נתונים.',
      'בביצוע חישובים מורכבים (כמו Loss Ratio), כדאי לחלק את הלוגיקה לשלבים באמצעות WITH.'
    ]
  }
];

export const INSURANCE_MATERIALS: InsuranceTopic[] = [
  {
    id: 'basics',
    title: 'מושגי יסוד ומבנה הפוליסה',
    difficulty: 'Easy',
    description: 'הבנת אבני הבניין של עולם הביטוח האלמנטרי (P&C). פוליסה היא חוזה משפטי המעביר סיכון מהמבוטח למבטח תמורת תשלום.',
    keyConcepts: ['פרמיה ברוטו/נטו', 'השתתפות עצמית (Deductible)', 'דמי פוליסה והיטלים', 'גבול אחריות', 'تקופת ביטוח (Inception/Expiry)'],
    businessLogic: 'מיישם חוזה חייב להבין שפרמיה ברוטו כוללת מיסים והיטלים (כמו היטל כיבוי אש), בעוד הפרמיה לחישוב עמלה היא לרוב הפרמיה נטו. ב-SQL, טעות בבחירת השדה הנכון תגרום לסטייה כספית משמעותית.'
  },
  {
    id: 'lifecycle',
    title: 'מחזור חיי הפוליסה (Policy Lifecycle)',
    difficulty: 'Easy',
    description: 'התהליך העסקי מרגע פניית הלקוח ועד לסיום הכיסוי או חידושו. כל שלב מתועד בבסיס הנתונים כסטטוס או כסוג תנועה.',
    keyConcepts: ['הצעה (Quotation)', 'הפקה (New Business)', 'חידוש (Renewal)', 'ביטול (Cancellation)', 'הקפאה (Suspension)'],
    businessLogic: 'בשאילתות SQL, יש להבחין בין פוליסות "בצנרת" (Pending) לבין פוליסות "בסיכון" (In Force). סטטוס NTU (Not Taken Up) מציין הצעה שלא הפכה לפוליסה - נתון קריטי לחישוב יחסי המרה (Conversion Ratio).'
  },
  {
    id: 'endorsements',
    title: 'תוספות ושינויים (Endorsements / MTA)',
    difficulty: 'Medium',
    description: 'ניהול שינויים בפוליסה קיימת במהלך תקופת הביטוח. שינויים אלו משפיעים על הכיסוי ועל הפרמיה באופן יחסי.',
    keyConcepts: ['תוספת פרמיה (AP)', 'החזר פרמיה (RP)', 'חישוב יחסי (Pro-rata)', 'ביטול למפרע (Flat Cancellation)', 'החלפת נכס'],
    businessLogic: 'כאן נכנס חישוב ה-"Pro-rata". אם לקוח מוסיף כיסוי ביום ה-100 מתוך 365, עלינו לחשב את הפרמיה עבור 265 הימים שנותרו. ב-SQL זה דורש שימוש ב-DATEDIFF וחלוקה בימי השנה (365 או 366).'
  },
  {
    id: 'index-linkage',
    title: 'הצמדה למדד וריביות',
    difficulty: 'Medium',
    description: 'בישראל, רוב פוליסות הביטוח צמודות למדד המחירים לצרכן כדי לשמור על הערך הריאלי של סכומי הביטוח והפרמיות.',
    keyConcepts: ['מדד בסיס', 'מדד חדש', 'הפרשי הצמדה', 'ריבית פיגורים', 'לוח סילוקין'],
    businessLogic: 'מיישם חוזה צריך לבצע JOIN לטבלת מדדים חודשית. החישוב הוא: (סכום * מדד חדש / מדד בסיס). טעות בבחירת המדד (למשל מדד בגין חודש קודם) היא טעות נפוצה ויקרה.'
  },
  {
    id: 'underwriting',
    title: 'חיתום וניהול סיכונים (Underwriting)',
    difficulty: 'Hard',
    description: 'התהליך שבו החברה מעריכה את הסיכון וקובעת את תנאי הקבלה והמחיר. זהו ה"מוח" של חברת הביטוח.',
    keyConcepts: ['גורמי סיכון (Rating Factors)', 'הנחות והעמסות', 'כללי חסימה', 'עבר ביטוחי (Claims History)', 'סקר סיכונים'],
    businessLogic: 'החיתום מתורגם ל-SQL באמצעות "טבלאות תעריף". למשל: הנחה של 10% לנהג ללא תביעות ב-3 שנים האחרונות. השאילתה צריכה לבדוק את טבלת התביעות ההיסטורית לפני קביעת המחיר בטבלת הפוליסות.'
  },
  {
    id: 'claims-reserves',
    title: 'תביעות ורזרבות (Claims & Reserves)',
    difficulty: 'Hard',
    description: 'ניהול האירועים הביטוחיים וההתחייבויות הכספיות העתידיות של החברה. זהו הצד של ה"הוצאות" במאזן.',
    keyConcepts: ['רזרבה (Reserve)', 'תשלום תביעה', 'IBNR (Incurred But Not Reported)', 'שיבוב (Subrogation)', 'הערכת שמאי'],
    businessLogic: 'מושג ה-IBNR הוא קריטי: אלו תביעות שקרו אך טרם דווחו. ב-SQL אנו מחשבים את ה-"Outstanding Claims" - סך הרזרבות הפתוחות פחות התשלומים שבוצעו, כדי לדעת כמה כסף החברה צריכה לשמור בצד.'
  },
  {
    id: 'reinsurance',
    title: 'ביטוח משנה (Reinsurance)',
    difficulty: 'Expert',
    description: 'חברת הביטוח מבטחת את עצמה אצל מבטחי משנה בינלאומיים כדי להגן על יציבותה במקרה של קטסטרופות או תביעות ענק.',
    keyConcepts: ['שימור (Retention)', 'חוזה מכסה (Treaty)', 'ביטוח משנה ספציפי (Facultative)', 'XOL (Excess of Loss)', 'Ceded Premium'],
    businessLogic: 'חישוב ה-"Net Retention" (השימור נטו). אם לחברה יש הסכם Quota Share של 20%, השאילתה צריכה לפצל כל שורת פרמיה ותביעה: 80% נשארים בחברה ו-20% מועברים למבטח המשנה (Ceded).'
  },
  {
    id: 'regulation',
    title: 'רגולציה ודיווח (Solvency & Reporting)',
    difficulty: 'Expert',
    description: 'עמידה בדרישות המחמירות של רשות שוק ההון. הדיווחים צריכים להיות מדויקים, עקביים ובזמן אמת.',
    keyConcepts: ['סולבנסי 2 (Solvency II)', 'ממשק אחיד', 'דיווחים רבעוניים', 'הגנת הפרטיות (GDPR/IL)', 'ציות (Compliance)'],
    businessLogic: 'מיישם חוזה אחראי על ה-"Data Quality". שאילתות SQL משמשות לאיתור חורים בנתונים (למשל פוליסות ללא ת"ז תקינה) לפני שהם מגיעים לדיווח הרגולטורי. טעות בדיווח עלולה לגרור קנסות כבדים.'
  }
];
