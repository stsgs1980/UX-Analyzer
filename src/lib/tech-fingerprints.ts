/**
 * Extract technical fingerprints from raw HTML.
 * Used for reverse engineering the tech stack without source code access.
 */

export interface TechFingerprints {
  /** External script sources */
  scripts: string[];
  /** External stylesheet links */
  stylesheets: string[];
  /** Meta tags (generator, viewport, etc.) */
  metaTags: Record<string, string>;
  /** Inline data (NEXT_DATA, NUXT, etc.) */
  inlineData: string[];
  /** Class name patterns */
  classPatterns: string[];
  /** Data attributes on body/root */
  dataAttrs: string[];
  /** Raw head content (truncated) */
  headSnippet: string;
}

const KNOWN_LIBS: Record<string, RegExp> = {
  "React": /react|react-dom|_next\/static|__NEXT_DATA__/i,
  "Next.js": /_next|next-route-announcer|__NEXT_DATA__/i,
  "Vue": /vue|nuxt|__NUXT__/i,
  "Nuxt": /nuxt|_nuxt|__NUXT__/i,
  "Angular": /angular|ng-|ng-version/i,
  "Svelte": /svelte|__svelte/i,
  "Astro": /astro/i,
  "Remix": /remix|__remix/i,
  "Gatsby": /gatsby/i,
  "Tailwind CSS": /tailwind/i,
  "Bootstrap": /bootstrap/i,
  "shadcn/ui": /shadcn|radix-ui/i,
  "Radix UI": /radix-ui/i,
  "Framer Motion": /framer-motion|motion/i,
  "GSAP": /gsap|greensock/i,
  "Three.js": /three/i,
  "Chart.js": /chart\.js/i,
  "D3.js": /d3/i,
  "Alpine.js": /alpine/i,
  "HTMX": /htmx/i,
  "jQuery": /jquery/i,
  "WordPress": /wp-content|wp-includes|wordpress/i,
  "Shopify": /shopify|cdn\.shopify/i,
  "Webflow": /webflow/i,
  "Wix": /wix/i,
  "Vercel Analytics": /vercel-analytics|_vercel/i,
  "Google Analytics": /gtag|google-analytics|ga\(/i,
  "Yandex.Metrika": /ym|metrika|yaCounter/i,
  "Cloudflare": /cloudflare/i,
  "Stripe": /stripe/i,
  "Prism": /prism/i,
};

export function extractTechFingerprints(html: string): TechFingerprints {
  const scripts: string[] = [];
  const stylesheets: string[] = [];
  const metaTags: Record<string, string> = {};
  const inlineData: string[] = [];
  const classPatterns: string[] = [];
  const dataAttrs: string[] = [];

  // 1. External scripts
  const scriptSrcs = html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const m of scriptSrcs) scripts.push(m[1]);

  // 2. External stylesheets
  const linkHrefs = html.matchAll(/<link[^>]+href=["']([^"']+\.(?:css|scss|less))["'][^>]*>/gi);
  for (const m of linkHrefs) stylesheets.push(m[1]);

  // Also capture link rel="stylesheet" without explicit .css extension
  const styleLinks = html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi);
  for (const m of styleLinks) {
    if (!stylesheets.includes(m[1])) stylesheets.push(m[1]);
  }

  // 3. Meta tags
  const metas = html.matchAll(/<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi);
  for (const m of metas) metaTags[m[1]] = m[2];
  // Also reversed attribute order
  const metasRev = html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']([^"']+)["'][^>]*>/gi);
  for (const m of metasRev) metaTags[m[2]] = m[1];

  // 4. Inline framework data
  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) inlineData.push(`__NEXT_DATA__: ${nextDataMatch[1].substring(0, 500)}`);

  const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*([\s\S]*?)(?:<\/script>|$)/i);
  if (nuxtMatch) inlineData.push(`__NUXT__: ${nuxtMatch[1].substring(0, 300)}`);

  // 5. Class patterns (sample from body)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]{0,5000})/i);
  if (bodyMatch) {
    const bodyClasses = bodyMatch[0].matchAll(/class=["']([^"']+)["']/gi);
    const allClasses = new Set<string>();
    for (const m of bodyClasses) {
      for (const cls of m[1].split(/\s+/)) allClasses.add(cls);
    }
    // Detect patterns
    if (allClasses.has("flex")) classPatterns.push("flexbox utility");
    if (allClasses.has("grid")) classPatterns.push("grid utility");
    if (Array.from(allClasses).some(c => /^(?:p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|gap|space|text-|bg-|border-|rounded-|shadow-|w-|h-|min-w-|max-w-|min-h-|max-h-)/.test(c))) {
      classPatterns.push("Tailwind-like utility classes");
    }
    if (Array.from(allClasses).some(c => /^(?:container|row|col|btn|navbar|card|alert|modal)/.test(c))) {
      classPatterns.push("Bootstrap-like BEM/component classes");
    }
    // Sample some actual classes
    const sampleClasses = Array.from(allClasses).slice(0, 30);
    if (sampleClasses.length > 0) classPatterns.push(`sample: ${sampleClasses.join(" ")}`);
  }

  // 6. Data attributes
  const dataAttrMatches = html.matchAll(/data-([\w-]+)=["']([^"']+)["']/gi);
  const dataAttrSet = new Set<string>();
  for (const m of dataAttrMatches) dataAttrSet.add(`data-${m[1]}`);
  dataAttrs.push(...Array.from(dataAttrSet).slice(0, 20));

  // 7. Head snippet (first 1500 chars of <head>)
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headSnippet = headMatch
    ? headMatch[1].substring(0, 1500).replace(/\s+/g, " ").trim()
    : "";

  return { scripts, stylesheets, metaTags, inlineData, classPatterns, dataAttrs, headSnippet };
}

