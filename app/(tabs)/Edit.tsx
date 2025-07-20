import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { useLocalSearchParams } from "expo-router";
export default function Products() {

  const [products, setProducts] = useState<string[]>([]);
  const [productName, setProductName] = useState("");

  const { image } = useLocalSearchParams();
  const addProduct = () => {
    if (productName.trim()) {
      setProducts([...products, productName]);
      setProductName("");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Text style={styles.header}>🛍️ Products</Text>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
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
  sendText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
