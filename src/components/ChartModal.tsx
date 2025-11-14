import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CrosshairMode } from 'lightweight-charts';
import { useStore } from '../store';
import { BinanceWebSocket, fetchKlineHistory } from '../services/binance';
import { KlineData, Timeframe } from '../types';

const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

export const ChartModal: React.FC = () => {
  const { selectedSymbol, timeframe, setTimeframe, setSelectedSymbol, isDarkMode } = useStore();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const wsRef = useRef<BinanceWebSocket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localTimeframe, setLocalTimeframe] = useState<Timeframe>(timeframe);
  const [drawingMode, setDrawingMode] = useState<'none' | 'horizontal' | 'vertical'>('none');
  const isInitializedRef = useRef(false);
  const priceLinesRef = useRef<Array<{ id: string; line: any }>>([]);
  const timeLinesRef = useRef<Array<{ id: string; line: any }>>([]);

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
      height: container.clientHeight || window.innerHeight - 200,
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
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: isDarkMode ? '#6b7280' : '#9ca3af',
          style: 0,
          labelVisible: false,
        },
        horzLine: {
          width: 1,
          color: isDarkMode ? '#6b7280' : '#9ca3af',
          style: 0,
          labelVisible: false,
        },
      },
      watermark: {
        visible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
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

    // Create separate price scale for volume at the bottom
    const volumePriceScaleId = 'volume';
    chart.priceScale(volumePriceScaleId).applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
      entireTextOnly: false,
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: volumePriceScaleId,
      priceLineVisible: false,
      lastValueVisible: false,
      autoscaleInfoProvider: () => null,
    });
    volumeSeriesRef.current = volumeSeries;

    isInitializedRef.current = true;

    // Add click handler for drawing
    const handleChartClick = (e: MouseEvent) => {
      if (drawingMode === 'none' || !chartRef.current || !candlestickSeriesRef.current) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (drawingMode === 'horizontal') {
        // Get price from Y coordinate
        const priceScale = chartRef.current.priceScale('right');
        if (priceScale) {
          const price = priceScale.coordinateToPrice(y);
          if (price !== null) {
            const priceLine = candlestickSeriesRef.current.createPriceLine({
              price: price,
              color: '#00d4aa',
              lineWidth: 2,
              lineStyle: 2,
              axisLabelVisible: true,
              title: price.toFixed(2),
            });
            priceLinesRef.current.push({
              id: `price-${Date.now()}`,
              line: priceLine,
            });
            setDrawingMode('none');
          }
        }
      } else if (drawingMode === 'vertical') {
        // Get time from X coordinate
        const time = chartRef.current.timeScale().coordinateToTime(x);
        if (time) {
          const timeLine = chart.createTimeLine({
            time: time,
            color: '#00d4aa',
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
          });
          timeLinesRef.current.push({
            id: `time-${Date.now()}`,
            line: timeLine,
          });
          setDrawingMode('none');
        }
      }
    };

    // Subscribe to click events
    container.addEventListener('click', handleChartClick);

    // Load historical data
    fetchKlineHistory(selectedSymbol, localTimeframe)
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

    ws.connectKline(selectedSymbol, localTimeframe, (kline: KlineData) => {
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
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('click', handleChartClick);
      isInitializedRef.current = false;
      
      // Cleanup drawing lines
      priceLinesRef.current.forEach(({ line }: { id: string; line: any }) => {
        if (candlestickSeriesRef.current) {
          candlestickSeriesRef.current.removePriceLine(line);
        }
      });
      priceLinesRef.current = [];
      
      timeLinesRef.current.forEach(({ line }: { id: string; line: any }) => {
        if (chartRef.current) {
          chartRef.current.removeTimeLine(line);
        }
      });
      timeLinesRef.current = [];
      
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
  }, [selectedSymbol, localTimeframe, isDarkMode, drawingMode]);

  // Sync local timeframe with store timeframe when modal opens
  useEffect(() => {
    if (selectedSymbol) {
      setLocalTimeframe(timeframe);
    }
  }, [selectedSymbol, timeframe]);

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: Timeframe) => {
    setLocalTimeframe(newTimeframe);
    setTimeframe(newTimeframe);
  };

  if (!selectedSymbol) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50"
      onClick={() => setSelectedSymbol(null)}
    >
      <div
        className="bg-bg-secondary w-full h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-bg-secondary border-b border-border-color px-6 py-4 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-text-primary">{selectedSymbol}</h2>
            <div className="flex items-center gap-1">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => handleTimeframeChange(tf)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    localTimeframe === tf
                      ? 'bg-green-up text-white'
                      : 'bg-bg-primary text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border-color">
              <span className="text-xs text-text-secondary">Drawing:</span>
              <button
                onClick={() => setDrawingMode(drawingMode === 'horizontal' ? 'none' : 'horizontal')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  drawingMode === 'horizontal'
                    ? 'bg-green-up text-white'
                    : 'bg-bg-primary text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                }`}
                title="Horizontal line"
              >
                ─
              </button>
              <button
                onClick={() => setDrawingMode(drawingMode === 'vertical' ? 'none' : 'vertical')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  drawingMode === 'vertical'
                    ? 'bg-green-up text-white'
                    : 'bg-bg-primary text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                }`}
                title="Vertical line"
              >
                │
              </button>
              {(priceLinesRef.current.length > 0 || timeLinesRef.current.length > 0) && (
                <button
                  onClick={() => {
                    priceLinesRef.current.forEach(({ line }: { id: string; line: any }) => {
                      if (candlestickSeriesRef.current) {
                        candlestickSeriesRef.current.removePriceLine(line);
                      }
                    });
                    priceLinesRef.current = [];
                    timeLinesRef.current.forEach(({ line }: { id: string; line: any }) => {
                      if (chartRef.current) {
                        chartRef.current.removeTimeLine(line);
                      }
                    });
                    timeLinesRef.current = [];
                  }}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-bg-primary text-text-secondary hover:text-text-primary hover:bg-hover-bg transition-colors"
                  title="Clear all lines"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setSelectedSymbol(null)}
            className="text-text-secondary hover:text-text-primary text-2xl"
          >
            ×
          </button>
        </div>
        <div className="flex-1 relative overflow-hidden">
          <div ref={chartContainerRef} className="w-full h-full" />
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

