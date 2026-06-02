// Google Analytics Event Tracking Helper
// This file helps track user interactions without any personal data

/**
 * Track custom events in Google Analytics
 * @param {string} eventName - Name of the event (e.g., 'test_started', 'test_completed')
 * @param {object} eventParams - Additional parameters for the event
 */
export const trackEvent = (eventName, eventParams = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
};

/**
 * Track page views (automatically handled by GA4, but can be called manually)
 * @param {string} pagePath - Path of the page
 * @param {string} pageTitle - Title of the page
 */
export const trackPageView = (pagePath, pageTitle) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle
    });
  }
};

// Predefined event tracking functions for common actions

export const trackTestStarted = (sheetTitle, questionCount) => {
  trackEvent('test_started', {
    sheet_title: sheetTitle,
    question_count: questionCount
  });
};

export const trackTestCompleted = (sheetTitle, score, accuracy, timeSpent) => {
  trackEvent('test_completed', {
    sheet_title: sheetTitle,
    score: score,
    accuracy: accuracy,
    time_spent_seconds: timeSpent
  });
};

export const trackTestPaused = (sheetTitle, questionsAnswered) => {
  trackEvent('test_paused', {
    sheet_title: sheetTitle,
    questions_answered: questionsAnswered
  });
};

export const trackTestResumed = (sheetTitle) => {
  trackEvent('test_resumed', {
    sheet_title: sheetTitle
  });
};

export const trackSheetCreated = (sheetTitle, questionCount) => {
  trackEvent('sheet_created', {
    sheet_title: sheetTitle,
    question_count: questionCount
  });
};

export const trackThemeChanged = (newTheme) => {
  trackEvent('theme_changed', {
    theme: newTheme
  });
};

export const trackLanguageChanged = (language) => {
  trackEvent('language_changed', {
    language: language
  });
};

export const trackPWAInstalled = () => {
  trackEvent('pwa_installed');
};

export const trackCalculatorUsed = () => {
  trackEvent('calculator_used');
};
