import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Palette, Type, LayoutGrid, Store, Save, Loader2, Upload, X, Hash, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSalonCustomization } from '@/lib/salonCustomizationContext';
import { useAuth } from '@/lib/AuthContext';
import { applyCustomization, DEFAULTS, FONT_OPTIONS } from '@/lib/salonTheme';
import { Image as UIImage } from '@/components/ui/image';

function ColorField({ label, value, onChange }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded-md border border-input cursor-pointer shrink-0"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-sm"
        />
      </div>
    </div>
  );
}

export default function CustomizationPanel() {
  const { settings, updateSettings } = useSalonCustomization();
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showStoreId, setShowStoreId] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyStoreId = () => {
    navigator.clipboard.writeText(user?.salon_id || '');
    setCopied(true);
    toast({ title: 'Store ID copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    setForm({ ...DEFAULTS, ...settings });
  }, [settings]);

  useEffect(() => {
    applyCustomization(form);
  }, [form]);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange('salon_logo_url', file_url);
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(form);
      toast({ title: 'Customization saved', description: 'Your salon portal has been updated.' });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(DEFAULTS);
    applyCustomization(DEFAULTS);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-heading text-xl font-semibold">Customize Your Portal</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowStoreId(s => !s)}>
            <Hash className="w-4 h-4 mr-2" />Store ID
          </Button>
          <Button variant="outline" onClick={handleReset}>Reset</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
          </Button>
        </div>
      </div>

      {showStoreId && (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Your Store ID</p>
              <p className="font-mono text-sm break-all">{user?.salon_id || 'Not assigned'}</p>
            </div>
            {user?.salon_id && (
              <Button variant="outline" size="sm" onClick={handleCopyStoreId} className="shrink-0">
                {copied ? <><Check className="w-4 h-4 mr-1" />Copied</> : <><Copy className="w-4 h-4 mr-1" />Copy</>}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Store className="w-5 h-5" />Salon Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Salon Display Name</Label>
            <Input
              value={form.salon_display_name || ''}
              onChange={(e) => handleChange('salon_display_name', e.target.value)}
              placeholder="e.g. Glow Hair Studio"
            />
            <p className="text-xs text-muted-foreground">Shown in the header instead of "Salonflow"</p>
          </div>
          <div className="space-y-2">
            <Label>Logo</Label>
            {form.salon_logo_url ? (
              <div className="relative inline-block">
                <UIImage src={form.salon_logo_url} alt="Logo" className="h-16 rounded-lg" fittingType="fit" />
                <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7" onClick={() => handleChange('salon_logo_url', '')}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                {uploading && <span className="text-sm text-muted-foreground shrink-0">Uploading...</span>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" />Theme Colors</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ColorField label="Primary" value={form.primary_color} onChange={(v) => handleChange('primary_color', v)} />
          <ColorField label="Secondary" value={form.secondary_color} onChange={(v) => handleChange('secondary_color', v)} />
          <ColorField label="Accent" value={form.accent_color} onChange={(v) => handleChange('accent_color', v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Type className="w-5 h-5" />Typography</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Heading Font</Label>
            <MobileSelect
              value={form.font_heading}
              onValueChange={(v) => handleChange('font_heading', v)}
              options={FONT_OPTIONS}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>Body Font</Label>
            <MobileSelect
              value={form.font_body}
              onValueChange={(v) => handleChange('font_body', v)}
              options={FONT_OPTIONS}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LayoutGrid className="w-5 h-5" />Card Styling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ColorField label="Card Background" value={form.card_background_color} onChange={(v) => handleChange('card_background_color', v)} />
            <ColorField label="Card Border" value={form.card_border_color} onChange={(v) => handleChange('card_border_color', v)} />
          </div>
          <div className="space-y-2">
            <Label>Card Border Radius: {form.card_radius}px</Label>
            <input
              type="range"
              min="0"
              max="24"
              value={form.card_radius}
              onChange={(e) => handleChange('card_radius', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}