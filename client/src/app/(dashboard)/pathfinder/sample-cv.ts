/**
 * Three persona CVs used for the "Quick-fill demo" buttons on the analyze
 * form. PRD §16 (Demo Storyboard) calls out three Vietnamese pivoters; each
 * persona has a target role that maximises the contrast between the cards
 * surfaced on the dashboard.
 *
 *   1. Khang — Senior Backend → AI Engineer       (canonical demo flow)
 *   2. Linh — Frontend → Full-stack Engineer       (lateral pivot, market signal)
 *   3. Tuấn — Data Analyst → ML / Data Engineer   (career step-up, big lift)
 */

export interface DemoPersona {
  id: "khang" | "linh" | "tuan";
  /** Display name shown on the quick-fill button. */
  name: string;
  /** Pivot tagline, e.g. "Backend → AI Engineer". */
  pivot: string;
  /** Preferred preset target role to pre-fill in the dropdown. */
  target_role: string;
  cv_text: string;
}

const KHANG_CV = `Nguyen Minh Khang
Senior Backend Engineer · Ho Chi Minh City, Vietnam

SUMMARY
6 years building distributed services for VN fintech & e-commerce. Strong in Node.js, TypeScript, MongoDB and AWS. Tech lead of a 5-person backend squad for the past 18 months. Recently shipped a recommendation microservice handling 8M req/day with p95 < 90ms.

EXPERIENCE
Tech Lead, Backend  ·  Tiki Corp  ·  2023 — Present
  - Owned the order-orchestration service (Node.js, TypeScript, Express, MongoDB, Kafka).
  - Reduced p95 latency from 240ms to 80ms via aggregation pipeline tuning and Redis caching.
  - Designed event-driven outbox pattern with Debezium → Kafka → consumer side-effects.
  - Mentored 4 mid-level engineers; introduced trunk-based development.

Senior Backend Engineer  ·  Haravan  ·  2021 — 2023
  - Built the SaaS POS sync layer (Node.js, MongoDB Atlas, Redis, RabbitMQ).
  - Migrated 12 services from monolith to microservices on AWS EKS.
  - Wrote OpenAPI spec + Postman collection; cut onboarding time for partners by 40%.

Backend Engineer  ·  FPT Software (outsourcing to UK fintech)  ·  2019 — 2021
  - Java Spring Boot services + PostgreSQL for a UK savings platform.
  - Implemented 3DS authentication + payments flow.

SKILLS
Languages: TypeScript (expert), JavaScript, Python (intermediate), Java
Frameworks: Node.js, Express.js, NestJS, Spring Boot, FastAPI
Databases: MongoDB, MongoDB Atlas, PostgreSQL, Redis, Kafka
Cloud / Infra: AWS (EKS, S3, Lambda, RDS), Docker, Kubernetes, Terraform (basic), GitHub Actions
Practices: REST APIs, gRPC, OpenAPI, Trunk-based dev, Observability (OpenTelemetry, Prometheus, Grafana)

EDUCATION
B.S. Computer Science, Bach Khoa University (HCMUT), 2015 — 2019

INTERESTS
Increasingly curious about LLM application engineering — read Anthropic's RAG cookbook last weekend, prototyped a small LangChain summariser at work for our customer-support pipeline.`;

