import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { INSURANCE_SCHEMA, FALLBACK_QUESTIONS, Table } from "../constants";
import { SQL_MATERIALS, INSURANCE_MATERIALS } from "../data/learningMaterials";

const getAIInstance = () => {
  // 🛠️ משנים מ-process.env ל-import.meta.env של Vite:
  const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
  
  if (!apiKey || apiKey === "AIzaSyAi0SHQtfOuAqQFH_DtmopzU2myWS278f4") {
    throw new Error("MISSING_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Helper to call Gemini with exponential backoff retry logic and timeout
 */
async function callGeminiWithRetry<T>(
  fn: (ai: GoogleGenAI, model: string) => Promise<T>,
  retries = 6,
  delay = 2000
): Promise<T> {
  const ai = getAIInstance();
  // Alternate between flash and flash-lite on retries to bypass specific model load
  const model = retries % 2 === 0 ? "gemini-3-flash-preview" : "gemini-3.1-flash-lite-preview";
  
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error("Gemini request timed out")), 25000)
  );

  try {
    return await Promise.race([fn(ai, model), timeoutPromise]);
  } catch (error: any) {
    const errorStr = JSON.stringify(error).toLowerCase();
    const isQuotaError = 
      error?.message?.includes('429') || 
      errorStr.includes('quota') ||
      errorStr.includes('limit') ||
      error?.status === 'RESOURCE_EXHAUSTED' ||
      error?.message?.includes('503') ||
      errorStr.includes('unavailable') ||
      errorStr.includes('high demand');
    
    const isTimeout = error?.message?.includes("timed out");
    
    if ((isQuotaError || isTimeout) && retries > 0) {
      const waitTime = delay * (7 - retries);
      console.warn(`Gemini API issue (${isTimeout ? 'timeout' : 'load'}). Retrying with ${model} in ${waitTime}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return callGeminiWithRetry(fn, retries - 1, delay);
    }
    
    if (isQuotaError || isTimeout) {
      throw new Error("GOOGLE_LOAD_ERROR");
    }
    
    throw error;
  }
}

export function getSchemaContext(schema: Table[]): string {
  const targetSchema = schema && schema.length > 0 ? schema : INSURANCE_SCHEMA;
  return targetSchema.map(table => {
    return `Table: ${table.name} (${table.description})
Columns:
${table.columns.map(c => ` - ${c.name} (${c.type}): ${c.description}${c.isPrimary ? ' [PK]' : ''}${c.isForeign ? ` [FK -> ${c.references}]` : ''}`).join('\n')}`;
  }).join('\n\n');
}

export async function parseUploadedSchema(fileContent: string, fileName: string, language: string = 'he'): Promise<{ name: string; description: string; tables: Table[] }> {
  try {
    const response = await callGeminiWithRetry((ai, model) => ai.models.generateContent({
      model: model,
      contents: `You are an expert database architect. Analyze the uploaded file content and extract the database schema (tables, columns, types, references).
      
      File name: "${fileName}"
      File content:
      """
      ${fileContent}
      """
      
      STRICT TASK:
      1. Parse the structure. It could be SQL DDL statements (e.g., CREATE TABLE), a JSON schema, CSV, or a structured text description of tables.
      2. Construct a list of tables and columns matching the Table interface:
         interface Table {
           name: string;
           columns: Column[];
           description: string;
         }
         interface Column {
           name: string;
           type: string;
           isPrimary?: boolean;
           isForeign?: boolean;
           references?: string; // in form HeaderTable.column_name, e.g. "Policies.policy_id"
           description: string;
         }
      3. Create a descriptive, fitting name for the database and a brief description in ${language === 'he' ? 'HEBREW' : 'ENGLISH'}.
      4. Make sure description and column descriptions (Column.description) are in ${language === 'he' ? 'HEBREW' : 'ENGLISH'} to keep consistency with the learning environment!
      
      Return a solid JSON object response matching the following structure:
      {
        "name": "Database name in ${language === 'he' ? 'Hebrew' : 'English'}",
        "description": "Database description in ${language === 'he' ? 'Hebrew' : 'English'}",
        "tables": []
      }`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            tables: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  columns: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        type: { type: Type.STRING },
                        isPrimary: { type: Type.BOOLEAN },
                        isForeign: { type: Type.BOOLEAN },
                        references: { type: Type.STRING },
                        description: { type: Type.STRING }
                      },
                      required: ['name', 'type', 'description']
                    }
                  }
                },
                required: ['name', 'columns', 'description']
              }
            }
          },
          required: ['name', 'description', 'tables']
        }
      }
    }));

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Failed to parse uploaded schema:", error);
    throw error;
  }
}

export async function schemaGeneratorChat(
  userMessage: string,
  chatHistory: { role: 'user' | 'model'; parts: { text: string }[] }[],
  currentTables?: Table[],
  language: string = 'he'
): Promise<{ explanation: string; tables: Table[]; name: string; description: string }> {
  try {
    const response = await callGeminiWithRetry((ai, model) => ai.models.generateContent({
      model: model,
      contents: `The user is describing their database needs or requesting edits/additions to an existing custom schema.
      
      Current tables (if any):
      ${JSON.stringify(currentTables || [], null, 2)}
      
      Conversation with user so far:
      ${JSON.stringify(chatHistory.map(h => `${h.role === 'user' ? 'Student' : 'Mentor'}: ${h.parts[0].text}`), null, 2)}
      
      User's latest message: "${userMessage}"
      
      Return a JSON response matching the structure:
      {
        "explanation": "Friendly conversational explanation in ${language === 'he' ? 'Hebrew' : 'English'} summarizing what you created or changed",
        "name": "Database name in ${language === 'he' ? 'Hebrew' : 'English'}",
        "description": "Database description in ${language === 'he' ? 'Hebrew' : 'English'}",
        "tables": []
      }`,
      config: {
        systemInstruction: `You are an expert DB modeling mentor helping a student design their custom practice database.
        
        STRICT RULES:
        1. Respond in ${language === 'he' ? 'Hebrew' : 'English'}.
        2. Keep the conversational explanation friendly, precise and illustrative of proper DB design.
        3. PRESERVATION RULE (CRITICAL): If 'currentTables' are provided (length > 0), you MUST PRESERVE all existing tables and their columns unless the user explicitly requests to delete or rename them. DO NOT "clean up", "optimize", or remove tables/columns that were not mentioned in the user's latest request.
        4. PERSISTENCE: The 'tables' array in your JSON response MUST contain the FULL modified schema (all preserved tables + any additions or changes). Never truncate the list of tables.
        5. DATA INTEGRITY: DO NOT modify existing names, types, or descriptions of tables and columns provided in 'currentTables' unless specifically requested.
        6. Use valid SQL types (e.g., INT, VARCHAR(100), DATE, DECIMAL(10,2)).
        7. Provide clear descriptions for all tables and columns in ${language === 'he' ? 'Hebrew' : 'English'}.
        8. CONSISTENCY: Maintain existing Primary Keys and Foreign Key relationships unless explicitly asked to change them.`,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            tables: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  columns: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        type: { type: Type.STRING },
                        isPrimary: { type: Type.BOOLEAN },
                        isForeign: { type: Type.BOOLEAN },
                        references: { type: Type.STRING },
                        description: { type: Type.STRING }
                      },
                      required: ['name', 'type', 'description']
                    }
                  }
                },
                required: ['name', 'columns', 'description']
              }
            }
          },
          required: ['explanation', 'name', 'description', 'tables']
        }
      }
    }));

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Schema generator chat failed:", error);
    throw error;
  }
}

export interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  correctSql: string;
  hints?: string[];
}

export interface GradeResult {
  score: number;
  feedback: string;
  isCorrect: boolean;
  explanation: string;
  performanceWarning?: string;
  optimizedSql?: string;
}

export interface PerformanceAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string;
  suggestedTopics: string[];
}

export interface UserProfile {
  department: string;
  role: string;
  setupCompleted: boolean;
  customSchema?: {
    table: string;
    name: string;
    type: string;
    description: string;
  }[];
}

export interface UserQuestionAnalysis {
  isValid: boolean;
  errorMessage?: string;
  suggestedColumns: {
    table: string;
    name: string;
    type: string;
    description: string;
  }[];
  insights: {
    roleHint: string;
    departmentHint: string;
    difficultyHint: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  };
  title: string;
  correctSql: string;
}

export async function analyzeUserQuestion(
  userQuestion: string,
  currentSchema: any[],
  language: string = 'he'
): Promise<UserQuestionAnalysis> {
  try {
    const response = await callGeminiWithRetry((ai, model) => ai.models.generateContent({
      model: model,
      contents: `Analyze the following business question from a user in an insurance company.
      
      User Question: "${userQuestion}"
      
      CRITICAL SCHEMA RULE: 
      1. 'Claim_Payments' is NOT linked directly to 'Claims'. It is linked ONLY to 'Claimants' via 'claimant_id'. To get from a payment to a claim, you must JOIN 'Claim_Payments' to 'Claimants' (using 'claimant_id') and then 'Claimants' to 'Claims' (using 'claim_id').
      2. 'Appraiser_Actions' is also NOT linked directly to 'Claims'. It links to 'Claimants' via 'claimant_id'.
      3. A single claimant can have MULTIPLE appraisals (Appraiser_Actions) from the same appraiser.
      4. Policies table does NOT have a premium field. PREMIUM is stored in the 'Endorsements' table. To calculate a policy's total premium, you must SUM(premium_diff) from 'Endorsements' for that policy_id. Every policy has at least one endorsement (number 0).
      5. FAN-OUT WARNING: When calculating sums of premiums AND sums of payments in the same query, NEVER join 'Endorsements' directly to 'Claim_Payments'. This will cause duplicating premium values for every payment row. ALWAYS use separate CTEs or subqueries to aggregate premiums and claims separately before joining the results.
      ALWAYS follow these paths in your correctSql.

      Current Database Schema:
      ${JSON.stringify(currentSchema, null, 2)}
      
      TASKS:
      1. Identify if the question refers to data that IS or COULD BE in the schema.
      2. If the user mentions a column that doesn't exist:
         - If it's logically related to an existing table (e.g., "policy_type" for "Policies", "agent_phone" for "Agents"), suggest adding it.
         - If it's completely unrelated to insurance or any existing table (e.g., "weather in London", "pizza prices"), mark as invalid.
      3. If invalid, the error message MUST be: ${language === 'he' ? '"לא ניתן כרגע להכניס את השאלה למערכת, יש לפנות למנהל"' : '"It is currently not possible to enter the question into the system, please contact the administrator"'}.
      4. If valid, suggest the SQL query to solve it (assuming suggested columns are added) and provide explanations / descriptions in ${language === 'he' ? 'HEBREW' : 'ENGLISH'}.
      5. Infer the user's role, department, and the question's difficulty based on the complexity and terminology.
      
      Return a JSON response matching the UserQuestionAnalysis interface.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            errorMessage: { type: Type.STRING },
            suggestedColumns: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  table: { type: Type.STRING },
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ['table', 'name', 'type', 'description']
              }
            },
            insights: {
              type: Type.OBJECT,
              properties: {
                roleHint: { type: Type.STRING },
                departmentHint: { type: Type.STRING },
                difficultyHint: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard', 'Expert'] }
              },
              required: ['roleHint', 'departmentHint', 'difficultyHint']
            },
            title: { type: Type.STRING },
            correctSql: { type: Type.STRING }
          },
          required: ['isValid', 'insights', 'title', 'correctSql']
        }
      }
    }));

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Analysis failed:", error);
    return {
      isValid: false,
      errorMessage: language === 'he' ? "חלה שגיאה בניתוח השאלה. אנא נסי שוב מאוחר יותר." : "An error occurred during question analysis. Please try again later.",
      suggestedColumns: [],
      insights: { roleHint: '', departmentHint: '', difficultyHint: 'Easy' },
      title: '',
      correctSql: ''
    };
  }
}

