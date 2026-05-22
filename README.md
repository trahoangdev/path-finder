# PathFinder

> **Career Pivot Engine for Vietnamese developers.** Tells you the next skill that unlocks the role you actually want, grounded in calibrated career trajectories, curated VN job data, MongoDB Atlas Vector Search, and Aggregation Pipelines.

| | |
|---|---|
| **Project** | PathFinder — Career Pivot Engine |
| **Team** | 100M Builder |
| **Author** | Hoàng Trọng Trà |
| **Contest** | MUGVN × MongoDB Mini Hackathon 2026 |
| **Topic** | Recommendation Engine using MongoDB Vector Search + Aggregation Pipeline |
| **Stack** | Next.js 16 (client) · Hono + TypeScript (server) · MongoDB Atlas · OpenAI |

---

## What it does

PathFinder is a recommendation engine that answers three questions for a developer planning a career pivot. Every recommendation is grounded in explicit data provenance and is computed inside MongoDB — the LLM is only used to extract skills from the CV.

| Question | How we answer it | MongoDB feature |
|---|---|---|
| *"Which skills am I missing to land the target role?"* | Vector search the skill taxonomy against a target-role embedding + cross-reference with `skill_transitions` evidence | **Atlas Vector Search** + `$lookup` |
| *"What's the shortest path from where I am to where I want to be?"* | Recursive traversal over a pre-computed `role → skill → skill → role` graph, returns 3 flavors (`fast` / `balanced` / `comprehensive`) | **`$graphLookup`** |
| *"Has anyone actually pulled this off? What did it pay?"* | Single `$facet` over career trajectories returns sample size, conversion %, salary lift, examples | **Aggregation `$facet`** |

Two more recommendations round out the engine:

- **Course recommendation** — `$vectorSearch` on `courses.description_embedding` with hybrid ranking (exact match → token match → semantic similarity).
- **Similar developers** — `$vectorSearch` on `career_trajectories.snapshots.cv_embedding` with a `$reduce` + `$setIntersection` aggregation fallback.

All cards on the dashboard carry an **Honest Mode** badge: trustworthy when `N ≥ 30`, low confidence between `10..29`, fully hidden when `N < 10`. Recommendations refuse to guess.

---

## Repository layout (monorepo)

```
pathfinder/
├── README.md                          ← you are here
├── docs/
│   └── TECHNICAL_DOC.md               Architecture · data schemas · MongoDB techniques · ADRs
├── client/                            Next.js 16 + shadcn/ui dashboard
│   └── src/
│       ├── app/(dashboard)/pathfinder/
│       └── lib/pathfinder/            typed fetch client + types
├── server/                            Hono REST API + Mongo aggregations
│   ├── src/
│   │   ├── routes/                    health · orchestrator · gap · paths · proof · …
│   │   ├── services/
│   │   │   ├── vector-search/         skills · courses · similar-devs
│   │   │   └── aggregations/          pivot-path · proof-drawer · salary-band · skill-explain
│   │   └── schemas/                   Zod + OpenAPI
│   └── etl/                           Python offline ingest pipeline (01..07)
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
NEXT_PUBLIC_PATHFINDER_API_URL=http://localhost:4000
```

### 3. Seed MongoDB (run once)

```bash
cd server
npm run etl:install        # pip install -r etl/requirements.txt
npm run etl:all            # runs 01_…py → 07_…py sequentially, ~3–8 minutes total
```

Pipeline summary (see `server/etl/README.md` for the long version):

| # | Script | Outputs |
|---|---|---|
| 01 | `01_generate_trajectories.py` | ~3,000 calibrated SEA dev career paths (deterministic, `seed=42`) → `career_trajectories` |
| 02 | `02_scrape_itviec.py` | ~20 curated VN job listings → `jobs` (override via `data/itviec_sample.json`) |
| 03 | `03_load_skills_roadmap.py` | roadmap.sh skill taxonomy → `skills` + `roadmap_edges` |
| 04 | `04_load_courses.py` | ~30 curated courses → `courses` |
| 05 | `05_embed_all.py` | OpenAI `text-embedding-3-small` (768-dim Matryoshka) for skills / courses / jobs / trajectory snapshots |
| 06 | `06_create_indexes.py` | Regular indexes + Atlas Vector Search indexes |
| 07 | `07_compute_transitions.py` | Pre-compute traversable `skill_transitions` graph via aggregation `$out` |

