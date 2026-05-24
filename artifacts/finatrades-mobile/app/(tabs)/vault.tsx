import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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

import { router } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { useGoldPrice, useWallet, useWalletBalances, type WalletBalanceRow } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";

const CURRENCY_META: Record<string, { prefix: string; label: string }> = {
  USD: { prefix: "$", label: "US Dollar" },
  EUR: { prefix: "€", label: "Euro" },
  GBP: { prefix: "£", label: "British Pound" },
};

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

export default function VaultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: wallet, isLoading, refetch, isRefetching } = useWallet(user?.id);
  const { data: goldPrice } = useGoldPrice();
  const balancesQ = useWalletBalances();

  const onRefresh = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetch(), balancesQ.refetch()]);
  }, [refetch, balancesQ]);

  const supportedCurrencies = ["USD", "EUR", "GBP"];
  const balanceByCurrency = new Map<string, WalletBalanceRow>(
    (balancesQ.data?.balances ?? []).map((b) => [b.currency, b]),
  );

  const pricePerGram = goldPrice?.pricePerGram || 0;
  const totalGrams = parseFloat(wallet?.goldGrams || "0");
  const totalValue = (totalGrams * pricePerGram).toFixed(2);

  const mpgwGrams = 0;
  const fpgwGrams = 0;

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
      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>FinaVault</Text>
        <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
          Your wallets, escrow & gold
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Trade Finance Wallet
          </Text>
          <Pressable
            onPress={() => router.push("/deals" as any)}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, flexDirection: "row", alignItems: "center", gap: 2 }]}
          >
            <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>Deals</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>

        {balancesQ.isLoading ? (
          <View style={[styles.priceRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : balancesQ.error ? (
          <View style={[styles.priceRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.destructive }}>
              {(balancesQ.error as Error).message}
            </Text>
          </View>
        ) : (
          supportedCurrencies.map((cur) => {
            const meta = CURRENCY_META[cur];
            const bal = balanceByCurrency.get(cur);
            const available = bal?.availableCents ?? 0;
            const locked = bal?.lockedCents ?? 0;
            return (
              <View
                key={cur}
                style={[styles.currencyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.currencyHead}>
                  <View style={[styles.currencyBadge, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={{ color: colors.primary, fontWeight: "700" }}>{meta.prefix}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 15 }}>{cur}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{meta.label}</Text>
                  </View>
                </View>
                <View style={styles.currencySplit}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.splitLabel, { color: colors.mutedForeground }]}>Available</Text>
                    <Text style={[styles.splitValue, { color: colors.foreground }]}>
                      {formatMoney(available, cur)}
                    </Text>
                  </View>
                  <View style={[styles.splitDivider, { backgroundColor: colors.border }]} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="lock-closed" size={11} color={colors.warning} />
                      <Text style={[styles.splitLabel, { color: colors.mutedForeground }]}>Locked in escrow</Text>
                    </View>
                    <Text style={[styles.splitValue, { color: locked > 0 ? colors.warning : colors.foreground }]}>
                      {formatMoney(locked, cur)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      <LinearGradient
        colors={[colors.goldDark, colors.gold, colors.goldBright]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.goldCard}
      >
        <MaterialCommunityIcons name="gold" size={32} color="rgba(0,0,0,0.6)" />
        <Text style={styles.goldLabel}>Total Gold</Text>
        {isLoading ? (
          <ActivityIndicator color="#000" size="large" style={{ marginVertical: 8 }} />
        ) : (
          <>
            <Text style={styles.goldGrams}>{totalGrams.toFixed(4)}g</Text>
            <Text style={styles.goldValue}>${Number(totalValue).toLocaleString()} USD</Text>
          </>
        )}
      </LinearGradient>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Vault Allocation</Text>

        <VaultAllocationCard
          title="Market Price Gold Wallet"
          subtitle="MPGW — Live market pricing"
          grams={mpgwGrams}
          pricePerGram={pricePerGram}
          iconName="trending-up"
          accent={colors.success}
          colors={colors}
          isLoading={isLoading}
        />

        <VaultAllocationCard
          title="Fixed Price Gold Wallet"
          subtitle="FPGW — Locked-in pricing"
          grams={fpgwGrams}
          pricePerGram={pricePerGram}
          iconName="lock-closed"
          accent={colors.primary}
          colors={colors}
          isLoading={isLoading}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Live Price</Text>
        <View style={[styles.priceRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <MaterialCommunityIcons name="gold" size={24} color={colors.gold} />
            <View>
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Gold (XAU)</Text>
              <Text style={[styles.priceValue, { color: colors.foreground }]}>
                ${pricePerGram.toFixed(2)}/g
              </Text>
            </View>
          </View>
          <View style={[styles.liveBadge, { backgroundColor: colors.success + "20" }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.liveText, { color: colors.success }]}>LIVE</Text>
          </View>
        </View>
        {goldPrice && (
          <View style={[styles.priceRow, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="bar-chart" size={24} color={colors.primary} />
              <View>
                <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Per Troy Ounce</Text>
                <Text style={[styles.priceValue, { color: colors.foreground }]}>
                  ${goldPrice.pricePerOunce?.toFixed(2)}/oz
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function VaultAllocationCard({
  title,
  subtitle,
  grams,
  pricePerGram,
  iconName,
  accent,
  colors,
  isLoading,
}: {
  title: string;
  subtitle: string;
  grams: number;
  pricePerGram: number;
  iconName: string;
  accent: string;
  colors: any;
  isLoading: boolean;
}) {
  const usdValue = (grams * pricePerGram).toFixed(2);
  return (
    <View style={[styles.allocationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.allocationIcon, { backgroundColor: accent + "20" }]}>
        <Ionicons name={iconName as any} size={22} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.allocationTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.allocationSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={accent} />
      ) : (
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.allocationGrams, { color: accent }]}>{Number(grams).toFixed(4)}g</Text>
          <Text style={[styles.allocationUsd, { color: colors.mutedForeground }]}>${Number(usdValue).toLocaleString()}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { paddingHorizontal: 20, marginBottom: 20 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  pageSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  goldCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: "center",
    gap: 6,
  },
  goldLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(0,0,0,0.6)",
  },
  goldGrams: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    color: "rgba(0,0,0,0.85)",
    letterSpacing: -1,
  },
  goldValue: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(0,0,0,0.7)",
  },
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 14,
  },
  currencyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  currencyHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  currencyBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  currencySplit: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  splitDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
  splitLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  splitValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  allocationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  allocationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  allocationTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  allocationSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  allocationGrams: { fontSize: 15, fontFamily: "Inter_700Bold" },
  allocationUsd: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  priceLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  priceValue: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 2 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontFamily: "Inter_700Bold" },
});