export async function generateInsuranceQuestion(
  requestedDifficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert' | 'Adaptive',
  history?: string[],
  useFallback = false,
  focusTopic?: string,
  userProfile?: UserProfile | null,
  userQuestions?: any[],
  schema: Table[] = INSURANCE_SCHEMA,
  language: string = 'he',
  adaptiveMetrics?: {
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    expertSolved: number;
    determinedDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  }
): Promise<Question> {
  const currentSchemaContext = getSchemaContext(schema);
  const customSchemaText = userProfile?.customSchema && userProfile.customSchema.length > 0
    ? `\n\nADDITIONAL CUSTOM COLUMNS (Added by user):\n${userProfile.customSchema.map(c => ` - Table: ${c.table}, Column: ${c.name} (${c.type}): ${c.description}`).join('\n')}`
    : '';

  const isLogicalOrTopic = focusTopic && (
    focusTopic.toLowerCase().includes('or') || 
    focusTopic.includes('לוגיקה') || 
    focusTopic.includes('תנאים מורכבים')
  );

  const isAdaptive = requestedDifficulty === 'Adaptive';
  const finalDifficulty = isAdaptive && adaptiveMetrics
    ? adaptiveMetrics.determinedDifficulty
    : (requestedDifficulty === 'Adaptive' ? 'Easy' : (requestedDifficulty || 'Easy'));

  if (useFallback) {
    let fallbackPool = FALLBACK_QUESTIONS;
    if (isLogicalOrTopic) {
      fallbackPool = FALLBACK_QUESTIONS.filter(q => 
        q.id.includes('or') || 
        q.correctSql.includes(' OR ') || 
        q.correctSql.includes(' OR\n')
      );
    }
    const filtered = fallbackPool.filter(q => q.difficulty === finalDifficulty);
    const pool = filtered.length > 0 ? filtered : (fallbackPool.length > 0 ? fallbackPool : FALLBACK_QUESTIONS);
    const randomQ = pool[Math.floor(Math.random() * pool.length)];
    return {
      ...randomQ,
      id: `fallback-${Math.random().toString(36).substr(2, 5)}`,
      difficulty: randomQ.difficulty as any
    };
  }

  const difficultyInstruction = isAdaptive
    ? `The question MUST be of '${finalDifficulty}' difficulty.`
    : (requestedDifficulty 
        ? `The question MUST be of '${requestedDifficulty}' difficulty.`
        : "The question should be of 'Easy', 'Medium', 'Hard', or 'Expert' difficulty.");

  const adaptivePrompt = isAdaptive && adaptiveMetrics
    ? `\nADAPTIVE USER PROGRESS INSIGHTS:\n` +
      `The user is playing in 'Adaptive User Level' (רמת משתמש). The system has evaluated their current skills:\n` +
      `- Total successfully solved queries: ${adaptiveMetrics.totalSolved}\n` +
      `- Easy solved count: ${adaptiveMetrics.easySolved}\n` +
      `- Medium solved count: ${adaptiveMetrics.mediumSolved}\n` +
      `- Hard solved count: ${adaptiveMetrics.hardSolved}\n` +
      `- Expert solved count: ${adaptiveMetrics.expertSolved}\n` +
      `Current Determined Level for this question is: '${finalDifficulty}'.\n` +
      `AI DIRECTIVE: When in Adaptive Mode, strive to challenge the user based on their current progress. Expose them to new insurance terms and database columns they haven't seen yet to expand their limits. Design the question in ${language === 'he' ? 'Hebrew' : 'English'} so that it gently builds on their current skills, keeping them motivated but introducing fresh SQL challenges appropriate for the '${finalDifficulty}' level.\n`
    : "";

  const focusInstruction = focusTopic 
    ? `FOCUS specifically on the following topic or weakness: "${focusTopic}". The question should help the user practice this specific area.`
    : "";

  let learningMaterialContext = '';
  if (focusTopic) {
    const matchedSql = SQL_MATERIALS.find(m => 
      m.title === focusTopic || 
      m.id === focusTopic || 
      focusTopic.toLowerCase().includes(m.id.toLowerCase()) ||
      focusTopic.includes(m.title) ||
      m.title.includes(focusTopic)
    );
    const matchedInsurance = INSURANCE_MATERIALS.find(m => 
      m.title === focusTopic || 
      m.id === focusTopic || 
      focusTopic.toLowerCase().includes(m.id.toLowerCase()) ||
      focusTopic.includes(m.title) ||
      m.title.includes(focusTopic)
    );

    if (matchedSql) {
      learningMaterialContext = `\nLEARNING MODULE REFERENCE:\nWe are generating a question specifically for the learning module: "${matchedSql.title}".\nModule description: ${matchedSql.description}\nInsurance Context: ${matchedSql.insuranceContext}\nSQL Example pattern:\n${matchedSql.example}\nPro Tips:\n${matchedSql.tips.map(t => `- ${t}`).join('\n')}\nYOU MUST generate a brand-new practice question based directly on the concepts, patterns, and instructions from this exact module. Ensure the question tests the exact same SQL concept (${matchedSql.title}) within an insurance business context. Do NOT repeat the example directly, but keep the complexity and techniques perfectly aligned.\n`;
    } else if (matchedInsurance) {
      learningMaterialContext = `\nLEARNING MODULE REFERENCE:\nWe are generating a question specifically for the insurance domain chapter: "${matchedInsurance.title}".\nModule description: ${matchedInsurance.description}\nKey Concepts to test: ${matchedInsurance.keyConcepts.join(', ')}\nBusiness Logic background: ${matchedInsurance.businessLogic}\nYOU MUST generate an AI question that places a huge emphasis on this business logic ("${matchedInsurance.title}"). The correct SQL solution must require query calculations or filtering that evaluates these business concepts.\n`;
    }
  }

  const historyInstruction = history && history.length > 0
    ? `AVOID repeating these questions or topics: ${history.join(', ')}. Focus on different tables or columns from the schema.`
    : "Focus on a variety of tables and columns from the schema to ensure a broad coverage of insurance business logic. DO NOT over-focus on the 'Discount Bank' (בנק הנחות / Agent_Budgets) topic, especially for Medium difficulty; explore other areas like claims, products, and insured details.";

  const profileInstruction = userProfile 
    ? `The user works in the "${userProfile.department}" department as a "${userProfile.role}". 
       TAILOR the question to be highly relevant to this specific department and role. 
       For example, if they are in 'Claims', focus on loss ratios, reserves, or claim processing. 
       If they are in 'Underwriting', focus on risk assessment, policy pricing, or endorsements.`
    : `The user is a "Business Contract Implementer" (מיישם חוזה עסקי) in an Israeli P&C (Elementary) Insurance Startup.`;

  const userQuestionsInstruction = userQuestions && userQuestions.length > 0
    ? `LEARN FROM USER'S ADDED QUESTIONS:
       The user has manually added the following business questions to the system. 
       ANALYZE the complexity, terminology, and business logic of these questions to understand the specific "direction" or industry niche the user is interested in.
       Try to generate new questions that follow a similar logical path or explore related complexities as seen in these user-added questions:
       ${userQuestions.map(q => `- ${q.title}: ${q.description}`).join('\n')}`
    : "";

    try {
      const orConstraint = isLogicalOrTopic 
        ? `\nCRITICAL REQUIREMENT: The resulting SQL query MUST explicitly use the logical 'OR' operator (for example: WHERE condition1 OR condition2). The question narrative must explicitly invite the user to choose or filter by multiple criteria combined with OR (Hebrew description should focus on "או" operator).`
        : '';

      const response = await callGeminiWithRetry((ai, model) => ai.models.generateContent({
        model: model,
        contents: `Generate a SQL business question for the following insurance database schema. 
        The question, instructions, title, and hints MUST be written entirely in ${language === 'he' ? 'Hebrew' : 'English'}.
        ${orConstraint}
        
        USER CONTEXT:
        - Role: ${userProfile?.role || "General"}
        - Department: ${userProfile?.department || "General"}
        
        ${userQuestionsInstruction}
        ${learningMaterialContext}
        ${adaptivePrompt}
        
        SKILL PROFILES & GUIDELINES:
        1. Actuarial: High difficulty. Focus on Earned Premium vs. Incurred Claims, Loss Ratios, and complex aggregations using Policies, Claims, and Claim_Payments. Use SUM, GROUP BY, DATEDIFF, CASE WHEN.
        2. Claims / Fraud Control: Medium difficulty. Focus on cross-referencing, fraud patterns, and serial claimants using Claims, Claimants, and Insured. Use HAVING, JOIN, DISTINCT, Subqueries.
        3. Sales & Marketing / Agent Management: Easy-Medium difficulty. Focus on sales targets, agent performance, and ASP (Annual Standard Premium) using Agents, Policies, and Agent_Budgets. Use ORDER BY, LIMIT, WHERE, INNER JOIN.
        4. Operations & IT: Medium difficulty. Focus on SLA analysis and response times using Claims and Policies. Use AVG, COALESCE.
        5. Underwriting: Medium-Hard difficulty. Focus on risk assessment, policy pricing, and endorsements using Insured, Policies, and Products.
        6. Finance & Collection: Medium difficulty. Focus on premium collection, arrears, and financial reconciliation using Policies and Claim_Payments.
        7. Data Transformation & Cleaning (עריכת נתונים): Medium difficulty. Focus on data standardization and normalization. 
           - ID Formatting: Padding ID numbers with leading zeros to reach 9 digits using LPAD or equivalent logic (common in AS400).
           - Date Standardization: Using TO_CHAR, TO_DATE, or STRFTIME (or AS400 alternatives like VARCHAR_FORMAT) to make date formats uniform.
           - Handling NULLs: Using COALESCE to provide default values for missing data.
           - String Cleaning: Using REPLACE or TRIM to clean up text fields.
        8. Result Limiting & Ranking (הגבלת תוצאות): Easy-Medium difficulty. 
           - AS400/DB2 Context: Use "FETCH FIRST n ROWS ONLY" instead of LIMIT where appropriate.
           - Top Performers: Finding the top 5 agents by sales or top 10 highest claims.
        9. Advanced Set Operations & Subqueries: Hard-Expert difficulty.
        
        TECHNICAL ENVIRONMENT (AS400 / DB2):
        The simulation and grading must prioritize SQL syntax commonly used in IBM DB2 (AS400) environments, which are standard in the insurance industry.
        - If a user uses "LIMIT", mention that in AS400 we use "FETCH FIRST n ROWS ONLY".
        - If a user uses "TOP", mention it's a SQL Server syntax and DB2 uses "FETCH FIRST".
        - Dates: Prefer standard ISO/SQL formats but acknowledge AS400 peculiarities.
        
        VARIETY & TIME SPAN:
        Ensure the questions are diverse across all tables in the schema.
        IMPORTANT SCHEMA RULE: 'Claim_Payments' is NOT linked directly to 'Claims'. It is linked to 'Claimants' via 'claimant_id'. To get from a payment to a claim, you must JOIN 'Claim_Payments' to 'Claimants' (using 'claimant_id') and then 'Claimants' to 'Claims' (using 'claim_id').
        The database contains data spanning the last 5 years (2021-2026). 
        Feel free to generate questions that involve time-based analysis, yearly comparisons, or long-term trends.
        Explore combinations of:
        - Claims, Claimants and Claim_Payments.
        - Products and Policies.
        - Appraisers and Claim processing times.
        - Insured demographics and risk profiles.
        - Agent_Budgets and discount usage.
        - Data Cleaning scenarios (Standardizing IDs, formatting dates, handling legacy system formats).
        - Risk assessment (Damage % relative to market value).
        - Financial reconciliation (Payments vs Claim Amounts).
        - Cross-departmental logic (e.g., linking Agent performance to Claim loss ratios).
        
        PERSONA & CONTEXT:
        ${profileInstruction}
        This role involves translating complex business logic into technical SQL queries and configurations.
        The questions MUST reflect real-world scenarios in the Israeli insurance market, such as:
        - Policy lifecycle (Hova, Makif, Tzad G, Home, Liability).
        - Endorsements and mid-term changes.
        - Pro-rata calculations for cancellations and refunds.
        - Underwriting rules - validating risk parameters like driver age or claim history.
        - Agent commissions and agency performance.
        - Claims processing (Third party involvement, deductibles, reserves).
        - Financial transactions (Gviya, Zikuy, Index-linkage).
        - Reinsurance (Quota share, retention limits).
        - ${focusTopic || 'General insurance operations'}.
        
        TERMINOLOGY & STYLE:
        Use correct insurance industry terminology in ${language === 'he' ? 'Hebrew' : 'English'} (e.g. ${language === 'he' ? '"פרמיה", "דמי פוליסה", "השתתפות עצמית", "תוספת"' : '"Premium", "Deductible", "Policy fee", "Endorsement", "Pro-rata"'}).
        
        ${difficultyInstruction}
        ${focusInstruction}
        ${historyInstruction}
        
        HINTS (Only for 'Hard' and 'Expert'):
        - If the difficulty is 'Hard' or 'Expert', generate exactly 2 very small, subtle hints in ${language === 'he' ? 'Hebrew' : 'English'} that help but don't give away the solution.
        - Example: ${language === 'he' ? '"זכור להשתמש ב-JOIN בין טבלת Policies ל-Claims", "חשוב להשתמש ב-COALESCE כדי לטפל בערכים חסרים"' : '"Remember to use JOIN between Policies and Claims tables", "It is important to use COALESCE to handle null values"'}.
        
        Schema:
        ${currentSchemaContext}${customSchemaText}
        
        Inspiration for complexity level and topics:
        1. Easy: Simple SELECT, WHERE, and basic JOINs. e.g., Listing all active policies for a specific customer.
        2. Medium: Aggregations, GROUP BY, HAVING, and multiple JOINs. e.g., Calculating average claim payment per product category.
        3. Hard: Complex Joins, Subqueries, CTEs, Window Functions, and Stored Procedures. 
        4. Expert: Advanced analytics, multi-level subqueries, complex business rules validation, reinsurance calculations, and performance-optimized queries.
        
        Return the response in JSON format with the following fields:
        - title: A short title in ${language === 'he' ? 'Hebrew' : 'English'}.
        - description: The business question in ${language === 'he' ? 'Hebrew' : 'English'}.
        - difficulty: 'Easy', 'Medium', 'Hard', or 'Expert'.
        - correctSql: The correct SQL query or Stored Procedure code to solve the question.
        - hints: Array of 2 strings in ${language === 'he' ? 'Hebrew' : 'English'} (Only for Hard/Expert, otherwise empty array).`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard', 'Expert'] },
              correctSql: { type: Type.STRING },
              hints: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['title', 'description', 'difficulty', 'correctSql']
          }
        }
      }));

      const data = JSON.parse(response.text || "{}");
      return {
        id: Math.random().toString(36).substr(2, 9),
        ...data
      };
    } catch (error: any) {
      const isLoadError = error.message === "GOOGLE_LOAD_ERROR";
      console.warn(`Gemini failed to generate question (Load Error: ${isLoadError}). Using fallback.`);
      
      const isLogicalOrTopicInCatch = focusTopic && (
        focusTopic.toLowerCase().includes('or') || 
        focusTopic.includes('לוגיקה') || 
        focusTopic.includes('תנאים מורכבים')
      );
      
      let fallbackPool = FALLBACK_QUESTIONS;
      if (isLogicalOrTopicInCatch) {
        fallbackPool = FALLBACK_QUESTIONS.filter(q => 
          q.id.includes('or') || 
          q.correctSql.includes(' OR ') || 
          q.correctSql.includes(' OR\n')
        );
      }

      // Pick a random fallback question that matches the difficulty if possible
      const filtered = fallbackPool.filter(q => !requestedDifficulty || q.difficulty === requestedDifficulty);
      const pool = filtered.length > 0 ? filtered : (fallbackPool.length > 0 ? fallbackPool : FALLBACK_QUESTIONS);
      const randomQ = pool[Math.floor(Math.random() * pool.length)];
      
      const result = {
        ...randomQ,
        id: `fallback-${Math.random().toString(36).substr(2, 5)}`,
        difficulty: randomQ.difficulty as any
      };

      if (isLoadError) {
        result.description = result.description + (language === 'he' 
          ? " (הערה: שרתי ה-AI עמוסים כרגע, מוצגת שאלת גיבוי מהמאגר המובנה)." 
          : " (Note: AI servers are currently busy, displaying a backup question from the built-in pool).");
      }
      
      return result;
    }
}

