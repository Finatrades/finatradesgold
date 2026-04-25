import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";

const KYC_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  approved: { color: "#10b981", label: "Verified", icon: "shield-checkmark" },
  pending: { color: "#f59e0b", label: "Pending Review", icon: "time" },
  rejected: { color: "#ef4444", label: "Rejected", icon: "close-circle" },
  not_started: { color: "#6b7280", label: "Not Started", icon: "person-circle-outline" },
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data: profileData } = useUserProfile(user?.id);

  const profile = profileData?.user || user;
  const kycStatus = profile?.kycStatus || "not_started";
  const kyc = KYC_CONFIG[kycStatus] || KYC_CONFIG.not_started;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function handleLogout() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  }

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Finatrades User";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Profile</Text>
      </View>

      <View style={[styles.avatarSection]}>
        <View style={[styles.avatarLarge, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarTextLarge}>{initials}</Text>
        </View>
        <Text style={[styles.profileName, { color: colors.foreground }]}>{fullName}</Text>
        <Text style={[styles.profileId, { color: colors.mutedForeground }]}>
          {profile?.customFinatradesId || profile?.finatradesId || ""}
        </Text>
        <View style={[styles.kycBadge, { backgroundColor: kyc.color + "20" }]}>
          <Ionicons name={kyc.icon as any} size={14} color={kyc.color} />
          <Text style={[styles.kycText, { color: kyc.color }]}>KYC: {kyc.label}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Account</Text>
        <InfoCard
          label="Email"
          value={profile?.email || ""}
          icon="mail"
          colors={colors}
        />
        <InfoCard
          label="KYC Tier"
          value={`Tier ${profile?.kycTier || 0}`}
          icon="medal"
          colors={colors}
        />
        <InfoCard
          label="Account Role"
          value={(profile?.role || "user").charAt(0).toUpperCase() + (profile?.role || "user").slice(1)}
          icon="person"
          colors={colors}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Settings</Text>
        <MenuRow
          label="Notifications"
          icon="notifications"
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          colors={colors}
          testID="menu-notifications"
        />
        <MenuRow
          label="Security & 2FA"
          icon="lock-closed"
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          colors={colors}
          testID="menu-security"
        />
        <MenuRow
          label="Referrals"
          icon="people"
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          colors={colors}
          testID="menu-referrals"
        />
        <MenuRow
          label="Help & Support"
          icon="help-circle"
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          colors={colors}
          testID="menu-help"
        />
      </View>

      <View style={styles.section}>
        <Pressable
          onPress={handleLogout}
          testID="button-logout"
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
        </Pressable>
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>
        Finatrades v1.0.0
      </Text>
    </ScrollView>
  );
}

function InfoCard({ label, value, icon, colors }: { label: string; value: string; icon: string; colors: any }) {
  return (
    <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon as any} size={18} color={colors.primary} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

function MenuRow({ label, icon, onPress, colors, testID }: { label: string; icon: string; onPress: () => void; colors: any; testID: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Ionicons name={icon as any} size={18} color={colors.primary} />
      <Text style={[styles.menuLabel, { color: colors.foreground }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { paddingHorizontal: 20, marginBottom: 8 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  avatarSection: { alignItems: "center", paddingVertical: 24, gap: 8 },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarTextLarge: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  profileId: { fontSize: 13, fontFamily: "Inter_400Regular" },
  kycBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  kycText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 8 },
});
