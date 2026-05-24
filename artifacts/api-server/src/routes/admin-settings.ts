import type { Express, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import {
  feeSchedules, supportedCountries, platformSupportedCurrencies,
  helpArticles, platformAnnouncements,
} from '@shared/schema';
const supportedCurrencies = platformSupportedCurrencies;
import {
  getEnabledCountries, getAllCountries,
  getEnabledCurrencies, getAllCurrencies,
  getAllFeeSchedules,
  getLatestEmailTemplate, getEmailTemplateHistory, listEmailTemplateSlugs,
  saveEmailTemplateVersion,
  getActiveAnnouncements,
  invalidateCountries, invalidateCurrencies, invalidateFees, invalidateAnnouncements,
} from '../services/platform-settings';
import { storage } from '../storage';

// Audit helper — mirrors the pattern used elsewhere in routes.ts.
async function audit(req: Request, action: string, entityType: string, entityId: string | null, details?: Record<string, unknown>) {
  try {
    await storage.createAuditLog({
      entityType, entityId: entityId ?? null,
      actor: req.session?.userId || 'unknown',
      actorRole: 'admin',
      actionType: action,
      details: details ? JSON.stringify(details) : null,
    } as any);
  } catch (err) {
    console.error('[admin-settings] audit failed', err);
  }
}

export function registerAdminSettingsRoutes(app: Express, ensureAdminAsync: any, requirePermission: any): void {
  const adminGuard = [ensureAdminAsync, requirePermission('manage_settings')];

  // ─── Fee schedules ───────────────────────────────────────────────────────
  app.get('/api/admin/settings/fees', ...adminGuard, async (_req: Request, res: Response) => {
    const rows = await getAllFeeSchedules();
    res.json({ fees: rows });
  });

  const upsertFeeSchema = z.object({
    category: z.enum(['marketplace_commission','trade_finance_fee','wallet_deposit_fee','wallet_withdrawal_fee','fx_spread']),
    scopeKey: z.string().min(1).max(100).default('*'),
    percentBps: z.number().int().min(0).max(10000),
    flatCents: z.number().int().min(0).default(0),
    currency: z.string().length(3).default('USD'),
    effectiveFrom: z.coerce.date().optional(),
    notes: z.string().max(500).optional(),
  });
  app.post('/api/admin/settings/fees', ...adminGuard, async (req: Request, res: Response) => {
    const parsed = upsertFeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    const d = parsed.data;
    const result = await db.transaction(async (tx) => {
      // Close the prior open period for the same (category, scopeKey) by
      // setting its effectiveTo to the new effectiveFrom, preserving history.
      const now = d.effectiveFrom ?? new Date();
      await tx.update(feeSchedules)
        .set({ effectiveTo: now })
        .where(and(
          eq(feeSchedules.category, d.category),
          eq(feeSchedules.scopeKey, d.scopeKey),
        ));
      const [row] = await tx.insert(feeSchedules).values({
        category: d.category,
        scopeKey: d.scopeKey,
        percentBps: d.percentBps,
        flatCents: d.flatCents,
        currency: d.currency,
        effectiveFrom: now,
        notes: d.notes ?? null,
        createdBy: req.session?.userId ?? null,
      }).returning();
      return row;
    });
    await invalidateFees();
    await audit(req, 'fee.upsert', 'fee_schedule', result.id, { category: d.category, scopeKey: d.scopeKey });
    return res.status(201).json({ fee: result });
  });

  // ─── Countries ───────────────────────────────────────────────────────────
  app.get('/api/admin/settings/countries', ...adminGuard, async (_req, res) => {
    res.json({ countries: await getAllCountries() });
  });

  const countrySchema = z.object({
    isoCode: z.string().length(2),
    displayName: z.string().min(1).max(120),
    flagEmoji: z.string().max(10).optional(),
    region: z.string().max(80).optional(),
    isEnabled: z.boolean().optional(),
    allowSignup: z.boolean().optional(),
    allowShipping: z.boolean().optional(),
  });
  app.put('/api/admin/settings/countries/:isoCode', ...adminGuard, async (req: Request, res: Response) => {
    const parsed = countrySchema.safeParse({ ...req.body, isoCode: req.params.isoCode.toUpperCase() });
    if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    const d = parsed.data;
    const [row] = await db.insert(supportedCountries).values({
      isoCode: d.isoCode,
      displayName: d.displayName,
      flagEmoji: d.flagEmoji ?? null,
      region: d.region ?? null,
      isEnabled: d.isEnabled ?? true,
      allowSignup: d.allowSignup ?? true,
      allowShipping: d.allowShipping ?? true,
      updatedBy: req.session?.userId ?? null,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: supportedCountries.isoCode,
      set: {
        displayName: d.displayName,
        flagEmoji: d.flagEmoji ?? null,
        region: d.region ?? null,
        isEnabled: d.isEnabled ?? true,
        allowSignup: d.allowSignup ?? true,
        allowShipping: d.allowShipping ?? true,
        updatedBy: req.session?.userId ?? null,
        updatedAt: new Date(),
      },
    }).returning();
    await invalidateCountries();
    await audit(req, 'country.upsert', 'supported_country', d.isoCode, { isEnabled: row.isEnabled });
    return res.json({ country: row });
  });

  // ─── Currencies ──────────────────────────────────────────────────────────
  app.get('/api/admin/settings/currencies', ...adminGuard, async (_req, res) => {
    res.json({ currencies: await getAllCurrencies() });
  });

  const currencySchema = z.object({
    isoCode: z.string().length(3),
    displayName: z.string().min(1).max(120),
    symbol: z.string().max(8).optional(),
    decimals: z.number().int().min(0).max(8).optional(),
    isEnabled: z.boolean().optional(),
    allowWallet: z.boolean().optional(),
    allowEscrow: z.boolean().optional(),
  });
  app.put('/api/admin/settings/currencies/:isoCode', ...adminGuard, async (req, res) => {
    const parsed = currencySchema.safeParse({ ...req.body, isoCode: req.params.isoCode.toUpperCase() });
    if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    const d = parsed.data;
    const [row] = await db.insert(supportedCurrencies).values({
      isoCode: d.isoCode,
      displayName: d.displayName,
      symbol: d.symbol ?? null,
      decimals: d.decimals ?? 2,
      isEnabled: d.isEnabled ?? true,
      allowWallet: d.allowWallet ?? true,
      allowEscrow: d.allowEscrow ?? true,
      updatedBy: req.session?.userId ?? null,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: supportedCurrencies.isoCode,
      set: {
        displayName: d.displayName,
        symbol: d.symbol ?? null,
        decimals: d.decimals ?? 2,
        isEnabled: d.isEnabled ?? true,
        allowWallet: d.allowWallet ?? true,
        allowEscrow: d.allowEscrow ?? true,
        updatedBy: req.session?.userId ?? null,
        updatedAt: new Date(),
      },
    }).returning();
    await invalidateCurrencies();
    await audit(req, 'currency.upsert', 'supported_currency', d.isoCode, { isEnabled: row.isEnabled });
    return res.json({ currency: row });
  });

  // ─── Email templates ─────────────────────────────────────────────────────
  app.get('/api/admin/settings/email-templates', ...adminGuard, async (_req, res) => {
    res.json({ templates: await listEmailTemplateSlugs() });
  });

  app.get('/api/admin/settings/email-templates/:slug', ...adminGuard, async (req, res) => {
    const slug = req.params.slug;
    const latest = await getLatestEmailTemplate(slug);
    const history = await getEmailTemplateHistory(slug);
    res.json({ latest, history });
  });

  const emailTemplateSchema = z.object({
    subject: z.string().min(1).max(500),
    bodyHtml: z.string().min(1).max(200000),
    mergeVars: z.array(z.string()).optional(),
    notes: z.string().max(500).optional(),
  });
  app.post('/api/admin/settings/email-templates/:slug/versions', ...adminGuard, async (req, res) => {
    const slug = req.params.slug.trim();
    if (!/^[a-z0-9_]{2,120}$/.test(slug)) return res.status(400).json({ message: 'Invalid slug' });
    const parsed = emailTemplateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    const row = await saveEmailTemplateVersion({
      slug,
      subject: parsed.data.subject,
      bodyHtml: parsed.data.bodyHtml,
      mergeVars: parsed.data.mergeVars,
      notes: parsed.data.notes,
      createdBy: req.session?.userId ?? null,
    });
    await audit(req, 'email_template.publish', 'email_template_version', row.id, { slug, version: row.version });
    return res.status(201).json({ version: row });
  });

  app.post('/api/admin/settings/email-templates/:slug/preview', ...adminGuard, async (req, res) => {
    const slug = req.params.slug;
    const { subject, bodyHtml, sampleData } = req.body || {};
    const subj = typeof subject === 'string' ? subject : (await getLatestEmailTemplate(slug))?.subject || '';
    const html = typeof bodyHtml === 'string' ? bodyHtml : (await getLatestEmailTemplate(slug))?.bodyHtml || '';
    const data: Record<string, unknown> = sampleData && typeof sampleData === 'object' ? sampleData : {};
    const render = (s: string) => s.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_, k) => {
      const v = (data as any)[k];
      return v == null ? `{{${k}}}` : String(v);
    });
    res.json({ subject: render(subj), bodyHtml: render(html) });
  });

  // ─── Help articles ───────────────────────────────────────────────────────
  app.get('/api/admin/settings/help-articles', ...adminGuard, async (_req, res) => {
    const rows = await db.select().from(helpArticles).orderBy(helpArticles.category, helpArticles.sortOrder, desc(helpArticles.updatedAt));
    res.json({ articles: rows });
  });

  const helpArticleSchema = z.object({
    slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/),
    category: z.string().min(1).max(120),
    title: z.string().min(1).max(300),
    body: z.string().min(1).max(200000),
    excerpt: z.string().max(1000).optional(),
    status: z.enum(['draft','published','archived']).default('draft'),
    sortOrder: z.number().int().optional(),
  });
  app.post('/api/admin/settings/help-articles', ...adminGuard, async (req, res) => {
    const parsed = helpArticleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    const d = parsed.data;
    const [row] = await db.insert(helpArticles).values({
      slug: d.slug, category: d.category, title: d.title, body: d.body,
      excerpt: d.excerpt ?? null, status: d.status, sortOrder: d.sortOrder ?? 0,
      publishedAt: d.status === 'published' ? new Date() : null,
      authorId: req.session?.userId ?? null,
    }).returning();
    await audit(req, 'help_article.create', 'help_article', row.id, { slug: row.slug });
    return res.status(201).json({ article: row });
  });

  app.put('/api/admin/settings/help-articles/:id', ...adminGuard, async (req, res) => {
    const parsed = helpArticleSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    const d = parsed.data;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of ['slug','category','title','body','excerpt','status','sortOrder'] as const) {
      if (d[k] !== undefined) (patch as any)[k] = d[k];
    }
    if (d.status === 'published') patch.publishedAt = new Date();
    const [row] = await db.update(helpArticles).set(patch).where(eq(helpArticles.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ message: 'Not found' });
    await audit(req, 'help_article.update', 'help_article', row.id, { slug: row.slug });
    return res.json({ article: row });
  });

  app.delete('/api/admin/settings/help-articles/:id', ...adminGuard, async (req, res) => {
    const [row] = await db.delete(helpArticles).where(eq(helpArticles.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ message: 'Not found' });
    await audit(req, 'help_article.delete', 'help_article', row.id, { slug: row.slug });
    return res.json({ ok: true });
  });

  // ─── Announcements ───────────────────────────────────────────────────────
  app.get('/api/admin/settings/announcements', ...adminGuard, async (_req, res) => {
    const rows = await db.select().from(platformAnnouncements).orderBy(desc(platformAnnouncements.scheduledAt));
    res.json({ announcements: rows });
  });

  const announcementSchema = z.object({
    title: z.string().min(1).max(255),
    body: z.string().min(1).max(10000),
    channel: z.enum(['banner','in_app','email']).default('banner'),
    severity: z.enum(['info','warning','success','critical']).default('info'),
    audienceSegment: z.enum(['all','exporter','importer','government','warehouse','admin']).default('all'),
    audienceCountry: z.string().length(2).optional().nullable(),
    scheduledAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional().nullable(),
    isActive: z.boolean().optional(),
    ctaLabel: z.string().max(80).optional(),
    ctaUrl: z.string().max(500).optional(),
  });
  app.post('/api/admin/settings/announcements', ...adminGuard, async (req, res) => {
    const parsed = announcementSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    const d = parsed.data;
    const [row] = await db.insert(platformAnnouncements).values({
      title: d.title, body: d.body, channel: d.channel, severity: d.severity,
      audienceSegment: d.audienceSegment,
      audienceCountry: d.audienceCountry ? d.audienceCountry.toUpperCase() : null,
      scheduledAt: d.scheduledAt ?? new Date(),
      expiresAt: d.expiresAt ?? null,
      isActive: d.isActive ?? true,
      ctaLabel: d.ctaLabel ?? null, ctaUrl: d.ctaUrl ?? null,
      createdBy: req.session?.userId ?? null,
    }).returning();
    await invalidateAnnouncements();
    await audit(req, 'announcement.create', 'platform_announcement', row.id, { title: row.title });
    return res.status(201).json({ announcement: row });
  });

  app.put('/api/admin/settings/announcements/:id', ...adminGuard, async (req, res) => {
    const parsed = announcementSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    const d = parsed.data;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of ['title','body','channel','severity','audienceSegment','scheduledAt','expiresAt','isActive','ctaLabel','ctaUrl'] as const) {
      if (d[k] !== undefined) (patch as any)[k] = d[k];
    }
    if (d.audienceCountry !== undefined) patch.audienceCountry = d.audienceCountry ? d.audienceCountry.toUpperCase() : null;
    const [row] = await db.update(platformAnnouncements).set(patch).where(eq(platformAnnouncements.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ message: 'Not found' });
    await invalidateAnnouncements();
    await audit(req, 'announcement.update', 'platform_announcement', row.id, { title: row.title });
    return res.json({ announcement: row });
  });

  app.delete('/api/admin/settings/announcements/:id', ...adminGuard, async (req, res) => {
    const [row] = await db.delete(platformAnnouncements).where(eq(platformAnnouncements.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ message: 'Not found' });
    await invalidateAnnouncements();
    await audit(req, 'announcement.delete', 'platform_announcement', row.id, { title: row.title });
    return res.json({ ok: true });
  });

  // ─── PUBLIC reads (no admin gate) ────────────────────────────────────────
  app.get('/api/supported-countries', async (_req, res) => {
    const rows = await getEnabledCountries();
    res.json({ countries: rows.map(r => ({
      isoCode: r.isoCode, displayName: r.displayName, flagEmoji: r.flagEmoji,
      region: r.region, allowSignup: r.allowSignup, allowShipping: r.allowShipping,
    })) });
  });

  app.get('/api/supported-currencies', async (_req, res) => {
    const rows = await getEnabledCurrencies();
    res.json({ currencies: rows.map(r => ({
      isoCode: r.isoCode, displayName: r.displayName, symbol: r.symbol,
      decimals: r.decimals, allowWallet: r.allowWallet, allowEscrow: r.allowEscrow,
    })) });
  });

  app.get('/api/help-articles', async (_req, res) => {
    const rows = await db.select().from(helpArticles)
      .where(eq(helpArticles.status, 'published'))
      .orderBy(helpArticles.category, helpArticles.sortOrder);
    res.json({ articles: rows.map(r => ({
      id: r.id, slug: r.slug, category: r.category, title: r.title,
      excerpt: r.excerpt, publishedAt: r.publishedAt,
    })) });
  });

  app.get('/api/help-articles/:slug', async (req, res) => {
    const [row] = await db.select().from(helpArticles)
      .where(and(eq(helpArticles.slug, req.params.slug), eq(helpArticles.status, 'published')))
      .limit(1);
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({ article: row });
  });

  app.get('/api/announcements/active', async (req, res) => {
    let user: { userType?: string | null; country?: string | null; role?: string | null } = {};
    const userId = req.session?.userId;
    if (userId) {
      try {
        const u = await storage.getUser(userId);
        if (u) user = { userType: u.userType, country: u.country, role: u.role };
      } catch { /* ignore */ }
    }
    const rows = await getActiveAnnouncements(user);
    res.json({ announcements: rows.map(r => ({
      id: r.id, title: r.title, body: r.body, severity: r.severity,
      ctaLabel: r.ctaLabel, ctaUrl: r.ctaUrl, scheduledAt: r.scheduledAt,
    })) });
  });

  // Task #173: in-app inbox feed for `channel='in_app'` announcements. These
  // do not pop as banners; instead the app renders them in a notification
  // tray. Same scheduling/audience filter as the banner feed.
  app.get('/api/announcements/inbox', async (req, res) => {
    let user: { userType?: string | null; country?: string | null; role?: string | null } = {};
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    try {
      const u = await storage.getUser(userId);
      if (u) user = { userType: u.userType, country: u.country, role: u.role };
    } catch { /* ignore */ }
    const rows = await getActiveAnnouncements(user, 'in_app');
    return res.json({ announcements: rows.map(r => ({
      id: r.id, title: r.title, body: r.body, severity: r.severity,
      ctaLabel: r.ctaLabel, ctaUrl: r.ctaUrl, scheduledAt: r.scheduledAt,
    })) });
  });

  // Task #173: admin endpoint to fan out an email-channel announcement to
  // all matching users. Gated by `manage_settings`.
  app.post('/api/admin/settings/announcements/:id/broadcast-email',
    ensureAdminAsync, requirePermission('manage_settings'),
    async (req, res) => {
      try {
        const { fanOutAnnouncementEmail } = await import('../services/platform-settings');
        const { sendEmailDirect } = await import('../email');
        const result = await fanOutAnnouncementEmail(req.params.id,
          async (to, subject, html) => {
            await sendEmailDirect(to, subject, html);
          });
        return res.json(result);
      } catch (e: any) {
        return res.status(400).json({ message: e?.message ?? 'Broadcast failed' });
      }
    });
}
