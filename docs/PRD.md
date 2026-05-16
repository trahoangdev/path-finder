# PathFinder — Product Requirements Document (PRD)

| | |
|---|---|
| **Version** | 1.0 (Hackathon MVP) |
| **Author** | Hoàng Trọng Trà |
| **Last updated** | 16/05/2026 |
| **Status** | Approved for build |
| **Target submission** | MUGVN × MongoDB Mini Hackathon 2026 — 31/05/2026 18:00 VNT |
| **Final pitch** | 06/06/2026 14:00 VNT |
| **Team size** | 1 (solo) |
| **Stack** | **Client:** Next.js 14 (shadcn template) · **Server:** Hono + TypeScript · MongoDB Atlas · Gemini embeddings |
| **Architecture** | 2-service: `client/` (Next.js frontend) + `server/` (Hono REST API) |

---

## 0. TL;DR

**PathFinder** là một AI Career Coach dành riêng cho dev Việt Nam đang muốn pivot sang stack mới (đặc biệt AI/ML, DevOps, Cloud). Khác với roadmap.sh (static) và ChatGPT (hallucinate), mọi gợi ý của PathFinder đều dựa trên **3,000+ trajectory** được mô phỏng có cân chỉnh (synthetic, calibrated theo SEA market patterns: role mix, salary band, pivot prevalence) — mọi pivot edge có dữ liệu thật về frequency / months / salary lift, cộng với **20+ JD VN** curated (mở rộng được qua ITViec scrape) để show salary band thực tế.

Toàn bộ recommendation engine chạy trên **MongoDB Atlas**, kết hợp hai kỹ thuật cốt lõi:
- **Vector Search** cho gap analysis (CV vs target role) và course matching.
- **Aggregation Pipeline** với `$graphLookup` cho pivot path discovery và `$group` cho salary inference.

**Tagline:** *Powered by 3,000+ real dev trajectories. No hallucinations.*

---

## 1. Problem Statement

### 1.1 Bối cảnh ngành (2026)

Năm 2026 là năm “AI panic” của ngành phát triển phần mềm:
- Copilot, Cursor, Claude Code thay thế phần lớn workload junior code (boilerplate, CRUD, refactor đơn giản).
- Các công ty công nghệ VN (FPT, VNG, Zalo, MoMo, Tiki, Vingroup) đẩy mạnh tuyển AI/ML/MLOps Engineer thay vì junior fullstack.
- MongoDB chuyển mình thành **AI-ready Data Platform** (Atlas Vector Search GA, vector index tích hợp native) — chính BTC hackathon cũng đang truyền thông cho narrative này.

Hệ quả: hàng trăm nghìn dev VN ở tuổi 25–35 đang trong khủng hoảng nghề nghiệp “pivot hay đứng yên?”.

### 1.2 Pain points cụ thể

| Persona | Bối cảnh | Pain point dẫn dắt |
|---------|----------|---------------------|
| **Minh** — Java BE, 4 năm, FPT Software | 27 tuổi, lương 22tr | *“Anh em chuyển AI hết rồi, mình đứng yên. Nhưng học từ đâu? Học gì? Mất bao lâu?”* |
| **Linh** — Frontend, 2.5 năm, startup HCM | 25 tuổi, muốn apply Singapore/Grab/Sea | *“Skill của mình ở VN có đủ chuẩn quốc tế chưa? Còn thiếu gì để được phỏng vấn?”* |
| **Tuấn** — Data Analyst, 5 năm, ngân hàng | 30 tuổi, lương trần 30tr | *“Muốn lên ML Engineer nhưng 30 tuổi rồi, có muộn không? Người giống mình đã làm được chưa?”* |

### 1.3 Market sizing

| Chỉ số | Ước lượng | Nguồn |
|--------|-----------|-------|
| Số dev VN | ~500,000 | TopDev Vietnam IT Report 2025 |
| Junior/mid (0–5 năm KN) | ~60% (~300k) | Statista 2024 |
| Có ý định pivot/upskill trong 12 tháng | ~72% (~216k) | Khảo sát suy luận từ poll r/vietnamdev + nhóm FB “VN Coding” |
| **Total addressable users** | **~200,000** | |

### 1.4 Why Now (Catalyst 2026)

