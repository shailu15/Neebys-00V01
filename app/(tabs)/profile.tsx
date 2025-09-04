import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

export default function Profile() {
  const { signOut } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // ----- state -----
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); // always from Clerk
  const [phone, setPhone] = useState(""); // blank for new account
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // ----- per-user keys (prevents data leaking between accounts) -----
  const uid = user?.id ?? "anon";
  const K_NAME = useMemo(() => `profile.${uid}.name`, [uid]);
  const K_PHONE = useMemo(() => `profile.${uid}.phone`, [uid]);
  const K_AVATAR = useMemo(() => `profile.${uid}.avatar`, [uid]);
  const K_PHONE_VERIFIED = useMemo(() => `profile.${uid}.phoneVerified`, [uid]);

  // (optional legacy keys, only read as fallback if you previously used them)
  const LEGACY = {
    name: "profile.name",
    phone: "profile.phone",
    avatar: "profile.avatar",
    verified: "profile.phoneVerified",
  };

  // ----- load for THIS user only -----
  useEffect(() => {
    (async () => {
      if (!isLoaded || !user) return;

      try {
        // 1) Always take email from Clerk
        const authEmail =
          user.primaryEmailAddress?.emailAddress ||
          user.emailAddresses?.[0]?.emailAddress ||
          "";
        setEmail(authEmail);

        // 2) Load per-user stored values
        const [sName, sPhone, sAvatar, sVerified] = await Promise.all([
          AsyncStorage.getItem(K_NAME),
          AsyncStorage.getItem(K_PHONE),
          AsyncStorage.getItem(K_AVATAR),
          AsyncStorage.getItem(K_PHONE_VERIFIED),
        ]);

        // 3) Prefill from Clerk (fresh account) if nothing stored yet
        const fullNameFromClerk =
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.fullName ||
          "";

        const phoneFromClerk = user.phoneNumbers?.[0]?.phoneNumber || "";

        setName(sName ?? fullNameFromClerk);
        setPhone(sPhone ?? phoneFromClerk); // blank if none
        setAvatarUri(sAvatar ?? user.imageUrl ?? undefined);

        const verifiedFromMeta =
          typeof (user.unsafeMetadata as any)?.phoneVerified === "boolean"
            ? Boolean((user.unsafeMetadata as any).phoneVerified)
            : false;
        setPhoneVerified(sVerified ? sVerified === "true" : verifiedFromMeta);

        // (optional) migrate legacy keys into per-user keys on first load
        if (!sName || !sPhone || !sAvatar || !sVerified) {
          const [ln, lp, la, lv] = await Promise.all([
            AsyncStorage.getItem(LEGACY.name),
            AsyncStorage.getItem(LEGACY.phone),
            AsyncStorage.getItem(LEGACY.avatar),
            AsyncStorage.getItem(LEGACY.verified),
          ]);
          if (ln && !sName) await AsyncStorage.setItem(K_NAME, ln);
          if (lp && !sPhone) await AsyncStorage.setItem(K_PHONE, lp);
          if (la && !sAvatar) await AsyncStorage.setItem(K_AVATAR, la);
          if (lv && !sVerified)
            await AsyncStorage.setItem(K_PHONE_VERIFIED, lv);
        }
      } catch (e) {
        console.log("Load profile error:", e);
      }
    })();
  }, [isLoaded, user?.id, K_NAME, K_PHONE, K_AVATAR, K_PHONE_VERIFIED]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/login");
          } catch (e) {
            console.log("Logout error:", e);
          }
        },
      },
    ]);
  };

  // ----- save (per-user) -----
  const handleSave = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(K_NAME, name),
        AsyncStorage.setItem(K_PHONE, phone),
        AsyncStorage.setItem(K_PHONE_VERIFIED, String(phoneVerified)),
      ]);
      Alert.alert("Saved", "Your profile changes have been saved.");
      setEditing(false);
    } catch (e) {
      console.log("Save error:", e);
      Alert.alert("Error", "Could not save your changes.");
    }
  };

  const handleCancel = () => setEditing(false);

  // ----- avatar -----
  const changeAvatar = async () => {
    Alert.alert("Change picture", "Pick a source", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Camera",
        onPress: async () => {
          const camPerm = await ImagePicker.requestCameraPermissionsAsync();
          if (!camPerm.granted) {
            Alert.alert("Permission required", "Camera access is needed.");
            return;
          }
          const res = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.9,
          });
          if (!res.canceled) await persistAvatar(res.assets[0].uri);
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const libPerm =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!libPerm.granted) {
            Alert.alert("Permission required", "Photos access is needed.");
            return;
          }
          const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.9,
          });
          if (!res.canceled) await persistAvatar(res.assets[0].uri);
        },
      },
    ]);
  };

  const persistAvatar = async (uri: string) => {
    try {
      setAvatarUri(uri);
      await AsyncStorage.setItem(K_AVATAR, uri);
      Alert.alert("Updated", "Profile picture updated.");
    } catch (e) {
      console.log("Avatar save error:", e);
      Alert.alert("Error", "Could not update profile picture.");
    }
  };

  // ----- OTP via Clerk email -----
  const markVerified = async () => {
    setPhoneVerified(true);
    await Promise.all([
      AsyncStorage.setItem(K_PHONE, phone),
      AsyncStorage.setItem(K_PHONE_VERIFIED, "true"),
    ]);
    try {
      if (user) {
        await user.update({
          unsafeMetadata: {
            ...(user.unsafeMetadata as any),
            phone,
            phoneVerified: true,
          },
        });
      }
    } catch (err) {
      console.log("metadata update error:", err);
    }
    setOtpSent(false);
    setOtpCode("");
    setEditing(false);
  };

  const isAlreadyVerifiedError = (e: any) => {
    const code = e?.errors?.[0]?.code || "";
    const msg = e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || "";
    return (
      /already[_\s]?verified/i.test(code) ||
      /already\s*verified/i.test(msg) ||
      /verification.*passed/i.test(code)
    );
  };

  const sendOtpToEmail = async () => {
    try {
      if (!isLoaded || !user)
        return Alert.alert("Please wait", "User not ready yet.");
      if (phoneVerified)
        return Alert.alert(
          "Phone locked",
          "Your phone is already verified and cannot be changed."
        );

      const emailObj =
        user.primaryEmailAddress || user.emailAddresses?.[0] || null;
      if (!emailObj)
        return Alert.alert(
          "No email found",
          "This account doesn't have an email."
        );

      if (!phone.trim())
        return Alert.alert("Enter phone", "Please enter your phone number.");

      setSending(true);
      await emailObj.prepareVerification({ strategy: "email_code" });
      setOtpSent(true);
      Alert.alert("Code sent", "Check your email for the 6-digit code.");
    } catch (e: any) {
      console.log("sendOtpToEmail error:", e);
      if (isAlreadyVerifiedError(e)) {
        await markVerified();
        Alert.alert("Already verified", "Email was already verified.");
        return;
      }
      const msg =
        e?.errors?.[0]?.longMessage ||
        e?.errors?.[0]?.message ||
        "Could not send code.";
      Alert.alert("Error", msg);
    } finally {
      setSending(false);
    }
  };

  const verifyOtpFromEmail = async () => {
    try {
      if (!isLoaded || !user) return;
      if (phoneVerified) return;

      const emailObj =
        user.primaryEmailAddress || user.emailAddresses?.[0] || null;
      if (!emailObj) return;
      if (!otpCode.trim())
        return Alert.alert("Enter code", "Please type the 6-digit code.");

      setVerifying(true);
      await emailObj.attemptVerification({ code: otpCode });
      await markVerified();
      Alert.alert("Verified", "Your phone number is confirmed.");
    } catch (e: any) {
      console.log("verifyOtpFromEmail error:", e);
      if (isAlreadyVerifiedError(e)) {
        await markVerified();
        Alert.alert(
          "Verified",
          "Email already verified. Phone marked verified."
        );
        return;
      }
      const msg =
        e?.errors?.[0]?.longMessage ||
        e?.errors?.[0]?.message ||
        "Verification failed.";
      Alert.alert("Error", msg);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👤 Profile</Text>

      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: avatarUri || "https://i.pravatar.cc/150?img=3" }}
          style={styles.avatar}
        />
        <TouchableOpacity style={styles.editIcon} onPress={changeAvatar}>
          <Ionicons name="create-outline" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Name */}
      <View style={styles.infoBox}>
        <Text style={styles.label}>Name</Text>
        {editing ? (
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Your name"
          />
        ) : (
          <Text style={styles.info}>{name || "—"}</Text>
        )}
      </View>

      {/* Email (read-only from Clerk) */}
      <View style={styles.infoBox}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.info}>{email || "—"}</Text>
      </View>

      {/* Phone + verification */}
      <View style={styles.infoBox}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={styles.label}>Phone</Text>
          <Text
            style={{
              fontSize: 12,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 6,
              backgroundColor: phoneVerified ? "#E6F4EA" : "#F3F4F6",
              color: phoneVerified ? "#1E7B34" : "#6B7280",
            }}
          >
            {phoneVerified ? "Verified" : "Not verified"}
          </Text>
        </View>

        {editing ? (
          phoneVerified ? (
            <View style={styles.lockedRow}>
              <Text style={styles.info}>{phone || "—"}</Text>
              <View style={styles.lockPill}>
                <Ionicons name="lock-closed" size={14} color="#1E7B34" />
                <Text style={styles.lockPillText}>
                  Locked after verification
                </Text>
              </View>
            </View>
          ) : (
            <>
              <TextInput
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  setPhoneVerified(false);
                }}
                style={styles.input}
                placeholder="+91 9876543210"
                keyboardType="phone-pad"
              />

              {!otpSent ? (
                <TouchableOpacity
                  style={[styles.editButton, { marginTop: 10 }]}
                  onPress={sendOtpToEmail}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.editText}>Send OTP to Email</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={{ gap: 10, marginTop: 10 }}>
                  <TextInput
                    value={otpCode}
                    onChangeText={setOtpCode}
                    style={styles.input}
                    placeholder="Enter 6-digit OTP"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={verifyOtpFromEmail}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.editText}>Verify Code</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )
        ) : (
          <Text style={styles.info}>{phone || "—"}</Text>
        )}
      </View>

      {/* Edit / Save */}
      {editing ? (
        <View style={{ gap: 10, marginTop: 10 }}>
          <TouchableOpacity style={styles.editButton} onPress={handleSave}>
            <Text style={styles.editText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: "#9e9e9e" }]}
            onPress={handleCancel}
          >
            <Text style={styles.logoutText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setEditing(true)}
        >
          <Text style={styles.editText}>Edit Profile</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    flex: 1,
  },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 20 },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 30,
    position: "relative",
  },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 120,
    backgroundColor: "#e0e0e0",
    padding: 5,
    borderRadius: 50,
  },
  infoBox: { marginBottom: 15 },
  label: { fontSize: 14, color: "#888" },
  info: { fontSize: 18, fontWeight: "500", color: "#000" },
  editButton: {
    marginTop: 30,
    backgroundColor: "#1e88e5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  editText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  logoutButton: {
    marginTop: 15,
    backgroundColor: "#ef5350",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#000",
    backgroundColor: "#fafafa",
    marginTop: 6,
  },
  lockedRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E6F4EA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  lockPillText: { color: "#1E7B34", fontSize: 12, fontWeight: "600" },
});
