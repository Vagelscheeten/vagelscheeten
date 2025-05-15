// Seite zur Userverwaltung: Anzeigen, Bearbeiten (Name, E-Mail, Passwort), Passwort-Reset-Flag setzen
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ResetPasswordDialog } from '@/components/ui/ResetPasswordDialog';
import { DeleteUserDialog } from '@/components/ui/DeleteUserDialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  user_metadata: { name?: string; force_password_change?: boolean };
  created_at: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPw, setEditPw] = useState('');
  const [editLoading, setEditLoading] = useState(false);
const [showResetPwDialog, setShowResetPwDialog] = useState(false);
const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Neuer Benutzer
  const [showNewUser, setShowNewUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const DEFAULT_PASSWORD = 'Start1234';
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        const err = await res.json();
        toast.error('Fehler beim Laden der User: ' + (err.error || res.statusText));
        setUsers([]);
      } else {
        const data = await res.json();
        setUsers(data || []);
      }
    } catch (e: any) {
      toast.error('Fehler beim Laden der User: ' + (e.message || e.toString()));
      setUsers([]);
    }
    setLoading(false);
  }

  function handleEdit(user: User) {
    setEditUser(user);
    setEditName(user.user_metadata?.name || '');
    setEditEmail(user.email);
    setEditPw('');
  }
  
  async function handleCreateUser() {
  if (!newEmail) {
    toast.error('E-Mail ist erforderlich');
    return;
  }
  setCreateLoading(true);
  try {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: newEmail,
        password: DEFAULT_PASSWORD,
        name: newName
      })
    });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || res.statusText);
      }
      
      toast.success('Benutzer erfolgreich erstellt');
      setShowNewUser(false);
      setNewName('');
      setNewEmail('');
      fetchUsers();
    } catch (e: any) {
      toast.error('Fehler beim Erstellen des Benutzers: ' + (e.message || e.toString()));
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleSave() {
    if (!editUser) return;
    setEditLoading(true);
    
    try {
      // Name/E-Mail ändern
      const updates: any = {};
      
      // User-Metadaten vorbereiten
      if (editName !== (editUser.user_metadata?.name || '')) {
        updates.user_metadata = {
          ...editUser.user_metadata,
          name: editName
        };
      }
      
      if (editEmail !== editUser.email) {
        updates.email = editEmail;
      }
      
      if (Object.keys(updates).length > 0) {
        const res = await fetch(`/api/admin/users/${editUser.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || res.statusText);
        }
      }

      toast.success('User aktualisiert!');
      setEditUser(null);
      fetchUsers();
    } catch (e: any) {
      toast.error('Fehler beim Speichern: ' + (e.message || e.toString()));
    } finally {
      setEditLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Userverwaltung</h1>
        <Button onClick={() => setShowNewUser(true)}>Neuen Benutzer anlegen</Button>
      </div>
      
      {/* Formular für neuen Benutzer */}
      {showNewUser && (
  <div className="border rounded p-4 bg-gray-50 mb-8">
    <h2 className="font-semibold mb-2">Neuen Benutzer anlegen</h2>
    <div className="mb-2">
      <label className="block text-sm">Name (optional)</label>
      <Input value={newName} onChange={e => setNewName(e.target.value)} disabled={createLoading} />
    </div>
    <div className="mb-2">
      <label className="block text-sm">E-Mail *</label>
      <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} disabled={createLoading} required />
    </div>
    <div className="mb-2">
      <span className="text-xs text-gray-500">Das Standardpasswort <span className="font-mono">{DEFAULT_PASSWORD}</span> wird gesetzt. Der Benutzer muss es beim ersten Login ändern.</span>
    </div>
    <div className="flex gap-2 mt-4">
      <Button onClick={handleCreateUser} disabled={createLoading}>
        {createLoading ? 'Wird erstellt...' : 'Benutzer erstellen'}
      </Button>
      <Button variant="outline" onClick={() => setShowNewUser(false)} disabled={createLoading}>Abbrechen</Button>
    </div>
  </div>
)}
      
      {loading ? (
        <div>Lade Benutzer...</div>
      ) : (
        <table className="min-w-full border mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">E-Mail</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Erstellt am</th>
              <th className="p-2 border">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b">
                <td className="p-2 border">{user.email}</td>
                <td className="p-2 border">{user.user_metadata?.name || ''}</td>
                <td className="p-2 border">{new Date(user.created_at).toLocaleString()}</td>
                <td className="p-2 border">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>Bearbeiten</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editUser && (
        <div className="border rounded p-4 bg-gray-50 mb-4">
          <h2 className="font-semibold mb-2">User bearbeiten</h2>
          <div className="mb-2">
            <label className="block text-sm">Name</label>
            <Input value={editName} onChange={e => setEditName(e.target.value)} disabled={editLoading} />
          </div>
          <div className="mb-2">
            <label className="block text-sm">E-Mail</label>
            <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} disabled={editLoading} />
          </div>
          <div className="flex gap-2 mt-4">
  <Button onClick={handleSave} disabled={editLoading}>Speichern</Button>
  <Button variant="outline" onClick={() => setEditUser(null)} disabled={editLoading}>Abbrechen</Button>
  <Button variant="destructive" onClick={() => setShowResetPwDialog(true)} disabled={editLoading}>Passwort zurücksetzen</Button>
  <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={editLoading}>Nutzer löschen</Button>
</div>
<ResetPasswordDialog
  open={showResetPwDialog}
  onCancel={() => setShowResetPwDialog(false)}
  onConfirm={async () => {
    setShowResetPwDialog(false);
    if (!editUser) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: DEFAULT_PASSWORD,
          user_metadata: {
            ...editUser.user_metadata,
            force_password_change: true
          }
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || res.statusText);
      }
      toast.success('Passwort wurde auf Standard zurückgesetzt!');
      setEditUser(null);
      fetchUsers();
    } catch (e: any) {
      toast.error('Fehler beim Zurücksetzen des Passworts: ' + (e.message || e.toString()));
    } finally {
      setEditLoading(false);
    }
  }}
  defaultPassword={DEFAULT_PASSWORD}
/>
<DeleteUserDialog
  open={showDeleteDialog}
  onCancel={() => setShowDeleteDialog(false)}
  onConfirm={async () => {
    setShowDeleteDialog(false);
    if (!editUser) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || res.statusText);
      }
      toast.success('Nutzer wurde gelöscht!');
      setEditUser(null);
      fetchUsers();
    } catch (e: any) {
      toast.error('Fehler beim Löschen des Nutzers: ' + (e.message || e.toString()));
    } finally {
      setEditLoading(false);
    }
  }}
  userEmail={editUser?.email}
/>
        </div>
      )}
    </div>
  );
}
