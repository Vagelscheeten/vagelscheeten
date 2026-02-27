'use client';

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { saveAs } from 'file-saver';
import { ElternInfoPDF } from './ElternInfoPDF';

export function ElternInfoPDFDownload() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const [qrCodeDataURL, logoDataURL] = await Promise.all([
        QRCode.toDataURL('https://vagelscheeten.de/anmeldung', {
          width: 400,
          margin: 1,
          errorCorrectionLevel: 'H',
        }),
        fetchLogoAsDataURL(),
      ]);

      const blob = await pdf(
        <ElternInfoPDF
          qrCodeDataURL={qrCodeDataURL}
          logoDataURL={logoDataURL}
        />
      ).toBlob();

      saveAs(blob, 'Eltern-Info-Helferanmeldung.pdf');
    } catch (error) {
      console.error('PDF-Generierung fehlgeschlagen:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 border rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors whitespace-nowrap disabled:opacity-50"
    >
      {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
      Eltern-Infozettel
    </button>
  );
}

async function fetchLogoAsDataURL(): Promise<string> {
  const res = await fetch('/2025_Logo_transparent.png');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
