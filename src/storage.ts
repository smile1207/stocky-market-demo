import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import { createInitialState } from "./marketEngine";
import { GameState, TalentProfile } from "./types";

const databaseName = "stocky-market-demo.db";
const gameStateStorageKey = "stocky_game_state";
const talentProfileStorageKey = "stocky_talent_profile";

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

function getWebStorageValue(key: string, legacyCookieName: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key) ?? getCookie(legacyCookieName);
}

function setWebStorageValue(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

function isValidGameState(value: unknown): value is GameState {
  const state = value as Partial<GameState> | null;
  return Boolean(
    state &&
      state.economy &&
      typeof state.economy.cash === "number" &&
      Array.isArray(state.stocks) &&
      Array.isArray(state.holdings) &&
      Array.isArray(state.newsList)
  );
}

export async function loadGameState(): Promise<GameState> {
  if (Platform.OS === "web") {
    const storedValue = getWebStorageValue(gameStateStorageKey, "game_state");
    if (!storedValue) {
      const initial = createInitialState();
      await saveGameState(initial);
      return initial;
    }
    try {
      const parsed = JSON.parse(storedValue);
      if (!isValidGameState(parsed)) throw new Error("Invalid game state shape");
      await saveGameState(parsed);
      return parsed;
    } catch (e) {
      console.warn("Failed to parse saved web game state, creating new state", e);
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
    setWebStorageValue(gameStateStorageKey, JSON.stringify(state));
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
    const storedValue = getWebStorageValue(talentProfileStorageKey, "talent_profile");
    if (!storedValue) {
      return normalizeTalentProfile({});
    }
    try {
      const profile = normalizeTalentProfile(JSON.parse(storedValue));
      await saveTalentProfile(profile);
      return profile;
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
    setWebStorageValue(talentProfileStorageKey, JSON.stringify(profile));
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
