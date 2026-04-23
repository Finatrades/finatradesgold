import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
      setError("Please enter email and password");
      return;
    }
    setError(null);
    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <LinearGradient
      colors={[colors.background, colors.background]}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: topPad + 40, paddingBottom: bottomPad + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandSection}>
            <View style={[styles.logoCircle, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
              <LinearGradient
                colors={[colors.purple, colors.purpleDark]}
                style={styles.logoGradient}
              >
                <Text style={styles.logoLetter}>F</Text>
              </LinearGradient>
            </View>
            <Text style={[styles.brandName, { color: colors.foreground }]}>Finatrades</Text>
            <Text style={[styles.brandTagline, { color: colors.mutedForeground }]}>
              Gold Trading Platform
            </Text>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>Sign In</Text>
            <Text style={[styles.formSubtitle, { color: colors.mutedForeground }]}>
              Access your gold portfolio
            </Text>

            {error && (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}>
                <Ionicons name="alert-circle" size={16} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Email</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="mail" size={18} color={colors.mutedForeground} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="your@email.com"
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

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="lock-closed" size={18} color={colors.mutedForeground} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Password"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  testID="input-password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} testID="button-toggle-password">
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              testID="button-login"
              style={({ pressed }) => ({ opacity: pressed || isLoading ? 0.8 : 1 })}
            >
              <LinearGradient
                colors={[colors.purple, colors.purpleDark]}
                style={styles.loginBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.loginBtnText}>Sign In</Text>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
                Need access?{" "}
              </Text>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Contact Finatrades
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  brandSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  logoGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  brandName: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  formSection: { gap: 4 },
  formTitle: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 4 },
  formSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 24 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  loginBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  footer: { flexDirection: "row", justifyContent: "center" },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
