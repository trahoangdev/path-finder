# PathFinder - Client

Frontend dashboard cho PathFinder, built với **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS 4** và **shadcn/ui**.

---

## Chức năng chính

- Form nhập CV dạng text
- 3 demo personas để chạy nhanh luồng phân tích
- Chọn target role bằng input tự do hoặc preset
- Hiển thị:
  - profile đã extract
  - gap analysis
  - pivot paths
  - trajectory graph
  - proof drawer
  - similar developers
  - salary band
  - course recommendations
  - timings
- Hỗ trợ giao diện đa ngôn ngữ `vi/en`
- Honest Mode để ẩn/cảnh báo recommendation khi sample size thấp

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 |
| Runtime UI | React 19 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Graph | `@xyflow/react` |
| Charts | `recharts` |
| Icons | `lucide-react` |
| State / form helpers | `zustand`, `react-hook-form`, `zod` |

---

## Chạy local

```bash
cd client
npm install
npm run dev
```

Mặc định app chạy tại:

- `http://localhost:3000`
- màn hình chính của sản phẩm: `http://localhost:3000/pathfinder`

Tạo file `.env.local` nếu backend không ở URL mặc định:

```env
NEXT_PUBLIC_PATHFINDER_API_URL=http://localhost:4000
```

Nếu không khai báo biến này, client tự fallback về `http://localhost:4000`.

---

## Cấu trúc chính

```text
client/
├── src/
│   ├── app/(dashboard)/pathfinder/
│   │   ├── page.tsx
│   │   ├── sample-cv.ts
│   │   └── components/
│   ├── components/
│   ├── contexts/
│   ├── i18n/
│   └── lib/pathfinder/
├── public/
├── package.json
└── next.config.ts
```

Các file nên đọc trước:

- `src/app/(dashboard)/pathfinder/components/pathfinder-analyzer.tsx`
- `src/app/(dashboard)/pathfinder/components/analysis-results.tsx`
- `src/app/(dashboard)/pathfinder/components/trajectory-graph-card.tsx`
- `src/app/(dashboard)/pathfinder/components/honest-mode.tsx`
- `src/lib/pathfinder/api.ts`

---

## Scripts

| Command | Mục đích |
|---|---|
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production |
| `npm start` | Chạy production server |
| `npm run lint` | Lint |

---

## Ghi chú

Client chỉ giữ state phía browser và gọi REST API từ `server/`; toàn bộ recommendation logic nằm ở backend.
