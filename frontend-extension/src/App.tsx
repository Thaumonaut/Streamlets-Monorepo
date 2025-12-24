/**
 * Twitch Extension Main App Component
 * 
 * Integrates with Twitch Extension SDK and provides authenticated context.
 * Handles Twitch Extension lifecycle and JWT token management.
 * 
 * Reference: plan.md - Twitch Extension integration
 */

import { useEffect, useState } from 'react';

/**
 * Twitch Extension Helper interface
 * Provided by the Twitch Extension Helper library
 */
interface TwitchExt {
  onAuthorized: (callback: (auth: TwitchAuth) => void) => void;
  onContext: (callback: (context: TwitchContext) => void) => void;
  onError: (callback: (error: string) => void) => void;
  viewer: {
    id: string;
    role: 'viewer' | 'broadcaster' | 'moderator';
  };
  context: TwitchContext;
}

interface TwitchAuth {
  token: string;
  userId: string;
  channelId: string;
  clientId: string;
  helixToken?: string;
}

interface TwitchContext {
  arePlayerControlsVisible: boolean;
  bitrate: number;
  bufferSize: number;
  displayResolution: string;
  game: string;
  hlsLatencyBroadcaster: number;
  isFullScreen: boolean;
  isPaused: boolean;
  isTheatreMode: boolean;
  language: string;
  mode: 'viewer' | 'dashboard' | 'config';
  playbackMode: string;
  theme: 'light' | 'dark';
  videoResolution: string;
  volume: number;
}

// Extend window with Twitch global
declare global {
  interface Window {
    Twitch?: {
      ext: TwitchExt;
    };
  }
}

/**
 * App state for Twitch Extension
 */
interface AppState {
  isLoading: boolean;
  isAuthorized: boolean;
  token: string | null;
  userId: string | null;
  channelId: string | null;
  theme: 'light' | 'dark';
  error: string | null;
}

function App() {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    isAuthorized: false,
    token: null,
    userId: null,
    channelId: null,
    theme: 'dark',
    error: null,
  });

  useEffect(() => {
    // Check if Twitch Extension SDK is available
    if (!window.Twitch?.ext) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Twitch Extension SDK not available',
      }));
      return;
    }

    const twitch = window.Twitch.ext;

    // Handle authorization
    twitch.onAuthorized((auth: TwitchAuth) => {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isAuthorized: true,
        token: auth.token,
        userId: auth.userId,
        channelId: auth.channelId,
      }));
    });

    // Handle context updates (theme changes, etc.)
    twitch.onContext((context: TwitchContext) => {
      setState((prev) => ({
        ...prev,
        theme: context.theme,
      }));
    });

    // Handle errors
    twitch.onError((error: string) => {
      console.error('Twitch Extension error:', error);
      setState((prev) => ({
        ...prev,
        error,
      }));
    });
  }, []);

  // Loading state
  if (state.isLoading) {
    return (
      <div className={`app theme-${state.theme}`}>
        <div className="loading">
          <p>Loading Streamlets...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className={`app theme-${state.theme}`}>
        <div className="error">
          <h2>Error</h2>
          <p>{state.error}</p>
        </div>
      </div>
    );
  }

  // Not authorized state
  if (!state.isAuthorized || !state.token) {
    return (
      <div className={`app theme-${state.theme}`}>
        <div className="unauthorized">
          <p>Connecting to Twitch...</p>
        </div>
      </div>
    );
  }

  // Authorized - render main app
  return (
    <div className={`app theme-${state.theme}`}>
      <header>
        <h1>Streamlets</h1>
        <p>Collect Twitch emote cards!</p>
      </header>
      
      <main>
        {/* TODO: Add routing and pages here after Phase 2 */}
        <div className="placeholder">
          <p>Extension is ready!</p>
          <p>User ID: {state.userId}</p>
          <p>Channel ID: {state.channelId}</p>
          <p>Theme: {state.theme}</p>
        </div>
      </main>
    </div>
  );
}

export default App;
