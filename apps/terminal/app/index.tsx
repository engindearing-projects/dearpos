import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>DearPOS</Text>
      <Text style={styles.tagline}>
        Yeah, it&rsquo;s a POS. Just not the way you mean it.
      </Text>
      <Text style={styles.note}>Terminal scaffold — v0.1 in progress.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf7f2",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 56,
    fontWeight: "600",
    color: "#1a1814",
  },
  tagline: {
    marginTop: 12,
    fontSize: 20,
    fontStyle: "italic",
    color: "#6b665e",
    textAlign: "center",
  },
  note: {
    marginTop: 32,
    fontSize: 14,
    color: "#6b665e",
  },
});
