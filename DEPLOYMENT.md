# Vercel Deployment Guide

## Prerequisites

Before deploying, ensure you have:
1. A Vercel account (https://vercel.com/signup)
2. A Supabase project with database configured
3. Git repository with your code (GitHub, GitLab, or Bitbucket)

## Step 1: Prepare Environment Variables

You'll need these environment variables from your Supabase project:

### Get Supabase Credentials
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Get Database URLs
1. In Supabase, go to Settings → Database
2. Copy Connection string (Pooler mode) → `DATABASE_URL`
3. Copy Connection string (Direct mode) → `DATABASE_URL` (use port 5432 instead of 6543) → `DIRECT_URL`

## Step 2: Deploy via Vercel Web Dashboard

### Option A: Import from Git (Recommended)

1. **Push your code to Git**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-git-repo-url>
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com/dashboard
   - Click "Add New" → "Project"
   - Import your repository
   - Vercel will auto-detect Next.js

3. **Configure Project**
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-5 minutes)

### Option B: Deploy via Vercel CLI

If you prefer using CLI (requires installation):

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts to configure
```

## Step 3: Post-Deployment Setup

### 1. Update Supabase Auth Redirect URLs

After deployment, update Supabase authentication settings:

1. Go to Supabase → Authentication → URL Configuration
2. Update Site URL to your Vercel domain:
   ```
   https://your-project.vercel.app
   ```
3. Add Redirect URLs:
   ```
   https://your-project.vercel.app/api/auth/callback
   https://your-project.vercel.app/reset-password
   ```

### 2. Run Database Migrations (if needed)

If you have pending migrations:

```bash
# Locally, set your production DATABASE_URL
DATABASE_URL="your-production-db-url" npx prisma migrate deploy
```

Or use Vercel Postgres if you're using it instead of Supabase.

### 3. Seed Database (Optional)

If you need to seed the production database:

```bash
# Set production environment variables
DATABASE_URL="your-production-db-url"
DIRECT_URL="your-production-direct-url"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run seed
npm run db:seed
```

## Step 4: Configure Custom Domain (Optional)

1. Go to Vercel project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Update `NEXT_PUBLIC_APP_URL` in Vercel environment variables

## Step 5: Test Deployment

1. Visit your Vercel URL
2. Test login with your admin credentials
3. Verify all features work:
   - User authentication
   - Dashboard access
   - Database operations
   - File uploads (Supabase Storage)

## Troubleshooting

### Build Errors

**Error: "Prisma Client is not generated"**
- Add a build script in `package.json`:
  ```json
  "scripts": {
    "postinstall": "prisma generate"
  }
  ```
- Or add in Vercel: Settings → Build & Development → Build Command:
  ```
  prisma generate && npm run build
  ```

**Error: "Environment variable not found"**
- Ensure all required variables are set in Vercel
- Check variable names match exactly (case-sensitive)

### Runtime Errors

**Error: "Database connection failed"**
- Verify `DATABASE_URL` and `DIRECT_URL` are correct.
- If you see `FATAL: (ENOIDENTIFIER) no tenant identifier provided` or `FATAL: (ENOTFOUND) tenant/user postgres.[ref] not found` when using the regional pooler host `aws-0-[region].pooler.supabase.com`, switch to the instance-level connections:
  - **DATABASE_URL (Pooled, Port 6543):** `postgresql://postgres:[password]@db.[ref].supabase.co:6543/postgres?pgbouncer=true&sslmode=require`
  - **DIRECT_URL (Port 5432):** `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`
  *(Note: Ensure you use `.co` and not `.com` for the Supabase instance hostname)*
- Check Supabase project is active.
- Ensure connection pooling is enabled (use ?pgbouncer=true).

**Error: "Supabase auth error"**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Check Supabase Auth is enabled
- Ensure redirect URLs are configured in Supabase

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (admin) |
| `DATABASE_URL` | Yes | PostgreSQL connection string (pooler) |
| `DIRECT_URL` | Yes | PostgreSQL connection string (direct) |
| `NEXT_PUBLIC_APP_URL` | Yes | Your deployed app URL |

## Production Checklist

- [ ] All environment variables configured in Vercel
- [ ] Supabase Auth redirect URLs updated
- [ ] Database migrations applied
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic with Vercel)
- [ ] Test all user roles (Admin, Teacher, Student, Parent)
- [ ] Verify file uploads work
- [ ] Check email notifications (if configured)
- [ ] Set up monitoring (Vercel Analytics)

## Vercel-Specific Configuration

Your Next.js app is already configured for Vercel. No additional `vercel.json` is needed because:

- Next.js 15 has built-in Vercel optimization
- `next.config.ts` already includes necessary settings
- Build output is automatically detected

If you need custom configuration, create `vercel.json`:

```json
{
  "buildCommand": "prisma generate && npm run build",
  "env": {
    "NEXT_PUBLIC_APP_URL": {
      "description": "Your app URL"
    }
  }
}
```
