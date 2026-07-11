export interface Table {
  name: string;
  columns: Column[];
  description: string;
}

export interface Column {
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeign?: boolean;
  references?: string;
  description: string;
}

export const INSURANCE_SCHEMA: Table[] = [
  {
    name: "Customers",
    description: "לקוחות - ריכוז כלל הלקוחות של החברה (מבוטחים, תובעים וכו')",
    columns: [
      { name: "customer_id", type: "VARCHAR(20)", isPrimary: true, description: "מזהה לקוח (ת.ז/ח.פ)" },
      { name: "full_name", type: "VARCHAR(100)", description: "שם מלא" },
      { name: "phone", type: "VARCHAR(20)", description: "מספר טלפון" },
      { name: "email", type: "VARCHAR(100)", description: "כתובת אימייל" },
      { name: "address", type: "VARCHAR(200)", description: "כתובת מגורים" }
    ]
  },
  {
    name: "Insured",
    description: "מבוטחים - פרטי הלקוחות של חברת הביטוח",
    columns: [
      { name: "insured_id", type: "VARCHAR(20)", isPrimary: true, description: "ת.ז מבוטח" },
      { name: "full_name", type: "VARCHAR(100)", description: "שם מלא" },
      { name: "age", type: "INT", description: "גיל המבוטח" },
      { name: "is_young_driver", type: "BOOLEAN", description: "האם נהג צעיר (מתחת לגיל 24)" },
      { name: "is_new_driver", type: "BOOLEAN", description: "האם נהג חדש (וותק נמוך משנתיים)" },
      { name: "city", type: "VARCHAR(50)", description: "עיר מגורים" }
    ]
  },
  {
    name: "Agents",
    description: "סוכנים - פרטי סוכני הביטוח",
    columns: [
      { name: "agent_id", type: "INT", isPrimary: true, description: "קוד סוכן" },
      { name: "agent_name", type: "VARCHAR(100)", description: "שם הסוכן" },
      { name: "agency_name", type: "VARCHAR(100)", description: "שם הסוכנות" },
      { name: "commission_rate", type: "DECIMAL(5,2)", description: "אחוז עמלה" },
      { name: "district", type: "VARCHAR(50)", description: "מחוז (צפון, מרכז, דרום)" }
    ]
  },
  {
    name: "Products",
    description: "מוצרים - קטלוג מוצרי הביטוח (ענפים: רכב חובה, רכב מקיף, עסקים, דירות)",
    columns: [
      { name: "product_id", type: "INT", isPrimary: true, description: "קוד מוצר" },
      { name: "product_name", type: "VARCHAR(100)", description: "שם המוצר" },
      { name: "line_of_business", type: "VARCHAR(50)", description: "ענף (רכב חובה, רכב מקיף, עסקים, דירות)" }
    ]
  },
  {
    name: "Policies",
    description: "פוליסות - חוזה הביטוח",
    columns: [
      { name: "policy_id", type: "INT", isPrimary: true, description: "מספר פוליסה" },
      { name: "customer_id", type: "VARCHAR(20)", isForeign: true, references: "Customers.customer_id", description: "מזהה לקוח" },
      { name: "insured_id", type: "VARCHAR(20)", isForeign: true, references: "Insured.insured_id", description: "ת.ז מבוטח" },
      { name: "agent_id", type: "INT", isForeign: true, references: "Agents.agent_id", description: "קוד סוכן" },
      { name: "product_id", type: "INT", isForeign: true, references: "Products.product_id", description: "קוד מוצר" },
      { name: "license_plate", type: "VARCHAR(20)", isForeign: true, references: "Insured_Vehicles.license_plate", description: "מספר רישוי רכב" },
      { name: "approval_date", type: "DATE", description: "תאריך אישור הפוליסה" },
      { name: "start_date", type: "DATE", description: "תאריך תחילת ביטוח" },
      { name: "end_date", type: "DATE", description: "תאריך סיום ביטוח" },
      { name: "discount_from_bank", type: "DECIMAL(10,2)", description: "הנחה שניתנה מבנק ההנחות" },
      { name: "status", type: "VARCHAR(20)", description: "סטטוס (בתוקף, מבוטלת)" },
      { name: "underwriter_name", type: "VARCHAR(100)", description: "שם חתם" },
      { name: "opening_user_id", type: "INT", isForeign: true, references: "System_Users.user_id", description: "מקיש פותח" },
      { name: "updating_user_id", type: "INT", isForeign: true, references: "System_Users.user_id", description: "מקיש מעדכן" },
      { name: "approving_user_id", type: "INT", isForeign: true, references: "System_Users.user_id", description: "מקיש מאשר" }
    ]
  },
  {
    name: "Claims",
    description: "תביעות - אירועי נזק",
    columns: [
      { name: "claim_id", type: "INT", isPrimary: true, description: "מספר תביעה" },
      { name: "endorsement_id", type: "INT", isForeign: true, references: "Endorsements.endorsement_id", description: "מזהה תוספת (התוספת שבה נוצרה התביעה)" },
      { name: "license_plate", type: "VARCHAR(20)", isForeign: true, references: "Insured_Vehicles.license_plate", description: "מספר רישוי רכב" },
      { name: "loss_date", type: "DATE", description: "תאריך האירוע" },
      { name: "open_date", type: "DATE", description: "תאריך פתיחת התביעה" },
      { name: "close_date", type: "DATE", description: "תאריך סגירת התביעה (ריק אם פתוחה)" },
      { name: "claim_status", type: "VARCHAR(20)", description: "סטטוס (פתוחה, סגורה)" },
      { name: "claim_type", type: "VARCHAR(50)", description: "סוג התביעה (רכב מקיף, רכב חובה, וכו')" },
      { name: "claimant_type", type: "VARCHAR(20)", description: "סוג התובע (צד ג, מבוטח)" },
      { name: "driver_type", type: "VARCHAR(20)", description: "סוג הנהג בזמן התאונה (צעיר, רגיל, חדש)" },
      { name: "driver_is_insured", type: "BOOLEAN", description: "האם הנהג הוא המבוטח" },
      { name: "is_document_scanned", type: "BOOLEAN", description: "האם המסמך נסרק למערכת" },
      { name: "has_event_notification", type: "BOOLEAN", description: "האם קיים מסמך הודעה על אירוע מהמבוטח" },
      { name: "has_deductible_approval", type: "BOOLEAN", description: "אישור השתתפות עצמית" },
      { name: "has_insurance_history", type: "BOOLEAN", description: "עבר ביטוחי" },
      { name: "has_vehicle_license", type: "BOOLEAN", description: "רישיון רכב" },
      { name: "has_protection_approval", type: "BOOLEAN", description: "אישור מיגון" },
      { name: "opening_user_id", type: "INT", isForeign: true, references: "System_Users.user_id", description: "מקיש פותח" },
      { name: "handling_user_id", type: "INT", isForeign: true, references: "System_Users.user_id", description: "מקיש מטפל" },
      { name: "closing_user_id", type: "INT", isForeign: true, references: "System_Users.user_id", description: "מקיש סוגר" }
    ]
  },
  {
    name: "Claimants",
    description: "תובעים - פרטי התובעים בכל תביעה",
    columns: [
      { name: "claimant_id", type: "VARCHAR(30)", isPrimary: true, description: "מזהה תובע (נגזר ממספר התביעה)" },
      { name: "claim_id", type: "INT", isForeign: true, references: "Claims.claim_id", description: "מספר תביעה" },
      { name: "customer_id", type: "VARCHAR(20)", isForeign: true, references: "Customers.customer_id", description: "מזהה לקוח" },
      { name: "claimant_name", type: "VARCHAR(100)", description: "שם התובע" },
      { name: "claimant_seq", type: "INT", description: "מספר סידורי של התובע בתביעה" },
      { name: "close_date", type: "DATE", description: "תאריך סגירת התובע (ריק אם פתוח)" },
      { name: "opening_user_id", type: "INT", isForeign: true, references: "System_Users.user_id", description: "מקיש פותח" },
      { name: "approving_user_id", type: "INT", isForeign: true, references: "System_Users.user_id", description: "מקיש מאשר" },
      { name: "closing_user_id", type: "INT", isForeign: true, references: "System_Users.user_id", description: "מקיש סוגר" }
    ]
  },
  {
    name: "Claim_Payments",
    description: "תשלומי תביעות - פירוט התשלומים שבוצעו",
    columns: [
      { name: "payment_id", type: "INT", isPrimary: true, description: "מזהה תשלום" },
      { name: "claimant_id", type: "INT", isForeign: true, references: "Claimants.claimant_id", description: "מזהה תובע" },
      { name: "amount", type: "DECIMAL(15,2)", description: "סכום התשלום" },
      { name: "payment_category", type: "VARCHAR(50)", description: "מהות התשלום (ברוטו, השתתפות עצמית, חלפים, ירידת ערך, ריבית, הוצאות, כינון, חילוץ מע\"מ)" },
      { name: "payment_date", type: "DATE", description: "תאריך תשלום" }
    ]
  },
  {
    name: "Appraisers",
    description: "שמאים - פרטי השמאים העובדים עם החברה",
    columns: [
      { name: "appraiser_id", type: "INT", isPrimary: true, description: "קוד שמאי" },
      { name: "appraiser_name", type: "VARCHAR(100)", description: "שם השמאי" },
      { name: "specialty", type: "VARCHAR(50)", description: "התמחות (רכב, רכוש, חקלאות)" }
    ]
  },
  {
    name: "Agent_Budgets",
    description: "תקציבי סוכנים - בנק ההנחות המוקצה לכל סוכן (הסמלץ מאפשר קבלת כמה טעינות סכומים)",
    columns: [
      { name: "budget_id", type: "INT", isPrimary: true, description: "מזהה תקציב" },
      { name: "agent_id", type: "INT", isForeign: true, references: "Agents.agent_id", description: "קוד סוכן" },
      { name: "year", type: "INT", description: "שנת התקציב" },
      { name: "allocated_amount", type: "DECIMAL(15,2)", description: "סכום שהוקצה (בנק הנחות)" },
      { name: "load_date", type: "DATE", description: "תאריך טעינת הסכום לבנק ההנחות" },
      { name: "expiration_date", type: "DATE", description: "תאריך פקיעת הסכום שהוטען" }
    ]
  },
  {
    name: "Insured_Vehicles",
    description: "רכב מבוטח - פרטי הרכבים המופיעים במערכת (פוליסות ותביעות)",
    columns: [
      { name: "license_plate", type: "VARCHAR(20)", isPrimary: true, description: "מספר רישוי" },
      { name: "vehicle_type", type: "VARCHAR(50)", description: "סוג רכב (פרטי, מסחרי, אופנוע)" },
      { name: "model", type: "VARCHAR(50)", description: "מודל רכב" },
      { name: "production_year", type: "INT", description: "שנת ייצור" },
      { name: "weight", type: "DECIMAL(10,2)", description: "משקל רכב מדוייק" },
      { name: "engine_capacity", type: "INT", description: "נפח מנוע" },
      { name: "color", type: "VARCHAR(20)", description: "צבע רכב" }
    ]
  },
  {
    name: "System_Users",
    description: "מקישים במערכת התפעול - עובדי החברה המבצעים פעולות במערכת",
    columns: [
      { name: "user_id", type: "INT", isPrimary: true, description: "קוד מקיש" },
      { name: "employee_id", type: "VARCHAR(20)", description: "קוד עובד" },
      { name: "full_name", type: "VARCHAR(100)", description: "שם עובד" },
      { name: "department", type: "VARCHAR(50)", description: "מחלקה (חיתום, תביעות, כספים, אקטואריה, גבייה)" },
      { name: "role", type: "VARCHAR(50)", description: "תפקיד במערכת" },
      { name: "is_active", type: "BOOLEAN", description: "האם משתמש פעיל" }
    ]
  },
  {
    name: "Endorsements",
    description: "תוספות - שינויים ועדכונים בפוליסה לאורך חייה",
    columns: [
      { name: "endorsement_id", type: "INT", isPrimary: true, description: "מזהה תוספת" },
      { name: "policy_id", type: "INT", isForeign: true, references: "Policies.policy_id", description: "מספר פוליסה" },
      { name: "endorsement_number", type: "INT", description: "מספר תוספת (0 = הקמה, 1, 2...)" },
      { name: "effective_date", type: "DATE", description: "תאריך תחילה של התוספת" },
      { name: "endorsement_start_date", type: "DATE", description: "תאריך תחילת התוספת" },
      { name: "endorsement_end_date", type: "DATE", description: "תאריך סיום התוספת" },
      { name: "endorsement_approval_date", type: "DATE", description: "תאריך אישור התוספת" },
      { name: "premium_diff", type: "DECIMAL(10,2)", description: "הפרש פרמיה בתוספת" },
      { name: "sum_insured_diff", type: "DECIMAL(15,2)", description: "הפרש סכום ביטוח בתוספת" },
      { name: "description", type: "VARCHAR(200)", description: "תיאור השינוי" }
    ]
  },
  {
    name: "Business_Details",
    description: "פרטי עסקים - נתונים ספציפיים לפוליסות בענף עסקים",
    columns: [
      { name: "policy_id", type: "INT", isPrimary: true, isForeign: true, references: "Policies.policy_id", description: "מספר פוליסה" },
      { name: "business_name", type: "VARCHAR(100)", description: "שם העסק (שם לקוח)" },
      { name: "tax_id", type: "VARCHAR(20)", description: "ח.פ / ת.ז" },
      { name: "employee_count", type: "INT", description: "מספר עובדים" },
      { name: "payroll", type: "DECIMAL(15,2)", description: "שכר עבודה שנתי" },
      { name: "annual_turnover", type: "DECIMAL(15,2)", description: "מחזור שנתי" },
      { name: "initial_sum_insured", type: "DECIMAL(15,2)", description: "סכום ביטוח מופק בתוספת 0" },
      { name: "last_sum_insured", type: "DECIMAL(15,2)", description: "סכום ביטוח אחרון (לפי התוספת האחרונה)" }
    ]
  },
  {
    name: "Policy_Coverages",
    description: "כיסויים - פירוט הכיסויים הביטוחיים הקיימים בכל פוליסה",
    columns: [
      { name: "coverage_id", type: "INT", isPrimary: true, description: "מזהה כיסוי" },
      { name: "policy_id", type: "INT", isForeign: true, references: "Policies.policy_id", description: "מספר פוליסה" },
      { name: "coverage_name", type: "VARCHAR(100)", description: "שם הכיסוי (למשל: אש, פריצה, חבות מעבידים)" },
      { name: "limit_amount", type: "DECIMAL(15,2)", description: "גבול אחריות / סכום ביטוח לכיסוי" },
      { name: "deductible_amount", type: "DECIMAL(10,2)", description: "סכום השתתפות עצמית לכיסוי" },
      { name: "is_active", type: "BOOLEAN", description: "האם הכיסוי פעיל כרגע" }
    ]
  },
  {
    name: "Appraiser_Actions",
    description: "פעולות שמאי - הערכות נזק שבוצעו עבור תובעים. לתובע אחד יכולות להיות כמה הערכות מצד אותו שמאי באותו תיק.",
    columns: [
      { name: "action_id", type: "INT", isPrimary: true, description: "קוד פעולת שמאי" },
      { name: "appraiser_id", type: "INT", isForeign: true, references: "Appraisers.appraiser_id", description: "קוד שמאי" },
      { name: "claimant_id", type: "VARCHAR(30)", isForeign: true, references: "Claimants.claimant_id", description: "מספר תובע" },
      { name: "assessment_date", type: "DATE", description: "תאריך הערכה" },
      { name: "estimated_damage_amount", type: "DECIMAL(15,2)", description: "סכום הנזק המשוער" }
    ]
  },
  {
    name: "Home_Details",
    description: "פרטי דירות - נתונים ספציפיים לפוליסות דירות",
    columns: [
      { name: "policy_id", type: "INT", isPrimary: true, isForeign: true, references: "Policies.policy_id", description: "מספר פוליסה" },
      { name: "building_year", type: "INT", description: "שנת בניית המבנה" },
      { name: "plumbing_renovation", type: "VARCHAR(20)", description: "האם עבר שיפוץ מערכות מים (Yes / No)" }
    ]
  },
  {
    name: "Underwriting_Staging",
    description: "חיתום זמני - נתונים לצורך הפעלת מנועי חוקה חיתומית",
    columns: [
      { name: "staging_id", type: "INT", isPrimary: true, description: "מזהה חיתום" },
      { name: "policy_id", type: "INT", isForeign: true, references: "Policies.policy_id", description: "מספר פוליסה" },
      { name: "driver_age", type: "INT", description: "גיל הנהג" },
      { name: "years_of_license", type: "INT", description: "שנות רישיון" },
      { name: "past_claims_3yrs", type: "INT", description: "מספר תביעות ב-3 השנים האחרונות" }
    ]
  }
];

