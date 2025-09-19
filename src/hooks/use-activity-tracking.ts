import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function useActivityTracking() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());

  // Generate session ID
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Log session start
      logActivity('session_start', {
        session_id: sessionIdRef.current,
        page_url: pathname
      });
    }
  }, []);

  // Track page visits
  useEffect(() => {
    if (sessionIdRef.current) {
      logActivity('page_visit', {
        session_id: sessionIdRef.current,
        page_url: pathname
      });
    }
  }, [pathname]);

  // Track user activity (mouse movement, clicks, keyboard)
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Check for inactivity every 30 seconds
    const inactivityCheck = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      // If user has been inactive for more than 5 minutes, log session end
      if (timeSinceLastActivity > 5 * 60 * 1000 && sessionIdRef.current) {
        const sessionDuration = Math.round((now - sessionStartRef.current) / 1000);
        
        logActivity('session_end', {
          session_id: sessionIdRef.current,
          duration: sessionDuration,
          page_url: pathname
        });

        // Reset session
        sessionIdRef.current = null;
        sessionStartRef.current = now;
      }
    }, 30000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
      clearInterval(inactivityCheck);
    };
  }, [pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        const sessionDuration = Math.round((Date.now() - sessionStartRef.current) / 1000);
        logActivity('session_end', {
          session_id: sessionIdRef.current,
          duration: sessionDuration,
          page_url: pathname
        });
      }
    };
  }, [pathname]);

  return {
    logActivity: (activityType: string, data?: any) => {
      logActivity(activityType, {
        session_id: sessionIdRef.current,
        page_url: pathname,
        ...data
      });
    }
  };
}

async function logActivity(activityType: string, data?: any) {
  try {
    await fetch('/api/activity/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activity_type: activityType,
        activity_data: data,
        page_url: data?.page_url,
        session_id: data?.session_id
      }),
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
