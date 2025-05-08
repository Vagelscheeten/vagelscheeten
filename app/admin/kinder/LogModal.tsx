"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface LogEntry {
  id: string;
  kind_id: string;
  event_id?: string;
  action: string;
  altwerte: any;
  neuwert: any;
  user_email?: string;
  created_at?: string;
}

export default function LogModal({ kindId, open, onClose }: { kindId: string; open: boolean; onClose: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("kinder_log")
      .select("*")
      .eq("kind_id", kindId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setLogs(data || []);
        setLoading(false);
      });
  }, [kindId, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="bg-white rounded shadow-lg p-6 min-w-[400px] max-h-[80vh] overflow-y-auto relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>&#10005;</button>
        <h3 className="text-lg font-semibold mb-4">Änderungsprotokoll</h3>
        {loading ? (
          <div className="text-gray-500">Lade Log ...</div>
        ) : logs.length === 0 ? (
          <div className="text-gray-400">Keine Änderungen für dieses Kind.</div>
        ) : (
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr>
                <th className="p-1">Zeit</th>
                <th className="p-1">Aktion</th>
                <th className="p-1">User</th>
                <th className="p-1">Altwert</th>
                <th className="p-1">Neuwert</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="p-1 whitespace-nowrap">{log.created_at ? new Date(log.created_at).toLocaleString() : "-"}</td>
                  <td className="p-1">{log.action}</td>
                  <td className="p-1">{log.user_email || "-"}</td>
                  <td className="p-1 max-w-[120px] truncate" title={JSON.stringify(log.altwerte)}>
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(log.altwerte, null, 2)}</pre>
                  </td>
                  <td className="p-1 max-w-[120px] truncate" title={JSON.stringify(log.neuwert)}>
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(log.neuwert, null, 2)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
