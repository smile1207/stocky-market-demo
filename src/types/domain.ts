export type Sector = "food" | "energy" | "tech" | "logistics" | "luxury";

export type TradeSide = "buy" | "sell";

export type Stock = {
  id: string;
  code: string;
  name: string;
  sector: Sector;
  basePrice: number;
  price: number;
  supply: number;
  demand: number;
  stability: number;
  volatility: number;
  description: string;
};

export type Holding = {
  stockId: string;
  shares: number;
  averageCost: number;
};

export type Player = {
  id: string;
  cash: number;
  token: number;
};

export type EconomyState = {
  day: number;
  inflation: number;
  marketHeat: number;
  stabilityFund: number;
  foresightUsedToday: boolean;
};

export type MarketSignal = {
  id: string;
  title: string;
  description: string;
  day: number;
  sectorImpacts: Partial<Record<Sector, number>>;
  inflationImpact: number;
  heatImpact: number;
  duration: number;
  knownByForesight?: boolean;
};

export type TradeOrder = {
  stockId: string;
  side: TradeSide;
  shares: number;
};

export type TradeLog = {
  id: string;
  day: number;
  stockId: string;
  side: TradeSide;
  shares: number;
  price: number;
  fee: number;
  total: number;
  createdAt: string;
};

export type MarketLog = {
  id: string;
  day: number;
  type: "trade" | "daily_close" | "market_signal" | "system";
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type GameState = {
  player: Player;
  economy: EconomyState;
  stocks: Stock[];
  holdings: Holding[];
  activeSignals: MarketSignal[];
  upcomingSignal?: MarketSignal;
  tradeLogs: TradeLog[];
  marketLogs: MarketLog[];
};

export type GameMutationResult = {
  state: GameState;
  logs: MarketLog[];
  tradeLog?: TradeLog;
  message: string;
};
