import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = domain ? `https://${domain}` : "";

type ConsignmentDoc = {
  id?: string;
  docType: string;
  docLabel: string;
  isRequired: boolean;
  status: "pending" | "uploaded" | "verified" | "rejected" | string;
  fileName?: string | null;
  uploadedAt?: string | null;
  rejectReason?: string | null;
  reviewNotes?: string | null;
};

type Requirement = {
  docType: string;
  label: string;
  description?: string;
  required: boolean;
};

type Consignment = {
  id: string;
  referenceNo?: string | null;
  commodityName: string;
  commodityCategory?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
  status: string;
  statusNote?: string | null;
  originCountry?: string | null;
  destinationCountry?: string | null;
  documents?: ConsignmentDoc[];
  requirements?: Requirement[];
  history?: Array<{
    id: string;
    fromStatus?: string | null;
    toStatus: string;
    note?: string | null;
    actorName?: string | null;
    createdAt: string;
  }>;
};

async function fetchConsignment(id: string): Promise<Consignment> {
  const res = await fetch(`${API_BASE}/api/b2b/consignments/${id}`, {
    credentials: "include",
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `HTTP ${res.status}`);
  }
  return res.json();
}

async function uploadDocument(
  consignmentId: string,
  docType: string,
  asset: ImagePicker.ImagePickerAsset,
): Promise<void> {
  const form = new FormData();
  form.append("docType", docType);
  const name = asset.fileName || `${docType}-${Date.now()}.jpg`;
  const mimeType = asset.mimeType || "image/jpeg";
  // RN FormData accepts { uri, name, type } file objects
  form.append("file", {
    uri: asset.uri,
    name,
    type: mimeType,
  } as unknown as Blob);
  const res = await fetch(`${API_BASE}/api/b2b/consignments/${consignmentId}/documents`, {
    method: "POST",
    credentials: "include",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `HTTP ${res.status}`);
  }
}

function statusColor(status: string, colors: ReturnType<typeof useColors>): string {
  switch (status) {
    case "Approved":
    case "Verified":
      return colors.success;
    case "Rejected":
      return colors.destructive;
    case "Needs More Info":
      return colors.warning;
    default:
      return colors.primary;
  }
}

function docStatusColor(status: string, colors: ReturnType<typeof useColors>): string {
  switch (status) {
    case "verified":
      return colors.success;
    case "rejected":
      return colors.destructive;
    case "uploaded":
      return colors.primary;
    case "pending":
    default:
      return colors.warning;
  }
}

type DocRow = {
  docType: string;
  label: string;
  required: boolean;
  status: ConsignmentDoc["status"];
  doc?: ConsignmentDoc;
};

function buildDocRows(data: Consignment): DocRow[] {
  const reqs = data.requirements ?? [];
  const docs = data.documents ?? [];
  const byType = new Map<string, ConsignmentDoc>();
  for (const d of docs) byType.set(d.docType, d);

  const rows: DocRow[] = reqs.map((r) => {
    const doc = byType.get(r.docType);
    return {
      docType: r.docType,
      label: r.label,
      required: r.required,
      status: doc?.status ?? "pending",
      doc,
    };
  });
  // Any uploaded docs that don't match a known requirement (e.g. "other")
  for (const d of docs) {
    if (!reqs.some((r) => r.docType === d.docType)) {
      rows.push({
        docType: d.docType,
        label: d.docLabel || d.docType,
        required: d.isRequired,
        status: d.status,
        doc: d,
      });
    }
  }
  return rows;
}

