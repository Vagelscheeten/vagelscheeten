import { NextRequest, NextResponse } from 'next/server';

// Diese Version ist definitiv mit Next.js 15 kompatibel
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Einfache Dummy-Implementierung
  return NextResponse.json({ success: true, id: params.id });
}
