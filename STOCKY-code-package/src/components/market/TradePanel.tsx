import { Pressable, StyleSheet, Text, View } from "react-native";
import { TradeSide } from "../../types/domain";

type TradePanelProps = {
  onTrade: (side: TradeSide, shares: number) => void;
};

const lots = [1, 5, 10];

export function TradePanel({ onTrade }: TradePanelProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>定價買賣</Text>
      {lots.map((lot) => (
        <View key={lot} style={styles.row}>
          <Text style={styles.lot}>{lot} 股</Text>
          <Pressable style={styles.buy} onPress={() => onTrade("buy", lot)}>
            <Text style={styles.buttonText}>買</Text>
          </Pressable>
          <Pressable style={styles.sell} onPress={() => onTrade("sell", lot)}>
            <Text style={styles.buttonText}>賣</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  title: { color: "#172321", fontSize: 16, fontWeight: "900", marginBottom: 2 },
  row: { minHeight: 52, borderRadius: 8, padding: 8, backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#e3dac9", flexDirection: "row", alignItems: "center", gap: 8 },
  lot: { flex: 1, color: "#172321", fontSize: 15, fontWeight: "900" },
  buy: { width: 76, height: 36, borderRadius: 8, backgroundColor: "#116647", alignItems: "center", justifyContent: "center" },
  sell: { width: 76, height: 36, borderRadius: 8, backgroundColor: "#963f33", alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "900" }
});
