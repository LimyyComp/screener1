import { TickerData, KlineData, MarketType, Timeframe } from '../types';

const BINANCE_SPOT_WS = 'wss://stream.binance.com:9443/ws/';
const BINANCE_FUTURES_WS = 'wss://fstream.binance.com/ws/';

const timeframeMap: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
};

export class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private onTickerUpdate: ((ticker: Partial<TickerData> & { symbol: string }) => void) | null = null;
  private onKlineUpdate: ((kline: KlineData) => void) | null = null;
  private marketType: MarketType = 'spot';
  private symbol: string | null = null;
  private timeframe: Timeframe = '1m';

  connectMiniTicker(onUpdate: (ticker: Partial<TickerData> & { symbol: string }) => void, marketType: MarketType) {
    this.onTickerUpdate = onUpdate;
    this.marketType = marketType;
    this.disconnect();
    
    const stream = marketType === 'spot' 
      ? `${BINANCE_SPOT_WS}!miniTicker@arr`
      : `${BINANCE_FUTURES_WS}!miniTicker@arr`;
    
    this.connect(stream, (data) => {
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          const symbol = item.s;
          const price = parseFloat(item.c);
          const priceChange = parseFloat(item.p);
          const priceChangePercent = parseFloat(item.P);
          const volume = parseFloat(item.v);
          const quoteVolume = parseFloat(item.q);
          
          onUpdate({
            symbol,
            price,
            priceChange,
            priceChangePercent,
            volume,
            quoteVolume,
          });
        });
      }
    });
  }

  connectKline(
    symbol: string,
    timeframe: Timeframe,
    onUpdate: (kline: KlineData) => void,
    marketType: MarketType = 'spot'
  ) {
    this.onKlineUpdate = onUpdate;
    this.symbol = symbol.toLowerCase();
    this.timeframe = timeframe;
    this.marketType = marketType;
    this.disconnect();
    
    const stream = marketType === 'spot'
      ? `${BINANCE_SPOT_WS}${this.symbol}@kline_${timeframeMap[timeframe]}`
      : `${BINANCE_FUTURES_WS}${this.symbol}@kline_${timeframeMap[timeframe]}`;
    
    this.connect(stream, (data) => {
      if (data.k) {
        const k = data.k;
        onUpdate({
          time: k.t / 1000, // Convert to seconds
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
        });
      }
    });
  }

  private connect(stream: string, onMessage: (data: any) => void) {
    try {
      this.ws = new WebSocket(stream);
      
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      this.ws.onclose = () => {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            this.reconnect(stream, onMessage);
          }, this.reconnectDelay * this.reconnectAttempts);
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }

  private reconnect(stream: string, onMessage: (data: any) => void) {
    this.connect(stream, onMessage);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// REST API functions
export async function fetchInitialTickers(marketType: MarketType): Promise<TickerData[]> {
  const baseUrl = marketType === 'spot'
    ? 'https://api.binance.com/api/v3'
    : 'https://fapi.binance.com/fapi/v1';
  
  try {
    const response = await fetch(`${baseUrl}/ticker/24hr`);
    const data = await response.json();
    
    return data.map((item: any) => ({
      symbol: item.symbol,
      price: parseFloat(item.lastPrice || item.c),
      priceChange: parseFloat(item.priceChange || item.p),
      priceChangePercent: parseFloat(item.priceChangePercent || item.P),
      volume: parseFloat(item.volume || item.v),
      quoteVolume: parseFloat(item.quoteVolume || item.q),
      sparkline: [],
      lastUpdate: Date.now(),
    }));
  } catch (error) {
    console.error('Error fetching initial tickers:', error);
    return [];
  }
}

export async function fetchKlineHistory(
  symbol: string,
  timeframe: Timeframe,
  marketType: MarketType,
  limit: number = 500
): Promise<KlineData[]> {
  const baseUrl = marketType === 'spot'
    ? 'https://api.binance.com/api/v3'
    : 'https://fapi.binance.com/fapi/v1';
  
  try {
    const response = await fetch(
      `${baseUrl}/klines?symbol=${symbol.toUpperCase()}&interval=${timeframeMap[timeframe]}&limit=${limit}`
    );
    const data = await response.json();
    
    return data.map((k: any[]) => ({
      time: k[0] / 1000, // Convert to seconds
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (error) {
    console.error('Error fetching kline history:', error);
    return [];
  }
}

