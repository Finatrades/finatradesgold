import { Ionicons } from "@expo/vector-icons";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useMemo } from "react";
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
import { useColors } from "@/hooks/useColors";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = domain ? `https://${domain}` : "";

type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "transaction";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string | null;
  createdAt: string;
}

let _csrf: string | null = null;
async function csrf(): Promise<string> {
  if (_csrf) return _csrf;
  try {
    const r = await fetch(`${API_BASE}/api/csrf-token`, {
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    if (r.ok) {
      const d = await r.json();
      _csrf = (d.csrfToken as string) || "";
      return _csrf;
    }
  } catch {}
  return "";
}

async function patchJson(path: string) {
  const token = await csrf();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(token ? { "x-csrf-token": token } : {}),
    },
  });
  if (res.status === 403) {
    _csrf = null;
    const retry = await csrf();
    const r2 = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(retry ? { "x-csrf-token": retry } : {}),
      },
    });
    if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
    return r2.json();
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function iconForType(type: NotificationType): {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
} {
  switch (type) {
    case "success":
      return { name: "checkmark-circle", color: "#34C759" };
    case "warning":
      return { name: "warning", color: "#FF9F0A" };
    case "error":
      return { name: "alert-circle", color: "#FF3B30" };
    case "transaction":
      return { name: "card", color: "#D4AF37" };
    default:
      return { name: "notifications", color: "#8A2BE2" };
  }
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return "";
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userId = user?.id;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/notifications/${userId}`,
        {
          credentials: "include",
          headers: { "X-Requested-With": "XMLHttpRequest" },
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: !!userId,
    staleTime: 15000,
  });

  const notifications: NotificationItem[] = useMemo(() => {
    const list: any[] = data?.notifications ?? [];
    return [...list].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [data]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const markOne = useMutation({
    mutationFn: (id: string) => patchJson(`/api/notifications/${id}/read`),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications", userId] });
      const prev = queryClient.getQueryData<any>(["notifications", userId]);
      if (prev?.notifications) {
        queryClient.setQueryData(["notifications", userId], {
          ...prev,
          notifications: prev.notifications.map((n: NotificationItem) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev)
        queryClient.setQueryData(["notifications", userId], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => patchJson(`/api/notifications/${userId}/read-all`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications", userId] });
      const prev = queryClient.getQueryData<any>(["notifications", userId]);
      if (prev?.notifications) {
        queryClient.setQueryData(["notifications", userId], {
          ...prev,
          notifications: prev.notifications.map((n: NotificationItem) => ({
            ...n,
            read: true,
          })),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev)
        queryClient.setQueryData(["notifications", userId], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const onRefresh = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    await refetch();
  }, [refetch]);

  const onPressItem = useCallback(
    (item: NotificationItem) => {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync().catch(() => {});
      }
      if (!item.read) markOne.mutate(item.id);
      if (item.link) {
        try {
          router.push(item.link as never);
        } catch {}
      }
    },
    [markOne],
  );

  const onMarkAll = useCallback(() => {
    if (!unreadCount) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    }
    markAll.mutate();
  }, [markAll, unreadCount]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: topPad + 16,
          paddingBottom: bottomPad + 16,
        }}
        scrollEnabled={notifications.length > 0}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pageTitle, { color: colors.foreground }]}>
                  Notifications
                </Text>
                <Text
                  style={[
                    styles.pageSubtitle,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {unreadCount > 0
                    ? `${unreadCount} unread · ${notifications.length} total`
                    : `${notifications.length} total`}
                </Text>
              </View>
              {unreadCount > 0 && (
                <Pressable
                  onPress={onMarkAll}
                  testID="button-mark-all-read"
                  style={({ pressed }) => [
                    styles.markAllBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: pressed || markAll.isPending ? 0.7 : 1,
                    },
                  ]}
                  disabled={markAll.isPending}
                >
                  <Ionicons name="checkmark-done" size={14} color="#fff" />
                  <Text style={styles.markAllText}>Mark all read</Text>
                </Pressable>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View
            style={[
              styles.emptyState,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No Notifications
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: colors.mutedForeground },
              ]}
            >
              You're all caught up. New alerts will show up here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <NotificationCard
            item={item}
            colors={colors}
            onPress={() => onPressItem(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

function NotificationCard({
  item,
  colors,
  onPress,
}: {
  item: NotificationItem;
  colors: any;
  onPress: () => void;
}) {
  const icon = iconForType(item.type);
  const unread = !item.read;

  return (
    <Pressable
      onPress={onPress}
      testID={`card-notification-${item.id}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: unread ? icon.color + "55" : colors.border,
          marginHorizontal: 20,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: icon.color + "22" },
        ]}
      >
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              {
                color: colors.foreground,
                fontFamily: unread ? "Inter_700Bold" : "Inter_600SemiBold",
              },
            ]}
          >
            {item.title}
          </Text>
          {unread && (
            <View
              style={[styles.unreadDot, { backgroundColor: icon.color }]}
              testID={`dot-unread-${item.id}`}
            />
          )}
        </View>
        <Text
          numberOfLines={3}
          style={[styles.message, { color: colors.mutedForeground }]}
        >
          {item.message}
        </Text>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {formatRelative(item.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  pageHeader: { paddingHorizontal: 20, marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  pageSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  markAllText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 14 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  message: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  emptyState: {
    margin: 20,
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
