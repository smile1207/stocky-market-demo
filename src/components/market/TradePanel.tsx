import { Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { TradeSide } from "../../types/domain";

type TradePanelProps = {
  onTrade: (side: TradeSide, shares: number) => void;
  onSellRatio?: (ratio: number) => void;
};

const lots = [1, 5, 10];

export function TradePanel({ onTrade, onSellRatio }: TradePanelProps) {
  const [sellPercent, setSellPercent] = useState(25);
  const percentOptions = Array.from({ length: 20 }, (_, index) => (index + 1) * 5);

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
      {onSellRatio ? (
        <View style={styles.ratioPanel}>
          <Text style={styles.ratioTitle}>賣出持股比例</Text>
          <View style={styles.percentGrid}>
            {percentOptions.map((percent) => (
              <Pressable
                key={percent}
                style={[styles.percentButton, sellPercent === percent && styles.percentButtonActive]}
                onPress={() => setSellPercent(percent)}
              >
                <Text style={[styles.percentText, sellPercent === percent && styles.percentTextActive]}>{percent}%</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.ratioButtons}>
            <Pressable style={styles.ratioButton} onPress={() => onSellRatio(sellPercent / 100)}>
              <Text style={styles.ratioText}>賣出比例</Text>
            </Pressable>
            <Pressable style={styles.ratioButton} onPress={() => onSellRatio(1)}>
              <Text style={styles.ratioText}>全部賣</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
  buttonText: { color: "#fff", fontWeight: "900" },
  ratioPanel: { paddingTop: 10, borderTopWidth: 1, borderTopColor: "#e3dac9", gap: 8 },
  ratioTitle: { color: "#52615e", fontSize: 13, fontWeight: "900" },
  percentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  percentButton: { width: 52, height: 30, borderRadius: 8, backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#e3dac9", alignItems: "center", justifyContent: "center" },
  percentButtonActive: { backgroundColor: "#963f33", borderColor: "#963f33" },
  percentText: { color: "#52615e", fontSize: 12, fontWeight: "900" },
  percentTextActive: { color: "#fff" },
  ratioButtons: { flexDirection: "row", gap: 8 },
  ratioButton: { flex: 1, height: 38, borderRadius: 8, backgroundColor: "#f0d8d3", alignItems: "center", justifyContent: "center" },
  ratioText: { color: "#963f33", fontWeight: "900" }
});
