# ADR-003: Natív vonalkód-olvasó plugin a mobilon

**Állapot:** javasolt
**Kapcsolódó:** [szkennelés](../../felhasznaloi/szkenneles.md), [szkennelés architektúra](../architektura/szkenneles.md)

## Kontextus

- A web a böngésző `BarcodeDetector` API-jával olvas vonalkódot egy feltöltött fotóból
  (`apps/music-collection/src/app/data/photo-scan/barcode-reader.ts`), EAN-13, EAN-8, UPC-A és UPC-E
  formátumban.
- A Safari és így az iOS WKWebView ezt az API-t nem támogatja. Ott a függvény `null`-t ad, és a
  felismerés a fizetős modellhívásra esik vissza.
- A mobilon élő, folyamatos olvasás kell: a felhasználó a dobozban lapoz, és a kódokat egymás után olvassa
  be, fotó nélkül.

## Döntés

- A mobil app **natív, ML Kit alapú vonalkód-plugint** használ, élő kameraképpel, iOS-en és Androidon is.
  - Elsődleges jelölt: a Capawesome `@capacitor-mlkit/barcode-scanning`.
  - Tartalék: a hivatalos `@capacitor/barcode-scanner`.
  - A választás feltétele, hogy legyen Capacitor 8-cal kompatibilis kiadás. Ezt a vonalkód-szkennelés
    ticketjének első lépése ellenőrzi. Ha az elsődleges jelöltnek nincs ilyen kiadása, a tartalék jön, és ez
    az ADR frissül.
- A beolvasott kódot a meglévő `identifyRecordFromPhoto` callable kapja meg, **fotó nélkül** (`{ barcode }`).
  Ez nem hív modellt, és nem fogy tőle kvóta. Az egyezés-keresés a Discogsban fut, és egy hétig cache-elődik
  (`discogs-cache/barcode-{ean}`).
- A felismerés logikája egy platformfüggetlen szolgáltatás mögé kerül (`BarcodeScannerService` absztrakció):
  - mobilon a natív plugin,
  - weben a `BarcodeDetector`, a mai viselkedéssel.

## Következmények

- **Kamera-engedély kell:** iOS-en `NSCameraUsageDescription`, Androidon a `CAMERA` jogosultság.
- **Az ML Kit modell** Androidon a Google Play Services-szel jön, iOS-en az app méretét növeli.
- **A „megvan-e már?” egyezés minősége** a katalógus Discogs-azonosítóin múlik. 2026-09-ben 520/527 release-nek
  nem volt ilyen azonosítója. A visszatöltés (B5) erősen ajánlott előfeltétel.

## Alternatívák

- **WebView-alapú JS-könyvtár (zxing-js, quagga):** lassabb, és gyengébben olvas hajlott vagy fényes fóliát.
  Elvetve.
- **Csak fotó és modell:** drága, lassú, és kvóta-korlátos. Tartalékként marad meg (fotós felismerés).
