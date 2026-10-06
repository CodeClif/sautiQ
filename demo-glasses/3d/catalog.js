/* Sample catalogue. Each colour is a full 3D material spec. */
const gold = { type: 'metal', color: 0xd4af37, rough: .18 }, silver = { type: 'metal', color: 0xc4c8cc, rough: .15 }, rose = { type: 'metal', color: 0xd9a08a, rough: .2 }, gun = { type: 'metal', color: 0x3a3d42, rough: .25 };
const solid = (c, r) => ({ type: 'solid', color: c, rough: r ?? .3 });
const lens = (c, o) => ({ color: c, opacity: o ?? .85 });

export const PRODUCTS = [
  { id: 'ama', name: 'Ama', price: 260, kind: 'Round · Wire', shape: 'round', build: 'wire', wireR: .95, blurb: 'Fine wire, perfectly round. A light, easy classic that suits every face.', colors: [
    { n: 'Gold · Green', swatch: '#d4af37', frame: gold, lens: lens('#2f4a3a'), tip: 0x20150c },
    { n: 'Silver · Blue', swatch: '#c4c8cc', frame: silver, lens: lens('#2a4766'), tip: 0x1c2630 },
    { n: 'Rose gold · Brown', swatch: '#d9a08a', frame: rose, lens: lens('#5a3a2a'), tip: 0x3a2018 } ] },
  { id: 'nia', name: 'Nia', price: 320, kind: 'Cat-eye · Acetate', shape: 'cat', build: 'acetate', rim: 4.2, brow: 3, rivet: 0xd4af37, hinge: 0xd4af37, blurb: 'A sharp upswept cat-eye, hand-polished acetate and gold detailing.', colors: [
    { n: 'Tortoise', swatch: '#8c4c15', frame: { type: 'tortoise' }, lens: lens('#5a3a2a', .8) },
    { n: 'Noir', swatch: '#141414', frame: solid(0x121212, .26), lens: lens('#2a2a2a', .85) },
    { n: 'Rosé', swatch: '#d79a96', frame: solid(0xd79a96, .3), lens: lens('#7a4a53', .8) } ] },
  { id: 'efua', name: 'Efua', price: 240, kind: 'Panto · Wire', shape: 'panto', build: 'wire', wireR: .9, blurb: 'A soft panto shape in whisper-thin wire with warm gradient lenses.', colors: [
    { n: 'Silver · Amber', swatch: '#c4c8cc', frame: silver, lens: lens('#a65a1e', .8), tip: 0x3a2a1a },
    { n: 'Gold · Smoke', swatch: '#d4af37', frame: gold, lens: lens('#3a3a3a', .85), tip: 0x20150c },
    { n: 'Gunmetal · Rose', swatch: '#3a3d42', frame: gun, lens: lens('#b06a78', .8), tip: 0x15161a } ] },
  { id: 'kofi', name: 'Kofi', price: 280, kind: 'Classic · Crystal', shape: 'wayfarer', build: 'acetate', rim: 5, brow: 4, rivet: 0xcfcfcf, blurb: 'The classic wayfarer in translucent crystal acetate you can see right through.', colors: [
    { n: 'Ocean', swatch: '#3c8fe8', frame: { type: 'crystal', color: '#3c8fe8', deep: '#1458c8' }, lens: lens('#26465c') },
    { n: 'Smoke', swatch: '#6b6b70', frame: { type: 'crystal', color: '#8a8a90', deep: '#35353a' }, lens: lens('#2a2a2e') },
    { n: 'Noir', swatch: '#141414', frame: solid(0x121212, .26), lens: lens('#2a2a2a') } ] },
  { id: 'kwame', name: 'Kwame', price: 270, kind: 'Square · Acetate', shape: 'square', build: 'acetate', rim: 4.6, brow: 2.5, rivet: 0xcfcfcf, blurb: 'Strong, square and sharp, with mirrored lenses that catch the light.', colors: [
    { n: 'Noir · Mirror', swatch: '#141414', frame: solid(0x121212, .28), lens: { color: '#aeb4b8', mirror: true, opacity: 1, grad: false } },
    { n: 'Havana', swatch: '#7b4a1e', frame: { type: 'tortoise' }, lens: lens('#3a2a1a') },
    { n: 'Navy', swatch: '#1d2b4a', frame: solid(0x1d2b4a, .3), lens: lens('#2c4766') } ] },
  { id: 'esi', name: 'Esi', price: 340, kind: 'Oversized · Acetate', shape: 'oversize', build: 'acetate', rim: 4.6, brow: 2, rivet: 0xd4af37, hinge: 0xd4af37, blurb: 'Big, bold and glamorous. Statement frames in rich, glossy colour.', colors: [
    { n: 'Emerald', swatch: '#1f6b55', frame: solid(0x1f6b55, .25), lens: lens('#243a33') },
    { n: 'Cream', swatch: '#efe6d3', frame: solid(0xefe6d3, .3), lens: lens('#4d3b2a') },
    { n: 'Noir', swatch: '#141414', frame: solid(0x121212, .26), lens: lens('#2a2a2a') } ] },
  { id: 'yaw', name: 'Yaw', price: 350, kind: 'Aviator · Wire', shape: 'aviator', build: 'wire', wireR: 1, blurb: 'The aviator, refined: slim metal, deep gradient lenses, all-day comfort.', colors: [
    { n: 'Gold · Green', swatch: '#caa550', frame: { type: 'metal', color: 0xcaa550, rough: .2 }, lens: lens('#2f4a3a'), tip: 0x20150c },
    { n: 'Silver · Blue', swatch: '#c4c8cc', frame: silver, lens: lens('#2c4766'), tip: 0x1c2630 },
    { n: 'Gold · Brown', swatch: '#caa550', frame: { type: 'metal', color: 0xcaa550, rough: .2 }, lens: lens('#5a3b25'), tip: 0x20150c } ] },
];
export const specOf = (p, ci = 0) => ({ shape: p.shape, build: p.build, rim: p.rim, brow: p.brow, wireR: p.wireR, rivet: p.rivet, hinge: p.hinge, ...p.colors[ci] });