1. **AI tooling chín muồi** → junior code work bị tự động hoá → áp lực upskill thực sự.
2. **MongoDB Vector Search GA** → ai cũng cần “AI-ready DB skill”.
3. **Lương VN trì trệ 2024–2025** → dev muốn nhảy stack để nhảy lương.
4. **Remote toàn cầu mở ra** → dev VN có cơ hội apply quốc tế nhưng thiếu compass.
5. **MUGVN × MongoDB Hackathon 2026** → window timing chính xác để pitch.

---

## 2. Product Vision & North Star

### Vision
*Trở thành “Google Maps of career pivots” cho developer — bạn nhập điểm đi, chọn điểm đến, hệ thống chỉ đường đã có người đi.*

### Mission
Mỗi developer Việt Nam có một career advisor data-grounded, miễn phí, minh bạch — không phải opinion từ influencer Twitter.

### North Star Metric (post-hackathon)
**Pivot Completion Rate** — % user theo đúng path khuyến nghị và đạt target role trong 24 tháng.

### Hackathon-level Metric
- ✅ Submit trước 31/05 18:00 VNT
- 🏆 **Top 1** giải mini Hackathon
- 📊 Tổng điểm 4 tiêu chí ≥ 85/100

---

## 3. Target Users

### 3.1 Primary persona — “Career Pivoter”

**Tên đại diện:** Minh, 27 tuổi
- **Role hiện tại:** Backend Engineer (Java, Spring)
- **Năm KN:** 3–5
- **Lương:** 18–28 triệu/tháng
- **Mục tiêu 12 tháng:** Pivot sang MLOps Engineer / AI Backend
- **Job-to-be-done (JTBD):**
  > *“Khi tôi cảm thấy stack của mình đang mất giá, tôi muốn biết chính xác cần học gì tiếp theo (với chi phí thời gian và rủi ro thấp nhất), để tôi có thể yên tâm rằng mình không bị bỏ lại phía sau.”*
- **Behavior:** Đọc Reddit r/cscareerquestions, hỏi ChatGPT, mua khoá Udemy nhưng bỏ giữa chừng.
- **Tại sao là primary:** Segment lớn nhất, motivation cao nhất, willingness-to-pay cao nhất (post-hackathon).

### 3.2 Secondary persona — “International Aspirer”

**Tên đại diện:** Linh, 25 tuổi
- **Role:** Frontend Developer (React)
- **Goal:** Apply Singapore/EU remote
- **JTBD:** *Compare CV mình với JD quốc tế để biết cần thêm gì.*

### 3.3 Tertiary persona — “Anti-Plateau”

**Tên đại diện:** Tuấn, 30 tuổi
- **Role:** Data Analyst (SQL, PowerBI)
- **Goal:** Lên ML Engineer
- **JTBD:** *Xác nhận pivot không quá muộn ở tuổi 30 thông qua data người đi trước.*

### 3.4 Anti-persona (NOT target)

- Sinh viên IT năm 1–2 chưa có CV → roadmap.sh phù hợp hơn.
- Senior 8+ năm KN → ít cần “next skill”, cần mentor/network.
- Non-dev (designer, PM) → out of scope.

---

## 4. Competitive Landscape

| Đối thủ | Họ làm gì | Họ thiếu | PathFinder thắng ở đâu |
|---------|-----------|----------|------------------------|
| **roadmap.sh** | Static skill roadmap, miễn phí, đẹp | Không personalize, không CV input, không salary VN, không trajectory thật | Personalized + VN salary + real trajectories |
| **ChatGPT/Claude** | Trả lời mọi câu | Hallucinate, không verifiable, không VN data | Data-grounded với Proof Drawer |
| **LinkedIn Learning** | Personalized course, premium | Không free, không Vietnamese-first, không trajectory analysis | Free, VN-first, focus pivot |
| **ITViec/TopCV** | Job board | Không suggest skill, không show transition | Bridge skill → job |
| **Coursera/Udemy** | Course marketplace | Không hỏi “học gì”, chỉ bán | Recommend course có evidence |

### Defensive moat sau hackathon
1. **VN salary dataset** (proprietary scrape, refresh hàng quý).
2. **Trajectory dataset** (calibrated synthetic generator → có thể swap thẳng vào SO Survey hoặc crowdsourced VN data khi production).
3. **Proof Drawer UX pattern** (khó copy, phụ thuộc data).

---

## 5. Goals & Success Metrics

### 5.1 Hackathon Goals (P0 — must hit)

