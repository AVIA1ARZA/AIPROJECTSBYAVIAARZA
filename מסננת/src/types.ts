export interface BusinessQuestion {
  id: string;
  question: string;
  category: "industry" | "scale" | "culture" | "market";
  type: "text" | "select" | "multi-select";
  options?: string[];
  placeholder: string;
}

export interface Business {
  id: string;
  name: string;
  industry: string;
  location: string;
  size: string;
  description: string;
  questions: BusinessQuestion[];
  answers: Record<string, string>;
  dnaSummary?: string;
  createdAt: string;
}

export interface Department {
  id: string;
  businessId: string;
  name: string;
  questions?: BusinessQuestion[]; // Reusing BusinessQuestion interface for department questions
  answers?: Record<string, string>;
  dnaSummary?: string;
  createdAt: string;
}

export interface Team {
  id: string;
  businessId: string;
  departmentId: string;
  name: string;
  dnaSummary?: string;
  createdAt: string;
}

export interface RankedRequirement {
  id: string;
  text: string;
  importance: 'must' | 'important' | 'nice_to_have';
}

export interface FictitiousCandidate {
  id: string;
  name: string;
  profileSummary: string;
  keySkills: string[];
  personalityTraits: string[];
}

export interface CaseStudy {
  id: string;
  scenarioDescription: string;
  candidates: FictitiousCandidate[];
}

export interface CaseStudyPreference {
  caseStudyId: string;
  ranking: string[]; // IDs of candidates in order of preference
  explanation: string;
}

export interface Job {
  id: string;
  businessId?: string;
  departmentId?: string;
  teamId?: string;
  departmentName?: string; // cached
  teamName?: string; // cached
  title: string;
  location: string;
  description: string;
  requirements: string;
  rankedRequirements?: RankedRequirement[];
  calibrationPreferences?: CaseStudyPreference[];
  createdAt: string;
}

export type SuitabilityCategory = 'excellent' | 'good' | 'borderline' | 'unsuitable';

export type CandidateStatus = 'new' | 'interview_pending' | 'interviewed' | 'rejected' | 'hired';

export interface CandidateEvaluation {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  skillScores?: Record<string, number>; // New field for Radar Chart
  skillExplanations?: Record<string, string>; // Explanations for each skill score
  suitabilityScore: number; // 1-100
  suitabilityCategory: SuitabilityCategory;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  action: string;
  note?: string;
  user?: string;
  reminderDate?: string;
  isCompleted?: boolean;
  strengths?: string;
  weaknesses?: string;
}

export interface Candidate extends CandidateEvaluation {
  id: string;
  jobId: string;
  status: CandidateStatus;
  appliedAt: string;
  fileName?: string;
  cvText?: string;
  pdfBase64?: string;
  pdfMimeType?: string;
  activityLog?: ActivityLogEntry[];
}
