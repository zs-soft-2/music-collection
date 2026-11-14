# Manual checks: Honest feedback on the image URL field

**Feature**: `80-image-url-field-feedback` · **Issue**: #80

Written by tasks T015 to T017. `/speckit-issue-verify` reads this file as evidence and writes its own `verification.md`.

## Done without a login (2026-11-04)

Measured on a local `nx build music-collection --configuration=dev`, served from `127.0.0.1` with no CSP, in headless Chrome on the public home page.

| Check | Result | Evidence for |
|---|---|---|
| `--p-form-field-focus-border-color`, dark | `rgb(0, 212, 255)` | FR-006 |
| `--p-form-field-focus-border-color`, light | `rgb(0, 145, 179)` | FR-006 |
| `--p-primary-color`, dark and light | `rgb(255, 68, 68)`, `rgb(224, 45, 45)`: unchanged | FR-007 |
| Bundle stats: `primeng/image` and the new component | Both in lazy chunks, neither in `main` | R-3 |
| `npm run verify:csp` on this build | Passes: 2 inline things hashed, nothing left over | XV |
| Throwaway spec with `provideZonelessChangeDetection()` on the artist form, no manual change detection | Typed address shows its picture, an error shows the message, a new address clears it | AC-2, AC-4 |

These measure the token and the change detection, not a focused field on a real form. In the headless run the programmatic focus did not match `:focus-visible`, so the 16 hand-built rules were not measured.

## Open: needs an admin login (T016)

Run on the local app in both colour modes. Do not press Save: these checks leave dev data untouched.

| Check | Expected | Result |
|---|---|---|
| Focus a filled field on the artist form | Cyan outline, not red (AC-5, SC-003) | open |
| Focus a text field, a select and the date field on the copy details form | Cyan outline, not red (AC-5, SC-003) | open |
| Move the keyboard focus onto a choice card in the wishlist dialog | Cyan outline | open |
| Tab to a button or link on the same pages | Still red (FR-007) | open |
| Enter `https://invalid.invalid/x.jpg` on the artist form and on the album form | The message replaces the picture, and on a valid form Save stays enabled (AC-2, AC-3, SC-002) | open |
| Switch language | The message follows, in hu, en and de | open |
| Replace it with a loading address | The message goes and the picture appears (AC-4) | open |
| Apply an address from the artist form's data suggestions | Behaves like a typed one | open |

## Dev check (T017)

Deployed 2026-11-06 with the maintainer's go-ahead: `npm run deploy:dev` from `7c2f28a2`, hosting only (client and `firebase.json` headers). No functions, rules or indexes changed.

The address, rebuilt from the screenshot by Wikimedia's thumbnail pattern: `https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Razor_14_%2829083912276%29.jpg/1280px-Razor_14_%2829083912276%29.jpg` (`curl`: 200 `image/jpeg`, with the dev origin as `Referer`).

| Check | Expected | Result |
|---|---|---|
| Headless Chrome on `https://music-collection-16676.web.app/home` (deployed page, its own CSP), the address loaded as an `Image` | Loads | Loaded, 1280 px wide |
| Same page, control `https://example.com/x.jpg` | Blocked by the CSP | Error, with an `img-src` violation in the console: the policy is in force |
| Paste the address on the Razor artist form on dev (needs an admin login) | The picture shows with no message (AC-1, SC-001). If it fails, the root cause is not found and #80 goes back to investigation. | open |
