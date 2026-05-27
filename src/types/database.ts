export type PlayerRow = {
  id: string;
  cash: number;
  token: number;
  created_at: string;
  updated_at: string;
};

export type StockRow = {
  id: string;
  code: string;
  name: string;
  sector: string;
  base_price: number;
  price: number;
  supply: number;
  demand: number;
  stability: number;
  volatility: number;
  description: string;
  updated_at: string;
};

export type EconomyStateRow = {
  id: string;
  day: number;
  inflation: number;
  market_heat: number;
  stability_fund: number;
  foresight_used_today: number;
  updated_at: string;
};
