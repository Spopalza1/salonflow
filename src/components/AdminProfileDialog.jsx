import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Save } from 'lucide-react';

export default function AdminProfileDialog({ open, onOpenChange }) {
  const { user, checkUserAuth } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setDisplayName(user?.display_name || '');
  }, [user?.display_name, open]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const newName = displayName.trim();
      const oldName = user?.display_name || user?.full_name || '';
      await base44.auth.updateMe({ display_name: newName });

      if (newName && newName !== oldName) {
        try {
          await base44.entities.Message.updateMany(
            { sender_id: user.id },
            { $set: { sender_name: newName } }
          );
          await base44.entities.Message.updateMany(
            { thread_partner_id: user.id },
            { $set: { thread_partner_name: newName } }
          );
        } catch (err) {
          console.error('Failed to sync message names:', err);
        }
      }

      await checkUserAuth();
      toast({ title: 'Profile updated!', description: 'Your display name has been saved.' });
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-display-name">Display Name</Label>
            <Input
              id="admin-display-name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name as it appears to others"
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}