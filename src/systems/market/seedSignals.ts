import { MarketSignal } from "../../types/domain";

export function createMarketSignal(day: number, seed: number): MarketSignal {
  const template = marketSignalDeck[Math.abs(seed + day * 3) % marketSignalDeck.length];
  return {
    ...template,
    id: `${day}-${template.title}`,
    day
  };
}

const marketSignalDeck: Omit<MarketSignal, "id" | "day">[] = [
  {
    title: "民生採購升溫",
    description: "城市補貨需求增加，民生與物流類股短線受惠。",
    sectorImpacts: { food: 0.07, logistics: 0.04 },
    inflationImpact: 0.006,
    heatImpact: 0.04,
    duration: 3
  },
  {
    title: "市場技術升級",
    description: "撮合速度提高，科技股與高波動標的成交熱度增加。",
    sectorImpacts: { tech: 0.1, luxury: 0.03 },
    inflationImpact: -0.002,
    heatImpact: 0.06,
    duration: 2
  },
  {
    title: "港區運費調整",
    description: "物流成本短暫上升，部分商品價格被推高。",
    sectorImpacts: { logistics: -0.08, food: 0.04, luxury: 0.05 },
    inflationImpact: 0.01,
    heatImpact: 0.02,
    duration: 3
  }
];
