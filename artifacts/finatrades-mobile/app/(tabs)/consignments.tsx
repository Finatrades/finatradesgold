import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback } from "react";
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

import { useColors } from "@/hooks/useColors";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = domain ? `https://${domain}` : "";

type ConsignmentRow = {
  id: string;
  referenceNo?: string | null;
  commodityName: string;
  commodityCategory?: string | null;
  status: string;
  quantity?: number | string | null;
  unit?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  submittedAt?: string | null;
};

async function fetchConsignments(): Promise<ConsignmentRow[]> {
  const res = await fetch(`${API_BASE}/api/b2b/consignments`, {
    credentials: "include",
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `HTTP ${res.status}`);
  }
  return res.json();
}

function statusColor(status: string, colors: ReturnType<typeof useColors>): string {
  switch (status) {
    case "Approved":
    case "Verified":
      return colors.success;
    case "Rejected":
      return colors.destructive;
    case "Needs More Info":
      return colors.warning;
    default:
      return colors.primary;
  }
}

function formatWhen(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function ConsignmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["consignments", "mine"],
    queryFn: fetchConsignments,
  });

  const topPadding = Platform.OS === "web" ? 24 : insets.top + 12;
  const bottomPadding = Platform.OS === "web" ? 80 : insets.bottom + 96;

  const renderItem = useCallback(
    ({ item }: { item: ConsignmentRow }) => {
      const pillColor = statusColor(item.status, colors);
      const when = formatWhen(item.updatedAt || item.submittedAt || item.createdAt);
      return (
        <Pressable
          onPress={() => router.push(`/consignments/${item.id}`)}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          testID={`row-consignment-${item.id}`}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.ref, { color: colors.mutedForeground }]}>
              {item.referenceNo ?? item.id.slice(0, 8).toUpperCase()}
            </Text>
            <Text style={[styles.commodity, { color: colors.foreground }]} numberOfLines={1}>
              {item.commodityName}
            </Text>
            <View style={styles.metaRow}>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: pillColor + "20" },
                ]}
              >
                <View style={[styles.statusDot, { backgroundColor: pillColor }]} />
                <Text style={{ color: pillColor, fontWeight: "600", fontSize: 12 }}>
                  {item.status}
                </Text>
              </View>
              {when ? (
                <Text style={[styles.when, { color: colors.mutedForeground }]}>{when}</Text>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </Pressable>
      );
    },
    [colors],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Consignments</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Your submitted consignments
        </Text>
      </View>

      {isLoading ? (
        <View style={{ paddingVertical: 64, alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={{ padding: 20 }}>
          <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.destructive, fontWeight: "600" }}>
              Unable to load consignments
            </Text>
            <Text style={{ color: colors.mutedForeground, marginTop: 6 }}>
              {(error as Error).message}
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: bottomPadding,
            paddingTop: 8,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="cube-outline" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No consignments yet
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  ref: { fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  commodity: { fontSize: 16, fontWeight: "600", marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  when: { fontSize: 12 },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  errorCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
});
