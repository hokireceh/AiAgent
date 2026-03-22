import { pgTable, text, serial, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const modelUsageTable = pgTable("model_usage", {
  id: serial("id").primaryKey(),
  modelId: text("model_id").notNull(),
  date: date("date").notNull(),
  requestCount: integer("request_count").notNull().default(0),
});

export const insertModelUsageSchema = createInsertSchema(modelUsageTable).omit({ id: true });
export type InsertModelUsage = z.infer<typeof insertModelUsageSchema>;
export type ModelUsage = typeof modelUsageTable.$inferSelect;
