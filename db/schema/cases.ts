import {
    pgTable,
    text,
    timestamp,
    uuid,
    integer,
    jsonb
} from "drizzle-orm/pg-core"

export const cases = pgTable("cases", {
    id: uuid("id").defaultRandom().primaryKey(),

    orgId: text("org_id").notNull(),
    userId: text("user_id").notNull(), // Clerk user ID

    caseTitle: text("case_title").notNull(),

    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(),
    fileUrl: text("file_url").notNull(), // Vercel Blob URL

    status: text("status").notNull(),

    // Progress tracking for background jobs
    analysisProgress: integer("analysis_progress").default(0), // 0-100
    currentStep: text("current_step"), // e.g., "Extracting text...", "Running AI analysis..."

    defaultRecommendations: jsonb("default_recommendations"),
    parameterizedRecommendations: jsonb("parameterized_recommendations"),
    errorMessage: text("error_message"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    analyzedAt: timestamp("analyzed_at"),
    parameterizedAnalyzedAt: timestamp("parameterized_analyzed_at")
})
