import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Profile() {
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          // Implement your logout logic here
          console.log("User logged out");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👤 Profile</Text>

      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: "https://i.pravatar.cc/150?img=3" }} // Sample avatar
          style={styles.avatar}
        />
        <TouchableOpacity style={styles.editIcon}>
          <Ionicons name="create-outline" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.info}>John Doe</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.info}>johndoe@example.com</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Phone</Text>
        <Text style={styles.info}>+91 9876543210</Text>
      </View>

      <TouchableOpacity style={styles.editButton}>
        <Text style={styles.editText}>Edit Profile</Text>
      </TouchableOpacity>

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
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 30,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 120,
    backgroundColor: "#e0e0e0",
    padding: 5,
    borderRadius: 50,
  },
  infoBox: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: "#888",
  },
  info: {
    fontSize: 18,
    fontWeight: "500",
    color: "#000",
  },
  editButton: {
    marginTop: 30,
    backgroundColor: "#1e88e5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  editText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    marginTop: 15,
    backgroundColor: "#ef5350",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
