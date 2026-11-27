export const newGradientLabPatterns = [
  {
    id: 'cosmic-glow', label: 'Kozmikus derengés', shape: 0,
    defaults: {
      colors: ['#07080d', '#3134f1', '#7c40f2', '#f02b5e', '#c9c2ff'],
      phase: 584.142, scale: 1.1, seed: 1.3, intensity: 1.35,
    },
  },
  {
    id: 'jade-beam', label: 'Átlós jádefény', shape: 4,
    defaults: {
      colors: ['#031210', '#2de2a6', '#0a8f7a', '#d6ffe9', '#ffffff'],
      phase: 640.673, scale: 1.1, warp: 1.7, seed: 2.9,
    },
  },
  {
    id: 'coral-halo', label: 'Korallfény', shape: 5,
    defaults: {
      colors: ['#12080a', '#ff9a76', '#ff5f6d', '#ffd3a5', '#fff6ef'],
      phase: 645.64, warp: 1.8, seed: 8.1, intensity: 1.15,
    },
  },
  {
    id: 'violet-ribbons', label: 'Lila fényszalagok', shape: 6,
    defaults: {
      colors: ['#05040d', '#4e3df2', '#b03cf2', '#19c3ff', '#e9e4ff'],
      phase: 650.113, scale: 1.1, seed: 3.8,
    },
  },
  {
    id: 'amber-canopy', label: 'Felső borostyánfény', shape: 7,
    defaults: {
      colors: ['#0b0605', '#ffb347', '#ff6f61', '#fff0c9', '#ffffff'],
      phase: 663.706, scale: 1.1, seed: 5.1, intensity: 1.25,
    },
  },
  {
    id: 'pearl-ring', label: 'Gyöngyház fénygyűrű', shape: 10,
    defaults: {
      colors: ['#cfcfcd', '#f2f2f0', '#ffffff', '#e2e2e0', '#ffffff'],
      speed: 0.4, phase: 645.814, scale: 1, warp: 1.2, seed: 1.4, vignette: 0, grain: 0.05,
    },
  },
  {
    id: 'sunset-field', label: 'Naplemente színmező', shape: 9,
    defaults: {
      colors: ['#f26b3a', '#f4683c', '#f7c04a', '#ee5a4f', '#7b8cf0'],
      speed: 0.35, phase: 571.64, scale: 0.5, seed: 3.7, intensity: 1.08, vignette: 0, grain: 0.05,
    },
  },
];

