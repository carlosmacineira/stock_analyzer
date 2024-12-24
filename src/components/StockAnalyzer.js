import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, Sun, Moon } from 'lucide-react';
import _ from 'lodash';

const StockAnalyzer = () => {
  const [stockData, setStockData] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const ALPHA_VANTAGE_API_KEY = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY || 'QDHAFX8WCKU8EM2W';
  const SYMBOL = 'RKLB';

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
      
      const formattedData = Object.entries(data['Time Series (5min)']).map(([timestamp, values]) => ({
        date: timestamp,
        close: parseFloat(values['4. close']),
        volume: parseFloat(values['5. volume']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        open: parseFloat(values['1. open'])
      })).reverse();
      
      setStockData(formattedData);
      const result = calculateIndicators(formattedData);
      setAnalysis(result);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Error fetching stock data. Please try again later.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchStockData();
    };
    
    fetchData();
    const interval = setInterval(fetchData, 300000); // Update every 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  const calculateIndicators = (data) => {
    if (!data || data.length === 0) return null;
    
    // Calculate VWAP (Volume Weighted Average Price)
    const calculateVWAP = () => {
      const sumPriceVolume = _.sumBy(data, d => d.close * d.volume);
      const sumVolume = _.sumBy(data, 'volume');
      return sumPriceVolume / sumVolume;
    };

    // Calculate 20-period Simple Moving Average (SMA)
    const sma20 = data.map((_, index, array) => {
      if (index < 19) return null;
      const slice = array.slice(index - 19, index + 1);
      return _.mean(slice.map(item => item.close));
    });
    
    // Rest of your indicator calculations...
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const price = payload[0].value;
      const prevPrice = stockData[payload[0].payload.index - 1]?.close;
      const isPositive = price > prevPrice;
      
      return (
        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border shadow-lg`}>
          <p className="text-sm">{label}</p>
          <p className={`text-lg font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            ${price.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Add indices to data for color calculation
  const processedData = stockData.map((item, index) => ({
    ...item,
    index,
  }));

  // Calculate stroke color based on price movement
  const getStrokeColor = (data, dataKey) => {
    return data.map((entry, index) => {
      if (index === 0) return "#8884d8";
      return entry[dataKey] > data[index - 1][dataKey] ? "#22c55e" : "#ef4444";
    });
  };

  return (
    <div className={`p-4 space-y-4 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
      <div className={`rounded-lg shadow-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">RKLB Real-Time Analysis</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
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
        
        {/* Rest of your component's JSX */}
        
        {stockData.length > 0 && (
          <div className="h-96 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  dataKey="date" 
                  stroke={isDarkMode ? '#9ca3af' : '#4b5563'}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  stroke={isDarkMode ? '#9ca3af' : '#4b5563'}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="close" 
                  stroke="#8884d8" 
                  name="Price"
                  strokeWidth={2}
                  dot={false}
                  stroke={(d) => {
                    if (!d || !d.index) return "#8884d8";
                    return d.close > processedData[d.index - 1].close ? "#22c55e" : "#ef4444";
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockAnalyzer;
