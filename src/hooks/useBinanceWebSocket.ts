import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { BinanceWebSocket, fetchInitialTickers } from '../services/binance';

export const useBinanceWebSocket = () => {
  const { marketType, updateTicker } = useStore();
  const wsRef = useRef<BinanceWebSocket | null>(null);
  const priceHistoryRef = useRef<Map<string, number[]>>(new Map());

  useEffect(() => {
    // Fetch initial data
    fetchInitialTickers(marketType).then((initialTickers) => {
      initialTickers.forEach((ticker) => {
        // Initialize price history for sparklines
        const history = priceHistoryRef.current.get(ticker.symbol) || [];
        history.push(ticker.price);
        // Keep only last 60 points
        if (history.length > 60) {
          history.shift();
        }
        priceHistoryRef.current.set(ticker.symbol, history);
        
        updateTicker({
          ...ticker,
          sparkline: history,
        });
      });
    });

    // Connect to WebSocket
    const ws = new BinanceWebSocket();
    wsRef.current = ws;

    ws.connectMiniTicker((tickerUpdate) => {
      // Update price history for sparkline
      const history = priceHistoryRef.current.get(tickerUpdate.symbol) || [];
      history.push(tickerUpdate.price);
      // Keep only last 60 points
      if (history.length > 60) {
        history.shift();
      }
      priceHistoryRef.current.set(tickerUpdate.symbol, history);

      updateTicker({
        ...tickerUpdate,
        sparkline: [...history],
      });
    }, marketType);

    return () => {
      ws.disconnect();
      wsRef.current = null;
      priceHistoryRef.current.clear();
    };
  }, [marketType, updateTicker]);
};

