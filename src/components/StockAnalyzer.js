{!error && !stockData.length && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <RefreshCw className="h-12 w-12 text-blue-500 animate-spin mb-4 mx-auto" />
                <p className="text-gray-400">Loading market data...</p>
              </div>
            </div>
          )}import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, Sun, Moon } from 'lucide-react';
import _ from 'lodash';

const StockAnalyzer = () => {
  const [stockData, setStockData] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const ALPHA_VANTAGE_API_KEY = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY || 'QDHAFX8WCKU8EM2W';
  const SYMBOL = 'RKLB';

  const calculateAveragePrice = (data) => {
    return _.mean(data.map(d => d.close));
  };

  const fetchStockData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${SYMBOL}&interval=5min&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const data = await response.json();
      
      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }
      
      if (data['Note']) {
        throw new Error('API call frequency exceeded. Please wait a minute before trying again.');
      }
      
      if (!data['Time Series (5min)']) {
        throw new Error('No data received. Please check if the market is open.');
      }
      
      const formattedData = Object.entries(data['Time Series (5min)']).map(([timestamp, values]) => {
        const date = new Date(timestamp);
        const formattedTime = date.toLocaleString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        return {
          date: formattedTime,
          close: parseFloat(values['4. close']),
          volume: parseFloat(values['5. volume']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          open: parseFloat(values['1. open'])
        };
      }).reverse();
      
      setStockData(formattedData);
      const result = calculateIndicators(formattedData);
      setAnalysis(result);
      setLastUpdate(new Date().toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }));
    } catch (err) {
      setError(err.message || 'Error fetching stock data. Please try again later.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
    const interval = setInterval(fetchStockData, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const calculateIndicators = (data) => {
    if (!data || data.length === 0) return null;
    
    // ... rest of your indicator calculations
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const price = payload[0].value;
      const avgPrice = calculateAveragePrice(stockData);
      const isAboveAverage = price > avgPrice;
      
      return (
        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} border shadow-lg`}>
          <p className="text-sm">{label}</p>
          <p className={`text-lg font-bold ${isAboveAverage ? 'text-green-500' : 'text-red-500'}`}>
            ${price.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate the average price for color comparison
  const avgPrice = calculateAveragePrice(stockData);

  const chartData = stockData.map(item => ({
    ...item,
    isAboveAverage: item.close > avgPrice
  }));

  return (
    <div className="min-h-screen w-full bg-[#1a1b1e]">
      <div className="p-4 container mx-auto">
        <div className={`rounded-lg shadow-lg p-6 bg-[#1a1b1e] text-white relative z-10`}>
          <div className="flex justify-between items-center mb-6">
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>RKLB Real-Time Analysis</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
              >
                {isDarkMode ? <Sun className="h-5 w-5 text-white" /> : <Moon className="h-5 w-5" />}
              </button>
              <button 
                onClick={fetchStockData} 
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
          
          {error && (
            <div className="p-6 bg-red-900/20 border border-red-500/20 text-red-400 rounded-md mb-4">
              <div className="flex flex-col space-y-2">
                <p>{error}</p>
                <p className="text-sm">Market Hours (Eastern Time):</p>
                <ul className="text-sm list-disc pl-5">
                  <li>Monday - Friday: 9:30 AM - 4:00 PM ET</li>
                  <li>Weekends: Closed</li>
                </ul>
                <p className="text-sm mt-2">
                  Current Time: {new Date().toLocaleString('en-US', {
                    timeZone: 'America/New_York',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    weekday: 'long',
                    timeZoneName: 'short'
                  })}
                </p>
              </div>
            </div>
          )}
          
          {lastUpdate && (
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Last updated: {lastUpdate}
            </div>
          )}

          {stockData.length > 0 && (
            <div className="h-96 mt-6 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stockData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af' }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af' }}
                    domain={['dataMin - 1', 'dataMax + 1']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: '#9ca3af' }}/>
                  <Line 
                    type="monotone" 
                    dataKey="close" 
                    name="Price" 
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockAnalyzer;
