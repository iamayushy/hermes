import { db } from "@/db";
import { institutionRules } from "@/db/schema/schema";
import { eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages.mjs";
import procedoParameters from "@/data/procedo-parameters.json";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const rulesCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// Tool schema for default/consultative analysis mode
const PROCEDO_ANALYSIS_TOOL = {
  name: "procedo_analysis",
  description: "Provides strategic procedural recommendations and risk analysis for arbitration cases",
  input_schema: {
    type: "object",
    properties: {
      case_summary: {
        type: "string",
        description: "Concise summary focusing on procedural status with jurisdiction context"
      },
      document_type: {
        type: "string",
        enum: ["Procedural Order", "Memorial", "Submission", "Award", "Other"],
        description: "Type of the analyzed document"
      },
      procedo_recommends: {
        type: "object",
        properties: {
          primary_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short actionable title" },
                recommendation: { type: "string", description: "Direct instruction for the tribunal" },
                rationale: { type: "string", description: "Logical chain: Fact + Rule = Necessity" },
                priority: { type: "string", enum: ["critical", "high", "medium"] },
                rule_reference: { type: "string", description: "Specific rule citation" }
              },
              required: ["title", "recommendation", "rationale", "priority", "rule_reference"]
            }
          },
          procedural_checklist: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string", description: "Specific procedural action item" },
                status: { type: "string", enum: ["missing_critical", "required", "recommended"] },
                deadline_guidance: { type: "string", description: "Timeline based on benchmarks" },
                risk_if_ignored: { type: "string", description: "Consequence if missed" }
              },
              required: ["item", "status", "deadline_guidance", "risk_if_ignored"]
            }
          }
        },
        required: ["primary_recommendations", "procedural_checklist"]
      },
      recommendations: {
        type: "object",
        properties: {
          language: {
            type: "object",
            properties: {
              recommendation: { type: "string", enum: ["English", "French", "Spanish", "Bilingual"] },
              reasoning: { type: "string" },
              rule_ref: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"] }
            },
            required: ["recommendation", "reasoning", "rule_ref", "confidence"]
          },
          timeline: {
            type: "object",
            properties: {
              phases: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    suggested_days: { type: "number" },
                    reasoning: { type: "string" },
                    benchmark: { type: "string" }
                  },
                  required: ["name", "suggested_days", "reasoning", "benchmark"]
                }
              },
              rule_ref: { type: "string" }
            },
            required: ["phases", "rule_ref"]
          },
          bifurcation: {
            type: "object",
            properties: {
              recommendation: { type: "string", enum: ["grant", "deny", "defer"] },
              reasoning: { type: "string" },
              historical_context: { type: "string" },
              rule_ref: { type: "string" },
              discretionary: { type: "boolean" }
            },
            required: ["recommendation", "reasoning", "historical_context", "rule_ref", "discretionary"]
          },
          document_production: {
            type: "object",
            properties: {
              recommendation: { type: "string", enum: ["Redfern", "IBA", "None"] },
              reasoning: { type: "string" },
              rule_ref: { type: "string" }
            },
            required: ["recommendation", "reasoning", "rule_ref"]
          },
          hearing_format: {
            type: "object",
            properties: {
              recommendation: { type: "string", enum: ["in-person", "virtual", "hybrid"] },
              reasoning: { type: "string" },
              rule_ref: { type: "string" }
            },
            required: ["recommendation", "reasoning", "rule_ref"]
          },
          evidence_management: {
            type: "object",
            properties: {
              recommendations: { type: "array", items: { type: "string" } },
              rule_ref: { type: "string" }
            },
            required: ["recommendations", "rule_ref"]
          }
        },
        required: ["language", "timeline", "bifurcation", "document_production", "hearing_format", "evidence_management"]
      },
      efficiency_suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["cost_reduction", "time_saving", "procedural_efficiency"] },
            suggestion: { type: "string" },
            rationale: { type: "string" },
            potential_impact: { type: "string", enum: ["high", "medium", "low"] },
            estimated_savings: { type: "string" }
          },
          required: ["type", "suggestion", "rationale", "potential_impact", "estimated_savings"]
        }
      },
      critical_flags: {
        type: "array",
        items: {
          type: "object",
          properties: {
            issue: { type: "string" },
            severity: { type: "string", enum: ["critical", "high", "medium"] },
            rule_ref: { type: "string" },
            annulment_risk: { type: "boolean" },
            immediate_action: { type: "string" }
          },
          required: ["issue", "severity", "rule_ref", "annulment_risk", "immediate_action"]
        }
      }
    },
    required: ["case_summary", "document_type", "procedo_recommends", "recommendations", "efficiency_suggestions", "critical_flags"]
  }
} satisfies Tool;

