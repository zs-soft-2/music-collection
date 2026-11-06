# Data model: Honest feedback on the image URL field

**Feature**: `80-image-url-field-feedback` · **Issue**: #80 · **Date**: 2026-11-03

No stored data changes: no Firestore field, migration, backfill or script. `artist.imageUrl` and
`album.coverImageUrl` remain free text, and a failing address is saved as entered (FR-004).

## View state: preview outcome

It belongs to one `mc-image-url-preview` instance and is never saved.

| State | Condition | On screen |
|---|---|---|
| Empty | `url` is empty | Nothing |
| Showing | `url` is set, no error reported | The picture, or the browser's loading state |
| Failed | `url` is set, error reported for it | The message, no picture |

| Transition | Trigger |
|---|---|
| Showing → Failed | The picture reports a load error |
| Any → Showing | `url` changes to a non-empty value |
| Any → Empty | `url` becomes empty |

A freshly opened form creates a new instance, so it starts from Showing and tries the address again.

## Focus rules to change

Each rule changes `var(--mc-primary)` to `var(--mc-info)`. Line numbers are from `21cbf9c6`, and paths are under `apps/music-collection/src/app/`.

| # | File | Line | Selector | Kind |
|---|---|---|---|---|
| 1 | `page/album/album-page.component.scss` | 287 | `.verdict-note input:focus-visible` | text field |
| 2 | `page/album/component/release-picker/release-picker.component.scss` | 405 | `.field input, textarea:focus-visible` | text field |
| 3 | `page/album/component/wishlist-dialog/wishlist-dialog.component.scss` | 143 | `.chip:has(input:focus-visible)` | choice card |
| 4 | `page/album/component/wishlist-dialog/wishlist-dialog.component.scss` | 166 | `.field input:focus-visible` | text field |
| 5 | `page/collection-item/component/copy-details-form/copy-details-form.component.scss` | 73 | `input, select, textarea:focus-visible` | text field, select |
| 6 | `page/collection/collection-page.component.scss` | 102 | `.search input:focus-visible` | text field |
| 7 | `page/collection/collection-page.component.scss` | 185 | `.select select:focus-visible` | select |
| 8 | `shared/music-ui/copy-placement/copy-placement.component.scss` | 169 | `.chip:has(input:focus-visible)` | choice card |
| 9 | `shared/music-ui/copy-placement/copy-placement.component.scss` | 194 | `.field input, textarea:focus-visible` | text field |
| 10 | `shared/music-ui/copy-removal/copy-removal.component.scss` | 163 | `.chip:has(input:focus-visible)` | choice card |
| 11 | `shared/music-ui/copy-removal/copy-removal.component.scss` | 188 | `.field input, textarea:focus-visible` | text field |
| 12 | `page/home/component/home-search/home-search.component.ts` | 187 | `.search input:focus-visible` | text field |
| 13 | `page/admin/music-collection/component/discography-picker.component.ts` | 220 | `.search:focus-within` | text field |
| 14 | `page/profile/component/profile-privacy/profile-privacy.component.ts` | 239 | `select, input[type='text']:focus-visible` | text field, select |
| 15 | `page/profile/component/profile-shelves/profile-shelves.component.ts` | 714 | `.name:focus` | text field |
| 16 | `page/profile/component/profile-account/profile-account.component.ts` | 145 | `input:focus-visible` | text field |

Rules for buttons, links, cards and similar elements in the same files stay as they are (FR-007).
