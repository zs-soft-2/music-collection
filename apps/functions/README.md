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
- **`approveReleaseRequest`** — callable, release-kérés jóváhagyása (ADMIN): a
  kiadás a katalógusba (a Discogsról importálva, vagy egy meglévő
  katalógus-kiadás), egy példány a kérő kollekciójába kerül, egy
  tranzakcióban, a kliens-szinkronnal (`updatedAt`, `sync/catalog`) együtt.

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
