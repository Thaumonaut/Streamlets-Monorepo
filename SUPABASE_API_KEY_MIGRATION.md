# Supabase API Key Migration Guide

## Overview

This document describes the migration from Supabase's legacy API key naming to the new scoped API key system completed on 2025-12-24.

## What Changed

Supabase has transitioned from generic key names to more descriptive, purpose-specific naming:

| Old Name | New Name | Purpose |
|----------|----------|---------|
| `SUPABASE_ANON_KEY` | `SUPABASE_API_KEY_PUBLIC` | Publishable key - Safe for browser/client-side use |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_API_KEY_SECRET` | Secret key - Server-only, elevated privileges |

### Key Characteristics

**Publishable API Key (Public)**
- ✅ Safe to expose in browser/frontend code
- ✅ Respects Row Level Security (RLS) policies
- ✅ Used for client-side authentication and queries
- ⚠️ Should still be prefixed with `VITE_` in frontend to indicate it's exposed

**Secret API Key**
- ⛔ NEVER expose in browser/frontend code
- ⛔ NEVER commit to version control
- ✅ Bypasses RLS policies (admin-level access)
- ✅ Used for server-side operations requiring elevated privileges
- ⚠️ Must NOT be prefixed with `VITE_` (prevents accidental exposure)

## Files Modified

### Configuration Files

1. **[`.env.example`](.env.example)** - Root configuration
   - Updated backend section with new key names
   - Updated frontend section with new key names
   - Added comprehensive migration notes
   - Added instructions for finding keys in Supabase Dashboard

2. **[`backend/.env.example`](backend/.env.example)**
   - Added deprecation notice (use root `.env.example` instead)
   - Updated to new key naming

3. **[`frontend-website/.env.example`](frontend-website/.env.example)**
   - Added deprecation notice (use root `.env.example` instead)
   - Updated to new key naming

4. **[`backend/wrangler.toml`](backend/wrangler.toml)**
   - Updated `.dev.vars` example with new key names
   - Added migration note in comments

### Source Code Files

5. **[`backend/src/index.ts`](backend/src/index.ts)**
   - Updated `Env` interface:
     ```typescript
     // OLD
     SUPABASE_ANON_KEY: string;
     SUPABASE_SERVICE_ROLE_KEY: string;
     
     // NEW
     SUPABASE_API_KEY_PUBLIC: string;
     SUPABASE_API_KEY_SECRET: string;
     ```

6. **[`backend/src/db/client.ts`](backend/src/db/client.ts)**
   - Updated global `Env` interface
   - Updated `createServiceRoleClient()` to use `SUPABASE_API_KEY_SECRET`
   - Updated `createAnonClient()` to use `SUPABASE_API_KEY_PUBLIC`
   - Updated `createAuthenticatedClient()` to use `SUPABASE_API_KEY_PUBLIC`
   - Added clarifying comments

7. **[`frontend-website/src/services/supabase.ts`](frontend-website/src/services/supabase.ts)**
   - Updated `SupabaseConfig` interface:
     ```typescript
     // OLD
     anonKey: string;
     
     // NEW
     publicKey: string;
     ```
   - Updated environment variable reference to `VITE_SUPABASE_API_KEY_PUBLIC`
   - Updated error messages

8. **[`frontend-website/src/vite-env.d.ts`](frontend-website/src/vite-env.d.ts)** ⭐ NEW FILE
   - Created TypeScript definitions for Vite environment variables
   - Defines `ImportMetaEnv` and `ImportMeta` interfaces
   - Fixes TypeScript errors for `import.meta.env`

### Database Migration Scripts

9. **[`db-migrations/seed-emotes.ts`](db-migrations/seed-emotes.ts)**
   - Updated to use `SUPABASE_API_KEY_SECRET`
   - Updated error messages

10. **[`db-migrations/seed-rarity.ts`](db-migrations/seed-rarity.ts)**
    - Updated to use `SUPABASE_API_KEY_SECRET`
    - Updated error messages

### Documentation

11. **[`specs/001-twitch-emote-mvp/quickstart.md`](specs/001-twitch-emote-mvp/quickstart.md)**
    - Updated Backend .env section with new key names
    - Updated Frontend Website .env section with new key names
    - Updated "Where to find values" section with detailed instructions
    - Updated debug section references
    - Added migration notes

## Migration Instructions for Developers

### 1. Get Your New API Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to: **Project Settings** → **API**
4. Copy the following:
   - **URL**: Your Supabase project URL
   - **anon public** key → This is your `SUPABASE_API_KEY_PUBLIC`
   - **service_role** key → This is your `SUPABASE_API_KEY_SECRET`

### 2. Update Your Local .env File

Update your root `.env` file (create from `.env.example` if needed):

```bash
# Backend Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_API_KEY_PUBLIC=your-public-api-key-here
SUPABASE_API_KEY_SECRET=your-secret-api-key-here

