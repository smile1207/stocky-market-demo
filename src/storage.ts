import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import { createInitialState } from "./marketEngine";
import { GameState, TalentProfile } from "./types";

const databaseName = "stocky-market-demo.db";

type Database = SQLite.SQLiteDatabase;

async function openDb(): Promise<Database> {
  return SQLite.openDatabaseAsync(databaseName);
}

// Cookie Helper Functions for Web
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + encodeURIComponent(value || "") + expires + "; path=/";
}

export async function loadGameState(): Promise<GameState> {
  if (Platform.OS === "web") {
    const cookieVal = getCookie("game_state");
    if (!cookieVal) {
      const initial = createInitialState();
      await saveGameState(initial);
      return initial;
    }
    try {
      return JSON.parse(cookieVal) as GameState;
    } catch (e) {
      console.warn("Failed to parse game state cookie, creating new state", e);
      const initial = createInitialState();
      await saveGameState(initial);
      return initial;
    }
  }

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
  if (Platform.OS === "web") {
    setCookie("game_state", JSON.stringify(state));
    return;
  }

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

export async function loadTalentProfile(): Promise<TalentProfile> {
  if (Platform.OS === "web") {
    const cookieVal = getCookie("talent_profile");
    if (!cookieVal) {
      return normalizeTalentProfile({});
    }
    try {
      return normalizeTalentProfile(JSON.parse(cookieVal));
    } catch (e) {
      console.warn("Failed to parse talent profile cookie", e);
      return normalizeTalentProfile({});
    }
  }

  const db = await openDb();
  await db.execAsync("CREATE TABLE IF NOT EXISTS talent_profile (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);");
  const row = await db.getFirstAsync<{ payload: string }>("SELECT payload FROM talent_profile WHERE id = 'current';");
  return normalizeTalentProfile(row ? JSON.parse(row.payload) : {});
}

export async function saveTalentProfile(profile: TalentProfile): Promise<void> {
  if (Platform.OS === "web") {
    setCookie("talent_profile", JSON.stringify(profile));
    return;
  }

  const db = await openDb();
  await db.execAsync("CREATE TABLE IF NOT EXISTS talent_profile (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);");
  await db.runAsync(
    "INSERT OR REPLACE INTO talent_profile (id, payload) VALUES (?, ?);",
    "current",
    JSON.stringify(profile)
  );
}

export async function resetGameStateWithCash(initialCash: number): Promise<GameState> {
  const initial = createInitialState(initialCash);
  await saveGameState(initial);
  return initial;
}

function normalizeTalentProfile(profile: Partial<TalentProfile>): TalentProfile {
  return {
    availablePoints: Number(profile.availablePoints) || 0,
    lifetimePoints: Number(profile.lifetimePoints) || 0,
    talentLevels: profile.talentLevels || {}
  };
}
