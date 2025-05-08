'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AnsprechpartnerListe } from './AnsprechpartnerListe';
import { AnsprechpartnerForm } from './AnsprechpartnerForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ansprechpartner } from '@/types/ansprechpartner';
import { toast } from 'react-hot-toast';

export default function KontakteVerwaltung() {
  const [isLoading, setIsLoading] = useState(true);
  const [ansprechpartner, setAnsprechpartner] = useState<Ansprechpartner[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedAnsprechpartner, setSelectedAnsprechpartner] = useState<Ansprechpartner | null>(null);
  const router = useRouter();
  
  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const supabase = createClient();
      
      try {
        const { data, error } = await supabase
          .from('ansprechpartner')
          .select('*')
          .order('bereich', { ascending: true })
          .order('name', { ascending: true });
          
        if (error) throw error;
        
        setAnsprechpartner(data || []);
      } catch (error) {
        console.error('Fehler beim Laden der Ansprechpartner:', error);
        toast.error('Fehler beim Laden der Ansprechpartner');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [refreshTrigger]);
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  const handleEdit = (ansprechpartner: Ansprechpartner) => {
    setSelectedAnsprechpartner(ansprechpartner);
  };
  
  const handleDelete = async (id: string) => {
    if (!window.confirm('Möchtest du diesen Ansprechpartner wirklich löschen?')) return;
    
    setIsLoading(true);
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('ansprechpartner')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('Ansprechpartner erfolgreich gelöscht');
      handleRefresh();
    } catch (error) {
      console.error('Fehler beim Löschen des Ansprechpartners:', error);
      toast.error('Fehler beim Löschen des Ansprechpartners');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    setSelectedAnsprechpartner(null);
  };
  
  const handleSuccess = () => {
    setSelectedAnsprechpartner(null);
    handleRefresh();
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/admin')}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <h1 className="text-2xl font-bold">Ansprechpartner verwalten</h1>
      </div>
      
      <Tabs defaultValue="liste" className="w-full">
        <TabsList>
          <TabsTrigger value="liste">Ansprechpartner</TabsTrigger>
          <TabsTrigger value="neu">Neuer Ansprechpartner</TabsTrigger>
        </TabsList>
        
        <TabsContent value="liste">
          <AnsprechpartnerListe 
            ansprechpartner={ansprechpartner}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>
        
        <TabsContent value="neu">
          <AnsprechpartnerForm 
            ansprechpartner={selectedAnsprechpartner}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
