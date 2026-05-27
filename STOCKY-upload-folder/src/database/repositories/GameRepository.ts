import { GameState } from "../../types/domain";
import { createInitialGameState } from "../../systems/market/createInitialGameState";
import { openStockyDatabase } from "../sqlite";

const snapshotId = "current";

export async function loadGameState(): Promise<GameState> {
  const db = await openStockyDatabase();
  await db.execAsync("CREATE TABLE IF NOT EXISTS game_snapshots (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);");
  const row = await db.getFirstAsync<{ payload: string }>("SELECT payload FROM game_snapshots WHERE id = ?;", snapshotId);
  if (!row) {
    const initial = createInitialGameState();
    await saveGameState(initial);
    return initial;
  }
  return JSON.parse(row.payload) as GameState;
}

export async function saveGameState(state: GameState): Promise<void> {
  const db = await openStockyDatabase();
  await db.execAsync("CREATE TABLE IF NOT EXISTS game_snapshots (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);");
  await db.runAsync("INSERT OR REPLACE INTO game_snapshots (id, payload) VALUES (?, ?);", snapshotId, JSON.stringify(state));
}

export async function resetGameState(): Promise<GameState> {
  const initial = createInitialGameState();
  await saveGameState(initial);
  return initial;
}
