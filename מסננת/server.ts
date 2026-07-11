import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Parse json requests with a limit up to 15MB to support PDF uploads
app.use(express.json({ limit: "15mb" }));

// Lazy initializer for Google Gen AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please add it via the Secrets panel in AI Studio.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. API to generate highly tailored, specific questions for a business
app.post("/api/generate-business-questions", async (req, res) => {
  try {
    const { name, industry, size, description } = req.body;

    if (!name || !industry) {
      res.status(400).json({ error: "שם העסק ותחום העיסוק הם שדות חובה" });
      return;
    }

    const ai = getGeminiClient();

    const textPrompt = `You are an organizational psychologist and senior HR headhunter.
Generate exactly 11 customized, clever profiling questions in HEBREW organized into 4 categories:
1. פרופיל ותעשייה (Industry & Business Model):
   - תחום פעילות מרכזי (פינטק, בריאות, פירמת רואי חשבון, וכו')
   - מודל עסקי (B2B SaaS, ייעוץ וביקורת, וכו')
   - רגולציה ותקינה (חשוב במיוחד עבור פירמות ראיית חשבון - IFRS, GAAP, ISA)
2. גודל החברה ושלב אבולוציוני (Scale & Stage):
   - גודל נוכחי (1-10, Big 4, וכו')
   - מבנה שותפות (במידה וזו פירמה)
   - קצב צמיחה צפוי (שמירה על הקיים, ליניארית, היפר-מהירה)
3. תרבות ארגונית ו-DNA (Culture & Vibe):
   - קצב עבודה (דינמי/סטארטאפיסטי או יציב/מתוכנן - תקופות "לחץ" כמו עונות הדוחות)
   - 3 ערכי ליבה (דיוק, אתיקה, חדשנות, יציבות וכו')
   - מודל עבודה (משרד, היברידי, מרחוק)
4. שוק יעד ושפה (Target Market & Language):
   - קהל יעד/שוק מרכזי (מקומי, ארה"ב, אירופה, גלובלי)
   - שפת עבודה רשמית (עברית, אנגלית, משולב)

The questions must be highly tailored to this specific company's info:
- Name: ${name}
- Industry: ${industry}
- Size: ${size || "Not specified"}
- Description: ${description || "Not specified"}

### SPECIAL INSTRUCTIONS FOR ACCOUNTING FIRMS:
If the industry is "Accounting" or "רואי חשבון", ask deep questions about:
- Audit vs. Tax vs. Advisory balance.
- Specialized niches (High-tech, Real Estate, International Tax).
- Regulatory rigor and ethical standards.
- Seasonal workload expectations.

Your response MUST be in JSON format matching the schema exactly.
Each question should have:
- id: a unique identifier
- question: the question text in professional Hebrew
- category: one of 'industry', 'scale', 'culture', 'market'
- placeholder: a helpful Hebrew suggestion
- type: 'text' or 'select' (if suitable for the question)
- options: array of options if type is 'select'

Ensure the questions sound expert and encourage the user to expand on their answers.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ text: textPrompt }],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  category: { type: Type.STRING },
                  placeholder: { type: Type.STRING },
                  type: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "question", "category", "placeholder", "type"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const jsonText = response.text?.trim() || "{}";
    res.setHeader("Content-Type", "application/json");
    res.send(jsonText);
  } catch (error: any) {
    console.error("Error generating business questions:", error);
    res.status(500).json({ error: error.message || "שגיאה ביצירת שאלות התאמה על ידי ה-AI" });
  }
});

// 2. API to synthesize the answers into a "DNA Summary" (פרופיל ה-DNA של העסק)
app.post("/api/synthesize-business-dna", async (req, res) => {
  try {
    const { name, industry, description, answers, questions } = req.body;

    if (!name || !answers) {
      res.status(400).json({ error: "שם העסק ותשובות השאלון הם שדות חובה" });
      return;
    }

    const ai = getGeminiClient();

    // Compile Q&As for the prompt
    let qAsText = "";
    if (questions && Array.isArray(questions)) {
      questions.forEach((q: any) => {
        const selectAnswer = answers[`${q.id}_select`];
        const textAnswer = answers[q.id];
        qAsText += `שאלה (${q.category}): ${q.question}\nתשובה נבחרת: ${selectAnswer || "לא נבחרה"}\nפירוט נוסף: ${textAnswer || "אין"}\n\n`;
      });
    } else {
      qAsText = JSON.stringify(answers);
    }

    const textPrompt = `You are a branding and culture HR consultant. Synthesize a powerful, rich, and deep "Company DNA Profile" (פרופיל ה-DNA של העסק) in HEBREW based on the business details and their categorical questionnaire answers.
This DNA Profile will be used by an AI Resume Screening engine to assess if candidates are a perfect fit ("כפפה ליד") for this company's atmosphere, values, and demographic setup.

Company Name: ${name}
Industry: ${industry}
Description: ${description || "None"}

Questionnaire Answers:
${qAsText}

Generate a professional summary (approx 100 words) in Hebrew that captures the core essence, scale, pace of work, work style (remote/hybrid/office), and ideal candidate "spirit". Return only a JSON containing the 'dnaSummary' field.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ text: textPrompt }],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dnaSummary: { type: Type.STRING, description: "Cohesive DNA and company culture summary in Hebrew" }
          },
          required: ["dnaSummary"]
        }
      }
    });

    const jsonText = response.text?.trim() || "{}";
    res.setHeader("Content-Type", "application/json");
    res.send(jsonText);
  } catch (error: any) {
    console.error("Error synthesizing company DNA:", error);
    res.status(500).json({ error: error.message || "שגיאה ביצירת סיכום ה-DNA של העסק" });
  }
});

