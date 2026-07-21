import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { Save, User, Armchair } from 'lucide-react';

export default function StylistProfile({ onSaved }) {
  const { user, checkUserAuth } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [chairNumber, setChairNumber] = useState(user?.chair_number || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.auth.updateMe({
        display_name: displayName.trim(),
        username: username.trim(),
        chair_number: chairNumber.trim(),
      });
      await checkUserAuth();
      toast({ title: 'Profile updated!', description: 'Your changes have been saved.' });
      onSaved?.();
    } catch (err) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="display-name"><User className="w-3.5 h-3.5 inline mr-1" />Display Name</Label>
        <Input
          id="display-name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Your name as it appears to others"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="username"><User className="w-3.5 h-3.5 inline mr-1" />Username</Label>
        <Input
          id="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Choose a display username"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="chair-number"><Armchair className="w-3.5 h-3.5 inline mr-1" />Chair Number (optional)</Label>
        <Input
          id="chair-number"
          value={chairNumber}
          onChange={e => setChairNumber(e.target.value)}
          placeholder="e.g. Chair 3"
        />
        <p className="text-xs text-muted-foreground">
          This will appear on your orders when the chair/table option is enabled at the front desk.
        </p>
      </div>
      <Button type="submit" disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Saving...' : 'Save Profile'}
      </Button>
    </form>
  );
}