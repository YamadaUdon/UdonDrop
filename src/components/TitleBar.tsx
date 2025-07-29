import { FC, useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getTheme } from '../utils/theme';
import { SunIcon, MoonIcon } from './UIIcons';
import { isTauri } from '../utils/platform';

const TitleBar: FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const theme = getTheme(isDark);

  // Debug information
  console.log('TitleBar render - isTauri():', isTauri());
  console.log('TitleBar render - location:', typeof window !== 'undefined' ? window.location.href : 'no window');
  console.log('TitleBar render - hostname:', typeof window !== 'undefined' ? window.location.hostname : 'no window');
  console.log('TitleBar render - port:', typeof window !== 'undefined' ? window.location.port : 'no window');
  console.log('TitleBar render - window.__TAURI__:', typeof window !== 'undefined' ? '__TAURI__' in window : 'window undefined');
  console.log('TitleBar render - window.__TAURI_INTERNALS__:', typeof window !== 'undefined' ? '__TAURI_INTERNALS__' in window : 'window undefined');
  console.log('TitleBar render - userAgent contains Tauri:', typeof navigator !== 'undefined' ? navigator.userAgent.includes('Tauri') : 'no navigator');
  
  // Don't render title bar in browser environment
  if (!isTauri()) {
    console.log('TitleBar: Not rendering - not in Tauri environment');
    return null;
  }
  
  console.log('TitleBar: Rendering custom title bar');

  useEffect(() => {
    let appWindow: any = null;
    
    const initializeTauriWindow = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        appWindow = getCurrentWindow();
        
        const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
        
        // Check initial maximized/fullscreen state
        if (isMac) {
          const fullscreen = await appWindow.isFullscreen();
          setIsMaximized(fullscreen);
        } else {
          const maximized = await appWindow.isMaximized();
          setIsMaximized(maximized);
        }

        // Listen for window state changes
        const unlisten = appWindow.onResized(async () => {
          if (isMac) {
            const fullscreen = await appWindow.isFullscreen();
            setIsMaximized(fullscreen);
          } else {
            const maximized = await appWindow.isMaximized();
            setIsMaximized(maximized);
          }
        });

        return unlisten;
      } catch (error) {
        console.error('Error initializing Tauri window:', error);
      }
    };

    const unlistenPromise = initializeTauriWindow();

    return () => {
      unlistenPromise.then((unlisten: any) => {
        if (unlisten) unlisten();
      });
    };
  }, []);

  const handleMinimize = async () => {
    console.log('TitleBar: Minimize button clicked');
    if (!isTauri()) {
      console.log('TitleBar: Cannot minimize - not in Tauri environment');
      return;
    }
    
    try {
      console.log('TitleBar: Importing window module...');
      const windowModule = await import('@tauri-apps/api/window');
      console.log('TitleBar: Window module imported:', windowModule);
      
      const { getCurrentWindow } = windowModule;
      console.log('TitleBar: getCurrentWindow function:', getCurrentWindow);
      
      const appWindow = getCurrentWindow();
      console.log('TitleBar: Got window instance:', appWindow);
      console.log('TitleBar: Window instance type:', typeof appWindow);
      console.log('TitleBar: Window instance methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(appWindow)));
      
      console.log('TitleBar: Calling minimize()');
      await appWindow.minimize();
      console.log('TitleBar: Minimize completed');
    } catch (error) {
      console.error('Error minimizing window - Full error:', error);
      console.error('Error stack:', (error as Error).stack);
    }
  };

  const handleMaximize = async () => {
    console.log('TitleBar: Maximize button clicked, isMaximized:', isMaximized);
    if (!isTauri()) {
      console.log('TitleBar: Cannot maximize - not in Tauri environment');
      return;
    }
    
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      
      // Check if we're on macOS
      const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
      console.log('TitleBar: Platform check - isMac:', isMac);
      
      if (isMac) {
        // On macOS, use fullscreen instead of maximize
        const isFullscreen = await appWindow.isFullscreen();
        console.log('TitleBar: Current fullscreen state:', isFullscreen);
        
        if (isFullscreen) {
          console.log('TitleBar: Calling setFullscreen(false)');
          await appWindow.setFullscreen(false);
          setIsMaximized(false);
        } else {
          console.log('TitleBar: Calling setFullscreen(true)');
          await appWindow.setFullscreen(true);
          setIsMaximized(true);
        }
      } else {
        // On Windows/Linux, use maximize/unmaximize
        if (isMaximized) {
          console.log('TitleBar: Calling unmaximize()');
          await appWindow.unmaximize();
          setIsMaximized(false);
        } else {
          console.log('TitleBar: Calling maximize()');
          await appWindow.maximize();
          setIsMaximized(true);
        }
      }
      console.log('TitleBar: Maximize/fullscreen completed');
    } catch (error) {
      console.error('Error maximizing window:', error);
    }
  };

  const handleClose = async () => {
    console.log('TitleBar: Close button clicked');
    if (!isTauri()) {
      console.log('TitleBar: Cannot close - not in Tauri environment');
      return;
    }
    
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      console.log('TitleBar: Calling close()');
      await appWindow.close();
      console.log('TitleBar: Close completed');
    } catch (error) {
      console.error('Error closing window:', error);
    }
  };

  const titleBarStyle: React.CSSProperties = {
    height: '32px',
    backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0',
    borderBottom: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 99998,
    userSelect: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    // @ts-ignore
    WebkitAppRegion: 'drag', // Enable window dragging
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 500,
    color: theme.colors.textPrimary,
    marginLeft: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const controlsStyle: React.CSSProperties = {
    display: 'flex',
    // @ts-ignore
    WebkitAppRegion: 'no-drag', // Disable dragging on buttons
  };

  const buttonStyle: React.CSSProperties = {
    width: '46px',
    height: '32px',
    border: 'none',
    backgroundColor: 'transparent',
    color: theme.colors.textPrimary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontSize: '16px',
    // @ts-ignore
    WebkitAppRegion: 'no-drag', // Ensure buttons are clickable
  };

  const closeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
  };

  return (
    <div style={titleBarStyle}>
      <div style={titleStyle}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7V12C2 16.5 4.23 20.68 7.62 23L12 23L16.38 23C19.77 20.68 22 16.5 22 12V7L12 2Z" fill={theme.colors.accent} opacity="0.8"/>
          <path d="M12 2V23" stroke={theme.colors.surface} strokeWidth="2"/>
          <path d="M7 9L12 12L17 9" stroke={theme.colors.surface} strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span>DataFlow Manager</span>
      </div>
      
      <div style={controlsStyle}>
        <button
          style={buttonStyle}
          onClick={toggleTheme}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
        </button>
        <button
          style={buttonStyle}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Minimize button onClick triggered');
            handleMinimize();
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="none" style={{ pointerEvents: 'none' }}>
            <rect width="10" height="1" fill="currentColor"/>
          </svg>
        </button>
        
        <button
          style={buttonStyle}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Maximize button onClick triggered');
            handleMaximize();
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ pointerEvents: 'none' }}>
              <path d="M2.5 0H7.5C8.33 0 9 0.67 9 1.5V6.5C9 7.33 8.33 8 7.5 8H2.5C1.67 8 1 7.33 1 6.5V1.5C1 0.67 1.67 0 2.5 0Z" stroke="currentColor" strokeWidth="1"/>
              <path d="M1 3H3V1H7V5H5" stroke="currentColor" strokeWidth="1"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ pointerEvents: 'none' }}>
              <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1"/>
            </svg>
          )}
        </button>
        
        <button
          style={closeButtonStyle}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Close button onClick triggered');
            handleClose();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e81123';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = theme.colors.textPrimary;
          }}
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ pointerEvents: 'none' }}>
            <path d="M1 1L9 9M1 9L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;