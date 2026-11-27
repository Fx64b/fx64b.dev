# Fairway - game spec

A daily golf game in the browser. One full-size hole per day, played in first
person. The physics are realistic. The interface gives only a little help.

## 1. Decisions

| Topic            | Decision                                                                          |
| ---------------- | --------------------------------------------------------------------------------- |
| Holes per day    | One                                                                               |
| Visual style     | Clean realism without much detail. Cozy and calm, not low poly.                   |
| Power above 100% | Capped at 100%                                                                    |
| Power feedback   | A small meter                                                                     |
| Shot shape       | Straight shots only. Only the wind curves the ball.                               |
| Units shown      | Yards for distance, km/h for speed                                                |
| Units in code    | SI only (metres, m/s, kg, rad/s). Convert only at the edges (`physics/units.ts`). |
| Headings         | Radians from +x toward +z, `atan2(dz, dx)`. y is up.                              |
| Name             | Fairway                                                                           |
| Difficulty       | Random, from the seed                                                             |
| Location         | `games/fairway`, built into `public/games/`, embedded on fx64b.dev like Thornwick |

## 2. Core loop

1. The date (UTC, `YYYY-MM-DD`) is the seed. The seed gives one hole.
2. The player starts at the tee in first person. The game picks a club and
   aims down the hole (see 3).
3. The player changes the club or the aim if they like, then holds and
   releases to hit.
4. The camera flies with the ball. When the ball stops, the camera glides to
   the ball for the next shot.
5. Repeat until the ball is in the cup, or 12 strokes (the player picks up).
   The score is strokes against par.
6. The result can be shared as a short text.

## 3. Controls

- **Aim:** A/D or the arrow keys (faster the longer they are held, Shift for
  fine aim), or drag on the view. The view direction is the aim line.
- **Default aim:** straight at the pin when the club can reach it, else at
  the point on the centre line one full carry away, so on a dogleg the aim is
  down the fairway, not over the corner.
- **Club:** Q/E, the number keys 1 to 8, or the club bar. The game suggests
  the putter on the green (and from the first cut within 12 m), else the
  shortest club whose full carry reaches the pin.
- **Swing:** hold Space, or hold the mouse or a finger on the swing pad.
  Release to hit. A release below 3% power is ignored.
- **Hold time to power:** linear from 0 to 1 over 2.2 s, then capped at 1.
  Power is a fraction of the club's nominal carry (see 5.4). Half power gives
  about half the carry.
- **Putter:** power is linear in the roll distance on a flat green of
  Stimp 10: full power rolls 24 m (26 yd). On a faster green the same stroke
  rolls further.
- **Cancel a swing:** Escape while holding. On the pad, drag the pointer more
  than 80 px away and release there; sliding back onto the pad before the
  release hits as normal. Losing focus also cancels; it never hits.
- **Skip:** Enter or the Skip button skips the ball flight. A click or tap
  on the view does not skip.
- **Sound:** M turns all sound on and off, N only the music. Both also have
  buttons.
- **No random dispersion.** The same input always gives the same shot.

## 4. Camera

- **Address:** eye height 1.7 m, a few metres behind the ball, on the aim
  line.
- **Putting:** on the green the view crouches lower and further back, and a
  faint 1 m grid with slow downhill drifting dots shows the slope.
- **Flight:** chase camera behind and above the ball, with smoothing and a
  level horizon.
- **Stop:** a short pause, then a glide to the next address position.
- **Menus:** an overview of the hole.

## 5. Physics

The physics are a pure TypeScript module (`src/physics/`). They have no
rendering or DOM code, use only deterministic math (`detmath.ts`) and are
fully unit tested.

### 5.1 Ball and air

- Mass 0.04593 kg, diameter 0.04267 m.
- Air density from the seed (about 1.10 to 1.225 kg/m^3, for altitude).
- Fixed time step of 1/240 s. The result is deterministic for the same
  inputs.

### 5.2 Flight

- Forces: gravity, drag, Magnus lift.
- Drag and lift use the air velocity relative to the ball, so wind changes
  the flight.
- Cd and Cl are functions of the spin factor S = r \* omega / v.
- Spin decays slowly in flight.
- Pure backspin: the spin axis is horizontal and normal to the launch
  direction. There is no side spin.
- Wind is stronger at height (log profile, reference height 10 m).

### 5.3 Clubs

Launch angle and spin as listed. The ball speeds were calibrated in tests so
that the carry matches (no wind, sea level, flat ground).

| Club   | Ball speed   | Launch | Spin      | Carry                |
| ------ | ------------ | ------ | --------- | -------------------- |
| Driver | 63.6 m/s     | 12 deg | 2700 rpm  | about 235 yd (215 m) |
| 3 Wood | 59.4 m/s     | 11 deg | 3500 rpm  | about 213 yd (195 m) |
| 5 Iron | 53.7 m/s     | 13 deg | 5300 rpm  | about 180 yd (165 m) |
| 7 Iron | 50.5 m/s     | 16 deg | 7000 rpm  | about 159 yd (145 m) |
| 9 Iron | 45.3 m/s     | 21 deg | 8500 rpm  | about 131 yd (120 m) |
| PW     | 41.9 m/s     | 25 deg | 9300 rpm  | about 115 yd (105 m) |
| SW     | 33.3 m/s     | 30 deg | 10000 rpm | about 82 yd (75 m)   |
| Putter | 0 to 5.1 m/s | 0 deg  | 0         | 24 m roll (Stimp 10) |

### 5.4 Power

For a power p in (0, 1], the launch is chosen so that the carry with no wind
on flat ground is p times the nominal carry of the club (times the lie
factor, 5.6). Ball speed and spin scale together; the launch angle stays. A
table of carry against speed is computed once per club.

### 5.5 Ground contact

