// These are the owner's published applications, not invented product mockups.
export const PRODUCTS = Object.freeze([
  { id: 'moon', day: '026', title: 'Tonight’s moon', folder: 'day-026-tonight-moon', accent: '#d5c4a0', position: [4.5, 1.7, -0.4], rotation: [-0.04, -0.24, -0.09], width: 3.1 },
  { id: 'tree', day: '028', title: 'One drop tree', folder: 'day-028-one-drop-tree', accent: '#a3c7a7', position: [-4.5, -1.7, -0.5], rotation: [0.04, 0.26, 0.08], width: 2.8 },
  { id: 'rail', day: '044', title: 'Tokyo Railscape', folder: 'day-044-train-here', accent: '#8ecab6', position: [4.65, -1.55, -2.9], rotation: [0.08, -0.32, -0.04], width: 3.65 },
  { id: 'fireworks', day: '003', title: 'Tap fireworks', folder: 'day-003-tap-fireworks', accent: '#baa3e9', position: [-4.7, 1.6, -1.7], rotation: [-0.05, 0.3, 0.1], width: 3.0 },
  { id: 'piano', day: '007', title: 'A little piano', folder: 'day-007-web-piano', accent: '#afb9e7', position: [0.35, 2.85, -5.3], rotation: [-0.12, -0.12, -0.04], width: 2.5 },
  { id: 'reversi', day: '017', title: 'Reversi, explained', folder: 'day-017-reversi-mind', accent: '#94b6ce', position: [-0.35, -2.7, -4.8], rotation: [0.1, 0.15, 0.07], width: 2.65 },
]);

export function publicUrl(product) {
  return `https://hundred-days.pages.dev/${product.folder}/`;
}
