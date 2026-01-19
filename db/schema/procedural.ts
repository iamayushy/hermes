import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb
} from "drizzle-orm/pg-core"

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



export const proceduralEvents = pgTable("procedural_events", {
  id: uuid("id").defaultRandom().primaryKey(),

  proceduralOrderId: uuid("procedural_order_id")
    .references(() => proceduralOrders.id)
    .notNull(),

  eventType: text("event_type").notNull(),
  // constrained in code

  decisionValue: text("decision_value"),

  discretionary: boolean("discretionary").notNull(),

  sourceRuleRef: text("source_rule_ref"),

  extraData: jsonb("extra_data"),

  createdAt: timestamp("created_at").defaultNow()
})


export const proceduralTimelines = pgTable("procedural_timelines", {
  id: uuid("id").defaultRandom().primaryKey(),

  proceduralOrderId: uuid("procedural_order_id")
    .references(() => proceduralOrders.id)
    .notNull(),

  phase: text("phase").notNull(),
  party: text("party"),
  days: integer("days").notNull(),

  relativeTo: text("relative_to"),

  createdAt: timestamp("created_at").defaultNow()
})

