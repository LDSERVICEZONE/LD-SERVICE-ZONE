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
-- 1. Helper Functions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."User"
    WHERE "id" = auth.uid()::text AND "role" = 'ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- 2. Enable RLS on All Tables
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
CREATE POLICY "Public read active categories" ON "ServiceCategory"
  FOR SELECT USING ("active" = true OR public.is_admin());

CREATE POLICY "Admin manage categories" ON "ServiceCategory"
  FOR ALL USING (public.is_admin());

-- Services: Anyone can read active services, Admins can manage all
CREATE POLICY "Public read active services" ON "Service"
  FOR SELECT USING ("active" = true OR public.is_admin());

CREATE POLICY "Admin manage services" ON "Service"
  FOR ALL USING (public.is_admin());

-- Commission rules: Authenticated users can view active rules, Admins manage all
CREATE POLICY "View active commission rules" ON "CommissionRule"
  FOR SELECT TO authenticated USING ("active" = true OR public.is_admin());

CREATE POLICY "Admin manage commission rules" ON "CommissionRule"
  FOR ALL USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. User Profiles & Sessions
-- ------------------------------------------------------------------------------
CREATE POLICY "Users read own profile" ON "User"
  FOR SELECT TO authenticated USING ("id" = auth.uid()::text OR public.is_admin());

CREATE POLICY "Users update own profile" ON "User"
  FOR UPDATE TO authenticated USING ("id" = auth.uid()::text)
  WITH CHECK ("id" = auth.uid()::text);

CREATE POLICY "Users insert own profile" ON "User"
  FOR INSERT TO authenticated WITH CHECK ("id" = auth.uid()::text);

CREATE POLICY "Admin manage all users" ON "User"
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users manage own retailer profile" ON "RetailerProfile"
  FOR ALL TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin());

CREATE POLICY "Users manage own sessions" ON "Session"
  FOR ALL TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. Applications & Documents
-- ------------------------------------------------------------------------------
CREATE POLICY "Retailers read own applications" ON "Application"
  FOR SELECT TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin());

CREATE POLICY "Retailers create applications" ON "Application"
  FOR INSERT TO authenticated WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "Admin update applications" ON "Application"
  FOR UPDATE TO authenticated USING (public.is_admin());

-- Application Documents
CREATE POLICY "Users read own application documents" ON "ApplicationDocument"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "Application" a
      WHERE a."id" = "ApplicationDocument"."applicationId"
      AND (a."userId" = auth.uid()::text OR public.is_admin())
    )
  );

CREATE POLICY "Users insert application documents" ON "ApplicationDocument"
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Application" a
      WHERE a."id" = "ApplicationDocument"."applicationId"
      AND a."userId" = auth.uid()::text
    )
  );

-- Application Status History
CREATE POLICY "Users read application history" ON "ApplicationStatusHistory"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "Application" a
      WHERE a."id" = "ApplicationStatusHistory"."applicationId"
      AND (a."userId" = auth.uid()::text OR public.is_admin())
    )
  );

CREATE POLICY "Admin manage application history" ON "ApplicationStatusHistory"
  FOR ALL USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. KYC Profiles & Documents
-- ------------------------------------------------------------------------------
CREATE POLICY "Users read own KYC profile" ON "KycProfile"
  FOR SELECT TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin());

CREATE POLICY "Users submit own KYC profile" ON "KycProfile"
  FOR INSERT TO authenticated WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "Users update own KYC profile" ON "KycProfile"
  FOR UPDATE TO authenticated USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "Admin manage KYC profiles" ON "KycProfile"
  FOR ALL USING (public.is_admin());

-- KYC Documents
CREATE POLICY "Users read own KYC documents" ON "KycDocument"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "KycProfile" kp
      WHERE kp."id" = "KycDocument"."kycId"
      AND (kp."userId" = auth.uid()::text OR public.is_admin())
    )
  );

CREATE POLICY "Users upload KYC documents" ON "KycDocument"
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM "KycProfile" kp
      WHERE kp."id" = "KycDocument"."kycId"
      AND kp."userId" = auth.uid()::text
    )
  );

-- KYC Reviews (Admins only for review creation, Users can view their result)
CREATE POLICY "Users view own KYC reviews" ON "KycReview"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "KycProfile" kp
      WHERE kp."id" = "KycReview"."kycId"
      AND (kp."userId" = auth.uid()::text OR public.is_admin())
    )
  );

CREATE POLICY "Admin manage KYC reviews" ON "KycReview"
  FOR ALL USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. Wallets & Ledger
-- ------------------------------------------------------------------------------
CREATE POLICY "Users view own wallet" ON "Wallet"
  FOR SELECT TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin());

CREATE POLICY "Users view own ledger entries" ON "WalletLedger"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "Wallet" w
      WHERE w."id" = "WalletLedger"."walletId"
      AND (w."userId" = auth.uid()::text OR public.is_admin())
    )
  );

-- Direct client inserts into wallet/ledger are blocked (handled via backend/service_role)
CREATE POLICY "Admin manage wallets" ON "Wallet"
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admin manage wallet ledger" ON "WalletLedger"
  FOR ALL USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. Payments & Recharges
-- ------------------------------------------------------------------------------
CREATE POLICY "Users view own payments" ON "Payment"
  FOR SELECT TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin());

CREATE POLICY "Users view own recharge transactions" ON "RechargeTransaction"
  FOR SELECT TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin());

CREATE POLICY "Users create recharge requests" ON "RechargeTransaction"
  FOR INSERT TO authenticated WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "Admin manage payments and refunds" ON "Payment"
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admin manage recharges" ON "RechargeTransaction"
  FOR ALL USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 9. Support & Notifications
-- ------------------------------------------------------------------------------
CREATE POLICY "Users view own tickets" ON "SupportTicket"
  FOR SELECT TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin());

CREATE POLICY "Users create tickets" ON "SupportTicket"
  FOR INSERT TO authenticated WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "Users view ticket messages" ON "SupportMessage"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "SupportTicket" st
      WHERE st."id" = "SupportMessage"."ticketId"
      AND (st."userId" = auth.uid()::text OR public.is_admin())
    )
  );

CREATE POLICY "Users send ticket messages" ON "SupportMessage"
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM "SupportTicket" st
      WHERE st."id" = "SupportMessage"."ticketId"
      AND (st."userId" = auth.uid()::text OR public.is_admin())
    )
  );

CREATE POLICY "Admin manage support" ON "SupportTicket"
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admin manage support messages" ON "SupportMessage"
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users manage own notifications" ON "Notification"
  FOR ALL TO authenticated USING ("userId" = auth.uid()::text OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 10. Audit Logs
-- ------------------------------------------------------------------------------
CREATE POLICY "Admin view audit logs" ON "AuditLog"
  FOR SELECT USING (public.is_admin());
