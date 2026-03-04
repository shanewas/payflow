# 💳 PayFlow

> A full-stack payment integration system built with Node.js, Stripe, PostgreSQL, and React.

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-17.x-61DAFB?style=flat&logo=react&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12-4169E1?style=flat&logo=postgresql&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-API-635BFF?style=flat&logo=stripe&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Stripe Test Cards](#stripe-test-cards)
- [Deployment](#deployment)

---

## Overview

PayFlow is a production-ready payment processing backend and frontend that demonstrates a real-world Stripe integration. It handles the full payment lifecycle — from user registration and order creation, through payment intent generation and webhook processing, to refunds and admin reporting.

---

## Architecture

```
+-----------------+      +-----------------+      +----------------+
|   React Client  | ---> |   Node.js API   | ---> |   PostgreSQL   |
| (localhost:3001)|      | (localhost:8080)|      |      (db)      |
+-----------------+      +-----------------+      +----------------+
                                 |
                                 v
                        +-----------------+
                        |   Stripe API    |
                        |  + Webhooks     |
                        +-----------------+
```

| Service   | Port   | Description                    |
|-----------|--------|--------------------------------|
| API       | `8080` | Node.js / Express REST API     |
| Client    | `3001` | React frontend                 |
| Database  | `5432` | PostgreSQL 12                  |
| PgAdmin   | `5050` | Database UI (dev only)         |

---

## Features

- 🔐 **JWT Authentication** — Register, login, access + refresh tokens
- 💳 **Stripe Payments** — PaymentIntents with SCA compliance
- 🔔 **Webhooks** — Real-time payment status updates from Stripe
- ↩️ **Refunds** — Full and partial refund support
- 📦 **Order Management** — Orders linked to payments
- 🛡️ **Security** — Helmet, CORS, rate limiting, input validation, idempotency keys
- 👑 **Admin API** — Revenue stats, full payment history, admin refunds
- 📄 **Swagger Docs** — Interactive API docs at `/docs`
- 🐳 **Docker** — Full stack with one command
- ✅ **Tests** — Unit and integration test suite with Jest

---

## Quick Start

### Option A — Docker (Recommended)

```bash
# 1. Clone the repo
git clone https://github.com/shanewas/payflow.git
cd payflow

# 2. Set up environment
cp .env.example .env
# Edit .env and fill in your Stripe keys and JWT secrets

# 3. Start everything
docker-compose up --build -d

# 4. Run migrations
docker-compose exec api node scripts/migrate.js
```

API available at `http://localhost:8080`  
Client available at `http://localhost:3001`  
PgAdmin available at `http://localhost:5050`

---

### Option B — Local Setup

**Backend:**
```bash
npm install
cp .env.example .env
# Edit .env with your values
npm run migrate
npm start
```

**Frontend:**
```bash
cd client
npm install
# Create client/.env with REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
npm start
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description | Example |
|---|---|---|
| `PORT` | API server port | `8080` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@localhost:5432/payflow` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `JWT_ACCESS_TOKEN_SECRET` | JWT access token secret | `random-secret` |
| `JWT_ACCESS_TOKEN_EXPIRATION` | Access token expiry | `15m` |
| `JWT_REFRESH_TOKEN_SECRET` | JWT refresh token secret | `random-secret-2` |
| `JWT_REFRESH_TOKEN_EXPIRATION` | Refresh token expiry | `7d` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3001` |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (frontend) | `pk_test_...` |

> Get your Stripe keys at [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)

---

## API Reference

Full interactive docs available at **`GET /docs`** when the server is running.

### Auth

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Register a new user | — |
| `POST` | `/auth/login` | Login and get tokens | — |

### Payments

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/payments/intent` | Create a payment intent | ✅ |
| `GET` | `/payments` | Get payment history | ✅ |
| `GET` | `/payments/:id` | Get payment details | ✅ |
| `POST` | `/payments/:id/refund` | Refund a payment | ✅ |

### Orders & Checkout

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/orders` | Create an order | ✅ |
| `POST` | `/checkout` | Start checkout for an order | ✅ |

### Webhooks

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/webhooks/stripe` | Stripe webhook receiver | Signature |

### Admin

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/admin/payments` | All payments with filters | ✅ Admin |
| `GET` | `/admin/stats` | Revenue and status stats | ✅ Admin |
| `POST` | `/admin/refund/:id` | Refund any payment | ✅ Admin |

---

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

> Integration tests require a running PostgreSQL instance. Set `DATABASE_URL` to a test database before running.

---

## Stripe Test Cards

Use these in the payment form with any future expiry and any 3-digit CVC:

| Scenario | Card Number |
|---|---|
| ✅ Payment succeeds | `4242 4242 4242 4242` |
| ❌ Payment declined | `4000 0000 0000 0002` |
| 🔐 Requires 3D Secure | `4000 0025 0000 3155` |
| ⚠️ Insufficient funds | `4000 0000 0000 9995` |

---

## Deployment

1. Set `NODE_ENV=production` in your environment
2. Use a process manager like [PM2](https://pm2.keymetrics.io/) for the Node.js app
3. Configure your Stripe webhook in the [Stripe Dashboard](https://dashboard.stripe.com/webhooks) to point to `https://yourdomain.com/webhooks/stripe`
4. Ensure your PostgreSQL database is secured, backed up, and accessible only from the API server
5. Set all secrets to strong random values — never commit `.env` to git

---

## License

MIT
