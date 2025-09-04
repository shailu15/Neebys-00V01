import React from "react";
import { Text, View, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator"; // keep as-is
import { useRouter } from "expo-router";
import { styles } from "../../styles/auth.styles";

export default function Index() {
  const router = useRouter();

  // --- same functionality ---
  const optimizeImage = async (uri: string) => {
    try {
      const { uri: optimizedUri } = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return optimizedUri;
    } catch (e) {
      console.log("optimizeImage error:", e);
      return uri;
    }
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Denied",
        "Camera access is required to take photos."
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      const rawUri = result.assets[0].uri;
      const optimizedUri = await optimizeImage(rawUri);
      router.push({
        pathname: "/(tabs)/Edit",
        params: { image: optimizedUri },
      });
    }
  };

  const openMediaPicker = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Denied", "Photos access is required.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!res.canceled) {
      const rawUri = res.assets[0].uri;
      const optimizedUri = await optimizeImage(rawUri);
      router.push({
        pathname: "/(tabs)/Edit",
        params: { image: optimizedUri },
      });
    }
  };

  return (
    <View style={[styles.container, localStyles.screen]}>
      {/* Title & subtitle */}
      <Text style={[styles.text1, localStyles.title]}>Neebys AI API App</Text>
      <Text style={localStyles.subtitle}>
        Use Camera To Upload Your Invoice And Feel The Magic
      </Text>

      {/* Instructions wrapped in a soft card */}
      <View style={localStyles.card}>
        <Text style={localStyles.cardHeading}>Instructions To Use The App</Text>
        <Text style={localStyles.step}>
          Step 1: Click On The Camera Icon Below And Take A Snap Of Your Invoice
        </Text>
        <Text style={localStyles.step}>
          Step 2: After Uploading Invoice Your Will Be Auto-Directed To Edit
          Screen
        </Text>
        <Text style={localStyles.step}>
          Step 3: Your Can Refer The Product List You Store Has And If Any
          Correction Needed Edit The List Using Prompt Box Given Below
        </Text>
        <Text style={localStyles.step}>
          Step 4: Once Everything Is Correct Click On Go Live Button{" "}
          <Text style={styles.green}>🟢</Text> Which Will Take You To 3rd Screen
          Live
        </Text>
        <Text style={localStyles.step}>
          Step 5: Now You Can Go Check Your Sales And Customer Review In Screen
          4th Dashboard
        </Text>
        <Text style={localStyles.step}>
          Option To Logout - Screen 5th Profile , You Can Log Out And Even
          Change Your Verification
        </Text>
      </View>

      {/* Actions row */}
      <View style={localStyles.actionsRow}>
        <TouchableOpacity
          onPress={openCamera}
          style={localStyles.action}
          activeOpacity={0.85}
        >
          <View style={localStyles.actionBtn}>
            <Ionicons name="camera" size={34} color="#0f172a" />
          </View>
          <Text style={localStyles.actionLabel}>Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={openMediaPicker}
          style={localStyles.action}
          activeOpacity={0.85}
        >
          <View style={localStyles.actionBtn}>
            <Ionicons name="images-outline" size={34} color="#0f172a" />
          </View>
          <Text style={localStyles.actionLabel}>Media picker</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  screen: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28, // extra bottom space above tab bar
    backgroundColor: "#f8fafc",
  },

  title: {
    textAlign: "center",
    marginTop: 2,
    marginBottom: 6,
    color: "#0f172a",
    letterSpacing: 0.3,
  },
  subtitle: {
    textAlign: "center",
    color: "#475569",
    marginBottom: 14,
    lineHeight: 20,
  },

  // Card around the steps
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "#eef2f7",
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  step: {
    color: "#334155",
    lineHeight: 20,
  },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 28,
    marginTop: 20,
    marginBottom: 10,
  },
  action: {
    alignItems: "center",
  },
  actionBtn: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: "#e9f0ff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#dbe7ff",
  },
  actionLabel: {
    marginTop: 8,
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
