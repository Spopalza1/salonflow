import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Download, Save, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { buildGuestMenuUrl } from '@/lib/appUrl';

export default function QRDisplay() {
  const { user } = useAuth();
  const [salonName, setSalonName] = useState('');
  const [settingId, setSettingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const salonId = String(user?.salon_id || user?.data?.salon_id || '').trim();
  const guestUrl = useMemo(() => buildGuestMenuUrl(salonId), [salonId]);

  const qrUrl = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
        guestUrl,
      )}`,
    [guestUrl],
  );


  const copyGuestLink = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl);
      toast({ title: 'Guest link copied' });
    } catch (error) {
      toast({ title: 'Copy failed', description: error?.message || 'Copy the link manually.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!salonId) return undefined;

    let mounted = true;

    const load = async () => {
      try {
        const data = await base44.entities.SalonSetting.filter({
          salon_id: salonId,
        });

        if (!mounted || data.length === 0) return;
        setSalonName(data[0].salon_name || '');
        setSettingId(data[0].id);
      } catch (error) {
        console.error('Failed to load salon QR settings:', error);
      }
    };

    load();

    const unsubscribe = base44.entities.SalonSetting.subscribe((event) => {
      if (!event?.data || event.data.salon_id !== salonId) return;

      if (event.type === 'create') {
        setSalonName(event.data.salon_name || '');
        setSettingId(event.data.id);
      } else if (event.type === 'update') {
        setSalonName(event.data.salon_name || '');
      }
    });

    return () => {
      mounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [salonId]);

  const handleSave = async () => {
    if (!salonId) {
      toast({
        title: 'Salon unavailable',
        description: 'Your account is not connected to a salon.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      if (settingId) {
        await base44.entities.SalonSetting.update(settingId, {
          salon_name: salonName,
        });
      } else {
        const created = await base44.entities.SalonSetting.create({
          salon_name: salonName,
          salon_id: salonId,
        });
        setSettingId(created.id);
      }

      toast({ title: 'Salon name updated' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error?.message || 'Could not save the salon name.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Guest Menu Name
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="salon-name">
              Salon Name (shown on guest menu only)
            </Label>
            <Input
              id="salon-name"
              value={salonName}
              onChange={(event) => setSalonName(event.target.value)}
              placeholder="SalonFlow"
            />
            <p className="text-xs text-muted-foreground">
              This name appears on the guest-facing menu only. Leave it blank
              to use “SalonFlow”.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving || !salonId}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving…' : 'Save Name'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Guest Menu QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Display this QR code at styling stations. Guests scan it to open
            this salon’s public guest menu.
          </p>

          {salonId ? (
            <>
              <div className="inline-block rounded-lg border bg-white p-4">
                <img
                  src={qrUrl}
                  alt="Guest Menu QR Code"
                  width={300}
                  height={300}
                />
              </div>
              <p className="mt-3 break-all text-xs text-muted-foreground">
                {guestUrl}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button variant="outline" onClick={copyGuestLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
                <Button variant="outline" onClick={() => window.open(guestUrl, '_blank', 'noopener,noreferrer')}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Test Link
                </Button>
                <Button variant="outline" onClick={() => window.open(qrUrl, '_blank', 'noopener,noreferrer')}>
                  <Download className="mr-2 h-4 w-4" />
                  Open QR
                </Button>
              </div>
            </>
          ) : (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              This account does not have a salon ID, so a guest QR code cannot
              be generated yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
