import React, { memo } from 'react';
import { useStore } from '../store';
import { Sparkline } from './Sparkline';

interface TickerRowProps {
  symbol: string;
}

const TickerRowComponent: React.FC<TickerRowProps> = ({ symbol }) => {
  const ticker = useStore((state) => state.tickers.get(symbol));
  const setSelectedSymbol = useStore((state) => state.setSelectedSymbol);

  if (!ticker) return null;

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

  const changeColor = ticker.priceChangePercent >= 0 ? 'text-green-up' : 'text-red-down';
  const sparklineColor = ticker.priceChangePercent >= 0 ? '#00d4aa' : '#ff4976';
  const priceColor = ticker.priceChangePercent >= 0 ? 'text-green-up' : 'text-red-down';

  return (
    <tr
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
};

export const TickerRow = memo(TickerRowComponent, (prevProps, nextProps) => {
  // Custom comparison: only re-render if symbol changes
  return prevProps.symbol === nextProps.symbol;
});