export const FALLBACK_QUESTIONS = [
  // EASY (20)
  { id: "e1", title: "כל המבוטחים", description: "הצג את כל הרשומות מטבלת המבוטחים.", difficulty: "Easy", correctSql: "SELECT * FROM Insured;" },
  { id: "e2", title: "מוצרי רכב מקיף", description: "הצג את כל המוצרים השייכים לענף 'רכב'.", difficulty: "Easy", correctSql: "SELECT * FROM Products WHERE line_of_business = 'רכב';" },
  { id: "e3", title: "רשימת שמאים", description: "הצג את שמות כל השמאים וההתמחויות שלהם.", difficulty: "Easy", correctSql: "SELECT appraiser_name, specialty FROM Appraisers;" },
  { id: "e4", title: "נהגים צעירים", description: "הצג את כל המבוטחים המוגדרים כנהגים צעירים.", difficulty: "Easy", correctSql: "SELECT * FROM Insured WHERE is_young_driver = 1;" },
  { id: "e5", title: "תביעות פתוחות", description: "הצג את כל התביעות שסטטוס שלהן הוא 'פתוחה'.", difficulty: "Easy", correctSql: "SELECT * FROM Claims WHERE claim_status = 'פתוחה';" },
  { id: "e6", title: "הנחות גבוהות", description: "הצג פוליסות שקיבלו הנחה מעל 500 ש\"ח מבנק ההנחות.", difficulty: "Easy", correctSql: "SELECT * FROM Policies WHERE discount_from_bank > 500;" },
  { id: "e7", title: "תובעים לפי תביעה", description: "הצג את כל התובעים המשויכים לתביעה מספר 1001.", difficulty: "Easy", correctSql: "SELECT * FROM Claimants WHERE claim_id = 1001;" },
  { id: "e8", title: "תשלומי השתתפות עצמית", description: "הצג את כל תשלומי התביעות שמהותם היא 'השתתפות עצמית'.", difficulty: "Easy", correctSql: "SELECT * FROM Claim_Payments WHERE payment_category = 'השתתפות עצמית';" },
  { id: "e9", title: "שמאים לרכב", description: "הצג שמאים שמתמחים ב-'רכב'.", difficulty: "Easy", correctSql: "SELECT * FROM Appraisers WHERE specialty = 'רכב';" },
  { id: "e10", title: "תביעות חדשות", description: "הצג תביעות שנפתחו בשנת 2024.", difficulty: "Easy", correctSql: "SELECT * FROM Claims WHERE open_date >= '2024-01-01';" },
  { id: "e11", title: "נהגים חדשים", description: "כמה נהגים חדשים רשומים במערכת?", difficulty: "Easy", correctSql: "SELECT COUNT(*) FROM Insured WHERE is_new_driver = 1;" },
  { id: "e12", title: "תשלומים גבוהים", description: "הצג תשלומי תביעות בסכום העולה על 10,000 ש\"ח.", difficulty: "Easy", correctSql: "SELECT * FROM Claim_Payments WHERE amount > 10000;" },
  { id: "e13", title: "תקציבי סוכנים 2024", description: "הצג את הקצאות בנק ההנחות של הסוכנים לשנת 2024.", difficulty: "Easy", correctSql: "SELECT * FROM Agent_Budgets WHERE year = 2024;" },
  { id: "e14", title: "ענף דירה", description: "הצג את שמות המוצרים בענף ה-'דירה'.", difficulty: "Easy", correctSql: "SELECT product_name FROM Products WHERE line_of_business = 'דירה';" },
  { id: "e15", title: "נהג הוא המבוטח", description: "הצג תביעות שבהן הנהג בזמן התאונה היה המבוטח עצמו.", difficulty: "Easy", correctSql: "SELECT * FROM Claims WHERE driver_is_insured = 1;" },
  { id: "e16", title: "תשלומי חלפים", description: "הצג את כל התשלומים שבוצעו עבור 'חלפים'.", difficulty: "Easy", correctSql: "SELECT * FROM Claim_Payments WHERE payment_category = 'חלפים';" },
  { id: "e17", title: "אישור פוליסות", description: "הצג פוליסות שאושרו במהלך חודש מרץ 2024.", difficulty: "Easy", correctSql: "SELECT * FROM Policies WHERE approval_date BETWEEN '2024-03-01' AND '2024-03-31';" },
  { id: "e18", title: "ספירת תובעים", description: "מהו מספר התובעים הכולל הרשום במערכת?", difficulty: "Easy", correctSql: "SELECT COUNT(*) FROM Claimants;" },
  { id: "e19", title: "סוגי נהגים", description: "הצג תביעות שבהן סוג הנהג הוא 'צעיר'.", difficulty: "Easy", correctSql: "SELECT * FROM Claims WHERE driver_type = 'צעיר';" },
  { id: "e20", title: "סוכנויות ביטוח", description: "הצג רשימה ייחודית של כל שמות הסוכנויות.", difficulty: "Easy", correctSql: "SELECT DISTINCT agency_name FROM Agents;" },
  { id: "e_or_1", title: "שמאים בהתמחויות שונות", description: "הצג את השמאים שהתמחותם היא 'רכוש' או 'חקלאות'.", difficulty: "Easy", correctSql: "SELECT * FROM Appraisers WHERE specialty = 'רכוש' OR specialty = 'חקלאות';" },
  { id: "e_or_2", title: "רכבים כבדים או ישנים", description: "מצא את כל הרכבים המבוטחים ששנת הייצור שלהם קטנה מ-2015 או שמשקלם מעל 3500 ק\"ג.", difficulty: "Easy", correctSql: "SELECT * FROM Insured_Vehicles WHERE production_year < 2015 OR weight > 3500;" },

  // MEDIUM (20)
  { id: "m1", title: "סך תשלומי תביעות לפי ענף", description: "הצג את שם הענף (line_of_business) וסך כל תשלומי התביעות שבוצעו עבור פוליסות בענף זה.", difficulty: "Medium", correctSql: "SELECT pr.line_of_business, SUM(cp.amount) FROM Products pr JOIN Policies p ON pr.product_id = p.product_id JOIN Endorsements e ON e.policy_id = p.policy_id JOIN Claims c ON c.endorsement_id = e.endorsement_id JOIN Claimants ct ON c.claim_id = ct.claim_id JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id GROUP BY pr.line_of_business;" },
  { id: "m2", title: "תובעים לכל תביעה", description: "עבור כל תביעה, הצג את מספר התביעה ואת כמות התובעים המשויכים אליה.", difficulty: "Medium", correctSql: "SELECT claim_id, COUNT(*) FROM Claimants GROUP BY claim_id;" },
  { id: "m3", title: "שמאים ותביעות", description: "הצג שם שמאי וכמה תביעות הוא בדק.", difficulty: "Medium", correctSql: "SELECT a.appraiser_name, COUNT(DISTINCT ct.claim_id) FROM Appraisers a LEFT JOIN Appraiser_Actions aa ON a.appraiser_id = aa.appraiser_id LEFT JOIN Claimants ct ON aa.claimant_id = ct.claimant_id GROUP BY a.appraiser_id;" },
  { id: "m4", title: "ממוצע פרמיה לפי סוג נהג", description: "הצג את סוג הנהג (driver_type) מהתביעות ואת ממוצע הפרמיה של הפוליסות המשויכות (מבוסס על סך התוספות).", difficulty: "Medium", correctSql: "SELECT c.driver_type, AVG(e_sum.total_premium) FROM Claims c JOIN Endorsements e ON c.endorsement_id = e.endorsement_id JOIN Policies p ON e.policy_id = p.policy_id JOIN (SELECT policy_id, SUM(premium_diff) as total_premium FROM Endorsements GROUP BY policy_id) e_sum ON p.policy_id = e_sum.policy_id GROUP BY c.driver_type;" },
  { id: "m5", title: "פער דיווח תביעה", description: "הצג תביעות שבהן תאריך הפתיחה מאוחר ביותר מ-7 ימים מתאריך האירוע.", difficulty: "Medium", correctSql: "SELECT * FROM Claims WHERE JULIANDAY(open_date) - JULIANDAY(loss_date) > 7;" },
  { id: "m6", title: "ממוצע ירידת ערך", description: "חשב את סכום התשלום הממוצע עבור מהות 'ירידת ערך'.", difficulty: "Medium", correctSql: "SELECT AVG(amount) FROM Claim_Payments WHERE payment_category = 'ירידת ערך';" },
  { id: "m7", title: "פוליסות ענף עסקים", description: "הצג שמות מבוטחים שיש להם פוליסה בענף ה-'עסקים'.", difficulty: "Medium", correctSql: "SELECT DISTINCT i.full_name FROM Insured i JOIN Policies p ON i.insured_id = p.insured_id JOIN Products pr ON p.product_id = pr.product_id WHERE pr.line_of_business = 'עסקים';" },
  { id: "m8", title: "תביעות נהג צעיר", description: "הצג שמות מבוטחים שהיו מעורבים בתביעה כ-'נהג צעיר'.", difficulty: "Medium", correctSql: "SELECT DISTINCT i.full_name FROM Insured i JOIN Policies p ON i.insured_id = p.insured_id JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id WHERE c.driver_type = 'צעיר';" },
  { id: "m9", title: "סך תשלומים לתביעה", description: "הצג מספר תביעה וסך כל התשלומים שבוצעו עבורה.", difficulty: "Medium", correctSql: "SELECT ct.claim_id, SUM(cp.amount) FROM Claim_Payments cp JOIN Claimants ct ON cp.claimant_id = ct.claimant_id GROUP BY ct.claim_id;" },
  { id: "m10", title: "תביעות עם ריבוי תשלומים", description: "הצג מספרי תביעה שבוצעו עבורן יותר מ-3 תשלומים שונים.", difficulty: "Medium", correctSql: "SELECT ct.claim_id FROM Claim_Payments cp JOIN Claimants ct ON cp.claimant_id = ct.claimant_id GROUP BY ct.claim_id HAVING COUNT(cp.payment_id) > 3;" },
  { id: "m11", title: "תובעים ושמאים", description: "הצג את שמות התובעים בתביעות שטופלו על ידי השמאי 'ישראל ישראלי'.", difficulty: "Medium", correctSql: "SELECT DISTINCT ct.claimant_name FROM Claimants ct JOIN Appraiser_Actions aa ON ct.claimant_id = aa.claimant_id JOIN Appraisers a ON aa.appraiser_id = a.appraiser_id WHERE a.appraiser_name = 'ישראל ישראלי';" },
  { id: "m12", title: "סוכנים עם תביעות פתוחות", description: "הצג שמות סוכנים שיש להם לפחות פוליסה אחת עם תביעה בסטטוס 'פתוחה'.", difficulty: "Medium", correctSql: "SELECT DISTINCT a.agent_name FROM Agents a JOIN Policies p ON a.agent_id = p.agent_id JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id WHERE c.claim_status = 'פתוחה';" },
  { id: "m13", title: "תביעות נהג חדש", description: "הצג את שמות המבוטחים שהגישו תביעה כ-'נהג חדש'.", difficulty: "Medium", correctSql: "SELECT DISTINCT i.full_name FROM Insured i JOIN Policies p ON i.insured_id = p.insured_id JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id WHERE c.driver_type = 'חדש';" },
  { id: "m14", title: "שמאים לפי התמחות", description: "הצג את כמות השמאים לכל סוג התמחות.", difficulty: "Medium", correctSql: "SELECT specialty, COUNT(*) FROM Appraisers GROUP BY specialty;" },
  { id: "m15", title: "תשלומים מעל הממוצע", description: "הצג תשלומי תביעות שהסכום שלהם גבוה מהממוצע הכללי של התשלומים.", difficulty: "Medium", correctSql: "SELECT * FROM Claim_Payments WHERE amount > (SELECT AVG(amount) FROM Claim_Payments);" },
  { id: "m16", title: "סוכנים ופוליסות", description: "הצג שם סוכן וכמות הפוליסות שהוא מכר.", difficulty: "Medium", correctSql: "SELECT a.agent_name, COUNT(p.policy_id) FROM Agents a LEFT JOIN Policies p ON a.agent_id = p.agent_id GROUP BY a.agent_id;" },
  { id: "m17", title: "תביעות פתוחות מעל חודש", description: "הצג תביעות שנפתחו לפני יותר מ-30 יום ועדיין בסטטוס 'פתוחה'.", difficulty: "Medium", correctSql: "SELECT * FROM Claims WHERE claim_status = 'פתוחה' AND JULIANDAY('now') - JULIANDAY(open_date) > 30;" },
  { id: "m18", title: "מבוטחים ללא תביעות", description: "הצג שמות מבוטחים שיש להם פוליסה אך מעולם לא הגישו תביעה.", difficulty: "Medium", correctSql: "SELECT full_name FROM Insured WHERE insured_id IN (SELECT insured_id FROM Policies) AND insured_id NOT IN (SELECT p.insured_id FROM Policies p JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id);" },
  { id: "m19", title: "סך פרמיות שנתי לפי סוכן", description: "הצג שם סוכן וסך הפרמיות (סך התוספות) של הפוליסות שלו שאושרו בשנת 2024.", difficulty: "Medium", correctSql: "SELECT a.agent_name, SUM(e.premium_diff) FROM Agents a JOIN Policies p ON a.agent_id = p.agent_id JOIN Endorsements e ON p.policy_id = e.policy_id WHERE STRFTIME('%Y', p.approval_date) = '2024' GROUP BY a.agent_id;" },
  { id: "m20", title: "מוצרים ללא פוליסות", description: "הצג מוצרים שעדיין לא נמכרה עבורם אף פוליסה.", difficulty: "Medium", correctSql: "SELECT product_name FROM Products WHERE product_id NOT IN (SELECT product_id FROM Policies);" },
  { id: "m_or_1", title: "מבוטחים צעירים או חדשים", description: "הצג מבוטחים שהם נהגים צעירים (is_young_driver = 1) או נהגים חדשים (is_new_driver = 1) המתגוררים בתל אביב או בירושלים.", difficulty: "Medium", correctSql: "SELECT * FROM Insured WHERE (is_young_driver = 1 OR is_new_driver = 1) AND (city = 'תל אביב' OR city = 'ירושלים');" },
  { id: "m_or_2", title: "תביעות חריגות או פתוחות ישנות", description: "הצג תביעות שבהן סוג הנהג הוא 'צעיר' או שסטטוס התביעה הוא 'פתוחה' ותאריך הפתיחה קודם ל-2023-01-01.", difficulty: "Medium", correctSql: "SELECT * FROM Claims WHERE driver_type = 'צעיר' OR (claim_status = 'פתוחה' AND open_date < '2023-01-01');" },

  // HARD (20)
  { id: "h1", title: "חריגה מתקציב סוכן", description: "הצג סוכנים שסך ההנחות שנתנו בשנת 2024 גבוה מהתקציב שהוקצה להם באותה שנה.", difficulty: "Hard", correctSql: "SELECT a.agent_name FROM Agents a JOIN Agent_Budgets ab ON a.agent_id = ab.agent_id JOIN Policies p ON a.agent_id = p.agent_id WHERE ab.year = 2024 AND STRFTIME('%Y', p.approval_date) = '2024' GROUP BY a.agent_id HAVING SUM(p.discount_from_bank) > ab.allocated_amount;", hints: ["השתמשו ב-JOIN בין טבלאות Agents, Agent_Budgets ו-Policies", "השתמשו ב-HAVING כדי להשוות בין סך ההנחות לתקציב שהוקצה"] },
  { id: "h2", title: "שמאים בענף עסקים", description: "הצג שמאים שטיפלו ביותר מ-5 תביעות בענף ה-'עסקים'.", difficulty: "Hard", correctSql: "SELECT a.appraiser_name FROM Appraisers a JOIN Appraiser_Actions aa ON a.appraiser_id = aa.appraiser_id JOIN Claimants ct ON aa.claimant_id = ct.claimant_id JOIN Claims c ON ct.claim_id = c.claim_id JOIN Endorsements e ON c.endorsement_id = e.endorsement_id JOIN Policies p ON e.policy_id = p.policy_id JOIN Products pr ON p.product_id = pr.product_id WHERE pr.line_of_business = 'עסקים' GROUP BY a.appraiser_id HAVING COUNT(DISTINCT c.claim_id) > 5;", hints: ["תצטרכו לקשר בין 5 טבלאות: Appraisers, Appraiser_Actions, Claimants, Claims ומוצרים", "השתמשו ב-GROUP BY לפי מזהה השמאי וב-HAVING COUNT(DISTINCT c.claim_id)"] },
  { id: "h3", title: "תביעות מרובות תובעים", description: "הצג תביעות עם יותר מ-3 תובעים שסך התשלומים עליהן עולה על 20,000 ש\"ח.", difficulty: "Hard", correctSql: "SELECT c.claim_id FROM Claims c JOIN Claimants ct ON c.claim_id = ct.claim_id JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id GROUP BY c.claim_id HAVING COUNT(DISTINCT ct.claimant_id) > 3 AND SUM(cp.amount) > 20000;", hints: ["השתמשו ב-DISTINCT בתוך ה-COUNT כדי לספור תובעים ייחודיים", "השתמשו ב-SUM(cp.amount) בתנאי ה-HAVING"] },
  { id: "h4", title: "זמן דיווח ממוצע למוצר", description: "חשב את ממוצע הימים בין תאריך האירוע לתאריך הפתיחה לכל שם מוצר.", difficulty: "Hard", correctSql: "SELECT pr.product_name, AVG(JULIANDAY(c.open_date) - JULIANDAY(c.loss_date)) FROM Products pr JOIN Policies p ON pr.product_id = p.product_id JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id GROUP BY pr.product_id;", hints: ["השתמשו ב-JULIANDAY כדי לבצע חיסור בין תאריכים", "השתמשו ב-AVG על תוצאת החיסור תחת GROUP BY"] },
  { id: "h5", title: "מבוטחים ללא נהג צעיר", description: "הצג מבוטחים שהגישו תביעה אך אינם מוגדרים כנהגים צעירים בפרופיל שלהם.", difficulty: "Hard", correctSql: "SELECT DISTINCT i.full_name FROM Insured i JOIN Policies p ON i.insured_id = p.insured_id JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id WHERE i.is_young_driver = 0;", hints: ["קשרו בין Insured, Policies ו-Claims", "סננו לפי is_young_driver = 0"] },
  { id: "h6", title: "ברוטו מול השתתפות עצמית", description: "עבור כל תביעה, הצג את סך תשלומי ה-'ברוטו' לעומת סך ה-'השתתפות עצמית'.", difficulty: "Hard", correctSql: "SELECT ct.claim_id, SUM(CASE WHEN cp.payment_category = 'ברוטו' THEN cp.amount ELSE 0 END) as gross, SUM(CASE WHEN cp.payment_category = 'השתתפות עצמית' THEN cp.amount ELSE 0 END) as deductible FROM Claim_Payments cp JOIN Claimants ct ON cp.claimant_id = ct.claimant_id GROUP BY ct.claim_id;", hints: ["השתמשו ב-CASE WHEN בתוך ה-SUM כדי לסכום קטגוריות שונות בנפרד", "קבצו לפי claim_id"] },
  { id: "h7", title: "סוכנים ולקוחות שונים", description: "הצג סוכנים שהעניקו הנחות ליותר מ-10 מבוטחים שונים.", difficulty: "Hard", correctSql: "SELECT a.agent_name FROM Agents a JOIN Policies p ON a.agent_id = p.agent_id WHERE p.discount_from_bank > 0 GROUP BY a.agent_id HAVING COUNT(DISTINCT p.insured_id) > 10;", hints: ["השתמשו ב-DISTINCT בתוך ה-COUNT כדי לספור מבוטחים ייחודיים", "סננו לפי discount_from_bank > 0"] },
  { id: "h8", title: "נהג שאינו המבוטח", description: "הצג תביעות שבהן הנהג אינו המבוטח וסוג הנהג הוא 'צעיר'.", difficulty: "Hard", correctSql: "SELECT * FROM Claims WHERE driver_is_insured = 0 AND driver_type = 'צעיר';", hints: ["סננו לפי driver_is_insured = 0", "וודאו שסוג הנהג הוא 'צעיר'"] },
  { id: "h9", title: "שמאים מובילים בתשלומים", description: "הצג את 3 השמאים שאישרו את סכומי התשלום הגבוהים ביותר במצטבר.", difficulty: "Hard", correctSql: "SELECT a.appraiser_name, SUM(cp.amount) FROM Appraisers a JOIN Claims c ON a.appraiser_id = c.appraiser_id JOIN Claimants ct ON c.claim_id = ct.claim_id JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id GROUP BY a.appraiser_id ORDER BY SUM(cp.amount) DESC LIMIT 3;", hints: ["קבצו לפי appraiser_id/name וסכמו את ה-amount", "מיינו בסדר יורד והגבילו את התוצאות ל-3"] },
  { id: "h10", title: "הנחות גבוהות מהממוצע", description: "הצג פוליסות שבהן ההנחה גבוהה מההנחה הממוצעת שניתנה על ידי אותו סוכן.", difficulty: "Hard", correctSql: "SELECT p1.* FROM Policies p1 WHERE p1.discount_from_bank > (SELECT AVG(p2.discount_from_bank) FROM Policies p2 WHERE p2.agent_id = p1.agent_id);", hints: ["השתמשו בתת-שאילתה (Subquery) המקושרת לשאילתה הראשית לפי agent_id", "חשבו את ה-AVG בתוך התת-שאילתה"] },
  { id: "h11", title: "תובעים חוזרים", description: "הצג שמות תובעים המופיעים ביותר מתביעה אחת במערכת.", difficulty: "Hard", correctSql: "SELECT claimant_name FROM Claimants GROUP BY claimant_name HAVING COUNT(DISTINCT claim_id) > 1;", hints: ["קבצו לפי claimant_name", "השתמשו ב-HAVING COUNT(DISTINCT claim_id) > 1 כדי למצוא כפילויות"] },
  { id: "h12", title: "תשלומים לאחר סגירה", description: "הצג תביעות שבוצע בהן תשלום מסוג 'כינון' למרות שהסטטוס הוא 'סגורה'.", difficulty: "Hard", correctSql: "SELECT DISTINCT c.claim_id FROM Claims c JOIN Claimants ct ON c.claim_id = ct.claim_id JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id WHERE c.claim_status = 'סגורה' AND cp.payment_category = 'כינון';", hints: ["סננו לפי סטטוס 'סגורה'", "וודאו שקטגוריית התשלום היא 'כינון'"] },
  { id: "h13", title: "יתרת תקציב גבוהה", description: "הצג סוכנים שנותרה להם יתרת תקציב של מעל 5,000 ש\"ח לשנת 2024.", difficulty: "Hard", correctSql: "SELECT a.agent_name FROM Agents a JOIN Agent_Budgets ab ON a.agent_id = ab.agent_id JOIN Policies p ON a.agent_id = p.agent_id WHERE ab.year = 2024 GROUP BY a.agent_id HAVING (ab.allocated_amount - SUM(p.discount_from_bank)) > 5000;", hints: ["חשבו את ההפרש בין allocated_amount ל-SUM של ההנחות", "הציבו את החישוב בתוך תנאי ה-HAVING"] },
  { id: "h14", title: "מוצרים ללא תביעות השנה", description: "הצג מוצרים שלא נפתחה עבורם אף תביעה בשנת 2024.", difficulty: "Hard", correctSql: "SELECT product_name FROM Products WHERE product_id NOT IN (SELECT p.product_id FROM Policies p JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id WHERE STRFTIME('%Y', c.open_date) = '2024');", hints: ["השתמשו ב-NOT IN עם תת-שאילתה (Subquery)", "בתת-שאילתה מצאו את כל ה-product_id של מוצרים עם תביעה ב-2024"] },
  { id: "h15", title: "חלפים מול ירידת ערך", description: "הצג תביעות שבהן סכום ה-'חלפים' גבוה מסכום ה-'ירידת ערך'.", difficulty: "Hard", correctSql: "SELECT ct.claim_id FROM Claimants ct JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id GROUP BY ct.claim_id HAVING SUM(CASE WHEN cp.payment_category = 'חלפים' THEN cp.amount ELSE 0 END) > SUM(CASE WHEN cp.payment_category = 'ירידת ערך' THEN cp.amount ELSE 0 END);", hints: ["השתמשו ב-SUM(CASE WHEN...) בתוך ה-HAVING", "השוו בין הסכום של 'חלפים' לסכום של 'ירידת ערך'"] },
  { id: "h16", title: "שמאי רכוש בתיק רכב", description: "הצג תביעות שטופלו על ידי שמאים עם התמחות 'רכוש' עבור מוצרים בענף 'רכב מקיף'.", difficulty: "Hard", correctSql: "SELECT DISTINCT c.claim_id FROM Claims c JOIN Claimants ct ON c.claim_id = ct.claim_id JOIN Appraiser_Actions aa ON ct.claimant_id = aa.claimant_id JOIN Appraisers a ON aa.appraiser_id = a.appraiser_id JOIN Endorsements e ON c.endorsement_id = e.endorsement_id JOIN Policies p ON e.policy_id = p.policy_id JOIN Products pr ON p.product_id = pr.product_id WHERE a.specialty = 'רכוש' AND pr.line_of_business = 'רכב מקיף';", hints: ["בצעו JOIN דרך Appraiser_Actions ו-Claimants", "סננו לפי specialty = 'רכוש' וגם line_of_business = 'רכב מקיף'"] },
  { id: "h17", title: "מבוטחים רב-ענפיים", description: "הצג מבוטחים שיש להם פוליסות ביותר מ-2 ענפים מסחריים שונים.", difficulty: "Hard", correctSql: "SELECT i.full_name FROM Insured i JOIN Policies p ON i.insured_id = p.insured_id JOIN Products pr ON p.product_id = pr.product_id GROUP BY i.insured_id HAVING COUNT(DISTINCT pr.line_of_business) > 2;", hints: ["השתמשו ב-COUNT(DISTINCT line_of_business) כדי לספור ענפים ייחודיים", "קבצו לפי insured_id"] },
  { id: "h18", title: "ריבית מצטברת לסוכן", description: "חשב את סך הריבית ששולמה בתביעות עבור פוליסות של כל סוכן.", difficulty: "Hard", correctSql: "SELECT a.agent_name, SUM(cp.amount) FROM Agents a JOIN Policies p ON a.agent_id = p.agent_id JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id JOIN Claimants ct ON c.claim_id = ct.claim_id JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id WHERE cp.payment_category = 'ריבית' GROUP BY a.agent_id;", hints: ["קשרו בין Agents, Policies, Claims ו-Claim_Payments", "סננו לפי payment_category = 'ריבית' וקבצו לפי שם הסוכן"] },
  { id: "h19", title: "מע\"מ ללא ברוטו", description: "הצג תביעות שבוצע בהן תשלום 'חילוץ מע\"מ' אך לא בוצע תשלום 'ברוטו'.", difficulty: "Hard", correctSql: "SELECT DISTINCT ct.claim_id FROM Claimants ct JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id WHERE cp.payment_category = 'חילוץ מע\"מ' AND ct.claim_id NOT IN (SELECT ct2.claim_id FROM Claimants ct2 JOIN Claim_Payments cp2 ON ct2.claimant_id = cp2.claimant_id WHERE cp2.payment_category = 'ברוטו');", hints: ["השתמשו ב-NOT IN כדי למצוא תביעות שאין להן תשלום 'ברוטו'", "סננו את השאילתה הראשית לפי 'חילוץ מע\"מ'"] },
  { id: "h20", title: "סוכני חובה בלבד", description: "הצג סוכנים שמכרו פוליסות רק בענף 'חובה'.", difficulty: "Hard", correctSql: "SELECT agent_name FROM Agents a JOIN Policies p ON a.agent_id = p.agent_id JOIN Products pr ON p.product_id = pr.product_id GROUP BY a.agent_id HAVING COUNT(DISTINCT pr.line_of_business) = 1 AND MAX(pr.line_of_business) = 'חובה';", hints: ["השתמשו ב-COUNT(DISTINCT line_of_business) = 1 ב-HAVING", "וודאו שהענף היחיד הוא 'חובה'"] },
  { id: "h_or_1", title: "פיצויים חריגים או ריבוי תשלומים", description: "שלוף מזהה תובעים (claimant_id) ששולם עבורם מעל 15,000 ש\"ח בקטגוריית 'ברוטו', או שבוצעו עבורם לפחות 3 תשלומים שונים בכל קטגוריה שהיא.", difficulty: "Hard", correctSql: "SELECT claimant_id FROM Claim_Payments GROUP BY claimant_id HAVING SUM(CASE WHEN payment_category = 'השתתפות עצמית' THEN amount ELSE 0 END) > 5000 OR COUNT(payment_id) >= 3;", hints: ["השתמשו ב-SUM(CASE WHEN...) כדי לסכום קטגוריות ספציפיות", "השתמשו ב-OR כדי לחבר תנאים ב-HAVING"] },
  { id: "h_or_2", title: "פוליסות מבוטלות או ללא תביעות", description: "הצג את כל הפוליסות שבהן סטטוס הפוליסה הוא 'מבוטלת' או שאינן קיימות כלל בטבלת התביעות (policy_id לא מופיע ב-Claims).", difficulty: "Hard", correctSql: "SELECT * FROM Policies WHERE status = 'מבוטלת' OR policy_id NOT IN (SELECT DISTINCT e.policy_id FROM Endorsements e JOIN Claims c ON e.endorsement_id = c.endorsement_id);", hints: ["השתמשו ב-OR בין התנאים לגבי סטטוס הפוליסה ואי-קיומה בטבלת Claims", "הימנעו מבעיות עם ערכי NULL בתוך שאילתת ה-NOT IN של Claims"] },
  
  // DATA TRANSFORMATION & CLEANING (10)
  { id: "dt1", title: "נירמול תעודות זהות", description: "הצג את שמות המבוטחים ואת מספר הזהות שלהם כשהוא מרופד באפסים משמאל כך שיהיו בדיוק 9 ספרות.", difficulty: "Medium", correctSql: "SELECT full_name, LPAD(insured_id, 9, '0') as valid_id FROM Insured;" },
  { id: "dt2", title: "אחידות תאריכי הפקה", description: "הצג מספרי פוליסות ואת תאריך האישור שלהן בפורמט אחיד של DD/MM/YYYY.", difficulty: "Medium", correctSql: "SELECT policy_id, STRFTIME('%d/%m/%Y', approval_date) as formatted_date FROM Policies;" },
  { id: "dt3", title: "אנומליה בתאריכי תביעה", description: "מנהלי סיכונים חושדים שיש תקלות במערכת הישנה. מצא את כל התביעות שבהן תאריך פתיחת התביעה (open_date) מופיע לפני תאריך האירוע (loss_date).", difficulty: "Medium", correctSql: "SELECT * FROM Claims WHERE open_date < loss_date;" },
  { id: "dt4", title: "ניקוי שמות סוכנים", description: "הצג את שמות הסוכנים ללא רווחים מיותרים בתחילת או בסוף השם, והפוך את השם לאותיות גדולות (אם באנגלית).", difficulty: "Medium", correctSql: "SELECT UPPER(TRIM(agent_name)) as clean_name FROM Agents;" },
  { id: "dt5", title: "טיפול בערכי NULL בהנחות", description: "עבור כל פוליסה, הצג את מספר הפוליסה ואת סכום ההנחה. אם ההנחה היא NULL, הצג את הערך 0.", difficulty: "Medium", correctSql: "SELECT policy_id, COALESCE(discount_from_bank, 0) as actual_discount FROM Policies;" },
  { id: "dt6", title: "המרה למספרים", description: "הפוך את שדה ה-insured_id לטיפוס INTEGER לצורך הצלבה עם מערכת חיצונית.", difficulty: "Medium", correctSql: "SELECT CAST(insured_id AS INTEGER) as numeric_id FROM Insured;" },
  { id: "dt7", title: "זיהוי תביעות ללא מסמכים", description: "הצג תביעות שנפתחו אך שדה 'האם נסרק מסמך' הוא חסר (NULL) או FALSE.", difficulty: "Medium", correctSql: "SELECT * FROM Claims WHERE COALESCE(is_document_scanned, 0) = 0;" },
  { id: "dt8", title: "פורמט תאריך מותאם אישית", description: "הצג את שנת האירוע ואת החודש (בנפרד) עבור כל תביעה.", difficulty: "Medium", correctSql: "SELECT claim_id, STRFTIME('%Y', loss_date) as year, STRFTIME('%m', loss_date) as month FROM Claims;" },
  { id: "dt9", title: "חישוב נזק במעורבות ירידת ערך", description: "חשב את סך התשלום (ברוטו + ירידת ערך) עבור כל תביעה, תוך טיפול בערכי NULL כ-0.", difficulty: "Hard", correctSql: "SELECT claimant_id, SUM(CASE WHEN payment_category IN ('ברוטו', 'ירידת ערך') THEN COALESCE(amount, 0) ELSE 0 END) as total_payment FROM Claim_Payments GROUP BY claimant_id;" },
  { id: "dt10", title: "זיהוי מבוטחים ללא עיר", description: "הצג מבוטחים ששדה העיר שלהם ריק או מכיל רק רווחים.", difficulty: "Easy", correctSql: "SELECT * FROM Insured WHERE TRIM(COALESCE(city, '')) = '';" },
  { id: "dt11", title: "חישוב אובדן גמור (Total Loss)", description: "חשב את אחוז הנזק עבור כל תביעת רכב לפי הנוסחה: (עלות תיקון + ירידת ערך) חלקי ערך השוק. הצג את התוצאה כעמודה בשם 'damage_pct' וסמן 'total_loss_warning' כ-TRUE אם הנזק הוא 60% (0.60) ומעלה.", difficulty: "Hard", correctSql: "SELECT claimant_id, (COALESCE(repair_cost, 0) + COALESCE(depreciation, 0)) / market_value as damage_pct, CASE WHEN (COALESCE(repair_cost, 0) + COALESCE(depreciation, 0)) / market_value >= 0.60 THEN 1 ELSE 0 END as total_loss_warning FROM (SELECT claimant_id, SUM(CASE WHEN payment_category = 'ברוטו' THEN amount ELSE 0 END) as repair_cost, SUM(CASE WHEN payment_category = 'ירידת ערך' THEN amount ELSE 0 END) as depreciation, 50000.0 as market_value FROM Claim_Payments GROUP BY claimant_id);" },

  // RESULT LIMITING & TOP (NEW)
  { id: "lr1", title: "חמש התביעות הגבוהות", description: "הצג את 5 התביעות עם סכום הנזק הכולל הגבוה ביותר.", difficulty: "Easy", correctSql: "SELECT * FROM Claims ORDER BY loss_amount DESC LIMIT 5;", hints: ["השתמש ב-ORDER BY כדי למיין מהגבוה לנמוך", "השתמש ב-LIMIT 5 כדי להגביל את התוצאות"] },
  { id: "lr2", title: "הסוכן הפעיל ביותר", description: "מצא את שם הסוכן שיש לו את מספר הפוליסות הגבוה ביותר (הצג רק את הסוכן הראשון).", difficulty: "Medium", correctSql: "SELECT a.agent_name, COUNT(p.policy_id) as count FROM Agents a JOIN Policies p ON a.agent_id = p.agent_id GROUP BY a.agent_id ORDER BY count DESC LIMIT 1;", hints: ["בצע JOIN בין סוכנים לפוליסות", "מיין לפי הכמות מהגבוה לנמוך והגבל ל-1"] },
  { id: "lr3", title: "מבוטחים חדשים", description: "הצג את 10 המבוטחים האחרונים שהצטרפו למערכת (לפי תאריך הפוליסה הראשונה).", difficulty: "Medium", correctSql: "SELECT i.full_name, MIN(p.start_date) as first_policy FROM Insured i JOIN Policies p ON i.insured_id = p.insured_id GROUP BY i.insured_id ORDER BY first_policy DESC LIMIT 10;" },
  { id: "lr4", title: "דגימת תביעות", description: "דלג על 5 התביעות הראשונות (לפי תאריך) והצג את ה-5 הבאות אחריהן לצורך בקרת איכות.", difficulty: "Hard", correctSql: "SELECT * FROM Claims ORDER BY open_date ASC LIMIT 5 OFFSET 5;", hints: ["השתמש ב-LIMIT כדי להחזיר 5 תוצאות", "השתמש ב-OFFSET 5 כדי לדלג על ה-5 הראשונות"] },
  { id: "lr5", title: "פרמיות גבוהות בביטוח חובה", description: "הצג את 3 הפוליסות היקרות ביותר (פרמיה) בענף 'חובה'.", difficulty: "Medium", correctSql: "SELECT p.policy_id, p.premium FROM Policies p JOIN Products pr ON p.product_id = pr.product_id WHERE pr.line_of_business = 'חובה' ORDER BY p.premium DESC LIMIT 3;" },
  
  // AS400 / DB2 SPECIALS (NEW)
  { id: "as1", title: "שליפת מדגם (AS400 Syntax)", description: "שלפו את 10 הפוליסות האחרונות שהופקו במערכת באמצעות תחביר התואם למערכות AS400 (שימוש ב-FETCH FIRST).", difficulty: "Medium", correctSql: "SELECT * FROM Policies ORDER BY approval_date DESC FETCH FIRST 10 ROWS ONLY;", hints: ["במערכות ביטוח (DB2) משתמשים ב-FETCH FIRST n ROWS ONLY במקום LIMIT"] },
  { id: "as2", title: "ריפוד תעודות זהות (מערכת ישנה)", description: "הצג את המבוטחים שקיימת לגביהם תעודת זהות קצרה מ-9 ספרות, כשהיא מרופדת באפסים משמאל (שימוש ב-DIGITS או LPAD).", difficulty: "Medium", correctSql: "SELECT full_name, LPAD(insured_id, 9, '0') as clean_id FROM Insured WHERE LENGTH(insured_id) < 9;" },
  { id: "as3", title: "המרת תאריכי הפקה (Varchar Format)", description: "הצג את מספרי הפוליסות ואת תאריך ההפקה כטקסט בפורמט 'YYYYMMDD' (פורמט קבצי ממשק נפוץ בביטוח).", difficulty: "Hard", correctSql: "SELECT policy_id, STRFTIME('%Y%m%d', approval_date) as interface_date FROM Policies;" },
  
  // BUSINESS PERFORMANCE & RATIOS (NEW)
  { id: "biz1", title: "יחס המרה לפי סוכן", description: "עבור כל סוכן, הצג את אחוז הצעות הביטוח שהפכו לפוליסות פעילות (סוג תנועה 'הפקה').", difficulty: "Hard", correctSql: "SELECT a.agent_name, COUNT(CASE WHEN p.movement_type = 'הפקה' THEN 1 END) * 100.0 / COUNT(*) as conversion_rate FROM Agents a LEFT JOIN Policies p ON a.agent_id = p.agent_id GROUP BY a.agent_id;" },
  { id: "biz2", title: "זמן ממוצע לסגירת תביעה", description: "חשב את מספר הימים הממוצע שעבר בין פתיחת תביעה לתשלום הראשון שבוצע בה.", difficulty: "Hard", correctSql: "SELECT AVG(JULIANDAY(cp.payment_date) - JULIANDAY(c.open_date)) as avg_days_to_pay FROM Claims c JOIN Claimants ct ON c.claim_id = ct.claim_id JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id;" },
  { id: "biz3", title: "פוליסות בסיכון גבוה", description: "מצא את 10 הערים עם כמות התביעות הגבוהה ביותר ביחס לכמות המבוטחים בהן.", difficulty: "Expert", correctSql: "SELECT i.city, COUNT(DISTINCT c.claim_id) * 1.0 / COUNT(DISTINCT i.insured_id) as claim_density FROM Insured i JOIN Policies p ON i.insured_id = p.insured_id JOIN Claims c ON p.policy_id = c.policy_id GROUP BY i.city ORDER BY claim_density DESC LIMIT 10;" },
  { id: "biz4", title: "תמהיל מוצרים בסוכנות", description: "הצג את התפלגות המכירות של כל סוכן לפי ענף ביטוח (Line of Business).", difficulty: "Medium", correctSql: "SELECT a.agent_name, pr.line_of_business, SUM(e.premium_diff) as total FROM Agents a JOIN Policies p ON a.agent_id = p.agent_id JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Products pr ON p.product_id = pr.product_id GROUP BY a.agent_name, pr.line_of_business;" },
  { id: "biz5", title: "שימור לקוחות (Retention)", description: "מצא מבוטחים שיש להם פוליסות שפג תוקפן ב-30 הימים האחרונים וטרם חידשו (אין להם פוליסה פעילה חדשה).", difficulty: "Expert", correctSql: "SELECT DISTINCT i.full_name FROM Insured i JOIN Policies p1 ON i.insured_id = p1.insured_id WHERE p1.end_date BETWEEN DATE('now', '-30 days') AND DATE('now') AND NOT EXISTS (SELECT 1 FROM Policies p2 WHERE p2.insured_id = i.insured_id AND p2.start_date > p1.end_date);" },
  { id: "biz6", title: "ניתוח תביעות צד ג'", description: "הצג את סך הפיצויים ששולמו עבור תביעות שבהן קיים 'צד ג' (claimant_seq > 1).", difficulty: "Medium", correctSql: "SELECT SUM(amount) FROM Claim_Payments WHERE claimant_id IN (SELECT claimant_id FROM Claimants WHERE claimant_seq > 1);" },
  
  // ADVANCED LOGIC & SUBQUERIES (NEW)
  { id: "adv1", title: "מבוטחים ללא תביעות", description: "הצג את כל המבוטחים שמעולם לא פתחו תביעה (השתמש ב-NOT EXISTS).", difficulty: "Hard", correctSql: "SELECT * FROM Insured i WHERE NOT EXISTS (SELECT 1 FROM Policies p JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id WHERE p.insured_id = i.insured_id);", hints: ["השתמש ב-NOT EXISTS עם תת-שאילתה שקושרת בין Policies ל-Claims"] },
  { id: "adv2", title: "איחוד נתוני סוכנים ומוצרים", description: "הצג רשימה מאוחדת של כל שמות הסוכנים וכל שמות המוצרים הקיימים במערכת (UNION).", difficulty: "Medium", correctSql: "SELECT agent_name as name FROM Agents UNION SELECT product_name as name FROM Products;" },
  { id: "adv3", title: "פוליסות מעל הממוצע", description: "הצג פוליסות שסך הפרמיה שלהן (סיכום תוספות) גבוה מהפרמיה הממוצעת בכל המערכת.", difficulty: "Medium", correctSql: "WITH PolicyPremiums AS (SELECT policy_id, SUM(premium_diff) as total_premium FROM Endorsements GROUP BY policy_id) SELECT * FROM Policies p JOIN PolicyPremiums pp ON p.policy_id = pp.policy_id WHERE pp.total_premium > (SELECT AVG(total_premium) FROM PolicyPremiums);" },
  { id: "adv4", title: "ניתוח תקציב עם CTE", description: "השתמש ב-CTE כדי לחשב קודם את סך הפרמיות (סיכום תוספות) לכל סוכן, ואז הצג רק את הסוכנים שעברו את התקציב השנתי שלהם (agent_budget).", difficulty: "Expert", correctSql: "WITH AgentSales AS (SELECT p.agent_id, SUM(e.premium_diff) as total_sales FROM Policies p JOIN Endorsements e ON p.policy_id = e.policy_id GROUP BY p.agent_id) SELECT a.agent_name, s.total_sales, a.agent_budget FROM Agents a JOIN AgentSales s ON a.agent_id = s.agent_id WHERE s.total_sales > a.agent_budget;" },
  { id: "adv5", title: "מבוטחים עם מספר פוליסות", description: "הצג מבוטחים שיש להם יותר מפוליסה אחת פעילה (השתמש ב-IN עם תת-שאילתה).", difficulty: "Hard", correctSql: "SELECT * FROM Insured WHERE insured_id IN (SELECT insured_id FROM Policies GROUP BY insured_id HAVING COUNT(*) > 1);" },
  { id: "adv6", title: "השוואת ענפים", description: "מצא את הענף (line_of_business) שבו הפרמיה המקסימלית לפוליסה נמוכה מהפרמיה הממוצעת של ענף ה-'חובה'.", difficulty: "Expert", correctSql: "WITH PolicyPremiums AS (SELECT policy_id, SUM(premium_diff) as total_premium FROM Endorsements GROUP BY policy_id) SELECT line_of_business FROM Products pr JOIN Policies p ON pr.product_id = p.product_id JOIN PolicyPremiums pp ON p.policy_id = pp.policy_id GROUP BY line_of_business HAVING MAX(pp.total_premium) < (SELECT AVG(total_premium) FROM PolicyPremiums pp2 JOIN Policies p2 ON pp2.policy_id = p2.policy_id JOIN Products pr2 ON p2.product_id = pr2.product_id WHERE pr2.line_of_business = 'חובה');" },
  { id: "adv7", title: "תביעות חריגות", description: "הצג תביעות שסכום הנזק שלהן גבוה פי 2 מהממוצע של אותו סוג מוצר.", difficulty: "Expert", correctSql: "SELECT * FROM Claims c JOIN Policies p ON c.policy_id = p.policy_id WHERE c.loss_amount > (SELECT AVG(c2.loss_amount) * 2 FROM Claims c2 JOIN Policies p2 ON c2.policy_id = p2.policy_id WHERE p2.product_id = p.product_id);" },
  { id: "adv8", title: "סוכנים ללא 'ביטוח דירה'", description: "מצא סוכנים שמעולם לא מכרו מוצר מסוג 'ביטוח דירה' (השתמש ב-EXCEPT או NOT IN).", difficulty: "Hard", correctSql: "SELECT agent_name FROM Agents WHERE agent_id NOT IN (SELECT p.agent_id FROM Policies p JOIN Products pr ON p.product_id = pr.product_id WHERE pr.product_name = 'ביטוח דירה');" },

  // EXPERT (20)
  { id: "x1", title: "ניתוח יחס הפסד (Loss Ratio)", description: "חשב יחס הפסד (סך תשלומי תביעות חלקי סך פרמיות) לכל ענף מסחרי בשנת 2024.", difficulty: "Expert", correctSql: "WITH Prem AS (SELECT pr.line_of_business, SUM(e.premium_diff) as total_premium FROM Products pr JOIN Policies p ON pr.product_id = p.product_id JOIN Endorsements e ON p.policy_id = e.policy_id GROUP BY pr.line_of_business), Claims AS (SELECT pr.line_of_business, SUM(cp.amount) as total_claims FROM Products pr JOIN Policies p ON pr.product_id = p.product_id JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id JOIN Claimants ct ON c.claim_id = ct.claim_id JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id WHERE STRFTIME('%Y', c.open_date) = '2024' GROUP BY pr.line_of_business) SELECT p.line_of_business, (c.total_claims * 1.0 / p.total_premium) as loss_ratio FROM Prem p JOIN Claims c ON p.line_of_business = c.line_of_business;", hints: ["השתמשו ב-CTE נפרדים לחישוב פרמיות ותביעות כדי למנוע כפילויות (Fan-out)", "זכרו לסנן לפי שנת 2024 ב-CTE של התביעות"] },
  { id: "x2", title: "ניצול תקציב חודשי", description: "הצג את סך ההנחות שניתנו על ידי כל סוכן בכל חודש בשנת 2024.", difficulty: "Expert", correctSql: "SELECT agent_id, STRFTIME('%m', approval_date) as month, SUM(discount_from_bank) FROM Policies WHERE STRFTIME('%Y', approval_date) = '2024' GROUP BY agent_id, month;", hints: ["השתמשו ב-STRFTIME('%m', ...) כדי לחלץ את החודש מתאריך האישור", "קבצו לפי agent_id וגם לפי החודש שחילצתם"] },
  { id: "x3", title: "מבוטחים בסיכון גבוה", description: "מבוטחים שהם נהגים צעירים וגם חדשים שהגישו מעל 2 תביעות בשנה האחרונה.", difficulty: "Expert", correctSql: "SELECT i.full_name FROM Insured i JOIN Policies p ON i.insured_id = p.insured_id JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id WHERE i.is_young_driver = 1 AND i.is_new_driver = 1 AND c.loss_date > DATE('now', '-1 year') GROUP BY i.insured_id HAVING COUNT(c.claim_id) > 2;", hints: ["השתמשו ב-DATE('now', '-1 year') כדי לסנן תביעות מהשנה האחרונה", "סננו לפי is_young_driver = 1 וגם is_new_driver = 1"] },
  { id: "x4", title: "דירוג שמאים לפי יעילות", description: "דרג שמאים לפי ממוצע הימים שלוקח להם לפתוח תביעה מיום האירוע.", difficulty: "Expert", correctSql: "SELECT a.appraiser_name, AVG(JULIANDAY(c.open_date) - JULIANDAY(c.loss_date)) as avg_lag FROM Appraisers a JOIN Claims c ON a.appraiser_id = c.appraiser_id GROUP BY a.appraiser_id ORDER BY avg_lag ASC;", hints: ["השתמשו ב-AVG על חיסור תאריכים באמצעות JULIANDAY", "מיינו את התוצאה ב-ORDER BY בסדר עולה (ASC)"] },
  { id: "x5", title: "התפלגות מהויות תשלום", description: "הצג את אחוז הסכום של כל מהות תשלום מתוך סך התשלומים הכללי.", difficulty: "Expert", correctSql: "SELECT payment_category, SUM(amount) * 100.0 / (SELECT SUM(amount) FROM Claim_Payments) as pct FROM Claim_Payments GROUP BY payment_category;", hints: ["השתמשו בתת-שאילתה (Subquery) כדי לקבל את הסכום הכולל עבור המכנה", "הכפילו ב-100.0 כדי לקבל תוצאה עשרונית באחוזים"] },
  { id: "x6", title: "סוכנים עם יתרה שלילית", description: "הצג סוכנים שחרגו מהתקציב השנתי שלהם ב-20% ומעלה.", difficulty: "Expert", correctSql: "SELECT a.agent_name FROM Agents a JOIN Agent_Budgets ab ON a.agent_id = ab.agent_id JOIN Policies p ON a.agent_id = p.agent_id WHERE ab.year = 2024 GROUP BY a.agent_id HAVING SUM(p.discount_from_bank) > (ab.allocated_amount * 1.2);", hints: ["הכפילו את ה-allocated_amount ב-1.2 בתנאי ה-HAVING", "השתמשו ב-SUM(discount_from_bank) כדי לחשב את סך ההנחות שנוצלו"] },
  { id: "x7", title: "תביעות ללא תובע ראשי", description: "הצג תביעות שבהן לא קיים תובע עם מספר סידורי 1.", difficulty: "Expert", correctSql: "SELECT claim_id FROM Claims WHERE claim_id NOT IN (SELECT claim_id FROM Claimants WHERE claimant_seq = 1);", hints: ["השתמשו ב-NOT IN עם תת-שאילתה (Subquery)", "בתת-שאילתה חפשו תביעות עם claimant_seq = 1"] },
  { id: "x8", title: "ממוצע תשלום לנהג צעיר", description: "השוואה בין ממוצע תשלום תביעה לנהג צעיר לעומת נהג רגיל לכל מוצר.", difficulty: "Expert", correctSql: "SELECT p.product_id, AVG(CASE WHEN c.driver_type = 'צעיר' THEN cp.amount END) as avg_young, AVG(CASE WHEN c.driver_type = 'רגיל' THEN cp.amount END) as avg_regular FROM Policies p JOIN Claims c ON p.policy_id = c.policy_id JOIN Claimants ct ON c.claim_id = ct.claim_id JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id GROUP BY p.product_id;", hints: ["השתמשו ב-CASE WHEN בתוך ה-AVG כדי לחשב ממוצע מותנה", "קבצו לפי product_id"] },
  { id: "x9", title: "פוליסות עם הנחה מקסימלית", description: "הצג פוליסות שקיבלו את ההנחה הגבוהה ביותר שניתנה אי פעם על ידי הסוכן שלהן.", difficulty: "Expert", correctSql: "SELECT p1.* FROM Policies p1 WHERE p1.discount_from_bank = (SELECT MAX(p2.discount_from_bank) FROM Policies p2 WHERE p2.agent_id = p1.agent_id);", hints: ["השתמשו בתת-שאילתה (Subquery) המקושרת לפי agent_id", "מצאו את ה-MAX של discount_from_bank בתוך התת-שאילתה"] },
  { id: "x10", title: "ניתוח רווחיות סוכן", description: "חשב רווח נקי לסוכן: (סך פרמיות פחות הנחות בנק) פחות סך תשלומי תביעות.", difficulty: "Expert", correctSql: "WITH PolicyFin AS (SELECT p.agent_id, p.policy_id, p.discount_from_bank, SUM(e.premium_diff) as prem FROM Policies p JOIN Endorsements e ON p.policy_id = e.policy_id GROUP BY p.policy_id), AgentClaims AS (SELECT p.agent_id, SUM(cp.amount) as total_claims FROM Policies p JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id JOIN Claimants ct ON c.claim_id = ct.claim_id JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id GROUP BY p.agent_id) SELECT a.agent_name, (SUM(pf.prem) - SUM(pf.discount_from_bank)) - COALESCE(ac.total_claims, 0) as profit FROM Agents a JOIN PolicyFin pf ON a.agent_id = pf.agent_id LEFT JOIN AgentClaims ac ON a.agent_id = ac.agent_id GROUP BY a.agent_id;", hints: ["השתמשו ב-CTE נפרד לחישוב פרמיות והנחות ברמת פוליסה כדי למנוע כפילויות", "סכמו הכל ברמת סוכן בשאילתה הראשית"] },
  { id: "x11", title: "תביעות חוזרות באותו ענף", description: "מבוטחים שהגישו מעל 3 תביעות באותו ענף מסחרי תוך שנתיים.", difficulty: "Expert", correctSql: "SELECT i.full_name, pr.line_of_business FROM Insured i JOIN Policies p ON i.insured_id = p.insured_id JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id JOIN Products pr ON p.product_id = pr.product_id WHERE c.loss_date > DATE('now', '-2 years') GROUP BY i.insured_id, pr.line_of_business HAVING COUNT(c.claim_id) > 3;", hints: ["קבצו לפי insured_id וגם לפי line_of_business", "סננו ב-HAVING לפי COUNT(c.claim_id) > 3"] },
  { id: "x12", title: "שמאים ללא תביעות פתוחות", description: "הצג שמאים שכל התביעות שבדקו כבר סגורות.", difficulty: "Expert", correctSql: "SELECT appraiser_name FROM Appraisers WHERE appraiser_id IN (SELECT appraiser_id FROM Claims) AND appraiser_id NOT IN (SELECT appraiser_id FROM Claims WHERE claim_status != 'סגורה');", hints: ["השתמשו ב-NOT IN כדי לסנן שמאים שיש להם תביעה שאינה 'סגורה'", "וודאו שהשמאי אכן טיפל בלפחות תביעה אחת (IN (SELECT ...))"] },
  { id: "x13", title: "התפלגות הנחות לפי ענף", description: "מהו אחוז ההנחה הממוצע (מתוך סך הפרמיה) שניתן בכל ענף מסחרי?", difficulty: "Expert", correctSql: "WITH PP AS (SELECT policy_id, SUM(premium_diff) as total FROM Endorsements GROUP BY policy_id) SELECT pr.line_of_business, AVG(p.discount_from_bank * 100.0 / pp.total) FROM Products pr JOIN Policies p ON pr.product_id = p.product_id JOIN PP pp ON p.policy_id = pp.policy_id GROUP BY pr.line_of_business;", hints: ["חשבו (discount_from_bank * 100.0 / total_premium) בתוך פונקציית ה-AVG", "קבצו לפי ענף (line_of_business)"] },
  { id: "x14", title: "תביעות עם ריבית והוצאות", description: "הצג תביעות שבהן שולמו גם ריבית וגם הוצאות, וסכומן יחד עולה על תשלום הברוטו.", difficulty: "Expert", correctSql: "SELECT ct.claim_id FROM Claimants ct JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id GROUP BY ct.claim_id HAVING SUM(CASE WHEN cp.payment_category IN ('ריבית', 'הוצאות') THEN cp.amount ELSE 0 END) > SUM(CASE WHEN cp.payment_category = 'ברוטו' THEN cp.amount ELSE 0 END);", hints: ["השתמשו ב-SUM(CASE WHEN...) כדי לסכום 'ריבית' ו'הוצאות' יחד", "השוו את הסכום הזה לסכום של 'ברוטו' בתוך ה-HAVING"] },
  { id: "x15", title: "סוכנים עם צמיחה בהנחות", description: "סוכנים שנתנו יותר הנחות ב-2024 לעומת 2023.", difficulty: "Expert", correctSql: "SELECT a.agent_name FROM Agents a WHERE (SELECT SUM(discount_from_bank) FROM Policies WHERE agent_id = a.agent_id AND STRFTIME('%Y', approval_date) = '2024') > (SELECT SUM(discount_from_bank) FROM Policies WHERE agent_id = a.agent_id AND STRFTIME('%Y', approval_date) = '2023');", hints: ["השתמשו בשתי תת-שאילתות (Subqueries) במקביל בתוך ה-WHERE", "השוו בין הסכום של 2024 לסכום של 2023"] },
  { id: "x16", title: "מבוטחים ללא תביעות צד ג'", description: "מבוטחים שיש להם מעל 5 תביעות וכולן ללא מעורבות צד ג' (לפי נתוני המערכת).", difficulty: "Expert", correctSql: "SELECT i.full_name FROM Insured i JOIN Policies p ON i.insured_id = p.insured_id JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id GROUP BY i.insured_id HAVING COUNT(DISTINCT c.claim_id) > 5 AND SUM(CASE WHEN c.driver_is_insured = 0 THEN 1 ELSE 0 END) = 0;", hints: ["השתמשו ב-SUM(CASE WHEN...) ב-HAVING כדי לוודא שאין תביעות עם driver_is_insured = 0", "ודאו ש-COUNT(DISTINCT c.claim_id) > 5"] },
  { id: "x17", title: "ניתוח ירידת ערך לפי שמאי", description: "הצג שמאים שסכום ירידת הערך הממוצע שהם מאשרים גבוה ב-50% מהממוצע הכללי.", difficulty: "Expert", correctSql: "SELECT a.appraiser_name FROM Appraisers a JOIN Appraiser_Actions aa ON a.appraiser_id = aa.appraiser_id JOIN Claimants ct ON aa.claimant_id = ct.claimant_id JOIN Claims c ON ct.claim_id = c.claim_id GROUP BY a.appraiser_id HAVING AVG(aa.estimated_damage_amount) > (SELECT AVG(estimated_damage_amount) * 1.5 FROM Appraiser_Actions);", hints: ["השתמשו בתת-שאילתה (Subquery) למציאת הממוצע הכללי של 'ירידת ערך'", "הכפילו את הממוצע הכללי ב-1.5 בתוך ה-HAVING"] },
  { id: "x18", title: "פוליסות עם הנחה וריבית", description: "הצג פוליסות שקיבלו הנחה מהבנק אך הוגשה בהן תביעה ששולמה בה ריבית (מעיד על עיכוב).", difficulty: "Expert", correctSql: "SELECT DISTINCT p.policy_id FROM Policies p JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id JOIN Claimants ct ON c.claim_id = ct.claim_id JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id WHERE p.discount_from_bank > 0 AND cp.payment_category = 'ריבית';", hints: ["סננו לפי discount_from_bank > 0", "וודאו שקיימת לפחות תביעה אחת עם payment_category = 'ריבית'"] },
  { id: "x19", title: "סוכנויות לפי רווחיות", description: "דרג סוכנויות לפי יחס הפסד (Loss Ratio) של כלל הסוכנים שלהן.", difficulty: "Expert", correctSql: "WITH AgencyPrem AS (SELECT a.agency_name, SUM(e.premium_diff) as total_prem FROM Agents a JOIN Policies p ON a.agent_id = p.agent_id JOIN Endorsements e ON p.policy_id = e.policy_id GROUP BY a.agency_name), AgencyClaims AS (SELECT a.agency_name, SUM(cp.amount) as total_claims FROM Agents a JOIN Policies p ON a.agent_id = p.agent_id JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id JOIN Claimants ct ON c.claim_id = ct.claim_id JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id GROUP BY a.agency_name) SELECT p.agency_name, (c.total_claims * 1.0 / p.total_prem) as lr FROM AgencyPrem p LEFT JOIN AgencyClaims c ON p.agency_name = c.agency_name ORDER BY lr ASC;", hints: ["חשבו פרמיות ותביעות ב-CTE נפרדים ברמת סוכנות", "מיינו בסדר עולה (ASC) לפי יחס ההפסד שחושב"] },
  { id: "x20", title: "דוח מקיף למנכ\"ל", description: "הצג לכל ענף: סך פרמיה, סך הנחות בנק, סך תשלומים, ומספר תביעות פתוחות.", difficulty: "Expert", correctSql: "WITH LOBFin AS (SELECT pr.line_of_business, p.policy_id, p.discount_from_bank, SUM(e.premium_diff) as prem FROM Products pr JOIN Policies p ON pr.product_id = p.product_id JOIN Endorsements e ON p.policy_id = e.policy_id GROUP BY p.policy_id), LOBSummary AS (SELECT line_of_business, SUM(prem) as total_prem, SUM(discount_from_bank) as total_disc FROM LOBFin GROUP BY line_of_business) SELECT ls.line_of_business, ls.total_prem, ls.total_disc, (SELECT SUM(cp.amount) FROM Claim_Payments cp JOIN Claimants ct ON cp.claimant_id = ct.claimant_id JOIN Claims c2 ON ct.claim_id = c2.claim_id JOIN Endorsements e2 ON c2.endorsement_id = e2.endorsement_id JOIN Policies p2 ON e2.policy_id = p2.policy_id JOIN Products pr2 ON p2.product_id = pr2.product_id WHERE pr2.line_of_business = ls.line_of_business) as total_paid, (SELECT COUNT(*) FROM Claims c3 JOIN Endorsements e3 ON c3.endorsement_id = e3.endorsement_id JOIN Policies p3 ON e3.policy_id = p3.policy_id JOIN Products pr3 ON p3.product_id = pr3.product_id WHERE pr3.line_of_business = ls.line_of_business AND c3.claim_status = 'פתוחה') as open_claims FROM LOBSummary ls;", hints: ["השתמשו ב-CTE לחישוב פרמיות והנחות ללא כפילויות ברמת פוליסה", "תשלומים/תביעות בתת-שאילתות מותאמות לענף"] },

  // ANALYST SPECIALS (Requested by user)
  { 
    id: "a1", 
    title: "דוח חידושים חודשי", 
    description: "הפק דוח לחידושי פוליסות שמסתיימות בחודש אפריל 2024. הדוח צריך לכלול מחוז (מטבלת סוכנים), שם חתם, וענף (מטבלת מוצרים).", 
    difficulty: "Medium", 
    correctSql: "SELECT a.district, p.underwriter_name, pr.line_of_business, COUNT(*) as renewal_count FROM Policies p JOIN Agents a ON p.agent_id = a.agent_id JOIN Products pr ON p.product_id = pr.product_id WHERE p.end_date BETWEEN '2024-04-01' AND '2024-04-30' GROUP BY a.district, p.underwriter_name, pr.line_of_business;" 
  },
  { 
    id: "a2", 
    title: "בקרת מסמכי הודעה", 
    description: "הצג תביעות 'רכב מקיף' שבהן סוג התובע הוא 'צד ג' והמסמך נסרק למערכת, אך עמודת 'הודעה על אירוע' מופיעה כשלילית (False).", 
    difficulty: "Hard", 
    correctSql: "SELECT c.claim_id, e.policy_id FROM Claims c JOIN Endorsements e ON c.endorsement_id = e.endorsement_id WHERE c.claim_type = 'רכב מקיף' AND c.is_document_scanned = 1 AND c.has_event_notification = 0;" 
  },
  { 
    id: "a3", 
    title: "בקרת מסמכי חובה", 
    description: "עבור כל תביעה, הצג עמודות המציינות האם קיימים המסמכים הבאים: אישור השתתפות עצמית, עבר ביטוחי, רישיון רכב, ואישור מיגון.", 
    difficulty: "Easy", 
    correctSql: "SELECT claim_id, has_deductible_approval, has_insurance_history, has_vehicle_license, has_protection_approval FROM Claims;" 
  },
  { 
    id: "a4", 
    title: "איחוד רכבים מבוטחים", 
    description: "צור רשימה מאוחדת של כל מספרי הרישוי המופיעים במערכת (גם מפוליסות וגם מתביעות) בצירוף פרטי הרכב מטבלת Insured_Vehicles.", 
    difficulty: "Hard", 
    correctSql: "SELECT DISTINCT v.* FROM Insured_Vehicles v WHERE v.license_plate IN (SELECT license_plate FROM Policies) OR v.license_plate IN (SELECT license_plate FROM Claims);" 
  },
  { 
    id: "a5", 
    title: "מעקב מקישים בתביעות", 
    description: "הצג את כל התביעות שנפתחו על ידי מקישים ממחלקת 'תביעות' אך נסגרו על ידי מקישים ממחלקה אחרת.", 
    difficulty: "Expert", 
    correctSql: "SELECT c.claim_id, u1.full_name as opener, u1.department as opener_dept, u2.full_name as closer, u2.department as closer_dept FROM Claims c JOIN System_Users u1 ON c.opening_user_id = u1.user_id JOIN System_Users u2 ON c.closing_user_id = u2.user_id WHERE u1.department = 'תביעות' AND u2.department != 'תביעות';" 
  },
  { 
    id: "a6", 
    title: "בקרת סכומי ביטוח בעסקים", 
    description: "עבור פוליסות בענף 'עסקים', השווה בין סכום הביטוח המקורי (תוספת 0) לבין סכום הביטוח האחרון המעודכן בטבלת פרטי עסקים.", 
    difficulty: "Medium", 
    correctSql: "SELECT b.business_name, b.initial_sum_insured, b.last_sum_insured, (b.last_sum_insured - b.initial_sum_insured) as growth FROM Business_Details b JOIN Policies p ON b.policy_id = p.policy_id JOIN Products pr ON p.product_id = pr.product_id WHERE pr.line_of_business = 'עסקים';" 
  },
  { 
    id: "a7", 
    title: "פירוט כיסויים לפוליסה", 
    description: "הצג את כל הכיסויים הפעילים עבור פוליסה מסוימת, כולל גבולות אחריות והשתתפות עצמית.", 
    difficulty: "Easy", 
    correctSql: "SELECT coverage_name, limit_amount, deductible_amount FROM Policy_Coverages WHERE policy_id = 1001 AND is_active = 1;" 
  },
  { 
    id: "a8", 
    title: "ניתוח תוספות פרמיה", 
    description: "חשב את סך כל הפרשי הפרמיה שנוצרו מתוספות (Endorsements) במהלך שנת 2024, מחולק לפי מספר תוספת.", 
    difficulty: "Hard", 
    correctSql: "SELECT endorsement_number, SUM(premium_diff) FROM Endorsements WHERE STRFTIME('%Y', effective_date) = '2024' GROUP BY endorsement_number;" 
  },
  {
    id: "s1",
    title: "לקוחות פעילים ללא תביעות (סילבוס - פרק 1)",
    description: "כתבו שאילתה השולפת את כל הלקוחות (Insured) שיש להם פוליסה במצב פעיל ('בתוקף') אך אין להם אף תביעה (Claims) הרשומה במערכת.",
    difficulty: "Easy",
    correctSql: "SELECT DISTINCT i.* FROM Insured i JOIN Policies p ON i.insured_id = p.insured_id WHERE p.status = 'בתוקף' AND p.policy_id NOT IN (SELECT DISTINCT e.policy_id FROM Endorsements e JOIN Claims c ON e.endorsement_id = c.endorsement_id);"
  },
  {
    id: "s2",
    title: "מספר כיסויים לפוליסה (סילבוס - פרק 1)",
    description: "הציגו רשימה של כל הפוליסות (Policies), ועבור כל פוליסה הציגו את מספר הכיסויים השונים (Policy_Coverages) המשויכים אליה. ודאו שגם פוליסות ללא כיסויים יופיעו עם ערך 0.",
    difficulty: "Easy",
    correctSql: "SELECT p.policy_id, COUNT(pc.coverage_id) as coverages_count FROM Policies p LEFT JOIN Policy_Coverages pc ON p.policy_id = pc.policy_id GROUP BY p.policy_id;"
  },
  {
    id: "s3",
    title: "חיתום וסיווג סיכוני דירת מגורים (סילבוס - פרק 2)",
    description: "חברת ביטוח דירות רוצה להחיל חוק חיתום חדש: אם שנת בניית המבנה (building_year) היא לפני 1970 והמבנה לא עבר שיפוץ מערכות מים (plumbing_renovation = 'No'), יש לסווג כ-'High Risk'. אם השנה היא לפני 1970 ועבר שיפוץ, או שהשנה היא אחרי 1970 – 'Standard Risk'. כתבו את השאילתה באמצעות CASE WHEN מטבלת Home_Details, וטפלו במצב שבו שנת הבנייה חסרה (NULL) על ידי סיווגה כ-'Manual Review'.",
    difficulty: "Medium",
    correctSql: "SELECT policy_id, CASE WHEN building_year IS NULL THEN 'Manual Review' WHEN building_year < 1970 AND plumbing_renovation = 'No' THEN 'High Risk' ELSE 'Standard Risk' END AS underwriting_decision FROM Home_Details;"
  },
  {
    id: "s4",
    title: "ענפי ביטוח מפסידים (סילבוס - פרק 3)",
    description: "כתבו שאילתה שמחשבת את סך הפרמיות (סיכום תוספות) של פוליסות ואת סך סכומי תשלומי התביעות המשולמים (amount) ברמת ענף (line_of_business) באמצעות טבלת Products. הציגו רק ענפים שבהם סך תשלומי התביעות גבוה מסך הפרמיות (כלומר ענפים הפסדיים).",
    difficulty: "Medium",
    correctSql: "SELECT pr.line_of_business, SUM(e.premium_diff) AS total_premiums, SUM(cp.amount) AS total_claims_paid FROM Products pr JOIN Policies p ON pr.product_id = p.product_id JOIN Endorsements e ON p.policy_id = e.policy_id LEFT JOIN Claims c ON e.endorsement_id = c.endorsement_id LEFT JOIN Claimants ct ON c.claim_id = ct.claim_id LEFT JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id GROUP BY pr.line_of_business HAVING SUM(cp.amount) > SUM(e.premium_diff);"
  },
  {
    id: "s5",
    title: "לקוחות זכאים להנחת נאמנות (סילבוס - פרק 3)",
    description: "כתבו חוק מבוסס HAVING שמזהה מבוטחים (Insured) שרכשו יותר מ-3 פוליסות שונות (Policies) במערכת שהתחילו החל משנת 2025 (start_date גדול או שווה ל-2025-01-01), כדי להעניק להם הנחה.",
    difficulty: "Medium",
    correctSql: "SELECT i.insured_id, i.full_name, COUNT(p.policy_id) AS policy_count FROM Insured i JOIN Policies p ON i.insured_id = p.insured_id WHERE p.start_date >= '2025-01-01' GROUP BY i.insured_id, i.full_name HAVING COUNT(p.policy_id) > 3;"
  },
  {
    id: "s6",
    title: "בדיקת תקופת אכשרה לשיניים (סילבוס - פרק 4)",
    description: "לפי חוקי החברה, לא ניתן להגיש תביעה על כיסוי שיניים בתוך 90 יום ממועד תחילת הפוליסה. כתבו שאילתה השולפת פוליסות ותביעות שבהן הוגשה תביעת שיניים (claim_type = 'שיניים') ותאריך האירוע (loss_date) נמוך מ-90 יום מתאריך תחילת הפוליסה (start_date), וסמנו אותן כ-'Auto Declined' באמצעות CASE WHEN.",
    difficulty: "Hard",
    correctSql: "SELECT c.claim_id, p.policy_id, CASE WHEN JULIANDAY(c.loss_date) - JULIANDAY(p.start_date) < 90 THEN 'Auto Declined' ELSE c.claim_status END AS system_status FROM Claims c JOIN Endorsements e ON c.endorsement_id = e.endorsement_id JOIN Policies p ON e.policy_id = p.policy_id WHERE c.claim_type = 'שיניים';",
    hints: ["השתמשו ב-JULIANDAY כדי לחשב הפרש ימים בתוך ה-CASE WHEN", "זכרו לסנן את ה-WHERE רק עבור claim_type = 'שיניים'"]
  },
  {
    id: "s7",
    title: "דירוג היסטוריית תביעות מבוטח (סילבוס - פרק 5)",
    description: "כתבו שאילתה המציגה את כל התביעות (Claims) של כל מבוטח (Insured) באמצעות קישור פוליסות, והשתמשו בפונקציית החלון ROW_NUMBER() כדי לדרג את התביעות של כל לקוח מהישנה ביותר לחדישה ביותר לפי תאריך תיעוד האירוע (loss_date).",
    difficulty: "Hard",
    correctSql: "SELECT p.insured_id, c.claim_id, c.loss_date, ROW_NUMBER() OVER (PARTITION BY p.insured_id ORDER BY c.loss_date ASC) as claim_seq FROM Claims c JOIN Endorsements e ON c.endorsement_id = e.endorsement_id JOIN Policies p ON e.policy_id = p.policy_id;",
    hints: ["השתמשו ב-ROW_NUMBER() עם OVER", "השתמשו ב-PARTITION BY לפי insured_id בתוך ה- Window Function"]
  },
  {
    id: "s8",
    title: "ניתוח יחס הפסד במבנה CTE (סילבוס - פרק 6)",
    description: "הפכו את שאילתת אגרגציות הפסדיות הענפים בהשוואת פרמיות לעומת תביעות למבנה של CTE מודולרי. בצעו את חישוב הסכומים ב-CTE, ובשאילתה הראשית הציגו את יחס ההפסדיות (Loss Ratio - סך תביעות לחלק לסך פרמיות) ואת סטטוס החידוש: 'Block Auto-Renew' אם הוא גבוה מ-0.80, אחרת 'Allow Auto-Renew'.",
    difficulty: "Expert",
    correctSql: "WITH Financials_CTE AS ( SELECT pr.line_of_business, SUM(e.premium_diff) as total_premium FROM Products pr JOIN Policies p ON pr.product_id = p.product_id JOIN Endorsements e ON p.policy_id = e.policy_id GROUP BY pr.line_of_business ), Claims_CTE AS ( SELECT pr.line_of_business, SUM(cp.amount) as total_claims FROM Products pr JOIN Policies p ON pr.product_id = p.product_id JOIN Endorsements e ON p.policy_id = e.policy_id JOIN Claims c ON e.endorsement_id = c.endorsement_id JOIN Claimants ct ON c.claim_id = ct.claim_id JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id GROUP BY pr.line_of_business ) SELECT f.line_of_business, f.total_premium, COALESCE(c.total_claims, 0) as total_claims, (COALESCE(c.total_claims, 0) * 1.0 / f.total_premium) as loss_ratio, CASE WHEN (COALESCE(c.total_claims, 0) * 1.0 / f.total_premium) > 0.80 THEN 'Block Auto-Renew' ELSE 'Allow Auto-Renew' END AS renewal_status FROM Financials_CTE f LEFT JOIN Claims_CTE c ON f.line_of_business = c.line_of_business WHERE f.total_premium > 0;",
    hints: ["הגדירו את ה-CTE באמצעות WITH", "השתמשו ב-CASE WHEN בשאילתה הראשית כדי לקבוע את Renewal Status"]
  },
  {
    id: "s9",
    title: "בקרת אנומליות תאריכים (סילבוס - פרק 7)",
    description: "כתבו שאילתת QA שמאתרת אנומליות תאריכים במערכת התביעות: מצאו את כל התביעות שבהן תאריך פתיחת התביעה (open_date) מוקדם יותר מתאריך התרחשות האירוע בפועל (loss_date).",
    difficulty: "Easy",
    correctSql: "SELECT claim_id, loss_date, open_date FROM Claims WHERE open_date < loss_date;"
  },
  {
    id: "s10",
    title: "חיתום וסיווג סיכוני נהג (סילבוס - פרק 2)",
    description: "כתבו שאילתה המסווגת את המבוטחים בטבלת Underwriting_Staging לפי החוקים הבאים באמצעות CASE WHEN:\n- אם גיל הנהג (driver_age) מתחת ל-21 או שיש לו 2 תביעות ומעלה ב-3 השנים האחרונות (past_claims_3yrs >= 2) - יסווג כ-'Red - Decline'.\n- אם גיל הנהג הוא בין 21 ל-24 (כולל) או שמותקן רישום תביעות של תביעה אחת (past_claims_3yrs = 1) - יסווג כ-'Yellow - Referral'.\n- אם גיל הנהג מעל 24 ואין לו תביעות ב-3 השנים האחרונות (past_claims_3yrs = 0) - יסווג כ-'Green - Auto Approve'.\n- בכל מצב אחר יסווג כ-'Review Required'.",
    difficulty: "Medium",
    correctSql: "SELECT policy_id, driver_age, past_claims_3yrs, CASE WHEN driver_age < 21 OR past_claims_3yrs >= 2 THEN 'Red - Decline' WHEN (driver_age BETWEEN 21 AND 24) OR past_claims_3yrs = 1 THEN 'Yellow - Referral' WHEN driver_age > 24 AND COALESCE(past_claims_3yrs, 0) = 0 THEN 'Green - Auto Approve' ELSE 'Review Required' END AS underwriting_decision FROM Underwriting_Staging;"
  },
  {
    id: "s11",
    title: "חישוב יחס הפסדיות לפוליסה (סילבוס - פרק 3)",
    description: "עבור כל פוליסה (Policies), חשב את סך הפרמיה השנתית (סיכום תוספות) ואת סך סכומי תשלומי התביעות המשולמים (amount מטבלת Claim_Payments דרך Claimants). חשב את יחס ההפסדיות (Loss Ratio - סך תשלומים לחלק לפרמיה). אם יחס ההפסדיות גדול מ-0.80, סווג את פוליסת ה-'Block Auto-Renew', אחרת 'Allow Auto-Renew'. הצג רק פוליסות עם פרמיה הגדולה מ-0.",
    difficulty: "Hard",
    correctSql: "WITH Prem AS (SELECT policy_id, SUM(premium_diff) as total_premium FROM Endorsements GROUP BY policy_id), Claims AS (SELECT e.policy_id, SUM(cp.amount) as total_claims_paid FROM Endorsements e JOIN Claims c ON e.endorsement_id = c.endorsement_id JOIN Claimants ct ON c.claim_id = ct.claim_id JOIN Claim_Payments cp ON ct.claimant_id = cp.claimant_id GROUP BY e.policy_id) SELECT p.policy_id, p.total_premium, COALESCE(c.total_claims_paid, 0) AS total_claims_paid, (COALESCE(c.total_claims_paid, 0) * 1.0 / p.total_premium) AS loss_ratio, CASE WHEN (COALESCE(c.total_claims_paid, 0) * 1.0 / p.total_premium) > 0.80 THEN 'Block Auto-Renew' ELSE 'Allow Auto-Renew' END AS renewal_rule FROM Prem p LEFT JOIN Claims c ON p.policy_id = c.policy_id WHERE p.total_premium > 0;",
    hints: ["השתמשו ב-LEFT JOIN כדי לכלול גם פוליסות ללא תביעות", "השתמשו ב-COALESCE(SUM(cp.amount), 0) כדי לטפל בערכי NULL"]
  },
  {
    id: "s12",
    title: "זיהוי תביעות סמוך לתחילת ביטוח (סילבוס - פרק 4)",
    description: "במטרה לחשוף הונאות ביטוח אפשריות, כתבו שאילתה השולפת את מזהה התביעה (claim_id), מספר הפוליסה (policy_id), תאריך תחילת הביטוח (start_date) ותאריך התרחשות האירוע (loss_date). חשבו את מספר הימים שחלפו בין תחילת הביטוח להתרחשות האירוע (באמצעות JULIANDAY) וסננו רק תביעות שהאירוע שלהן קרה בתוך 3 ימים (כולל) מרגע תחילת הביטוח, וכאשר תאריך האירוע גדול או שווה לתאריך תחילת הביטוח.",
    difficulty: "Medium",
    correctSql: "SELECT c.claim_id, p.policy_id, p.start_date, c.loss_date, (JULIANDAY(c.loss_date) - JULIANDAY(p.start_date)) AS days_since_inception FROM Claims c JOIN Endorsements e ON c.endorsement_id = e.endorsement_id JOIN Policies p ON e.policy_id = p.policy_id WHERE c.loss_date >= p.start_date AND (JULIANDAY(c.loss_date) - JULIANDAY(p.start_date)) <= 3;"
  },
  {
    id: "s13",
    title: "בדיקת רצף ביטוחי (סילבוס - פרק 5)",
    description: "כתבו שאילתה המציגה לכל מבוטח (insured_id) את מזהה הפוליסה (policy_id), תאריך תחילת הפוליסה (start_date), תאריך סיום הפוליסה (end_date), ותאריך הסיום של הפוליסה הקודמת של אותו מבוטח (השתמשו ב-LAG על ה-end_date ממוין לפי start_date). חשבו את מספר הימים בין סיום הפוליסה הקודמת לתחילת הפוליסה הנוכחית באמצעות JULIANDAY, וסווגו את רמת הרצף לסטטוסים הבאים:\n- אם אין פוליסה קודמת: 'New Business'.\n- אם ההפרש בימים קטן או שווה ל-1: 'Continuous Renewal'.\n- אחרת (היה פער): 'Lapsed - Requires Re-Underwriting'.",
    difficulty: "Expert",
    correctSql: "SELECT insured_id, policy_id, start_date, end_date, LAG(end_date, 1) OVER (PARTITION BY insured_id ORDER BY start_date) AS previous_policy_end, CASE WHEN LAG(end_date, 1) OVER (PARTITION BY insured_id ORDER BY start_date) IS NULL THEN 'New Business' WHEN JULIANDAY(start_date) - JULIANDAY(LAG(end_date, 1) OVER (PARTITION BY insured_id ORDER BY start_date)) <= 1 THEN 'Continuous Renewal' ELSE 'Lapsed - Requires Re-Underwriting' END AS continuity_status FROM Policies;",
    hints: ["השתמשו ב-LAG(end_date, 1) OVER (PARTITION BY insured_id ORDER BY start_date)", "השתמשו ב-JULIANDAY כדי לחשב את ההפרש בין תאריך התחלה לתאריך הסיום הקודם"]
  }
];
