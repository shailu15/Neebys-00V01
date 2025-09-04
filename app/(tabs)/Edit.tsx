import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system";

const IMAGES_KEY = "captured.images"; // stores an array of image URIs

export default function Products() {
  const [products, setProducts] = useState<string[]>([]);
  const [productName, setProductName] = useState("");

  // incoming image from Home
  const params = useLocalSearchParams();
  const imageParam = Array.isArray(params.image)
    ? params.image?.[0]
    : (params.image as string | undefined);

  const imageUriFromNav = useMemo(() => imageParam || undefined, [imageParam]);

  // current large preview
  const [previewUri, setPreviewUri] = useState<string | undefined>(
    imageUriFromNav
  );

  // loading indicator for preview
  const [imgLoading, setImgLoading] = useState(true);

  // persistent gallery
  const [savedImages, setSavedImages] = useState<string[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // ✅ text detection state: "unknown" | "text" | "no-text"
  const [textStatus, setTextStatus] = useState<"unknown" | "text" | "no-text">(
    "unknown"
  );
  const [scanning, setScanning] = useState(false);

  // prevent duplicate alerts per image
  const lastWarnedUriRef = useRef<string | undefined>(undefined);

  // load gallery on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(IMAGES_KEY);
        if (raw) {
          const arr: string[] = JSON.parse(raw);
          setSavedImages(arr);
        }
      } catch (e) {
        console.log("Load gallery error:", e);
      }
    })();
  }, []);

  // when a new image arrives, show it (don't save yet; we save only if it passes text check)
  useEffect(() => {
    if (!imageUriFromNav) return;
    setPreviewUri(imageUriFromNav);
    setImgLoading(true);
    setTextStatus("unknown");
  }, [imageUriFromNav]);

  // helpers to keep gallery in sync
  const ensureInGallery = (uri: string) => {
    setSavedImages((prev) => {
      if (prev.includes(uri)) return prev;
      const next = [uri, ...prev];
      AsyncStorage.setItem(IMAGES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const removeFromGallery = (uri: string) => {
    setSavedImages((prev) => {
      if (!prev.includes(uri)) return prev;
      const next = prev.filter((u) => u !== uri);
      AsyncStorage.setItem(IMAGES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  // ✅ OCR check: green if text found, red if not
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!previewUri) {
        setTextStatus("unknown");
        return;
      }
      try {
        setScanning(true);
        setTextStatus("unknown");

        const base64 = await FileSystem.readAsStringAsync(previewUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const body =
          "apikey=helloworld" +
          "&language=eng" +
          "&isOverlayRequired=false" +
          "&OCREngine=2" +
          "&scale=true" +
          "&detectOrientation=true" +
          "&base64Image=" +
          encodeURIComponent(`data:image/jpg;base64,${base64}`);

        const res = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });

        const json = await res.json();
        const text = json?.ParsedResults?.[0]?.ParsedText?.toString?.() ?? "";

        const hasText = text.replace(/\s+/g, "").length >= 6;

        if (cancelled) return;

        setTextStatus(hasText ? "text" : "no-text");

        if (hasText) {
          // ✅ only save if text exists
          ensureInGallery(previewUri);
        } else {
          // ❌ do not save; remove if present and alert once
          removeFromGallery(previewUri);
          if (lastWarnedUriRef.current !== previewUri) {
            lastWarnedUriRef.current = previewUri;
            Alert.alert("No text found", "This image does not have text.");
          }
        }
      } catch (e) {
        console.log("OCR check error:", e);
        if (!cancelled) setTextStatus("unknown");
      } finally {
        if (!cancelled) setScanning(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [previewUri]);

  const addProduct = () => {
    if (productName.trim()) {
      setProducts((p) => [...p, productName.trim()]);
      setProductName("");
    }
  };

  const removeImage = (uri: string) => {
    Alert.alert("Remove photo?", "This will delete it from the gallery list.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          removeFromGallery(uri);
          if (previewUri === uri) setPreviewUri(undefined);
        },
      },
    ]);
  };

  const borderColor =
    textStatus === "text"
      ? "#22c55e"
      : textStatus === "no-text"
        ? "#ef4444"
        : "#e5e7eb";

  const glowStyle =
    textStatus === "text"
      ? styles.greenGlow
      : textStatus === "no-text"
        ? styles.redGlow
        : undefined;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header row with right gallery icon + badge */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>🛍️ Products</Text>

        <TouchableOpacity
          onPress={() => setGalleryOpen(true)}
          style={styles.galleryBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="images-outline" size={24} color="#111" />
          {savedImages.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {savedImages.length > 99 ? "99+" : savedImages.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Large preview with text/no-text border */}
      {!!previewUri && (
        <View style={[styles.previewWrap, { borderColor }, glowStyle]}>
          <ExpoImage
            source={{ uri: previewUri }}
            style={styles.preview}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={120}
            onLoadStart={() => setImgLoading(true)}
            onLoadEnd={() => setImgLoading(false)}
          />

          {(imgLoading || scanning) && (
            <View className="overlay" style={styles.previewOverlay}>
              <ActivityIndicator color="#111" size="small" />
              <Text style={styles.scanLabel}>
                {imgLoading ? "Loading…" : "Scanning for text…"}
              </Text>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={products}
        keyExtractor={(item, index) => index.toString()}
        ListEmptyComponent={<Text style={styles.empty}>No products yet</Text>}
        renderItem={({ item }) => (
          <View style={styles.itemBox}>
            <Text style={styles.itemText}>{item}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          value={productName}
          onChangeText={setProductName}
          placeholder="Type product name..."
          style={styles.promptInput}
        />
        <TouchableOpacity onPress={addProduct} style={styles.sendButton}>
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* Gallery modal */}
      <Modal
        visible={galleryOpen}
        animationType="slide"
        onRequestClose={() => setGalleryOpen(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Your photos</Text>
            <TouchableOpacity onPress={() => setGalleryOpen(false)}>
              <Ionicons name="close" size={26} color="#111" />
            </TouchableOpacity>
          </View>

          {savedImages.length === 0 ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#666" }}>No photos yet</Text>
            </View>
          ) : (
            <FlatList
              data={savedImages}
              keyExtractor={(u) => u}
              numColumns={3}
              contentContainerStyle={{ padding: 12 }}
              columnWrapperStyle={{ gap: 8 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <View style={styles.thumbWrap}>
                  <TouchableOpacity
                    onPress={() => {
                      setPreviewUri(item);
                      setGalleryOpen(false);
                    }}
                    onLongPress={() => removeImage(item)}
                    style={{ flex: 1 }}
                  >
                    <ExpoImage
                      source={{ uri: item }}
                      style={styles.thumb}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  </TouchableOpacity>

                  {/* NEW: delete button overlay */}
                  <TouchableOpacity
                    onPress={() => removeImage(item)}
                    style={styles.trashBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  header: { fontSize: 24, fontWeight: "bold" },
  galleryBtn: { padding: 4 },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#1e90ff",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  // preview wrapper with border/glow
  previewWrap: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    backgroundColor: "#f6f6f6",
    position: "relative",
  },
  greenGlow: {
    shadowColor: "#22c55e",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  redGlow: {
    shadowColor: "#ef4444",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  preview: {
    width: "100%",
    height: 260,
    borderRadius: 8,
    backgroundColor: "#f6f6f6",
  },
  previewOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  scanLabel: { fontSize: 12, color: "#4b5563" },

  itemBox: {
    backgroundColor: "#f3f3f3",
    padding: 14,
    marginBottom: 10,
    borderRadius: 8,
  },
  itemText: { fontSize: 16 },
  empty: { color: "#888", textAlign: "center", marginTop: 40 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 25,
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  promptInput: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    borderRadius: 20,
  },
  sendButton: {
    backgroundColor: "#1e90ff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginLeft: 10,
  },
  sendText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  // modal
  modalWrap: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },

  // gallery thumbs
  thumbWrap: {
    flex: 1 / 3,
    position: "relative",
  },
  thumb: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
  },
  trashBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
