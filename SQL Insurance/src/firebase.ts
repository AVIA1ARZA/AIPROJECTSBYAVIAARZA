import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp, 
  doc, 
  getDocFromServer, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the database ID from metadata if not in config
const firestoreDatabaseId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-0d2fcc81-249a-476e-96a7-c67679a2c8e3';
export const db = getFirestore(app, firestoreDatabaseId);

// Enable persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn('Firestore persistence failed-precondition');
    } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn('Firestore persistence unimplemented');
    }
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/documents');

let cachedAccessToken: string | null = null;

// Auth helpers
export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  cachedAccessToken = credential?.accessToken || null;
  return result;
};

export const getAccessToken = () => cachedAccessToken;

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Clear token on auth state change if user is logged out
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
  }
});

// Firestore Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const isOffline = error instanceof Error && (error.message.includes('the client is offline') || (error as any).code === 'unavailable');
  
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  if (isOffline) {
    console.warn(`Firestore Offline Status during ${operationType} on ${path}: `, errInfo.error);
    // Don't throw for offline errors, just log them. This allows the app to continue using cache.
    return;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface CustomColumn {
  table: string;
  name: string;
  type: string;
  description: string;
}

export interface UserQuestion {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  correctSql: string;
  timestamp: Date;
  insights?: {
    roleHint: string;
    departmentHint: string;
    difficultyHint: string;
  };
}

export interface CompletedQuestion {
  id: string;
  questionId: string;
  questionTitle: string;
  questionDescription: string;
  difficulty: string;
  correctSql: string;
  userSql: string;
  score: number;
  isCorrect: boolean;
  explanation: string;
  timestamp: Date;
  userId: string;
  role: string | null;
  department: string | null;
  chatHistory?: { role: 'user' | 'model'; content: string }[];
  chatSummary?: string;
}

export interface DBVersion {
  id: string;
  name: string;
  description: string;
  tables: any[];
  createdAt: string;
  explanation?: string;
}

export interface DBModel {
  id: string;
  name: string;
  description: string;
  tables: any[];
  isDeleted?: boolean;
  versionGroupId?: string; // To group versions of the same schema
  history?: DBVersion[];
}

export interface UserProfile {
  department: string;
  role: string;
  setupCompleted: boolean;
  updatedAt: Date;
  customSchema?: CustomColumn[];
  customDatabases?: DBModel[];
  activeSchemaId?: string;
}

export const saveUserProfile = async (userId: string, profile: Partial<UserProfile>) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...profile,
      updatedAt: Timestamp.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
};

export const saveUserQuestion = async (userId: string, question: any) => {
  try {
    await addDoc(collection(db, 'user_questions'), {
      userId,
      ...question,
      timestamp: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'user_questions');
  }
};

export const saveOrUpdateBestAttempt = async (userId: string, data: Partial<CompletedQuestion>): Promise<string> => {
  try {
    const q = query(
      collection(db, 'completed_questions'),
      where('userId', '==', userId),
      where('questionId', '==', data.questionId)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      // Record exists, find the one with highest score (though theoretically only one should exist if this is used consistently)
      let bestDoc = snapshot.docs[0];
      const existingData = bestDoc.data() as CompletedQuestion;

      if (data.score !== undefined && data.score > existingData.score) {
        // New score is better, update
        const docRef = doc(db, 'completed_questions', bestDoc.id);
        await setDoc(docRef, {
          ...data,
          timestamp: Timestamp.now()
        }, { merge: true });
        return bestDoc.id;
      } else {
        // Existing is already better or equal, do not update but return ID
        return bestDoc.id;
      }
    } else {
      // No existing record, create new one
      const docRef = await addDoc(collection(db, 'completed_questions'), {
        userId,
        ...data,
        timestamp: Timestamp.now()
      });
      return docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'completed_questions');
    throw error;
  }
};

export const saveSpecificSessionAttempt = async (userId: string, sessionDocId: string | null, data: Partial<CompletedQuestion>): Promise<string> => {
  try {
    if (sessionDocId) {
      const docRef = doc(db, 'completed_questions', sessionDocId);
      await setDoc(docRef, {
        ...data,
        timestamp: Timestamp.now()
      }, { merge: true });
      return sessionDocId;
    } else {
      const docRef = await addDoc(collection(db, 'completed_questions'), {
        userId,
        ...data,
        timestamp: Timestamp.now()
      });
      return docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'completed_questions');
    throw error;
  }
};

export const updateCompletedQuestion = async (submissionId: string, updates: Partial<CompletedQuestion>) => {
  try {
    const docRef = doc(db, 'completed_questions', submissionId);
    await setDoc(docRef, updates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `completed_questions/${submissionId}`);
  }
};
export const getUserQuestions = async (userId: string): Promise<any> => {
  try {
    // הניתוב החכם למצב אורח
    const targetUid = userId === 'guest-mode' ? 'vvYYxgC6UMO3uUPbt2qvpDJx9f92' : userId;

    // שאילתה ללא orderBy בפיירבייס כדי למנוע שגיאות אינדקס בענן
    const q = query(
      collection(db, 'completed_questions'),
      where('userId', '==', targetUid)
    );

    const querySnapshot = await getDocs(q);
    
    // שומרים את התוצאות לתוך המשתנה שהפונקציה צריכה בהמשך
    const questions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort in memory by timestamp descending to bypass Firestore composite index requirements
    return questions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'user_questions');
    return [];
  }
};
;

