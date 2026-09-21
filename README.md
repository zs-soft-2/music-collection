# music-collection

## Generate an application

Run `npx nx g @nx/angular:app my-app` to generate an application.

## Generate a library

Run `npx nx g @nx/angular:lib my-lib {--directory=my-folder}` to generate a library.

## Understand your workspace

Run `npx nx dep-graph` to see a diagram of the dependencies of your projects.

## Upgrade

npx nx migrate latest

## Emulator

firebase emulators:start

firebase emulators:export ./emulators.backup

firebase emulators:start --import=./emulators.backup

firebase emulators:start --import=./emulators.backup --export-on-exit

## start

npx nx serve music-collection

## App Check a localhoston

A callable-ök App Check tokent követelnek, a `nx serve` pedig a dev környezet
debug tokenjével vált egyet — a reCAPTCHA pontozása helyett, ami egy friss
böngészőprofilon vagy zárt hálózaton alacsony lehet.

A tokent a tofu teremti, és a state-ben él; a gépre egyszer kell lehozni (a
fájlt a git nem látja, a token titok — aki ismeri, az App Checket megkerülve
hívhatja a dev callable-öket):

```
tofu -chdir=infra/environments/dev output -raw app_check_debug_token \
  > .app-check-debug-token
```

A `nx serve`/`nx build` innen generálja az
`apps/music-collection/src/environments/app-check-debug-token.ts` fájlt. A fájl
nélkül is fut minden, csak a valódi reCAPTCHA-val (a `localhost` benne van a
dev kulcs engedélyezett domainjei között). A debug mód csak a `localhost`-on
kapcsol be, és a prod buildben sosem.
