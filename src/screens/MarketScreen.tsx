import { ScrollView, Text, View } from "react-native";
import { StockCard } from "../components/market/StockCard";
import { TradePanel } from "../components/market/TradePanel";
import { useGameActions } from "../hooks/useGameActions";
import { useSelectedStock } from "../hooks/useSelectedStock";
import { useGameStore } from "../store/GameStore";

export function MarketScreen() {
  const { game } = useGameStore();
  const { trade } = useGameActions();
  const { selectedId, selectedStock, setSelectedId } = useSelectedStock(game);

  if (!game || !selectedStock) return <Text>市場載入中...</Text>;

  return (
    <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
      <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
        {game.stocks.map((stock) => (
          <StockCard key={stock.id} stock={stock} selected={stock.id === selectedId} onPress={() => setSelectedId(stock.id)} />
        ))}
      </ScrollView>
      <View style={{ padding: 14, borderRadius: 8, backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#e3dac9" }}>
        <Text style={{ fontSize: 22, fontWeight: "900" }}>{selectedStock.name}</Text>
        <Text style={{ fontSize: 42, fontWeight: "900" }}>${selectedStock.price.toFixed(2)}</Text>
        <Text style={{ color: "#52615e", lineHeight: 20 }}>{selectedStock.description}</Text>
      </View>
      <TradePanel onTrade={(side, shares) => trade(selectedStock.id, side, shares)} />
    </ScrollView>
  );
}