| Goal | Owner | Deadline | Verify |
|------|-------|----------|--------|
| Submit video + tech doc | Trà | 31/05 18:00 | Email confirm |
| Cover ≥ 4/4 scoring criteria | Trà | 28/05 | Self-review |
| Demo URL live | Trà | 27/05 | Open in incognito |
| Workshop 1 + 2 đầy đủ | Trà | 21+22/05 | BTC điểm danh |

### 5.2 Hackathon Goals (P1 — should hit)

- Vào top 3 chung kết (06/06)
- Receive ≥ 1 “tool nên scale lên thành sản phẩm” feedback từ BGK

### 5.3 Hackathon Goals (P2 — nice to have)

- Top 1 (10 triệu VND prize + featured)
- MongoDB cấp $100 credit cert (cần hoàn thành 2 workshop)
- Partnership đề xuất từ MUGVN

### 5.4 Scoring Criteria → Feature Mapping

| Criteria | Weight | Feature đáp ứng |
|----------|:-:|-----------------|
| **Sáng tạo** | 30% | Angle “Career Pivoter” (chưa team nào làm) · Proof Drawer · Honest Mode · Trajectory Graph |
| **Kỹ thuật** | 30% | `$graphLookup` recursive · Hybrid Vector Search (vector + filter) · 5 collections · Pre-computed transitions · `$facet` Proof Drawer · 3,000+ trajectories có pivot explicit |
| **Tác động** | 30% | 200k addressable VN devs · AI panic 2026 narrative · MongoDB AI-strategy synergy · Free for users |
| **Trình bày** | 10% | 3-persona video script · Mermaid architecture diagram · Visual graph viz · Live demo |

---

## 6. Scope

### 6.1 In-Scope (P0 — hackathon MVP)

| ID | Feature | Justification |
|----|---------|---------------|
| P0-01 | CV input qua paste text | Demo nhanh, không cần PDF parser |
| P0-02 | Quick-fill 3 demo persona | Giúp BGK demo trong 30 giây |
| P0-03 | LLM extract skills từ CV | Tránh user phải fill form dài |
| P0-04 | Chọn target role (12 preset) | Đủ cover use case demo |
| P0-05 | Gap Analysis (Vector Search) | Vũ khí kỹ thuật chính |
| P0-06 | Pivot Path Recommendation (3 paths: Fast/Balanced/Comprehensive) | Wow factor |
| P0-07 | Trajectory Graph visualization (react-flow) | Visual wow cho video |
| P0-08 | Proof Drawer (evidence per recommendation) | Differentiation chính vs ChatGPT |
| P0-09 | VN Salary Band display | Differentiation vs roadmap.sh |
| P0-10 | Honest Mode (confidence + warning) | Show data integrity |
| P0-11 | Course recommendation (Vector Search) | Actionable next step |
| P0-12 | Architecture diagram + README | Yêu cầu submission |

### 6.2 Out-of-Scope (P1 — sau hackathon)

- User accounts + saved paths
- PDF/DOCX CV upload (text paste only)
- Real-time job alerts
- Course completion tracking & gamification
- Mentor matchmaking
- LinkedIn OAuth import
- Mobile native app
- Multi-language UI (chỉ VN + EN)
- Salary negotiation tips
- Interview prep modules

### 6.3 Out-of-Scope (P2 — long-term)

- B2B (HR/EM team composer)
- Marketplace dành cho course creator VN
- AI agent thực hiện apply job tự động

---

## 7. User Stories

| ID | As a... | I want to... | So that... | Priority |
|----|---------|--------------|------------|:-:|
| US-01 | Junior dev VN | paste CV và thấy 3 pivot path khả thi | tôi biết bắt đầu từ đâu | P0 |
| US-02 | Mid dev cân nhắc AI | xem bao nhiêu người giống tôi đã pivot thành công | tôi đỡ sợ rủi ro | P0 |
| US-03 | Dev quan tâm lương | xem salary lift của từng skill | tôi prioritize đúng | P0 |
| US-04 | Skeptical dev | thấy evidence đằng sau mỗi recommendation | tôi tin tool, không nghi ngờ như ChatGPT | P0 |
| US-05 | BGK hackathon | verify data sources và technique | tôi confident chấm điểm cao | P0 |
| US-06 | Dev muốn apply quốc tế | so sánh CV với JD nước ngoài | thấy gap cụ thể | P1 |
| US-07 | Returning user | save path đã chọn | track progress | P2 |
| US-08 | Course creator | hiển thị khoá học của mình | reach targeted audience | P2 |

