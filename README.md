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
