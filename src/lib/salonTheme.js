export const DEFAULTS = {
  salon_display_name: '',
  salon_logo_url: '',
  logo_size: 32,
  menu_background_image: '',
  bg_overlay_opacity: 80,
  primary_color: '#000000',
  secondary_color: '#000000',
  accent_color: '#000000',
  card_background_color: '#ffffff',
  card_border_color: '#000000',
  card_radius: 12,
  font_heading: 'Inter',
  font_body: 'Inter',
};

export const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Lora', label: 'Lora' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Work Sans', label: 'Work Sans' },
];

const loadedFonts = {};

export function ensureFontLoaded(fontName) {
  if (!fontName || loadedFonts[fontName]) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts[fontName] = true;
}

export function hexToHsl(hex) {
  if (!hex) return null;
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function foregroundFor(hslStr) {
  if (!hslStr) return null;
  const lightness = parseFloat(hslStr.split(' ')[2]) / 100;
  return lightness < 0.5 ? '0 0% 100%' : '0 0% 9%';
}

export function applyCustomization(settings) {
  const root = document.documentElement;
  const s = { ...DEFAULTS, ...settings };

  const primary = hexToHsl(s.primary_color);
  if (primary) {
    root.style.setProperty('--primary', primary);
    const primaryFg = foregroundFor(primary);
    if (primaryFg) root.style.setProperty('--primary-foreground', primaryFg);
  }

  const secondary = hexToHsl(s.secondary_color);
  if (secondary) {
    root.style.setProperty('--secondary', secondary);
    const secondaryFg = foregroundFor(secondary);
    if (secondaryFg) root.style.setProperty('--secondary-foreground', secondaryFg);
  }

  const accent = hexToHsl(s.accent_color);
  if (accent) {
    root.style.setProperty('--accent', accent);
    const accentFg = foregroundFor(accent);
    if (accentFg) root.style.setProperty('--accent-foreground', accentFg);
  }

  const cardBg = hexToHsl(s.card_background_color);
  if (cardBg) root.style.setProperty('--card', cardBg);

  const cardBorder = hexToHsl(s.card_border_color);
  if (cardBorder) root.style.setProperty('--border', cardBorder);

  if (s.card_radius != null) {
    root.style.setProperty('--radius', `${s.card_radius / 16}rem`);
  }

  if (s.font_heading) {
    ensureFontLoaded(s.font_heading);
    root.style.setProperty('--font-heading', `'${s.font_heading}', ui-sans-serif, system-ui, sans-serif`);
  }

  if (s.font_body) {
    ensureFontLoaded(s.font_body);
    root.style.setProperty('--font-body', `'${s.font_body}', ui-sans-serif, system-ui, sans-serif`);
  }
}