export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS player (
    id TEXT PRIMARY KEY NOT NULL,
    cash REAL NOT NULL,
    token INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS economy_state (
    id TEXT PRIMARY KEY NOT NULL,
    day INTEGER NOT NULL,
    inflation REAL NOT NULL,
    market_heat REAL NOT NULL,
    stability_fund REAL NOT NULL,
    foresight_used_today INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS stocks (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    sector TEXT NOT NULL,
    base_price REAL NOT NULL,
    price REAL NOT NULL,
    supply REAL NOT NULL,
    demand REAL NOT NULL,
    stability REAL NOT NULL,
    volatility REAL NOT NULL,
    description TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS holdings (
    stock_id TEXT PRIMARY KEY NOT NULL,
    shares INTEGER NOT NULL,
    average_cost REAL NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (stock_id) REFERENCES stocks(id)
  );`,
  `CREATE TABLE IF NOT EXISTS trade_logs (
    id TEXT PRIMARY KEY NOT NULL,
    day INTEGER NOT NULL,
    stock_id TEXT NOT NULL,
    side TEXT NOT NULL,
    shares INTEGER NOT NULL,
    price REAL NOT NULL,
    fee REAL NOT NULL,
    total REAL NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS market_logs (
    id TEXT PRIMARY KEY NOT NULL,
    day INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    payload_json TEXT,
    created_at TEXT NOT NULL
  );`
];
