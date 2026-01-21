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
  const systemPrompt = `You are Procedo, an expert ICSID procedural advisor AI. Your role is to analyze case documents and provide ACTIONABLE PROCEDURAL RECOMMENDATIONS that arbitrators and parties can immediately use.

CRITICAL: OUTPUT FORMAT REQUIREMENTS
- You must use the "submit_analysis_report" tool to submit your findings.
- Do not output plain text or markdown. Use the tool.

DOCUMENT VALIDATION:
1. If the document is not a valid arbitration/legal document, respond ONLY with:
{
  "error": "invalid_document",
  "message": "This does not appear to be a valid case document. Please upload an arbitration-related document."
}

2. NON-ICSID WARNING:
If the document is an arbitration document but NOT related to ICSID (International Centre for Settlement of Investment Disputes) or investment treaty arbitration (e.g. UNCITRAL investment cases), respond ONLY with:
{
  "warning": "non_icsid_document",
  "message": "This document appears to be from a non-ICSID proceeding. Procedo compliance checks are calibrated specifically for ICSID rules and may not apply here."
}

YOUR CORE MISSION:
As Procedo, you must provide CLEAR, ACTIONABLE recommendations that help:
1. Arbitrators make procedural decisions efficiently
2. Parties understand procedural requirements
3. Ensure ICSID Convention compliance
4. Optimize time and cost

APPLICABLE RULES:
${JSON.stringify(rules.slice(0, 10), null, 2)}

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
The output structure is defined by the "submit_analysis_report" tool. Use this tool to return your analysis.
`;

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
- You must use the "submit_analysis_report" tool to submit your findings.
- Do not output plain text or markdown. Use the tool.

DOCUMENT VALIDATION:
1. If the document is not a valid arbitration/legal document, respond ONLY with:
{
  "error": "invalid_document",
  "message": "This does not appear to be a valid case document. Please upload an arbitration-related document."
}

2. NON-ICSID WARNING:
If the document is an arbitration document but NOT related to ICSID (International Centre for Settlement of Investment Disputes) or investment treaty arbitration (e.g. UNCITRAL investment cases), respond ONLY with:
{
  "warning": "non_icsid_document",
  "message": "This document appears to be from a non-ICSID proceeding. Procedo compliance checks are calibrated specifically for ICSID rules and may not apply here."
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

OUTPUT SCHEMA:
The output structure is defined by the "submit_analysis_report" tool. Use this tool to return your analysis.
`;

  return {
    system: systemPrompt,
    userMessage: `CASE DOCUMENT:\n\n${caseText.slice(0, 50000)}`,
  };
}

const ANALYSIS_TOOL_SCHEMA: Anthropic.Tool = {
  name: "submit_analysis_report",
  description: "Submit the final procedural analysis report for the case document.",
  input_schema: {
    type: "object",
    properties: {
      case_summary: { type: "string", description: "Brief 2-3 sentence summary of the case" },
      document_type: { type: "string", description: "Procedural Order | Memorial | Submission | Award | Other" },
      warning: { type: "string", enum: ["non_icsid_document"], description: "Warning code if applicable" },
      error: { type: "string", enum: ["invalid_document"], description: "Error code if applicable" },
      message: { type: "string", description: "Error or warning message" },

      procedo_recommends: {
        type: "object",
        properties: {
          primary_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                recommendation: { type: "string" },
                rationale: { type: "string" },
                priority: { type: "string", enum: ["high", "medium", "low"] },
                rule_reference: { type: "string" }
              }
            }
          },
          procedural_checklist: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string" },
                status: { type: "string" },
                deadline_guidance: { type: "string" }
              }
            }
          }
        }
      },

      recommendations: {
        type: "object",
        properties: {
          language: { type: "object", properties: { recommendation: { type: "string" }, reasoning: { type: "string" }, rule_ref: { type: "string" }, confidence: { type: "string" } } },
          timeline: { type: "object", properties: { phases: { type: "array", items: { type: "object", properties: { name: { type: "string" }, suggested_days: { type: "number" }, reasoning: { type: "string" }, benchmark: { type: "string" } } } }, rule_ref: { type: "string" } } },
          bifurcation: { type: "object", properties: { recommendation: { type: "string" }, reasoning: { type: "string" }, historical_context: { type: "string" }, rule_ref: { type: "string" }, discretionary: { type: "boolean" } } },
          hearing_format: { type: "object", properties: { recommendation: { type: "string" }, reasoning: { type: "string" }, rule_ref: { type: "string" } } },
          efficiency_suggestions: {
            type: "array",
            items: { type: "object", properties: { type: { type: "string" }, suggestion: { type: "string" }, rationale: { type: "string" }, potential_impact: { type: "string" }, estimated_savings: { type: "string" } } }
          },
          mandatory_flags: {
            type: "array",
            items: { type: "object", properties: { issue: { type: "string" }, severity: { type: "string" }, rule_ref: { type: "string" }, annulment_risk: { type: "boolean" }, immediate_action: { type: "string" } } }
          }
        }
      },

      // Parameterized specific fields
      compliance_score: {
        type: "object",
        properties: {
          overall: { type: "string" },
          score_percentage: { type: "number" },
          summary: { type: "string" }
        }
      },
      mandatory_compliance: {
        type: "array",
        items: { type: "object", properties: { provision_ref: { type: "string" }, provision_name: { type: "string" }, status: { type: "string" }, finding: { type: "string" }, action_required: { type: "string" }, annulment_risk: { type: "boolean" } } }
      },
      optimization_opportunities: {
        type: "array",
        items: { type: "object", properties: { provision_ref: { type: "string" }, provision_name: { type: "string" }, current_approach: { type: "string" }, suggested_optimization: { type: "string" }, potential_impact: { type: "string" }, estimated_savings: { type: "string" }, ai_role: { type: "string" } } }
      },
      critical_flags: {
        type: "array",
        items: { type: "object", properties: { issue: { type: "string" }, severity: { type: "string" }, rule_ref: { type: "string" }, annulment_risk: { type: "boolean" }, immediate_action: { type: "string" } } }
      }
    },
    required: ["case_summary", "document_type"]
  }
};

export async function generateRecommendations(caseContext: CaseContext) {
  const { text, orgId, analysisMode = "default" } = caseContext;

  // 1. Query database
  const rules = await matchRules(orgId);
  const precedents = await findPrecedents(orgId);
  const timelines = await findTimelineBenchmarks(orgId);

  // 2. Build prompt based on analysis mode
  // Note: We strip the explicit output schema from the prompt text, as the tool definition now handles it.
  const { system, userMessage } = analysisMode === "with_parameters"
    ? buildParameterizedPrompt(text, rules, precedents, timelines)
    : buildRecommendationPrompt(text, rules, precedents, timelines);

  // 3. Call Claude with streaming and tool use
  const stream = anthropic.messages.stream({
    model: "claude-opus-4-5-20251101", // Updated to Sonnet 3.5 which is better at tools
    max_tokens: 12000,
    system: system,
    messages: [{ role: "user", content: userMessage }],
    tools: [ANALYSIS_TOOL_SCHEMA],
    tool_choice: { type: "tool", name: "submit_analysis_report" }
  });

  return stream;
}