export function detectLibraries(fp: TechFingerprints): Array<{ name: string; evidence: string }> {
  const detected: Array<{ name: string; evidence: string }> = [];
  const allText = [
    ...fp.scripts, ...fp.stylesheets, fp.headSnippet,
    ...Object.values(fp.metaTags), ...fp.inlineData,
  ].join(" ");

  for (const [name, regex] of Object.entries(KNOWN_LIBS)) {
    if (regex.test(allText)) {
 // Find evidence
      let evidence = "";
      const inScripts = fp.scripts.find(s => regex.test(s));
      if (inScripts) evidence = `script: ${inScripts}`;
      else {
        const inStyles = fp.stylesheets.find(s => regex.test(s));
        if (inStyles) evidence = `style: ${inStyles}`;
        else {
          const inMeta = Object.entries(fp.metaTags).find(([, v]) => regex.test(v));
          if (inMeta) evidence = `meta ${inMeta[0]}: ${inMeta[1]}`;
          else evidence = "pattern detected in HTML";
        }
      }
      detected.push({ name, evidence });
    }
  }

  return detected;
}

export function formatFingerprintsForPrompt(fp: TechFingerprints): string {
  const lines: string[] = ["ТЕХНИЧЕСКИЕ ДАННЫЕ ИЗ HTML (для reverse engineering):\n"];

  // Detected libraries
  const detected = detectLibraries(fp);
  if (detected.length > 0) {
    lines.push("Обнаруженные библиотеки и фреймворки:");
    for (const d of detected) {
      lines.push(`- ${d.name}: ${d.evidence}`);
    }
    lines.push("");
  }

  if (fp.scripts.length > 0) {
    lines.push(`Внешние скрипты (${fp.scripts.length}):`);
    fp.scripts.slice(0, 20).forEach(s => lines.push(`  - ${s}`));
    lines.push("");
  }

  if (fp.stylesheets.length > 0) {
    lines.push(`Внешние стили (${fp.stylesheets.length}):`);
    fp.stylesheets.slice(0, 15).forEach(s => lines.push(`  - ${s}`));
    lines.push("");
  }

  if (fp.inlineData.length > 0) {
    lines.push("Inline data:");
    fp.inlineData.forEach(d => lines.push(`  - ${d}`));
    lines.push("");
  }

  if (fp.classPatterns.length > 0) {
    lines.push("Паттерны CSS-классов:");
    fp.classPatterns.forEach(p => lines.push(`  - ${p}`));
    lines.push("");
  }

  if (fp.dataAttrs.length > 0) {
    lines.push(`Data-атрибуты: ${fp.dataAttrs.join(", ")}`);
    lines.push("");
  }

  // Meta tags of interest
  const interestingMeta = ["generator", "framework", "cms", "viewport", "theme-color", "next-head-count"];
  const relevantMeta = Object.entries(fp.metaTags).filter(([k]) =>
    interestingMeta.some(im => k.toLowerCase().includes(im))
  );
  if (relevantMeta.length > 0) {
    lines.push("Ключевые meta-теги:");
    for (const [k, v] of relevantMeta) lines.push(`  - ${k}: ${v}`);
    lines.push("");
  }

  return lines.join("\n");
}
