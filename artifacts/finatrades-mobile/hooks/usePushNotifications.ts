import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { router } from "expo-router";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = domain ? `https://${domain}` : "";

let cachedCsrf: string | null = null;

async function getCsrf(): Promise<string> {
  if (cachedCsrf) return cachedCsrf;
  try {
    const res = await fetch(`${API_BASE}/api/csrf-token`, {
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    if (res.ok) {
      const data = await res.json();
      cachedCsrf = (data.csrfToken as string) || "";
      return cachedCsrf;
    }
  } catch {}
  return "";
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId;

  try {
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenResp.data;
  } catch (err) {
    console.warn("[Push] Failed to obtain Expo push token:", err);
    return null;
  }
}

async function registerWithServer(token: string): Promise<void> {
  const csrf = await getCsrf();
  await fetch(`${API_BASE}/api/push/register`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: JSON.stringify({
      token,
      platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web",
      deviceName: Device.deviceName ?? undefined,
      deviceId: (Constants as any).sessionId ?? undefined,
    }),
  }).catch((err) => console.warn("[Push] register failed:", err));
}

let currentExpoToken: string | null = null;

export function getCurrentPushToken(): string | null {
  return currentExpoToken;
}

export async function unregisterPushToken(token: string | null): Promise<void> {
  if (!token) return;
  const csrf = await getCsrf();
  await fetch(`${API_BASE}/api/push/unregister`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: JSON.stringify({ token }),
  }).catch(() => {});
}

function handleNotificationData(data: Record<string, any> | null | undefined) {
  if (!data) return;
  const link = typeof data.link === "string" ? data.link : null;
  const consignmentId = typeof data.consignmentId === "string" ? data.consignmentId : null;

  if (consignmentId) {
    router.push(`/consignments/${consignmentId}` as any);
    return;
  }
  if (link && link.startsWith("/")) {
    router.push(link as any);
  }
}

/**
 * Registers the device for push notifications when the user is authenticated,
 * stores the token via the API, and wires up tap handlers that deep-link
 * into the relevant screen (e.g. consignment detail).
 *
 * Returns the latest token (or null), which the caller can pass to
 * `unregisterPushToken` on logout.
 */
export function usePushNotifications(
  isAuthenticated: boolean,
  onTokenChange?: (token: string | null) => void,
): void {
  const responseSubRef = useRef<Notifications.EventSubscription | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) {
      onTokenChange?.(null);
      return;
    }

    (async () => {
      const token = await getExpoPushToken();
      if (cancelled || !token) return;
      tokenRef.current = token;
      currentExpoToken = token;
      onTokenChange?.(token);
      await registerWithServer(token);
    })();

    // Handle taps while app is foreground/background/killed
    responseSubRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationData(response.notification.request.content.data as any);
    });

    // Handle cold-start (app launched from a notification)
    Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (resp) handleNotificationData(resp.notification.request.content.data as any);
    });

    return () => {
      cancelled = true;
      responseSubRef.current?.remove();
      responseSubRef.current = null;
    };
  }, [isAuthenticated, onTokenChange]);
}
