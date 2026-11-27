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
| Units in code    | SI only (metres, m/s, kg, rad/s). Convert only in the UI.                         |
| Name             | Fairway                                                                           |
| Difficulty       | Random, from the seed                                                             |
| Location         | `games/fairway`, built into `public/games/`, embedded on fx64b.dev like Thornwick |

## 2. Core loop

1. The date (UTC, `YYYY-MM-DD`) is the seed. The seed gives one hole.
2. The player starts at the tee in first person, looking at the flag.
3. The player selects a club, aims, then holds and releases to hit.
4. The camera flies with the ball. When the ball stops, the player stands at
   the ball and the view faces the pin.
5. Repeat until the ball is in the cup. The score is strokes against par.
6. The result can be shared as a short text.

## 3. Controls

- **Aim:** A/D or the arrow keys, or drag on the screen. The view direction is
  the aim line.
- **Club:** Q/E, the number keys, or the club bar. The game selects a default
  club for the distance to the pin.
- **Swing:** hold Space, or hold the mouse or a finger on the swing pad. Release
  to hit.
- **Cancel a swing:** press Escape while holding. On the pad, drag the finger or
  pointer more than 80 px away (for example up or left) and release there.
  Sliding back onto the pad before the release hits as normal.
- **Hold time to power:** linear from 0 to 1 over 2.2 s, then capped at 1.
  Power is a fraction of the club's nominal carry distance. The physics module
  finds the launch speed for that carry (see 5.4). Half power gives about half
  the carry.
- **Putter:** power is linear in the roll distance on a flat green of
  Stimp 10: full power rolls 24 m (26 yd). On a faster green the same stroke
  rolls further.
- **Power meter:** a bar next to the swing pad, with marks at 25, 50 and
  75%. It fills while the player holds.
- **Path preview:** faint dots along only the start of the predicted flight
  (the first 1.5% of the carry, at least 1 m: the launch angle and
  direction), or along the first 10% of the roll for a putt. They show full
  power while the player aims, and the current power while the player holds.
- **No random dispersion.** The same input always gives the same shot.

## 4. Camera

- **Address:** eye height 1.7 m, 3 m behind the ball, on the aim line.
- **Flight:** chase camera behind and above the ball, with smoothing and a
  level horizon.
- **Stop:** a short glide to the next address position.
- **Skip:** the Skip button or Enter skips the flight. A click or tap on the
  view does not skip.

## 5. Physics

The physics are a pure TypeScript module (`src/physics/`). They have no
rendering or DOM code and are fully unit tested.

### 5.1 Ball and air

- Mass 0.04593 kg, diameter 0.04267 m.
- Air density from the seed (about 1.10 to 1.225 kg/m^3, for altitude).
- Fixed time step of 1/240 s. The result must be deterministic for the same
  inputs.

### 5.2 Flight

- Forces: gravity, drag, Magnus lift.
- Drag and lift use the air velocity relative to the ball, so wind changes
  the flight.
- Cd and Cl are functions of the spin factor S = r * omega / v.
- Spin decays slowly in flight.
- The spin axis is horizontal and normal to the launch direction (pure
  backspin). There is no side spin, because the game has only straight shots.
- Wind is stronger at height (log profile, reference height 10 m).

### 5.3 Clubs (start values, calibrate in tests)

| Club   | Ball speed   | Launch | Spin      | Carry (no wind, sea level) |
| ------ | ------------ | ------ | --------- | -------------------------- |
| Driver | 65 m/s       | 12 deg | 2700 rpm  | about 235 yd (215 m)       |
| 3 Wood | 61 m/s       | 11 deg | 3500 rpm  | about 213 yd (195 m)       |
| 5 Iron | 56 m/s       | 13 deg | 5300 rpm  | about 180 yd (165 m)       |
| 7 Iron | 51 m/s       | 16 deg | 7000 rpm  | about 159 yd (145 m)       |
| 9 Iron | 46 m/s       | 21 deg | 8500 rpm  | about 131 yd (120 m)       |
| PW     | 42 m/s       | 25 deg | 9300 rpm  | about 115 yd (105 m)       |
| SW     | 36 m/s       | 30 deg | 10000 rpm | about 82 yd (75 m)         |
| Putter | 0 to 5.1 m/s | 0 deg  | 0         | 24 m roll (Stimp 10)       |

