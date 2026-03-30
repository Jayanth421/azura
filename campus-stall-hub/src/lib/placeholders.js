export const CATEGORY_GRADIENTS = {
  Food: ['#2563eb', '#7c3aed'],
  Games: ['#0ea5e9', '#22c55e'],
  Crafts: ['#f97316', '#ec4899'],
  Tech: ['#334155', '#2563eb'],
  Books: ['#14b8a6', '#2563eb'],
  Services: ['#a855f7', '#0ea5e9'],
  Other: ['#64748b', '#0ea5e9'],
}

export function getCategoryGradient(category) {
  const key = String(category || 'Other')
  const [from, to] = CATEGORY_GRADIENTS[key] ?? CATEGORY_GRADIENTS.Other
  return { from, to }
}

function escapeXml(unsafe) {
  return String(unsafe)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function placeholderImageDataUrl({ title, category }) {
  const safeTitle = escapeXml(title || 'Campus Stall')
  const safeCategory = escapeXml(category || 'Stall')
  const { from, to } = getCategoryGradient(safeCategory)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}" />
      <stop offset="1" stop-color="${to}" />
    </linearGradient>
    <radialGradient id="r" cx="30%" cy="10%" r="60%">
      <stop offset="0" stop-color="rgba(255,255,255,0.6)" />
      <stop offset="1" stop-color="rgba(255,255,255,0)" />
    </radialGradient>
  </defs>
  <rect width="1200" height="720" fill="url(#g)"/>
  <rect width="1200" height="720" fill="url(#r)"/>
  <g opacity="0.18">
    <circle cx="980" cy="120" r="130" fill="#fff" />
    <circle cx="1080" cy="190" r="60" fill="#fff" />
    <rect x="820" y="420" width="220" height="220" rx="44" fill="#fff" transform="rotate(10 930 530)" />
  </g>
  <g opacity="0.22" fill="#fff">
    <rect x="980" y="500" width="26" height="110" rx="13" />
    <rect x="938" y="542" width="110" height="26" rx="13" />
    <rect x="210" y="520" width="18" height="76" rx="9" />
    <rect x="181" y="549" width="76" height="18" rx="9" />
  </g>
  <g fill="rgba(255,255,255,0.92)" font-family="'Plus Jakarta Sans',ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto" >
    <text x="64" y="108" font-size="30" font-weight="700" opacity="0.92">${safeCategory}</text>
    <text x="64" y="170" font-size="52" font-weight="800">${safeTitle}</text>
    <text x="64" y="214" font-size="22" font-weight="600" opacity="0.9">Azera</text>
  </g>
</svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
