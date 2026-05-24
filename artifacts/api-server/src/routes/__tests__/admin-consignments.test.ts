import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

// ─── Fluent drizzle db mock ────────────────────────────────────────────────
// Each call to db.select()/update()/insert() returns a thenable proxy that
// records the chain and resolves to whatever the test queued via `queueResult`.
type Op = {
  kind: "select" | "update" | "insert";
  table?: any;
  values?: any;
  set?: any;
  whereArgs?: any[];
};

interface MockState {
  results: any[];
  ops: Op[];
}

const state: MockState = { results: [], ops: [] };

function queueResult(result: any) {
  state.results.push(result);
}

function resetMock() {
  state.results = [];
  state.ops = [];
}

function makeChain(op: Op): any {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === "then") {
        const result = state.results.shift();
        return (resolve: any, reject: any) => {
          try {
            return Promise.resolve(result ?? []).then(resolve, reject);
          } catch (e) {
            return reject(e);
          }
        };
      }
      if (prop === "values") {
        return (v: any) => {
          op.values = v;
          return makeChain(op);
        };
      }
      if (prop === "set") {
        return (v: any) => {
          op.set = v;
          return makeChain(op);
        };
      }
      if (prop === "from") {
        return (t: any) => {
          op.table = t;
          return makeChain(op);
        };
      }
      if (prop === "where") {
        return (...args: any[]) => {
          op.whereArgs = args;
          return makeChain(op);
        };
      }
      // generic chain method
      return (..._args: any[]) => makeChain(op);
    },
  };
  return new Proxy(function () {}, handler);
}

const db = {
  select(_cols?: any) {
    const op: Op = { kind: "select" };
    state.ops.push(op);
    return makeChain(op);
  },
  update(table: any) {
    const op: Op = { kind: "update", table };
    state.ops.push(op);
    return makeChain(op);
  },
  insert(table: any) {
    const op: Op = { kind: "insert", table };
    state.ops.push(op);
    return makeChain(op);
  },
};

vi.mock("../../db", () => ({ db, pool: {}, secondaryDb: null, secondaryPool: null }));

// Walks a drizzle SQL expression (as built by eq/and/inArray/etc.) and collects
// every bound literal value so tests can assert filter semantics without
// dialect serialization. Drizzle wraps literals as `Param { value }` and nests
// expressions under `queryChunks`.
function collectSqlParamValues(node: any, out: any[] = []): any[] {
  if (node == null) return out;
  if (Array.isArray(node)) {
    for (const item of node) collectSqlParamValues(item, out);
    return out;
  }
  if (typeof node !== "object") return out;
  if ("value" in node && !("queryChunks" in node)) {
    const v = (node as any).value;
    if (Array.isArray(v)) for (const item of v) out.push(item);
    else out.push(v);
  }
  if ("queryChunks" in node) collectSqlParamValues((node as any).queryChunks, out);
  return out;
}

// ─── Storage mock (used by requireAdmin) ──────────────────────────────────
const getUserMock = vi.fn();
vi.mock("../../storage", () => ({
  storage: {
    getUser: (...args: any[]) => getUserMock(...args),
  },
}));

// ─── r2-storage mock ───────────────────────────────────────────────────────
vi.mock("../../r2-storage", () => ({
  isR2Configured: () => false,
  getSignedDownloadUrl: vi.fn(async () => "https://signed.example/url"),
}));

// ─── email mock ────────────────────────────────────────────────────────────
const queueEmailWithTemplateMock = vi.fn(async (..._args: any[]) => {});
vi.mock("../../email", () => ({
  EMAIL_TEMPLATES: {
    CONSIGNMENT_DOCS_APPROVED: "consignment_docs_approved",
    CONSIGNMENT_DOCS_REJECTED: "consignment_docs_rejected",
    CONSIGNMENT_DOCS_NEEDS_INFO: "consignment_docs_needs_info",
  },
  queueEmailWithTemplate: (...args: any[]) => queueEmailWithTemplateMock(...args),
}));

// Import AFTER mocks
const adminConsignmentsRouter = (await import("../admin-consignments")).default;

// ─── Express app harness ──────────────────────────────────────────────────
function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).session = { userId: "admin-1" };
    next();
  });
  app.use("/api/admin/consignments", adminConsignmentsRouter);
  return app;
}

const ADMIN_USER = { id: "admin-1", role: "admin" };

beforeEach(() => {
  resetMock();
  getUserMock.mockReset();
  getUserMock.mockResolvedValue(ADMIN_USER);
  queueEmailWithTemplateMock.mockReset();
  queueEmailWithTemplateMock.mockResolvedValue(undefined);
});

