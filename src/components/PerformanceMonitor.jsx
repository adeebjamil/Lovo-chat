import React, { Profiler } from 'react';

// Performance monitoring callback
const onRenderCallback = (
  id, // the "id" prop of the Profiler tree that has just committed
  phase, // either "mount" (if the tree just mounted) or "update" (if it re-rendered)
  actualDuration, // time spent rendering the committed update
  baseDuration, // estimated time to render the entire subtree without memoization
  startTime, // when React began rendering this update
  commitTime, // when React committed this update
  interactions // the Set of interactions belonging to this update
) => {
  // Log performance metrics
  if (process.env.NODE_ENV === 'development') {
    console.log(`⚡ Performance [${id}]:`, {
      phase,
      actualDuration: `${actualDuration.toFixed(2)}ms`,
      baseDuration: `${baseDuration.toFixed(2)}ms`,
      improvement: baseDuration > 0 ? `${((1 - actualDuration / baseDuration) * 100).toFixed(1)}%` : 'N/A'
    });
  }

  // Warn about slow renders (> 16ms = below 60fps)
  if (actualDuration > 16) {
    console.warn(`🐌 Slow render detected in ${id}: ${actualDuration.toFixed(2)}ms`);
  }

  // Track metrics (could send to analytics service)
  trackPerformanceMetric({
    component: id,
    phase,
    duration: actualDuration,
    timestamp: commitTime
  });
};

// Mock analytics tracking (replace with real service)
const trackPerformanceMetric = (metric) => {
  // In production, send to analytics service (e.g., Google Analytics, Mixpanel)
  if (process.env.NODE_ENV === 'production') {
    // Example: window.gtag?.('event', 'performance', metric);
  }
};

// Performance Monitor wrapper component
const PerformanceMonitor = ({ id = 'App', children }) => {
  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
};

export default PerformanceMonitor;

// Hook for tracking custom events
export const useAnalytics = () => {
  const trackEvent = (eventName, properties = {}) => {
    const eventData = {
      event: eventName,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      ...properties
    };

    console.log('📊 Analytics Event:', eventData);

    // In production, send to analytics service
    if (process.env.NODE_ENV === 'production') {
      // Example: window.gtag?.('event', eventName, properties);
    }
  };

  const trackPageView = (pageName) => {
    trackEvent('page_view', { page: pageName });
  };

  const trackUserAction = (action, details = {}) => {
    trackEvent('user_action', { action, ...details });
  };

  return {
    trackEvent,
    trackPageView,
    trackUserAction
  };
};
