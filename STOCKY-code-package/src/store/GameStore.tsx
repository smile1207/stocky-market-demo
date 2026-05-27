import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useReducer, type Dispatch } from "react";
import { saveGameState, loadGameState } from "../database/repositories/GameRepository";
import { GameAction, GameStoreState, gameReducer } from "./gameReducer";

type GameContextValue = GameStoreState & {
  dispatch: Dispatch<GameAction>;
};

const GameContext = createContext<GameContextValue | undefined>(undefined);

export function GameProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(gameReducer, { message: "市場載入中..." });

  useEffect(() => {
    loadGameState().then((game) => dispatch({ type: "hydrate", state: game }));
  }, []);

  useEffect(() => {
    if (state.game) saveGameState(state.game).catch((error) => console.warn("saveGameState failed", error));
  }, [state.game]);

  const value = useMemo(() => ({ ...state, dispatch }), [state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameStore(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGameStore must be used inside GameProvider");
  return context;
}
