import React from 'react';

interface HeatMapCell {
  id: string;
  value: number;
  label?: string;
  tooltip?: string;
}

interface HeatMapRow {
  id: string;
  label: string;
  cells: HeatMapCell[];
}

interface HeatMapProps {
  rows: HeatMapRow[];
  title?: string;
  minValue?: number;
  maxValue?: number;
  colorScale?: string[];
  showLegend?: boolean;
}

export function HeatMap({
  rows,
  title,
  minValue: propMinValue,
  maxValue: propMaxValue,
  colorScale = ['#f7fafc', '#90cdf4', '#3182ce', '#2c5282'],
  showLegend = true,
}: HeatMapProps) {
  // Berechne min und max Werte, falls nicht angegeben
  const allValues = rows.flatMap(row => row.cells.map(cell => cell.value));
  const minValue = propMinValue !== undefined ? propMinValue : Math.min(...allValues);
  const maxValue = propMaxValue !== undefined ? propMaxValue : Math.max(...allValues);
  const valueRange = maxValue - minValue;
  
  // Hilfsfunktion zum Berechnen der Farbe basierend auf dem Wert
  const getColorForValue = (value: number) => {
    if (valueRange === 0) return colorScale[0];
    
    const normalizedValue = (value - minValue) / valueRange;
    const colorIndex = Math.min(
      Math.floor(normalizedValue * (colorScale.length - 1)),
      colorScale.length - 2
    );
    
    const t = (normalizedValue * (colorScale.length - 1)) - colorIndex;
    
    // Einfache lineare Interpolation zwischen zwei Farben
    const startColor = hexToRgb(colorScale[colorIndex]);
    const endColor = hexToRgb(colorScale[colorIndex + 1]);
    
    if (!startColor || !endColor) return colorScale[colorIndex];
    
    const r = Math.round(startColor.r + t * (endColor.r - startColor.r));
    const g = Math.round(startColor.g + t * (endColor.g - startColor.g));
    const b = Math.round(startColor.b + t * (endColor.b - startColor.b));
    
    return `rgb(${r}, ${g}, ${b})`;
  };
  
  // Hilfsfunktion zum Umwandeln von Hex zu RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  return (
    <div className="w-full">
      {title && <h3 className="text-sm font-medium mb-3">{title}</h3>}
      
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              {rows[0]?.cells.map(cell => (
                <th 
                  key={cell.id} 
                  className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {cell.label || cell.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td className="py-2 px-3 text-sm font-medium">{row.label}</td>
                {row.cells.map(cell => (
                  <td 
                    key={cell.id} 
                    className="py-2 px-3 text-center"
                    title={cell.tooltip || `${row.label}: ${cell.value}`}
                  >
                    <div 
                      className="w-full h-8 rounded"
                      style={{ backgroundColor: getColorForValue(cell.value) }}
                    >
                      <div className="flex items-center justify-center h-full text-xs font-medium">
                        {cell.value}
                      </div>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showLegend && (
        <div className="mt-4 flex items-center justify-end">
          <div className="text-xs text-gray-500 mr-2">Legende:</div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: colorScale[0] }}></div>
            <span className="mx-1 text-xs">{minValue}</span>
            <div className="w-16 h-4 rounded" style={{ 
              background: `linear-gradient(to right, ${colorScale.join(', ')})` 
            }}></div>
            <span className="mx-1 text-xs">{maxValue}</span>
          </div>
        </div>
      )}
    </div>
  );
}
