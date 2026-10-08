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

- `src/components/three/hero/`: the scroll-driven chip. A QFP package with gull-wing leads on a PCB with animated signal traces. The lid opens on scroll to show the die (a canvas-painted floorplan) with gold wire bonds, then the camera probes the four blocks that map to the four industry roles.
  - `spec.ts`: dimensions, die floorplan, scroll stage timings
  - `CameraRig.tsx`: camera keyframes
  - `diePainter.ts`: the floorplan painter (`dieTexture.ts` runs it in a Web Worker)
- `src/components/three/device/`: an interactive FDSOI transistor (gate switch, back-gate bias, exploded view, drag to rotate). It's drawn as a technical illustration with hairline edges, glassy oxides and a glowing inversion channel.
  - **Electrons:** GPU-animated points with an additive glow, so there's no post-processing pass.
  - **Canvas:** transparent over a Tailwind-styled stage.
  - **Loading:** mounts about 1200 px early and pre-renders off screen, then fades in.
  - **Instrument UI** (`sections/DeviceLab.tsx`, `sections/TransferCurve.tsx`): a bias console beside the viewer (segmented gate and view controls, a bipolar back-gate fader with presets, reset), a live status strip on the viewer, and a log-scale I<sub>D</sub>–V<sub>G</sub> transfer curve with a crosshair readout and V<sub>T</sub> / I<sub>on</sub> / I<sub>off</sub> / on-off tiles. Every number comes from one illustrative model in `device/model.ts`, so they always agree. The scene is memoised and reads the bias from a ref, so moving the controls never re-renders the canvas.
- `src/components/three/StudioEnvironment.tsx`: builds the reflection environment before shader warm-up, at 64 px.
  - drei's `<Environment>` rendered its environment on the first frame, after warm-up, which caused a ~0.4 s recompile stall.
  - At 128 px the environment blur shaders alone took ~0.4 s to compile on Windows.
- `src/components/three/lattice/`: a silicon diamond-cubic lattice.

Canvases mount lazily and pause when off-screen. Shaders compile asynchronously before the first frame (`ShaderWarmup.tsx`), and the page never waits for WebGL: the hero text renders immediately and the chip fades in when ready. Phones and touch devices get a lighter render tier (lower pixel ratio, no MSAA, half-resolution bloom, 1024 px die texture). The hero renders a static shell if WebGL is unavailable.

## Theme

Black-and-white design with a **light / dark / system** choice in the navbar. Dark is the default.

The control is a small three.js slide switch: `layout/ThemeSwitch3D.tsx` (Tailwind-styled wrapper, radio buttons, hover label) and `three/toggle/SwitchScene.tsx` (the 3D part).

- It has three detents (sun · monitor · moon) and a chrome knob that springs between them. Gloss black over the hero and in dark mode, white ceramic in light mode.
- It renders only while moving (`frameloop="demand"`) and loads when the browser is idle. A CSS stand-in shows until then, or permanently without WebGL.

- **Tokens:** colours are CSS variables in `src/app/globals.css` (`--ink`, `--panel`, `--fg`, `--muted`, `--signal` …), defined once for dark and once for light. Tailwind utilities (`bg-ink`, `text-fg/80`) read them, so components need no `dark:` variants.
- **Switching:** every visit opens in dark mode. `src/lib/theme.ts` keeps the visitor's choice in `sessionStorage`, so it lasts through reloads in that tab but not into a new visit. It also sets `data-theme` / `data-theme-pref` on `<html>`.
  - An inline script in `layout.tsx` applies the choice before the first paint, so there's no flash. It also clears an older `localStorage` value.
  - Where the browser supports View Transitions, the new theme grows as a circle from the switch.
- **Hero:** a dark stage in both themes: a deep charcoal (`--stage` #121214, which `BG` in `hero/spec.ts` renders to after tone mapping). In light mode the navbar is an opaque white bar from the top; in dark mode it's transparent over the hero and frosted once you scroll.
- **Always-dark parts:** any element can pin its subtree with `data-theme="dark"`. The hero, the Scholar PCB, the Device Lab viewer and the skills package use this.
- **Category colours** (`--cat-1…4`: roles, skill groups, project types, LEDs) passed the dataviz palette validator, including colour-blind checks, for each theme. In light mode they switch to darker steps. The 3D die uses the dark steps from `BLOCKS` in `hero/spec.ts`.

## Contact form (EmailJS)

The form sends messages through [EmailJS](https://www.emailjs.com) straight from the browser, with no backend. Until the keys are set, it falls back to opening the visitor's email app. The free plan covers 200 emails a month.

1. Sign up at emailjs.com, ideally with Vaishnavi's Gmail.
2. **Email Services → Add New Service → Gmail.** Connect her Gmail account; messages are sent from it to her own inbox. Note the **Service ID**.
3. **Email Templates → Create New Template → "Contact Us"** (pre-built). The form sends every variable it uses: `{{title}}` ("Portfolio: message from Ada"), `{{name}}`, `{{email}}`, `{{message}}` and `{{time}}`. Check these fields:
   - **To Email:** `patil.vaishnavi2110@gmail.com`. Type the address itself, not a variable. Otherwise anyone could use the form to email other people.
   - **Reply To:** `{{email}}`, so replying goes straight to the visitor.

   Save it and note the **Template ID**. This is the one the site uses.
4. *Optional auto-reply:* create a template from the pre-built **"Auto-Reply"**:
   - **To Email:** `{{email}}`
   - Replace its `[Website Link]` / `[Company Name]` placeholders.
   - Either upload `logo.png` under Attachments or delete the logo.
   - Then open the Contact Us template's **Auto-Reply** tab and select it.

   Each message then uses 2 of the 200 monthly emails. Anyone can trigger the auto-reply to any address they type, so keep its text generic: don't add `{{message}}`.
5. **Account → General:** copy the **Public Key**. The private key is not used: keep it out of the code and env files.
6. Copy `.env.example` to `.env.local` and fill in `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID` and `EMAILJS_PUBLIC_KEY`. Restart `npm run dev`.
7. In production, add the same three variables to the host's environment settings and redeploy. The page reads them on the server at build time (`src/lib/emailjsConfig.ts`) and passes them to the form.

The keys are public by design (they ship to the browser). The form blocks headless browsers and allows one message per browser every 10 seconds. If spam becomes a problem, EmailJS supports reCAPTCHA v2. Don't just tick it in the template settings: the form would also need to send the CAPTCHA token, or every message fails.

## Deploy

Vercel works out of the box: import the repo and add the three EmailJS variables (see above). The page prerenders as static HTML.

Before deploying, add the public resume at `public/resume/Vaishnavi_Patil_Resume.pdf`. That folder is gitignored until the version to publish is confirmed.

## Dev notes

- If a CSS change doesn't show up in `npm run dev`, stop the server, delete `.next/` and restart. OneDrive-synced folders sometimes drop file-change events.
- If `npm run build` fails with `EPERM` while cleaning `.next/`, delete `.next/` (or pause OneDrive sync) and build again.
- The 3D folder relaxes two React-Compiler lint rules (see `eslint.config.mjs`). R3F mutates three.js objects inside `useFrame` by design.
