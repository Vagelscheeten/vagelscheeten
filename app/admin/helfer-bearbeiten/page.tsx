'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AufgabenZuteilungView } from './AufgabenZuteilungView';
import { KinderZuteilungView } from './KinderZuteilungView';

function HelferBearbeitenPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Helfer-Zuteilungen bearbeiten</h1>

      <Tabs defaultValue="aufgaben" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="aufgaben">Nach Aufgaben</TabsTrigger>
          <TabsTrigger value="kinder">Nach Kindern</TabsTrigger>
        </TabsList>

        {/* Tab 1: Aufgaben-Ansicht */}
        <TabsContent value="aufgaben">
          <Card>
            <CardHeader>
              <CardTitle>Zuteilungen nach Aufgaben</CardTitle>
            </CardHeader>
            <CardContent>
              <AufgabenZuteilungView />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Kinder-Ansicht */}
        <TabsContent value="kinder">
          <Card>
            <CardHeader>
              <CardTitle>Zuteilungen nach Kindern</CardTitle>
            </CardHeader>
            <CardContent>
              <KinderZuteilungView />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

export default HelferBearbeitenPage;
