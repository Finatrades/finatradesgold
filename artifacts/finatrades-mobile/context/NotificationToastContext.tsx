import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

import { useSocket } from "./SocketContext";

type ToastType = "info" | "success" | "warning" | "error" | "transaction";

interface IncomingNotification {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  link?: string | null;
  read?: boolean;
  createdAt?: string;
}

interface ToastState extends IncomingNotification {
  key: number;
}

interface NotificationToastContextValue {
  showToast: (n: IncomingNotification) => void;
}

const NotificationToastContext =
  createContext<NotificationToastContextValue | null>(null);

const TOAST_DURATION_MS = 4500;

function iconForType(type: ToastType) {
  switch (type) {
    case "success":
      return { name: "checkmark-circle" as const, color: "#34C759" };
    case "warning":
      return { name: "warning" as const, color: "#FF9F0A" };
    case "error":
      return { name: "alert-circle" as const, color: "#FF3B30" };
    case "transaction":
      return { name: "card" as const, color: "#D4AF37" };
    default:
      return { name: "notifications" as const, color: "#8A2BE2" };
  }
}

export function NotificationToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const [toast, setToast] = useState<ToastState | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (dismissTimeout.current) {
      clearTimeout(dismissTimeout.current);
      dismissTimeout.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    (n: IncomingNotification) => {
      setToast({ ...n, key: Date.now() });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }
      translateY.setValue(-120);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 180,
          mass: 0.9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
      if (dismissTimeout.current) clearTimeout(dismissTimeout.current);
      dismissTimeout.current = setTimeout(hide, TOAST_DURATION_MS);
    },
    [hide, opacity, translateY],
  );

  // Subscribe to socket notification:new events
  useEffect(() => {
    if (!socket) return;
    const handler = (notification: IncomingNotification) => {
      if (!notification?.id) return;
      // Refresh notifications-related queries
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showToast(notification);
    };
    socket.on("notification:new", handler);
    return () => {
      socket.off("notification:new", handler);
    };
  }, [socket, queryClient, showToast]);

  useEffect(() => {
    return () => {
      if (dismissTimeout.current) clearTimeout(dismissTimeout.current);
    };
  }, []);

  const onPress = () => {
    if (toast?.link) {
      try {
        router.push(toast.link as never);
      } catch {}
    }
    hide();
  };

  const icon = toast ? iconForType(toast.type) : null;

  return (
    <NotificationToastContext.Provider value={{ showToast }}>
      {children}
      {toast && icon && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrapper,
            {
              paddingTop: insets.top + 8,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <Pressable
            onPress={onPress}
            style={[
              styles.toast,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${icon.color}22` }]}>
              <Ionicons name={icon.name} size={22} color={icon.color} />
            </View>
            <View style={styles.textWrap}>
              <Text
                numberOfLines={1}
                style={[styles.title, { color: colors.text }]}
              >
                {toast.title}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.message, { color: colors.mutedForeground }]}
              >
                {toast.message}
              </Text>
            </View>
            <Pressable onPress={hide} hitSlop={10} style={styles.closeBtn}>
              <Ionicons
                name="close"
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>
          </Pressable>
        </Animated.View>
      )}
    </NotificationToastContext.Provider>
  );
}

export function useNotificationToast() {
  const ctx = useContext(NotificationToastContext);
  if (!ctx)
    throw new Error(
      "useNotificationToast must be used within NotificationToastProvider",
    );
  return ctx;
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  message: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
});