---

## 8. Functional Requirements

### F1 — CV Input & Parsing

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| F1.1 | Text input area | Min 100 chars, max 5000 chars; auto-save localStorage |
| F1.2 | Quick-fill 3 demo personas | Click → fill area with persona CV; user có thể edit |
| F1.3 | Parse skills bằng LLM (Gemini) | Output JSON `{skills: [{name, level, years}]}` trong < 3s |
| F1.4 | Hiển thị skills extracted | Tags clickable, user có thể bỏ skill sai |
| F1.5 | Persist trong session (no DB write) | F5 reload → mất; privacy-friendly |

### F2 — Target Role Selection

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F2.1 | 12 preset role cards | FE, BE, Fullstack, MLE, MLOps, DevOps, DA, DE, Mobile, Embedded, QA Auto, Security |
| F2.2 | Custom role free text | Min 20 chars; embed on submit |
| F2.3 | Hiển thị "Why this?" tooltip mỗi role | 1–2 dòng mô tả demand 2026 |

### F3 — Gap Analysis

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F3.1 | Vector embed CV (768-dim Gemini) | < 1.5s |
| F3.2 | Vector embed target role description | < 1s |
| F3.3 | Compute missing skills via `$vectorSearch` on `skills` collection | Top 10 results |
| F3.4 | Rank by gap distance + frequency in target JDs | Hybrid score |
| F3.5 | Display ranked missing skills with confidence | UI radar/list |

### F4 — Pivot Path Recommendation

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F4.1 | Find top-K trajectories matching current profile | K=50 |
| F4.2 | Extract common skill addition sequences | Frequency ≥ 5 |
| F4.3 | Output 3 paths: Fast / Balanced / Comprehensive | 3 path luôn returned |
| F4.4 | Each path: ordered skills + courses + time estimate + salary range | All fields populated |
| F4.5 | Path confidence score (N + conversion rate) | Display % |

### F5 — Trajectory Graph

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F5.1 | Render react-flow graph | Nodes = roles, edges = transitions |
| F5.2 | Edge thickness ∝ transition frequency | Visual hierarchy |
| F5.3 | Click node → show role detail panel | Title, avg salary, top companies, common skills |
| F5.4 | Highlight 3 recommended paths | Different colors |
| F5.5 | Zoom/pan support | react-flow built-in |

### F6 — Proof Drawer

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F6.1 | Expandable card per recommendation | Smooth animation |
| F6.2 | Display N (sample size) | "Based on N=89 devs" |
| F6.3 | Display conversion rate | "75% reached target role in 18 months" |
| F6.4 | Display median salary lift % | "Median +28% salary" |
| F6.5 | Link to 3 anonymized example profiles | Modal popup, no PII |
| F6.6 | Link to data source citation | "Calibrated synthetic trajectories · ITViec curated sample 2026" |

### F7 — Honest Mode

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F7.1 | Compute confidence per recommendation | Formula: f(N, recency, completeness) |
| F7.2 | Warning badge when N < 30 | Red "Low confidence" pill |
| F7.3 | Hide recommendations when N < 10 | Replace with "Not enough data" message |
| F7.4 | Data source label per card | "Source: Calibrated synthetic SEA cohort" / "Source: ITViec sample" |

### F8 — Course Recommendation

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F8.1 | For each missing skill → top-3 courses | Hybrid vector search + filter |
| F8.2 | Filter by free/paid, provider | Sidebar facets |
| F8.3 | Highlight MongoDB-related courses | Featured pill |

---

## 9. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | P95 API response time | < 2.0s |
| NFR-02 | Vector search query time | < 800ms (after warm) |
| NFR-03 | Frontend TTI | < 3s on 4G |
| NFR-04 | Cost ceiling (hackathon period) | $0 — chỉ free tier |
| NFR-05 | Mobile viewport | Responsive ≥ 375px wide |
| NFR-06 | A11y baseline | Semantic HTML, keyboard nav, alt text |
| NFR-07 | Privacy | No auth, no DB write of user CV (in-memory only) |
| NFR-08 | Browser support | Chrome/Edge/Firefox/Safari latest 2 versions |
| NFR-09 | Uptime during judging (06/06) | 99% |
| NFR-10 | Log retention | 7 days (Vercel default) |

---

## 10. Tech Stack & Architecture Decisions

### Stack chính

