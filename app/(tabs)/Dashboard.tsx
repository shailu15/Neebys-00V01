import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function Dashboard() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📊 Sales Dashboard</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total Sales</Text>
        <Text style={styles.cardValue}>₹1,25,000</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total Orders</Text>
        <Text style={styles.cardValue}>325</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total Customers</Text>
        <Text style={styles.cardValue}>180</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Products Live</Text>
        <Text style={styles.cardValue}>62</Text>
      </View>

      <Text style={styles.subtitle}>Recent Activity</Text>
      <View style={styles.activityCard}>
        <Text>🟢 2 new orders placed</Text>
        <Text>🟠 1 product low on stock</Text>
        <Text>🔵 5 new customer signups</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f1f1f1",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 30,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    color: "#555",
  },
  cardValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
  },
  activityCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
