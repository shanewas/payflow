-- migrations/009_extend_payment_status.sql

ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'requires_payment_method';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'requires_confirmation';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'requires_action';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'canceled';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'refunded';
