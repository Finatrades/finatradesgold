import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useDashboard, useGoldPrice } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";

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
  const pricePerGram = goldPrice?.pricePerGram || 0;
  const goldValueUsd = (goldGrams * pricePerGram).toFixed(2);

  const styles = makeStyles(colors);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPadding + 16, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16 }}
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
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Welcome back
          </Text>
          <Text style={[styles.userName, { color: colors.foreground }]}>
            {user?.firstName || user?.finatradesId || "Investor"}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          testID="button-profile"
        >
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {(user?.firstName?.[0] || user?.finatradesId?.[0] || "F").toUpperCase()}
            </Text>
          </View>
        </Pressable>
      </View>

      <LinearGradient
        colors={[colors.purple, colors.purpleDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>Total Gold Holdings</Text>
        {isLoading ? (
          <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 12 }} />
        ) : (
          <>
            <Text style={styles.balanceGrams}>{goldGrams.toFixed(4)}g</Text>
            <View style={styles.balanceRow}>
              <MaterialCommunityIcons name="gold" size={16} color={colors.gold} />
              <Text style={styles.balanceUsd}>${Number(goldValueUsd).toLocaleString()} USD</Text>
            </View>
          </>
        )}
        {goldPrice && (
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>
              ${pricePerGram.toFixed(2)}/g
            </Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.quickActions}>
        <QuickActionBtn
          icon="arrow-down-circle"
          label="Deposit"
          color={colors.success}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          testID="button-deposit"
          colors={colors}
        />
        <QuickActionBtn
          icon="arrow-up-circle"
          label="Withdraw"
          color={colors.warning}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          testID="button-withdraw"
          colors={colors}
        />
        <QuickActionBtn
          icon="swap-horizontal"
          label="Convert"
          color={colors.primary}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          testID="button-convert"
          colors={colors}
        />
        <QuickActionBtn
          icon="file-tray-full"
          label="Certs"
          color={colors.gold}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(tabs)/certificates");
          }}
          testID="button-certs"
          colors={colors}
        />
      </View>

      <View style={[styles.section]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Wallet Balances
        </Text>
        {isLoading ? (
          <SkeletonCard colors={colors} />
        ) : (
          <View style={[styles.walletGrid, { borderColor: colors.border }]}>
            {[
              { label: "USD", value: dashboard?.wallet?.usdBalance || "0.00", prefix: "$" },
              { label: "EUR", value: dashboard?.wallet?.eurBalance || "0.00", prefix: "€" },
              { label: "GBP", value: dashboard?.wallet?.gbpBalance || "0.00", prefix: "£" },
              { label: "AED", value: dashboard?.wallet?.aedBalance || "0.00", prefix: "د.إ" },
            ].map((item) => (
              <View key={item.label} style={[styles.walletItem, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.walletCurrency, { color: colors.mutedForeground }]}>{item.label}</Text>
                <Text style={[styles.walletValue, { color: colors.foreground }]}>
                  {item.prefix}{parseFloat(item.value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Recent Activity
        </Text>
        {isLoading ? (
          <>
            <SkeletonCard colors={colors} />
            <SkeletonCard colors={colors} />
          </>
        ) : !dashboard?.recentTransactions?.length ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="receipt-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No transactions yet
            </Text>
          </View>
        ) : (
          dashboard.recentTransactions.slice(0, 5).map((tx: any, i: number) => (
            <TransactionRow key={tx.id || i} tx={tx} colors={colors} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function QuickActionBtn({
  icon,
  label,
  color,
  onPress,
  testID,
  colors,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  testID: string;
  colors: any;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: "center",
          gap: 6,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[{ width: 56, height: 56, borderRadius: 16, backgroundColor: color + "20", alignItems: "center", justifyContent: "center" }]}>
        <Ionicons name={icon as any} size={26} color={color} />
      </View>
      <Text style={{ fontSize: 11, fontWeight: "600" as const, color: colors.mutedForeground }}>
        {label}
      </Text>
    </Pressable>
  );
}

function TransactionRow({ tx, colors }: { tx: any; colors: any }) {
  const isCredit = tx.type === "buy" || tx.type === "deposit" || tx.type === "credit";
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 8 }]}>
      <View style={[{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: isCredit ? colors.success + "20" : colors.warning + "20" }]}>
        <Ionicons
          name={isCredit ? "arrow-down" : "arrow-up"}
          size={18}
          color={isCredit ? colors.success : colors.warning}
        />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: "600" as const, color: colors.foreground }}>
          {tx.type?.charAt(0).toUpperCase() + tx.type?.slice(1) || "Transaction"}
        </Text>
        <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : ""}
        </Text>
      </View>
      <Text style={{ fontSize: 14, fontWeight: "700" as const, color: isCredit ? colors.success : colors.warning }}>
        {isCredit ? "+" : "-"}{parseFloat(tx.goldGrams || tx.amount || "0").toFixed(4)}g
      </Text>
    </View>
  );
}

function SkeletonCard({ colors }: { colors: any }) {
  return (
    <View style={[{ height: 64, borderRadius: 12, backgroundColor: colors.muted, marginBottom: 8 }]} />
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
    userName: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
    avatarCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
    balanceCard: {
      marginHorizontal: 20,
      borderRadius: 20,
      padding: 24,
      marginBottom: 24,
    },
    balanceLabel: {
      color: "rgba(255,255,255,0.7)",
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      marginBottom: 8,
    },
    balanceGrams: {
      color: "#fff",
      fontSize: 42,
      fontFamily: "Inter_700Bold",
      letterSpacing: -1,
    },
    balanceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    balanceUsd: {
      color: "rgba(255,255,255,0.9)",
      fontSize: 16,
      fontFamily: "Inter_500Medium",
    },
    pricePill: {
      alignSelf: "flex-start",
      marginTop: 16,
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 100,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    priceText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
    quickActions: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingHorizontal: 16,
      marginBottom: 28,
    },
    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      marginBottom: 14,
    },
    walletGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    walletItem: {
      flex: 1,
      minWidth: "45%",
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    walletCurrency: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
    walletValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
    emptyCard: {
      padding: 32,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: "center",
      gap: 10,
    },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