// ──────────────────────────────────────────────────────────────────────────
// PATCH /:id/status
// ──────────────────────────────────────────────────────────────────────────
describe("PATCH /api/admin/consignments/:id/status", () => {
  it("happy path: approves consignment when all required docs verified and appends history + email", async () => {
    const consignment = {
      id: "c-1",
      referenceNo: "CONS-1",
      userId: "user-1",
      status: "Under Review",
      commodityName: "Cocoa",
      quantity: "10",
      unit: "MT",
      reviewedAt: null,
      reviewNotes: null,
      adminNotes: null,
      approvedAt: null,
      approvedBy: null,
    };

    // 1. select consignment
    queueResult([consignment]);
    // 2. select docs (all required + verified)
    queueResult([
      { id: "d-1", isRequired: true, status: "verified" },
      { id: "d-2", isRequired: true, status: "verified" },
    ]);
    // 3. update consignment .returning()
    queueResult([{ ...consignment, status: "Approved" }]);
    // 4. insert consignmentStatusHistory (no await)
    queueResult([]);
    // 5. queueStatusEmail: select consignment + user
    queueResult([{ c: consignment, u: { firstName: "A", lastName: "B", email: "u@x.com", companyName: null } }]);

    const res = await request(makeApp())
      .patch("/api/admin/consignments/c-1/status")
      .send({ status: "Approved", note: "ok" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Approved");

    // history insert should have been recorded
    const insertOps = state.ops.filter((o) => o.kind === "insert");
    expect(insertOps.length).toBeGreaterThanOrEqual(1);
    expect(insertOps[0].values).toMatchObject({
      consignmentId: "c-1",
      fromStatus: "Under Review",
      toStatus: "Approved",
      actorId: "admin-1",
      note: "ok",
    });

    // email enqueued with approved template (await async fire-and-forget)
    await new Promise((r) => setImmediate(r));
    expect(queueEmailWithTemplateMock).toHaveBeenCalledTimes(1);
    const [to, slug] = queueEmailWithTemplateMock.mock.calls[0];
    expect(to).toBe("u@x.com");
    expect(slug).toBe("consignment_docs_approved");
  });

  it("returns 400 when rejecting without a note", async () => {
    queueResult([{ id: "c-1", status: "Under Review" }]);

    const res = await request(makeApp())
      .patch("/api/admin/consignments/c-1/status")
      .send({ status: "Rejected" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
    // no history insert
    expect(state.ops.filter((o) => o.kind === "insert")).toHaveLength(0);
  });

  it("returns 400 when approving but not all required docs are verified", async () => {
    queueResult([{ id: "c-1", status: "Under Review" }]);
    queueResult([
      { id: "d-1", isRequired: true, status: "verified" },
      { id: "d-2", isRequired: true, status: "pending" },
    ]);

    const res = await request(makeApp())
      .patch("/api/admin/consignments/c-1/status")
      .send({ status: "Approved", note: "looks good" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/All required documents must be approved/i);
    expect(res.body.requiredDocsTotal).toBe(2);
    expect(res.body.requiredDocsApproved).toBe(1);
    expect(state.ops.filter((o) => o.kind === "update")).toHaveLength(0);
    expect(state.ops.filter((o) => o.kind === "insert")).toHaveLength(0);
  });

  it("appends a row to consignment_status_history on status change", async () => {
    const consignment = {
      id: "c-2",
      referenceNo: "CONS-2",
      userId: "user-2",
      status: "Submitted",
      commodityName: "Coffee",
      quantity: "5",
      unit: "MT",
      reviewedAt: null,
      reviewNotes: null,
      adminNotes: null,
      approvedAt: null,
      approvedBy: null,
    };
    queueResult([consignment]); // select consignment
    queueResult([{ ...consignment, status: "Needs More Info" }]); // update.returning
    queueResult([]); // insert history
    queueResult([{ c: consignment, u: { firstName: "A", lastName: "B", email: "u2@x.com", companyName: null } }]); // queueStatusEmail select

    const res = await request(makeApp())
      .patch("/api/admin/consignments/c-2/status")
      .send({ status: "Needs More Info", note: "please reupload BOL" });

    expect(res.status).toBe(200);

    const insertOps = state.ops.filter((o) => o.kind === "insert");
    expect(insertOps).toHaveLength(1);
    expect(insertOps[0].values).toMatchObject({
      consignmentId: "c-2",
      fromStatus: "Submitted",
      toStatus: "Needs More Info",
      actorId: "admin-1",
      note: "please reupload BOL",
    });

    await new Promise((r) => setImmediate(r));
    expect(queueEmailWithTemplateMock).toHaveBeenCalledTimes(1);
    expect(queueEmailWithTemplateMock.mock.calls[0][1]).toBe("consignment_docs_needs_info");
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PATCH /:id/documents/:docId
// ──────────────────────────────────────────────────────────────────────────
describe("PATCH /api/admin/consignments/:id/documents/:docId", () => {
  const baseDoc = {
    id: "d-1",
    consignmentId: "c-1",
    docType: "invoice",
    docLabel: "Commercial Invoice",
    isRequired: true,
    status: "pending",
    reviewNotes: null,
    rejectReason: null,
  };

  it("approve: marks doc verified and inserts a 'Document approved' history row", async () => {
    queueResult([baseDoc]); // select doc
    queueResult([{ ...baseDoc, status: "verified" }]); // update.returning
    queueResult([{ status: "Under Review" }]); // select parent consignment status
    queueResult([]); // insert history

    const res = await request(makeApp())
      .patch("/api/admin/consignments/c-1/documents/d-1")
      .send({ action: "approve" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("verified");

    const updateOps = state.ops.filter((o) => o.kind === "update");
    expect(updateOps).toHaveLength(1);
    expect(updateOps[0].set).toMatchObject({ status: "verified", reviewerId: "admin-1" });

    const insertOps = state.ops.filter((o) => o.kind === "insert");
    expect(insertOps).toHaveLength(1);
    expect(insertOps[0].values).toMatchObject({
      consignmentId: "c-1",
      actorId: "admin-1",
      toStatus: "Under Review",
    });
    expect(insertOps[0].values.note).toMatch(/^Document approved:/);
  });

  it("reject without note or reason returns 400", async () => {
    queueResult([baseDoc]);

    const res = await request(makeApp())
      .patch("/api/admin/consignments/c-1/documents/d-1")
      .send({ action: "reject" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Reason is required/i);
    expect(state.ops.filter((o) => o.kind === "update")).toHaveLength(0);
  });

  it("reject with reason: sets status rejected, stores rejectReason, audits history", async () => {
    queueResult([baseDoc]);
    queueResult([{ ...baseDoc, status: "rejected", rejectReason: "blurry scan" }]);
    queueResult([{ status: "Under Review" }]);
    queueResult([]);

    const res = await request(makeApp())
      .patch("/api/admin/consignments/c-1/documents/d-1")
      .send({ action: "reject", reason: "blurry scan" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("rejected");

    const updateOps = state.ops.filter((o) => o.kind === "update");
    expect(updateOps[0].set).toMatchObject({ status: "rejected", rejectReason: "blurry scan" });

    const insertOps = state.ops.filter((o) => o.kind === "insert");
    expect(insertOps[0].values.note).toMatch(/^Document rejected: Commercial Invoice — blurry scan/);
  });

  it("request_replacement with note: sets status changes_requested and audits history", async () => {
    queueResult([baseDoc]);
    queueResult([{ ...baseDoc, status: "changes_requested" }]);
    queueResult([{ status: "Under Review" }]);
    queueResult([]);

    const res = await request(makeApp())
      .patch("/api/admin/consignments/c-1/documents/d-1")
      .send({ action: "request_replacement", note: "needs HS code" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("changes_requested");

    const insertOps = state.ops.filter((o) => o.kind === "insert");
    expect(insertOps[0].values.note).toMatch(/^Document changes requested: Commercial Invoice — needs HS code/);
  });

  it("returns 404 when document does not exist", async () => {
    queueResult([]); // no doc

    const res = await request(makeApp())
      .patch("/api/admin/consignments/c-1/documents/missing")
      .send({ action: "approve" });

    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GET /:id (detail / timeline)
// ──────────────────────────────────────────────────────────────────────────
describe("GET /api/admin/consignments/:id", () => {
  const consignment = {
    id: "c-9",
    referenceNo: "CONS-9",
    userId: "user-9",
    status: "Under Review",
    commodityName: "Cocoa",
    commodityCategory: "agri",
    hsCode: "1801.00",
    quantity: "12",
    unit: "MT",
    qualityGrade: "A",
    originCountry: "GH",
    targetHubCode: "TEMA",
    incoterms: "FOB",
    askingPriceCents: 100000,
    askingCurrency: "USD",
    estimatedValueCents: 120000,
    notes: null,
    adminNotes: null,
    reviewerId: null,
    reviewedAt: null,
    reviewNotes: null,
    submittedAt: new Date("2026-05-01T00:00:00Z"),
    approvedAt: null,
    createdAt: new Date("2026-05-01T00:00:00Z"),
    updatedAt: new Date("2026-05-01T00:00:00Z"),
  };
  const exporter = {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@x.com",
    companyName: "Ada Trading",
  };

  it("returns consignment with documents, history (with actorName/actorRole), and signed download paths", async () => {
    // 1. select consignment + exporter
    queueResult([{ c: consignment, u: exporter }]);
    // 2. select documents
    queueResult([
      {
        id: "d-1",
        consignmentId: "c-9",
        docType: "invoice",
        docLabel: "Commercial Invoice",
        isRequired: true,
        status: "verified",
        fileName: "inv.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        storageKey: "consignments/c-9/inv.pdf",
        uploadedAt: new Date("2026-05-02T00:00:00Z"),
        reviewedAt: null,
        reviewerId: null,
        reviewNotes: null,
        rejectReason: null,
      },
    ]);
    // 3. select history joined to actor
    queueResult([
      {
        h: {
          id: "h-1",
          consignmentId: "c-9",
          fromStatus: "Submitted",
          toStatus: "Under Review",
          actorId: "admin-1",
          note: "picked up",
          createdAt: new Date("2026-05-03T00:00:00Z"),
        },
        actor: { firstName: "Cara", lastName: "Reviewer", email: "cara@x.com", role: "admin" },
      },
      {
        h: {
          id: "h-2",
          consignmentId: "c-9",
          fromStatus: null,
          toStatus: "Submitted",
          actorId: null,
          note: null,
          createdAt: new Date("2026-05-01T00:00:00Z"),
        },
        actor: null,
      },
    ]);

    const res = await request(makeApp()).get("/api/admin/consignments/c-9");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("c-9");
    expect(res.body.exporterName).toBe("Ada Trading");
    expect(res.body.exporterEmail).toBe("ada@x.com");

    expect(res.body.documents).toHaveLength(1);
    expect(res.body.documents[0]).toMatchObject({
      id: "d-1",
      docLabel: "Commercial Invoice",
      status: "verified",
      downloadPath: "/api/b2b/consignments/c-9/documents/d-1/url",
    });
    // r2 not configured → no signedUrl
    expect(res.body.documents[0].signedUrl).toBeUndefined();

    expect(res.body.history).toHaveLength(2);
    expect(res.body.history[0]).toMatchObject({
      id: "h-1",
      fromStatus: "Submitted",
      toStatus: "Under Review",
      actorName: "Cara Reviewer",
      actorRole: "admin",
      note: "picked up",
    });
    // history entry with no actor (system event) should still serialize
    expect(res.body.history[1]).toMatchObject({
      id: "h-2",
      toStatus: "Submitted",
      actorName: null,
      actorRole: null,
    });
  });

  it("returns 404 when consignment id is missing", async () => {
    queueResult([]); // empty consignment lookup

    const res = await request(makeApp()).get("/api/admin/consignments/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it("returns empty documents and history arrays when none exist", async () => {
    queueResult([{ c: consignment, u: exporter }]);
    queueResult([]); // no docs
    queueResult([]); // no history

    const res = await request(makeApp()).get("/api/admin/consignments/c-9");

    expect(res.status).toBe(200);
    expect(res.body.documents).toEqual([]);
    expect(res.body.history).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GET / (queue + SLA summary)
// ──────────────────────────────────────────────────────────────────────────
describe("GET /api/admin/consignments", () => {
  const now = new Date("2026-05-24T00:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  function makeRow(overrides: any = {}) {
    return {
      c: {
        id: overrides.id ?? "c-1",
        referenceNo: overrides.referenceNo ?? "CONS-1",
        userId: "user-1",
        status: overrides.status ?? "Submitted",
        commodityName: overrides.commodityName ?? "Cocoa",
        commodityCategory: "agri",
        hsCode: null,
        quantity: "10",
        unit: "MT",
        qualityGrade: null,
        originCountry: "GH",
        targetHubCode: overrides.targetHubCode ?? "TEMA",
        incoterms: "FOB",
        askingPriceCents: 0,
        askingCurrency: "USD",
        estimatedValueCents: 0,
        notes: null,
        adminNotes: null,
        reviewerId: null,
        reviewedAt: overrides.reviewedAt ?? null,
        reviewNotes: null,
        submittedAt: overrides.submittedAt ?? now,
        approvedAt: null,
        createdAt: overrides.createdAt ?? now,
        updatedAt: now,
      },
      u: overrides.u ?? { firstName: "Ada", lastName: "L", email: "ada@x.com", companyName: "Ada Trading" },
    };
  }

  function queueListAndSla(rows: any[], pending: any[] = [], reviewed: any[] = []) {
    queueResult(rows); // main list query
    queueResult(pending); // pending pool for SLA
    queueResult(reviewed); // recent reviewed
  }

  it("returns items + SLA summary with pendingTotal, pendingOverSla, oldestPendingHours, avgReviewHoursLast7d", async () => {
    const rows = [makeRow({ id: "c-1", referenceNo: "CONS-1" })];
    // Two pending: one 60h old (breaches 48h SLA), one 10h old
    const pending = [
      { c: { submittedAt: new Date(now.getTime() - 60 * 60 * 60 * 1000), createdAt: now } },
      { c: { submittedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000), createdAt: now } },
    ];
    // Two reviewed in last 7d: review times 2h and 4h → avg 3h
    const reviewed = [
      {
        submittedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        reviewedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 2h
      },
      {
        submittedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        reviewedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4h
      },
    ];

    queueListAndSla(rows, pending, reviewed);

    const res = await request(makeApp()).get("/api/admin/consignments");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      id: "c-1",
      referenceNo: "CONS-1",
      exporterName: "Ada Trading",
    });
    expect(res.body.sla).toMatchObject({
      pendingTotal: 2,
      pendingOverSla: 1,
      slaHours: 48,
      reviewedLast7d: 2,
    });
    expect(res.body.sla.oldestPendingHours).toBeCloseTo(60, 1);
    expect(res.body.sla.avgReviewHoursLast7d).toBeCloseTo(3, 1);
  });

  it("applies status and hub filters to the main list query (where clause carries both values)", async () => {
    queueListAndSla([makeRow()]);

    const res = await request(makeApp())
      .get("/api/admin/consignments")
      .query({ status: "Submitted", hub: "TEMA" });

    expect(res.status).toBe(200);

    // Three select calls expected: list + pending pool + recent reviewed
    const selects = state.ops.filter((o) => o.kind === "select");
    expect(selects.length).toBe(3);

    // The list query (first select) must have called .where(...) with a SQL
    // expression that bound BOTH the status and hub filter values.
    const listOp = selects[0];
    expect(listOp.whereArgs).toBeDefined();
    const values = collectSqlParamValues(listOp.whereArgs);
    expect(values).toContain("Submitted");
    expect(values).toContain("TEMA");

    // Pending pool (2nd select) is keyed on inArray of pending statuses, not
    // on the request's status filter — make sure the user's filter did NOT
    // leak into it.
    const pendingOp = selects[1];
    const pendingValues = collectSqlParamValues(pendingOp.whereArgs ?? []);
    expect(pendingValues).not.toContain("TEMA");
  });

  it("does not call .where on the list query when no filters are provided", async () => {
    queueListAndSla([makeRow()]);

    const res = await request(makeApp()).get("/api/admin/consignments");

    expect(res.status).toBe(200);
    const selects = state.ops.filter((o) => o.kind === "select");
    // Route always invokes .where(...) — but with `undefined` when no filters.
    expect(selects[0].whereArgs).toEqual([undefined]);
  });

  it("applies in-memory search filter across referenceNo and exporter name", async () => {
    const rows = [
      makeRow({
        id: "c-1",
        referenceNo: "CONS-AAA",
        u: { firstName: "Ada", lastName: "L", email: "ada@x.com", companyName: "Alpha Co" },
      }),
      makeRow({
        id: "c-2",
        referenceNo: "CONS-BBB",
        u: { firstName: "Bob", lastName: "K", email: "bob@x.com", companyName: "Beta Co" },
      }),
      makeRow({
        id: "c-3",
        referenceNo: "CONS-CCC",
        u: { firstName: "Cy", lastName: "M", email: "cy@x.com", companyName: "Alpha Holdings" },
      }),
    ];
    queueListAndSla(rows);

    const res = await request(makeApp())
      .get("/api/admin/consignments")
      .query({ search: "alpha" });

    expect(res.status).toBe(200);
    const refs = res.body.items.map((i: any) => i.referenceNo).sort();
    expect(refs).toEqual(["CONS-AAA", "CONS-CCC"]);
  });

  it("returns zeroed SLA summary when no pending and no recent reviews exist", async () => {
    queueListAndSla([], [], []);

    const res = await request(makeApp()).get("/api/admin/consignments");

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.sla).toMatchObject({
      pendingTotal: 0,
      pendingOverSla: 0,
      oldestPendingHours: 0,
      avgReviewHoursLast7d: 0,
      reviewedLast7d: 0,
    });
  });
});
