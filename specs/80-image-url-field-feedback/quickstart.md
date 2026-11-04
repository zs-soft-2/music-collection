# Quickstart: validating the image URL feedback

**Feature**: `80-image-url-field-feedback` · **Issue**: #80 · **Date**: 2026-11-03

Test levels and commands follow `.specify/project/verify.md`. The behaviour is defined in
[contracts/image-url-preview.md](./contracts/image-url-preview.md), and the style rules are listed in
[data-model.md](./data-model.md).

> This is the validation guide. Implementation detail belongs in `tasks.md`.

## Automated checks

No login, emulator or deploy is needed.

```bash
npx nx run-many -t test -p ui,domain-artist,domain-album,music-collection
npm test
npm run test:rules
npm run lint
npm run verify:csp
```

Expected: all pass. The new tests fail before the change and pass after it.

| AC | Proven by |
|---|---|
| AC-1 | `artist-form.component.spec.ts`: a set address renders the picture and no message |
| AC-2 | `artist-form.component.spec.ts`: after an error the message shows and the picture is gone, the value is unchanged, the form is still valid and the Save button stays enabled |
| AC-3 | `album-form.component.spec.ts`: the same on `coverImageUrl` |
| AC-4 | Both form specs: after a new address the message goes and the picture returns |
| AC-5 (token) | `music-preset.spec.ts`: the form field focus token is the focus ring, and the primary colour is unchanged |

The dictionaries spec in `libs/core/i18n` covers the new key in all three languages.

## Bundle check

Build the app and confirm `primeng/image` has not entered the main bundle (R-3).

## Manual checks on the local app

Run `npm start` and open `http://127.0.0.1:4200` with an admin login. Check in both colour modes, and record the results in `manual-checks.md`.

| Check | Expected |
|---|---|
| Focus a filled field on the artist form | Cyan outline, not red (AC-5, SC-003) |
| Focus a text field, a select and the date field on the copy details form | Cyan outline, not red (AC-5, SC-003) |
| Move the keyboard focus onto a choice card in the wishlist dialog | Cyan outline |
| Tab to a button or link on the same pages | Still red (FR-007) |
| Enter `https://invalid.invalid/x.jpg` on the artist form and on the album form | The message replaces the picture, and on a form that was valid the Save button stays enabled. Do not press it: these checks leave dev data untouched (AC-2, AC-3) |
| Switch language | The message follows, in hu, en and de |
| Replace it with a loading address | The message goes and the picture appears (AC-4) |
| Apply an address from the artist form's data suggestions | Behaves like a typed one |

## Manual check on dev: needs a deploy

This step needs the maintainer's go-ahead (constitution VIII), because `nx serve` sends no content policy.

1. After the hosting and client deploy to dev, open the Razor artist form.
2. Paste the address from the ticket's screenshot (recorded in [issue-sync.md](./issue-sync.md); the full URL is on #60).
3. Expected: the picture shows with no message (AC-1, SC-001). Record the result in `manual-checks.md`.
4. If it still fails, the root cause is not found, and the ticket goes back to investigation (constitution II).