export const getCompletedQuestions = async (userId: string): Promise<CompletedQuestion[]> => {
  try {
    const q = query(
      collection(db, 'completed_questions'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const completed = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate() || new Date()
      } as CompletedQuestion;
    });
    // Sort in memory by timestamp descending to bypass Firestore composite index requirements
    return completed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'completed_questions');
    return [];
  }
};

export interface PerformanceAnalysisData {
  strengths: string[];
  weaknesses: string[];
  recommendations: string;
  suggestedTopics: string[];
  updatedAt: Date;
}

export const savePerformanceAnalysis = async (userId: string, analysis: any) => {
  try {
    const analysisRef = doc(db, 'performance_analysis', userId);
    await setDoc(analysisRef, {
      ...analysis,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `performance_analysis/${userId}`);
  }
};

export const getPerformanceAnalysis = async (userId: string): Promise<PerformanceAnalysisData | null> => {
  try {
    const analysisRef = doc(db, 'performance_analysis', userId);
    const docSnap = await getDoc(analysisRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as PerformanceAnalysisData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `performance_analysis/${userId}`);
    return null;
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null | 'error'> => {
  try {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    return 'error';
  }
};

export interface SavedTip {
  id: string;
  userId: string;
  text: string;
  category: string;
  savedAt: Date;
  highlightedLines?: string[];
  sourceId?: string;
  sourceTitle?: string;
  sourceType?: string;
}

export const saveTip = async (userId: string, text: string, category: string, sourceId?: string, sourceTitle?: string, sourceType?: string): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'saved_tips'), {
      userId,
      text,
      category,
      sourceId: sourceId || null,
      sourceTitle: sourceTitle || null,
      sourceType: sourceType || null,
      savedAt: Timestamp.now(),
      highlightedLines: []
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'saved_tips');
    throw error;
  }
};

export const deleteSavedTip = async (docId: string) => {
  try {
    const docRef = doc(db, 'saved_tips', docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `saved_tips/${docId}`);
  }
};

export const updateSavedTip = async (docId: string, updates: Partial<SavedTip>) => {
  try {
    const docRef = doc(db, 'saved_tips', docId);
    await setDoc(docRef, updates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `saved_tips/${docId}`);
  }
};

export const getSavedTips = async (userId: string): Promise<SavedTip[]> => {
  try {
    const q = query(
      collection(db, 'saved_tips'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const tips = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        text: data.text,
        category: data.category,
        sourceId: data.sourceId,
        sourceTitle: data.sourceTitle,
        sourceType: data.sourceType,
        savedAt: data.savedAt?.toDate() || new Date(),
        highlightedLines: data.highlightedLines || []
      };
    });
    // Sort in memory by savedAt descending to bypass Firestore composite index requirements
    return tips.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'saved_tips');
    return [];
  }
};

export interface DailyExercises {
  id?: string;
  userId: string;
  date: string;
  weaknesses: string[];
  exercises: any[];
  completedIds: string[];
  updatedAt: Date;
}

export const saveDailyExercises = async (userId: string, dateStr: string, weaknesses: string[], exercises: any[]): Promise<void> => {
  try {
    const docId = `${userId}_${dateStr}`;
    const docRef = doc(db, 'daily_exercises', docId);
    await setDoc(docRef, {
      userId,
      date: dateStr,
      weaknesses,
      exercises,
      completedIds: [],
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `daily_exercises/${userId}_${dateStr}`);
  }
};

export const getDailyExercises = async (userId: string, dateStr: string): Promise<DailyExercises | null> => {
  try {
    const docId = `${userId}_${dateStr}`;
    const docRef = doc(db, 'daily_exercises', docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        date: data.date,
        weaknesses: data.weaknesses || [],
        exercises: data.exercises || [],
        completedIds: data.completedIds || [],
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as DailyExercises;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `daily_exercises/${userId}_${dateStr}`);
    return null;
  }
};

export const markDailyExerciseCompleted = async (userId: string, dateStr: string, exerciseId: string): Promise<void> => {
  try {
    const docId = `${userId}_${dateStr}`;
    const docRef = doc(db, 'daily_exercises', docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const completedIds = data.completedIds || [];
      if (!completedIds.includes(exerciseId)) {
        await setDoc(docRef, {
          completedIds: [...completedIds, exerciseId],
          updatedAt: Timestamp.now()
        }, { merge: true });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `daily_exercises/${userId}_${dateStr}`);
  }
};

// Connection test
// async function testConnection() {
//   try {
//     await getDocFromServer(doc(db, 'test', 'connection'));
//   } catch (error) {
//     if (error instanceof Error && error.message.includes('the client is offline')) {
//       console.error("Please check your Firebase configuration.");
//     }
//   }
// }
// testConnection();
