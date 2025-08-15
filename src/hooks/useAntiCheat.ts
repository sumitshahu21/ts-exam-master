import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

export interface AntiCheatEvent {
  type: 'tab_switch' | 'fullscreen_exit' | 'window_blur' | 'devtools' | 'copy' | 'paste' | 'context_menu' | 'keyboard_shortcut';
  timestamp: Date;
  details?: string;
}

export interface AntiCheatConfig {
  enableFullScreen: boolean;
  maxViolations: number;
  warningThreshold: number;
  actionOnMaxViolations: 'warn' | 'submit' | 'lock';
  monitorTabSwitch: boolean;
  monitorDevTools: boolean;
  monitorCopyPaste: boolean;
  logEvents: boolean;
  enableDevToolsDetection: boolean;
  enableBlurDetection: boolean;
  enableTabSwitchDetection: boolean;
}

const DEFAULT_CONFIG: AntiCheatConfig = {
  enableFullScreen: true,
  maxViolations: 5,
  warningThreshold: 3,
  actionOnMaxViolations: 'submit',
  monitorTabSwitch: true,
  monitorDevTools: true,
  monitorCopyPaste: true,
  logEvents: true,
  enableDevToolsDetection: true,
  enableBlurDetection: true,
  enableTabSwitchDetection: true
};