// Tool schema for compliance audit/parameterized mode
const PROCEDO_COMPLIANCE_AUDIT_TOOL = {
  name: "procedo_compliance_audit",
  description: "Conducts comprehensive compliance audit with scoring and optimization analysis",
  input_schema: {
    type: "object",
    properties: {
      case_summary: {
        type: "string",
        description: "Brief 2-3 sentence summary with jurisdiction context"
      },
      document_type: {
        type: "string",
        enum: ["PO No. 1", "Award", "Memorial", "Submission", "Other"],
        description: "Type of the analyzed document"
      },
      compliance_score: {
        type: "object",
        properties: {
          overall: { type: "string", enum: ["fully_compliant", "partially_compliant", "non_compliant"] },
          score_percentage: { type: "number", minimum: 0, maximum: 100 },
          summary: { type: "string", description: "High-level audit summary" }
        },
        required: ["overall", "score_percentage", "summary"]
      },
      mandatory_compliance: {
        type: "array",
        items: {
          type: "object",
          properties: {
            provision_ref: { type: "string" },
            provision_name: { type: "string" },
            status: { type: "string", enum: ["compliant", "non_compliant", "not_applicable"] },
            finding: { type: "string" },
            action_required: { type: "string" },
            annulment_risk: { type: "boolean" }
          },
          required: ["provision_ref", "provision_name", "status", "finding", "action_required", "annulment_risk"]
        }
      },
      optimization_opportunities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            provision_ref: { type: "string" },
            provision_name: { type: "string" },
            current_approach: { type: "string" },
            suggested_optimization: { type: "string" },
            potential_impact: { type: "string", enum: ["critical", "high", "medium"] },
            estimated_savings: { type: "string" },
            ai_role: { type: "string", enum: ["optimization", "historical_analysis", "timeline_optimization"] }
          },
          required: ["provision_ref", "provision_name", "current_approach", "suggested_optimization", "potential_impact", "estimated_savings", "ai_role"]
        }
      },
      recommendations: {
        type: "object",
        properties: {
          language: {
            type: "object",
            properties: {
              recommendation: { type: "string", enum: ["English", "French", "Spanish", "Bilingual"] },
              reasoning: { type: "string" },
              rule_ref: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"] }
            },
            required: ["recommendation", "reasoning", "rule_ref", "confidence"]
          },
          timeline: {
            type: "object",
            properties: {
              phases: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    suggested_days: { type: "number" },
                    reasoning: { type: "string" },
                    benchmark: { type: "string" }
                  },
                  required: ["name", "suggested_days", "reasoning", "benchmark"]
                }
              },
              rule_ref: { type: "string" }
            },
            required: ["phases", "rule_ref"]
          },
          bifurcation: {
            type: "object",
            properties: {
              recommendation: { type: "string", enum: ["grant", "deny", "defer"] },
              reasoning: { type: "string" },
              historical_context: { type: "string" },
              rule_ref: { type: "string" },
              discretionary: { type: "boolean" }
            },
            required: ["recommendation", "reasoning", "historical_context", "rule_ref", "discretionary"]
          },
          document_production: {
            type: "object",
            properties: {
              recommendation: { type: "string", enum: ["Redfern", "IBA", "None"] },
              reasoning: { type: "string" },
              rule_ref: { type: "string" }
            },
            required: ["recommendation", "reasoning", "rule_ref"]
          },
          hearing_format: {
            type: "object",
            properties: {
              recommendation: { type: "string", enum: ["in-person", "virtual", "hybrid"] },
              reasoning: { type: "string" },
              rule_ref: { type: "string" }
            },
            required: ["recommendation", "reasoning", "rule_ref"]
          },
          evidence_management: {
            type: "object",
            properties: {
              recommendations: { type: "array", items: { type: "string" } },
              rule_ref: { type: "string" }
            },
            required: ["recommendations", "rule_ref"]
          }
        },
        required: ["language", "timeline", "bifurcation", "document_production", "hearing_format", "evidence_management"]
      },
      efficiency_suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["language_optimization", "cost_reduction", "time_saving", "procedural_efficiency"] },
            suggestion: { type: "string" },
            rationale: { type: "string" },
            potential_impact: { type: "string", enum: ["high", "medium", "low"] },
            estimated_savings: { type: "string" }
          },
          required: ["type", "suggestion", "rationale", "potential_impact", "estimated_savings"]
        }
      },
      critical_flags: {
        type: "array",
        items: {
          type: "object",
          properties: {
            issue: { type: "string" },
            severity: { type: "string", enum: ["critical", "high", "medium"] },
            rule_ref: { type: "string" },
            annulment_risk: { type: "boolean" },
            immediate_action: { type: "string" }
          },
          required: ["issue", "severity", "rule_ref", "annulment_risk", "immediate_action"]
        }
      }
    },
    required: ["case_summary", "document_type", "compliance_score", "mandatory_compliance", "optimization_opportunities", "recommendations", "efficiency_suggestions", "critical_flags"]
  }
};

