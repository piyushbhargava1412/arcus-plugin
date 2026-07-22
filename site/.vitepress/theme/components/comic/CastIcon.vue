<script setup lang="ts">
// The ARCUS team. Five humans share one template (peach skin, circle head,
// rounded torso) differentiated only by hair silhouette, top color, and one
// signature prop — so they read as a real team, not seven unrelated designs.
// Benny (a bot) and Genie (a sprite) are deliberately off-template: they are
// not people on the roster, and should look it at a glance.
type CastName = 'lucie' | 'angelina' | 'quinn' | 'diana' | 'steffi' | 'benny' | 'genie' | 'doc' | 'star'

defineProps<{
  name: CastName
  viewBox?: string
}>()
</script>

<template>
  <svg :viewBox="viewBox ?? '-6 -4 98 96'" aria-hidden="true">
    <!-- Lucie — Lead. Headset, clipboard, coral. -->
    <g v-if="name === 'lucie'">
      <path d="M20 88 Q16 60 24 48 Q34 42 44 42 Q54 42 62 49 Q70 60 66 88 Z" fill="#d1372a"/>
      <circle cx="43" cy="26" r="19" fill="#f0c9a0"/>
      <path d="M24 22 Q26 4 43 4 Q62 4 63 22 Q63 12 43 12 Q26 12 24 22 Z" fill="#4a2e1a"/>
      <path d="M22 20 Q20 34 25 40 Q22 30 24 20 Z" fill="#4a2e1a"/>
      <circle cx="65" cy="30" r="6" fill="#4a2e1a"/>
      <circle cx="36" cy="27" r="3.2" fill="#1b2013"/><circle cx="50" cy="27" r="3.2" fill="#1b2013"/>
      <path d="M37 35 q6 4 12 0" stroke="#8a5230" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M18 14 Q43 -6 68 14" stroke="#241a10" stroke-width="3" fill="none"/>
      <path d="M18 14 q-4 2 -4 8 M68 14 q4 2 4 8" stroke="#241a10" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M64 24 q6 0 6 6" stroke="#241a10" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <g transform="translate(6 62) rotate(-6)">
        <rect width="20" height="26" rx="2" fill="#fffaf0" stroke="#241a10" stroke-width="2"/>
        <path d="M4 8 h12 M4 14 h12 M4 20 h8" stroke="#c9b896" stroke-width="1.6"/>
      </g>
    </g>

    <!-- Angelina — Architect. Glasses, blueprint scroll, navy. -->
    <g v-else-if="name === 'angelina'">
      <path d="M20 88 Q16 60 24 48 Q34 42 44 42 Q54 42 62 49 Q70 60 66 88 Z" fill="#3a5a8a"/>
      <circle cx="43" cy="26" r="19" fill="#f0c9a0"/>
      <path d="M22 24 Q20 4 43 4 Q66 4 64 24 Q60 8 43 8 Q26 8 22 24 Z" fill="#1b1410"/>
      <path d="M22 22 Q18 36 24 44 Q20 32 24 22 Z" fill="#1b1410"/>
      <path d="M64 22 Q68 36 62 44 Q66 32 62 22 Z" fill="#1b1410"/>
      <circle cx="36" cy="28" r="6" fill="none" stroke="#241a10" stroke-width="2"/>
      <circle cx="50" cy="28" r="6" fill="none" stroke="#241a10" stroke-width="2"/>
      <path d="M42 28 h2" stroke="#241a10" stroke-width="2"/>
      <circle cx="36" cy="28" r="2.6" fill="#1b2013"/><circle cx="50" cy="28" r="2.6" fill="#1b2013"/>
      <path d="M37 36 q6 3 12 0" stroke="#8a5230" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <g transform="translate(4 56) rotate(-18)">
        <rect width="14" height="34" rx="6" fill="#f3e6cd" stroke="#241a10" stroke-width="2"/>
        <path d="M2 14 h10 M2 22 h10" stroke="#8a5a2b" stroke-width="1.4"/>
      </g>
    </g>

    <!-- Quinn — QA. Magnifying glass, checklist, green. -->
    <g v-else-if="name === 'quinn'">
      <path d="M20 88 Q16 60 24 48 Q34 42 44 42 Q54 42 62 49 Q70 60 66 88 Z" fill="#2e9e5b"/>
      <circle cx="43" cy="26" r="19" fill="#f0c9a0"/>
      <path d="M23 22 Q30 4 43 5 Q56 4 63 22 Q58 10 43 10 Q28 10 23 22 Z" fill="#a04a1e"/>
      <path d="M23 20 Q20 30 25 34" stroke="#a04a1e" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M63 20 Q66 30 61 34" stroke="#a04a1e" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="36" cy="27" r="3.2" fill="#1b2013"/><circle cx="50" cy="27" r="3.2" fill="#1b2013"/>
      <path d="M36 35 q7 5 14 0" stroke="#8a5230" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <g transform="translate(60 58) rotate(20)">
        <circle cx="8" cy="8" r="8" fill="rgba(230,245,235,.5)" stroke="#241a10" stroke-width="2.5"/>
        <path d="M14 14 l10 10" stroke="#241a10" stroke-width="3.5" stroke-linecap="round"/>
      </g>
      <g transform="translate(6 60) rotate(-8)">
        <rect width="18" height="24" rx="2" fill="#fffaf0" stroke="#241a10" stroke-width="2"/>
        <path d="M4 7 l2 2 l4 -4" stroke="#2e9e5b" stroke-width="1.6" fill="none"/>
        <path d="M4 15 l2 2 l4 -4" stroke="#2e9e5b" stroke-width="1.6" fill="none"/>
      </g>
    </g>

    <!-- Diana — Developer. Hoodie up, laptop, violet. -->
    <g v-else-if="name === 'diana'">
      <path d="M18 88 Q14 58 24 46 Q34 40 44 40 Q54 40 64 46 Q74 58 70 88 Z" fill="#6a4fae"/>
      <path d="M20 46 Q14 30 20 16 Q30 2 44 2 Q58 2 68 16 Q74 30 68 46 Q66 26 44 24 Q22 26 20 46 Z" fill="#5a3f96"/>
      <circle cx="44" cy="30" r="17" fill="#f0c9a0"/>
      <circle cx="37" cy="31" r="3" fill="#1b2013"/><circle cx="51" cy="31" r="3" fill="#1b2013"/>
      <path d="M38 39 q6 3 12 0" stroke="#8a5230" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M25 14 q19 -6 38 0" stroke="#4a3480" stroke-width="4" fill="none" stroke-linecap="round"/>
      <g transform="translate(14 62) rotate(-6)">
        <rect width="30" height="20" rx="2" fill="#3a2818" stroke="#241a10" stroke-width="2"/>
        <rect x="3" y="3" width="24" height="12" rx="1" fill="#9fc9e8"/>
      </g>
    </g>

    <!-- Steffi — Staff Engineer (reviewer). Glasses, red pen, wine. -->
    <g v-else-if="name === 'steffi'">
      <path d="M20 88 Q16 60 24 48 Q34 42 44 42 Q54 42 62 49 Q70 60 66 88 Z" fill="#8a2e3a"/>
      <circle cx="43" cy="26" r="19" fill="#f0c9a0"/>
      <path d="M23 24 Q21 4 43 4 Q65 4 63 24 Q64 10 43 9 Q22 10 23 24 Z" fill="#d8b23a"/>
      <circle cx="43" cy="8" r="6" fill="#d8b23a"/>
      <rect x="27" y="24" width="18" height="9" rx="4" fill="none" stroke="#241a10" stroke-width="2"/>
      <rect x="43" y="24" width="18" height="9" rx="4" fill="none" stroke="#241a10" stroke-width="2"/>
      <path d="M45 28 h-2" stroke="#241a10" stroke-width="2"/>
      <circle cx="36" cy="28.5" r="2.6" fill="#1b2013"/><circle cx="50" cy="28.5" r="2.6" fill="#1b2013"/>
      <path d="M37 37 q6 2.5 12 0" stroke="#8a5230" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <g transform="translate(62 56) rotate(28)">
        <rect width="6" height="30" rx="2" fill="#d1372a" stroke="#241a10" stroke-width="1.8"/>
        <path d="M0 26 l3 6 l3 -6 Z" fill="#241a10"/>
      </g>
    </g>

    <!-- Benny-the-bot — deterministic gate. Boxy, off-template on purpose. -->
    <g v-else-if="name === 'benny'">
      <rect x="14" y="30" width="58" height="50" rx="8" fill="#9aa0a6" stroke="#4a4f54" stroke-width="2.5"/>
      <rect x="24" y="40" width="38" height="26" rx="5" fill="#1b2013"/>
      <circle cx="35" cy="53" r="5" fill="#7fe0ff"/><circle cx="53" cy="53" r="5" fill="#7fe0ff"/>
      <rect x="34" y="70" width="16" height="6" rx="3" fill="#7fe0ff"/>
      <rect x="4" y="44" width="8" height="18" rx="3" fill="#9aa0a6" stroke="#4a4f54" stroke-width="2"/>
      <rect x="74" y="44" width="8" height="18" rx="3" fill="#9aa0a6" stroke="#4a4f54" stroke-width="2"/>
      <path d="M43 30 v-10" stroke="#4a4f54" stroke-width="3" stroke-linecap="round"/>
      <circle cx="43" cy="16" r="5" fill="#2e9e5b" stroke="#4a4f54" stroke-width="2"/>
      <rect x="18" y="80" width="16" height="8" rx="2" fill="#4a4f54"/>
      <rect x="52" y="80" width="16" height="8" rx="2" fill="#4a4f54"/>
    </g>

    <!-- Genie — Guide. Lamp-smoke base, off-template on purpose (the narrator, not the roster). -->
    <g v-else-if="name === 'genie'">
      <path d="M44 88 Q20 78 24 58 Q28 42 44 40 Q60 42 64 58 Q68 78 44 88 Z" fill="url(#genie-swirl)"/>
      <defs>
        <linearGradient id="genie-swirl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8a6fd6"/>
          <stop offset="1" stop-color="#3a5a8a"/>
        </linearGradient>
      </defs>
      <circle cx="44" cy="24" r="18" fill="#c9b8f0"/>
      <path d="M26 20 Q28 2 44 2 Q60 2 62 20" fill="none" stroke="#5a3f96" stroke-width="3"/>
      <circle cx="37" cy="24" r="3" fill="#1b2013"/><circle cx="51" cy="24" r="3" fill="#1b2013"/>
      <path d="M37 32 q7 4 14 0" stroke="#5a3f96" stroke-width="2" fill="none" stroke-linecap="round"/>
      <g transform="translate(58 66) rotate(-10)" fill="#f3c14a" stroke="#8a5a2b" stroke-width="1.4">
        <rect width="16" height="9" rx="2"/>
        <path d="M14 4 q6 0 6 -4"/>
      </g>
      <g fill="#f3c14a">
        <circle cx="14" cy="20" r="2.2"/><circle cx="76" cy="30" r="2.6"/><circle cx="20" cy="52" r="1.8"/>
      </g>
    </g>

    <g v-else-if="name === 'doc'">
      <rect x="4" y="4" width="40" height="52" rx="3" fill="#fdf6e3" stroke="#241a10" stroke-width="2.5"/>
      <path d="M11 16 h26 M11 24 h26 M11 32 h18 M11 40 h22" stroke="#a08c72" stroke-width="2.5" stroke-linecap="round"/>
    </g>

    <g v-else-if="name === 'star'">
      <path d="M29 2 l6 12 13 -6 -4 13 14 4 -12 8 8 12 -14 -2 -1 14 -10 -10 -10 10 -1 -14 -14 2 8 -12 -12 -8 14 -4 -4 -13 13 6 Z"
            fill="#d1372a" stroke="#241a10" stroke-width="2.5" stroke-linejoin="round"/>
      <text x="29" y="34" text-anchor="middle" font-family="Arial Narrow, Impact, sans-serif" font-weight="800" font-size="13" fill="#fff">FACT</text>
    </g>
  </svg>
</template>
