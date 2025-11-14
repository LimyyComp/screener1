import { create } from 'zustand';
import { AppState, TickerData, Timeframe, SortField, SortDirection } from '../types';

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  timeframe: '1m',
  sortField: 'volume',
  sortDirection: 'desc',
  searchQuery: '',
  isDarkMode: true,
  tickers: new Map(),
  selectedSymbol: null,
  futuresSymbols: new Set<string>(),

  // Actions
  setTimeframe: (timeframe: Timeframe) => set({ timeframe }),
  setSortField: (field: SortField) => set({ sortField: field }),
  setSortDirection: (direction: SortDirection) => set({ sortDirection: direction }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  
  setFuturesSymbols: (symbols: string[]) => set({ futuresSymbols: new Set(symbols) }),
  
  updateTicker: (tickerUpdate) => {
    const { symbol, ...updates } = tickerUpdate;
    const state = get();
    
    // Only update if it's a futures symbol
    if (!state.futuresSymbols.has(symbol) && state.futuresSymbols.size > 0) {
      return;
    }
    
    set((currentState) => {
      const newTickers = new Map(currentState.tickers);
      const existing = newTickers.get(symbol);
      
      // Only update if data actually changed to prevent unnecessary re-renders
      if (existing) {
        const hasChanges = Object.keys(updates).some((key) => {
          const updateKey = key as keyof typeof updates;
          const existingKey = key as keyof TickerData;
          return existing[existingKey] !== updates[updateKey];
        });
        
        if (!hasChanges) {
          return currentState; // No changes, return same state
        }
      }
      
      const updated = {
        ...(existing || {
          symbol,
          price: 0,
          priceChange: 0,
          priceChangePercent: 0,
          volume: 0,
          quoteVolume: 0,
          sparkline: [],
          lastUpdate: Date.now(),
        }),
        ...updates,
        symbol,
        lastUpdate: Date.now(),
      };
      
      newTickers.set(symbol, updated);
      
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