export async function recoverCorrectSql(title: string, description: string, schema: Table[] = INSURANCE_SCHEMA, language: string = 'he'): Promise<string> {
  const currentSchemaContext = getSchemaContext(schema);
  try {
    return await callGeminiWithRetry(async (ai, model) => {
      const response = await ai.models.generateContent({
        model: model,
        contents: `Given the following database schema and a business question, provide ONLY the correct SQL query to solve it.
        
        Schema:
        ${currentSchemaContext}
        
        Question Title: ${title}
        Question Description: ${description}
        
        Return ONLY the SQL code, no explanation.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });
     return (response.text || "").replace(/```sql/g, '').replace(/```/g, '').trim();
    });
  } catch (error) {
    console.error("Failed to recover SQL:", error);
    return "";
  }
}

export async function analyzePerformance(history: any[], userProfile?: UserProfile | null, schema: Table[] = INSURANCE_SCHEMA, language: string = 'he'): Promise<PerformanceAnalysis> {
  const currentSchemaContext = getSchemaContext(schema);
  try {
    const historySummary = history.map(item => ({
      title: item.questionTitle || item.question?.title,
      difficulty: item.difficulty || item.question?.difficulty,
      score: item.score,
      isCorrect: item.isCorrect,
      explanation: item.explanation
    }));

    const profileContext = userProfile 
      ? `The user works in the "${userProfile.department}" department as a "${userProfile.role}".`
      : "";

    const response = await callGeminiWithRetry((ai, model) => ai.models.generateContent({
      model: model,
      contents: `Analyze the following SQL practice history for a user working with the database.
      ${profileContext}
      
      CRITICAL TASK: 
      1. Identify their strengths and weaknesses.
      2. Identify patterns in the topics they HAVE NOT practiced enough OR have struggled with.
      3. Suggest 3 specific topics or SQL concepts they should practice next.
      4. STRATEGIC FOCUS: Provide a "Thinking Methodology" (אסטרטגיית חשיבה) piece of advice. Explain NOT JUST WHAT to learn, but HOW TO THINK about solving SQL problems effectively.
      
      User History:
      ${JSON.stringify(historySummary, null, 2)}
      
      Schema Context:
      ${currentSchemaContext}
      
      Return the response in JSON format (${language === 'he' ? 'HEBREW' : 'ENGLISH'}) with the following fields:
      - strengths: Array of strings (${language === 'he' ? 'HEBREW' : 'ENGLISH'}).
      - weaknesses: Array of strings (${language === 'he' ? 'HEBREW' : 'ENGLISH'}).
      - recommendations: A paragraph of advice focusing on thinking strategies and methodology (${language === 'he' ? 'HEBREW' : 'ENGLISH'}).
      - suggestedTopics: Array of 3 specific topics to practice (${language === 'he' ? 'HEBREW' : 'ENGLISH'}).`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.STRING },
            suggestedTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['strengths', 'weaknesses', 'recommendations', 'suggestedTopics']
        }
      }
    }));

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    const errorMsg = error.message || "";
    const isHighDemand = errorMsg === "GOOGLE_LOAD_ERROR" || errorMsg.includes("high demand") || errorMsg.includes("503") || errorMsg.includes("עומס");
    console.warn(`Performance analysis failed (Load Error: ${isHighDemand}). Using fallback.`);
    
    return {
      strengths: language === 'he' ? ["ניתוח ביצועים מושהה"] : ["Performance analysis delayed"],
      weaknesses: language === 'he' ? ["ניתוח ביצועים מושהה"] : ["Performance analysis delayed"],
      recommendations: isHighDemand 
        ? (language === 'he'
          ? "שרתי ה-AI של גוגל עמוסים מאוד כרגע. המערכת תנסה לנתח שוב את הביצועים שלך באופן אוטומטי בעוד מספר רגעים. מומלץ לוודא שמפתח ה-API ב-Secrets מוגדר כראוי."
          : "Google AI servers are currently heavily loaded. The system will automatically retry analyzing your performance in a few moments. Please verify that your API key is properly defined in Secrets.")
        : (language === 'he'
          ? "לא ניתן היה להתחבר ל-AI. אנא ודאי שמפתח ה-API שלך תקין ומוגדר בלשונית Secrets."
          : "Could not connect to the AI. Please verify that your API key is correct and configured in the Secrets tab."),
      suggestedTopics: ["JOINs", "Aggregations", "Subqueries"]
    };
  }
}

export interface SelectedQueriesAnalysis {
  generalAssessment: string;
  technicalNotes: {
    queryTitle: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
    improvements: string;
  }[];
  keyTakeaway: string;
  focusedExercise: {
    title: string;
    description: string;
    challengeHint: string;
  };
}

export async function analyzeSelectedQueries(
  selectedQueries: any[],
  userProfile?: UserProfile | null,
  schema: Table[] = INSURANCE_SCHEMA,
  language: string = 'he'
): Promise<SelectedQueriesAnalysis> {
  const currentSchemaContext = getSchemaContext(schema);
  try {
    const queriesSummary = selectedQueries.map(item => ({
      title: item.questionTitle || item.question?.title,
      description: item.question?.description,
      correctSql: item.question?.correctSql,
      userSql: item.userSql,
      score: item.score,
      isCorrect: item.isCorrect,
      explanation: item.explanation
    }));

    const profileContext = userProfile 
      ? `The user works in the "${userProfile.department}" department as a "${userProfile.role}".`
      : "";

    const response = await callGeminiWithRetry((ai, model) => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Analyze the following SPECIFIC SQL queries performed by the user.
      ${profileContext}
      
      Conduct a deep-dive technical evaluation of the query structure, join conditions, sargability, query planner optimization (for IBM DB2/AS400 environments), and elegance of execution.
      
      CRITICAL INSTRUCTION:
      Focus on teaching a correct thinking structure and methodology for writing SQL queries (שיטת חשיבה נכונה לכתיבת שאילתות), not just correcting errors. Explain the logical thought process required to reach the solution.
      
      CRITICAL SCHEMA RULE: 
      1. 'Claim_Payments' is NOT linked directly to 'Claims'. It is linked ONLY to 'Claimants' via 'claimant_id'. To get from a payment to a claim, you must JOIN 'Claim_Payments' to 'Claimants' (using 'claimant_id') and then 'Claimants' to 'Claims' (using 'claim_id').
      2. 'Appraiser_Actions' is also NOT linked directly to 'Claims'. It links to 'Claimants' via 'claimant_id'.
      3. A single claimant can have MULTIPLE appraisals (Appraiser_Actions) from the same appraiser.
      4. Policies table does NOT have a premium field. PREMIUM is stored in the 'Endorsements' table (premium_diff). To get total premium, join Policies to Endorsements and SUM(premium_diff). Premium can be positive or negative.
      ALWAYS follow this inheritance when discussing or writing SQL.

      Selected Queries for Deep-Dive:
      ${JSON.stringify(queriesSummary, null, 2)}
      
      Schema Context:
      ${currentSchemaContext}
      
      Return the response in JSON format (in ${language === 'he' ? 'HEBREW' : 'ENGLISH'}) with the following structure:
      - generalAssessment: A detailed, coherent paragraph (in ${language === 'he' ? 'HEBREW' : 'ENGLISH'}) summarizing the user's technical level, conceptual gaps, and SQL coding style shown in these specific queries, with an emphasis on their "thinking method".
      - technicalNotes: Array of objects (one per query) containing:
        * queryTitle: Title of the question.
        * score: Score obtained.
        * strengths: Array of technical strengths.
        * weaknesses: Array of technical issues.
        * improvements: A detailed piece of feedback focusing on the correct logical approach and thinking strategy (אסטרטגיית חשיבה), including a code snippet if helpful.
      - keyTakeaway: One single high-impact technical takeaway or lesson about query structure/logic (short, bold sentence).
      - focusedExercise: A personalized challenge custom-designed for this user based on their weaknesses/strengths:
        * title: Short challenge name.
        * description: A specific business question instructions they should try to write (matching the schema context).
        * challengeHint: Hint or key function to use.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            generalAssessment: { type: Type.STRING },
            technicalNotes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  queryTitle: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                  weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                  improvements: { type: Type.STRING }
                },
                required: ['queryTitle', 'score', 'strengths', 'weaknesses', 'improvements']
              }
            },
            keyTakeaway: { type: Type.STRING },
            focusedExercise: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                challengeHint: { type: Type.STRING }
              },
              required: ['title', 'description', 'challengeHint']
            }
          },
          required: ['generalAssessment', 'technicalNotes', 'keyTakeaway', 'focusedExercise']
        }
      }
    }));

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Selected queries analysis failed, using fallback:", error);
    const isHe = language === 'he';
    return {
      generalAssessment: isHe
        ? "חלה שגיאה בגישה לניתוח ה-AI המורחב, או שחלק מהשאילתות שהוזנו אינן תקינות. נסה לבחור שאילתות אחרות או לבדוק את מפתח ה-API שלך."
        : "An error occurred during extended AI analysis. Please verify your collection of queries or check your custom API key in Secrets.",
      technicalNotes: selectedQueries.map(q => ({
        queryTitle: q.questionTitle || q.question?.title || "SQL Query",
        score: q.score,
        strengths: [isHe ? "שימוש במבנה שאילתה בסיסי" : "Basic query structure used"],
        weaknesses: [isHe ? "אין הערות מיוחדות" : "No specific performance warnings generated in offline/fallback mode."],
        improvements: isHe 
          ? "לא ניתן לטעון שיפורים תחת עומס. נסה שוב בעוד מספר רגעים." 
          : "Could not load automated improvements under high-load/fallback mode. Please retry shortly."
      })),
      keyTakeaway: isHe 
        ? "מומלץ להקפיד על שימוש בחיבורי טבלאות מפורשים (Explicit JOIN) ולשים לב לתנאי הסינון."
        : "We recommend focusing on standardized explicit JOIN syntax and checking filter limits.",
      focusedExercise: {
        title: isHe ? "תרגול מותאם אישית של פונקציות תאריך" : "Custom Date Functions Practice",
        description: isHe 
          ? "נסה לכתוב שאילתה המחשבת את ממוצע הימים המדויק שחלף בין תאריך פתיחת פוליסה לבין הגשת תביעה ראשונה עבור לקוחות שרכשו ביטוח רכב (Makif)."
          : "Write a query calculating the exact elapsed days between policy start and claim creation for all motor insurance (Makif) buyers.",
        challengeHint: isHe ? "השתמש ב-JULIANDAY או ב-DATEDIFF בהתאם למסד הנתונים." : "Use JULIANDAY or DATEDIFF function."
      }
    };
  }
}

export interface ExecutionResult {
  columns: string[];
  columnExpressions?: string[];
  rows: any[][];
  rowCount: number;
  error?: string;
  isError?: boolean;
}

export interface LearningAnalysis {
  coreFailures: {
    topic: string;
    explanation: string;
    whyItPrevents100: string;
    exampleSolution: string;
    exampleExplanation: string;
  }[];
  generalSummary: string;
  actionPlan: string;
}

export async function analyzeLearningFailures(
  selectedQueries: any[],
  userProfile?: UserProfile | null,
  schema: Table[] = INSURANCE_SCHEMA,
  language: string = 'he'
): Promise<LearningAnalysis> {
  const currentSchemaContext = getSchemaContext(schema);
  try {
    const queriesSummary = selectedQueries.map(item => ({
      title: item.questionTitle || item.question?.title,
      description: item.question?.description,
      correctSql: item.question?.correctSql,
      userSql: item.userSql,
      score: item.score,
      isCorrect: item.isCorrect,
      explanation: item.explanation
    }));

    const profileContext = userProfile 
      ? `The user works in the "${userProfile.department}" department as a "${userProfile.role}".`
      : "";

    const response = await callGeminiWithRetry((ai, model) => ai.models.generateContent({
      model: model,
      contents: `Perform a "Learning Failure Analysis" (ניתוח למידה) for the following SQL practice queries.
      ${profileContext}
      
      CRITICAL GOAL:
      Identify the core mental models, conceptual gaps, or technical misunderstandings that are preventing this user from reaching a perfect score (100) in these specific exercises. 
      Focus on deep architectural/logical errors rather than typos.
      
      CRITICAL SCHEMA RULE: 
      1. 'Claim_Payments' is NOT linked directly to 'Claims'. It is linked ONLY to 'Claimants' via 'claimant_id'. To get from a payment to a claim, you must JOIN 'Claim_Payments' to 'Claimants' (using 'claimant_id') and then 'Claimants' to 'Claims' (using 'claim_id').
      2. 'Appraiser_Actions' is also NOT linked directly to 'Claims'. It links to 'Claimants' via 'claimant_id'.
      3. A single claimant can have MULTIPLE appraisals (Appraiser_Actions) from the same appraiser.
      4. Premium is stored in 'Endorsements' (premium_diff). Policies table has NO premium field.
      In your exampleSolution, NEVER join Claim_Payments or Appraiser_Actions directly to Claims, and always join Endorsements to get premium data.

      Queries to analyze:
      ${JSON.stringify(queriesSummary, null, 2)}
      
      Schema Context:
      ${currentSchemaContext}
      
      Return the response in JSON format (in ${language === 'he' ? 'HEBREW' : 'ENGLISH'}) with the following structure:
      - coreFailures: Array of objects (max 3) describing the main "roadblocks" found:
        * topic: The name of the missing or misunderstood concept (e.g., "Left Join vs Inner Join", "Aggregation over non-grouped columns").
        * explanation: A thorough explanation of what is being misunderstood and how it should work in an insurance context.
        * whyItPrevents100: Explain precisely how this gap caused the scores in the analyzed queries to drop below 100.
        * exampleSolution: A small, high-quality code example showing the CORRECT way to handle such a scenario.
        * exampleExplanation: Explanation of why this code example works.
      - generalSummary: A summary of their current progress and how these failures fit together.
      - actionPlan: A concrete set of steps to overcome these specific failures.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coreFailures: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  whyItPrevents100: { type: Type.STRING },
                  exampleSolution: { type: Type.STRING },
                  exampleExplanation: { type: Type.STRING }
                },
                required: ['topic', 'explanation', 'whyItPrevents100', 'exampleSolution', 'exampleExplanation']
              }
            },
            generalSummary: { type: Type.STRING },
            actionPlan: { type: Type.STRING }
          },
          required: ['coreFailures', 'generalSummary', 'actionPlan']
        }
      }
    }));

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Learning analysis failed:", error);
    const isHe = language === 'he';
    return {
      generalSummary: isHe ? "חלה שגיאה בהפקת ניתוח הלמידה. אנא נסה שוב." : "Error generating learning analysis. Please try again.",
      coreFailures: [],
      actionPlan: isHe ? "נסה לרענן את הדף או לבחור קבוצת שאילתות אחרת." : "Try refreshing or selecting different queries."
    };
  }
}

