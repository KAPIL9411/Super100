import React, { useState, useEffect, useRef, Component } from 'react';
import { 
  Sun, Moon, HelpCircle, Info, Clock, Calculator, X, 
  RotateCcw, CheckCircle, AlertCircle, Keyboard, Award, 
  TrendingUp, Check, Play, FileText, Sliders, ArrowRight, 
  Copy, CheckSquare, Edit, Layout, Home, PlusCircle, ArrowLeft, BarChart2,
  Folder, ChevronDown, ChevronRight, Trash2, Globe, Download, Bookmark,
  BookOpen, XCircle, Calendar, Target, Flame, ChevronLeft
} from 'lucide-react';

import './App.css';
import { 
  trackTestStarted, 
  trackTestCompleted, 
  trackTestPaused, 
  trackTestResumed,
  trackThemeChanged,
  trackLanguageChanged,
  trackPWAInstalled,
  trackCalculatorUsed,
  trackSheetCreated
} from './analytics';
import { useAuth } from './contexts/AuthContext.jsx';
import { useData } from './contexts/DataContext.jsx';
import Login from './components/Auth/Login.jsx';
import AccessKeyPrompt from './components/Auth/AccessKeyPrompt.jsx';
import { SkeletonPageLoader, SkeletonSheetGrid, SkeletonTable } from './components/SkeletonLoader.jsx';

