import React from 'react';
import StockAnalyzer from './components/StockAnalyzer';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <StockAnalyzer />
      </div>
    </div>
  );
}

export default App;
