/**
 * Task #168 — Hub & Logistics Master
 *
 * Admin CRUD + public read endpoints for warehouse hubs, carriers, and
 * shipping routes. Mounted at /api in routes.ts via registerNetworkRoutes(app).
 *
 *   Public (any authenticated user):
 *     GET  /api/hubs                     — active hubs (for dropdowns)
 *     GET  /api/shipping-routes          — active routes
 *
 *   Admin:
 *     GET    /api/admin/hubs
 *     POST   /api/admin/hubs
 *     PATCH  /api/admin/hubs/:id
 *     DELETE /api/admin/hubs/:id         — soft-deactivate
 *     GET    /api/admin/carriers
 *     POST   /api/admin/carriers
 *     PATCH  /api/admin/carriers/:id
 *     DELETE /api/admin/carriers/:id
 *     GET    /api/admin/shipping-routes
 *     POST   /api/admin/shipping-routes
 *     PATCH  /api/admin/shipping-routes/:id
 *     DELETE /api/admin/shipping-routes/:id
 */
import type { Express, Request, RequestHandler, Response, NextFunction } from "express";
import { z } from "zod";
import { and, asc, desc, eq, sql, inArray } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import {
  warehouseHubs,
  carriers,
  shippingRoutes,
  consignments,
  users,
  auditLogs,
} from "../shared/schema";

// ─── Guards ───────────────────────────────────────────────────────────────
function ensureAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) { res.status(401).json({ message: "Authentication required" }); return; }
  next();
}

// Loads the admin user record onto req.adminUser for audit-log attribution.
// Runs *after* ensureAdminAsync + requirePermission so we know the caller is
// already authenticated as an admin.
const attachAdminUser: RequestHandler = async (req, res, next) => {
  try {
    const sid = req.session?.userId;
    if (!sid) { res.status(401).json({ message: "Authentication required" }); return; }
    const u = await storage.getUser(sid);
    if (!u) { res.status(401).json({ message: "Authentication required" }); return; }
    (req as any).adminUser = u;
    next();
  } catch (err) {
    console.error('[network] attachAdminUser failed:', err);
    res.status(500).json({ message: 'Internal error' });
  }
};

async function writeAudit(actorId: string, action: string, entityType: string, entityId: string, metadata?: Record<string, unknown>) {
  try {
    await db.insert(auditLogs).values({
      actor: actorId,
      actorRole: 'admin',
      actionType: action,
      entityType,
      entityId,
      details: metadata ? JSON.stringify(metadata) : null,
    } as any);
  } catch (err) {
    console.error("[network] audit write failed:", err);
  }
}

// ─── Validation schemas ───────────────────────────────────────────────────
const STATUS_VALUES = ['active', 'inactive', 'under_maintenance'] as const;
const MODE_VALUES = ['sea', 'road', 'rail', 'air'] as const;

const hubCreateSchema = z.object({
  code: z.string().trim().min(2).max(10).regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric'),
  name: z.string().trim().min(2).max(255),
  city: z.string().trim().min(1).max(100),
  country: z.string().trim().min(1).max(100),
  address: z.string().max(2000).nullish(),
  capacityMT: z.number().int().positive().nullish(),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
  commodityTypes: z.array(z.string().min(1).max(50)).default([]),
  contactEmail: z.string().email().max(255).nullish(),
  contactPhone: z.string().max(50).nullish(),
  hubInchargeUserId: z.string().max(255).nullish(),
  status: z.enum(STATUS_VALUES).default('active'),
  photos: z.array(z.string().url().max(2000)).default([]),
  operatorName: z.string().max(255).nullish(),
});
const hubUpdateSchema = hubCreateSchema.partial();

const carrierCreateSchema = z.object({
  name: z.string().trim().min(2).max(255),
  carrierType: z.enum(MODE_VALUES),
  registrationNo: z.string().max(100).nullish(),
  contactName: z.string().max(255).nullish(),
  contactEmail: z.string().email().max(255).nullish(),
  contactPhone: z.string().max(50).nullish(),
  supportedLanes: z.array(z.string().min(1).max(120)).default([]),
  onTimeScore: z.number().min(0).max(100).nullish(),
  status: z.enum(STATUS_VALUES).default('active'),
  notes: z.string().max(2000).nullish(),
});
const carrierUpdateSchema = carrierCreateSchema.partial();

