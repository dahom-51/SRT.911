# Deployment Guide — Ford Police Parts Store

## Architecture
```
Frontend (Vercel)  →  Backend API (Railway)  →  PostgreSQL (Railway)
                                             →  Tap Payments (external)
```

---

## Step 1 — Deploy Backend on Railway

### 1.1 Create Railway project
1. Go to [railway.app](https://railway.app) → New Project
2. Choose **Deploy from GitHub repo** → select your repo
3. Set **Root Directory** to `backend`

### 1.2 Add PostgreSQL
1. In your Railway project → **New** → **Database** → **PostgreSQL**
2. Railway auto-sets `DATABASE_URL` in your service environment

### 1.3 Set Environment Variables
In Railway → your service → **Variables**, add:

| Variable          | Value                                          |
|-------------------|------------------------------------------------|
| `NODE_ENV`        | `production`                                   |
| `PORT`            | `3001`                                         |
| `JWT_SECRET`      | *(run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)* |
| `CORS_ORIGIN`     | `https://your-store.vercel.app` (add after Vercel deploy) |
| `BACKEND_URL`     | `https://your-service.railway.app`             |
| `TAP_SECRET_KEY`  | `sk_live_...` from Tap dashboard               |
| `ADMIN_EMAIL`     | `admin@yourstore.com`                          |
| `ADMIN_PASSWORD`  | A strong password (used only for first migration) |

### 1.4 Deploy
Railway will run automatically:
1. `npm install`
2. `npm run build` (TypeScript → JavaScript)
3. `npm run migrate` (creates all tables + seeds admin)
4. `npm run start`

### 1.5 Verify
Visit: `https://your-backend.railway.app/api/healthz`
Should return: `{ "status": "ok", "version": "1.0.0" }`

---

## Step 2 — Deploy Frontend on Vercel

### 2.1 Import project
1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set **Root Directory** to `frontend`
3. Framework: **Vite**

### 2.2 Set Environment Variables
| Variable              | Value                                          |
|-----------------------|------------------------------------------------|
| `VITE_API_URL`        | `https://your-backend.railway.app/api`         |
| `VITE_TAP_PUBLIC_KEY` | `pk_live_...` from Tap dashboard               |

### 2.3 Deploy
Vercel runs `npm run build` → deploys `dist/`

### 2.4 Update Backend CORS
After getting your Vercel URL, go back to Railway and update:
```
CORS_ORIGIN=https://your-store.vercel.app
```

---

## Step 3 — Configure Tap Payments

1. Go to [Tap Dashboard](https://businesses.tap.company) → Developers → API Keys
2. Copy **Secret Key** → set as `TAP_SECRET_KEY` in Railway
3. Copy **Public Key** → set as `VITE_TAP_PUBLIC_KEY` in Vercel
4. In Tap Dashboard → Webhooks → add:
   `https://your-backend.railway.app/api/payments/webhook`

---

## Local Development

```bash
# 1. Clone repo and navigate to backend
cd backend
cp .env.example .env
# Edit .env with your local PostgreSQL credentials

# 2. Install dependencies
npm install

# 3. Run migration (creates tables + admin user)
npm run migrate

# 4. Start dev server
npm run dev
# Server runs at http://localhost:3001

# 5. Test health
curl http://localhost:3001/api/healthz

# 6. Login as admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourstore.com","password":"Admin@12345"}'
```

---

## API Endpoints Summary

### Public
| Method | Path                              | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | `/api/healthz`                    | Health check             |
| GET    | `/api/products`                   | List products (paginated)|
| GET    | `/api/products/featured`          | Featured products        |
| GET    | `/api/products/:id`               | Single product           |
| GET    | `/api/categories`                 | All categories           |
| POST   | `/api/orders`                     | Create order             |
| POST   | `/api/payments/checkout`          | Start Tap payment        |
| GET    | `/api/payments/status/:orderId`   | Check payment status     |
| POST   | `/api/payments/webhook`           | Tap webhook callback     |

### Admin (requires `Authorization: Bearer <token>`)
| Method | Path                              | Description              |
|--------|-----------------------------------|--------------------------|
| POST   | `/api/auth/login`                 | Admin login              |
| GET    | `/api/auth/me`                    | Current admin            |
| POST   | `/api/auth/change-password`       | Change password          |
| POST   | `/api/products`                   | Create product           |
| PUT    | `/api/products/:id`               | Update product           |
| DELETE | `/api/products/:id`               | Delete product           |
| GET    | `/api/products/stats`             | Product statistics       |
| GET    | `/api/orders`                     | All orders               |
| GET    | `/api/orders/:id`                 | Order detail             |
| PATCH  | `/api/orders/:id/status`          | Update order status      |
| GET    | `/api/payments`                   | All payments             |

---

## Security Checklist
- [x] JWT authentication on all admin routes
- [x] bcrypt password hashing (cost factor 12)
- [x] Helmet security headers
- [x] Rate limiting (10 req/15min login, 20 req/hr checkout, 300 req/15min general)
- [x] CORS locked to specific origins
- [x] Raw body parsing for webhook integrity
- [x] Input validation via Zod on all endpoints
- [x] SQL injection prevention via Drizzle ORM (parameterized queries)
- [x] Error messages sanitized in production
- [x] `trust proxy` set for Railway reverse proxy