export const useAntiCheat = (
  config: Partial<AntiCheatConfig> = {},
  onViolation?: (violation: AntiCheatEvent) => void,
  onMaxViolationsReached?: () => void
) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [violations, setViolations] = useState<AntiCheatEvent[]>([]);
  const [isExamLocked, setIsExamLocked] = useState(false);
  const [warningsShown, setWarningsShown] = useState(0);
  
  const violationCountRef = useRef(0);
  const examActiveRef = useRef(false);
  const lastFocusTime = useRef(Date.now());
  const devToolsInterval = useRef<NodeJS.Timeout | null>(null);

  // Event handlers
  const handleWindowBlur = useCallback(() => {
    if (examActiveRef.current) {
      lastFocusTime.current = Date.now();
      logViolation({
        type: 'window_blur',
        timestamp: new Date(),
        details: 'Window lost focus'
      });
    }
  }, []);

  const handleWindowFocus = useCallback(() => {
    if (examActiveRef.current && lastFocusTime.current) {
      const timeAway = Date.now() - lastFocusTime.current;
      if (timeAway > 3000) { // More than 3 seconds away
        logViolation({
          type: 'tab_switch',
          timestamp: new Date(),
          details: `Window regained focus after ${Math.round(timeAway / 1000)}s`
        });
      }
    }
  }, []);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && examActiveRef.current) {
      logViolation({
        type: 'tab_switch',
        timestamp: new Date(),
        details: 'User switched tabs or minimized window'
      });
    }
  }, []);

  const startDevToolsDetection = useCallback(() => {
    if (!fullConfig.enableDevToolsDetection) return;

    let devtoolsOpen = false;
    const threshold = 160;

    const checkDevTools = () => {
      if (examActiveRef.current) {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        const isOpen = widthThreshold || heightThreshold;

        if (isOpen && !devtoolsOpen) {
          devtoolsOpen = true;
          logViolation({
            type: 'devtools',
            timestamp: new Date(),
            details: 'Developer tools detected'
          });
        } else if (!isOpen) {
          devtoolsOpen = false;
        }
      }
    };

    devToolsInterval.current = setInterval(checkDevTools, 500);
  }, [fullConfig.enableDevToolsDetection]);

  // Log violation
  const logViolation = useCallback((violation: AntiCheatEvent) => {
    if (!examActiveRef.current || isExamLocked) return;

    violationCountRef.current += 1;
    setViolations(prev => [...prev, violation]);

    if (fullConfig.logEvents) {
      console.warn('🚨 Anti-cheat violation:', violation);
    }

    // Call external violation handler
    onViolation?.(violation);

    // Show warning if threshold reached
    if (violationCountRef.current >= fullConfig.warningThreshold && warningsShown < 2) {
      setWarningsShown(prev => prev + 1);
      toast.error(
        `Security Warning ${warningsShown + 1}: Suspicious activity detected. ` +
        `${fullConfig.maxViolations - violationCountRef.current} violations remaining before action.`,
        { duration: 6000 }
      );
    }

    // Take action if max violations reached
    if (violationCountRef.current >= fullConfig.maxViolations) {
      switch (fullConfig.actionOnMaxViolations) {
        case 'warn':
          toast.error('Maximum security violations reached! Please follow exam guidelines.', 
            { duration: 10000 });
          break;
        case 'lock':
          setIsExamLocked(true);
          toast.error('Exam locked due to security violations. Please contact administrator.', 
            { duration: 0 });
          break;
        case 'submit':
          toast.error('Maximum violations reached. Exam will be auto-submitted.', 
            { duration: 8000 });
          onMaxViolationsReached?.();
          break;
      }
    }
  }, [fullConfig, onViolation, onMaxViolationsReached, isExamLocked, warningsShown]);

  // Request fullscreen (must be called directly from user gesture)
  const requestFullScreen = useCallback(async () => {
    if (!fullConfig.enableFullScreen) return true;
    
    if (document.fullscreenElement) {
      setIsFullScreen(true);
      return true;
    }

    const el: any = document.documentElement;
    
    // Try different approaches based on browser
    const methods = [
      'requestFullscreen',
      'webkitRequestFullscreen', 
      'msRequestFullscreen',
      'mozRequestFullScreen'
    ];
    
    let api = null;
    for (const method of methods) {
      if (el[method]) {
        api = el[method];
        break;
      }
    }

    if (!api) {
      toast.error('Fullscreen API not supported by this browser');
      return false;
    }

    try {
      await api.call(el);
      setIsFullScreen(true);
      toast.success('Entered fullscreen mode');
      return true;
    } catch (error) {
      console.error('Fullscreen request failed:', error);
      toast.error('Browser blocked fullscreen. Please allow fullscreen access or press F11 manually.');
      return false;
    }
  }, [fullConfig.enableFullScreen]);

  // Initialize monitoring (fullscreen handled separately)
  const startAntiCheat = useCallback(() => {
    examActiveRef.current = true;
    
    // Check if we're already in fullscreen
    if (document.fullscreenElement) {
      setIsFullScreen(true);
    }
    
    // Start monitoring for violations
    if (fullConfig.enableBlurDetection) {
      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);
    }
    
    if (fullConfig.enableTabSwitchDetection) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    if (fullConfig.enableDevToolsDetection) {
      startDevToolsDetection();
    }
    
    // Log start event
    if (fullConfig.logEvents) {
      console.log('🔒 Anti-cheat monitoring started at', new Date().toISOString());
    }
  }, [fullConfig, handleWindowBlur, handleWindowFocus, handleVisibilityChange, startDevToolsDetection]);

  // Stop monitoring and exit fullscreen
  /**
   * Stop monitoring. By default keeps the exam in fullscreen until caller decides to exit
   * to avoid a flash exit/re-enter sequence right after start.
   */
  const stopAntiCheat = useCallback((options?: { exitFullscreen?: boolean }) => {
    examActiveRef.current = false;
    
    if (options?.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(console.warn);
    }
    
    if (devToolsInterval.current) {
      clearInterval(devToolsInterval.current);
      devToolsInterval.current = null;
    }
    
    // Remove event listeners
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    
    setIsFullScreen(false);
  }, [handleWindowBlur, handleWindowFocus, handleVisibilityChange]);

  // Monitor fullscreen changes (unified, no duplicates)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullScreen(isNowFullscreen);
      
      // Only log violations after a delay to avoid false positives during initialization
      if (examActiveRef.current && fullConfig.enableFullScreen && !isNowFullscreen) {
        setTimeout(() => {
          // Double-check that we're still not in fullscreen after a delay
          if (!document.fullscreenElement && examActiveRef.current) {
            logViolation({
              type: 'fullscreen_exit',
              timestamp: new Date(),
              details: 'User exited fullscreen mode'
            });
          }
        }, 500); // 500ms delay to avoid false positives
      }
    };

    const handleFullscreenError = () => {
      toast.error('Failed to enter fullscreen mode');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    document.addEventListener('fullscreenerror', handleFullscreenError);
    document.addEventListener('webkitfullscreenerror', handleFullscreenError);
    document.addEventListener('mozfullscreenerror', handleFullscreenError);
    document.addEventListener('msfullscreenerror', handleFullscreenError);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
      
      document.removeEventListener('fullscreenerror', handleFullscreenError);
      document.removeEventListener('webkitfullscreenerror', handleFullscreenError);
      document.removeEventListener('mozfullscreenerror', handleFullscreenError);
      document.removeEventListener('msfullscreenerror', handleFullscreenError);
    };
  }, [fullConfig.enableFullScreen, logViolation]);

  // Monitor tab switching and window focus
  useEffect(() => {
    if (!fullConfig.monitorTabSwitch) return;

    const handleVisibilityChange = () => {
      if (document.hidden && examActiveRef.current) {
        logViolation({
          type: 'tab_switch',
          timestamp: new Date(),
          details: 'User switched tabs or minimized window'
        });
      }
    };

    const handleWindowBlur = () => {
      if (examActiveRef.current) {
        lastFocusTime.current = Date.now();
        logViolation({
          type: 'window_blur',
          timestamp: new Date(),
          details: 'Window lost focus'
        });
      }
    };

    const handleWindowFocus = () => {
      if (examActiveRef.current && lastFocusTime.current) {
        const timeAway = Date.now() - lastFocusTime.current;
        if (timeAway > 3000) { // More than 3 seconds away
          logViolation({
            type: 'tab_switch',
            timestamp: new Date(),
            details: `Window regained focus after ${Math.round(timeAway / 1000)}s`
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fullConfig.monitorTabSwitch, logViolation]);

  // Monitor developer tools
  useEffect(() => {
    if (!fullConfig.monitorDevTools) return;

    let devtoolsOpen = false;
    const threshold = 160;

    const checkDevTools = () => {
      if (examActiveRef.current) {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        const isOpen = widthThreshold || heightThreshold;

        if (isOpen && !devtoolsOpen) {
          devtoolsOpen = true;
          logViolation({
            type: 'devtools',
            timestamp: new Date(),
            details: 'Developer tools detected'
          });
        } else if (!isOpen) {
          devtoolsOpen = false;
        }
      }
    };

    devToolsInterval.current = setInterval(checkDevTools, 500);

    return () => {
      if (devToolsInterval.current) {
        clearInterval(devToolsInterval.current);
      }
    };
  }, [fullConfig.monitorDevTools, logViolation]);

  // Monitor copy/paste and keyboard shortcuts
  useEffect(() => {
    if (!fullConfig.monitorCopyPaste) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!examActiveRef.current) return;

      // Block common shortcuts
      const blockedShortcuts = [
        { key: 'F12' }, // DevTools
        { key: 'F5' }, // Refresh
        { key: 'r', ctrl: true }, // Refresh
        { key: 'w', ctrl: true }, // Close tab
        { key: 't', ctrl: true }, // New tab
        { key: 'n', ctrl: true }, // New window
        { key: 'j', ctrl: true, shift: true }, // DevTools
        { key: 'i', ctrl: true, shift: true }, // DevTools
        { key: 'c', ctrl: true, shift: true }, // DevTools Console
        { key: 'Tab', alt: true }, // Alt+Tab
      ];

      const shortcut = blockedShortcuts.find(s => 
        event.key === s.key &&
        (!s.ctrl || event.ctrlKey) &&
        (!s.shift || event.shiftKey) &&
        (!s.alt || event.altKey)
      );

      if (shortcut) {
        event.preventDefault();
        logViolation({
          type: 'keyboard_shortcut',
          timestamp: new Date(),
          details: `Blocked shortcut: ${event.ctrlKey ? 'Ctrl+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.altKey ? 'Alt+' : ''}${event.key}`
        });
      }
    };

    const handleCopy = (event: ClipboardEvent) => {
      if (examActiveRef.current) {
        event.preventDefault();
        logViolation({
          type: 'copy',
          timestamp: new Date(),
          details: 'Copy operation blocked'
        });
      }
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (examActiveRef.current) {
        // Allow paste in text inputs only
        const target = event.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          event.preventDefault();
          logViolation({
            type: 'paste',
            timestamp: new Date(),
            details: 'Paste operation blocked'
          });
        }
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      if (examActiveRef.current) {
        event.preventDefault();
        logViolation({
          type: 'context_menu',
          timestamp: new Date(),
          details: 'Right-click context menu blocked'
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [fullConfig.monitorCopyPaste, logViolation]);

  // Force fullscreen if it's lost
  const forceFullScreen = useCallback(async () => {
    if (fullConfig.enableFullScreen && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        toast.success('Returned to fullscreen mode');
      } catch (error) {
        toast.error('Failed to enter fullscreen. Please manually enable it.');
      }
    }
  }, [fullConfig.enableFullScreen]);

  return {
    isFullScreen,
    violations,
    violationCount: violationCountRef.current,
    isExamLocked,
    warningsShown,
    startAntiCheat,
    stopAntiCheat,
    forceFullScreen,
    requestFullScreen,
    logViolation
  };
};