interface CaseContext {
  text: string;
  orgId: string;
  analysisMode?: "default" | "with_parameters";
  jurisdiction?: string;
}


export async function matchRules(orgId: string, useCache = true) {
  if (useCache) {
    const cached = rulesCache.get(orgId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  const rules = await db
    .select()
    .from(institutionRules)
    .where(eq(institutionRules.orgId, orgId))
    .orderBy(institutionRules.hierarchyLevel);


  rulesCache.set(orgId, { data: rules, timestamp: Date.now() });

  return rules;
}





export async function classifyDocument(
  text: string,
  options?: { providedJurisdiction?: string }
): Promise<{ is_icsid: boolean; jurisdiction: string; rationale: string }> {
  if (options?.providedJurisdiction) {
    return {
      is_icsid: options.providedJurisdiction === "ICSID",
      jurisdiction: options.providedJurisdiction,
      rationale: "User-provided jurisdiction"
    };
  }
  const system = `You are an expert legal classifier. Determine the jurisdiction of this arbitration document.
  
  OUTPUT JSON ONLY:
  {
    "is_icsid": boolean, // true if ICSID or Investment Treaty Arbitration
    "jurisdiction": "ICSID" | "UNCITRAL" | "ICC" | "LCIA" | "Other",
    "rationale": "Brief explanation"
  }`;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: system,
    messages: [{ role: "user", content: `DOCUMENT START:\n${text.slice(0, 10000)}\nDOCUMENT END` }]
  });

  const content = msg.content[0].type === 'text' ? msg.content[0].text : "{}";
  try {
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Classification parse error", e);
    return { is_icsid: true, jurisdiction: "ICSID", rationale: "Default to ICSID on error" };
  }
}

