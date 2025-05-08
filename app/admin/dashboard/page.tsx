"use client";

import { redirect } from 'next/navigation'; // Für die Weiterleitung
import { logout } from '@/app/auth/actions'; // Import der Logout-Action
import { Button } from '@/components/ui/button'; // Import Button
import DashboardPageClient from "./DashboardPageClient";

export default function DashboardPage() {
  return <DashboardPageClient />;
}