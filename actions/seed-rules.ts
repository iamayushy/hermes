"use server"

import { db } from "@/db"
import { institutionRules } from "@/db/schema/schema"
import convention from "@/data/convention.json"
import rules from "@/data/arbitration-rules.json"

const INSTITUTION = "ICSID"
const VERSION = "2022"

const hierarchyLevelMap: Record<string, number> = {
    convention: 1,
    arbitration_rules: 2,
    expedited_arbitration: 3
}

const nonDerogableTags = [
    "rule_hierarchy",
    "tribunal_decision_method",
    "procedural_discretion"
]

const annulmentLinkedTags = [
    "tribunal_decision_method",
    "award_timeline",
    "procedural_discretion",
    "fundamental_procedure_breach"
]

function deriveFlags(
    documentType: string,
    mandatory: boolean,
    parameterTag?: string
) {
    const hierarchyLevel = hierarchyLevelMap[documentType]

    const nonDerogable =
        documentType === "convention" ||
        (mandatory === true && parameterTag && nonDerogableTags.includes(parameterTag))

    const annulmentLinked =
        parameterTag ? annulmentLinkedTags.includes(parameterTag) : false

    return { hierarchyLevel, nonDerogable, annulmentLinked }
}

export async function seedRules(orgId: string) {
    const existing = await db.query.institutionRules.findFirst({
        where: (r, { eq, and }) =>
            and(eq(r.orgId, orgId), eq(r.institution, INSTITUTION))
    })

    if (existing) {
        return { status: "already_initialized" }
    }

    const conventionRows = convention.rules.map(r => {
        const { hierarchyLevel, nonDerogable, annulmentLinked } = deriveFlags(
            "convention",
            r.mandatory,
            r.parameter_tag
        )

        return {
            orgId,
            institution: INSTITUTION,
            version: VERSION,

            documentType: "convention",
            ref: r.ref,
            title: r.title ?? null,
            summary: r.summary ?? null,

            mandatory: r.mandatory,
            nonDerogable,
            annulmentLinked,
            hierarchyLevel,

            parameterTag: r.parameter_tag,
            aiUsage: "classification_only",

            extraData: {
                raw_scope: r.raw_scope,
                source: "ICSID Convention"
            }
        }
    })

    const arbitrationRows = rules.rules.map(r => {
        const { hierarchyLevel, nonDerogable, annulmentLinked } = deriveFlags(
            "arbitration_rules",
            r.mandatory,
            r.parameter_tag
        )

        return {
            orgId,
            institution: INSTITUTION,
            version: VERSION,

            documentType: "arbitration_rules",
            ref: r.ref,
            title: null,
            summary: r.summary ?? null,

            mandatory: r.mandatory,
            nonDerogable,
            annulmentLinked,
            hierarchyLevel,

            parameterTag: r.parameter_tag,
            aiUsage: r.ai_usage ?? "flagging",

            extraData: {
                source: "ICSID Arbitration Rules"
            }
        }
    })

    const rows = [...conventionRows, ...arbitrationRows]

    try {
        if (rows.length > 0) {
            await db.insert(institutionRules).values(rows as any)
        }
        return { status: "initialized", count: rows.length }
    } catch (e) {
        console.error("Seed error:", e)
        return { status: "error", error: String(e) }
    }
}

export async function checkRulesStatus(orgId: string) {
    const existing = await db.query.institutionRules.findFirst({
        where: (r, { eq, and }) =>
            and(eq(r.orgId, orgId), eq(r.institution, INSTITUTION))
    })
    return !!existing
}