export function buildRecommendationPrompt(
  caseText: string,
  rules: any[],
  jurisdiction: string = "ICSID"
) {
  const isIcsid = jurisdiction === "ICSID";

  const systemPrompt = `You are Procedo, an expert ${isIcsid ? "Senior ICSID Counsel" : "International Arbitration Procedural Advisor"}. Your role is to analyze case documents and provide ACTIONABLE, LOGICALLY REASONED PROCEDURAL RECOMMENDATIONS.

ANALYSIS MODE: CONSULTATIVE (Default)
Focus on strategic recommendations and procedural best practices.

ROLE & MINDSET:
- **Mandatory Rules ("Compliance")**: Be STRICT. If a rule is violated, state it clearly.
- **Discretionary/Strategic Items ("Recommendations")**: Be CONSULTATIVE. Use phrasing like "The Tribunal may consider...", "It could be beneficial to...", "This approach allows...".
- **Logical Reasoning**: Every point must follow: [Observation] -> [Rule/Principle] -> [Strategic Implication] -> [Suggestion].

CRITICAL: OUTPUT FORMAT REQUIREMENTS
- You MUST output ONLY valid JSON. No markdown, no explanations, no headers, no preamble.
- Do NOT include any text before or after the JSON object.
- Do NOT wrap the JSON in markdown code blocks (no triple backticks).
- Your ENTIRE response must be ONLY the JSON object.
- Start your response IMMEDIATELY with { and end with }
- If you include ANY text outside the JSON object, the system will fail.

DOCUMENT VALIDATION:
1. If the document is not a valid arbitration/legal document, respond ONLY with:
{
  "error": "invalid_document",
  "message": "This does not appear to be a valid case document. Please upload an arbitration-related document."
}

YOUR CORE MISSION:
1. **Highlight Risks**: Identify procedural traps that could lead to annulment.
2. **Suggest Improvements**: Propose "what could be done better" based on efficiency and best practices.
3. **Ensure Compliance**: Verify strict adherence to ${isIcsid ? "ICSID Convention & Rules" : "International Standards"}.

APPLICABLE RULES (${isIcsid ? "Institutional" : "Reference"}):
${JSON.stringify(
    rules.slice(0, 10).map(r => ({
      id: r.id,
      title: r.title,
      category: r.category || 'General',
      hierarchyLevel: r.hierarchyLevel
    })),
    null,
    2
  )}

OUTPUT SCHEMA (Unified Format):
{
  "case_summary": "Concise summary focusing on procedural status (Jurisdiction: ${jurisdiction})",
  "document_type": "Procedural Order | Memorial | Submission | Award | Other",
  
  "procedo_recommends": {
    "primary_recommendations": [
      {
        "title": "Short actionable title",
        "recommendation": "Direct instruction for the tribunal",
        "rationale": "Logical chain: Fact + Rule = Necessity",
        "priority": "critical | high | medium",
        "rule_reference": "${isIcsid ? "ICSID Rule X" : "UNCITRAL/IBA Rule"}"
      }
    ],
    "procedural_checklist": [
      {
        "item": "Specific procedural action item",
        "status": "missing_critical | required | recommended",
        "deadline_guidance": "Specific timeline based on benchmarks",
        "risk_if_ignored": "What happens if this is missed?"
      }
    ]
  },
  
  "recommendations": {
    "language": {
      "recommendation": "English | French | Spanish | Bilingual",
      "reasoning": "Analyze detailed costs/benefits vs party equality",
      "rule_ref": "Arbitration Rule",
      "confidence": "high | medium | low"
    },
    "timeline": {
      "phases": [
        {
          "name": "Phase name",
          "suggested_days": 60,
          "reasoning": "Account for case complexity (volume of docs, etc)",
          "benchmark": "Compare with avg: X days"
        }
      ],
      "rule_ref": "Arbitration Rule"
    },
    "bifurcation": {
      "recommendation": "grant | deny | defer",
      "reasoning": "Analyze 'efficiency vs due process' trade-off",
      "historical_context": "Statistically supported by X precedents",
      "rule_ref": "Arbitration Rule",
      "discretionary": true
    },
    "document_production": {
      "recommendation": "Redfern | IBA | None",
      "reasoning": "Strictly limit to material/relevant to avoid 'fishing expeditions'",
      "rule_ref": "Arbitration Rule / IBA Rules"
    },
    "hearing_format": {
      "recommendation": "in-person | virtual | hybrid",
      "reasoning": "Carbon footprint vs Due Process (Rule 32)",
      "rule_ref": "Arbitration Rule"
    },
    "evidence_management": {
      "recommendations": ["Strict deadlines", "Format requirements"],
      "rule_ref": "Arbitration Rule / IBA Rules"
    }
  },
  
  "efficiency_suggestions": [
    {
      "type": "cost_reduction | time_saving | procedural_efficiency",
      "suggestion": "Specific, non-obvious suggestion",
      "rationale": "Logical efficiency gain description",
      "potential_impact": "high | medium | low",
      "estimated_savings": "Time or cost estimate"
    }
  ],
  
  "critical_flags": [
    {
      "issue": "Description of critical issue",
      "severity": "critical | high | medium",
      "rule_ref": "Reference",
      "annulment_risk": true | false,
      "immediate_action": "Strict corrective action required"
    }
  ]
}

CRITICAL FLAGS DETECTION (Systematic Detection Framework):
You must systematically scan for the following categories of critical issues:
${JSON.stringify(procedoParameters.critical_flags_categories, null, 2)}

For each category:
1. Apply the detection_criteria to identify if the issue exists in the document
2. Use the severity_default as a baseline (adjust based on actual severity)
3. Reference the examples to understand what types of issues to look for
4. Set annulment_risk based on whether the issue could lead to annulment under applicable rules
}`;

  return {
    system: systemPrompt,
    userMessage: `CASE DOCUMENT:\n\n${caseText.slice(0, 50000)}`,
  };
}

