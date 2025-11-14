import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { useStore } from '../store';
import { BinanceWebSocket, fetchKlineHistory } from '../services/binance';
import { KlineData } from '../types';

export const ChartModal: React.FC = () => {
  const { selectedSymbol, timeframe, setSelectedSymbol, isDarkMode } = useStore();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const wsRef = useRef<BinanceWebSocket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!selectedSymbol) {
      // Reset when no symbol selected
      isInitializedRef.current = false;
      setIsLoading(true);
      return;
    }

    // Wait for container to be rendered
    if (!chartContainerRef.current) {
      return;
    }

    // Cleanup previous chart and WebSocket
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }
    candlestickSeriesRef.current = null;
    volumeSeriesRef.current = null;
    isInitializedRef.current = false;
    setIsLoading(true);

    const container = chartContainerRef.current;
    if (!container) return;

    // Initialize chart
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 500,
      layout: {
        background: { color: 'transparent' },
        textColor: isDarkMode ? '#e5e7eb' : '#1f2937',
      },
      grid: {
        vertLines: { color: isDarkMode ? '#374151' : '#e5e7eb' },
        horzLines: { color: isDarkMode ? '#374151' : '#e5e7eb' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00d4aa',
      downColor: '#ff4976',
      borderVisible: false,
      wickUpColor: '#00d4aa',
      wickDownColor: '#ff4976',
    });
    candlestickSeriesRef.current = candlestickSeries;

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });
    volumeSeriesRef.current = volumeSeries;

    isInitializedRef.current = true;

    // Load historical data
    fetchKlineHistory(selectedSymbol, timeframe)
      .then((klines) => {
        if (!isInitializedRef.current || !candlestickSeriesRef.current || !volumeSeriesRef.current) {
          return;
        }

        if (klines.length === 0) {
          console.warn('No kline data received');
          setIsLoading(false);
          return;
        }

        const candlestickData: CandlestickData[] = klines.map((k) => ({
          time: k.time as Time,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
        }));

        const volumeData = klines.map((k) => ({
          time: k.time as Time,
          value: k.volume,
          color: k.close >= k.open ? '#00d4aa80' : '#ff497680',
        }));

        candlestickSeriesRef.current.setData(candlestickData);
        volumeSeriesRef.current.setData(volumeData);

        // Update sparkline data in store
        const prices = klines.map((k) => k.close);
        useStore.getState().updateTicker({
          symbol: selectedSymbol,
          sparkline: prices.slice(-60), // Last 60 points
        });

        setIsLoading(false);
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      })
      .catch((error) => {
        console.error('Error loading kline history:', error);
        setIsLoading(false);
      });

    // Connect to WebSocket for real-time updates
    const ws = new BinanceWebSocket();
    wsRef.current = ws;

    ws.connectKline(selectedSymbol, timeframe, (kline: KlineData) => {
      if (!isInitializedRef.current || !candlestickSeriesRef.current || !volumeSeriesRef.current) {
        return;
      }

      try {
        candlestickSeriesRef.current.update({
          time: kline.time as Time,
          open: kline.open,
          high: kline.high,
          low: kline.low,
          close: kline.close,
        });

        volumeSeriesRef.current.update({
          time: kline.time as Time,
          value: kline.volume,
          color: kline.close >= kline.open ? '#00d4aa80' : '#ff497680',
        });
      } catch (error) {
        console.error('Error updating chart:', error);
      }
    });

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      isInitializedRef.current = false;
      
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [selectedSymbol, timeframe, isDarkMode]);

  if (!selectedSymbol) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => setSelectedSymbol(null)}
    >
      <div
        className="bg-bg-secondary rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-bg-secondary border-b border-border-color px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-text-primary">{selectedSymbol}</h2>
          <button
            onClick={() => setSelectedSymbol(null)}
            className="text-text-secondary hover:text-text-primary text-2xl"
          >
            ×
          </button>
        </div>
        <div className="p-6 relative">
          <div ref={chartContainerRef} className="w-full" style={{ height: '500px' }} />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary bg-opacity-75">
              <div className="text-text-secondary">Loading chart data...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

