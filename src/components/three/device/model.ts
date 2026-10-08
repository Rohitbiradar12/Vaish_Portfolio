// Shared, three.js-free device model so the UI can import it without
// pulling the WebGL bundle into the main chunk.

export type DeviceState = {
  gateOn: boolean;
  /** body bias in volts, -1 (reverse) .. +1 (forward) */
  vbb: number;
  exploded: boolean;
};

export const DEVICE_BG = "#060607";

/** Illustrative FDSOI numbers: V_T shifts ~85 mV per volt of back-gate bias. */
export const VT0 = 0.35;
export const BODY_FACTOR = 0.085;
/** Front-gate voltage in the on state, V. */
export const VG_ON = 0.8;
/** Subthreshold swing, V per decade (thin-film FDSOI sits close to the 60 mV ideal). */
export const SWING = 0.07;
const N_PHI = SWING / Math.LN10; // n·kT/q

/** Threshold voltage at a back-gate bias. */
export const thresholdV = (vbb: number) => VT0 - BODY_FACTOR * vbb;

// EKV-style interpolation: exponential below V_T, square law above.
function drainCurrent(vg: number, vbb: number) {
  const x = (vg - thresholdV(vbb)) / (2 * N_PHI);
  const f = x > 30 ? x : Math.log1p(Math.exp(x));
  return f * f;
}
const I_ON_0 = drainCurrent(VG_ON, 0);

/** Drain current relative to the on-current at zero bias (1 at V_G 0.8 V, V_BB 0 V). Illustrative. */
export const relCurrent = (vg: number, vbb: number) => drainCurrent(vg, vbb) / I_ON_0;

/** Illustrative drive strength 0..1 for the current bias point (sets the 3D electron density). */
export function driveStrength({ gateOn, vbb }: Pick<DeviceState, "gateOn" | "vbb">) {
  return gateOn ? Math.min(1, Math.max(0.12, 0.58 + 0.34 * vbb)) : Math.max(0, 0.035 + 0.03 * vbb);
}