### 5.4 Power

For a power p in (0, 1], find the launch so that the carry with no wind on flat
ground is p times the nominal carry of the club. Scale ball speed and spin
together. Keep the launch angle. Use a lookup table or a solver, computed once
for each club.

### 5.5 Ground contact

- At impact, split the velocity into a normal part and a tangent part. The
  normal part uses a coefficient of restitution for the surface. The tangent
  part uses friction together with the spin.
- Backspin can stop the ball on a firm green and pull it back a little.
- Rolling resistance for each surface, plus gravity along the slope.
- Green speed from the Stimpmeter value (seed, 9 to 12 ft).
- Cup capture: the ball drops when it is slow enough near the cup centre.
  Fast putts can lip out. The cup is about 1.6 times the real size (170 mm
  instead of 108 mm), because the game has no fine aim or green reading.

### 5.6 Surfaces and lies

| Surface       | Bounce        | Roll              | Next shot                                   |
| ------------- | ------------- | ----------------- | ------------------------------------------- |
| Tee / Fairway | medium        | medium            | normal                                      |
| First cut     | lower         | slower            | -5% distance                                |
| Rough         | low           | slow              | -15% distance, less spin                    |
| Bunker        | almost none   | stops quickly     | fairway bunker -20%, greenside: wedge       |
| Green         | low to medium | fast (from Stimp) | putter                                      |
| Water         | -             | -                 | +1 stroke, drop where the ball crossed in   |
| Out of bounds | -             | -                 | +1 stroke, hit again from the last position |

All lie effects are fixed values, not random.

## 6. Hole generation

- Deterministic PRNG (sfc32) from a hash of the seed string.
- Par 3 is 140 to 220 yd, par 4 is 330 to 470 yd, par 5 is 470 to 600 yd.
- Difficulty from the seed. It controls fairway width, the number of hazards,
  wind strength and green slope.
- Centre line spline with 0 to 2 doglegs. Fairway 27 to 44 yd wide.
- Rough bands, then trees or out of bounds.
- Green 27 to 38 yd, with its own fine heightmap (0.25 m) and 1 to 3% slopes.
- Bunkers at the landing zones and around the green. Water sometimes.
- Terrain from noise, smoothed under the fairway and green.
- A validation step checks that the hole is playable. If not, it uses the next
  sub-seed.
- **Generator version:** each date maps to a generator version. Old versions
  stay in the code, so archive holes never change.

## 7. Wind

- 0 to 25 km/h, with the strength range set by difficulty. The direction comes
  from the seed. It is constant for the hole and has no gusts.

## 8. HUD

- Distance to the pin in yards.
- Selected club and its nominal carry in yards.
- Wind arrow and speed in km/h.
- Current lie.
- A faint ring on the ground at the nominal full-power carry, on the aim line.
  It does not include wind, slope or lie.
- The power meter and the path preview.

## 9. Daily, archive and random

- The first full play of the day is the official score. Later plays are
  practice.
- Archive: a list of past dates with the player's score.
- Random seed and custom seed (shareable).
- Storage: localStorage.
- A round is the seed plus a list of (club, aim, power) values. This makes
  replays and later score checks possible.
- Share text: `Fairway #<n> - <strokes> (par <par>)` plus a short summary.

## 10. Code layout

```
games/fairway/
  SPEC.md
  index.html
  style.css
  tsconfig.json
  vite.config.ts
  src/
    physics/   flight, ground contact, clubs, surfaces (no Three.js)
    course/    seed, PRNG, hole generator (no Three.js)
    render/    Three.js scene, terrain, camera
    input/     keyboard, mouse, touch
    game/      state, scoring, storage
    main.ts
tests/games/fairway/   Vitest tests for physics and course
```

## 11. Phases

1. Physics core and tests. Calibrate against the club table.
2. Flat test terrain with surfaces, camera and swing input.
3. Seeded hole generator.
4. Putting, green slopes and the cup.
5. Daily, archive, random seed, share text, storage.
6. Polish: sound, visual style, trees, mobile performance.
7. Later: leaderboard, replays, shot shaping.
