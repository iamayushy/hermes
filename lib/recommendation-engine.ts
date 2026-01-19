import { db } from "@/db";
import { institutionRules } from "@/db/schema/schema";
import { proceduralOrders, proceduralEvents, proceduralTimelines } from "@/db/schema/procedural";
import { eq, and, sql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CaseContext {
    text: string;
    orgId: string;
}

export async function matchRules(orgId: string) {
    // Get all rules for the organization, prioritized by hierarchy
    const rules = await db
        .select()
        .from(institutionRules)
        .where(eq(institutionRules.orgId, orgId))
        .orderBy(institutionRules.hierarchyLevel);

    return rules;
}

export async function findPrecedents(orgId: string, eventTypes?: string[]) {
    // Get historical procedural events with their parent orders
    const query = db
        .select({
            event: proceduralEvents,
            order: proceduralOrders,
        })
        .from(proceduralEvents)
        .innerJoin(proceduralOrders, eq(proceduralEvents.proceduralOrderId, proceduralOrders.id))
        .where(eq(proceduralOrders.orgId, orgId))
        .limit(50);

    const precedents = await query;

    // Group by event type for easier analysis
    const grouped: Record<string, any[]> = {};
    for (const p of precedents) {
        const type = p.event.eventType;
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(p);
    }

    return grouped;
}

export async function findTimelineBenchmarks(orgId: string) {
    // Get timeline data from historical orders
    const timelines = await db
        .select()
        .from(proceduralTimelines)
        .innerJoin(proceduralOrders, eq(proceduralTimelines.proceduralOrderId, proceduralOrders.id))
        .where(eq(proceduralOrders.orgId, orgId))
        .limit(100);

    // Calculate averages by phase
    const benchmarks: Record<string, { avg: number; count: number }> = {};
    for (const t of timelines) {
        const phase = t.procedural_timelines.phase;
        if (!benchmarks[phase]) {
            benchmarks[phase] = { avg: 0, count: 0 };
        }
        benchmarks[phase].avg += t.procedural_timelines.days;
        benchmarks[phase].count += 1;
    }

    // Finalize averages
    for (const phase in benchmarks) {
        benchmarks[phase].avg = Math.round(benchmarks[phase].avg / benchmarks[phase].count);
    }

    return benchmarks;
}

export function buildRecommendationPrompt(
    caseText: string,
    rules: any[],
    precedents: Record<string, any[]>,
    timelines: Record<string, any>
) {
    const systemPrompt = `You are an expert ICSID procedural advisor. Analyze the case document and provide comprehensive recommendations across multiple categories.

IMPORTANT INSTRUCTIONS:
1. Output ONLY valid JSON (no markdown, no explanations outside JSON)
2. Base recommendations on the ICSID Convention and Arbitration Rules
3. Reference historical data when available
4. Flag mandatory vs. discretionary steps
5. Identify annulment risks

APPLICABLE RULES:
${JSON.stringify(rules.slice(0, 20), null, 2)}

HISTORICAL PRECEDENTS:
${JSON.stringify(
        Object.entries(precedents)
            .slice(0, 5)
            .map(([type, events]) => ({
                type,
                count: events.length,
                decisions: events.slice(0, 3).map((e) => e.event.decisionValue),
            })),
        null,
        2
    )}

TIMELINE BENCHMARKS:
${JSON.stringify(timelines, null, 2)}

OUTPUT SCHEMA:
{
  "case_summary": "Brief 2-3 sentence summary",
  "recommendations": {
    "language": {
      "recommendation": "English | French | Spanish | Bilingual",
      "reasoning": "Why this language choice",
      "rule_ref": "Arbitration Rule 7",
      "confidence": "high | medium | low"
    },
    "timeline": {
      "phases": [
        {
          "name": "Memorial on Jurisdiction",
          "suggested_days": 60,
          "reasoning": "Based on historical avg",
          "benchmark": "Avg 65 days in similar cases"
        }
      ],
      "rule_ref": "Arbitration Rule 29"
    },
    "bifurcation": {
      "recommendation": "grant | deny | defer",
      "reasoning": "Explain based on jurisdictional issues",
      "historical_context": "X% grant rate",
      "rule_ref": "Arbitration Rule 42",
      "discretionary": true
    },
    "document_production": {
      "recommendation": "Proportional approach",
      "reasoning": "Balance relevance vs. burden",
      "rule_ref": "Arbitration Rule 36"
    },
    "hearing_format": {
      "recommendation": "in-person | virtual | hybrid",
      "reasoning": "Consider party locations, urgency",
      "rule_ref": "Arbitration Rule 32"
    },
    "evidence_management": {
      "recommendations": ["Witness sequestration", "Expert conferencing"],
      "rule_ref": "Arbitration Rule 36"
    },
    "mandatory_flags": [
      {
        "issue": "Missing statement of reasons",
        "severity": "high",
        "rule_ref": "Convention Article 48",
        "annulment_risk": true
      }
    ]
  }
}`;

    return {
        system: systemPrompt,
        userMessage: `CASE DOCUMENT:\n\n${caseText.slice(0, 50000)}`,
    };
}

export async function generateRecommendations(caseContext: CaseContext) {
    const { text, orgId } = caseContext;

    // 1. Query database
    const rules = await matchRules(orgId);
    const precedents = await findPrecedents(orgId);
    const timelines = await findTimelineBenchmarks(orgId);

    // 2. Build prompt
    const { system, userMessage } = buildRecommendationPrompt(text, rules, precedents, timelines);

    // 3. Call Claude with streaming
    const stream = anthropic.messages.stream({
        model: "claude-opus-4-5",
        max_tokens: 6000,
        system: system,
        messages: [{ role: "user", content: userMessage }],
    });

    return stream;
}
