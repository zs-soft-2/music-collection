# functions — jogosultság-szinkron

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

- **`approveReleaseRequest`** — callable, release-kérés jóváhagyása (ADMIN): a
  kiadás a katalógusba (a Discogsról importálva, vagy egy meglévő
  katalógus-kiadás), egy példány a kérő kollekciójába kerül, egy
  tranzakcióban, a kliens-szinkronnal (`updatedAt`, `sync/catalog`) együtt.
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

A Discogs-hívások a `DISCOGS_TOKEN` secretet használják (60 kérés/perc). A
secretet és a hozzáférését az `infra/environments` teremti, az értékét kézzel
tesszük fel (`gcloud secrets versions add DISCOGS_TOKEN --data-file=-`); érték
nélkül a function deployja elszáll.

A fotós felismerés (`identifyRecordFromPhoto`, `identifyShelfFromPhotos`) az
**AI-gatewayen** át hív modellt (`src/vision-client.ts`, `@zssz-soft/zs-ai-sdk`):
`POST /api/v1/complete`, a kép az üzenetben, a válasz JSON-sémához kötve. Két
beállítás kell hozzá:

- `GATEWAY_API_KEY` — a gateway-tenant API-kulcsa, secret, ugyanúgy, mint a
  `DISCOGS_TOKEN` (az `infra/environments` teremti, az értéket kézzel tesszük
  fel). A tenantnak engedélyezve kell lennie a `claude-opus-5` modellnek.
- `GATEWAY_BASE_URL` — a gateway címe `/api/v1` nélkül. Nem titok:
  projektenként az `.env.<project_id>` fájl adja.

Szolgáltatói kulcs (Anthropic, Vertex) a képolvasáshoz itt nincs. A jelvénykép
(`badge-generation.ts`) egyelőre még közvetlenül a Vertexet hívja a projekt
saját service accountjával.

A `role` dokumentum `permissions` tömbje dönt; a user dokumentumon lévő
hivatkozások (`roleIds`, illetve a régi, beágyazott `roles`) csak megnevezik a
szerepkört. A beágyazott `roles[].permissions` szándékosan nem számít.

**Custom claimet nem írunk**: a claimek együtt 1000 bájtba férnek, amit a teljes
permission-lista túllépné. A Storage ezért cross-service `firestore.get()`-tel
olvassa ugyanezt a dokumentumot.

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
