import { GameMutationResult, GameState, Holding, TradeOrder } from "../../types/domain";
import { roundMoney, clamp } from "./PricingSystem";

export function applyTrade(state: GameState, order: TradeOrder): GameMutationResult {
  const stock = state.stocks.find((item) => item.id === order.stockId);
  if (!stock) return { state, logs: [], message: "找不到股票。" };

  const feeRate = 0.006;
  const gross = stock.price * order.shares;
  const fee = roundMoney(gross * feeRate);
  const total = roundMoney(order.side === "buy" ? gross + fee : gross - fee);

  if (order.side === "buy" && state.player.cash < total) {
    return { state, logs: [], message: "現金不足，無法買入。" };
  }

  const existingHolding = state.holdings.find((item) => item.stockId === stock.id);
  if (order.side === "sell" && (!existingHolding || existingHolding.shares < order.shares)) {
    return { state, logs: [], message: "持股不足。" };
  }

  const nextHoldings = updateHoldings(state.holdings, order, stock.price);
  const nextStocks = state.stocks.map((item) => {
    if (item.id !== stock.id) return item;
    const direction = order.side === "buy" ? 1 : -1;
    return {
      ...item,
      demand: clamp(item.demand + direction * order.shares * (order.side === "buy" ? 1.7 : 1.1), 35, 180),
      supply: clamp(item.supply - direction * order.shares * (order.side === "buy" ? 0.9 : 1.4), 30, 180),
      price: roundMoney(item.price * (1 + direction * order.shares * (order.side === "buy" ? 0.004 : 0.0035)))
    };
  });

  const tradeLog = {
    id: `${Date.now()}-${order.side}-${stock.id}`,
    day: state.economy.day,
    stockId: stock.id,
    side: order.side,
    shares: order.shares,
    price: stock.price,
    fee,
    total,
    createdAt: new Date().toISOString()
  };

  const message = order.side === "buy" ? `買入成功，花費 ${total.toFixed(2)}。` : `賣出成功，收入 ${total.toFixed(2)}。`;

  return {
    state: {
      ...state,
      player: {
        ...state.player,
        cash: roundMoney(state.player.cash + (order.side === "buy" ? -total : total))
      },
      holdings: nextHoldings,
      stocks: nextStocks,
      tradeLogs: [tradeLog, ...state.tradeLogs].slice(0, 60)
    },
    logs: [
      {
        id: `${tradeLog.id}-market-log`,
        day: state.economy.day,
        type: "trade",
        title: order.side === "buy" ? "買入成交" : "賣出成交",
        body: `${order.side === "buy" ? "買入" : "賣出"} ${stock.name} ${order.shares} 股，成交價 ${stock.price.toFixed(2)}。`,
        createdAt: tradeLog.createdAt
      }
    ],
    tradeLog,
    message
  };
}

function updateHoldings(holdings: Holding[], order: TradeOrder, price: number): Holding[] {
  const existing = holdings.find((item) => item.stockId === order.stockId);
  if (order.side === "buy") {
    if (!existing) return [...holdings, { stockId: order.stockId, shares: order.shares, averageCost: price }];
    return holdings.map((item) => {
      if (item.stockId !== order.stockId) return item;
      const shares = item.shares + order.shares;
      return {
        ...item,
        shares,
        averageCost: roundMoney((item.averageCost * item.shares + price * order.shares) / shares)
      };
    });
  }

  return holdings
    .map((item) => (item.stockId === order.stockId ? { ...item, shares: item.shares - order.shares } : item))
    .filter((item) => item.shares > 0);
}