const LINH_CV = `Tran Phuong Linh
Senior Frontend Engineer · Hanoi, Vietnam

SUMMARY
4.5 years shipping React + Next.js storefronts for ecom and SaaS startups. Owned the design-system rollout at a Series-B fintech (40+ components, Storybook, a11y compliance). Comfortable wearing the "frontend-leaning fullstack" hat — built a billing dashboard backend in NestJS last quarter.

EXPERIENCE
Senior Frontend Engineer  ·  Sky Mavis  ·  2023 — Present
  - Owned the marketplace storefront migration from CRA to Next.js 14 (App Router, RSC).
  - Improved LCP from 4.2s → 1.6s through edge-caching, image optimization and route-level streaming.
  - Built the in-house design system (40 components, Radix + Tailwind, Storybook, MDX docs).
  - Set up Playwright + visual regression in CI; reduced UI regressions by 70%.

Frontend Engineer  ·  Finhay  ·  2021 — 2023
  - Built the investor dashboard with React Query, Recharts and Zustand.
  - Implemented OAuth flow + biometric auth bridge for the mobile webview.
  - Wrote the i18n layer (vi/en) and accessibility audit fixes (WCAG 2.1 AA).

Junior Frontend Developer  ·  Got It Vietnam  ·  2020 — 2021
  - React + TypeScript marketing site; integrated HubSpot, Mixpanel and Segment.

SKILLS
Languages: TypeScript (expert), JavaScript, HTML, CSS, SQL (basic)
Frontend: React, Next.js, Tailwind CSS, Radix UI, Zustand, React Query, Storybook
Backend (basic): Node.js, NestJS, Express, REST APIs
Testing: Playwright, Vitest, Jest, React Testing Library, Storybook
Tooling: Vite, Turborepo, GitHub Actions, Docker (basic), Vercel
Design: Figma, design tokens, design systems, accessibility (a11y)

EDUCATION
B.S. Information Technology, Hanoi University of Science and Technology, 2016 — 2020

INTERESTS
Currently doing the "Backend for Frontend Engineers" course on Frontend Masters. Picked up Postgres and started writing my own SQL migrations for a side-project this year. Eager to grow into a proper full-stack role.`;

const TUAN_CV = `Le Anh Tuan
Senior Data Analyst · Da Nang → Ho Chi Minh City, Vietnam

SUMMARY
5 years of data analytics for marketplace and ride-hailing companies. Heavy SQL, Python (pandas) and dbt user. Built three production dashboards used daily by the C-suite. Want to move closer to engineering / modelling rather than reporting — started shipping small data pipelines and ML prototypes last year.

EXPERIENCE
Senior Data Analyst  ·  Grab Vietnam  ·  2023 — Present
  - Owned the merchant-pricing analytics workstream (~30 GB / day Snowflake warehouse).
  - Authored 60+ dbt models powering the merchant operations dashboard (Looker).
  - Designed an A/B testing framework on top of Snowflake + Python; cut decision time from 2 weeks to 4 days.
  - Trained a churn-prediction baseline (scikit-learn, logistic regression) — handed it to the ML team for productionisation.

Data Analyst  ·  Tiki  ·  2021 — 2023
  - SQL + Python ad-hoc analysis for category managers (catalog, pricing, promo, search).
  - Built the daily search-relevance Looker dashboard from Snowflake exports.
  - Wrote ETL DAGs in Airflow to land Google Ads + Facebook Marketing data into Snowflake.

Business Intelligence Analyst  ·  VNG Corp  ·  2020 — 2021
  - PowerBI dashboards on top of SQL Server for the publisher operations team.

SKILLS
Languages: Python (advanced, pandas / numpy / scikit-learn), SQL (expert), R (basic)
Data: Snowflake, BigQuery (basic), Postgres, dbt, Airflow (basic), Spark (basic)
BI: Looker, PowerBI, Metabase, Tableau (basic)
ML (foundational): scikit-learn, statsmodels, XGBoost, A/B testing, feature engineering
Tooling: Git, GitHub Actions, Docker (basic), Linux

EDUCATION
B.A. Economics, Foreign Trade University (FTU), 2015 — 2019
Self-study: Andrew Ng Machine Learning Specialisation (Coursera), DataTalksClub Data Engineering Zoomcamp (in progress).

INTERESTS
Want to move from "describe what happened" to "predict what will happen" — wrapping up the DTC Data Engineering Zoomcamp now, planning Fast.ai next.`;

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "khang",
    name: "Khang",
    pivot: "Backend → AI Engineer",
    target_role: "AI Engineer",
    cv_text: KHANG_CV,
  },
  {
    id: "linh",
    name: "Linh",
    pivot: "Frontend → Full-stack",
    target_role: "Full-stack Engineer",
    cv_text: LINH_CV,
  },
  {
    id: "tuan",
    name: "Tuấn",
    pivot: "Data Analyst → ML Engineer",
    target_role: "Machine Learning Engineer",
    cv_text: TUAN_CV,
  },
];

/** Legacy single-CV export kept for backwards-compat with old imports. */
export const SAMPLE_CV = KHANG_CV;
