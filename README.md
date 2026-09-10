# LD SERVICE ZONE — Retailer + Admin + Backend + Payments

A local full-stack starter for LD SERVICE ZONE.

## Main features

### Retailer
- Login / logout
- Partner signup
- Protected retailer dashboard
- PAN Card → New PAN / Correction / Reprint / Find / Status / UTI / NSDL
- Voter ID, Driving Licence, RC, ITR, GST and certificate service cards
- Service-specific application forms
- Required document upload
- Application created in backend
- Secure payment checkout
- Application status tracking through backend

### Admin
- Separate `/admin` application area
- Admin-only authentication
- Live platform stats
- Service request queue
- Filter by payment/application status
- Open complete applicant data
- View uploaded document metadata
- Add internal notes
- Move requests to Processing / Accepted / Rejected / Completed
- Audit log API
- User list API

### Backend
- Node.js built-in HTTP API (no Express required)
- Password hashing using `crypto.scryptSync`
- Bearer sessions stored server-side
- Role-based access: retailer/admin
- AES-256-GCM encryption for Aadhaar fields at rest
- Private document storage with authenticated download endpoint
- JSON database for simple local setup
- Audit log
- Payment records
- Razorpay order creation + payment signature verification
- Razorpay webhook signature verification when configured
- Supabase Auth for retailer registration/login (OTP removed from signup)
- Google Sheets synchronization for users, applications, payments and audit logs
- Demo payment mode if Razorpay credentials are blank

## Install

Requirements:
- Node.js 20+ recommended
- pnpm 9+ recommended

```bash
pnpm install
cp .env.example .env
# or keep the supplied .env and replace its secrets before production
pnpm dev:all
```

Open the Vite URL printed by the terminal (normally `http://localhost:8443`).

Backend health check:

```bash
curl http://localhost:8787/api/health
```

## Demo admin login

Default seeded admin:

- Email: `admin@ldservicezone.in`
- Password: `Admin@12345`

Change both using `.env` before real deployment.

## Real Razorpay payments

Add these to `.env`:

```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

Restart `pnpm dev:all`.

When keys are configured, a paid service application uses:

`application → Razorpay order → Razorpay Checkout → server signature verification → submitted → admin processing → accepted/completed`

Without keys, the same flow runs in safe local **Demo Payment** mode so the project can be tested without a payment account.

## Important production upgrades

This project is intentionally easy to install locally. Before handling real Aadhaar/PAN documents or money, move the data layer to PostgreSQL/MySQL, put the app behind HTTPS, use a managed secrets system, add rate limiting, malware scan uploads, private object storage, stronger session controls, notifications, reconciliation/refunds, monitoring and backups, and complete the applicable privacy/KYC/retention requirements.


## External integrations

See `BACKEND_SETUP.md` for MSG91, Google Sheets and Razorpay setup. Secrets belong in `.env` and are never required in frontend code.

## Digital Pulse public-page background

The public Landing, Login, and Register routes share a reusable `AnimatedBackground` component at `src/components/background/AnimatedBackground.tsx`.

- Fixed `inset-0`, negative z-index, and `pointer-events: none` so it never blocks UI interaction.
- Slow navy gradient wash, drifting brand-color aurora blobs, the existing `.bg-grid`, and a lightweight SVG network.
- Six low-frequency traveling network pulses; fewer pulses and smaller/softer blobs on mobile.
- Motion is reduced/frozen under `prefers-reduced-motion: reduce`.
- Retailer and admin dashboard routes are intentionally not wrapped, so their existing light `#F1F4F9` surface remains unchanged.


## LD Service Zone — Redesign Pack

This build includes the brand-matched **Digital Pulse** background and the professional UX pass requested in the LD Service Zone Redesign Prompt Pack.

### What changed
- `AnimatedBackground` now supports `hero` and `subtle` variants.
- Hero uses the LD black/blue/red brand language: drifting blue ambient orbs, diagonal 40px grid, sparse network pulses, rare red sparks, and a subliminal rotating arc watermark.
- Landing uses `variant="hero"`; Login/Register and authenticated retailer/admin shells use `variant="subtle"`.
- Background animation is CSS/SVG only, uses transform/opacity for motion, is pointer-events-free, and supports `prefers-reduced-motion`.
- Mobile reduces blob size/blur and network traveler count.
- Landing navigation now has a responsive mobile menu, real registration/sign-in actions, a how-it-works section, and no placeholder `href="#"` links.
- Service and feature icons use `lucide-react` consistently.
- Login includes password visibility and a functional password-support dialog.
- Register includes password visibility, inline success feedback, and OTP/validation states.
- Retailer/admin navigation uses Lucide icons and a mobile drawer pattern.
- Keyboard focus rings and Escape-to-close behavior were added for interactive overlays.
- Admin navigation was constrained to routes that exist in this codebase; duplicate operational/report shortcuts point to live admin routes rather than dead pages.
- Backend/API logic was not intentionally changed.

### Install / run

Because this redesign adds `lucide-react`, run your normal dependency installation once before building:

```bash
npm install
npm run build
```

or, if your environment uses pnpm:

```bash
pnpm install
pnpm build
```

The source package was not dependency-built in this environment because the npm registry was unavailable during validation.

## Production data mode

The retailer dashboard, wallet, analytics, customers, support, admin users, admin transactions and recharge flows use backend records only. The old demo transaction/KPI/wallet/recharge/support arrays have been removed. New accounts start with an empty wallet and no transactions.

### Pay2All

Pay2All is configured server-side through `PAY2ALL_API_KEY`. Operator/provider data is fetched from Pay2All. Recharge requests use unique client IDs and pending transactions are reconciled through `/api/recharge/webhook`. No fake recharge success is generated.
# LD-SERVICE-ZONE
