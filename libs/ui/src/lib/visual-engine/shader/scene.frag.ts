import { NOISE_GLSL } from './noise.glsl';

/**
 * One pass that can build a dozen different places, drawn back to front: sky,
 * what is in the sky, the light on the horizon, three ranks of silhouette at
 * different parallax, fog decks woven between them, the ground, and a near
 * frame.
 *
 * Every motif is gated by its own uniform weight, and the weights come from
 * the world the record stands in. A branch on a uniform is the same for every
 * fragment of the draw, so a world pays only for what it has: the forest never
 * evaluates a furnace, and the planet never evaluates a chimney.
 *
 * Nothing in here knows about any particular artist.
 */
export const SCENE_FRAGMENT = `#version 300 es
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

// --- the shape of the world, as opposed to its colour and weather ---------
// These are what make one record's world a different place rather than the
// same place repainted. They hold for a whole record.
uniform float uHorizon;
/** 0 an open sky with nothing under it; 1 a world with a ground. */
uniform float uLand;
/** The four silhouette generators, blended by weight. */
uniform float uBlocks;
uniform float uRidge;
uniform float uSpike;
uniform float uDunes;
/** How closely the silhouette is packed, and how far it rises. */
uniform float uDensity;
uniform float uHeight;
/** What stands in the world. */
uniform float uStacks;
uniform float uWindows;
uniform float uArcade;
uniform float uMonolith;
uniform float uArcs;
uniform float uGrid;
/** What is in the sky. */
uniform float uStars;
uniform float uMoon;
uniform float uAurora;
uniform float uNebula;
uniform float uDawn;
uniform float uStorm;
uniform float uSmog;
/** What the ground is made of. */
uniform float uWet;
uniform float uWater;
uniform float uSand;
/** Light and weather in front of everything. */
uniform float uFires;
uniform float uBeam;
uniform float uStreaks;
uniform float uFrame;
uniform float uBranches;

#define HORIZON uHorizon

${NOISE_GLSL}

/** A stable number per world, for the things a world places only once. */
float worldRandom(float index) {
	return hash11(uSeed * 0.731 + index * 17.13);
}

// --- the silhouette on the horizon -------------------------------------
// Four generators blended by weight. A city and a conifer ridge are not the
// same picture recoloured: one has flat roofs and lit panes, the other has
// points and nothing behind them, and a world can be some of both.

/** Flat roofs with setbacks and the odd gap where the city thins out. */
float blockHeight(float cell, float f, float seed, float base, float variance) {
	float h = base + hash11(cell * 1.37 + seed) * variance;
	float setback = step(0.55, hash11(cell * 2.71 + seed)) * step(0.55, f);
	h -= setback * variance * 0.32;
	return mix(h, base * 0.3, step(0.93, hash11(cell * 4.13 + seed)));
}

/** Something that was not built: a broken, continuous line of hills. */
float ridgeHeight(float gx, float seed, float base, float variance) {
	return base * 0.5 + variance * 1.7 * fbm(vec2(gx * 0.3, seed));
}

/** Points: conifers when packed and low, spires when sparse and tall. */
float spikeHeight(float cell, float f, float seed, float base, float variance) {
	float tall = base * 0.35 + variance * 2.2 * hash11(cell * 3.17 + seed);
	float lean = (hash11(cell * 6.91 + seed) - 0.5) * 0.22;
	float point = tall * max(0.0, 1.0 - abs(f - 0.5 + lean) * 2.1);
	return max(point, base * 0.1);
}

/** Long smooth crests that carry a lit edge on one side. */
float duneHeight(float gx, float seed, float base, float variance) {
	// Two crests at different scales, the near one steep on its lee side:
	// one sine is a hill, and a desert is a run of them.
	float far = 0.5 + 0.5 * sin(gx * 1.1 + seed);
	float near = pow(0.5 + 0.5 * sin(gx * 2.7 + seed * 2.3), 1.7);
	return base * 0.4 + variance * 1.9 * (far * 0.6 + near * 0.55) *
		(0.6 + 0.6 * fbm(vec2(gx * 0.35, seed * 0.5)));
}

/** Height of a rank above the horizon at world x, whatever this world is. */
float terrainHeight(float x, float seed, float scale, float base, float variance) {
	float gx = x * scale * uDensity + seed;
	float cell = floor(gx);
	float f = fract(gx);

	float total = uBlocks + uRidge + uSpike + uDunes;
	if (total < 0.001) {
		return 0.0;
	}

	float h =
		blockHeight(cell, f, seed, base, variance) * uBlocks +
		ridgeHeight(gx, seed, base, variance) * uRidge +
		spikeHeight(cell, f, seed, base, variance) * uSpike +
		duneHeight(gx, seed, base, variance) * uDunes;

	return h / total * uHeight;
}

/** 1 below the roofline, antialiased across the edge. */
float silhouette(vec2 lp, float height) {
	float d = (HORIZON + height) - lp.y;
	float aa = fwidth(lp.y) * 1.5 + 0.0004;
	return smoothstep(-aa, aa, d) * step(0.001, uLand);
}

/**
 * A ruined arcade: a wall with a row of arched openings, some of them fallen
 * in. It is the one silhouette with sky *inside* it, which is what makes a
 * flooded nave read as a building rather than as a block.
 */
float arcadeMask(vec2 lp, float seed, float scale, float height) {
	float gx = lp.x * scale + seed;
	float cell = floor(gx);
	float f = fract(gx) - 0.5;
	float y = lp.y - HORIZON;

	float r = hash11(cell * 7.71 + seed);
	float top = height * (0.65 + 0.6 * r);
	// Every third bay or so has lost its top; the wall steps down there.
	top *= mix(1.0, 0.35, step(0.72, hash11(cell * 9.13 + seed)));

	float wall = step(0.0, y) * step(y, top);

	float halfW = 0.26;
	float spring = top * 0.55;
	float body = step(abs(f), halfW) * step(y, spring);
	float crown = step(
		length(vec2(f / halfW, max(0.0, y - spring) / max(top - spring, 1e-4))),
		1.0
	) * step(spring, y);

	return max(0.0, wall - clamp(body + crown, 0.0, 1.0));
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
	return lit * pane * max(0.0, flick) * uWindows;
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
	float n = fbm(vec2(lp.x * 3.5, lp.y * 2.6 - uTime * speed * uFogSpeed * 0.5));
	return c.present * rise * across * n;
}

/** A deck of fog sitting at a given height, drifting sideways. */
float fogBand(vec2 lp, float y0, float thickness, float speed, float seed) {
	float n = fbm(vec2(
		lp.x * 1.2 + uTime * speed * uFogSpeed * 0.19 + seed,
		lp.y * 2.4 + seed - uTime * speed * uFogSpeed * 0.045
	));
	float band = exp(-pow((lp.y - y0) / thickness, 2.0));
	return band * (0.25 + 0.75 * n);
}

float fireGlow(vec2 q) {
	return (
		furnace(q, -0.34, 0.15, 1.3) +
		furnace(q, 0.06, 0.21, 0.9) +
		furnace(q, 0.41, 0.13, 1.7)
	) * uFires;
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

	// A storm flash lifts everything for a fifth of a second, so the whole
	// frame answers the lightning rather than only the cloud deck.
	float flash = 0.0;
	if (uStorm > 0.01) {
		float t = uTime * 1.47;
		flash = step(0.94, hash11(floor(t))) * exp(-fract(t) * 9.0) * uStorm;
	}
	float light = uLight * (1.0 + flash * 1.6);

	// --- sky ------------------------------------------------------------
	vec2 skyP = p + cam * 0.05;
	float above = smoothstep(HORIZON - 0.05, 0.45, skyP.y);
	vec3 col = mix(mix(uBackground, uPrimary * 0.8, 0.55), uBackground * 0.45, above);

	// A cloud of gas standing behind everything, for a world with no weather
	// because it has no air. It is the only motif allowed to be colourful in
	// the upper half of the frame.
	if (uNebula > 0.01) {
		vec2 np = (p + cam * 0.03) * vec2(0.85, 1.5);
		float n1 = fbm(np * 1.15 + vec2(uSeed, uTime * 0.011));
		float n2 = fbm(np * 2.6 + vec2(9.0 - uSeed, -uTime * 0.008));
		float cloud = pow(clamp(n1 * 1.35 - n2 * 0.45, 0.0, 1.0), 1.7);
		col += mix(uPrimary, uAccent, n2) * cloud * uNebula * 0.6;
		col += mix(uSecondary, vec3(1.0), 0.25) * pow(cloud, 3.0) * uNebula * 0.35;
	}

	// A sky with something in it other than smog. A world with no city under
	// it needs the height read somehow, and stars do it without a light.
	if (uStars > 0.01) {
		// A fine grid with a hard, small point in the few cells that have one:
		// a coarse grid with a soft falloff gives bokeh blobs, not a sky.
		vec2 sp = (p + cam * 0.03) * 90.0;
		vec2 id = floor(sp);
		float r = hash21(id + uSeed * 0.7);
		vec2 jitter = vec2(hash21(id * 1.7), hash21(id * 3.1)) * 0.6 + 0.2;
		float star = step(0.93, r) *
			(1.0 - smoothstep(0.0, 0.09 + r * 0.06, length(fract(sp) - jitter)));
		float twinkle = mix(
			1.0,
			0.5 + 0.5 * sin(uTime * (0.5 + r * 2.2) + r * 37.0),
			uFlicker
		);
		col += mix(uSecondary, vec3(1.0), 0.65) * star * twinkle *
			mix(1.0, smoothstep(HORIZON, 0.4, skyP.y), uLand) * uStars * 1.4;
	}

	// --- a body in the sky -------------------------------------------------
	// A moon at 1, a planet close enough to show its weather above that. It is
	// placed once per world and does not move, so it reads as somewhere the
	// listener is standing rather than as an effect.
	float moonLight = 0.0;
	vec2 moonAt = vec2(
		(worldRandom(3.0) - 0.5) * 0.7,
		HORIZON + 0.18 + worldRandom(5.0) * 0.22
	);
	if (uMoon > 0.01) {
		float radius = 0.03 + 0.055 * max(0.0, uMoon - 1.0) + 0.012 * uMoon;
		vec2 d = (p + cam * 0.02) - moonAt;
		float dist = length(d);
		float disc = 1.0 - smoothstep(radius * 0.97, radius * 1.03, dist);
		// Mare on a moon, cloud belts on a planet: the same noise read at a
		// different frequency, so one body serves both.
		float belts = uMoon > 1.0
			? 0.55 + 0.6 * fbm(vec2(d.x / radius * 1.4, d.y / radius * 6.0) + uSeed)
			: 0.7 + 0.45 * fbm(d / radius * 2.6 + 11.0);
		// A crescent, unless this world put its body at the full.
		float lit = smoothstep(
			-0.85,
			0.75,
			dot(normalize(d + 1e-5), vec2(0.72, 0.42)) + worldRandom(7.0) * 1.4
		);
		col = mix(
			col,
			mix(uSecondary, vec3(1.0), 0.7) * belts * (0.22 + 0.9 * lit),
			disc * 0.96
		);
		col += mix(uSecondary, uAccent, 0.35) * exp(-dist / (radius * 2.6)) *
			uMoon * 0.28 * (0.4 + uGlow);
		moonLight = uMoon;
	}

	// --- curtains of light standing above the horizon ----------------------
	if (uAurora > 0.01) {
		vec2 ap = p + cam * 0.04;
		float fold = fbm(vec2(ap.x * 1.7 + uTime * 0.035, uTime * 0.05));
		float veil = 0.0;
		for (int i = 0; i < 2; i++) {
			float k = float(i);
			float centre = HORIZON + 0.16 + k * 0.11 + fold * 0.17;
			float thickness = 0.09 + 0.07 * fold + k * 0.03;
			veil += exp(-pow((ap.y - centre) / thickness, 2.0)) *
				(0.35 + 0.75 * fbm(vec2(ap.x * (13.0 + k * 9.0), uTime * 0.07 + k)));
		}
		col += mix(uSecondary, uAccent, fold) * veil * uAurora * 0.42 *
			(0.45 + uGlow) * smoothstep(HORIZON - 0.02, HORIZON + 0.1, ap.y);
	}

	// --- concentric arcs, for a world that was never a place ---------------
	if (uArcs > 0.01) {
		// Around the planet when this world has one, so they read as rings
		// rather than as circles drawn on the sky.
		vec2 c = uMoon > 0.5 ? moonAt : vec2(0.0, HORIZON + 0.22);
		float rr = length((p + cam * 0.04 - c) * vec2(1.0, 1.35));
		float rings = 0.0;
		for (int i = 0; i < 3; i++) {
			float r0 = 0.17 + float(i) * 0.13 +
				sin(uTime * 0.07 + float(i) * 2.1) * 0.012;
			rings += 1.0 - smoothstep(0.0, 0.0045, abs(rr - r0));
		}
		col += mix(uSecondary, uAccent, 0.5) * rings * uArcs * 0.55 *
			(0.4 + uGlow);
	}

	// --- the last of the day sitting on the horizon ------------------------
	if (uDawn > 0.01) {
		float band = exp(-max(0.0, skyP.y - HORIZON) * 5.2);
		col += mix(uAccent, uPrimary, 0.35) * band * 0.42 * uDawn * light;

		vec2 sd = (p + cam * 0.04) -
			vec2((worldRandom(11.0) - 0.5) * 0.6, HORIZON + 0.03);
		col += mix(uAccent, vec3(1.0), 0.55) *
			(1.0 - smoothstep(0.03, 0.036, length(sd))) * uDawn * (0.7 + uGlow);
		col += mix(uAccent, uPrimary, 0.45) * exp(-length(sd) * 7.5) * 0.3 * uDawn;
	}

	// --- a cloud deck with weather in it -----------------------------------
	if (uStorm > 0.01) {
		vec2 sp = p + cam * 0.06;
		float deck = fbm(vec2(
			sp.x * 1.4 + uTime * 0.055 * uFogSpeed,
			sp.y * 3.4
		));
		float cover = smoothstep(HORIZON + 0.01, 0.42, sp.y) * (0.3 + 0.7 * deck);
		col = mix(
			col,
			mix(uBackground, uSecondary * 0.45, 0.4) * (0.28 + deck * 0.55),
			cover * uStorm * 0.82
		);
		col += mix(uSecondary, vec3(1.0), 0.75) * flash * cover * 1.3;
	}

	// The thin smog that a city has instead of clouds.
	if (uSmog > 0.01) {
		vec2 cloudP = p + cam * 0.08;
		float cloud = fbm(vec2(
			cloudP.x * 1.1 + uTime * 0.03 * uFogSpeed,
			cloudP.y * 2.6
		));
		col = mix(
			col,
			mix(uSecondary * 0.3, uPrimary * 0.3, cloud),
			cloud * 0.4 * uSmog * smoothstep(HORIZON, 0.5, cloudP.y)
		);
	}

	// --- furnaces, seen through everything that comes after --------------
	vec2 glowP = p + cam * 0.1;
	float fires = fireGlow(glowP);
	vec3 fireColour = mix(uPrimary, uAccent, 0.4);
	if (uFires > 0.01) {
		// A broad wash sitting on the horizon, under the individual furnaces:
		// the whole city is lit from below, not just the three places that
		// burn.
		col += fireColour * exp(-max(0.0, skyP.y - HORIZON) * 6.0) * 0.16 *
			light * uFires;
		col += fireColour * fires * light * (0.35 + uGlow * 0.7) *
			(1.0 + uPulse * 0.7);
	}

	// --- distant rank ------------------------------------------------------
	vec2 farP = p + cam * 0.12;
	float farMask = silhouette(farP, terrainHeight(farP.x, 3.7 + uSeed, 11.0, 0.03, 0.13));
	col = mix(col, mix(uBackground, uSecondary * 0.16, 0.5), farMask * 0.9);
	col += mix(uAccent, uPrimary, 0.5) *
		windows(farP, 0.016, 0.08 + 0.07 * uIntensity) * farMask * light * 0.4;

	// --- the haze the world stands in ---------------------------------------
	// This one deck does most of the work: it cuts the silhouette off at the
	// ankles and carries the low light sideways across the frame.
	vec2 fogAP = p + cam * 0.16;
	float haze = fogBand(fogAP, HORIZON + 0.015, 0.1, 0.7, 13.1) * uFog * uLand;
	col = mix(
		col,
		mix(uSecondary, uAccent, 0.5) * (0.34 + fires * 1.2 + flash * 0.8),
		clamp(haze * 0.9, 0.0, 0.95)
	);

	// --- middle ground ------------------------------------------------------
	vec2 midP = p + cam * 0.2;
	float midMask = silhouette(midP, terrainHeight(midP.x, 11.3 + uSeed, 6.5, 0.05, 0.21));
	vec3 midColour = mix(uBackground * 0.55, uSecondary * 0.1, 0.5);

	// A world without industry has no stacks and no smoke; the branch is on a
	// uniform, so every fragment of the draw takes the same side of it.
	if (uStacks > 0.01) {
		Chimney chimney = chimneyAt(midP, 21.7 + uSeed, 3.4, 0.42 * uStacks);
		float smoke =
			chimneyPlume(midP, chimney, 1.0) * (0.5 + uFog * 0.8) * uStacks;
		col = mix(
			col,
			mix(uSecondary, uAccent, 0.2) * 0.3,
			clamp(smoke, 0.0, 0.8)
		);

		col = mix(col, midColour, midMask);
		col += mix(uAccent, uPrimary, 0.35) *
			windows(midP, 0.024, 0.1 + 0.12 * uIntensity) * midMask * light * 0.8;

		col = mix(col, midColour * 0.6, chimneyStack(midP, chimney, 0.012));
		col += uPrimary * chimneyBeacon(midP, chimney) * (1.2 + uGlow) * uStacks;
	} else {
		col = mix(col, midColour, midMask);
		col += mix(uAccent, uPrimary, 0.35) *
			windows(midP, 0.024, 0.1 + 0.12 * uIntensity) * midMask * light * 0.8;
	}

	// A nave standing in the middle ground, with the sky showing through it.
	if (uArcade > 0.01) {
		float arcade = arcadeMask(midP, 31.3 + uSeed, 3.4, 0.4 * uArcade);
		col = mix(col, midColour * 0.45, arcade);
		// The openings are what the light comes through, so the ribs beside
		// them carry a little of it.
		col += mix(uAccent, uSecondary, 0.4) *
			windows(midP, 0.02, 0.05 + 0.08 * uIntensity) * arcade * light * 0.7;
	}

	// Slabs that were never built by anyone, lit down one edge.
	if (uMonolith > 0.01) {
		for (int i = 0; i < 2; i++) {
			float k = float(i);
			float x0 = (worldRandom(21.0 + k * 3.0) - 0.5) * 0.9;
			float w = 0.018 + worldRandom(23.0 + k * 3.0) * 0.03;
			float h = 0.16 + worldRandom(25.0 + k * 3.0) * 0.22;
			float body = step(abs(midP.x - x0), w) *
				step(midP.y, HORIZON + h) * step(HORIZON - 0.03, midP.y);
			col = mix(col, uBackground * 0.06, body * uMonolith);
			float lip = (1.0 - smoothstep(0.0, 0.005, abs(midP.x - (x0 - w)))) *
				step(midP.y, HORIZON + h) * step(HORIZON - 0.02, midP.y);
			col += mix(uAccent, vec3(1.0), 0.3) * lip * uMonolith *
				(0.5 + uGlow) * 0.7;
		}
	}

	// --- a thinner deck in front of the middle ground -----------------------
	vec2 fogBP = p + cam * 0.26;
	float fogB = fogBand(fogBP, HORIZON + 0.075, 0.085, 1.6, 7.9) * uFog * uLand;
	col = mix(
		col,
		mix(uSecondary * 0.9, uAccent * 0.6, 0.35) * (0.32 + fires * 0.8),
		clamp(fogB * 0.7, 0.0, 0.85)
	);

	// --- the searchlight, slow enough to be missed -------------------------
	if (uBeam > 0.01) {
		vec2 beamD = p - vec2(sin(uTime * 0.27) * 0.5, HORIZON + 0.01);
		float angle = atan(beamD.x, max(beamD.y, 0.0001));
		float beam =
			exp(-pow((angle - sin(uTime * 0.23) * 0.7) / 0.16, 2.0)) *
			smoothstep(0.0, 0.14, beamD.y) * exp(-beamD.y * 4.0);
		col += mix(uAccent, vec3(1.0), 0.25) * beam * light * uGlow *
			0.13 * (0.3 + uIntensity) * uBeam;
	}

	// --- the surreal column that stands in for a guitar solo ---------------
	// Not equalizer bars: a curtain of light standing over the world, with
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
		silhouette(nearP, terrainHeight(nearP.x, 43.1 + uSeed, 3.1, 0.01, 0.17))
	);

	// --- the ground --------------------------------------------------------
	vec2 fgP = p + cam * 0.45;
	if (uLand > 0.01) {
		float under = HORIZON - fgP.y;
		float ground = smoothstep(HORIZON + 0.015, HORIZON - 0.1, fgP.y);

		// The furnaces mirrored about the horizon, smeared by the distance the
		// reflection travels.
		float wet =
			fireGlow(vec2(glowP.x, 2.0 * HORIZON - glowP.y + 0.02)) * uWet;
		vec3 groundColour = uBackground * 0.25 + fireColour * wet * 0.5 * light;
		// Dry ground keeps some of the sky's warmth instead of going black.
		groundColour = mix(
			groundColour,
			mix(uAccent * 0.16, uPrimary * 0.12, 0.5),
			uSand * 0.8
		);
		col = mix(col, groundColour, ground * 0.94 * uLand);

		// Still water: the sky compressed towards the shoreline, broken into
		// bands by a ripple that slows down as it recedes.
		if (uWater > 0.01) {
			float depth = smoothstep(0.0, 0.025, under);
			float z = 1.0 / (under + 0.045);
			float ripple = fbm(vec2(
				fgP.x * 2.6 + uTime * 0.04,
				z * 0.5 - uTime * 0.35 * uFogSpeed
			));
			float band = smoothstep(0.34, 0.92, ripple);
			vec3 mirror = mix(uBackground * 0.5, uSecondary * 0.35, 0.5) +
				fireColour * 0.25 * uFires;
			// The body in the sky lays a road across the water.
			float road = exp(-pow((fgP.x - moonAt.x) / 0.07, 2.0)) *
				moonLight * band;
			col = mix(
				col,
				mirror * (0.3 + band * 1.1) +
					mix(uSecondary, vec3(1.0), 0.6) * road * 0.5,
				depth * uWater * 0.88
			);
			col += mix(uSecondary, vec3(1.0), 0.8) * flash * depth * uWater * 0.5;
		}

		// A grid on the ground, converging where the ground meets the sky.
		if (uGrid > 0.01) {
			float depth = smoothstep(0.0, 0.012, under);
			float z = 1.0 / (under + 0.03);
			float across = 1.0 - smoothstep(
				0.0,
				0.09,
				abs(fract(fgP.x * z * 0.18 + 0.5) - 0.5) * 2.0
			);
			float along = 1.0 - smoothstep(
				0.0,
				0.12,
				abs(fract(z * 0.35 - uTime * 0.12) - 0.5) * 2.0
			);
			col += mix(uSecondary, uAccent, 0.5) * (across + along) * depth *
				uGrid * 0.22 * exp(-under * 2.6) * (0.4 + uGlow);
		}

		// A low mist lying over it, so the bottom third is weather rather than
		// a flat bar, and so the reflection has something to bleed into.
		float mist = fogBand(fgP, HORIZON - 0.14, 0.11, 0.5, 41.3) * uFog;
		col = mix(
			col,
			mix(uSecondary, fireColour, 0.45) * (0.12 + wet * 0.9),
			clamp(mist * 0.6, 0.0, 0.72) * uLand
		);
	}

	// --- weather in front of everything ------------------------------------
	// Driving rain, in screen space rather than in the world: it is between
	// the listener and the place, which is why it leans with the frame and not
	// with the camera.
	if (uStreaks > 0.01) {
		vec2 rp = vec2(p.x + p.y * 0.2, p.y - uTime * 1.15 * max(uFogSpeed, 0.3));
		vec2 id = floor(vec2(rp.x * 150.0, rp.y * 7.0));
		float lane = fract(rp.x * 150.0);
		float drop = step(0.86, hash21(id));
		float streak = drop *
			(1.0 - smoothstep(0.0, 0.45, abs(lane - 0.5))) *
			pow(fract(rp.y * 7.0), 1.6);
		col += mix(uSecondary, vec3(1.0), 0.55) * streak * uStreaks * 0.085 *
			(0.4 + light * 0.6);
	}

	// --- foreground frame --------------------------------------------------
	// Poles and a slack cable read as somewhere people wired up. A ridge under
	// stars was never wired, so worlds that are not built skip this entirely,
	// and the frame stops being the one thing every record has in common.
	if (uFrame > 0.01) {
		float pillars =
			(1.0 - smoothstep(0.04, 0.07, abs(fgP.x + edge * 0.84))) +
			(1.0 - smoothstep(0.026, 0.05, abs(fgP.x - edge * 0.73)));
		col = mix(
			col,
			vec3(0.0),
			clamp(pillars, 0.0, 1.0) * step(fgP.y, 0.34) * 0.94 * uFrame
		);

		float sag = 0.3 - 0.05 * cos(fgP.x * 2.2);
		col = mix(
			col,
			vec3(0.0),
			(1.0 - smoothstep(0.0022, 0.0045, abs(fgP.y - sag))) * 0.85 * uFrame
		);
	}

	// Bare limbs hanging into the top of the frame, for a world one is
	// standing under rather than looking at.
	if (uBranches > 0.01) {
		vec2 bp = vec2(fgP.x, 0.52 - fgP.y);
		float limbs = 0.0;
		for (int i = 0; i < 3; i++) {
			float s = float(i) * 13.7 + uSeed;
			float x0 = (hash11(s) - 0.5) * 1.5;
			float lean = (hash11(s + 1.0) - 0.5) * 1.6;
			float twig = x0 + bp.y * lean + sin(bp.y * 7.0 + s) * 0.03;
			limbs += (1.0 - smoothstep(0.004, 0.013, abs(bp.x - twig))) *
				(1.0 - smoothstep(0.14, 0.34, bp.y)) * step(0.0, bp.y);
		}
		col = mix(col, vec3(0.0), clamp(limbs, 0.0, 1.0) * 0.9 * uBranches);
	}

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
