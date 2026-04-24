import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useDashboard, useGoldPrice } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";

const GRAMS_PER_TROY_OZ = 31.1035;

function gramsToTroyOz(g: number) {
  return g / GRAMS_PER_TROY_OZ;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: dashboard, isLoading, refetch, isRefetching } = useDashboard(user?.id);
  const { data: goldPrice } = useGoldPrice();

  const onRefresh = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
  }, [refetch]);

  const goldGrams = parseFloat(dashboard?.wallet?.goldGrams || "0");
  const troyOz = gramsToTroyOz(goldGrams);
  const pricePerOz = goldPrice?.pricePerOunce || goldPrice?.pricePerGram * GRAMS_PER_TROY_OZ || 0;
  const pricePerGram = goldPrice?.pricePerGram || 0;
  const portfolioUsd = (goldGrams * pricePerGram).toFixed(2);

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
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Good day,
          </Text>
          <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
            {user?.firstName || user?.finatradesId || "Investor"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.kycBadge, { backgroundColor: colors.success + "18" }]}>
            <Ionicons name="shield-checkmark" size={11} color={colors.success} />
            <Text style={[styles.kycText, { color: colors.success }]}>KYC</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/profile")} testID="button-profile">
            <LinearGradient
              colors={[colors.purple, colors.purpleDark]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {(user?.firstName?.[0] || user?.finatradesId?.[0] || "F").toUpperCase()}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      <LinearGradient
        colors={["#1A0933", "#0D0622", "#07070A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.portfolioCard, { borderColor: colors.purple + "40" }]}
      >
        <View style={styles.portfolioTop}>
          <View style={styles.portfolioLabel}>
            <MaterialCommunityIcons name="gold" size={14} color={colors.gold} />
            <Text style={styles.portfolioLabelTxt}>GODE Portfolio</Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTxt}>LIVE</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.gold} size="large" style={{ marginVertical: 20 }} />
        ) : (
          <>
            <View style={styles.portfolioAmounts}>
              <Text style={[styles.troyOzBig, { color: colors.gold }]}>
                {troyOz.toFixed(4)}
              </Text>
              <Text style={styles.troyOzUnit}> oz t</Text>
            </View>
            <Text style={styles.gramsEquiv}>≈ {goldGrams.toFixed(4)} g LBMA Gold</Text>
            <Text style={styles.portfolioUsd}>
              ${Number(portfolioUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
            </Text>
          </>
        )}

        <View style={styles.spotRow}>
          <View style={styles.spotBlock}>
            <Text style={styles.spotLabel}>XAU/USD Spot</Text>
            <Text style={styles.spotValue}>
              ${pricePerOz > 0 ? pricePerOz.toFixed(2) : "—"}/oz
            </Text>
          </View>
          <View style={[styles.spotDivider, { backgroundColor: "rgba(255,255,255,0.1)" }]} />
          <View style={styles.spotBlock}>
            <Text style={styles.spotLabel}>1 GODE Token</Text>
            <Text style={styles.spotValue}>1 troy oz</Text>
          </View>
          <View style={[styles.spotDivider, { backgroundColor: "rgba(255,255,255,0.1)" }]} />
          <View style={styles.spotBlock}>
            <Text style={styles.spotLabel}>Backed</Text>
            <Text style={[styles.spotValue, { color: "#10b981" }]}>100%</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.actionsRow}>
        {ACTIONS.map((a) => (
          <QuickAction
            key={a.id}
            icon={a.icon}
            label={a.label}
            color={a.color(colors)}
            testID={a.testID}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (a.route) router.push(a.route as any);
            }}
            colors={colors}
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fiat Balances</Text>
        <View style={styles.fiatGrid}>
          {[
            { ccy: "USD", symbol: "$", val: dashboard?.wallet?.usdBalance },
            { ccy: "EUR", symbol: "€", val: dashboard?.wallet?.eurBalance },
            { ccy: "GBP", symbol: "£", val: dashboard?.wallet?.gbpBalance },
            { ccy: "AED", symbol: "د.إ", val: dashboard?.wallet?.aedBalance },
          ].map((item) => (
            <View key={item.ccy} style={[styles.fiatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fiatCcy, { color: colors.mutedForeground }]}>{item.ccy}</Text>
              {isLoading
                ? <View style={[styles.skeleton, { backgroundColor: colors.muted }]} />
                : <Text style={[styles.fiatAmt, { color: colors.foreground }]}>
                    {item.symbol}{parseFloat(item.val || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </Text>
              }
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Transactions</Text>
        {isLoading ? (
          <>
            <SkeletonTx colors={colors} />
            <SkeletonTx colors={colors} />
          </>
        ) : !dashboard?.recentTransactions?.length ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="swap-horizontal" size={30} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Transactions</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Buy GODE to get started
            </Text>
          </View>
        ) : (
          dashboard.recentTransactions.slice(0, 5).map((tx: any, i: number) => (
            <TxRow key={tx.id || i} tx={tx} colors={colors} />
          ))
        )}
      </View>

      <View style={[styles.proofCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.proofRow}>
          <View style={[styles.proofIcon, { backgroundColor: colors.gold + "18" }]}>
            <Ionicons name="cube-outline" size={18} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.proofTitle, { color: colors.foreground }]}>Proof of Reserves</Text>
            <Text style={[styles.proofSub, { color: colors.mutedForeground }]}>
              DMCC Dubai · Brink's · Malca-Amit · Audited monthly
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </View>
      </View>
    </ScrollView>
  );
}

const ACTIONS = [
  { id: "buy", icon: "add-circle", label: "Buy Gold", color: (c: any) => c.success, testID: "button-deposit", route: null },
  { id: "sell", icon: "remove-circle", label: "Sell", color: (c: any) => c.warning, testID: "button-withdraw", route: null },
  { id: "transfer", icon: "swap-horizontal", label: "Transfer", color: (c: any) => c.primary, testID: "button-convert", route: null },
  { id: "certs", icon: "ribbon", label: "Certs", color: (c: any) => c.gold, testID: "button-certs", route: "/(tabs)/certificates" },
];

function QuickAction({ icon, label, color, onPress, testID, colors }: {
  icon: string; label: string; color: string; onPress: () => void; testID: string; colors: any;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon as any} size={26} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </Pressable>
  );
}

function TxRow({ tx, colors }: { tx: any; colors: any }) {
  const isIn = tx.type === "buy" || tx.type === "deposit" || tx.type === "credit" || tx.type === "mint";
  const grams = parseFloat(tx.goldGrams || tx.amount || "0");
  const troyOz = gramsToTroyOz(grams);
  const typeLabels: Record<string, string> = {
    buy: "Gold Purchase",
    mint: "GODE Minted",
    deposit: "Deposit",
    sell: "Gold Sale",
    redeem: "Redemption",
    withdraw: "Withdrawal",
    credit: "Credit",
    debit: "Debit",
  };
  return (
    <View style={[styles.txRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.txIcon, { backgroundColor: isIn ? colors.success + "18" : colors.warning + "18" }]}>
        <Ionicons name={isIn ? "arrow-down" : "arrow-up"} size={16} color={isIn ? colors.success : colors.warning} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.txLabel, { color: colors.foreground }]}>
          {typeLabels[tx.type] || tx.type?.charAt(0).toUpperCase() + tx.type?.slice(1)}
        </Text>
        <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.txAmt, { color: isIn ? colors.success : colors.warning }]}>
          {isIn ? "+" : "−"}{troyOz.toFixed(5)} oz t
        </Text>
        <Text style={[styles.txGrams, { color: colors.mutedForeground }]}>
          {grams.toFixed(4)}g
        </Text>
      </View>
    </View>
  );
}