// Error Boundary Component for Production Safety
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to monitoring service in production
    // For now, store in sessionStorage for debugging
    try {
      const errorLog = {
        error: error.toString(),
        errorInfo: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      };
      sessionStorage.setItem('super100_last_error', JSON.stringify(errorLog));
    } catch (e) {
      // Silent fail if sessionStorage is unavailable
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <AlertCircle size={64} color="#ef4444" style={{ marginBottom: '20px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', color: '#1e293b' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', maxWidth: '500px' }}>
            We encountered an unexpected error. Please refresh the page to continue. Your progress has been saved automatically.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const { user, userProfile, loading: authLoading, logout, updateProfile } = useAuth();
  const { 
    examAttempts, customSheets, mockPlans,
    getSheetHistory, getOverallStats,
    addExamAttempt, toggleBookmark, isBookmarked,
    addIssueReport, persistActiveTest, removeActiveTest,
    loadAllData, deleteAttempt, clearAllHistory,
    addMockPlan, removeMockPlan, updatePlanStatus
  } = useData();
  
  // ==========================================
  // STATE DEFINITIONS
  // ==========================================
  
  const [theme, setTheme] = useState('tcs'); // 'tcs' (light) | 'premium' (dark)
  const [appMode, setAppMode] = useState('home'); // 'home' | 'setup' | 'preview' | 'exam' | 'results' | 'instructions' | 'pyq-home' | 'pyq-setup' | 'pyq-preview' | 'pyq-practice' | 'mode-selection' | 'admin-dashboard' | 'mock-planner'
  
  // Test mode: 'mock' (timed, no feedback) or 'practice' (instant feedback)
  const [testMode, setTestMode] = useState('mock');
  
  // Onboarding candidate profile states
  const getLocalName = () => { try { return localStorage.getItem('super100_candidate_name') || ''; } catch (e) { return ''; } };
  const getLocalAvatar = () => { try { return localStorage.getItem('super100_candidate_avatar') || ''; } catch (e) { return ''; } };
  const [candidateName, setCandidateName] = useState(() => userProfile?.name || getLocalName());
  const [candidateAvatar, setCandidateAvatar] = useState(() => userProfile?.avatar || getLocalAvatar());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tempName, setTempName] = useState(() => userProfile?.name || getLocalName() || '');
  const [tempAvatar, setTempAvatar] = useState(() => userProfile?.avatar || getLocalAvatar() || '/candidate_avatar.png');
  
  // Show onboarding only once per user
  useEffect(() => {
    if (userProfile) {
      const onboardingDone = localStorage.getItem('super100_onboarding_complete');
      if (!onboardingDone && !userProfile.name) {
        setShowOnboarding(true);
        // Also populate temp fields from profile if available
        if (userProfile.name) setTempName(userProfile.name);
        if (userProfile.avatar) setTempAvatar(userProfile.avatar);
      } else if (!onboardingDone && userProfile.name) {
        // Already has a profile name from Firebase, mark complete
        localStorage.setItem('super100_onboarding_complete', 'true');
      }
    }
  }, [userProfile]);
  
  // Available chapter mock sheets loaded from baseline + custom sheets
  const [sheetsLoaded, setSheetsLoaded] = useState(false);
  const hardcodedSheetIdsRef = useRef(new Set());

  const [availableSheets, setAvailableSheets] = useState(() => customSheets || []);

  useEffect(() => {
    import('./data/questions').then(mod => {
      const allSheets = Object.values(mod.super100Sheets);
      hardcodedSheetIdsRef.current = new Set(allSheets.map(s => s.id));
      const hardcodedIds = hardcodedSheetIdsRef.current;
      const filtered = (customSheets || []).filter(s => !hardcodedIds.has(s.id));
      setAvailableSheets([...allSheets, ...filtered]);
      setSheetsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!sheetsLoaded) return;
    const hardcodedIds = hardcodedSheetIdsRef.current;
    const filtered = (customSheets || []).filter(s => !hardcodedIds.has(s.id));
    setAvailableSheets(prev => {
      const hardcoded = prev.filter(s => hardcodedIds.has(s.id));
      return [...hardcoded, ...filtered];
    });
  }, [customSheets, sheetsLoaded]);

  // Track sheet for per-sheet analytics modal
  const [analyticsModalSheet, setAnalyticsModalSheet] = useState(null);

  // Active Simulator details
  const [activeSheetId, setActiveSheetId] = useState(() => {
    try {
      const stored = localStorage.getItem('super100_active_test');
      return stored ? JSON.parse(stored).sheetId : null;
    } catch (e) {
      return null;
    }
  });
  const [activeSheetTitle, setActiveSheetTitle] = useState(() => {
    try {
      const stored = localStorage.getItem('super100_active_test');
      return stored ? JSON.parse(stored).sheetTitle : "";
    } catch (e) {
      return "";
    }
  });
  const [questions, setQuestions] = useState(() => {
    try {
      const stored = localStorage.getItem('super100_active_test');
      return stored ? JSON.parse(stored).questions : [];
    } catch (e) {
      return [];
    }
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    try {
      const stored = localStorage.getItem('super100_active_test');
      return stored ? JSON.parse(stored).currentQuestionIndex : 0;
    } catch (e) {
      return 0;
    }
  });
  const [selectedAnswers, setSelectedAnswers] = useState(() => {
    try {
      const stored = localStorage.getItem('super100_active_test');
      return stored ? JSON.parse(stored).selectedAnswers : {};
    } catch (e) {
      return {};
    }
  }); // { questionId: optionIndex }
  const [status, setStatus] = useState(() => {
    try {
      const stored = localStorage.getItem('super100_active_test');
      return stored ? JSON.parse(stored).status : {};
    } catch (e) {
      return {};
    }
  }); // { questionId: statusString }

  // CBT Instruction Page configurations
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // 'en' | 'hi'
  const [activeLanguage, setActiveLanguage] = useState('en'); // language in simulator
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [pendingLaunchSheet, setPendingLaunchSheet] = useState(null);

  // Timer configurations
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes
  const [isExamSubmitted, setIsExamSubmitted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isExamPaused, setIsExamPaused] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(true);
  
  // Folders Expanded mapping state
  const [expandedFolders, setExpandedFolders] = useState({}); // all folders closed by default

  // Setup Form Fields
  const [setupChapterName, setSetupChapterName] = useState('');
  const [setupSheetNumber, setSetupSheetNumber] = useState('');
  const [setupRawText, setSetupRawText] = useState('');
  
  // Preview Mode Fields (parsed array of questions ready to edit)
  const [setupQuestions, setSetupQuestions] = useState([]);
  const [showCodeExporter, setShowCodeExporter] = useState(false);

  // Floating Calculator States
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const [calcPosition, setCalcPosition] = useState({ x: 450, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const calcRef = useRef(null);
  const fileInputRef = useRef(null);

  // Overlay Modals
  const [showInstructions, setShowInstructions] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false); // Safety check if exiting exam
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false); // Fullscreen exit warning
  const [showReportIssue, setShowReportIssue] = useState(false); // Report question issue
  
  // Admin mode (hidden feature - press Ctrl+Shift+A to enable)
  const [isAdminMode, setIsAdminMode] = useState(() => {
    try {
      return localStorage.getItem('super100_admin_mode') === 'true';
    } catch (e) {
      return false;
    }
  });
  
  // Admin dashboard data
  const [allUsersData, setAllUsersData] = useState([]);
  const [loadingUsersData, setLoadingUsersData] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  
  // Mock Planner state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [planDate, setPlanDate] = useState('');
  const [planTime, setPlanTime] = useState('09:00');
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  
  // PWA Support states
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  
  // Toast notifications
  const [toast, setToast] = useState(null);
  
  // Expanded explanation card index for Review Mode
  const [expandedExplanation, setExpandedExplanation] = useState(null);
  
  // CBT Review Simulator states
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState(0);
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'correct' | 'incorrect' | 'unattempted' | 'bookmarked'

  // Load data from Firestore when user logs in
  useEffect(() => {
    if (user) loadAllData();
  }, [user]);

  // Sync userProfile to candidate state
  useEffect(() => {
    if (userProfile) {
      setCandidateName(prev => prev || userProfile.name || '');
      setCandidateAvatar(prev => prev || userProfile.avatar || '/candidate_avatar.png');
    }
  }, [userProfile]);

  // PWA Install Prompt Listener
  useEffect(() => {
    // Check if the prompt event was already captured by index.html early script
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
      setIsInstallable(true);
    }

    // Capture event if it fires after component is mounted
    window.onBeforeInstallPrompt = (e) => {
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      trackPWAInstalled();
      triggerToast("Super Mocks installed successfully as a desktop app!", "success");
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.onBeforeInstallPrompt = null;
    };
  }, []);

  // Secret Admin Mode Activation (Ctrl+Shift+A)
  useEffect(() => {
    const handleAdminKeyCombo = (e) => {
      // Ctrl+Shift+A to toggle admin mode
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setIsAdminMode(prev => {
          const newMode = !prev;
          try {
            localStorage.setItem('super100_admin_mode', newMode.toString());
          } catch (err) {
            // Silent fail
          }
          triggerToast(
            newMode ? "🔓 Admin mode enabled! You can now create/edit/delete sheets." : "🔒 Admin mode disabled.",
            newMode ? "success" : "info"
          );
          return newMode;
        });
      }
    };

    window.addEventListener('keydown', handleAdminKeyCombo);
    return () => window.removeEventListener('keydown', handleAdminKeyCombo);
  }, []);

  const handleInstallPWA = async () => {
    // Retrieve prompt either from local React state or global early-captured window variable
    const activePrompt = deferredPrompt || window.deferredPrompt;
    if (!activePrompt) {
      triggerToast("Desktop PWA installation is ready! Please click the 'Install App' icon on your browser URL bar (next to the bookmark star).", "info");
      return;
    }
    try {
      activePrompt.prompt();
      const { outcome } = await activePrompt.userChoice;
      // User responded to PWA installation prompt
      setDeferredPrompt(null);
      window.deferredPrompt = null;
      setIsInstallable(false);
    } catch (err) {
      // PWA installation error - silent fail in production
      triggerToast("Please click the 'Install App' screen icon directly in your Chrome/Edge address bar.", "info");
    }
  };

  // ==========================================
  // EFFECT HOOKS
  // ==========================================
  
  // 1. Digital Exam Timer Countdown (only in mock mode)
  const timerRef = useRef(null);
  useEffect(() => {
    if (appMode !== 'exam' || isExamSubmitted || isExamPaused || testMode === 'practice') return;

    const tick = () => {
      setTimeLeft(prev => prev - 1);
    };
    timerRef.current = setInterval(tick, 1000);

    return () => {
      clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [appMode, isExamSubmitted, isExamPaused, testMode]);

  // Auto-submit when timer hits zero
  const didSubmitRef = useRef(false);
  useEffect(() => {
    if (appMode === 'exam' && timeLeft <= 0 && !isExamSubmitted && testMode === 'mock' && !didSubmitRef.current) {
      didSubmitRef.current = true;
      submitExamDirectly();
    }
    if (timeLeft > 0) didSubmitRef.current = false;
  }, [timeLeft]);

  // 1b. Fullscreen Lockdown: detect when user exits fullscreen during exam
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && appMode === 'exam' && !isExamSubmitted) {
        setShowFullscreenWarning(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [appMode, isExamSubmitted]);

  // 2. Pro Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (appMode !== 'exam' || isExamSubmitted || isExamPaused) return;
      
      const key = e.key.toLowerCase();
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleSaveNext();
      }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        navigateQuestion(Math.min(questions.length - 1, currentQuestionIndex + 1));
      }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigateQuestion(Math.max(0, currentQuestionIndex - 1));
      }
      else if (key === 'm' || key === 'r') {
        e.preventDefault();
        handleMarkReviewNext();
      }
      else if (key === 'c') {
        e.preventDefault();
        handleClearResponse();
      }
      else if (key === 'v') {
        e.preventDefault();
        setShowCalculator(prev => !prev);
      }
      else if (key === 'i') {
        e.preventDefault();
        setShowInstructions(prev => !prev);
      }
      else if (key === 'h') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
      else if (key === 'p') {
        e.preventDefault();
        handlePauseToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, selectedAnswers, isExamSubmitted, appMode, questions, isExamPaused]);

  // 3. Save active test state to both localStorage and Firestore
  // OPTIMIZED: Throttle auto-save to reduce writes
  useEffect(() => {
    if (appMode === 'exam' && !isExamSubmitted && activeSheetId) {
      try {
        const testState = {
          sheetId: activeSheetId,
          sheetTitle: activeSheetTitle,
          questions: questions,
          currentQuestionIndex: currentQuestionIndex,
          selectedAnswers: selectedAnswers,
          status: status,
          timeLeft: timeLeft,
          activeLanguage: activeLanguage,
          isExamPaused: isExamPaused,
          testMode,
          timestamp: new Date().toISOString()
        };
        
        // Always save to localStorage (fast, no cost)
        localStorage.setItem('super100_active_test', JSON.stringify(testState));
        
        // AGGRESSIVE: Disable Firestore auto-save (localStorage is sufficient)
        // Active test is recovered from localStorage on page reload
        // This saves ~100+ writes per exam session
        // Uncomment below if you need Firestore backup:
        // const lastSaveTime = window._lastFirestoreSave || 0;
        // const now = Date.now();
        // if (now - lastSaveTime > 30000) {
        //   persistActiveTest(testState);
        //   window._lastFirestoreSave = now;
        // }
      } catch (e) {
        // Silent fail if localStorage is full or unavailable
        triggerToast("Warning: Unable to save progress. Please ensure browser storage is enabled.", "warning");
      }
    }
  }, [appMode, isExamSubmitted, activeSheetId, activeSheetTitle, questions, currentQuestionIndex, selectedAnswers, status, timeLeft, activeLanguage, isExamPaused, testMode]);

  // ==========================================
  // DRAG & DROP MOUSE EVENT HANDLERS (Calculator)
  // ==========================================
  const handleMouseDown = (e) => {
    if (e.target.closest('.calc-header')) {
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - calcPosition.x,
        y: e.clientY - calcPosition.y
      };
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    let newX = e.clientX - dragStart.current.x;
    let newY = e.clientY - dragStart.current.y;
    
    const maxX = window.innerWidth - 270;
    const maxY = window.innerHeight - 300;
    
    newX = Math.max(10, Math.min(newX, maxX));
    newY = Math.max(10, Math.min(newY, maxY));
    
    setCalcPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // ==========================================
  // TOAST ALERT TRIGGERS
  // ==========================================
  const triggerToast = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      triggerToast("Image file must be under 2MB.", "warning");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setTempAvatar(event.target.result);
      triggerToast("Profile picture uploaded successfully!", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleCompleteOnboarding = () => {
    if (!tempName.trim()) return;
    
    try {
      const avatarToSave = tempAvatar || "/candidate_avatar.png";
      localStorage.setItem('super100_candidate_name', tempName.trim());
      localStorage.setItem('super100_candidate_avatar', avatarToSave);
      localStorage.setItem('super100_onboarding_complete', 'true');
      updateProfile({ name: tempName.trim(), avatar: avatarToSave });
      
      setCandidateName(tempName.trim());
      setCandidateAvatar(avatarToSave);
      setShowOnboarding(false);
      
      triggerToast(`Welcome ${tempName.trim()} to Super Mocks Simulator!`, "success");
    } catch (e) {
      triggerToast("Unable to save profile. Please check browser storage settings.", "warning");
    }
  };

  // ==========================================
  // EXAM SHEET LAUNCHER (Loads Mode Selection Page)
  // ==========================================
  const handleLaunchMockRequest = (sheet) => {
    setPendingLaunchSheet(sheet);
    setAppMode('mode-selection');
  };

  const handleModeSelected = (mode) => {
    setTestMode(mode);
    setDeclarationChecked(false);
    setSelectedLanguage('en');
    setAppMode('instructions');
  };

  const startExamCGLSimulator = () => {
    if (!pendingLaunchSheet) return;
    
    // Check if there's a saved test in progress for this sheet
    let shouldResume = false;
    
    try {
      const savedTest = localStorage.getItem('super100_active_test');
      if (savedTest) {
        const parsed = JSON.parse(savedTest);
        if (parsed.sheetId === pendingLaunchSheet.id) {
          shouldResume = window.confirm(
            `You have an incomplete test for "${pendingLaunchSheet.title}".\n\n` +
            `Progress: ${Object.keys(parsed.selectedAnswers || {}).length}/${pendingLaunchSheet.questions.length} questions answered\n` +
            `Time remaining: ${formatTime(parsed.timeLeft || 0)}\n\n` +
            `Click OK to RESUME your test, or Cancel to START FRESH.`
          );
          
          if (shouldResume) {
            // Resume the saved test
            setQuestions(parsed.questions);
            setActiveSheetId(parsed.sheetId);
            setActiveSheetTitle(parsed.sheetTitle);
            setActiveLanguage(parsed.activeLanguage || selectedLanguage);
            setStatus(parsed.status || {});
            setSelectedAnswers(parsed.selectedAnswers || {});
            setCurrentQuestionIndex(parsed.currentQuestionIndex || 0);
            setTimeLeft(parsed.timeLeft || 3600);
            setIsExamSubmitted(false);
            
            triggerToast(`Resumed test: ${parsed.sheetTitle}`, "success");
          }
        }
      }
    } catch (e) {
      // If error parsing saved test, start fresh
      shouldResume = false;
    }
    
    if (!shouldResume) {
      // Start fresh test
      setQuestions(pendingLaunchSheet.questions);
      setActiveSheetId(pendingLaunchSheet.id);
      setActiveSheetTitle(pendingLaunchSheet.title);
      
      // Bind default language
      setActiveLanguage(selectedLanguage);
      
      const initialStatus = {};
      pendingLaunchSheet.questions.forEach((q, idx) => {
        initialStatus[q.id] = idx === 0 ? 'not-answered' : 'not-visited';
      });
      setStatus(initialStatus);

      setSelectedAnswers({});
      setCurrentQuestionIndex(0);
      // Dynamic timer duration based on question count: 1 minute per question
      const durationSeconds = (pendingLaunchSheet.questions?.length || 25) * 60;
      setTimeLeft(durationSeconds);
      setIsExamSubmitted(false);
      
      triggerToast(`CGL CBT simulator loaded successfully. Language: ${selectedLanguage === 'en' ? 'English' : 'Hindi'}`, "success");
    }
    
    setAppMode('exam');
    
    // Track test started
    trackTestStarted(pendingLaunchSheet.title, pendingLaunchSheet.questions.length);
    
    // Enter fullscreen mode for exam lockdown
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Silent fail if fullscreen is not supported or blocked
      });
    }
  };

  const handleHomeExitCheck = () => {
    if (appMode === 'exam' && !isExamSubmitted) {
      setShowExitConfirm(true);
    } else {
      setAppMode('home');
    }
  };

  const confirmExitToHome = () => {
    setShowExitConfirm(false);
    
    // Clear the active test from localStorage when exiting
    try {
      localStorage.removeItem('super100_active_test');
    } catch (e) {
      // Silent fail
    }
    
    setAppMode('home');
    // Exit fullscreen when aborting exam
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
        // Silent fail if fullscreen exit is blocked
      });
    }
    triggerToast("Exited to chapter selector.", "info");
  };

  // Re-enter fullscreen after user dismissed the warning
  const handleResumeFullscreen = () => {
    setShowFullscreenWarning(false);
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Silent fail if fullscreen is not supported
      });
    }
  };

  // Pause/Resume Test Functionality
  const handlePauseToggle = () => {
    if (isExamPaused) {
      // Resume test
      setIsExamPaused(false);
      trackTestResumed(activeSheetTitle);
      triggerToast("Test resumed. Timer is running.", "success");
    } else {
      // Pause test - show confirmation
      setShowPauseConfirm(true);
    }
  };

  const confirmPauseTest = () => {
    setIsExamPaused(true);
    setShowPauseConfirm(false);
    
    // Track test paused
    trackTestPaused(activeSheetTitle, Object.keys(selectedAnswers).length);
    
    triggerToast("Test paused. Click Resume to continue.", "info");
  };

  // ==========================================
  // BILINGUAL SHEET PASTE PARSER
  // ==========================================
  const parseRawQuestions = (rawText) => {
    if (!rawText.trim()) return [];
    
    // Split segments based on Q1. or Q.1 or Q 1. or 1. formats
    const regex = /(?:^|\n|\r)\s*Q\s*\.?\s*(\d+)(?:\(hindi\))?[\.\s:]+/gi;
    let match;
    const indices = [];
    while ((match = regex.exec(rawText)) !== null) {
      const isHindi = match[0].toLowerCase().includes('hindi');
      indices.push({
        id: parseInt(match[1]),
        isHindi,
        index: match.index,
        length: match[0].length
      });
    }
    
    // Backup fallback to standard numbers (e.g. 1. 2.) if Q format is missing
    if (indices.length === 0) {
      const backupRegex = /(?:^|\n|\r)\s*(\d+)[\.\s:]+/gi;
      while ((match = backupRegex.exec(rawText)) !== null) {
        indices.push({
          id: parseInt(match[1]),
          isHindi: false,
          index: match.index,
          length: match[0].length
        });
      }
    }
    
    // Group questions by ID to combine English and Hindi segments
    const questionBuckets = {};
    
    for (let i = 0; i < indices.length; i++) {
      const current = indices[i];
      const start = current.index + current.length;
      const end = (i + 1 < indices.length) ? indices[i + 1].index : rawText.length;
      const segment = rawText.substring(start, end).trim();
      
      const optARegex = /\((?:a)\)|a\)/i;
      const optBRegex = /\((?:b)\)|b\)/i;
      const optCRegex = /\((?:c)\)|c\)/i;
      const optDRegex = /\((?:d)\)|d\)/i;
      
      let qText = segment;
      let optA = "", optB = "", optC = "", optD = "";
      
      const idxA = segment.search(optARegex);
      const idxB = segment.search(optBRegex);
      const idxC = segment.search(optCRegex);
      const idxD = segment.search(optDRegex);
      
      if (idxA !== -1 && idxB !== -1 && idxC !== -1 && idxD !== -1) {
        qText = segment.substring(0, idxA).trim();
        
        const lenA = segment.match(optARegex)[0].length;
        optA = segment.substring(idxA + lenA, idxB).trim();
        
        const lenB = segment.match(optBRegex)[0].length;
        optB = segment.substring(idxB + lenB, idxC).trim();
        
        const lenC = segment.match(optCRegex)[0].length;
        optC = segment.substring(idxC + lenC, idxD).trim();
        
        const lenD = segment.match(optDRegex)[0].length;
        optD = segment.substring(idxD + lenD).trim();
      }
      if (!questionBuckets[current.id]) {
        questionBuckets[current.id] = { id: current.id };
      }
      
      const target = questionBuckets[current.id];
      
      // Helper to split a bilingual option if it contains "/"
      const splitOpt = (optStr) => {
        if (!optStr) return { eng: "", hin: "" };
        if (optStr.includes('/')) {
          const parts = optStr.split('/');
          const hindiIdx = parts.findIndex(p => /[\u0900-\u097F]/.test(p));
          if (hindiIdx !== -1) {
            const eng = parts.slice(0, hindiIdx).join('/').trim();
            const hin = parts.slice(hindiIdx).join('/').trim();
            return { eng, hin };
          }
        }
        if (/[\u0900-\u097F]/.test(optStr)) {
          return { eng: "", hin: optStr };
        } else {
          return { eng: optStr, hin: optStr };
        }
      };

      const splitA = splitOpt(optA);
      const splitB = splitOpt(optB);
      const splitC = splitOpt(optC);
      const splitD = splitOpt(optD);

      const parsedOptsEng = [splitA.eng || optA, splitB.eng || optB, splitC.eng || optC, splitD.eng || optD];
      const parsedOptsHin = [splitA.hin || optA, splitB.hin || optB, splitC.hin || optC, splitD.hin || optD];

      // Check if this segment itself is a mixed bilingual segment (contains both Devanagari and English letters)
      const hasHindi = /[\u0900-\u097F]/.test(qText);
      const hasEnglish = /[a-zA-Z]{3,}/.test(qText); // at least 3 consecutive letters to avoid matching option flags like (a)

      if (hasHindi && hasEnglish && !current.isHindi) {
        // Mixed segment: split it!
        let engQ = qText;
        let hinQ = "";

        if (qText.includes('/')) {
          const parts = qText.split('/');
          const hindiIdx = parts.findIndex(p => /[\u0900-\u097F]/.test(p));
          if (hindiIdx !== -1) {
            engQ = parts.slice(0, hindiIdx).join('/').trim();
            hinQ = parts.slice(hindiIdx).join('/').trim();
          }
        } else {
          const lines = qText.split('\n').map(l => l.trim()).filter(Boolean);
          const engLines = lines.filter(l => !/[\u0900-\u097F]/.test(l));
          const hinLines = lines.filter(l => /[\u0900-\u097F]/.test(l));
          if (engLines.length > 0 && hinLines.length > 0) {
            engQ = engLines.join('\n');
            hinQ = hinLines.join('\n');
          }
        }

        target.question = engQ;
        target.questionHindi = hinQ;
        target.options = parsedOptsEng;
        target.optionsHindi = parsedOptsHin;
      } 
      else if (current.isHindi || (hasHindi && !hasEnglish)) {
        // Pure Hindi segment
        target.questionHindi = qText;
        target.optionsHindi = parsedOptsHin;
        if (parsedOptsEng.some(opt => opt && !/[\u0900-\u097F]/.test(opt))) {
          target.options = parsedOptsEng;
        }
      } 
      else {
        // Pure English segment
        target.question = qText;
        target.options = parsedOptsEng;
        if (parsedOptsHin.some(opt => opt && /[\u0900-\u097F]/.test(opt))) {
          target.optionsHindi = parsedOptsHin;
        }
      }
    }
    
    // Convert dictionary back to array and verify fallbacks
    return Object.values(questionBuckets).map(q => ({
      id: q.id,
      question: q.question || "Algebraic question body placeholder?",
      questionHindi: q.questionHindi || "हिंदी प्रश्न विवरण यहाँ लिखें।",
      options: q.options || ["Option A", "Option B", "Option C", "Option D"],
      optionsHindi: q.optionsHindi || ["विकल्प A", "विकल्प B", "विकल्प C", "विकल्प D"],
      correctOption: 0,
      explanation: "",
      explanationHindi: "",
      diagramUrl: ""
    }));
  };

  const handleStartParsing = () => {
    const parsed = parseRawQuestions(setupRawText);
    
    if (parsed.length === 0) {
      triggerToast("Error: Could not parse any questions. Check spacing and option tags.", "warning");
      return;
    }
    
    setSetupQuestions(parsed);
    setAppMode('preview');
    triggerToast(`Success: Parsed ${parsed.length} bilingual questions! Set the answer key!`, "success");
  };

  // Active preview editors
  const handleUpdateQTextBilingual = (idx, text, isHindi = false) => {
    setSetupQuestions(prev => {
      const updated = [...prev];
      if (isHindi) updated[idx].questionHindi = text;
      else updated[idx].question = text;
      return updated;
    });
  };

  const handleUpdateOptTextBilingual = (qIdx, optIdx, text, isHindi = false) => {
    setSetupQuestions(prev => {
      const updated = [...prev];
      if (isHindi) {
        updated[qIdx] = {
          ...updated[qIdx],
          optionsHindi: updated[qIdx].optionsHindi.map((opt, i) => i === optIdx ? text : opt)
        };
      } else {
        updated[qIdx] = {
          ...updated[qIdx],
          options: updated[qIdx].options.map((opt, i) => i === optIdx ? text : opt)
        };
      }
      return updated;
    });
  };

  const handleUpdateDiagramUrl = (idx, url) => {
    setSetupQuestions(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], diagramUrl: url };
      return updated;
    });
  };

  // ==========================================
  // SHEET EDIT & DELETE DISK CONTROLLERS
  // ==========================================
  const handleNewMockRequest = () => {
    setSetupChapterName('');
    setSetupSheetNumber('');
    setSetupRawText('');
    setSetupQuestions([]);
    setAppMode('setup');
  };

  const handleEditExistingSheet = (sheet) => {
    // Extract title prefix
    const title = sheet.title || "";
    const hyphenIdx = title.indexOf("-");
    const parsedTitle = hyphenIdx !== -1 ? title.substring(0, hyphenIdx).trim() : title.replace(/Sheet \d+/i, '').trim();
    
    // Extract sheet number
    const sheetNumMatch = title.match(/Sheet\s*(\d+)/i);
    const parsedNum = sheetNumMatch ? sheetNumMatch[1] : "1";

    setSetupChapterName(parsedTitle);
    setSetupSheetNumber(parsedNum);
    setSetupQuestions(sheet.questions);
    setAppMode('preview');
    triggerToast(`Editing sheet "${sheet.title}". Adjust options and save!`, "info");
  };

  const handleDeleteSheetRequest = (sheetId) => {
    const confirm = window.confirm("Are you sure you want to permanently delete this sheet from the codebase?");
    if (!confirm) return;

    fetch('/api/delete-sheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sheetId })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        triggerToast("🚀 Sheet successfully deleted from your questions.js disk file!", "success");
        
        // Remove from client-side array
        setAvailableSheets(prev => {
          const updated = prev.filter(s => s.id !== sheetId);
          
          // Sync client-side localStorage dynamically excluding any hardcoded sheet IDs
          const customOnly = updated.filter(s => !hardcodedSheetIdsRef.current.has(s.id));
          localStorage.setItem('super100_custom_sheets', JSON.stringify(customOnly));
          
          return updated;
        });

        // Abort to dashboard
        setAppMode('home');
      } else {
        triggerToast(`Delete failed: ${data.error}`, "warning");
      }
    })
    .catch(() => {
      triggerToast("Vite server offline. Deleted client-side only.", "success");
      // Remove from client-side array on failure offline
      setAvailableSheets(prev => {
        const updated = prev.filter(s => s.id !== sheetId);
        const customOnly = updated.filter(s => !hardcodedSheetIdsRef.current.has(s.id));
        localStorage.setItem('super100_custom_sheets', JSON.stringify(customOnly));
        return updated;
      });
      setAppMode('home');
    });
  };

  const handleSaveAndLoadCustomSimulator = () => {
    if (setupQuestions.length === 0) return;
    
    const cleanChapterKey = setupChapterName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_sheet_' + setupSheetNumber;
    
    const newSheet = {
      id: cleanChapterKey,
      title: `${setupChapterName} - Sheet ${setupSheetNumber}`,
      topic: "Quantitative Aptitude",
      questions: setupQuestions
    };

    // Filter duplicates and append client-side
    setAvailableSheets(prev => {
      const filtered = prev.filter(s => s.id !== newSheet.id);
      const updatedList = [...filtered, newSheet];
      
      const hardcodedIds = hardcodedSheetIdsRef.current;
      const customOnly = updatedList.filter(s => !hardcodedIds.has(s.id));
      localStorage.setItem('super100_custom_sheets', JSON.stringify(customOnly));
      
      return updatedList;
    });

    // Launch Instructions declartion first before CBT Simulator
    setPendingLaunchSheet(newSheet);
    setDeclarationChecked(false);
    setSelectedLanguage('en');
    setAppMode('instructions');

    // Call server-side middleware to write directly to questions.js on disk!
    fetch('/api/save-sheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sheetId: cleanChapterKey,
        sheetTitle: setupChapterName,
        sheetNumber: setupSheetNumber,
        questions: setupQuestions
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        triggerToast(`🚀 Sheet "${newSheet.title}" successfully hardcoded in questions.js!`, "success");
      } else {
        triggerToast(`Warning: Scoping error: ${data.error}`, "warning");
      }
    })
    .catch(() => {
      triggerToast(`Custom paper "${newSheet.title}" loaded. (HMR ready)`, "success");
    });
  };

  const handleSetCorrectOption = (qIdx, optIdx) => {
    setSetupQuestions(prev => {
      const updated = [...prev];
      updated[qIdx] = {
        ...updated[qIdx],
        correctOption: optIdx
      };
      return updated;
    });
    triggerToast(`Question ${qIdx + 1} correct option set to Option (${String.fromCharCode(97 + optIdx).toUpperCase()})`, "success");
  };

  // ==========================================
  // ADMIN DASHBOARD HANDLERS - OPTIMIZED WITH CACHING
  // ==========================================
  const handleOpenAdminDashboard = async () => {
    setAppMode('admin-dashboard');
    setLoadingUsersData(true);
    
    try {
      // AGGRESSIVE OPTIMIZATION: Cache admin data for 1 hour
      const cacheKey = 'admin_users_cache';
      const cacheTimeKey = 'admin_users_cache_time';
      const cached = localStorage.getItem(cacheKey);
      const cacheTime = parseInt(localStorage.getItem(cacheTimeKey) || '0');
      const now = Date.now();
      const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
      
      if (cached && (now - cacheTime < CACHE_DURATION)) {
        // Use cached data (0 reads)
        console.log('Using cached admin data (0 reads)');
        const cachedData = JSON.parse(cached);
        setAllUsersData(cachedData);
        triggerToast(`Loaded ${cachedData.length} users (cached)`, "success");
        setLoadingUsersData(false);
        return;
      }
      
      // Load from Firestore
      console.log('Loading admin data from Firestore...');
      const { getAllUsers, getUserStats } = await import('./firebase/db');
      
      const users = await getAllUsers();
      
      // Fetch stats for each user
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const stats = await getUserStats(user.uid);
          return {
            ...user,
            ...stats
          };
        })
      );
      
      setAllUsersData(usersWithStats);
      
      // Cache the data
      localStorage.setItem(cacheKey, JSON.stringify(usersWithStats));
      localStorage.setItem(cacheTimeKey, now.toString());
      
      triggerToast(`Loaded ${usersWithStats.length} users`, "success");
    } catch (error) {
      console.error('Error loading users:', error);
      triggerToast("Failed to load users data", "warning");
    } finally {
      setLoadingUsersData(false);
    }
  };

  const handleViewUserDetails = (userData) => {
    setSelectedUserDetails(userData);
  };

  const handleCloseUserDetails = () => {
    setSelectedUserDetails(null);
  };

  // ==========================================
  // MOCK PLANNER HANDLERS
  // ==========================================
  const handleOpenMockPlanner = () => {
    setAppMode('mock-planner');
    setSelectedDate(new Date());
  };

  const handleAddPlan = async () => {
    if (!selectedSheet || !planDate) {
      triggerToast("Please select a sheet and date", "warning");
      return;
    }

    if (isAddingPlan) {
      console.log('Already adding plan, ignoring duplicate call');
      return;
    }

    setIsAddingPlan(true);

    const plan = {
      sheetId: selectedSheet.id,
      sheetTitle: selectedSheet.title,
      plannedDate: `${planDate}T${planTime}:00`,
      status: 'pending', // pending, completed, skipped
      createdAt: new Date().toISOString()
    };

    try {
      console.log('Adding plan:', plan);
      const planId = await addMockPlan(plan);
      console.log('Plan added with ID:', planId);
      triggerToast(`📅 Mock planned for ${new Date(plan.plannedDate).toLocaleDateString()}`, "success");
      setShowAddPlanModal(false);
      setSelectedSheet(null);
      setPlanDate('');
      setPlanTime('09:00');
    } catch (error) {
      console.error('Error in handleAddPlan:', error);
      triggerToast("Failed to add plan", "warning");
    } finally {
      setIsAddingPlan(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm("Delete this planned mock?")) return;
    try {
      await removeMockPlan(planId);
      triggerToast("Plan deleted", "success");
    } catch (error) {
      triggerToast("Failed to delete plan", "warning");
    }
  };

  const handleMarkPlanComplete = async (planId) => {
    try {
      await updatePlanStatus(planId, 'completed');
      triggerToast("✅ Mock marked as completed!", "success");
    } catch (error) {
      triggerToast("Failed to update status", "warning");
    }
  };

  const handleStartPlannedMock = (plan) => {
    const sheet = availableSheets.find(s => s.id === plan.sheetId);
    if (sheet) {
      setPendingLaunchSheet(sheet);
      setDeclarationChecked(false);
      setSelectedLanguage('en');
      setAppMode('instructions');
    }
  };

  const getGeneratedCodeString = () => {
    const cleanChapterKey = setupChapterName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_sheet_' + setupSheetNumber;
    let code = `  ${cleanChapterKey}: {\n`;
    code += `    id: "${cleanChapterKey}",\n`;
    code += `    title: "${setupChapterName} - Sheet ${setupSheetNumber}",\n`;
    code += `    topic: "Quantitative Aptitude",\n`;
    code += `    questions: [\n`;
    
    setupQuestions.forEach((q, qIdx) => {
      code += `      {\n`;
      code += `        id: ${q.id},\n`;
      code += `        question: ${JSON.stringify(q.question)},\n`;
      code += `        questionHindi: ${JSON.stringify(q.questionHindi || '')},\n`;
      code += `        options: ${JSON.stringify(q.options)},\n`;
      code += `        optionsHindi: ${JSON.stringify(q.optionsHindi || ['', '', '', ''])},\n`;
      code += `        correctOption: ${q.correctOption},\n`;
      code += `        explanation: ${JSON.stringify(q.explanation || '')},\n`;
      code += `        explanationHindi: ${JSON.stringify(q.explanationHindi || '')}\n`;
      code += `      }${qIdx < setupQuestions.length - 1 ? ',' : ''}\n`;
    });
    
    code += `    ]\n`;
    code += `  }`;
    return code;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getGeneratedCodeString())
      .then(() => {
        triggerToast("🚀 Hardcode code copied to clipboard successfully!", "success");
      })
      .catch(() => {
        triggerToast("Failed to copy automatically. Please select and copy manually.", "warning");
      });
  };

  // ==========================================
  // SIMULATOR QUESTION ACTIONS
  // ==========================================
  const navigateQuestion = (targetIndex) => {
    setCurrentQuestionIndex(targetIndex);
    const targetQId = questions[targetIndex].id;
    
    if (status[targetQId] === 'not-visited') {
      setStatus(prev => ({
        ...prev,
        [targetQId]: 'not-answered'
      }));
    }
  };

  const handleGridClick = (index) => {
    navigateQuestion(index);
  };

  const handleSelectOption = (optIndex) => {
    const qId = questions[currentQuestionIndex].id;
    setSelectedAnswers(prev => ({
      ...prev,
      [qId]: optIndex
    }));
  };

  const handleClearResponse = () => {
    const qId = questions[currentQuestionIndex].id;
    
    setSelectedAnswers(prev => {
      const updated = { ...prev };
      delete updated[qId];
      return updated;
    });

    setStatus(prev => ({
      ...prev,
      [qId]: 'not-answered'
    }));
  };

  const handleSaveNext = () => {
    const qId = questions[currentQuestionIndex].id;
    const isAnswered = selectedAnswers[qId] !== undefined;

    if (!isAnswered) {
      triggerToast("Select option choice before saving.", "warning");
      return;
    }

    setStatus(prev => ({
      ...prev,
      [qId]: 'answered'
    }));

    if (currentQuestionIndex < questions.length - 1) {
      navigateQuestion(currentQuestionIndex + 1);
    } else {
      triggerToast("Last question. Use palette to review paper.", "success");
    }
  };

  const handleMarkReviewNext = () => {
    const qId = questions[currentQuestionIndex].id;
    const isAnswered = selectedAnswers[qId] !== undefined;

    setStatus(prev => ({
      ...prev,
      [qId]: isAnswered ? 'answered-marked' : 'marked'
    }));

    if (currentQuestionIndex < questions.length - 1) {
      navigateQuestion(currentQuestionIndex + 1);
    } else {
      triggerToast("Marked! Simulator remains on last question.", "success");
    }
  };

  // ==========================================
  // FLOATING CALCULATOR TRIGGERS
  // ==========================================
  const handleCalcBtnClick = (val) => {
    if (val === 'C') {
      setCalcInput('');
    } else if (val === 'Del' || val === '←') {
      setCalcInput(prev => prev.slice(0, -1));
    } else if (val === '=') {
      try {
        const sanitized = calcInput
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/[^0-9+\-*/.()]/g, '');
        
        if (!sanitized) return;
        const result = Function(`return (${sanitized})`)();
        const roundedResult = Number(Math.round(result + 'e+6') + 'e-6');
        setCalcInput(String(roundedResult));
      } catch (err) {
        setCalcInput('Error');
      }
    } else if (val === '√') {
      try {
        const value = Function(`return (${calcInput.replace(/×/g, '*').replace(/÷/g, '/')})`)();
        if (value < 0) {
          setCalcInput('Error');
        } else {
          setCalcInput(String(Math.sqrt(value)));
        }
      } catch (err) {
        setCalcInput('Error');
      }
    } else {
      setCalcInput(prev => {
        if (prev === 'Error') return val;
        return prev + val;
      });
    }
  };

  // ==========================================
  // PAPER SUBMISSION & HISTORY PERSIST
  // ==========================================
  const submitExamDirectly = () => {
    const resultsData = calculateResults();
    
    // Calculate time spent (initial time - time left)
    const initialTime = (questions.length || 25) * 60;
    const timeSpent = initialTime - timeLeft;
    
    // Track test completion
    trackTestCompleted(
      activeSheetTitle,
      resultsData.score,
      resultsData.accuracy,
      timeSpent
    );
    
    try {
      const attemptId = `attempt_${Date.now()}`;
      const newAttempt = {
        attemptId,
        sheetId: activeSheetId,
        sheetTitle: activeSheetTitle,
        score: resultsData.score,
        maxMarks: resultsData.maxMarks,
        accuracy: resultsData.accuracy,
        correctCount: resultsData.correctCount,
        incorrectCount: resultsData.incorrectCount,
        unattemptedCount: resultsData.unattemptedCount,
        attemptedCount: resultsData.attemptedCount,
        totalQuestions: questions.length,
        timestamp: new Date().toISOString(), // Use ISO string for proper date parsing
        selectedAnswers: { ...selectedAnswers },
        status: { ...status },
        timeSpent: timeSpent
      };

      // Save to Firestore via DataContext (SINGLE WRITE)
      addExamAttempt(attemptId, newAttempt);

      // Clear the active test
      localStorage.removeItem('super100_active_test');
      removeActiveTest();
    } catch (e) {
      // If localStorage fails, still show results but warn user
      triggerToast("Results displayed but not saved. Check browser storage.", "warning");
    }

    setShowSubmitConfirm(false);
    setIsExamSubmitted(true);
    setAppMode('results');
    // Exit fullscreen after submission
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
        // Silent fail if fullscreen exit is blocked
      });
    }
    triggerToast("Mock paper submitted successfully!", "success");
  };

  const handleRestart = () => {
    const sheet = availableSheets.find(s => s.id === activeSheetId);
    if (!sheet) {
      triggerToast("Error: Sheet not found.", "warning");
      return;
    }
    
    // Clear any saved test state for this sheet
    try {
      localStorage.removeItem('super100_active_test');
    } catch (e) {
      // Silent fail
    }
    
    setQuestions(sheet.questions);
    setActiveSheetId(sheet.id);
    setActiveSheetTitle(sheet.title);
    
    const initialStatus = {};
    sheet.questions.forEach((q, idx) => {
      initialStatus[q.id] = idx === 0 ? 'not-answered' : 'not-visited';
    });
    setStatus(initialStatus);

    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    // Dynamic timer duration based on question count: 1 minute per question
    const durationSeconds = (sheet.questions?.length || 25) * 60;
    setTimeLeft(durationSeconds);
    setIsExamSubmitted(false);
    
    setAppMode('exam');
    // Re-enter fullscreen for restarted exam
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Silent fail if fullscreen is not supported
      });
    }
    triggerToast("Practice session restarted!", "success");
  };

  const handleReviewAttempt = (attempt) => {
    const sheet = availableSheets.find(s => s.id === attempt.sheetId);
    if (!sheet) {
      triggerToast("Error: Sheet questions not found.", "warning");
      return;
    }
    setQuestions(sheet.questions);
    setActiveSheetId(attempt.sheetId);
    setActiveSheetTitle(attempt.sheetTitle);
    setSelectedAnswers(attempt.selectedAnswers || {});
    setStatus(attempt.status || {});
    setIsExamSubmitted(true);
    setAppMode('results');
    triggerToast(`Reviewing solutions for: ${attempt.sheetTitle}`, "success");
  };

  const handleDeleteAttempt = async (attemptId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this test attempt?")) return;
    await deleteAttempt(attemptId);
    try { localStorage.removeItem('super100_exam_attempts'); } catch (e) {}
    triggerToast("Attempt deleted from history.", "success");
  };

  const handleClearAllHistory = async () => {
    if (!window.confirm("🚨 Permanently delete ALL attempt history? This cannot be undone.")) return;
    await clearAllHistory();
    triggerToast("All attempt history cleared!", "success");
  };

  // ==========================================
  // RESULTS PERFORMANCE CALCULATOR
  // ==========================================
  const calculateResults = () => {
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    questions.forEach(q => {
      const selected = selectedAnswers[q.id];
      const sState = status[q.id];
      
      const isAttempted = sState === 'answered' || sState === 'answered-marked';
      
      if (isAttempted && selected !== undefined) {
        if (selected === q.correctOption) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      } else {
        unattemptedCount++;
      }
    });

    const totalQuestions = questions.length;
    const attemptedCount = correctCount + incorrectCount;
    
    const score = (correctCount * 2.0) - (incorrectCount * 0.5);
    const maxMarks = totalQuestions * 2.0;
    
    const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
    const percentile = Math.round((score / maxMarks) * 100);

    let performanceLabel = "Excellent";
    let perfColor = "#10b981";
    if (score >= (totalQuestions * 1.6)) {
      performanceLabel = "Saini's Top 1% Ranker";
      perfColor = "#8b5cf6";
    } else if (score >= (totalQuestions * 1.2)) {
      performanceLabel = "Highly Competent";
      perfColor = "#10b981";
    } else if (score >= (totalQuestions * 0.8)) {
      performanceLabel = "Average Performer";
      perfColor = "#f59e0b";
    } else {
      performanceLabel = "Needs Math Practice";
      perfColor = "#ef4444";
    }

    return {
      correctCount,
      incorrectCount,
      unattemptedCount,
      attemptedCount,
      score,
      maxMarks,
      accuracy,
      percentile,
      performanceLabel,
      perfColor
    };
  };

  // ==========================================
  // USE DERIVED STATS FROM CONTEXT
  const overallStats = getOverallStats();

  // ==========================================
  // DASHBOARD CHAPTER FOLDER GROUPERS
  // ==========================================
  const getGroupedChapters = () => {
    const chapters = {};
    availableSheets.forEach(sheet => {
      let chapterName = "General Math";
      const title = sheet.title || "";
      
      if (title.toLowerCase().includes("percentage")) {
        chapterName = "Percentage";
      } else if (title.toLowerCase().includes("ratio")) {
        chapterName = "Ratio & Proportion";
      } else if (title.toLowerCase().includes("profit")) {
        chapterName = "Profit & Loss";
      } else {
        const hyphenIdx = title.indexOf("-");
        const sheetIdx = title.toLowerCase().indexOf("sheet");
        if (hyphenIdx !== -1) {
          chapterName = title.substring(0, hyphenIdx).trim();
        } else if (sheetIdx !== -1) {
          chapterName = title.substring(0, sheetIdx).trim();
        } else {
          chapterName = title.trim();
        }
      }
      
      if (!chapters[chapterName]) {
        chapters[chapterName] = [];
      }
      chapters[chapterName].push(sheet);
    });
    return chapters;
  };

  const toggleFolderExpansion = (folderName) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  const groupedChapters = getGroupedChapters();

  // ==========================================
  // MATHEMATICAL NOTATION CUSTOM ENGINE
  // ==========================================
  const renderMath = (text) => {
    if (!text) return "";
    let formatted = text;
    
    formatted = formatted.replace(/\$\$(.*?)\$\$/gs, (match, p1) => {
      return `<div class="math-block">${processMathSymbols(p1)}</div>`;
    });
    
    formatted = formatted.replace(/\$(.*?)\$/g, (match, p1) => {
      return `<span class="math-inline">${processMathSymbols(p1)}</span>`;
    });
    
    formatted = formatted.replace(/\n/g, '<br/>');
    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const processMathSymbols = (mathStr) => {
    let res = mathStr;
    
    while (res.includes("\\frac")) {
      res = res.replace(/\\frac\s*{(.*?)}{(.*?)}/g, 
        '<span class="math-frac"><span class="math-num">$1</span><span class="math-den">$2</span></span>'
      );
    }
    
    res = res.replace(/\\times/g, " × ");
    res = res.replace(/\\implies/g, " ⇒ ");
    res = res.replace(/\\approx/g, " ≈ ");
    res = res.replace(/\\text\s*{(.*?)}/g, '<span class="math-text">$1</span>');
    res = res.replace(/\\sqrt\s*{(.*?)}/g, "√$1");
    res = res.replace(/\\le/g, " ≤ ");
    res = res.replace(/\\ge/g, " ≥ ");
    res = res.replace(/\\%/g, "%");
    res = res.replace(/\\;/g, " &nbsp; ");
    
    const variables = ["A", "B", "C", "D", "x", "y", "k"];
    variables.forEach(v => {
      const reg = new RegExp(`\\b${v}\\b`, 'g');
      res = res.replace(reg, `<span class="math-var">${v}</span>`);
    });

    res = res.replace(/P_0/g, '<span class="math-var">P<sub>0</sub></span>');
    res = res.replace(/P_1/g, '<span class="math-var">P<sub>1</sub></span>');
    res = res.replace(/P_2/g, '<span class="math-var">P<sub>2</sub></span>');
    res = res.replace(/P_3/g, '<span class="math-var">P<sub>3</sub></span>');
    res = res.replace(/P_4/g, '<span class="math-var">P<sub>4</sub></span>');
    res = res.replace(/P_{\\text{final}}/g, '<span class="math-var">P<sub>final</sub></span>');
    
    return res;
  };

  const renderToast = () => {
    if (!toast) return null;
    return (
      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        padding: '12px 24px',
        backgroundColor: toast.type === 'success' ? '#10b981' : toast.type === 'warning' ? '#f59e0b' : '#3b82f6',
        color: '#ffffff',
        borderRadius: '8px',
        zIndex: 5000,
        fontWeight: 'bold',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
        animation: 'slide-down 0.25s ease-out'
      }}>
        {toast.type === 'success' && <CheckCircle size={18} />}
        {toast.type === 'warning' && <AlertCircle size={18} />}
        <span>{toast.text}</span>
      </div>
    );
  };

  // Helper bindings
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainSecs).padStart(2, '0')}`;
  };

  const getExamSummary = () => {
    let answered = 0;
    let answeredMarked = 0;
    let notAnswered = 0;
    let notVisited = 0;
    let marked = 0;

    questions.forEach(q => {
      const qStatus = status[q.id];
      if (qStatus === 'answered') answered++;
      else if (qStatus === 'answered-marked') answeredMarked++;
      else if (qStatus === 'not-answered') notAnswered++;
      else if (qStatus === 'not-visited') notVisited++;
      else if (qStatus === 'marked') marked++;
    });

    return { answered, answeredMarked, notAnswered, notVisited, marked };
  };

  const activeQuestion = questions[currentQuestionIndex] || { id: 1, question: '', questionHindi: '', options: ['', '', '', ''], optionsHindi: ['', '', '', ''], correctOption: 0 };
  const summary = getExamSummary();
  const results = isExamSubmitted ? calculateResults() : null;

  // Calculate review simulator lists if the exam is submitted
  const correctQs = isExamSubmitted ? questions.filter(q => {
    const uAnswer = selectedAnswers[q.id];
    const uState = status[q.id];
    const isAttempted = uState === 'answered' || uState === 'answered-marked';
    return isAttempted && uAnswer === q.correctOption;
  }) : [];

  const incorrectQs = isExamSubmitted ? questions.filter(q => {
    const uAnswer = selectedAnswers[q.id];
    const uState = status[q.id];
    const isAttempted = uState === 'answered' || uState === 'answered-marked';
    return isAttempted && uAnswer !== q.correctOption;
  }) : [];

  const unattemptedQs = isExamSubmitted ? questions.filter(q => {
    const uAnswer = selectedAnswers[q.id];
    const uState = status[q.id];
    const isAttempted = uState === 'answered' || uState === 'answered-marked';
    return !isAttempted || uAnswer === undefined;
  }) : [];

  const bookmarkedQs = isExamSubmitted ? questions.filter(q => isBookmarked(q.id)) : [];

  let filteredQuestions = [];
  if (isExamSubmitted) {
    if (reviewFilter === 'all') filteredQuestions = questions;
    else if (reviewFilter === 'correct') filteredQuestions = correctQs;
    else if (reviewFilter === 'incorrect') filteredQuestions = incorrectQs;
    else if (reviewFilter === 'unattempted') filteredQuestions = unattemptedQs;
    else if (reviewFilter === 'bookmarked') filteredQuestions = bookmarkedQs;
  }

  const activeReviewIndex = isExamSubmitted ? Math.min(
    reviewQuestionIndex >= 0 ? reviewQuestionIndex : 0,
    Math.max(0, filteredQuestions.length - 1)
  ) : 0;

  const activeReviewQuestion = isExamSubmitted ? filteredQuestions[activeReviewIndex] : null;

  // ==========================================
  // RENDER APP VIEW CONTROLLERS
  // ==========================================
  
  // Combined loading screen: wait for auth AND sheet data before showing home
  const showInitialLoader = authLoading || (user && !sheetsLoaded && availableSheets.length === 0 && appMode === 'home');
  if (showInitialLoader) {
    return <SkeletonPageLoader />;
  }

  // Show login screen if not authenticated
  if (!user) {
    return <Login theme={theme} />;
  }
  
  // One-time access key gate (only if VITE_ACCESS_KEY is set in .env)
  const ACCESS_KEY_ENABLED = import.meta.env.VITE_ACCESS_KEY;
  if (ACCESS_KEY_ENABLED && !userProfile?.accessKeyVerified) {
    return <AccessKeyPrompt theme={theme} />;
  }
  
  return (
    <div className={`app-wrapper theme-${theme}`}>
      {renderToast()}

      {/* HEADER NAVBAR */}
      <header className="main-header">
        <div className="brand-section">
          <img src="/ssc_logo.jpg" alt="SSC Logo" className="header-ssc-logo" />
          <span className="brand-title">Super Mocks</span>
          <span className="brand-badge">SSC CGL</span>
          {isAdminMode && (
            <span style={{
              marginLeft: '8px',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 'bold',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '4px',
              textTransform: 'uppercase'
            }}>
              Admin
            </span>
          )}
        </div>

        <div className="header-utils">
          
          {appMode !== 'home' && appMode !== 'admin-dashboard' && appMode !== 'mock-planner' && !(appMode === 'exam' && !isExamSubmitted) && (
            <button 
              className="btn-util" 
              onClick={handleHomeExitCheck} 
              style={{ borderColor: '#6366f1', color: '#6366f1', padding: '8px 12px' }}
              title="Home"
            >
              <Home size={18} />
            </button>
          )}

          {isAdminMode && appMode === 'home' && (
            <button 
              className="btn-util" 
              onClick={handleOpenAdminDashboard}
              style={{ borderColor: '#10b981', color: '#10b981', fontWeight: '500' }}
            >
              <BarChart2 size={14} style={{ marginRight: '4px' }} />
              <span>Users</span>
            </button>
          )}

          {appMode === 'home' && (
            <button 
              className="btn-util" 
              onClick={handleOpenMockPlanner}
              style={{ borderColor: '#6366f1', color: '#6366f1', fontWeight: '500' }}
            >
              <Calendar size={14} style={{ marginRight: '4px' }} />
              <span>Planner</span>
            </button>
          )}

          {(appMode === 'admin-dashboard' || appMode === 'mock-planner') && (
            <button 
              className="btn-util" 
              onClick={() => setAppMode('home')}
              style={{ borderColor: '#6366f1', color: '#6366f1', padding: '8px 12px' }}
              title="Home"
            >
              <Home size={18} />
            </button>
          )}



          {appMode === 'exam' && !isExamSubmitted && (
            <>
              {testMode === 'mock' && (
                <div className={`timer-container ${timeLeft < 300 ? 'timer-warning' : ''} ${isExamPaused ? 'timer-paused' : ''}`}>
                  <Clock size={16} />
                  <span>{isExamPaused ? 'PAUSED' : `Time Left: ${formatTime(timeLeft)}`}</span>
                </div>
              )}
              
              {testMode === 'practice' && (
                <div style={{
                  padding: '6px 12px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>📚</span>
                  <span>Practice Mode</span>
                </div>
              )}
              
              <button 
                className="btn-util" 
                onClick={handlePauseToggle}
                style={{ 
                  borderColor: isExamPaused ? '#10b981' : '#f59e0b', 
                  color: isExamPaused ? '#10b981' : '#f59e0b',
                  fontWeight: 'bold'
                }}
              >
                {isExamPaused ? (
                  <>
                    <Play size={14} style={{ marginRight: '4px' }} />
                    <span>Resume Test</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '16px', marginRight: '4px' }}>⏸</span>
                    <span>Pause Test</span>
                  </>
                )}
              </button>
            </>
          )}

          <button 
            className="btn-toggle-theme" 
            title="Toggle Dashboard Theme"
            onClick={() => {
              const newTheme = theme === 'tcs' ? 'premium' : 'tcs';
              setTheme(newTheme);
              trackThemeChanged(newTheme);
            }}
          >
            {theme === 'tcs' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <button className="btn-util" onClick={() => setShowInstructions(true)}>
            <Info size={14} />
            <span>Instructions</span>
          </button>

          <button className="btn-util" onClick={() => setShowShortcuts(true)}>
            <Keyboard size={14} />
            <span>Hotkeys</span>
          </button>

          {appMode === 'home' && (
            <button 
              className="btn-util" 
              onClick={logout}
              style={{ 
                borderColor: '#ef4444', 
                color: '#ef4444',
                fontWeight: 'bold'
              }}
              title="Logout from platform"
            >
              <XCircle size={14} />
              <span>Logout</span>
            </button>
          )}

          <div className="cand-brief" onClick={() => {
            setTempName(candidateName);
            setTempAvatar(candidateAvatar);
            setShowOnboarding(true);
          }} style={{ cursor: 'pointer' }}>
            <img src={candidateAvatar || "/candidate_avatar.png"} alt="Candidate avatar" className="avatar-brief" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{candidateName || "Prerna Sharma"}</span>
              <span style={{ fontSize: '10px', opacity: 0.8 }}>Roll: 2201004523 (Edit)</span>
            </div>
          </div>
        </div>
      </header>

      {/* ==========================================
         PATH 1. THE MAIN CHAPTER DASHBOARD (HOME)
         ========================================== */}
      {appMode === 'home' && (
        <div className="home-container">
          
          <div className="premium-hero-card">
            <div className="hero-content-left">
              <div className="badge-govt-officer">
                <span className="badge-dot"></span>
                <span>OFFICIAL SSC CGL PREP PORTAL</span>
              </div>
              <h1 className="hero-heading">
                Master Quantitative Aptitude with <span className="text-gradient-purple">Super 100 Mocks</span>
              </h1>
              <p className="hero-desc">
                High-yield bilingual mock tests with detailed score analysis. Experience official CBT exam standard environments with real-time analytics.
              </p>
              
              <div className="hero-actions">
                <button className="btn-hero-primary" onClick={() => {
                  const baseline = availableSheets.find(s => s.id === 'percentage_sheet_1');
                  if (baseline) handleLaunchMockRequest(baseline);
                  else triggerToast("Launch baseline mock sheet directly", "info");
                }}>
                  <Play size={16} fill="currentColor" style={{ marginRight: '4px' }} />
                  <span>Start Practice Sheet ➔</span>
                </button>
                {isAdminMode && (
                  <>
                    <button className="btn-hero-secondary" onClick={handleNewMockRequest}>
                      <Sliders size={16} style={{ marginRight: '4px' }} />
                      <span>Generate Custom Mock</span>
                    </button>
                    <button 
                      className="btn-hero-secondary" 
                      onClick={() => {
                        const reports = JSON.parse(localStorage.getItem('super100_issue_reports') || '[]');
                        const pendingReports = reports.filter(r => r.status === 'pending');
                        
                        if (reports.length === 0) {
                          triggerToast("No issue reports yet", "info");
                          return;
                        }
                        
                        // Show reports in a simple alert for now
                        let message = `📊 Issue Reports (${reports.length} total, ${pendingReports.length} pending)\n\n`;
                        reports.slice(-5).reverse().forEach((report, idx) => {
                          message += `${idx + 1}. ${report.sheetTitle} - Q${report.questionId}\n`;
                          message += `   Issue: ${report.issueDescription.substring(0, 50)}...\n`;
                          message += `   By: ${report.reportedBy} | ${new Date(report.timestamp).toLocaleDateString()}\n\n`;
                        });
                        
                        alert(message + '\nOpen browser console and run:\nJSON.parse(localStorage.getItem("super100_issue_reports"))\nto see full details.');
                      }}
                      style={{ position: 'relative' }}
                    >
                      <AlertCircle size={16} style={{ marginRight: '4px' }} />
                      <span>View Reports</span>
                      {(() => {
                        const reports = JSON.parse(localStorage.getItem('super100_issue_reports') || '[]');
                        const pending = reports.filter(r => r.status === 'pending').length;
                        return pending > 0 ? (
                          <span style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {pending}
                          </span>
                        ) : null;
                      })()}
                    </button>
                  </>
                )}
                 <button className="btn-hero-secondary" onClick={() => setTheme(prev => prev === 'tcs' ? 'premium' : 'tcs')} title="Toggle Dashboard Theme">
                  {theme === 'tcs' ? <Moon size={16} style={{ marginRight: '4px' }} /> : <Sun size={16} style={{ marginRight: '4px' }} />}
                  <span>Theme: {theme === 'tcs' ? 'Light' : 'Dark'}</span>
                </button>
                <button className="btn-hero-secondary" onClick={() => {
                  setTempName(candidateName);
                  setTempAvatar(candidateAvatar);
                  setShowOnboarding(true);
                }} title="Update Candidate Profile">
                  <PlusCircle size={16} style={{ marginRight: '4px' }} />
                  <span>Candidate: {candidateName || 'Setup Profile'}</span>
                </button>
              </div>

              <div className="hero-trust-badges">
                <div className="trust-item">
                  <CheckCircle size={14} className="icon-gold" />
                  <span>Bilingual (EN/HI)</span>
                </div>
                <div className="trust-item">
                  <CheckCircle size={14} className="icon-gold" />
                  <span>SSC CGL CBT TEST</span>
                </div>
                <div className="trust-item">
                  <CheckCircle size={14} className="icon-gold" />
                  <span>Abhas Saini Solved</span>
                </div>
              </div>
            </div>

            <div className="hero-content-right">
              <div className="logo-glow-wrapper">
                <div className="logo-ring-outer animate-spin-slow"></div>
                <div className="logo-ring-inner"></div>
                <img src="/ssc_logo.jpg" alt="SSC Emblem" className="ssc-hero-logo" />
              </div>
              <div className="floating-badge badge-top-right">
                <TrendingUp size={14} className="badge-icon-gold" />
                <div>
                  <span className="f-title">CGL Pre & Mains</span>
                  <span className="f-desc">Top Ranks</span>
                </div>
              </div>
              <div className="floating-badge badge-bottom-left">
                <Award size={14} className="badge-icon-gold" />
                <div>
                  <span className="f-title">Practice Sheets</span>
                  <span className="f-desc">Batch Sheets</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="stats-row-home">
            <div className="stat-card-home">
              <div className="stat-icon-wrapper">
                <BarChart2 size={24} />
              </div>
              <div className="stat-info-home">
                <span className="stat-val-home">{availableSheets.length}</span>
                <span className="stat-lbl-home">Total Mock Sheets</span>
              </div>
            </div>
            <div className="stat-card-home">
              <div className="stat-icon-wrapper">
                <Award size={24} />
              </div>
              <div className="stat-info-home">
                <span className="stat-val-home">{overallStats.bestScore} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Marks</span></span>
                <span className="stat-lbl-home">Best Score</span>
              </div>
            </div>
            <div className="stat-card-home">
              <div className="stat-icon-wrapper">
                <TrendingUp size={24} />
              </div>
              <div className="stat-info-home">
                <span className="stat-val-home">{overallStats.avgAccuracy}%</span>
                <span className="stat-lbl-home">Average Accuracy</span>
              </div>
            </div>
          </div>

          {/* Resume Test Banner */}
          {(() => {
            const savedTest = localStorage.getItem('super100_active_test');
            if (savedTest) {
              try {
                const parsed = JSON.parse(savedTest);
                const answeredCount = Object.keys(parsed.selectedAnswers || {}).length;
                const totalQuestions = parsed.questions?.length || 0;
                const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
                
                return (
                  <div style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '24px',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
                    animation: 'pulse 2s ease-in-out infinite'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Clock size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                          📝 Test In Progress
                        </h3>
                        <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>
                          {parsed.sheetTitle}
                        </p>
                        <p style={{ fontSize: '12px', opacity: 0.8 }}>
                          Progress: {answeredCount}/{totalQuestions} questions ({progressPercent}%) • Time: {formatTime(parsed.timeLeft || 0)}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={() => {
                          const sheet = availableSheets.find(s => s.id === parsed.sheetId);
                          if (sheet) {
                            setPendingLaunchSheet(sheet);
                            setDeclarationChecked(false);
                            setSelectedLanguage(parsed.activeLanguage || 'en');
                            setAppMode('instructions');
                          }
                        }}
                        style={{
                          background: 'white',
                          color: '#8b5cf6',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 20px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Play size={14} fill="currentColor" />
                        Resume Test
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm('Are you sure you want to discard this test? All progress will be lost.')) {
                            localStorage.removeItem('super100_active_test');
                            triggerToast('Test discarded successfully', 'info');
                            window.location.reload();
                          }
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          color: 'white',
                          border: '1px solid rgba(255,255,255,0.3)',
                          borderRadius: '8px',
                          padding: '10px 20px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <X size={14} />
                        Discard
                      </button>
                    </div>
                  </div>
                );
              } catch (e) {
                return null;
              }
            }
            return null;
          })()}

          {/* Chapter Folders list */}
          <div className="chapter-section-header">⚡ Practice Modules</div>
          
          {!sheetsLoaded ? (
            <SkeletonSheetGrid count={8} />
          ) : (
          <div className="chapter-folders-grid">
            {Object.keys(groupedChapters).map((folderName) => {
              const sheetsList = groupedChapters[folderName];
              const isExpanded = expandedFolders[folderName];
              const attemptedCount = sheetsList.filter(s => getSheetHistory(s.id)).length;
              const isFullyCompleted = attemptedCount === sheetsList.length && sheetsList.length > 0;
              
              return (
                <div key={folderName} className={`chapter-folder-card ${isExpanded ? 'expanded' : ''}`}>
                  
                  {/* Folder trigger row */}
                  <div className="chapter-folder-header" onClick={() => toggleFolderExpansion(folderName)}>
                    <div className="folder-title-block">
                      <div className="folder-icon-wrapper">
                        <Folder size={18} fill={theme === 'premium' ? "rgba(139,92,246,0.25)" : "rgba(51,122,183,0.12)"} />
                      </div>
                      <span className="folder-title">{folderName}</span>
                      <span className="folder-sheets-count">{sheetsList.length} {sheetsList.length === 1 ? 'Sheet' : 'Sheets'}</span>
                    </div>

                    <div className="folder-chevron-block">
                      {isFullyCompleted ? (
                        <span className="topic-progress-badge completed">
                          <Check size={10} style={{ marginRight: '3px' }} /> Completed
                        </span>
                      ) : attemptedCount > 0 ? (
                        <span className="topic-progress-badge in-progress">
                          {attemptedCount}/{sheetsList.length} Done
                        </span>
                      ) : null}
                      <div className={`folder-chevron-icon ${isExpanded ? 'rotated' : ''}`}>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </div>

                  {/* expanded list cards inside folder */}
                  {isExpanded && (
                    <div className="folder-sheets-container">
                      {sheetsList.map((sheet) => {
                        const previousAttempt = getSheetHistory(sheet.id);
                        return (
                          <div key={sheet.id} className="topic-sheet-row">
                            
                            <div className="sheet-row-left">
                              <div className="sheet-row-icon">
                                <FileText size={16} />
                              </div>
                              <div className="sheet-row-info">
                                <span className="sheet-row-title">{sheet.title}</span>
                                <div className="sheet-row-specs">
                                  <span>{sheet.questions.length} Qs</span>
                                  <span className="spec-dot">•</span>
                                  <span>{sheet.questions.length * 2} Marks</span>
                                </div>
                              </div>
                            </div>

                            <div className="sheet-row-right">
                              <div className="sheet-row-status">
                                {previousAttempt ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                    <span className="sheet-row-attempted-badge">
                                      Best: {previousAttempt.score} pts ({previousAttempt.accuracy}%)
                                    </span>
                                    {previousAttempt.correctCount !== undefined && (
                                      <div className="sheet-row-micro-stats">
                                        <span className="micro-stat correct" title="Right Answers">✔️{previousAttempt.correctCount}</span>
                                        <span className="micro-stat incorrect" title="Wrong Answers">❌{previousAttempt.incorrectCount}</span>
                                        <span className="micro-stat unattempted" title="Unattempted">➖{previousAttempt.unattemptedCount}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="sheet-row-unattempted">Unattempted</span>
                                )}
                              </div>

                              <div className="sheet-row-actions">
                                {isAdminMode && (
                                  <>
                                    <button className="btn-row-action btn-edit" onClick={() => handleEditExistingSheet(sheet)} title="Edit Chapter Sheet">
                                      <Edit size={13} />
                                    </button>
                                    <button className="btn-row-action btn-delete" onClick={() => handleDeleteSheetRequest(sheet.id)} title="Delete permanently off disk">
                                      <Trash2 size={13} />
                                    </button>
                                  </>
                                )}
                                {previousAttempt && (
                                  <button 
                                    className="btn-row-action btn-analytics" 
                                    onClick={() => setAnalyticsModalSheet(sheet)} 
                                    title="View Sheet Analytics & Past Attempts"
                                    style={{ borderColor: '#10b981', color: '#10b981' }}
                                  >
                                    <BarChart2 size={13} />
                                  </button>
                                )}
                                <button 
                                  className="btn-row-launch" 
                                  onClick={() => handleLaunchMockRequest(sheet)}
                                >
                                  <Play size={12} />
                                  <span>Start Exam</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}

            {/* Glowing setup launcher trigger - only visible in admin mode */}
            {isAdminMode && (
              <div className="sheet-card-create" onClick={handleNewMockRequest}>
                <div className="create-icon-wrapper">
                  <PlusCircle size={28} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '4px' }}>
                  Create Custom Mock Sheet
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Paste PDF text, click correct options, and take the bilingual CBT mock test immediately.
                </p>
              </div>
            )}
          </div>
          )}

        </div>
      )}

      {/* ==========================================
         PATH 2. SETUP RAW SHEET VIEW
         ========================================== */}
      {appMode === 'setup' && (
        <div className="setup-container">
          <div className="dashboard-title">
            <span>⚙️ SSC CGL Mock Generator - Paste Sheet</span>
          </div>

          <div className="setup-grid">
            <div className="setup-card">
              <div className="dashboard-subtitle">New Test Configurations</div>
              
              <div className="form-row">
                <div className="form-group">
                  <span className="form-label">Chapter Title / Name</span>
                  <input 
                    type="text" 
                    className="form-input"
                    value={setupChapterName}
                    onChange={(e) => setSetupChapterName(e.target.value)}
                    placeholder="e.g. Percentage Sheet 2"
                  />
                </div>
                <div className="form-group">
                  <span className="form-label">Sheet Number</span>
                  <input 
                    type="number" 
                    className="form-input"
                    value={setupSheetNumber}
                    onChange={(e) => setSetupSheetNumber(e.target.value)}
                    placeholder="e.g. 2"
                  />
                </div>
              </div>

              <div className="form-group">
                <span className="form-label">Pasted Sheet Content (Questions & Options)</span>
                <textarea 
                  className="form-textarea"
                  value={setupRawText}
                  onChange={(e) => setSetupRawText(e.target.value)}
                  placeholder="Paste questions here in the following structure..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button className="btn-restart" onClick={handleStartParsing}>
                  <Play size={14} style={{ marginRight: '6px' }} />
                  Continue to Answer Selection
                </button>
              </div>
            </div>

            {/* Instruction helper panel */}
            <div className="guide-card">
              <div className="dashboard-subtitle">How It Works</div>
              
              <div className="guide-step">
                <span className="guide-step-number">1</span>
                <span>Specify the chapter title and sheet number.</span>
              </div>
              <div className="guide-step">
                <span className="guide-step-number">2</span>
                <span>Paste raw questions. Every question must be numbered (e.g. <code>Q.1</code> or <code>Q1.</code>) and must have options starting with lowercase brackets: <code>(a)</code>, <code>(b)</code>, <code>(c)</code>, <code>(d)</code>.</span>
              </div>
              <div className="guide-step">
                <span className="guide-step-number">3</span>
                <span>To paste bilingual papers, add <code>Q1(Hindi).</code> blocks right below your English text. Our engine will map Devanagari unicodes automatically.</span>
              </div>
              
              <span className="form-label" style={{ marginTop: '12px', display: 'block' }}>Correct Format Example:</span>
              <div className="sample-code-box">
                Q.1 What is 5% of 50% of 500? (a) 12.5 (b) 25 (c) 1.25 (d) 6.25
                {"\n"}
                Q.1(Hindi) 500 का 50% का 5% क्या है? (a) 12.5 (b) 25 (c) 1.25 (d) 6.25
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         PATH 3. BILINGUAL PREVIEW & ANSWER KEY EDITOR
         ========================================== */}
      {appMode === 'preview' && (
        <div className="preview-container">
          
          <div className="preview-header-bar">
            <div style={{ textSelf: 'left', textAlign: 'left' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>⚡ Bilingual Sheet Review & Answer Key Setup</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Review parsed English and Hindi sheets, adjust typos, and **click on Option Cards** to set the correct answer keys.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-action btn-clear" onClick={() => setAppMode('setup')}>
                ← Back to Paste
              </button>
              <button className="btn-action btn-review-next" onClick={() => setShowCodeExporter(true)}>
                💾 Export Hardcode Code
              </button>
              <button className="btn-restart" onClick={handleSaveAndLoadCustomSimulator}>
                💾 Save Chapter & Launch Exam
              </button>
            </div>
          </div>

          {/* List of parsed editable questions */}
          <div className="preview-list">
            {setupQuestions.map((q, idx) => {
              return (
                <div key={idx} className="preview-q-card">
                  <div className="preview-q-meta">
                    <span style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--accent-color)' }}>Question {idx + 1}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                      Correct Answer: <span style={{ color: '#10b981' }}>Option ({String.fromCharCode(97 + q.correctOption)})</span>
                    </span>
                  </div>

                  {/* Question body bilingual row */}
                  <div className="bilingual-editor-row">
                    <div className="form-group">
                      <span className="form-label" style={{ fontSize: '12px' }}>English Question</span>
                      <textarea 
                        className="form-input"
                        style={{ minHeight: '60px', fontFamily: 'inherit' }}
                        value={q.question}
                        onChange={(e) => handleUpdateQTextBilingual(idx, e.target.value, false)}
                      />
                    </div>
                    <div className="form-group hi-input-group">
                      <span className="form-label" style={{ fontSize: '12px', color: '#f59e0b' }}>Hindi Question (हिन्दी प्रश्न)</span>
                      <textarea 
                        className="form-input"
                        style={{ minHeight: '60px', fontFamily: 'inherit', borderColor: 'rgba(245,158,11,0.3)' }}
                        value={q.questionHindi}
                        onChange={(e) => handleUpdateQTextBilingual(idx, e.target.value, true)}
                      />
                    </div>
                  </div>

                  {/* Options row */}
                  <span className="form-label" style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    Option Choices (Click card border to set correct answer • Click text to edit)
                  </span>
                  
                  <div className="preview-opt-bilingual-grid">
                    {q.options.map((opt, oIdx) => {
                      const letter = String.fromCharCode(97 + oIdx);
                      const isCorrect = q.correctOption === oIdx;
                      
                      return (
                        <div 
                          key={oIdx}
                          className={`opt-bilingual-card ${isCorrect ? 'correct-choice' : ''}`}
                          onClick={() => handleSetCorrectOption(idx, oIdx)}
                        >
                          <div className="opt-bilingual-header">
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Option ({letter.toUpperCase()})</span>
                            {isCorrect && <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold' }}>✓ CORRECT KEY</span>}
                          </div>
                          
                          <div className="opt-bilingual-inputs-row">
                            <input 
                              type="text" 
                              className="opt-text-input"
                              value={opt}
                              onChange={(e) => handleUpdateOptTextBilingual(idx, oIdx, e.target.value, false)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="English option text"
                              title="Click to edit English option"
                            />
                            <input 
                              type="text" 
                              className="opt-text-input"
                              style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '8px', color: '#f59e0b' }}
                              value={q.optionsHindi[oIdx]}
                              onChange={(e) => handleUpdateOptTextBilingual(idx, oIdx, e.target.value, true)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="हिंदी विकल्प पाठ"
                              title="Click to edit Hindi option"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Diagram URL input */}
                  <div style={{ marginTop: '8px' }}>
                    <span className="form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                      📐 Diagram URL (Cloudinary) <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>— optional</span>
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 1, fontSize: '12px', fontFamily: 'monospace' }}
                        value={q.diagramUrl || ''}
                        onChange={(e) => handleUpdateDiagramUrl(idx, e.target.value)}
                        placeholder="https://res.cloudinary.com/..."
                      />
                      {q.diagramUrl && (
                        <img
                          src={q.diagramUrl}
                          alt="preview"
                          style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', gap: '16px' }}>
            <button className="btn-action btn-clear" style={{ padding: '10px 24px' }} onClick={() => setAppMode('setup')}>
              ← Go Back & Adjust Text
            </button>
            <button className="btn-restart" style={{ padding: '10px 30px' }} onClick={handleSaveAndLoadCustomSimulator}>
              💾 Save Chapter & Run Simulator Now
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
         PATH 3.5: MODE SELECTION SCREEN
         ========================================== */}
      {appMode === 'mode-selection' && pendingLaunchSheet && (
        <div className="ion-container">
          <div className="ion-title-bar">
            Select Test Mode — {pendingLaunchSheet.title}
          </div>

          <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center', color: 'var(--text-main)' }}>
              Choose Your Test Mode
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '40px' }}>
              Select how you want to attempt this test
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              
              {/* Mock Mode Card */}
              <div 
                className="mode-selection-card"
                onClick={() => handleModeSelected('mock')}
                style={{
                  border: '2px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '32px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'var(--bg-primary)',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#8b5cf6';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '16px', textAlign: 'center' }}>⏱️</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center', color: 'var(--text-main)' }}>
                  Mock Mode
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '16px' }}>
                  Simulate real exam conditions with a timer. No answer feedback during the test. See results only after submission.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} color="#10b981" />
                    <span>Timed test ({pendingLaunchSheet.questions.length} minutes)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} color="#10b981" />
                    <span>No instant feedback</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} color="#10b981" />
                    <span>Real exam simulation</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} color="#10b981" />
                    <span>Detailed results after submission</span>
                  </div>
                </div>
                <button 
                  style={{
                    width: '100%',
                    marginTop: '20px',
                    padding: '12px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Start Mock Test →
                </button>
              </div>

              {/* Practice Mode Card */}
              <div 
                className="mode-selection-card"
                onClick={() => handleModeSelected('practice')}
                style={{
                  border: '2px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '32px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'var(--bg-primary)',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '16px', textAlign: 'center' }}>📚</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center', color: 'var(--text-main)' }}>
                  Practice Mode
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '16px' }}>
                  Learn while you practice. Get instant feedback after each question. Perfect for understanding concepts.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} color="#10b981" />
                    <span>No time pressure</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} color="#10b981" />
                    <span>Instant answer feedback</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} color="#10b981" />
                    <span>See correct answers immediately</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} color="#10b981" />
                    <span>Learn from mistakes</span>
                  </div>
                </div>
                <button 
                  style={{
                    width: '100%',
                    marginTop: '20px',
                    padding: '12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Start Practice →
                </button>
              </div>

            </div>

            <div style={{ textAlign: 'center' }}>
              <button 
                className="btn-ion btn-clear" 
                onClick={() => setAppMode('home')}
                style={{ padding: '10px 24px' }}
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         PATH 4. THE iON CBT EXAM GENERAL INSTRUCTIONS SCREEN
         ========================================== */}
      {appMode === 'instructions' && pendingLaunchSheet && (
        <div className="ion-container">
          <div className="ion-title-bar">
            Super Mocks — General Instructions
          </div>

          {/* Language selection block */}
          <div className="ion-lang-selector-row">
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Choose your default language:</span>
            <select 
              className="sheet-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="hi">Hindi (हिन्दी)</option>
            </select>
          </div>

          {/* Instructions bodies based on selected language */}
          <div className="ion-instructions-box">
            {selectedLanguage === 'en' ? (
              <>
                <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>Please read the instructions carefully</h3>
                <h4 style={{ fontWeight: 'bold', color: '#337ab7', marginTop: '12px' }}>General Instructions:</h4>
                <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>
                  <li>The total duration of the examination is {pendingLaunchSheet?.questions?.length || 25} minutes for this batch sheet.</li>
                  <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the exam.</li>
                  <li>When the timer reaches zero, the exam will end by itself. You will not be required to end or submit your exam.</li>
                </ol>
                <h4 style={{ fontWeight: 'bold', color: '#337ab7', marginTop: '12px' }}>Navigating to a Question:</h4>
                <ol style={{ paddingLeft: '20px', margin: '8px 0' }} start="4">
                  <li>Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.</li>
                  <li>Click on <strong>Save & Next</strong> to save your answer for the current question and then go to the next question.</li>
                  <li>Click on <strong>Mark for Review & Next</strong> to save your answer for the current question, mark it for review, and then go to the next question.</li>
                </ol>
              </>
            ) : (
              <>
                <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>कृपया निम्नलिखित निर्देशों को ध्यान से पढ़ें</h3>
                <h4 style={{ fontWeight: 'bold', color: '#f59e0b', marginTop: '12px' }}>सामान्य निर्देश:</h4>
                <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>
                  <li>इस परीक्षा पत्र के लिए कुल परीक्षा की अवधि {pendingLaunchSheet?.questions?.length || 25} मिनट है।</li>
                  <li>सर्वर पर घड़ी सेट की गई है। स्क्रीन के शीर्ष दाएं कोने में उलटी गिनती घड़ी परीक्षा पूरी करने के लिए आपके पास उपलब्ध शेष समय प्रदर्शित करेगी।</li>
                  <li>जब टाइमर शून्य पर पहुंच जाएगा, तो परीक्षा अपने आप समाप्त हो जाएगी। आपको अपना परीक्षा पत्र जमा करने की आवश्यकता नहीं होगी।</li>
                </ol>
                <h4 style={{ fontWeight: 'bold', color: '#f59e0b', marginTop: '12px' }}>प्रश्नों पर नेविगेट करना:</h4>
                <ol style={{ paddingLeft: '20px', margin: '8px 0' }} start="4">
                  <li>उस नंबर वाले प्रश्न पर सीधे जाने के लिए स्क्रीन के दाईं ओर प्रश्न पैलेट में प्रश्न संख्या पर क्लिक करें। ध्यान दें कि इस विकल्प का उपयोग करने से वर्तमान प्रश्न के लिए आपका उत्तर सुरक्षित नहीं होता है।</li>
                  <li>वर्तमान प्रश्न के लिए अपना उत्तर सुरक्षित करने के लिए <strong>Save & Next</strong> पर क्लिक करें और फिर अगले प्रश्न पर जाएं।</li>
                  <li>वर्तमान प्रश्न के लिए अपना उत्तर सुरक्षित करने, उसे समीक्षा के लिए चिह्नित करने और फिर अगले प्रश्न पर जाने के लिए <strong>Mark for Review & Next</strong> पर क्लिक करें।</li>
                </ol>
              </>
            )}
          </div>

          {/* Declaration check box */}
          <div className="ion-declaration-box">
            <h4 style={{ fontWeight: 'bold', fontSize: '14px' }}>Declaration / घोषणा:</h4>
            
            <label className="ion-declaration-row">
              <input 
                type="checkbox" 
                className="declaration-checkbox"
                checked={declarationChecked}
                onChange={(e) => setDeclarationChecked(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <span>
                {selectedLanguage === 'en' ? (
                  "I have read and understood the instructions. I agree that in case of any computer hardware/software failure during the exam, I will abide by standard CGL guidelines. All allotted hardware features are in proper working condition."
                ) : (
                  "मैंने निर्देशों को पढ़ और समझ लिया है। मैं सहमत हूँ कि परीक्षा के दौरान किसी भी कंप्यूटर हार्डवेयर/सॉफ्टवेयर की विफलता के मामले में, मैं मानक CGL दिशानिर्देशों का पालन करूँगा। मुझे आवंटित सभी कंप्यूटर उपकरण ठीक काम करने की स्थिति में हैं।"
                )}
              </span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="ion-footer-actions">
            <button className="btn-ion btn-clear" onClick={() => setAppMode('home')}>
              {selectedLanguage === 'en' ? '🏠 Decline & Return' : '🏠 अस्वीकार करें'}
            </button>
            <button 
              className="btn-ion btn-ion-begin"
              disabled={!declarationChecked}
              onClick={startExamCGLSimulator}
            >
              {selectedLanguage === 'en' ? 'I am ready to begin ➔' : 'मैं परीक्षा शुरू करने के लिए तैयार हूँ ➔'}
            </button>
          </div>

        </div>
      )}

      {/* ==========================================
         PATH 5. THE CBT SIMULATOR VIEW (EXAM)
         ========================================== */}
      {appMode === 'exam' && (
        <>
          {/* Pause Overlay */}
          {isExamPaused && !showExitConfirm && (
            <div className="pause-overlay">
              <div className="pause-card">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏸</div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-main)' }}>
                  Test Paused
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                  Your test is paused. Timer is stopped. Click Resume to continue.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button 
                    className="btn-restart" 
                    onClick={() => {
                      setIsExamPaused(false);
                      trackTestResumed(activeSheetTitle);
                    }}
                    style={{ padding: '12px 32px', fontSize: '16px' }}
                  >
                    <Play size={18} style={{ marginRight: '8px' }} />
                    Resume Test
                  </button>
                  <button 
                    className="btn-action btn-clear" 
                    onClick={() => {
                      setIsExamPaused(false);
                      setShowExitConfirm(true);
                    }}
                    style={{ padding: '12px 24px' }}
                  >
                    Exit to Home
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>
                  {testMode === 'mock' ? `Time Remaining: ${formatTime(timeLeft)} • ` : ''}Questions Answered: {Object.keys(selectedAnswers).length}/{questions.length}
                </p>
              </div>
            </div>
          )}
          
        <main className="simulator-body">
          
          <section className="question-panel">
            <div className="qp-header">
              <div className="qp-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Question No. {activeQuestion.id}</span>
                {(() => { const qBookmarked = isBookmarked(activeQuestion.id); return (
                <button 
                  className={`btn-bookmark-question ${qBookmarked ? 'bookmarked' : ''}`}
                  onClick={() => toggleBookmark(activeSheetId, activeSheetTitle, activeQuestion)}
                  title={qBookmarked ? "Remove Bookmark" : "Bookmark Question"}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: qBookmarked ? '#f59e0b' : 'var(--text-muted)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                    borderColor: qBookmarked ? '#f59e0b' : 'var(--border-color)',
                    backgroundColor: qBookmarked ? 'rgba(245, 158, 11, 0.08)' : 'transparent'
                  }}
                >
                  <Bookmark size={11} fill={qBookmarked ? "#f59e0b" : "none"} color={qBookmarked ? "#f59e0b" : "currentColor"} />
                  <span>{qBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                </button>
                )})()}
                <div className="marks-info" style={{ marginLeft: '12px' }}>
                  <span>Correct: <span className="marks-positive">+2.0</span></span>
                  <span>Incorrect: <span className="marks-negative">-0.5</span></span>
                </div>
              </div>

              {/* Language toggler */}
              <div className="qp-header-utils">
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}><Globe size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} /> Language:</span>
                <select 
                  className="lang-selector"
                  value={activeLanguage}
                  onChange={(e) => {
                    setActiveLanguage(e.target.value);
                    trackLanguageChanged(e.target.value);
                  }}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                </select>
              </div>
            </div>

            {/* Question Text block */}
            <div className="question-content">
              <div className="question-text-box">
                {activeLanguage === 'hi' && activeQuestion.questionHindi ? (
                  renderMath(activeQuestion.questionHindi)
                ) : (
                  renderMath(activeQuestion.question)
                )}
              </div>
              {activeQuestion.diagramUrl ? (
                <div className="question-diagram" style={{ textAlign: 'center', margin: '12px 0', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <img src={activeQuestion.diagramUrl} alt="Diagram" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '4px' }} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              ) : null}

              {/* Option Choice buttons */}
              <div className="question-options-list">
                {activeQuestion.options.map((opt, oIdx) => {
                  const letter = String.fromCharCode(97 + oIdx);
                  const isSelected = selectedAnswers[activeQuestion.id] === oIdx;
                  const isCorrect = oIdx === activeQuestion.correctOption;
                  const showFeedback = testMode === 'practice' && selectedAnswers[activeQuestion.id] !== undefined;
                  
                  let optionClass = 'option-item';
                  if (isSelected) optionClass += ' selected';
                  if (showFeedback && isSelected && isCorrect) optionClass += ' practice-correct';
                  if (showFeedback && isSelected && !isCorrect) optionClass += ' practice-incorrect';
                  if (showFeedback && !isSelected && isCorrect) optionClass += ' practice-show-correct';
                  
                  return (
                    <div 
                      key={oIdx}
                      className={optionClass}
                      onClick={() => handleSelectOption(oIdx)}
                    >
                      <input 
                        type="radio" 
                        name={`q_${activeQuestion.id}`}
                        className="option-radio"
                        checked={isSelected}
                        onChange={() => handleSelectOption(oIdx)}
                      />
                      <span className="option-label">
                        ({letter}) &nbsp;
                        {activeLanguage === 'hi' && activeQuestion.optionsHindi && activeQuestion.optionsHindi[oIdx] ? (
                          activeQuestion.optionsHindi[oIdx]
                        ) : (
                          opt
                        )}
                        {showFeedback && isSelected && isCorrect && (
                          <span style={{ marginLeft: '8px', color: '#10b981', fontWeight: 'bold' }}>✓ Correct!</span>
                        )}
                        {showFeedback && isSelected && !isCorrect && (
                          <span style={{ marginLeft: '8px', color: '#ef4444', fontWeight: 'bold' }}>✗ Incorrect</span>
                        )}
                        {showFeedback && !isSelected && isCorrect && (
                          <span style={{ marginLeft: '8px', color: '#10b981', fontWeight: 'bold' }}>✓ Correct Answer</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer triggers */}
            <footer className="action-footer">
              <div className="footer-left">
                <button className="btn-action btn-mobile-palette-toggle" onClick={() => setShowMobilePalette(p => !p)} title="Toggle question palette">
                  {showMobilePalette ? 'Hide' : 'Show'} Palette
                </button>
                <button className="btn-action btn-review-next" onClick={handleMarkReviewNext}>
                  Mark for Review & Next
                </button>
                <button className="btn-action btn-clear" onClick={handleClearResponse}>
                  Clear Response
                </button>
                <button 
                  className="btn-action" 
                  onClick={() => setShowReportIssue(true)}
                  style={{ 
                    backgroundColor: 'transparent',
                    border: '1px solid #f59e0b',
                    color: '#f59e0b'
                  }}
                  title="Report wrong question or answer"
                >
                  <AlertCircle size={14} style={{ marginRight: '4px' }} />
                  Report Issue
                </button>
              </div>

              <div className="footer-right">
                <button className="btn-action btn-save-next" onClick={handleSaveNext}>
                  Save & Next
                </button>
              </div>
            </footer>
          </section>

          {/* Right sidebar */}
          <aside className="sidebar-panel" data-visible={showMobilePalette}>
            <div className="candidate-profile-panel">
              <img src={candidateAvatar || "/candidate_avatar.png"} alt="Candidate profile" className="avatar-large" />
              <div className="candidate-info">
                <span className="cand-name">{candidateName || "Prerna Sharma"}</span>
                <span className="cand-roll">Roll: 2201004523</span>
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>SSC CGL Aspirant</span>
              </div>
            </div>

            <div className="stats-legend-panel">
              <div className="legend-item">
                <div className="state-badge state-answered">{summary.answered + summary.answeredMarked}</div>
                <span>Answered</span>
              </div>
              <div className="legend-item">
                <div className="state-badge state-not-answered">{summary.notAnswered}</div>
                <span>Not Answered</span>
              </div>
              <div className="legend-item">
                <div className="state-badge state-not-visited">{summary.notVisited}</div>
                <span>Not Visited</span>
              </div>
              <div className="legend-item">
                <div className="state-badge state-marked">{summary.marked}</div>
                <span>Marked for Review</span>
              </div>
              <div className="legend-item" style={{ gridColumn: 'span 2' }}>
                <div className="state-badge state-answered-marked">✓</div>
                <span>Answered & Marked (Will be evaluated)</span>
              </div>
            </div>

            {/* Question Palette grid */}
            <div className="palette-section">
              <span className="palette-title">Quantitative Aptitude</span>
              <div className="palette-grid">
                {questions.map((q, idx) => {
                  const qStatus = status[q.id];
                  const isActive = idx === currentQuestionIndex;
                  const userAnswer = selectedAnswers[q.id];
                  const isAnswered = userAnswer !== undefined;
                  const isCorrect = isAnswered && userAnswer === q.correctOption;
                  
                  // In practice mode, show green for correct, red for incorrect
                  let paletteClass = `state-badge grid-item state-${qStatus}`;
                  if (testMode === 'practice' && isAnswered) {
                    paletteClass = `state-badge grid-item ${isCorrect ? 'practice-palette-correct' : 'practice-palette-incorrect'}`;
                  }
                  if (isActive) paletteClass += ' active';
                  
                  return (
                    <div 
                      key={q.id}
                      className={paletteClass}
                      onClick={() => handleGridClick(idx)}
                    >
                      {idx + 1}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sidebar-actions">
              <button 
                className="btn-sidebar btn-submit-exam"
                onClick={() => setShowSubmitConfirm(true)}
              >
                Submit Paper
              </button>
            </div>
          </aside>
        </main>
        </>
      )}

      {/* ==========================================
         PATH 6. SCORES & STEP MATH REPORT VIEW
         ========================================== */}
      {appMode === 'results' && (
        <div className="results-container">
          <div className="dashboard-title">
            <span>Quantitative Performance Analytics</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-action btn-clear" onClick={() => setAppMode('home')}>
                🏠 Back to Dashboard
              </button>
              <button className="btn-restart" onClick={handleRestart}>
                <RotateCcw size={16} style={{ marginRight: '6px' }} />
                Restart Practice Session
              </button>
            </div>
          </div>

          <div className="analytics-grid">
            <div className="analytics-card">
              <div className="dashboard-subtitle">Exam Performance Scorecard</div>
              
              <div className="score-flex">
                <div className="score-main">
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold' }}>YOUR TOTAL MARKS</span>
                  <span className="score-num">{results.score} <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>/ {results.maxMarks}</span></span>
                </div>

                <div className="performance-badges-flex">
                  <span className="badge-perf" style={{ borderColor: results.perfColor, color: results.perfColor }}>
                    <Award size={14} />
                    {results.performanceLabel}
                  </span>
                  <span className="badge-perf">
                    <TrendingUp size={14} />
                    Accuracy: {results.accuracy}%
                  </span>
                </div>
              </div>

              <div className="metrics-row">
                <div className="metric-box" style={{ borderLeft: '4px solid #10b981' }}>
                  <span className="metric-val" style={{ color: '#10b981' }}>{results.correctCount}</span>
                  <span className="metric-lbl">Correct</span>
                </div>
                <div className="metric-box" style={{ borderLeft: '4px solid #ef4444' }}>
                  <span className="metric-val" style={{ color: '#ef4444' }}>{results.incorrectCount}</span>
                  <span className="metric-lbl">Incorrect</span>
                </div>
                <div className="metric-box" style={{ borderLeft: '4px solid #64748b' }}>
                  <span className="metric-val">{results.unattemptedCount}</span>
                  <span className="metric-lbl">Unattempted</span>
                </div>
              </div>
            </div>

            <div className="analytics-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="dashboard-subtitle">Attempt Statistics</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                  <span>Total Questions:</span>
                  <span style={{ fontWeight: 'bold' }}>{questions.length}</span>
                </div>
                <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                  <span>Attempted:</span>
                  <span style={{ fontWeight: 'bold' }}>{results.attemptedCount}</span>
                </div>
                <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                  <span>Accuracy Ratio:</span>
                  <span style={{ fontWeight: 'bold', color: results.accuracy >= 80 ? '#10b981' : results.accuracy >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {results.correctCount} correct out of {results.attemptedCount}
                  </span>
                </div>
                <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                  <span>Negative Penalty:</span>
                  <span style={{ fontWeight: 'bold', color: '#ef4444' }}>-{results.incorrectCount * 0.5} Marks</span>
                </div>
              </div>
            </div>
          </div>

          {/* CBT-Style Solution Simulator Workspace */}
          <div className="dashboard-subtitle" style={{ marginBottom: '16px', marginTop: '24px' }}>
            🖥️ CBT Mock Solution Simulator / मॉक समाधान सिम्युलेटर
          </div>

          <div className="solution-simulator-body">
            {/* Left/Center Panel - Question Solution Viewer */}
            <div className="solution-question-panel">
              {activeReviewQuestion ? (
                <>
                  <div className="qp-header" style={{ borderBottom: '1px solid var(--border-color)', padding: '12px 20px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        Question No. {questions.indexOf(activeReviewQuestion) + 1}
                      </span>
                      
                      {/* Bookmark button */}
                          {(() => { const qBookmarked = isBookmarked(activeReviewQuestion.id); return (
                          <button 
                            className={`btn-bookmark-question ${qBookmarked ? 'bookmarked' : ''}`}
                            onClick={() => toggleBookmark(activeSheetId, sheet.title, activeReviewQuestion)}
                            title={qBookmarked ? "Remove Bookmark" : "Bookmark Question"}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              color: qBookmarked ? '#f59e0b' : 'var(--text-muted)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              transition: 'all 0.2s ease',
                              borderColor: qBookmarked ? '#f59e0b' : 'var(--border-color)',
                              backgroundColor: qBookmarked ? 'rgba(245, 158, 11, 0.08)' : 'transparent'
                            }}
                          >
                            <Bookmark size={11} fill={qBookmarked ? "#f59e0b" : "none"} color={qBookmarked ? "#f59e0b" : "currentColor"} />
                            <span>{qBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                          </button>
                          )})()}

                      {/* Marks / Correctness Status Pill */}
                      {(() => {
                        const uAnswer = selectedAnswers[activeReviewQuestion.id];
                        const uState = status[activeReviewQuestion.id];
                        const isAttempted = uState === 'answered' || uState === 'answered-marked';
                        const isCorrect = isAttempted && uAnswer === activeReviewQuestion.correctOption;
                        const isUnattempted = !isAttempted || uAnswer === undefined;

                        if (isCorrect) {
                          return (
                            <span className="review-badge badge-correct" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={10} /> +2.0 Marks (Correct)
                            </span>
                          );
                        } else if (isUnattempted) {
                          return (
                            <span className="review-badge badge-unattempted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <HelpCircle size={10} /> 0.0 Marks (Unattempted)
                            </span>
                          );
                        } else {
                          return (
                            <span className="review-badge badge-incorrect" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <XCircle size={10} /> -0.5 Marks (Incorrect)
                            </span>
                          );
                        }
                      })()}
                    </div>

                    {/* Language toggler */}
                    <div className="qp-header-utils" style={{ margin: 0 }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}><Globe size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} /> Language:</span>
                      <select 
                        className="lang-selector"
                        value={activeLanguage}
                        onChange={(e) => setActiveLanguage(e.target.value)}
                        style={{ padding: '2px 6px', fontSize: '11px' }}
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi (हिन्दी)</option>
                      </select>
                    </div>
                  </div>

                  {/* Question Content block */}
                  <div className="question-content" style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                    <div className="question-text-box" style={{ fontSize: '15px', fontWeight: '500', marginBottom: '20px', lineHeight: '1.6' }}>
                      {activeLanguage === 'hi' && activeReviewQuestion.questionHindi ? (
                        renderMath(activeReviewQuestion.questionHindi)
                      ) : (
                        renderMath(activeReviewQuestion.question)
                      )}
                    </div>
                    {activeReviewQuestion.diagramUrl ? (
                      <div className="question-diagram" style={{ textAlign: 'center', margin: '0 0 16px 0', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <img src={activeReviewQuestion.diagramUrl} alt="Diagram" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '4px' }} onError={(e) => { e.target.style.display = 'none'; }} />
                      </div>
                    ) : null}

                    {/* Option Choice review list */}
                    <div className="question-options-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {activeReviewQuestion.options.map((opt, oIdx) => {
                        const letter = String.fromCharCode(97 + oIdx);
                        const isSelected = selectedAnswers[activeReviewQuestion.id] === oIdx;
                        const isCorrect = oIdx === activeReviewQuestion.correctOption;
                        
                        let optClass = 'solution-option-item';
                        if (isCorrect) optClass += ' solution-opt-correct';
                        else if (isSelected) optClass += ' solution-opt-incorrect';

                        return (
                          <div 
                            key={oIdx}
                            className={optClass}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                          >
                            <input 
                              type="radio" 
                              name={`review_q_${activeReviewQuestion.id}`}
                              className="option-radio"
                              checked={isSelected}
                              disabled
                              style={{ cursor: 'default' }}
                            />
                            <span className="option-label" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                              <span style={{ fontWeight: 'bold', marginRight: '6px' }}>({letter})</span>
                              {activeLanguage === 'hi' && activeReviewQuestion.optionsHindi && activeReviewQuestion.optionsHindi[oIdx] ? (
                                activeReviewQuestion.optionsHindi[oIdx]
                              ) : (
                                opt
                              )}
                              
                              {/* Icon indicators */}
                              {isCorrect && (
                                <Check size={16} style={{ color: '#10b981', marginLeft: 'auto', strokeWidth: 3 }} />
                              )}
                              {isSelected && !isCorrect && (
                                <X size={16} style={{ color: '#ef4444', marginLeft: 'auto', strokeWidth: 3 }} />
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary row */}
                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px', marginTop: '16px', padding: '12px', borderTop: '1px dashed var(--border-color)' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Your Response: </span>
                        {(() => {
                          const uAnswer = selectedAnswers[activeReviewQuestion.id];
                          if (uAnswer === undefined) return <span style={{ fontWeight: 'bold', color: '#64748b' }}>None</span>;
                          const isCorrect = uAnswer === activeReviewQuestion.correctOption;
                          return (
                            <span style={{ fontWeight: 'bold', color: isCorrect ? '#10b981' : '#ef4444' }}>
                              ({String.fromCharCode(97 + uAnswer)}) {activeReviewQuestion.options[uAnswer]}
                            </span>
                          );
                        })()}
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Correct Answer: </span>
                        <span style={{ fontWeight: 'bold', color: '#10b981' }}>
                          ({String.fromCharCode(97 + activeReviewQuestion.correctOption)}) {activeReviewQuestion.options[activeReviewQuestion.correctOption]}
                        </span>
                      </div>
                    </div>

                    {/* Math Explanation box */}
                    {(activeReviewQuestion.explanation || activeReviewQuestion.explanationHindi) && (
                      <div className="solution-explanation-card" style={{ margin: '20px 0 0 0' }}>
                        <div className="solution-explanation-title">
                          <BookOpen size={15} />
                          <span>💡 Solution & Step-by-Step Explanation / हल और विस्तृत व्याख्या</span>
                        </div>
                        <div className="solution-explanation-body">
                          {activeReviewQuestion.explanation && (
                            <div style={{ marginBottom: activeReviewQuestion.explanationHindi ? '16px' : '0' }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>English Solution:</span>
                              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                {renderMath(activeReviewQuestion.explanation)}
                              </div>
                            </div>
                          )}
                          {activeReviewQuestion.explanationHindi && (
                            <div style={{ borderTop: activeReviewQuestion.explanation ? '1px dashed var(--border-color)' : 'none', paddingTop: activeReviewQuestion.explanation ? '12px' : '0' }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f59e0b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>हिन्दी व्याख्या:</span>
                              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                {renderMath(activeReviewQuestion.explanationHindi)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation footer */}
                  <footer className="action-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '12px 20px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button 
                      className="btn-action btn-clear"
                      onClick={() => setReviewQuestionIndex(prev => prev > 0 ? prev - 1 : filteredQuestions.length - 1)}
                      style={{ padding: '6px 14px', fontSize: '12px' }}
                    >
                      ← Previous Question
                    </button>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
                      Showing {activeReviewIndex + 1} of {filteredQuestions.length} in this view
                    </span>
                    <button 
                      className="btn-action btn-save-next"
                      onClick={() => setReviewQuestionIndex(prev => prev < filteredQuestions.length - 1 ? prev + 1 : 0)}
                      style={{ padding: '6px 14px', fontSize: '12px' }}
                    >
                      Next Question →
                    </button>
                  </footer>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px', color: 'var(--text-muted)' }}>
                  <HelpCircle size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' }}>No Questions Found</h3>
                  <p style={{ fontSize: '13px', textAlign: 'center' }}>
                    No questions in this mock match the selected filter **"{reviewFilter.toUpperCase()}"**. Click on other filter pills on the right panel to explore!
                  </p>
                </div>
              )}
            </div>

            {/* Right sidebar - Category filters and question palette */}
            <div className="solution-sidebar-panel">
              {/* Category Filter Tabs */}
              <div className="solution-palette-title" style={{ marginBottom: '10px' }}>Filter Questions</div>
              <div className="solution-filter-tabs">
                {/* 1. All */}
                <div 
                  className={`solution-filter-tab tab-all ${reviewFilter === 'all' ? 'active' : ''}`}
                  onClick={() => { setReviewFilter('all'); setReviewQuestionIndex(0); }}
                >
                  <span className="tab-count">{questions.length}</span>
                  <span>All Qs</span>
                </div>
                
                {/* 2. Correct */}
                <div 
                  className={`solution-filter-tab tab-correct ${reviewFilter === 'correct' ? 'active' : ''}`}
                  onClick={() => { setReviewFilter('correct'); setReviewQuestionIndex(0); }}
                  style={{ color: reviewFilter === 'correct' ? '#fff' : '#10b981' }}
                >
                  <span className="tab-count">{correctQs.length}</span>
                  <span>Right</span>
                </div>
                
                {/* 3. Incorrect */}
                <div 
                  className={`solution-filter-tab tab-incorrect ${reviewFilter === 'incorrect' ? 'active' : ''}`}
                  onClick={() => { setReviewFilter('incorrect'); setReviewQuestionIndex(0); }}
                  style={{ color: reviewFilter === 'incorrect' ? '#fff' : '#ef4444' }}
                >
                  <span className="tab-count">{incorrectQs.length}</span>
                  <span>Wrong</span>
                </div>
                
                {/* 4. Unattempted */}
                <div 
                  className={`solution-filter-tab tab-unattempted ${reviewFilter === 'unattempted' ? 'active' : ''}`}
                  onClick={() => { setReviewFilter('unattempted'); setReviewQuestionIndex(0); }}
                  style={{ color: reviewFilter === 'unattempted' ? '#fff' : '#64748b' }}
                >
                  <span className="tab-count">{unattemptedQs.length}</span>
                  <span>Skipped</span>
                </div>
                
                {/* 5. Bookmarked (full width spanning 2 columns) */}
                <div 
                  className={`solution-filter-tab tab-bookmarked ${reviewFilter === 'bookmarked' ? 'active' : ''}`}
                  onClick={() => { setReviewFilter('bookmarked'); setReviewQuestionIndex(0); }}
                  style={{ gridColumn: 'span 2', color: reviewFilter === 'bookmarked' ? '#fff' : '#f59e0b' }}
                >
                  <span className="tab-count">{bookmarkedQs.length}</span>
                  <span>🔖 Bookmarked Questions</span>
                </div>
              </div>

              {/* Palette Grid */}
              <div className="solution-palette-title" style={{ marginTop: '10px' }}>Question Palette ({filteredQuestions.length})</div>
              <div className="solution-palette-grid">
                {filteredQuestions.map((q, idx) => {
                  const originalIndex = questions.indexOf(q);
                  const isBtnActive = idx === activeReviewIndex;
                  
                  const uAnswer = selectedAnswers[q.id];
                  const uState = status[q.id];
                  const isAttempted = uState === 'answered' || uState === 'answered-marked';
                  
                  const isCorrect = isAttempted && uAnswer === q.correctOption;
                  const isUnattempted = !isAttempted || uAnswer === undefined;
                  
                  let badgeClass = 'state-skipped';
                  if (isCorrect) badgeClass = 'state-correct';
                  else if (!isUnattempted) badgeClass = 'state-incorrect';

                  const qBookmarked = isBookmarked(q.id);

                  return (
                    <div 
                      key={q.id}
                      className={`state-badge grid-item ${badgeClass} ${isBtnActive ? 'active' : ''}`}
                      onClick={() => setReviewQuestionIndex(idx)}
                      style={{ height: '32px', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}
                    >
                      {originalIndex + 1}
                      {qBookmarked && <span className="solution-bookmark-dot" title="Bookmarked" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         PATH 7. ADMIN DASHBOARD - USER ANALYTICS
         ========================================== */}
      {appMode === 'admin-dashboard' && (
        <div className="home-container">
          {/* Enhanced Header */}
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '32px 24px',
            borderRadius: '16px',
            marginBottom: '32px',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ 
              position: 'absolute',
              top: 0,
              right: 0,
              width: '200px',
              height: '200px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              transform: 'translate(50%, -50%)'
            }}></div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <BarChart2 size={32} style={{ marginRight: '12px', color: 'white' }} />
                <h1 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: 'bold' }}>
                  Admin Dashboard
                </h1>
              </div>
              <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>
                Monitor user activity, track performance, and analyze mock test statistics
              </p>
            </div>
          </div>

          {loadingUsersData ? (
            <SkeletonTable rows={10} />
          ) : (
            <>
              {/* Enhanced Summary Cards */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                gap: '20px', 
                marginBottom: '32px' 
              }}>
                {/* Total Users Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.3)';
                }}>
                  <div style={{ 
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                  }}></div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', fontWeight: '500' }}>Total Users</span>
                      <div style={{ 
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: '20px' }}>👥</span>
                      </div>
                    </div>
                    <div style={{ color: 'white', fontSize: '36px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {allUsersData.length}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                      Registered accounts
                    </div>
                  </div>
                </div>

                {/* Total Attempts Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 20px rgba(240, 147, 251, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(240, 147, 251, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(240, 147, 251, 0.3)';
                }}>
                  <div style={{ 
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                  }}></div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', fontWeight: '500' }}>Total Attempts</span>
                      <div style={{ 
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: '20px' }}>📝</span>
                      </div>
                    </div>
                    <div style={{ color: 'white', fontSize: '36px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {allUsersData.reduce((sum, u) => sum + (u.totalAttempts || 0), 0)}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                      Mock tests completed
                    </div>
                  </div>
                </div>

                {/* Average Score Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 20px rgba(79, 172, 254, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(79, 172, 254, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(79, 172, 254, 0.3)';
                }}>
                  <div style={{ 
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                  }}></div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', fontWeight: '500' }}>Average Score</span>
                      <div style={{ 
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: '20px' }}>🎯</span>
                      </div>
                    </div>
                    <div style={{ color: 'white', fontSize: '36px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {allUsersData.length > 0 
                        ? (allUsersData.reduce((sum, u) => sum + parseFloat(u.averageScore || 0), 0) / allUsersData.length).toFixed(1)
                        : 0}%
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                      Overall performance
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Users Table */}
              <div style={{ 
                background: 'var(--bg-primary)',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ 
                  padding: '20px 24px', 
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 'bold' }}>All Registered Users</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                      {allUsersData.length} {allUsersData.length === 1 ? 'user' : 'users'} found
                    </p>
                  </div>
                  <div style={{
                    background: '#8b5cf620',
                    color: '#8b5cf6',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}>
                    Live Data
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)' }}>
                        <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)' }}>User</th>
                        <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)' }}>Email</th>
                        <th style={{ padding: '16px 24px', textAlign: 'center', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)' }}>Attempts</th>
                        <th style={{ padding: '16px 24px', textAlign: 'center', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)' }}>Avg Score</th>
                        <th style={{ padding: '16px 24px', textAlign: 'center', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)' }}>Last Login</th>
                        <th style={{ padding: '16px 24px', textAlign: 'center', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsersData.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ padding: '60px 24px', textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '16px', margin: 0 }}>No users found</p>
                          </td>
                        </tr>
                      ) : (
                        allUsersData.map((userData, index) => (
                          <tr 
                            key={userData.uid} 
                            style={{ 
                              borderBottom: '1px solid var(--border-color)',
                              transition: 'all 0.2s ease',
                              animation: `fadeIn 0.3s ease ${index * 0.05}s both`
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--bg-secondary)';
                              e.currentTarget.style.transform = 'scale(1.01)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            <td style={{ padding: '16px 24px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {userData.avatar ? (
                                  <img 
                                    src={userData.avatar} 
                                    alt={userData.name} 
                                    style={{ 
                                      width: '40px', 
                                      height: '40px', 
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      border: '2px solid var(--border-color)'
                                    }} 
                                  />
                                ) : (
                                  <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '16px',
                                    border: '2px solid var(--border-color)'
                                  }}>
                                    {userData.name?.charAt(0).toUpperCase() || '?'}
                                  </div>
                                )}
                                <div>
                                  <div style={{ fontWeight: '600', marginBottom: '2px' }}>{userData.name || 'Unknown'}</div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    ID: {userData.uid.substring(0, 8)}...
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                              {userData.email || 'N/A'}
                            </td>
                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                background: '#8b5cf615',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                color: '#8b5cf6'
                              }}>
                                <span>📊</span>
                                <span>{userData.totalAttempts || 0}</span>
                              </div>
                            </td>
                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                              <span style={{
                                padding: '6px 16px',
                                borderRadius: '20px',
                                background: parseFloat(userData.averageScore || 0) >= 50 ? '#10b98120' : '#ef444420',
                                color: parseFloat(userData.averageScore || 0) >= 50 ? '#10b981' : '#ef4444',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                display: 'inline-block'
                              }}>
                                {userData.averageScore || 0}%
                              </span>
                            </td>
                            <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                              {userData.lastLoginAt ? new Date(userData.lastLoginAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              }) : 'Never'}
                            </td>
                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                              <button 
                                onClick={() => handleViewUserDetails(userData)}
                                style={{ 
                                  padding: '8px 16px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                                }}
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Enhanced User Details Modal */}
      {selectedUserDetails && (
        <div className="modal-overlay" onClick={handleCloseUserDetails} style={{ 
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-card" style={{ 
            maxWidth: '1000px', 
            maxHeight: '85vh', 
            overflow: 'hidden',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header with Gradient */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '24px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {selectedUserDetails.avatar ? (
                  <img 
                    src={selectedUserDetails.avatar} 
                    alt={selectedUserDetails.name} 
                    style={{ 
                      width: '56px', 
                      height: '56px', 
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid white',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                    }} 
                  />
                ) : (
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'white',
                    color: '#667eea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '24px',
                    border: '3px solid white',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                  }}>
                    {selectedUserDetails.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <h2 style={{ margin: '0 0 4px 0', color: 'white', fontSize: '24px' }}>
                    {selectedUserDetails.name}
                  </h2>
                  <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>
                    {selectedUserDetails.email}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCloseUserDetails} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  border: 'none', 
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
              {/* Stats Cards */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px', 
                marginBottom: '32px' 
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  padding: '20px',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px' }}>Total Attempts</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{selectedUserDetails.totalAttempts || 0}</div>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>Mock tests taken</div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  borderRadius: '12px',
                  padding: '20px',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(240, 147, 251, 0.3)'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px' }}>Average Score</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{selectedUserDetails.averageScore || 0}%</div>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>Overall performance</div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  borderRadius: '12px',
                  padding: '20px',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(79, 172, 254, 0.3)'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px' }}>Member Since</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {selectedUserDetails.createdAt ? new Date(selectedUserDetails.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'Unknown'}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                    Last login: {selectedUserDetails.lastLoginAt ? new Date(selectedUserDetails.lastLoginAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric'
                    }) : 'Never'}
                  </div>
                </div>
              </div>

              {/* Attempt History Section */}
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                    📊 Attempt History
                  </h3>
                  <span style={{
                    background: '#8b5cf620',
                    color: '#8b5cf6',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}>
                    {selectedUserDetails.attempts?.length || 0} attempts
                  </span>
                </div>

                {selectedUserDetails.attempts && selectedUserDetails.attempts.length > 0 ? (
                  <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                    {selectedUserDetails.attempts.map((attempt, idx) => {
                      // Calculate percentage score correctly
                      const percentageScore = attempt.maxMarks > 0 
                        ? ((attempt.score / attempt.maxMarks) * 100).toFixed(1)
                        : 0;
                      const isGoodScore = parseFloat(percentageScore) >= 50;
                      
                      return (
                        <div 
                          key={attempt.id || idx} 
                          style={{ 
                            padding: '16px', 
                            marginBottom: '12px', 
                            background: 'var(--bg-primary)', 
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            borderLeft: `4px solid ${isGoodScore ? '#10b981' : '#ef4444'}`,
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateX(4px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateX(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                fontWeight: 'bold', 
                                marginBottom: '6px',
                                fontSize: '15px'
                              }}>
                                {attempt.sheetTitle || 'Unknown Sheet'}
                              </div>
                              <div style={{ 
                                fontSize: '12px', 
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <span>🕒</span>
                                <span>
                                  {attempt.timestamp ? new Date(attempt.timestamp).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'Unknown date'}
                                </span>
                              </div>
                            </div>
                            <div style={{ 
                              textAlign: 'right',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              gap: '4px'
                            }}>
                              <div style={{ 
                                fontSize: '28px', 
                                fontWeight: 'bold', 
                                color: isGoodScore ? '#10b981' : '#ef4444',
                                lineHeight: 1
                              }}>
                                {percentageScore}%
                              </div>
                              <div style={{ 
                                fontSize: '12px', 
                                color: 'var(--text-muted)',
                                background: 'var(--bg-secondary)',
                                padding: '4px 8px',
                                borderRadius: '6px'
                              }}>
                                {attempt.correctCount || 0}/{attempt.totalQuestions || 0} correct
                              </div>
                              <div style={{ 
                                fontSize: '11px', 
                                color: 'var(--text-muted)',
                                marginTop: '2px'
                              }}>
                                Score: {attempt.score}/{attempt.maxMarks} marks
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px',
                    color: 'var(--text-muted)'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                    <p style={{ margin: 0, fontSize: '16px' }}>No attempts yet</p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>This user hasn't taken any mock tests</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         PATH 8. MOCK PLANNER - MINIMAL PROFESSIONAL
         ========================================== */}
      {appMode === 'mock-planner' && (
        <div className="home-container">
          {/* Minimal Header */}
          <div style={{ 
            padding: '32px 0',
            marginBottom: '40px',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '32px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.5px'
                }}>
                  Mock Planner
                </h1>
                <p style={{ 
                  margin: 0, 
                  color: 'var(--text-muted)', 
                  fontSize: '15px',
                  fontWeight: '400'
                }}>
                  Schedule and track your SSC CGL 2026 preparation
                </p>
              </div>
              <button 
                onClick={() => setShowAddPlanModal(true)}
                style={{
                  padding: '12px 24px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#4f46e5';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#6366f1';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <PlusCircle size={16} />
                <span>New Schedule</span>
              </button>
            </div>
          </div>

          {/* Minimal Stats Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px', 
            marginBottom: '40px' 
          }}>
            {/* Completed */}
            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '24px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: '500',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Completed
                </span>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#10b98115',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircle size={18} style={{ color: '#10b981' }} />
                </div>
              </div>
              <div style={{ 
                fontSize: '36px', 
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}>
                {mockPlans.filter(p => p.status === 'completed').length}
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: 'var(--text-muted)'
              }}>
                {examAttempts.length} total attempts
              </div>
            </div>

            {/* Pending */}
            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '24px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: '500',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Scheduled
                </span>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#6366f115',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Calendar size={18} style={{ color: '#6366f1' }} />
                </div>
              </div>
              <div style={{ 
                fontSize: '36px', 
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}>
                {mockPlans.filter(p => p.status === 'pending').length}
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: 'var(--text-muted)'
              }}>
                Upcoming mocks
              </div>
            </div>

            {/* Streak */}
            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '24px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#f59e0b';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: '500',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Streak
                </span>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#f59e0b15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Flame size={18} style={{ color: '#f59e0b' }} />
                </div>
              </div>
              <div style={{ 
                fontSize: '36px', 
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}>
                {(() => {
                  const today = new Date();
                  const last7Days = Array.from({length: 7}, (_, i) => {
                    const d = new Date(today);
                    d.setDate(d.getDate() - i);
                    return d.toDateString();
                  });
                  const recentAttempts = examAttempts.filter(a => {
                    const attemptDate = new Date(a.timestamp).toDateString();
                    return last7Days.includes(attemptDate);
                  });
                  return new Set(recentAttempts.map(a => new Date(a.timestamp).toDateString())).size;
                })()}
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: 'var(--text-muted)'
              }}>
                Days this week
              </div>
            </div>
          </div>

          {/* Schedule List Header */}
          <div>
            <h2 style={{ 
              margin: '0 0 20px 0', 
              fontSize: '18px', 
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>
              Your Schedule
            </h2>

            {mockPlans.length === 0 ? (
              <div style={{ 
                background: 'var(--bg-primary)',
                border: '1px dashed var(--border-color)',
                borderRadius: '12px',
                padding: '60px 20px', 
                textAlign: 'center' 
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: '#6366f110',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <Calendar size={32} style={{ color: '#6366f1' }} />
                </div>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--text-primary)' 
                }}>
                  No scheduled mocks
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: 'var(--text-muted)', 
                  fontSize: '14px',
                  maxWidth: '400px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  Start planning your preparation by scheduling mock tests
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mockPlans
                  .sort((a, b) => new Date(a.plannedDate) - new Date(b.plannedDate))
                  .map((plan, idx) => {
                    const planDate = new Date(plan.plannedDate);
                    const isToday = planDate.toDateString() === new Date().toDateString();
                    const isPast = planDate < new Date() && !isToday;
                    const isCompleted = plan.status === 'completed';
                    
                    return (
                      <div 
                        key={plan.id || idx}
                        style={{
                          padding: '20px',
                          background: 'var(--bg-primary)',
                          border: `1px solid ${isCompleted ? '#10b981' : isToday ? '#6366f1' : 'var(--border-color)'}`,
                          borderRadius: '12px',
                          transition: 'all 0.2s ease',
                          opacity: isCompleted ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = isCompleted ? '#10b981' : '#6366f1';
                          e.currentTarget.style.boxShadow = `0 4px 12px ${isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)'}`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = isCompleted ? '#10b981' : isToday ? '#6366f1' : 'var(--border-color)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                          <div style={{ flex: 1 }}>
                            {/* Status Badge */}
                            <div style={{ marginBottom: '12px' }}>
                              {isCompleted && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 10px',
                                  background: '#10b98115',
                                  color: '#10b981',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}>
                                  <CheckCircle size={14} />
                                  Completed
                                </span>
                              )}
                              {isToday && !isCompleted && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 10px',
                                  background: '#6366f115',
                                  color: '#6366f1',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}>
                                  <Target size={14} />
                                  Today
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h3 style={{ 
                              margin: '0 0 12px 0', 
                              fontSize: '16px', 
                              fontWeight: '600',
                              color: 'var(--text-primary)',
                              textDecoration: isCompleted ? 'line-through' : 'none'
                            }}>
                              {plan.sheetTitle}
                            </h3>

                            {/* Date & Time */}
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '16px', 
                              fontSize: '13px', 
                              color: 'var(--text-muted)' 
                            }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={14} />
                                {planDate.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={14} />
                                {planDate.toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            {!isCompleted && (
                              <>
                                <button
                                  onClick={() => handleStartPlannedMock(plan)}
                                  style={{
                                    padding: '8px 16px',
                                    background: '#6366f1',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#4f46e5'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#6366f1'}
                                >
                                  Start
                                </button>
                                <button
                                  onClick={() => handleMarkPlanComplete(plan.id)}
                                  style={{
                                    padding: '8px 12px',
                                    background: 'transparent',
                                    color: '#10b981',
                                    border: '1px solid #10b981',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#10b981';
                                    e.currentTarget.style.color = 'white';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#10b981';
                                  }}
                                >
                                  <Check size={16} />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeletePlan(plan.id)}
                              style={{
                                padding: '8px 12px',
                                background: 'transparent',
                                color: '#ef4444',
                                border: '1px solid #ef4444',
                                borderRadius: '6px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#ef4444';
                                e.currentTarget.style.color = 'white';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#ef4444';
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Plan Modal - Minimal Design */}
      {showAddPlanModal && (
        <div className="modal-overlay" onClick={() => setShowAddPlanModal(false)}>
          <div className="modal-card" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ 
              padding: '24px 24px 20px 24px',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  Schedule New Mock
                </h3>
                <button 
                  onClick={() => setShowAddPlanModal(false)} 
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: 'var(--text-muted)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Select Mock Sheet
                </label>
                <select
                  value={selectedSheet?.id || ''}
                  onChange={(e) => {
                    const sheet = availableSheets.find(s => s.id === e.target.value);
                    setSelectedSheet(sheet);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Choose a sheet...</option>
                  {availableSheets.map(sheet => (
                    <option key={sheet.id} value={sheet.id}>{sheet.title}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Date
                </label>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    fontSize: '14px',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Time
                </label>
                <input
                  type="time"
                  value={planTime}
                  onChange={(e) => setPlanTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    fontSize: '14px',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowAddPlanModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPlan}
                  disabled={isAddingPlan}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: isAddingPlan ? '#9ca3af' : '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: isAddingPlan ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isAddingPlan ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => !isAddingPlan && (e.currentTarget.style.background = '#4f46e5')}
                  onMouseLeave={(e) => !isAddingPlan && (e.currentTarget.style.background = '#6366f1')}
                >
                  {isAddingPlan ? 'Scheduling...' : 'Schedule Mock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         FLOATING CALCULATOR COMPONENT
         ========================================== */}
      {showCalculator && (
        <div 
          ref={calcRef}
          className="floating-calculator"
          style={{ top: `${calcPosition.y}px`, left: `${calcPosition.x}px` }}
          onMouseDown={handleMouseDown}
        >
          <div className="calc-header cursor-grab">
            <span className="calc-title">Virtual Calculator</span>
            <button className="calc-close" onClick={() => {
              setShowCalculator(false);
              trackCalculatorUsed();
            }}>
              <X size={14} />
            </button>
          </div>

          <div className="calc-body">
            <input 
              type="text" 
              className="calc-screen" 
              value={calcInput}
              readOnly 
              placeholder="0"
            />
            
            <div className="calc-grid">
              {['C', '√', '%', 'Del', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '=', '+'].map((btn) => {
                const isOp = ['C', '√', '%', 'Del', '÷', '×', '-', '=', '+'].includes(btn);
                return (
                  <button 
                    key={btn}
                    className={`btn-calc ${isOp ? 'btn-calc-op' : ''}`}
                    onClick={() => handleCalcBtnClick(btn)}
                  >
                    {btn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         SUBMIT CONFIRMATION MODAL OVERLAY
         ========================================== */}
      {showSubmitConfirm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <span>Exam Submission Confirmation</span>
              <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => setShowSubmitConfirm(false)}>
                <X size={16} />
              </button>
            </div>
            
            <div className="modal-body">
              <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '14px' }}>
                Are you sure you want to submit your paper? You will not be able to change your responses after this.
              </p>
              
              <div className="stats-grid-summary">
                <div className="summary-stat-box" style={{ borderLeft: '4px solid #10b981' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ANSWERED</span>
                  <span style={{ fontWeight: 'bold' }}>{summary.answered + summary.answeredMarked}</span>
                </div>
                <div className="summary-stat-box" style={{ borderLeft: '4px solid #ef4444' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NOT ANSWERED</span>
                  <span style={{ fontWeight: 'bold' }}>{summary.notAnswered}</span>
                </div>
                <div className="summary-stat-box" style={{ borderLeft: '4px solid #8b5cf6' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MARKED REVIEW</span>
                  <span style={{ fontWeight: 'bold' }}>{summary.marked}</span>
                </div>
                <div className="summary-stat-box" style={{ borderLeft: '4px solid #475569' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NOT VISITED</span>
                  <span style={{ fontWeight: 'bold' }}>{summary.notVisited}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal btn-clear" onClick={() => setShowSubmitConfirm(false)}>
                Cancel
              </button>
              <button className="btn-modal btn-modal-primary" onClick={submitExamDirectly}>
                Yes, Submit Paper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
         SPACIOUS PER-SHEET PERFORMANCE ANALYTICS MODAL OVERLAY
         ======================================================== */}
      {analyticsModalSheet && (() => {
        const sheet = analyticsModalSheet;
        const attemptsForSheet = examAttempts.filter(a => a.sheetId === sheet.id);
        const hasAttempts = attemptsForSheet.length > 0;
        
        const bestScore = hasAttempts ? Math.max(...attemptsForSheet.map(a => a.score)) : 0;
        const avgAccuracy = hasAttempts ? Math.round(attemptsForSheet.reduce((acc, a) => acc + a.accuracy, 0) / attemptsForSheet.length) : 0;
        const maxMarks = sheet.questions.length * 2;
        
        return (
          <div className="modal-overlay" onClick={() => setAnalyticsModalSheet(null)}>
            <div className="modal-card analytics-modal-card" style={{ width: '700px', maxWidth: '90%' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart2 size={18} style={{ color: '#10b981' }} />
                  <span>Performance Analytics: {sheet.title}</span>
                </div>
                <button 
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }} 
                  onClick={() => setAnalyticsModalSheet(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body text-left">
                {/* Visual scorecard summaries specifically for this mock paper */}
                <div className="analytics-portal-summary">
                  <div className="portal-stat-pill">
                    <span className="pill-val">{attemptsForSheet.length}</span>
                    <span className="pill-lbl">Times Taken</span>
                  </div>
                  <div className="portal-stat-pill" style={{ borderLeft: '4px solid #8b5cf6' }}>
                    <span className="pill-val text-gradient-purple" style={{ color: '#8b5cf6' }}>
                      {bestScore} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ {maxMarks} pts</span>
                    </span>
                    <span className="pill-lbl">Personal Best</span>
                  </div>
                  <div className="portal-stat-pill" style={{ borderLeft: '4px solid #10b981' }}>
                    <span className="pill-val" style={{ color: '#10b981' }}>{avgAccuracy}%</span>
                    <span className="pill-lbl">Avg Accuracy</span>
                  </div>
                </div>

                <div className="dashboard-subtitle" style={{ marginTop: '24px', marginBottom: '14px' }}>
                  📋 Attempt History Logs & Score Cards ({attemptsForSheet.length})
                </div>

                {!hasAttempts ? (
                  <div className="attempt-empty-state" style={{ margin: 0 }}>
                    <div className="attempt-empty-icon">📈</div>
                    <h3>No attempts for this sheet yet</h3>
                    <p>Click "Launch CBT Exam" below to attempt this mock test. Your complete performance records will appear here chronologically!</p>
                  </div>
                ) : (
                  <div className="modal-attempts-container" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                    {attemptsForSheet.map((attempt, index) => {
                      const totalQs = (attempt.correctCount || 0) + (attempt.incorrectCount || 0) + (attempt.unattemptedCount || 0);
                      const correctPct = totalQs > 0 ? ((attempt.correctCount || 0) / totalQs) * 100 : 0;
                      const incorrectPct = totalQs > 0 ? ((attempt.incorrectCount || 0) / totalQs) * 100 : 0;
                      const unattemptedPct = totalQs > 0 ? ((attempt.unattemptedCount || 0) / totalQs) * 100 : 0;

                      return (
                        <div key={attempt.attemptId} className="attempt-card modal-attempt-card" style={{ boxShadow: 'none', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', margin: 0 }}>
                          <div className="attempt-card-header">
                            <div>
                              <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="attempt-index-badge" style={{ backgroundColor: 'rgba(51, 122, 183, 0.1)', color: 'var(--accent-color)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>Attempt #{attemptsForSheet.length - index}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'normal' }}>{attempt.timestamp}</span>
                              </h4>
                            </div>
                            <div className="attempt-card-score-badge">
                              <span className="score-obtained">{attempt.score}</span>
                              <span className="score-total">/ {attempt.maxMarks} pts</span>
                            </div>
                          </div>

                          <div className="attempt-ratio-container" style={{ marginBottom: '10px' }}>
                            <div className="attempt-segmented-bar" style={{ height: '6px' }}>
                              <div className="attempt-bar-segment correct" style={{ width: `${correctPct}%` }} title={`Correct: ${attempt.correctCount}`}></div>
                              <div className="attempt-bar-segment incorrect" style={{ width: `${incorrectPct}%` }} title={`Incorrect: ${attempt.incorrectCount}`}></div>
                              <div className="attempt-bar-segment unattempted" style={{ width: `${unattemptedPct}%` }} title={`Unattempted: ${attempt.unattemptedCount}`}></div>
                            </div>
                          </div>

                          <div className="attempt-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
                            <div className="attempt-stat-item border-correct" style={{ padding: '2px 6px' }}>
                              <span className="stat-bullet bg-correct" style={{ width: '4px', height: '4px' }}></span>
                              <span className="stat-text" style={{ fontSize: '10px' }}>Right: <b>{attempt.correctCount || 0}</b></span>
                            </div>
                            <div className="attempt-stat-item border-incorrect" style={{ padding: '2px 6px' }}>
                              <span className="stat-bullet bg-incorrect" style={{ width: '4px', height: '4px' }}></span>
                              <span className="stat-text" style={{ fontSize: '10px' }}>Wrong: <b>{attempt.incorrectCount || 0}</b></span>
                            </div>
                            <div className="attempt-stat-item border-unattempted" style={{ padding: '2px 6px' }}>
                              <span className="stat-bullet bg-unattempted" style={{ width: '4px', height: '4px' }}></span>
                              <span className="stat-text" style={{ fontSize: '10px' }}>Skipped: <b>{attempt.unattemptedCount || 0}</b></span>
                            </div>
                          </div>

                          <div className="modal-attempt-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                            <div className="attempt-meta-specs" style={{ margin: 0, padding: 0, border: 'none', display: 'flex', gap: '6px', fontSize: '10px' }}>
                              <span>Accuracy: <b>{attempt.accuracy}%</b></span>
                              <span className="spec-dot">•</span>
                              <span>Attempted: <b>{attempt.attemptedCount} Qs</b></span>
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button 
                                className="btn-attempt-action btn-review-solutions" 
                                onClick={() => {
                                  setAnalyticsModalSheet(null);
                                  handleReviewAttempt(attempt);
                                }}
                                style={{ padding: '4px 10px', fontSize: '10px' }}
                              >
                                <FileText size={11} style={{ marginRight: '3px' }} />
                                Review
                              </button>
                              <button 
                                className="btn-attempt-delete" 
                                onClick={(e) => handleDeleteAttempt(attempt.attemptId, e)}
                                style={{ padding: '4px 8px', fontSize: '10px' }}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn-modal btn-clear" onClick={() => setAnalyticsModalSheet(null)}>
                  Close Portal
                </button>
                <button 
                  className="btn-modal btn-modal-primary" 
                  onClick={() => {
                    setAnalyticsModalSheet(null);
                    handleLaunchMockRequest(sheet);
                  }}
                >
                  <Play size={13} fill="currentColor" style={{ marginRight: '4px' }} />
                  Launch CBT Exam
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==========================================
         EXAM DETAILED INSTRUCTIONS MODAL
         ========================================== */}
      {showInstructions && (
        <div className="modal-overlay" onClick={() => setShowInstructions(false)}>
          <div className="modal-card" style={{ width: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>SSC CGL Exam General Instructions</span>
              <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => setShowInstructions(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="instruction-modal-body">
                <p style={{ fontWeight: '600', marginBottom: '8px' }}>Please read the following guidelines carefully before continuing:</p>
                
                <div className="instruction-section-title">General Guidelines</div>
                <ul className="instruction-list">
                  <li>Total duration of this mock examination is {questions?.length || 25} minutes.</li>
                  <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the exam.</li>
                  <li>When the timer reaches zero, the exam will end by itself and your answers will be automatically saved and submitted.</li>
                </ul>

                <div className="instruction-section-title">Question State Palette Symbols</div>
                <ul className="instruction-list">
                  <li><strong>Not Visited (Square Box):</strong> You have not visited the question yet.</li>
                  <li><strong>Not Answered (Red House):</strong> You have visited the question but not answered it.</li>
                  <li><strong>Answered (Green Shield):</strong> You have answered the question. Your response is saved.</li>
                  <li><strong>Marked for Review (Purple Circle):</strong> You have read the question but chosen to review it later. Your answer is NOT selected.</li>
                  <li><strong>Answered & Marked (Purple with Check):</strong> You have answered the question and marked it for review. This response WILL be evaluated.</li>
                </ul>

                <div className="instruction-section-title">Answering Questions</div>
                <ul className="instruction-list">
                  <li>To select your response, click on the option list.</li>
                  <li>To deselect your chosen response, click on the "Clear Response" button at the bottom of the active panel.</li>
                  <li>To save your response and move to the next question, click the "Save & Next" button.</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal btn-modal-primary" onClick={() => setShowInstructions(false)}>
                Okay, Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         KEYBOARD SHORTCUT HOTKEYS MODAL
         ========================================== */}
      {showShortcuts && (
        <div className="modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>Keyboard Shortcuts & Professional Utilities</span>
              <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => setShowShortcuts(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Use these custom hotkeys to navigate, clear, and submit without moving your mouse cursor:
              </p>

              <div className="shortcuts-grid">
                <div className="shortcut-row">
                  <span>Save & Next</span>
                  <span className="shortcut-badge">Space</span>
                </div>
                <div className="shortcut-row">
                  <span>Mark for Review</span>
                  <span className="shortcut-badge">M / R</span>
                </div>
                <div className="shortcut-row">
                  <span>Clear Option</span>
                  <span className="shortcut-badge">C</span>
                </div>
                <div className="shortcut-row">
                  <span>Next Question</span>
                  <span className="shortcut-badge">→ / ↓</span>
                </div>
                <div className="shortcut-row">
                  <span>Prev Question</span>
                  <span className="shortcut-badge">← / ↑</span>
                </div>
                <div className="shortcut-row">
                  <span>Calculator Toggle</span>
                  <span className="shortcut-badge">V</span>
                </div>
                <div className="shortcut-row">
                  <span>Instructions Modal</span>
                  <span className="shortcut-badge">I</span>
                </div>
                <div className="shortcut-row">
                  <span>Hotkeys Cheat Sheet</span>
                  <span className="shortcut-badge">H</span>
                </div>
                <div className="shortcut-row">
                  <span>Pause/Resume Test</span>
                  <span className="shortcut-badge">P</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal btn-modal-primary" onClick={() => setShowShortcuts(false)}>
                Perfect!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         PAUSE CONFIRMATION MODAL
         ========================================== */}
      {showPauseConfirm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⏸</span>
                <span>Pause Test Confirmation</span>
              </span>
              <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => setShowPauseConfirm(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.5' }}>
                Are you sure you want to pause the test? The timer will stop and you can resume anytime.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Your progress will be saved automatically.
              </p>
            </div>

            <div className="modal-footer">
              <button className="btn-modal btn-clear" onClick={() => setShowPauseConfirm(false)}>
                Cancel
              </button>
              <button className="btn-modal btn-modal-primary" style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }} onClick={confirmPauseTest}>
                Yes, Pause Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         NEW MODAL: CODE HARDCODE EXPORTER OVERLAY
         ========================================== */}
      {showCodeExporter && (
        <div className="modal-overlay" onClick={() => setShowCodeExporter(false)}>
          <div className="modal-card" style={{ width: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>💾 Hardcode Data Exporter</span>
              <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => setShowCodeExporter(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="code-export-container">
                <p style={{ fontSize: '13px', fontWeight: '500' }}>
                  Your sheet is ready! Follow these steps to **hardcode** this data directly into your platform:
                </p>

                <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
                  <div>
                    <span className="guide-step-number">1</span>
                    <span>Click the **Copy Code** button below to copy the JS ES-Module export.</span>
                  </div>
                  <div>
                    <span className="guide-step-number">2</span>
                    <span>Open the file <a href="file:///Users/pradeepkumar/Downloads/super/src/data/questions.js" style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>src/data/questions.js</a>.</span>
                  </div>
                  <div>
                    <span className="guide-step-number">3</span>
                    <span>Paste this block directly inside the <code>super100Sheets</code> object. You are done!</span>
                  </div>
                </div>

                <textarea 
                  className="code-textarea"
                  value={getGeneratedCodeString()}
                  readOnly
                  onClick={(e) => e.target.select()}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal btn-clear" onClick={() => setShowCodeExporter(false)}>
                Close
              </button>
              <button className="btn-modal btn-modal-primary" onClick={handleCopyCode} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Copy size={14} />
                <span>Copy Exporter Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         NEW SAFETY DIALOG: EXIT LIVE EXAM SESSION
         ========================================== */}
      {showExitConfirm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header" style={{ color: '#ef4444' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} />
                <span>Exit Exam Safety Check</span>
              </span>
              <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => setShowExitConfirm(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.5' }}>
                You are in the middle of a live simulated exam session. Exiting now will **wipe all your active selections** for this attempt.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Are you sure you want to abort the exam and return to the Home Dashboard?
              </p>
            </div>

            <div className="modal-footer">
              <button className="btn-modal btn-clear" onClick={() => setShowExitConfirm(false)}>
                Cancel & Resume Exam
              </button>
              <button className="btn-modal btn-modal-primary" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }} onClick={confirmExitToHome}>
                Yes, Abort and Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         NEW MODAL: USER PROFILE ONBOARDING
         ========================================== */}
      {showOnboarding && (
        <div className="modal-overlay onboarding-overlay">
          <div className="modal-card onboarding-card" style={{ width: '450px' }}>
            <div className="modal-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>👤 User Profile Configuration</span>
              </span>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                Please set up your user profile. Your name and profile picture will be displayed on the active CBT exam dashboard, candidate palette, and all mock simulator sheets.
              </p>

              <div className="form-group" style={{ textAlign: 'left' }}>
                <span className="form-label" style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Full Name / उम्मीदवार का नाम</span>
                <input 
                  type="text" 
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="e.g. Prerna Sharma"
                />
              </div>

              <div className="form-group" style={{ textAlign: 'left' }}>
                <span className="form-label" style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Profile Photo / उम्मीदवार की तस्वीर</span>
                
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '4px' }}>
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    style={{ 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: '50%', 
                      overflow: 'hidden', 
                      border: '2px solid var(--accent-color)', 
                      backgroundColor: 'var(--bg-secondary)', 
                      flexShrink: 0,
                      cursor: 'pointer',
                      transition: 'opacity 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                    title="Click to upload custom photo"
                  >
                    <img src={tempAvatar || "/candidate_avatar.png"} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleImageUpload} 
                    />
                    <button 
                      type="button"
                      className="btn-hero-secondary" 
                      onClick={() => fileInputRef.current.click()}
                      style={{ cursor: 'pointer', padding: '8px 12px', fontSize: '12px', textAlign: 'center', justifyContent: 'center' }}
                    >
                      Upload Custom Photo
                    </button>
                    
                    <button 
                      className="btn-util" 
                      onClick={() => setTempAvatar('/candidate_avatar.png')}
                      style={{ fontSize: '11px', padding: '4px 8px', alignSelf: 'flex-start' }}
                    >
                      Reset to Default
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {candidateName && (
                <button className="btn-modal btn-clear" onClick={() => setShowOnboarding(false)}>
                  Cancel
                </button>
              )}
              <button 
                className="btn-modal btn-modal-primary" 
                disabled={!tempName.trim()}
                onClick={handleCompleteOnboarding}
                style={!tempName.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                Save Profile & Enter Hub ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         REPORT ISSUE MODAL
         ========================================== */}
      {showReportIssue && (
        <div className="modal-overlay" onClick={() => setShowReportIssue(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} color="#f59e0b" />
                <span>Report Question Issue</span>
              </span>
              <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => setShowReportIssue(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <p style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: 'var(--text-main)' }}>
                  <strong>Question #{activeQuestion.id}</strong> from {activeSheetTitle}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {activeQuestion.question.substring(0, 100)}{activeQuestion.question.length > 100 ? '...' : ''}
                </p>
              </div>

              <p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '12px', color: 'var(--text-main)' }}>
                What's wrong with this question?
              </p>
              
              <textarea 
                id="issue-description"
                placeholder="Describe the issue (e.g., 'Option B should be correct, not A' or 'Question has a typo in the word...')"
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  resize: 'vertical',
                  marginBottom: '12px'
                }}
              />

              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                💡 Your report will be saved locally and visible to admins for review.
              </p>
            </div>

            <div className="modal-footer">
              <button className="btn-modal btn-clear" onClick={() => setShowReportIssue(false)}>
                Cancel
              </button>
              <button 
                className="btn-modal btn-modal-primary"
                onClick={() => {
                  const description = document.getElementById('issue-description').value.trim();
                  if (!description) {
                    triggerToast("Please describe the issue", "warning");
                    return;
                  }

                  try {
                    const report = {
                      id: Date.now(),
                      sheetId: activeSheetId,
                      sheetTitle: activeSheetTitle,
                      questionId: activeQuestion.id,
                      questionText: activeQuestion.question,
                      options: activeQuestion.options,
                      currentCorrectOption: activeQuestion.correctOption,
                      issueDescription: description,
                      reportedBy: candidateName || 'Anonymous',
                      timestamp: new Date().toISOString(),
                      status: 'pending'
                    };

                    const reports = JSON.parse(localStorage.getItem('super100_issue_reports') || '[]');
                    reports.push(report);
                    localStorage.setItem('super100_issue_reports', JSON.stringify(reports));
                    addIssueReport(report);
                    
                    setShowReportIssue(false);
                    document.getElementById('issue-description').value = '';
                    triggerToast("Issue reported successfully! Thank you for your feedback.", "success");
                  } catch (e) {
                    triggerToast("Failed to save report. Please try again.", "warning");
                  }
                }}
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Wrap App with ErrorBoundary for production safety
export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
