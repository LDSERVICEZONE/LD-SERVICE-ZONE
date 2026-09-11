# Supabase Setup Guide

The project standardizes on **Supabase** for Authentication and PostgreSQL database management.

## 1. Credentials Configuration

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```env
# Supabase PostgreSQL connection string (from Database Settings -> Connection string -> URI)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require"

# Supabase Project API credentials (from Project Settings -> API)
SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
```

> [!WARNING]
> The `SUPABASE_SERVICE_ROLE_KEY` has full administrative bypass rights and is strictly read by `server.js`. It must NEVER be committed to Git or exposed to the client-side frontend bundle.

## 2. Supabase Authentication Setup

1. In your Supabase Dashboard, navigate to **Authentication** → **Providers** → **Email**:
   - Ensure the Email provider is **Enabled**.
   - Set email confirmation / OTP according to your onboarding workflow.
2. In **Authentication** → **URL Configuration**:
   - Set **Site URL** to your frontend URL (e.g., `http://localhost:8443` or production domain).
   - Add `http://localhost:8443/login` and `http://localhost:8443/reset-password` to **Redirect URLs**.

## 3. Database Schema Migration (Prisma on Supabase)

Generate the Prisma client and push the schema directly to your Supabase PostgreSQL instance:

```bash
# Push Prisma schema to Supabase Postgres
npm run db:push

# Or run Prisma migrations:
npm run db:migrate

# Open visual Prisma Studio to inspect tables:
npm run db:studio
```

## 4. Encryption & Security

- Generate a 32-byte secure key for `DATA_ENCRYPTION_KEY` in `.env` (`openssl rand -hex 32`). This key protects Aadhaar, PAN, and Bank details with AES-256-GCM.
- In production, set `NODE_ENV=production` and `DEMO_MODE=false`.
