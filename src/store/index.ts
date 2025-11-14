import { create } from 'zustand';
import { AppState, TickerData, MarketType, Timeframe, SortField, SortDirection } from '../types';

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  marketType: 'spot',
  timeframe: '1m',
  sortField: 'volume',
  sortDirection: 'desc',
  searchQuery: '',
  isDarkMode: true,
  tickers: new Map(),
  selectedSymbol: null,

  // Actions
  setMarketType: (type: MarketType) => set({ marketType: type }),
  setTimeframe: (timeframe: Timeframe) => set({ timeframe }),
  setSortField: (field: SortField) => set({ sortField: field }),
  setSortDirection: (direction: SortDirection) => set({ sortDirection: direction }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  
  updateTicker: (tickerUpdate) => {
    const { symbol, ...updates } = tickerUpdate;
    set((state) => {
      const newTickers = new Map(state.tickers);
      const existing = newTickers.get(symbol) || {
        symbol,
        price: 0,
        priceChange: 0,
        priceChangePercent: 0,
        volume: 0,
        quoteVolume: 0,
        sparkline: [],
        lastUpdate: Date.now(),
      };
      
      newTickers.set(symbol, {
        ...existing,
        ...updates,
        symbol,
        lastUpdate: Date.now(),
      });
      
      return { tickers: newTickers };
    });
  },
  
  setSelectedSymbol: (symbol: string | null) => set({ selectedSymbol: symbol }),
  
  getFilteredAndSortedTickers: () => {
    const state = get();
    let tickers = Array.from(state.tickers.values());
    
    // Filter by search query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      tickers = tickers.filter((t) => t.symbol.toLowerCase().includes(query));
    }
    
    // Sort
    tickers.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      
      switch (state.sortField) {
        case 'volume':
          aVal = a.volume;
          bVal = b.volume;
          break;
        case 'priceChange':
          aVal = a.priceChangePercent;
          bVal = b.priceChangePercent;
          break;
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        default:
          return 0;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return state.sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return state.sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    
    return tickers;
  },
}));

