# Solstice

An interactive 3D view of the sun’s path across the sky. Pick a place and a day, then scrub the clock — or press play — and watch the sun move along its arc. Summer solstice, winter solstice, and equinox paths stay on the horizon disc so the season is visible at a glance.

Solar azimuth, altitude, sunrise, and sunset come from [`suncalc`](https://github.com/mourner/suncalc). The scene is Three.js via React Three Fiber.

The default place is Orlando, Florida (28.5383, −81.3792).

## Run locally

```bash
npm install
npm run dev
```

Open the URL Next.js prints, usually http://localhost:3000.

```bash
npm run verify   # solar geometry checks
npm run build    # production build
```

## Controls

- **Location** — latitude and longitude, or a city preset
- **Date** — slider or calendar, plus jumps to the solstices and equinox
- **Time** — 24-hour slider, a clock field, and play / pause (space bar)
- **Orbit** — drag to rotate, scroll to zoom, right-drag to pan

Times are mean solar time for the chosen longitude, so 12:00 stays near the sun’s highest point rather than a political time zone.

## Deploy

The app is a standard Next.js project. Vercel detects the framework with no extra build settings.

```bash
gh repo create solstice --source=. --public --push
vercel link
vercel --prod
```

A GitHub Actions workflow builds the app and runs the solar checks on every push.
