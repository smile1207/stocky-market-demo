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
  View
} from "react-native";
import { advanceDay, buyStock, createInitialState, sectorLabel, sellStock, totalEquity, useForesight } from "./src/marketEngine";
import { loadGameState, resetGameState, saveGameState } from "./src/storage";
import { GameState, Stock } from "./src/types";

type Tab = "market" | "portfolio" | "news";

const tradeLots = [1, 5, 10];

export default function App() {
  const [state, setState] = useState<GameState>();
  const [selectedId, setSelectedId] = useState("grain-port");
  const [tab, setTab] = useState<Tab>("market");
  const [message, setMessage] = useState("開市準備中");

  useEffect(() => {
    loadGameState()
      .then((loaded) => {
        setState(loaded);
        setSelectedId(loaded.stocks[0]?.id ?? "grain-port");
        setMessage("市場資料已從本機 SQLite 載入");
      })
      .catch((error) => {
        setMessage("載入失敗，已建立新市場");
        console.warn(error);
        setState(createInitialState());
      });
  }, []);

  useEffect(() => {
    if (!state) return;
    saveGameState(state).catch((error) => console.warn("Failed to save game state", error));
  }, [state]);

  const selectedStock = useMemo(
    () => state?.stocks.find((stock) => stock.id === selectedId) ?? state?.stocks[0],
    [selectedId, state]
  );

  if (!state || !selectedStock) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color="#1b5b55" />
        <Text style={styles.loadingText}>讀取市場資料...</Text>
      </SafeAreaView>
    );
  }

  const applyTrade = (action: "buy" | "sell", shares: number) => {
    const result = action === "buy" ? buyStock(state, selectedStock.id, shares) : sellStock(state, selectedStock.id, shares);
    setState(result.state);
    setMessage(result.message);
  };

  const nextDay = () => {
    const next = advanceDay(state);
    setState(next);
    setMessage(`第 ${next.economy.day} 日開盤，市場已重新定價`);
  };

  const foresight = () => {
    const result = useForesight(state);
    setState(result.state);
    setMessage(result.message);
  };

  const reset = () => {
    Alert.alert("重置市場", "要重新開始這個市場 demo 嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "重置",
        style: "destructive",
        onPress: async () => {
          const fresh = await resetGameState();
          setState(fresh);
          setSelectedId(fresh.stocks[0].id);
          setMessage("市場已重置");
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>STOCKY 市場 Demo</Text>
          <Text style={styles.title}>市場</Text>
        </View>
        <Pressable accessibilityLabel="Reset market" style={styles.iconButton} onPress={reset}>
          <Ionicons name="refresh" size={20} color="#23302f" />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <Metric label="Day" value={`${state.economy.day}`} tone="ink" />
        <Metric label="Cash" value={`$${state.economy.cash.toFixed(0)}`} tone="mint" />
        <Metric label="Equity" value={`$${totalEquity(state).toFixed(0)}`} tone="gold" />
      </View>

      <View style={styles.economyBand}>
        <Gauge label="通膨" value={state.economy.inflation} dangerAt={0.08} format={(v) => `${(v * 100).toFixed(1)}%`} />
        <Gauge label="熱度" value={state.economy.marketHeat} dangerAt={0.75} format={(v) => `${(v * 100).toFixed(0)}%`} />
        <Gauge label="穩定基金" value={state.economy.stabilityFund / 320} dangerAt={0.15} format={() => `$${state.economy.stabilityFund.toFixed(0)}`} />
      </View>

      <View style={styles.toolbar}>
        <Pressable style={[styles.primaryButton, styles.dayButton]} onPress={nextDay}>
          <Ionicons name="play-forward" size={17} color="#fff" />
          <Text style={styles.primaryButtonText}>下一日</Text>
        </Pressable>
        <Pressable style={styles.tokenButton} onPress={foresight}>
          <Ionicons name="sparkles" size={17} color="#5a3612" />
          <Text style={styles.tokenButtonText}>預知 {state.economy.token}</Text>
        </Pressable>
      </View>

      <Text style={styles.message}>{message}</Text>

      <View style={styles.tabs}>
        <TabButton active={tab === "market"} icon="trending-up" label="市場" onPress={() => setTab("market")} />
        <TabButton active={tab === "portfolio"} icon="wallet" label="資產" onPress={() => setTab("portfolio")} />
        <TabButton active={tab === "news"} icon="newspaper" label="事件" onPress={() => setTab("news")} />
      </View>

      {tab === "market" && (
        <MarketView
          stocks={state.stocks}
          selectedStock={selectedStock}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onTrade={applyTrade}
        />
      )}
      {tab === "portfolio" && <PortfolioView state={state} onSelect={(id) => { setSelectedId(id); setTab("market"); }} />}
      {tab === "news" && <NewsView state={state} />}
    </SafeAreaView>
  );
}

function MarketView({
  stocks,
  selectedStock,
  selectedId,
  onSelect,
  onTrade
}: {
  stocks: Stock[];
  selectedStock: Stock;
  selectedId: string;
  onSelect: (id: string) => void;
  onTrade: (action: "buy" | "sell", shares: number) => void;
}) {
  const direction = selectedStock.price >= selectedStock.basePrice ? "up" : "down";
  const delta = ((selectedStock.price - selectedStock.basePrice) / selectedStock.basePrice) * 100;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stockRail}>
        {stocks.map((stock) => (
          <Pressable
            key={stock.id}
            style={[styles.stockChip, stock.id === selectedId && styles.stockChipActive]}
            onPress={() => onSelect(stock.id)}
          >
            <Text style={[styles.stockCode, stock.id === selectedId && styles.stockChipActiveText]}>{stock.code}</Text>
            <Text style={[styles.stockChipName, stock.id === selectedId && styles.stockChipActiveText]}>{stock.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.stockPanel}>
        <View style={styles.stockPanelTop}>
          <View>
            <Text style={styles.stockName}>{selectedStock.name}</Text>
            <Text style={styles.stockMeta}>
              {selectedStock.code} · {sectorLabel(selectedStock.sector)}
            </Text>
          </View>
          <View style={[styles.priceBadge, direction === "up" ? styles.priceUp : styles.priceDown]}>
            <Ionicons name={direction === "up" ? "arrow-up" : "arrow-down"} size={15} color={direction === "up" ? "#116647" : "#963f33"} />
            <Text style={[styles.priceBadgeText, direction === "up" ? styles.priceUpText : styles.priceDownText]}>
              {delta.toFixed(1)}%
            </Text>
          </View>
        </View>
        <Text style={styles.bigPrice}>${selectedStock.price.toFixed(2)}</Text>
        <Text style={styles.description}>{selectedStock.description}</Text>

        <View style={styles.depthGrid}>
          <Depth label="需求" value={selectedStock.demand} color="#1b5b55" />
          <Depth label="供給" value={selectedStock.supply} color="#9f6a1b" />
          <Depth label="穩定度" value={selectedStock.stability * 100} color="#47618c" />
          <Depth label="波動率" value={selectedStock.volatility * 1000} color="#8a4a64" />
        </View>
      </View>

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
    </ScrollView>
  );
}

function PortfolioView({ state, onSelect }: { state: GameState; onSelect: (id: string) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>持股</Text>
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
            <Pressable key={holding.stockId} style={styles.holdingRow} onPress={() => onSelect(holding.stockId)}>
              <View>
                <Text style={styles.holdingName}>{stock.name}</Text>
                <Text style={styles.holdingMeta}>
                  {holding.shares} 股 · 均價 ${holding.averageCost.toFixed(2)}
                </Text>
              </View>
              <View style={styles.holdingValue}>
                <Text style={styles.holdingCash}>${value.toFixed(0)}</Text>
                <Text style={pnl >= 0 ? styles.pnlUp : styles.pnlDown}>{pnl.toFixed(1)}%</Text>
              </View>
            </Pressable>
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
      {state.news.map((item, index) => (
        <View key={`${item}-${index}`} style={styles.newsRow}>
          <View style={styles.newsDot} />
          <Text style={styles.newsText}>{item}</Text>
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

function TabButton({ active, icon, label, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={active ? "#ffffff" : "#52615e"} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#f7f3ea"
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
    paddingBottom: 10
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
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e6dfd1"
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18
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
    backgroundColor: "#172321"
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
    minWidth: 112,
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
  tabs: {
    flexDirection: "row",
    marginHorizontal: 18,
    marginTop: 4,
    padding: 4,
    borderRadius: 8,
    backgroundColor: "#e6dfd1"
  },
  tabButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 6,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  tabButtonActive: {
    backgroundColor: "#23302f"
  },
  tabText: {
    color: "#52615e",
    fontWeight: "800",
    fontSize: 13
  },
  tabTextActive: {
    color: "#fff"
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 26
  },
  stockRail: {
    gap: 8,
    paddingBottom: 12
  },
  stockChip: {
    width: 112,
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#e3dac9"
  },
  stockChipActive: {
    backgroundColor: "#1b5b55",
    borderColor: "#1b5b55"
  },
  stockCode: {
    color: "#8a4a64",
    fontSize: 12,
    fontWeight: "900"
  },
  stockChipName: {
    color: "#172321",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3
  },
  stockChipActiveText: {
    color: "#fff"
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
  }
});
