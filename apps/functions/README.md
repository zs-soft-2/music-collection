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

A `role` dokumentum `permissions` tömbje dönt; a user dokumentumon lévő
hivatkozások (`roleIds`, illetve a régi, beágyazott `roles`) csak megnevezik a
szerepkört. A beágyazott `roles[].permissions` szándékosan nem számít.

**Custom claimet nem írunk**: a claimek együtt 1000 bájtba férnek, amit a teljes
permission-lista túllépné. A Storage ezért cross-service `firestore.get()`-tel
olvassa ugyanezt a dokumentumot.

## Fejlesztés

A régió a Firestore adatbázis helye (`europe-west4`) — eltérő régióval a deploy
elszáll.

```bash
npm --prefix apps/functions install    # saját függőségek (a deploy is ezt futtatja)
npx nx build functions                 # tsc → apps/functions/lib
npx nx test functions                  # a számítás egységtesztjei
firebase emulators:start --only firestore,functions --project demo-rules
```

A deployt a CI végzi (`--only …,functions`); a `firebase.json` predeploy hookja
telepít és fordít.

## Bootstrap

Az első ADMIN-t nem tudja senki kiosztani, mert ahhoz már ADMIN kell. Ezt a
`tools/sync/grant-permissions.mjs` oldja meg (Admin SDK, a szabályokat
megkerülve): szerepkört ad a usernek, és kiszámolja ugyanazt az eredményt,
amit a function számolna.
