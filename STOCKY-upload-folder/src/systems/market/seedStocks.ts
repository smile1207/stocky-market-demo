import { Stock } from "../../types/domain";

export const seedStocks: Stock[] = [
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