// 3. API endpoint to analyze a candidate resume against job requirements AND company DNA
app.post("/api/screen", async (req, res) => {
  try {
    const { 
      jobTitle, 
      jobRequirements, 
      jobDescription, 
      rankedRequirements,
      cvText, 
      pdfBase64, 
      pdfMimeType,
      businessName,
      businessDna,
      departmentName,
      departmentDna,
      teamName,
      teamDna
    } = req.body;

    if (!jobTitle) {
      res.status(400).json({ error: "שם המשרה הוא שדה חובה" });
      return;
    }

    if (!cvText && !pdfBase64) {
      res.status(400).json({ error: "יש להזין טקסט קורות חיים או להעלות קובץ" });
      return;
    }

    const ai = getGeminiClient();

    // Prepare content parts for Gemini
    const parts: any[] = [];

    // If PDF is supplied as base64, add it as a binary part
    if (pdfBase64) {
      parts.push({
        inlineData: {
          data: pdfBase64,
          mimeType: pdfMimeType || "application/pdf"
        }
      });
    }

    // Build the prompt, injecting business DNA constraints if they exist
    let rankedReqsText = "";
    if (rankedRequirements && Array.isArray(rankedRequirements)) {
      rankedRequirements.forEach((r: any) => {
        rankedReqsText += `- [${r.importance.toUpperCase()}]: ${r.text}\n`;
      });
    }

    let textPrompt = `You are an expert HR Talent Acquisition & Recruitment Specialist. Your task is to analyze the candidate's resume (CV) attached or supplied, and evaluate how well they match the following job profile and organizational culture.

--- JOB PROFILE ---
Job Title (שם המשרה): ${jobTitle}
Job Requirements (דרישות המשרה): ${jobRequirements || "None specified."}
${rankedReqsText ? `Ranked Specific Requirements (חשיבות דרישות):\n${rankedReqsText}\n` : ""}
Job Description (תיאור המשרה): ${jobDescription || "None specified."}
`;

    if (businessName && businessDna) {
      textPrompt += `
--- COMPANY DNA & CULTURE (העסק אליו מגייסים) ---
Company Name: ${businessName}
Company DNA Profile (תרבות וסגנון העבודה בעסק): ${businessDna}
`;
    }

    if (departmentName && departmentDna) {
      textPrompt += `
--- DEPARTMENT CONTEXT (המחלקה אליה מגייסים) ---
Department: ${departmentName}
Department DNA: ${departmentDna}
`;
    }

    if (teamName && teamDna) {
      textPrompt += `
--- TEAM CONTEXT (הצוות אליו מגייסים) ---
Team: ${teamName}
Team DNA Profile: ${teamDna}
`;
    }

    if (businessDna || departmentDna || teamDna) {
      textPrompt += `
CRITICAL CORE REQUIREMENT: Your analysis MUST strictly factor in how well the candidate matches this specific Company, Department, and Team DNA. 
The user has provided specific DNA profiles that define the organizational culture. You MUST explicitly reference elements from these profiles in your summary and evaluation.

Consider:
1. Work style & DNA alignment (e.g. remote/hybrid/on-site vs candidate's background and locations).
2. Pacing, Values & Culture (e.g. startup speed, corporate structure, team vibes, department sub-culture, team-specific DNA).
3. Value alignment & demographic fit (the "כפפה ליד" or "hand-in-glove" fit).

If the candidate matches the organizational culture AND job requirements, rate them higher. If there is a cultural clash, lower the score and explain why in the summary and weaknesses.
`;
    }

    textPrompt += `
${cvText ? `Candidate Resume Text Extracted:\n${cvText}\n` : ""}

Evaluate the candidate and return your response in HEBREW.
Provide detailed analysis of strengths, weaknesses/gaps (both technical and company DNA/culture wise), a general summary, score from 1 to 100, and a strict suitability category.
Your JSON response MUST follow this schema strictly:
- name: Candidate's full name (usually starts at the top of the resume, in Hebrew or English as written in the CV)
- email: Candidate's email address (or empty string if not found)
- phone: Candidate's phone number (or empty string if not found)
- skills: Array of key developer/professional skills found in their resume (up to 8, in Hebrew or English)
- skillScores: A JSON object (Record<string, number>) where keys are 5-6 core professional/soft skill dimensions analyzed from the CV relative to this specific job (in Hebrew), and values are scores from 0 to 100. These will be used for a Radar Chart visualization.
- skillExplanations: A JSON object (Record<string, string>) with the same keys as skillScores, where each value is a short sentence explaining WHY the candidate received that score in that dimension (in Hebrew).
- suitabilityScore: Number from 1 to 100 (weighted: 55% technical/requirements fit - strictly prioritizing ranked 'MUST' requirements, 45% company DNA/culture/values fit)
- suitabilityCategory: Must be one of exactly: 'excellent', 'good', 'borderline', 'unsuitable'
- summary: A cohesive summary paragraph (פסקה אחת מסכמת). 
  IMPORTANT: This summary MUST explicitly discuss the candidate's fit with the specific Business DNA, Department DNA, and Team DNA provided above. 
  Explain HOW their background matches or clashes with the specific culture described. 
  Written in high-quality professional HR Hebrew.
- strengths: Array of 3 to 5 notable strengths of this candidate relative to the job requirements and culture, written in Hebrew
- weaknesses: Array of areas of improvement or missing requirements/cultural gaps relative to the job and culture, written in Hebrew
- recommendation: A concise HR action recommendation in Hebrew.

Please evaluate objectively. If credentials are empty or the suitability is low, provide accurate scoring. Everything should be formatted neatly as Hebrew text where requested. Do not return any other text than the valid JSON.`;

    parts.push({ text: textPrompt });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: parts,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Candidate's full name" },
            email: { type: Type.STRING, description: "Candidate's email" },
            phone: { type: Type.STRING, description: "Candidate's phone number" },
            skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key professional skills" },
            skillScores: { 
              type: Type.OBJECT, 
              additionalProperties: { type: Type.INTEGER },
              description: "Mapping of skill names to scores 0-100" 
            },
            skillExplanations: { 
              type: Type.OBJECT, 
              additionalProperties: { type: Type.STRING },
              description: "Explanations for each skill score" 
            },
            suitabilityScore: { type: Type.INTEGER, description: "Integer suitability score 1-100" },
            suitabilityCategory: { type: Type.STRING, description: "One of: 'excellent', 'good', 'borderline', 'unsuitable'" },
            summary: { type: Type.STRING, description: "Profile match summary in Hebrew" },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Highlighted strengths in Hebrew" },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Highlighted gaps/weaknesses in Hebrew" },
            recommendation: { type: Type.STRING, description: "Next step recommendation in Hebrew" }
          },
          required: ["name", "email", "phone", "skills", "skillScores", "skillExplanations", "suitabilityScore", "suitabilityCategory", "summary", "strengths", "weaknesses", "recommendation"]
        }
      }
    });

    const jsonText = response.text?.trim() || "{}";
    res.setHeader("Content-Type", "application/json");
    res.send(jsonText);
  } catch (error: any) {
    console.error("Error analyzing resume:", error);
    res.status(500).json({ error: error.message || "שגיאה בניתוח קורות החיים על ידי בינה מלאכותית" });
  }
});

