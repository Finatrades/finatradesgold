import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import {
  useCaseMilestones,
  useConfirmGoodsReceived,
  useFundEscrow,
  useReleaseMilestone,
  useTradeCases,
  useWalletBalances,
  type CaseDisputeSummary,
  type MilestoneRow,
} from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function milestoneStatusColor(
  status: MilestoneRow["status"],
  colors: ReturnType<typeof useColors>,
): string {
  switch (status) {
    case "released":
      return colors.success;
    case "released_reserved":
      return colors.warning;
    case "disputed":
      return colors.destructive;
    case "pending":
    default:
      return colors.primary;
  }
}

function milestoneStatusLabel(status: MilestoneRow["status"]): string {
  switch (status) {
    case "released":
      return "Released";
    case "released_reserved":
      return "In dispute window";
    case "disputed":
      return "Disputed";
    case "pending":
      return "Pending";
    default:
      return status;
  }
}

export default function DealDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { user } = useAuth();
  const milestonesQ = useCaseMilestones(id);
  const balancesQ = useWalletBalances();
  const tradeCasesQ = useTradeCases(user?.id);
  const releaseM = useReleaseMilestone(id);
  const goodsReceivedM = useConfirmGoodsReceived(id);
  const fundEscrowM = useFundEscrow(id);

  const tradeCase = tradeCasesQ.data?.cases.find((c) => c.id === id);
  const escrowFunded = Boolean(tradeCase?.escrowFundedAt);
  const settlementAmountSet =
    typeof tradeCase?.settlementAmountCents === "number" && tradeCase.settlementAmountCents > 0;
  const [escrowAmount, setEscrowAmount] = useState("");

  const milestones = milestonesQ.data?.milestones ?? [];
  const disputes = milestonesQ.data?.disputes ?? [];
  const activeDispute = disputes.find(
    (d) => d.status !== "Resolved" && d.status !== "Closed",
  ) ?? disputes[0];
  const caseCurrency =
    tradeCase?.settlementCurrency || milestones[0]?.currency || "USD";
  const totalCents = milestones.reduce((s, m) => s + Number(m.amountCents || 0), 0);
  const releasedCents = milestones
    .filter((m) => m.status === "released")
    .reduce((s, m) => s + Number(m.amountCents || 0), 0);
  const reservedCents = milestones
    .filter((m) => m.status === "released_reserved")
    .reduce((s, m) => s + Number(m.amountCents || 0), 0);
  const pendingCents = totalCents - releasedCents - reservedCents;

  const escrowBalance = balancesQ.data?.balances.find((b) => b.currency === caseCurrency);

  const topPad = Platform.OS === "web" ? 24 : insets.top + 12;
  const onRefresh = () => {
    void milestonesQ.refetch();
    void balancesQ.refetch();
    void tradeCasesQ.refetch();
  };

  const handleFundEscrow = () => {
    if (fundEscrowM.isPending) return;
    const dollars = parseFloat(escrowAmount || "0");
    const hasInput = Number.isFinite(dollars) && dollars > 0;
    if (!settlementAmountSet && !hasInput) {
      Alert.alert(
        "Amount required",
        `Enter the settlement amount in ${caseCurrency} to fund escrow.`,
      );
      return;
    }
    const amountCents = hasInput ? Math.round(dollars * 100) : undefined;
    const displayCents = amountCents ?? tradeCase?.settlementAmountCents ?? 0;
    const run = () =>
      fundEscrowM.mutate(
        { amountCents },
        {
          onSuccess: () => {
            setEscrowAmount("");
            Alert.alert(
              "Escrow funded",
              `${formatMoney(displayCents, caseCurrency)} locked in escrow pending milestone releases.`,
            );
          },
          onError: (e: any) => {
            const msg =
              e?.message === "Insufficient balance to fund escrow"
                ? `Your ${caseCurrency} wallet does not have enough available balance.`
                : e?.message || "Could not fund escrow.";
            Alert.alert("Funding failed", msg);
          },
        },
      );
    if (Platform.OS === "web") return run();
    Alert.alert(
      "Fund escrow?",
      `${formatMoney(displayCents, caseCurrency)} will be locked from your ${caseCurrency} wallet until milestones are released.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Fund", onPress: run },
      ],
    );
  };

  const handleRelease = (m: MilestoneRow) => {
    if (releaseM.isPending) return;
    const doRelease = (reason: string) => {
      releaseM.mutate(
        { milestoneId: m.id, reason },
        {
          onSuccess: () => Alert.alert("Milestone released", `${m.label} approved.`),
          onError: (e: any) =>
            Alert.alert("Release failed", e?.message || "Could not release milestone."),
        },
      );
    };
    if (Platform.OS === "web") {
      doRelease("Importer approved on mobile");
      return;
    }
    Alert.alert(
      `Release ${m.label}?`,
      `This will move ${formatMoney(m.amountCents, m.currency)} from escrow to the exporter.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Release", style: "destructive", onPress: () => doRelease("Importer approved on mobile") },
      ],
    );
  };

  const handleGoodsReceived = () => {
    if (goodsReceivedM.isPending) return;
    const run = () =>
      goodsReceivedM.mutate(undefined, {
        onSuccess: (data: any) => {
          const n = Array.isArray(data?.released) ? data.released.length : 0;
          Alert.alert(
            "Delivery confirmed",
            n > 0
              ? `${n} milestone${n === 1 ? "" : "s"} released to the dispute-window reserve.`
              : "Delivery recorded.",
          );
        },
        onError: (e: any) =>
          Alert.alert("Confirm failed", e?.message || "Could not confirm delivery."),
      });
    if (Platform.OS === "web") return run();
    Alert.alert(
      "Confirm goods received?",
      "This fires the goods-received milestone trigger. Funds enter the 30-day dispute window.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: run },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/deals" as any))}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          <Text style={[styles.backTxt, { color: colors.foreground }]}>Back</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={milestonesQ.isRefetching || balancesQ.isRefetching}
            onRefresh={onRefresh}
          />
        }
      >
        <View
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Trade case</Text>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
            {id?.slice(0, 8).toUpperCase()}
          </Text>

          <View style={styles.summaryGrid}>
            <SummaryCell
              label="Total"
              value={formatMoney(totalCents, caseCurrency)}
              colors={colors}
            />
            <SummaryCell
              label="Released"
              value={formatMoney(releasedCents, caseCurrency)}
              accent={colors.success}
              colors={colors}
            />
            <SummaryCell
              label="Reserved"
              value={formatMoney(reservedCents, caseCurrency)}
              accent={colors.warning}
              colors={colors}
            />
            <SummaryCell
              label="Pending"
              value={formatMoney(pendingCents, caseCurrency)}
              accent={colors.primary}
              colors={colors}
            />
          </View>

          {escrowBalance ? (
            <View
              style={[
                styles.escrowRow,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <Ionicons name="lock-closed" size={16} color={colors.warning} />
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                Your {caseCurrency} wallet:{" "}
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                  {formatMoney(escrowBalance.availableCents, caseCurrency)} available
                </Text>
                {"  • "}
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                  {formatMoney(escrowBalance.lockedCents, caseCurrency)} locked
                </Text>
              </Text>
            </View>
          ) : null}
        </View>

        {tradeCase && !escrowFunded ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fund escrow</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 12 }}>
              {settlementAmountSet
                ? `Lock ${formatMoney(tradeCase.settlementAmountCents ?? 0, caseCurrency)} from your ${caseCurrency} wallet so milestones can be released to the exporter.`
                : `No settlement amount on file yet. Enter the amount in ${caseCurrency} to fund escrow.`}
            </Text>

            {!settlementAmountSet ? (
              <View style={styles.amountRow}>
                <Text style={[styles.currencyPrefix, { color: colors.mutedForeground }]}>
                  {caseCurrency}
                </Text>
                <TextInput
                  value={escrowAmount}
                  onChangeText={setEscrowAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  editable={!fundEscrowM.isPending}
                  style={[
                    styles.amountInput,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                />
              </View>
            ) : null}

            <Pressable
              onPress={handleFundEscrow}
              disabled={fundEscrowM.isPending}
              style={({ pressed }) => [
                styles.fundBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed || fundEscrowM.isPending ? 0.7 : 1,
                },
              ]}
            >
              {fundEscrowM.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={16} color={colors.primaryForeground} />
                  <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
                    Fund escrow
                  </Text>
                </>
              )}
            </Pressable>
            <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
              Funding is idempotent — repeated taps for the same case will not double-lock funds.
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Milestones</Text>

          {milestonesQ.isLoading ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : milestonesQ.error ? (
            <Text style={{ color: colors.destructive }}>
              {(milestonesQ.error as Error).message}
            </Text>
          ) : milestones.length === 0 ? (
            <Text style={{ color: colors.mutedForeground }}>
              No milestone schedule set on this case yet. Set it from the web app.
            </Text>
          ) : (
            milestones.map((m) => {
              const c = milestoneStatusColor(m.status, colors);
              const canRelease = m.status === "pending";
              const showHistory =
                (m.status === "released" || m.status === "released_reserved") &&
                (m.releasedAt || m.releaseReason || m.releasedByFtId);
              return (
                <View key={m.id} style={styles.milestoneRow}>
                  <View style={[styles.seqBadge, { backgroundColor: c + "20" }]}>
                    <Text style={{ color: c, fontWeight: "700" }}>{m.sequence}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: "600" }}>{m.label}</Text>
                    <View style={styles.milestoneMeta}>
                      <View
                        style={[styles.statusDot, { backgroundColor: c }]}
                      />
                      <Text style={{ color: c, fontSize: 12, fontWeight: "600" }}>
                        {milestoneStatusLabel(m.status)}
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                        • {Number(m.percent).toFixed(0)}% • {m.trigger.replace(/_/g, " ")}
                      </Text>
                    </View>
                    <Text style={{ color: colors.foreground, fontWeight: "700", marginTop: 4 }}>
                      {formatMoney(m.amountCents, m.currency)}
                    </Text>
                    {showHistory ? (
                      <View
                        style={[
                          styles.historyBlock,
                          { backgroundColor: colors.muted, borderColor: colors.border },
                        ]}
                      >
                        {m.releasedAt ? (
                          <View style={styles.historyLine}>
                            <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
                            <Text style={[styles.historyText, { color: colors.mutedForeground }]}>
                              Released {formatDateTime(m.releasedAt)}
                            </Text>
                          </View>
                        ) : null}
                        {m.releasedByFtId ? (
                          <View style={styles.historyLine}>
                            <Ionicons name="person-outline" size={12} color={colors.mutedForeground} />
                            <Text style={[styles.historyText, { color: colors.mutedForeground }]}>
                              By{" "}
                              <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                                {m.releasedByFtId}
                              </Text>
                            </Text>
                          </View>
                        ) : null}
                        {m.releaseReason ? (
                          <View style={styles.historyLine}>
                            <Ionicons
                              name="chatbubble-ellipses-outline"
                              size={12}
                              color={colors.mutedForeground}
                            />
                            <Text style={[styles.historyText, { color: colors.foreground }]}>
                              {m.releaseReason}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    {m.status === "disputed" && activeDispute ? (
                      <DisputeSummary dispute={activeDispute} colors={colors} />
                    ) : null}
                  </View>
                  {canRelease ? (
                    <Pressable
                      onPress={() => handleRelease(m)}
                      disabled={releaseM.isPending}
                      style={({ pressed }) => [
                        styles.approveBtn,
                        {
                          backgroundColor: colors.primary,
                          opacity: pressed || releaseM.isPending ? 0.7 : 1,
                        },
                      ]}
                    >
                      {releaseM.isPending ? (
                        <ActivityIndicator color={colors.primaryForeground} size="small" />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={colors.primaryForeground}
                          />
                          <Text
                            style={{ color: colors.primaryForeground, fontWeight: "700", fontSize: 13 }}
                          >
                            Approve
                          </Text>
                        </>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}

          {milestones.some((m) => m.trigger === "goods_received" && m.status === "pending") ? (
            <Pressable
              onPress={handleGoodsReceived}
              disabled={goodsReceivedM.isPending}
              style={({ pressed }) => [
                styles.goodsBtn,
                {
                  backgroundColor: colors.success,
                  opacity: pressed || goodsReceivedM.isPending ? 0.7 : 1,
                },
              ]}
            >
              {goodsReceivedM.isPending ? (
                <ActivityIndicator color={colors.successForeground} size="small" />
              ) : (
                <>
                  <Ionicons name="cube" size={16} color={colors.successForeground} />
                  <Text style={{ color: colors.successForeground, fontWeight: "700" }}>
                    Confirm goods received
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}

          <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
            Only the importer or an admin can approve a milestone release. Approvals are
            idempotent and apply the same release rules as the web app.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function DisputeSummary({
  dispute,
  colors,
}: {
  dispute: CaseDisputeSummary;
  colors: ReturnType<typeof useColors>;
}) {
  const isResolved = !!dispute.resolvedAt || dispute.status === "Resolved" || dispute.status === "Closed";
  return (
    <View
      style={[
        styles.disputeBlock,
        { backgroundColor: colors.muted, borderColor: colors.destructive },
      ]}
    >
      <View style={styles.historyLine}>
        <Ionicons name="alert-circle" size={14} color={colors.destructive} />
        <Text style={{ color: colors.destructive, fontWeight: "700", fontSize: 12 }}>
          Dispute {dispute.disputeRefId}
        </Text>
        <Text style={[styles.historyText, { color: colors.mutedForeground }]}>
          • {dispute.status}
        </Text>
      </View>
      <Text style={[styles.historyText, { color: colors.foreground, marginTop: 4 }]}>
        {dispute.subject}
      </Text>
      <Text style={[styles.historyText, { color: colors.mutedForeground, marginTop: 2 }]}>
        Type: {dispute.disputeType.replace(/_/g, " ")}
      </Text>
      {dispute.raisedByFtId ? (
        <Text style={[styles.historyText, { color: colors.mutedForeground, marginTop: 2 }]}>
          Raised by{" "}
          <Text style={{ color: colors.foreground, fontWeight: "600" }}>
            {dispute.raisedByFtId}
          </Text>{" "}
          ({dispute.raisedByRole}) on {formatDateTime(dispute.createdAt)}
        </Text>
      ) : (
        <Text style={[styles.historyText, { color: colors.mutedForeground, marginTop: 2 }]}>
          Opened {formatDateTime(dispute.createdAt)}
        </Text>
      )}
      {isResolved ? (
        <Text style={[styles.historyText, { color: colors.mutedForeground, marginTop: 2 }]}>
          Resolved {formatDateTime(dispute.resolvedAt)}
          {dispute.decision ? ` — ${dispute.decision.replace(/_/g, " ")}` : ""}
        </Text>
      ) : null}
    </View>
  );
}

function SummaryCell({
  label,
  value,
  accent,
  colors,
}: {
  label: string;
  value: string;
  accent?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.summaryCell, { borderColor: colors.border }]}>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: accent || colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingBottom: 8 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 6 },
  backTxt: { fontSize: 16, fontWeight: "500" },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  cardLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  cardTitle: { fontSize: 22, fontWeight: "700", marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  summaryCell: {
    flexGrow: 1,
    flexBasis: "47%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  summaryLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  escrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(127,127,127,0.25)",
  },
  seqBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 90,
    justifyContent: "center",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  currencyPrefix: {
    fontSize: 12,
    fontWeight: "600",
    minWidth: 36,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  fundBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  goodsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  footnote: { fontSize: 11, marginTop: 14, lineHeight: 16 },
  historyBlock: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  historyLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  historyText: { fontSize: 12, flexShrink: 1 },
  disputeBlock: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});
