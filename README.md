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
- **Két online forrás, automatikus váltással** — az előadó- és album-űrlap, a
  diszkográfia, a tracklist és a felállás előbb a MusicBrainzet kérdezi (ország,
  alapítási év, évszámos tagsági relációk); ahol ott nincs találat, a Discogs
  válaszol helyette (`discogsLookup`). A betöltött érték mellett a forrás lapja
  is ott van, hogy ellenőrizhető legyen.
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
- **Lemez-értékelés** — egész 1–5 csillag a lemezre (nem a példányra: több
  példány ugyanaz a zene, a plasztik állapotát a grading mondja), mellé egy sor
  arról, hogy miért. Egy koppintás az albumoldalon vagy a példányoldalon, és
  megvan; a polc szűrhető kedvencekre és „még nem értékelt"-re, és rendezhető a
  csillagok szerint. A pontozásba szándékosan nem számít bele — a vadászlistán
  csak holtversenyt dönt.
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
  oldalak azt is mutatják, mennyit _érne_.
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
- **„Milyen volt?"** — ha egy lemez körbeért, a sarokban megjelenik a kérdés:
  egy koppintás a csillagra az egész válasz. Csak olyan lemezre kérdez rá,
  amiről a gyűjtő még nem mondott semmit.
- **„Amit szeretsz" állomás** — a rádió a négy- és ötcsillagos lemezekből is
  tud műsort szőni.
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
- **Közösségi átlag** — a lemez lapján ott áll, mit gondolnak róla a többiek,
  és hogy a gyűjtő mennyivel áll fölötte vagy alatta. Három értékelés alatt
  hallgat: egy ember véleménye nem közösségi vélemény. Az összeget egy trigger
  számolja (`album-rating/{albumId}`); hogy ki mit adott, nem hagyja el a saját
  user-dokumentumát, és a kliens sosem olvas más gyűjtő csillagát.
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
- **App Check** — minden callable bizonyítja, hogy az appunkból jött, és a
  dev Firestore is App Check tokent követel: a publikus olvasás így nem megy
  tetszőleges scriptből, tetszőleges ütemben. Localhoston debug tokennel
  (lásd lentebb).
- **Biztonsági fejlécek a hostingon** — szigorú CSP (inline script csak
  hash-sel, `eval` nélkül), `frame-ancestors 'none'` a clickjacking ellen,
  `Referrer-Policy`, `nosniff` (lásd lentebb).
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

### Költség-riasztás

A Firestore-olvasás, a Storage-forgalom és a functionök számlája csendben nő: egy
elszabadult script vagy egy nem cache-elt lekérdezés csak a hónap végi számlán
látszana. Az `infra/modules/cost-alerts` ezért **két** riasztást teremt mindkét
környezetre, mert a kettő más-más dolgot vesz észre.

|                | Havi költségkeret                                    | Firestore olvasás-riasztás                                               |
| -------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Mit néz        | a hónapra eső költést, dollárban                     | a dokumentum-olvasásokat, darabban                                       |
| Mire terjed ki | mindenre (Firestore, Storage, functionök, Vertex AI) | egyetlen metrikára                                                       |
| Mikor szól     | napok múlva                                          | perceken belül                                                           |
| Küszöb         | `budget_amount` (dev/prod: $5)                       | `firestore_read_alert_threshold` (dev 50 000, prod 25 000 / gördülő óra) |
| Címzett        | a számlázási fiók adminjai + `alert_emails`          | **csak** `alert_emails`                                                  |

Egy elszabadult script 200 ezer olvasása néhány tíz cent — a budgetnek szinte
láthatatlan, a használati riasztásnak azonnal feltűnik. Fordítva: egy lassan
hízó Storage-számlát csak a budget vesz észre. Ezért van mind a kettő.

**Egyik sem korlát.** A Google a keret túllépésekor tovább szolgál ki; ez
riasztás, nem plafon. A leállítás csak a számlázás lekapcsolásával volna
lehetséges, amit szándékosan nem automatizálunk.

#### Hol látszik

Nem az app admin felületén, hanem a Google Cloud Consolon — és e-mailben:

