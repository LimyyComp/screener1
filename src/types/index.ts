export type MarketType = 'spot' | 'futures';
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
export type SortField = 'volume' | 'priceChange' | 'price' | 'symbol';
export type SortDirection = 'asc' | 'desc';

export interface TickerData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  sparkline: number[];
  lastUpdate: number;
}

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AppState {
  // Market settings
  marketType: MarketType;
  timeframe: Timeframe;
  sortField: SortField;
  sortDirection: SortDirection;
  searchQuery: string;
  isDarkMode: boolean;
  
  // Data
  tickers: Map<string, TickerData>;
  selectedSymbol: string | null;
  
  // Actions
  setMarketType: (type: MarketType) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  setSortField: (field: SortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  setSearchQuery: (query: string) => void;
  toggleDarkMode: () => void;
  updateTicker: (ticker: Partial<TickerData> & { symbol: string }) => void;
  setSelectedSymbol: (symbol: string | null) => void;
  getFilteredAndSortedTickers: () => TickerData[];
}

