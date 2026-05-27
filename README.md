# STOCKY Market Demo

React Native (Expo) + TypeScript + SQLite single-player demo for the STOCKY market slice.

## Demo Scope

- 負責人：盧北
- 手機單機市場 loop
- 定價買賣系統：玩家可用固定手數買賣股票，成交會立即影響供給、需求和價格
- 經濟穩定與防通膨機制：每日結算時通膨、熱度、穩定基金共同影響價格
- 市場行情訊號：先用市場內建訊號測試不同產業、通膨和市場熱度的變化
- 代幣預知：花費代幣提前看到下一個市場行情
- SQLite：遊戲狀態儲存在本機 `game_state` 表

## First Numbers

- 起始現金：1200
- 起始代幣：2
- 交易費：買入 0.6%，賣出 0.6%
- 每 5 個市場日獲得 1 枚代幣
- 穩定基金每日補入 8，市場過熱或通膨過高時會自動支出，壓低通膨和熱度
- 產業：民生、能源、科技、物流、奢侈

## Run

```bash
npm install
npm run start
```

Then open the Expo app on a phone or emulator.
