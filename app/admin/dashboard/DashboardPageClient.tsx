"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageShell } from "@/components/admin";

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
    return (
      <PageShell title="Dashboard">
        <div className="text-admin-ink-muted text-sm">Lade Dashboard …</div>
      </PageShell>
    );
  }
  if (!user) {
    return null;
  }

  return (
    <PageShell
      title="Willkommen im Admin-Dashboard"
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Dashboard' }]}
    >
      <div className="rounded-lg border border-admin-border bg-admin-surface p-5">
        <p className="text-admin-ink-soft text-[0.92rem]" style={{ marginBottom: 0 }}>
          Eingeloggt als{' '}
          <span
            className="font-mono text-admin-ink"
            style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
          >
            {user.email}
          </span>
        </p>
      </div>
    </PageShell>
  );
}