export async function simulateSqlExecution(userSql: string, question: Question, userProfile?: UserProfile | null, schema: Table[] = INSURANCE_SCHEMA, language: string = 'he'): Promise<ExecutionResult> {
    const currentSchemaContext = getSchemaContext(schema);
    const customSchemaText = userProfile?.customSchema && userProfile.customSchema.length > 0
      ? `\n\nADDITIONAL CUSTOM COLUMNS (Added by user):\n${userProfile.customSchema.map(c => ` - Table: ${c.table}, Column: ${c.name} (${c.type}): ${c.description}`).join('\n')}`
      : '';

    try {
      const response = await callGeminiWithRetry((ai, model) => ai.models.generateContent({
        model: model,
        contents: `Simulate the execution of the following SQL query or Stored Procedure on a database schema.
        
        STRICT EXECUTION RULES:
        1. ANALYZE the SQL/Procedure: Identify exactly which columns or aliases are requested.
        2. VALIDATE syntax and schema: If the User SQL has syntax errors, references missing tables/columns, or follows illegal SQL logic (e.g., aggregation without GROUP BY), set isError to true and provide a REALISTIC SQL SERVER error message (e.g. "Column 'xyz' not found", "Msg 102, Level 15, State 1, Incorrect syntax near...").
        3. STORED PROCEDURES: If the user is creating or executing a Stored Procedure, simulate the expected output or success.
        4. ERROR PRIORITY: If there is an error, isError must be true, and 'error' contains the message. columns/rows can be empty.
        5. OUTPUT FORMAT: The 'columns' array MUST contain ONLY the names/aliases from the SELECT clause.
        6. DATA CONSISTENCY: Each row in 'rows' MUST match the 'columns' count.
        7. DATA VOLUME: Generate 15-30 rows where applicable.
        8. DATE RANGE: Ensure dates are in 2021-2026.
        
        Question Context: ${question.description}
        User SQL: ${userSql}
        
        Schema:
        ${currentSchemaContext}${customSchemaText}
        
        Return a JSON response with:
        - columns: Array of column names.
        - columnExpressions: Array of technical explanations.
        - rows: Array of arrays of data.
        - rowCount: Total number of rows.
        - isError: Boolean, true if SQL is invalid.
        - error: String, the realistic SQL error message if isError is true.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction: `You are a SQL engine simulator for a large insurance database (PostgreSQL/SQL Server style). 
          Your goal:
          1. Return the exact output (columns and rows) that the provided SQL query would produce.
          2. IF THE SQL IS INVALID (syntax, schema mismatch, or logic errors), you MUST return a realistic SQL engine error message.
          3. Explain HOW each field was built.
          Generate a rich set of data (15-30 rows) spanning the years 2021-2026.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              columns: { type: Type.ARRAY, items: { type: Type.STRING } },
              columnExpressions: { type: Type.ARRAY, items: { type: Type.STRING } },
              rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } },
              rowCount: { type: Type.NUMBER },
              isError: { type: Type.BOOLEAN },
              error: { type: Type.STRING }
            },
            required: ['columns', 'columnExpressions', 'rows', 'rowCount', 'isError']
          }
        }
      }));

      const res = JSON.parse(response.text || "{}");
      return res;
    } catch (error: any) {
      const errorMsg = error.message || "";
      const isHighDemand = errorMsg === "GOOGLE_LOAD_ERROR" || errorMsg.includes("503") || errorMsg.includes("high demand") || errorMsg.includes("עומס");
      console.warn(`Simulation failed (Load Error: ${isHighDemand}). Using empty fallback.`);
      return {
        columns: [language === 'he' ? "שגיאה" : "Error"],
        rows: [[isHighDemand 
          ? (language === 'he' 
            ? "שרתי ה-AI של גוגל עמוסים כרגע (503). אנא נסי שוב בעוד דקה או ודאי שמפתח ה-API ב-Secrets מוגדר כראוי."
            : "Google's AI servers are currently busy (503). Please try again in a minute, or verify that your API key is correctly configured in Secrets.")
          : (language === 'he' 
            ? "לא ניתן היה לסמלץ את הרצת השאילתה. אנא ודאי שמפתח ה-API שלך תקין."
            : "Failed to simulate query execution. Please verify your custom API key is correct."
          )]],
        rowCount: 0
      };
    }
}

