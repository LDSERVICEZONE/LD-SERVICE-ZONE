-- ==============================================================================
-- LD SERVICE ZONE — SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Paste and run this script in your Supabase Dashboard -> SQL Editor
-- This ensures multi-tenant security:
--   1. Public/Anonymous can only read active catalog services & categories
--   2. Retailers can ONLY read and create their own records (data isolation)
--   3. Admins have complete oversight across all applications, KYC & ledgers
--   4. Backend service_role key automatically bypasses RLS for ledger mutations
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Helper Function: is_admin()
-- ------------------------------------------------------------------------------
-- Uses JWT claims first to avoid recursive table lookups, with DB fallback
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check JWT claims (Supabase auth metadata) first for fast, non-recursive check
  IF (COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('admin', 'ADMIN')) OR
     (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'ADMIN')) THEN
    RETURN true;
  END IF;

  -- Fallback to database check for current authenticated user
  RETURN EXISTS (
    SELECT 1 FROM public."User"
    WHERE "id" = auth.uid()::text AND ("role" = 'ADMIN' OR "role"::text = 'ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- 2. Enable RLS on All 23 Tables
-- ------------------------------------------------------------------------------
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RetailerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Application" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApplicationDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApplicationStatusHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KycProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KycDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KycReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WalletLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Refund" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RechargeTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RechargeStatusHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommissionRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. Service Catalog & Public Data
-- ------------------------------------------------------------------------------
-- Categories: Anyone can read active categories, Admins can manage all
DROP POLICY IF EXISTS "Public read active categories" ON "ServiceCategory";
CREATE POLICY "Public read active categories" ON "ServiceCategory"
  FOR SELECT USING ("active" = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin manage categories" ON "ServiceCategory";
CREATE POLICY "Admin manage categories" ON "ServiceCategory"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Services: Anyone can read active services, Admins can manage all
DROP POLICY IF EXISTS "Public read active services" ON "Service";
CREATE POLICY "Public read active services" ON "Service"
  FOR SELECT USING ("active" = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin manage services" ON "Service";
CREATE POLICY "Admin manage services" ON "Service"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Commission rules: Authenticated users can view active rules, Admins manage all
DROP POLICY IF EXISTS "View active commission rules" ON "CommissionRule";
CREATE POLICY "View active commission rules" ON "CommissionRule"
  FOR SELECT TO authenticated USING ("active" = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin manage commission rules" ON "CommissionRule";
CREATE POLICY "Admin manage commission rules" ON "CommissionRule"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. User Profiles & Sessions
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users read own profile" ON "User";
CREATE POLICY "Users read own profile" ON "User"
  FOR SELECT TO authenticated USING ("id" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Users update own profile" ON "User";
CREATE POLICY "Users update own profile" ON "User"
  FOR UPDATE TO authenticated USING ("id" = auth.uid()::text OR public.is_admin())
  WITH CHECK ("id" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own profile" ON "User";
CREATE POLICY "Users insert own profile" ON "User"
  FOR INSERT TO authenticated WITH CHECK ("id" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Admin manage all users" ON "User";
CREATE POLICY "Admin manage all users" ON "User"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users manage own retailer profile" ON "RetailerProfile";
CREATE POLICY "Users manage own retailer profile" ON "RetailerProfile"
  FOR ALL TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin())
  WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Users manage own sessions" ON "Session";
CREATE POLICY "Users manage own sessions" ON "Session"
  FOR ALL TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin())
  WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. Applications & Documents
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Retailers read own applications" ON "Application";
CREATE POLICY "Retailers read own applications" ON "Application"
  FOR SELECT TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Retailers create applications" ON "Application";
CREATE POLICY "Retailers create applications" ON "Application"
  FOR INSERT TO authenticated WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Admin manage applications" ON "Application";
CREATE POLICY "Admin manage applications" ON "Application"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Application Documents
DROP POLICY IF EXISTS "Users read own application documents" ON "ApplicationDocument";
CREATE POLICY "Users read own application documents" ON "ApplicationDocument"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "Application" a
      WHERE a."id" = "ApplicationDocument"."applicationId"
      AND (a."userId" = auth.uid()::text OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users insert application documents" ON "ApplicationDocument";
CREATE POLICY "Users insert application documents" ON "ApplicationDocument"
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Application" a
      WHERE a."id" = "ApplicationDocument"."applicationId"
      AND (a."userId" = auth.uid()::text OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admin manage application documents" ON "ApplicationDocument";
CREATE POLICY "Admin manage application documents" ON "ApplicationDocument"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Application Status History
DROP POLICY IF EXISTS "Users read application history" ON "ApplicationStatusHistory";
CREATE POLICY "Users read application history" ON "ApplicationStatusHistory"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "Application" a
      WHERE a."id" = "ApplicationStatusHistory"."applicationId"
      AND (a."userId" = auth.uid()::text OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admin manage application history" ON "ApplicationStatusHistory";
CREATE POLICY "Admin manage application history" ON "ApplicationStatusHistory"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. KYC Profiles & Documents
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users read own KYC profile" ON "KycProfile";
CREATE POLICY "Users read own KYC profile" ON "KycProfile"
  FOR SELECT TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Users submit own KYC profile" ON "KycProfile";
CREATE POLICY "Users submit own KYC profile" ON "KycProfile"
  FOR INSERT TO authenticated WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Users update own KYC profile" ON "KycProfile";
CREATE POLICY "Users update own KYC profile" ON "KycProfile"
  FOR UPDATE TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin())
  WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Admin manage KYC profiles" ON "KycProfile";
CREATE POLICY "Admin manage KYC profiles" ON "KycProfile"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- KYC Documents
DROP POLICY IF EXISTS "Users read own KYC documents" ON "KycDocument";
CREATE POLICY "Users read own KYC documents" ON "KycDocument"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "KycProfile" kp
      WHERE kp."id" = "KycDocument"."kycId"
      AND (kp."userId" = auth.uid()::text OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users upload KYC documents" ON "KycDocument";
CREATE POLICY "Users upload KYC documents" ON "KycDocument"
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM "KycProfile" kp
      WHERE kp."id" = "KycDocument"."kycId"
      AND (kp."userId" = auth.uid()::text OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admin manage KYC documents" ON "KycDocument";
CREATE POLICY "Admin manage KYC documents" ON "KycDocument"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- KYC Reviews
DROP POLICY IF EXISTS "Users view own KYC reviews" ON "KycReview";
CREATE POLICY "Users view own KYC reviews" ON "KycReview"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "KycProfile" kp
      WHERE kp."id" = "KycReview"."kycId"
      AND (kp."userId" = auth.uid()::text OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admin manage KYC reviews" ON "KycReview";
CREATE POLICY "Admin manage KYC reviews" ON "KycReview"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. Wallets & Ledger
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users view own wallet" ON "Wallet";
CREATE POLICY "Users view own wallet" ON "Wallet"
  FOR SELECT TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Users view own ledger entries" ON "WalletLedger";
CREATE POLICY "Users view own ledger entries" ON "WalletLedger"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "Wallet" w
      WHERE w."id" = "WalletLedger"."walletId"
      AND (w."userId" = auth.uid()::text OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admin manage wallets" ON "Wallet";
CREATE POLICY "Admin manage wallets" ON "Wallet"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manage wallet ledger" ON "WalletLedger";
CREATE POLICY "Admin manage wallet ledger" ON "WalletLedger"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. Payments, Refunds & Events
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users view own payments" ON "Payment";
CREATE POLICY "Users view own payments" ON "Payment"
  FOR SELECT TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Admin manage payments" ON "Payment";
CREATE POLICY "Admin manage payments" ON "Payment"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Payment Events
DROP POLICY IF EXISTS "Users view own payment events" ON "PaymentEvent";
CREATE POLICY "Users view own payment events" ON "PaymentEvent"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "Payment" p
      WHERE p."id" = "PaymentEvent"."paymentId"
      AND (p."userId" = auth.uid()::text OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admin manage payment events" ON "PaymentEvent";
CREATE POLICY "Admin manage payment events" ON "PaymentEvent"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Refunds
DROP POLICY IF EXISTS "Users view own refunds" ON "Refund";
CREATE POLICY "Users view own refunds" ON "Refund"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "Payment" p
      WHERE p."id" = "Refund"."paymentId"
      AND (p."userId" = auth.uid()::text OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admin manage refunds" ON "Refund";
CREATE POLICY "Admin manage refunds" ON "Refund"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 9. Recharges & Status History
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users view own recharge transactions" ON "RechargeTransaction";
CREATE POLICY "Users view own recharge transactions" ON "RechargeTransaction"
  FOR SELECT TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Users create recharge requests" ON "RechargeTransaction";
CREATE POLICY "Users create recharge requests" ON "RechargeTransaction"
  FOR INSERT TO authenticated WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Admin manage recharges" ON "RechargeTransaction";
CREATE POLICY "Admin manage recharges" ON "RechargeTransaction"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Recharge Status History
DROP POLICY IF EXISTS "Users view own recharge history" ON "RechargeStatusHistory";
CREATE POLICY "Users view own recharge history" ON "RechargeStatusHistory"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "RechargeTransaction" rt
      WHERE rt."id" = "RechargeStatusHistory"."transactionId"
      AND (rt."userId" = auth.uid()::text OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admin manage recharge history" ON "RechargeStatusHistory";
CREATE POLICY "Admin manage recharge history" ON "RechargeStatusHistory"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 10. Support & Notifications
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users view own tickets" ON "SupportTicket";
CREATE POLICY "Users view own tickets" ON "SupportTicket"
  FOR SELECT TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Users create tickets" ON "SupportTicket";
CREATE POLICY "Users create tickets" ON "SupportTicket"
  FOR INSERT TO authenticated WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Admin manage support tickets" ON "SupportTicket";
CREATE POLICY "Admin manage support tickets" ON "SupportTicket"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Support Messages
DROP POLICY IF EXISTS "Users view ticket messages" ON "SupportMessage";
CREATE POLICY "Users view ticket messages" ON "SupportMessage"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "SupportTicket" st
      WHERE st."id" = "SupportMessage"."ticketId"
      AND (st."userId" = auth.uid()::text OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users send ticket messages" ON "SupportMessage";
CREATE POLICY "Users send ticket messages" ON "SupportMessage"
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM "SupportTicket" st
      WHERE st."id" = "SupportMessage"."ticketId"
      AND (st."userId" = auth.uid()::text OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admin manage support messages" ON "SupportMessage";
CREATE POLICY "Admin manage support messages" ON "SupportMessage"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Notifications
DROP POLICY IF EXISTS "Users manage own notifications" ON "Notification";
CREATE POLICY "Users manage own notifications" ON "Notification"
  FOR ALL TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin())
  WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 11. Audit Logs
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin view audit logs" ON "AuditLog";
CREATE POLICY "Admin view audit logs" ON "AuditLog"
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin manage audit logs" ON "AuditLog";
CREATE POLICY "Admin manage audit logs" ON "AuditLog"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
