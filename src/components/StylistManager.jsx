import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function StylistManager() {
  const [stylists, setStylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.User.filter({ role: 'stylist' });
      setStylists(data);
      setLoading(false);
    };
    load();
    const unsubscribe = base44.entities.User.subscribe((event) => {
      if (event.type === 'create') {
        setStylists(prev => [...prev, event.data]);
      } else if (event.type === 'update') {
        setStylists(prev => prev.map(s => s.id === event.data.id ? event.data : s));
      } else if (event.type === 'delete') {
        setStylists(prev => prev.filter(s => s.id !== event.id));
      }
    });
    return unsubscribe;
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(email.trim(), 'stylist');
      toast({ title: 'Invitation sent!', description: `${email} has been invited as a stylist.` });
      setEmail('');
    } catch (err) {
      toast({ title: 'Failed to invite', description: err.message, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xl font-semibold">Stylists</h2>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="invite-email"><Mail className="w-3.5 h-3.5 inline mr-1" />Invite Stylist by Email</Label>
              <Input id="invite-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="stylist@example.com" required />
            </div>
            <Button type="submit" disabled={inviting}>
              <UserPlus className="w-4 h-4 mr-2" />
              {inviting ? 'Sending...' : 'Invite'}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">The stylist receives an email invitation to set up their login credentials. They'll be assigned the "stylist" role automatically and taken to the stylist dashboard on login.</p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : stylists.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No stylists yet. Invite your first stylist!</p>
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
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.full_name || s.email}</div>
                    <div className="text-sm text-muted-foreground truncate">{s.email}</div>
                    <Badge variant="secondary" className="text-xs mt-1">Stylist</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}