export async function chatAboutSolution(
  userMessage: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  question: Question,
  userSql: string,
  result?: GradeResult | null,
  userProfile?: UserProfile | null,
  schema: Table[] = INSURANCE_SCHEMA,
  language: string = 'he'
): Promise<string> {
  const currentSchemaContext = getSchemaContext(schema);
  const customSchemaText = userProfile?.customSchema && userProfile.customSchema.length > 0
    ? `\n\nADDITIONAL CUSTOM COLUMNS (Added by user):\n${userProfile.customSchema.map(c => ` - Table: ${c.table}, Column: ${c.name} (${c.type}): ${c.description}`).join('\n')}`
    : '';

  const gradingInfo = result 
    ? `- User's SQL Attempt: ${userSql}\n- Your Previous Grade/Explanation: ${result.explanation}`
    : "- The user has NOT submitted a solution yet. They are asking for CLARIFICATION or HINTS about the business requirements or the schema.";

  try {
    return await callGeminiWithRetry(async (ai, model) => {
      const chat = ai.chats.create({ 
        model: model,
        config: {
          systemInstruction: `You are an expert SQL Mentor in the database industry.
          The user is practicing SQL queries on a specific schema.
          
          CONTEXT:
          - Question: ${question.description}
          - Correct SQL: ${question.correctSql}
          ${gradingInfo}
          
          SCHEMA:
          ${currentSchemaContext}${customSchemaText}
          
          GUIDELINES:
          1. Be encouraging and educational.
          2. Explain SQL concepts (JOINs, Aggregations, Window Functions) in the context of insurance business logic.
          3. If the user hasn't submitted yet, focus on explaining the requirements, the database structure, or give subtle hints without giving away the full answer.
          4. Use ${language === 'he' ? 'HEBREW' : 'ENGLISH'} for the conversation.
          5. Keep responses concise but thorough enough to be helpful.`
        },
        history: history.map(m => ({
          role: m.role,
          content: m.parts[0].text
        }))
      });

      const response = await chat.sendMessage({ message: userMessage });
      return response.text || ""; // 💡 כאן בדיוק את מוסיפה את ה- || ""
    });
  } catch (error: any) {
    console.error("Chat failed:", error);
    return language === 'he' 
      ? "מצטער, חלה שגיאה בחיבור לצ'אט. אנא נסה שוב מאוחר יותר."
      : "Sorry, an error occurred in connecting to the chat. Please try again later.";
  }
}

