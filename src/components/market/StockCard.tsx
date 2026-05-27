import { Pressable, StyleSheet, Text } from "react-native";
import { Stock } from "../../types/domain";

type StockCardProps = {
  stock: Stock;
  selected: boolean;
  onPress: () => void;
};

export function StockCard({ stock, selected, onPress }: StockCardProps) {
  return (
    <Pressable style={[styles.root, selected && styles.selected]} onPress={onPress}>
      <Text style={[styles.code, selected && styles.selectedText]}>{stock.code}</Text>
      <Text style={[styles.name, selected && styles.selectedText]}>{stock.name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: 112, borderRadius: 8, padding: 10, backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#e3dac9" },
  selected: { backgroundColor: "#1b5b55", borderColor: "#1b5b55" },
  code: { color: "#8a4a64", fontSize: 12, fontWeight: "900" },
  name: { color: "#172321", fontSize: 13, fontWeight: "800", marginTop: 3 },
  selectedText: { color: "#fff" }
});