# Frontend Website Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_API_KEY_PUBLIC=your-public-api-key-here
```

### 3. Update Cloudflare Workers Secrets (Production)

For deployed environments, update your Cloudflare Workers secrets:

```bash
cd backend

# Set new secrets
wrangler secret put SUPABASE_API_KEY_PUBLIC
wrangler secret put SUPABASE_API_KEY_SECRET

# Optional: Delete old secrets (after migration confirmed working)
wrangler secret delete SUPABASE_ANON_KEY
wrangler secret delete SUPABASE_SERVICE_ROLE_KEY
```

### 4. Update .dev.vars for Local Development

Update `backend/.dev.vars`:

```bash
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_API_KEY_PUBLIC="your-public-api-key"
SUPABASE_API_KEY_SECRET="your-secret-api-key"
TWITCH_EXTENSION_CLIENT_ID="your-client-id"
TWITCH_EXTENSION_SECRET="your-secret"
```

### 5. Verify the Migration

```bash
# Install dependencies
pnpm install

# Run TypeScript type check
pnpm type-check

# Start development servers
pnpm dev

# Test backend health endpoint
curl http://localhost:8787/health

# Verify Supabase connection
curl http://localhost:8787/api/v1/health
```

## Breaking Changes

### For Backend Developers

- Update any code that references `SUPABASE_ANON_KEY` to `SUPABASE_API_KEY_PUBLIC`
- Update any code that references `SUPABASE_SERVICE_ROLE_KEY` to `SUPABASE_API_KEY_SECRET`
- The Cloudflare Workers `Env` interface has been updated

### For Frontend Developers

- Update any code that references `VITE_SUPABASE_ANON_KEY` to `VITE_SUPABASE_API_KEY_PUBLIC`
- The `SupabaseConfig` interface has been updated

### For DevOps/Deployment

- Update CI/CD pipeline environment variables
- Update Cloudflare Workers secrets
- Update any deployment scripts

## Backward Compatibility

⚠️ **No backward compatibility** - The old environment variable names are no longer recognized. All instances have been migrated to the new naming convention.

## Security Reminders

1. **Never expose Secret API Key**: The `SUPABASE_API_KEY_SECRET` has admin privileges and bypasses RLS
2. **Never use VITE_ prefix for secrets**: Variables prefixed with `VITE_` are exposed to the browser
3. **Rotate keys regularly**: Consider rotating API keys periodically
4. **Use different keys for different environments**: Development, staging, and production should use separate Supabase projects

## Rollback Procedure

If you need to rollback (not recommended):

1. Revert all code changes
2. Update environment variables back to old names
3. Note: The Supabase Dashboard still shows the same keys, just with different labels

## Support

If you encounter issues during migration:

1. Check that all environment variables are set correctly
2. Verify API keys are copied correctly from Supabase Dashboard
3. Ensure no trailing spaces or quotes in .env files
4. Check TypeScript compilation for any missed references
5. Review the files listed in this guide for proper migration

## References

- [Supabase API Settings Documentation](https://supabase.com/docs/guides/api)
- [Environment Variables Best Practices](.env.example)
- [TypeScript Configuration](tsconfig.json)

---

**Migration completed**: 2025-12-24  
**Status**: ✅ Complete - All files updated and type-safe
