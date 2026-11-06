# functions

A háttér: jogosultság-szinkron, a katalógus írásai, amiket a kliens nem
kaphat meg, a külső források (Discogs, MusicBrainz) és minden modellhívás az
AI-gatewayen át. Egy codebase (`security` a `firebase.json`-ben), egy régió
(`europe-west4`). A functionök témánként a `*.functions.ts` fájlokban élnek, a
közös beállítás (régió, CPU, App Check, secretek) a `functions-runtime.ts`-ben;
az `index.ts` csak re-exportál. A számítás a mellettük álló fájlokban.

## Jogosultság-szinkron

A permission-alapú jogosultság szerveroldali fele. Egyetlen igazságforrást tart
karban: a `security/users/{uid}/effective_permissions` dokumentumot.

```
role/{roleId}.permissions ─┐
                           ├─► security/users/{uid}/effective_permissions
user/{uid}.roleIds ────────┘        ▲                    ▲            ▲
                                    │                    │            │
                          firestore.rules        storage.rules     kliens
                                                (firestore.get)  (ngx-permissions)
```

- **`syncUserPermissions`** — `user/{uid}` írásakor. Csak akkor számol újra, ha
  a szerepkör-hivatkozások változtak; a user törlésekor a dokumentumot is
  leveszi.
- **`syncRolePermissions`** — `role/{roleId}` írásakor minden érintett user.
- **`resyncEffectivePermissions`** — callable, teljes újraszámolás (backfill).
  ADMIN permission kell hozzá.

A `role` dokumentum `permissions` tömbje dönt; a user dokumentumon lévő
hivatkozások (`roleIds`, illetve a régi, beágyazott `roles`) csak megnevezik a
szerepkört. A beágyazott `roles[].permissions` szándékosan nem számít.

**Custom claimet nem írunk**: a claimek együtt 1000 bájtba férnek, amit a teljes
permission-lista túllépné. A Storage ezért cross-service `firestore.get()`-tel
olvassa ugyanezt a dokumentumot.

## Discogs

- **`discogsMasterVersions`** — callable, egy Discogs master összes kiadása
  (`{ masterId }` → `{ masterId, versions }`) a release-kéréshez. Gyűjtő
  (`createCollectionItemEntity`) vagy ADMIN hívhatja. Az eredményt egy hétig a
  `discogs-cache/master-{id}` dokumentumban őrzi (a kliens nem éri el).
- **`discogsLookup`** — callable, a katalógus-űrlapok Discogs-alternatívája,
  amikor a MusicBrainz nem ismeri a bandát vagy a lemezt. Öt kérdés egy
  végponton (`{ kind, … }`): banda keresése névre, banda profilja és
  taglistája, diszkográfiája, album (master) keresése és profilja a
  tracklistával. Előadó- vagy album-szerkesztő
  (`createArtistEntity`/`updateArtistEntity`/`createAlbumEntity`/`updateAlbumEntity`)
  vagy ADMIN hívhatja; minden válasz egy hétig él a `discogs-cache` alatt
  (`band-{id}`, `band-albums-{id}`, `band-search-{név}`,
  `master-profile-{id}`, `master-search-{előadó}--{album}`).

    Egy végpont, nem öt: a europe-west4-es Cloud Run régiós CPU-kerete (20 vCPU)
    minden új functionnel szűkül, és az öt lekérdezés ugyanazt a tokent, cache-t
    és hibakezelést használja. A leképezés csak normalizál; a katalógus enumjaira
    (`StyleEnum`, `FormatEnum`) a kliens mapperei képeznek — a functions külön
    npm-projekt, a `libs`-ből nem tud importálni, ezért a
    `apps/functions/src/discogs-lookup.ts` és a
    `libs/api/…/external/discogs-lookup.ts` alakját együtt kell tartani.

- **`discogsArtistProfile`**, **`discogsLabelProfile`**, **`discogsLabelSearch`**
  — a zenész- és kiadó-űrlap Load gombja; a kiadó névre keres előbb, mert a
  katalógus kiadói a kiadásokból, névre születnek. Cache:
  `discogs-cache/artist-{id}`, `label-{id}`, `label-search-{név}`.

A Discogs-hívások a `DISCOGS_TOKEN` secretet használják (60 kérés/perc). A
secretet és a hozzáférését az `infra/environments` teremti, az értékét kézzel
tesszük fel (`gcloud secrets versions add DISCOGS_TOKEN --data-file=-`); érték
nélkül a function deployja elszáll.

## A katalógus írásai, amik csak innen mehetnek

- **`approveReleaseRequest`** — callable, release-kérés jóváhagyása (ADMIN): a
  kiadás a katalógusba (a Discogsról importálva, vagy egy meglévő
  katalógus-kiadás), egy példány a kérő kollekciójába kerül, egy
  tranzakcióban, a kliens-szinkronnal (`updatedAt`, `sync/catalog`) együtt.
