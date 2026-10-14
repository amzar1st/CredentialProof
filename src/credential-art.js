// Decorative vector artwork: never a registry record or verification result.
export const credentialArt = `
<figure class="credential-art" aria-label="Animated illustration of an evidence-backed credential">
  <div class="art-parallax"><div class="art-float">
    <svg viewBox="0 0 480 360" role="img" aria-labelledby="credential-art-title">
      <title id="credential-art-title">A credential document connected to public evidence and validator nodes</title>
      <defs>
        <linearGradient id="art-paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffef8"/><stop offset="1" stop-color="#e6efdc"/></linearGradient>
        <linearGradient id="art-seal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8cae50"/><stop offset="1" stop-color="#234e3a"/></linearGradient>
      </defs>
      <ellipse cx="245" cy="308" rx="130" ry="15" fill="#d8e3cd" opacity=".5"/>
      <circle cx="240" cy="171" r="151" fill="#e9efdf" opacity=".7"/>
      <ellipse class="art-orbit" cx="240" cy="171" rx="210" ry="104" fill="none" stroke="#a8bc8f" stroke-dasharray="3 9"/>
      <ellipse cx="240" cy="171" rx="177" ry="139" fill="none" stroke="#d1ddbf"/>
      <g class="art-nodes">
        <path d="M69 183L160 126M339 114L414 83M326 247L406 264" stroke="#9db681" stroke-width="1.5" stroke-dasharray="4 5"/>
        <g class="art-node art-node-one"><rect x="36" y="153" width="62" height="62" rx="18" fill="#f9fcf3" stroke="#b6c99d"/><path d="M54 173h26M54 182h26M54 191h17" stroke="#628246" stroke-width="3" stroke-linecap="round"/></g>
        <g class="art-node art-node-two"><rect x="383" y="52" width="60" height="60" rx="18" fill="#214c3b"/><path d="M404 72l-7 9 7 9M422 72l7 9-7 9M416 70l-6 22" fill="none" stroke="#d1e6ac" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g class="art-node art-node-three"><circle cx="406" cy="264" r="28" fill="#f9fcf3" stroke="#b6c99d"/><path d="M395 264l7 7 15-16" fill="none" stroke="#658947" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>
      </g>
      <g transform="rotate(-8 240 171)">
        <rect x="145" y="59" width="202" height="246" rx="19" fill="#b7cba2" opacity=".35"/>
        <rect x="132" y="47" width="202" height="246" rx="19" fill="url(#art-paper)" stroke="#b3c69c"/>
        <path d="M151 75h163" stroke="#e0e8d5"/>
        <circle cx="159" cy="69" r="4" fill="#648642"/><circle cx="173" cy="69" r="4" fill="#a8bc8b"/><circle cx="187" cy="69" r="4" fill="#d0dcbc"/>
        <text x="154" y="110" fill="#6f825f" font-size="9" font-family="sans-serif" letter-spacing="2">CREDENTIAL PROOF</text>
        <text x="154" y="143" fill="#244e3b" font-size="24" font-family="Georgia, serif">Work with proof.</text>
        <path d="M155 167h132M155 179h105M155 191h120" stroke="#bdccab" stroke-width="5" stroke-linecap="round"/>
        <rect x="154" y="221" width="84" height="24" rx="12" fill="#e5eed6"/>
        <text x="165" y="237" fill="#638342" font-size="9" font-family="sans-serif" letter-spacing=".8">PUBLIC EVIDENCE</text>
        <path d="M155 263h75" stroke="#9bb484" stroke-width="2" stroke-linecap="round"/>
      </g>
      <g class="art-seal">
        <circle cx="316" cy="241" r="48" fill="#dce9c5" opacity=".65" class="art-pulse"/>
        <path d="M316 195l12 7 14 1 6 13 10 10-4 14 1 14-12 8-8 12-14-2-14 4-10-10-13-6-1-14-7-12 7-12 1-14 13-6 10-10z" fill="url(#art-seal)"/>
        <circle cx="316" cy="236" r="28" fill="none" stroke="#b9d594" opacity=".7"/>
        <path d="M302 236l10 10 20-23" fill="none" stroke="#f4ffe7" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <circle cx="112" cy="82" r="5" fill="#9fba6c"/><circle cx="361" cy="317" r="4" fill="#7d9b53"/>
    </svg>
  </div></div>
  <figcaption>Illustration · evidence connected to your work</figcaption>
</figure>`;

export function animateCredentialArt() {
  const art = document.querySelector('.credential-art');
  if (!art) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled = false;
  const update = () => {
    scheduled = false;
    const progress = preference.matches ? 0 : Math.min(1, Math.max(0, window.scrollY / 650));
    art.style.setProperty('--art-scroll-y', `${-progress * 48}px`);
    art.style.setProperty('--art-scroll-turn', `${progress * 6}deg`);
    art.style.setProperty('--art-node-y', `${progress * 22}px`);
  };
  const schedule = () => {
    if (!scheduled) { scheduled = true; window.requestAnimationFrame(update); }
  };
  window.addEventListener('scroll', schedule, { passive: true });
  preference.addEventListener('change', schedule);
  update();
}
