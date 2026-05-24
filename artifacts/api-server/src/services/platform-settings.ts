import { db } from '../db';
import { and, desc, eq, isNull, or, lte, gt } from 'drizzle-orm';
import {
  feeSchedules, supportedCountries, platformSupportedCurrencies,
  emailTemplateVersions, platformAnnouncements,
  type FeeSchedule, type SupportedCountry, type PlatformSupportedCurrency,
  type EmailTemplateVersion, type PlatformAnnouncement,
} from '@shared/schema';
type SupportedCurrency = PlatformSupportedCurrency;
import { cacheGet, cacheSet, getRedisClient } from '../redis-client';

const TTL_SECONDS = 60;

const CACHE_KEYS = {
  countries: 'platform:settings:countries',
  currencies: 'platform:settings:currencies',
  fees: 'platform:settings:fees',
  emailTemplate: (slug: string) => `platform:settings:email_template:${slug}`,
  announcementsActive: 'platform:settings:announcements:active',
} as const;

// Atomic cache invalidation — DEL the relevant key(s) before returning from the write.
async function invalidate(...keys: string[]): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try { await redis.del(...keys); } catch { /* fail-open */ }
}

export async function invalidateCountries(): Promise<void> { await invalidate(CACHE_KEYS.countries); }
export async function invalidateCurrencies(): Promise<void> { await invalidate(CACHE_KEYS.currencies); }
export async function invalidateFees(): Promise<void> { await invalidate(CACHE_KEYS.fees); }
export async function invalidateEmailTemplate(slug: string): Promise<void> {
  await invalidate(CACHE_KEYS.emailTemplate(slug));
}
export async function invalidateAnnouncements(): Promise<void> { await invalidate(CACHE_KEYS.announcementsActive); }

async function readThrough<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const cached = await cacheGet(key);
  if (cached) {
    try { return JSON.parse(cached) as T; } catch { /* fall through */ }
  }
  const value = await loader();
  try { await cacheSet(key, JSON.stringify(value), TTL_SECONDS); } catch { /* ignore */ }
  return value;
}

// ─── Countries / Currencies ─────────────────────────────────────────────────

export async function getEnabledCountries(): Promise<SupportedCountry[]> {
  return readThrough(CACHE_KEYS.countries, async () => {
    return db.select().from(supportedCountries)
      .where(eq(supportedCountries.isEnabled, true))
      .orderBy(supportedCountries.displayName);
  });
}

export async function getAllCountries(): Promise<SupportedCountry[]> {
  return db.select().from(supportedCountries).orderBy(supportedCountries.displayName);
}

export async function getEnabledCurrencies(): Promise<SupportedCurrency[]> {
  return readThrough(CACHE_KEYS.currencies, async () => {
    return db.select().from(platformSupportedCurrencies)
      .where(eq(platformSupportedCurrencies.isEnabled, true))
      .orderBy(platformSupportedCurrencies.isoCode);
  });
}

export async function getAllCurrencies(): Promise<SupportedCurrency[]> {
  return db.select().from(platformSupportedCurrencies).orderBy(platformSupportedCurrencies.isoCode);
}

// ─── Fee schedules ───────────────────────────────────────────────────────────

export async function getActiveFeeSchedules(): Promise<FeeSchedule[]> {
  return readThrough(CACHE_KEYS.fees, async () => {
    const now = new Date();
    return db.select().from(feeSchedules)
      .where(and(
        lte(feeSchedules.effectiveFrom, now),
        or(isNull(feeSchedules.effectiveTo), gt(feeSchedules.effectiveTo, now)),
      ))
      .orderBy(desc(feeSchedules.effectiveFrom));
  });
}

export async function getAllFeeSchedules(): Promise<FeeSchedule[]> {
  return db.select().from(feeSchedules).orderBy(desc(feeSchedules.effectiveFrom));
}

// Find the most-specific active fee for a (category, scopeKey) pair.
// Falls back to scopeKey='*' wildcard if no exact match.
export async function getFeeFor(category: FeeSchedule['category'], scopeKey: string): Promise<FeeSchedule | null> {
  const all = await getActiveFeeSchedules();
  return all.find(f => f.category === category && f.scopeKey === scopeKey)
      ?? all.find(f => f.category === category && f.scopeKey === '*')
      ?? null;
}

// ─── Email template versions ─────────────────────────────────────────────────