export function buildParameterizedPrompt(
  caseText: string,
  rules: any[],
  jurisdiction: string = "ICSID"
) {
  const isIcsid = jurisdiction === "ICSID";

  const systemPrompt = `You are Procedo, an expert ${isIcsid ? "ICSID Institutional Counsel" : "International Arbitration Auditor"} with access to institutional parameters. Your role is to conduct a comprehensive compliance audit and identify optimization opportunities.

ANALYSIS MODE: COMPLIANCE AUDIT (Parameterized)
Focus on strict rule compliance, scoring, and systematic optimization analysis.

ROLE & MINDSET:
- **Mandatory Provisions**: Act as a 'Guardian of the Rules'. Flag ANY deviation with severity assessment.
- **Optimizable Provisions**: Identify concrete improvements that save time/cost without compromising due process.
- **Systematic Scoring**: Provide quantitative compliance metrics for institutional oversight.
- **Logical Reasoning**: Every finding must follow: [Observation] -> [Rule/Principle] -> [Compliance Status] -> [Action Required].

CRITICAL: OUTPUT FORMAT REQUIREMENTS
- You MUST output ONLY valid JSON. No markdown, no explanations, no headers, no preamble.
- Do NOT include any text before or after the JSON object.
- Do NOT wrap the JSON in markdown code blocks (no triple backticks).
- Your ENTIRE response must be ONLY the JSON object.
- Start your response IMMEDIATELY with { and end with }
- If you include ANY text outside the JSON object, the system will fail.

DOCUMENT VALIDATION:
1. If the document is not a valid arbitration/legal document, respond ONLY with:
{
  "error": "invalid_document",
  "message": "This does not appear to be a valid case document. Please upload an arbitration-related document."
}

PROCEDO ANALYSIS FRAMEWORK (${isIcsid ? "ICSID Strict Audit" : "General Standards Audit"}):
You must analyze using TWO distinct categories of provisions.
${!isIcsid ? "NOTE: As this is a non-ICSID case, apply equivalent International Standards (IBA/UNCITRAL) where strict ICSID rules do not apply." : ""}

=== MANDATORY PROVISIONS (Strict Compliance Check) ===
For these provisions, you must act as a 'Guardian of the Rules'. Flag ANY deviation.
${JSON.stringify(procedoParameters.mandatory_provisions, null, 2)}

=== OPTIMIZABLE PROVISIONS (Strategic Improvements) ===
For these provisions, suggest improvements that save time/cost without compromising due process.
${JSON.stringify(procedoParameters.optimizable_provisions, null, 2)}

APPLICABLE INSTITUTIONAL RULES (ALL):
${JSON.stringify(
    rules.slice(0, 15).map(r => ({
      id: r.id,
      title: r.title,
      category: r.category || 'General',
      hierarchyLevel: r.hierarchyLevel
    })),
    null,
    2
  )}

COMPLIANCE SCORING:
Score the document using these levels:
${JSON.stringify(procedoParameters.compliance_scoring, null, 2)}

OUTPUT SCHEMA (Unified Format - Compliance Mode):
{
  "case_summary": "Brief 2-3 sentence summary (Jurisdiction: ${jurisdiction})",
  "document_type": "PO No. 1 | Award | Memorial | Submission | Other",
  
  "compliance_score": {
    "overall": "fully_compliant | partially_compliant | non_compliant",
    "score_percentage": 85,
    "summary": "High-level audit summary focusing on key risks"
  },
  
  "mandatory_compliance": [
    {
      "provision_ref": "Arbitration Rule X",
      "provision_name": "Name",
      "status": "compliant | non_compliant | not_applicable",
      "finding": "Specific fact from document",
      "action_required": "Exact steps to remedy non-compliance",
      "annulment_risk": true | false
    }
  ],
  
  "optimization_opportunities": [
    {
      "provision_ref": "Arbitration Rule X",
      "provision_name": "Name",
      "current_approach": "Observed approach",
      "suggested_optimization": "Proposed better approach",
      "potential_impact": "critical | high | medium",
      "estimated_savings": "Time/Cost metric",
      "ai_role": "optimization | historical_analysis | timeline_optimization"
    }
  ],
  
  "recommendations": {
    "language": {
      "recommendation": "English | French | Spanish | Bilingual",
      "reasoning": "Analyze detailed costs/benefits vs party equality",
      "rule_ref": "Arbitration Rule",
      "confidence": "high | medium | low"
    },
    "timeline": {
      "phases": [
        {
          "name": "Phase name",
          "suggested_days": 60,
          "reasoning": "Account for case complexity vs benchmarks",
          "benchmark": "Avg: X days"
        }
      ],
      "rule_ref": "Arbitration Rule"
    },
    "bifurcation": {
      "recommendation": "grant | deny | defer",
      "reasoning": "Analyze jurisdiction/merits overlap efficiency",
      "historical_context": "X% grant rate",
      "rule_ref": "Arbitration Rule",
      "discretionary": true
    },
    "document_production": {
      "recommendation": "Redfern | IBA | None",
      "reasoning": "Strictly limit to material/relevant to avoid 'fishing expeditions'",
      "rule_ref": "Arbitration Rule / IBA Rules"
    },
    "hearing_format": {
      "recommendation": "in-person | virtual | hybrid",
      "reasoning": "Logistics vs Due Process",
      "rule_ref": "Arbitration Rule"
    },
    "evidence_management": {
      "recommendations": ["Strict deadlines", "Format requirements"],
      "rule_ref": "Arbitration Rule / IBA Rules"
    }
  },
  
  "efficiency_suggestions": [
    {
      "type": "language_optimization | cost_reduction | time_saving | procedural_efficiency",
      "suggestion": "Specific, non-obvious suggestion",
      "rationale": "Logical efficiency gain description",
      "potential_impact": "high | medium | low",
      "estimated_savings": "Time or cost estimate"
    }
  ],
  
  "critical_flags": [
    {
      "issue": "Description of critical issue",
      "severity": "critical | high | medium",
      "rule_ref": "Reference",
      "annulment_risk": true | false,
      "immediate_action": "Strict corrective action required"
    }
  ]
}

CRITICAL FLAGS DETECTION (Systematic Detection Framework):
You must systematically scan for the following categories of critical issues:
${JSON.stringify(procedoParameters.critical_flags_categories, null, 2)}

For each category:
1. Apply the detection_criteria to identify if the issue exists in the document
2. Use the severity_default as a baseline (adjust based on actual severity)
3. Reference the examples to understand what types of issues to look for
4. Set annulment_risk based on whether the issue could lead to annulment under applicable rules`;

  return {
    system: systemPrompt,
    userMessage: `CASE DOCUMENT:\n\n${caseText.slice(0, 50000)}`,
  };
}

