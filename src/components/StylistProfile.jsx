import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { User, Save, Armchair } from 'lucide-react';

export default function StylistProfile() {
  const { user, checkUserAuth } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [chairNumber, setChairNumber] = useState(user?.chair_number || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.auth.updateMe({
        username: username.trim(),
        chair_number: chairNumber.trim(),
      });
      await checkUserAuth();
      toast({ title: 'Profile updated!', description: 'Your changes have been saved.' });
    } catch (err) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-5 h-5" />
        <h2 className="font-heading text-xl font-semibold">My Profile</h2>
      </div>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-4">
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
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}