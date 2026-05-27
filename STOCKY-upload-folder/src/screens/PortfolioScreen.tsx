import { ScrollView, Text } from "react-native";
import { HoldingRow } from "../components/portfolio/HoldingRow";
import { useGameStore } from "../store/GameStore";

export function PortfolioScreen() {
  const { game } = useGameStore();
  if (!game) return <Text>資產載入中...</Text>;

  return (
    <ScrollView contentContainerStyle={{ padding: 18, gap: 8 }}>
      {game.holdings.length === 0 ? (
        <Text>尚未持有股票</Text>
      ) : (
        game.holdings.map((holding) => {
          const stock = game.stocks.find((item) => item.id === holding.stockId);
          return stock ? <HoldingRow key={holding.stockId} holding={holding} stock={stock} onPress={() => undefined} /> : null;
        })
      )}
    </ScrollView>
  );
}
