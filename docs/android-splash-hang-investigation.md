# Android splash-screen hang — investigation & fixes

## Symptom

The app hung indefinitely on the splash screen on a physical Android tester
device. Sentry (recently wired up) reported nothing — no exception, no ANR,
no breadcrumb — even though the device sat on the splash screen for minutes.

## Root causes (three independent bugs)

### 1. Silent font-load error swallowing — `app/_layout.tsx`

`SplashScreen.hideAsync()` was gated solely on `fontsLoaded` from `useFonts`,
which returns `[loaded, error]`. The code only destructured `loaded`, so a
rejected font promise threw nothing — no JS exception, no Sentry event — and
the splash screen waited forever on a promise that had already failed or
would never settle.

**Fix**: capture `fontError`, report it via `Sentry.captureException`, and add
an 8-second watchdog that force-proceeds and reports
`Sentry.captureMessage('Splash hang: useFonts unresolved after 8s', 'warning')`
if neither `loaded` nor `error` ever resolves. Splash visibility is now gated
on `ready = fontsLoaded || !!fontError || fontTimedOut`.

### 2. `gradleCommand` leaking into the `testing` profile via deep-merge — `eas.json`

EAS's `extends` performs a **deep merge** of nested objects like `android`/
`env` — overriding one key (`buildType`) does not clear sibling keys
(`gradleCommand`) inherited from the parent profile.

The `testing` profile extended `development` and only overrode `buildType`:

```json
"testing": {
  "extends": "development",
  "developmentClient": false,
  "android": { "buildType": "apk" }
}
```

`development.android.gradleCommand` is `:app:assembleDebug`. Because
`testing.android` didn't explicitly override `gradleCommand`, it inherited
`:app:assembleDebug` — regardless of `developmentClient: false`. Debug-type
Gradle assemblies don't embed the JS bundle/assets/fonts; they load from
Metro at runtime. This is why the shipped APK contained no JS bundle, no
fonts, and no Sentry init — it was effectively a dev-client build without the
dev-client UI, hanging forever waiting for a Metro connection that didn't
exist.

Confirmed via `npx eas-cli config --profile testing --platform android`,
which prints the fully *resolved* profile (post-merge) — the `eas.json`
source alone doesn't show what actually gets inherited.

**Fix**: explicitly set `"gradleCommand": ":app:assembleRelease"` in
`testing.android`.

### 3. Sentry plugin misconfiguration — `app.config.ts`

Sentry was registered in **two conflicting places**:

- `'@sentry/react-native/expo'` as a bare string in the `plugins` array (no
  options)
- `withSentry(config, { organization, project, url })` wrapping the default
  export

`config` is a *dynamic config function* — `({ config }: ConfigContext) =>
({...})` — not a resolved config object. `withSentry`'s internal
`withAppBuildGradle`/`withDangerousMod` calls threw when given a function;
the error was swallowed by `withSentry`'s own `try/catch` + `warnOnce`, so it
silently returned the function untouched. Expo then evaluated that function
to get the real config — including the bare `'@sentry/react-native/expo'`
plugin string with **no options** — and that's the registration that actually
ran.

Result: the generated `android/sentry.properties` had no `defaults.org` /
`defaults.project`, no `SENTRY_ORG`/`SENTRY_PROJECT` env vars existed in the
EAS build environment to fall back on, and the Gradle release assembly failed
with:

```
[@sentry/react-native/expo] Missing config for organization, project. Environment
variables will be used as a fallback during the build.
...
error: An organization ID or slug is required (provide with --org)
```

(Confirmed by downloading and brotli-decompressing the EAS build log —
`eas-cli build:list`/`build:view` don't print phase-level stdout/stderr.)

**Fix**: pass `organization`/`project`/`url` as options on the plugin tuple
(the standard config-plugin pattern) instead of via the broken `withSentry()`
wrapper, and remove the wrapper entirely:

```ts
[
  '@sentry/react-native/expo',
  {
    url: 'https://sentry.io/',
    project: 'react-native',
    organization: 'bricks-and-giggles'
  }
]
```

This also fixed a pre-existing `tsc` type error
(`config: ExpoConfig = ({ config }) => ({...})` — a function assigned to an
object-typed variable) that had been dismissed as unrelated noise. It was
actually the type system flagging the exact function-vs-object mismatch that
broke `withSentry`.

## Verification

- `npx eas-cli config --profile testing --platform android` — confirms the
  resolved profile shows `gradleCommand: ":app:assembleRelease"`
- `npx expo config --type public` — confirms the resolved Sentry plugin entry
  carries `organization: 'bricks-and-giggles'`, `project: 'react-native'`,
  `url: 'https://sentry.io/'`
- `npx tsc --noEmit -p .` — `app.config.ts` type-checks clean

## Outstanding: `SENTRY_AUTH_TOKEN` for cloud builds

`sentry-cli` (invoked by `sentry.gradle` during the release assembly to
upload source maps) needs `SENTRY_AUTH_TOKEN`. It exists locally
(`.env.local`, `ios/sentry.properties`) but **never reaches the EAS cloud
build worker** — `withSentry` deliberately omits `authToken` from the
generated `sentry.properties` (to avoid committing it), relying on the
`SENTRY_AUTH_TOKEN` env var as a fallback.

The `testing` build profile resolves to the **`preview`** EAS environment
(confirmed via build logs and `eas env:list --environment preview`, which
came back empty). To fix:

```bash
eas env:create preview --name SENTRY_AUTH_TOKEN --visibility secret --scope project
```

Run interactively (omit `--value` so the token isn't written to shell
history) and paste the token from `.env.local`. The same variable will likely
be needed for the `production` environment too, for release source-map
uploads.

## Commits

- `fix(build): correct gradleCommand inheritance in testing build profile`
- `fix(splash): surface font load failures instead of hanging silently`
- `fix(sentry): configure org/project via plugin tuple instead of withSentry wrapper`
