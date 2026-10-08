import * as THREE from "three";

/**
 * PCB traces: muted copper under the solder mask, with signal pulses that
 * travel outward along each trace (values > 1 feed the bloom pass), and a
 * radial "power-on" wavefront driven by uReveal.
 */
export function createTraceMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uActivity: { value: 1 },
      uBase: { value: new THREE.Color("#3a2716") },
      uPulse: { value: new THREE.Color("#ffffff") },
      // copied from scene.fog every frame (Board.tsx), so it follows the theme
      uFogColor: { value: new THREE.Color(0, 0, 0) },
      uFogNear: { value: 12 },
      uFogFar: { value: 30 },
    },
    vertexShader: /* glsl */ `
      attribute float aDist;
      attribute float aSide;
      attribute float aSeed;
      varying float vDist;
      varying float vSide;
      varying float vSeed;
      varying vec3 vWorld;
      varying float vDepth;
      void main() {
        vDist = aDist;
        vSide = aSide;
        vSeed = aSeed;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mv = viewMatrix * wp;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uReveal;
      uniform float uActivity;
      uniform vec3 uBase;
      uniform vec3 uPulse;
      uniform vec3 uFogColor;
      uniform float uFogNear;
      uniform float uFogFar;
      varying float vDist;
      varying float vSide;
      varying float vSeed;
      varying vec3 vWorld;
      varying float vDepth;
      void main() {
        float crown = 1.0 - abs(vSide);
        vec3 col = uBase * (0.55 + 0.6 * crown);

        float r = length(vWorld.xz);
        float front = uReveal * 17.0;
        float lit = 1.0 - smoothstep(front - 0.8, front, r);

        float speed = 1.4 + vSeed * 1.6;
        float period = 4.5 + fract(vSeed * 7.31) * 7.5;
        float t = mod(uTime * speed + vSeed * 37.0 - vDist, period);
        float pulse = pow(1.0 - smoothstep(0.0, 1.1, t), 3.0);

        float wave = exp(-pow((r - front) * 2.2, 2.0)) * step(0.001, uReveal) * (1.0 - step(0.999, uReveal));

        col = col * (0.25 + 0.75 * lit) + uPulse * (pulse * 3.2 * uActivity * lit + wave * 1.6) * (0.35 + 0.65 * crown);

        float fog = smoothstep(uFogNear, uFogFar, vDepth);
        gl_FragColor = vec4(mix(col, uFogColor, fog), 1.0);
      }
    `,
  });
}

/** Additive glow drawn over a die block when its role is in focus. */
export function createHighlightMaterial(color: string, size: [number, number]) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: new THREE.Vector2(size[0], size[1]) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uTime;
      uniform vec2 uSize;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * uSize;
        float edge = min(min(p.x, uSize.x - p.x), min(p.y, uSize.y - p.y));
        float border = 1.0 - smoothstep(0.0, 0.007, edge);
        float inner = exp(-edge * 24.0) * 0.34;

        vec2 c = min(p, uSize - p);
        float corner = step(c.x, 0.06) * step(c.y, 0.06) * (1.0 - smoothstep(0.0, 0.016, edge));

        float band = fract(vUv.y * 0.999 - uTime * 0.22);
        float scan = exp(-pow((band - 0.5) * 10.0, 2.0)) * 0.15;

        vec2 g = abs(fract(p * 28.0) - 0.5);
        float gridLine = (1.0 - smoothstep(0.0, 0.06, min(g.x, g.y))) * 0.05;

        float a = (border * 1.25 + corner * 1.8 + inner + scan + gridLine + 0.03) * uIntensity;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
  });
}

/** Tileable value-noise texture: micro-texture for mold compound and solder mask. */
export function createNoiseTexture(size = 256, seed = 3) {
  const data = new Uint8Array(size * size * 4);
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < size * size; i++) {
    const v = 110 + rnd() * 100;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
