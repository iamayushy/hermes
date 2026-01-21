import { db } from "@/db";
import { institutionRules } from "@/db/schema/schema";
import { proceduralOrders, proceduralEvents, proceduralTimelines } from "@/db/schema/procedural";
import { eq, and, sql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import procedoParameters from "@/data/procedo-parameters.json";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CaseContext {
  text: string;
  orgId: string;
  analysisMode?: "default" | "with_parameters";
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
  const systemPrompt = `You are an expert ICSID procedural advisor. Analyze the case document and provide comprehensive recommendations.

CRITICAL: OUTPUT FORMAT REQUIREMENTS
- You MUST output ONLY valid JSON. No markdown, no explanations, no headers.
- Do NOT include any text before or after the JSON object.
- Do NOT use markdown code blocks.
- Start your response with { and end with }

DOCUMENT VALIDATION:
If the document is not a valid arbitration/legal document (e.g., dummy file, random text, receipt, personal document), respond ONLY with:
{
  "error": "invalid_document",
  "message": "This does not appear to be a valid case document. Please upload an arbitration-related document such as a procedural order, memorial, or submission."
}

FOR VALID DOCUMENTS:
1. Output ONLY valid JSON
2. Base recommendations on the ICSID Convention and Arbitration Rules
3. Reference historical data when available
4. Flag mandatory vs. discretionary steps
5. Identify annulment risks

APPLICABLE RULES (ALL):
${JSON.stringify(rules, null, 2)}

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

EFFICIENCY & COST OPTIMIZATION:
Analyze the case for potential cost and time savings. Suggest optimizations such as:
- Language efficiency (e.g., both parties from same region → use single language instead of bilingual)
- Hearing format (e.g., parties in different continents → virtual hearings to save travel costs)
- Timeline optimization (e.g., simple issues → expedited procedure under Chapter XII)
- Document management (e.g., overlapping requests → consolidate to reduce production costs)
- Procedural efficiency (e.g., clear preliminary issue → bifurcate to avoid unnecessary preparation)

Mark these as SUGGESTIONS with potential impact (high/medium/low).

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
    "efficiency_suggestions": [
      {
        "type": "language_optimization | cost_reduction | time_saving | procedural_efficiency",
        "suggestion": "Brief description of the suggestion",
        "rationale": "Why this could save time/cost/effort",
        "potential_impact": "high | medium | low",
        "estimated_savings": "Optional: time or cost estimate"
      }
    ],
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

// Build prompt WITH Procedo parameters for compliance scoring
export function buildParameterizedPrompt(
  caseText: string,
  rules: any[],
  precedents: Record<string, any[]>,
  timelines: Record<string, any>
) {
  const systemPrompt = `You are an expert ICSID procedural advisor with access to Procedo's institutional parameters. Analyze the case document against these specific compliance requirements.

CRITICAL: OUTPUT FORMAT REQUIREMENTS
- You MUST output ONLY valid JSON. No markdown, no explanations, no headers.
- Do NOT include any text before or after the JSON object.
- Do NOT use markdown code blocks.
- Start your response with { and end with }

DOCUMENT VALIDATION:
If the document is not a valid arbitration/legal document, respond ONLY with:
{
  "error": "invalid_document",
  "message": "This does not appear to be a valid case document. Please upload an arbitration-related document."
}

PROCEDO ANALYSIS FRAMEWORK:
You must analyze using TWO distinct categories of provisions:

=== MANDATORY PROVISIONS (Compliance Check Only) ===
For these provisions, Procedo can ONLY monitor, flag, and verify compliance. Cannot suggest alternatives.
${JSON.stringify(procedoParameters.mandatory_provisions, null, 2)}

=== OPTIMIZABLE PROVISIONS (AI Can Suggest Improvements) ===
For these provisions, Procedo can actively suggest optimizations and improvements.
${JSON.stringify(procedoParameters.optimizable_provisions, null, 2)}

APPLICABLE INSTITUTIONAL RULES (ALL):
${JSON.stringify(rules, null, 2)}

HISTORICAL PRECEDENTS:
${JSON.stringify(
    Object.entries(precedents)
      .slice(0, 10)
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

COMPLIANCE SCORING:
Score the document using these levels:
${JSON.stringify(procedoParameters.compliance_scoring, null, 2)}

OUTPUT SCHEMA (Parameterized Analysis):
{
  "case_summary": "Brief 2-3 sentence summary",
  "document_type": "PO No. 1 | Award | Memorial | Submission | Other",
  "compliance_score": {
    "overall": "fully_compliant | partially_compliant | non_compliant",
    "score_percentage": 85,
    "summary": "Brief explanation of overall compliance"
  },
  "mandatory_compliance": [
    {
      "provision_ref": "Arbitration Rule X",
      "provision_name": "Name",
      "status": "compliant | non_compliant | not_applicable",
      "finding": "What was found in the document",
      "action_required": "If non-compliant, what needs to be done",
      "annulment_risk": true | false
    }
  ],
  "optimization_opportunities": [
    {
      "provision_ref": "Arbitration Rule X",
      "provision_name": "Name",
      "current_approach": "What the document currently does",
      "suggested_optimization": "What could be improved",
      "potential_impact": "high | medium | low",
      "estimated_savings": "Time or cost savings",
      "ai_role": "optimization | historical_analysis | timeline_optimization"
    }
  ],
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
          "name": "Phase name",
          "suggested_days": 60,
          "reasoning": "Based on historical avg",
          "benchmark": "Avg in similar cases"
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
    "hearing_format": {
      "recommendation": "in-person | virtual | hybrid",
      "reasoning": "Consider party locations, urgency",
      "rule_ref": "Arbitration Rule 32"
    }
  },
  "efficiency_suggestions": [
    {
      "type": "language_optimization | cost_reduction | time_saving | procedural_efficiency",
      "suggestion": "Brief description",
      "rationale": "Why this saves time/cost",
      "potential_impact": "high | medium | low",
      "estimated_savings": "Time or cost estimate"
    }
  ],
  "critical_flags": [
    {
      "issue": "Description of critical issue",
      "severity": "high | medium | low",
      "rule_ref": "Reference",
      "annulment_risk": true | false,
      "immediate_action": "What must be done"
    }
  ]
}`;

  return {
    system: systemPrompt,
    userMessage: `CASE DOCUMENT:\n\n${caseText.slice(0, 50000)}`,
  };
}

export async function generateRecommendations(caseContext: CaseContext) {
  const { text, orgId, analysisMode = "default" } = caseContext;

  // 1. Query database
  const rules = await matchRules(orgId);
  const precedents = await findPrecedents(orgId);
  const timelines = await findTimelineBenchmarks(orgId);

  // 2. Build prompt based on analysis mode
  const { system, userMessage } = analysisMode === "with_parameters"
    ? buildParameterizedPrompt(text, rules, precedents, timelines)
    : buildRecommendationPrompt(text, rules, precedents, timelines);

  // 3. Call Claude with streaming
  const stream = anthropic.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 8000,
    system: system,
    messages: [{ role: "user", content: userMessage }],
  });

  return stream;
}
