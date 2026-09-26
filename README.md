# music-collection

Lemezgyűjtő alkalmazás: egy közös katalógus (előadók, albumok, kiadások,
zenészek, kiadók) és fölötte a gyűjtők saját polca — melyik példány kié, hol
áll, mennyit ér, és mi hiányzik még.

Nx monorepó: Angular 22 kliens (zoneless, standalone komponensek, NgRx
signalStore), Firebase háttér (Firestore, Storage, Auth, Cloud Functions,
App Check), OpenTofu/Terraform infrastruktúra.

---

## Funkciók

### Katalógus és böngészés

- **Előadó-, album-, kiadás-, track-, zenész- és kiadóoldalak** — minden
  entitásnak saját nyilvános oldala van. Az albumoldal azt tartja, ami minden
  példányra igaz (tracklista, közreműködők); a kiadásoldal csak azt, amit az
  adott pressing hozzátett.
- **Zenekari felállás és kapcsolati háló** — a `membership` kollekcióból épülő
  felállás, korábbi tagokkal és vendégzenészekkel; a zenészek, zenekarok és
  albumok kapcsolati gráfja d3-force-szal, a layout web workerben.
- **Gyorskereső a kezdőlapon** — előadókra, a gyűjteményre és a katalógusra,
  előadó-reflektorral, élő entitás-darabszámokkal és katalógus-lefedettség /
  gyűjtemény-növekedés diagramokkal.
- **Discogs-import** — előadó-, zenész-, kiadó- és kiadásadatok betöltése
  (callable functionökön át, Secret Managerben tárolt tokennel, egy hétig
  cache-elve). A kiadó névvel is megtalálható, ha nincs id.
- **Megjelenő lemezek** — a katalógus előadóinak közelgő kiadásai naponta
  egyszer MusicBrainzből (`refreshUpcomingReleases`); az újrakiadás ugyanúgy
  hír, mint az új lemez, de a kettő elkülönítve.
- **Nyomvonal (breadcrumb) és visszaút** — az oldal tudja, honnan nyitották
  meg (pl. melyik collectionből), és oda vezet vissza.

### A gyűjtemény

- **Gyűjtemény-oldal** — médiatudatos kiadáskártyák, sűrű lista és
  polc-nézet ugyanazon szűrés / rendezés / csoportosítás fölött; a választás
  megmarad.
- **Példányoldal** — egy lemez egy polcon: ár, polchely, történet, fotók.
  Csak a bejelentkezett gyűjtő saját példányai nyílnak meg.
- **Polc és rekeszek** — a gyűjtő megrajzolhatja a saját polcát, a rekeszek
  megtartják a nekik adott helyet, és megadható, hol áll egy lemez.
- **Box set, sorszámozott példány, ikerlemez** — a dobozos kiadás külön
  formátum, a számozott példány megmondja, hányadik, és a párban érkező lemez
  megtartja a testvérét.
- **Fotó és fotós felismerés** — a példányhoz tartozó képek, és a `scan` oldal:
  lefényképezed a lemezt, az app megmondja, melyik pressing és hol van a
  katalógusban (vonalkód + Vision-jelek). Minden találat megerősítést kér —
  a scan magától semmit nem vesz fel.
- **Wishlist** — album felvétele a kívánságlistára és megjelölése megtaláltként.
- **Release-kérés** — a gyűjtő kérheti a katalógusból hiányzó kiadást
  (a Discogs verziólistájából választva), az admin pedig jóváhagyja: a kiadás
  a katalógusba, egy példány a kérő gyűjteményébe kerül, egy tranzakcióban.
- **Példány eltávolítása a történet megtartásával** — a dokumentum nem törlődik,
  visszavonásra kerül, és megmarad, mire készült.

### Collectionök és pontozás

- **Absztrakt collectionök** — szabályalapú gyűjtemény-definíciók (mit kér a
  collection), amiket a rendszer a katalógus ellen old fel; a kártyák a
  katalógussal és a polccal együtt változnak. A definíciót csak callable
  írhatja, fehérlistás szűrő-validálással.
- **Pontozás** — az alappont a collection befejezésének értéke (méret és a
  lemezek kora is számít), a bónusz az, amit a polc hozzátesz (a birtokolt
  legjobb pressing). Semmi nem fizet, amíg a collection nem teljes — ezért az
  oldalak azt is mutatják, mennyit *érne*.
