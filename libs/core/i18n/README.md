# core-i18n

Hungarian, English and German at runtime: the dictionary, the language the
reader picked, and the pipes that write a date, a number or a price the way
that language writes it.

## Where it sits

Tagged `type:api` rather than `type:core`, which the folder might suggest.
The tag says which way the dependencies run, and this library is at the
bottom: `api`, `ui`, `domain`, `admin` and the app all read the dictionary,
while it depends on no workspace library at all. It lives under `libs/core/`
because choosing a language is an application-level concern, but nothing may
be below it.

## What is here

| | |
|---|---|
| `language.ts` | The three languages, their locales, and what they call themselves. |
| `LanguageService` | Which one is in force. Set `language` to switch; everything else follows. |
| `provideI18n()` | Transloco, the locale data, and the dictionary fetched before the first paint. |
| `TextService` | The same words for code that builds a string rather than shows one. |
| `mcDate`, `mcNumber`, `mcPercent`, `mcCurrency` | Angular's pipes, but reading the language rather than `LOCALE_ID`. |
| `mcPlural` | A counted thing, by `Intl.PluralRules` rather than by `=== 1`. |
| `mcCatalog` | A word of one of the catalog's own vocabularies. |
| `RegionService` | Country names, straight from the browser's ICU data. |
| `assets/i18n/*.json` | The three dictionaries. The app copies them into its own assets at build time. |

## Two decisions worth knowing

**Runtime, not build-time.** Angular's own i18n settles at build: it would
mean three deployed bundles, a reload on every switch, and it could not touch
a word that comes out of Firestore. `LOCALE_ID` is settled at bootstrap for
the same reason, which is why the pipes here take the locale as an argument.

**Styles are not translated.** `Thrash`, `Melodic Death`, `Gothenburg` and
`Grindcore` are what the Hungarian and German metal press call them too.
Formats, media, countries, decades and the Goldmine grades *are* translated —
those are the app's own words. Artist, album and track names never are.

## Adding a string

1. Put the key in all three of `assets/i18n/{en,hu,de}.json`.
2. Use it: `{{ 'page.album.tracklist' | transloco }}`, or `*transloco="let t"`
   and `t('…')` where a template says many of them.
3. `nx test core-i18n` — `dictionaries.spec.ts` fails if a language is short a
   key, leaves one blank, drops a `{{ placeholder }}`, or puts a string where
   another key wants a branch.
