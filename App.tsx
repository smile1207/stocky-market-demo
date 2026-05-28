import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform
} from "react-native";
import {
  advanceDay,
  baseInitialAsset,
  buyStock,
  calculateTalentPoints,
  createInitialState,
  sectorLabel,
  sellStock,
  totalEquity,
  useForesight,
  withHighestEquity,
  tickMarket,
  getMarketIndexPrice,
  formatMinutes
} from "./src/marketEngine";
import { loadGameState, loadTalentProfile, resetGameStateWithCash, saveGameState, saveTalentProfile } from "./src/storage";
import { GameState, SettlementResult, Stock, TalentProfile } from "./src/types";

type Tab = "market" | "portfolio" | "news";
type Screen = "start" | "game" | "settlement" | "talent";

const tradeLots = [1, 5, 10];
const openingCashTalentId = "openingCash";
const openingCashMaxLevel = 10;

export default function App() {
  const [state, setState] = useState<GameState>();
  const [talentProfile, setTalentProfile] = useState<TalentProfile>();
  const [screen, setScreen] = useState<Screen>("start");
  const [selectedId, setSelectedId] = useState("overall"); // Default to overall market index
  const [tab, setTab] = useState<Tab>("market");
  const [message, setMessage] = useState("開市準備中");

  // Menu Modal State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [talentFromScreen, setTalentFromScreen] = useState<Screen>("start");
  
  // Quick Sell Action Sheet State
  const [sellingStockId, setSellingStockId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadGameState(), loadTalentProfile()])
      .then(([loaded, talents]) => {
        const normalized = normalizeGameState(loaded);
        setTalentProfile(talents);
        setState(normalized);
        setSelectedId("overall");
        setMessage("市場資料已從本機 SQLite 載入");
      })
      .catch((error) => {
        setMessage("載入失敗，已建立新市場");
        console.warn(error);
        const fallbackTalents = createEmptyTalentProfile();
        setTalentProfile(fallbackTalents);
        setState(createInitialState(getStartingCash(fallbackTalents)));
      });
  }, []);

  useEffect(() => {
    if (!state) return;
    saveGameState(state).catch((error) => console.warn("Failed to save game state", error));
  }, [state]);

  useEffect(() => {
    if (!talentProfile) return;
    saveTalentProfile(talentProfile).catch((error) => console.warn("Failed to save talent profile", error));
  }, [talentProfile]);

  // Auto-ticking interval effect
  useEffect(() => {
    if (!state || !state.isTrading || state.isPaused) return;

    const intervalTime = Math.round(300000 / state.gameSpeed);
    const timer = setInterval(() => {
      setState((curr) => {
        if (!curr) return curr;
        const next = tickMarket(curr);
        // Alert when day closed
        if (!next.isTrading && curr.isTrading) {
          setMessage(`第 ${curr.economy.day} 日收盤：通膨 ${(next.economy.inflation * 100).toFixed(1)}%，市場熱度 ${(next.economy.marketHeat * 100).toFixed(0)}%。`);
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [state?.isTrading, state?.isPaused, state?.gameSpeed]);

  const selectedStock = useMemo(
    () => selectedId === "overall" ? null : (state?.stocks.find((stock) => stock.id === selectedId) ?? null),
    [selectedId, state]
  );

  if (!state || !talentProfile) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color="#1b5b55" />
        <Text style={styles.loadingText}>讀取市場資料...</Text>
      </SafeAreaView>
    );
  }

  const applyTrade = (action: "buy" | "sell", shares: number, stockId = selectedId) => {
    const result = action === "buy" ? buyStock(state, stockId, shares) : sellStock(state, stockId, shares);
    setState(withHighestEquity(result.state));
    setMessage(result.message);
  };

  const startTrading = () => {
    setState((curr) => {
      if (!curr) return curr;
      return {
        ...curr,
        isTrading: true,
        isPaused: false
      };
    });
    setMessage(`第 ${state.economy.day} 日交易開始！`);
  };

  const nextDay = () => {
    const next = advanceDay(state);
    if (next.economy.day >= 30) {
      finishGame(next);
      return;
    }
    setState(next);
    setSelectedId("overall");
    setMessage(`第 ${next.economy.day} 日開盤，市場已重新定價（盤前準備中）`);
  };

  const foresight = () => {
    const result = useForesight(state);
    setState(result.state);
    setMessage(result.message);
  };

  const finishGame = (nextState: GameState) => {
    const settledState = withHighestEquity(nextState);
    const finalEquity = totalEquity(settledState);
    const result: SettlementResult = {
      initialAsset: settledState.initialAsset,
      highestEquity: settledState.highestEquity,
      finalEquity,
      talentPoints: calculateTalentPoints(finalEquity, settledState.highestEquity, settledState.initialAsset)
    };
    setTalentProfile({
      ...talentProfile,
      availablePoints: talentProfile.availablePoints + result.talentPoints,
      lifetimePoints: talentProfile.lifetimePoints + result.talentPoints
    });
    setState({ ...settledState, endResult: result });
    setScreen("settlement");
  };

  const startGame = async () => {
    if (state.endResult) {
      setScreen("settlement");
      return;
    }
    const startingCash = getStartingCash(talentProfile);
    if (state.economy.day === 1 && state.holdings.length === 0 && state.initialAsset !== startingCash) {
      const fresh = await resetGameStateWithCash(startingCash);
      setState(fresh);
      setSelectedId("overall");
    }
    setScreen("game");
  };

  const backToStart = async () => {
    const fresh = await resetGameStateWithCash(getStartingCash(talentProfile));
    setState(fresh);
    setSelectedId("overall");
    setTab("market");
    setScreen("start");
  };

  const upgradeOpeningCashTalent = () => {
    const level = getTalentLevel(talentProfile, openingCashTalentId);
    if (level >= openingCashMaxLevel) return;
    const cost = getOpeningCashCost(level);
    if (talentProfile.availablePoints < cost) return;
    const nextProfile = {
      ...talentProfile,
      availablePoints: talentProfile.availablePoints - cost,
      talentLevels: {
        ...talentProfile.talentLevels,
        [openingCashTalentId]: level + 1
      }
    };
    setTalentProfile(nextProfile);
    if (state.economy.day === 1 && state.holdings.length === 0 && !state.endResult) {
      const fresh = createInitialState(getStartingCash(nextProfile));
      setState(fresh);
      setSelectedId("overall");
    }
  };

  const reset = () => {
    Alert.alert("重置市場", "要重新開始這個市場 demo 嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "重置",
        style: "destructive",
        onPress: async () => {
          const fresh = await resetGameStateWithCash(getStartingCash(talentProfile));
          setState(fresh);
          setSelectedId("overall");
          setTab("market");
          setMessage("市場已重置");
        }
      }
    ]);
  };

  if (screen === "start") {
    return (
      <StartScreen
        availablePoints={talentProfile.availablePoints}
        onStart={startGame}
        onTalent={() => {
          setTalentFromScreen("start");
          setScreen("talent");
        }}
      />
    );
  }

  if (screen === "talent") {
    return (
      <TalentScreen
        profile={talentProfile}
        onUpgradeOpeningCash={upgradeOpeningCashTalent}
        onBack={() => setScreen(talentFromScreen)}
      />
    );
  }

  if (screen === "settlement") {
    return (
      <SettlementScreen
        result={state.endResult ?? createSettlementResult(state)}
        availablePoints={talentProfile.availablePoints}
        onBackToStart={backToStart}
      />
    );
  }

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style="dark" />
      
      {/* 3 tabs in header navigation */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>STOCKY</Text>
        
        <View style={styles.headerTabs}>
          <Pressable style={[styles.headerTabButton, tab === "market" && styles.headerTabActive]} onPress={() => setTab("market")}>
            <Text style={[styles.headerTabLabel, tab === "market" && styles.headerTabActiveLabel]}>市場</Text>
          </Pressable>
          <Pressable style={[styles.headerTabButton, tab === "portfolio" && styles.headerTabActive]} onPress={() => setTab("portfolio")}>
            <Text style={[styles.headerTabLabel, tab === "portfolio" && styles.headerTabActiveLabel]}>資產</Text>
          </Pressable>
          <Pressable style={[styles.headerTabButton, tab === "news" && styles.headerTabActive]} onPress={() => setTab("news")}>
            <Text style={[styles.headerTabLabel, tab === "news" && styles.headerTabActiveLabel]}>事件</Text>
          </Pressable>
        </View>

        <Pressable accessibilityLabel="Open menu" style={styles.iconButton} onPress={() => setIsMenuOpen(true)}>
          <Ionicons name="menu" size={22} color="#23302f" />
        </Pressable>
      </View>

      {/* Marquee ticker for latest news */}
      <View style={styles.breakingNews}>
        <Ionicons name="megaphone" size={14} color="#9f6a1b" />
        <Text style={styles.breakingNewsText} numberOfLines={1}>
          {state.newsList.length > 0 ? state.newsList[0].text : "開盤準備中，請詳閱盤前新聞"}
        </Text>
      </View>

      {/* Market Stats Bar */}
      <View style={styles.statsRow}>
        <Metric label="日次" value={`${state.economy.day}`} tone="ink" />
        <Metric label="現金" value={`$${state.economy.cash.toFixed(0)}`} tone="mint" />
        <Metric label="股權" value={`$${totalEquity(state).toFixed(0)}`} tone="gold" />
      </View>

      {/* Economy band */}
      <View style={styles.economyBand}>
        <Gauge label="通膨" value={state.economy.inflation} dangerAt={0.08} format={(v) => `${(v * 100).toFixed(1)}%`} />
        <Gauge label="熱度" value={state.economy.marketHeat} dangerAt={0.75} format={(v) => `${(v * 100).toFixed(0)}%`} />
        <Gauge label="穩定基金" value={state.economy.stabilityFund / 320} dangerAt={0.15} format={() => `$${state.economy.stabilityFund.toFixed(0)}`} />
      </View>

      {/* Toolbar / Actions depending on game time state */}
      <View style={styles.toolbar}>
        {/* Pre-market start button */}
        {!state.isTrading && state.currentMinutes === 0 ? (
          <Pressable style={[styles.primaryButton, styles.dayButton, { backgroundColor: "#116647" }]} onPress={startTrading}>
            <Ionicons name="play" size={17} color="#fff" />
            <Text style={styles.primaryButtonText}>開始交易 (09:00 開盤)</Text>
          </Pressable>
        ) : state.isTrading ? (
          // Intraday active speed and time indicators
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#e3dac9", paddingHorizontal: 12, borderRadius: 8, height: 44 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <ActivityIndicator size="small" color="#1b5b55" />
              <Text style={{ fontWeight: "900", color: "#172321" }}>
                盤中交易 {formatMinutes(state.currentMinutes)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 12, color: "#52615e", fontWeight: "700" }}>速度: {state.gameSpeed}x</Text>
              <Pressable 
                style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: state.isPaused ? "#116647" : "#963f33" }}
                onPress={() => setState(curr => curr ? { ...curr, isPaused: !curr.isPaused } : curr)}
              >
                <Text style={{ fontSize: 11, color: "#fff", fontWeight: "800" }}>
                  {state.isPaused ? "播放" : "暫停"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          // Day closed, wait to advance
          <Pressable style={[styles.primaryButton, styles.dayButton]} onPress={nextDay}>
            <Ionicons name="play-forward" size={17} color="#fff" />
            <Text style={styles.primaryButtonText}>下一日 (Pre-market)</Text>
          </Pressable>
        )}

        <Pressable style={styles.tokenButton} onPress={foresight}>
          <Ionicons name="sparkles" size={17} color="#5a3612" />
          <Text style={styles.tokenButtonText}>預知 {state.economy.token}</Text>
        </Pressable>
      </View>

      <Text style={styles.message}>{message}</Text>

      {tab === "market" && (
        <MarketView
          state={state}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onTrade={applyTrade}
        />
      )}
      {tab === "portfolio" && (
        <PortfolioView 
          state={state} 
          onSelect={(id) => { setSelectedId(id); setTab("market"); }} 
          onQuickSell={setSellingStockId}
        />
      )}
      {tab === "news" && <NewsView state={state} />}

      {/* Menu Overlay */}
      {isMenuOpen && (
        <View style={styles.menuOverlay}>
          <Pressable style={styles.menuBackdrop} onPress={() => setIsMenuOpen(false)} />
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuHeaderTitle}>遊戲選單</Text>
              <Pressable onPress={() => setIsMenuOpen(false)}>
                <Ionicons name="close" size={24} color="#23302f" />
              </Pressable>
            </View>
            
            <ScrollView contentContainerStyle={styles.menuContent}>
              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>交易狀態</Text>
                <Pressable 
                  style={[styles.primaryButton, { backgroundColor: state.isPaused ? "#116647" : "#963f33" }]} 
                  onPress={() => {
                    setState(curr => curr ? { ...curr, isPaused: !curr.isPaused } : curr);
                    setMessage(state.isPaused ? "交易已恢復" : "交易已暫停");
                  }}
                >
                  <Ionicons name={state.isPaused ? "play" : "pause"} size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>
                    {state.isPaused ? "恢復交易 (Resume)" : "暫停交易 (Pause)"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>交易速度設定</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[45, 60, 120].map((speed) => (
                    <Pressable
                      key={speed}
                      style={[
                        styles.secondaryButton,
                        { flex: 1, backgroundColor: state.gameSpeed === speed ? "#23302f" : "#e6dfd1" }
                      ]}
                      onPress={() => {
                        setState(curr => curr ? { ...curr, gameSpeed: speed } : curr);
                        setMessage(`交易速度已調整為 ${speed}x`);
                      }}
                    >
                      <Text style={[styles.secondaryButtonText, { color: state.gameSpeed === speed ? "#fff" : "#23302f" }]}>
                        {speed}x
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>天賦系統</Text>
                <Pressable 
                  style={styles.secondaryButton} 
                  onPress={() => {
                    setTalentFromScreen("game");
                    setScreen("talent");
                    setIsMenuOpen(false);
                  }}
                >
                  <Ionicons name="git-branch" size={18} color="#23302f" style={{ marginRight: 6 }} />
                  <Text style={styles.secondaryButtonText}>檢視/升級天賦</Text>
                </Pressable>
              </View>

              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>存檔匯出 (JSON)</Text>
                <Text style={{ fontSize: 11, color: "#7b827e", marginBottom: 6 }}>
                  長按下方文字方塊可以複製遊戲進度 JSON：
                </Text>
                <View style={styles.jsonContainer}>
                  <ScrollView style={{ height: 120 }}>
                    <Text selectable style={{ fontSize: 10, fontFamily: "monospace", color: "#52615e" }}>
                      {JSON.stringify(state)}
                    </Text>
                  </ScrollView>
                </View>
                <Pressable 
                  style={[styles.primaryButton, { marginTop: 8, backgroundColor: "#1b5b55" }]} 
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      navigator.clipboard.writeText(JSON.stringify(state));
                      Alert.alert("複製成功", "進度 JSON 已複製到剪貼簿！");
                    } else {
                      Alert.alert("複製提示", "請在上方方塊中長按選取文字進行複製。");
                    }
                  }}
                >
                  <Ionicons name="copy" size={16} color="#fff" />
                  <Text style={styles.primaryButtonText}>複製到剪貼簿</Text>
                </Pressable>
              </View>

              <View style={[styles.menuSection, { marginTop: 12, borderTopWidth: 1, borderTopColor: "#e3dac9", paddingTop: 16 }]}>
                <Pressable style={[styles.secondaryButton, { backgroundColor: "#f0d8d3" }]} onPress={() => { setIsMenuOpen(false); reset(); }}>
                  <Ionicons name="refresh" size={18} color="#963f33" style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryButtonText, { color: "#963f33" }]}>重置市場 (Restart)</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Quick Sell Action Sheet */}
      {sellingStockId && (() => {
        const stock = state.stocks.find(s => s.id === sellingStockId);
        const holding = state.holdings.find(h => h.stockId === sellingStockId);
        if (!stock || !holding) return null;
        return (
          <View style={styles.menuOverlay}>
            <Pressable style={styles.menuBackdrop} onPress={() => setSellingStockId(null)} />
            <View style={styles.actionSheetContainer}>
              <Text style={styles.actionSheetTitle}>賣出 {stock.name} ({stock.code})</Text>
              <Text style={styles.actionSheetSubtitle}>持有：{holding.shares} 股 · 現價：${stock.price.toFixed(2)}</Text>
              
              <View style={{ gap: 8, marginTop: 12 }}>
                {[1, 5, 10].map((qty) => {
                  const disabled = holding.shares < qty;
                  return (
                    <Pressable
                      key={qty}
                      disabled={disabled}
                      style={[styles.actionSheetButton, disabled && styles.disabledButton]}
                      onPress={() => {
                        applyTrade("sell", qty, sellingStockId);
                        setSellingStockId(null);
                      }}
                    >
                      <Text style={styles.actionSheetButtonText}>賣出 {qty} 股 (約得 ${(stock.price * qty * 0.994).toFixed(1)})</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  style={[styles.actionSheetButton, { backgroundColor: "#963f33" }]}
                  onPress={() => {
                    applyTrade("sell", holding.shares, sellingStockId);
                    setSellingStockId(null);
                  }}
                >
                  <Text style={[styles.actionSheetButtonText, { color: "#fff" }]}>賣出全部 ({holding.shares} 股)</Text>
                </Pressable>
                
                <Pressable
                  style={[styles.actionSheetButton, { backgroundColor: "#e6dfd1", marginTop: 8 }]}
                  onPress={() => setSellingStockId(null)}
                >
                  <Text style={[styles.actionSheetButtonText, { color: "#23302f" }]}>取消</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })()}
    </SafeAreaView>
  );
}

function StartScreen({
  availablePoints,
  onStart,
  onTalent
}: {
  availablePoints: number;
  onStart: () => void;
  onTalent: () => void;
}) {
  return (
    <SafeAreaView style={styles.menuShell}>
      <StatusBar style="dark" />
      <View style={styles.menuPanel}>
        <Text style={styles.kicker}>STOCKY MARKET DEMO</Text>
        <Text style={styles.menuTitle}>STOCKY</Text>
        <Text style={styles.menuCopy}>Trade stocks, read market signals, and grow assets across 30 days.</Text>
        <Text style={styles.menuPoints}>Talent points: {availablePoints}</Text>
        <View style={styles.menuActions}>
          <Pressable style={[styles.primaryButton, styles.menuActionButton]} onPress={onStart}>
            <Text style={styles.primaryButtonText}>Start Game</Text>
          </Pressable>
          <Pressable style={[styles.secondaryButton, styles.menuActionButton]} onPress={onTalent}>
            <Text style={styles.secondaryButtonText}>Talent Tree</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function TalentScreen({
  profile,
  onUpgradeOpeningCash,
  onBack
}: {
  profile: TalentProfile;
  onUpgradeOpeningCash: () => void;
  onBack: () => void;
}) {
  const level = getTalentLevel(profile, openingCashTalentId);
  const cost = getOpeningCashCost(level);
  const isMaxed = level >= openingCashMaxLevel;
  const canUpgrade = !isMaxed && profile.availablePoints >= cost;

  return (
    <SafeAreaView style={styles.menuShell}>
      <StatusBar style="dark" />
      <View style={styles.menuPanel}>
        <Text style={styles.kicker}>TALENT TREE</Text>
        <Text style={styles.menuHeading}>Talent Tree</Text>
        <Text style={styles.menuPoints}>Talent points: {profile.availablePoints}</Text>

        <View style={styles.talentCard}>
          <View style={styles.talentCardText}>
            <Text style={styles.talentTitle}>Starting Cash</Text>
            <Text style={styles.menuCopy}>Each level gives +$200 starting cash. Max level 10.</Text>
            <Text style={styles.talentMeta}>Lv. {level} / {openingCashMaxLevel}</Text>
            <Text style={styles.talentMeta}>Start bonus +${level * 200}</Text>
            <Text style={styles.talentMeta}>{isMaxed ? "Max level reached" : `Next level ${cost} pts`}</Text>
          </View>
          <Pressable style={[styles.primaryButton, styles.menuActionButton, !canUpgrade && styles.disabledButton]} disabled={!canUpgrade} onPress={onUpgradeOpeningCash}>
            <Text style={styles.primaryButtonText}>{isMaxed ? "Maxed" : `Upgrade (${cost})`}</Text>
          </Pressable>
        </View>

        <Pressable style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function SettlementScreen({
  result,
  availablePoints,
  onBackToStart
}: {
  result: SettlementResult;
  availablePoints: number;
  onBackToStart: () => void;
}) {
  return (
    <SafeAreaView style={styles.menuShell}>
      <StatusBar style="dark" />
      <View style={styles.menuPanel}>
        <Text style={styles.kicker}>DAY 30 REPORT</Text>
        <Text style={styles.menuHeading}>Settlement</Text>
        <View style={styles.settlementGrid}>
          <Metric label="Highest Equity" value={`$${result.highestEquity.toFixed(0)}`} tone="mint" />
          <Metric label="Final Equity" value={`$${result.finalEquity.toFixed(0)}`} tone="ink" />
          <Metric label="Talent Points" value={`${result.talentPoints}`} tone="gold" />
        </View>
        <Text style={styles.menuCopy}>Earned {result.talentPoints} talent points. Available points: {availablePoints}.</Text>
        <Pressable style={[styles.primaryButton, styles.menuActionButton]} onPress={onBackToStart}>
          <Text style={styles.primaryButtonText}>Back to Start</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function MarketView({
  state,
  selectedId,
  onSelect,
  onTrade
}: {
  state: GameState;
  selectedId: string;
  onSelect: (id: string) => void;
  onTrade: (action: "buy" | "sell", shares: number) => void;
}) {
  const isOverallSelected = selectedId === "overall";
  const selectedStock = isOverallSelected ? null : (state.stocks.find(s => s.id === selectedId) ?? null);

  // Overall Index calculations
  const indexOpen = getMarketIndexPrice(state.stocks.map(s => ({ ...s, price: s.basePrice })));
  const indexCurrent = getMarketIndexPrice(state.stocks);
  const indexDelta = indexOpen > 0 ? ((indexCurrent - indexOpen) / indexOpen) * 100 : 0;
  const indexDirection = indexCurrent >= indexOpen ? "up" : "down";
  const totalVolume = state.stocks.reduce((sum, s) => sum + s.volume, 0);

  // Determine current info
  const name = isOverallSelected ? "總體市場指數" : (selectedStock?.name ?? "");
  const price = isOverallSelected ? indexCurrent : (selectedStock?.price ?? 0);
  const delta = isOverallSelected ? indexDelta : (selectedStock ? ((selectedStock.price - selectedStock.basePrice) / selectedStock.basePrice) * 100 : 0);
  const direction = delta >= 0 ? "up" : "down";
  const description = isOverallSelected ? "反映市場整體表現的綜合價格指數。包含所有板塊之加權平均價格。" : (selectedStock?.description ?? "");

  // Chart data setup
  const chartPrices = isOverallSelected ? state.marketHistory : (selectedStock?.history ?? []);
  
  // Make sure we have at least one point, and if the day is currently trading, append the current active price
  const displayPrices = [...chartPrices];
  if (displayPrices.length === 0 || displayPrices[displayPrices.length - 1] !== price) {
    displayPrices.push(price);
  }

  const minPrice = Math.min(...displayPrices) * 0.98;
  const maxPrice = Math.max(...displayPrices) * 1.02;
  const priceRange = maxPrice - minPrice || 1;

  // Render SVG Chart for Web or Bar Chart for Mobile
  const renderChart = () => {
    if (Platform.OS === 'web') {
      const points = displayPrices.map((p, idx) => {
        const x = (idx / Math.max(1, displayPrices.length - 1)) * 300;
        const y = 120 - ((p - minPrice) / priceRange) * 100 - 10;
        return `${x},${y}`;
      }).join(" ");

      return (
        <View style={{ height: 120, width: "100%", marginVertical: 12, backgroundColor: "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: "#e3dac9", overflow: "hidden" }}>
          {/* @ts-ignore */}
          <svg width="100%" height="100%" viewBox="0 0 300 120" preserveAspectRatio="none">
            {/* @ts-ignore */}
            <defs>
              {/* @ts-ignore */}
              <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                {/* @ts-ignore */}
                <stop offset="0%" stopColor={direction === "up" ? "#d8efe2" : "#f0d8d3"} stopOpacity="0.8" />
                {/* @ts-ignore */}
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {/* @ts-ignore */}
            <line x1="0" y1="10" x2="300" y2="10" stroke="#e6dfd1" strokeDasharray="4" />
            {/* @ts-ignore */}
            <line x1="0" y1="60" x2="300" y2="60" stroke="#e6dfd1" strokeDasharray="4" />
            {/* @ts-ignore */}
            <line x1="0" y1="110" x2="300" y2="110" stroke="#e6dfd1" strokeDasharray="4" />
            {/* @ts-ignore */}
            <polygon points={`0,120 ${points} 300,120`} fill="url(#grad)" />
            {/* @ts-ignore */}
            <polyline fill="none" stroke={direction === "up" ? "#116647" : "#963f33"} strokeWidth="2.5" points={points} />
            {displayPrices.length > 0 && (
              /* @ts-ignore */
              <circle
                cx={(displayPrices.length - 1) / Math.max(1, displayPrices.length - 1) * 300}
                cy={120 - ((displayPrices[displayPrices.length - 1] - minPrice) / priceRange) * 100 - 10}
                r="4"
                fill={direction === "up" ? "#116647" : "#963f33"}
              />
            )}
          </svg>
        </View>
      );
    } else {
      // Native sparkline of vertical bars
      return (
        <View style={{ height: 120, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginVertical: 12, padding: 8, backgroundColor: "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: "#e3dac9" }}>
          {displayPrices.map((p, idx) => {
            const barHeight = ((p - minPrice) / priceRange) * 100 + 10;
            return (
              <View
                key={idx}
                style={{
                  width: `${Math.max(2, 90 / displayPrices.length - 1)}%`,
                  height: `${barHeight}%`,
                  backgroundColor: direction === "up" ? "#116647" : "#963f33",
                  opacity: idx === displayPrices.length - 1 ? 1 : 0.6,
                  borderRadius: 2
                }}
              />
            );
          })}
        </View>
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Selected Entity Card */}
      <View style={styles.stockPanel}>
        <View style={styles.stockPanelTop}>
          <View>
            <Text style={styles.stockName}>{name}</Text>
            <Text style={styles.stockMeta}>
              {isOverallSelected ? "INDEX · 加權指數" : `${selectedStock?.code} · ${sectorLabel(selectedStock!.sector)}`}
            </Text>
          </View>
          <View style={[styles.priceBadge, direction === "up" ? styles.priceUp : styles.priceDown]}>
            <Ionicons name={direction === "up" ? "arrow-up" : "arrow-down"} size={15} color={direction === "up" ? "#116647" : "#963f33"} />
            <Text style={[styles.priceBadgeText, direction === "up" ? styles.priceUpText : styles.priceDownText]}>
              {delta.toFixed(1)}%
            </Text>
          </View>
        </View>
        
        <Text style={styles.bigPrice}>${price.toFixed(2)}</Text>
        
        {/* Render SVG/Bar Sparkline Chart */}
        {renderChart()}

        <Text style={styles.description}>{description}</Text>

        {isOverallSelected ? (
          <View style={styles.depthGrid}>
            <Depth label="通膨率" value={state.economy.inflation * 500} color="#1b5b55" />
            <Depth label="市場熱度" value={state.economy.marketHeat * 100} color="#9f6a1b" />
            <Depth label="穩定基金" value={(state.economy.stabilityFund / 320) * 100} color="#47618c" />
            <Depth label="今日交易量" value={Math.min(100, (totalVolume / 100) * 100)} color="#8a4a64" />
          </View>
        ) : (
          selectedStock && (
            <View style={styles.depthGrid}>
              <Depth label="需求" value={selectedStock.demand} color="#1b5b55" />
              <Depth label="供給" value={selectedStock.supply} color="#9f6a1b" />
              <Depth label="穩定度" value={selectedStock.stability * 100} color="#47618c" />
              <Depth label="波動率" value={selectedStock.volatility * 1000} color="#8a4a64" />
            </View>
          )
        )}
      </View>

      {/* Holdings counter below card */}
      <View style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#e3dac9" }}>
        <Text style={{ fontSize: 13, fontWeight: "800", color: "#52615e" }}>持股摘要</Text>
        {isOverallSelected ? (() => {
          const totalShares = state.holdings.reduce((sum, h) => sum + h.shares, 0);
          const totalValue = state.holdings.reduce((sum, h) => {
            const s = state.stocks.find(stock => stock.id === h.stockId);
            return sum + (s ? s.price * h.shares : 0);
          }, 0);
          return (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
              <Text style={{ fontWeight: "900", color: "#23302f" }}>持股總數: {totalShares} 股</Text>
              <Text style={{ fontWeight: "900", color: "#1b5b55" }}>總市值: ${totalValue.toFixed(0)}</Text>
            </View>
          );
        })() : (() => {
          const holding = state.holdings.find(h => h.stockId === selectedId);
          if (!holding) return <Text style={{ fontSize: 13, color: "#7b827e", marginTop: 4 }}>尚未持有此股票</Text>;
          const val = holding.shares * selectedStock!.price;
          const pnl = ((selectedStock!.price - holding.averageCost) / holding.averageCost) * 100;
          return (
            <View style={{ marginTop: 6, gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "800", color: "#23302f" }}>持有：{holding.shares} 股</Text>
                <Text style={{ fontWeight: "800", color: "#23302f" }}>市值：${val.toFixed(0)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: "#52615e", fontWeight: "700" }}>均價：${holding.averageCost.toFixed(2)}</Text>
                <Text style={[pnl >= 0 ? styles.pnlUp : styles.pnlDown, { marginTop: 0 }]}>損益：{pnl.toFixed(1)}%</Text>
              </View>
            </View>
          );
        })()}
      </View>

      {/* Trade panel for stock trading */}
      {!isOverallSelected && (
        <View style={styles.tradePanel}>
          <Text style={styles.sectionTitle}>定價買賣</Text>
          <View style={styles.tradeRows}>
            {tradeLots.map((lot) => (
              <View key={lot} style={styles.tradeRow}>
                <Text style={styles.lotText}>{lot} 股</Text>
                <Pressable style={styles.buyButton} onPress={() => onTrade("buy", lot)}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.tradeButtonText}>買</Text>
                </Pressable>
                <Pressable style={styles.sellButton} onPress={() => onTrade("sell", lot)}>
                  <Ionicons name="remove" size={18} color="#fff" />
                  <Text style={styles.tradeButtonText}>賣</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Asset List selection */}
      <Text style={[styles.sectionTitle, { marginTop: 18, marginBottom: 8 }]}>選擇標的</Text>
      <View style={styles.stockList}>
        {/* Overall market list row */}
        <Pressable
          style={[styles.stockListItem, isOverallSelected && styles.stockListItemActive]}
          onPress={() => onSelect("overall")}
        >
          <View>
            <Text style={[styles.stockListItemName, isOverallSelected && styles.stockListItemActiveText]}>總體市場指數</Text>
            <Text style={[styles.stockListItemCode, isOverallSelected && styles.stockListItemActiveText]}>INDEX · 全板塊平均</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.stockListItemPrice, isOverallSelected && styles.stockListItemActiveText]}>${indexCurrent.toFixed(2)}</Text>
            <Text style={[styles.stockListItemChange, isOverallSelected ? styles.stockListItemActiveText : (indexDirection === "up" ? styles.pnlUp : styles.pnlDown)]}>
              {indexDelta >= 0 ? "+" : ""}{indexDelta.toFixed(1)}%
            </Text>
          </View>
        </Pressable>

        {/* Individual stocks list rows */}
        {state.stocks.map((stock) => {
          const isSelected = stock.id === selectedId;
          const deltaPct = ((stock.price - stock.basePrice) / stock.basePrice) * 100;
          return (
            <Pressable
              key={stock.id}
              style={[styles.stockListItem, isSelected && styles.stockListItemActive]}
              onPress={() => onSelect(stock.id)}
            >
              <View>
                <Text style={[styles.stockListItemName, isSelected && styles.stockListItemActiveText]}>{stock.name}</Text>
                <Text style={[styles.stockListItemCode, isSelected && styles.stockListItemActiveText]}>
                  {stock.code} · {sectorLabel(stock.sector)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.stockListItemPrice, isSelected && styles.stockListItemActiveText]}>${stock.price.toFixed(2)}</Text>
                <Text style={[styles.stockListItemChange, isSelected ? styles.stockListItemActiveText : (deltaPct >= 0 ? styles.pnlUp : styles.pnlDown)]}>
                  {deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function PortfolioView({
  state,
  onSelect,
  onQuickSell
}: {
  state: GameState;
  onSelect: (id: string) => void;
  onQuickSell: (id: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>持股清單</Text>
      {state.holdings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="file-tray" size={24} color="#7b827e" />
          <Text style={styles.emptyText}>尚未持有股票</Text>
        </View>
      ) : (
        state.holdings.map((holding) => {
          const stock = state.stocks.find((item) => item.id === holding.stockId);
          if (!stock) return null;
          const value = holding.shares * stock.price;
          const pnl = ((stock.price - holding.averageCost) / holding.averageCost) * 100;
          return (
            <View key={holding.stockId} style={styles.holdingRow}>
              <Pressable style={{ flex: 1 }} onPress={() => onSelect(holding.stockId)}>
                <View>
                  <Text style={styles.holdingName}>{stock.name}</Text>
                  <Text style={styles.holdingMeta}>
                    {holding.shares} 股 · 均價 ${holding.averageCost.toFixed(2)}
                  </Text>
                </View>
              </Pressable>
              
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={styles.holdingValue}>
                  <Text style={styles.holdingCash}>${value.toFixed(0)}</Text>
                  <Text style={pnl >= 0 ? styles.pnlUp : styles.pnlDown}>{pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%</Text>
                </View>
                
                {/* Quick sell trigger button */}
                <Pressable 
                  style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, backgroundColor: "#963f33" }}
                  onPress={() => onQuickSell(holding.stockId)}
                >
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#fff" }}>賣出...</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function NewsView({ state }: { state: GameState }) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.eventPanel}>
        <Text style={styles.sectionTitle}>市場行情預知</Text>
        {state.upcomingSignal?.knownByForesight ? (
          <View style={styles.foresightPanel}>
            <Ionicons name="eye" size={21} color="#5a3612" />
            <View style={styles.foresightText}>
              <Text style={styles.eventTitle}>{state.upcomingSignal.title}</Text>
              <Text style={styles.eventBody}>{state.upcomingSignal.description}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.mutedText}>尚未預知下一個行情。使用代幣可提前看到一次市場訊號。</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>新聞時事</Text>
      {state.newsList.map((item) => (
        <View key={item.id} style={styles.newsRow}>
          <View style={styles.newsDot} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#8a4a64" }}>
                Day {item.day} · {item.time}
              </Text>
              {item.companyIds && item.companyIds.length > 0 && (
                <Text style={{ fontSize: 10, fontWeight: "900", color: "#1b5b55" }}>
                  涉及：{item.companyIds.map(cid => state.stocks.find(s => s.id === cid)?.code).join(", ")}
                </Text>
              )}
            </View>
            <Text style={styles.newsText}>{item.text}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "ink" | "mint" | "gold" }) {
  const toneStyle = tone === "ink" ? styles.inkMetric : tone === "mint" ? styles.mintMetric : styles.goldMetric;

  return (
    <View style={[styles.metric, toneStyle]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Gauge({ label, value, dangerAt, format }: { label: string; value: number; dangerAt: number; format: (value: number) => string }) {
  const ratio = Math.max(0, Math.min(1, value));
  const danger = value >= dangerAt;
  return (
    <View style={styles.gauge}>
      <View style={styles.gaugeTop}>
        <Text style={styles.gaugeLabel}>{label}</Text>
        <Text style={[styles.gaugeValue, danger && styles.dangerText]}>{format(value)}</Text>
      </View>
      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${ratio * 100}%` }, danger && styles.gaugeDanger]} />
      </View>
    </View>
  );
}

function Depth({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.depthItem}>
      <Text style={styles.depthLabel}>{label}</Text>
      <View style={styles.depthTrack}>
        <View style={[styles.depthFill, { width: `${Math.min(100, value)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function createEmptyTalentProfile(): TalentProfile {
  return { availablePoints: 0, lifetimePoints: 0, talentLevels: {} };
}

function normalizeGameState(state: GameState): GameState {
  const normState = withHighestEquity({
    ...state,
    initialAsset: state.initialAsset ?? baseInitialAsset,
    highestEquity: state.highestEquity ?? state.initialAsset ?? baseInitialAsset,
    endResult: state.endResult ?? null,
    newsList: state.newsList ?? [],
    marketHistory: state.marketHistory ?? [getMarketIndexPrice(state.stocks ?? [])],
    currentMinutes: state.currentMinutes ?? 0,
    isTrading: state.isTrading ?? false,
    isPaused: state.isPaused ?? true,
    gameSpeed: state.gameSpeed ?? 60,
    intradayNewsTimes: state.intradayNewsTimes ?? []
  });
  
  // Fill default histories
  normState.stocks = normState.stocks.map(s => ({
    ...s,
    history: s.history && s.history.length > 0 ? s.history : [s.price],
    volume: s.volume ?? 0
  }));

  return normState;
}

function getTalentLevel(profile: TalentProfile, talentId: string): number {
  return Number(profile.talentLevels[talentId]) || 0;
}

function getOpeningCashCost(level: number): number {
  let cost = 20;
  for (let index = 0; index < level; index += 1) cost = Math.ceil(cost * 1.15);
  return cost;
}

function getStartingCash(profile: TalentProfile): number {
  return baseInitialAsset + getTalentLevel(profile, openingCashTalentId) * 200;
}

function createSettlementResult(state: GameState): SettlementResult {
  const settledState = withHighestEquity(state);
  const finalEquity = totalEquity(settledState);
  return {
    initialAsset: settledState.initialAsset,
    highestEquity: settledState.highestEquity,
    finalEquity,
    talentPoints: calculateTalentPoints(finalEquity, settledState.highestEquity, settledState.initialAsset)
  };
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#f7f3ea"
  },
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
  menuTitle: {
    color: "#172321",
    fontSize: 64,
    lineHeight: 68,
    fontWeight: "900"
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
  menuActions: {
    flexDirection: "row",
    gap: 10
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
    backgroundColor: "#e6dfd1"
  },
  secondaryButtonText: {
    color: "#23302f",
    fontWeight: "900",
    fontSize: 15
  },
  disabledButton: {
    opacity: 0.55
  },
  talentCard: {
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e3dac9",
    gap: 14
  },
  talentCardText: {
    gap: 5
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
  settlementGrid: {
    gap: 8
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f3ea"
  },
  loadingText: {
    marginTop: 12,
    color: "#52615e",
    fontSize: 14
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: "#fffaf0",
    borderBottomWidth: 1,
    borderBottomColor: "#e3dac9"
  },
  headerLogo: {
    fontSize: 20,
    fontWeight: "900",
    color: "#172321",
    letterSpacing: 1
  },
  headerTabs: {
    flexDirection: "row",
    backgroundColor: "#e6dfd1",
    borderRadius: 6,
    padding: 3,
    gap: 4
  },
  headerTabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4
  },
  headerTabActive: {
    backgroundColor: "#23302f"
  },
  headerTabLabel: {
    fontSize: 13,
    color: "#52615e",
    fontWeight: "bold"
  },
  headerTabActiveLabel: {
    color: "#fff"
  },
  breakingNews: {
    backgroundColor: "#f7e6b5",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e3dac9",
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  breakingNewsText: {
    flex: 1,
    color: "#5a3612",
    fontSize: 12,
    fontWeight: "700"
  },
  kicker: {
    color: "#8a4a64",
    fontSize: 12,
    fontWeight: "700"
  },
  title: {
    color: "#172321",
    fontSize: 28,
    fontWeight: "800"
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e6dfd1"
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    marginTop: 12
  },
  metric: {
    flex: 1,
    borderRadius: 8,
    padding: 10
  },
  inkMetric: {
    backgroundColor: "#23302f"
  },
  mintMetric: {
    backgroundColor: "#1b5b55"
  },
  goldMetric: {
    backgroundColor: "#9f6a1b"
  },
  metricLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "700"
  },
  metricValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 3
  },
  economyBand: {
    marginHorizontal: 18,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#e3dac9",
    gap: 10
  },
  gauge: {
    width: "100%"
  },
  gaugeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5
  },
  gaugeLabel: {
    color: "#52615e",
    fontSize: 12,
    fontWeight: "700"
  },
  gaugeValue: {
    color: "#172321",
    fontSize: 12,
    fontWeight: "800"
  },
  dangerText: {
    color: "#963f33"
  },
  gaugeTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e6dfd1",
    overflow: "hidden"
  },
  gaugeFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1b5b55"
  },
  gaugeDanger: {
    backgroundColor: "#963f33"
  },
  toolbar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#172321",
    paddingHorizontal: 16
  },
  dayButton: {
    flex: 1
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15
  },
  tokenButton: {
    minHeight: 44,
    minWidth: 100,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#f1c96b"
  },
  tokenButtonText: {
    color: "#5a3612",
    fontWeight: "800",
    fontSize: 15
  },
  message: {
    color: "#52615e",
    fontSize: 13,
    paddingHorizontal: 18,
    paddingTop: 8,
    minHeight: 28
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 26
  },
  stockPanel: {
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#e3dac9"
  },
  stockPanelTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10
  },
  stockName: {
    color: "#172321",
    fontSize: 22,
    fontWeight: "900"
  },
  stockMeta: {
    color: "#52615e",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3
  },
  priceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  priceUp: {
    backgroundColor: "#d8efe2"
  },
  priceDown: {
    backgroundColor: "#f0d8d3"
  },
  priceBadgeText: {
    fontWeight: "900",
    fontSize: 12
  },
  priceUpText: {
    color: "#116647"
  },
  priceDownText: {
    color: "#963f33"
  },
  bigPrice: {
    color: "#172321",
    fontSize: 42,
    fontWeight: "900",
    marginTop: 8
  },
  description: {
    color: "#52615e",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2
  },
  depthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14
  },
  depthItem: {
    width: "47%"
  },
  depthLabel: {
    color: "#52615e",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 5
  },
  depthTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#e6dfd1"
  },
  depthFill: {
    height: 8,
    borderRadius: 4
  },
  tradePanel: {
    marginTop: 12
  },
  sectionTitle: {
    color: "#172321",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10
  },
  tradeRows: {
    gap: 8
  },
  tradeRow: {
    minHeight: 52,
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#e3dac9",
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  lotText: {
    flex: 1,
    color: "#172321",
    fontSize: 15,
    fontWeight: "900"
  },
  buyButton: {
    width: 76,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#116647",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  sellButton: {
    width: 76,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#963f33",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  tradeButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14
  },
  emptyState: {
    minHeight: 180,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#e3dac9",
    gap: 8
  },
  emptyText: {
    color: "#7b827e",
    fontWeight: "800"
  },
  holdingRow: {
    minHeight: 70,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#e3dac9",
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  holdingName: {
    color: "#172321",
    fontSize: 16,
    fontWeight: "900"
  },
  holdingMeta: {
    color: "#52615e",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700"
  },
  holdingValue: {
    alignItems: "flex-end"
  },
  holdingCash: {
    color: "#172321",
    fontSize: 16,
    fontWeight: "900"
  },
  pnlUp: {
    color: "#116647",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4
  },
  pnlDown: {
    color: "#963f33",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4
  },
  eventPanel: {
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#e3dac9"
  },
  foresightPanel: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f7e6b5"
  },
  foresightText: {
    flex: 1
  },
  eventTitle: {
    color: "#172321",
    fontSize: 15,
    fontWeight: "900"
  },
  eventBody: {
    color: "#5a3612",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  },
  mutedText: {
    color: "#52615e",
    fontSize: 14,
    lineHeight: 20
  },
  newsRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e3dac9"
  },
  newsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: "#8a4a64"
  },
  newsText: {
    flex: 1,
    color: "#23302f",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  },
  
  // Custom Styles
  stockList: {
    gap: 8
  },
  stockListItem: {
    minHeight: 56,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#e3dac9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  stockListItemActive: {
    backgroundColor: "#1b5b55",
    borderColor: "#1b5b55"
  },
  stockListItemName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#172321"
  },
  stockListItemCode: {
    fontSize: 11,
    color: "#52615e",
    fontWeight: "700",
    marginTop: 2
  },
  stockListItemPrice: {
    fontSize: 15,
    fontWeight: "900",
    color: "#172321"
  },
  stockListItemChange: {
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2
  },
  stockListItemActiveText: {
    color: "#ffffff"
  },
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    justifyContent: "flex-end"
  },
  menuBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)"
  },
  menuContainer: {
    backgroundColor: "#fffaf0",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#e3dac9"
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e3dac9"
  },
  menuHeaderTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#23302f"
  },
  menuContent: {
    paddingVertical: 14,
    gap: 16
  },
  menuSection: {
    gap: 8
  },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#8a4a64",
    textTransform: "uppercase"
  },
  jsonContainer: {
    backgroundColor: "#f7f3ea",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e3dac9"
  },
  actionSheetContainer: {
    backgroundColor: "#fffaf0",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e3dac9"
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#23302f"
  },
  actionSheetSubtitle: {
    fontSize: 13,
    color: "#52615e",
    marginTop: 4,
    fontWeight: "700"
  },
  actionSheetButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#e6dfd1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  actionSheetButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#23302f"
  }
});
