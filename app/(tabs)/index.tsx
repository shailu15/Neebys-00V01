import { Text, View, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
//import * as DocumentPicker from "expo-document-picker";
import { styles } from "../../styles/auth.styles";
import React from "react";

export default function Index() {
  const openCamera = async () => {
    // Ask for camera permissions
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Denied",
        "Camera access is required to take photos."
      );

      
      return;
    }

    // Launch the camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      console.log("Captured Image:", imageUri);
      // Navigate to Edit screen with imageUri if needed
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text1}>Neebys AI API App</Text>
      <Text>Use Camera To Upload Your Invoice And Feel The Magic</Text>
      <Text>Instructions To Use The App</Text>
      <Text style={styles.instructionTxt}>
        Step 1: Click On The Camera Icon Below And Take A Snap Of Your Invoice
      </Text>
      <Text style={styles.instructionTxt}>
        Step 2: After Uploading Invoice Your Will Be Auto-Directed To Edit
        Screen
      </Text>
      <Text style={styles.instructionTxt}>
        Step 3: Your Can Refer The Product List You Store Has And If Any
        Correction Needed Edit The List Using Prompt Box Given Below
      </Text>
      <Text style={styles.instructionTxt}>
        Step 4: Once Everything Is Correct Click On Go Live Button{" "}
        <Text style={styles.green}>🟢</Text> Which Will Take You To 3rd Screen
        Live, Here You Can Choose The Platform You Want To Upload Your Products
      </Text>
      <Text style={styles.instructionTxt}>
        Step 5: Now You Can Go Check Your Sales And Customer Review In Screen
        4th Dashboard
      </Text>
      <Text style={styles.instructionTxt}>
        Option To Logout - Screen 5th Profile , You Can Log Out And Even Change
        You Verification Of Store Location And Contact Details
      </Text>
      <TouchableOpacity style={styles.cameraBtn} onPress={openCamera}>
        <Ionicons name="camera" size={48} color="black" />
      </TouchableOpacity>
    </View>
  );
}
