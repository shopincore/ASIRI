# ASIRI · Backend

Servidor Node.js (Express) + PostgreSQL. Sirve la web y la API desde el mismo dominio.
GitHub Pages sigue funcionando: usa la API de Railway (CORS) y, si no responde, el catálogo local.

## Ejecutar en local

```bash
npm install
npm run dev        # http://localhost:3000 · base de datos embebida en .data/
npm test           # pruebas de la API con base de datos en memoria
```

## Variables de entorno

| Variable          | Uso                                                                 |
|-------------------|---------------------------------------------------------------------|
| `DATABASE_URL`    | PostgreSQL. Obligatoria en Railway. Sin ella, en local usa PGlite.  |
| `ADMIN_TOKEN`     | Clave del panel `/admin` y de `/api/admin/*`. Usa una larga y secreta. |
| `WHATSAPP_NUMBER` | Número de la tienda (ej. `51987654321`) para confirmar pedidos.     |
| `ALLOWED_ORIGINS` | Orígenes con acceso CORS. Por defecto `https://shopincore.github.io`. |
| `PORT`            | Lo define Railway.                                                  |

## API

Errores: `{"error": {"message": "...", "details": {...}}}` con 400 (datos inválidos),
401 (admin sin clave), 404, 409 (sin stock / producto no disponible), 429 (demasiadas solicitudes).

### Pública
- `GET  /api/health`
- `GET  /api/products?category=Infusiones` → `{products: [...]}`
- `GET  /api/products/:id`
- `POST /api/orders` → `201 {order, whatsappUrl}`
  ```json
  {"customer": {"name": "Ana", "phone": "+51 987 654 321", "email": "opcional"},
   "delivery": {"method": "delivery", "district": "Miraflores", "address": "Av. Larco 123"},
   "notes": "opcional",
   "items": [{"productId": "maca", "quantity": 2}]}
  ```
  `method` puede ser `delivery` o `recojo` (sin distrito ni dirección).
  Precios y stock se calculan en el servidor; el código del pedido tiene la forma `ASI-AAMMDD-XXXX`.
- `POST /api/newsletter` `{email}`
- `POST /api/contact` `{name, contact, message}`

### Administración (`Authorization: Bearer <ADMIN_TOKEN>`)
- `GET   /api/admin/orders?status=nuevo&limit=50&offset=0`
- `PATCH /api/admin/orders/:code` `{status}` — `nuevo, confirmado, pagado, enviado, entregado, cancelado`.
  Cancelar devuelve el stock.
- `GET   /api/admin/products` · `POST /api/admin/products` · `PATCH /api/admin/products/:id`
  Campos: `name, category, size, priceCents, image, badge, description, stock (null = sin control), active, sortOrder`.
- `GET   /api/admin/subscribers`
- `GET   /api/admin/messages` · `PATCH /api/admin/messages/:id` `{read}`

Estas mismas rutas de administración sirven para conectar un CRM (p. ej. Shopin365): el CRM
lee pedidos y suscriptores con la clave de administración.