| Mit                           | Hol                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| Riasztási incidensek, némítás | Monitoring → Alerting                                                                                 |
| Az olvasásszám görbéje        | Monitoring → Metrics Explorer, `firestore.googleapis.com/document/read_count` (bontsd `type` szerint) |
| Ugyanez egyszerűbben          | Firestore → Usage                                                                                     |
| A keret állása                | Billing → Budgets & alerts                                                                            |

#### Az e-mail cím

**A repó publikus, ezért cím nem kerülhet a `<env>.tfvars`-ba.** A budget enélkül
is küld levelet (a számlázási fiók adminjainak), a Firestore-riasztás viszont
nem — annak nincs alapértelmezett címzettje, cím nélkül csak a konzolon
látszik. A tofu ezt minden plan/apply végén kiírja figyelmeztetésként.

A címet egy git által nem látott fájl adja a környezeti gyökérben
(`.gitignore`-ban van, a tofu magától beolvassa):

```bash
cat > infra/environments/dev/local.auto.tfvars <<'EOF'
alert_emails = ["te@pelda.hu"]
EOF
```

Egyszeri futáshoz környezeti változó is jó:
`TF_VAR_alert_emails='["te@pelda.hu"]' tofu plan …`

#### A küszöbök honnan jönnek

A Firestore-küszöb a mért forgalomhoz van szabva, nem elméletből. A dev órás
összegei 2026-09-16 és 09-30 között: medián 97 olvasás, 90. percentilis ~2 900,
a legnagyobb _rendes_ óra ~41 000 (egy-két katalógus-script futása; egy futás
nagyságrendileg 25 ezer olvasás). A 2026-09-21-i elszabadulás egyetlen órája
187 719 volt. Az 50 000-es küszöb e kettő közé esik: a script-futásokat átengedi,
az elszabadulást elkapja. Prodban a rendes nap néhány száz olvasás, ott a 25 000
bőven elég.

#### Apply

A budgethez `roles/billing.admin` (vagy `billing.costsManager`) kell a
számlázási fiókon; a CI nem futtat tofu-t, ez kézi lépés. A budget nem a projekt
erőforrása, hanem a **számlázási fióké**, és a dev meg a prod ugyanazon a fiókon
ül: mindkét gyökér a sajátját teremti, a saját projektjére szűkítve. Ugyanezért
kapott a budget egy külön provider-példányt (`google.billing`,
`billing_project`-tel) — enélkül a Budget API-hívást az a projekt számolná el,
ami a fejlesztő gcloud ADC-jében épp be van állítva, a prod apply is a devét.

---

## Scriptek (`tools/`)

| Script                                                           | Mire jó                                                          |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `sync/catalog-sync.mjs`                                          | katalógus-szinkron (Firestore íráshoz mindig wrapperen át)       |
| `sync/build-bundles.mjs`                                         | katalógus-bundle-ök építése                                      |
| `sync/build-genre-bundles.mjs`                                   | műfajonkénti bundle a profilban választott műfajokhoz            |
| `sync/copy-prod-to-dev.mjs`                                      | prod adat áthozása devbe                                         |
| `sync/grant-permissions.mjs`                                     | jogosultság adása                                                |
| `sync/seed-user-role.mjs`                                        | a `USER` szerepkör létrehozása, és kiosztása a meglévő usereknek |
| `sync/backfill-collection-item-artist.mjs`                       | előadó-kereséshez visszatöltés                                   |
| `sync/delete-collection-item.mjs`                                | egy példány törlése parancssorból                                |
| `catalog/merge-duplicate-albums.mjs`, `find-duplicate-names.mjs` | duplikátumok                                                     |
| `catalog/seed-collections.mjs`                                   | collectionök vetése                                              |
| `discogs/import-discogs.mjs`                                     | tracklisták és közreműködők importja                             |
| `scan/try-photo.mjs`                                             | a fotós felismerés kipróbálása                                   |
| `avatar/upload-assets.mjs`                                       | az avatar-ruhatár feltöltése Storage-ba                          |
| `avatar/archive-source.mjs`                                      | a ruhatár 1024×1536-os mesterképeinek archiválása                |
| `app-check/generate-debug-token.mjs`                             | App Check debug token a buildhez                                 |
| `primeui/generate-license.mjs`                                   | PrimeNG licenckulcs a buildhez                                   |
| `hosting/verify-csp.mjs`                                         | a hosting CSP inline-hash-ei egyeznek-e a build kimenetével      |

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

