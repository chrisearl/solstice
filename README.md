# Solstice

An interactive 3D view of the sun’s path across the sky. Pick a place and a day, then scrub the clock — or press play — and watch the sun move along its arc. Summer solstice, winter solstice, and equinox paths stay on the horizon disc so the season is visible at a glance.

Solar azimuth, altitude, sunrise, and sunset come from [`suncalc`](https://github.com/mourner/suncalc). The scene is Three.js via React Three Fiber.

The default place is Orlando, Florida (28.5383, −81.3792).

## Run locally

```bash
pnpm install
pnpm dev
```

Open the URL Next.js prints, usually http://localhost:3000.

```bash
pnpm verify   # solar geometry checks
pnpm build    # production build
```

## Controls

- **Location** — latitude and longitude, a city preset, or this device’s location
- **Date** — slider or calendar, plus jumps to the solstices and both equinoxes
- **Time** — 24-hour slider colored by sunlight phase, a clock field, and play / pause (space bar). An altitude trace sits under the slider.
- **Sun events** — dawn, sunrise, solar noon, sunset, and dusk seek the clock
- **Shadow** — length in meters for an object of a chosen height. The gnomon shadow in the scene stays a visual.
- **Link** — the address bar keeps place, date, mean solar time, and object height
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
