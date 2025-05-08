"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data?.user) {
        router.replace("/login");
      } else {
        setUser(data.user);
      }
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Lade Dashboard...</div>;
  }
  if (!user) {
    return null;
  }

  // Dashboard-Inhalt hier:
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Willkommen im Admin-Dashboard!</h1>
      <p className="text-gray-600">Eingeloggt als: <span className="font-mono">{user.email}</span></p>
      {/* ...weitere Dashboard-Widgets... */}
    </div>
  );
}
