-- ASIRI: esquema de base de datos. Idempotente: se ejecuta en cada arranque.
-- Los precios se guardan en céntimos (enteros) para evitar errores de redondeo.

CREATE TABLE IF NOT EXISTS products (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  size         TEXT NOT NULL DEFAULT '',
  price_cents  INTEGER NOT NULL CHECK (price_cents >= 0),
  image        TEXT NOT NULL DEFAULT '',
  badge        TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  stock        INTEGER CHECK (stock IS NULL OR stock >= 0), -- NULL = sin control de stock
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id              SERIAL PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'nuevo'
                  CHECK (status IN ('nuevo','confirmado','pagado','enviado','entregado','cancelado')),
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  customer_email  TEXT,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('delivery','recojo')),
  district        TEXT,
  address         TEXT,
  notes           TEXT,
  subtotal_cents  INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id               SERIAL PRIMARY KEY,
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       TEXT NOT NULL REFERENCES products(id),
  name             TEXT NOT NULL,
  size             TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity         INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);

CREATE TABLE IF NOT EXISTS subscribers (
  email      TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  contact    TEXT NOT NULL,
  message    TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- v2: precio de referencia para ofertas y envío en pedidos.
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_cents INTEGER CHECK (compare_at_cents IS NULL OR compare_at_cents > 0);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cents INTEGER NOT NULL DEFAULT 0;
