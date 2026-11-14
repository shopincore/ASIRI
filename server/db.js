/**
 * Acceso a datos. En producción usa PostgreSQL (DATABASE_URL, p. ej. Railway).
 * Sin DATABASE_URL usa PGlite (Postgres embebido) para desarrollo y pruebas:
 * en disco (.data/) o en memoria con DATABASE_URL=memory.
 */
import { readFile } from 'node:fs/promises';
import { SEED_PRODUCTS } from './seed.js';

const schemaSql = () => readFile(new URL('./schema.sql', import.meta.url), 'utf8');

export async function createDb(url = process.env.DATABASE_URL) {
  let db;
  if (!url && (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production')) {
    // El disco de Railway se borra en cada despliegue: sin Postgres se perderían los pedidos.
    throw new Error('Falta DATABASE_URL: agrega una base de datos PostgreSQL al servicio.');
  }
  if (url && url !== 'memory') {
    const { default: pg } = await import('pg');
    const ssl = /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined;
    const pool = new pg.Pool({ connectionString: url, ssl, max: 10 });
    db = {
      query: (text, params) => pool.query(text, params),
      async tx(fn) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await fn((text, params) => client.query(text, params));
          await client.query('COMMIT');
          return result;
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {});
          throw err;
        } finally {
          client.release();
        }
      },
      close: () => pool.end(),
    };
    await pool.query(await schemaSql());
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const pglite = new PGlite(url === 'memory' ? undefined : '.data/asiri');
    db = {
      query: (text, params) => pglite.query(text, params),
      tx: fn => pglite.transaction(tx => fn((text, params) => tx.query(text, params))),
      close: () => pglite.close(),
    };
    await pglite.exec(await schemaSql());
  }
  await seed(db);
  return db;
}

/** Agrega los productos del catálogo de muestra que aún no existen (no toca los existentes). */
async function seed(db) {
  for (const [i, p] of SEED_PRODUCTS.entries()) {
    await db.query(
      `INSERT INTO products (id, name, category, size, price_cents, compare_at_cents, image, badge, description, stock, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
      [p.id, p.name, p.category, p.size, p.price_cents, p.compare_at_cents, p.image, p.badge, p.description, p.stock, i],
    );
  }
}
