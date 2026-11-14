# Szkennelés architektúra

**Követelmények:** [REQ-SCAN-*](../../felhasznaloi/szkenneles.md)
**Döntés:** [ADR-003](../adr/ADR-003-nativ-vonalkod-olvaso.md)

## Ami ma megvan (web)

| Rész | Hely | Mit csinál |
|---|---|---|
| Lap | `apps/music-collection/src/app/page/scan/` (`/scan`, `authenticatedGuard`) | fotó, eredmény, jelöltek |
| Fotó előkészítése | `data/photo-scan/photo-file.ts` | 1600 px-es élre méretez, JPEG |
| Vonalkód | `data/photo-scan/barcode-reader.ts` | `BarcodeDetector` (ean_13, ean_8, upc_a, upc_e), legalább 8 számjegy. Ahol nincs (Safari, iOS WebView), `null`. |
| Hívás | `data/photo-scan/photo-scan.effect.ts`, `photo-scan.repository.ts` | `identifyRecordFromPhoto` callable |
| Egyezés a katalógussal | `page/scan/scan.mapper.ts` `toCandidateView` | kliensoldali egyezés |
| Callable | `apps/functions/src/photo-scan.functions.ts` → `photo-scan.ts` `scanPhoto` | keresési lánc |
| Kvóta | `apps/functions/src/photo-scan-quota.ts` | felhasználónként és összesen, napi kvóta |

### `identifyRecordFromPhoto`

- **Kérés:** `{ photo?: { data, mediaType }, barcode?: string, album?: { name, artistName } }`.
  - Legalább a `photo` vagy a `barcode` kötelező.
  - A base64 legfeljebb 6 000 000 karakter lehet; típusa jpeg, png vagy webp.
- **Válasz:** `ScanPhotoResult { signals: PhotoSignals | null, candidates: ScanCandidate[] (max 6), usedVision }`.
  - A `ScanCandidate` mezői: `discogsReleaseId`, `discogsMasterId`, `title`, `artistName`, `albumName`,
    `formats[]`, `label`, `catno`, `country`, `year`, `thumbUrl` és `match: 'exact' | 'likely' | 'possible'`.
- **Keresési lánc**, az első `exact` találatnál megáll:
  1. A kliens vonalkódja a Discogsban. Itt **nincs modellhívás, és nem fogy kvóta.**
  2. Modell olvassa a fotót, az AI-gatewayen át (`vision-client.ts`). A kiolvasott vonalkód újra
     keresésbe megy.
  3. Katalógusszám és kiadó.
  4. Előadó és cím (master, utána release).
- **Cache:** a vonalkód-találatok egy hétig cache-elődnek (`discogs-cache/barcode-{ean}`).
- **Hibák:** a `details.source` mezőben `quota`, `discogs`, `vision` vagy `unknown`.
- **Jogosultság:** `createCollectionItemEntity` vagy `ADMIN`.

### Kvóta

- **Felhasználónként:** a `user/{uid}/scan-quota/{nap}.requests` számláló; a nap Europe/Budapest szerint.
- **Az egész appra:** `app-setting/photo-scan` (`enabled`, `dailyUserRequestLimit` alapból 30,
  `dailyTotalRequestLimit` alapból 200).
- **Hibák:** kikapcsolt funkciónál `failed-precondition`, elfogyott kvótánál `resource-exhausted`.
- **A kvóta csak modellhívásnál fogy.** A tiszta vonalkódos keresés ingyenes.

## Vonalkód-olvasás

A REQ-SCAN-001, -003, -005, -006 és -007 megvalósítása.

```
ScanPage (mobil) → ScanSessionStore (képernyő-store)
  → BarcodeScannerService (absztrakt, libs/core/api)
       ├─ NativeBarcodeScannerService (mobil, ML Kit plugin)
       └─ WebBarcodeScannerService (web, BarcodeDetector, a mai barcode-reader)
  → PhotoScanEffect.identify$({ barcode }) → PhotoScanRepository → identifyRecordFromPhoto
```

- **A `BarcodeScannerService` absztrakció** ugyanazt a mintát követi, mint az `AuthenticationProviderService`:
  absztrakt osztály a `libs/core/api`-ban, a platform-implementációt az app `app.config.ts`-e adja.
  - **Mobil:** `startScan(): Observable<string>` élő folyamként, és `stopScan()`.
  - **Web:** a mai fotós `detectBarcode(file)` marad.
