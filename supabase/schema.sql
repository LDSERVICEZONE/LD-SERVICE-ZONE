-- ==============================================================================
-- LD SERVICE ZONE — SUPABASE POSTGRESQL SCHEMA
-- Paste and run this entire file in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Custom Enums
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('RETAILER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ApplicationStatus" AS ENUM ('PAYMENT_PENDING', 'SUBMITTED', 'PROCESSING', 'ACCEPTED', 'REJECTED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CORRECTION_REQUIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PAID', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "WalletEntryType" AS ENUM ('CREDIT', 'DEBIT', 'REVERSAL', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "RechargeStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. User & Authentication
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email" TEXT UNIQUE,
  "mobile" TEXT UNIQUE,
  "passwordHash" TEXT,
  "name" TEXT NOT NULL,
  "businessName" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'RETAILER',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "emailVerifiedAt" TIMESTAMPTZ,
  "supabaseUserId" TEXT UNIQUE,
  "mobileVerifiedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supabaseUserId" TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS "RetailerProfile" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "session_user_expires_idx" ON "Session"("userId", "expiresAt");

-- 3. Service Catalog
CREATE TABLE IF NOT EXISTS "ServiceCategory" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL UNIQUE,
  "active" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "Service" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "categoryId" TEXT NOT NULL REFERENCES "ServiceCategory"("id"),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "customerPrice" DECIMAL(12,2) NOT NULL,
  "retailerCommission" DECIMAL(12,2) NOT NULL,
  "processingDays" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "formSchema" JSONB,
  "requiredDocuments" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "service_category_active_idx" ON "Service"("categoryId", "active");

-- 4. Customer Applications
CREATE TABLE IF NOT EXISTS "Application" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "serviceId" TEXT NOT NULL REFERENCES "Service"("id"),
  "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "amount" DECIMAL(12,2) NOT NULL,
  "customerData" JSONB NOT NULL,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "application_user_created_idx" ON "Application"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "application_status_created_idx" ON "Application"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "ApplicationDocument" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "applicationId" TEXT NOT NULL REFERENCES "Application"("id") ON DELETE CASCADE,
  "storageKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ApplicationStatusHistory" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "applicationId" TEXT NOT NULL REFERENCES "Application"("id") ON DELETE CASCADE,
  "fromStatus" "ApplicationStatus",
  "toStatus" "ApplicationStatus" NOT NULL,
  "note" TEXT,
  "actorUserId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "app_status_hist_idx" ON "ApplicationStatusHistory"("applicationId", "createdAt");

-- 5. KYC Profiles & Documents
CREATE TABLE IF NOT EXISTS "KycProfile" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
  "encryptedData" TEXT,
  "rejectionReason" TEXT,
  "reviewedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "KycDocument" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "kycId" TEXT NOT NULL REFERENCES "KycProfile"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "KycReview" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "kycId" TEXT NOT NULL REFERENCES "KycProfile"("id") ON DELETE CASCADE,
  "status" "KycStatus" NOT NULL,
  "note" TEXT,
  "reviewerId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Wallets & Ledger
CREATE TABLE IF NOT EXISTS "Wallet" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "WalletLedger" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "walletId" TEXT NOT NULL REFERENCES "Wallet"("id") ON DELETE CASCADE,
  "type" "WalletEntryType" NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "reference" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "wallet_ledger_idx" ON "WalletLedger"("walletId", "createdAt");

-- 7. Payments & Transactions
CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerOrderId" TEXT UNIQUE,
  "providerPaymentId" TEXT UNIQUE,
  "amount" DECIMAL(14,2) NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "payment_user_created_idx" ON "Payment"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "PaymentEvent" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "paymentId" TEXT NOT NULL REFERENCES "Payment"("id") ON DELETE CASCADE,
  "providerEventId" TEXT NOT NULL UNIQUE,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Refund" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "paymentId" TEXT NOT NULL,
  "providerRefundId" TEXT UNIQUE,
  "amount" DECIMAL(14,2) NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Mobile & DTH Recharge
CREATE TABLE IF NOT EXISTS "RechargeTransaction" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalRef" TEXT UNIQUE,
  "mobile" TEXT NOT NULL,
  "operator" TEXT NOT NULL,
  "circle" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "status" "RechargeStatus" NOT NULL DEFAULT 'PENDING',
  "commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "recharge_user_created_idx" ON "RechargeTransaction"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "RechargeStatusHistory" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "transactionId" TEXT NOT NULL REFERENCES "RechargeTransaction"("id") ON DELETE CASCADE,
  "status" "RechargeStatus" NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "CommissionRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "serviceId" TEXT,
  "operator" TEXT,
  "rate" DECIMAL(8,4) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Notifications, Support & Audit
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "subject" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ticketId" TEXT NOT NULL REFERENCES "SupportTicket"("id") ON DELETE CASCADE,
  "senderId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "entity" TEXT,
  "entityId" TEXT,
  "ip" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "audit_log_created_idx" ON "AuditLog"("createdAt");

-- Basic test-mode persistence for the current API. This stores the complete
-- application state in Supabase PostgreSQL while the relational handlers are
-- migrated incrementally. It is service-role-only and must never be exposed
-- to the browser.
CREATE TABLE IF NOT EXISTS public.platform_state (
  id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.platform_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.platform_state FROM anon, authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('private-documents', 'private-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;
