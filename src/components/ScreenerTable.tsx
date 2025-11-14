import React from 'react';
import { useStore } from '../store';
import { TickerRow } from './TickerRow';

export const ScreenerTable: React.FC = () => {
  const tickerSymbols = useStore((state) => {
    const tickers = state.getFilteredAndSortedTickers();
    return tickers.map((t) => t.symbol);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-color">
            <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Symbol</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Price</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">24h Change</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">24h Volume</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-text-secondary">Chart</th>
          </tr>
        </thead>
        <tbody>
          {tickerSymbols.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-8 text-text-secondary">
                No data available
              </td>
            </tr>
          ) : (
            tickerSymbols.map((symbol) => (
              <TickerRow key={symbol} symbol={symbol} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

