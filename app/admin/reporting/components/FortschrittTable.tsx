import React from 'react';
import { ProgressBar } from './ProgressBar';

interface FortschrittTableProps {
  fortschrittProKlasse: {
    label: string;
    value: number;
    maxValue: number;
  }[];
}

export function FortschrittTable({ fortschrittProKlasse }: FortschrittTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Klasse</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Fortschritt</th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Spiele</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {fortschrittProKlasse
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((item, index) => {
              const abgeschlosseneSpiele = Math.round((item.value / 100) * item.maxValue);
              return (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.label}</td>
                  <td className="px-6 py-4">
                    <div className="w-full">
                      <ProgressBar 
                        value={item.value} 
                        max={100} 
                        color="primary" 
                        size="sm"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    <span className="font-semibold">{abgeschlosseneSpiele}</span>
                    <span className="text-gray-500"> / {item.maxValue}</span>
                    <span className="ml-2 text-xs text-gray-500">({item.value}%)</span>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
