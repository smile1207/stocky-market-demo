import * as SQLite from "expo-sqlite";
import { createInitialState } from "./marketEngine";
import { GameState } from "./types";

const databaseName = "stocky-market-demo.db";

type Database = SQLite.SQLiteDatabase;

async function openDb(): Promise<Database> {
  return SQLite.openDatabaseAsync(databaseName);
}

export async function loadGameState(): Promise<GameState> {
  const db = await openDb();
  await db.execAsync("CREATE TABLE IF NOT EXISTS game_state (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);");
  const row = await db.getFirstAsync<{ payload: string }>("SELECT payload FROM game_state WHERE id = 'current';");
  if (!row) {
    const initial = createInitialState();
    await saveGameState(initial);
    return initial;
  }
  return JSON.parse(row.payload) as GameState;
}

export async function saveGameState(state: GameState): Promise<void> {
  const db = await openDb();
  await db.execAsync("CREATE TABLE IF NOT EXISTS game_state (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);");
  await db.runAsync(
    "INSERT OR REPLACE INTO game_state (id, payload) VALUES (?, ?);",
    "current",
    JSON.stringify(state)
  );
}

export async function resetGameState(): Promise<GameState> {
  const initial = createInitialState();
  await saveGameState(initial);
  return initial;
}
