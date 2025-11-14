import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { BinanceWebSocket, fetchInitialTickers, fetchFuturesSymbols } from '../services/binance';

export const useBinanceWebSocket = () => {
  const { updateTicker, setFuturesSymbols } = useStore();
  const wsRef = useRef<BinanceWebSocket | null>(null);
  const priceHistoryRef = useRef<Map<string, number[]>>(new Map());

  useEffect(() => {
    // Fetch futures symbols list first
    fetchFuturesSymbols().then((symbols) => {
      setFuturesSymbols(symbols);
      
      // Fetch initial data
      fetchInitialTickers().then((initialTickers) => {
        initialTickers.forEach((ticker) => {
          // Only process futures symbols
          if (!symbols.includes(ticker.symbol)) return;
          
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
    });

    // Connect to WebSocket
    const ws = new BinanceWebSocket();
    wsRef.current = ws;

    ws.connectMiniTicker((tickerUpdate) => {
      // Update price history for sparkline
      if (tickerUpdate.price !== undefined) {
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
      } else {
        updateTicker(tickerUpdate);
      }
    });

    return () => {
      ws.disconnect();
      wsRef.current = null;
      priceHistoryRef.current.clear();
    };
  }, [updateTicker, setFuturesSymbols]);
};

