# Obsidian Quant AI – Pro Master Edition (V2.1)

An institutional dark market-analysis terminal and quantitative intelligence platform built with React, Vite, TypeScript, Tailwind CSS, TradingView Lightweight Charts, and Google Gemini AI.

---

## Architecture & Workspaces

1. **⚡ Binary Quant Engine**
   - High-frequency and intraday timeframes (1m, 5m, 15m).
   - Real-time candle countdown timer with UTC and local synchronization.
   - Interactive TradingView candlestick charts with integrated SMA-20 and EMA-20 indicator overlays.
   - Stake selector presets ($10, $25, $50, $100, $250) and custom inputs.
   - Verified payout rate calculations (e.g. 85%) and instant net profit / return metrics.
   - Paper `[CALL / UP]` and `[PUT / DOWN]` execution with automated timer settlement.

2. **📈 Professional Forex AI Suite**
   - Spot Forex pricing with real Bid, Ask, and Spread tracking.
   - Institutional timeframes (15m, 1h, 4h, 1d).
   - Dynamic Risk-to-Reward (R:R) ratio and lot-sizing calculator.
   - Precise Stop Loss (SL) and Take Profit (TP) parameter inputs.
   - Paper `[BUY / LONG]` and `[SELL / SHORT]` order execution with live position P&L tracking and manual close controls.

3. **🧠 AI Quantitative Signal Brain ("GET SIGNAL")**
   - Multi-confluence quantitative analysis combining RSI-14, SMA-20, EMA-20, MACD, ATR-14, Bollinger Bands, Support/Resistance, and Market Structure.
   - Direct server-side integration with **Google AI Studio Gemini API** using the `@google/genai` TypeScript SDK.
   - Supports **High Thinking Mode** (`gemini-4-argon` with `ThinkingLevel.HIGH`) for complex quantitative synthesis and `gemini-3.8-flash` for high-throughput analysis.
   - Multi-provider AI router with support for OpenRouter, Groq, and fallback to an offline quantitative algorithm.
   - Transparent output displaying: Direction (BUY/CALL, SELL/PUT, WAIT), Status (STRONG, CONDITIONAL, WAIT), Model-reported confidence percentage, Entry Price, SL/TP (Forex) or Expiry (Binary), multi-factor reasoning, invalidation conditions, and risk advisories.

4. **📊 Backtest Quant Engine**
   - Historical strategy backtester with **zero look-ahead bias** and walk-forward candle validation.
   - Strategies: RSI Reversal, EMA 9/21 Crossover, MACD Divergence, Bollinger Mean Reversion.
   - Quantitative performance metrics: Win Rate %, Net P/L, Profit Factor, Max Drawdown %, Sharpe Ratio, Expectancy.
   - Interactive Equity Curve progression chart.
   - Complete trade-by-trade audit table with instant **CSV Export**.

5. **🌐 Market Intel & Sentiment**
   - Real-time Currency Relative Strength Matrix (0 - 10) across major fiat currencies.
   - High-impact Economic Calendar with scheduled release times, impact levels, and actual vs. forecast data.
   - Provider-backed macroeconomic financial news with sentiment indicators and external source links.

6. **🔑 Provider & API Manager**
   - Live data feed management (Twelve Data, Finnhub, Alpha Vantage, Binance/Coinbase public streams).
   - Active round-trip latency ping measurement.
   - Server-Side Request Forgery (SSRF) protection blocking private IP and cloud metadata ranges.
   - Dynamic server switching and fallback routing.

---

## Local Setup & Quickstart

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Windows (Command Prompt / PowerShell) or macOS / Linux
```bash
# 1. Install dependencies
npm install

# 2. Run unit tests
npm test

# 3. Start development server
npm run dev

# 4. Build for production (outputs to /dist)
npm run build
```

---

## License & Attribution
- Built with **TradingView Lightweight Charts™** (Apache 2.0 License).
- Market analysis is for educational and advisory testing only; real-money broker execution is disabled by default.