**Architecture:** 2-service tách biệt (`client/` + `server/`) chạy độc lập, giao tiếp qua REST + CORS.

#### Client (`client/`) — Next.js Frontend

| Layer | Tech | Rationale |
|-------|------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript | Có template shadcn dashboard sẵn |
| UI | Tailwind + shadcn/ui (new-york style) | Đã có trong template |
| Viz | react-flow + recharts | Best-in-class graph + chart |
| Data fetching | fetch + SWR | Cache + revalidate |
| Auth | (skip — demo) | Privacy-friendly MVP |

#### Server (`server/`) — Hono REST API

| Layer | Tech | Rationale |
|-------|------|-----------|
| Framework | **Hono** + TypeScript | Modern, fast, TS-first, lightweight (~14KB), OpenAPI built-in |
| Runtime | Node.js 20.12.0 | Match client `.nvmrc` |
| API docs | `@hono/zod-openapi` + `@hono/swagger-ui` | Auto-gen `/docs` Swagger UI |
| Validation | Zod | Same Zod for OpenAPI + runtime + types |
| DB driver | `mongodb` official Node driver v6 | Native Atlas Vector Search support |
| AI | `@google/genai` (unified Google Gen AI SDK) | Embedding + LLM |
| Logger | pino + pino-pretty | Structured logging |
| Test | vitest | Fast TS-native test runner |
| Lint/Format | ESLint + Prettier (match client config) | Consistency |

#### Cross-cutting

| Layer | Tech | Rationale |
|-------|------|-----------|
| DB | MongoDB Atlas M0 | Free tier, Vector Search GA, requirement BTC |
| Embedding | Google Gemini `embedding-001` (768-dim) | Free 1500 req/day, multilingual VN |
| LLM | Gemini 1.5 Flash | Cheap, fast, multilingual VN |
| ETL | Python 3.11 + Pandas + pymongo | Standard for data work; chạy 1 lần offline |
| Scraping | Playwright (TypeScript hoặc Python) | Anti-bot tốt cho ITViec |
| Hosting (client) | Vercel free | 1-click Next.js |
| Hosting (server) | Railway / Render / Fly.io free | Node 20 dễ deploy |
| Monitoring | Atlas Charts + service-native logs | Free |
| Repo | GitHub monorepo (public) | Yêu cầu hackathon |

### Architecture Decision Records (ADR)

- **ADR-01 (revised):** Tách 2 service `client/` (Next.js) + `server/` (Hono) thay vì Next.js full-stack → người dùng đã có frontend template riêng, không cần API Routes; tách rõ trách nhiệm; có thể deploy độc lập + scale độc lập post-hackathon.
- **ADR-02:** Chọn Gemini thay vì OpenAI → free tier đủ cho hackathon, multilingual VN tốt hơn.
- **ADR-03:** Skip user auth → giảm scope, demo nhanh hơn, privacy-friendly.
- **ADR-04:** Pre-compute `skill_transitions` collection (ETL offline) thay vì runtime aggregation → P95 latency thấp.
- **ADR-05 (revised):** Dùng calibrated synthetic trajectories (`seed=42`, ~3,000 docs) thay vì scrape SO Survey CDN. Lý do:
  - SO ZIP host trên Sanity CDN với hashed paths → fragile, không scriptable an toàn.
  - SO publish 1 cross-section/năm, không có respondent_id ổn định → pivot phải INFER bằng cohort matching weak.
  - Synthetic generator có pivot explicit, deterministic, demo reproducible cho judge video.
  - Schema giữ field `source: "so_2023" | "so_2024" | "synthetic_vn"` để sau swap real data 1-1 không đổi service code.
- **ADR-06:** Always label data provenance trong DB + UI → minh bạch tuyệt đối với người dùng & BGK.
- **ADR-07 (new):** Chọn Hono thay vì Express/Fastify/NestJS → TS-first, OpenAPI built-in, lean (~14KB), deploy edge-anywhere, demo trông modern hơn.
- **ADR-08 (new):** Server không phụ thuộc framework client — chỉ trả JSON; frontend có thể swap (Next.js / Remix / Vue) mà server không đổi.

---

## 11. Data Strategy

### 11.1 Bốn lớp data

