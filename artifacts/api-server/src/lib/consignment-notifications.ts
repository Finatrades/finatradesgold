import { eq } from "drizzle-orm";
import { db } from "../db";
import { consignments, notifications } from "../shared/schema";

type NotificationType = "info" | "success" | "warning" | "error" | "system";

interface StatusMeta {
  type: NotificationType;
  title: (ref: string) => string;
  body: (ref: string, commodity: string, note?: string) => string;
}

const STATUS_META: Record<string, StatusMeta> = {
  "Under Review": {
    type: "info",
    title: (ref) => `Consignment ${ref} is under review`,
    body: (ref, commodity) =>
      `Your ${commodity} consignment (${ref}) is now being reviewed by our compliance team.`,
  },
  Approved: {
    type: "success",
    title: (ref) => `Consignment ${ref} approved`,
    body: (ref, commodity) =>
      `Your ${commodity} consignment (${ref}) has been approved and is now live.`,
  },
  Rejected: {
    type: "error",
    title: (ref) => `Consignment ${ref} rejected`,
    body: (ref, commodity, note) =>
      `Your ${commodity} consignment (${ref}) was rejected.${note ? ` Reason: ${note}` : ""}`,
  },
  "Needs More Info": {
    type: "warning",
    title: (ref) => `Action needed on consignment ${ref}`,
    body: (ref, commodity, note) =>
      `Reviewers need more information on your ${commodity} consignment (${ref}).${note ? ` Note: ${note}` : ""}`,
  },
  "In Transit": {
    type: "info",
    title: (ref) => `Consignment ${ref} marked in transit`,
    body: (ref, commodity) =>
      `Your ${commodity} consignment (${ref}) is now in transit to the warehouse hub.`,
  },
  "At Warehouse": {
    type: "info",
    title: (ref) => `Consignment ${ref} arrived at warehouse`,
    body: (ref, commodity) =>
      `Your ${commodity} consignment (${ref}) has been received at the destination hub.`,
  },
  Verified: {
    type: "success",
    title: (ref) => `Consignment ${ref} verified at warehouse`,
    body: (ref, commodity) =>
      `Your ${commodity} consignment (${ref}) has been verified and is ready for trade.`,
  },
};

export async function notifyExporterOfStatusChange(
  consignmentId: string,
  newStatus: string,
  note?: string | null,
): Promise<void> {
  const meta = STATUS_META[newStatus];
  if (!meta) return; // unknown / non-user-facing status — skip

  const [c] = await db
    .select({
      userId: consignments.userId,
      referenceNo: consignments.referenceNo,
      commodityName: consignments.commodityName,
      id: consignments.id,
    })
    .from(consignments)
    .where(eq(consignments.id, consignmentId));

  if (!c || !c.userId) return;

  const ref = c.referenceNo ?? c.id.slice(0, 8);
  await db.insert(notifications).values({
    userId: c.userId,
    title: meta.title(ref),
    message: meta.body(ref, c.commodityName, note ?? undefined),
    type: meta.type,
    link: `/consignments/${c.id}`,
  } as any);
}
