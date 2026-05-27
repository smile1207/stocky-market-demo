import { Pressable, StyleSheet, Text, View } from "react-native";
import { Holding, Stock } from "../../types/domain";

type HoldingRowProps = {
  holding: Holding;
  stock: Stock;
  onPress: () => void;
};

export function HoldingRow({ holding, stock, onPress }: HoldingRowProps) {
  const value = holding.shares * stock.price;
  const pnl = ((stock.price - holding.averageCost) / holding.averageCost) * 100;

  return (
    <Pressable style={styles.root} onPress={onPress}>
      <View>
        <Text style={styles.name}>{stock.name}</Text>
        <Text style={styles.meta}>
          {holding.shares} 股 · 均價 ${holding.averageCost.toFixed(2)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.value}>${value.toFixed(0)}</Text>
        <Text style={pnl >= 0 ? styles.up : styles.down}>{pnl.toFixed(1)}%</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: 70, borderRadius: 8, padding: 12, backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#e3dac9", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  name: { color: "#172321", fontSize: 16, fontWeight: "900" },
  meta: { color: "#52615e", fontSize: 12, marginTop: 4, fontWeight: "700" },
  right: { alignItems: "flex-end" },
  value: { color: "#172321", fontSize: 16, fontWeight: "900" },
  up: { color: "#116647", fontSize: 12, fontWeight: "900", marginTop: 4 },
  down: { color: "#963f33", fontSize: 12, fontWeight: "900", marginTop: 4 }
});
