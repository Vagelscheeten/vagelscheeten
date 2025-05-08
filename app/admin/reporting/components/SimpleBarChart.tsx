import React from 'react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: DataPoint[];
  height?: number;
  maxValue?: number;
  showValues?: boolean;
  showLabels?: boolean;
  title?: string;
  formatValue?: (value: number) => string;
}

export function SimpleBarChart({
  data,
  height = 200,
  maxValue: propMaxValue,
  showValues = true,
  showLabels = true,
  title,
  formatValue = (value) => value.toString()
}: SimpleBarChartProps) {
  // Berechne den maximalen Wert für die Skalierung
  const maxValue = propMaxValue || Math.max(...data.map(d => d.value), 1);
  
  // Standardfarben, falls keine angegeben wurden
  const defaultColors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
    'bg-red-500', 'bg-orange-500', 'bg-teal-500'
  ];

  // Berechne den Skalierungsfaktor für die Balkenhöhe
  // Wir wollen etwa 80% der verfügbaren Höhe nutzen für den größten Balken
  const scaleFactor = (height * 0.7) / maxValue;

  return (
    <div className="w-full h-full px-1">
      {title && <h3 className="text-sm font-medium mb-2">{title}</h3>}
      <div className="flex items-end gap-2" style={{ height: `${height}px` }}>
        {data.length === 0 ? (
          <div className="flex justify-center items-center w-full h-full text-gray-500">
            Keine Daten verfügbar
          </div>
        ) : (
          <>
            {data.map((item, index) => {
              // Berechne die Balkenhöhe - mindestens 15px für sichtbare Balken
              const barPixelHeight = item.value === 0 
                ? 15 
                : Math.max(15, item.value * scaleFactor);
                
              const barColor = item.color || defaultColors[index % defaultColors.length];
              
              return (
                <div 
                  key={item.label} 
                  className="flex flex-col items-center flex-1"
                >
                  {showValues && (
                    <span className="text-sm font-medium mb-1">
                      {formatValue(item.value)}
                    </span>
                  )}
                  
                  <div className="w-full flex flex-col items-center justify-end" 
                       style={{ height: `${height * 0.75}px` }}>
                    <div 
                      className={`w-full ${barColor} rounded-t-md`}
                      style={{ 
                        height: `${barPixelHeight}px`,
                      }}
                      title={`${item.label}: ${formatValue(item.value)}`}
                    />
                  </div>
                  
                  {showLabels && (
                    <div className="w-full text-center mt-2 text-sm truncate">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
