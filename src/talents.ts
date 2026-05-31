import { TalentProfile } from "./types";

export const openingCashTalentId = "openingCash";
export const openingCashMaxLevel = 10;
export const branchTalentAId = "talentA";
export const branchTalentBId = "talentB";
export const survivalTalentId = "talent5";
export const momentumTalentId = "talent6";
export const settlementTalentId = "talent7";
export const branchTalentCost = 25;

export type BranchTalentId = typeof branchTalentAId | typeof branchTalentBId;
export type TalentNodeId =
  | "base"
  | typeof openingCashTalentId
  | BranchTalentId
  | typeof survivalTalentId
  | typeof momentumTalentId
  | typeof settlementTalentId;

export function getTalentLevel(profile: TalentProfile, talentId: string): number {
  return Number(profile.talentLevels[talentId]) || 0;
}

export function getOpeningCashCost(level: number): number {
  let cost = 20;
  for (let index = 0; index < level; index += 1) cost = Math.ceil(cost * 1.15);
  return cost;
}

export function getOpeningCashBonus(profile: TalentProfile): number {
  return getTalentLevel(profile, openingCashTalentId) * 200;
}

export function getStartingCash(baseCash: number, profile: TalentProfile): number {
  return baseCash + getOpeningCashBonus(profile);
}

export function getSettlementFlatPointBonus(profile: TalentProfile): number {
  return 0;
}

export function getTradeFeeRate(profile: TalentProfile | undefined, baseFeeRate: number): number {
  return baseFeeRate;
}

export function getAutoSellSettlementRatio(profile: TalentProfile | undefined): number | null {
  const level = profile ? getTalentLevel(profile, branchTalentBId) : 0;
  if (level <= 0) return null;
  return Math.min(1, (80 + level) / 100);
}

export function getMaxPlayableDay(profile: TalentProfile): number {
  return 30 + getTalentLevel(profile, survivalTalentId);
}

export function getDailyPassiveIncome(profile: TalentProfile | undefined): number {
  return profile ? getTalentLevel(profile, branchTalentAId) * 100 : 0;
}

export function getDailyInterestRate(profile: TalentProfile | undefined): number {
  return profile ? getTalentLevel(profile, momentumTalentId) / 100 : 0;
}

export function getDailyCashIncome(
  profile: TalentProfile | undefined,
  currentCash: number
): {
  flatIncome: number;
  interestIncome: number;
  totalIncome: number;
} {
  const flatIncome = getDailyPassiveIncome(profile);
  const interestRate = getDailyInterestRate(profile);
  const interestIncome = Math.round((currentCash + flatIncome) * interestRate * 100) / 100;
  return {
    flatIncome,
    interestIncome,
    totalIncome: flatIncome + interestIncome
  };
}

export function getSettlementEquityPointBonus(
  profile: TalentProfile | undefined,
  finalEquity: number,
  initialAsset: number
): number {
  return 0;
}

export function getPriceFormulaLevel(profile: TalentProfile | undefined): number {
  return profile ? getTalentLevel(profile, settlementTalentId) : 0;
}

export function getTalentEffectSummary(talentId: string, level: number): string {
  switch (talentId) {
    case openingCashTalentId:
      return `開局經費 +$${level * 200}`;
    case branchTalentAId:
      return `每日被動收入 +$${level * 100}`;
    case branchTalentBId:
      return level > 0 ? `低於成本 ${80 + level}% 時自動停損` : "尚未啟用停損";
    case survivalTalentId:
      return `增加 +${level} 天時長`;
    case momentumTalentId:
      return `每日獲得 +${level}% 利息`;
    case settlementTalentId:
      return level > 0 ? `價格公式倍率 ${100 + level}%` : "基礎價格公式";
    default:
      return level > 0 ? `等級 ${level}` : "尚無啟用效果";
  }
}