const routeCreateSchema = z.object({
  code: z.string().trim().min(2).max(40).nullish(),
  originHubId: z.string().min(1).max(255),
  destinationName: z.string().trim().min(1).max(255),
  destinationCountry: z.string().trim().min(1).max(100),
  mode: z.enum(MODE_VALUES),
  transitDays: z.number().int().min(0).max(365).nullish(),
  baseFreightRateCents: z.number().int().min(0).nullish(),
  freightCurrency: z.string().length(3).default('USD'),
  freightPerUnit: z.string().max(20).default('MT'),
  customsBroker: z.string().max(255).nullish(),
  carrierId: z.string().max(255).nullish(),
  status: z.enum(STATUS_VALUES).default('active'),
  notes: z.string().max(2000).nullish(),
});
const routeUpdateSchema = routeCreateSchema.partial();

// ─── Serializers ──────────────────────────────────────────────────────────
function publicHub(h: typeof warehouseHubs.$inferSelect) {
  return {
    id: h.id,
    code: h.code,
    name: h.name,
    city: h.city,
    country: h.country,
    capacityMT: h.capacityMT,
    commodityTypes: h.commodityTypes ?? [],
    status: h.status,
  };
}

function publicRoute(r: typeof shippingRoutes.$inferSelect) {
  return {
    id: r.id,
    code: r.code,
    originHubId: r.originHubId,
    destinationName: r.destinationName,
    destinationCountry: r.destinationCountry,
    mode: r.mode,
    transitDays: r.transitDays,
    baseFreightRateCents: r.baseFreightRateCents,
    freightCurrency: r.freightCurrency,
    freightPerUnit: r.freightPerUnit,
    carrierId: r.carrierId,
    status: r.status,
  };
}

