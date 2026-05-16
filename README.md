# PathFinder

> **AI Career Coach for Vietnamese developers.** Tells you the next skill that unlocks the role you actually want — based on real career trajectory data, MongoDB Atlas Vector Search, and Aggregation Pipelines.

| | |
|---|---|
| **Project** | PathFinder — Career Pivot Engine |
| **Team** | Hoàng Trọng Trà (solo) |
| **Contest** | MUGVN × MongoDB Mini Hackathon 2026 |
| **Stack** | Next.js 16 (client) · Hono + TypeScript (server) · MongoDB Atlas · OpenAI |
| **Status** | MVP feature-complete · see [docs/PRD.md](./docs/PRD.md) for the full spec |

---

## Why this exists

Around **200,000 Vietnamese developers** aged 25–35 are mid career-crisis as the 2026 AI wave reshapes the tech stack. The two tools they currently use are both broken:

- **roadmap.sh** — static, not personalized, no VN salary signal.
- **ChatGPT** — hallucinates, no verifiable evidence, no trajectory data.

PathFinder answers three questions, every recommendation backed by real data:

| Question | How we answer it | MongoDB feature |
|----------|------------------|-----------------|
| *"What skills am I missing to land the target role?"* | Vector search the skill taxonomy against a target-role embedding + cross-reference with `skill_transitions` evidence | **Atlas Vector Search** |
| *"What's the shortest path from where I am to where I want to be?"* | Recursive graph traversal over a pre-computed skill graph + edge-only fallback | **`$graphLookup`** |
| *"Has anyone actually pulled this off? What did it pay?"* | Single `$facet` over career trajectories returns N, conversion %, salary lift, examples | **Aggregation `$facet`** |

All cards on the dashboard carry an **Honest Mode** badge: trustworthy when `N ≥ 30`, low confidence between `10..30`, fully hidden when `N < 10`. Recommendations refuse to guess.

---

## Repository layout (monorepo)

```
pathfinder/
├── README.md                          ← you are here
├── docs/
│   ├── PRD.md                         Full product spec (VN)
│   ├── TECHNICAL_DOC.md               Architecture + data schemas + use cases
│   └── ITViec.md, RoadMap.md, …       Reference notes
├── client/                            Next.js 16 + shadcn/ui dashboard
├── server/                            Hono REST API + Mongo aggregations
│   ├── src/                           routes · services · schemas
│   └── etl/                           Python offline ingest pipeline
└── data/                              gitignored — optional override files
```

Each service is independent — you can deploy them apart (e.g. Vercel + Railway), run them locally, or run just the server with the auto-generated Swagger UI at `/docs`.

---

## Quick start (local, full stack)

> Pre-reqs: **Node.js ≥ 20.12**, **Python 3.11**, a free **MongoDB Atlas M0** cluster, an **OpenAI API key**.

### 1. Install JS deps

```bash
cd server  && npm install
cd ../client && npm install
```

### 2. Configure env

```bash
# server/.env  (copy from server/.env.example)
MONGODB_URI="mongodb+srv://<user>:<pass>@<cluster>.mongodb.net"
MONGODB_DB="pathfinder"
OPENAI_API_KEY="sk-..."
# Optional — defaults shown:
# OPENAI_EMBEDDING_MODEL=text-embedding-3-small
# OPENAI_LLM_MODEL=gpt-4o-mini
# CORS_ORIGINS=http://localhost:3000
```