export async function summarizePracticeChat(
  history: { role: 'user' | 'model'; content: string }[],
  language: string = 'he'
): Promise<string> {
  try {
    return await callGeminiWithRetry(async (ai, model) => {
      const response = await ai.models.generateContent({
        model: model,
        contents: `Summarize the following SQL practice conversation between an AI Mentor and a student. 
        Focus on the concepts discussed and the student's learning progress.
        
        Conversation:
        ${JSON.stringify(history, null, 2)}
        
        STRICT RULES:
        1. Keep it concise (max 2-3 sentences).
        2. Use ${language === 'he' ? 'HEBREW' : 'ENGLISH'}.
        3. Do NOT include redundant introduction.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });
      return response.text || "";;
    });
  } catch (error) {
    console.error("Summarization failed:", error);
    return "";
  }
}

export async function generateQuestionVariations(question: Question, schema: any[], language: string = 'he'): Promise<{ easy: Question; hard: Question }> {
  try {
    const response = await callGeminiWithRetry((ai, model) => ai.models.generateContent({
      model: model,
      contents: `You are an expert SQL Mentor. I will provide you with a SQL business question. 
          Your task is to generate TWO variations of this question based on the same insurance database schema:
          1. An EASIER version: Simplify the logic (e.g., remove a JOIN, use fewer conditions, or simpler aggregation).
          2. A HARDER version: Increase complexity (e.g., add a self-JOIN, complex CASE WHEN, subqueries, or window functions like RANK/PARTITION).

          SCHEMA CONTEXT:
          ${JSON.stringify(schema)}

          ORIGINAL QUESTION:
          Title: ${question.title}
          Description: ${question.description}
          Difficulty: ${question.difficulty}
          Correct SQL: ${question.correctSql}

          OUTPUT FORMAT (Strict JSON):
          {
            "easy": {
              "title": "Short descriptive title in ${language === 'he' ? 'Hebrew' : 'English'}",
              "description": "Clear description in ${language === 'he' ? 'Hebrew' : 'English'}",
              "difficulty": "Easy",
              "correctSql": "The valid SQL for this question"
            },
            "hard": {
              "title": "Short descriptive title in ${language === 'he' ? 'Hebrew' : 'English'}",
              "description": "Clear description in ${language === 'he' ? 'Hebrew' : 'English'}",
              "difficulty": "Hard or Expert",
              "correctSql": "The valid SQL for this question"
            }
          }

          RULES:
          1. Use ${language === 'he' ? 'Hebrew' : 'English'} for titles and descriptions.
          2. Ensure the SQL is valid for the provided schema.
          3. Titles should be concise.
          4. Return ONLY valid JSON.`,
      config: {
        responseMimeType: 'application/json'
      }
    }));

    const result = JSON.parse(response.text || "{}");
    return {
      easy: { ...result.easy, id: `v-${Math.random().toString(36).substr(2, 5)}` },
      hard: { ...result.hard, id: `v-${Math.random().toString(36).substr(2, 5)}` }
    };
  } catch (error) {
    console.error("Error generating variations:", error);
    // Fallback to original if generation fails
    return {
      easy: { ...question, difficulty: 'Easy', id: `e-${question.id}` },
      hard: { ...question, difficulty: 'Hard', id: `h-${question.id}` }
    };
  }
}

export async function gradeSqlQuery(
  userSql: string,
  question: Question,
  userProfile?: UserProfile | null,
  schema: Table[] = INSURANCE_SCHEMA,
  language: string = 'he'
): Promise<GradeResult> {
    const currentSchemaContext = getSchemaContext(schema);
    const customSchemaText = userProfile?.customSchema && userProfile.customSchema.length > 0
      ? `\n\nADDITIONAL CUSTOM COLUMNS (Added by user):\n${userProfile.customSchema.map(c => ` - Table: ${c.table}, Column: ${c.name} (${c.type}): ${c.description}`).join('\n')}`
      : '';

    try {
      const response = await callGeminiWithRetry((ai, model) => ai.models.generateContent({
        model: model,
        contents: `Grade the following user-provided SQL query or Stored Procedure against the target question and schema.
        
        CRITICAL EVALUATION RULES:
        1. LOGICAL CORRECTNESS: If the query produces the correct result, it is correct.
        2. THINKING METHODOLOGY (שיטת חשיבה): In your explanation, focus on the logical approach and thinking method required to write this query. Don't just say what is wrong; explain how to think about the problem correctly.
        3. PERFORMANCE ANALYSIS: Even if correct, evaluate efficiency for a database.
           - Check for Cartesian products (missing JOIN conditions).
           - Check for unnecessary subqueries where JOINs would be faster.
           - Check for non-SARGable WHERE clauses.
           - Check for redundant 'SELECT *' vs specific columns.
        4. STORED PROCEDURES: Validate syntax and logic specifically for procedures.
        
        If you find a significant performance bottleneck:
        - Provide a 'performanceWarning' in ${language === 'he' ? 'Hebrew' : 'English'} explaining the issue.
        - Provide an 'optimizedSql' showing the better way to write the query.
        
        Question: ${question.description}
        Target Correct SQL (for reference): ${question.correctSql}
        User SQL: ${userSql}
        
        Schema:
        ${currentSchemaContext}${customSchemaText}
        
        Return a JSON response with:
        - score: 0-100.
        - feedback: Short feedback in ${language === 'he' ? 'Hebrew' : 'English'}.
        - isCorrect: boolean.
        - explanation: Detailed explanation in ${language === 'he' ? 'Hebrew' : 'English'} of why it's correct or what's wrong, and the logical thinking process (אסטרטגיה לוגית) behind the solution.
        - performanceWarning: (Optional) Description of performance issues in ${language === 'he' ? 'Hebrew' : 'English'}.
        - optimizedSql: (Optional) Optimized version of user SQL.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              isCorrect: { type: Type.BOOLEAN },
              explanation: { type: Type.STRING },
              performanceWarning: { type: Type.STRING },
              optimizedSql: { type: Type.STRING }
            },
            required: ['score', 'feedback', 'isCorrect', 'explanation']
          }
        }
      }));

      return JSON.parse(response.text || "{}");
    } catch (error: any) {
      const errorMsg = error.message || "";
      const isHighDemand = errorMsg === "GOOGLE_LOAD_ERROR" || errorMsg.includes("503") || errorMsg.includes("high demand") || errorMsg.includes("עומס");
      console.warn(`Grading failed (Load Error: ${isHighDemand}). Using fallback.`);
      
      if (errorMsg === "MISSING_API_KEY") {
        return {
          score: 0,
          feedback: language === 'he' 
            ? "מפתח ה-API חסר. אנא הגדר אותו ב-Secrets תחת Environment Variables." 
            : "API key is missing. Please define it in Secrets under Environment Variables.",
          isCorrect: false,
          explanation: language === 'he' 
            ? "כדי להפעיל את ה-AI, עליך להגדיר GEMINI_API_KEY בהגדרות המערכת (Settings)." 
            : "To enable the AI tutor, you must define GEMINI_API_KEY in settings (Settings -> Secrets)."
        };
      }

      if (isHighDemand) {
        const isMatch = userSql.toLowerCase().replace(/\s/g, '') === question.correctSql.toLowerCase().replace(/\s/g, '');
        return {
          score: isMatch ? 100 : 0,
          feedback: isMatch 
            ? (language === 'he' ? "נראה נכון (בדיקה אוטומטית)" : "Looks correct (automated match)") 
            : (language === 'he' ? "ה-AI עמוס מדי לבדיקה מעמיקה כרגע." : "AI is too busy for deep checking right now."),
          isCorrect: isMatch,
          explanation: language === 'he' 
            ? "שגיאת עומס (503). המערכת ביצעה השוואה בסיסית בלבד. מומלץ להגדיר מפתח API ב-Secrets לביצועים טובים יותר."
            : "Overload error (503). The system performed basic comparison only. We recommend configuring a custom API key in Secrets for better reliability."
        };
      }

      // Simple string comparison as a last resort
      const isMatch = userSql.toLowerCase().replace(/\s/g, '') === question.correctSql.toLowerCase().replace(/\s/g, '');
      return {
        score: isMatch ? 100 : 0,
        feedback: isMatch 
          ? (language === 'he' ? "נראה נכון (השוואת מחרוזות)" : "Looks correct (string match)")
          : (language === 'he' ? "לא ניתן לבדוק כרגע עקב עומס בשרתי ה-AI" : "Cannot check right now due to AI server capacity"),
        isCorrect: isMatch,
        explanation: language === 'he' 
          ? "שרתי ה-AI עמוסים כרגע. המערכת ביצעה השוואה בסיסית בלבד. מומלץ לוודא שמפתח ה-API ב-Secrets מוגדר כראוי."
          : "AI servers are currently under heavy load. A basic string comparison was performed. Ensure your API key is correctly defined in Secrets."
      };
    }
}

export async function analyzeSpecificQueries(
  queries: any[],
  userProfile?: UserProfile | null,
  schema: Table[] = INSURANCE_SCHEMA,
  language: string = 'he'
): Promise<string> {
  const currentSchemaContext = getSchemaContext(schema);
  const profileContext = userProfile 
    ? `המשתמש עובד במחלקת "${userProfile.department}" בתפקיד "${userProfile.role}".`
    : "";

  const queriesSummary = queries.map((item, index) => ({
    index: index + 1,
    title: item.question?.title || item.questionTitle,
    description: item.question?.description,
    userSql: item.userSql,
    correctSql: item.question?.correctSql,
    score: item.score,
    isCorrect: item.isCorrect,
    explanation: item.explanation
  }));

  try {
    return await callGeminiWithRetry(async (ai, model) => {
      const response = await ai.models.generateContent({
        model: model,
        contents: `נתח באופן מעמיק ומקצועי את השאילתות הבאות שביצע המשתמש.
        ${profileContext}
        
        השאילתות לניתוח:
        ${JSON.stringify(queriesSummary, null, 2)}
        
        סכמת מסד הנתונים:
        ${currentSchemaContext}
        
        משימה:
        עליך להפיק ניתוח AI ממוקד ומפורט מאוד (בפורמט Markdown קריא ומעוצב ב${language === 'he' ? 'עברית' : 'אנגלית'}) שכולל:
        1. מבוא קצר ומעודד על השאילתות שנבחרו ורמתן.
        2. ניתוח אסטרטגיות החשיבה (Thinking Strategies) שעולות מהשאילתות הללו - האם המשתמש ניגש לבעיות בצורה נכונה?
        3. ניתוח חוזקות ספציפיות (למשל שימוש יעיל ב-JOINs, בחירת תנאים נכונה, הבנת הלוגיקה העסקית של הביטוח).
        4. איתור נקודות חולשה, טעויות סינטקס או כשלים לוגיים ביחס לשיטת עבודה נכונה, והסבר מדוע הן בעייתיות.
        5. המלצות למידה מעשיות ממוקדות וטיפים שימושיים לשיפור אופן החשיבה והמתודיקה של כתיבת שאילתות SQL.
        
        התשובה חייבת להיות כתובה מעולה, קריאה, מקצועית ומעוצבת יפה עם כותרות, נקודות והדגשות ב-Markdown!`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });
      return response.text || "";;
    });
  } catch (error) {
    console.error("Focused query analysis failed:", error);
    return language === 'he'
      ? "שרתי ה-AI עמוסים כרגע. אנא נסה שוב בעוד מספר רגעים או ודא שמפתח ה-API תקין בהגדרות."
      : "AI servers are currently busy. Please try again in a few moments or ensure your API key in Secrets is properly configured.";
  }
}

