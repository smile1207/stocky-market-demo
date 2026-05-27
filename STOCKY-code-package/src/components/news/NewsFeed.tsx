import { StyleSheet, Text, View } from "react-native";
import { MarketLog } from "../../types/domain";

type NewsFeedProps = {
  logs: MarketLog[];
};

export function NewsFeed({ logs }: NewsFeedProps) {
  return (
    <View style={styles.root}>
      {logs.map((log) => (
        <View key={log.id} style={styles.row}>
          <View style={styles.dot} />
          <Text style={styles.text}>{log.body}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 0 },
  row: { flexDirection: "row", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#e3dac9" },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: "#8a4a64" },
  text: { flex: 1, color: "#23302f", fontSize: 14, lineHeight: 20, fontWeight: "700" }
});
