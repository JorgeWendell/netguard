import {
  bigint,
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  emailVerified: boolean("email_verified").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
});

export const accountsTable = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verificationsTable = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const companiesTable = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    name: varchar("name", { length: 150 }).notNull(),

    cnpj: varchar("cnpj", { length: 18 }),

    contact: varchar("contact", { length: 150 }),

    whatsapp: varchar("whatsapp", { length: 20 }),

    email: varchar("email", { length: 150 }),

    active: boolean("active").default(true).notNull(),

    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    nameIdx: index("companies_name_idx").on(table.name),
    cnpjIdx: index("companies_cnpj_idx").on(table.cnpj),
  }),
);

//
// Locais
//
export const locationsTable = pgTable(
  "locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, {
        onDelete: "cascade",
      }),

    name: varchar("name", { length: 150 }).notNull(),

    contact: varchar("contact", { length: 150 }),

    phone: varchar("phone", { length: 20 }),

    address: varchar("address", { length: 255 }),

    number: varchar("number", { length: 20 }),

    district: varchar("district", { length: 100 }),

    city: varchar("city", { length: 100 }),

    state: varchar("state", { length: 2 }),

    zipCode: varchar("zip_code", { length: 10 }),

    active: boolean("active").default(true).notNull(),

    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    companyIdx: index("locations_company_idx").on(table.companyId),
    nameIdx: index("locations_name_idx").on(table.name),
  }),
);

export const mikrotikDevicesTable = pgTable(
  "mikrotik_devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    locationId: uuid("location_id")
      .notNull()
      .references(() => locationsTable.id, {
        onDelete: "cascade",
      }),

    // Identificação
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),

    // Conexão
    host: varchar("host", { length: 255 }).notNull(),
    apiPort: integer("api_port").default(8728).notNull(),
    apiSsl: boolean("api_ssl").default(false).notNull(),

    username: varchar("username", { length: 100 }).notNull(),
    password: text("password").notNull(),

    // Recursos
    monitoringEnabled: boolean("monitoring_enabled").default(true).notNull(),

    alertsEnabled: boolean("alerts_enabled").default(true).notNull(),

    backupEnabled: boolean("backup_enabled").default(true).notNull(),

    pollInterval: integer("poll_interval").default(60).notNull(), // segundos

    // Status
    online: boolean("online").default(false).notNull(),

    lastSeen: timestamp("last_seen"),

    lastBackup: timestamp("last_backup"),

    active: boolean("active").default(true).notNull(),

    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    locationIdx: index("mikrotik_location_idx").on(table.locationId),
    hostIdx: index("mikrotik_host_idx").on(table.host),
    onlineIdx: index("mikrotik_online_idx").on(table.online),
  }),
);

export const mikrotikSystemInfoTable = pgTable("mikrotik_system_info", {
  deviceId: uuid("device_id")
    .primaryKey()
    .references(() => mikrotikDevicesTable.id, {
      onDelete: "cascade",
    }),

  identity: varchar("identity", { length: 150 }),

  boardName: varchar("board_name", { length: 150 }),

  model: varchar("model", { length: 150 }),

  serialNumber: varchar("serial_number", { length: 150 }),

  routerOsVersion: varchar("routeros_version", { length: 50 }),

  routerOsUpdatePending: boolean("routeros_update_pending")
    .default(false)
    .notNull(),

  routerboardUpdatePending: boolean("routerboard_update_pending")
    .default(false)
    .notNull(),

  updateCheckedAt: timestamp("update_checked_at"),

  architecture: varchar("architecture", { length: 50 }),

  cpu: varchar("cpu", { length: 150 }),

  cpuCount: integer("cpu_count"),

  cpuFrequency: integer("cpu_frequency"),

  totalMemory: bigint("total_memory", { mode: "number" }),

  totalStorage: bigint("total_storage", { mode: "number" }),

  license: varchar("license", { length: 50 }),

  timezone: varchar("timezone", { length: 100 }),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .defaultNow(),
});