- At impact the velocity splits into a normal part (coefficient of
  restitution for the surface) and a tangent part (friction together with
  the spin).
- Backspin can stop the ball on a firm green and pull it back a little.
- Rolling resistance for each surface, plus gravity along the slope.
- Green speed from the Stimpmeter value (seed, 9 to 12 ft).
- Cup capture: the ball drops when it is slow enough over the cup. Fast putts
  can lip out. The cup is about 1.6 times the real size (170 mm across),
  because the game has no fine aim or green reading.

### 5.6 Surfaces and lies

| Surface       | Bounce        | Roll              | Next shot                                                           |
| ------------- | ------------- | ----------------- | ------------------------------------------------------------------- |
| Tee / Fairway | medium        | medium            | normal                                                              |
| First cut     | lower         | slower            | -5% distance                                                        |
| Rough         | low           | slow              | -15% distance, less spin                                            |
| Bunker        | almost none   | stops quickly     | -20% distance, a little less spin                                   |
| Green         | low to medium | fast (from Stimp) | putter                                                              |
| Water         | -             | -                 | +1 stroke, drop one club length back from where the ball crossed in |
| Out of bounds | -             | -                 | +1 stroke, hit again from the last position                         |

All lie effects are fixed values, not random. If the water drop lands in
water or out of bounds, the ball is dropped where it crossed in.

## 6. Hole generation

- Deterministic PRNG (sfc32) from a hash of the seed string, with separate
  streams for each feature.
- Par 3 (a quarter of the holes) is 140 to 220 yd, par 4 is 330 to 470 yd,
  par 5 is 470 to 600 yd. Harder holes lean longer.
- Difficulty from the seed. It controls fairway width, the number of
  hazards, the size of the green, wind strength and green slope.
- Centre line with 0 to 2 rounded doglegs. Fairway 27 to 44 yd wide.
- Rough bands, then trees or out of bounds. Guard trees can stand at the
  inside of a dogleg.
- Variety: ponds beside the green or the landing zone, creeks across the
  hole (some force a carry off the tee or into the green), fairways that stop
  short of the green, split par 5 fairways, greenside and fairway bunkers,
  waste areas, cross bunkers and pot bunkers.
- Green 27 to 38 yd, with its own fine heightmap (0.25 m). The pin sits on
  ground of at most 2.6% slope.
- Terrain from noise, smoothed under the fairway and green.
- A validation step checks that the hole is playable. If not, the next
  sub-seed is used.
- **Generator version:** each date maps to a generator version. Old versions
  stay in the code unchanged, so archive holes never change. A test pins a
  fingerprint of the launch-day holes.

## 7. Wind

- 0 to 25 km/h, with the strength range set by difficulty. The direction
  comes from the seed. It is constant for the hole and has no gusts.

## 8. HUD

- Hole number, par, strokes and the current lie.
- Distance to the pin in yards.
- Selected club and its nominal carry in yards (the putter shows its full
  roll).
- Wind arrow relative to the aim, and speed in km/h.
- A faint ring on the ground at the nominal full-power carry, on the aim
  line. It does not include wind, slope or lie.
- **Path preview:** faint dots along the start of the predicted path: the
  first 1.5% of the carry (at least 1 m) for a full shot, which shows the
  launch angle and direction, or the first 10% of the roll for a putt. They
  show full power while the player aims and the current power while the
  player holds.
- **Minimap:** a small top-down map, tee at the bottom and pin at the top,
  with the ball, the aim line and the nominal landing point.
- The power meter (marks at 25, 50 and 75%), the swing pad, a first-time
  hint, short messages (on the green, in the water, ...) and the sound
  toggle.

## 9. Daily, archive and random

- The first full play of the day is the official score. Later plays are
  practice.
- Archive: every date from the launch day (2026-11-27, hole #1) to today,
  with the player's score.
- Random seed and custom seed (shareable). Links: `?date=YYYY-MM-DD` plays a
  daily hole, `?seed=<text>` a seed, `?quality=low|high` sets the render
  tier (phones default to low).
- Storage: localStorage (results, sound and music settings, the hint). Every
  access is guarded; the game works without it.
- A shot is (club, aim, power), so a round can be replayed from its seed and
  shots.
- Share text: `Fairway #<n> - <strokes> (par <par>)` plus a short summary.

## 10. Sound

All sound is synthesized with Web Audio and starts on the first user
gesture.

- Ambient bed: wind (stronger with the hole's wind and during a flight),
  leaves and far birds.
- Effects: swing whoosh, club impact (wood, iron, putter), landings by
  surface, splash, cup drop, lip-out, a chime for a holed ball and soft menu
  clicks. Skipping a flight plays only the splash or the cup drop.
- Music: very faint generative music from the hole seed (keys, pad, bass),
  a little lower during a flight.

## 11. Code layout

```
games/fairway/
  SPEC.md  index.html  style.css  tsconfig.json  vite.config.ts
  dev-ui.html  dev-render.html   dev pages (not built)
  tools/       preview-hole.ts: a hole as a top-down PNG
  src/
    main.ts    composition root and frame loop
    shared/    HoleData: the contract between course, physics and render
    physics/   flight, ground contact, clubs, surfaces, units (no Three.js)
    course/    seeds and dates, PRNG, versioned hole generator, validation
    game/      round rules, storage, and the game flow:
               controller (phase machine), menus, flight playback,
               path preview, sound settings, debug hook (window.__fairway)
    render/    Three.js scene, terrain, trees, water, cameras
    ui/        HUD, minimap, menus, formatting (plain DOM)
    input/     keyboard, mouse and touch
    audio/     ambient, effects and music (Web Audio)
tests/games/fairway/   Vitest tests
```

## 12. Later

Leaderboard, replays, shot shaping.
