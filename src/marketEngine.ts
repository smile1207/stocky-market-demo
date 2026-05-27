import { Economy, GameState, Holding, Sector, Stock, TradeResult, WorldEvent } from "./types";

const sectors: Record<Sector, string> = {
  food: "民生",
  energy: "能源",
  tech: "科技",
  logistics: "物流",
  luxury: "奢侈"
};

const initialStocks: Stock[] = [
  {
    id: "grain-port",
    name: "穀港商會",
    code: "GPC",
    sector: "food",
    basePrice: 42,
    price: 42,
    supply: 92,
    demand: 104,
    stability: 0.82,
    volatility: 0.045,
    description: "掌握城市糧食與日用品批發，是通膨壓力的第一警報。"
  },
  {
    id: "ember-grid",
    name: "燼網能源",
    code: "EMG",
    sector: "energy",
    basePrice: 64,
    price: 64,
    supply: 88,
    demand: 96,
    stability: 0.66,
    volatility: 0.07,
    description: "燃料與電力供應商，對供需和通膨變化特別敏感。"
  },
  {
    id: "north-lens",
    name: "北境視算",
    code: "NLS",
    sector: "tech",
    basePrice: 78,
    price: 78,
    supply: 72,
    demand: 112,
    stability: 0.55,
    volatility: 0.09,
    description: "預測模型與情報終端供應商，和代幣預知能力有強連動。"
  },
  {
    id: "riverline",
    name: "河線運輸",
    code: "RVL",
    sector: "logistics",
    basePrice: 36,
    price: 36,
    supply: 108,
    demand: 88,
    stability: 0.74,
    volatility: 0.055,
    description: "貨運、倉儲、港口路線。市場熱度高時成交量會跟著放大。"
  },
  {
    id: "moon-silk",
    name: "月絲精品",
    code: "MSK",
    sector: "luxury",
    basePrice: 55,
    price: 55,
    supply: 64,
    demand: 78,
    stability: 0.44,
    volatility: 0.11,
    description: "高級服飾與收藏品，適合做高風險高報酬標的。"
  }
];

const marketSignalDeck: Omit<WorldEvent, "id" | "day">[] = [
  {
    title: "民生採購升溫",
    source: "market",
    description: "城市補貨需求增加，民生與物流類股短線受惠。",
    sectorImpacts: { food: 0.07, logistics: 0.04 },
    inflationImpact: 0.006,
    heatImpact: 0.04,
    duration: 3
  },
  {
    title: "市場技術升級",
    source: "market",
    description: "撮合速度提高，科技股與高波動標的成交熱度增加。",
    sectorImpacts: { tech: 0.1, luxury: 0.03 },
    inflationImpact: -0.002,
    heatImpact: 0.06,
    duration: 2
  },
  {
    title: "港區運費調整",
    source: "market",
    description: "物流成本短暫上升，部分商品價格被推高。",
    sectorImpacts: { logistics: -0.08, food: 0.04, luxury: 0.05 },
    inflationImpact: 0.01,
    heatImpact: 0.02,
    duration: 3
  },
  {
    title: "市場監理加強",
    source: "market",
    description: "投機熱度被壓制，穩定型股票受青睞。",
    sectorImpacts: { luxury: -0.08, tech: -0.04, food: 0.03 },
    inflationImpact: -0.008,
    heatImpact: -0.1,
    duration: 2
  },
  {
    title: "節慶採購潮",
    source: "market",
    description: "民生與精品需求上升，短線資金快速進場。",
    sectorImpacts: { food: 0.06, luxury: 0.11, logistics: 0.04 },
    inflationImpact: 0.006,
    heatImpact: 0.08,
    duration: 2
  }
];

export const sectorLabel = (sector: Sector) => sectors[sector];

export const baseInitialAsset = 1200;

export function createInitialState(initialCash = baseInitialAsset): GameState {
  return {
    economy: {
      day: 1,
      cash: initialCash,
      inflation: 0.021,
      marketHeat: 0.46,
      stabilityFund: 240,
      token: 2,
      foresightUsedToday: false
    },
    stocks: initialStocks.map((stock) => ({ ...stock })),
    holdings: [],
    activeSignals: [],
    upcomingSignal: createSignal(2, 0),
    initialAsset: initialCash,
    highestEquity: initialCash,
    endResult: null,
    news: ["市場模組啟動：第一階段測試開始，採單機模擬。"]
  };
}

