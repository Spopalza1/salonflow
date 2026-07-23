import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { url } = await req.json();
    if (!url) return Response.json({ error: 'URL is required' }, { status: 400 });

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch website (HTTP ' + response.status + ')' }, { status: 502 });
    }

    const html = await response.text();
    const hexColors = [];

    const colorRegex = /#([0-9a-fA-F]{6})\b/g;
    let match;
    while ((match = colorRegex.exec(html)) !== null) {
      hexColors.push('#' + match[1].toLowerCase());
    }

    const rgbRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
    while ((match = rgbRegex.exec(html)) !== null) {
      const hex = '#' + [match[1], match[2], match[3]]
        .map(function(n) { return parseInt(n).toString(16).padStart(2, '0'); })
        .join('');
      hexColors.push(hex);
    }

    const skipColors = ['#000000', '#ffffff'];
    const colorCounts = {};
    hexColors.forEach(function(c) {
      if (skipColors.indexOf(c) !== -1) return;
      colorCounts[c] = (colorCounts[c] || 0) + 1;
    });
    const sortedColors = Object.entries(colorCounts)
      .sort(function(a, b) { return b[1] - a[1]; })
      .map(function(c) { return c[0]; });

    const fontRegex = /font-family\s*:\s*([^;}"']+)/g;
    const fonts = [];
    while ((match = fontRegex.exec(html)) !== null) {
      const font = match[1].split(',')[0].trim().replace(/['"]/g, '');
      if (font && ['inherit', 'initial', 'serif', 'sans-serif', 'monospace'].indexOf(font.toLowerCase()) === -1) {
        fonts.push(font);
      }
    }
    const fontCounts = {};
    fonts.forEach(function(f) { fontCounts[f] = (fontCounts[f] || 0) + 1; });
    const sortedFonts = Object.entries(fontCounts)
      .sort(function(a, b) { return b[1] - a[1]; })
      .map(function(f) { return f[0]; });

    const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const siteName = titleMatch ? titleMatch[1].trim().slice(0, 60) : null;

    const primaryColor = sortedColors[0] || (themeColorMatch ? themeColorMatch[1] : '#000000');
    const secondaryColor = sortedColors[1] || '#333333';
    const accentColor = sortedColors[2] || sortedColors[0] || '#666666';
    const headingFont = sortedFonts[0] || 'Inter';
    const bodyFont = sortedFonts[0] || 'Inter';

    return Response.json({
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
      font_heading: headingFont,
      font_body: bodyFont,
      card_background_color: '#ffffff',
      card_border_color: '#e5e7eb',
      site_name: siteName,
      all_colors: sortedColors.slice(0, 10),
      all_fonts: sortedFonts.slice(0, 5),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});