```bash
# client/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

### 3. Seed MongoDB (run once)

```bash
cd server
npm run etl:install        # pip install -r etl/requirements.txt (inside server/etl/)
npm run etl:all            # runs 01_…py → 07_…py sequentially, ~3–8 minutes total
```

Pipeline summary (see `server/etl/README.md` for the long version):

| # | Script | Outputs |
|---|--------|---------|
| 01 | `01_generate_trajectories.py` | ~3,000 synthetic SEA dev career paths (deterministic, `seed=42`) → `career_trajectories` |
| 02 | `02_scrape_itviec.py` | ~20 curated VN job listings → `jobs` (override via `data/itviec_sample.json`) |
| 03 | `03_load_skills_roadmap.py` | roadmap.sh skill taxonomy → `skills` |
| 04 | `04_load_courses.py` | ~30 curated courses → `courses` |
| 05 | `05_embed_all.py` | OpenAI `text-embedding-3-small` (768-dim Matryoshka) for skills / courses / jobs |
| 06 | `06_create_indexes.py` | Regular indexes + Atlas Vector Search indexes |
| 07 | `07_compute_transitions.py` | Pre-compute `skill_transitions` via aggregation `$out` |

### 4. Run both services

```bash
# Terminal 1
cd server  && npm run dev    # → http://localhost:4000  ·  Swagger at /docs
# Terminal 2
cd client  && npm run dev    # → http://localhost:3000  ·  Pathfinder at /pathfinder
```

Open <http://localhost:3000/pathfinder>, click one of the three demo personas (Khang / Linh / Tuấn), pick a target role, and hit **Run analysis**. The orchestrator runs ~7 MongoDB operations in two parallel phases and returns a unified payload.

---

## What the orchestrator does (one `POST /api/analyze`)

```
Phase 1 (parallel)
  ┌─ gapAnalysis        — vector search skills + evidence join from skill_transitions
  ├─ pivotPaths         — $graphLookup + edge-only fallback, 3 flavors
  ├─ proofDrawer        — $facet on career_trajectories (sample · conversion · salary)
  └─ similarDevs        — $vectorSearch on snapshots OR skill-overlap aggregation fallback

Phase 2 (parallel, depends on Phase 1 gap)
  ┌─ courses-by-skill   — embedBatch top-3 missing skills, $vectorSearch courses
  ├─ salaryBand         — $facet on jobs (level / company / top skills) — VN VND
  └─ salaryInference    — $group on pivots_detected — median lift % post-pivot
```

End-to-end target: **< 4 s P95** on M0 free-tier (parallelism + pre-computed `skill_transitions` are doing the heavy lifting).

---

## Scripts cheat-sheet

| Where | Command | What it does |
|-------|---------|--------------|
| `server/` | `npm run dev` | Hono server with hot reload (tsx watch) |
| `server/` | `npm run typecheck` | `tsc --noEmit` over the whole server |
| `server/` | `npm run test` | Vitest unit tests |
| `server/` | `npm run etl:all` | Re-seed MongoDB end-to-end (idempotent) |
| `server/` | `npm run build` && `npm start` | Production build |
| `client/` | `npm run dev` | Next.js dev server |
| `client/` | `npm run build` | Production bundle |
| `client/` | `npx tsc --noEmit -p tsconfig.json` | Type-check the Next.js app |

---

## Honesty contract

This project takes its name seriously: no recommendation goes out without a sample-size cap.

| Sample size | UI treatment | What the user sees |
|-------------|--------------|---------------------|
| `N ≥ 30` | Green **Trustworthy** badge | Normal card with stats |
| `10 ≤ N < 30` | Amber **Low confidence** badge | Card still renders but a warning sits in the header |
| `N < 10` | Red **Insufficient data** badge | Card replaced by an *"Not enough data to recommend"* placeholder |

Every card also surfaces its **data sources** — `synthetic_vn_cohort`, `itviec_sample`, `skill_transitions`, `roadmap.sh`, `learn.mongodb.com` — so judges and end-users can audit exactly which collection produced each number.

---

## Documentation

| File | What's in it |
|------|--------------|
| [`docs/PRD.md`](./docs/PRD.md) | Full product spec — personas, use cases, demo storyboard |
| [`docs/TECHNICAL_DOC.md`](./docs/TECHNICAL_DOC.md) | System architecture · data schemas · MongoDB techniques applied · performance baseline · ADRs |
| [`server/README.md`](./server/README.md) | Backend setup deep-dive · API contract · troubleshooting |
| [`server/etl/README.md`](./server/etl/README.md) | Per-script ETL details · embedding dimensions · index definitions |
| [`client/README.md`](./client/README.md) | Frontend project notes (Next.js + shadcn/ui template baseline) |

The judge submission checklist (data schema, MongoDB techniques, Vector Search & Aggregation Pipeline usage) is fully covered by `docs/TECHNICAL_DOC.md` §3–4.

---

## License

Source code: MIT. Synthetic trajectory data: original, deterministic — free to use. roadmap.sh JSON: MIT. ITViec scraped JDs: research-use only, not redistributed.

---

> *"Don't recommend jobs. Recommend the next skill that unlocks them — from real career trajectories."*
