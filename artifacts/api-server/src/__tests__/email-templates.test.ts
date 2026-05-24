import { describe, it, expect, vi } from "vitest";

// Mock the db module so importing email.ts does not require a real pg connection.
vi.mock("../db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
    insert: () => ({ values: async () => ({}) }),
  },
  pool: {},
  secondaryDb: null,
  secondaryPool: null,
}));

const { EMAIL_TEMPLATES, DEFAULT_EMAIL_TEMPLATES } = await import("../email");

describe("DEFAULT_EMAIL_TEMPLATES — consignment review templates", () => {
  const requiredSlugs = [
    EMAIL_TEMPLATES.CONSIGNMENT_DOCS_APPROVED,
    EMAIL_TEMPLATES.CONSIGNMENT_DOCS_REJECTED,
    EMAIL_TEMPLATES.CONSIGNMENT_DOCS_NEEDS_INFO,
  ];

  it("exposes the three consignment review slugs on EMAIL_TEMPLATES", () => {
    expect(EMAIL_TEMPLATES.CONSIGNMENT_DOCS_APPROVED).toBe("consignment_docs_approved");
    expect(EMAIL_TEMPLATES.CONSIGNMENT_DOCS_REJECTED).toBe("consignment_docs_rejected");
    expect(EMAIL_TEMPLATES.CONSIGNMENT_DOCS_NEEDS_INFO).toBe("consignment_docs_needs_info");
  });

  it.each(requiredSlugs)("DEFAULT_EMAIL_TEMPLATES contains a complete entry for %s", (slug) => {
    const entry = DEFAULT_EMAIL_TEMPLATES.find((t: any) => t.slug === slug);
    expect(entry, `template ${slug} missing from DEFAULT_EMAIL_TEMPLATES`).toBeDefined();
    expect(entry!.subject).toBeTruthy();
    expect(entry!.body).toBeTruthy();
    expect(entry!.module).toBe("consignments");
    // Body must reference the templated variables the route passes in.
    for (const v of ["{{user_name}}", "{{reference_no}}", "{{commodity_name}}", "{{quantity}}", "{{unit}}", "{{review_notes}}", "{{consignment_url}}"]) {
      expect(entry!.body, `${slug} body missing variable ${v}`).toContain(v);
    }
  });
});
