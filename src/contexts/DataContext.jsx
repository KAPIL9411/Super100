import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  saveExamAttempt,
  getExamAttempts,
  syncBookmarks,
  getBookmarks,
  saveCustomSheets,
  getCustomSheets,
  saveActiveTest,
  getActiveTest,
  clearActiveTest,
  saveIssueReport,
  deleteDocFromCollection,
  deleteAllDocsInCollection,
  saveMockPlan,
  getMockPlans,
  deleteMockPlan,
  updateMockPlanStatus,
} from '../firebase/db';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  
  // SINGLE SOURCE OF TRUTH: Only store attempts
  const [examAttempts, setExamAttempts] = useState([]);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState([]);
  const [customSheets, setCustomSheets] = useState([]);
  const [mockPlans, setMockPlans] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  
  const syncTimer = useRef(null);
  const bookmarksRef = useRef(bookmarkedQuestions);
  bookmarksRef.current = bookmarkedQuestions;

  useEffect(() => {
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, []);

  // EFFICIENT LOAD: Single read from Firestore
  const loadAllData = useCallback(async () => {
    if (!user) return;
    
    console.log('Loading user data...');
    setDataLoading(true);
    
    try {
      // Load from localStorage first (instant)
      const cachedData = {
        attempts: JSON.parse(localStorage.getItem(`examAttempts_${user.uid}`) || '[]'),
        bookmarks: JSON.parse(localStorage.getItem(`bookmarks_${user.uid}`) || '[]'),
        custom: JSON.parse(localStorage.getItem(`customSheets_${user.uid}`) || '[]'),
        plans: JSON.parse(localStorage.getItem(`mockPlans_${user.uid}`) || '[]'),
      };
      
      // Set cached data immediately for instant UI
      setExamAttempts(cachedData.attempts);
      setBookmarkedQuestions(cachedData.bookmarks);
      setCustomSheets(cachedData.custom);
      setMockPlans(cachedData.plans);
      
      // Sync from Firestore in background (4 reads total)
      const [attempts, bookmarks, custom, plans] = await Promise.all([
        getExamAttempts(user.uid),
        getBookmarks(user.uid),
        getCustomSheets(user.uid),
        getMockPlans(user.uid),
      ]);
      
      // Update with fresh data
      setExamAttempts(attempts || []);
      setBookmarkedQuestions(bookmarks || []);
      setCustomSheets(custom || []);
      setMockPlans(plans || []);
      
      // Update cache
      localStorage.setItem(`examAttempts_${user.uid}`, JSON.stringify(attempts || []));
      localStorage.setItem(`bookmarks_${user.uid}`, JSON.stringify(bookmarks || []));
      localStorage.setItem(`customSheets_${user.uid}`, JSON.stringify(custom || []));
      localStorage.setItem(`mockPlans_${user.uid}`, JSON.stringify(plans || []));
      
      console.log(`Data loaded: ${attempts?.length || 0} attempts`);
    } catch (e) {
      console.error('Data load error:', e);
    }
    setDataLoading(false);
  }, [user]);

  const safeFirestore = useCallback(async (fn) => {
    try {
      await fn();
    } catch (e) {
      console.error('Firestore error:', e);
    }
  }, []);

  // DERIVED DATA: Calculate stats from attempts (no storage needed)
  const getSheetHistory = useCallback((sheetId) => {
    const sheetAttempts = examAttempts.filter(a => a.sheetId === sheetId);
    if (sheetAttempts.length === 0) return null;
    
    // Return best attempt
    return sheetAttempts.reduce((best, current) => 
      (current.score > best.score) ? current : best
    );
  }, [examAttempts]);

  const getOverallStats = useCallback(() => {
    if (examAttempts.length === 0) {
      return { avgAccuracy: 0, bestScore: 0, completedTests: 0, totalAttempts: 0 };
    }
    
    // Get unique sheets (count as completed tests)
    const uniqueSheets = new Set(examAttempts.map(a => a.sheetId));
    
    // Calculate from all attempts
    const totalAccuracy = examAttempts.reduce((sum, a) => sum + (a.accuracy || 0), 0);
    const avgAccuracy = Math.round(totalAccuracy / examAttempts.length);
    const bestScore = Math.max(...examAttempts.map(a => a.score || 0));
    
    return {
      avgAccuracy,
      bestScore,
      completedTests: uniqueSheets.size,
      totalAttempts: examAttempts.length
    };
  }, [examAttempts]);

  // OPTIMISTIC UPDATE: Update UI immediately, sync in background
  const addExamAttempt = useCallback((attemptId, data) => {
    const newAttempt = { id: attemptId, ...data };
    const updated = [newAttempt, ...examAttempts];
    
    // Update state immediately (instant UI feedback)
    setExamAttempts(updated);
    
    // Update localStorage (instant persistence)
    if (user) {
      localStorage.setItem(`examAttempts_${user.uid}`, JSON.stringify(updated));
    }
    
    // Sync to Firestore in background (1 write)
    if (user) safeFirestore(() => saveExamAttempt(user.uid, attemptId, data));
  }, [user, safeFirestore, examAttempts]);

  const toggleBookmark = useCallback((sheetId, sheetTitle, question) => {
    let updated;
    const exists = bookmarkedQuestions.some((b) => b.question.id === question.id);
    updated = exists
      ? bookmarkedQuestions.filter((b) => b.question.id !== question.id)
      : [...bookmarkedQuestions, { sheetId, sheetTitle, question }];
    
    setBookmarkedQuestions(updated);
    
    // Update localStorage immediately
    if (user) {
      localStorage.setItem(`bookmarks_${user.uid}`, JSON.stringify(updated));
    }
    
    // Debounced Firestore sync (batch writes)
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      if (user && updated) safeFirestore(() => syncBookmarks(user.uid, updated));
    }, 5000);
  }, [user, safeFirestore, bookmarkedQuestions]);

  const isBookmarked = useCallback((qId) => {
    return bookmarksRef.current.some((b) => b.question.id === qId);
  }, []);

  const updateCustomSheets = useCallback((sheets) => {
    setCustomSheets(sheets);
    
    if (user) {
      localStorage.setItem(`customSheets_${user.uid}`, JSON.stringify(sheets));
      safeFirestore(() => saveCustomSheets(user.uid, sheets));
    }
  }, [user, safeFirestore]);

  const addIssueReport = useCallback((report) => {
    if (user) safeFirestore(() => saveIssueReport(user.uid, report));
  }, [user, safeFirestore]);

  const persistActiveTest = useCallback((testState) => {
    if (user && testState) safeFirestore(() => saveActiveTest(user.uid, testState));
  }, [user, safeFirestore]);

  const fetchActiveTest = useCallback(async () => {
    if (!user) return null;
    try {
      return await getActiveTest(user.uid);
    } catch (e) {
      console.error('Firestore read error:', e);
      return null;
    }
  }, [user]);

  const removeActiveTest = useCallback(() => {
    if (user) safeFirestore(() => clearActiveTest(user.uid));
  }, [user, safeFirestore]);

  const deleteAttempt = useCallback(async (attemptId) => {
    if (!user) return;
    
    // Update UI immediately
    const updated = examAttempts.filter((a) => a.id !== attemptId);
    setExamAttempts(updated);
    localStorage.setItem(`examAttempts_${user.uid}`, JSON.stringify(updated));
    
    // Delete from Firestore
    await safeFirestore(() => deleteDocFromCollection(user.uid, 'examAttempts', attemptId));
  }, [user, safeFirestore, examAttempts]);

  const clearAllHistory = useCallback(async () => {
    if (!user) return;
    
    // Update UI immediately
    setExamAttempts([]);
    localStorage.setItem(`examAttempts_${user.uid}`, JSON.stringify([]));
    
    // Clear Firestore
    await safeFirestore(() => deleteAllDocsInCollection(user.uid, 'examAttempts'));
  }, [user, safeFirestore]);

  const addMockPlan = useCallback(async (plan) => {
    if (!user) return;
    try {
      const planId = await saveMockPlan(user.uid, plan);
      const newPlan = { ...plan, id: planId };
      const updated = [...mockPlans, newPlan];
      setMockPlans(updated);
      localStorage.setItem(`mockPlans_${user.uid}`, JSON.stringify(updated));
      return planId;
    } catch (error) {
      console.error('Error adding mock plan:', error);
      throw error;
    }
  }, [user, mockPlans]);

  const removeMockPlan = useCallback(async (planId) => {
    if (!user) return;
    const updated = mockPlans.filter((p) => p.id !== planId);
    setMockPlans(updated);
    localStorage.setItem(`mockPlans_${user.uid}`, JSON.stringify(updated));
    await safeFirestore(() => deleteMockPlan(user.uid, planId));
  }, [user, safeFirestore, mockPlans]);

  const updatePlanStatus = useCallback(async (planId, status) => {
    if (!user) return;
    const updated = mockPlans.map((p) => p.id === planId ? { ...p, status } : p);
    setMockPlans(updated);
    localStorage.setItem(`mockPlans_${user.uid}`, JSON.stringify(updated));
    await safeFirestore(() => updateMockPlanStatus(user.uid, planId, status));
  }, [user, safeFirestore, mockPlans]);

  return (
    <DataContext.Provider value={{
      examAttempts,
      bookmarkedQuestions,
      customSheets,
      mockPlans,
      dataLoading,
      loadAllData,
      getSheetHistory,
      getOverallStats,
      addExamAttempt,
      toggleBookmark,
      isBookmarked,
      updateCustomSheets,
      addIssueReport,
      persistActiveTest,
      fetchActiveTest,
      removeActiveTest,
      deleteAttempt,
      clearAllHistory,
      addMockPlan,
      removeMockPlan,
      updatePlanStatus,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
