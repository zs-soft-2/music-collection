# Issue sync: #80 "A kép-URL mező piros keretes, és törött az előnézete érvényes URL-nél is" — dev @ 21cbf9c6

**Summary**: 3 ✅ · 0 ⚠️ · 0 ❌ · baseline green. Run 2026-11-03. Not reproduced on the real form (needs an admin login).

## What the screenshot shows

From #60 (no image in #80 itself): the artist form's *Képek* section in dark mode. *Fotó URL* holds `https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Razor_14_%2829083912276%29.jpg/1280px-…`, cut off by the field's right edge, with a red outline and a broken-image glyph below. It is the only outlined field; *Fejléckép* and *Főkép* have grey outlines and working previews.

## Findings

**Red outline: almost certainly the focus style, not validation.**
- The control has no validators: `libs/domain/music/artist/src/lib/util/service/artist-util.service.impl.ts:194`.
- No style in `apps/` or `libs/` reacts to `:invalid`, `ng-invalid` or `p-invalid` on this input.
- PrimeNG's focus border resolves to the primary colour, which is red: `apps/music-collection/src/app/theme/music-preset.ts:31` (`#e02d2d` / `#ff4444`). The preset has no `formField` override.
- Static analysis only; the focused state of the screenshot is inferred.

**Broken preview: very probably the content policy of that day, since fixed (inference).**
- #60 was created 2026-10-04 15:46Z; `thumb.wikimedia.org` entered the CSP in `34048fcc` at 21:33Z the same day. The issue's body may have been edited later; this was not checked.
- #60's sync (C4) rejected this cause because it checked the CSP as it stood at that sync, not as it stood when the screenshot was taken.
- Headless Chrome, exact Razor URL, a test page carrying only the `img-src` rule (not the real form):

| `img-src` | Result |
|---|---|
| Today's `firebase.json` | loaded, 1280 px wide |
| `34048fcc~1:firebase.json` | error |

- Deployed dev hosting sends the rule with the host allowed. `curl` gets 200 `image/jpeg` with and without a `Referer` from the dev origin.

**Still true today:** no form preview handles a load error, so a really bad URL gives a silent broken glyph. There is no debounce, so half-typed values are attempted.

## Current-state claims

| # | claim | status | evidence / correction |
|---|---|---|---|
| C1 | The field is `type="url"` and the preview is `p-image` | ✅ | `libs/domain/music/artist/src/lib/form/component/artist-form.component.html:161`, `:168-174` |
| C2 | The hosting CSP allows `thumb.wikimedia.org` | ✅ | `firebase.json:44`, and the deployed dev header |
| C3 | The cut-off URL is visual and the picture is reachable | ✅ | 200 `image/jpeg`; no `maxlength` or slicing in the code |

## Tasks

| # | task | status | evidence |
|---|---|---|---|
| T1 | Find what makes the outline red | ✅ answered | focus colour, see above |
| T2 | Find why the preview is broken | ✅ answered | earlier CSP (inference), see above |

The issue asks only for clarification. The work below comes from the gate decisions.

## Testing plan

- Unit (jest): `artist-form.component.spec.ts` and `album-form.component.spec.ts` exist but do not assert on the preview. The theme preset has no spec.
- Manual on dev: `nx serve` sends no CSP, so the content policy can only be checked on deployed hosting.
- Related form previews not touched: label, musician (no form or util spec) and music-collection cover.

## Constitution

- II (root cause): ⚠️ the message must not stand in for the root cause. AC-1 confirms the cause on the real form.
- III (a fix needs a test that failed first; each AC needs a test or a recorded manual check): applies.
- IV (ticket, branch, `(#80)` in commits): applies.
- VIII (no deploy without the maintainer): AC-1 and AC-5 on dev need one.
- XI (each AC names its test level): met.

## Baseline tests

| command | result | failing |
|---|---|---|
| `npx nx run-many -t test -p domain-artist,domain-album,domain-label` | artist 79/79, album 57/57, label 16/16 | none |

## Side note

Prod hosting (`music-collection-4e074.web.app`) sends no CSP or `Referrer-Policy` header, so the current `firebase.json` is not live there. Not part of this ticket.

## Decisions at the gate (2026-11-03)

- Preview: add an error message on artist + album only.
- Focus: use the existing cyan focus colour on form fields, across the application.
- The AC list below is approved.

## Approved acceptance criteria

| AC | Given / When / Then | source | tasks | verification |
|---|---|---|---|---|
| AC-1 | Adott az artist űrlap és egy betölthető kép-URL; beillesztéskor az előnézet ezt a képet mutatja, hibaüzenet nélkül | T2 | T2 | unit + manual (dev, CSP-vel) |
| AC-2 | Adott egy nem betölthető URL; amikor az előnézet hibát kap, törött kép helyett magyar/angol/német üzenet jelenik meg, az érték megmarad és az űrlap menthető | derived, gate | T2 | unit |
| AC-3 | Ugyanez az album `coverImageUrl` mezőjén | derived, gate | T2 | unit |
| AC-4 | Hibaüzenet látszik; ha az URL betölthetőre változik, az üzenet eltűnik és megjelenik a kép | derived, gate | T2 | unit |
| AC-5 | Adott egy érvényes értékű űrlapmező; fókuszban a kerete nem piros, így nem néz ki hibának | T1, gate | T1 | manual, és unit a téma tokenjére |

## Open decisions

None.
