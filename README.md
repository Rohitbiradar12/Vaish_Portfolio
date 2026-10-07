# VP-Silicon: Vaishnavi Patil's portfolio

A single-page portfolio with a silicon theme: a scroll-driven 3D chip, a waveform-style experience timeline, a pinout skills map, an interactive FDSOI transistor and a PCB-style Google Scholar board. Built with Next.js 16, React Three Fiber and Tailwind CSS 4. Responsive from 360 px phones to 2560 px monitors.

## Run it

```bash
npm install
npm run dev        # http://localhost:3001
npm run build      # production build (static prerender)
npm run lint
```

## Editing content

All text lives in `src/content/`. Components never hard-code copy.

| File | What it holds |
|---|---|
| `profile.ts` | name, role, tagline, intro, photo, links, resume path |
| `experience.ts` | roles, highlights, metrics; `dieBlock` links a role to a block on the 3D die |
| `projects.ts` | projects; set `image` to a file in `public/projects/` to replace the generated art |
| `skills.ts` | pinout groups (4 sides) + toolchain rails |
| `education.ts`, `publications.ts` | degrees, papers (null fields are hidden) |
| `sections.ts` | section order, nav labels, section numbers |

Lines marked `TODO(client)` are still waiting on information from Vaishnavi.

## The 3D

Every model is generated in code (no downloaded assets):

- `src/components/three/hero/`: the scroll-driven chip. A QFP package with gull-wing leads on a PCB with animated signal traces. The lid opens on scroll to show the die (a canvas-painted floorplan) with gold wire bonds, then the camera probes the four blocks that map to her industry roles.
  - `spec.ts`: dimensions, die floorplan, scroll stage timings
  - `CameraRig.tsx`: camera keyframes
  - `diePainter.ts`: the floorplan painter (`dieTexture.ts` runs it in a Web Worker)
- `src/components/three/device/`: an interactive FDSOI transistor (gate switch, back-gate bias, exploded view).
- `src/components/three/lattice/`: a silicon diamond-cubic lattice.

Canvases mount lazily and pause when off-screen. Shaders compile asynchronously before the first frame (`ShaderWarmup.tsx`), and the page never waits for WebGL: the hero text renders immediately and the chip fades in when ready. Phones and touch devices get a lighter render tier (lower pixel ratio, no MSAA, half-resolution bloom, 1024 px die texture). The hero renders a static shell if WebGL is unavailable.

## Deploy

Vercel works out of the box (import the repo, no settings needed). The page prerenders as static HTML.

Before deploying, add the public resume at `public/resume/Vaishnavi_Patil_Resume.pdf`. That folder is gitignored until the version to publish is confirmed.

## Dev notes

- If a CSS change doesn't show up in `npm run dev`, stop the server, delete `.next/` and restart. OneDrive-synced folders sometimes drop file-change events.
- If `npm run build` fails with `EPERM` while cleaning `.next/`, delete `.next/` (or pause OneDrive sync) and build again.
- The 3D folder relaxes two React-Compiler lint rules (see `eslint.config.mjs`). R3F mutates three.js objects inside `useFrame` by design.
