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

export type GameState = {
  economy: Economy;
  stocks: Stock[];
  holdings: Holding[];
  activeSignals: WorldEvent[];
  upcomingSignal?: WorldEvent;
  news: string[];
};

export type TradeResult = {
  state: GameState;
  message: string;
};
