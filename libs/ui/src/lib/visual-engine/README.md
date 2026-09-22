# Visual engine

An animated world behind the player, built from a song's visual profile rather
than from its audio. It is plain TypeScript and WebGL2 with no dependencies and
no Angular: `mc-visual-scene` in the app is the only Angular in the chain.

## The chain

```
Player / lab transport
        │  position, audio
        ▼
Visual controller        ambient · timeline · audio-reactive
        │  intensity 0..1, section, pulse
        ▼
Visual state             one set of numbers per frame, smoothed
        │
        ▼
Visual engine            scene pass · particle pass · bloom
```

The renderer reads nothing but `VisualState`. It cannot tell whether the
intensity came from a song's timeline, from a live analyser, or from a slider
in the lab — which is the point, because Spotify and YouTube will not hand us
their samples, and the scene still has to be alive.

## Input modes

| Mode | Source | When |
| --- | --- | --- |
| `ambient` | its own slow clock | always available; the fallback |
| `timeline` | playback position against the profile's sections | a song we have a profile timeline for |
| `audio-reactive` | `AudioFeatures`, from an `AnalyserNode` or the simulator | when the tab's sound was captured |

## Intensity

Everything comes off one normalised number. Nothing is bound straight to
volume, and nothing snaps: each field of `VisualState` eases towards its target
with its own half-life, so light answers in under a second while fog and
particle density take a few. That difference is what makes a chorus arrive like
weather rather than like a cut.

Quiet sections are not simply "less": they get *more* fog and *more* darkness.
An intro is heavy and close; a chorus opens up.

## Profiles

A `SongVisualProfile` is data — palette, environment, particles, camera,
effects, and an optional section timeline. `resolveVisualProfile()` picks a
hand-authored profile when there is one, and otherwise derives something from
the genre. That function is the seam an AI service would take over: it would
return the same JSON shape from artist, album, year, genre and a lyric
analysis, and nothing downstream would change.

## Rendering

One fragment shader draws the whole world back to front — sky, smog, furnace
glow, three ranks of city at different parallax, two decks of fog woven between
them, chimneys with smoke, and a near-black foreground frame. Each layer offsets
by the camera times its own depth, which is where the sense of distance comes
from.

Embers are a second pass: point sprites whose positions are a pure function of
a seed and an accumulated phase, so there is no per-particle state and nothing
is allocated in the loop. Density changes just draw fewer of the same buffer.

Bloom is a bright pass, a separable blur at quarter resolution, and a
composite.

The quality setting moves the pixel ratio, the render scale, the particle
count, the fbm octave count (a compile-time define, so it rebuilds the program
once) and whether bloom runs at all.

## Adding a world

`environment.type` currently only renders `industrial`. A second world means a
second fragment shader with the same uniforms and a branch where the engine
builds its scene program; the controllers, the state and the profiles do not
change.