- **Következő lemez** — mit érdemes legközelebb megvenni: a befejező lemez
  előz, mert az egész sorozatot átadja; már feloldott collectionökből
  származtatva, új lekérdezés nélkül.
- **Jelvények (badge)** — a collection definíciójából Vertex képmodellel
  készülő pin: a function több jelöltet rajzol, az admin választ, a többi a
  galériában marad. A promptot a szerver építi a tárolt adatokból.
- **Gyűjtői állás** — a gyűjtő látja, hol tart az egyes collectionökön, és
  kiválaszthatja, melyekkel foglalkozik; a vendég csak azt kapja, ami neki szól.

### Lejátszás

- **Spotify** — teljes lejátszás az albumoldalon, Spotify Connect eszközválasztó,
  hangerő-szabályzó; a kapcsolat a gyűjtőhöz tartozik, nem a böngészőhöz.
- **YouTube Music** — album és videók beágyazott lejátszóval.
- **Rádió** — a polc alapján válogatott lemezek: állomások abból, mi áll a
  polcon, melyik rekeszben, és melyik collectionből mi hiányzik; sorrend
  előre látható.
- **Lejátszás-napló** — a következő lemez felrakása, megállás az oldal
  megfordításához, és számolás, mit hányszor hallgattak.
- **Külső lejátszók csak kérésre** — a Spotify/YouTube beágyazás addig nem
  kerül az oldalra, amíg a gyűjtő nem kéri.

### Vizuális motor

- **Animált világ a lejátszó mögött** — a dalból építve (nem a hangból):
  13 világ, műfaj szerinti átvezetéssel, minden zenekarnak saját világ.
- **Borítóalapú backdrop** — halvány metálos háttér a borítóból, a zenéből
  építve.
- **visual-lab** — a motor paramétereinek kézi kipróbálására.

### Közösség

- **Gyűjtők a térképen** — aki kéri, felkerül a világtérképre; a pin országot
  jelöl, alatta annyi látszik, amennyit az adott gyűjtő megosztott.
- **Profil** — a gyűjtő adatai, beállításai, láthatósága.

### Admin

- Külön admin felület albumokhoz, előadókhoz, zenészekhez, kiadásokhoz,
  kiadókhoz, dokumentumokhoz, collection-itemekhez és wishlist-itemekhez
  (lista + szerkesztő, kártya nézet, szerkesztő-linkek a nyilvános oldalakról).
- **Collection-item admin előadóra keresve**, release-kérések elbírálása,
  badge-jelöltek közötti választás, jogosultság-újraszinkronizálás.
- **Katalógus-karbantartás**: duplikált albumok összevonása, névduplikátumok
  keresése, dokumentum visszavonása törlés helyett.

### Platform

- **Permission-alapú jogosultság** — `role.permissions` + a user
  szerepkör-hivatkozásai → `effective_permissions`, egyetlen igazságforrásként.
  Ezt olvassa a `firestore.rules`, a `storage.rules` (cross-service
  `firestore.get()`) és a kliens (ngx-permissions). Az app a jogosultságok
  megérkezéséig vár az indulással.
- **App Check** — minden callable bizonyítja, hogy az appunkból jött;
  localhoston debug tokennel (lásd lentebb).
- **Verziózott kliens-cache és katalógus-bundle-ök** — a katalógus Firestore
  bundle-ökből, Cloud Storage-ból; egy Firestore-figyelés több olvasót szolgál
  ki, hogy ne kérdezzünk kétszer.
- **Globális hibakezelés** hiba-toasttal, és hibás lekérdezésnél sem néma
  megakadás.
- **Analitika csak hozzájárulás után** — a mérés addig nem indul, amíg a
  látogató nem engedi.
- **Teljesítmény** — zoneless change detection, `@defer` a hosszú szekciókra,
  szakaszos renderelés, worker a nehéz layoutra, mért döntés arról, mi hová
  kerül.
- **Buildenként egyedi verziószám**, saját favicon-készlet (SVG, ICO,
  apple-touch).

---

## Architektúra

Réteges felépítés, rétegátugrás nélkül — ezt Nx tagek kényszerítik ki:

```
Component → Store (signalStore) → Effect → Repository (Firestore)
```

A komponens csak UI, az üzleti logika (megerősítő párbeszéd, validálás) a
store rétegben él, az adatelérés a repositoryban. Új képesség minden rétegben
megjelenik: absztrakt osztály a modellekben → megvalósítás az effectben →
kivezetés a store-ban → használat a fogyasztónál.

