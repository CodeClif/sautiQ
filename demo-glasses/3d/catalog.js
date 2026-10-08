/* Sample catalogue. Each colour is a full 3D material spec. */
const solid = (c, r) => ({ type: 'solid', color: c, rough: r ?? .24 });
const lens = (c, o) => ({ color: c, opacity: o ?? .66 });
const mirror = (c) => ({ color: c, mirror: true, opacity: .8, grad: false });

export const PRODUCTS = [
  { id: 'ama', name: 'Ama', price: 340, kind: 'Round · Acetate', shape: 'round', rim: 11, depth: 9, blurb: 'Bold, perfectly round and cut from thick, hand-polished acetate.', colors: [
    { n: 'Tortoise', swatch: '#7a3f10', frame: { type: 'tortoise' }, lens: lens('#4a2e1c') },
    { n: 'Noir', swatch: '#141414', frame: solid(0x111111, .2), lens: lens('#23262a') },
    { n: 'Honey', swatch: '#e0a63a', frame: { type: 'crystal', color: '#e8b04a', deep: '#b3641a' }, lens: lens('#5a3a1a') } ] },
  { id: 'nia', name: 'Nia', price: 380, kind: 'Cat-eye · Acetate', shape: 'cat', rim: 8.5, brow: 0, depth: 8.6, blurb: 'A sharp, upswept cat-eye in layered acetate, finished with gold detail.', colors: [
    { n: 'Tortoise Smoke', swatch: '#7a3f10', frame: { type: 'duo' }, lens: lens('#4a3a30') },
    { n: 'Noir', swatch: '#141414', frame: solid(0x111111, .2), lens: lens('#262626') },
    { n: 'Burgundy', swatch: '#6a1a2a', frame: solid(0x6a1a2a, .22), lens: lens('#4a2a30') } ] },
  { id: 'efua', name: 'Efua', price: 320, kind: 'Rectangle · Acetate', shape: 'rect', rim: 12, depth: 9, blurb: 'Wide, slim and confident. A modern rectangle with all-day comfort.', colors: [
    { n: 'Noir', swatch: '#141414', frame: solid(0x111111, .2), lens: lens('#6a4a10') },
    { n: 'Ivory', swatch: '#efe6d3', frame: solid(0xefe6d3, .26), lens: lens('#3a2a1c') },
    { n: 'Olive', swatch: '#4b5230', frame: solid(0x4b5230, .24), lens: lens('#2a3022') } ] },
  { id: 'kofi', name: 'Kofi', price: 360, kind: 'Classic · Crystal', shape: 'wayfarer', rim: 10.5, brow: 3, depth: 9, blurb: 'The classic wayfarer in clear crystal acetate you can see right through.', colors: [
    { n: 'Ocean', swatch: '#3c8fe8', frame: { type: 'crystal', color: '#4a9cf0', deep: '#1458c8' }, lens: lens('#26465c') },
    { n: 'Smoke', swatch: '#6b6b70', frame: { type: 'crystal', color: '#9a9aa2', deep: '#35353a' }, lens: lens('#2a2a2e') },
    { n: 'Noir', swatch: '#141414', frame: solid(0x111111, .2), lens: lens('#262626') } ] },
  { id: 'kwame', name: 'Kwame', price: 350, kind: 'Angular · Acetate', shape: 'angular', rim: 11.5, depth: 9, blurb: 'Strong, square and sharp, with mirrored lenses that catch the light.', colors: [
    { n: 'Noir · Mirror', swatch: '#141414', frame: solid(0x111111, .18), lens: mirror('#46505a') },
    { n: 'Havana', swatch: '#7b4a1e', frame: { type: 'tortoise' }, lens: lens('#3a2a1a') },
    { n: 'Navy', swatch: '#1d2b4a', frame: solid(0x1d2b4a, .22), lens: lens('#2c4766') } ] },
  { id: 'esi', name: 'Esi', price: 390, kind: 'Butterfly · Acetate', shape: 'butterfly', rim: 11, brow: 2, depth: 9, blurb: 'Big, bold and glamorous. Statement frames in rich, glossy colour.', colors: [
    { n: 'Emerald', swatch: '#1f6b55', frame: solid(0x14584a, .2), lens: lens('#243a33') },
    { n: 'Cream', swatch: '#efe6d3', frame: solid(0xefe6d3, .26), lens: lens('#4d3b2a') },
    { n: 'Noir', swatch: '#141414', frame: solid(0x111111, .2), lens: lens('#2a2a2a') } ] },
  { id: 'yaw', name: 'Yaw', price: 370, kind: 'Square · Crystal', shape: 'square', rim: 11.5, depth: 9, blurb: 'A soft, rounded square in glowing crystal acetate with deep gradient lenses.', colors: [
    { n: 'Honey', swatch: '#e0a63a', frame: { type: 'crystal', color: '#e8b04a', deep: '#b3641a' }, lens: lens('#4d3a22') },
    { n: 'Burgundy', swatch: '#7a1f2e', frame: { type: 'crystal', color: '#a02a40', deep: '#5a0f1c' }, lens: lens('#4a2a30') },
    { n: 'Forest', swatch: '#1f4a3a', frame: { type: 'crystal', color: '#2f7a5a', deep: '#0f3a2a' }, lens: lens('#2a3a2e') } ] },
];
export const specOf = (p, ci = 0) => ({ shape: p.shape, rim: p.rim, brow: p.brow, depth: p.depth, ...p.colors[ci] });
