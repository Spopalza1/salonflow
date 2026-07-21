import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function StylistEditDialog({ stylist, open, onOpenChange }) {
  const [username, setUsername] = useState('');
  const [chairNumber, setChairNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (stylist) {
      setUsername(stylist.username || '');
      setChairNumber(stylist.chair_number || '');
    }
  }, [stylist]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!stylist) return;
    setSaving(true);
    try {
      await base44.entities.User.update(stylist.id, {
        username: username.trim(),
        chair_number: chairNumber.trim(),
      });
      toast({ title: 'Profile updated!', description: `${stylist.full_name || stylist.email}'s profile has been updated.` });
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
          <DialogTitle>Edit {stylist?.full_name || stylist?.email}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-username">Username</Label>
            <Input
              id="edit-username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Display username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-chair">Chair Number (optional)</Label>
            <Input
              id="edit-chair"
              value={chairNumber}
              onChange={e => setChairNumber(e.target.value)}
              placeholder="e.g. Chair 3"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}