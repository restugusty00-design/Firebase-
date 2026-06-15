import React from 'react';
import { createRoot } from 'react-dom/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function SensorChart({ data }) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="time" stroke="#8b8b99" tick={{fill: '#8b8b99', fontSize: 12}} />
            <YAxis stroke="#8b8b99" tick={{fill: '#8b8b99', fontSize: 12}} />
            <Tooltip 
                contentStyle={{ backgroundColor: '#111116', borderColor: '#333', color: '#fff', borderRadius: '8px' }} 
                itemStyle={{ color: '#fff' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Line 
                type="monotone" 
                dataKey="temperature" 
                name="Suhu (°C)" 
                stroke="#ff2a2a" 
                strokeWidth={3} 
                dot={false}
                activeDot={{ r: 6, fill: '#ff2a2a' }}
                isAnimationActive={true}
                animationDuration={300}
            />
            <Line 
                type="monotone" 
                dataKey="humidity" 
                name="Kelembapan (%)" 
                stroke="#00e5ff" 
                strokeWidth={3} 
                dot={false} 
                activeDot={{ r: 6, fill: '#00e5ff' }}
                isAnimationActive={true}
                animationDuration={300}
            />
        </LineChart>
        </ResponsiveContainer>
    </div>
  );
}

let root = null;
let chartData = [];

export function updateChart(containerId, dataPoint) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!root) {
        root = createRoot(container);
    }
    
    if (dataPoint) {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        
        // Add new point
        chartData.push({
            time: timeStr,
            temperature: parseFloat(dataPoint.temperature) || 0,
            humidity: parseFloat(dataPoint.humidity) || 0
        });
        
        // Keep only last 15 points for better visibility
        if (chartData.length > 15) {
            chartData.shift();
        }
    }
    
    root.render(<SensorChart data={[...chartData]} />);
}
