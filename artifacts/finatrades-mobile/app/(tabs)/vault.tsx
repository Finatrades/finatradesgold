import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useDualWalletBalance, useGoldPrice, useWallet } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";

const GRAMS_PER_TROY_OZ = 31.1035;
const gramsToOz = (g: number) => g / GRAMS_PER_TROY_OZ;

export default function VaultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: wallet, isLoading, refetch, isRefetching } = useWallet(user?.id);
  const { data: dualWallet } = useDualWalletBalance(user?.id);
  const { data: goldPrice } = useGoldPrice();

  const onRefresh = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
  }, [refetch]);

  const pricePerGram = goldPrice?.pricePerGram || 0;
  const pricePerOz = goldPrice?.pricePerOunce || pricePerGram * GRAMS_PER_TROY_OZ || 0;
  const totalGrams = parseFloat(wallet?.goldGrams || "0");
  const totalOz = gramsToOz(totalGrams);
  const totalUsd = (totalGrams * pricePerGram);

  const mpgwGrams = dualWallet?.mpgw?.availableGrams || 0;
  const fpgwGrams = dualWallet?.fpgw?.availableGrams || 0;
  const totalAllocGrams = mpgwGrams + fpgwGrams;
  const mpgwPct = totalAllocGrams > 0 ? (mpgwGrams / totalAllocGrams) * 100 : 50;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 16 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={colors.gold}
        />
      }
    >
      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>FinaVault</Text>
        <View style={[styles.lbmaBadge, { backgroundColor: colors.gold + "18", borderColor: colors.gold + "35" }]}>
          <MaterialCommunityIcons name="gold" size={11} color={colors.gold} />
          <Text style={[styles.lbmaTxt, { color: colors.gold }]}>LBMA Good Delivery</Text>
        </View>
      </View>

      <LinearGradient
        colors={[colors.goldDark, "#C9A227", "#B8860B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.goldCard}
      >
        <View style={styles.goldCardTop}>
          <View style={styles.goldCardLabel}>
            <MaterialCommunityIcons name="gold" size={16} color="rgba(0,0,0,0.55)" />
            <Text style={styles.goldCardLabelTxt}>Total Gold Holdings</Text>
          </View>
          <View style={styles.auBadge}>
            <Text style={styles.auTxt}>Au 999.9</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color="rgba(0,0,0,0.5)" size="large" style={{ marginVertical: 12 }} />
        ) : (
          <>
            <View style={styles.ozRow}>
              <Text style={styles.ozBig}>{totalOz.toFixed(5)}</Text>
              <Text style={styles.ozUnit}> oz t</Text>
            </View>
            <Text style={styles.gramsEquiv}>{totalGrams.toFixed(4)} grams</Text>
            <Text style={styles.usdValue}>
              ${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </Text>
          </>
        )}

        <View style={styles.goldCardFooter}>
          <View style={styles.goldCardStat}>
            <Text style={styles.goldStatLabel}>Spot (XAU/USD)</Text>
            <Text style={styles.goldStatVal}>${pricePerOz > 0 ? pricePerOz.toFixed(2) : "—"}/oz</Text>
          </View>
          <View style={styles.goldCardStatDiv} />
          <View style={styles.goldCardStat}>
            <Text style={styles.goldStatLabel}>Per Gram</Text>
            <Text style={styles.goldStatVal}>${pricePerGram > 0 ? pricePerGram.toFixed(2) : "—"}/g</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Vault Allocation</Text>

        <AllocationCard
          title="Market Price Gold Wallet"
          abbr="MPGW"
          subtitle="Live LBMA spot pricing"
          grams={mpgwGrams}
          pricePerGram={pricePerGram}
          icon="trending-up"
          accent={colors.success}
          pct={mpgwPct}
          colors={colors}
          isLoading={isLoading}
        />

        <AllocationCard
          title="Fixed Price Gold Wallet"
          abbr="FPGW"
          subtitle="Locked-in rate at purchase"
          grams={fpgwGrams}
          pricePerGram={pricePerGram}
          icon="lock-closed"
          accent={colors.primary}
          pct={100 - mpgwPct}
          colors={colors}
          isLoading={isLoading}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Custody & Security</Text>

        <View style={[styles.custodyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.custodyRow}>
            <View style={[styles.custodyIcon, { backgroundColor: colors.gold + "18" }]}>
              <Ionicons name="business" size={18} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.custodyTitle, { color: colors.foreground }]}>Primary Vault · DMCC Dubai</Text>
              <Text style={[styles.custodySub, { color: colors.mutedForeground }]}>
                Dubai Multi Commodities Centre · DGCX Integrated
              </Text>
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: colors.success + "18" }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            </View>
          </View>
        </View>

        {[
          { name: "Brink's Global Services", type: "Armored Logistics", icon: "shield" },
          { name: "Malca-Amit", type: "Precious Metals Custody", icon: "lock-closed" },
          { name: "Lloyd's of London", type: "Insurance Underwriter · 110% Coverage", icon: "umbrella" },
        ].map((c) => (
          <View key={c.name} style={[styles.partnerRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.partnerDot, { backgroundColor: colors.primary + "25" }]}>
              <Ionicons name={c.icon as any} size={14} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.partnerName, { color: colors.foreground }]}>{c.name}</Text>
              <Text style={[styles.partnerType, { color: colors.mutedForeground }]}>{c.type}</Text>
            </View>
            <Ionicons name="checkmark" size={14} color={colors.success} />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Audit & Compliance</Text>
        <View style={[styles.auditCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { freq: "Daily", desc: "Internal reconciliation", icon: "refresh-circle" },
            { freq: "Monthly", desc: "Third-party verification", icon: "document-text" },
            { freq: "Quarterly", desc: "Full physical audit", icon: "cube" },
            { freq: "Annual", desc: "Big 4 firm review", icon: "ribbon" },
          ].map((a, i, arr) => (
            <View key={a.freq}>
              <View style={styles.auditRow}>
                <View style={[styles.auditFreqBox, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.auditFreq, { color: colors.primary }]}>{a.freq}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.auditDesc, { color: colors.foreground }]}>{a.desc}</Text>
                </View>
                <Ionicons name={a.icon as any} size={16} color={colors.gold} />
              </View>
              {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.regulationCard, { backgroundColor: "#0D0622", borderColor: colors.purple + "40" }]}>
        <Ionicons name="shield-checkmark" size={18} color="#8A2BE2" />
        <View style={{ flex: 1 }}>
          <Text style={styles.regTitle}>FINMA Regulated</Text>
          <Text style={styles.regSub}>Swiss Financial Market Supervisory Authority · Full KYC/AML compliance</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function AllocationCard({
  title, abbr, subtitle, grams, pricePerGram, icon, accent, pct, colors, isLoading,
}: {
  title: string; abbr: string; subtitle: string; grams: number; pricePerGram: number;
  icon: string; accent: string; pct: number; colors: any; isLoading: boolean;
}) {
  const oz = gramsToOz(grams);
  const usd = (grams * pricePerGram);
  return (
    <View style={[styles.allocCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.allocTop}>
        <View style={[styles.allocIcon, { backgroundColor: accent + "18" }]}>
          <Ionicons name={icon as any} size={20} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.allocTitleRow}>
            <Text style={[styles.allocTitle, { color: colors.foreground }]}>{title}</Text>
            <View style={[styles.allocAbbr, { backgroundColor: accent + "18" }]}>
              <Text style={[styles.allocAbbrTxt, { color: accent }]}>{abbr}</Text>
            </View>
          </View>
          <Text style={[styles.allocSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
        </View>
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={accent} style={{ marginTop: 12 }} />
      ) : (
        <>
          <View style={styles.allocAmounts}>
            <View>
              <Text style={[styles.allocOz, { color: accent }]}>{oz.toFixed(5)} oz t</Text>
              <Text style={[styles.allocGrams, { color: colors.mutedForeground }]}>{Number(grams).toFixed(4)} g</Text>
            </View>
            <Text style={[styles.allocUsd, { color: colors.foreground }]}>
              ${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={[styles.barBg, { backgroundColor: colors.border }]}>
            <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: accent }]} />
          </View>
          <Text style={[styles.barPct, { color: colors.mutedForeground }]}>{pct.toFixed(1)}% of vault</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  lbmaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  lbmaTxt: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  goldCard: {
    marginHorizontal: 20,
    borderRadius: 22,
    padding: 22,
    marginBottom: 28,
  },
  goldCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  goldCardLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  goldCardLabelTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(0,0,0,0.55)", letterSpacing: 0.3 },
  auBadge: { backgroundColor: "rgba(0,0,0,0.12)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  auTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: "rgba(0,0,0,0.6)", letterSpacing: 0.5 },
  ozRow: { flexDirection: "row", alignItems: "flex-end" },
  ozBig: { fontSize: 42, fontFamily: "Inter_700Bold", color: "rgba(0,0,0,0.85)", letterSpacing: -1 },
  ozUnit: { fontSize: 16, fontFamily: "Inter_400Regular", color: "rgba(0,0,0,0.5)", marginBottom: 6 },
  gramsEquiv: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(0,0,0,0.45)", marginTop: 2 },
  usdValue: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: "rgba(0,0,0,0.75)", marginTop: 6 },
  goldCardFooter: {
    flexDirection: "row",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.12)",
  },
  goldCardStat: { flex: 1, alignItems: "center" },
  goldCardStatDiv: { width: 1, backgroundColor: "rgba(0,0,0,0.12)" },
  goldStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(0,0,0,0.45)", letterSpacing: 0.3 },
  goldStatVal: { fontSize: 13, fontFamily: "Inter_700Bold", color: "rgba(0,0,0,0.75)", marginTop: 2 },
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  allocCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10 },
  allocTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  allocIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  allocTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  allocTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  allocAbbr: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  allocAbbrTxt: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  allocSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3 },
  allocAmounts: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  allocOz: { fontSize: 16, fontFamily: "Inter_700Bold" },
  allocGrams: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  allocUsd: { fontSize: 14, fontFamily: "Inter_700Bold" },
  barBg: { height: 5, borderRadius: 3, overflow: "hidden", marginBottom: 5 },
  barFill: { height: 5, borderRadius: 3 },
  barPct: { fontSize: 10, fontFamily: "Inter_400Regular" },
  custodyCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  custodyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  custodyIcon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  custodyTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  custodySub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  verifiedBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  partnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 6,
  },
  partnerDot: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  partnerName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  partnerType: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  auditCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  auditRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  auditFreqBox: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, minWidth: 64, alignItems: "center" },
  auditFreq: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  auditDesc: { fontSize: 13, fontFamily: "Inter_500Medium" },
  divider: { height: 1, marginHorizontal: 14 },
  regulationCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  regTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#A342FF" },
  regSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(163,66,255,0.6)", marginTop: 2 },
});
