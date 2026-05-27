import { useMemo, useState } from "react";
import { GameState } from "../types/domain";

export function useSelectedStock(game?: GameState) {
  const [selectedId, setSelectedId] = useState("grain-port");
  const selectedStock = useMemo(
    () => game?.stocks.find((stock) => stock.id === selectedId) ?? game?.stocks[0],
    [game, selectedId]
  );

  return { selectedId, selectedStock, setSelectedId };
}
