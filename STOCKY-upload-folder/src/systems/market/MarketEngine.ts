import { GameState, MarketSignal, Stock } from "../../types/domain";
import { advanceEconomy } from "../economy/EconomySystem";
import { priceStock } from "./PricingSystem";
import { toMarketSignal } from "./ExternalEventAdapter";
import { ExternalMarketEvent } from "../../types/externalEvent";
import { createMarketSignal } from "./seedSignals";

export function advanceDay(state: GameState): GameState {
  const day = state.economy.day + 1;
  const maturedSignal = state.upcomingSignal?.day === day ? state.upcomingSignal : undefined;
  const activeSignals = [
    ...state.activeSignals.filter((signal) => signal.day + signal.duration > day),
    ...(maturedSignal ? [{ ...maturedSignal, knownByForesight: false }] : [])
  ];
  const economy = advanceEconomy({ ...state.economy, day, foresightUsedToday: false }, activeSignals);
  const stocks = state.stocks.map((stock, index) => priceStock(stock, economy, activeSignals, day + index));
  const tokenGain = day % 5 === 0 ? 1 : 0;
  const nextUpcomingSignal = maturedSignal || !state.upcomingSignal ? createMarketSignal(day + 1 + (day % 2), day) : state.upcomingSignal;
  const createdAt = new Date().toISOString();

  return {
    ...state,
    economy,
    player: {
      ...state.player,
      token: state.player.token + tokenGain
    },
    stocks,
    activeSignals,
    upcomingSignal: nextUpcomingSignal,
    marketLogs: [
      ...(maturedSignal
        ? [
            {
              id: `${maturedSignal.id}-matured-log`,
              day,
              type: "market_signal" as const,
              title: maturedSignal.title,
              body: maturedSignal.description,
              payload: { sectorImpacts: maturedSignal.sectorImpacts },
              createdAt
            }
          ]
        : []),
      {
        id: `${createdAt}-daily-close`,
        day,
        type: "daily_close",
        title: `第 ${day} 日收盤`,
        body: `通膨 ${(economy.inflation * 100).toFixed(1)}%，市場熱度 ${(economy.marketHeat * 100).toFixed(0)}%。`,
        createdAt
      },
      ...state.marketLogs
    ].slice(0, 80)
  };
}

export function applyExternalEvent(state: GameState, event: ExternalMarketEvent): GameState {
  const signal = toMarketSignal(event);
  return applyMarketSignal(state, signal);
}

export function applyMarketSignal(state: GameState, signal: MarketSignal): GameState {
  return {
    ...state,
    activeSignals: [...state.activeSignals, signal],
    marketLogs: [
      {
        id: `${signal.id}-log`,
        day: state.economy.day,
        type: "market_signal",
        title: signal.title,
        body: signal.description,
        payload: { sectorImpacts: signal.sectorImpacts },
        createdAt: new Date().toISOString()
      },
      ...state.marketLogs
    ].slice(0, 80)
  };
}

export function totalEquity(state: GameState): number {
  return state.holdings.reduce((sum, holding) => {
    const stock = state.stocks.find((item: Stock) => item.id === holding.stockId);
    return sum + (stock ? stock.price * holding.shares : 0);
  }, state.player.cash);
}
