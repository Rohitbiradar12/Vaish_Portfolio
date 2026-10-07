import * as THREE from "three";
import { paintDie } from "./diePainter";

export type DieTextures = { map: THREE.Texture; rm: THREE.Texture; em: THREE.Texture };

type Source = ImageBitmap | HTMLCanvasElement;

function toTexture(img: Source, color: boolean, anisotropy: number) {
  const isBitmap = typeof ImageBitmap !== "undefined" && img instanceof ImageBitmap;
  const t = isBitmap ? new THREE.Texture(img) : new THREE.CanvasTexture(img as HTMLCanvasElement);
  if (isBitmap) {
    // WebGL ignores flipY for ImageBitmaps; flip through the UV transform instead.
    t.flipY = false;
    t.repeat.set(1, -1);
    t.offset.set(0, 1);
  }
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = anisotropy;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

function build([map, rm, em]: Source[], anisotropy: number): DieTextures {
  return { map: toTexture(map, true, anisotropy), rm: toTexture(rm, false, anisotropy), em: toTexture(em, true, anisotropy) };
}

const idle = () =>
  new Promise<void>((resolve) => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(() => resolve(), { timeout: 1500 });
    else setTimeout(resolve, 200);
  });

async function paintOnMainThread(size: number, anisotropy: number) {
  await idle();
  const canvases = paintDie(size, (s) => {
    const c = document.createElement("canvas");
    c.width = c.height = s;
    return c;
  }) as HTMLCanvasElement[];
  return build(canvases, anisotropy);
}

/**
 * Generates the die floorplan textures without blocking the page: painted in a
 * Web Worker (OffscreenCanvas) where available, otherwise during idle time.
 */
export function loadDieTextures(size: number, anisotropy: number): Promise<DieTextures> {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
    return paintOnMainThread(size, anisotropy);
  }
  return new Promise((resolve) => {
    const worker = new Worker(new URL("./dieTexture.worker.ts", import.meta.url), { type: "module" });
    const fallback = () => {
      worker.terminate();
      paintOnMainThread(size, anisotropy).then(resolve);
    };
    worker.onmessage = (e: MessageEvent<ImageBitmap[]>) => {
      worker.terminate();
      resolve(build(e.data, anisotropy));
    };
    worker.onerror = fallback;
    worker.postMessage({ size });
  });
}

/** 1×1 stand-ins so the die material compiles once with all its maps bound. */
export function placeholderDieTextures(): DieTextures {
  const px = (r: number, g: number, b: number, color: boolean) => {
    const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1, THREE.RGBAFormat);
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
  };
  return { map: px(21, 25, 34, true), rm: px(0, 128, 64, false), em: px(0, 0, 0, true) };
}