// 4. Generate Customized Department Questions
app.post("/api/generate-department-questions", async (req, res) => {
  const { bizName, bizIndustry, deptName } = req.body;
  if (!bizName || !deptName) return res.status(400).json({ error: "Missing business or department info" });

  try {
    const ai = getGeminiClient();

    const textPrompt = `You are an expert organizational psychologist and HR consultant. 
Generate exactly 6-8 customized profiling questions in HEBREW for a specific DEPARTMENT within a company.

CRITICAL REQUIREMENT: Focus ONLY on the department itself (its function, its culture, its goals, its environment). 
DO NOT ask the user about their personal role, their job title, or their individual background. The questionnaire is about characterizing the department as an entity, not the individual respondent.

### SPECIAL INSTRUCTIONS FOR ACCOUNTING FIRMS:
If the business is an accounting firm, tailor questions based on the department name:
- **Audit (ביקורת)**: Focus on compliance, IFRS/GAAP, team hierarchy, and deadline management.
- **Tax (מסים)**: Focus on local/international law, complexity, and client portfolio.
- **Advisory/Transaction Services**: Focus on financial modeling, fast pace, and analytical depth.

Categories:
1. ייעוד המחלקה וסוג הפעילות (Department Function): מה המחלקה עושה ביום-יום, מהם היעדים וה-KPI המרכזיים שלה.
2. מבנה ארגוני ודינמיקה צוותית (Structure & Dynamics): גודל המחלקה, האופן שבו הצוותים משתפים פעולה, רמת ההיררכיה.
3. הסביבה המקצועית והטכנולוגית (Ecosystem): הכלים והטכנולוגיות המרכזיים (תוכנות חשבונאיות, ERP, Excel), רמת החניכה והלימוד העצמי הנדרשת.
4. תת-תרבות וממשקי עבודה (Sub-Culture): אופי העבודה (עצמאי/סינרגטי), ה"דנא" החברתי והמקצועי שמייחד את המחלקה משאר החברה.

Context:
- Company: ${bizName} (${bizIndustry})
- Department: ${deptName}

Your response MUST be in JSON format matching the schema exactly.
Each question should have:
- id: a unique identifier
- question: the question text in professional Hebrew (Ask about the department, e.g., "מהם היעדים המרכזיים של מחלקת ${deptName}?")
- category: one of 'function', 'structure', 'ecosystem', 'culture'
- placeholder: a helpful Hebrew suggestion
- type: 'select' or 'text'
- options: array of options if type is 'select'

Make the questions highly relevant to ${deptName}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: textPrompt }] }],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  category: { type: Type.STRING },
                  placeholder: { type: Type.STRING },
                  type: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "question", "category", "placeholder", "type"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const result = JSON.parse(response.text || '{"questions":[]}');
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate department questions" });
  }
});

// 4.1 Generate Team Questions
app.post("/api/generate-team-questions", async (req, res) => {
  const { bizName, deptName, teamName, deptDna } = req.body;
  if (!bizName || !deptName || !teamName) return res.status(400).json({ error: "Missing info" });

  try {
    const ai = getGeminiClient();

    const textPrompt = `You are an expert HR consultant. 
Generate 4-5 profiling questions in HEBREW for a specific TEAM within a department.

CRITICAL: Focus ONLY on the team itself. DO NOT ask about the user's role.
Context:
- Company: ${bizName}
- Department: ${deptName}
- Team: ${teamName}
- Department DNA: ${deptDna}

The questions should help differentiate this team from the rest of the department.

Return JSON with 'questions' array (id, question, category, placeholder, type, options).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: textPrompt }] }],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  category: { type: Type.STRING },
                  placeholder: { type: Type.STRING },
                  type: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "question", "category", "placeholder", "type"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const result = JSON.parse(response.text || '{"questions":[]}');
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate team questions" });
  }
});

