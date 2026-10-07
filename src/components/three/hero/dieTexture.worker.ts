// Paints the die floorplan off the main thread and returns three ImageBitmaps
// (albedo, roughness/metalness, emissive).
import { paintDie } from "./diePainter";

type Scope = {
  onmessage: ((e: MessageEvent<{ size: number }>) => void) | null;
  postMessage: (message: ImageBitmap[], transfer: Transferable[]) => void;
};
const scope = self as unknown as Scope;

scope.onmessage = (e) => {
  const canvases = paintDie(e.data.size, (s) => new OffscreenCanvas(s, s)) as OffscreenCanvas[];
  const bitmaps = canvases.map((c) => c.transferToImageBitmap());
  scope.postMessage(bitmaps, bitmaps);
};
