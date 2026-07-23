export const DEFAULTS = {
  salon_display_name: '',
  salon_logo_url: '',
  logo_size: 32,
  menu_background_image: '',
  menu_background_video: '',
  bg_overlay_opacity: 80,
  primary_color: '#000000',
  secondary_color: '#000000',
  accent_color: '#000000',
  text_color: '#1a1a1a',
  card_background_color: '#ffffff',
  card_border_color: '#000000',
  card_text_color: '#1a1a1a',
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

  // Clear dark-theme-only overrides so CSS :root defaults apply in light mode
  ['--background', '--popover', '--popover-foreground', '--muted', '--muted-foreground',
   '--destructive', '--destructive-foreground', '--input', '--ring',
   '--sidebar-background', '--sidebar-foreground', '--sidebar-primary', '--sidebar-primary-foreground',
   '--sidebar-accent', '--sidebar-accent-foreground', '--sidebar-border', '--sidebar-ring',
   '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'
  ].forEach(v => root.style.removeProperty(v));

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

  const textColor = hexToHsl(s.text_color);
  if (textColor) root.style.setProperty('--foreground', textColor);

  const cardBg = hexToHsl(s.card_background_color);
  if (cardBg) root.style.setProperty('--card', cardBg);

  const cardText = hexToHsl(s.card_text_color);
  if (cardText) root.style.setProperty('--card-foreground', cardText);

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

function hexToHslObject(hex) {
  if (!hex) return null;
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return null;
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
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Converts the admin's primary brand color into an accessible accent suitable
 * for dark navy backgrounds. Boosts lightness and saturation to meet WCAG
 * contrast requirements. Greyscale colors fall back to a default blue.
 */
function deriveAccessibleAccent(hex) {
  const hsl = hexToHslObject(hex);
  if (!hsl || hsl.s < 10) return '210 100% 60%';
  const adjustedL = Math.max(58, Math.min(72, hsl.l + 20));
  const adjustedS = Math.max(55, hsl.s);
  return `${hsl.h} ${adjustedS}% ${adjustedL}%`;
}

/**
 * Standardized dark theme — deep navy surfaces, light grey text, and a
 * single derived accent from the admin's brand color. Applied identically
 * across all tenants. Called when the .dark class is active.
 */
export function applyDarkTheme(settings) {
  const root = document.documentElement;
  const s = { ...DEFAULTS, ...settings };

  const accent = deriveAccessibleAccent(s.primary_color);

  root.style.setProperty('--background', '222 47% 6%');
  root.style.setProperty('--foreground', '210 40% 96%');
  root.style.setProperty('--card', '222 40% 10%');
  root.style.setProperty('--card-foreground', '210 40% 96%');
  root.style.setProperty('--popover', '222 40% 10%');
  root.style.setProperty('--popover-foreground', '210 40% 96%');
  root.style.setProperty('--primary', accent);
  root.style.setProperty('--primary-foreground', '0 0% 100%');
  root.style.setProperty('--secondary', '222 30% 16%');
  root.style.setProperty('--secondary-foreground', '210 40% 96%');
  root.style.setProperty('--muted', '222 30% 14%');
  root.style.setProperty('--muted-foreground', '215 20% 65%');
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-foreground', '0 0% 100%');
  root.style.setProperty('--destructive', '0 63% 50%');
  root.style.setProperty('--destructive-foreground', '0 0% 98%');
  root.style.setProperty('--border', '222 30% 18%');
  root.style.setProperty('--input', '222 30% 16%');
  root.style.setProperty('--ring', accent);

  root.style.setProperty('--sidebar-background', '222 47% 8%');
  root.style.setProperty('--sidebar-foreground', '210 40% 90%');
  root.style.setProperty('--sidebar-primary', accent);
  root.style.setProperty('--sidebar-primary-foreground', '0 0% 100%');
  root.style.setProperty('--sidebar-accent', '222 30% 14%');
  root.style.setProperty('--sidebar-accent-foreground', '210 40% 96%');
  root.style.setProperty('--sidebar-border', '222 30% 16%');
  root.style.setProperty('--sidebar-ring', accent);

  root.style.setProperty('--chart-1', accent);
  root.style.setProperty('--chart-2', '170 40% 50%');
  root.style.setProperty('--chart-3', '200 30% 55%');
  root.style.setProperty('--chart-4', '40 50% 60%');
  root.style.setProperty('--chart-5', '25 55% 60%');

  if (s.font_heading) {
    ensureFontLoaded(s.font_heading);
    root.style.setProperty('--font-heading', `'${s.font_heading}', ui-sans-serif, system-ui, sans-serif`);
  }
  if (s.font_body) {
    ensureFontLoaded(s.font_body);
    root.style.setProperty('--font-body', `'${s.font_body}', ui-sans-serif, system-ui, sans-serif`);
  }
  if (s.card_radius != null) {
    root.style.setProperty('--radius', `${s.card_radius / 16}rem`);
  }
}