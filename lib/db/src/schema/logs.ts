import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vocalizationLogs = pgTable("vocalization_logs", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  confidence: real("confidence").notNull(),
  context: text("context").notNull().default(""),
  prediction: text("prediction").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertVocalizationLogSchema = createInsertSchema(vocalizationLogs).omit({
  createdAt: true,
});

export type VocalizationLog = typeof vocalizationLogs.$inferSelect;
export type InsertVocalizationLog = z.infer<typeof insertVocalizationLogSchema>;
