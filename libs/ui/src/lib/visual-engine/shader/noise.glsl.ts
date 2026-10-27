/**
 * Hash and noise helpers shared by every fragment shader. `FBM_OCTAVES` is
 * supplied as a define by the quality setting, so the same source gets cheaper
 * on a laptop without a second copy of the shader.
 */
export const NOISE_GLSL = `
float hash11(float n) {
	return fract(sin(n * 12.9898) * 43758.5453123);
}

float hash21(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

/**
 * A hash that survives large coordinates. The sine hash above loses its
 * precision by a few hundred pixels across and starts clumping, which on a
 * dark frame reads as a field of stars rather than as grain.
 */
float hashPixel(vec2 p) {
	vec3 q = fract(vec3(p.xyx) * 0.1031);
	q += dot(q, q.yzx + 33.33);
	return fract((q.x + q.y) * q.z);
}

float valueNoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	float a = hash21(i);
	float b = hash21(i + vec2(1.0, 0.0));
	float c = hash21(i + vec2(0.0, 1.0));
	float d = hash21(i + vec2(1.0, 1.0));
	return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
	float total = 0.0;
	float amplitude = 0.5;
	for (int i = 0; i < FBM_OCTAVES; i++) {
		total += valueNoise(p) * amplitude;
		p = p * 2.03 + vec2(11.3, 7.1);
		amplitude *= 0.5;
	}
	return total;
}
`;

/** The vertex shader for every full-screen pass. */
export const FULLSCREEN_VERTEX = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;

out vec2 vUv;

void main() {
	vUv = aPosition * 0.5 + 0.5;
	gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;
