import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, UserCheck, DollarSign, BarChart3, FileText, Phone, FileDown, Image } from 'lucide-react';

export default function AdminHome() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Admin-Bereich</h1>
      <p className="mb-8">Hier verwaltest du alle organisatorischen Bereiche des Vogelschießens.</p>
      
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
                <Link href="/admin/helfer-bearbeiten" className="text-blue-600 hover:underline">
                  Zuteilungen bearbeiten
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
        
        {/* Sponsoring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Sponsoring
            </CardTitle>
            <CardDescription>Verwaltung von Sponsoren und Spenden</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>
                <Link href="/admin/sponsoren" className="text-blue-600 hover:underline">
                  Sponsoren verwalten
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        {/* Reporting & Statistiken */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Reporting & Statistiken
            </CardTitle>
            <CardDescription>Auswertungen und Berichte</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>
                <Link href="/admin/statistiken" className="text-blue-600 hover:underline">
                  Statistiken anzeigen
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
      </div>
    </main>
  );
}
