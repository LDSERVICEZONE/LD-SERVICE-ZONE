# Supabase Email Templates — LD SERVICE ZONE

Enterprise-grade, responsive email templates designed in modern fintech style (similar to Stripe, Linear, and Apple).

These templates feature:
- Clean 560px responsive container compatible with Gmail, Apple Mail, Outlook, Yahoo, and mobile screens.
- Prominent monospace 6-digit OTP code callout box (`{{ .Token }}`).
- High-contrast direct action button (`{{ .ConfirmationURL }}`).
- Fallback raw URL link.
- Security notices and company copyright footer.

---

## 1. Confirm Signup (Email Verification)
- **Supabase Template Location**: `Authentication` &rarr; `Email Templates` &rarr; `Confirm signup`
- **Recommended Subject**: `Verify your LD SERVICE ZONE account — {{ .Token }}`
- **Source File**: [`confirm-signup.html`](file:///d:/Client/LD/LD-SERVICE-ZONE/email-templates/confirm-signup.html)

---

## 2. Magic Link / Email Sign-In Code
- **Supabase Template Location**: `Authentication` &rarr; `Email Templates` &rarr; `Magic Link`
- **Recommended Subject**: `Your sign-in code: {{ .Token }} — LD SERVICE ZONE`
- **Source File**: [`magic-link.html`](file:///d:/Client/LD/LD-SERVICE-ZONE/email-templates/magic-link.html)

---

## 3. Reset Password
- **Supabase Template Location**: `Authentication` &rarr; `Email Templates` &rarr; `Reset Password`
- **Recommended Subject**: `Reset your password — {{ .Token }} — LD SERVICE ZONE`
- **Source File**: [`reset-password.html`](file:///d:/Client/LD/LD-SERVICE-ZONE/email-templates/reset-password.html)

---

## 4. Email Address Changed (Security Alert)
- **Supabase Template Location**: `Authentication` &rarr; `Email Templates` &rarr; `Email address changed`
- **Recommended Subject**: `Security Alert: Your registered email address was updated — LD SERVICE ZONE`
- **Source File**: [`email-address-changed.html`](file:///d:/Client/LD/LD-SERVICE-ZONE/email-templates/email-address-changed.html)

---

## 5. Password Changed (Security Alert)
- **Supabase Template Location**: `Authentication` &rarr; `Email Templates` &rarr; `Password changed`
- **Recommended Subject**: `Security Alert: Your password was changed — LD SERVICE ZONE`
- **Source File**: [`password-changed.html`](file:///d:/Client/LD/LD-SERVICE-ZONE/email-templates/password-changed.html)

---

## 6. Change Email Address (Verification Flow)
- **Supabase Template Location**: `Authentication` &rarr; `Email Templates` &rarr; `Change Email Address`
- **Recommended Subject**: `Confirm your new LD SERVICE ZONE email — {{ .Token }}`
- **Source File**: [`change-email-address.html`](file:///d:/Client/LD/LD-SERVICE-ZONE/email-templates/change-email-address.html)

---

## 7. Reauthentication (Security Code)
- **Supabase Template Location**: `Authentication` &rarr; `Email Templates` &rarr; `Reauthentication`
- **Recommended Subject**: `Confirm your identity — {{ .Token }} — LD SERVICE ZONE`
- **Source File**: [`reauthentication.html`](file:///d:/Client/LD/LD-SERVICE-ZONE/email-templates/reauthentication.html)

---

## How to Apply in Supabase Dashboard

1. Open your [Supabase Dashboard](https://supabase.com/dashboard/project/vzlqnigbnnmzyxoqxfwn).
2. Go to **Authentication** in the left sidebar &rarr; **Email Templates**.
3. Select each tab (`Confirm signup`, `Magic Link`, `Reset Password`, `Email address changed`, `Password changed`, `Change Email Address`, `Reauthentication`).
4. Update the **Subject** line as recommended above.
5. In the **Message Body (HTML)** editor, select all and replace with the contents of the respective `.html` file.
6. Click **Save Changes** at the bottom right.




