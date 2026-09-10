# Supabase local setup

The project reads Supabase server credentials from `.env` at the project root. The browser never receives the service-role key.

Configured for local development:
- Supabase project URL
- Supabase anon key
- Supabase service-role key (server only)
- Data encryption key
- Admin email/password
- Demo login disabled
- Mobile OTP disabled until an SMS provider is configured

## Supabase dashboard requirements

1. In Authentication → Providers → Email, enable Email provider.
2. Configure the email confirmation/OTP behavior required by the project.
3. Add `http://localhost:8443/login` and `http://localhost:8443/reset-password` to the allowed redirect URLs.
4. When mobile OTP is needed later, configure a supported SMS provider in Supabase Authentication → Providers → Phone, then enable the project's mobile OTP flag.

## Security

`.env` is ignored by `.gitignore`. Do not commit it or publish it. If these credentials were shared anywhere public, rotate the Supabase service-role key and data-encryption key before production use.
