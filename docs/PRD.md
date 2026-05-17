# PathFinder - Product Requirements Document

| | |
|---|---|
| **Version** | 1.1 - implementation-aligned MVP |
| **Author** | Hoàng Trọng Trà |
| **Last updated** | 17/05/2026 |
| **Status** | MVP implemented |
| **Target submission** | MUGVN x MongoDB Mini Hackathon 2026 - 31/05/2026 18:00 VNT |
| **Team size** | 1 |
| **Architecture** | `client/` Next.js frontend + `server/` Hono REST API |
| **Stack** | Next.js 16, React 19, Hono, MongoDB Atlas, OpenAI |

---

## 0. TL;DR

**PathFinder** là AI Career Coach cho developer Việt Nam muốn pivot sang role mới như AI Engineer, ML Engineer, DevOps hay Cloud. Hệ thống không để LLM tự suy đoán recommendation; LLM chỉ trích xuất skill từ CV, còn ranking và evidence được tính từ MongoDB Atlas bằng:

- **Vector Search** cho gap analysis và course recommendation
- **Aggregation Pipeline** cho path discovery, proof drawer, salary band và salary inference

Nguồn dữ liệu hiện tại:

- khoảng `3,000` calibrated synthetic SEA trajectories, seed cố định `42`
- khoảng `20` curated VN job listings
- taxonomy từ `roadmap.sh`
- course catalog curated

Mọi recommendation đều gắn provenance rõ ràng. Không trình bày synthetic cohort như dữ liệu người dùng thật.

---

## 1. Problem

Developer muốn pivot thường thiếu ba câu trả lời:

1. Tôi còn thiếu skill gì?
2. Tôi nên học theo thứ tự nào?
3. Có bằng chứng nào cho thấy hướng này đáng tin?

Các công cụ phổ biến hiện tại giải quyết từng phần riêng lẻ:

| Công cụ | Điểm yếu |
|---|---|
| roadmap.sh | static, không cá nhân hóa |
| ChatGPT / Claude | trả lời nhanh nhưng khó kiểm chứng |
| Job boards | có JD nhưng không chuyển thành lộ trình học |

PathFinder kết hợp CV, graph transition, salary signal và evidence card trong một luồng duy nhất.

---

## 2. Target users

| Persona | Nhu cầu chính |
|---|---|
| Backend / Full-stack dev muốn chuyển sang AI/ML | Biết skill nào unlock role mới |
| Frontend dev muốn mở rộng thành Full-stack | Thấy khoảng cách kỹ năng và market value |
| Data Analyst muốn tiến lên ML / Data Engineering | Có proof rằng pivot khả thi |

Không nhắm tới:

- sinh viên chưa có CV thực tế
- senior rất cao cấp cần mentoring/network hơn là roadmap
- non-technical roles

---

## 3. Product principles

1. **Evidence over opinion** - mọi recommendation phải chỉ ra nguồn.
2. **Honest over authoritative** - sample size thấp phải cảnh báo hoặc ẩn.
3. **Actionable over generic** - trả về next skills, courses, path và salary context.
4. **Fast demo path** - người chấm có thể chạy với persona mẫu trong vài chục giây.
5. **Vietnamese-first** - dữ liệu salary và ngữ cảnh thị trường ưu tiên VN.

---

## 4. MVP hiện tại

| ID | Capability | Trạng thái |
|---|---|---|
| M1 | Paste CV text | Đã có |
| M2 | 3 demo personas | Đã có |
| M3 | Skill extraction bằng LLM | Đã có |
| M4 | Target role preset + free text | Đã có |
| M5 | Gap analysis | Đã có |
| M6 | Pivot paths `fast / balanced / comprehensive` | Đã có |
| M7 | Trajectory graph | Đã có |
| M8 | Proof drawer | Đã có |
| M9 | Similar developers | Đã có |
| M10 | VN salary band | Đã có |
| M11 | Course recommendation | Đã có |
| M12 | Honest Mode | Đã có |

---

## 5. User flow

```text
Paste CV / chọn demo persona
  -> chọn target role
  -> POST /api/analyze
  -> extract profile
  -> gap analysis + pivot paths + proof + similar devs
  -> courses + salary band + salary inference
  -> render dashboard
```

Frontend hiện hiển thị:

1. profile card
2. gap analysis
3. pivot path cards
4. trajectory graph
5. proof drawer
6. similar devs
7. salary band
8. course recommendation
9. timings

---

## 6. Functional requirements

### F1 - CV input

| Requirement | Acceptance hiện tại |
|---|---|
| Nhập CV text | `50..8000` ký tự |
| Demo persona | Khang, Linh, Tuấn |
| Parse skill | OpenAI `gpt-4o-mini`, JSON output |
| Privacy | `/api/analyze` hiện stateless, không persist CV |

### F2 - Target role

| Requirement | Acceptance hiện tại |
|---|---|
| Role preset | 12 lựa chọn trong dropdown |
| Custom target | Có input text tự do |
| Normalization | Server map target về canonical role khi có thể |

