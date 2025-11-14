import React from 'react';
import { useStore } from '../store';
import { MarketType, Timeframe, SortField } from '../types';

const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
const sortFields: { value: SortField; label: string }[] = [
  { value: 'volume', label: 'Volume' },
  { value: 'priceChange', label: '24h Change' },
  { value: 'price', label: 'Price' },
  { value: 'symbol', label: 'Symbol' },
];

export const Header: React.FC = () => {
  const {
    marketType,
    timeframe,
    sortField,
    sortDirection,
    searchQuery,
    isDarkMode,
    setMarketType,
    setTimeframe,
    setSortField,
    setSortDirection,
    setSearchQuery,
    toggleDarkMode,
  } = useStore();

  return (
    <header className="bg-bg-secondary border-b border-border-color sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Market Type Toggle */}
          <div className="flex items-center gap-2 bg-bg-primary rounded-lg p-1">
            <button
              onClick={() => setMarketType('spot')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                marketType === 'spot'
                  ? 'bg-green-up text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Spot
            </button>
            <button
              onClick={() => setMarketType('futures')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                marketType === 'futures'
                  ? 'bg-green-up text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Futures
            </button>
          </div>

          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-green-up text-white'
                    : 'bg-bg-primary text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-bg-primary border border-border-color rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-green-up"
            >
              {sortFields.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="bg-bg-primary border border-border-color rounded-md px-3 py-1.5 text-sm text-text-primary hover:bg-hover-bg transition-colors"
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-primary border border-border-color rounded-md px-3 py-1.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-green-up"
            />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="bg-bg-primary border border-border-color rounded-md px-3 py-1.5 text-sm text-text-primary hover:bg-hover-bg transition-colors"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
};