### 4. Run both services

```bash
# Terminal 1
cd server  && npm run dev    # → http://localhost:4000  ·  Swagger at /docs
# Terminal 2
cd client  && npm run dev    # → http://localhost:3000  ·  PathFinder at /pathfinder
```

Open <http://localhost:3000/pathfinder>, paste a CV, pick a target role, and run the analysis. The orchestrator runs ~7 MongoDB operations across two parallel phases and returns a unified payload.

---

## What the orchestrator does (one `POST /api/analyze`)

```
Phase 1 (parallel)
  ├─ gapAnalysis        — $vectorSearch skills + evidence join from skill_transitions
  ├─ pivotPaths         — $graphLookup over the traversable graph, 3 flavors
  ├─ proofDrawer        — $facet on career_trajectories (sample · conversion · salary · examples · sources)
  └─ similarDevs        — $vectorSearch on snapshot embeddings, $setIntersection fallback

Phase 2 (parallel, depends on Phase 1 gap)
  ├─ courses-by-skill   — embedBatch top-3 missing skills, $vectorSearch on courses + hybrid ranking
  ├─ salaryBand         — $facet on jobs (level / company / top skills) — VN VND
  └─ salaryInference    — $unwind + $group on pivots_detected — median lift % post-pivot
```

End-to-end target: **< 4 s P95** on a warmed environment; current local runs typically land around **4–6 s** depending on OpenAI latency.

---

## Scripts cheat-sheet

| Where | Command | What it does |
|---|---|---|
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

Every recommendation carries a sample-size cap and a data-source badge.

| Sample size | UI treatment | Behavior |
|---|---|---|
| `N ≥ 30` | Green **Trustworthy** badge | Normal card with stats |
| `10 ≤ N < 30` | Amber **Low confidence** badge | Card still renders with a warning in the header |
| `N < 10` | Red **Insufficient data** badge | Card is replaced by a *"Not enough data to recommend"* placeholder |

Every card surfaces its **data sources** — `synthetic_vn`, `itviec_sample`, `skill_transitions`, `roadmap.sh`, `learn.mongodb.com` — and the **aggregation stages** it uses (`$vectorSearch`, `$graphLookup`, `$facet`, `$lookup`, …) so the recommendation is auditable end-to-end.

The skill explain drawer goes one step further: clicking any missing skill returns the **actual MongoDB aggregation pipelines** that produced its evidence, ready to paste into your own cluster and reproduce.

---

## Documentation

| File | What's in it |
|---|---|
| [`docs/TECHNICAL_DOC.md`](./docs/TECHNICAL_DOC.md) | System architecture · data schemas · Vector Search & Aggregation Pipeline usage · index strategy · ADRs |
| [`server/README.md`](./server/README.md) | Backend setup deep-dive · API contract · troubleshooting |
| [`server/etl/README.md`](./server/etl/README.md) | Per-script ETL details · embedding dimensions · index definitions |
| [`client/README.md`](./client/README.md) | Frontend notes (Next.js + shadcn/ui baseline) |

The hackathon submission checklist (MVP + system architecture, data schema, Vector Search and Aggregation Pipeline usage) is covered end-to-end in `docs/TECHNICAL_DOC.md` §1–§9, with section §13.5 mapping each requirement back to a chapter.

---

## License

Project source code is licensed under the [MIT License](./LICENSE). Synthetic trajectory data is original and deterministic. roadmap.sh JSON remains MIT-licensed. ITViec scraped JDs are for research use only and are not redistributed.

---

> *"Don't recommend jobs. Recommend the next skill that unlocks them — from evidence-bearing career trajectories."*
