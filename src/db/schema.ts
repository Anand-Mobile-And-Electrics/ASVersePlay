import {
  boolean,
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userStatusEnum = pgEnum("user_status", ["active", "blocked", "pending"]);
export const mediaTypeEnum = pgEnum("media_type", [
  "thumbnail",
  "poster",
  "banner",
  "logo",
  "avatar",
  "video",
  "trailer",
  "subtitle",
  "image",
  "icon",
]);
export const mediaProviderEnum = pgEnum("media_provider", ["local", "external"]);
export const contentTypeEnum = pgEnum("content_type", [
  "movie",
  "web_series",
  "tv_show",
  "season",
  "episode",
  "anime",
  "live_tv",
  "live_sports",
  "concert",
  "news",
  "education",
  "music_video",
  "kids",
  "documentary",
  "trailer",
  "custom",
]);
export const visibilityEnum = pgEnum("visibility", ["public", "private", "unlisted", "scheduled"]);
export const sourceKindEnum = pgEnum("source_kind", ["video", "embed", "hls", "dash", "rtmp", "rtsp", "iptv"]);
export const liveStatusEnum = pgEnum("live_status", ["upcoming", "live", "ended", "cancelled"]);
export const adPlacementEnum = pgEnum("ad_placement", [
  "header",
  "sidebar",
  "footer",
  "banner",
  "pre_roll",
  "mid_roll",
  "post_roll",
]);

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 120 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    username: varchar("username", { length: 60 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    avatarMediaId: uuid("avatar_media_id"),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    status: userStatusEnum("status").notNull().default("active"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [check("username_format", sql`${t.username} ~ '^[a-zA-Z0-9_\.\-]{3,60}$'`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 64 }),
    csrfToken: varchar("csrf_token", { length: 128 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [unique("sessions_token_hash_unique").on(t.tokenHash)],
);

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  mediaType: mediaTypeEnum("media_type").notNull(),
  provider: mediaProviderEnum("provider").notNull(),
  localPath: text("local_path"),
  externalUrl: text("external_url"),
  mimeType: varchar("mime_type", { length: 150 }),
  sizeBytes: integer("size_bytes"),
  width: integer("width"),
  height: integer("height"),
  durationSeconds: integer("duration_seconds"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contents = pgTable("contents", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentType: contentTypeEnum("content_type").notNull(),
  parentContentId: uuid("parent_content_id"),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  title: varchar("title", { length: 220 }).notNull(),
  shortDescription: varchar("short_description", { length: 500 }),
  description: text("description"),
  language: varchar("language", { length: 80 }),
  country: varchar("country", { length: 80 }),
  releaseYear: integer("release_year"),
  durationSeconds: integer("duration_seconds"),
  cast: text("cast").array(),
  directors: text("directors").array(),
  tags: text("tags").array(),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  seoTitle: varchar("seo_title", { length: 220 }),
  seoDescription: varchar("seo_description", { length: 500 }),
  isFeatured: boolean("is_featured").notNull().default(false),
  isTrending: boolean("is_trending").notNull().default(false),
  visibility: visibilityEnum("visibility").notNull().default("public"),
  publishAt: timestamp("publish_at", { withTimezone: true }),
  thumbnailMediaId: uuid("thumbnail_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  posterMediaId: uuid("poster_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  bannerMediaId: uuid("banner_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  trailerMediaId: uuid("trailer_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  embedFallbackUrl: text("embed_fallback_url"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contentCategories = pgTable(
  "content_categories",
  {
    contentId: uuid("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.contentId, t.categoryId] })],
);

export const contentSources = pgTable(
  "content_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 60 }).notNull(),
    sourceKind: sourceKindEnum("source_kind").notNull().default("video"),
    sourceUrl: text("source_url").notNull(),
    sortOrder: integer("sort_order").notNull().default(1),
    isPrimary: boolean("is_primary").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("content_source_position_unique").on(t.contentId, t.sortOrder)],
);

export const liveEvents = pgTable("live_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  title: varchar("title", { length: 220 }).notNull(),
  sportOrCategory: varchar("sport_or_category", { length: 120 }).notNull(),
  participants: text("participants").array(),
  tournament: varchar("tournament", { length: 180 }),
  venue: varchar("venue", { length: 220 }),
  description: text("description"),
  embedFallbackUrl: text("embed_fallback_url"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  status: liveStatusEnum("status").notNull().default("upcoming"),
  isFeatured: boolean("is_featured").notNull().default(false),
  replayContentId: uuid("replay_content_id").references(() => contents.id, { onDelete: "set null" }),
  highlightContentId: uuid("highlight_content_id").references(() => contents.id, { onDelete: "set null" }),
  thumbnailMediaId: uuid("thumbnail_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const liveEventStreams = pgTable(
  "live_event_streams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    liveEventId: uuid("live_event_id")
      .notNull()
      .references(() => liveEvents.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 60 }).notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceKind: sourceKindEnum("source_kind").notNull().default("hls"),
    sortOrder: integer("sort_order").notNull().default(1),
    isPrimary: boolean("is_primary").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("live_event_stream_position_unique").on(t.liveEventId, t.sortOrder)],
);

export const liveChannels = pgTable("live_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 120 }).notNull(),
  logoMediaId: uuid("logo_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const liveChannelStreams = pgTable(
  "live_channel_streams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    liveChannelId: uuid("live_channel_id")
      .notNull()
      .references(() => liveChannels.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 60 }).notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceKind: sourceKindEnum("source_kind").notNull().default("iptv"),
    sortOrder: integer("sort_order").notNull().default(1),
    isPrimary: boolean("is_primary").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("live_channel_stream_position_unique").on(t.liveChannelId, t.sortOrder)],
);

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentId: uuid("content_id")
    .notNull()
    .references(() => contents.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  body: text("body").notNull(),
  isEdited: boolean("is_edited").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contentRatings = pgTable(
  "content_ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("content_user_rating_unique").on(t.contentId, t.userId), check("rating_value_range", sql`${t.value} between 1 and 5`)],
);

export const userListTypeEnum = pgEnum("user_list_type", ["favorite", "watch_later"]);

export const userContentLists = pgTable(
  "user_content_lists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    listType: userListTypeEnum("list_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("user_content_list_unique").on(t.userId, t.contentId, t.listType)],
);

export const watchProgress = pgTable(
  "watch_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").references(() => contentSources.id, { onDelete: "set null" }),
    currentSecond: integer("current_second").notNull().default(0),
    durationSecond: integer("duration_second"),
    lastWatchedAt: timestamp("last_watched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("watch_progress_unique").on(t.userId, t.contentId)],
);

export const advertisements = pgTable("advertisements", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  placement: adPlacementEnum("placement").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  mediaId: uuid("media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  targetUrl: text("target_url"),
  scriptHtml: text("script_html"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 140 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }),
  entityId: uuid("entity_id"),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  details: jsonb("details").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