### Mit véd az App Check

A callable-öket a kód maga (`enforceAppCheck`), a Firestore-t és a Storage-ot
viszont nem a mi kódunk szolgálja ki, hanem a Google API-ja: ott a védelmet az
`app_check_services` kapcsolja be (`infra/environments/dev/dev.tfvars`,
`infra/environments/prod/prod.tfvars`).

| Szolgáltatás    | dev                     | prod                    |
| --------------- | ----------------------- | ----------------------- |
| Callable-ök     | a kódból, mindig        | a kódból, mindig        |
| Cloud Firestore | `ENFORCED`              | `UNENFORCED` (csak mér) |
| Cloud Storage   | `UNENFORCED` (csak mér) | `UNENFORCED` (csak mér) |

Amit ez a fejlesztésen megváltoztat: a dev Firestore-ból App Check token nélkül
**olvasni sem lehet**, nem csak callable-t hívni. A `nx serve` ezt a debug
tokenből vagy a reCAPTCHA-ból szerzi meg; fejetlen Chrome-ban (ellenőrző
scriptek) érdemes a debug tokent lehozni, mert ott a reCAPTCHA pontja alacsony
lehet, és akkor az oldalak adat nélkül maradnak. Az Admin SDK-t — a `tools/`
scripteket és a functionöket — az enforcement nem érinti.

A Storage azért csak mér: a képek nem az SDK-n keresztül jelennek meg, hanem
sima `<img>`-ből, közvetlen letöltési címről, ami nem visz App Check fejlécet.
Az `UNENFORCED` mód a konzol App Check lapján megmutatja, hogy ezek
ellenőrizetlennek számítanak-e; ha nem, a tfvars sora `ENFORCED`-ra váltható.
Prodban azért nincs semmi élesítve, mert a hostingon egy régi build fut, amiben
még nincs App Check — ott előbb a mai buildet kell kideployolni.

Az enforcement az apply után kb. 15 perccel lép életbe, és ugyanennyivel áll
vissza.

---

## PrimeNG licenckulcs

A PrimeNG 22 kereskedelmi könyvtár (PrimeUI): induláskor offline ellenőrzi a
licencet, és ha nincs kulcs, minden lap jobb alsó sarkába kitesz egy piros
„Invalid PrimeUI License” sávot. Más baja nincs — a komponensek működnek.

Egy személyes projekt belefér az ingyenes **Community License** feltételeibe
(1 M$ alatti árbevétel, 5-nél kevesebb fejlesztő, 10-nél kevesebb alkalmazott,
3 M$ alatti külső tőke; magánszemély, diák, nonprofit külön is jogosult), de
kulcsot így is igényelni kell, és évente — a jogosultság megerősítésével — meg
kell újítani. A feltételek: <https://primeui.dev/licenses/community>; a kulcs a
<https://primeui.store> oldalon áll. A pontos szöveg a csomagban is ott van
(`node_modules/primeng/LICENSE.md`).

A kulcs a fejlesztőhöz kötött, ez a repó pedig nyilvános, ezért nem kerül bele.
A gépen egyszer kell letenni:

```
echo 'ide-jön-a-kulcs' > .primeui-license
```

A `nx serve`/`nx build`/`nx test` innen (vagy az `MC_PRIMEUI_LICENSE`
környezeti változóból) generálja az
`apps/music-collection/src/environments/primeui-license.ts` fájlt, amit a
`providePrimeNG` megkap. A kitett oldalhoz a CI ugyanezt a `PRIMEUI_LICENSE`
repository secretből veszi (`.github/workflows/ci.yml`); enélkül a deployolt
appon is ott marad a sáv.

A kulcsnak van lejárata: a token `exp`-jénél később _kiadott_ PrimeNG verziót
már nem fedi (a Community kulcs 30 nap türelmi időt kap a lejárat után). Ha a
sáv egy frissítés után jelenik meg, vagy megújítás kell, vagy a frissítést kell
visszavonni.

