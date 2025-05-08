'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResetSystem } from './ResetSystem';

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Systemeinstellungen</h1>
      
      <Tabs defaultValue="reset" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="reset">Systemreset</TabsTrigger>
          {/* Hier können weitere Tabs hinzugefügt werden */}
        </TabsList>
        
        <TabsContent value="reset">
          <ResetSystem />
        </TabsContent>
        
        {/* Weitere TabsContent-Komponenten für zukünftige Einstellungen */}
      </Tabs>
    </div>
  );
}
