import { NOISE_GLSL } from './noise.glsl';

/**
 * The world, drawn back to front in one pass: sky, smog deck, furnace glow,
 * three ranks of city at different parallax, two fog decks woven between them,
 * chimneys with smoke, and a near-black foreground frame.
 *
 * Every layer takes the camera offset multiplied by its own depth, which is
 * what gives the drift its sense of distance. Nothing in here knows about any
 * particular artist; it is all driven by the uniforms.
 */
export const INDUSTRIAL_SCENE_FRAGMENT = `#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSeed;

uniform float uIntensity;
uniform float uFog;
uniform float uFogSpeed;
uniform float uDarkness;
uniform float uLight;
uniform float uGlow;
uniform float uFlicker;
uniform float uVignette;
uniform float uSurreal;
uniform float uPulse;
uniform vec2 uCam;
uniform float uZoom;

uniform vec3 uBackground;
uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform vec3 uAccent;

#define HORIZON -0.15

${NOISE_GLSL}

/** Height of a rank of buildings above the horizon at world x. */
float skylineHeight(float x, float seed, float scale, float base, float variance) {
	float gx = x * scale + seed;
	float cell = floor(gx);
	float f = fract(gx);

	float h = base + hash11(cell * 1.37 + seed) * variance;
	// A setback on the upper half of some blocks, so rooflines are not flat.
	float setback = step(0.55, hash11(cell * 2.71 + seed)) * step(0.55, f);
	h -= setback * variance * 0.32;
	// Now and then a gap where the city thins out.
	h = mix(h, base * 0.3, step(0.93, hash11(cell * 4.13 + seed)));
	return h;
}

/** 1 below the roofline, antialiased across the edge. */
float silhouette(vec2 lp, float height) {
	float d = (HORIZON + height) - lp.y;
	float aa = fwidth(lp.y) * 1.5 + 0.0004;
	return smoothstep(-aa, aa, d);
}

/** Lit panes on a facade: a sparse grid, each flickering on its own clock. */
float windows(vec2 lp, float cell, float density) {
	vec2 g = vec2(lp.x, lp.y - HORIZON) / cell;
	vec2 id = floor(g);
	vec2 f = fract(g);

	float r = hash21(id + uSeed);
	float lit = step(1.0 - density, r);
	float phase = hash21(id * 1.7 + 3.1) * 6.2831;
	float flick = mix(
		1.0,
		0.45 + 0.55 * sin(uTime * (0.7 + r * 2.5) + phase),
		uFlicker
	);

	vec2 q = abs(f - 0.5);
	float pane =
		(1.0 - smoothstep(0.15, 0.27, q.x)) *
		(1.0 - smoothstep(0.20, 0.33, q.y));
	return lit * pane * max(0.0, flick);
}

/** A furnace mouth burning through the haze just above the horizon. */
float furnace(vec2 lp, float x, float spread, float rate) {
	vec2 d = (lp - vec2(x, HORIZON + 0.005)) * vec2(1.0, 2.4);
	float flick = mix(
		1.0,
		0.6 + 0.4 * valueNoise(vec2(uTime * rate, x * 10.0)),
		uFlicker
	);
	return exp(-dot(d, d) / (spread * spread)) * flick;
}

/** Everything about one chimney cell, so the stack and its smoke agree. */
struct Chimney {
	float present;
	float centre;
	float top;
	float dx;
};

Chimney chimneyAt(vec2 lp, float seed, float scale, float height) {
	float gx = lp.x * scale + seed;
	float cell = floor(gx);
	float f = fract(gx);
	float r = hash11(cell * 5.7 + seed);

	Chimney c;
	c.present = step(0.62, r);
	c.centre = 0.28 + hash11(cell * 8.3 + seed) * 0.44;
	c.top = HORIZON + height * (0.6 + r * 0.8);
	c.dx = (f - c.centre) / scale;
	return c;
}

float chimneyStack(vec2 lp, Chimney c, float halfWidth) {
	float inX = 1.0 - smoothstep(halfWidth, halfWidth * 1.35, abs(c.dx));
	float inY = step(lp.y, c.top) * step(HORIZON - 0.06, lp.y);
	return c.present * inX * inY;
}

/** The red aircraft-warning light on top of a stack, blinking slowly. */
float chimneyBeacon(vec2 lp, Chimney c) {
	vec2 d = vec2(c.dx, lp.y - (c.top + 0.004));
	float blink = step(0.45, fract(uTime * 0.4 + c.centre * 3.0));
	return c.present * blink * exp(-dot(d, d) * 12000.0);
}

/** Smoke leaving a stack: it rises, widens and dissolves. */
float chimneyPlume(vec2 lp, Chimney c, float speed) {
	float above = lp.y - c.top;
	float rise = smoothstep(0.0, 0.015, above) * exp(-above * 3.2);
	float spread = 0.02 + above * 0.55;
	float across = exp(-pow(c.dx / spread, 2.0));
	float n = fbm(vec2(lp.x * 3.5, lp.y * 2.6 - uTime * speed * uFogSpeed * 0.2));
	return c.present * rise * across * n;
}

/** A deck of fog sitting at a given height, drifting sideways. */
float fogBand(vec2 lp, float y0, float thickness, float speed, float seed) {
	float n = fbm(vec2(
		lp.x * 1.2 + uTime * speed * uFogSpeed * 0.05 + seed,
		lp.y * 2.4 + seed - uTime * speed * uFogSpeed * 0.012
	));
	float band = exp(-pow((lp.y - y0) / thickness, 2.0));
	return band * (0.25 + 0.75 * n);
}

float fireGlow(vec2 q) {
	return
		furnace(q, -0.34, 0.15, 1.3) +
		furnace(q, 0.06, 0.21, 0.9) +
		furnace(q, 0.41, 0.13, 1.7);
}

void main() {
	vec2 uv = gl_FragCoord.xy / uResolution;
	float aspect = uResolution.x / uResolution.y;
	float edge = aspect * 0.5;
	vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

	vec2 cam = uCam;
	p *= uZoom;

	// During a solo the whole world bends very slightly, like heat off a road.
	// The branch is on a uniform, so it is the same for every fragment of the
	// draw and costs nothing; four octaves of noise every frame for an effect
	// that is off most of the song would not be.
	if (uSurreal > 0.01) {
		p += uSurreal * 0.012 * vec2(
			fbm(vec2(p.y * 3.0, uTime * 0.12)) - 0.5,
			fbm(vec2(p.x * 3.0 + 9.1, uTime * 0.1)) - 0.5
		);
	}

	// --- sky ------------------------------------------------------------
	vec2 skyP = p + cam * 0.05;
	float above = smoothstep(HORIZON - 0.05, 0.45, skyP.y);
	vec3 col = mix(mix(uBackground, uPrimary * 0.8, 0.55), uBackground * 0.45, above);

	vec2 cloudP = p + cam * 0.08;
	float cloud = fbm(vec2(
		cloudP.x * 1.1 + uTime * 0.007 * uFogSpeed,
		cloudP.y * 2.6
	));
	col = mix(
		col,
		mix(uSecondary * 0.3, uPrimary * 0.3, cloud),
		cloud * 0.4 * smoothstep(HORIZON, 0.5, cloudP.y)
	);

	// --- furnaces, seen through everything that comes after --------------
	vec2 glowP = p + cam * 0.1;
	float fires = fireGlow(glowP);
	vec3 fireColour = mix(uPrimary, uAccent, 0.4);
	// A broad wash sitting on the horizon, under the individual furnaces: the
	// whole city is lit from below, not just the three places that burn.
	col += fireColour * exp(-max(0.0, skyP.y - HORIZON) * 6.0) * 0.16 * uLight;
	col += fireColour * fires * uLight * (0.35 + uGlow * 0.7) * (1.0 + uPulse * 0.7);

	// --- distant city ----------------------------------------------------
	vec2 farP = p + cam * 0.12;
	float farMask = silhouette(farP, skylineHeight(farP.x, 3.7 + uSeed, 11.0, 0.03, 0.13));
	col = mix(col, mix(uBackground, uSecondary * 0.16, 0.5), farMask * 0.9);
	col += mix(uAccent, uPrimary, 0.5) *
		windows(farP, 0.016, 0.08 + 0.07 * uIntensity) * farMask * uLight * 0.4;

	// --- the haze the city stands in ---------------------------------------
	// This one deck does most of the work: it cuts the buildings off at the
	// ankles and carries the furnace light sideways across the frame.
	vec2 fogAP = p + cam * 0.16;
	float haze = fogBand(fogAP, HORIZON + 0.015, 0.1, 0.7, 13.1) * uFog;
	col = mix(
		col,
		mix(uSecondary, uAccent, 0.5) * (0.34 + fires * 1.2),
		clamp(haze * 0.9, 0.0, 0.95)
	);

	// --- middle ground, where the stacks are ------------------------------
	vec2 midP = p + cam * 0.2;
	float midMask = silhouette(midP, skylineHeight(midP.x, 11.3 + uSeed, 6.5, 0.05, 0.21));
	vec3 midColour = mix(uBackground * 0.55, uSecondary * 0.1, 0.5);

	Chimney chimney = chimneyAt(midP, 21.7 + uSeed, 3.4, 0.42);
	float smoke = chimneyPlume(midP, chimney, 1.0) * (0.5 + uFog * 0.8);
	col = mix(col, mix(uSecondary, uAccent, 0.2) * 0.3, clamp(smoke, 0.0, 0.8));

	col = mix(col, midColour, midMask);
	col += mix(uAccent, uPrimary, 0.35) *
		windows(midP, 0.024, 0.1 + 0.12 * uIntensity) * midMask * uLight * 0.8;

	col = mix(col, midColour * 0.6, chimneyStack(midP, chimney, 0.012));
	col += uPrimary * chimneyBeacon(midP, chimney) * (1.2 + uGlow);

	// --- a thinner deck in front of the middle ground -----------------------
	vec2 fogBP = p + cam * 0.26;
	float fogB = fogBand(fogBP, HORIZON + 0.075, 0.085, 1.6, 7.9) * uFog;
	col = mix(
		col,
		mix(uSecondary * 0.9, uAccent * 0.6, 0.35) * (0.32 + fires * 0.8),
		clamp(fogB * 0.7, 0.0, 0.85)
	);

	// --- the searchlight, slow enough to be missed -------------------------
	vec2 beamD = p - vec2(sin(uTime * 0.13) * 0.5, HORIZON + 0.01);
	float angle = atan(beamD.x, max(beamD.y, 0.0001));
	float beam =
		exp(-pow((angle - sin(uTime * 0.17) * 0.5) / 0.16, 2.0)) *
		smoothstep(0.0, 0.14, beamD.y) * exp(-beamD.y * 4.0);
	col += mix(uAccent, vec3(1.0), 0.25) * beam * uLight * uGlow *
		0.05 * (0.3 + uIntensity);

	// --- the surreal column that stands in for a guitar solo ---------------
	// Not equalizer bars: a curtain of light standing over the city, with
	// filaments running up through it.
	if (uSurreal > 0.01) {
		float curtain = fbm(vec2(
			p.x * 2.5 + uTime * 0.05,
			p.y * 1.4 - uTime * 0.12
		));
		float filament = 0.45 + 0.55 * fbm(vec2(p.x * 22.0, p.y * 0.7 - uTime * 0.3));
		float column = exp(-pow((p.x - sin(uTime * 0.21) * 0.3) / 0.22, 2.0));
		col += mix(uSecondary, uAccent, curtain) * column * curtain * filament *
			smoothstep(HORIZON - 0.02, 0.32, p.y) *
			(1.0 - smoothstep(0.24, 0.52, p.y)) *
			uSurreal * 1.2 * (0.5 + uGlow);
	}

	// --- near structures ---------------------------------------------------
	vec2 nearP = p + cam * 0.35;
	col = mix(
		col,
		uBackground * 0.14,
		silhouette(nearP, skylineHeight(nearP.x, 43.1 + uSeed, 3.1, 0.01, 0.17))
	);

	// --- the ground, wet enough to hand the furnaces back ------------------
	vec2 fgP = p + cam * 0.45;
	float ground = smoothstep(HORIZON + 0.015, HORIZON - 0.1, fgP.y);
	// The furnaces mirrored about the horizon, smeared by the distance the
	// reflection travels.
	float wet = fireGlow(vec2(glowP.x, 2.0 * HORIZON - glowP.y + 0.02));
	vec3 groundColour = uBackground * 0.25 + fireColour * wet * 0.5 * uLight;
	col = mix(col, groundColour, ground * 0.94);

	// A low mist lying over it, so the bottom third is weather rather than a
	// flat black bar, and so the reflection has something to bleed into.
	float mist = fogBand(fgP, HORIZON - 0.14, 0.11, 0.5, 41.3) * uFog;
	col = mix(
		col,
		mix(uSecondary, fireColour, 0.45) * (0.12 + wet * 0.9),
		clamp(mist * 0.6, 0.0, 0.72)
	);

	// --- foreground frame --------------------------------------------------
	float pillars =
		(1.0 - smoothstep(0.04, 0.07, abs(fgP.x + edge * 0.84))) +
		(1.0 - smoothstep(0.026, 0.05, abs(fgP.x - edge * 0.73)));
	col = mix(col, vec3(0.0), clamp(pillars, 0.0, 1.0) * step(fgP.y, 0.34) * 0.94);

	float sag = 0.3 - 0.05 * cos(fgP.x * 2.2);
	col = mix(col, vec3(0.0), (1.0 - smoothstep(0.0022, 0.0045, abs(fgP.y - sag))) * 0.85);

	// --- grade --------------------------------------------------------------
	col = mix(col, col * 0.22, uDarkness);

	float vignette = smoothstep(
		0.88,
		0.26,
		length(vec2((uv.x - 0.5) * 1.25, (uv.y - 0.5) * 1.4))
	);
	col *= mix(1.0, vignette, uVignette);

	col = col / (col + vec3(0.5)) * 1.42;

	float luma = dot(col, vec3(0.299, 0.587, 0.114));
	col += (hashPixel(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) *
		0.055 * (0.12 + luma);

	fragColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;
