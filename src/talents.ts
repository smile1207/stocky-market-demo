import { TalentProfile } from "./types";

export const openingCashTalentId = "openingCash";
export const openingCashMaxLevel = 10;
export const branchTalentAId = "talentA";
export const branchTalentBId = "talentB";
export const branchTalentCost = 25;

export type BranchTalentId = typeof branchTalentAId | typeof branchTalentBId;
export type TalentNodeId = "base" | typeof openingCashTalentId | BranchTalentId;

export function getTalentLevel(profile: TalentProfile, talentId: string): number {
  return Number(profile.talentLevels[talentId]) || 0;
}

export function getOpeningCashCost(level: number): number {
  let cost = 20;
  for (let index = 0; index < level; index += 1) cost = Math.ceil(cost * 1.15);
  return cost;
}
