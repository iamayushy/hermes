import { relations } from "drizzle-orm/relations";
import { proceduralOrders, proceduralEvents, proceduralTimelines } from "./schema";

export const proceduralEventsRelations = relations(proceduralEvents, ({one}) => ({
	proceduralOrder: one(proceduralOrders, {
		fields: [proceduralEvents.proceduralOrderId],
		references: [proceduralOrders.id]
	}),
}));

export const proceduralOrdersRelations = relations(proceduralOrders, ({many}) => ({
	proceduralEvents: many(proceduralEvents),
	proceduralTimelines: many(proceduralTimelines),
}));

export const proceduralTimelinesRelations = relations(proceduralTimelines, ({one}) => ({
	proceduralOrder: one(proceduralOrders, {
		fields: [proceduralTimelines.proceduralOrderId],
		references: [proceduralOrders.id]
	}),
}));