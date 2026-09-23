/** Baked Codice Celeste hatch. Density 75, weight 0.6 — no live sliders. */
export const DAVINCI_HATCH_DENSITY = 75;
export const DAVINCI_HATCH_WEIGHT = 0.6;

/** Cross-hatch ink on vellum, from the Codice Celeste rendering study. */
export const davinciVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewNormal;
  varying vec3 vLocalPosition;

  void main() {
    vViewNormal = normalize(normalMatrix * normal);
    vLocalPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const davinciFragmentShader = `
  uniform vec3 uLightDirection;
  uniform vec3 uInkColor;
  uniform vec3 uPaperColor;
  uniform float uHatchDensity;
  uniform float uLineWeight;
  uniform float uIsLightSource;

  varying vec3 vNormal;
  varying vec3 vViewNormal;
  varying vec3 vLocalPosition;

  float strokeMask(float line, float width) {
    float aa = fwidth(line) * 0.75;
    float enter = smoothstep(0.5 - width - aa, 0.5 - width + aa, line);
    float leave = smoothstep(0.5 + width - aa, 0.5 + width + aa, line);
    return enter * (1.0 - leave);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDirection);

    float nDotL = dot(N, L);
    float light = uIsLightSource > 0.5
      ? 1.0
      : clamp(nDotL * 0.5 + 0.5, 0.0, 1.0);

    vec2 hatchCoords = vLocalPosition.xy * uHatchDensity * 0.15;
    float wobble = sin(hatchCoords.y * 3.0 + hatchCoords.x * 2.0) * 0.12 * (uLineWeight * 0.5);
    hatchCoords += wobble;

    float line1 = mod(hatchCoords.x + hatchCoords.y, 1.0);
    float line2 = mod(hatchCoords.x - hatchCoords.y, 1.0);
    float line3 = mod(hatchCoords.y * 1.414, 1.0);
    float line4 = mod(hatchCoords.x * 1.414, 1.0);

    float strokeWidth = 0.14 * uLineWeight;
    float stroke1 = strokeMask(line1, strokeWidth);
    float stroke2 = strokeMask(line2, strokeWidth);
    float stroke3 = strokeMask(line3, strokeWidth);
    float stroke4 = strokeMask(line4, strokeWidth);

    float inkIntensity = 0.0;
    if (light < 0.78) inkIntensity += stroke1;
    if (light < 0.55) inkIntensity += stroke2;
    if (light < 0.35) inkIntensity += stroke3 * 0.85;
    if (light < 0.18) inkIntensity += stroke4 * 0.85;

    float edgeFactor = 1.0 - max(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)), 0.0);
    float rimInk = smoothstep(0.68, 0.98, edgeFactor) * 1.1;
    inkIntensity = clamp(inkIntensity + rimInk, 0.0, 1.0);

    vec3 finalColor = mix(uPaperColor, uInkColor, inkIntensity);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
