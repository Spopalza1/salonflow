import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users, Mail, Lock, Briefcase, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function StylistManager() {
  const [stylists, setStylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [createdCreds, setCreatedCreds] = useState(null);
  const [copied, setCopied] = useState(false);
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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password || !title.trim()) return;
    setCreating(true);
    setError(null);
    setCreatedCreds(null);
    try {
      // Step 1: Create the account (sends OTP verification email to stylist)
      await base44.auth.register({ email: email.trim(), password });

      // Step 2: Find the new user and set their title + role
      const users = await base44.entities.User.filter({ email: email.trim() });
      if (users.length > 0) {
        await base44.entities.User.update(users[0].id, { title: title.trim(), role: 'stylist' });
      }

      // Step 3: Send credentials email
      const verifyUrl = `${window.location.origin}/verify-account?email=${encodeURIComponent(email.trim())}`;
      const emailBody = `Welcome to Salonflow!\n\nYour account has been created by your salon administrator.\n\nUsername: ${email.trim()}\nPassword: ${password}\n\nPlease verify your email by entering the verification code we sent you at:\n${verifyUrl}\n\nAfter verifying, log in with your username and password.`;

      try {
        await base44.integrations.Core.SendEmail({
          to: email.trim(),
          subject: 'Your Salonflow Account Credentials',
          body: emailBody
        });
        toast({ title: 'Stylist created!', description: `${email} received their credentials and verification code.` });
      } catch (emailErr) {
        // Email delivery failed — show credentials to admin for manual sharing
        setCreatedCreds({ email: email.trim(), password, verifyUrl });
        toast({ title: 'Account created, but email failed', description: 'Share the credentials below with the stylist manually.', variant: 'destructive' });
      }

      setEmail('');
      setPassword('');
      setTitle('');
    } catch (err) {
      setError(err.message || 'Failed to create stylist');
    } finally {
      setCreating(false);
    }
  };

  const copyCreds = () => {
    const text = `Username: ${createdCreds.email}\nPassword: ${createdCreds.password}\nVerify at: ${createdCreds.verifyUrl}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xl font-semibold">Stylists</h2>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stylist-email"><Mail className="w-3.5 h-3.5 inline mr-1" />Email (Username)</Label>
                <Input id="stylist-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="stylist@example.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stylist-password"><Lock className="w-3.5 h-3.5 inline mr-1" />Password</Label>
                <Input id="stylist-password" type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Set a password" required />
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
              {creating ? 'Creating...' : 'Create & Send Credentials'}
            </Button>
          </form>

          {createdCreds && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Email delivery failed. Share these credentials with the stylist manually:</p>
              <div className="text-sm space-y-1 font-mono">
                <p>Username: {createdCreds.email}</p>
                <p>Password: {createdCreds.password}</p>
                <p className="break-all">Verify: {createdCreds.verifyUrl}</p>
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={copyCreds}>
                {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? 'Copied!' : 'Copy all'}
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-3">
            The stylist receives an email with their username, password, and a verification link.
            They must verify their email before logging in.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : stylists.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No stylists yet. Create your first stylist above!</p>
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
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="secondary" className="text-xs">Stylist</Badge>
                      {s.title && <Badge variant="outline" className="text-xs">{s.title}</Badge>}
                    </div>
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