import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users, Mail, Briefcase, Trash2, Copy, Link as LinkIcon, MessageSquare, Pencil } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import StylistMessageDialog from '@/components/StylistMessageDialog';
import StylistEditDialog from '@/components/StylistEditDialog';
import InviteQRShare from '@/components/InviteQRShare';

export default function StylistManager() {
  const [stylists, setStylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [inviteLink, setInviteLink] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [messageTarget, setMessageTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const getSignUpLink = (emailAddr) => {
    return `${window.location.origin}/register?email=${encodeURIComponent(emailAddr)}`;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Link copied!', description: 'Share this link with your stylist.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy the link manually.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await base44.entities.User.filter({ role: { $ne: 'admin' }, salon_id: user.salon_id });
        setStylists(data);
      } catch (err) {
        toast({ title: 'Failed to load stylists', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
    const unsubscribe = base44.entities.User.subscribe((event) => {
      if (event.type === 'create') {
        if (event.data.role !== 'admin' && event.data.salon_id === user.salon_id) {
          setStylists(prev => [...prev, event.data]);
        }
      } else if (event.type === 'update') {
        if (event.data.role === 'admin' || event.data.salon_id !== user.salon_id) {
          setStylists(prev => prev.filter(s => s.id !== event.data.id));
        } else {
          setStylists(prev => prev.map(s => s.id === event.data.id ? event.data : s));
        }
      } else if (event.type === 'delete') {
        setStylists(prev => prev.filter(s => s.id !== event.id));
      }
    });
    return unsubscribe;
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!email.trim() || !title.trim()) return;
    if (title.trim().toLowerCase() === 'admin') {
      setError('Cannot use "admin" as a title.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      // Step 1: Invite the user with default role (platform sends the invitation email)
      await base44.users.inviteUser(email.trim(), 'user');

      // Step 2: Find the new user and set their title
      const users = await base44.entities.User.filter({ email: email.trim() });
      if (users.length > 0) {
        await base44.entities.User.update(users[0].id, { title: title.trim(), salon_id: user.salon_id });
      }

      const link = getSignUpLink(email.trim());
      setInviteLink(link);
      setInviteEmail(email.trim());
      toast({ title: 'Invitation sent!', description: 'Share the QR code or link below with your stylist.' });
      setEmail('');
      setTitle('');
    } catch (err) {
      setError(err.message || 'Failed to invite user');
    } finally {
      setCreating(false);
    }
  };

  const handleRemove = async (stylist) => {
    if (!confirm(`Remove ${stylist.full_name || stylist.email}? They will no longer have access.`)) return;
    try {
      await base44.entities.User.delete(stylist.id);
      toast({ title: 'User removed', description: `${stylist.email} no longer has access.` });
    } catch (err) {
      toast({ title: 'Failed to remove', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xl font-semibold">Stylists</h2>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stylist-email"><Mail className="w-3.5 h-3.5 inline mr-1" />Email</Label>
                <Input id="stylist-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="stylist@example.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stylist-title"><Briefcase className="w-3.5 h-3.5 inline mr-1" />Title</Label>
                <Input id="stylist-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Senior Stylist" required />
              </div>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
            <Button type="submit" disabled={creating}>
              <UserPlus className="w-4 h-4 mr-2" />
              {creating ? 'Sending...' : 'Invite Stylist'}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-3">
            After inviting, share the QR code or link with your stylist. Only invited emails can sign up — the page is not accessible to the public.
          </p>

          {inviteLink && (
            <InviteQRShare link={inviteLink} email={inviteEmail} />
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : stylists.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No stylists yet. Invite your first stylist above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stylists.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{s.display_name || s.full_name || s.email}</div>
                    {s.username && <div className="text-sm text-muted-foreground truncate">@{s.username}</div>}
                    <div className="text-sm text-muted-foreground truncate">{s.email}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {s.title && <Badge variant="outline" className="text-xs">{s.title}</Badge>}
                      {s.chair_number && <Badge variant="secondary" className="text-xs">{s.chair_number}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" title="Edit profile" onClick={() => setEditTarget(s)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Send message" onClick={() => setMessageTarget(s)}>
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Copy sign-up link" onClick={() => copyToClipboard(getSignUpLink(s.email))}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(s)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editTarget && (
        <StylistEditDialog
          stylist={editTarget}
          open={!!editTarget}
          onOpenChange={(v) => !v && setEditTarget(null)}
        />
      )}

      {messageTarget && user && (
        <StylistMessageDialog
          stylist={messageTarget}
          user={user}
          open={!!messageTarget}
          onOpenChange={(v) => !v && setMessageTarget(null)}
        />
      )}
    </div>
  );
}