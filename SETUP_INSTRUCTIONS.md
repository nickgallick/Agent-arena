# Bouts — Setup Instructions for Nick

## Status Summary
- ✅ Code fixes applied (dead links, auth flow, hydration)
- ✅ Build passes successfully
- ⚠️ Needs: Supabase project + GitHub OAuth + Vercel deploy credentials

---

## Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard → **New Project**
2. Name: `agent-arena`
3. Database password: generate a strong one, save it
4. Region: pick closest to your users
5. Once created, go to **Settings → API** and copy:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (secret!)

## Step 2: Run Migrations

In the Supabase dashboard → **SQL Editor**, run these in order:

1. `supabase/migrations/00001_initial_schema.sql` — creates all tables, types, functions, RLS
2. `supabase/migrations/00002_seed_data.sql` — seeds model_registry (18 models), weight_classes (6), badges (16), feature_flags (10)
3. `supabase/migrations/00003_forge_fixes.sql` — fixes pick_job, adds challenge_prompts (50), indexes, rate limiting

**OR** if you have `supabase` CLI linked:
```bash
supabase db push
```

## Step 3: Configure GitHub OAuth

### 3a. Create GitHub OAuth App
1. Go to https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. Fill in:
   - **Application name**: `Bouts`
   - **Homepage URL**: `https://agent-arena.vercel.app` (or your custom domain)
   - **Authorization callback URL**: `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
3. Click **Register application**
4. Copy the **Client ID**
5. Click **Generate a new client secret** → copy the **Client Secret**

### 3b. Enable GitHub Provider in Supabase
1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **GitHub** → Enable it
3. Paste the **Client ID** and **Client Secret** from step 3a
4. Save

## Step 4: Update .env.local

Update `/data/agent-arena/.env.local` with real values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-real-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-real-service-role-key
NEXT_PUBLIC_APP_URL=https://agent-arena.vercel.app
NEXT_PUBLIC_SITE_NAME=Bouts
NEXT_PUBLIC_SITE_DESCRIPTION=Where AI Agents Compete
NEXT_PUBLIC_FEATURE_ADMIN_DASHBOARD=true
ANTHROPIC_API_KEY=sk-ant-...your-anthropic-key
JUDGE_MODEL=claude-sonnet-4-20250514
JUDGE_MAX_TOKENS=2048
JUDGE_TEMPERATURE=0.3
```

## Step 5: Deploy to Vercel

### Option A: Via Vercel Dashboard
1. Go to https://vercel.com → find `agent-arena` project
2. Go to **Settings → Environment Variables**
3. Add all env vars from Step 4
4. Trigger a redeploy (Settings → Deployments → Redeploy)

### Option B: Via CLI
```bash
cd /data/agent-arena
vercel login  # authenticate first
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ANTHROPIC_API_KEY
# ... add all env vars
vercel --prod
```

## Step 6: Test GitHub OAuth

1. Visit the deployed URL
2. Click "Sign in with GitHub"
3. Should redirect to GitHub → authorize → redirect back to app
4. Check Supabase Auth → Users to confirm the user was created

---

## Code Fixes Applied

### 1. Dead Footer Links (QA Issue)
- Removed `/about` and `/docs` links from footer (they 404'd)
- Replaced with `/challenges` and `/leaderboard`

### 2. GitHub OAuth Auth Flow (Was Broken)
- **Created** `/api/auth/github/route.ts` — initiates OAuth flow via Supabase
- **Fixed** `/callback/route.ts` — properly exchanges auth code for session using `supabase.auth.exchangeCodeForSession()`
- **Wired** all "Sign in with GitHub" buttons (header desktop, header mobile, hero section) to `/api/auth/github`

### 3. Hydration Error Fix
- `useCountdown` hook now returns initial zeros on SSR, only computes real values after mount
- `CountdownTimer` shows `--:--:--` placeholder during SSR to prevent mismatch

### Seed Data Summary (in migrations)
- ✅ 18 models in `model_registry`
- ✅ 6 weight classes
- ✅ 16 badges
- ✅ 10 feature flags
- ✅ 50 challenge prompts (in 00003_forge_fixes.sql)
