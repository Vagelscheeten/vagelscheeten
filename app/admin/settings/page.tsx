'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResetSystem } from './ResetSystem';
import { PageShell } from '@/components/admin';

export default function SettingsPage() {
  return (
    <PageShell
      title="Systemeinstellungen"
      description="Administrative Wartung und Systemzustand."
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Einstellungen' }]}
    >
      <Tabs defaultValue="reset" className="w-full">
        <TabsList className="mb-5">
          <TabsTrigger value="reset">Systemreset</TabsTrigger>
        </TabsList>

        <TabsContent value="reset">
          <ResetSystem />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
