# Solstice

An interactive 3D view of the sun’s path across the sky — and a classic heliocentric orrery. Pick a place and a day, then scrub the clock — or press play — and watch the sun move along its arc. Summer solstice, winter solstice, and equinox paths stay on the horizon disc so the season is visible at a glance.

Switch between two appliances:

- **Astrolabe** — local sky sundial with seasonal arcs, compass disc, and gnomon shadow
- **Orrery** — Sun plus eight planets and Earth’s Moon on logarithmic orbits

Both appliances support two themes:

- **Night Sky** — default dark starfield rendering
- **Da Vinci** — parchment codex style (Konami code unlock)

Solar azimuth, altitude, sunrise, and sunset come from [`suncalc`](https://github.com/mourner/suncalc). Planet positions use Keplerian ephemeris (J2000 elements). The scene is Three.js via React Three Fiber.

The default place is Orlando, Florida (28.5383, −81.3792).

## Run locally

```bash
pnpm install
pnpm dev
```

Open the URL Next.js prints, usually http://localhost:3000.

```bash
pnpm verify   # solar + orrery geometry checks
pnpm build    # production build
```

## Controls

### Astrolabe

- **Location** — latitude and longitude, a city preset, or this device’s location
- **Date** — slider or calendar, plus jumps to the solstices and both equinoxes
- **Time** — 24-hour slider colored by sunlight phase, a clock field, and play / pause (space bar). An altitude trace sits under the slider.
- **Sun events** — dawn, sunrise, solar noon, sunset, and dusk seek the clock
- **Shadow** — length of the shadow cast by a 1 m object. The gnomon shadow in the scene stays a visual.

### Orrery

- **Date** — day-of-year slider with orbital phase sparkline for the focused planet
- **Time** — optional sub-day slider for Moon fine motion
- **Playback** — days per second (1 d/s … 3650 d/s) with optional year loop
- **Focus** — click a planet or choose from the inspector; HUD shows longitude, distance (AU), and orbital phase
- **Visibility** — toggle individual planets in the inspector

### Shared

- **Views** — Astrolabe / Orrery toggle; Night / Da Vinci theme when unlocked
- **Link** — the address bar keeps place, date, time, model, and theme (`?model=orrery&theme=davinci`)
- **Orbit** — drag to rotate, scroll to zoom, right-drag to pan

Times on the clock and on the sun events are mean solar time for the chosen longitude, so 12:00 stays near the sun’s highest point. Civil time is the local clock for that place, shown beside mean solar time.

## Deploy

The app is a standard Next.js project. Vercel detects the framework with no extra build settings.

```bash
gh repo create solstice --source=. --public --push
vercel link
vercel --prod
```

A GitHub Actions workflow builds the app and runs the solar checks on every push.
