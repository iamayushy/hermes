-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "institution_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"institution" text NOT NULL,
	"version" text NOT NULL,
	"document_type" text NOT NULL,
	"ref" text NOT NULL,
	"title" text,
	"summary" text,
	"mandatory" boolean NOT NULL,
	"parameter_tag" text,
	"extra_data" jsonb,
	"non_derogable" boolean DEFAULT false NOT NULL,
	"annulment_linked" boolean DEFAULT false NOT NULL,
	"hierarchy_level" integer NOT NULL,
	"ai_usage" text,
	CONSTRAINT "institution_rules_org_id_institution_version_ref_unique" UNIQUE("org_id","institution","version","ref")
);
--> statement-breakpoint
CREATE TABLE "procedural_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"procedural_order_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"decision_value" text,
	"discretionary" boolean NOT NULL,
	"source_rule_ref" text,
	"extra_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "procedural_timelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"procedural_order_id" uuid NOT NULL,
	"phase" text NOT NULL,
	"party" text,
	"days" integer NOT NULL,
	"relative_to" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "procedural_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"institution" text NOT NULL,
	"administering_institution" text,
	"case_type" text,
	"procedural_order_number" text NOT NULL,
	"rules_context" text[],
	"order_date" timestamp,
	"source_pdf_path" text,
	"created_at" timestamp DEFAULT now(),
	"extracted_json" jsonb NOT NULL,
	"procedural_order_index" integer
);
--> statement-breakpoint
ALTER TABLE "procedural_events" ADD CONSTRAINT "procedural_events_procedural_order_id_procedural_orders_id_fk" FOREIGN KEY ("procedural_order_id") REFERENCES "public"."procedural_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedural_timelines" ADD CONSTRAINT "procedural_timelines_procedural_order_id_procedural_orders_id_f" FOREIGN KEY ("procedural_order_id") REFERENCES "public"."procedural_orders"("id") ON DELETE no action ON UPDATE no action;
*/