export const newGradientLabStyles = {
  0: [
    {
      id: 'ember-light', label: 'Parázsfény',
      defaults: {
        colors: ['#0a0503', '#ff5a1f', '#b3122e', '#ffc07a', '#fff1dc'],
        phase: 603.438, warp: 1.7, seed: 7.7, intensity: 1.25,
      },
    },
    {
      id: 'midnight-glow', label: 'Éjkék derengés',
      defaults: {
        colors: ['#010205', '#1e3a8a', '#0f172a', '#3b82f6', '#e0e7ff'],
        speed: 0.4, phase: 559.356, scale: 1.1, seed: 9.1, intensity: 1.3,
      },
    },
    {
      id: 'peach-prism', label: 'Barackszínű prizma',
      defaults: {
        colors: ['#0d0614', '#ff7e5f', '#7b4397', '#feb47b', '#fff2e6'],
        phase: 813.385, scale: 1.15, seed: 4.4, intensity: 1.3, refraction: true, bands: 100, bandStrength: 0.12,
        bandShade: 0.45,
      },
    },
  ],
  1: [
    {
      id: 'emerald-wave', label: 'Smaragdhullám',
      defaults: {
        colors: ['#03100b', '#14b37a', '#0b6a73', '#b8ff6a', '#e8fff4'],
        speed: 0.5, phase: 542.325, scale: 1.1, warp: 1.8, seed: 4.1,
      },
    },
    {
      id: 'cyan-wave', label: 'Cián hullám',
      defaults: {
        colors: ['#021014', '#00b4d8', '#0077b6', '#90e0ef', '#e9fbff'],
        speed: 0.5, phase: 629.349, scale: 1.1, warp: 1.7, seed: 2.6,
      },
    },
    {
      id: 'burgundy-wave', label: 'Bordó hullám',
      defaults: {
        colors: ['#0b0206', '#9d174d', '#4c0519', '#f43f5e', '#ffe4e6'],
        speed: 0.45, phase: 599.267, scale: 1.1, seed: 6.1,
      },
    },
    {
      id: 'green-stripes-late', label: 'Zöld fénycsíkok II.',
      defaults: {
        colors: ['#03100b', '#14b37a', '#0b6a73', '#b8ff6a', '#e8fff4'],
        speed: 0.5, phase: 726.386, scale: 1.1, warp: 1.8, seed: 4.1, refraction: true, bands: 86,
        bandStrength: 0.1, bandShade: 0.4,
      },
    },
    {
      id: 'mint-rose-wave', label: 'Menta és rózsafény',
      defaults: {
        colors: ['#0b0f2a', '#4df0c0', '#2bd9a8', '#e04fb0', '#ffe0a8'],
        speed: 0.45, phase: 750.507, scale: 0.8, warp: 1.5, seed: 2.2, intensity: 1.2, vignette: 0.2, grain: 0.06,
      },
    },
    {
      id: 'blue-prism-late', label: 'Kék prizma II.',
      defaults: {
        colors: ['#18181b', '#3b82f6', '#a5b4fc', '#93c5fd', '#ddd6fe'],
        speed: 0.3, phase: 513.98, scale: 0.9, seed: 8.6, vignette: 0.3, grain: 0.06, refraction: true,
        bandStrength: 0.12, bandAngle: 10,
      },
    },
  ],
  2: [
    {
      id: 'ocean-mist', label: 'Óceáni köd',
      defaults: {
        colors: ['#020611', '#0c4a8a', '#22c1d6', '#5b2bd6', '#d9fbff'],
        speed: 0.45, phase: 498.065, scale: 1, seed: 2.2,
      },
    },
    {
      id: 'graphite-mist', label: 'Grafitköd',
      defaults: {
        colors: ['#0a0a0a', '#3a3a3a', '#8a8a8a', '#e6e6e6', '#ffffff'],
        speed: 0.4, phase: 498.571, scale: 1, warp: 1.9, seed: 7.3, grain: 0.11,
      },
    },
    {
      id: 'lemon-lime-mist', label: 'Citrom és lime',
      defaults: {
        colors: ['#0b0a02', '#facc15', '#84cc16', '#fb923c', '#fffbe6'],
        phase: 704.909, scale: 1.05, warp: 1.7, seed: 1.1,
      },
    },
    {
      id: 'olive-mist', label: 'Olivaköd',
      defaults: {
        colors: ['#070b05', '#65a30d', '#a3e635', '#365314', '#f7fee7'],
        speed: 0.45, phase: 619.456, scale: 1, warp: 1.8, seed: 8.4,
      },
    },
  ],
  3: [
    {
      id: 'steel-blue-veil', label: 'Acélkék fátyol',
      defaults: {
        colors: ['#0b0d10', '#3e4a5a', '#a7b4c4', '#3a5a8c', '#eef2f7'],
        speed: 0.35, phase: 394.246, scale: 0.9, warp: 1.4, seed: 5.5, intensity: 0.9, grain: 0.07,
      },
    },
    {
      id: 'rose-dusk', label: 'Rózsaszín alkony',
      defaults: {
        colors: ['#100609', '#e8467c', '#ff9bb8', '#6a2cf5', '#fff0f5'],
        speed: 0.4, phase: 460.944, scale: 1, warp: 1.5, seed: 6.6, intensity: 1,
      },
    },
    {
      id: 'silver-blue-veil', label: 'Ezüstkék fátyol',
      defaults: {
        colors: ['#eef1f4', '#9fb4c7', '#c9d6df', '#7b93a8', '#ffffff'],
        speed: 0.35, phase: 457.624, scale: 0.95, warp: 1.5, seed: 3.6, intensity: 1, vignette: 0.06, grain: 0.06,
      },
    },
    {
      id: 'pastel-rainbow', label: 'Pasztell szivárvány',
      defaults: {
        colors: ['#fff7f3', '#ffb5a7', '#a0c4ff', '#caffbf', '#ffffff'],
        speed: 0.4, phase: 528.043, scale: 1, warp: 1.7, seed: 8.8, intensity: 1.05, vignette: 0.05, grain: 0.05,
      },
    },
  ],
  4: [
    {
      id: 'ice-blue-beam', label: 'Jégkék fénysáv',
      defaults: {
        colors: ['#04070d', '#8fd3ff', '#4f7cff', '#eef7ff', '#ffffff'],
        phase: 669.041, scale: 1, warp: 1.5, seed: 6.2,
      },
    },
    {
      id: 'copper-beam', label: 'Réz fénysáv',
      defaults: {
        colors: ['#0c0603', '#b45309', '#d97706', '#78350f', '#fde7c7'],
        phase: 738.101, scale: 1.1, seed: 2.4,
      },
    },
    {
      id: 'drifting-ice-beam', label: 'Sodródó jégsáv',
      defaults: {
        colors: ['#04070d', '#8fd3ff', '#4f7cff', '#eef7ff', '#ffffff'],
        phase: 804.63, scale: 1, warp: 1.5, seed: 6.2, refraction: true, bands: 72, bandStrength: 0.1,
        bandAngle: 120, bandSpeed: 1.2,
      },
    },
  ],
  5: [
    {
      id: 'blue-halo', label: 'Kék fényudvar',
      defaults: {
        colors: ['#02030c', '#1d4ed8', '#0ea5e9', '#6366f1', '#dbeafe'],
        phase: 698.315, scale: 1.1, seed: 7.9, intensity: 1.15,
      },
    },
    {
      id: 'magenta-halo', label: 'Bíbor fényudvar',
      defaults: {
        colors: ['#0c0410', '#c026d3', '#7c3aed', '#f472b6', '#fbe7ff'],
        phase: 713.574, seed: 5.7, intensity: 1.2,
      },
    },
    {
      id: 'electric-violet', label: 'Elektromos ibolya',
      defaults: {
        colors: ['#0a0614', '#910aff', '#af38ff', '#809bd6', '#e9dcff'],
        speed: 0.4, phase: 689.381, scale: 1.1, warp: 1.7, seed: 3.9, intensity: 1.2, vignette: 0.25, grain: 0.14,
      },
    },
  ],
  6: [
    {
      id: 'moss-lime-ribbons', label: 'Moha és lime',
      defaults: {
        colors: ['#040a06', '#3a7d44', '#9bc53d', '#e5f9b5', '#fbffe9'],
        speed: 0.45, phase: 553.501, scale: 1, seed: 1.9,
      },
    },
  ],
  7: [
    {
      id: 'violet-canopy', label: 'Ibolya felsőfény',
      defaults: {
        colors: ['#0a0410', '#5b21b6', '#a21caf', '#312e81', '#ede9fe'],
        phase: 762.754, scale: 1.1, seed: 7.1, intensity: 1.3,
      },
    },
  ],
  8: [
    {
      id: 'ice-prism', label: 'Jégkék prizma',
      defaults: {
        colors: ['#f1f4f8', '#7fb0f0', '#a9cbf7', '#5d92e0', '#2b5fb5'],
        speed: 0.4, phase: 568.17, scale: 0.75, warp: 2.1, seed: 6.4, intensity: 1.05, vignette: 0, grain: 0.06,
        refraction: true, bands: 92, bandStrength: 0.13, bandShade: 0.25, focusRadius: 0.7,
      },
    },
    {
      id: 'cobalt-stripes', label: 'Kobaltkék csíkok',
      defaults: {
        colors: ['#04060d', '#2f6fd0', '#3e52e8', '#7c40f2', '#dbe8ff'],
        speed: 0.4, phase: 573.484, scale: 0.8, warp: 2, seed: 3.1, intensity: 1.15, vignette: 0.2, grain: 0.08,
        refraction: true, bands: 112, bandStrength: 0.15, bandShade: 0.35,
      },
    },
    {
      id: 'ember-vortex', label: 'Parázsörvény',
      defaults: {
        colors: ['#0a0503', '#ff5a1f', '#e8324a', '#ff9a3d', '#fff1dc'],
        speed: 0.4, phase: 576.836, scale: 0.8, warp: 1.9, seed: 7.2, intensity: 1.15, vignette: 0.2, grain: 0.08,
        refraction: true, bands: 98, bandAngle: 155, focusRadius: 0.65,
      },
    },
    {
      id: 'silver-prism', label: 'Ezüstprizma',
      defaults: {
        colors: ['#060606', '#8c8c8c', '#d9d9d9', '#5a5a5a', '#ffffff'],
        speed: 0.4, phase: 595.56, scale: 0.9, warp: 2.2, seed: 4.7, intensity: 1.3, vignette: 0.15, grain: 0.06,
        refraction: true, bands: 24, bandStrength: 0.16, dispersion: 0.3, softness: 1, focusRadius: 0.85,
      },
    },
    {
      id: 'ice-rings', label: 'Jégkék gyűrűk',
      defaults: {
        colors: ['#f1f4f8', '#7fb0f0', '#a9cbf7', '#5d92e0', '#2b5fb5'],
        speed: 0.4, phase: 604.695, scale: 0.8, warp: 1.9, seed: 5.9, vignette: 0, grain: 0.06, refraction: true,
        bands: 16, bandStyle: 'radial', bandStrength: 0.18, dispersion: 0.15, softness: 1, focusX: 1.25,
        focusY: 1.2,
      },
    },
    {
      id: 'cobalt-ripple', label: 'Kobalt fénysodrás',
      defaults: {
        colors: ['#04060d', '#2f6fd0', '#3e52e8', '#7c40f2', '#dbe8ff'],
        speed: 0.4, phase: 618.681, scale: 0.85, warp: 2.1, seed: 3.1, intensity: 1.25, vignette: 0.15,
        grain: 0.07, refraction: true, bandStyle: 'wave', bandStrength: 0.2, bandAngle: 90, dispersion: 0.2,
        softness: 1,
      },
    },
    {
      id: 'pink-glass-wave', label: 'Rózsaszín üveghullám',
      defaults: {
        colors: ['#f8f1f5', '#ee8fcf', '#f6b8e0', '#e070bd', '#b83f96'],
        speed: 0.4, phase: 626.324, scale: 0.8, warp: 2, seed: 5.3, intensity: 1.15, vignette: 0, grain: 0.06,
        refraction: true, bands: 16, bandStyle: 'wave', bandStrength: 0.18, bandAngle: 70, dispersion: 0.15,
        softness: 1,
      },
    },
  ],
  9: [
    {
      id: 'ice-field', label: 'Jeges színmező',
      defaults: {
        colors: ['#7a8cff', '#6fe3f5', '#3a3de0', '#b79cff', '#7a6cff'],
        speed: 0.35, phase: 577.07, scale: 0.5, seed: 1.9, intensity: 1.08, vignette: 0, grain: 0.05,
      },
    },
    {
      id: 'night-violet-field', label: 'Éjszakai ibolya',
      defaults: {
        colors: ['#100c2a', '#151238', '#4a1a8a', '#1b1140', '#e58ad0'],
        speed: 0.35, phase: 579.912, scale: 0.5, warp: 1.8, seed: 5.2, intensity: 1.08, vignette: 0.25,
        grain: 0.07,
      },
    },
    {
      id: 'rose-indigo-field', label: 'Rózsa és indigó',
      defaults: {
        colors: ['#802a39', '#802a39', '#5a72de', '#e07b91', '#8e57d8'],
        speed: 0.35, phase: 587.633, scale: 0.5, seed: 2.8, intensity: 1.08, vignette: 0.1, grain: 0.05,
      },
    },
    {
      id: 'neon-rose-field', label: 'Neon rózsa',
      defaults: {
        colors: ['#241d9a', '#e0eaff', '#241d9a', '#f75092', '#9f50d3'],
        speed: 0.4, phase: 674.006, scale: 0.6, warp: 2.2, seed: 6.6, intensity: 1.08, vignette: 0, grain: 0.04,
      },
    },
    {
      id: 'gold-violet-field', label: 'Arany és ibolya',
      defaults: {
        colors: ['#ffad0a', '#ffad0a', '#6200ff', '#e2a3ff', '#ff99fd'],
        speed: 0.4, phase: 677.471, scale: 0.6, warp: 2.1, seed: 4.1, intensity: 1.08, vignette: 0, grain: 0.04,
      },
    },
    {
      id: 'orange-powder-field', label: 'Narancs és púder',
      defaults: {
        colors: ['#ff5005', '#ff5005', '#dbba95', '#d0bce1', '#dbba95'],
        speed: 0.35, phase: 595.534, scale: 0.55, warp: 1.9, seed: 9.2, intensity: 1.08, vignette: 0, grain: 0.1,
      },
    },
  ],
  12: [
    {
      id: 'graphite-plasma', label: 'Grafitplazma',
      defaults: {
        colors: ['#070707', '#8a8a8a', '#4a4a4a', '#b4b4b4', '#ffffff'],
        speed: 0.35, phase: 552.488, scale: 0.8, warp: 1.7, seed: 4.7, intensity: 1.4, vignette: 0, grain: 0.1,
        refraction: true, bands: 10, bandStyle: 'shards', bandStrength: 0.34, bandAngle: 42, bandShade: 0.35,
        dispersion: 0.1, softness: 0.1,
      },
    },
    {
      id: 'steel-plasma', label: 'Acélplazma',
      defaults: {
        colors: ['#c9caca', '#33363b', '#2a8a92', '#4a4d53', '#1c1d20'],
        speed: 0.35, phase: 556.536, scale: 0.8, warp: 1.7, seed: 8.2, vignette: 0, grain: 0.1, refraction: true,
        bands: 10, bandStyle: 'shards', bandStrength: 0.34, bandAngle: 42, dispersion: 0.1, softness: 0.1,
      },
    },
    {
      id: 'magenta-plasma', label: 'Bíborplazma',
      defaults: {
        colors: ['#06040d', '#6a3cf0', '#e04fb0', '#8a5cff', '#f1e6ff'],
        speed: 0.35, phase: 560.075, scale: 0.8, warp: 1.7, seed: 3.6, intensity: 1.4, vignette: 0, grain: 0.1,
        refraction: true, bands: 9, bandStyle: 'shards', bandStrength: 0.34, bandAngle: 42, bandShade: 0.35,
        dispersion: 0.1, softness: 0.8,
      },
    },
  ],
};
