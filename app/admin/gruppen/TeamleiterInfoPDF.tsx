import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Spielgruppe } from '@/lib/types';

// Typen für die Teamleiter-Info-PDF
interface TeamleiterInfoPDFProps {
  spielgruppe: Spielgruppe;
  qrCodeDataURL?: string;
  loginUrl: string;
}

// Styles für das PDF-Dokument im DIN A4 Format
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  gruppenInfo: {
    fontSize: 18,
    marginBottom: 5,
  },
  zugangscode: {
    fontSize: 18,
    marginBottom: 30,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 1.5,
    marginBottom: 20,
    textAlign: 'justify',
  },
  qrContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  qrCode: {
    width: 150,
    height: 150,
  },
  qrLink: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  instructions: {
    fontSize: 14,
    lineHeight: 1.5,
    marginBottom: 15,
    textAlign: 'justify',
  },
  warning: {
    fontSize: 14,
    lineHeight: 1.5,
    marginBottom: 15,
    textAlign: 'justify',
  },
  final: {
    marginTop: 20,
    fontSize: 14,
    lineHeight: 1.5,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  border: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    border: '1pt solid #000',
    borderRadius: 10,
  },
});

// Die eigentliche PDF-Komponente
export const TeamleiterInfoPDF = ({ spielgruppe, qrCodeDataURL, loginUrl }: TeamleiterInfoPDFProps) => {
  // Fallback QR Code (statisches Bild, falls die Generierung fehlschlägt)
  // Dies ist ein Mini-QR-Code-Beispiel als Base64 (tauschen Sie es bei Bedarf aus)
  const fallbackQRCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAABQklEQVR4nO3aQQ7CIBRF0YLuXLtC908XVBMTEgZ+Pd9zJrYVuFGhLAAAAAAAAAAAAAAAAMAU11Navc5Y+7mb3h38Vmv/tO75Zjm/xHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxHHfxPFdYs6aYx6Yjrm3zzHHXD/7wPg/yddjbuYnkWr/KOOl5LHfKI8Z8ZSWGd4JAgAAAAAAAAAAAMColP9lJP2/QhJxzCvpvBZxzKu24MzxKpFHHPM6Ys/VvKJvn+JrMR/5rFJR4gjEEYgjEEcgjkAcgTgCcQAAAAAAAAAAAAAAAAAAMNMXCBgpOBvs7WkAAAAASUVORK5CYII=';
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.border} />
        
        <Text style={styles.header}>Teamleiter-Informationen</Text>
        
        <View style={styles.section}>
          <Text style={styles.gruppenInfo}>Gruppenname: {spielgruppe.name}</Text>
          <Text style={styles.zugangscode}>Zugangscode: {spielgruppe.leiter_zugangscode}</Text>
        </View>
        
        <Text style={styles.infoText}>
          Bitte benutze Dein Smartphone, um unten stehenden QR-Code zu scannen. Dadurch gelangst Du auf die Webseite zur Erfassung der Spielergebnisse.
        </Text>
        
        <View style={styles.qrContainer}>
          <Image style={styles.qrCode} src={qrCodeDataURL || fallbackQRCode} />
        </View>
        
        <Text style={styles.qrLink}>{loginUrl.replace('https://', '')}</Text>
        
        <Text style={styles.instructions}>
          Wähle zuerst das Spiel, danach das Kind und gib dann das Ergebnis ein. Sobald alle Kinder das Spiel absolviert haben, beende die Erfassung mit dem Button "Spiel abschließen".
        </Text>
        
        <Text style={styles.warning}>
          Solange das Spiel noch nicht abgeschlossen ist, kannst Du Ergebnisse korrigieren - danach nicht mehr!
        </Text>

        <Text style={styles.instructions}>
          Solltest Du Herausforderungen während der Spiele haben, so wende Dich gerne an das Orga-Team.
        </Text>
        
        <Text style={styles.final}>
          Nun viel Spaß und vielen Dank für Deine Unterstützung!
        </Text>
      </Page>
    </Document>
  );
};
