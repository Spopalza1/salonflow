import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Palette, Type, LayoutGrid, Store, Save, Loader2, Upload, X, Hash, Copy, Check, ImagePlus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSalonCustomization } from '@/lib/salonCustomizationContext';
import { useAuth } from '@/lib/AuthContext';
import { applyCustomization, DEFAULTS, FONT_OPTIONS } from '@/lib/salonTheme';
import { Image as UIImage } from '@/components/ui/image';
import ImageEditorDialog from '@/components/ImageEditorDialog';

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
  const [editingImage, setEditingImage] = useState(null);
  const initializedRef = useRef(false);
  const saveTimerRef = useRef(null);

  const handleCopyStoreId = () => {
    navigator.clipboard.writeText(user?.salon_id || '');
    setCopied(true);
    toast({ title: 'Store ID copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!initializedRef.current) {
      setForm({ ...DEFAULTS, ...settings });
      if (settings.id) initializedRef.current = true;
    }
  }, [settings]);

  useEffect(() => {
    applyCustomization(form);
  }, [form]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await updateSettings(form);
      } catch (err) {
        toast({ title: 'Auto-save failed', description: err.message, variant: 'destructive' });
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [form]);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setEditingImage({ file, aspectRatio: 1, target: 'salon_logo_url' });
  };

  const handleBackgroundFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setEditingImage({ file, aspectRatio: 16 / 9, target: 'menu_background_image' });
  };

  const handleBackgroundVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange('menu_background_video', file_url);
      toast({ title: 'Background video saved' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleEditorApply = async (blob) => {
    if (!editingImage) return;
    const file = new File([blob], 'edited.png', { type: 'image/png' });
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange(editingImage.target, file_url);
      setEditingImage(null);
      toast({ title: 'Image saved' });
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
      {editingImage && (
        <ImageEditorDialog
          file={editingImage.file}
          aspectRatio={editingImage.aspectRatio}
          onApply={handleEditorApply}
          onClose={() => !uploading && setEditingImage(null)}
          uploading={uploading}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-heading text-xl font-semibold">Customize Your Portal</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowStoreId(s => !s)}>
            <Hash className="w-4 h-4 mr-2" />Store ID
          </Button>
          <Button variant="outline" onClick={handleReset}>Reset</Button>
          {saving ? (
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin" />Saving...
            </span>
          ) : (
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-500" />All changes saved
            </span>
          )}
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
                <Input type="file" accept="image/*" onChange={handleLogoFileSelect} disabled={uploading} />
                {uploading && <span className="text-sm text-muted-foreground shrink-0">Uploading...</span>}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Logo Size: {form.logo_size ?? 32}px</Label>
            <input
              type="range"
              min="16"
              max="80"
              value={form.logo_size ?? 32}
              onChange={(e) => handleChange('logo_size', parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Controls the logo height in headers and the guest menu</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ImagePlus className="w-5 h-5" />Guest Menu Background</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Upload a photo to display as the background of your guest menu page.</p>
          {form.menu_background_image ? (
            <div className="relative inline-block w-full">
              <UIImage src={form.menu_background_image} alt="Background" className="h-28 w-full rounded-lg" fittingType="fill" />
              <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7" onClick={() => handleChange('menu_background_image', '')}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*" onChange={handleBackgroundFileSelect} disabled={uploading} />
              {uploading && <span className="text-sm text-muted-foreground shrink-0">Uploading...</span>}
            </div>
          )}
          <div className="space-y-2">
            <Label>Background Overlay: {form.bg_overlay_opacity ?? 80}%</Label>
            <input
              type="range"
              min="0"
              max="100"
              value={form.bg_overlay_opacity ?? 80}
              onChange={(e) => handleChange('bg_overlay_opacity', parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Higher = more solid background over the image. Lower = image shows through more.</p>
          </div>
          <div className="space-y-2">
            <Label>Background Video (optional)</Label>
            {form.menu_background_video ? (
              <div className="relative inline-block w-full">
                <video src={form.menu_background_video} className="h-28 w-full rounded-lg object-cover" muted loop playsInline />
                <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7" onClick={() => handleChange('menu_background_video', '')}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input type="file" accept="video/*" onChange={handleBackgroundVideoUpload} disabled={uploading} />
                {uploading && <span className="text-sm text-muted-foreground shrink-0">Uploading...</span>}
              </div>
            )}
            <p className="text-xs text-muted-foreground">If set, this video plays as the background instead of the image. Keep it short for faster loading.</p>
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