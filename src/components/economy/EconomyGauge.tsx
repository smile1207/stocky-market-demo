import { StyleSheet, Text, View } from "react-native";

type EconomyGaugeProps = {
  label: string;
  value: number;
  displayValue: string;
  danger?: boolean;
};

export function EconomyGauge({ label, value, displayValue, danger = false }: EconomyGaugeProps) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, danger && styles.danger]}>{displayValue}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(0, Math.min(1, value)) * 100}%` }, danger && styles.fillDanger]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  header: { flexDirection: "row", justifyContent: "space-between" },
  label: { color: "#52615e", fontSize: 12, fontWeight: "700" },
  value: { color: "#172321", fontSize: 12, fontWeight: "800" },
  danger: { color: "#963f33" },
  track: { height: 6, borderRadius: 3, backgroundColor: "#e6dfd1", overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: "#1b5b55" },
  fillDanger: { backgroundColor: "#963f33" }
});
