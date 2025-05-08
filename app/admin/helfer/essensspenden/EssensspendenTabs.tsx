'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpendenView } from './SpendenView';
import { SpendenNachBedarfView } from './SpendenNachBedarfView';
import { SpendenNachKindView } from './SpendenNachKindView';
import { SpendenMatrixView } from './SpendenMatrixView';

interface EssensspendenTabsProps {
  showHeader?: boolean;
}

export function EssensspendenTabs({ showHeader = false }: EssensspendenTabsProps) {
  const [activeTab, setActiveTab] = useState('verwaltung');

  return (
    <>
      {showHeader && (
        <h1 className="text-2xl font-bold mb-6">Essensspenden-Verwaltung</h1>
      )}
      <Tabs 
        defaultValue="verwaltung" 
        className="w-full" 
        onValueChange={setActiveTab}
        value={activeTab}
      >
      <TabsList className="grid grid-cols-4 mb-8">
        <TabsTrigger value="verwaltung">Essensspenden</TabsTrigger>
        <TabsTrigger value="nach-bedarf">Nach Bedarf</TabsTrigger>
        <TabsTrigger value="nach-kind">Nach Kind</TabsTrigger>
        <TabsTrigger value="matrix">Spenden-Matrix</TabsTrigger>
      </TabsList>
      
      <TabsContent value="verwaltung" className="space-y-4">
        <SpendenView />
      </TabsContent>
      
      <TabsContent value="nach-bedarf" className="space-y-4">
        <SpendenNachBedarfView />
      </TabsContent>
      
      <TabsContent value="nach-kind" className="space-y-4">
        <SpendenNachKindView />
      </TabsContent>
      
      <TabsContent value="matrix" className="space-y-4">
        <SpendenMatrixView />
      </TabsContent>
    </Tabs>
    </>
  );
}
