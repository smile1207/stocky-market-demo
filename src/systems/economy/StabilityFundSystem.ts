import { EconomyState } from "../../types/domain";
import { clamp, roundMoney } from "../market/PricingSystem";

export function applyStabilityFund(economy: EconomyState): { economy: EconomyState; support: number } {
  const overheated = economy.marketHeat > 0.72 || economy.inflation > 0.065;
  const support = economy.stabilityFund > 0 && overheated ? Math.min(18, economy.stabilityFund) : 0;

  return {
    support,
    economy: {
      ...economy,
      inflation: clamp(economy.inflation + (support > 0 ? -0.013 : -0.003), -0.02, 0.16),
      marketHeat: clamp(economy.marketHeat - (support > 0 ? 0.08 : 0), 0.08, 1),
      stabilityFund: roundMoney(economy.stabilityFund - support + 8)
    }
  };
}