export interface ComparisonResult {
  explanation: string;
  comparisonTable: { parameter: string; query1: string; query2: string }[];
  performanceComparison: string;
  resultsComparison: string;
  recommendation: string;
}

export async function compareTwoQueries(
  question: Question,
  query1: { sql: string; score: number; isCorrect: boolean; explanation: string },
  query2: { sql: string; score: number; isCorrect: boolean; explanation: string },
  schema: Table[] = INSURANCE_SCHEMA,
  language: string = 'he'
): Promise<ComparisonResult> {
  const currentSchemaContext = getSchemaContext(schema);

  try {
    const response = await callGeminiWithRetry((ai, model) => ai.models.generateContent({
      model: model,
      contents: `השווה באופן מעמיק ומקצועי בין שתי שאילתות שונות שהמשתמש כתב עבור אותה השאלה הבאה.
      
      השאלה:
      כותרת: ${question.title}
      תיאור: ${question.description}
      פתרון בית ספר/נכון לדעת מערכת (לא חובה שיהיה זהה אבל כאמת מידה): ${question.correctSql}
      
      שאילתה א' (Query 1):
      תרגום SQL:
      ${query1.sql}
      ציון שהתקבל במערכת: ${query1.score}%
      הסבר סימולטור: ${query1.explanation}
      
      שאילתה ב' (Query 2):
      תרגום SQL:
      ${query2.sql}
      ציון שהתקבל במערכת: ${query2.score}%
      הסבר סימולטור: ${query2.explanation}
      
      סכמת מסד הנתונים:
      ${currentSchemaContext}
      
      משימה:
      עליך להפיק השוואה מקצועית של ביצועים, קריאות, ונכונות בפורמט JSON ב${language === 'he' ? 'עברית' : 'אנגלית'}.
      
      מבנה ה-JSON הנדרש:
      {
        "explanation": "הסבר מילולי ותמציתי על ההבדל הכללי בין הגישות השונות בשתי השאילתות.",
        "comparisonTable": [
          { "parameter": "פרמטר ההשוואה (לדוגמה: מורכבות, קריאות, חיבורי טבלאות, סינון נתונים וכדומה)", "query1": "כיצד בא לידי ביטוי בשאילתה א", "query2": "כיצד בא לידי ביטוי בשאילתה ב" }
        ],
        "performanceComparison": "הסבר מעמיק על ההבדלים בביצועים (Performance) ויעילות השאילתה - למשל, עלות ה-JOIN, סינון מוקדם לעומת מאוחר, שימוש ב-Subqueries לעומת JOIN, יתירות חישובים וכדומה.",
        "resultsComparison": "השוואה של מבנה התוצאה הצפויה והנכונות הסימולטיבית (האם הן מחזירות אותן עמודות, האם סדר השורות או הקיבוץ שונה, איזה חישוב מדויק יותר ביחס לדרישה העסקית).",
        "recommendation": "המלצה מקצועית וברורה: איזו שאילתה עדיפה מבין השתיים ובאילו מקרים, כולל טיפ מפתח לשיפור!"
      }`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            comparisonTable: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  parameter: { type: Type.STRING },
                  query1: { type: Type.STRING },
                  query2: { type: Type.STRING }
                },
                required: ['parameter', 'query1', 'query2']
              }
            },
            performanceComparison: { type: Type.STRING },
            resultsComparison: { type: Type.STRING },
            recommendation: { type: Type.STRING }
          },
          required: ['explanation', 'comparisonTable', 'performanceComparison', 'resultsComparison', 'recommendation']
        }
      }
    }));

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Query comparison failed:", error);
    return {
      explanation: language === 'he' 
        ? "לא ניתן היה להשוות את השאילתות עקב שגיאת עומס זמנית בשרתי ה-AI."
        : "Could not compare queries due to AI server load.",
      comparisonTable: [
        {
          parameter: language === 'he' ? "נכונות קוד ומבנה" : "Syntax correctness",
          query1: query1.sql,
          query2: query2.sql
        }
      ],
      performanceComparison: language === 'he' ? "הסימולטור לא זמין כרגע." : "Simulation unavailable right now.",
      resultsComparison: language === 'he' ? "הסימולטור לא זמין כרגע." : "Simulation unavailable right now.",
      recommendation: language === 'he' ? "נסו שוב בעוד מספר רגעים." : "Please try again later."
    };
  }
}

export interface SQLPerformanceAnalysis {
  performanceScore: number;
  hasBottlenecks: boolean;
  bottlenecks: {
    type: 'cartesian_product' | 'non_sargable' | 'redundant_distinct' | 'wildcard_scan' | 'inefficient_join' | 'other';
    title: string;
    description: string;
    impact: 'High' | 'Medium' | 'Low';
    remedy: string;
  }[];
  optimizedSql: string | null;
  performanceChecklist: {
    checkName: string;
    passed: boolean;
    explanation: string;
  }[];
  actionableTips: string[];
  db2SpecificAdvice?: string;
}

export async function analyzeSqlPerformance(
  userSql: string,
  schema: Table[] = INSURANCE_SCHEMA,
  language: string = 'he'
): Promise<SQLPerformanceAnalysis> {
  const currentSchemaContext = getSchemaContext(schema);

  try {
    const response = await callGeminiWithRetry((ai, model) => ai.models.generateContent({
      model: model,
      contents: `You are an expert Senior Database Architect, Query Performance Tuning specialist, and DB2/AS400 Optimizer Engineer.
      Analyze the following user-submitted SQL query for realistic performance bottlenecks, query analyzer costs, SARGability flaws, and index scan issues.
      
      User SQL Query to analyze:
      """
      ${userSql}
      """
      
      Database Schema context:
      ${currentSchemaContext}

      CRITICAL BOTTLENECK CHECKS:
      1. Cartesian Products / Cross Joins: Joining tables without explicit conditions or using comma separated joins without direct matching PK/FK relationships in WHERE.
      2. Non-SARGable predicates: Using SQL functions or mathematical operations on columns within the WHERE, ON, or HAVING clauses that bypass index seeking. E.g., YEAR(p.start_date) = 2026, TRIM(UPPER(c.status)) = 'OPEN', or date math instead of direct ranges.
      3. Index Scan / Range Scans: Heavy front-wildcard checks (LIKE '%claim'), forcing table-scans on big datasets.
      4. Sorting Cost & Table Spooling: Is there unnecessary DISTINCT or GROUP BY on non-aggregates?
      5. Column fetching efficiency: Selecting unnecessary columns or dynamic stars (*) instead of key coverage list.
      6. Correlated subqueries: Using slow subqueries where simple left/inner joins are much more efficient.

      Task: Write a thorough, professional, actionable optimization report in ${language === 'he' ? 'HEBREW' : 'ENGLISH'}.
      Note: In DB2 / AS400 environments (used heavily by Israeli elementary insurance companies), queries frequently run under tight systems, meaning non-sargable WHEREs and cartesian products hit query timers early. Provide real-world tips!

      Return a JSON response matching the following structure strictly:
      {
        "performanceScore": 100, // Score out of 100 based on efficiency (e.g. 100 is highly optimized, 40 has critical bottlenecks)
        "hasBottlenecks": false, // true if at least one bottleneck (Medium or High impact) is found
        "bottlenecks": [
          {
            "type": "type of bottleneck, e.g. 'cartesian_product' | 'non_sargable' | 'redundant_distinct' | 'wildcard_scan' | 'inefficient_join' | 'other'",
            "title": "Short title describing the bottleneck",
            "description": "Clear explanation of why this code hurts efficiency",
            "impact": "'High' | 'Medium' | 'Low'",
            "remedy": "Specific instruction on how to clean it up"
          }
        ],
        "optimizedSql": "A perfectly optimized rewrite of the query, or NULL if the query is already pristine",
        "performanceChecklist": [
          {
            "checkName": "Standard check label, e.g. 'JOIN Condition Safety' / 'SARGable WHERE predicates' / 'Fetch Limit Restriction' / 'Column Select Specificity'",
            "passed": true, // whether the check passes
            "explanation": "Brief explanation of how the query fares under this test"
          }
        ],
        "actionableTips": [
          "Actionable query optimization bullet 1",
          "Actionable query optimization bullet 2"
        ],
        "db2SpecificAdvice": "Specialized advice reflecting IBM DB2/AS400 behavior (e.g., table spaces, index behavior, fetching first rows limit, storage indexes)."
      }`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            performanceScore: { type: Type.NUMBER },
            hasBottlenecks: { type: Type.BOOLEAN },
            bottlenecks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['cartesian_product', 'non_sargable', 'redundant_distinct', 'wildcard_scan', 'inefficient_join', 'other'] },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  impact: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                  remedy: { type: Type.STRING }
                },
                required: ['type', 'title', 'description', 'impact', 'remedy']
              }
            },
            optimizedSql: { type: Type.STRING },
            performanceChecklist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  checkName: { type: Type.STRING },
                  passed: { type: Type.BOOLEAN },
                  explanation: { type: Type.STRING }
                },
                required: ['checkName', 'passed', 'explanation']
              }
            },
            actionableTips: { type: Type.ARRAY, items: { type: Type.STRING } },
            db2SpecificAdvice: { type: Type.STRING }
          },
          required: ['performanceScore', 'hasBottlenecks', 'bottlenecks', 'performanceChecklist', 'actionableTips']
        }
      }
    }));

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Query performance analysis failed:", error);
    const isHe = language === 'he';
    return {
      performanceScore: 80,
      hasBottlenecks: false,
      bottlenecks: [],
      optimizedSql: null,
      performanceChecklist: [
        {
          checkName: isHe ? "תקינות חיבורי טבלאות" : "JOIN Condition Safety",
          passed: true,
          explanation: isHe ? "לא נמצאו מפתחות חסרים או חיבורי מכפלה קרטזית." : "No missing join conditions or cartesian products detected."
        },
        {
          checkName: isHe ? "שאילתות SARGable" : "SARGable Predicates",
          passed: true,
          explanation: isHe ? "מפתחות החיפוש נראים תקינים." : "Search predicates look sound."
        }
      ],
      actionableTips: [
        isHe 
          ? "נסה להימנע משימוש בפונקציות (כמו YEAR, SUBSTR) על עמודות מסוננות כדי שתוכל לנצל אינדקסים קיימים." 
          : "Avoid using functions (such as YEAR or SUBSTR) on filter columns to preserve index usability."
      ],
      db2SpecificAdvice: isHe 
        ? "בסביבת מערכות AS400 מומלץ להקפיד על הוספת FETCH FIRST 100 ROWS ONLY לצמצום הצריכה ב-Spooling של טבלאות גדולות." 
        : "In IBM AS400 DB2 contexts, always consider appending FETCH FIRST n ROWS ONLY to prevent severe spooling space overhead."
    };
  }
}

