import { pgTable, unique, uuid, text, boolean, jsonb, integer, foreignKey, timestamp } from "drizzle-orm/pg-core"



export const institutionRules = pgTable("institution_rules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	institution: text().notNull(),
	version: text().notNull(),
	documentType: text("document_type").notNull(),
	ref: text().notNull(),
	title: text(),
	summary: text(),
	mandatory: boolean().notNull(),
	parameterTag: text("parameter_tag"),
	extraData: jsonb("extra_data"),
	nonDerogable: boolean("non_derogable").default(false).notNull(),
	annulmentLinked: boolean("annulment_linked").default(false).notNull(),
	hierarchyLevel: integer("hierarchy_level").notNull(),
	aiUsage: text("ai_usage"),
}, (table) => [
	unique("institution_rules_org_id_institution_version_ref_unique").on(table.orgId, table.institution, table.version, table.ref),
]);

export const proceduralEvents = pgTable("procedural_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	proceduralOrderId: uuid("procedural_order_id").notNull(),
	eventType: text("event_type").notNull(),
	decisionValue: text("decision_value"),
	discretionary: boolean().notNull(),
	sourceRuleRef: text("source_rule_ref"),
	extraData: jsonb("extra_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.proceduralOrderId],
		foreignColumns: [proceduralOrders.id],
		name: "procedural_events_procedural_order_id_procedural_orders_id_fk"
	}),
]);

export const proceduralTimelines = pgTable("procedural_timelines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	proceduralOrderId: uuid("procedural_order_id").notNull(),
	phase: text().notNull(),
	party: text(),
	days: integer().notNull(),
	relativeTo: text("relative_to"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.proceduralOrderId],
		foreignColumns: [proceduralOrders.id],
		name: "procedural_timelines_procedural_order_id_procedural_orders_id_f"
	}),
]);

export const proceduralOrders = pgTable("procedural_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	institution: text().notNull(),
	administeringInstitution: text("administering_institution"),
	caseType: text("case_type"),
	proceduralOrderNumber: text("procedural_order_number").notNull(),
	rulesContext: text("rules_context").array(),
	orderDate: timestamp("order_date", { mode: 'string' }),
	sourcePdfPath: text("source_pdf_path"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	extractedJson: jsonb("extracted_json").notNull(),
	proceduralOrderIndex: integer("procedural_order_index"),
});