export const mikrotikStatusTable = pgTable("mikrotik_status", {
  deviceId: uuid("device_id")
    .primaryKey()
    .references(() => mikrotikDevicesTable.id, {
      onDelete: "cascade",
    }),

  cpuUsage: integer("cpu_usage"),

  memoryUsage: integer("memory_usage"),

  freeMemory: bigint("free_memory", {
    mode: "number",
  }),

  diskUsage: integer("disk_usage"),

  freeDisk: bigint("free_disk", {
    mode: "number",
  }),

  uptime: text("uptime"),

  temperature: integer("temperature"),

  voltage: numeric("voltage", {
    precision: 5,
    scale: 2,
  }),

  ping: integer("ping"),

  online: boolean("online").default(false).notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const mikrotikMetricsTable = pgTable(
  "mikrotik_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    deviceId: uuid("device_id")
      .notNull()
      .references(() => mikrotikDevicesTable.id, {
        onDelete: "cascade",
      }),

    cpuUsage: integer("cpu_usage"),

    memoryUsage: integer("memory_usage"),

    upload: bigint("upload", {
      mode: "number",
    }),

    download: bigint("download", {
      mode: "number",
    }),

    activeUsers: integer("active_users"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    deviceIdx: index("metrics_device_idx").on(table.deviceId),
    createdIdx: index("metrics_created_idx").on(table.createdAt),
  }),
);

export const mikrotikEventTypeEnum = pgEnum("mikrotik_event_type", [
  "online",
  "offline",
]);

export const mikrotikAvailabilityEventsTable = pgTable(
  "mikrotik_availability_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    deviceId: uuid("device_id")
      .notNull()
      .references(() => mikrotikDevicesTable.id, {
        onDelete: "cascade",
      }),

    eventType: mikrotikEventTypeEnum("event_type").notNull(),

    message: text("message"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    deviceIdx: index("availability_events_device_idx").on(table.deviceId),
    createdIdx: index("availability_events_created_idx").on(table.createdAt),
  }),
);

export const mikrotikInterfacesTable = pgTable(
  "mikrotik_interfaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    deviceId: uuid("device_id")
      .notNull()
      .references(() => mikrotikDevicesTable.id, {
        onDelete: "cascade",
      }),

    interfaceId: varchar("interface_id", { length: 50 }).notNull(),

    name: varchar("name", { length: 100 }).notNull(),

    type: varchar("type", { length: 50 }),

    macAddress: varchar("mac_address", { length: 30 }),

    mtu: integer("mtu"),

    actualMtu: integer("actual_mtu"),

    l2Mtu: integer("l2_mtu"),

    speed: varchar("speed", { length: 20 }),

    duplex: varchar("duplex", { length: 20 }),

    running: boolean("running").default(false),

    enabled: boolean("enabled").default(true),

    rxBytes: bigint("rx_bytes", { mode: "number" }),

    txBytes: bigint("tx_bytes", { mode: "number" }),

    rxPackets: bigint("rx_packets", { mode: "number" }),

    txPackets: bigint("tx_packets", { mode: "number" }),

    rxErrors: bigint("rx_errors", { mode: "number" }),

    txErrors: bigint("tx_errors", { mode: "number" }),

    comment: text("comment"),

    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .defaultNow(),
  },
  (table) => ({
    deviceInterfaceIdx: uniqueIndex(
      "mikrotik_interfaces_device_interface_idx",
    ).on(table.deviceId, table.interfaceId),
    deviceIdx: index("mikrotik_interfaces_device_idx").on(table.deviceId),
  }),
);

export const mikrotikServicesTable = pgTable(
  "mikrotik_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    deviceId: uuid("device_id")
      .notNull()
      .references(() => mikrotikDevicesTable.id, {
        onDelete: "cascade",
      }),

    service: varchar("service", { length: 100 }).notNull(),

    description: text("description"),

    status: varchar("status", { length: 30 }),

    enabled: boolean("enabled").default(true),

    running: boolean("running").default(false),

    version: varchar("version", { length: 50 }),

    publicIp: varchar("public_ip", { length: 50 }),

    localIp: varchar("local_ip", { length: 50 }),

    interfaceName: varchar("interface_name", { length: 100 }),

    lastCheck: timestamp("last_check"),

    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .defaultNow(),
  },
  (table) => ({
    deviceServiceIdx: uniqueIndex("mikrotik_services_device_service_idx").on(
      table.deviceId,
      table.service,
    ),
    deviceIdx: index("mikrotik_services_device_idx").on(table.deviceId),
  }),
);

export const mikrotikWanTable = pgTable(
  "mikrotik_wans",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    deviceId: uuid("device_id")
      .notNull()
      .references(() => mikrotikDevicesTable.id, {
        onDelete: "cascade",
      }),

    interface: varchar("interface", { length: 100 }).notNull(),

    provider: varchar("provider", { length: 100 }),

    gateway: varchar("gateway", { length: 50 }),

    localIp: varchar("local_ip", { length: 50 }),

    publicIp: varchar("public_ip", { length: 50 }),

    dns: text("dns"),

    online: boolean("online").default(false),

    latencyMs: integer("latency_ms"),

    packetLoss: integer("packet_loss"),

    lastPingAt: timestamp("last_ping_at"),

    priority: integer("priority"),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    deviceInterfaceIdx: uniqueIndex("mikrotik_wans_device_interface_idx").on(
      table.deviceId,
      table.interface,
    ),
    deviceIdx: index("mikrotik_wans_device_idx").on(table.deviceId),
  }),
);

export const mikrotikConfigSnapshotsTable = pgTable(
  "mikrotik_config_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    deviceId: uuid("device_id")
      .notNull()
      .references(() => mikrotikDevicesTable.id, {
        onDelete: "cascade",
      }),

    config: text("config").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);