- **A `data/photo-scan` libbe költözik:** a `photo-scan.effect`, a `repository`, a `photo-file` és a
  `barcode-reader` a `libs/domain/music/collection-item` alá (`/core` alias), hogy a mobil is elérje. Ez a
  ticket első lépése, és a web viselkedése nem változik.
- **Ismételt kód:** a `ScanSessionStore` a munkamenetben beolvasott kódokat egy `Map<ean, ScanEntry>`-ben
  tartja. Ismételt kódnál nem hív újra.
- **Rezgés:** `@capacitor/haptics` `impact({ style: Light })`.
- **Kézi bevitel:** ugyanazt az `identify$({ barcode })`-ot hívja. Ellenőrzés: 8, 12 vagy 13 számjegy, és
  ellenőrzőszám (EAN/UPC checksum).
- **Offline függő lista (REQ-SCAN-009):**
  - a `ScanSessionStore` a függő kódokat a `@capacitor/preferences`-ben tárolja (kulcs:
    `mc.scan.pending`), így az app újraindítása után is megmaradnak;
  - a `@capacitor/network` `networkStatusChange` eseményére sorban, egyenként futtatja a keresést;
  - a sikeresen feldolgozott kódot törli a függő listából.

### Egyezés: „megvan”, „kívánságlistán”, „katalógusban”

- **Ma a weben** a `scan.mapper.ts` `toCandidateView` a betöltött katalógusból (bundle) és a saját
  példányokból dönt:
  - release: `discogsReleaseId`, aztán `catno`;
  - album: `album.discogs.masterId`, aztán `album.discogs.releaseId`, aztán normalizált név és előadó.
- **A mobil nem tölti le a katalógus-bundle-t**, ezért az egyezés egy része a szerverre kerül
  (döntés 2026-11-06; a bundle mobilneten nagy, a szerver pedig már olvassa a Discogsot):
  - **saját adatból, kliensen** (offline cache is): „megvan” a `user/{uid}/collection-item`
    release-pillanatfelvételéből (`release.discogsReleaseId`, `release.catno`, album uid); „kívánságlistán” a
    `wishlist-item.albumReference.uid`-ból;
  - **katalógusból, szerveren:** az `identifyRecordFromPhoto` minden jelölthöz visszaad egy
    `catalogMatch: { albumUid, releaseUid } | null` mezőt. A web is használhatja, a mai kliens-egyezés
    helyett vagy mellett.
- **Az egyező logika** (normalizálás, sorrend) egy `platform:agnostic` libbe kerül, hogy a function és a kliens
  ugyanazt használja. A `discogs-match.ts` normalizálói (`normalizeBarcode`, `normalizeCatno`) ide költöznek.

## Fotós felismerés

A REQ-SCAN-008 megvalósítása.

- **Fotó:** `@capacitor/camera` `getPhoto({ source: Prompt, resultType: Base64, width: 1600, quality: 85 })`.
  A plugin a kamerát és a galériát is felkínálja.
- **Hívás:** ugyanaz az `identify$({ photo, barcode? })`, a web `photo-file.ts` méretezésével.
- **Kvóta kijelzése:** az `identifyRecordFromPhoto` válasza kap egy `quota: { used, limit } | null` mezőt
  (döntés 2026-11-06). A `null` azt jelenti, hogy nem fogyott kvóta (tiszta vonalkódos keresés). Az
  `app-setting` rules-a nem lazul.
  - A fotó készítése előtti kijelzéshez a mobil a legutóbbi válasz értékét mutatja. Ha még nem volt válasz,
    a napi kezdő limitet nem mutatja.
- **Engedélyek:** iOS-en `NSCameraUsageDescription` és `NSPhotoLibraryUsageDescription`, Androidon `CAMERA`.
  Galériához Android 13+ alatt a Photo Picker, tehát nem kell tárolási engedély.

## Deploy-igény

- A `catalogMatch` és a `quota` mező miatt az `identifyRecordFromPhoto` megváltozik, ezért
  **functions deploy** kell. A kliens és a function verziója szétcsúszhat: az új mezők opcionálisak, a régi
  kliens figyelmen kívül hagyja őket. Az új kliensnek kezelnie kell, ha hiányoznak.
- Új Firestore útvonal nincs.
