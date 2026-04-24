import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }
    setError(null);
    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 32, paddingBottom: bottomPad + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <LinearGradient
              colors={[colors.purple, colors.purpleDark]}
              style={styles.logoBox}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoF}>F</Text>
              <View style={styles.goldDot} />
            </LinearGradient>

            <Text style={[styles.brandName, { color: colors.foreground }]}>Finatrades</Text>
            <Text style={[styles.brandSub, { color: colors.mutedForeground }]}>
              Gold-Backed Digital Assets
            </Text>

            <View style={styles.badges}>
              <Badge icon="shield-checkmark" label="FINMA Regulated" color={colors.success} bg={colors.success + "18"} />
              <Badge icon="ribbon" label="LBMA Certified" color={colors.gold} bg={colors.gold + "18"} />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Secure Sign In</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              Access your gold portfolio
            </Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "35" }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
                <Text style={[styles.errorTxt, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Email Address</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={17} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  testID="input-email"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={17} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  testID="input-password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} testID="button-toggle-password" hitSlop={8}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={17} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              testID="button-login"
              style={({ pressed }) => ({ opacity: pressed || isLoading ? 0.82 : 1, marginTop: 8 })}
            >
              <LinearGradient
                colors={[colors.purple, colors.purpleDark]}
                style={styles.loginBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                    <Ionicons name="lock-open-outline" size={18} color="#fff" />
                    <Text style={styles.loginTxt}>Sign In Securely</Text>
                  </>
                }
              </LinearGradient>
            </Pressable>

            <View style={[styles.securityRow, { borderTopColor: colors.border }]}>
              <Ionicons name="shield-outline" size={12} color={colors.mutedForeground} />
              <Text style={[styles.securityTxt, { color: colors.mutedForeground }]}>
                256-bit encrypted · KYC/AML compliant
              </Text>
            </View>
          </View>

          <Text style={[styles.footerTxt, { color: colors.mutedForeground }]}>
            Finatrades SA · Switzerland · © 2025
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Badge({ icon, label, color, bg }: { icon: string; label: string; color: string; bg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Ionicons name={icon as any} size={11} color={color} />
      <Text style={[styles.badgeTxt, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, flexGrow: 1 },
  brand: { alignItems: "center", marginBottom: 32 },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#8A2BE2",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  logoF: { fontSize: 38, fontFamily: "Inter_700Bold", color: "#fff" },
  goldDot: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFD700",
  },
  brandName: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  brandSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4, marginBottom: 14 },
  badges: { flexDirection: "row", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  badgeTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    marginBottom: 24,
  },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  cardSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 20 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorTxt: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 7, letterSpacing: 0.3 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  loginBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  loginTxt: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  securityTxt: { fontSize: 11, fontFamily: "Inter_400Regular" },
  footerTxt: { textAlign: "center", fontSize: 11, fontFamily: "Inter_400Regular" },
});
