/** Keeps only what is already bright, so the blur has something to spread. */
export const BRIGHT_PASS_FRAGMENT = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSource;
uniform float uThreshold;

void main() {
	vec3 colour = texture(uSource, vUv).rgb;
	float level = max(colour.r, max(colour.g, colour.b));
	fragColor = vec4(colour * smoothstep(uThreshold, uThreshold + 0.35, level), 1.0);
}
`;

/** A nine-tap Gaussian, run once across and once down at quarter resolution. */
export const BLUR_FRAGMENT = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSource;
uniform vec2 uDirection;

void main() {
	vec3 sum = texture(uSource, vUv).rgb * 0.2270270270;
	sum += (
		texture(uSource, vUv + uDirection * 1.3846153846).rgb +
		texture(uSource, vUv - uDirection * 1.3846153846).rgb
	) * 0.3162162162;
	sum += (
		texture(uSource, vUv + uDirection * 3.2307692308).rgb +
		texture(uSource, vUv - uDirection * 3.2307692308).rgb
	) * 0.0702702703;
	fragColor = vec4(sum, 1.0);
}
`;

export const COMPOSITE_FRAGMENT = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uAmount;

void main() {
	fragColor = vec4(
		texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uAmount,
		1.0
	);
}
`;
