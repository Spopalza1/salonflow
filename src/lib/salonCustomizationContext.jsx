import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { applyCustomization, DEFAULTS } from '@/lib/salonTheme';

const SalonCustomizationContext = createContext(null);

export function SalonCustomizationProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    if (!user?.salon_id) {
      setLoading(false);
      return;
    }
    try {
      const existing = await base44.entities.SalonCustomization.filter({ salon_id: user.salon_id });
      if (existing.length > 0) {
        setSettings(existing[0]);
      } else {
        setSettings(null);
      }
    } catch (err) {
      console.error('Failed to load salon customization:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.salon_id]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    applyCustomization(settings || DEFAULTS);
  }, [settings]);

  const updateSettings = useCallback(async (updates) => {
    if (!user?.salon_id) return;
    if (settings) {
      const updated = await base44.entities.SalonCustomization.update(settings.id, updates);
      setSettings(updated);
      return updated;
    }
    const created = await base44.entities.SalonCustomization.create({
      ...updates,
      salon_id: user.salon_id,
    });
    setSettings(created);
    return created;
  }, [user?.salon_id, settings]);

  return (
    <SalonCustomizationContext.Provider
      value={{
        settings: settings || DEFAULTS,
        loading,
        updateSettings,
        reload: loadSettings,
      }}
    >
      {children}
    </SalonCustomizationContext.Provider>
  );
}

export function useSalonCustomization() {
  const ctx = useContext(SalonCustomizationContext);
  if (!ctx) throw new Error('useSalonCustomization must be used within SalonCustomizationProvider');
  return ctx;
}