import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from 'recharts';

export default function StockChart({ historical, predicted, symbol }) {
  if (!historical || historical.length === 0) {
    return (
      <div className="empty-state">
        <p>No chart data available</p>
      </div>
    );
  }

  // Combine historical and predicted arrays for a continuous Recharts dataset
  const chartData = [];
  
  // Add historical points
  historical.forEach(pt => {
    chartData.push({
      time: pt.time,
      actual: pt.value,
      prediction: null
    });
  });

  // Add predicted points, ensuring they connect seamlessly
  predicted.forEach((pt, index) => {
    if (index === 0) {
      // Connect the lines: the last historical point also gets the prediction value
      if (chartData.length > 0) {
        chartData[chartData.length - 1].prediction = pt.value;
      }
    } else {
      chartData.push({
        time: pt.time,
        actual: null,
        prediction: pt.value
      });
    }
  });

  // Custom tooltip renderer
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPrediction = data.actual === null || (payload.length === 1 && payload[0].name === 'prediction');
      const timeVal = data.time;
      const priceVal = isPrediction ? data.prediction : data.actual;
      
      return (
        <div className="custom-tooltip">
          <p className="tooltip-time">{timeVal}</p>
          <div className="tooltip-val-row">
            <span 
              className="badge" 
              style={{ 
                padding: '0.15rem 0.4rem', 
                fontSize: '0.65rem',
                background: isPrediction ? 'rgba(236, 72, 153, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                color: isPrediction ? 'var(--color-secondary)' : 'var(--color-primary-hover)',
                borderColor: isPrediction ? 'rgba(236, 72, 153, 0.3)' : 'rgba(139, 92, 246, 0.3)'
              }}
            >
              {isPrediction ? 'PREDICTION' : 'ACTUAL'}
            </span>
            <span style={{ color: 'var(--color-text-primary)' }}>
              ${priceVal?.toFixed(2)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Determine tick interval for X axis to prevent text overlap
  const tickFormatter = (timeStr) => {
    if (!timeStr) return '';
    // Format to shorter time or date for axis labels
    const parts = timeStr.split(' ');
    if (parts.length > 1) {
      // Return HH:MM or similar, or Date
      return parts[1].substring(0, 5);
    }
    // Return MM-DD if just a date
    const dateParts = timeStr.split('-');
    if (dateParts.length === 3) {
      return `${dateParts[1]}/${dateParts[2]}`;
    }
    return timeStr;
  };

  // Sample ticks: show roughly 6 to 8 ticks on the X axis
  const getInterval = () => {
    return Math.max(1, Math.floor(chartData.length / 7));
  };

  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            {/* Gradients for actual and predicted fill */}
            <linearGradient id="actualGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25}/>
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0}/>
            </linearGradient>
            <linearGradient id="predictGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.25}/>
              <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0.0}/>
            </linearGradient>
          </defs>

          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(255, 255, 255, 0.03)" 
            vertical={false} 
          />

          <XAxis 
            dataKey="time" 
            stroke="var(--color-text-muted)"
            fontSize={11}
            tickLine={false}
            dy={10}
            tickFormatter={tickFormatter}
            interval={getInterval()}
          />

          <YAxis 
            stroke="var(--color-text-muted)"
            fontSize={11}
            tickLine={false}
            domain={['auto', 'auto']}
            dx={-5}
            tickFormatter={(val) => `$${val.toFixed(1)}`}
          />

          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}
          />

          {/* Actual Line/Area */}
          <Area
            name="Actual History"
            type="monotone"
            dataKey="actual"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#actualGlow)"
            activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--color-primary-hover)' }}
            connectNulls={false}
          />

          {/* Prediction Line/Area */}
          <Area
            name="LSTM Forecast"
            type="monotone"
            dataKey="prediction"
            stroke="var(--color-secondary)"
            strokeWidth={2}
            strokeDasharray="4 4"
            fillOpacity={1}
            fill="url(#predictGlow)"
            activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--color-secondary)' }}
            connectNulls={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