function SkeletonTx({ colors }: { colors: any }) {
  return <View style={[{ height: 64, borderRadius: 12, backgroundColor: colors.muted, marginBottom: 8 }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: { fontSize: 12, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  kycBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  kycText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  portfolioCard: {
    marginHorizontal: 20,
    borderRadius: 22,
    padding: 22,
    marginBottom: 22,
    borderWidth: 1,
  },
  portfolioTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  portfolioLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  portfolioLabelTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16,185,129,0.15)",
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#10b981" },
  liveTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#10b981", letterSpacing: 0.5 },
  portfolioAmounts: { flexDirection: "row", alignItems: "flex-end" },
  troyOzBig: { fontSize: 44, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  troyOzUnit: { fontSize: 18, fontFamily: "Inter_400Regular", color: "rgba(212,175,55,0.7)", marginBottom: 6 },
  gramsEquiv: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", marginTop: 2 },
  portfolioUsd: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.9)", marginTop: 8 },
  spotRow: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  spotBlock: { flex: 1, alignItems: "center" },
  spotDivider: { width: 1 },
  spotLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", letterSpacing: 0.3, marginBottom: 4 },
  spotValue: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  action: { alignItems: "center", gap: 6 },
  actionIcon: { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12, letterSpacing: -0.2 },
  fiatGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fiatCard: {
    flex: 1,
    minWidth: "44%",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  fiatCcy: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5, marginBottom: 6 },
  fiatAmt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  skeleton: { height: 18, borderRadius: 6, width: "70%" },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  txIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  txLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  txDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  txAmt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  txGrams: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyCard: {
    padding: 36,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  proofCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  proofRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  proofIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  proofTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  proofSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
});
