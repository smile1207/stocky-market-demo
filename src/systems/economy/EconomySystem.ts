import { EconomyState, MarketSignal } from "../../types/domain";
import { applyStabilityFund } from "./StabilityFundSystem";
import { clamp } from "../market/PricingSystem";

export function advanceEconomy(economy: EconomyState, signals: MarketSignal[]): EconomyState {
  const signalInflation = signals.reduce((sum, signal) => sum + signal.inflationImpact, 0);
  const signalHeat = signals.reduce((sum, signal) => sum + signal.heatImpact, 0);
  const baseEconomy: EconomyState = {
    ...economy,
    inflation: clamp(economy.inflation * 0.88 + 0.009 + signalInflation, -0.02, 0.16),
    marketHeat: clamp(economy.marketHeat * 0.82 + 0.12 + signalHeat, 0.08, 1)
  };

  return applyStabilityFund(baseEconomy).economy;
}
