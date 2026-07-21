import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, Download } from 'lucide-react';

export default function QRDisplay() {
  const guestUrl = `${window.location.origin}/guest`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(guestUrl)}`;

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Guest Menu QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Display this QR code at styling stations. Guests scan it to view the menu and request drinks directly to the front desk.
          </p>
          <div className="inline-block p-4 bg-white rounded-lg border">
            <img src={qrUrl} alt="Guest Menu QR Code" width={300} height={300} />
          </div>
          <p className="text-xs text-muted-foreground mt-3 break-all">{guestUrl}</p>
          <Button className="mt-4" variant="outline" onClick={() => window.open(qrUrl, '_blank')}>
            <Download className="w-4 h-4 mr-2" />
            Download QR
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}