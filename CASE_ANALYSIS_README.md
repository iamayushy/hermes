# Case Analysis Feature

## Overview
The **Case Analysis** feature is an AI-driven tool designed to assist arbitrators and legal professionals by automatically analyzing legal documents (primarily PDFs) against ICSID rules and procedural parameters. It provides two levels of analysis:

1.  **Default Analysis**: General procedural guidance, timeline suggestions, and identifying key issues.
2.  **Parameterized Analysis**: Deep compliance check against specific mandatory provisions, critical flags for annulment risks, and optimization opportunities.

## Workflow

1.  **Document Upload**:
    *   User uploads a PDF document via the `CaseAnalyzer` component.
    *   File is validated (size < 10MB, type PDF).
    *   File is uploaded to a secure storage (Vercel Blob).

2.  **Processing (Background Job)**:
    *   The backend (`/api/analyze-case`) immediately returns a `caseId` and continues processing in the background using Next.js `after()` API.
    *   **Text Extraction**: PDF text is extracted.
    *   **AI Analysis**: The text is streamed to an LLM (Claude-3.5-Sonnet via Vercel AI SDK) along with system prompts tailored for legal analysis.
    *   **Progress Tracking**: The frontend polls `/api/cases/[id]/status` to show real-time progress steps ("Analyzing...", "Saving results...").

3.  **Result Display**:
    *   Once analysis is complete, results are stored in the database (`cases` table) as JSON.
    *   The frontend renders the results using structured components:
        *   `RecommendationDisplay`: Visualizes the default analysis (Timelines, Bifurcation, etc.).
        *   `ParameterizedDisplay`: Visualizes compliance scores, mandatory flags, and efficiency suggestions.

## Technical Architecture

### Frontend
*   **Components**: `CaseAnalyzer`, `RecommendationDisplay`, `ParameterizedDisplay`.
*   **State Management**: React `useState` and `useEffect` for polling and UI state.
*   **Styling**: Tailwind CSS with Shadcn UI components.

### Backend
*   **API Route**: `app/api/analyze-case/route.ts`.
*   **Database**: Postgres (via Drizzle ORM).
    *   Table: `cases` (stores file metadata, status, and JSON results).
*   **Storage**: Vercel Blob for PDF storage.

## Key Features

*   **Dual-Mode Analysis**: Run "Default" and "Parameterized" analyses concurrently or independently.
*   **Real-time Feedback**: granular progress updates during the AI processing phase.
*   **Resiliency**: Background processing ensures long-running AI tasks don't time out the HTTP request.
*   **Visual Reports**: Complex JSON data is rendered into easy-to-read cards, timelines, and alert badges.