// 5. Synthesize Department DNA Profile
app.post("/api/synthesize-department-dna", async (req, res) => {
  const { bizName, deptName, answers, questions } = req.body;
  try {
    const ai = getGeminiClient();

    let qAsText = "";
    if (questions && Array.isArray(questions)) {
      questions.forEach((q: any) => {
        let selectAnswer = answers[`${q.id}_select`];
        if (Array.isArray(selectAnswer)) {
          selectAnswer = selectAnswer.join(", ");
        }
        const textAnswer = answers[q.id];
        qAsText += `שאלה (${q.category}): ${q.question}\nתשובה נבחרת: ${selectAnswer || "לא נבחרה"}\nפירוט נוסף: ${textAnswer || "אין"}\n\n`;
      });
    }

    const textPrompt = `You are a branding consultant. Synthesize a professional "Department DNA Profile" in HEBREW.
Focus on the department's unique culture and objectives based on these answers.
DO NOT mention anything about the respondent's personal role.

Business: ${bizName}
Department: ${deptName}
Questionnaire Answers:
${qAsText}

Generate a concise summary (approx 80 words) in Hebrew capturing the team vibe, core goals, hierarchy, and tools used. Return only a JSON containing the 'dnaSummary' field.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: textPrompt }] }],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dnaSummary: { type: Type.STRING }
          },
          required: ["dnaSummary"]
        }
      }
    });

    const result = JSON.parse(response.text || '{"dnaSummary":""}');
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to synthesize department DNA" });
  }
});

// 5.1 Synthesize Team DNA Profile
app.post("/api/synthesize-team-dna", async (req, res) => {
  const { businessName, deptName, teamName, deptDna, answers, questions } = req.body;

  try {
    const ai = getGeminiClient();

    let qAsText = "";
    if (questions && Array.isArray(questions)) {
      questions.forEach((q: any) => {
        let selectAnswer = answers[`${q.id}_select`];
        if (Array.isArray(selectAnswer)) {
          selectAnswer = selectAnswer.join(", ");
        }
        const textAnswer = answers[q.id];
        qAsText += `שאלה: ${q.question}\nתשובה: ${selectAnswer || ""} ${textAnswer || ""}\n\n`;
      });
    }

    const textPrompt = `You are an expert HR consultant.
Characterize the specific TEAM DNA within a department.
Company: ${businessName}
Department: ${deptName}
Team: ${teamName}
Department context: ${deptDna}
Specific Team Answers:
${qAsText}

Generate a concise summary (approx 60 words) in Hebrew capturing the specific team vibe and unique role. 
DO NOT mention anything about the respondent's personal role.
Return only a JSON containing the 'dnaSummary' field.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: textPrompt }] }],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dnaSummary: { type: Type.STRING }
          },
          required: ["dnaSummary"]
        }
      }
    });

    const result = JSON.parse(response.text || '{"dnaSummary":""}');
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to synthesize team DNA" });
  }
});

