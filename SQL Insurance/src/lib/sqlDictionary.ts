export interface SqlConcept {
  term: string;
  definition: string;
  example?: string;
}

export const SQL_DICTIONARY: Record<string, SqlConcept> = {
  "JOIN": {
    term: "JOIN",
    definition: "חיבור בין שתי טבלאות או יותר המבוסס על עמודה משותפת ביניהן. זה מאפשר לנו לשלב נתונים ממקורות שונים המקושרים לוגית.",
    example: "SELECT * FROM Policies JOIN Insured ON Policies.insured_id = Insured.insured_id"
  },
  "LEFT JOIN": {
    term: "LEFT JOIN",
    definition: "מחזירה את כל השורות מהטבלה השמאלית (הראשונה), ואת השורות התואמות מהטבלה הימנית. אם אין התאמה, נקבל ערכי NULL עבור עמודות הטבלה הימנית.",
    example: "SELECT * FROM Agents LEFT JOIN Policies ON Agents.agent_id = Policies.agent_id"
  },
  "INNER JOIN": {
    term: "INNER JOIN",
    definition: "הסוג הנפוץ ביותר של JOIN. מחזירה רק שורות שקיימת להן התאמה בשתי הטבלאות.",
    example: "SELECT * FROM Claims INNER JOIN Policies ON Claims.policy_id = Policies.policy_id"
  },
  "GROUP BY": {
    term: "GROUP BY",
    definition: "משמשת לקיבוץ שורות בעלות ערכים זהים לשורות סיכום (Summary Rows). בדרך כלל משתמשים בה עם פונקציות אגרגציה כמו SUM, COUNT או AVG.",
    example: "SELECT line_of_business, COUNT(*) FROM Products GROUP BY line_of_business"
  },
  "HAVING": {
    term: "HAVING",
    definition: "תנאי סינון שמופעל על תוצאות שהתקבלו לאחר קיבוץ (GROUP BY). לא ניתן להשתמש ב-WHERE לסינון על תוצאות של פונקציות אגרגציה (כמו SUM > 100), ולכן משתמשים ב-HAVING.",
    example: "SELECT agent_id, SUM(premium) FROM Policies GROUP BY agent_id HAVING SUM(premium) > 10000"
  },
  "SELECT": {
    term: "SELECT",
    definition: "הפקודה הבסיסית ביותר ב-SQL המשמשת לבחירת עמודות ונתונים מהטבלאות.",
    example: "SELECT full_name, age FROM Insured"
  },
  "FROM": {
    term: "FROM",
    definition: "מציינת את מקור הנתונים (הטבלה או הטבלאות) מהם נשלפים הנתונים ב-SELECT.",
    example: "SELECT * FROM Policies"
  },
  "AS": {
    term: "AS",
    definition: "משמש ליצירת כינוי (Alias) לעמודה או לטבלה בשאילתה, מה שמשפר את קריאות התוצאות או מקצר שמות טבלאות ארוכים.",
    example: "SELECT COUNT(*) AS total_count FROM Claims"
  },
  "WHERE": {
    term: "WHERE",
    definition: "פסוקית המשמשת לסינון שורות מהטבלה לפני ביצוע קיבוץ או אגרגציה, בהתבסס על תנאי לוגי.",
    example: "SELECT * FROM Claims WHERE claim_status = 'פתוחה'"
  },
  "NULLIF": {
    term: "NULLIF",
    definition: "פונקציה המקבלת שני פרמטרים. אם הם שווים, היא מחזירה NULL. אם הם שונים, היא מחזירה את הפרמטר הראשון. שימושי מאוד למניעת שגיאת חילוק ב-0.",
    example: "SELECT amount / NULLIF(days, 0) FROM table"
  },
  "COALESCE": {
    term: "COALESCE",
    definition: "פונקציה המחזירה את הערך הראשון ברשימה שאינו NULL. שימושי לטיפול בערכים חסרים והמרתם לערך ברירת מחדל כמו 0.",
    example: "SELECT COALESCE(bonus, 0) + salary FROM employees"
  },
  "CTE": {
    term: "CTE",
    definition: "ראשי תיבות של Common Table Expression. זוהי טבלה זמנית שנוצרת במהלך הרצת השאילתה (באמצעות WITH) המאפשרת לכתוב שאילתות מורכבות בצורה קריאה ומודולרית יותר.",
    example: "WITH MonthlySales AS (SELECT ...) SELECT * FROM MonthlySales"
  },
  "DISTINCT": {
    term: "DISTINCT",
    definition: "מילת מפתח המשמשת להסרת כפילויות ולהחזרת ערכים ייחודיים בלבד מתוך עמודה או שילוב של עמודות.",
    example: "SELECT DISTINCT city FROM Insured"
  },
  "CASE WHEN": {
    term: "CASE WHEN",
    definition: "מבנה לוגי המאפשר לבצע התניות בתוך השאילתה (דומה ל-if-else). הוא מחזיר ערך מסוים אם התנאי מתקיים.",
    example: "SELECT CASE WHEN age < 24 THEN 'צעיר' ELSE 'רגיל' END as driver_type"
  },
  "SUM": {
    term: "SUM",
    definition: "פונקציית אגרגציה המחשבת את הסכום הכולל של עמודה נומרית.",
    example: "SELECT SUM(amount) FROM Claim_Payments"
  },
  "COUNT": {
    term: "COUNT",
    definition: "פונקציית אגרגציה הסופרת את מספר השורות או הערכים הלא-ריקים בשאילתה.",
    example: "SELECT COUNT(*) FROM Policies WHERE status = 'בתוקף'"
  },
  "AVG": {
    term: "AVG",
    definition: "פונקציית אגרגציה המחשבת את הממוצע של עמודה נומרית.",
    example: "SELECT AVG(premium) FROM Policies"
  },
  "ORDER BY": {
    term: "ORDER BY",
    definition: "משמש למיון תוצאות השאילתה לפי עמודה אחת או יותר, בסדר עולה (ASC) או יורד (DESC).",
    example: "SELECT * FROM Insured ORDER BY age DESC"
  },
  "LIMIT": {
    term: "LIMIT",
    definition: "מגביל את מספר השורות המוחזרות מהשאילתה. שימושי מאוד להפחתת עומס או לקבלת ה-'Top' של תוצאות מסוימות.",
    example: "SELECT * FROM Claims ORDER BY loss_date DESC LIMIT 5"
  },
  "WITH": {
    term: "WITH",
    definition: "מילת מפתח המשמשת להגדרת CTE - ביטוי טבלה משותף. זה מאפשר להגדיר תת-שאילתה זמנית שניתן להשתמש בה בהמשך השאילתה הראשית.",
    example: "WITH TotalClaims AS (SELECT * FROM Claims) SELECT * FROM TotalClaims"
  },
  "STRFTIME": {
    term: "STRFTIME",
    definition: "פונקציה של SQLite לעיבוד ועיצוב תאריכים. מאפשרת לחלץ שנה (%Y), חודש (%m) או יום מתוך מחרוזת תאריך.",
    example: "SELECT STRFTIME('%Y', open_date) FROM Claims"
  },
  "JULIANDAY": {
    term: "JULIANDAY",
    definition: "פונקציה המחזירה את מספר הימים שעברו מאז תחילת הספירה היוליאנית. שימושי מאוד לחישוב הפרשים מדויקים בין תאריכים.",
    example: "SELECT JULIANDAY('now') - JULIANDAY(loss_date) FROM Claims"
  },
  "ROW_NUMBER": {
    term: "ROW_NUMBER",
    definition: "פונקציית חלון המעניקה מספר סידורי ייחודי לכל שורה בתוך קבוצה מסוימת (Partition), לפי סדר מסוים.",
    example: "SELECT ROW_NUMBER() OVER (PARTITION BY policy_id ORDER BY payment_date) FROM Claim_Payments"
  },
  "OVER": {
    term: "OVER",
    definition: "מילת מפתח המקדימה הגדרת 'חלון' עבור פונקציות חלון. היא קובעת כיצד השורות יחולקו (Partition) וימוינו עבור החישוב.",
    example: "SELECT SUM(amount) OVER (PARTITION BY agent_id) FROM Policies"
  },
  "PARTITION BY": {
    term: "PARTITION BY",
    definition: "חלק מפסוקית ה-OVER המשמש לחלוקת התוצאות לקבוצות (חלונות) שעליהן תתבצע פונקציית החלון באופן עצמאי.",
    example: "SELECT AVG(score) OVER (PARTITION BY department) FROM EmployeeScores"
  }
};