export async function getLatestEmailTemplate(slug: string): Promise<EmailTemplateVersion | null> {
  return readThrough(CACHE_KEYS.emailTemplate(slug), async () => {
    const [row] = await db.select().from(emailTemplateVersions)
      .where(and(eq(emailTemplateVersions.slug, slug), eq(emailTemplateVersions.isActive, true)))
      .orderBy(desc(emailTemplateVersions.version))
      .limit(1);
    return row ?? null;
  });
}

export async function getEmailTemplateHistory(slug: string): Promise<EmailTemplateVersion[]> {
  return db.select().from(emailTemplateVersions)
    .where(eq(emailTemplateVersions.slug, slug))
    .orderBy(desc(emailTemplateVersions.version));
}

export async function listEmailTemplateSlugs(): Promise<Array<{ slug: string; latestVersion: number; latestSubject: string }>> {
  const rows = await db.select().from(emailTemplateVersions).orderBy(desc(emailTemplateVersions.version));
  const seen = new Map<string, { slug: string; latestVersion: number; latestSubject: string }>();
  for (const r of rows) {
    if (!seen.has(r.slug)) seen.set(r.slug, { slug: r.slug, latestVersion: r.version, latestSubject: r.subject });
  }
  return [...seen.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

// Insert a new version of `slug`, deactivating all previous active rows for
// that slug in the same transaction so reads always see exactly one active
// row per slug.
export async function saveEmailTemplateVersion(input: {
  slug: string;
  subject: string;
  bodyHtml: string;
  mergeVars?: string[];
  notes?: string;
  createdBy?: string | null;
}): Promise<EmailTemplateVersion> {
  // Sanitize HTML before persisting — server-side XSS guard.
  const cleanHtml = sanitizeEmailHtml(input.bodyHtml);
  const cleanSubject = sanitizeSubject(input.subject);
  const result = await db.transaction(async (tx) => {
    const [latest] = await tx.select({ v: emailTemplateVersions.version })
      .from(emailTemplateVersions)
      .where(eq(emailTemplateVersions.slug, input.slug))
      .orderBy(desc(emailTemplateVersions.version))
      .limit(1);
    const nextVersion = (latest?.v ?? 0) + 1;
    await tx.update(emailTemplateVersions)
      .set({ isActive: false })
      .where(and(eq(emailTemplateVersions.slug, input.slug), eq(emailTemplateVersions.isActive, true)));
    const [row] = await tx.insert(emailTemplateVersions).values({
      slug: input.slug,
      version: nextVersion,
      subject: cleanSubject,
      bodyHtml: cleanHtml,
      mergeVars: input.mergeVars ?? null,
      isActive: true,
      notes: input.notes ?? null,
      createdBy: input.createdBy ?? null,
    }).returning();
    return row;
  });
  // Invalidate the cached lookup atomically *before* we return so the next
  // worker fetch sees the new version, not the stale cached one.
  await invalidateEmailTemplate(input.slug);
  return result;
}

// Production-grade server-side HTML sanitizer for email template bodies. Uses
// the `sanitize-html` library (DOMPurify-equivalent for Node) with an
// allowlist tuned for transactional email: standard text/formatting tags +
// images and tables. `<script>`, `<style>`, `on*=` handlers, `javascript:`
// URLs and any unlisted attribute are stripped.
import sanitizeHtml from 'sanitize-html';
const EMAIL_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'a','b','i','em','strong','u','s','small','sub','sup','br','hr','div','span','p',
    'h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','code',
    'table','thead','tbody','tfoot','tr','td','th','caption','col','colgroup',
    'img','figure','figcaption','center',
  ],
  allowedAttributes: {
    a:   ['href','name','target','rel','title','style'],
    img: ['src','alt','title','width','height','style'],
    '*': ['style','class','align','valign','bgcolor','width','height','border','cellpadding','cellspacing','colspan','rowspan'],
  },
  allowedSchemes: ['http','https','mailto','tel','cid'],
  allowedSchemesAppliedToAttributes: ['href','src'],
  disallowedTagsMode: 'discard',
  allowedStyles: {
    '*': {
      color: [/^.*$/], 'background-color': [/^.*$/], 'font-size': [/^.*$/],
      'font-weight': [/^.*$/], 'font-family': [/^.*$/], 'text-align': [/^.*$/],
      'text-decoration': [/^.*$/], 'line-height': [/^.*$/],
      'padding': [/^.*$/], 'margin': [/^.*$/], 'border': [/^.*$/],
      'border-radius': [/^.*$/], 'width': [/^.*$/], 'max-width': [/^.*$/], 'height': [/^.*$/],
    },
  },
};
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, EMAIL_SANITIZE_OPTIONS);
}
export function sanitizeSubject(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').slice(0, 500);
}

