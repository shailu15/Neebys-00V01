import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text1: {
    fontWeight: "bold",
    fontSize: 22,
    marginBottom: 5,
  },
  instructionHTxt: {
    fontSize: 14,
    marginHorizontal: 5,
    marginVertical: 5,
  },
  instructionTxt: {
    fontSize: 10,
    marginHorizontal: 30,
    marginVertical: 5,
  },
  green: {
    fontSize: 12,
  },
  cameraBtn: {
    position: "absolute",
    bottom: 70, // adjust this to be just above the bottom tab bar
    right: 150,
    backgroundColor: "#1e90ff",
    borderRadius: 50,
    padding: 15,
    elevation: 5,
  },
});