export async function generateRecommendations(caseContext: CaseContext) {
  const { text, orgId, analysisMode = "default", jurisdiction: providedJurisdiction } = caseContext;

  const [classificationResult, rules] = await Promise.all([
    providedJurisdiction
      ? Promise.resolve({
        is_icsid: providedJurisdiction === "ICSID",
        jurisdiction: providedJurisdiction,
        rationale: "Pre-provided jurisdiction"
      })
      : classifyDocument(text),
    matchRules(orgId, true) // Use cache
  ]);

  const jurisdiction = classificationResult.jurisdiction ||
    (classificationResult.is_icsid ? "ICSID" : "General Commercial");

  const { system, userMessage } = analysisMode === "with_parameters"
    ? buildParameterizedPrompt(text, rules, jurisdiction)
    : buildRecommendationPrompt(text, rules, jurisdiction);

  // Select the appropriate tool based on analysis mode
  const tool = analysisMode === "with_parameters"
    ? PROCEDO_COMPLIANCE_AUDIT_TOOL
    : PROCEDO_ANALYSIS_TOOL;

  // Use tool calling for structured output
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8000,
    temperature: 0.3,
    system: system,
    messages: [{ role: "user", content: userMessage }],
    tools: [tool as Tool],
    tool_choice: { type: "tool", name: tool.name }
  });

  // Extract the tool use response
  const toolUse = message.content.find((block) => block.type === "tool_use");

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("No tool use found in response");
  }

  return toolUse.input;
}

