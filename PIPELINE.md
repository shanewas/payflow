# PayFlow — Data Pipeline Architecture

> This document describes the data pipeline powering PayFlow's payment processing system.
> See `README.md` for the main project overview.

## Overview

PayFlow processes payments through a pipeline that handles: user registration → order creation → payment intent → Stripe API → webhook processing → database updates → admin reporting.

```
User Action → Express API → PostgreSQL → Stripe API → Webhook → DB Update → Admin UI
```

## Data Flow

### 1. User registration → payment setup

```
POST /auth/register
→ Create user record (PostgreSQL: users table)
→ Generate JWT access + refresh tokens
→ Return tokens to client
```

### 2. Order creation → payment intent

```
POST /payments/intent
→ Validate JWT
→ Create order record (PostgreSQL: orders table, status="pending")
→ Create Stripe PaymentIntent via Stripe API
→ Store Stripe customer_id + payment_intent_id in orders table
→ Return client_secret to frontend
```

### 3. Stripe webhook → payment confirmation

```
Stripe sends POST /webhooks/stripe
→ Verify Stripe signature (stripe-signature header)
→ Route by event type:
  - payment_intent.succeeded → update order status="completed", trigger fulfillment
  - payment_intent.payment_failed → update order status="failed", notify user
  - charge.refunded → update order status="refunded"
→ Acknowledge webhook to Stripe (return 200)
```

### 4. Refund flow

```
POST /payments/:id/refund
→ Admin authentication (adminAuth middleware)
→ Call Stripe refunds API
→ Update order status="refunded" in PostgreSQL
→ Return refund confirmation
```

## Database schema

### Core tables

**users**
```sql
id | email | password_hash | is_admin | created_at | updated_at
```

**orders**
```sql
id | user_id | stripe_payment_intent_id | stripe_customer_id
amount | currency | status | created_at
```

**payments**
```sql
id | order_id | stripe_charge_id | amount | status
refunded_at | created_at
```

### Indexes
- `orders(user_id)` — for user order history queries
- `orders(stripe_payment_intent_id)` — for webhook lookup
- `payments(order_id)` — for payment history per order

## Webhook reliability

Stripe webhooks are retried by Stripe if your endpoint returns non-200. PayFlow:
- Immediately returns 200 on webhook receipt (does not wait for DB commit)
- Uses database transactions for payment state updates
- Handles duplicate webhook events idempotently (check `stripe_payment_intent_id` before update)

Graceful shutdown handler (`server.js`) ensures in-flight webhook processing completes before shutdown.

## Environment variables

```
DATABASE_URL=postgresql://user:pass@host:5432/payflow
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
NODE_ENV=development
PORT=8080
```

## Key design decisions

| Decision | Why |
|---|---|
| Separate /webhooks route | Stripe requires raw body for signature verification — cannot use Express body parsers before this route |
| Idempotent webhook handler | Stripe retries failed webhooks; order status updated only if current status is "pending" |
| Return 200 immediately | Stripe's retry window is short; slow DB operations shouldn't cause duplicate processing |
| JWT with access + refresh | Refresh token allows session extension without re-login; access token short-lived for security |
| Decimal amounts in cents | Stripe uses integers (cents) to avoid floating-point errors |

## Docker setup

```yaml
# docker-compose.yml (key services)
api:   # Node.js on :8080
db:    # PostgreSQL on :5432
admin: # pgAdmin on :5050 (dev only)
```

```bash
docker-compose up -d
# API available at localhost:8080
# pgAdmin at localhost:5050
```

## Testing

```bash
npm run test          # Unit tests
npm run test:e2e     # End-to-end (requires Stripe test keys)
```

## What this shows for backend/data roles

- End-to-end payment pipeline design (Stripe is an industry-standard integration)
- Webhook-based event processing (real-time data ingestion pattern)
- Idempotent processing for external API callbacks
- PostgreSQL transactions with proper rollback on failure
- Docker-based local development environment
- JWT authentication with refresh token rotation

---

*See `README.md` for quick start. See `src/` for the actual implementation.*