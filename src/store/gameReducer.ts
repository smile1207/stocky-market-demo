import { GameState, TradeOrder } from "../types/domain";
import { applyTrade } from "../systems/market/TradeSystem";
import { advanceDay } from "../systems/market/MarketEngine";

export type GameAction =
  | { type: "hydrate"; state: GameState }
  | { type: "trade"; order: TradeOrder }
  | { type: "advanceDay" }
  | { type: "setMessage"; message: string };

export type GameStoreState = {
  game?: GameState;
  message: string;
};

export function gameReducer(state: GameStoreState, action: GameAction): GameStoreState {
  switch (action.type) {
    case "hydrate":
      return { game: action.state, message: "市場資料已載入。" };
    case "trade": {
      if (!state.game) return state;
      const result = applyTrade(state.game, action.order);
      return { game: { ...result.state, marketLogs: [...result.logs, ...result.state.marketLogs] }, message: result.message };
    }
    case "advanceDay":
      return state.game ? { game: advanceDay(state.game), message: "市場已推進至下一日。" } : state;
    case "setMessage":
      return { ...state, message: action.message };
    default:
      return state;
  }
}
