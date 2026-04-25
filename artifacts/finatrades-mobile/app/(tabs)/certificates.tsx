import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

import { useAuth } from "@/context/AuthContext";
import { useCertificates } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  active: { color: "#10b981", icon: "checkmark-circle", label: "Active" },
  pending: { color: "#f59e0b", icon: "time", label: "Pending" },
  expired: { color: "#6b7280", icon: "alert-circle", label: "Expired" },
  redeemed: { color: "#8A2BE2", icon: "checkmark-done-circle", label: "Redeemed" },
  suspended: { color: "#ef4444", icon: "close-circle", label: "Suspended" },
};

interface Certificate {
  id: string;
  certificateNumber: string;
  goldGrams: string;
  status: string;
  createdAt: string;
  denomination?: string;
  expiryDate?: string;
}

export default function CertificatesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useCertificates(user?.id);

  const onRefresh = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
  }, [refetch]);

  const certs: Certificate[] = data?.certificates || [];
  const active = certs.filter((c) => c.status === "active");
  const others = certs.filter((c) => c.status !== "active");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={[...active, ...others]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 16 }}
        scrollEnabled={!!certs.length}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Certificates</Text>
            <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
              {active.length} active · {certs.length} total
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="certificate-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No Certificates Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Your gold certificates will appear here once issued.
            </Text>
          </View>
        }
        renderItem={({ item }) => <CertCard cert={item} colors={colors} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

function CertCard({ cert, colors }: { cert: Certificate; colors: any }) {
  const status = STATUS_CONFIG[cert.status] || STATUS_CONFIG.pending;
  const grams = parseFloat(cert.goldGrams || "0");

  return (
    <Pressable
      style={({ pressed }) => [
        styles.certCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          marginHorizontal: 20,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      testID={`card-certificate-${cert.id}`}
    >
      <View style={styles.certHeader}>
        <View style={[styles.certIcon, { backgroundColor: colors.gold + "20" }]}>
          <MaterialCommunityIcons name="certificate" size={24} color={colors.gold} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.certNumber, { color: colors.foreground }]}>
            {cert.certificateNumber}
          </Text>
          <Text style={[styles.certDate, { color: colors.mutedForeground }]}>
            {new Date(cert.createdAt).toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.color + "20" }]}>
          <Ionicons name={status.icon as any} size={12} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.certDetails}>
        <View style={styles.certDetail}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Gold Weight</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>
            {grams.toFixed(4)}g
          </Text>
        </View>
        {cert.denomination && (
          <View style={styles.certDetail}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Denomination</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {cert.denomination}
            </Text>
          </View>
        )}
        {cert.expiryDate && (
          <View style={styles.certDetail}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Expiry</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {new Date(cert.expiryDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  pageHeader: { paddingHorizontal: 20, marginBottom: 20 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  pageSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  certCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  certHeader: { flexDirection: "row", alignItems: "center" },
  certIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  certNumber: { fontSize: 14, fontFamily: "Inter_700Bold" },
  certDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginVertical: 12 },
  certDetails: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  certDetail: { flex: 1, minWidth: "40%" },
  detailLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  detailValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  emptyState: {
    margin: 20,
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
