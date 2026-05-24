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
const queueEmailWithTemplateMock = vi.fn(async () => {});
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
