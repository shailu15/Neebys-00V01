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
  Animated,
  Easing,
  ScrollView,
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

  // text detection
  const [textStatus, setTextStatus] = useState<"unknown" | "text" | "no-text">(
    "unknown"
  );
  const [scanning, setScanning] = useState(false);

  // extracted OCR text
  const [extractedText, setExtractedText] = useState("");

  // 🆕 parsed items from OCR text
  const [parsedItems, setParsedItems] = useState<
    { name: string; qty: number; price: number }[]
  >([]);

  // pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;
  const waveLoopRef = useRef<Animated.CompositeAnimation | null>(null);

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

  // when a new image arrives, show it (save only if passes text check)
  useEffect(() => {
    if (!imageUriFromNav) return;
    setPreviewUri(imageUriFromNav);
    setImgLoading(true);
    setTextStatus("unknown");
    setExtractedText("");
  }, [imageUriFromNav]);

  // keep gallery in sync
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

  // OCR check + text store
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!previewUri) {
        setTextStatus("unknown");
        setExtractedText("");
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
        const textRaw =
          json?.ParsedResults?.[0]?.ParsedText?.toString?.() ?? "";
        const cleanedText = textRaw.replace(/\r\n/g, "\n").trim();

        const hasText = cleanedText.replace(/\s+/g, "").length >= 6;

        if (cancelled) return;

        setTextStatus(hasText ? "text" : "no-text");
        setExtractedText(hasText ? cleanedText : "");

        if (hasText) {
          ensureInGallery(previewUri);
        } else {
          removeFromGallery(previewUri);
          if (lastWarnedUriRef.current !== previewUri) {
            lastWarnedUriRef.current = previewUri;
            Alert.alert("No text found", "This image does not have text.");
          }
        }
      } catch (e) {
        console.log("OCR check error:", e);
        if (!cancelled) {
          setTextStatus("unknown");
          setExtractedText("");
        }
      } finally {
        if (!cancelled) setScanning(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [previewUri]);

  // 🆕 parse extracted text into structured items (Product, Qty, Price)
  useEffect(() => {
    if (!extractedText) {
      setParsedItems([]);
      return;
    }

    const lines = extractedText
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter((l) => l.length > 0);

    const items: { name: string; qty: number; price: number }[] = [];

    const toNumber = (s: string) => {
      // normalize commas as thousands; keep dot decimals
      const normalized = s.replace(/[^0-9.,]/g, "");
      // if both , and ., remove commas (common thousands)
      if (normalized.includes(".") && normalized.includes(",")) {
        return parseFloat(normalized.replace(/,/g, ""));
      }
      // if only comma, treat it as decimal
      if (!normalized.includes(".") && normalized.includes(",")) {
        return parseFloat(normalized.replace(/,/g, "."));
      }
      return parseFloat(normalized);
    };

    const parseLine = (line: string) => {
      // drop leading index like "1) " or "1. "
      line = line.replace(/^\d+[\).]\s*/, "");

      // try: name ... qty ... price(end)
      // find price at end
      const priceMatch = line.match(/(?:₹|\$|€)?\s?(\d+(?:[.,]\d{2})?)\s*$/);
      if (!priceMatch) return null;
      const priceVal = toNumber(priceMatch[1]);
      if (!isFinite(priceVal)) return null;

      const left = line.slice(0, priceMatch.index).trim();

      // qty patterns: "qty: 2", "x2", "2 pcs", trailing integer
      let qty = 1;
      let namePart = left;

      const qtyRegexes = [
        /\bqty[:\-]?\s*(\d+)\b/i,
        /\bquantity[:\-]?\s*(\d+)\b/i,
        /\bx\s*(\d+)\b/i,
        /(\d+)\s*(pcs|pieces|pk|pack|ct)\b/i,
        /(\d+)\s*$/i,
      ];

      for (const rx of qtyRegexes) {
        const m = left.match(rx);
        if (m) {
          const q = parseInt(m[1], 10);
          if (isFinite(q) && q > 0 && q < 10000) {
            qty = q;
            namePart = left.slice(0, m.index).trim();
            break;
          }
        }
      }

      // clean name
      namePart = namePart.replace(/[-–•:*|]+$/g, "").trim();
      if (!namePart || namePart.length < 2) return null;

      return { name: namePart, qty, price: priceVal };
    };

    for (const l of lines) {
      const item = parseLine(l);
      if (item) items.push(item);
    }

    setParsedItems(items);
  }, [extractedText]);

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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const raw = await AsyncStorage.getItem(IMAGES_KEY);
      setSavedImages(raw ? JSON.parse(raw) : []);
    } catch (e) {
      console.log("refresh error:", e);
    } finally {
      setTimeout(() => setRefreshing(false), 650);
    }
  };

  useEffect(() => {
    const pulse = (val: Animated.Value) =>
      Animated.sequence([
        Animated.timing(val, {
          toValue: 1,
          duration: 350,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(val, {
          toValue: 0,
          duration: 350,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]);

    if (refreshing) {
      waveLoopRef.current = Animated.loop(
        Animated.stagger(120, [pulse(wave1), pulse(wave2), pulse(wave3)])
      );
      waveLoopRef.current.start();
    } else {
      waveLoopRef.current?.stop?.();
      wave1.setValue(0);
      wave2.setValue(0);
      wave3.setValue(0);
    }
  }, [refreshing, wave1, wave2, wave3]);

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

  const barScale = (v: Animated.Value) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.3] });
  const barOpacity = (v: Animated.Value) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

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

      {/* Wave loader while refreshing */}
      {refreshing && (
        <View style={styles.waveWrap}>
          <Animated.View
            style={[
              styles.waveBar,
              {
                transform: [{ scaleY: barScale(wave1) }],
                opacity: barOpacity(wave1),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.waveBar,
              {
                transform: [{ scaleY: barScale(wave2) }],
                opacity: barOpacity(wave2),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.waveBar,
              {
                transform: [{ scaleY: barScale(wave3) }],
                opacity: barOpacity(wave3),
              },
            ]}
          />
        </View>
      )}

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

      {/* Extracted text (scrollable) */}
      {extractedText.length > 0 && (
        <View style={styles.ocrBox}>
          <Text style={styles.ocrTitle}>Extracted text</Text>
          <ScrollView
            style={styles.ocrScroll}
            contentContainerStyle={{ paddingRight: 6 }}
            showsVerticalScrollIndicator
          >
            <Text style={styles.ocrText}>{extractedText}</Text>
          </ScrollView>
        </View>
      )}

      {/* 🆕 Parsed “Product DB” table */}
      {parsedItems.length > 0 && (
        <View style={styles.tableWrap}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colName]}>Product</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colPrice]}>Price</Text>
          </View>

          <ScrollView style={styles.tableScroll} showsVerticalScrollIndicator>
            {parsedItems.map((it, idx) => (
              <View key={idx} style={styles.tr}>
                <Text style={[styles.td, styles.colName]} numberOfLines={1}>
                  {it.name}
                </Text>
                <Text style={[styles.td, styles.colQty]}>{it.qty}</Text>
                <Text style={[styles.td, styles.colPrice]}>
                  {isFinite(it.price) ? it.price.toFixed(2) : "-"}
                </Text>
              </View>
            ))}
          </ScrollView>
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
        refreshing={refreshing}
        onRefresh={onRefresh}
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
                    onLongPress={() => {
                      Alert.alert(
                        "Remove photo?",
                        "This will delete it from the gallery list.",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Remove",
                            style: "destructive",
                            onPress: () => {
                              removeFromGallery(item);
                              if (previewUri === item) setPreviewUri(undefined);
                            },
                          },
                        ]
                      );
                    }}
                    style={{ flex: 1 }}
                  >
                    <ExpoImage
                      source={{ uri: item }}
                      style={styles.thumb}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        "Remove photo?",
                        "This will delete it from the gallery list.",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Remove",
                            style: "destructive",
                            onPress: () => {
                              removeFromGallery(item);
                              if (previewUri === item) setPreviewUri(undefined);
                            },
                          },
                        ]
                      );
                    }}
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
    marginBottom: 8,
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

  /* wave loader */
  waveWrap: {
    height: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  waveBar: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1e90ff",
  },

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

  /* OCR output box */
  ocrBox: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  ocrTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
    color: "#111827",
  },
  ocrScroll: { maxHeight: 220 },
  ocrText: { fontSize: 13, color: "#374151", lineHeight: 18 },

  /* 🆕 Parsed table */
  tableWrap: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  th: { fontWeight: "700", color: "#111827" },
  tr: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  td: { color: "#111827" },
  colName: { flex: 2 },
  colQty: { flex: 0.6, textAlign: "center" as const },
  colPrice: { flex: 0.9, textAlign: "right" as const },
  tableScroll: { maxHeight: 220 },

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
  thumbWrap: { flex: 1 / 3, position: "relative" },
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
