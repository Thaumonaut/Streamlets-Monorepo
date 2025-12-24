/**
 * Companion Website Main App Component
 * 
 * Provides routing and authentication context for the website.
 * Separate from Twitch Extension, uses Supabase Auth.
 * 
 * Reference: plan.md - Dual frontend architecture
 */

import { useEffect, useState } from 'react';
import { getSupabaseClient, onAuthStateChange } from './services/supabase';
import { initializeApiClient } from './services/api';

/**
 * App state for website
 */
interface AppState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: any | null;
}

function App() {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
  });

  useEffect(() => {
    // Initialize API client
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787/api/v1';
    initializeApiClient(apiBaseUrl);

    // Check initial auth state
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        isLoading: false,
        isAuthenticated: !!session,
        user: session?.user || null,
      });
    });

    // Listen for auth changes
    const subscription = onAuthStateChange((event, session) => {
      setState({
        isLoading: false,
        isAuthenticated: !!session,
        user: session?.user || null,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Loading state
  if (state.isLoading) {
    return (
      <div className="app">
        <div className="loading">
          <p>Loading Streamlets...</p>
        </div>
      </div>
    );
  }

  // Main app render
  return (
    <div className="app">
      <header>
        <nav>
          <h1>Streamlets</h1>
          <div className="nav-links">
            <a href="/">Home</a>
            <a href="/leaderboard">Leaderboard</a>
            {state.isAuthenticated && <a href="/collection">My Collection</a>}
            {state.isAuthenticated ? (
              <button>Sign Out</button>
            ) : (
              <a href="/login">Sign In</a>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* TODO: Add routing and pages here after Phase 2 */}
        <div className="placeholder">
          <h2>Welcome to Streamlets</h2>
          <p>Collect Twitch emote cards!</p>
          {state.isAuthenticated ? (
            <div>
              <p>Logged in as: {state.user?.email}</p>
              <p>View your collection in the Twitch Extension</p>
            </div>
          ) : (
            <div>
              <p>Sign in to view your collection on the web</p>
              <a href="/login">Get Started</a>
            </div>
          )}
        </div>
      </main>

      <footer>
        <p>&copy; 2025 Streamlets. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
