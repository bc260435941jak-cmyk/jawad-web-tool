export interface EconomicEvent {
  id: string;
  time: string;
  currency: string;
  country: string;
  title: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actual: string;
  forecast: string;
  previous: string;
  source: string;
}

export interface MarketNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  relatedSymbols: string[];
}

export interface CurrencyStrength {
  currency: string;
  strength: number; // 0 to 10
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  change24h: number;
}

export class MarketIntelService {
  public getEconomicCalendar(): EconomicEvent[] {
    return [
      {
        id: 'ec-1',
        time: '13:30 UTC',
        currency: 'USD',
        country: 'United States',
        title: 'Core CPI (YoY)',
        impact: 'HIGH',
        actual: '2.8%',
        forecast: '2.9%',
        previous: '3.0%',
        source: 'Bureau of Labor Statistics',
      },
      {
        id: 'ec-2',
        time: '14:00 UTC',
        currency: 'EUR',
        country: 'Eurozone',
        title: 'ECB Monetary Policy Statement',
        impact: 'HIGH',
        actual: '3.25%',
        forecast: '3.25%',
        previous: '3.50%',
        source: 'European Central Bank',
      },
      {
        id: 'ec-3',
        time: '09:30 UTC',
        currency: 'GBP',
        country: 'United Kingdom',
        title: 'Manufacturing PMI',
        impact: 'MEDIUM',
        actual: '51.4',
        forecast: '50.8',
        previous: '49.9',
        source: 'S&P Global / CIPS',
      },
      {
        id: 'ec-4',
        time: '04:30 UTC',
        currency: 'JPY',
        country: 'Japan',
        title: 'Bank of Japan Policy Rate',
        impact: 'HIGH',
        actual: '0.25%',
        forecast: '0.25%',
        previous: '0.25%',
        source: 'Bank of Japan',
      },
      {
        id: 'ec-5',
        time: '15:00 UTC',
        currency: 'USD',
        country: 'United States',
        title: 'Federal Funds Rate Decision',
        impact: 'HIGH',
        actual: '4.75%',
        forecast: '4.75%',
        previous: '5.00%',
        source: 'Federal Reserve FOMC',
      },
    ];
  }

  public getCurrencyStrength(): CurrencyStrength[] {
    return [
      { currency: 'USD', strength: 7.8, sentiment: 'BULLISH', change24h: 0.35 },
      { currency: 'EUR', strength: 5.6, sentiment: 'NEUTRAL', change24h: -0.12 },
      { currency: 'GBP', strength: 6.4, sentiment: 'BULLISH', change24h: 0.22 },
      { currency: 'JPY', strength: 3.2, sentiment: 'BEARISH', change24h: -0.68 },
      { currency: 'AUD', strength: 5.9, sentiment: 'NEUTRAL', change24h: 0.15 },
      { currency: 'CAD', strength: 5.1, sentiment: 'NEUTRAL', change24h: -0.05 },
      { currency: 'CHF', strength: 6.8, sentiment: 'BULLISH', change24h: 0.28 },
      { currency: 'NZD', strength: 4.8, sentiment: 'BEARISH', change24h: -0.32 },
    ];
  }

  public getFinancialNews(): MarketNewsItem[] {
    return [
      {
        id: 'news-1',
        title: 'Federal Reserve Signals Measured Policy Path Amid Moderating Inflation',
        summary: 'Fed officials emphasized data-dependence as recent inflation readings indicate steady disinflation toward the 2.0% annual target, sustaining USD strength.',
        source: 'Financial Times / Bloomberg',
        url: 'https://www.bloomberg.com/markets',
        publishedAt: '25m ago',
        sentiment: 'BULLISH',
        relatedSymbols: ['EUR/USD', 'GBP/USD', 'USD/JPY'],
      },
      {
        id: 'news-2',
        title: 'European Central Bank Holds Rates Steady While Monitoring Regional Growth',
        summary: 'Governing Council maintains deposit facility rate, highlighting resilience in services while manufacturing indices show signs of early bottoming.',
        source: 'Reuters Macroeconomic',
        url: 'https://www.reuters.com/markets',
        publishedAt: '1h ago',
        sentiment: 'NEUTRAL',
        relatedSymbols: ['EUR/USD', 'EUR/GBP'],
      },
      {
        id: 'news-3',
        title: 'Gold Tests Key Technical Resistance as Central Bank Reserves Increase',
        summary: 'Spot Gold holds above $2,680/oz supported by institutional demand and sovereign reserve diversification strategies across global central banks.',
        source: 'World Gold Council / MarketWatch',
        url: 'https://www.marketwatch.com/investing/future/gold',
        publishedAt: '2h ago',
        sentiment: 'BULLISH',
        relatedSymbols: ['XAU/USD'],
      },
      {
        id: 'news-4',
        title: 'Bitcoin Consolidates Near Highs as Institutional ETF Inflows Rebound',
        summary: 'Digital asset markets reflect consistent institutional accumulation with implied volatility compressing ahead of quarterly derivatives settlement.',
        source: 'CoinDesk / The Block',
        url: 'https://www.coindesk.com',
        publishedAt: '3h ago',
        sentiment: 'BULLISH',
        relatedSymbols: ['BTC/USD', 'ETH/USD'],
      },
    ];
  }
}

export const marketIntelService = new MarketIntelService();
