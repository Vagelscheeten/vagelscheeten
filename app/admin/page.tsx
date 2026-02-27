import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, UserCheck, BarChart3, Phone, Image, Download, Clock, HelpCircle, Crown, Settings } from 'lucide-react';

export default function AdminHome() {
  return (
    <main className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Admin-Bereich</h1>
      <p className="text-sm text-slate-500 mb-8">Hier verwaltest du alle organisatorischen Bereiche des Vogelschießens.</p>

      {/* CMS – Inhalte der öffentlichen Webseite */}
      <h2 className="text-lg font-semibold mb-4 text-slate-600">Webseiten-Inhalte</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Ablaufplan
            </CardTitle>
            <CardDescription>Tagesablauf bearbeiten</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/ablauf" className="text-blue-600 hover:underline">
              Ablauf verwalten
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="mr-2 h-5 w-5" />
              FAQ
            </CardTitle>
            <CardDescription>Häufig gestellte Fragen</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/faq" className="text-blue-600 hover:underline">
              FAQ verwalten
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Crown className="mr-2 h-5 w-5" />
              Historie
            </CardTitle>
            <CardDescription>Ehemalige Königspaare</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/historie" className="text-blue-600 hover:underline">
              Historie verwalten
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Einstellungen
            </CardTitle>
            <CardDescription>Texte, Kontakt, Spenden</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/einstellungen" className="text-blue-600 hover:underline">
              Einstellungen verwalten
            </Link>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-4 text-slate-600">Organisation</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Kinder & Gruppen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Kinder & Gruppen
            </CardTitle>
            <CardDescription>Verwaltung von Kindern und Klassen</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>
                <Link href="/admin/kinder" className="text-blue-600 hover:underline">
                  Kinder verwalten
                </Link>
              </li>
              <li>
                <Link href="/admin/klassen" className="text-blue-600 hover:underline">
                  Klassen verwalten
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        {/* Spieleverwaltung */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarDays className="mr-2 h-5 w-5" />
              Spieleverwaltung
            </CardTitle>
            <CardDescription>Organisation der Spiele und Aktivitäten</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>
                <Link href="/admin/spiele" className="text-blue-600 hover:underline">
                  Spiele verwalten
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        {/* Helferverwaltung */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCheck className="mr-2 h-5 w-5" />
              Helferverwaltung
            </CardTitle>
            <CardDescription>Organisation der Helfer und Zuteilungen</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>
                <Link href="/admin/helfer" className="text-blue-600 hover:underline">
                  Helfer verwalten
                </Link>
              </li>
              <li>
                <Link href="/admin/helfer/pdf" className="text-blue-600 hover:underline">
                  Helfer-PDFs generieren
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        {/* Kontakte */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="mr-2 h-5 w-5" />
              Kontakte
            </CardTitle>
            <CardDescription>Verwaltung von Ansprechpartnern</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>
                <Link href="/admin/kontakte" className="text-blue-600 hover:underline">
                  Ansprechpartner verwalten
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        {/* Auswertung */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Auswertung
            </CardTitle>
            <CardDescription>Ergebnisse und Punkteberechnung</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>
                <Link href="/admin/auswertung" className="text-blue-600 hover:underline">
                  Auswertung anzeigen
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        {/* Event-Verwaltung */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarDays className="mr-2 h-5 w-5" />
              Events
            </CardTitle>
            <CardDescription>Vogelschießen-Events verwalten</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>
                <Link href="/admin/events" className="text-blue-600 hover:underline">
                  Events verwalten
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Galerie-Verwaltung */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Image className="mr-2 h-5 w-5" />
              Galerie-Verwaltung
            </CardTitle>
            <CardDescription>Bilder hochladen und verwalten</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>
                <Link href="/admin/galerie" className="text-blue-600 hover:underline">
                  Bilder verwalten
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        {/* Download-Verwaltung */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Download className="mr-2 h-5 w-5" />
              Download-Verwaltung
            </CardTitle>
            <CardDescription>Dokumente hochladen und verwalten</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>
                <Link href="/admin/downloads" className="text-blue-600 hover:underline">
                  Dokumente verwalten
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
