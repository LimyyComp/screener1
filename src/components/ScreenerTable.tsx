import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { TickerData } from '../types';
import { Sparkline } from './Sparkline';

export const ScreenerTable: React.FC = () => {
  const { getFilteredAndSortedTickers, setSelectedSymbol } = useStore();
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [priceChanges, setPriceChanges] = useState<Map<string, 'up' | 'down' | null>>(new Map());

  useEffect(() => {
    const updateTickers = () => {
      const filtered = getFilteredAndSortedTickers();
      setTickers((prev) => {
        // Track price changes for animation
        const newPriceChanges = new Map<string, 'up' | 'down' | null>();
        filtered.forEach((ticker) => {
          const prevTicker = prev.find((p) => p.symbol === ticker.symbol);
          if (prevTicker && prevTicker.price !== ticker.price) {
            newPriceChanges.set(ticker.symbol, ticker.price > prevTicker.price ? 'up' : 'down');
          }
        });
        setPriceChanges(newPriceChanges);
        return filtered;
      });
    };

    updateTickers();
    const interval = setInterval(updateTickers, 100);
    return () => clearInterval(interval);
  }, [getFilteredAndSortedTickers]);

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
    return num.toFixed(decimals);
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.01) return price.toFixed(6);
    return price.toFixed(8);
  };

  const getPriceColor = (ticker: TickerData, symbol: string): string => {
    const change = priceChanges.get(symbol);
    if (change === 'up') return 'text-green-up';
    if (change === 'down') return 'text-red-down';
    return ticker.priceChangePercent >= 0 ? 'text-green-up' : 'text-red-down';
  };

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
          {tickers.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-8 text-text-secondary">
                No data available
              </td>
            </tr>
          ) : (
            tickers.map((ticker) => {
              const priceColor = getPriceColor(ticker, ticker.symbol);
              const changeColor = ticker.priceChangePercent >= 0 ? 'text-green-up' : 'text-red-down';
              const sparklineColor = ticker.priceChangePercent >= 0 ? '#00d4aa' : '#ff4976';

              return (
                <tr
                  key={ticker.symbol}
                  onClick={() => setSelectedSymbol(ticker.symbol)}
                  className="border-b border-border-color hover:bg-hover-bg cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 text-sm font-medium text-text-primary">
                    {ticker.symbol}
                  </td>
                  <td className={`py-3 px-4 text-sm font-medium text-right ${priceColor} transition-colors`}>
                    {formatPrice(ticker.price)}
                  </td>
                  <td className={`py-3 px-4 text-sm font-medium text-right ${changeColor}`}>
                    {ticker.priceChangePercent >= 0 ? '+' : ''}
                    {ticker.priceChangePercent.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-text-secondary">
                    {formatNumber(ticker.volume)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center">
                      <Sparkline
                        data={ticker.sparkline.length > 0 ? ticker.sparkline : [ticker.price]}
                        width={100}
                        height={30}
                        color={sparklineColor}
                      />
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

