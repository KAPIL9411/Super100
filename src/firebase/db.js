import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

function convertTimestamps(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj instanceof Timestamp) return obj.toDate().toISOString();
  if (Array.isArray(obj)) return obj.map(convertTimestamps);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate().toISOString();
    } else if (typeof value === 'object' && value !== null) {
      result[key] = convertTimestamps(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const usersCol = (uid) => doc(db, 'users', uid);
const examHistoryCol = (uid) => collection(db, 'users', uid, 'examHistory');
const examHistoryDoc = (uid, sheetId) => doc(db, 'users', uid, 'examHistory', sheetId);
const examAttemptsCol = (uid) => collection(db, 'users', uid, 'examAttempts');
const examAttemptDoc = (uid, attemptId) => doc(db, 'users', uid, 'examAttempts', attemptId);
const bookmarksCol = (uid) => collection(db, 'users', uid, 'bookmarkedQuestions');
const bookmarkDoc = (uid, qId) => doc(db, 'users', uid, 'bookmarkedQuestions', String(qId));
const customSheetsCol = (uid) => collection(db, 'users', uid, 'customSheets');
const customSheetDoc = (uid, sheetId) => doc(db, 'users', uid, 'customSheets', sheetId);
const issueReportsCol = (uid) => collection(db, 'users', uid, 'issueReports');

export const createUserProfile = async (uid, data) => {
  // OPTIMIZED: Use ISO strings instead of serverTimestamp
  await setDoc(usersCol(uid), {
    ...data,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    isAdmin: false,
  });
};

export const updateUserProfile = async (uid, data) => {
  // OPTIMIZED: Use ISO string instead of serverTimestamp
  await updateDoc(usersCol(uid), { ...data, lastLoginAt: new Date().toISOString() });
};

export const getUserProfile = async (uid) => {
  const snap = await getDoc(usersCol(uid));
  return snap.exists() ? convertTimestamps(snap.data()) : null;
};

export const saveExamHistory = async (uid, sheetId, data) => {
  // OPTIMIZED: Use ISO string instead of serverTimestamp to save 1 write per call
  await setDoc(examHistoryDoc(uid, sheetId), {
    ...data,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
};

export const getExamHistory = async (uid) => {
  const q = query(examHistoryCol(uid));
  const snap = await getDocs(q);
  const result = {};
  snap.forEach((d) => { result[d.id] = convertTimestamps(d.data()); });
  return result;
};

export const saveExamAttempt = async (uid, attemptId, data) => {
  // OPTIMIZED: Use ISO string instead of serverTimestamp
  await setDoc(examAttemptDoc(uid, attemptId), {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
    savedAt: new Date().toISOString(),
  });
};

export const getExamAttempts = async (uid) => {
  const q = query(examAttemptsCol(uid), orderBy('savedAt', 'desc'), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertTimestamps({ id: d.id, ...d.data() }));
};

export const syncBookmarks = async (uid, bookmarks) => {
  // OPTIMIZED: Only write/delete changed bookmarks, not all of them
  const existingSnap = await getDocs(bookmarksCol(uid));
  const existingIds = new Set(existingSnap.docs.map(d => d.id));
  const newIds = new Set(bookmarks.map(b => String(b.question.id)));
  
  const batch = writeBatch(db);
  let writeCount = 0;
  
  // Delete removed bookmarks
  existingSnap.forEach((d) => {
    if (!newIds.has(d.id)) {
      batch.delete(d.ref);
      writeCount++;
    }
  });
  
  // Add new bookmarks only
  bookmarks.forEach((b) => {
    const id = String(b.question.id);
    if (!existingIds.has(id)) {
      const ref = bookmarkDoc(uid, b.question.id);
      batch.set(ref, {
        sheetId: b.sheetId,
        sheetTitle: b.sheetTitle,
        question: b.question,
        // Remove serverTimestamp to save writes
        createdAt: new Date().toISOString(),
      });
      writeCount++;
    }
  });
  
  if (writeCount > 0) {
    await batch.commit();
  }
  
  console.log(`Bookmark sync: ${writeCount} writes (optimized)`);
};

export const getBookmarks = async (uid) => {
  const snap = await getDocs(bookmarksCol(uid));
  return snap.docs.map((d) => convertTimestamps(d.data()));
};

export const saveCustomSheets = async (uid, sheets) => {
  // OPTIMIZED: Only write changed sheets, not all of them
  const existingSnap = await getDocs(customSheetsCol(uid));
  const existingMap = new Map(existingSnap.docs.map(d => [d.id, d.data()]));
  const newIds = new Set(sheets.map(s => s.id));
  
  const batch = writeBatch(db);
  let writeCount = 0;
  
  // Delete removed sheets
  existingSnap.forEach((d) => {
    if (!newIds.has(d.id)) {
      batch.delete(d.ref);
      writeCount++;
    }
  });
  
  // Add or update changed sheets only
  sheets.forEach((s) => {
    const existing = existingMap.get(s.id);
    const hasChanged = !existing || JSON.stringify(existing) !== JSON.stringify(s);
    
    if (hasChanged) {
      const ref = customSheetDoc(uid, s.id);
      batch.set(ref, { 
        ...s, 
        updatedAt: new Date().toISOString() // Use ISO string instead of serverTimestamp
      });
      writeCount++;
    }
  });
  
  if (writeCount > 0) {
    await batch.commit();
  }
  
  console.log(`Custom sheets sync: ${writeCount} writes (optimized)`);
};

export const getCustomSheets = async (uid) => {
  const snap = await getDocs(customSheetsCol(uid));
  return snap.docs.map((d) => convertTimestamps(d.data()));
};

export const saveIssueReport = async (uid, report) => {
  // OPTIMIZED: Use ISO string instead of serverTimestamp
  const ref = doc(issueReportsCol(uid));
  await setDoc(ref, { ...report, createdAt: new Date().toISOString() });
};

export const saveActiveTest = async (uid, testState) => {
  // OPTIMIZED: Use ISO string instead of serverTimestamp
  await setDoc(doc(db, 'users', uid, 'activeTest', 'current'), {
    ...testState,
    updatedAt: new Date().toISOString(),
  });
};

export const getActiveTest = async (uid) => {
  const ref = doc(db, 'users', uid, 'activeTest', 'current');
  const snap = await getDoc(ref);
  return snap.exists() ? convertTimestamps(snap.data()) : null;
};

export const clearActiveTest = async (uid) => {
  await deleteDoc(doc(db, 'users', uid, 'activeTest', 'current'));
};

export const deleteDocFromCollection = async (uid, subcollection, docId) => {
  await deleteDoc(doc(db, 'users', uid, subcollection, docId));
};

export const deleteAllDocsInCollection = async (uid, subcollection) => {
  const snap = await getDocs(collection(db, 'users', uid, subcollection));
  const batch = writeBatch(db);
  snap.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};

// ==========================================
// ADMIN FUNCTIONS - Get all users data
// ==========================================

export const getAllUsers = async () => {
  const usersCollection = collection(db, 'users');
  const snap = await getDocs(usersCollection);
  return snap.docs.map((d) => convertTimestamps({ uid: d.id, ...d.data() }));
};

export const getAllUserAttempts = async (uid) => {
  const q = query(examAttemptsCol(uid), orderBy('savedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertTimestamps({ id: d.id, ...d.data() }));
};

export const getUserStats = async (uid) => {
  try {
    const [profile, attempts, history] = await Promise.all([
      getUserProfile(uid),
      getAllUserAttempts(uid),
      getExamHistory(uid)
    ]);
    
    // Calculate average percentage score correctly
    let averageScore = 0;
    if (attempts.length > 0) {
      const totalPercentage = attempts.reduce((sum, a) => {
        // Calculate percentage: (score / maxMarks) * 100
        const percentage = a.maxMarks > 0 ? (a.score / a.maxMarks) * 100 : 0;
        return sum + percentage;
      }, 0);
      averageScore = (totalPercentage / attempts.length).toFixed(2);
    }
    
    return {
      profile,
      attempts,
      history,
      totalAttempts: attempts.length,
      averageScore
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
};

// ==========================================
// MOCK PLANNER FUNCTIONS
// ==========================================

const mockPlannerCol = (uid) => collection(db, 'users', uid, 'mockPlanner');
const mockPlanDoc = (uid, planId) => doc(db, 'users', uid, 'mockPlanner', planId);

export const saveMockPlan = async (uid, plan) => {
  // OPTIMIZED: Use ISO strings instead of serverTimestamp
  const planId = plan.id || `plan_${Date.now()}`;
  await setDoc(mockPlanDoc(uid, planId), {
    ...plan,
    id: planId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, { merge: true });
  return planId;
};

export const getMockPlans = async (uid) => {
  const snap = await getDocs(mockPlannerCol(uid));
  return snap.docs.map((d) => convertTimestamps({ id: d.id, ...d.data() }));
};

export const deleteMockPlan = async (uid, planId) => {
  await deleteDoc(mockPlanDoc(uid, planId));
};

export const updateMockPlanStatus = async (uid, planId, status) => {
  // OPTIMIZED: Use ISO strings instead of serverTimestamp
  await updateDoc(mockPlanDoc(uid, planId), {
    status,
    completedAt: status === 'completed' ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString()
  });
};
