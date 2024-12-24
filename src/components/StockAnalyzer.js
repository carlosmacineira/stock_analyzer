import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react';
import _ from 'lodash';

const StockAnalyzer = () => {
  const [stockData, setStockData] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const ALPHA_VANTAGE_API_KEY = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY;
  const SYMBOL = 'RKLB';
  
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
    
    // Calculate RSI
    const calculateRSI = (prices, period = 14) => {
      const changes = prices.slice(1).map((price, i) => price - prices[i]);
      const gains = changes.map(change => change > 0 ? change : 0);
      const losses = changes.map(change => change < 0 ? -change : 0);
      
      const avgGain = _.mean(gains.slice(0, period));
      const avgLoss = _.mean(losses.slice(0, period));
      
      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
    };
    
    const prices = data.map(d => d.close);
    const rsi = calculateRSI(prices);
    const vwap = calculateVWAP();
    
    // Generate buy/sell signals
    const currentPrice = data[data.length - 1].close;
    const currentVol = data[data.length - 1].volume;
    const avgVolume = _.mean(data.map(d => d.volume));
    const sma20Current = sma20[sma20.length - 1];
    
    let signal = 'HOLD';
    let reasoning = [];
    let confidence = 0;
    
    // Price vs VWAP
    if (currentPrice > vwap) {
      confidence += 1;
      reasoning.push('Price is trading above VWAP');
    } else {
      confidence -= 1;
      reasoning.push('Price is trading below VWAP');
    }
    
    // Volume analysis
    if (currentVol > avgVolume * 1.5) {
      confidence += 1;
      reasoning.push('Unusually high volume detected');
    }
    
    // RSI analysis
    if (rsi > 70) {
      confidence -= 2;
      reasoning.push('RSI indicates overbought conditions');
    } else if (rsi < 30) {
      confidence += 2;
      reasoning.push('RSI indicates oversold conditions');
    }
    
    // Trend analysis
    if (currentPrice > sma20Current) {
      confidence += 1;
      reasoning.push('Price is above 20-period moving average');
    } else {
      confidence -= 1;
      reasoning.push('Price is below 20-period moving average');
    }
    
    // Final signal determination
    if (confidence >= 2) {
      signal = 'BUY';
    } else if (confidence <= -2) {
      signal = 'SELL';
    }
    
    return {
      signal,
      reasoning,
      indicators: {
        sma20: sma20Current,
        rsi,
        vwap,
        confidence
      },
      currentPrice
    };
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
      
      // Check for Alpha Vantage specific error messages
      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }
      
      if (data['Note']) {
        throw new Error('API call frequency exceeded. Please wait a minute before trying again.');
      }
      
      if (!data['Time Series (5min)']) {
        throw new Error('No data received. Please check if the market is open.');
      }
      
      // Transform the data
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
  
  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>RKLB Real-Time Analysis</CardTitle>
            <button 
              onClick={fetchStockData} 
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-md">
                {error}
              </div>
            )}
            
            {lastUpdate && (
              <div className="text-sm text-gray-500">
                Last updated: {lastUpdate}
              </div>
            )}
            
            {analysis && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className={`text-2xl font-bold ${
                    analysis.signal === 'BUY' ? 'text-green-600' :
                    analysis.signal === 'SELL' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {analysis.signal}
                  </div>
                  {analysis.signal === 'BUY' ? (
                    <TrendingUp className="text-green-600" />
                  ) : analysis.signal === 'SELL' ? (
                    <TrendingDown className="text-red-600" />
                  ) : (
                    <AlertCircle className="text-yellow-600" />
                  )}
                </div>
                
                <div className="text-xl font-semibold">
                  Current Price: ${analysis.currentPrice.toFixed(2)}
                </div>
                
                <div className="space-y-2">
                  <div className="font-semibold">Analysis Reasoning:</div>
                  {analysis.reasoning.map((reason, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      • {reason}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">20-period SMA</div>
                    <div className="text-lg font-semibold">
                      ${analysis.indicators.sma20?.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">RSI</div>
                    <div className="text-lg font-semibold">
                      {analysis.indicators.rsi?.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">VWAP</div>
                    <div className="text-lg font-semibold">
                      ${analysis.indicators.vwap?.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Signal Confidence</div>
                    <div className="text-lg font-semibold">
                      {analysis.indicators.confidence}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {stockData.length > 0 && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stockData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="close" stroke="#8884d8" name="Price" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockAnalyzer;
