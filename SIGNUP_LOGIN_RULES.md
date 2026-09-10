# LD SERVICE ZONE — Signup & Login Rules

## Account uniqueness

- One retailer account can use an email address only once.
- One retailer account can use an Indian mobile number only once.
- Email comparison is case-insensitive.
- Indian mobile numbers are normalized to `+91XXXXXXXXXX`, so `9876543210`, `919876543210`, and `+919876543210` are treated as the same number.
- Uniqueness is checked against both the local profile database and Supabase Auth metadata.
- Supabase Auth remains the final authority for email uniqueness.
- A second registration using the same email or same mobile returns HTTP 409 with a clear message and does not create another local account.

## Login after signup

- Signup creates the Supabase Auth user with `email_confirm: true`.
- The user is redirected to `/login` after successful registration.
- Login accepts either the registered email or the registered mobile number.
- Mobile login accepts 10-digit, `91XXXXXXXXXX`, or `+91XXXXXXXXXX` input.
- The password is verified through Supabase for retailer accounts.
- A successful login creates the app session and routes the retailer to `/dashboard`.

## OTP

The signup UI does not contain an OTP send/verify step. Registration is email/password + mobile profile data only.


## Current authentication behavior

- Sign-up requires Full Name, Business Name, Gmail/email, and an Indian 10-digit mobile number.
- Indian mobile numbers are normalized server-side to `+91XXXXXXXXXX`.
- Gmail/email verification remains the first verification step; mobile OTP is intentionally not required yet.
- Login accepts either the registered email address or the registered Indian mobile number, plus the account password.
- Mobile OTP can be enabled later after an SMS provider is configured in Supabase.
- Do not place Supabase service-role keys or encryption keys in `.env.example` files; keep real secrets only in the local/production environment.
