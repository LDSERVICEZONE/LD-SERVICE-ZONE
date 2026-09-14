# LD SERVICE ZONE — Production Readiness

This version adds the production database schema and environment contract while preserving the existing application.

## Important

Real external credentials are intentionally NOT included. Never commit secrets to Git or ZIP files.

Before going live:
1. Create managed PostgreSQL.
2. Put DATABASE_URL in the deployment environment.
3. Run `pnpm install` then `pnpm db:generate` and `pnpm db:migrate`.
4. Configure authentication provider and email/mobile verification.
5. Configure Razorpay webhooks and server-side verification.
6. Configure the authorized recharge provider.
7. Configure private object storage and signed URLs.
8. Configure notifications.
9. Configure CORS and HTTPS.
10. Run integration/security tests.
11. Disable demo mode for production.

For the current basic test scope, `DATA_STORE=supabase` now persists the API state in the protected `platform_state` PostgreSQL table, and private KYC/application files use the `private-documents` Supabase Storage bucket. Run the added definitions in `supabase/schema.sql`, set the Supabase environment variables, and the server will refuse to use the local JSON store in production. Payments and recharge remain explicitly deferred as requested.

The relational SQL schema and RLS policies are available for the migration. Use
`npm run db:migrate-state` to copy an existing `platform_state` snapshot into
the relational tables. The script is idempotent and preserves the legacy table;
runtime cutover still requires verification and domain-by-domain repository
changes.
