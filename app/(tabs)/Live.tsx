import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Live() {
  const platforms = [
    { name: "Amazon", icon: "logo-amazon" },
    { name: "Flipkart", icon: "cart" },
    { name: "Meesho", icon: "storefront-outline" },
    { name: "JioMart", icon: "basket-outline" },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📡 Go Live With Your Products</Text>
      <Text style={styles.subtitle}>
        Choose a platform to upload your products:
      </Text>

      {platforms.map((platform, index) => (
        <TouchableOpacity key={index} style={styles.platformButton}>
          <Ionicons name={platform.icon as any} size={24} color="#fff" />
          <Text style={styles.platformText}>{platform.name}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.tip}>
        You can also upload to multiple platforms one by one.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: "#444",
  },
  platformButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e88e5",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  platformText: {
    color: "#fff",
    fontSize: 18,
    marginLeft: 15,
  },
  tip: {
    marginTop: 30,
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
});
