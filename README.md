# Elsewhere

A relaxing passenger-journey simulator built with vanilla JavaScript and Bun.

## Development

```sh
bun install
bun run dev
```

Open http://localhost:3000. Set `PORT` to use another port.

## Production

```sh
bun run build
bun run start
```

The build emits separate HTML, minified JavaScript, CSS, and fingerprinted JPEG files into `dist/`. Deploy that folder to any static host, or use the production preview server above. Images are ordinary binary files, never base64 strings in the source or bundle.

## Checks

```sh
bun test
bun check
```

## Structure

- `index.html` — page markup and inline SVG icons
- `index.ts` — Bun development server with HTML imports and hot reload
- `src/main.js` — player, controls, announcements, and event coordination
- `src/journeys.js` — editable journey configuration and event timelines
- `src/audio/soundscape.js` — synthesized ambience and event sounds
- `src/effects/rain.js` — canvas rain and window sizing
- `src/styles.css` — theme, layout, and responsive styles
- `assets/images/*.jpg` — local preview photographs
- `scripts/serve.ts` — production static-file server
- `tests/project.test.ts` — configuration, asset, and source-structure checks

To add footage, edit `src/journeys.js`. Event timestamps are relative to each journey's `startSeconds`. To replace a preview image, replace its matching JPEG in `assets/images/`; Bun handles the asset URLs in development and production.

Audio starts only after boarding. YouTube requires an internet connection and may restrict embedding; speech voices depend on the device. Stops and announcements are fictional, not a guide to the recorded route. Original footage and photo attribution are available in the app's experience dialog.
