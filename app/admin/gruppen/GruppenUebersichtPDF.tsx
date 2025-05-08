import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { Spielgruppe, Kind } from '@/lib/types';

// Typen für die Gruppen-PDF
interface GruppenPDFProps {
  klassenName: string;
  spielgruppen: Spielgruppe[];
  kinderByGruppe: Record<string, Kind[]>;
  eventName: string;
}

// Styles für das PDF-Dokument
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 15,
  },
  eventInfo: {
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  gruppeHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    padding: 8,
    backgroundColor: '#f0f0f0',
    marginBottom: 5,
    borderRadius: 3,
  },
  kinderTable: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 10,
  },
  kindContainer: {
    width: '33%',
    padding: 5,
  },
  kindName: {
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    fontSize: 10,
    color: '#666',
  },
});

// PDF-Dokument-Komponente
export const GruppenUebersichtPDF = ({ klassenName, spielgruppen, kinderByGruppe, eventName }: GruppenPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Gruppenübersicht {klassenName}</Text>
        <Text style={styles.subtitle}>Alle Kinder und ihre Gruppen</Text>
      </View>
      
      <View style={styles.eventInfo}>
        <Text>Veranstaltung: {eventName}</Text>
      </View>
      
      {spielgruppen.map((gruppe) => (
        <View key={gruppe.id} style={styles.section}>
          <Text style={styles.gruppeHeader}>
            Gruppe: {gruppe.name} {gruppe.leiter_zugangscode ? `(Code: ${gruppe.leiter_zugangscode})` : ''}
          </Text>
          
          <View style={styles.kinderTable}>
            {(kinderByGruppe[gruppe.id] || []).map((kind) => (
              <View key={kind.id} style={styles.kindContainer}>
                <Text style={styles.kindName}>
                  {kind.nachname}, {kind.vorname} ({kind.geschlecht === 'Junge' ? 'J' : 'M'})
                </Text>
              </View>
            ))}
            
            {(kinderByGruppe[gruppe.id] || []).length === 0 && (
              <View style={styles.kindContainer}>
                <Text style={styles.kindName}>Keine Kinder in dieser Gruppe</Text>
              </View>
            )}
          </View>
        </View>
      ))}
      
      <Text style={styles.footer}>
        Erstellt am {new Date().toLocaleDateString('de-DE')} für {eventName}
      </Text>
      
      <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
        `${pageNumber} / ${totalPages}`
      )} />
    </Page>
  </Document>
);