### F3 - Gap analysis

| Requirement | Acceptance hiện tại |
|---|---|
| Semantic retrieval | `$vectorSearch` trên `skills` |
| Evidence retrieval | `skill_transitions -> skills` bằng `$lookup` |
| Ranking | evidence-first, semantic fallback |
| Output | top missing skills + transition evidence |

### F4 - Pivot path recommendation

| Requirement | Acceptance hiện tại |
|---|---|
| Graph source | `skill_transitions` precompute từ trajectory |
| Graph shape | `role -> skill -> skill -> role` |
| Traversal | `$graphLookup` là path engine chính |
| Output | tối đa 3 flavor: `fast`, `balanced`, `comprehensive` |
| Fallback | nếu DB cũ chưa rerun ETL, dùng legacy direct-edge synthesis |

### F5 - Evidence and honesty

| Requirement | Acceptance hiện tại |
|---|---|
| Proof drawer | `$facet` trả sample size, conversion, salary stats, examples, sources |
| Honest Mode | `N >= 30` trustworthy, `10..29` warning, `<10` ẩn card |
| Provenance | source badges hiển thị trong UI |

### F6 - Salary and learning actions

| Requirement | Acceptance hiện tại |
|---|---|
| VN salary band | `$facet` trên `jobs` |
| Salary inference | `$unwind + $group` trên `pivots_detected` |
| Course recommendation | `$vectorSearch` trên `courses`, hybrid rank |

---

## 7. Non-functional requirements

| Requirement | Target |
|---|---|
| Full `/api/analyze` | `< 4s` P95 target |
| Vector search | `< 800ms` target |
| Browser UI | Responsive, dashboard usable trên desktop/mobile |
| Privacy | Không auth, không ghi CV trong luồng hiện tại |
| Deployability | Frontend và backend deploy độc lập |
| Observability | request logging + timings trong response |

Các con số latency là target thiết kế, chưa phải benchmark chính thức được commit vào repo.

---

## 8. Data strategy

| Layer | Source | Vai trò |
|---|---|---|
| Trajectory | synthetic calibrated generator | pivot graph + proof |
| Jobs | curated ITViec sample | salary context |
| Skills | roadmap.sh taxonomy | retrieval space |
| Courses | curated catalog | next action |

Quy ước dữ liệu:

- `synthetic_vn` phải được ghi rõ là synthetic
- skill graph được tạo offline từ pivot events
- embedding lưu cùng document trong MongoDB
- vector dimension chuẩn: `768`

---

## 9. Architecture decisions

| ADR | Quyết định |
|---|---|
| ADR-01 | 2 service: `client/` + `server/` |
| ADR-02 | OpenAI `gpt-4o-mini` + `text-embedding-3-small` |
| ADR-03 | 768-dim embeddings để giảm footprint |
| ADR-04 | Precompute `skill_transitions` offline |
| ADR-05 | Synthetic calibrated cohort cho demo deterministic |
| ADR-06 | Bắt buộc provenance trong DB/UI |
| ADR-07 | Hono + Zod OpenAPI cho backend |
| ADR-08 | Role normalization để bridge LLM titles với canonical dataset |
| ADR-09 | `@xyflow/react` cho graph UI |

---

## 10. Success criteria cho submission

| Tiêu chí | Trạng thái |
|---|---|
| Có MVP demo end-to-end | Đạt |
| Có technical doc đầy đủ | Đạt |
| MongoDB là database chính | Đạt |
| Có Vector Search | Đạt |
| Có Aggregation Pipeline rõ ràng | Đạt |
| Có minh bạch nguồn dữ liệu | Đạt |

---

## 11. Out of scope hiện tại

- user accounts
- lưu lịch sử path
- upload PDF/DOCX CV
- job alert
- mentor matching
- progress tracking
- B2B org analytics

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Synthetic data bị hiểu nhầm là real users | Gắn provenance rõ ở docs và UI |
| Similar-dev vector path chưa có dữ liệu snapshot embedding | Aggregation fallback đang hoạt động |
| OpenAI quota khi seed embedding | ETL có deterministic hash fallback, cần re-embed khi quota ổn |
| Chưa có benchmark chính thức | Giữ target rõ, đo sau khi chốt demo environment |

---

## 13. Roadmap sau hackathon

1. Thay synthetic cohort bằng dữ liệu opt-in hoặc nguồn thật phù hợp pháp lý.
2. Thêm auth, saved paths và progress tracking.
3. Cải thiện graph bằng thêm edge chronology và richer cohort filters.
4. Mở rộng salary/job sample ngoài curated seed.
5. Bổ sung benchmark và test coverage chính thức.

---

## 14. References

- `docs/TECHNICAL_DOC.md`
- `server/etl/README.md`
- `server/src/routes/orchestrator.ts`
- `server/src/services/aggregations/pivot-path.ts`
- `server/src/services/vector-search/skills.ts`

---

**End of PRD v1.1**
