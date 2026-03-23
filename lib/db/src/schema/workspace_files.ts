import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";

export const workspaceFilesTable = pgTable("workspace_files", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  content: text("content").notNull().default(""),
  language: text("language").notNull().default("plaintext"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWorkspaceFileSchema = createInsertSchema(workspaceFilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorkspaceFile = z.infer<typeof insertWorkspaceFileSchema>;
export type WorkspaceFile = typeof workspaceFilesTable.$inferSelect;
