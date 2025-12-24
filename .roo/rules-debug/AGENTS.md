# AGENTS.md - Debug Mode

This file provides debugging-specific guidance for the Streamlets project.

## Debugging Strategy

### Backend Debugging

#### Cloudflare Workers Dev Server
```bash
pnpm --filter @streamlets/backend dev
```
- Runs on `http://localhost:8787` by default
- Supports hot reload
- Logs to console

#### Common Backend Issues

**Database Connection Failures**
- Check `SUPABASE_URL` and `SUPABASE_API_KEY_SECRET` in `.env`
- Verify Supabase project is active
- Check RLS policies if queries return empty results

**Twitch JWT Validation Errors**
- Verify `TWITCH_EXTENSION_SECRET` is base64-encoded in `.env`
- The secret is automatically base64-decoded in `authenticateTwitchJWT` middleware
- Check JWT expiration (1 hour default)

**CORS Errors**
- Development: Allows `localhost:5173` and `localhost:5174`
- Production: Requires `*.ext-twitch.tv` origin
- Check `NODE_ENV` is set correctly

#### Backend Logging
- Structured JSON logging in `backend/src/middleware/logger.ts`
- Request/response logging includes duration, status, userId
- Performance warnings for requests >100ms

### Frontend Extension Debugging

#### Twitch Extension Context
The extension runs in an iframe with special Twitch SDK:
```typescript
// Check if Twitch SDK is available
if (!window.Twitch?.ext) {
  console.error('Twitch Extension SDK not available');
}

// Listen for authorization
window.Twitch.ext.onAuthorized((auth) => {
  console.log('Authorized:', auth);
});
```

#### Common Extension Issues

**"Twitch Extension SDK not available"**
- Extension must be loaded via Twitch Extension iframe
- Cannot test directly in browser without Twitch context
- Use Twitch Developer Rig for local testing

**JWT Token Issues**
- Token expires after 1 hour
- Token is refreshed automatically by Twitch SDK
- Check `onAuthorized` callback for new tokens

**API Authentication Failures**
- Verify `VITE_API_BASE_URL` is set in `.env`
- Check backend CORS allows extension origin
- Token is automatically added to requests by `ApiClient`

### Frontend Website Debugging

#### Supabase Auth Debugging
```typescript
import { getSupabaseClient } from './services/supabase';

const supabase = getSupabaseClient();
const { data, error } = await supabase.auth.getSession();
console.log('Session:', data.session);
console.log('Error:', error);
```

#### Common Website Issues

**Supabase Auth Not Working**
- Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_API_KEY_PUBLIC` in `.env`
- Verify Supabase Auth is enabled in project settings
- Check redirect URLs in Supabase dashboard

**API Requests Failing**
- Verify user is authenticated (check session)
- Check backend CORS allows website origin
- API client automatically adds Supabase session token

## Debugging Tools

### Backend
- `wrangler dev` - Local Cloudflare Workers environment
- Vitest debugger for unit tests
- Console logging with structured JSON

### Frontend Extension
- Twitch Developer Rig for local extension testing
- Browser DevTools (works in extension iframe)
- React DevTools for component inspection

### Frontend Website
- Vite dev server with HMR
- React DevTools
- Browser DevTools network tab for API calls

## Common Error Messages

### Backend Errors

**"Failed to generate random value"**
- RNG service initialization failed
- Check `crypto.getRandomValues()` is available (Cloudflare Workers)

**"JWT validation error"**
- Invalid or expired Twitch JWT
- Check `TWITCH_EXTENSION_SECRET` is correct

**"Database health check failed"**
- Supabase connection issue
- Verify credentials and network connectivity

### Frontend Errors

**"API client not initialized"**
- Call `initializeApiClient()` before using API
- Check `VITE_API_BASE_URL` environment variable

**"Missing Supabase environment variables"**
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_API_KEY_PUBLIC`
- Check `.env` file exists and is loaded

## Performance Debugging

### Backend Performance
- Target: <100ms p95 for API responses
- Check `performanceTracker.getAllStats()` for metrics
- Slow requests logged with warning

### Frontend Performance
- Use React DevTools Profiler
- Check bundle size with Vite build analyzer
- Monitor API response times

## Testing Debugging

### Backend Tests
```bash
pnpm --filter @streamlets/backend test
pnpm --filter @streamlets/backend test:watch
```

### Frontend Tests
```bash
pnpm --filter @streamlets/frontend-extension test
pnpm --filter @streamlets/frontend-extension test:e2e
```

### Test RNG Behavior
Use seeded RNG for reproducible tests:
```typescript
import { TestRNG } from './services/rng.test';
const rng = new TestRNG(12345); // Always produces same sequence
```