```
apps/
  music-collection/       Angular kliens
  music-collection-e2e/   Cypress
  functions/              Cloud Functions (saját tsc, saját node_modules)
  firestore-rules/        a szabályok tesztjei
libs/
  api/                    entitás-szerződések
  common/                 framework-független közös szerződések és engine
  core/                   auth, authorization, hibakezelés, export-import, darabszámok
  domain/                 music (album, artist, musician, release, label,
                          collection-item, music-collection, wishlist-item),
                          document, user
  ui/                     megosztott UI és a vizuális motor
infra/                    OpenTofu: dev és prod környezet
tools/                    karbantartó scriptek (lásd lent)
```

A `functions` nem látja a libeket: saját `tsc`, `rootDir: src` — a megosztott
szerverlogika a functions alá kerül.

---

## Fejlesztés

```bash
npm start                 # nx serve music-collection
npm test                  # a kliens tesztjei
npm run test:rules        # firestore.rules tesztek
npm run lint
npx nx dep-graph          # függőségi gráf
```

Új projekt generálása:

```bash
npx nx g @nx/angular:app my-app
npx nx g @nx/angular:lib my-lib --directory=my-folder
```

Frissítés: `npx nx migrate latest`.

### Emulátor

```bash
npm run emulator          # import + export-on-exit az ./emulators.backup-ból
npm run export            # pillanatkép mentése
firebase emulators:start  # tiszta indulás
```

### Deploy

```bash
npm run deploy:dev        # build + hosting a dev projektre
npm run deploy:prod
```

A dev a `dev` ágról települ; a CI csak zöld build és teszt után deployol, és a
hostinggal együtt viszi a Firestore/Storage szabályokat és az indexeket.

---

## Infrastruktúra

Az `infra/environments/{dev,prod}` OpenTofu konfigurációja teremti a Firebase
projekteket, a service accountokat, a GitHub WIF-et, az App Check-et és a
Secret Manager hozzáféréseket. A Discogs token értékét kézzel tesszük fel:

```bash
gcloud secrets versions add DISCOGS_TOKEN --data-file=-
```

---

## Scriptek (`tools/`)

| Script | Mire jó |
| --- | --- |
| `sync/catalog-sync.mjs` | katalógus-szinkron (Firestore íráshoz mindig wrapperen át) |
| `sync/build-bundles.mjs` | katalógus-bundle-ök építése |
| `sync/copy-prod-to-dev.mjs` | prod adat áthozása devbe |
| `sync/grant-permissions.mjs` | jogosultság adása |
| `sync/seed-user-role.mjs` | a `USER` szerepkör létrehozása, és kiosztása a meglévő usereknek |
| `sync/backfill-collection-item-artist.mjs` | előadó-kereséshez visszatöltés |
| `sync/delete-collection-item.mjs` | egy példány törlése parancssorból |
| `catalog/merge-duplicate-albums.mjs`, `find-duplicate-names.mjs` | duplikátumok |
| `catalog/seed-collections.mjs` | collectionök vetése |
| `discogs/import-discogs.mjs` | tracklisták és közreműködők importja |
| `scan/try-photo.mjs` | a fotós felismerés kipróbálása |
| `app-check/generate-debug-token.mjs` | App Check debug token a buildhez |

A katalógus-scriptek olvasásigényesek (egy futás nagyságrendileg 25 ezer
olvasás, a dry run is) — érdemes tudni, mielőtt indítod.

---

## App Check a localhoston

A callable-ök App Check tokent követelnek, a `nx serve` pedig a dev környezet
debug tokenjével vált egyet — a reCAPTCHA pontozása helyett, ami egy friss
böngészőprofilon vagy zárt hálózaton alacsony lehet.

A tokent a tofu teremti, és a state-ben él; a gépre egyszer kell lehozni (a
fájlt a git nem látja, a token titok — aki ismeri, az App Checket megkerülve
hívhatja a dev callable-öket):

```
tofu -chdir=infra/environments/dev output -raw app_check_debug_token \
  > .app-check-debug-token
```

A `nx serve`/`nx build` innen generálja az
`apps/music-collection/src/environments/app-check-debug-token.ts` fájlt. A fájl
nélkül is fut minden, csak a valódi reCAPTCHA-val (a `localhost` benne van a
dev kulcs engedélyezett domainjei között). A debug mód csak a `localhost`-on
kapcsol be, és a prod buildben sosem.
