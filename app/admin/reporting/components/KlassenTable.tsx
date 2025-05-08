import React from 'react';

interface KlassenTableProps {
  klassenMap: Map<string, number>;
}

export function KlassenTable({ klassenMap }: KlassenTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Klasse</th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Anzahl Kinder</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from(klassenMap.entries())
            .filter(([klasse]) => klasse)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([klasse, anzahl]) => (
              <tr key={klasse}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Klasse {klasse}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">{anzahl}</td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}