---

## Biztonsági fejlécek a hostingon

A `firebase.json` `hosting.headers` blokkja minden válaszra ráteszi őket —
`source: "**"`, mert az SPA-útvonalak (`/album/123`) az index.html-re
íródnak át, és a fejléc-szabály a _kért_ címre illeszkedik, nem a
rewrite eredményére.

| Fejléc                       | Mi ellen                                                                    |
| ---------------------------- | --------------------------------------------------------------------------- |
| `Content-Security-Policy`    | XSS: honnan futhat script, hová mehet kérés, mi kerülhet keretbe            |
| `X-Frame-Options: DENY`      | clickjacking a régi böngészőkben (a CSP-ben `frame-ancestors 'none'`)       |
| `X-Content-Type-Options`     | MIME-sniffing: egy feltöltött fájl ne váljon scriptté                       |
| `Referrer-Policy`            | a teljes URL ne szivárogjon ki idegen oldalra (csak az origin)              |
| `Permissions-Policy`         | kamera, mikrofon, helyadat, fizetés — amit az app nem használ, meg se kapja |
| `Cross-Origin-Opener-Policy` | idegen ablak ne férjen a `window`-unkhoz (`same-origin-allow-popups`)       |

A HSTS nincs köztük: azt a Firebase Hosting magától küldi
(`max-age=31556926; includeSubDomains; preload`).

### A CSP és a két inline darab

Statikus hostingon nincs kérésenkénti nonce, amit egy szerver beírhatna, ezért
az oldal két inline darabja SHA-256 hash-sel van engedve:

- az `index.html` téma-scriptje (a mentett világos téma az első festés előtt),
- az `onload="this.media='all'"` attribútum, amit az inline critical CSS lépés
  (beasties) ír a stíluslap-linkre — ehhez az `'unsafe-hashes'` kulcsszó is
  kell, mert eseménykezelő-attribútum.

Ha a build mást ír ki, mint ami a hash-ben áll, a böngésző **némán** letiltja
őket: a stíluslap `media="print"`-en ragad (stílus nélküli oldal), vagy
visszatér a téma villanása. Build-logban ez nem látszik, ezért a
`tools/hosting/verify-csp.mjs` hash-eli a felépült `index.html` inline
darabjait, és mindkét irányban egyeztet a `firebase.json`-nel. A
`build:dev`/`build:prod` és a CI deploy job futtatja; kézzel:

```bash
npm run verify:csp     # egy optimalizált build után (a `development` konfiguráció
                       # nem csinál inline critical CSS-t)
```

A `style-src`-ben viszont ott az `'unsafe-inline'`: az Angular és a PrimeNG
futásidőben ír stílust (`setAttribute('style', …)`), és azt hash nem fedi. A
CSP védelmének java a `script-src`-ben van, ami `'unsafe-inline'` és
`'unsafe-eval'` nélkül áll.

### Ha új külső forrás kerül az appba

Minden idegen origin, amit a kliens megszólít, külön direktívába tartozik:
script `script-src`, `fetch`/XHR `connect-src`, kép `img-src`, beágyazott
keret `frame-src`. Ami kimarad, azt a böngésző eldobja — és ez is néma: a kép
nem jelenik meg, a lekérdezés hibára fut. Amit érdemes tudni:

- a mérés a `region1.google-analytics.com`-ra is küld, nem csak a `www`-re,
- a Spotify embed API továbbtölt egy scriptet az `*.spotifycdn.com`-ról,
- a Cover Art Archive az `archive.org`-ra irányít át, és a CSP a
  **redirect célját** is nézi,
- az `authDomain` (`*.firebaseapp.com`) keretben van: a Google-bejelentkezés
  popupját az Auth SDK egy rejtett iframe-mel kíséri.

Ellenőrizni a legegyszerűbb fejetlen Chrome-mal: a build kiszolgálása ezekkel
a fejlécekkel, majd a `securitypolicyviolation` események gyűjtése a lapon —
a konzol `Refused to…` sorai ugyanezt mondják.
