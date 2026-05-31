import { Economy, GameState, Holding, Sector, Stock, TalentProfile, TradeResult, WorldEvent, NewsItem } from "./types";
import {
  getAutoSellSettlementRatio,
  getDailyCashIncome,
  getPriceFormulaLevel,
  getSettlementEquityPointBonus,
  getSettlementFlatPointBonus,
  getTradeFeeRate
} from "./talents";

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
    description: "掌握城市糧食與日用品批發，是通膨壓力的第一警報。",
    history: [42],
    volume: 0
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
    description: "燃料與電力供應商，對供需和通膨變化特別敏感。",
    history: [64],
    volume: 0
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
    description: "預測模型與情報終端供應商，和代幣預知能力有強連動。",
    history: [78],
    volume: 0
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
    description: "貨運、倉儲、港口路線。市場熱度高時成交量會跟著放大。",
    history: [36],
    volume: 0
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
    description: "高級服飾與收藏品，適合做高風險高報酬標的。",
    history: [55],
    volume: 0
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
  },
  {
    title: "全球能源危機",
    source: "market",
    description: "國際燃料價格暴漲，能源股大漲，科技與民生受壓抑。",
    sectorImpacts: { energy: 0.14, tech: -0.06, food: -0.04 },
    inflationImpact: 0.018,
    heatImpact: 0.05,
    duration: 3
  },
  {
    title: "科技巨頭財報亮眼",
    source: "market",
    description: "晶片與終端設備銷量超出預期，科技板塊氣勢如虹。",
    sectorImpacts: { tech: 0.15, luxury: 0.05, logistics: 0.02 },
    inflationImpact: 0.002,
    heatImpact: 0.09,
    duration: 2
  },
  {
    title: "物流網路大癱瘓",
    source: "market",
    description: "重要航道因事故受阻，供應鏈中斷推升物價。",
    sectorImpacts: { logistics: -0.12, food: 0.05, energy: 0.03 },
    inflationImpact: 0.015,
    heatImpact: -0.04,
    duration: 3
  },
  {
    title: "奢侈品概念展銷會",
    source: "market",
    description: "年度精品展吸引大量富豪投資，奢侈板塊交投熱絡。",
    sectorImpacts: { luxury: 0.13, tech: 0.02 },
    inflationImpact: 0.004,
    heatImpact: 0.06,
    duration: 2
  },
  {
    title: "穩定基金緊急釋出",
    source: "market",
    description: "政府撥款穩定民生基本物資，平抑高通膨。",
    sectorImpacts: { food: 0.03, energy: 0.02, luxury: -0.05 },
    inflationImpact: -0.012,
    heatImpact: -0.06,
    duration: 2
  }
];

export const sectorLabel = (sector: Sector) => sectors[sector];

export const baseInitialAsset = 1200;

export function getMarketIndexPrice(stocks: Stock[]): number {
  if (stocks.length === 0) return 0;
  const sum = stocks.reduce((acc, stock) => acc + stock.price, 0);
  return Math.round((sum / stocks.length) * 100) / 100;
}