// 6. Analyze Job Description (extract explicit and implicit requirements)
app.post("/api/analyze-job-jd", async (req, res) => {
  const { jdText, bizName, bizIndustry, bizDna, deptName, deptDna, teamName, teamDna } = req.body;
  
  if (!jdText) return res.status(400).json({ error: "Missing Job Description text" });

  try {
    const ai = getGeminiClient();

    const isLazySetup = !bizName;

    const textPrompt = `You are an expert AI HR Recruiter and Systems Analyst. Your job is to analyze a public Job Description and cross-reference it with the provided Company Profile, Department Profile, and Team Profile.

Your goal is to extract the explicit requirements and, more importantly, infer the implicit (hidden) requirements that are not written in the job description but are critical for success based on the organization's context.

${isLazySetup ? "CRITICAL: The user is starting from the JOB without providing business/department context yet. Focus deeply on the JOB itself and try to infer the likely industry standards and technical depth required for this specific role title and description." : ""}

### INPUTS:
1. Company Profile:
Name: ${bizName || "Not provided (Lazy Setup)"}
Industry: ${bizIndustry || "Not provided"}
DNA Summary: ${bizDna || "Not provided"}

2. Department Profile:
Department Name: ${deptName || "Not provided"}
Department DNA: ${deptDna || "Not provided"}

3. Team Profile:
Team Name: ${teamName || "N/A"}
Team DNA: ${teamDna || "N/A"}

4. Public Job Description:
${jdText}

### LOGICAL RULES FOR INFERENCE:
1. Industry Fit: If the company is in a highly regulated or large-scale industry (e.g., Insurance, Banking, Accounting/Big 4, Cyber, Fintech), infer that the candidate needs experience in Enterprise environments, regulated workflows, or specific compliance standards (IFRS, ISA, Tax laws).
2. Professional Standards: For accounting firms, infer requirements for specific certification status (CPA/רו"ח), and familiarity with accounting software (SAP, Oracle, priority) or audit tools.
3. Pace & Soft Skills: If the department/company has a high growth rate, fast pace, or lacks a structured onboarding process (e.g. "Startup speed" or "Busy season" in audit), infer requirements like "Self-starter", "Thriving in ambiguity", "High independence", or "Ability to work under extreme pressure".
4. Technical Ecosystem: If the department uses specific tools (e.g. SQL, Salesforce, Audit software, PowerBI) and the job description asks for general skills, infer the specific tools used by the department as a high preference.

### OUTPUT SCHEMA (JSON):
Return ONLY a valid JSON object with the following structure:
{
  "extractedTitle": "Professional title derived from JD",
  "explicit_requirements": {
    "experience_years": "string or number",
    "mandatory_skills": ["array of strings"],
    "education": "string or null"
  },
  "implicit_requirements": {
    "industry_background_preferred": "string describing the preferred company types",
    "soft_skills_and_culture_fit": ["array of inferred soft skills"],
    "technical_tools_inferred": ["array of specific tools inferred from dept context"]
  },
  "reasoning_summary": "Short brief in English about the logic",
  "combinedHebrewList": "A cohesive, professional bulleted list in HEBREW combining ALL requirements (explicit and implicit) for use in screening.",
  "requirementsForRanking": ["List of individual strings in HEBREW for the user to rank importance (e.g., '3 שנות ניסיון בפיתוח', 'היכרות עם SQL')"]
}
Do not include any markdown formatting (like \`\`\`json) or conversational text.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: textPrompt }] }],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedTitle: { type: Type.STRING },
            explicit_requirements: {
              type: Type.OBJECT,
              properties: {
                experience_years: { type: Type.STRING },
                mandatory_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                education: { type: Type.STRING }
              }
            },
            implicit_requirements: {
              type: Type.OBJECT,
              properties: {
                industry_background_preferred: { type: Type.STRING },
                soft_skills_and_culture_fit: { type: Type.ARRAY, items: { type: Type.STRING } },
                technical_tools_inferred: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            reasoning_summary: { type: Type.STRING },
            combinedHebrewList: { type: Type.STRING },
            requirementsForRanking: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["extractedTitle", "combinedHebrewList", "requirementsForRanking"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to analyze job requirements" });
  }
});

// 7. Generate Calibration Case Studies
app.post("/api/generate-case-studies", async (req, res) => {
  const { jobTitle, jobRequirements, bizDna, deptDna } = req.body;
  
  try {
    const ai = getGeminiClient();

    const textPrompt = `You are a recruitment expert. Generate exactly 2 "Case Studies" to calibrate a recruiter's preferences for a specific role.
    Each case study must present a scenario and 3 fictitious candidates with distinct profiles (e.g., one highly technical but junior, one senior but from a different industry, one with great soft skills but fewer years of experience).

    Job Title: ${jobTitle}
    Job Requirements: ${jobRequirements}
    Business DNA: ${bizDna || "N/A"}
    Department DNA: ${deptDna || "N/A"}

    Return your response in HEBREW and in JSON format.
    Each case study should have:
    - id: unique string
    - scenarioDescription: A short paragraph describing the specific team context or a challenge they are facing.
    - candidates: Array of 3 objects, each with:
        - id: unique string
        - name: fictitious name
        - profileSummary: A paragraph describing their background.
        - keySkills: Array of skills.
        - personalityTraits: Array of traits.

    The profiles should be realistic and represent difficult choices for a recruiter.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: textPrompt }] }],
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            caseStudies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  scenarioDescription: { type: Type.STRING },
                  candidates: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        profileSummary: { type: Type.STRING },
                        keySkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                        personalityTraits: { type: Type.ARRAY, items: { type: Type.STRING } }
                      },
                      required: ["id", "name", "profileSummary", "keySkills", "personalityTraits"]
                    }
                  }
                },
                required: ["id", "scenarioDescription", "candidates"]
              }
            }
          },
          required: ["caseStudies"]
        }
      }
    });

    const result = JSON.parse(response.text || '{"caseStudies":[]}');
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate case studies" });
  }
});

// Setup Vite Dev Server / Static Asset Hosting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
