import { GameState } from "../../types/domain";
import { seedStocks } from "./seedStocks";
import { createMarketSignal } from "./seedSignals";

export function createInitialGameState(): GameState {
  return {
    player: {
      id: "player-1",
      cash: 1200,
      token: 2
    },
    economy: {
      day: 1,
      inflation: 0.021,
      marketHeat: 0.46,
      stabilityFund: 240,
      foresightUsedToday: false
    },
    stocks: seedStocks.map((stock) => ({ ...stock })),
    holdings: [],
    activeSignals: [],
    upcomingSignal: createMarketSignal(2, 0),
    tradeLogs: [],
    marketLogs: [
      {
        id: "initial-market-log",
        day: 1,
        type: "system",
        title: "市場模組啟動",
        body: "第一階段測試開始，採單機模擬。",
        createdAt: new Date().toISOString()
      }
    ]
  };
}
