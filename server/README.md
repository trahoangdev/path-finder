# PathFinder — Server

Backend REST API cho PathFinder, built với **Hono + TypeScript + MongoDB Atlas**.

> *Career Pivot Engine for Vietnamese Developers — Powered by 3,000+ calibrated synthetic trajectories plus curated VN market data.*

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Hono ^4.12 (ultra-fast, TS-first web framework) |
| Runtime | Node.js 20.12+ |
| Validation & API docs | Zod ^4 + `@hono/zod-openapi` → auto OpenAPI 3.1 at `/docs` |
| Database | MongoDB Atlas M0 + driver `mongodb` ^6.21 |
| AI | OpenAI (`text-embedding-3-small` + `gpt-4o-mini`) |
| Logger | pino + pino-pretty (dev) |
| ETL | Python 3.11 + pandas + pymongo (offline) |

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Fill MONGODB_URI, OPENAI_API_KEY

# 3. (Optional) Run ETL to populate DB
npm run etl:install
npm run etl:all

# 4. Dev mode (hot reload)
npm run dev
```

Server listens on **http://localhost:4000**. API docs (Swagger UI) at **http://localhost:4000/docs**.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Watch mode with `tsx` |
| `npm run build` | Compile TS → `dist/` |
| `npm start` | Run compiled output |
| `npm run typecheck` | Type-only check, no emit |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Vitest |

---

## API endpoints

| Method | Path | Purpose | MongoDB tech |
|--------|------|---------|--------------|
| GET    | `/health` | Health probe (DB + AI status) | — |
| GET    | `/docs` | Swagger UI | — |
| POST   | `/api/extract-skills` | LLM parse CV → skill list | — |
| POST   | `/api/embed` | Get OpenAI embedding (768-dim) for text | — |
| POST   | `/api/gap-analysis` | Skills missing for target role | **Vector Search** |
| POST   | `/api/pivot-paths` | 3 lộ trình (Fast / Balanced / Comprehensive) | **`$graphLookup`** |
| POST   | `/api/proof-drawer` | Evidence: N, conv rate, salary lift, examples | **`$facet`** |
| POST   | `/api/similar-devs` | Devs giống bạn → giờ ở đâu | **Vector + `$group`** |
| POST   | `/api/course-recommendations` | Course lấp gap skill | **Vector + filter** |
| POST   | `/api/analyze` | Orchestrator: chạy parallel all of above | combined |

Full OpenAPI spec available at runtime tại `/docs`.

---

## Folder structure

```
server/
├── src/
│   ├── index.ts                 # Hono app entry + OpenAPI setup
│   ├── config/
│   │   ├── env.ts               # Zod-validated env
│   │   └── mongo.ts             # MongoClient singleton + collection helpers
│   ├── routes/                  # Hono routes — one file per resource
│   ├── services/                # Business logic
│   │   ├── openai.ts            # Embedding + LLM client
│   │   ├── aggregations/        # MongoDB aggregation pipelines
│   │   └── vector-search/       # Vector Search queries
│   ├── schemas/                 # Zod schemas (single source of truth)
│   ├── middleware/              # CORS, error, logger, etc.
│   └── lib/                     # Shared utils (logger, errors)
├── etl/                         # Python offline scripts
└── ...
```

---

## Environment variables

See `.env.example`. Key vars:

| Var | Required | Description |
|-----|----------|-------------|
| `MONGODB_URI` | ✅ | Atlas connection string |
| `MONGODB_DB` | ✅ | DB name (default `pathfinder`) |
| `OPENAI_API_KEY` | ✅ | From [platform.openai.com](https://platform.openai.com/api-keys) |
| `OPENAI_EMBEDDING_MODEL` | optional | Default `text-embedding-3-small` (768-dim via Matryoshka) |
| `OPENAI_LLM_MODEL` | optional | Default `gpt-4o-mini` |
| `CORS_ORIGINS` | ✅ | Comma-separated allowed origins |
| `PORT` | optional | Default `4000` |
| `LOG_LEVEL` | optional | `trace` / `debug` / `info` / `warn` / `error` |

---

## Deployment

Recommended: **Railway** or **Render** free tier — both support Node 20 native, env vars, log streaming.

```bash
npm run build
npm start
```

Health check endpoint: `GET /health` → returns `{ status: "ok" }` when DB + AI both reachable.

---

## License

Project source code is licensed under the root [MIT License](../LICENSE).