- **`decideRequest`** — a gyűjtő módosítási javaslatának elbírálása (ADMIN):
  mezőnként `verdicts`, az elfogadottak a katalógusba kerülnek, a válasz
  (`entity-response`) minden elutasítás mellé indoklást visz.
- **`ensureGenericRelease`** — az album általános kiadása egy hordozón
  (`{ artistUid, albumUid, media }`), meglévő vagy most létrehozva: ezzel vesz
  fel példányt az, aki a préselést nem tudja.
- **`deleteReleaseEntity`**, **`deleteAlbumEntity`** — törlés a katalógusból.
  A rules a kliensnek tiltja, mert a feltétel csak itt nézhető meg: ha más
  gyűjtőnek van belőle példánya (albumnál: vagy értékelte), a válasz
  `failed-precondition`, és a kliens az archiválást ajánlja. A kiadás saját
  számai, az album préselései, számai, közreműködései és a hívó saját
  példányai vele mennek.
- **`createMusicCollectionEntity` / `updateMusicCollectionEntity` /
  `deleteMusicCollectionEntity`** — callable-ök az absztrakt collectionökhöz.
  A `firestore.rules` a `music-collection` írását a kliensnek tiltja, ezért a
  definíció csak innen kerülhet be. Mindhárom a nevével egyező permissiont
  kéri (az ADMIN mindent visz), és egy tranzakcióban dolgozik: a slug egyedi
  marad, a szülőlánc nem lesz körkörös, a törlés markert hagy, és a
  `sync/catalog` is frissül.

    A szabályt a `music-collection-definition.ts` validálja — fehérlistás
    kulcsokkal, mert az ismeretlen szűrőt a resolver nem nézi, az üres criteria
    pedig az egész katalógusra illeszkedik. Publikálni ezért csak tényleges
    szűrővel lehet. A `criteriaVersion` csak akkor nő, ha a szabály változott.

- **`syncAlbumRating`** — trigger a gyűjtő privát értékelésén: a lemez
  közösségi összegét (`album-rating/{albumId}`: darab, átlag, megoszlás)
  számolja újra. Az írás a kliensé, a számolás a szerveré — ki mit adott, nem
  hagyja el a user dokumentumát (`album-rating.ts`).

## Modellhívások — mind az AI-gatewayen

Minden modellhívás a gatewayen megy ki (`src/gateway-client.ts`,
`@zssz-soft/zs-ai-sdk`): a szolgáltatót és a kulcsokat a gateway tartja,
szolgáltatói kulcs (Anthropic, Vertex) itt nincs. Két beállítás kell hozzá:

- `GATEWAY_API_KEY` — a gateway-tenant API-kulcsa, secret, ugyanúgy, mint a
  `DISCOGS_TOKEN` (az `infra/environments` teremti, az értéket kézzel tesszük
  fel). A tenantnak engedélyezve kell lennie a használt modelleknek
  (`claude-opus-5` a képolvasáshoz, `gemini-2.5-flash` a szöveges feladatokra,
  a kép- és videómodellek a jelvényhez és a zeneszám-médiához).
- `GATEWAY_BASE_URL` — a gateway címe `/api/v1` nélkül. Nem titok:
  projektenként az `.env.<project_id>` fájl adja.

- **`identifyRecordFromPhoto`**, **`identifyShelfFromPhotos`** — fotós
  felismerés (`vision-client.ts`): vonalkód, majd a képről olvasott jelek a
  Discogson; a polcfotó két független olvasat egy-két képről. Gyűjtő vagy
  ADMIN hívhatja, gyűjtőnként napi keretből (`photo-scan-quota.ts`).
- **`generateMusicCollectionBadge`**, **`setMusicCollectionBadgeImage`**,
  **`adoptMusicCollectionBadgeImage`**, **`read`/`updateBadgeGenerationSettings`**
  — jelvény a collection tárolt adataiból (`badge-generation.ts`): a prompt a
  szerveren épül, több jelölt készül, az admin választ vagy sajátot iktat be.
  A stíluszár kódban marad, verziózva.
- **`generateTrackMedia`** — a zeneszám képe és klipje egy végponton
  (`action`: ár, rajzolás, indítás, állapot; `track-media.ts`). A videót a
  gateway futtatja, a `status` szedi össze.
- **`suggestConcerts`**, **`suggestVenues`**, **`read`/`updateConcertAiSettings`**
  — koncert- és helyszín-javaslatok keresésre támaszkodó modelltől
  (`concert-suggestion.ts`, `venue-suggestion.ts`); `pending` állapotban a
  `concert-suggestion` / `venue-suggestion` kollekcióba, a nyilvános lapra
  csak jóváhagyás után. Napi keret, admin beállítással.

