-- migrations/007_add_performance_indexes.sql
-- Note: Some of these indexes might have been created in earlier migrations.
-- This file ensures they all exist for performance optimization.

-- Index for user lookups on payments and orders
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Index for fast lookup of payments by their Stripe ID
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

-- Index for filtering payments by status and sorting by creation date
CREATE INDEX IF NOT EXISTS idx_payments_status_created_at ON payments(status, created_at DESC);

-- Index for finding orders associated with a payment
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
