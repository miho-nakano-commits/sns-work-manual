import { sql } from "drizzle-orm";
import { check, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  pinSalt: text("pin_salt").notNull(),
  pinHash: text("pin_hash").notNull(),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: integer("locked_until"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userProgress = sqliteTable("user_progress", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  currentStep: integer("current_step").notNull().default(1),
  completedSteps: text("completed_steps").notNull().default("[]"),
  positions: text("positions").notNull().default("{}"),
  checks: text("checks").notNull().default("{}"),
  formValues: text("form_values").notNull().default("{}"),
  lastWorkedStep: integer("last_worked_step").notNull().default(1),
  updatedAt: text("updated_at"),
});

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Additive storage: no old account/progress rows are migrated or reinterpreted.
export const userDriveSettings = sqliteTable("user_drive_settings", {
  userId: text("user_id").primaryKey().references(() => users.id),
  folderUrl: text("folder_url"), updatedBy: text("updated_by").references(() => users.id),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const driveSaveProgress = sqliteTable("drive_save_progress", {
  userId: text("user_id").notNull().references(() => users.id), contentId: text("content_id").notNull(),
  saved: integer("saved", {mode:"boolean"}).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [primaryKey({columns:[table.userId, table.contentId]}), check("drive_saved_boolean", sql`${table.saved} IN (0,1)`)]);
