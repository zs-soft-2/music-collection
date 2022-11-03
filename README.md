# music-collection

## Generate an application

Run `npx nx g @nrwl/angular:app my-app` to generate an application.

## Generate a library

Run `npx nx g @nrwl/angular:lib my-lib {--directory=my-folder}` to generate a library.

## Understand your workspace

Run `npx nx dep-graph` to see a diagram of the dependencies of your projects.

## Emulator

firebase emulators:start

firebase emulators:export ./emulators.backup

firebase emulators:start --import=./emulators.backup