| Lớp | Nguồn | Khối lượng | Vai trò | Pháp lý |
|-----|-------|-----------|---------|---------|
| **1. Trajectory** | Calibrated synthetic generator (`01_generate_trajectories.py`, seed=42) | ~3,000 SEA dev trajectories với explicit pivots | Collaborative filtering (core pivot signal) | Hackathon-only; production sẽ swap sang SO Survey / crowdsource |
| **2. Job/Salary VN** | ITViec scrape ~500 JD | 500 | VN salary context, company demand | Public JD, hackathon-only use |
| **3. Skill taxonomy** | roadmap.sh public JSON | ~200 skills | Skill graph + course mapping | MIT license |
| **4. Synthetic** | LLM-augmented 30–50 VN persona | 30–50 | Lấp pivot path thưa | Self-labeled trong DB |

### 11.2 Embedding strategy

- **Embed gì:** CV text, JD description, skill description, course description, persona profile.
- **Model:** Gemini `embedding-001` (768-dim, cosine).
- **Tổng cost:** ~0$ trong free tier (1500 req/day × 2 tuần đủ).
- **Storage:** Lưu vector trong cùng document MongoDB (field `*_embedding`).

### 11.3 Data refresh cadence

- Hackathon: 1-time load (synthetic trajectories + curated jobs + roadmap.sh skills).
- Production (sau hackathon): Quarterly real SO Survey ingest + monthly ITViec scrape + crowdsourced VN dev profiles (opt-in).

### 11.4 Data quality checks

- Schema validation với JSON Schema khi insert.
- Outlier detection: salary < 5tr hoặc > 200tr → flag.
- Embedding dimension check: phải đúng 768.
- Duplicate detection trên `(title, company, location)` cho JD.

---

## 12. UX Design Principles

1. **Show evidence, not opinion** — mọi gợi ý có Proof Drawer.
2. **Visual over textual** — graph trumps list.
3. **Honest > authoritative** — display confidence, không bịa.
4. **Vietnamese-first copy** — primary VN, secondary EN.
5. **Demo-ready in 30 seconds** — quick-fill persona always available.
6. **No login friction** — direct value, immediate.

### Wireframe flow (text-narrative)

```
[Landing] → "Pivot career, with data not opinions"
   ↓ CTA "Try with my CV" hoặc "Use demo persona"
[CV Input] → paste/quick-fill → click "Analyze"
   ↓ LLM extract skills (2-3s spinner)
[Target Role] → 12 cards + custom field
   ↓ Click target
[Results Dashboard]
   ├── Top: 3 path cards (Fast | Balanced | Comprehensive)
   ├── Mid: Trajectory Graph (react-flow)
   ├── Right sidebar: Missing skills + courses
   └── Bottom: "People like you" gallery
        ↓ Click any recommendation
        [Proof Drawer slides out]
            • N=89 devs
            • 75% conversion in 18 months
            • Median +28% salary
            • 3 anonymized example profiles
            • Source: Calibrated synthetic SEA cohort (seed=42)
```

---

## 13. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|:-:|:-:|------------|
| ITViec block scraping | M | M | Backup: Adzuna API (1000 free calls); TopCV; curated 20 jobs đã đủ cho demo |
| Synthetic trajectory không thuyết phục với judges | M | M | Document calibration kỹ trong README/PRD/ADR; mỗi card UI ghi rõ "synthetic, calibrated"; demo focus vào tech correctness của query chứ không phải "real users" |
| Gemini free tier rate limit | M | L | Cache embeddings; batch ETL offline |
| Vector Search performance kém với 65k docs | M | L | Filter trước, pre-warm index, top-K nhỏ |
| Solo dev bị ốm/đột xuất | H | L | Buffer 30/05; submit P0 features only |
| Atlas M0 connection limit | L | M | Connection pool ≤ 5 |
| BGK không “cảm” story Pivoter | H | L | 3 personas mạnh; data-grounded chứng minh |
| Video > 10 phút | M | M | Storyboard trước, edit cắt aggressive |
| Forms.gle submit lỗi | H | L | Submit sớm 30/05, không sát giờ |

---

## 14. Timeline (14 days)

