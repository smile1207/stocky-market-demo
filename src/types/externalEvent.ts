import { Sector } from "./domain";

export type ExternalMarketEvent = {
  id: string;
  source: "blade" | "system" | string;
  title: string;
  description?: string;
  day: number;
  duration: number;
  sectorImpacts: Partial<Record<Sector, number>>;
  inflationImpact: number;
  heatImpact: number;
};
