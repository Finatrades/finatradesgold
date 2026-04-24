import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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

const GRAMS_PER_TROY_OZ = 31.1035;
const gramsToOz = (g: number) => g / GRAMS_PER_TROY_OZ;

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  active:    { color: "#10b981", icon: "checkmark-circle",      label: "Active"    },
  pending:   { color: "#f59e0b", icon: "time",                  label: "Pending"   },
  expired:   { color: "#6b7280", icon: "alert-circle",          label: "Expired"   },
  redeemed:  { color: "#8A2BE2", icon: "checkmark-done-circle", label: "Redeemed"  },
  suspended: { color: "#ef4444", icon: "close-circle",          label: "Suspended" },
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
  const totalActiveOz = active.reduce((s, c) => s + gramsToOz(parseFloat(c.goldGrams || "0")), 0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={[...active, ...others]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.gold}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.pageHeader}>
              <View>
                <Text style={[styles.pageTitle, { color: colors.foreground }]}>Gold Certificates</Text>
                <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
                  LBMA-backed ownership records
                </Text>
              </View>
              <View style={[styles.certCount, { backgroundColor: colors.gold + "18", borderColor: colors.gold + "35" }]}>
                <Text style={[styles.certCountNum, { color: colors.gold }]}>{certs.length}</Text>
                <Text style={[styles.certCountLabel, { color: colors.gold }]}>Total</Text>
              </View>
            </View>

            {certs.length > 0 && (
              <LinearGradient
                colors={[colors.goldDark, "#C9A227", "#A67C00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.summaryCard}
              >
                <View style={styles.summaryRow}>
                  <View style={styles.summaryBlock}>
                    <Text style={styles.summaryLabel}>Active Certificates</Text>
                    <Text style={styles.summaryValue}>{active.length}</Text>
                  </View>
                  <View style={styles.summaryDiv} />
                  <View style={styles.summaryBlock}>
                    <Text style={styles.summaryLabel}>Total Active Gold</Text>
                    <Text style={styles.summaryValue}>{totalActiveOz.toFixed(4)} oz t</Text>
                  </View>
                  <View style={styles.summaryDiv} />
                  <View style={styles.summaryBlock}>
                    <Text style={styles.summaryLabel}>Backing</Text>
                    <Text style={[styles.summaryValue, { color: "#1a1a1a" }]}>100%</Text>
                  </View>
                </View>
              </LinearGradient>
            )}

            {certs.length > 0 && (
              <Text style={[styles.listLabel, { color: colors.mutedForeground }]}>
                {active.length} ACTIVE · {others.length} OTHER
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="certificate-outline" size={52} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Certificates Issued</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Purchase GODE tokens to receive your LBMA-backed gold certificates.
            </Text>
            <View style={[styles.emptyInfo, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
              <Text style={[styles.emptyInfoTxt, { color: colors.primary }]}>
                Min. purchase: 0.01 GODE (~$20)
              </Text>
            </View>
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
  const oz = gramsToOz(grams);
  const isActive = cert.status === "active";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.certCard,
        {
          backgroundColor: colors.card,
          borderColor: isActive ? colors.gold + "45" : colors.border,
          marginHorizontal: 20,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      testID={`card-certificate-${cert.id}`}
    >
      {isActive && (
        <View style={[styles.activeStripe, { backgroundColor: colors.gold }]} />
      )}

      <View style={styles.certHead}>
        <LinearGradient
          colors={isActive ? [colors.goldDark, colors.gold] : [colors.muted, colors.muted]}
          style={styles.certIconBox}
        >
          <MaterialCommunityIcons
            name="certificate"
            size={22}
            color={isActive ? "rgba(0,0,0,0.7)" : colors.mutedForeground}
          />
        </LinearGradient>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.certNum, { color: colors.foreground }]} numberOfLines={1}>
            {cert.certificateNumber}
          </Text>
          <Text style={[styles.certDate, { color: colors.mutedForeground }]}>
            Issued {new Date(cert.createdAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: status.color + "18" }]}>
          <Ionicons name={status.icon as any} size={11} color={status.color} />
          <Text style={[styles.statusTxt, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.certBody}>
        <MetaBlock label="Troy Ounces" value={`${oz.toFixed(5)} oz t`} accent={isActive ? colors.gold : colors.foreground} colors={colors} />
        <MetaBlock label="Weight (grams)" value={`${grams.toFixed(4)} g`} colors={colors} />
        {cert.denomination && (
          <MetaBlock label="Denomination" value={cert.denomination} colors={colors} />
        )}
        {cert.expiryDate && (
          <MetaBlock label="Expiry" value={new Date(cert.expiryDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })} colors={colors} />
        )}
      </View>

      <View style={[styles.certFooter, { borderTopColor: colors.border }]}>
        <View style={styles.certFooterLeft}>
          <MaterialCommunityIcons name="gold" size={10} color={colors.gold} />
          <Text style={[styles.certFooterTxt, { color: colors.mutedForeground }]}>
            LBMA 995.0 · DMCC Dubai Vault
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={13} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

function MetaBlock({ label, value, accent, colors }: { label: string; value: string; accent?: string; colors: any }) {
  return (
    <View style={styles.metaBlock}>
      <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: accent || colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  pageSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  certCount: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  certCountNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  certCountLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  summaryCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryBlock: { flex: 1, alignItems: "center" },
  summaryDiv: { width: 1, height: 32, backgroundColor: "rgba(0,0,0,0.15)" },
  summaryLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: "rgba(0,0,0,0.45)", letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: "rgba(0,0,0,0.8)" },
  listLabel: {
    paddingHorizontal: 22,
    marginBottom: 10,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.7,
  },
  certCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  activeStripe: { height: 3, width: "100%" },
  certHead: { flexDirection: "row", alignItems: "center", padding: 16 },
  certIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  certNum: { fontSize: 14, fontFamily: "Inter_700Bold" },
  certDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusTxt: { fontSize: 10, fontFamily: "Inter_700Bold" },
  divider: { height: 1, marginHorizontal: 16 },
  certBody: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 14,
  },
  metaBlock: { minWidth: "42%", flex: 1 },
  metaLabel: { fontSize: 10, fontFamily: "Inter_400Regular", letterSpacing: 0.3, marginBottom: 3 },
  metaValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  certFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  certFooterLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
  certFooterTxt: { fontSize: 10, fontFamily: "Inter_400Regular" },
  emptyState: {
    margin: 20,
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  emptyInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    marginTop: 4,
  },
  emptyInfoTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