export function formatMinutes(minutes: number): string {
  const startHour = 9;
  const totalMins = startHour * 60 + minutes;
  const hour = Math.floor(totalMins / 60);
  const min = totalMins % 60;
  return `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

export function createInitialState(initialCash = baseInitialAsset): GameState {
  let stocks = initialStocks.map((stock) => ({
    ...stock,
    history: [stock.price],
    volume: 0
  }));

  const day = 1;
  const pmEvent1 = marketSignalDeck[0];
  const pmEvent2 = marketSignalDeck[1];

  stocks = stocks.map((stock) => {
    const impact1 = pmEvent1.sectorImpacts[stock.sector] ?? 0;
    const impact2 = pmEvent2.sectorImpacts[stock.sector] ?? 0;
    const totalImpact = impact1 + impact2;
    const price = roundMoney(
      clamp(stock.price * (1 + totalImpact), stock.basePrice * 0.35, stock.basePrice * 3.2)
    );
    return {
      ...stock,
      price,
      basePrice: price,
      history: [price]
    };
  });

  const companyIds1 = stocks.filter((s) => pmEvent1.sectorImpacts[s.sector] !== undefined).map((s) => s.id);
  const companyIds2 = stocks.filter((s) => pmEvent2.sectorImpacts[s.sector] !== undefined).map((s) => s.id);

  const newsItem1: NewsItem = {
    id: `pm-1-1`,
    text: `【盤前新聞】${pmEvent1.title}：${pmEvent1.description}`,
    day,
    time: "盤前",
    companyIds: companyIds1
  };
  const newsItem2: NewsItem = {
    id: `pm-1-2`,
    text: `【盤前新聞】${pmEvent2.title}：${pmEvent2.description}`,
    day,
    time: "盤前",
    companyIds: companyIds2
  };

  const overallPrice = getMarketIndexPrice(stocks);
  const intradayNewsTimes = [75, 180]; // Day 1 intraday news timings

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
    stocks,
    holdings: [],
    activeSignals: [],
    upcomingSignal: createSignal(2, 0),
    initialAsset: initialCash,
    highestEquity: initialCash,
    endResult: null,
    news: ["市場模組啟動：第一階段測試開始，採單機模擬。"],
    newsList: [
      newsItem2,
      newsItem1,
      {
        id: "init-news",
        text: "市場模組啟動：第一階段測試開始，採單機模擬。",
        day: 1,
        time: "開市"
      }
    ],
    marketHistory: [overallPrice],
    currentMinutes: 0,
    isTrading: false,
    isPaused: true,
    gameSpeed: 60,
    intradayNewsTimes,
    matchInterval: 30,
    debugShowFields: false
  };
}

export function buyStock(state: GameState, stockId: string, shares: number, talentProfile?: TalentProfile): TradeResult {
  const stock = state.stocks.find((item) => item.id === stockId);
  if (!stock) return { state, message: "找不到股票。" };

  const feeRate = getTradeFeeRate(talentProfile, 0.006);
  const cost = roundMoney(stock.price * shares * (1 + feeRate));
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
          price: roundMoney(item.price * (1 + shares * 0.004)),
          volume: item.volume + shares
        }
      : item
  );

  const timeStr = formatMinutes(state.currentMinutes);
  const newsItem: NewsItem = {
    id: `trade-${state.economy.day}-${state.currentMinutes}-buy-${stockId}-${Date.now()}`,
    text: `買入 ${stock.name} ${shares} 股，成交價 ${stock.price.toFixed(2)}。`,
    day: state.economy.day,
    time: timeStr,
    companyIds: [stockId]
  };

  return {
    state: {
      ...state,
      economy: { ...state.economy, cash: roundMoney(state.economy.cash - cost) },
      holdings,
      stocks,
      news: [`買入 ${stock.name} ${shares} 股，成交價 ${stock.price.toFixed(2)}。`, ...state.news].slice(0, 12),
      newsList: [newsItem, ...state.newsList]
    },
    message: `買入成功，花費 ${cost.toFixed(2)}。`
  };
}

export function sellStock(state: GameState, stockId: string, shares: number, talentProfile?: TalentProfile): TradeResult {
  const stock = state.stocks.find((item) => item.id === stockId);
  const holding = state.holdings.find((item) => item.stockId === stockId);
  if (!stock || !holding) return { state, message: "沒有可賣出的持股。" };
  if (holding.shares < shares) return { state, message: "持股不足。" };

  const feeRate = getTradeFeeRate(talentProfile, 0.006);
  const proceeds = roundMoney(stock.price * shares * (1 - feeRate));
  const holdings = state.holdings
    .map((item) => (item.stockId === stockId ? { ...item, shares: item.shares - shares } : item))
    .filter((item) => item.shares > 0);
  const stocks = state.stocks.map((item) =>
    item.id === stockId
      ? {
          ...item,
          demand: clamp(item.demand - shares * 1.1, 35, 180),
          supply: clamp(item.supply + shares * 1.4, 30, 180),
          price: roundMoney(item.price * (1 - shares * 0.0035)),
          volume: item.volume + shares
        }
      : item
  );

  const timeStr = formatMinutes(state.currentMinutes);
  const newsItem: NewsItem = {
    id: `trade-${state.economy.day}-${state.currentMinutes}-sell-${stockId}-${Date.now()}`,
    text: `賣出 ${stock.name} ${shares} 股，成交價 ${stock.price.toFixed(2)}。`,
    day: state.economy.day,
    time: timeStr,
    companyIds: [stockId]
  };

  return {
    state: {
      ...state,
      economy: { ...state.economy, cash: roundMoney(state.economy.cash + proceeds) },
      holdings,
      stocks,
      news: [`賣出 ${stock.name} ${shares} 股，成交價 ${stock.price.toFixed(2)}。`, ...state.news].slice(0, 12),
      newsList: [newsItem, ...state.newsList]
    },
    message: `賣出成功，收入 ${proceeds.toFixed(2)}。`
  };
}

export function useForesight(state: GameState): TradeResult {
  if (state.economy.token <= 0) return { state, message: "代幣不足，無法預知事件。" };
  if (state.economy.foresightUsedToday) return { state, message: "今天已經使用過預知。" };
  if (!state.upcomingSignal) return { state, message: "目前沒有可預知行情。" };

  const timeStr = formatMinutes(state.currentMinutes);
  const newsItem: NewsItem = {
    id: `foresight-${state.economy.day}-${state.currentMinutes}`,
    text: `代幣預知：明日可能出現「${state.upcomingSignal.title}」。`,
    day: state.economy.day,
    time: timeStr
  };

  return {
    state: {
      ...state,
      economy: {
        ...state.economy,
        token: state.economy.token - 1,
        foresightUsedToday: true
      },
      upcomingSignal: { ...state.upcomingSignal, knownByForesight: true },
      news: [`代幣預知：明日可能出現「${state.upcomingSignal.title}」。`, ...state.news].slice(0, 12),
      newsList: [newsItem, ...state.newsList]
    },
    message: `你預知了 ${state.upcomingSignal.title}。`
  };
}

export function tickMarket(state: GameState, talentProfile?: TalentProfile): GameState {
  if (!state.isTrading || state.isPaused) return state;

  const nextMinutes = state.currentMinutes + 1;
  const isClose = nextMinutes >= 270;
  const minutes = Math.min(270, nextMinutes);
  const timeStr = formatMinutes(minutes);

  const matchInterval = getSafeMatchInterval(state.matchInterval);
  const isMatchMoment = minutes > 0 && minutes % matchInterval === 0;

  let stocks = state.stocks;
  if (isMatchMoment || isClose) {
    stocks = stocks.map((stock) => {
      // 1. Intraday price fluctuation based on active signals and market state
      const eventImpact = state.activeSignals.reduce(
        (sum, event) => sum + (event.sectorImpacts[stock.sector] ?? 0),
        0
      );
      const demandPressure = (stock.demand - stock.supply) / 220;
      const inflationLift = state.economy.inflation * (stock.sector === "food" || stock.sector === "energy" ? 0.62 : 0.28);
      const heatLift = (state.economy.marketHeat - 0.45) * stock.volatility;
      const stabilizer = ((stock.basePrice - stock.price) / stock.basePrice) * stock.stability * 0.08;

      // Combined and scaled down by 45 for smooth updates
      const baseChange = (demandPressure + eventImpact + inflationLift + heatLift + stabilizer) / 45;
      const randomNoise = (Math.random() - 0.5) * stock.volatility * 0.3; // active intraday fluctuation

      const change = getPriceChangeRate({
        baseChange,
        factor: demandPressure + inflationLift + heatLift + stabilizer + randomNoise,
        marketHeat: state.economy.marketHeat,
        newsWeight: eventImpact,
        stock,
        talentProfile
      });
      const price = roundMoney(clamp(stock.price * (1 + change), stock.basePrice * 0.35, stock.basePrice * 3.2));

      // 2. Intraday demand/supply drift
      const demand = clamp(stock.demand * 0.99 + 0.8, 35, 180);
      const supply = clamp(stock.supply * 0.99 + 0.9, 30, 180);

      // 3. Increment simulated volume
      const tickVolume = Math.floor(Math.random() * 8) + (stock.demand > stock.supply ? 5 : 2);
      const volume = stock.volume + tickVolume;

      return {
        ...stock,
        price,
        demand,
        supply,
        volume,
        history: [...stock.history, price]
      };
    });
  }

  let newsList = [...state.newsList];
  let activeSignals = [...state.activeSignals];

  // Check if we trigger any intraday news at this minute
  if (state.intradayNewsTimes.includes(minutes)) {
    const seed = Math.floor(Math.random() * 100);
    const template = marketSignalDeck[seed % marketSignalDeck.length];
    const eventId = `${state.economy.day}-${minutes}-${template.title}`;
    const newEvent: WorldEvent = {
      ...template,
      id: eventId,
      day: state.economy.day
    };

    const companyIds = stocks
      .filter((s) => template.sectorImpacts[s.sector] !== undefined)
      .map((s) => s.id);

    // Apply immediate impact to price of affected stocks (30% of full daily impact)
    stocks = stocks.map((stock) => {
      const impact = template.sectorImpacts[stock.sector] ?? 0;
      if (impact === 0) return stock;
      const immediateChange = getPriceChangeRate({
        baseChange: impact * 0.3,
        factor: impact * 0.3,
        marketHeat: state.economy.marketHeat,
        newsWeight: impact,
        stock,
        talentProfile
      });
      const price = roundMoney(
        clamp(stock.price * (1 + immediateChange), stock.basePrice * 0.35, stock.basePrice * 3.2)
      );
      return {
        ...stock,
        price,
        history: [...stock.history, price]
      };
    });

    activeSignals.push(newEvent);
    
    const newsItem: NewsItem = {
      id: eventId,
      text: `【盤中快訊】${template.title}：${template.description}`,
      day: state.economy.day,
      time: timeStr,
      companyIds
    };
    newsList = [newsItem, ...newsList];
  }

  const overallPrice = getMarketIndexPrice(stocks);

  let marketHistory = [...state.marketHistory];
  if (isMatchMoment || isClose) {
    marketHistory.push(overallPrice);
  }

  let nextState: GameState = {
    ...state,
    stocks,
    activeSignals,
    newsList,
    currentMinutes: minutes,
    marketHistory
  };

  nextState = applyAutoSellStopLoss(nextState, talentProfile, timeStr);

  // Auto-pause at match moments (if not close)
  if (isMatchMoment && !isClose) {
    nextState.isPaused = true;
  }

  if (isClose) {
    nextState.isTrading = false;
    nextState.isPaused = true;

    // Daily economy transition
    const economy = advanceEconomy(
      { ...state.economy, foresightUsedToday: false },
      nextState.activeSignals
    );
    
    const day = state.economy.day;
    nextState.activeSignals = nextState.activeSignals.filter(
      (signal) => signal.day + signal.duration > day
    );

    const nextUpcoming =
      !state.upcomingSignal || state.upcomingSignal.day === day + 1
        ? createSignal(day + 2, day)
        : state.upcomingSignal;

    const tokenGain = day % 5 === 0 ? 1 : 0;
    
    nextState.economy = {
      ...economy,
      token: economy.token + tokenGain
    };
    nextState.upcomingSignal = nextUpcoming;

    const closeNewsItem: NewsItem = {
      id: `day-${day}-close`,
      text: `第 ${day} 日收盤：通膨 ${(economy.inflation * 100).toFixed(1)}%，市場熱度 ${(economy.marketHeat * 100).toFixed(0)}%。`,
      day,
      time: "收盤"
    };
    nextState.newsList = [closeNewsItem, ...nextState.newsList];
    
    if (tokenGain) {
      nextState.newsList = [
        {
          id: `day-${day}-token`,
          text: "個人成長回饋：完成 5 日市場觀察，獲得 1 枚代幣。",
          day,
          time: "收盤"
        },
        ...nextState.newsList
      ];
    }
  }

  return withHighestEquity(nextState);
}

export function advanceDay(state: GameState, talentProfile?: TalentProfile): GameState {
  const day = state.economy.day + 1;
  
  let stocks = state.stocks.map((stock) => ({
    ...stock,
    volume: 0
  }));

  const pmEvent1 = createSignal(day, Math.floor(Math.random() * 100));
  const pmEvent2 = createSignal(day, Math.floor(Math.random() * 100) + 12);

  stocks = stocks.map((stock) => {
    const impact1 = pmEvent1.sectorImpacts[stock.sector] ?? 0;
    const impact2 = pmEvent2.sectorImpacts[stock.sector] ?? 0;
    const totalNewsWeight = impact1 + impact2;
    const demandPressure = (stock.demand - stock.supply) / 220;
    const inflationLift = state.economy.inflation * (stock.sector === "food" || stock.sector === "energy" ? 0.62 : 0.28);
    const heatLift = (state.economy.marketHeat - 0.45) * stock.volatility;
    const stabilizer = ((stock.basePrice - stock.price) / stock.basePrice) * stock.stability * 0.08;
    const totalImpact = getPriceChangeRate({
      baseChange: totalNewsWeight,
      factor: demandPressure + inflationLift + heatLift + stabilizer,
      marketHeat: state.economy.marketHeat,
      newsWeight: totalNewsWeight,
      stock,
      talentProfile,
      clampMin: -0.28,
      clampMax: 0.28
    });
    
    const price = roundMoney(
      clamp(stock.price * (1 + totalImpact), stock.basePrice * 0.35, stock.basePrice * 3.2)
    );
    
    return {
      ...stock,
      price,
      basePrice: price
    };
  });

  const companyIds1 = stocks.filter((s) => pmEvent1.sectorImpacts[s.sector] !== undefined).map((s) => s.id);
  const companyIds2 = stocks.filter((s) => pmEvent2.sectorImpacts[s.sector] !== undefined).map((s) => s.id);

  const newsItem1: NewsItem = {
    id: `pm-${day}-1`,
    text: `【盤前新聞】${pmEvent1.title}：${pmEvent1.description}`,
    day,
    time: "盤前",
    companyIds: companyIds1
  };
  const newsItem2: NewsItem = {
    id: `pm-${day}-2`,
    text: `【盤前新聞】${pmEvent2.title}：${pmEvent2.description}`,
    day,
    time: "盤前",
    companyIds: companyIds2
  };

  const count = Math.floor(Math.random() * 3) + 1; // 1 to 3 news
  const intradayNewsTimes: number[] = [];
  let currentMin = 30;
  for (let i = 0; i < count; i++) {
    const spacing = Math.max(15, Math.floor((-Math.log(Math.random()) * 60) / 5) * 5);
    currentMin += spacing;
    if (currentMin > 240) {
      currentMin = 30 + Math.floor(Math.random() * 42) * 5;
    }
    intradayNewsTimes.push(currentMin);
  }
  intradayNewsTimes.sort((a, b) => a - b);

  const dailyCashIncome = getDailyCashIncome(talentProfile, state.economy.cash);
  const dailyIncomeNews =
    dailyCashIncome.totalIncome > 0
      ? [
          {
            id: `daily-income-${day}`,
            text: `天賦收入：被動收入 +$${dailyCashIncome.flatIncome.toFixed(2)}，利息 +$${dailyCashIncome.interestIncome.toFixed(2)}。`,
            day,
            time: "開盤"
          }
        ]
      : [];
  const newsList = [...dailyIncomeNews, newsItem2, newsItem1, ...state.newsList];

  return withHighestEquity(applyAutoSellStopLoss({
    ...state,
    economy: {
      ...state.economy,
      day,
      cash: roundMoney(state.economy.cash + dailyCashIncome.totalIncome),
      foresightUsedToday: false
    },
    stocks,
    newsList,
    currentMinutes: 0,
    isTrading: false,
    isPaused: true,
    intradayNewsTimes
  }, talentProfile, "?"));
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

export function calculateTalentPoints(
  finalEquity: number,
  highestEquity: number,
  initialAsset: number,
  talentProfile?: TalentProfile
): number {
  const basePoints = Math.round((finalEquity / initialAsset) * 100 + (highestEquity / initialAsset) * 70);
  const flatBonus = talentProfile ? getSettlementFlatPointBonus(talentProfile) : 0;
  const equityBonus = getSettlementEquityPointBonus(talentProfile, finalEquity, initialAsset);
  return basePoints + flatBonus + equityBonus;
}

function getPriceChangeRate({
  baseChange,
  factor,
  marketHeat,
  newsWeight,
  stock,
  talentProfile,
  clampMin = -0.02,
  clampMax = 0.02
}: {
  baseChange: number;
  factor: number;
  marketHeat: number;
  newsWeight: number;
  stock: Stock;
  talentProfile?: TalentProfile;
  clampMin?: number;
  clampMax?: number;
}): number {
  const level = getPriceFormulaLevel(talentProfile);
  if (level <= 0) return clamp(baseChange, clampMin, clampMax);

  const companyFactor = factor * stock.volatility * ((100 + level) / 100);
  const sentimentValue = marketHeat - 0.45;
  const newsFactor = newsWeight * sentimentValue;
  return clamp(companyFactor + newsFactor, clampMin, clampMax);
}

function applyAutoSellStopLoss(state: GameState, talentProfile: TalentProfile | undefined, time: string): GameState {
  const settlementRatio = getAutoSellSettlementRatio(talentProfile);
  if (!settlementRatio) return state;

  let cashGain = 0;
  const soldNews: NewsItem[] = [];
  const nextHoldings = state.holdings.filter((holding) => {
    const stock = state.stocks.find((item) => item.id === holding.stockId);
    if (!stock || holding.averageCost <= 0) return true;

    const returnRatio = stock.price / holding.averageCost;
    if (returnRatio > settlementRatio) return true;

    const settlementPrice = roundMoney(holding.averageCost * settlementRatio);
    const proceeds = roundMoney(settlementPrice * holding.shares);
    cashGain += proceeds;
    soldNews.push({
      id: `auto-sell-${state.economy.day}-${time}-${holding.stockId}-${Date.now()}`,
      text: `自動停損：${stock.name} 跌破 ${(settlementRatio * 100).toFixed(0)}%，以 $${settlementPrice.toFixed(2)} 結算 ${holding.shares} 股。`,
      day: state.economy.day,
      time,
      companyIds: [holding.stockId]
    });
    return false;
  });

  if (soldNews.length === 0) return state;

  return {
    ...state,
    economy: {
      ...state.economy,
      cash: roundMoney(state.economy.cash + cashGain)
    },
    holdings: nextHoldings,
    newsList: [...soldNews, ...state.newsList],
    news: [...soldNews.map((item) => item.text), ...state.news].slice(0, 12)
  };
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

export function skipMatch(state: GameState, talentProfile?: TalentProfile): GameState {
  if (!state.isTrading) return state;
  if (state.currentMinutes >= 270) {
    return { ...state, currentMinutes: 270, isTrading: false, isPaused: true };
  }

  const X = getSafeMatchInterval(state.matchInterval);
  let nextMatchMinutes = state.currentMinutes + (X - (state.currentMinutes % X));
  if (nextMatchMinutes === state.currentMinutes) {
    nextMatchMinutes += X;
  }
  nextMatchMinutes = Math.min(270, nextMatchMinutes);

  let curr = { ...state, isPaused: false, isTrading: true };
  while (curr.currentMinutes < nextMatchMinutes && curr.isTrading) {
    curr = tickMarket(curr, talentProfile);
  }
  if (curr.isTrading) {
    curr.isPaused = true;
  }
  return curr;
}

export function skipToday(state: GameState, talentProfile?: TalentProfile): GameState {
  if (!state.isTrading) return state;
  let curr = { ...state, isPaused: false, isTrading: true };
  let remainingTicks = 271 - curr.currentMinutes;
  while (curr.isTrading && remainingTicks > 0) {
    curr = tickMarket(curr, talentProfile);
    if (curr.isTrading) {
      curr = { ...curr, isPaused: false };
    }
    remainingTicks -= 1;
  }
  return curr;
}

function getSafeMatchInterval(value: number | undefined): number {
  return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : 30;
}
