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

The existing frontend/backend may still contain development JSON/mock flows. Those must be switched to the Prisma database routes before declaring the deployment production-ready. This file deliberately does not claim that external providers are live without their real accounts.
