import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Diese Route verwendet POST für alle Operationen (keine dynamischen Segmente)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, updates } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'userId ist erforderlich' }, { status: 400 });
    }
    
    const supabase = createAdminClient();
    
    if (action === 'update') {
      const { data, error } = await supabase.auth.admin.updateUserById(userId, updates);
      
      if (error) {
        console.error('Admin API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ success: true, data });
    } 
    else if (action === 'delete') {
      const { data, error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) {
        console.error('Admin API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ success: true, data });
    }
    
    return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin API exception:', error);
    return NextResponse.json(
      { error: error.message || 'Ein unbekannter Fehler ist aufgetreten' }, 
      { status: 500 }
    );
  }
}
