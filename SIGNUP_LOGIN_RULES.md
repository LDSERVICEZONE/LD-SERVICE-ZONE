# LD SERVICE ZONE — Signup, Login & OTP Rules

## Account Uniqueness

- One retailer account can use an email address only once.
- One retailer account can use an Indian mobile number only once.
- Email comparison is case-insensitive.
- Indian mobile numbers are normalized to `+91XXXXXXXXXX`, so `9876543210`, `919876543210`, and `+919876543210` are treated as the same number.
- Uniqueness is checked against both the local profile database and Supabase Auth metadata.
- Supabase Auth remains the final authority for email uniqueness.
- A duplicate registration using the same email or mobile returns HTTP 409 with a clear message and does not duplicate local accounts.

## Supabase SMTP & Email Verification

Now that custom SMTP is integrated into Supabase:
- **Instant 6-digit OTP Email**: Upon signup, Supabase emails a 6-digit verification code (`{{ .Token }}`) and confirmation link.
- **On-Screen OTP Verification**: The registration page (`/register`) provides an on-screen 6-digit OTP verification field with a 60-second resend cooldown timer.
- **Immediate Session Creation**: Entering the 6-digit OTP verifies the Supabase Auth user, creates the retailer profile, initializes their wallet, and automatically signs them into `/dashboard`.
- **Confirmation Link Support**: Clicking the email confirmation link seamlessly handles both access token hashes (`#access_token=...`), token hashes (`?token_hash=...`), and PKCE codes, confirming and signing the retailer in.

## Login Options

1. **Password Login**:
   - Accepts registered Member ID / Username, Gmail/email address, or Indian mobile number.
   - Verified through Supabase Auth (or local secure hash for seeded admins).
   - If an unconfirmed retailer attempts to sign in, the UI displays a clear notice with a one-click action to enter their 6-digit email OTP.
2. **Email OTP Login (Passwordless)**:
   - Retailers can toggle to "Email OTP Sign In" on `/login`.
   - Enter registered email or mobile number to receive a 6-digit OTP.
   - Enter the 6-digit code to immediately authenticate without remembering passwords.

## Password Recovery & Reset

- **Forgot Password**: Accepts email, username, or Indian mobile number.
- Supabase sends both a 6-digit recovery OTP and a secure password reset link via SMTP.
- **Reset Page (`/reset-password`)**:
  - Supports 6-digit OTP entry directly (`email` + `otp` + `new password`).
  - Supports direct link consumption via `access_token` or `token_hash`.
  - Automatically clears previous sessions upon successful password reset.
