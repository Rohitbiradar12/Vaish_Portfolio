// Shared, three.js-free device model so the UI can import it without
// pulling the WebGL bundle into the main chunk.

export type DeviceState = {
  gateOn: boolean;
  /** body bias in volts, -1 (reverse) .. +1 (forward) */
  vbb: number;
  exploded: boolean;
};

export const DEVICE_BG = "#090e14";

/** Illustrative FDSOI numbers: V_T shifts ~85 mV per volt of back-gate bias. */
export const VT0 = 0.35;
export const BODY_FACTOR = 0.085;

/** Illustrative drive strength 0..1 for the current bias point. */
export function driveStrength({ gateOn, vbb }: Pick<DeviceState, "gateOn" | "vbb">) {
  return gateOn ? Math.min(1, Math.max(0.12, 0.58 + 0.34 * vbb)) : Math.max(0, 0.035 + 0.03 * vbb);
}
