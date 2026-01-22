import { db } from "@/db";
import { institutionRules } from "@/db/schema/schema";
import { eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import procedoParameters from "@/data/procedo-parameters.json";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const rulesCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

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
    max_tokens: 8000,
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

  const systemPrompt = `You are Procedo, an expert ${isIcsid ? "Senior ICSID Counsel" : "International Arbitration Procedural Advisor"}. Your role is to strictly analyze case documents and provide ACTIONABLE, LOGICALLY REASONED PROCEDURAL RECOMMENDATIONS.

ROLE & MINDSET:
- **Mandatory Rules ("Compliance")**: Be STRICT. If a rule is violated, state it clearly.
- **Discretionary/Strategic Items ("Recommendations")**: Be CONSULTATIVE. Use phrasing like "The Tribunal may consider...", "It could be beneficial to...", "This approach allows...".
- **Logical Reasoning**: Every point must follow: [Observation] -> [Rule/Principle] -> [Strategic Implication] -> [Suggestion].

CRITICAL: OUTPUT FORMAT REQUIREMENTS
- You MUST output ONLY valid JSON. No markdown, no explanations, no headers.
- Do NOT include any text before or after the JSON object.
- Start your response with { and end with }

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

OUTPUT SCHEMA - PROCEDO ANALYSIS REPORT:
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
      "recommendation": "Redfern | IPO | None",
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
    "mandatory_flags": [
      {
        "issue": "Critical compliance issue",
        "severity": "critical | high | medium",
        "rule_ref": "Convention Article / Rule",
        "annulment_risk": true,
        "immediate_action": "Strict corrective action required"
      }
    ]
  }
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

  const systemPrompt = `You are an expert ${isIcsid ? "ICSID Institutional Counsel" : "International Arbitration Auditor"} with access to Procedo's institutional parameters. Your goal is to strictly audit the case document for compliance, optimization, and logical consistency.

CRITICAL: OUTPUT FORMAT REQUIREMENTS
- You MUST output ONLY valid JSON. No markdown, no explanations, no headers.
- Do NOT include any text before or after the JSON object.
- Do NOT use markdown code blocks.
- Start your response with { and end with }

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

OUTPUT SCHEMA (Parameterized Analysis):
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
    "hearing_format": {
      "recommendation": "in-person | virtual | hybrid",
      "reasoning": "Logistics vs Due Process",
      "rule_ref": "Arbitration Rule"
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
}`;

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

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 8000,
    system: system,
    messages: [{ role: "user", content: userMessage }],
  });

  return stream;
}
