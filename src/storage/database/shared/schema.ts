import { pgTable, varchar, timestamp, boolean, jsonb, index, serial } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 系统表 - 禁止删除
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 历史记录表
export const historyRecords = pgTable(
	"history_records",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		title: varchar("title", { length: 500 }).notNull(),
		content: varchar("content", { length: 10000 }).notNull(),
		tags: jsonb("tags").default([]).notNull(),
		image_urls: jsonb("image_urls").default([]),
		selected_image_url: varchar("selected_image_url", { length: 500 }),
		engagement_score: jsonb("engagement_score"),
		is_favorite: boolean("is_favorite").default(false).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("history_records_created_at_idx").on(table.created_at),
		index("history_records_is_favorite_idx").on(table.is_favorite),
	]
);
