/**
 * Embers and dust. Each particle's position is a pure function of its seed and
 * a phase the engine accumulates on the CPU, so there is no per-particle state
 * to update and nothing is allocated per frame. Accumulating the phase (rather
 * than reading the clock) is what lets the speed change without every particle
 * jumping to a new place; density changes simply draw fewer of the same buffer.
 */
export const PARTICLE_VERTEX = `#version 300 es
precision highp float;

// x: start offset along the lane, y: speed, z: lane across the screen,
// w: size and flicker seed.
layout(location = 0) in vec4 aSeed;

uniform vec2 uResolution;
uniform float uPhase;
uniform float uSize;
uniform vec2 uCam;
uniform float uSway;
// 1 for embers rising, 0 for rain and snow falling.
uniform float uRise;

out float vLife;
out float vSeed;

void main() {
	float speed = 0.35 + aSeed.y * 0.9;
	float t = fract(aSeed.x + uPhase * speed);

	float x = aSeed.z * 2.2 - 1.1;
	x += sin(t * 3.2 + aSeed.x * 6.2831) * 0.07 * uSway * (0.4 + aSeed.y);
	x += uCam.x * 0.9;

	float y = mix(-1.15, 1.7, mix(1.0 - t, t, uRise)) + uCam.y * 0.9;

	gl_Position = vec4(x, y, 0.0, 1.0);
	gl_PointSize = uSize * (0.2 + aSeed.w * aSeed.w * 1.5) * (uResolution.y / 900.0);

	// Born near the ground, spent before the top of the frame.
	// Most of the life is spent low in the frame: embers burn out on the way
	// up, they do not drift evenly across the sky.
	vLife =
		smoothstep(0.0, 0.07, t) *
		(1.0 - smoothstep(0.26, 0.72, t));
	vSeed = aSeed.w;
}
`;

export const PARTICLE_FRAGMENT = `#version 300 es
precision highp float;

in float vLife;
in float vSeed;

out vec4 fragColor;

uniform float uTime;
uniform float uGlow;
uniform vec3 uCore;
uniform vec3 uEdge;

void main() {
	float r = length(gl_PointCoord - 0.5) * 2.0;
	if (r > 1.0 || vLife <= 0.0) {
		discard;
	}

	float falloff = pow(1.0 - r, 2.4);
	float flicker = 0.7 + 0.3 * sin(uTime * (3.0 + vSeed * 5.0) + vSeed * 6.2831);

	fragColor = vec4(
		mix(uEdge, uCore, falloff) * flicker * (0.5 + uGlow),
		falloff * vLife
	);
}
`;