export function buyStock(state: GameState, stockId: string, shares: number): TradeResult {
  const stock = state.stocks.find((item) => item.id === stockId);
  if (!stock) return { state, message: "找不到股票。" };

  const cost = roundMoney(stock.price * shares * 1.006);
  if (state.economy.cash < cost) {
    return { state, message: "現金不足，無法買入。" };
  }

  const holdings = upsertHolding(state.holdings, stockId, shares, stock.price);
  const stocks = state.stocks.map((item) =>
    item.id === stockId
      ? {
          ...item,
          demand: clamp(item.demand + shares * 1.7, 35, 180),
          supply: clamp(item.supply - shares * 0.9, 30, 180),
          price: roundMoney(item.price * (1 + shares * 0.004))
        }
      : item
  );

  return {
    state: {
      ...state,
      economy: { ...state.economy, cash: roundMoney(state.economy.cash - cost) },
      holdings,
      stocks,
      news: [`買入 ${stock.name} ${shares} 股，成交價 ${stock.price.toFixed(2)}。`, ...state.news].slice(0, 12)
    },
    message: `買入成功，花費 ${cost.toFixed(2)}。`
  };
}

export function sellStock(state: GameState, stockId: string, shares: number): TradeResult {
  const stock = state.stocks.find((item) => item.id === stockId);
  const holding = state.holdings.find((item) => item.stockId === stockId);
  if (!stock || !holding) return { state, message: "沒有可賣出的持股。" };
  if (holding.shares < shares) return { state, message: "持股不足。" };

  const proceeds = roundMoney(stock.price * shares * 0.994);
  const holdings = state.holdings
    .map((item) => (item.stockId === stockId ? { ...item, shares: item.shares - shares } : item))
    .filter((item) => item.shares > 0);
  const stocks = state.stocks.map((item) =>
    item.id === stockId
      ? {
          ...item,
          demand: clamp(item.demand - shares * 1.1, 35, 180),
          supply: clamp(item.supply + shares * 1.4, 30, 180),
          price: roundMoney(item.price * (1 - shares * 0.0035))
        }
      : item
  );

  return {
    state: {
      ...state,
      economy: { ...state.economy, cash: roundMoney(state.economy.cash + proceeds) },
      holdings,
      stocks,
      news: [`賣出 ${stock.name} ${shares} 股，成交價 ${stock.price.toFixed(2)}。`, ...state.news].slice(0, 12)
    },
    message: `賣出成功，收入 ${proceeds.toFixed(2)}。`
  };
}

export function useForesight(state: GameState): TradeResult {
  if (state.economy.token <= 0) return { state, message: "代幣不足，無法預知事件。" };
  if (state.economy.foresightUsedToday) return { state, message: "今天已經使用過預知。" };
  if (!state.upcomingSignal) return { state, message: "目前沒有可預知行情。" };

  return {
    state: {
      ...state,
      economy: {
        ...state.economy,
        token: state.economy.token - 1,
        foresightUsedToday: true
      },
      upcomingSignal: { ...state.upcomingSignal, knownByForesight: true },
      news: [`代幣預知：明日可能出現「${state.upcomingSignal.title}」。`, ...state.news].slice(0, 12)
    },
    message: `你預知了 ${state.upcomingSignal.title}。`
  };
}

export function advanceDay(state: GameState): GameState {
  const day = state.economy.day + 1;
  const maturedSignal = state.upcomingSignal && state.upcomingSignal.day === day ? state.upcomingSignal : undefined;
  const activeSignals = [
    ...state.activeSignals.filter((signal) => signal.day + signal.duration > day),
    ...(maturedSignal ? [{ ...maturedSignal, knownByForesight: false }] : [])
  ];
  const nextUpcoming = maturedSignal || !state.upcomingSignal ? createSignal(day + 1 + (day % 2), day) : state.upcomingSignal;
  const economy = advanceEconomy({ ...state.economy, day, foresightUsedToday: false }, activeSignals);
  const stocks = state.stocks.map((stock, index) => advanceStock(stock, economy, activeSignals, day + index));
  const tokenGain = day % 5 === 0 ? 1 : 0;
  const signalNews = maturedSignal ? [`市場行情：${maturedSignal.title}。${maturedSignal.description}`] : [];

  return withHighestEquity({
    ...state,
    economy: {
      ...economy,
      token: economy.token + tokenGain
    },
    stocks,
    activeSignals,
    upcomingSignal: nextUpcoming,
    news: [
      ...signalNews,
      tokenGain ? "個人成長回饋：完成 5 日市場觀察，獲得 1 枚代幣。" : "",
      `第 ${day} 日收盤：通膨 ${(economy.inflation * 100).toFixed(1)}%，市場熱度 ${(economy.marketHeat * 100).toFixed(0)}%。`
    ]
      .filter(Boolean)
      .concat(state.news)
      .slice(0, 12)
  });
}

