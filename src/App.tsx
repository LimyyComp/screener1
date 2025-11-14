import React, { useEffect } from 'react';
import { useStore } from './store';
import { Header } from './components/Header';
import { ScreenerTable } from './components/ScreenerTable';
import { ChartModal } from './components/ChartModal';
import { useBinanceWebSocket } from './hooks/useBinanceWebSocket';
import './App.css';

function App() {
  const isDarkMode = useStore((state) => state.isDarkMode);
  useBinanceWebSocket();

  useEffect(() => {
    // Apply theme to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <ScreenerTable />
      </main>
      <ChartModal />
    </div>
  );
}

export default App;

