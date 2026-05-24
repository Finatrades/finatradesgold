import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useTradeCases, type TradeCaseRow } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";

function statusColor(status: string, colors: ReturnType<typeof useColors>): string {
  switch (status) {
    case "Approved":
    case "Active":
    case "Completed":
      return colors.success;
    case "Rejected":
    case "Cancelled":
      return colors.destructive;
    case "Pending":
    case "Under Review":
      return colors.warning;
    default:
      return colors.primary;
  }
}

function formatMoney(cents: number | null | undefined, currency: string | null | undefined, fallback: string): string {
  if (cents != null && currency) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
    } catch {
      return `${currency} ${(cents / 100).toFixed(2)}`;
    }
  }
  return fallback;
}

export default function DealsListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data, isLoading, error, refetch, isRefetching } = useTradeCases(user?.id);

  const cases = data?.cases ?? [];
  const topPad = Platform.OS === "web" ? 24 : insets.top + 12;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          <Text style={[styles.backTxt, { color: colors.foreground }]}>Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Trade Finance</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Your trade cases, escrow & milestone releases
        </Text>
      </View>

      {isLoading ? (
        <View style={{ paddingVertical: 64, alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View
          style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border, margin: 16 }]}
        >
          <Text style={{ color: colors.destructive, fontWeight: "600" }}>Unable to load trade cases</Text>
          <Text style={{ color: colors.mutedForeground, marginTop: 6 }}>{(error as Error).message}</Text>
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View
              style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="briefcase-outline" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No trade cases yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Trade cases you open on the web will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => <DealRow row={item} colors={colors} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

function DealRow({ row, colors }: { row: TradeCaseRow; colors: ReturnType<typeof useColors> }) {
  const fallback = row.tradeValueUsd != null ? `$${Number(row.tradeValueUsd).toLocaleString()}` : "—";
  const amount = formatMoney(row.settlementAmountCents ?? null, row.settlementCurrency ?? null, fallback);
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/deals/[id]" as any, params: { id: row.id } })}
      style={({ pressed }) => [
        styles.dealCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.dealRef, { color: colors.mutedForeground }]}>
          {row.caseNumber || row.id.slice(0, 8).toUpperCase()}
        </Text>
        <Text style={[styles.dealTitle, { color: colors.foreground }]} numberOfLines={1}>
          {row.commodityType || row.companyName || "Trade case"}
        </Text>
        <View style={styles.dealMeta}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusColor(row.status, colors) + "20" },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusColor(row.status, colors) }]}
            />
            <Text style={{ color: statusColor(row.status, colors), fontWeight: "600", fontSize: 12 }}>
              {row.status}
            </Text>
          </View>
          {row.escrowFundedAt ? (
            <View style={[styles.escrowPill, { backgroundColor: colors.success + "20" }]}>
              <Ionicons name="lock-closed" size={11} color={colors.success} />
              <Text style={{ color: colors.success, fontWeight: "600", fontSize: 11 }}>Escrow funded</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.amount, { color: colors.foreground }]}>{amount}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} style={{ marginTop: 6 }} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 6 },
  backTxt: { fontSize: 16, fontWeight: "500" },
  title: { fontSize: 26, fontWeight: "700", marginTop: 8 },
  subtitle: { fontSize: 13, marginTop: 4 },
  dealCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  dealRef: { fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  dealTitle: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  dealMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  escrowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  amount: { fontSize: 15, fontWeight: "700" },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center" },
  errorCard: { borderWidth: 1, borderRadius: 14, padding: 16 },
});
