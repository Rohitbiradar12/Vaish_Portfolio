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
6. Copy `.env.example` to `.env.local` and fill in the three values. Restart `npm run dev`.
7. In production, add the same three variables to the host's environment settings and redeploy. They are baked in at build time.

The keys are public by design (they ship to the browser). The form blocks headless browsers and allows one message per browser every 10 seconds. If spam becomes a problem, EmailJS supports reCAPTCHA v2. Don't just tick it in the template settings: the form would also need to send the CAPTCHA token, or every message fails.

## Deploy

Vercel works out of the box: import the repo and add the three EmailJS variables (see above). The page prerenders as static HTML.

Before deploying, add the public resume at `public/resume/Vaishnavi_Patil_Resume.pdf`. That folder is gitignored until the version to publish is confirmed.

## Dev notes

- If a CSS change doesn't show up in `npm run dev`, stop the server, delete `.next/` and restart. OneDrive-synced folders sometimes drop file-change events.
- If `npm run build` fails with `EPERM` while cleaning `.next/`, delete `.next/` (or pause OneDrive sync) and build again.
- The 3D folder relaxes two React-Compiler lint rules (see `eslint.config.mjs`). R3F mutates three.js objects inside `useFrame` by design.
