import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  branchTalentAId,
  branchTalentBId,
  getMaxPlayableDay,
  getOpeningCashBonus,
  getTalentEffectSummary,
  getTalentLevel,
  openingCashTalentId
} from "../talents";
import talentTreeData from "../talentTreeData.json";
import { TalentProfile } from "../types";

type TalentTreeNode = {
  id: string;
  name: string;
  x: number;
  y: number;
  maxLevel: number;
  cost: number;
  growth?: number;
  description: string;
};

type TalentPrerequisite = {
  from: string;
  to: string;
  minLevel?: number;
};

const talentNodes = talentTreeData.nodes as TalentTreeNode[];
const prerequisites = talentTreeData.prerequisites as TalentPrerequisite[];
const treeScale = 0.72;
const nodeSize = 78;
const canvasPadding = 24;

export function TalentScreen({
  profile,
  onUpgradeTalent,
  onResetTalents,
  onBack
}: {
  profile: TalentProfile;
  onUpgradeTalent: (talentId: string, cost: number, maxLevel: number) => void;
  onResetTalents: () => void;
  onBack: () => void;
}) {
  const [selectedTalentId, setSelectedTalentId] = useState("base");
  const getLevel = (talentId: string) => {
    if (talentId === "base") return 1;
    return getTalentLevel(profile, talentId);
  };

  const isPrerequisiteMet = (talentId: string) => {
    const incoming = prerequisites.filter((link) => link.to === talentId);
    return incoming.every((link) => getLevel(link.from) >= (link.minLevel ?? 1));
  };

  const getPrerequisiteText = (talentId: string) => {
    const incoming = prerequisites.filter((link) => link.to === talentId);
    if (incoming.length === 0) return "Prerequisite locked";
    const text = incoming
      .map((link) => {
        const from = talentNodes.find((talent) => talent.id === link.from);
        return `${from?.name ?? link.from} Lv. ${link.minLevel ?? 1}`;
      })
      .join(", ");
    return `Requires ${text}`;
  };

  const selectedTalent = talentNodes.find((talent) => talent.id === selectedTalentId) ?? talentNodes[0];
  const selectedLevel = getLevel(selectedTalent.id);
  const selectedCost = getUpgradeCost(selectedTalent, selectedLevel);
  const selectedMaxed = selectedTalent.id === "base" || selectedLevel >= selectedTalent.maxLevel;
  const selectedPrerequisiteMet = isPrerequisiteMet(selectedTalent.id);
  const selectedCanUpgrade =
    selectedTalent.id !== "base" &&
    selectedPrerequisiteMet &&
    !selectedMaxed &&
    profile.availablePoints >= selectedCost;
  const canvasWidth = Math.max(...talentNodes.map((talent) => displayX(talent) + nodeSize + canvasPadding));
  const canvasHeight = Math.max(...talentNodes.map((talent) => displayY(talent) + nodeSize + 34 + canvasPadding));
  const selectedTalentName = selectedTalent.name;
  const selectedTalentDescription = `${selectedTalent.description} Current Lv. ${selectedLevel}/${selectedTalent.maxLevel}. ${getTalentEffectSummary(selectedTalent.id, selectedLevel)}`;

  const selectedTalentStatus =
    selectedTalentId === "base"
      ? "Unlocked"
      : !selectedPrerequisiteMet
        ? getPrerequisiteText(selectedTalentId)
        : selectedMaxed
          ? "Maxed"
          : selectedCanUpgrade
            ? `Click again to upgrade (${selectedCost} pts)`
            : `Need ${selectedCost} pts`;

  const selectOrUpgradeTalent = (talentId: string) => {
    if (selectedTalentId !== talentId) {
      setSelectedTalentId(talentId);
      return;
    }

    if (selectedCanUpgrade) {
      onUpgradeTalent(selectedTalent.id, selectedCost, selectedTalent.maxLevel);
    }
  };

  return (
    <SafeAreaView style={styles.menuShell}>
      <StatusBar style="dark" />
      <View style={styles.menuPanel}>
        <Text style={styles.kicker}>TALENT TREE</Text>
        <Text style={styles.menuHeading}>Talent Tree</Text>
        <Text style={styles.menuPoints}>Talent points: {profile.availablePoints}</Text>

        <View style={styles.talentSummary}>
          <View>
            <Text style={styles.talentTitle}>{selectedTalentName}</Text>
            <Text style={styles.menuCopy}>{selectedTalentDescription}</Text>
            <Text style={styles.talentMeta}>{selectedTalentStatus}</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          style={styles.talentTreeScroller}
          contentContainerStyle={styles.talentTreeContent}
        >
          <View style={[styles.talentCanvas, { width: canvasWidth, height: canvasHeight }]}>
            {prerequisites.map((link) => {
              const from = talentNodes.find((talent) => talent.id === link.from);
              const to = talentNodes.find((talent) => talent.id === link.to);
              if (!from || !to) return null;
              const unlocked = getLevel(link.from) >= (link.minLevel ?? 1);
              return <TreeLink key={`${link.from}-${link.to}`} from={from} to={to} unlocked={unlocked} />;
            })}

            {talentNodes.map((talent) => {
              const talentLevel = getLevel(talent.id);
              const unlocked = talent.id === "base" || talentLevel > 0;
              const prerequisiteMet = isPrerequisiteMet(talent.id);
              const upgradeCost = getUpgradeCost(talent, talentLevel);
              const maxed = talent.id === "base" || talentLevel >= talent.maxLevel;
              const canUpgrade = talent.id !== "base" && prerequisiteMet && !maxed && profile.availablePoints >= upgradeCost;
              const locked = talent.id !== "base" && !prerequisiteMet;

              return (
                <View
                  key={talent.id}
                  style={[
                    styles.talentNodeWrap,
                    {
                      left: displayX(talent),
                      top: displayY(talent)
                    }
                  ]}
                >
                  <Pressable
                    onPress={() => selectOrUpgradeTalent(talent.id)}
                    style={[
                      styles.talentNode,
                      unlocked && styles.talentNodeUnlocked,
                      prerequisiteMet && !unlocked && styles.talentNodeNext,
                      canUpgrade && styles.talentNodeAffordable,
                      locked && styles.talentNodeLocked,
                      selectedTalentId === talent.id && styles.talentNodeSelected
                    ]}
                  >
                    <Ionicons
                      name={getNodeIcon(talent.id, unlocked, locked)}
                      size={20}
                      color={unlocked ? "#ffffff" : locked ? "#7b827e" : "#5a3612"}
                    />
                    <Text style={[styles.talentNodeLevel, unlocked && styles.talentNodeLevelUnlocked]}>
                      {talent.name}
                    </Text>
                  </Pressable>
                  <Text style={styles.talentNodeBonus}>{getNodeCaption(talent, talentLevel)}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.talentStats}>
          <Text style={styles.talentMeta}>Selected Lv. {selectedLevel} / {selectedTalent.maxLevel}</Text>
          <Text style={styles.talentMeta}>Start bonus +${getOpeningCashBonus(profile)}</Text>
          <Text style={styles.talentMeta}>Max day {getMaxPlayableDay(profile)}</Text>
          <Text style={styles.talentMeta}>{selectedMaxed ? "Max level reached" : `Next node costs ${selectedCost} pts`}</Text>
        </View>

        <View style={styles.talentActions}>
          <Pressable style={[styles.secondaryButton, styles.menuActionButton]} onPress={onResetTalents}>
            <Ionicons name="refresh" size={17} color="#23302f" />
            <Text style={styles.secondaryButtonText}>Reset Talents</Text>
          </Pressable>
          <Pressable style={[styles.secondaryButton, styles.menuActionButton]} onPress={onBack}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function TreeLink({ from, to, unlocked }: { from: TalentTreeNode; to: TalentTreeNode; unlocked: boolean }) {
  const x1 = displayX(from) + nodeSize;
  const y1 = displayY(from) + nodeSize / 2;
  const x2 = displayX(to);
  const y2 = displayY(to) + nodeSize / 2;
  const colorStyle = unlocked ? styles.talentConnectorUnlocked : undefined;
  const midX = x1 + Math.max(24, (x2 - x1) / 2);

  return (
    <>
      <View style={[styles.treeLink, colorStyle, { left: x1, top: y1 - 2, width: Math.max(0, midX - x1) }]} />
      <View style={[styles.treeLink, colorStyle, { left: Math.min(midX, x2), top: y2 - 2, width: Math.abs(x2 - midX) }]} />
      <View
        style={[
          styles.treeLinkVertical,
          colorStyle,
          {
            left: midX - 2,
            top: Math.min(y1, y2),
            height: Math.abs(y2 - y1)
          }
        ]}
      />
    </>
  );
}

function displayX(talent: TalentTreeNode): number {
  return canvasPadding + Math.round(talent.x * treeScale);
}

function displayY(talent: TalentTreeNode): number {
  return canvasPadding + Math.round(talent.y * treeScale);
}

function getNodeIcon(id: string, unlocked: boolean, locked: boolean): keyof typeof Ionicons.glyphMap {
  if (id === "base") return "home";
  if (unlocked) return "checkmark";
  if (locked) return "lock-closed";
  if (id === openingCashTalentId) return "cash";
  if (id === branchTalentAId) return "analytics";
  if (id === branchTalentBId) return "flash";
  return "ellipse";
}

function getNodeCaption(talent: TalentTreeNode, level: number): string {
  if (talent.id === "base") return "Start";
  if (talent.id === "openingCash") return `$+${level * 200}`;
  if (talent.id === "talentA") return `$+${level * 100}/day`;
  if (talent.id === "talentB") return level > 0 ? `Stop ${80 + level}%` : "No stop";
  if (talent.id === "talent5") return `+${level} days`;
  if (talent.id === "talent6") return `${level}% cash/day`;
  if (talent.id === "talent7") return `Formula ${100 + level}%`;
  if (talent.maxLevel > 1) return `Lv ${level}/${talent.maxLevel}`;
  return level > 0 ? "Lv 1" : `${getUpgradeCost(talent, level)} pts`;
}

function getUpgradeCost(talent: TalentTreeNode, level: number): number {
  const growth = Number.isFinite(talent.growth) && talent.growth && talent.growth > 0 ? talent.growth : 1;
  return Math.ceil(Math.max(0, talent.cost) * Math.pow(growth, level));
}

const styles = StyleSheet.create({
  menuShell: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
    backgroundColor: "#f7f3ea"
  },
  menuPanel: {
    borderRadius: 8,
    padding: 24,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#e3dac9",
    gap: 14
  },
  kicker: {
    color: "#8a4a64",
    fontSize: 12,
    fontWeight: "700"
  },
  menuHeading: {
    color: "#172321",
    fontSize: 42,
    lineHeight: 46,
    fontWeight: "900"
  },
  menuCopy: {
    color: "#52615e",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700"
  },
  menuPoints: {
    color: "#9f6a1b",
    fontSize: 16,
    fontWeight: "900"
  },
  talentSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14
  },
  talentTreeScroller: {
    marginHorizontal: -24,
    paddingVertical: 8
  },
  talentTreeContent: {
    paddingHorizontal: 24,
    paddingVertical: 10
  },
  talentLane: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 116
  },
  talentStep: {
    flexDirection: "row",
    alignItems: "center"
  },
  branchFork: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    marginRight: 8
  },
  branchStem: {
    width: 4,
    height: 118,
    backgroundColor: "#d2c6b2"
  },
  branchColumn: {
    gap: 16
  },
  branchRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  talentNodeWrap: {
    position: "absolute",
    width: 78,
    alignItems: "center"
  },
  talentCanvas: {
    position: "relative"
  },
  treeLink: {
    position: "absolute",
    height: 4,
    backgroundColor: "#d2c6b2"
  },
  treeLinkVertical: {
    position: "absolute",
    width: 4,
    backgroundColor: "#d2c6b2"
  },
  talentConnector: {
    width: 54,
    height: 4,
    backgroundColor: "#d2c6b2"
  },
  talentConnectorUnlocked: {
    backgroundColor: "#116647"
  },
  talentNode: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 2,
    borderColor: "#d2c6b2",
    backgroundColor: "#ffffff"
  },
  talentNodeUnlocked: {
    backgroundColor: "#116647",
    borderColor: "#116647"
  },
  talentNodeNext: {
    backgroundColor: "#fff4d9",
    borderColor: "#c58a2c"
  },
  talentNodeAffordable: {
    borderColor: "#9f6a1b"
  },
  talentNodeSelected: {
    borderColor: "#172321",
    borderWidth: 3
  },
  talentNodeLocked: {
    backgroundColor: "#eee8dc",
    opacity: 0.82
  },
  talentNodeLevel: {
    color: "#23302f",
    fontSize: 12,
    fontWeight: "900"
  },
  talentNodeLevelUnlocked: {
    color: "#ffffff"
  },
  talentNodeBonus: {
    width: 78,
    marginTop: 6,
    textAlign: "center",
    color: "#7b827e",
    fontSize: 11,
    fontWeight: "800"
  },
  talentStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  talentActions: {
    flexDirection: "row",
    gap: 10
  },
  talentTitle: {
    color: "#172321",
    fontSize: 22,
    fontWeight: "900"
  },
  talentMeta: {
    color: "#9f6a1b",
    fontSize: 13,
    fontWeight: "900"
  },
  menuActionButton: {
    flex: 1,
    paddingHorizontal: 16
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e6dfd1",
    gap: 7
  },
  secondaryButtonText: {
    color: "#23302f",
    fontWeight: "900",
    fontSize: 15
  }
});
