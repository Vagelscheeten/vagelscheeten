import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

interface ElternInfoPDFProps {
  qrCodeDataURL: string;
  logoDataURL: string;
  eventJahr?: number;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    display: 'flex',
    flexDirection: 'column',
  },
  border: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    border: '1pt solid #33665B',
    borderRadius: 10,
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    color: '#33665B',
  },
  subtitle: {
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#E7432C',
  },
  introText: {
    fontSize: 12,
    lineHeight: 1.6,
    marginBottom: 20,
    textAlign: 'justify',
  },
  qrContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  qrCode: {
    width: 160,
    height: 160,
  },
  qrLink: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#33665B',
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#33665B',
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 20,
    color: '#F2A03D',
  },
  stepText: {
    fontSize: 12,
    lineHeight: 1.5,
    flex: 1,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 14,
    borderTop: '0.5pt solid #ccc',
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
    lineHeight: 1.5,
  },
});

export const ElternInfoPDF = ({ qrCodeDataURL, logoDataURL, eventJahr = 2026 }: ElternInfoPDFProps) => {
  const steps = [
    'Scannt den QR-Code oder gebt die Adresse in Euren Browser ein.',
    'Gebt den Namen Eures Kindes und Eure E-Mail-Adresse an.',
    'Kreuzt an, wobei Ihr helfen könnt. Gerne mehrere Angebote, damit wir flexibel einteilen können.',
    'Bitte gebt ausserdem an, was Ihr zum Buffet beitragen möchtet.',
    'Ihr erhaltet eine Bestätigungs-E-Mail. Das Orga-Team teilt Euch dann Eure Aufgabe zu.',
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.border} />

        <View style={styles.logoContainer}>
          <Image style={styles.logo} src={logoDataURL} />
        </View>

        <Text style={styles.title}>Melsdörper Vagelscheeten {eventJahr}</Text>
        <Text style={styles.subtitle}>Helfer-Anmeldung jetzt online!</Text>

        <Text style={styles.introText}>
          Liebe Eltern, dieses Jahr könnt Ihr Euch ganz bequem online als Helferin oder Helfer
          für das Vagelscheeten anmelden. So entfällt der Zettel-Rücklauf über die Schule.
          Der Ablauf bleibt wie gewohnt: Ihr gebt an, wobei Ihr helfen könnt und das Orga-Team
          teilt Euch dann Eure Aufgabe zu. Die Anmeldung dauert nur wenige Minuten.
          Einfach den QR-Code scannen oder den Link aufrufen:
        </Text>

        <View style={styles.qrContainer}>
          <Image style={styles.qrCode} src={qrCodeDataURL} />
        </View>

        <Text style={styles.qrLink}>vagelscheeten.de/anmeldung</Text>

        <Text style={styles.stepsTitle}>So funktioniert es:</Text>
        {steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <Text style={styles.stepNumber}>{i + 1}.</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          Vielen Dank für Eure Unterstützung!{'\n'}
          Orga-Team Vagelscheeten · Förderverein Regenbogenschule Melsdorf e.V.
        </Text>
      </Page>
    </Document>
  );
};
