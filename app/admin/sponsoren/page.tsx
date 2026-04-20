import React from 'react';
import { PageShell, EmptyState } from '@/components/admin';
import { Megaphone } from 'lucide-react';

export default function SponsorenVerwaltung() {
  return (
    <PageShell
      title="Sponsoring & Serienanschreiben"
      description="Sponsorenkontakte, Serienanschreiben und Zusagen verwalten."
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Sponsoren' }]}
    >
      <EmptyState
        icon={Megaphone}
        title="Funktionen folgen in einer zukünftigen Version"
        description="Geplant sind u. a. PDF-Export für Serienanschreiben, Status-Tracking eingegangener Zusagen und Ansprechpartner-Verwaltung pro Sponsor."
      />
    </PageShell>
  );
}