A napi kérdés és a hét bandája nem kérdez modellt: a katalógusból épülnek
(lásd lent).

## MusicBrainz

- **`loadConcertVenues`** — helyszínek egy országból a `place` entitásból
  (`concert-venue.ts`); lassú (másodpercenként egy kérés), de ritka.
- **`loadConcertsFromMusicBrainz`** — koncertek a katalógus előadóira,
  kötegenként tizenöt mbid-vel (`concert-event.ts`); mbid áll mögöttük, ezért
  jóváhagyás nélkül kimehetnek.
- **`refreshUpcomingReleases`** (ütemezett, hajnalban) és
  **`syncUpcomingReleasesNow`** (ADMIN) — a katalógus előadóinak következő
  lemezei (`upcoming-release.ts`). Az ütemezéshez a Cloud Scheduler API kell
  (infra `services`).

## Ütemezett futások és a játék

- **`composeDailyQuestionDaily`** / **`composeDailyQuestionNow`** — a nap
  kérdése éjfél után; idempotens, a kézi `force` ADMIN-t kér
  (`daily-question-compose.ts`).
- **`answerDailyQuestion`** — a tipp kiértékelése, pont, sorozat
  (`daily-answer.ts`); bejelentkezés kell, permission nem. A megfejtés olyan
  dokumentumban áll, amit senki nem olvashat.
- **`refreshDailyQuestionLeaderboardDaily`** / **`…Now`** — ranglista este,
  egyetlen dokumentumba (`daily-question-leaderboard.ts`).
- **`read`/`updateDailyQuestionSettings`** — a sablonok ki-be kapcsolása; a
  lista a motorból jön (`daily-question-settings.ts`).
- **`composeBandOfTheWeekDaily`** — a hét bandája (`band-of-the-week.ts`):
  minden éjjel fut, hetente egyszer ír, tíz perccel a napi kérdés után.
- **`composeGuestBundleDaily`** — a vendég-kirakat (`guest-bundle.ts`):
  hetente cserél választást, de minden éjjel ránéz, és katalógus-változásnál
  újraépít. Kézi frissítés: `gcloud scheduler jobs run
firebase-schedule-composeGuestBundleDaily-europe-west4`.
- **`catalogBundleStatusNow`**, **`rebuildCatalogBundle`** — admin: a
  bundle-ök állapota aggregációkból, és egy bundle (`feature` / `genre` /
  `guest`) újraépítése most (`catalog-bundles.ts`, `bundle-storage.ts`).

## Fejlesztés

A régió a Firestore adatbázis helye (`europe-west4`) — eltérő régióval a deploy
elszáll.

A `@zssz-soft/zs-ai-sdk` privát csomag, ez a repó nyilvános. A functions ezért
`file:vendor/…tgz`-ként függi: a tarballt a `tools/functions/vendor-ai-sdk.mjs`
hozza le a GitHub Packagesről (token a `~/.npmrc`-ben), gitbe soha nem kerül.
A Cloud Build így tokent sem kap, és nem is kell neki.

```bash
node tools/functions/vendor-ai-sdk.mjs # az SDK tarballja (a predeploy is futtatja)
npm --prefix apps/functions install    # saját függőségek (a deploy is ezt futtatja)
npx nx build functions                 # tsc → apps/functions/lib
npx nx test functions                  # a számítás egységtesztjei
firebase emulators:start --only firestore,functions --project demo-rules

# egy function célzottan — a codebase nevével együtt:
firebase deploy --only functions:security:discogsLookup --project dev
```

A deployt a CI végzi (`--only …,functions`); a `firebase.json` predeploy hookja
telepít és fordít.

A célzott deploy szelektorába a **codebase nevét is ki kell írni**. A
`firebase.json` ezt a forrást `security` néven definiálja, a szelektor-parser
viszont az egyfragmentumos `functions:<név>` alakot a `default` codebase-re
érti — és némán, `No function matches given --only filters` üzenettel abortál,
akkor is, ha a függvény ott van a lefordított `lib/index.js`-ben. Célzott
deployra pedig szükség van: a bukott deploy forrás-hashe rögzül, ezért egy sima
rerun `Skipped (No changes detected)` lesz belőle, és a régi revízió szolgál
tovább — a `--only`-val célzott function az egyetlen, ami soha nem esik
kihagyásra.

## Bootstrap

Az első ADMIN-t nem tudja senki kiosztani, mert ahhoz már ADMIN kell. Ezt a
`tools/sync/grant-permissions.mjs` oldja meg (Admin SDK, a szabályokat
megkerülve): szerepkört ad a usernek, és kiszámolja ugyanazt az eredményt,
amit a function számolna.
