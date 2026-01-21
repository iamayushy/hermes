import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { cases } from "@/db/schema/cases";
import { eq, and } from "drizzle-orm";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { orgId } = await auth();
        if (!orgId) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const { id } = await params;

        const [caseItem] = await db
            .select({
                id: cases.id,
                status: cases.status,
                analysisProgress: cases.analysisProgress,
                currentStep: cases.currentStep,
                defaultRecommendations: cases.defaultRecommendations,
                parameterizedRecommendations: cases.parameterizedRecommendations,
                errorMessage: cases.errorMessage,
                analyzedAt: cases.analyzedAt,
                parameterizedAnalyzedAt: cases.parameterizedAnalyzedAt,
            })
            .from(cases)
            .where(and(eq(cases.id, id), eq(cases.orgId, orgId)));

        if (!caseItem) {
            return new Response(JSON.stringify({ error: "Case not found" }), { status: 404 });
        }

        return new Response(JSON.stringify(caseItem), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Status check error:", error);
        return new Response(JSON.stringify({ error: "Failed to get status" }), { status: 500 });
    }
}