export async function generateDailyExercises(
  completedQuestions: any[],
  userProfile: any,
  schema: Table[] = INSURANCE_SCHEMA,
  language: string = 'he'
): Promise<{
  weaknesses: string[];
  exercises: (Question & { weaknessCategory: string })[];
}> {
  const currentSchemaContext = getSchemaContext(schema);
  
  const historySummary = completedQuestions.map(item => ({
    title: item.questionTitle || item.question?.title,
    difficulty: item.difficulty || item.question?.difficulty,
    score: item.score,
    isCorrect: item.isCorrect,
    userSql: item.userSql,
    correctSql: item.correctSql || item.question?.correctSql,
    explanation: item.explanation
  })).slice(0, 15);

  const profileContext = userProfile 
    ? `User Profile - Department: "${userProfile.department}", Role: "${userProfile.role}".`
    : "";

  try {
    const response = await callGeminiWithRetry((ai, model) => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are an expert SQL Mentor and Performance Optimizer Coach.
      Your task is to analyze a student's SQL practice history, detect their structural and logical weaknesses, and generate EXACTLY 5 custom exercises to target and overcome these weaknesses to make them a "SQL Champion".

      STUDENT PROFILE AND ENVIRONMENT:
      ${profileContext}
      Language: ${language === 'he' ? 'Hebrew' : 'English'}

      STUDENT RECENT SOLVED HISTORY:
      ${JSON.stringify(historySummary, null, 2)}

      SCHEMA REFERENCE:
      ${currentSchemaContext}

      CRITICAL SYSTEM RULES FOR FORMULATING QUESTIONS:
      1. 'Claim_Payments' is NOT linked directly to 'Claims'. It is linked ONLY to 'Claimants' via 'claimant_id'. To get from a payment to a claim, you must JOIN 'Claim_Payments' to 'Claimants' (using 'claimant_id') and then 'Claimants' to 'Claims' (using 'claim_id').
      2. 'Appraiser_Actions' is also NOT linked directly to 'Claims'. It links to 'Claimants' via 'claimant_id'.
      3. A single claimant can have MULTIPLE appraisals (Appraiser_Actions) from the same appraiser.
      4. Policies table does NOT have a premium field. PREMIUM is stored in the 'Endorsements' table. To calculate a policy's total premium, you must SUM(premium_diff) from 'Endorsements' for that policy_id. Every policy has at least one endorsement (number 0).
      5. FAN-OUT WARNING: When calculating sums of premiums AND sums of payments in the same query, NEVER join 'Endorsements' directly to 'Claim_Payments'. This will cause duplicating premium values for every payment row. ALWAYS use separate CTEs or subqueries to aggregate premiums and claims separately before joining the results.
      
      ANALYSIS TASK:
      1. Evaluate user's recent submissions: where did they fail? What syntax features are missing or caused low scores (e.g., missed JOIN paths, poor aggregations, incorrect date formatting, lacking HAVING filters, or not standardizing IDs)?
      2. If history is empty, identify 3 general challenging SQL topics (e.g. MULTIPLE JOINS, AGGREGATES WITH HAVING, COALESCE & ID formatting) as their baseline gaps.
      3. Return an array of these identified "weaknesses".
      
      EXERCISE GENERATION TASK:
      Generate EXACTLY 5 distinct, high-quality exercises in Hebrew (or English if selected) that target these exact weaknesses. 
      For each exercise:
      - id: dynamic random string (e.g., 'daily_ex_1' etc)
      - title: A short title
      - description: The business question instructions (explicitly outlining database variables and what is expected to be calculated)
      - difficulty: 'Easy', 'Medium', 'Hard', or 'Expert'
      - correctSql: Must be perfectly accurate and fully compliant with the database schema context.
      - hints: exactly 2 help strings (for Hard/Expert) or an empty array.
      - weaknessCategory: Short string explaining which weakness area or skill this exercise is targeting. (e.g. "שימוש מושכל ב-COALESCE למניעת ערכי NULL" or "קיבוץ וסינון קבוצות (HAVING)")
      
      Response Format MUST be strict JSON matching this structure:
      {
        "weaknesses": ["list of 2-3 weaknesses in ${language === 'he' ? 'HEBREW' : 'ENGLISH'}"],
        "exercises": [
          {
            "id": "string",
            "title": "string",
            "description": "string",
            "difficulty": "Easy|Medium|Hard|Expert",
            "correctSql": "string",
            "hints": ["string", "string"],
            "weaknessCategory": "string"
          }
        ]
      }`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weaknesses: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            exercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard', 'Expert'] },
                  correctSql: { type: Type.STRING },
                  hints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  weaknessCategory: { type: Type.STRING }
                },
                required: ['id', 'title', 'description', 'difficulty', 'correctSql', 'weaknessCategory']
              }
            }
          },
          required: ['weaknesses', 'exercises']
        }
      }
    }));

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Daily exercises generation failed:", error);
    const isHe = language === 'he';
    return {
      weaknesses: isHe 
        ? ["שימוש ב-JOIN מרובים לקבצי תביעות", "סינונים וביטויים מותנים", "אגרגציות וחישובי הפסדים"] 
        : ["Multiple claims tables Joins", "Conditionals and conditional expressions", "Loss ratios Aggregations"],
      exercises: [
        {
          id: "fallback_daily_1",
          title: isHe ? "מבוטחים ללא תביעות" : "Insureds without Claims",
          description: isHe 
            ? "הציגו רשימה של מבוטחים שלא הגישו אף תביעה מעולם. הציגו שם פרטי, שם משפחה ומספר טלפון, מוין לפי שם משפחה בסדר עולה."
            : "Display a list of insureds who have never filed a claim. Output first name, last name, and phone, ordered by last name ascending.",
          difficulty: "Easy",
          weaknessCategory: isHe ? "שימוש בחיבורים חיצוניים (LEFT JOIN)" : "Unmatched rows using LEFT JOIN",
          correctSql: "SELECT i.first_name, i.last_name, i.phone FROM Insured i LEFT JOIN Claims c ON i.insured_id = c.insured_id WHERE c.claim_id IS NULL ORDER BY i.last_name ASC",
          hints: []
        },
        {
          id: "fallback_daily_2",
          title: isHe ? "ממוצע ימי חיתום למוצר" : "Average Underwriting Days per Product",
          description: isHe 
            ? "חשבו עבור כל סוכן את ממוצע הימים בין תאריך החיתום לתחילת הביטוח של הפוליסות שלו."
            : "Calculate for each agent the average days between underwriting date and the start of the policy.",
          difficulty: "Medium",
          weaknessCategory: isHe ? "פונקציות לתאריכים וחיפושים קבוצתיים" : "Date arithmetic and aggregates",
          correctSql: "SELECT agent_id, AVG(DATEDIFF(start_date, underwriting_date)) as avg_days FROM Policies GROUP BY agent_id",
          hints: []
        },
        {
          id: "fallback_daily_3",
          title: isHe ? "פיצויים מעל מליון שקלים" : "Payments Over 1 Million Shekels",
          description: isHe 
            ? "מצאו את התובעים ופרטי התביעה שגובה התשלומים עבורם תחת טבלת התשלומים (Claim_Payments) עלתה על 1,000,000 ש\"ח בסך הכל."
            : "Find claimants and their claim details whose total amount of payments in Claim_Payments exceeded 1,000,050 ILS.",
          difficulty: "Medium",
          weaknessCategory: isHe ? "סינון קבוצות (HAVING)" : "Aggregate filtering with HAVING",
          correctSql: "SELECT claimant_id, SUM(amount) as total_paid FROM Claim_Payments GROUP BY claimant_id HAVING SUM(amount) > 1000000",
          hints: []
        },
        {
          id: "fallback_daily_4",
          title: isHe ? "יחס הפסד אקטוארי לשנת 2025" : "Actuarial Loss Ratio for 2025",
          description: isHe 
            ? "יש לחשב את סקירת תשלומי התביעות לעומת סך הפרמיות בגין פוליסות שהחלו בשנת 2025."
            : "Calculate total claim payments relative to total premiums for policies starting in 2025.",
          difficulty: "Hard",
          weaknessCategory: isHe ? "שאילתות משנה מקוננות ויחסי הפסד" : "Subqueries and complex ratios",
          correctSql: "SELECT SUM(p.amount) FROM Claim_Payments p",
          hints: [isHe ? "השתמשו ב-CTE נפרדים לתביעות ולפרמיות" : "Use separate CTEs for claims and premiums"]
        },
        {
          id: "fallback_daily_5",
          title: isHe ? "דירוג שמאים מצטיינים" : "Ranking Outstanding Appraisers",
          description: isHe 
            ? "דרגו את השמאים לפי כמות השמאויות שביצעו שבהן זוהה נזק מעל 50% משווי שוק."
            : "Rank appraisers based on the number of appraisals they performed where damage exceeded 50% of market value.",
          difficulty: "Hard",
          weaknessCategory: isHe ? "פונקציות דירוג וחלון (DENSE_RANK)" : "Window ranking functions",
          correctSql: "SELECT appraiser_id, COUNT(*) FROM Appraiser_Actions GROUP BY appraiser_id",
          hints: []
        }
      ]
    };
  }
}

