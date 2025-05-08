'use client';

// @ts-ignore
// Wir ignorieren TypeScript-Fehler für react-pdf, da es Probleme mit der Typisierung geben kann

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Kind, Zuteilung, Ansprechpartner, SpendenRueckmeldung } from './types';

interface ZuteilungPDFDocumentProps {
  kind: Kind;
  zuteilungen: Zuteilung[];
  ansprechpartner: Ansprechpartner[];
  essensspenden: SpendenRueckmeldung[];
}

// Styles für das PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '1px solid #ddd',
    paddingBottom: 10,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    objectFit: 'contain',
  },
  headerText: {
    flex: 1,
    marginLeft: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    margin: 10,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 1.5,
  },
  taskItem: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  taskTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  slotTime: {
    fontSize: 12,
    color: '#444',
    marginLeft: 10,
    marginBottom: 3,
  },
  taskDescription: {
    fontSize: 12,
    marginBottom: 5,
  },
  contactSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  contactItem: {
    fontSize: 12,
    marginBottom: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    borderTop: '1px solid #ddd',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 10,
    color: '#666',
  },
});

export function ZuteilungPDFDocument({ kind, zuteilungen, ansprechpartner, essensspenden }: ZuteilungPDFDocumentProps) {
  // Debug-Log für die Zuteilungen in der PDF-Komponente
  console.log('DEBUG PDF: Zuteilungen in ZuteilungPDFDocument:', JSON.stringify(zuteilungen, null, 2));
  
  // Gruppiere Ansprechpartner nach Bereich
  const ansprechpartnerByBereich = ansprechpartner.reduce<Record<string, Ansprechpartner[]>>((acc, person) => {
    if (!acc[person.bereich]) {
      acc[person.bereich] = [];
    }
    acc[person.bereich].push(person);
    return acc;
  }, {});

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header mit Logo */}
        <View style={styles.header}>
          <Image 
            src="/2025_Logo.png" 
            style={styles.logo} 
          />
          <View style={styles.headerText}>
            <Text style={styles.title}>Melsdörper Vagelscheeten 2025</Text>
            <Text style={styles.subtitle}>
              {kind.vorname} {kind.nachname} {kind.klasse ? `(${kind.klasse})` : ''}
            </Text>
          </View>
        </View>

        {/* Dankes-Absatz */}
        <View style={styles.section}>
          <Text style={styles.paragraph}>
            Liebe Eltern von {kind.vorname},
          </Text>
          <Text style={styles.paragraph}>
            vielen Dank für Eure Unterstützung beim Vogelschießen 2025! Nur durch unsere gemeinsamen Anstrengungen ist unser Fest überhaupt zu realisieren.
          </Text>
          <Text style={styles.paragraph}>
            Hier findet ihr eine Übersicht eurer Aufgaben:
          </Text>
        </View>

        {/* Aufgaben-Liste */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Helferaufgaben:</Text>
          
          {zuteilungen.map((zuteilung) => (
            <View key={zuteilung.id} style={styles.taskItem}>
              <Text style={styles.taskTitle}>
                {zuteilung.helferaufgaben.titel}
                {zuteilung.via_springer ? ' (als Springer)' : ''}
              </Text>
              
              {/* Debug-Ausgabe entfernt */}
              
              {/* Wenn keine Slots vorhanden sind, zeige das allgemeine Zeitfenster an */}
              {(!zuteilung.slots || !Array.isArray(zuteilung.slots) || zuteilung.slots.length === 0) && zuteilung.helferaufgaben.zeitfenster && (
                <Text style={styles.taskTime}>
                  Zeitfenster: {zuteilung.helferaufgaben.zeitfenster}
                </Text>
              )}
              
              {/* Wenn Slots vorhanden sind, zeige diese an */}
              {zuteilung.slots && Array.isArray(zuteilung.slots) && zuteilung.slots.length > 0 && (
                <View>
                  {zuteilung.slots.map((slotZuteilung, index) => {
                    console.log('Slot-Zuteilung in PDF:', slotZuteilung);
                    
                    // Sicherheitsprüfung für slot-Objekt
                    if (!slotZuteilung.slot || typeof slotZuteilung.slot !== 'object') {
                      return (
                        <Text key={`slot-error-${index}`} style={styles.slotTime}>
                          Fehler: Slot-Daten nicht verfügbar
                        </Text>
                      );
                    }
                    
                    // Formatiere die Zeiten (HH:MM statt HH:MM:SS)
                    let startzeit = 'Unbekannt';
                    let endzeit = 'Unbekannt';
                    
                    try {
                      startzeit = slotZuteilung.slot.startzeit.substring(0, 5);
                      endzeit = slotZuteilung.slot.endzeit.substring(0, 5);
                    } catch (e) {
                      console.error('Fehler beim Formatieren der Zeiten:', e);
                    }
                    
                    return (
                      <Text key={`slot-${index}-${slotZuteilung.slot_id || 'unknown'}`} style={styles.slotTime}>
                        {slotZuteilung.slot.beschreibung ? `${slotZuteilung.slot.beschreibung} – ` : ''}
                        Zeitfenster: {startzeit}–{endzeit} Uhr
                      </Text>
                    );
                  })}
                </View>
              )}
              
              {zuteilung.helferaufgaben.beschreibung && (
                <Text style={styles.taskDescription}>
                  {zuteilung.helferaufgaben.beschreibung}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Essensspenden Sektion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Essensspenden:</Text>
          
          {essensspenden && essensspenden.length > 0 ? (
            <>
              {essensspenden.map((spende) => (
                <View key={spende.id} style={styles.taskItem}>
                  <Text style={styles.taskTitle}>
                    {spende.spende?.titel || 'Unbekannte Spende'}
                  </Text>
                  
                  <Text style={styles.taskDescription}>
                    Menge: {spende.menge}
                  </Text>
                  
                  {spende.freitext && (
                    <Text style={styles.taskDescription}>
                      Anmerkung: {spende.freitext}
                    </Text>
                  )}
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.paragraph}>
              Keine Essensspenden zugeordnet.
            </Text>
          )}
        </View>

        {/* Ansprechpartner-Sektion */}
        {Object.keys(ansprechpartnerByBereich).length > 0 && (
          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>Ansprechpartner:</Text>
            
            {Object.entries(ansprechpartnerByBereich).map(([bereich, personen]) => (
              <View key={bereich}>
                <Text style={styles.paragraph}>
                  <Text style={{ fontWeight: 'bold' }}>{bereich}:</Text>
                </Text>
                
                {personen.map((person) => (
                  <Text key={person.id} style={styles.contactItem}>
                    {person.name}{person.telefonnummer ? ` - ${person.telefonnummer}` : ''}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Verabschiedung */}
        <View style={styles.section}>
          <Text style={styles.paragraph}>• Euer Vagelscheeten Organisationsteam •</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Regenbogenschule Melsdorf</Text>
          <Text style={styles.footerText}>www.vagelscheeten.de</Text>
          <Text style={styles.footerText}>Vogelschießen 2025 - Danke für Eure Unterstützung!</Text>
        </View>
      </Page>
    </Document>
  );
}
