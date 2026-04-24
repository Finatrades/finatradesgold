import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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

const KYC_CONFIG: Record<string, { color: string; label: string; icon: string; tier: string }> = {
  approved:    { color: "#10b981", label: "Verified",       icon: "shield-checkmark",      tier: "Full Access"   },
  pending:     { color: "#f59e0b", label: "Under Review",   icon: "time",                  tier: "Limited Access" },
  rejected:    { color: "#ef4444", label: "Action Required",icon: "alert-circle",          tier: "Restricted"    },
  not_started: { color: "#6b7280", label: "KYC Required",   icon: "person-circle-outline", tier: "No Access"     },
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

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Finatrades Investor";
  const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  async function handleLogout() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Sign Out", "Are you sure you want to sign out of Finatrades?", [
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Account</Text>
      </View>

      <LinearGradient
        colors={["#1A0933", "#0D0622"]}
        style={[styles.profileCard, { borderColor: colors.purple + "40" }]}
      >
        <LinearGradient
          colors={[colors.purple, colors.purpleDark]}
          style={styles.avatar}
        >
          <Text style={styles.avatarTxt}>{initials}</Text>
        </LinearGradient>
        <Text style={styles.profileName}>{fullName}</Text>
        <Text style={styles.profileId}>
          {profile?.customFinatradesId || profile?.finatradesId || ""}
        </Text>
        <Text style={styles.profileEmail}>{profile?.email || ""}</Text>

        <View style={styles.statusRow}>
          <View style={[styles.kycPill, { backgroundColor: kyc.color + "20" }]}>
            <Ionicons name={kyc.icon as any} size={12} color={kyc.color} />
            <Text style={[styles.kycTxt, { color: kyc.color }]}>{kyc.label}</Text>
          </View>
          <View style={[styles.tierPill, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
            <Ionicons name="medal-outline" size={12} color="rgba(255,255,255,0.5)" />
            <Text style={styles.tierTxt}>Tier {profile?.kycTier || 0} · {kyc.tier}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT DETAILS</Text>
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <DetailRow icon="mail-outline" label="Email" value={profile?.email || "—"} colors={colors} />
          <View style={[styles.detailDiv, { backgroundColor: colors.border }]} />
          <DetailRow icon="id-card-outline" label="Finatrades ID" value={profile?.customFinatradesId || profile?.finatradesId || "—"} colors={colors} />
          <View style={[styles.detailDiv, { backgroundColor: colors.border }]} />
          <DetailRow icon="person-outline" label="Role" value={(profile?.role || "investor").charAt(0).toUpperCase() + (profile?.role || "investor").slice(1)} colors={colors} />
          <View style={[styles.detailDiv, { backgroundColor: colors.border }]} />
          <DetailRow icon="shield-outline" label="KYC Status" value={kyc.label} valueColor={kyc.color} colors={colors} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>COMPLIANCE</Text>
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ComplianceRow icon="lock-closed-outline" label="AML Screening" status="Passed" colors={colors} />
          <View style={[styles.detailDiv, { backgroundColor: colors.border }]} />
          <ComplianceRow icon="document-text-outline" label="FINMA Compliance" status="Active" colors={colors} />
          <View style={[styles.detailDiv, { backgroundColor: colors.border }]} />
          <ComplianceRow icon="globe-outline" label="Sanctions Screening" status="Clear" colors={colors} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SETTINGS</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {MENU_ITEMS.map((item, i, arr) => (
            <View key={item.id}>
              <Pressable
                testID={`menu-${item.id}`}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.color + "18" }]}>
                  <Ionicons name={item.icon as any} size={17} color={item.color} />
                </View>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} />
              </Pressable>
              {i < arr.length - 1 && <View style={[styles.detailDiv, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.section, { paddingBottom: 0 }]}>
        <Pressable
          onPress={handleLogout}
          testID="button-logout"
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "35", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
          <Text style={[styles.logoutTxt, { color: colors.destructive }]}>Sign Out</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerTxt, { color: colors.mutedForeground }]}>
          Finatrades SA · Switzerland · FINMA Regulated
        </Text>
        <Text style={[styles.footerVersion, { color: colors.mutedForeground }]}>v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const MENU_ITEMS = [
  { id: "notifications", label: "Notifications", icon: "notifications-outline", color: "#8A2BE2" },
  { id: "security",      label: "Security & 2FA", icon: "lock-closed-outline",  color: "#10b981" },
  { id: "referrals",     label: "Referral Program", icon: "people-outline",     color: "#D4AF37" },
  { id: "help",          label: "Help & Support",  icon: "help-circle-outline", color: "#6b7280" },
];

function DetailRow({ icon, label, value, valueColor, colors }: {
  icon: string; label: string; value: string; valueColor?: string; colors: any;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as any} size={16} color={colors.mutedForeground} />
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: valueColor || colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ComplianceRow({ icon, label, status, colors }: {
  icon: string; label: string; status: string; colors: any;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as any} size={16} color={colors.mutedForeground} />
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={styles.passedRow}>
        <Ionicons name="checkmark-circle" size={13} color="#10b981" />
        <Text style={styles.passedTxt}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { paddingHorizontal: 20, marginBottom: 16 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  profileCard: {
    marginHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginBottom: 28,
    gap: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#8A2BE2",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avatarTxt: { color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  profileId: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.45)" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)" },
  statusRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  kycPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  kycTxt: { fontSize: 11, fontFamily: "Inter_700Bold" },
  tierPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  tierTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)" },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  detailCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  detailLabel: { fontSize: 13, fontFamily: "Inter_400Regular", width: 130 },
  detailValue: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  detailDiv: { height: 1 },
  passedRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  passedTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#10b981" },
  menuCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  menuIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  footer: { alignItems: "center", paddingTop: 16, gap: 4 },
  footerTxt: { fontSize: 11, fontFamily: "Inter_400Regular" },
  footerVersion: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
