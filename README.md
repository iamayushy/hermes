# Procedo: AI-Powered Procedural Intelligence for Arbitration

**Procedo** is an AI-powered procedural intelligence platform designed to bring structure, compliance, and efficiency to international arbitration. It assists arbitrators and institutions by analyzing procedural documents (like Procedural Order No. 1 or Awards) against institutional rules and providing real-time compliance audits and strategic recommendations.

---

## 🚀 Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🎯 Platform Objectives
- **Standardization**: Reduce procedural divergence by benchmarking against institutional best practices.
- **Risk Mitigation**: Identify "annulment traps" and mandatory rule violations early.
- **Efficiency**: Suggest cost-effective and time-saving procedural choices (e.g., bifurcation, virtual hearings).
- **Transparency**: Provide institutions with data-driven insights into arbitrator performance and procedural adherence.

---

## ✨ Product Features

### A. Document Intelligence & Ingestion
- **Automated Extraction**: Using `pdf2json`, the system extracts raw text from uploaded legal documents.
- **Jurisdiction Detection**: AI automatically classifies the document's jurisdiction (ICSID, UNCITRAL, ICC, etc.) to apply the correct regulatory framework.
- **Status Tracking**: Real-time progress updates for users during complex AI analysis phases.

### B. The Analysis Engines (`lib/recommendation-engine.ts`)
The engine uses a tiered processing approach to ensure high-fidelity legal analysis:

#### 1. Pre-Processing & Classification
- **Intelligent Classification**: Before analysis, the `classifyDocument` function uses LLM reasoning to determine the jurisdiction (ICSID, UNCITRAL, etc.) and rationale.
- **Rule Matching & Caching**: The `matchRules` function retrieves relevant institutional rules from the database, utilizing a Time-To-Live (TTL) cache.

#### 2. Dual-Mode Prompt Engineering
The core logic switches between two primary prompt builders:
- **Strategic Focus (`buildRecommendationPrompt`)**: Focuses on "The Tribunal may consider..." style advice.
- **Audit Focus (`buildParameterizedPrompt`)**: Uses the `procedo-parameters.json` framework to act as a "Guardian of the Rules" for strict compliance checks.

#### 3. Structured Output & Streaming
- **JSON Enforcement**: Both engines strictly enforce JSON-only outputs for reliable frontend rendering.
- **Real-time Streaming**: Leveraging Anthropic’s streaming capabilities to show live progress.

---

## 🛠 Technical Architecture

### Tech Stack
- **Framework**: [Next.js 16 (App Router)](https://nextjs.org)
- **AI Engine**: [Anthropic Claude 4.5 Sonnet](https://anthropic.com)
- **Database**: PostgreSQL via [Neon](https://neon.tech)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team)
- **Authentication**: [Clerk](https://clerk.com)
- **File Storage**: [Vercel Blob](https://vercel.com/storage/blob)

### Data Workflow
1. **Upload**: User uploads a PDF via the Dashboard.
2. **Extraction**: Background job extracts text from the PDF.
3. **Classification**: AI determines the Jurisdiction & Rationale.
4. **Analysis**: 
    - Retrieve institutional rules via `matchRules`.
    - Trigger `generateRecommendations` with selected mode.
5. **Storage**: Final reports (JSONB) are stored in the database.
6. **Display**: UI renders structured cards, checklists, and risk flags.

---

## 📊 Data Model Overview

| Entity | Description | Key Fields |
| :--- | :--- | :--- |
| **Cases** | Root record for an analysis request | `status`, `analysis_progress`, `recommendations` |
| **Institution Rules** | Library of regulatory rules | `ref`, `mandatory`, `hierarchy_level` |
| **Procedural Orders** | Extracted data from documents | `po_number`, `order_date`, `extracted_json` |

---

## 🔮 Future Scope
- **Semantic Search**: RAG over historical case law and past procedural orders.
- **Drafting Assistant**: AI-powered drafting of procedural orders.
- **Collaborative Review**: Annotation tools for institutional secretariats.
- **Timeline Benchmarking**: Comparing current case speed against institutional averages.

---

> [!IMPORTANT]
> **Product Note**: Procedo is designed as a **non-binding** assistant. It augments human discretion and does not replace the legal authority of the Tribunal or the Secretariat.
