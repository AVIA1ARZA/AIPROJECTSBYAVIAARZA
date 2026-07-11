
export interface SQLExplanation {
  term: string;
  title: string;
  description: string;
  example: string;
}

export const SQL_EXPLANATIONS: Record<string, SQLExplanation> = {
  "SELECT": {
    term: "SELECT",
    title: "פקודת SELECT",
    description: "משמשת לבחירת עמודות מסוימות מתוך טבלה. זהו הצעד הראשון בבניית כל שאילתה.",
    example: "SELECT name, age FROM Users;"
  },
  "FROM": {
    term: "FROM",
    title: "פקודת FROM",
    description: "מציינת מאיזו טבלה (או טבלאות) ברצוננו לשלוף את הנתונים.",
    example: "SELECT * FROM Policies;"
  },
  "WHERE": {
    term: "WHERE",
    title: "פסוקית WHERE",
    description: "משמשת לסינון שורות על סמך תנאי מסוים. רק שורות שעומדות בתנאי יופיעו בתוצאה.",
    example: "SELECT * FROM Claims WHERE status = 'Open';"
  },
  "JOIN": {
    term: "JOIN",
    title: "פעולת JOIN",
    description: "מאפשרת לשלב נתונים משתי טבלאות או יותר המקושרות ביניהן באמצעות עמודה משותפת.",
    example: "SELECT * FROM Users JOIN Policies ON Users.id = Policies.user_id;"
  },
  "LEFT JOIN": {
    term: "LEFT JOIN",
    title: "פעולת LEFT JOIN",
    description: "מחזירה את כל השורות מהטבלה השמאלית, ונתונים תואמים מהטבלה הימנית. אם אין התאמה, יופיע NULL.",
    example: "SELECT * FROM Agents LEFT JOIN Policies ON Agents.id = Policies.agent_id;"
  },
  "GROUP BY": {
    term: "GROUP BY",
    title: "פסוקית GROUP BY",
    description: "משמשת לקיבוץ שורות בעלות ערכים זהים בעמודות מסוימות, בדרך כלל בשילוב עם פונקציות אגרגציה.",
    example: "SELECT department, COUNT(*) FROM Employees GROUP BY department;"
  },
  "HAVING": {
    term: "HAVING",
    title: "פסוקית HAVING",
    description: "דומה ל-WHERE, אך משמשת לסינון קבוצות שנוצרו על ידי GROUP BY. היא פועלת על תוצאות של פונקציות אגרגציה.",
    example: "SELECT agent_id, SUM(amount) FROM Sales GROUP BY agent_id HAVING SUM(amount) > 1000;"
  },
  "ORDER BY": {
    term: "ORDER BY",
    title: "פסוקית ORDER BY",
    description: "משמשת למיון תוצאות השאילתה לפי עמודה אחת או יותר, בסדר עולה (ASC) או יורד (DESC).",
    example: "SELECT * FROM Claims ORDER BY loss_date DESC;"
  },
  "COUNT": {
    term: "COUNT",
    title: "פונקציית COUNT",
    description: "סופרת את מספר השורות העונות על התנאי. ניתן להשתמש ב-DISTINCT כדי לספור ערכים ייחודיים בלבד.",
    example: "SELECT COUNT(id) FROM Policies;"
  },
  "SUM": {
    term: "SUM",
    title: "פונקציית SUM",
    description: "מחשבת את הסכום הכולל של ערכים מספריים בעמודה מסוימת.",
    example: "SELECT SUM(premium) FROM Policies;"
  },
  "AVG": {
    term: "AVG",
    title: "פונקציית AVG",
    description: "מחשבת את הערך הממוצע של עמודה מספרית.",
    example: "SELECT AVG(amount) FROM Claim_Payments;"
  },
  "DISTINCT": {
    term: "DISTINCT",
    title: "מילת המפתח DISTINCT",
    description: "משמשת להחזרת ערכים ייחודיים בלבד, ללא כפילויות.",
    example: "SELECT DISTINCT line_of_business FROM Products;"
  },
  "CASE WHEN": {
    term: "CASE WHEN",
    title: "ביטוי CASE",
    description: "מאפשר הוספת לוגיקה של תנאים (IF-THEN-ELSE) בתוך השאילתה.",
    example: "SELECT CASE WHEN age < 18 THEN 'Minor' ELSE 'Adult' END FROM Users;"
  },
  "CTE (WITH)": {
    term: "CTE (WITH)",
    title: "ביטוי טבלה זמני (CTE)",
    description: "מאפשר להגדיר קבוצת תוצאות זמנית שניתן להתייחס אליה בהמשך השאילתה. עוזר לסדר וקריאות.",
    example: "WITH RecentClaims AS (SELECT * FROM Claims WHERE year = 2024) SELECT * FROM RecentClaims;"
  },
  "STRFTIME": {
    term: "STRFTIME",
    title: "פונקציית STRFTIME",
    description: "פונקציה של SQLite לעיבוד ועיצוב תאריכים. מאפשרת לחלץ שנה, חודש או יום.",
    example: "SELECT STRFTIME('%Y', open_date) FROM Claims;"
  },
  "JULIANDAY": {
    term: "JULIANDAY",
    title: "פונקציית JULIANDAY",
    description: "מחזירה את מספר הימים שעברו מאז תחילת הספירה היוליאנית. שימושית מאוד לחישוב הפרשים בין תאריכים.",
    example: "SELECT JULIANDAY('now') - JULIANDAY(loss_date) FROM Claims;"
  },
  "WINDOW FUNCTION/OVER": {
    term: "WINDOW FUNCTION/OVER",
    title: "פונקציית חלון (Window Functions)",
    description: "מאפשרת לבצע חישובים על 'חלון' של שורות הקשורות לשורה הנוכחית (למשל דירוג או סכום רץ).",
    example: "SELECT ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY date) FROM Payments;"
  },
  "LPAD": {
    term: "LPAD",
    title: "פונקציית LPAD",
    description: "משמשת לריפוד מחרוזת משמאל בתווים מסוימים עד לאורך מוגדר. שימושי מאוד להשלמת תעודות זהות ל-9 ספרות (על ידי הוספת אפסים מובילים).",
    example: "SELECT LPAD(insured_id, 9, '0') FROM Insured;"
  },
  "TO_CHAR": {
    term: "TO_CHAR",
    title: "פונקציית TO_CHAR",
    description: "ממירה תאריכים או מספרים למחרוזת בפורמט מסוים. מאפשרת להפוך תאריך לפורמט קריא או ליצור פורמט אחיד בין טבלאות.",
    example: "SELECT TO_CHAR(approval_date, 'DD/MM/YYYY') FROM Policies;"
  },
  "TO_DATE": {
    term: "TO_DATE",
    title: "פונקציית TO_DATE",
    description: "ממירה מחרוזת המייצגת תאריך לטיפוס נתונים מסוג DATE. חיוני כאשר נתונים מגיעים בפורמטים לא אחידים (למשל מחרוזות) וצריך להשוות ביניהם.",
    example: "SELECT TO_DATE('2024-01-01', 'YYYY-MM-DD');"
  },
  "COALESCE": {
    term: "COALESCE",
    title: "פונקציית COALESCE",
    description: "מחזירה את הערך הלא-NULL הראשון ברשימת הפרמטרים. משמשת לטיפול בערכים חסרים (למשל הצגת '0' במקום NULL בחישובים).",
    example: "SELECT COALESCE(discount_from_bank, 0) FROM Policies;"
  },
  "CAST": {
    term: "CAST",
    title: "פונקציית CAST",
    description: "משמשת לשינוי טיפוס הנתונים של ביטוי (למשל הפיכת טקסט למספר או להפך).",
    example: "SELECT CAST(insured_id AS INTEGER) FROM Insured;"
  },
  "REPLACE": {
    term: "REPLACE",
    title: "פונקציית REPLACE",
    description: "מחליפה מחרוזת מסוימת בתוך טקסט במחרוזת אחרת. יעיל לניקוי תווים מיותרים מנתונים.",
    example: "SELECT REPLACE(full_name, '-', ' ') FROM Insured;"
  },
  "LIMIT": {
    term: "LIMIT",
    title: "פסוקית LIMIT",
    description: "מגבילה את מספר השורות המוחזרות מהשאילתה. שימושי מאוד להצגת 'עשרת הראשונים' או לביצוע דפינציה (Pagination).",
    example: "SELECT * FROM Claims ORDER BY loss_amount DESC LIMIT 10;"
  },
  "TOP": {
    term: "TOP",
    title: "מילת המפתח TOP",
    description: "בדומה ל-LIMIT, משמשת ב-SQL Server לבחירת מספר השורות הראשונות בלבד מתוך התוצאה.",
    example: "SELECT TOP 5 * FROM Policies ORDER BY premium DESC;"
  },
  "FETCH FIRST": {
    term: "FETCH FIRST",
    title: "פסוקית FETCH FIRST",
    description: "התחביר המקובל במערכות AS400 (DB2) להגבלת מספר השורות בתוצאה. זהו התקן המקצועי בעולם הביטוח.",
    example: "SELECT * FROM Claims ORDER BY loss_amount DESC FETCH FIRST 10 ROWS ONLY;"
  },
  "DIGITS": {
    term: "DIGITS",
    title: "פונקציית DIGITS",
    description: "פונקציית DB2/AS400 ההופכת מספר למחרוזת עם אפסים מובילים. שימושי מאוד לטיפול במספרי זהות וסניפים.",
    example: "SELECT DIGITS(insured_id) FROM Insured;"
  },
  "OFFSET": {
    term: "OFFSET",
    title: "פסוקית OFFSET",
    description: "מציינת כמה שורות לדלג בתחילת התוצאות. בדרך כלל משמשת בשילוב עם LIMIT לביצוע דפינציה (מעבר בין דפים).",
    example: "SELECT * FROM Customers LIMIT 10 OFFSET 20;"
  }
};
