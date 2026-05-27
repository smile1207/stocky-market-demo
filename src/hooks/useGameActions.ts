import { useCallback } from "react";
import { useGameStore } from "../store/GameStore";
import { TradeSide } from "../types/domain";

export function useGameActions() {
  const { dispatch } = useGameStore();

  const trade = useCallback(
    (stockId: string, side: TradeSide, shares: number) => {
      dispatch({ type: "trade", order: { stockId, side, shares } });
    },
    [dispatch]
  );

  const nextDay = useCallback(() => {
    dispatch({ type: "advanceDay" });
  }, [dispatch]);

  return { trade, nextDay };
}