// ─── Registration ─────────────────────────────────────────────────────────
export function registerNetworkRoutes(
  app: Express,
  ensureAdminAsync: RequestHandler,
  requirePermission: (...perms: string[]) => RequestHandler,
) {
  // Network admin guard: admin session + manage_network RBAC (Super Admin
  // bypasses). attachAdminUser loads the user record for audit attribution.
  const adminWrite = [ensureAdminAsync, requirePermission('manage_network'), attachAdminUser];
  const adminRead = [ensureAdminAsync, requirePermission('view_network', 'manage_network'), attachAdminUser];

  // ── Public: active hubs / routes for dropdowns ──────────────────────────
  app.get("/api/hubs", ensureAuth, async (_req, res) => {
    try {
      const rows = await db.select().from(warehouseHubs)
        .where(eq(warehouseHubs.status, 'active'))
        .orderBy(asc(warehouseHubs.country), asc(warehouseHubs.name));
      res.json({ hubs: rows.map(publicHub) });
    } catch (err: any) {
      console.error('[network] GET /api/hubs error:', err);
      res.status(500).json({ message: 'Failed to load hubs' });
    }
  });

  app.get("/api/shipping-routes", ensureAuth, async (_req, res) => {
    try {
      const rows = await db.select().from(shippingRoutes)
        .where(eq(shippingRoutes.status, 'active'))
        .orderBy(asc(shippingRoutes.destinationCountry), asc(shippingRoutes.destinationName));
      res.json({ routes: rows.map(publicRoute) });
    } catch (err: any) {
      console.error('[network] GET /api/shipping-routes error:', err);
      res.status(500).json({ message: 'Failed to load shipping routes' });
    }
  });

  // ───────────────────────── HUBS — ADMIN ─────────────────────────
  app.get("/api/admin/hubs", ...adminRead, async (_req, res) => {
    try {
      const rows = await db.select().from(warehouseHubs).orderBy(asc(warehouseHubs.code));

      // Compute utilisation: open consignments + last activity timestamp.
      const openStatuses = ['Submitted', 'Under Review', 'Approved', 'Active'] as const;
      const hubIds = rows.map(h => h.id);

      type Row = typeof rows[number] & { openConsignments: number; inchargeName?: string | null; inchargeEmail?: string | null };
      const enriched: Row[] = rows.map(h => ({ ...h, openConsignments: 0 }));

      if (hubIds.length) {
        const counts = await db
          .select({
            hubId: consignments.targetHubId,
            cnt: sql<number>`count(*)::int`.as('cnt'),
          })
          .from(consignments)
          .where(and(inArray(consignments.targetHubId, hubIds), inArray(consignments.status, openStatuses as any)))
          .groupBy(consignments.targetHubId);
        const byHub = new Map(counts.map(c => [c.hubId, c.cnt]));
        for (const r of enriched) r.openConsignments = byHub.get(r.id) ?? 0;
      }

      const inchargeIds = Array.from(new Set(rows.map(h => h.hubInchargeUserId).filter(Boolean) as string[]));
      if (inchargeIds.length) {
        const ppl = await db.select({
          id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email,
        }).from(users).where(inArray(users.id, inchargeIds));
        const byId = new Map(ppl.map(p => [p.id, p]));
        for (const r of enriched) {
          if (r.hubInchargeUserId) {
            const p = byId.get(r.hubInchargeUserId);
            if (p) {
              r.inchargeName = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.email;
              r.inchargeEmail = p.email;
            }
          }
        }
      }

      res.json({ hubs: enriched });
    } catch (err: any) {
      console.error('[network] GET /api/admin/hubs error:', err);
      res.status(500).json({ message: 'Failed to load hubs' });
    }
  });

  app.post("/api/admin/hubs", ...adminWrite, async (req, res) => {
    try {
      const parsed = hubCreateSchema.parse(req.body ?? {});
      const code = parsed.code.toUpperCase();

      const [dup] = await db.select({ id: warehouseHubs.id }).from(warehouseHubs).where(eq(warehouseHubs.code, code)).limit(1);
      if (dup) { res.status(409).json({ message: `A hub with code ${code} already exists.` }); return; }

      const [row] = await db.insert(warehouseHubs).values({
        code,
        name: parsed.name,
        city: parsed.city,
        country: parsed.country,
        address: parsed.address ?? null,
        capacityMT: parsed.capacityMT ?? null,
        operatorName: parsed.operatorName ?? null,
        latitude: parsed.latitude != null ? String(parsed.latitude) : null,
        longitude: parsed.longitude != null ? String(parsed.longitude) : null,
        commodityTypes: parsed.commodityTypes,
        contactEmail: parsed.contactEmail ?? null,
        contactPhone: parsed.contactPhone ?? null,
        hubInchargeUserId: parsed.hubInchargeUserId ?? null,
        status: parsed.status,
        photos: parsed.photos,
        isActive: parsed.status === 'active',
      } as any).returning();

      await writeAudit((req as any).adminUser.id, 'hub.create', 'warehouse_hub', row.id, { code });
      res.status(201).json({ hub: row });
    } catch (err: any) {
      if (err instanceof z.ZodError) { res.status(400).json({ message: 'Invalid hub data', errors: err.flatten() }); return; }
      console.error('[network] POST /api/admin/hubs error:', err);
      res.status(500).json({ message: 'Failed to create hub' });
    }
  });

  app.patch("/api/admin/hubs/:id", ...adminWrite, async (req, res) => {
    try {
      const parsed = hubUpdateSchema.parse(req.body ?? {});
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (parsed.code !== undefined) updates.code = parsed.code.toUpperCase();
      if (parsed.name !== undefined) updates.name = parsed.name;
      if (parsed.city !== undefined) updates.city = parsed.city;
      if (parsed.country !== undefined) updates.country = parsed.country;
      if (parsed.address !== undefined) updates.address = parsed.address;
      if (parsed.capacityMT !== undefined) updates.capacityMT = parsed.capacityMT;
      if (parsed.operatorName !== undefined) updates.operatorName = parsed.operatorName;
      if (parsed.latitude !== undefined) updates.latitude = parsed.latitude != null ? String(parsed.latitude) : null;
      if (parsed.longitude !== undefined) updates.longitude = parsed.longitude != null ? String(parsed.longitude) : null;
      if (parsed.commodityTypes !== undefined) updates.commodityTypes = parsed.commodityTypes;
      if (parsed.contactEmail !== undefined) updates.contactEmail = parsed.contactEmail;
      if (parsed.contactPhone !== undefined) updates.contactPhone = parsed.contactPhone;
      if (parsed.hubInchargeUserId !== undefined) updates.hubInchargeUserId = parsed.hubInchargeUserId;
      if (parsed.status !== undefined) { updates.status = parsed.status; updates.isActive = parsed.status === 'active'; }
      if (parsed.photos !== undefined) updates.photos = parsed.photos;

      const [row] = await db.update(warehouseHubs).set(updates as any)
        .where(eq(warehouseHubs.id, req.params.id))
        .returning();
      if (!row) { res.status(404).json({ message: 'Hub not found' }); return; }
      await writeAudit((req as any).adminUser.id, 'hub.update', 'warehouse_hub', row.id, { fields: Object.keys(parsed) });
      res.json({ hub: row });
    } catch (err: any) {
      if (err instanceof z.ZodError) { res.status(400).json({ message: 'Invalid hub data', errors: err.flatten() }); return; }
      console.error('[network] PATCH /api/admin/hubs error:', err);
      res.status(500).json({ message: 'Failed to update hub' });
    }
  });

  app.delete("/api/admin/hubs/:id", ...adminWrite, async (req, res) => {
    try {
      const [row] = await db.update(warehouseHubs)
        .set({ status: 'inactive', isActive: false, updatedAt: new Date() } as any)
        .where(eq(warehouseHubs.id, req.params.id))
        .returning();
      if (!row) { res.status(404).json({ message: 'Hub not found' }); return; }
      await writeAudit((req as any).adminUser.id, 'hub.deactivate', 'warehouse_hub', row.id);
      res.json({ hub: row });
    } catch (err: any) {
      console.error('[network] DELETE /api/admin/hubs error:', err);
      res.status(500).json({ message: 'Failed to deactivate hub' });
    }
  });

  // ───────────────────────── CARRIERS — ADMIN ─────────────────────────
  app.get("/api/admin/carriers", ...adminRead, async (_req, res) => {
    try {
      const rows = await db.select().from(carriers).orderBy(asc(carriers.name));
      res.json({ carriers: rows });
    } catch (err) {
      console.error('[network] GET /api/admin/carriers error:', err);
      res.status(500).json({ message: 'Failed to load carriers' });
    }
  });

  app.post("/api/admin/carriers", ...adminWrite, async (req, res) => {
    try {
      const parsed = carrierCreateSchema.parse(req.body ?? {});
      const [row] = await db.insert(carriers).values({
        ...parsed,
        onTimeScore: parsed.onTimeScore != null ? String(parsed.onTimeScore) : null,
        createdBy: (req as any).adminUser.id,
      } as any).returning();
      await writeAudit((req as any).adminUser.id, 'carrier.create', 'carrier', row.id, { name: row.name });
      res.status(201).json({ carrier: row });
    } catch (err: any) {
      if (err instanceof z.ZodError) { res.status(400).json({ message: 'Invalid carrier data', errors: err.flatten() }); return; }
      console.error('[network] POST /api/admin/carriers error:', err);
      res.status(500).json({ message: 'Failed to create carrier' });
    }
  });

  app.patch("/api/admin/carriers/:id", ...adminWrite, async (req, res) => {
    try {
      const parsed = carrierUpdateSchema.parse(req.body ?? {});
      const updates: Record<string, unknown> = { updatedAt: new Date(), ...parsed };
      if (parsed.onTimeScore !== undefined) updates.onTimeScore = parsed.onTimeScore != null ? String(parsed.onTimeScore) : null;
      const [row] = await db.update(carriers).set(updates as any).where(eq(carriers.id, req.params.id)).returning();
      if (!row) { res.status(404).json({ message: 'Carrier not found' }); return; }
      await writeAudit((req as any).adminUser.id, 'carrier.update', 'carrier', row.id, { fields: Object.keys(parsed) });
      res.json({ carrier: row });
    } catch (err: any) {
      if (err instanceof z.ZodError) { res.status(400).json({ message: 'Invalid carrier data', errors: err.flatten() }); return; }
      console.error('[network] PATCH /api/admin/carriers error:', err);
      res.status(500).json({ message: 'Failed to update carrier' });
    }
  });

  app.delete("/api/admin/carriers/:id", ...adminWrite, async (req, res) => {
    try {
      const [row] = await db.update(carriers)
        .set({ status: 'inactive', updatedAt: new Date() } as any)
        .where(eq(carriers.id, req.params.id)).returning();
      if (!row) { res.status(404).json({ message: 'Carrier not found' }); return; }
      await writeAudit((req as any).adminUser.id, 'carrier.deactivate', 'carrier', row.id);
      res.json({ carrier: row });
    } catch (err) {
      console.error('[network] DELETE /api/admin/carriers error:', err);
      res.status(500).json({ message: 'Failed to deactivate carrier' });
    }
  });

  // ───────────────────────── SHIPPING ROUTES — ADMIN ─────────────────────────
  app.get("/api/admin/shipping-routes", ...adminRead, async (_req, res) => {
    try {
      const rows = await db.select().from(shippingRoutes).orderBy(desc(shippingRoutes.updatedAt));
      res.json({ routes: rows });
    } catch (err) {
      console.error('[network] GET /api/admin/shipping-routes error:', err);
      res.status(500).json({ message: 'Failed to load routes' });
    }
  });

  app.post("/api/admin/shipping-routes", ...adminWrite, async (req, res) => {
    try {
      const parsed = routeCreateSchema.parse(req.body ?? {});

      // Validate origin hub exists
      const [hub] = await db.select({ id: warehouseHubs.id }).from(warehouseHubs)
        .where(eq(warehouseHubs.id, parsed.originHubId)).limit(1);
      if (!hub) { res.status(400).json({ message: 'Origin hub not found' }); return; }

      if (parsed.carrierId) {
        const [c] = await db.select({ id: carriers.id }).from(carriers).where(eq(carriers.id, parsed.carrierId)).limit(1);
        if (!c) { res.status(400).json({ message: 'Carrier not found' }); return; }
      }

      const [row] = await db.insert(shippingRoutes).values({
        ...parsed,
        code: parsed.code ?? null,
        createdBy: (req as any).adminUser.id,
      } as any).returning();
      await writeAudit((req as any).adminUser.id, 'route.create', 'shipping_route', row.id, { code: row.code, mode: row.mode });
      res.status(201).json({ route: row });
    } catch (err: any) {
      if (err instanceof z.ZodError) { res.status(400).json({ message: 'Invalid route data', errors: err.flatten() }); return; }
      console.error('[network] POST /api/admin/shipping-routes error:', err);
      res.status(500).json({ message: 'Failed to create route' });
    }
  });

  app.patch("/api/admin/shipping-routes/:id", ...adminWrite, async (req, res) => {
    try {
      const parsed = routeUpdateSchema.parse(req.body ?? {});
      const updates: Record<string, unknown> = { updatedAt: new Date(), ...parsed };
      const [row] = await db.update(shippingRoutes).set(updates as any).where(eq(shippingRoutes.id, req.params.id)).returning();
      if (!row) { res.status(404).json({ message: 'Route not found' }); return; }
      await writeAudit((req as any).adminUser.id, 'route.update', 'shipping_route', row.id, { fields: Object.keys(parsed) });
      res.json({ route: row });
    } catch (err: any) {
      if (err instanceof z.ZodError) { res.status(400).json({ message: 'Invalid route data', errors: err.flatten() }); return; }
      console.error('[network] PATCH /api/admin/shipping-routes error:', err);
      res.status(500).json({ message: 'Failed to update route' });
    }
  });

  app.delete("/api/admin/shipping-routes/:id", ...adminWrite, async (req, res) => {
    try {
      const [row] = await db.update(shippingRoutes)
        .set({ status: 'inactive', updatedAt: new Date() } as any)
        .where(eq(shippingRoutes.id, req.params.id)).returning();
      if (!row) { res.status(404).json({ message: 'Route not found' }); return; }
      await writeAudit((req as any).adminUser.id, 'route.deactivate', 'shipping_route', row.id);
      res.json({ route: row });
    } catch (err) {
      console.error('[network] DELETE /api/admin/shipping-routes error:', err);
      res.status(500).json({ message: 'Failed to deactivate route' });
    }
  });

  // ── Warehouse-incharge picker: minimal list of admin/warehouse users ────
  app.get("/api/admin/users/warehouse-incharge-candidates", ...adminRead, async (_req, res) => {
    try {
      const rows = await db.select({
        id: users.id, firstName: users.firstName, lastName: users.lastName,
        email: users.email, userType: users.userType, role: users.role,
      }).from(users).where(
        sql`(${users.userType} = 'warehouse' OR ${users.role} = 'admin')`
      );
      res.json({ users: rows });
    } catch (err) {
      console.error('[network] candidates error:', err);
      res.status(500).json({ message: 'Failed to load candidates' });
    }
  });
}