export default function ConsignmentDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["consignment", id],
    queryFn: () => fetchConsignment(id!),
    enabled: !!id,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ docType, asset }: { docType: string; asset: ImagePicker.ImagePickerAsset }) =>
      uploadDocument(id!, docType, asset),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["consignment", id] });
    },
  });

  const handlePickAndUpload = async (docType: string, label: string) => {
    if (uploadingType) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Photo access needed",
          "Allow photo access so you can attach a copy of your document.",
        );
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.85,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      setUploadingType(docType);
      await uploadMutation.mutateAsync({ docType, asset: picked.assets[0] });
      Alert.alert("Uploaded", `${label} uploaded for review.`);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Could not upload document.");
    } finally {
      setUploadingType(null);
    }
  };

  const topPad = Platform.OS === "web" ? 24 : insets.top + 12;
  const rows = data ? buildDocRows(data) : [];
  const canUpload = data ? data.status !== "Approved" && data.status !== "Rejected" : false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          <Text style={[styles.backTxt, { color: colors.foreground }]}>Back</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
      >
        {isLoading ? (
          <View style={{ paddingVertical: 64, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.destructive, fontWeight: "600" }}>
              Unable to load consignment
            </Text>
            <Text style={{ color: colors.mutedForeground, marginTop: 6 }}>
              {(error as Error).message}
            </Text>
          </View>
        ) : data ? (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.ref, { color: colors.mutedForeground }]}>
                {data.referenceNo ?? data.id.slice(0, 8).toUpperCase()}
              </Text>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {data.commodityName}
              </Text>
              {data.commodityCategory ? (
                <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>
                  {data.commodityCategory}
                </Text>
              ) : null}

              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: statusColor(data.status, colors) + "20" },
                ]}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor(data.status, colors) }]}
                />
                <Text style={{ color: statusColor(data.status, colors), fontWeight: "600" }}>
                  {data.status}
                </Text>
              </View>

              {data.statusNote ? (
                <Text style={[styles.note, { color: colors.mutedForeground }]}>
                  {data.statusNote}
                </Text>
              ) : null}

              <View style={styles.metaRow}>
                {data.quantity ? (
                  <View style={styles.metaCell}>
                    <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
                      Quantity
                    </Text>
                    <Text style={[styles.metaValue, { color: colors.foreground }]}>
                      {String(data.quantity)} {data.unit ?? ""}
                    </Text>
                  </View>
                ) : null}
                {data.originCountry ? (
                  <View style={styles.metaCell}>
                    <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
                      Origin
                    </Text>
                    <Text style={[styles.metaValue, { color: colors.foreground }]}>
                      {data.originCountry}
                    </Text>
                  </View>
                ) : null}
                {data.destinationCountry ? (
                  <View style={styles.metaCell}>
                    <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
                      Destination
                    </Text>
                    <Text style={[styles.metaValue, { color: colors.foreground }]}>
                      {data.destinationCountry}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {rows.length > 0 ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Documents
                </Text>
                {rows.map((row) => {
                  const isUploading = uploadingType === row.docType;
                  const needsAction = row.status === "pending" || row.status === "rejected";
                  const showUpload = canUpload && needsAction;
                  const statusLabel =
                    row.status === "pending"
                      ? row.required ? "Missing" : "Optional"
                      : row.status.charAt(0).toUpperCase() + row.status.slice(1);
                  return (
                    <View key={row.docType} style={styles.docRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                          {row.label}
                          {row.required ? (
                            <Text style={{ color: colors.destructive }}> *</Text>
                          ) : null}
                        </Text>
                        <View style={styles.docStatusRow}>
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: docStatusColor(row.status, colors) },
                            ]}
                          />
                          <Text
                            style={{
                              color: docStatusColor(row.status, colors),
                              fontSize: 12,
                              fontWeight: "600",
                            }}
                          >
                            {statusLabel}
                          </Text>
                          {row.doc?.fileName ? (
                            <Text
                              style={{ color: colors.mutedForeground, fontSize: 12 }}
                              numberOfLines={1}
                            >
                              • {row.doc.fileName}
                            </Text>
                          ) : null}
                        </View>
                        {row.doc?.rejectReason || row.doc?.reviewNotes ? (
                          <Text
                            style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}
                          >
                            {row.doc.rejectReason || row.doc.reviewNotes}
                          </Text>
                        ) : null}
                      </View>
                      {showUpload ? (
                        <Pressable
                          onPress={() => handlePickAndUpload(row.docType, row.label)}
                          disabled={!!uploadingType}
                          style={({ pressed }) => [
                            styles.uploadBtn,
                            {
                              backgroundColor: colors.primary,
                              opacity: pressed || uploadingType ? 0.7 : 1,
                            },
                          ]}
                        >
                          {isUploading ? (
                            <ActivityIndicator color={colors.primaryForeground} size="small" />
                          ) : (
                            <>
                              <Ionicons
                                name="cloud-upload-outline"
                                size={16}
                                color={colors.primaryForeground}
                              />
                              <Text
                                style={{ color: colors.primaryForeground, fontWeight: "600" }}
                              >
                                {row.status === "rejected" ? "Replace" : "Upload"}
                              </Text>
                            </>
                          )}
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}

            {data.history && data.history.length > 0 ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Status history
                </Text>
                {data.history.map((h) => (
                  <View key={h.id} style={styles.historyRow}>
                    <View
                      style={[
                        styles.historyDot,
                        { backgroundColor: statusColor(h.toStatus, colors) },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                        {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : h.toStatus}
                      </Text>
                      {h.note ? (
                        <Text style={{ color: colors.mutedForeground, marginTop: 2 }}>
                          {h.note}
                        </Text>
                      ) : null}
                      <Text
                        style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}
                      >
                        {h.actorName ? `${h.actorName} • ` : ""}
                        {new Date(h.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 6 },
  backTxt: { fontSize: 16, fontWeight: "500" },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  ref: { fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" },
  title: { fontSize: 22, fontWeight: "700", marginTop: 4 },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  note: { marginTop: 10, lineHeight: 20 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 16 },
  metaCell: { minWidth: 100 },
  metaLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 15, fontWeight: "600", marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  historyRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  historyDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(127,127,127,0.25)",
  },
  docStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 96,
    justifyContent: "center",
  },
});
