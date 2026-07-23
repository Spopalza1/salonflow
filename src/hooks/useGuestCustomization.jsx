import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { applyCustomization, DEFAULTS } from '@/lib/salonTheme';

export function useGuestCustomization(salonId) {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    if (!salonId) return;
    const load = async () => {
      try {
        const response = await base44.functions.invoke('getGuestCustomization', { salon_id: salonId });
        const data = response.data?.customization;
        if (data) {
          setSettings({ ...DEFAULTS, ...data });
        }
      } catch (err) {
        console.error('Failed to load salon customization:', err);
      }
    };
    load();

    const unsubscribe = base44.entities.SalonCustomization.subscribe((event) => {
      if (event.data?.salon_id !== salonId) return;
      if (event.type === 'create' || event.type === 'update') {
        setSettings({ ...DEFAULTS, ...event.data });
      }
    });
    return unsubscribe;
  }, [salonId]);

  useEffect(() => {
    applyCustomization(settings);
  }, [settings]);

  return settings;
}