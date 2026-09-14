# SwiftSats — Instant Crypto Onramp for Nigeria

[![Django](https://img.shields.io/badge/Django-5.x-green.svg)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.15-red.svg)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-black.svg)]()

SwiftSats is a non-custodial crypto onramp web platform designed for Nigerian users to buy cryptocurrency with Naira via bank transfers with **zero account sign-up required**.

The platform is backed by **Quidax** (SEC-licensed Nigerian digital exchange) for real-time rates and automated crypto withdrawals, and **Paystack** for Naira collection via one-time dynamic virtual bank accounts.

---

## 🏛️ Core Architectural Principles

1. **SECURITY FIRST**:
   - Webhook HMAC SHA512 cryptographic signature verification on all Paystack callbacks.
   - Database-level unique constraint idempotency locks on `(event_source, event_id)` to eliminate duplicate payouts.
   - Zero card or bank account credentials stored in our database.
   - Strictly parameterized ORM queries — no SQL string interpolation.
   - Mandatory TOTP 2FA for all administrative access.
   - Strict format & checksum validation for destination wallet addresses across TRC-20, Solana, BEP-20, Base, and Bitcoin.
2. **RELIABILITY & IDEMPOTENCY**:
   - Strict deterministic **Order State Machine** with PostgreSQL row-level locks (`select_for_update`) and immutable append-only audit trail logging.
3. **SPEED (< 10s Payout Target)**:
   - Webhook-driven architecture — zero polling loops.
   - Paystack payment webhook immediately dispatches a Celery worker task to execute crypto withdrawal via Quidax API.
   - Short TTL rate caching in Redis (5-10s) for instantaneous quote creation.

---

## 🔄 4-Step Buy Flow State Machine

```
[ QUOTE_LOCKED ] ──(Submit Wallet)──▶ [ AWAITING_PAYMENT ] ──(Paystack Webhook)──▶ [ PAYMENT_CONFIRMED ]
                                                                                           │
                                                                                           ▼ (Celery Async Worker)
[ COMPLETED (with Tx Hash) ] ◀────── [ PAYOUT_PROCESSING ] ◀───────────────────────────────┘
            │
            └── (Failure/Exception) ──▶ [ FAILED ] ──(Admin Action)──▶ [ REFUNDED ]
```

---

## 📂 Project Structure

```
swiftsats/
├── backend/
│   ├── config/                  # Django & Celery configuration
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   ├── celery.py
│   │   └── wsgi.py / asgi.py
│   ├── apps/
│   │   ├── orders/               # Order model, state machine, serializers, Celery tasks
│   │   ├── payments/             # Paystack virtual accounts, HMAC signature checks, webhooks
│   │   ├── exchange/             # Quidax rates caching, quote engine, payout client
│   │   ├── audit/                # Immutable audit log ledger & idempotency locks
│   │   ├── accounts/             # Admin accounts with TOTP 2FA
│   │   └── admin_api/            # Custom DRF endpoints for admin console
│   ├── core/                     # Address validators, exceptions, constants
│   ├── requirements/             # Pinned pip requirements
│   ├── manage.py
│   ├── .env.example
│   └── pytest.ini
│
├── frontend/
│   ├── src/
│   │   ├── app/                  # Public site & 4-step buy wizard
│   │   │   ├── pages/BuyFlow/    # CoinStep, AmountStep, WalletStep, PayStep
│   │   │   ├── pages/Home.tsx
│   │   │   └── pages/OrderStatus.tsx
│   │   ├── admin/                # Custom HRIMS-inspired Admin Panel
│   │   │   ├── pages/Dashboard.tsx
│   │   │   ├── pages/Orders.tsx
│   │   │   ├── pages/PaymentMonitor.tsx
│   │   │   ├── pages/Payouts.tsx
│   │   │   ├── pages/Disputes.tsx
│   │   │   ├── pages/Analytics.tsx
│   │   │   ├── pages/Reports.tsx
│   │   │   ├── pages/Settings.tsx
│   │   │   └── pages/Login.tsx
│   │   ├── shared/               # Reusable buttons, inputs, badges, formatters, typed API client
│   │   └── styles/               # Tailwind design system & tokens
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── docker-compose.yml            # Local PostgreSQL + Redis
├── .gitignore
└── README.md
```

---

## 🚀 Quickstart & Local Development

### 1. Prerequisites
- **Python 3.12+**
- **Node.js 18+** / **npm**
- **Docker & Docker Compose** (Optional for local PostgreSQL + Redis)

### 2. Start Local Database & Redis (Optional)
```bash
docker-compose up -d
```

### 3. Setup Backend
```bash
cd backend
python -m pip install -r requirements/development.txt
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver 8000
```
> Default Super Admin created by seed script:
> - **Email**: `admin@swiftsats.com`
> - **Password**: `SwiftAdmin2026!`
> - **2FA Code in Dev**: `123456`

### 4. Run Pytest Suite
```bash
cd backend
python -m pytest
```

### 5. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173` for the Public Buy Flow and `http://localhost:5173/admin` for the Admin Console.

---

## 🔒 Security Protocols

| Security Feature | Implementation |
|---|---|
| **Webhook Signatures** | Constant-time `hmac.compare_digest` with HMAC SHA512 using `PAYSTACK_SECRET_KEY` |
| **Idempotency Locks** | PostgreSQL `(event_source, event_id)` unique constraint with atomic transactions |
| **Quote Security** | Server-side price lock stored with timestamp (`quote_expires_at`), valid 90 seconds |
| **Wallet Validation** | Regex + Base58 / EIP-55 checksum validation before payment details are generated |
| **Admin 2FA** | Time-based One-Time Passwords (`pyotp`) + short-lived signed JWT session tokens |
| **Production Headers** | `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS = 31536000`, secure cookies |
