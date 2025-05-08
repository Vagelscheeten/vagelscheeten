import { redirect } from 'next/navigation';

export default function Home() {
  // Automatische Weiterleitung zur Startseite
  redirect('/startseite');
  
  // Diese Komponente wird nie gerendert, da die Weiterleitung vorher erfolgt
  return null;
}
