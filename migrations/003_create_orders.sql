-- migrations/003_create_orders.sql
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    payment_id UUID REFERENCES payments(id),
    total_amount INTEGER NOT NULL,
    items JSONB NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    shipping_address JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
