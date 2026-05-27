import { EconomyState, MarketSignal, Stock } from "../../types/domain";

export function priceStock(stock: Stock, economy: EconomyState, signals: MarketSignal[], seed: number): Stock {
  const signalImpact = signals.reduce((sum, signal) => sum + (signal.sectorImpacts[stock.sector] ?? 0), 0);
  const demandPressure = (stock.demand - stock.supply) / 220;
  const inflationLift = economy.inflation * (stock.sector === "food" || stock.sector === "energy" ? 0.62 : 0.28);
  const heatLift = (economy.marketHeat - 0.45) * stock.volatility;
  const noise = Math.sin(seed * 12.9898 + stock.basePrice) * stock.volatility * 0.42;
  const stabilizer = ((stock.basePrice - stock.price) / stock.basePrice) * stock.stability * 0.08;
  const change = clamp(demandPressure + signalImpact + inflationLift + heatLift + noise + stabilizer, -0.24, 0.28);

  return {
    ...stock,
    price: roundMoney(clamp(stock.price * (1 + change), stock.basePrice * 0.35, stock.basePrice * 3.2)),
    demand: clamp(stock.demand * 0.88 + 75 + economy.marketHeat * 26 + signalImpact * 80, 35, 180),
    supply: clamp(stock.supply * 0.9 + 84 - signalImpact * 42 - economy.inflation * 60, 30, 180)
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
