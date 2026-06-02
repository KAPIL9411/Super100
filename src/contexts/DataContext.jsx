import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  saveExamHistory,
  getExamHistory,
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
  const [examHistory, setExamHistory] = useState({});
  const [examAttempts, setExamAttempts] = useState([]);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState([]);
  const [customSheets, setCustomSheets] = useState([]);
  const [mockPlans, setMockPlans] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const syncTimer = useRef(null);
  const historyTimer = useRef(null);
  const bookmarksRef = useRef(bookmarkedQuestions);
  const dataLoadedRef = useRef(false); // Track if data was loaded
  const lastSyncTime = useRef(0); // Track last sync time
  bookmarksRef.current = bookmarkedQuestions;

  useEffect(() => {
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      if (historyTimer.current) clearTimeout(historyTimer.current);
    };
  }, []);

  // AGGRESSIVE OPTIMIZATION: Load from localStorage first, then sync from Firestore only once per session
  const loadAllData = useCallback(async () => {
    if (!user) return;
    
    // Prevent multiple loads in same session
    if (dataLoadedRef.current) {
      console.log('Data already loaded this session, skipping Firestore read');
      return;
    }
    
    setDataLoading(true);
    
    try {
      // STEP 1: Load from localStorage immediately (0 reads)
      const cachedData = {
        history: JSON.parse(localStorage.getItem(`examHistory_${user.uid}`) || '{}'),
        attempts: JSON.parse(localStorage.getItem(`examAttempts_${user.uid}`) || '[]'),
        bookmarks: JSON.parse(localStorage.getItem(`bookmarks_${user.uid}`) || '[]'),
        custom: JSON.parse(localStorage.getItem(`customSheets_${user.uid}`) || '[]'),
        plans: JSON.parse(localStorage.getItem(`mockPlans_${user.uid}`) || '[]'),
      };
      
      // Set cached data immediately
      setExamHistory(cachedData.history);
      setExamAttempts(cachedData.attempts);
      setBookmarkedQuestions(cachedData.bookmarks);
      setCustomSheets(cachedData.custom);
      setMockPlans(cachedData.plans);
      
      // STEP 2: Sync from Firestore only if cache is old (>24 hours) or empty
      const lastSync = parseInt(localStorage.getItem(`lastSync_${user.uid}`) || '0');
      const now = Date.now();
      const SYNC_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
      
      if (now - lastSync > SYNC_INTERVAL || cachedData.attempts.length === 0) {
        console.log('Syncing from Firestore (cache expired or empty)...');
        const [history, attempts, bookmarks, custom, plans] = await Promise.all([
          getExamHistory(user.uid),
          getExamAttempts(user.uid),
          getBookmarks(user.uid),
          getCustomSheets(user.uid),
          getMockPlans(user.uid),
        ]);
        
        // Update state
        setExamHistory(history || {});
        setExamAttempts(attempts || []);
        setBookmarkedQuestions(bookmarks || []);
        setCustomSheets(custom || []);
        setMockPlans(plans || []);
        
        // Update localStorage cache
        localStorage.setItem(`examHistory_${user.uid}`, JSON.stringify(history || {}));
        localStorage.setItem(`examAttempts_${user.uid}`, JSON.stringify(attempts || []));
        localStorage.setItem(`bookmarks_${user.uid}`, JSON.stringify(bookmarks || []));
        localStorage.setItem(`customSheets_${user.uid}`, JSON.stringify(custom || []));
        localStorage.setItem(`mockPlans_${user.uid}`, JSON.stringify(plans || []));
        localStorage.setItem(`lastSync_${user.uid}`, now.toString());
        
        console.log('Firestore sync complete (5 reads)');
      } else {
        console.log('Using cached data (0 reads)');
      }
      
      dataLoadedRef.current = true;
    } catch (e) {
      console.error('DataContext load error:', e);
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

  const updateExamHistory = useCallback((sheetId, data) => {
    const updated = { ...examHistory, [sheetId]: { ...examHistory[sheetId], ...data } };
    setExamHistory(updated);
    
    // Update localStorage immediately (0 writes)
    if (user) {
      localStorage.setItem(`examHistory_${user.uid}`, JSON.stringify(updated));
    }
    
    // AGGRESSIVE: Disable Firestore writes for exam history (not critical data)
    // Only localStorage is used - saves ~50 writes per exam
    // Uncomment below if you need Firestore backup:
    // if (historyTimer.current) clearTimeout(historyTimer.current);
    // historyTimer.current = setTimeout(() => {
    //   if (user) safeFirestore(() => saveExamHistory(user.uid, sheetId, data));
    // }, 5000);
  }, [user, examHistory]);

  const addExamAttempt = useCallback((attemptId, data) => {
    const newAttempt = { id: attemptId, ...data };
    const updated = [newAttempt, ...examAttempts];
    setExamAttempts(updated);
    
    // Update localStorage immediately (0 writes)
    if (user) {
      localStorage.setItem(`examAttempts_${user.uid}`, JSON.stringify(updated));
    }
    
    // Write to Firestore (1 write)
    if (user) safeFirestore(() => saveExamAttempt(user.uid, attemptId, data));
  }, [user, safeFirestore, examAttempts]);

  const toggleBookmark = useCallback((sheetId, sheetTitle, question) => {
    let updated;
    const exists = bookmarkedQuestions.some((b) => b.question.id === question.id);
    updated = exists
      ? bookmarkedQuestions.filter((b) => b.question.id !== question.id)
      : [...bookmarkedQuestions, { sheetId, sheetTitle, question }];
    
    setBookmarkedQuestions(updated);
    
    // Update localStorage immediately (0 writes)
    if (user) {
      localStorage.setItem(`bookmarks_${user.uid}`, JSON.stringify(updated));
    }
    
    // AGGRESSIVE: Debounce 5 seconds instead of 2
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
    
    // Update localStorage immediately (0 writes)
    if (user) {
      localStorage.setItem(`customSheets_${user.uid}`, JSON.stringify(sheets));
    }
    
    // Write to Firestore
    if (user) safeFirestore(() => saveCustomSheets(user.uid, sheets));
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
    await safeFirestore(() => deleteDocFromCollection(user.uid, 'examAttempts', attemptId));
    const updated = examAttempts.filter((a) => a.id !== attemptId);
    setExamAttempts(updated);
    
    // Update localStorage (0 reads)
    localStorage.setItem(`examAttempts_${user.uid}`, JSON.stringify(updated));
    
    // OPTIMIZED: Don't reload all data, just update state (saves 5 reads)
  }, [user, safeFirestore, examAttempts]);

  const clearAllHistory = useCallback(async () => {
    if (!user) return;
    await safeFirestore(() => deleteAllDocsInCollection(user.uid, 'examAttempts'));
    await safeFirestore(() => deleteAllDocsInCollection(user.uid, 'examHistory'));
    setExamAttempts([]);
    setExamHistory({});
    
    // Update localStorage (0 reads)
    localStorage.setItem(`examAttempts_${user.uid}`, JSON.stringify([]));
    localStorage.setItem(`examHistory_${user.uid}`, JSON.stringify({}));
  }, [user, safeFirestore]);

  const addMockPlan = useCallback(async (plan) => {
    if (!user) return;
    try {
      const planId = await saveMockPlan(user.uid, plan);
      const newPlan = { ...plan, id: planId };
      const updated = [...mockPlans, newPlan];
      setMockPlans(updated);
      
      // Update localStorage immediately (0 writes)
      localStorage.setItem(`mockPlans_${user.uid}`, JSON.stringify(updated));
      
      return planId;
    } catch (error) {
      console.error('Error adding mock plan:', error);
      throw error;
    }
  }, [user, mockPlans]);

  const removeMockPlan = useCallback(async (planId) => {
    if (!user) return;
    await safeFirestore(() => deleteMockPlan(user.uid, planId));
    const updated = mockPlans.filter((p) => p.id !== planId);
    setMockPlans(updated);
    
    // Update localStorage immediately (0 writes)
    localStorage.setItem(`mockPlans_${user.uid}`, JSON.stringify(updated));
  }, [user, safeFirestore, mockPlans]);

  const updatePlanStatus = useCallback(async (planId, status) => {
    if (!user) return;
    await safeFirestore(() => updateMockPlanStatus(user.uid, planId, status));
    const updated = mockPlans.map((p) => p.id === planId ? { ...p, status } : p);
    setMockPlans(updated);
    
    // Update localStorage immediately (0 writes)
    localStorage.setItem(`mockPlans_${user.uid}`, JSON.stringify(updated));
  }, [user, safeFirestore, mockPlans]);

  return (
    <DataContext.Provider value={{
      examHistory,
      examAttempts,
      bookmarkedQuestions,
      customSheets,
      mockPlans,
      dataLoading,
      loadAllData,
      updateExamHistory,
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
