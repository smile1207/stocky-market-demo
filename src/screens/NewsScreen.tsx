import { ScrollView, Text } from "react-native";
import { NewsFeed } from "../components/news/NewsFeed";
import { useGameStore } from "../store/GameStore";

export function NewsScreen() {
  const { game } = useGameStore();
  if (!game) return <Text>行情載入中...</Text>;

  return (
    <ScrollView contentContainerStyle={{ padding: 18 }}>
      <NewsFeed logs={game.marketLogs} />
    </ScrollView>
  );
}