export function totalEquity(state: GameState): number {
  return roundMoney(
    state.economy.cash +
      state.holdings.reduce((sum, holding) => {
        const stock = state.stocks.find((item) => item.id === holding.stockId);
        return sum + (stock ? stock.price * holding.shares : 0);
      }, 0)
  );
}

export function withHighestEquity(state: GameState): GameState {
  const initialAsset = state.initialAsset ?? baseInitialAsset;
  return {
    ...state,
    initialAsset,
    highestEquity: Math.max(state.highestEquity ?? initialAsset, totalEquity(state))
  };
}

export function calculateTalentPoints(finalEquity: number, highestEquity: number, initialAsset: number): number {
  return Math.round((finalEquity / initialAsset) * 100 + (highestEquity / initialAsset) * 70);
}

function advanceEconomy(economy: Economy, events: WorldEvent[]): Economy {
  const eventInflation = events.reduce((sum, event) => sum + event.inflationImpact, 0);
  const eventHeat = events.reduce((sum, event) => sum + event.heatImpact, 0);
  const overheated = economy.marketHeat > 0.72 || economy.inflation > 0.065;
  const support = economy.stabilityFund > 0 && overheated ? Math.min(18, economy.stabilityFund) : 0;
  const stabilizer = support > 0 ? -0.013 : -0.003;

  return {
    ...economy,
    inflation: clamp(economy.inflation * 0.88 + 0.009 + eventInflation + stabilizer, -0.02, 0.16),
    marketHeat: clamp(economy.marketHeat * 0.82 + 0.12 + eventHeat - (support > 0 ? 0.08 : 0), 0.08, 1),
    stabilityFund: roundMoney(economy.stabilityFund - support + 8)
  };
}

function advanceStock(stock: Stock, economy: Economy, events: WorldEvent[], seed: number): Stock {
  const eventImpact = events.reduce((sum, event) => sum + (event.sectorImpacts[stock.sector] ?? 0), 0);
  const demandPressure = (stock.demand - stock.supply) / 220;
  const inflationLift = economy.inflation * (stock.sector === "food" || stock.sector === "energy" ? 0.62 : 0.28);
  const heatLift = (economy.marketHeat - 0.45) * stock.volatility;
  const deterministicNoise = Math.sin(seed * 12.9898 + stock.basePrice) * stock.volatility * 0.42;
  const stabilizer = (stock.basePrice - stock.price) / stock.basePrice * stock.stability * 0.08;
  const change = clamp(demandPressure + eventImpact + inflationLift + heatLift + deterministicNoise + stabilizer, -0.24, 0.28);
  const price = roundMoney(clamp(stock.price * (1 + change), stock.basePrice * 0.35, stock.basePrice * 3.2));

  return {
    ...stock,
    price,
    demand: clamp(stock.demand * 0.88 + 75 + economy.marketHeat * 26 + eventImpact * 80, 35, 180),
    supply: clamp(stock.supply * 0.9 + 84 - eventImpact * 42 - economy.inflation * 60, 30, 180)
  };
}

function upsertHolding(holdings: Holding[], stockId: string, shares: number, price: number): Holding[] {
  const existing = holdings.find((item) => item.stockId === stockId);
  if (!existing) return [...holdings, { stockId, shares, averageCost: price }];
  return holdings.map((item) => {
    if (item.stockId !== stockId) return item;
    const totalShares = item.shares + shares;
    return {
      ...item,
      shares: totalShares,
      averageCost: roundMoney((item.averageCost * item.shares + price * shares) / totalShares)
    };
  });
}

function createSignal(day: number, seed: number): WorldEvent {
  const template = marketSignalDeck[Math.abs(seed + day * 3) % marketSignalDeck.length];
  return {
    ...template,
    id: `${day}-${template.title}`,
    day
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
