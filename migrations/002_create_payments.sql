-- migrations/002_create_payments.sql
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed');

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    amount INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
