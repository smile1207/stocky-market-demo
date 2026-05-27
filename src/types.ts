export type Sector = "food" | "energy" | "tech" | "logistics" | "luxury";

export type Stock = {
  id: string;
  name: string;
  code: string;
  sector: Sector;
  basePrice: number;
  price: number;
  supply: number;
  demand: number;
  stability: number;
  volatility: number;
  description: string;
  history: number[]; // Price history
  volume: number;    // Daily volume
};

export type Holding = {
  stockId: string;
  shares: number;
  averageCost: number;
};

export type Economy = {
  day: number;
  cash: number;
  inflation: number;
  marketHeat: number;
  stabilityFund: number;
  token: number;
  foresightUsedToday: boolean;
};

export type WorldEvent = {
  id: string;
  title: string;
  source: "market";
  description: string;
  day: number;
  sectorImpacts: Partial<Record<Sector, number>>;
  inflationImpact: number;
  heatImpact: number;
  duration: number;
  knownByForesight?: boolean;
};

export type NewsItem = {
  id: string;
  text: string;
  day: number;
  time: string; // e.g. "盤前" or "10:35"
  companyIds?: string[]; // IDs of involved companies
};

export type GameState = {
  economy: Economy;
  stocks: Stock[];
  holdings: Holding[];
  activeSignals: WorldEvent[];
  upcomingSignal?: WorldEvent;
  news: string[]; // Legacy compatibility
  newsList: NewsItem[];
  marketHistory: number[]; // Index price history
  currentMinutes: number; // 0 to 270 (representing 09:00 to 13:30)
  isTrading: boolean;     // Whether trading is active
  isPaused: boolean;      // Whether trading is paused
  gameSpeed: number;      // 45, 60, or 120
  intradayNewsTimes: number[]; // Tick minutes when news will trigger today
  initialAsset: number;
  highestEquity: number;
  endResult?: SettlementResult | null;
};

export type TradeResult = {
  state: GameState;
  message: string;
};

export type SettlementResult = {
  initialAsset: number;
  highestEquity: number;
  finalEquity: number;
  talentPoints: number;
};

export type TalentProfile = {
  availablePoints: number;
  lifetimePoints: number;
  talentLevels: Record<string, number>;
};

