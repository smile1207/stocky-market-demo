import * as SQLite from "expo-sqlite";
import { schemaStatements } from "./schema";

export type StockyDatabase = SQLite.SQLiteDatabase;

export async function openStockyDatabase(): Promise<StockyDatabase> {
  const db = await SQLite.openDatabaseAsync("stocky.db");
  await migrate(db);
  return db;
}

export async function migrate(db: StockyDatabase): Promise<void> {
  for (const statement of schemaStatements) {
    await db.execAsync(statement);
  }
}
