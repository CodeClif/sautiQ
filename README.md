# SAUTiQ website

Static site. No build step.

- `index.html` is the whole page
- files starting with `hero-` are the hero videos and posters
- files starting with `photos-` are team and Accra photos

## Put it online (free, HTTPS)
Any static host works: GitHub Pages, Cloudflare Pages or Netlify.
Point the host at the repo root (the folder with `index.html`).

## Before launch
Search `index.html` for these placeholders and replace them:
- `233XXXXXXXXX` your WhatsApp number (233 + number, no spaces)
- `YOUR_HANDLE` your Instagram
- Email is set to `sautiQ@protonmail.com` for now. Search for it in `index.html` and replace it when you move to Zoho custom mail.

## Client prototypes (demos)
Concept sites used to pitch clients. They are hidden from search engines (`noindex`) and are not linked from the main site.
- `demo-ngo/`: NGO starter website ("Open Hands Foundation", a sample name): full-photo hero with a built-in donation card, kente-inspired colour motif, stacked program panels, stories and a transparency section
- `demo-glasses/`: eyewear online store ("Sol & Frame", a sample name) in the style of a minimal product-only shop. It opens straight on the glasses, and every pair opens in an interactive 3D viewer (drag to rotate and tilt, pinch to zoom, Front / Side / Back / Top views, live colour options). The 3D glasses are generated in code (`3d/`), so no product photos are needed. Uses three.js (MIT, see `3d/LICENSE-three.txt`).

Names, figures, reviews and contact details in the demos are samples. The NGO demo photos are free-to-use stock photos from Unsplash (photographers include Annie Spratt, Ben White, Doug Linstedt, Charles William Adofo, Yoel Winkler, Kojo Kwarteng and Emmanuel Ikwuegbu). Replace them with the client's own photos before launch.