// ─── Announcements ───────────────────────────────────────────────────────────

export async function getActiveAnnouncements(forUser: {
  userType?: string | null; country?: string | null; role?: string | null;
}, channel: 'banner' | 'in_app' = 'banner'): Promise<PlatformAnnouncement[]> {
  const cacheKey = channel === 'in_app'
    ? `${CACHE_KEYS.announcementsActive}:in_app`
    : CACHE_KEYS.announcementsActive;
  const list = await readThrough(cacheKey, async () => {
    const now = new Date();
    return db.select().from(platformAnnouncements)
      .where(and(
        eq(platformAnnouncements.isActive, true),
        lte(platformAnnouncements.scheduledAt, now),
        or(isNull(platformAnnouncements.expiresAt), gt(platformAnnouncements.expiresAt, now)),
        eq(platformAnnouncements.channel, channel),
      ))
      .orderBy(desc(platformAnnouncements.scheduledAt));
  });
  return list.filter((a: PlatformAnnouncement) => audienceMatches(a, forUser));
}

// Task #173: broadcast an email-channel announcement to every user matching
// its audience filter. Idempotent guard via the announcement's `sentAt`-style
// flag would belong in its own table; for now we rely on the admin button
// being a deliberate, one-shot action and on the announcement's `isActive`
// flag to gate availability.
export async function fanOutAnnouncementEmail(announcementId: string,
  sendEmail: (to: string, subject: string, html: string) => Promise<void>,
): Promise<{ recipients: number }> {
  const [a] = await db.select().from(platformAnnouncements)
    .where(eq(platformAnnouncements.id, announcementId));
  if (!a) throw new Error('Announcement not found');
  if (a.channel !== 'email') throw new Error('Announcement is not configured for email delivery');
  const { users } = await import('@shared/schema');
  const allUsers = await db.select({
    id: users.id, email: users.email, userType: users.userType,
    country: users.country, role: users.role,
  }).from(users);
  const targets = allUsers.filter((u: any) => u.email && audienceMatches(a, {
    userType: u.userType, country: u.country, role: u.role,
  }));
  const html = `<div><h2>${escapeForEmail(a.title)}</h2><div>${a.body}</div>${
    a.ctaUrl ? `<p><a href="${escapeForEmail(a.ctaUrl)}">${escapeForEmail(a.ctaLabel ?? 'Learn more')}</a></p>` : ''
  }</div>`;
  let n = 0;
  for (const u of targets) {
    try { await sendEmail(u.email!, a.title, html); n++; } catch { /* swallow per-user */ }
  }
  return { recipients: n };
}
function escapeForEmail(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Task #173: bulk-seed `email_template_versions` from a list of canonical
// transactional templates (typically what seedEmailTemplates writes to the
// legacy `templates` table). Creates v1 only if the slug has no version yet,
// so manual edits via the admin UI are never overwritten.
export async function seedEmailTemplateVersions(items: Array<{
  slug: string; subject: string; body: string;
  variables?: { name: string; description?: string }[]; module?: string;
}>): Promise<{ seeded: number; skipped: number }> {
  let seeded = 0, skipped = 0;
  for (const t of items) {
    const existing = await db.select({ id: emailTemplateVersions.id })
      .from(emailTemplateVersions)
      .where(eq(emailTemplateVersions.slug, t.slug))
      .limit(1);
    if (existing.length > 0) { skipped++; continue; }
    const mergeVars: string[] = (t.variables ?? [])
      .map(v => (typeof v === 'string' ? v : v?.name))
      .filter((s): s is string => !!s);
    await db.insert(emailTemplateVersions).values({
      slug: t.slug, version: 1, subject: t.subject,
      bodyHtml: sanitizeEmailHtml(t.body),
      mergeVars,
      isActive: true, createdBy: null,
    });
    seeded++;
  }
  return { seeded, skipped };
}

function audienceMatches(a: PlatformAnnouncement, user: { userType?: string | null; country?: string | null; role?: string | null }): boolean {
  if (a.audienceCountry && user.country && a.audienceCountry.toUpperCase() !== user.country.toUpperCase()) return false;
  if (a.audienceCountry && !user.country) return false;
  switch (a.audienceSegment) {
    case 'all': return true;
    case 'admin': return user.role === 'admin';
    case 'exporter': case 'importer': case 'government': case 'warehouse':
      return user.userType === a.audienceSegment;
    default: return true;
  }
}