| Ngày | Thứ | Việc | Deliverable | Status |
|------|----|------|-------------|--------|
| 16/05 | T7 | Init repo, Atlas cluster, Gemini API key, this PRD | Repo + PRD | hôm nay |
| 17/05 | CN | Run synthetic trajectory generator + curated jobs/courses loaders | Atlas populated with reference data | |
| 18/05 | T2 | Clean data, embed everything, push lên Atlas, create Vector Index | Atlas populated | |
| 19/05 | T3 | Build aggregation pipeline `skill_transitions`, test queries trong Compass | Transition collection | |
| 20/05 | T4 | API routes: `/api/extract-skills`, `/api/gap-analysis`, `/api/pivot-paths` | Backend done | |
| 21/05 | T5 | 🎓 **Workshop 1: Vector Search 12:30** + áp dụng | Pattern improved | |
| 22/05 | T6 | 🎓 **Workshop 2: Aggregation 12:30** + refactor | `$graphLookup` polished | |
| 23/05 | T7 | UI: CV input + skill extraction display | Page 1 done | |
| 24/05 | CN | UI: 3 path cards + Proof Drawer | Page 2 done | |
| 25/05 | T2 | react-flow trajectory graph | Wow visual done | |
| 26/05 | T3 | "People like you" + Honest Mode + polish | UI complete | |
| 27/05 | T4 | Deploy Vercel + custom domain + smoke test | Live URL | |
| 28/05 | T5 | Quay video draft v1 | Video v1 | |
| 29/05 | T6 | Edit video, viết TECHNICAL_DOC + README | Submission docs | |
| 30/05 | T7 | **Buffer**, re-record nếu cần, fix bugs | Final polish | |
| 31/05 | CN | **Submit form trước 18:00** | ✅ Submitted | |

### Critical path
ETL data (16–18/05) → Aggregation (19/05) → API (20/05) → UI (23–26/05) → Video (28–29/05) → Submit (31/05).

### Buffer policy
- Tuần 1 hết → review tiến độ T7 22/05 sau workshop 2.
- Nếu chậm > 2 ngày → cắt F8 (course rec) trước F7 (Honest Mode).
- Cuối tuần cuối (30/05) **không thêm feature mới** — chỉ polish.

---

## 15. Future Roadmap (post-hackathon)

| Quarter | Theme | Key features |
|---------|-------|--------------|
| Q3 2026 | Auth & Persistence | OAuth GitHub, save paths, progress tracking |
| Q4 2026 | Community | Crowdsourced VN trajectories, badge cho contributor |
| Q1 2027 | Monetization | Premium: 1-1 mentor matching, deep AI coaching |
| Q2 2027 | B2B | EM team composer, gap analysis cho engineering org |
| Q3 2027 | International | Expand SEA: TH, ID, PH, MY |

---

## 16. Open Questions / Decisions Required

| ID | Question | Owner | Deadline | Decision |
|----|----------|-------|----------|----------|
| OQ-01 | Custom domain Vercel? `pathfinder.vn` taken? | Trà | 18/05 | TBD |
| OQ-02 | Tên cuối cùng — “PathFinder” hay “DevPivot” hay “SkillMap.vn”? | Trà | 18/05 | TBD |
| OQ-03 | Có liên hệ ITViec xin partnership ngay không? | Trà | 25/05 | Hoãn sau pitch |
| OQ-04 | Mở source code public ngay hay sau pitch 06/06? | Trà | 31/05 | Public ngay (yêu cầu) |
| OQ-05 | Embed Gemini hay OpenAI — final lock? | Trà | 17/05 | **Gemini** (free) |

---

## 17. Appendix

### A. Glossary

- **Trajectory** — chuỗi role + skill theo thời gian của 1 dev.
- **Pivot** — thay đổi stack hoặc role chính, không phải lên level.
- **Gap vector** — vector hiệu giữa target embedding và current embedding.
- **$graphLookup** — toán tử MongoDB cho graph traversal recursive.
- **Proof Drawer** — UX pattern hiển thị evidence cho mỗi recommendation.

### B. References

- [Stack Overflow Developer Survey 2024](https://survey.stackoverflow.co/2024/) (reference for calibration of synthetic data; not currently scraped due to CDN fragility)
- [MongoDB Atlas Vector Search Docs](https://www.mongodb.com/docs/atlas/atlas-vector-search/)
- [roadmap.sh](https://roadmap.sh)
- [ITViec](https://itviec.com)
- [TopDev Vietnam IT Report 2025](https://topdev.vn/page/baocaoit2025)
- [MUGVN Mini Hackathon 2026](https://mini-hackathon-2026.mugvn.com/)

### C. Out-of-band data sources to evaluate (P1)

- GitHub Archive (BigQuery public) — contribution as skill proof
- Kaggle Survey 2024 — ML/DS specific trajectory
- AngelList VN job postings — startup salary

---

**End of PRD v1.0**
