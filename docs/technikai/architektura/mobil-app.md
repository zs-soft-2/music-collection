# Mobil app architektúra

**Követelmények:** [REQ-MOB-*](../../felhasznaloi/mobil-platform.md)
**Döntések:** [ADR-001](../adr/ADR-001-hibrid-mobil-app-capacitorral.md), [ADR-002](../adr/ADR-002-mobil-ag-ujraepitese-merge-helyett.md)

## Áttekintés

| Elem | Érték |
|---|---|
| Projekt | `apps/music-collection-mobile`, tagek: `type:app`, `platform:angular` |
| Keretrendszer | Ionic Angular 9 (`provideIonicAngular({ mode: 'ios' })`), Capacitor 8 |
| Natív projektek | `ios/` (Swift Package Manager, nem CocoaPods; deployment target 15.0), `android/` (Gradle) |
| Firebase régió | `europe-west4` (functions) |
| Build kimenet | `apps/music-collection-mobile/www` |

Rétegek, ugyanúgy, mint a weben (alkotmány: layer-chain):

```
Ionic képernyő → képernyő-store (signalStore) → domain store / *StateService (libs/api)
  → effect (libs/domain) → repository / data service (Firestore, callable)
```

- A mobil képernyő csak renderel.
- A képernyő-specifikus állapot (szegmens-sáv, részletek oldal) a képernyő saját store-jában marad.
- A domain libek **PrimeNG-mentes belépési pontját** importálja. A főbarrel webes PrimeNG komponenseket is
  exportál, és azok bekerülnének a mobil bundle-be. A `dev`-en ez a minta a `/core` alias
  (lásd: domain barrel a fő bundle-ben). A mobil a `/core` aliast használja, illetve ahol az nem elég, egy
  új `/state` aliast, amely a store-t is exportálja.

## Platformszolgáltatások

| Szolgáltatás | Beállítás |
|---|---|
| Auth | `initializeAuth(getApp(), { persistence: indexedDBLocalPersistence })`. A böngészős alapértelmezés a `capacitor://localhost` originen soha nem állítja vissza a munkamenetet. |
| Bejelentkezés | `AuthenticationProviderService` absztrakció (`libs/core/api`). Mobilon a `NativeAuthenticationProviderService`: `FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true })`, aztán `signInWithCredential`. |
| Firestore | `initializeFirestore(..., { localCache: persistentLocalCache({ cacheSizeBytes: CACHE_SIZE_UNLIMITED }) })`. Ez adja az offline olvasást (REQ-MOB-004). |
| Storage, Functions | a webbel azonos providerek |
| Fordítás | Transloco, a web `i18n` fájljaival (REQ-MOB-005) |

## A `mobile` ág áthozása

[ADR-002](../adr/ADR-002-mobil-ag-ujraepitese-merge-helyett.md) szerint újraépítés, nem merge.

1. **Új ág a `dev`-ről.** Átmegy a `mobile` ágról:
   - `apps/music-collection-mobile/**`,
   - a `capacitor.config.ts`,
   - az `ios/` projekt,
   - a `GoogleService-Info.plist` (dev).
2. **Függőségek:** `@capacitor/core`, `@capacitor/ios`, `@capacitor/app`, `@capacitor/cli`,
   `@capacitor-firebase/authentication`, `@ionic/angular`. A `package-lock.json` újragenerálódik.
3. **Megosztott logika kiemelése:**
   - `CollectionListStore` (betöltés, keresés, szűrés, rendezés, csoportosítás) →
     `libs/domain/music/collection-item`,
   - `WishlistListStore` → `libs/domain/music/wishlist-item`,
   - nézetmodell (`toReleaseView`, `FORMAT_LABELS`, `FORMAT_ORDER`) → `libs/api` vagy `libs/ui`, a `dev` mai
     `music-view` helyén.

   A web store-ait **nem** szűkítjük vissza. Ha a web ugyanazt a logikát használja, a web store a kiemelt
   store-ra delegál; ezt külön, a web viselkedését tesztekkel rögzítve végezzük.
4. **Importok:** az `AuthenticationProviderService` a `libs/core/api`-ból jön (a `mobile` ágon még a
   `@music-collection/api`-ból jött).
5. **Szövegek:** a régi ág beégetett magyar szövegei (például „Megtaláltak is”, az üres lista szövege)
   Transloco kulcsokra cserélődnek.
6. **Nx célok:** `build`, `serve`, `lint`, `test`, `sync-ios`, `open-ios`, `run-ios`, Android után
   `sync-android`, `open-android`, `run-android`. npm scriptek: `start:mobile`, `build:mobile`, `ios`,
   `ios:open`, `android`, `android:open`.

## Android

- **Natív projekt:** `@capacitor/android`, majd `npx cap add android` az `apps/music-collection-mobile/android`
  alá.
- **Firebase:**
  - Android app a dev projektben, `applicationId` = `hu.zssoft.musiccollection.dev`;
  - `google-services.json` az `android/app/` alá;
  - **SHA-1 és SHA-256 ujjlenyomat** (debug és release kulcs) a Firebase appban, különben a natív Google
    bejelentkezés nem működik.
- **Plugin-beállítás:** a `@capacitor-firebase/authentication` Google providere Androidon a
  `google-services.json`-ból olvas.
- **Verziók:** minSdk és targetSdk a Capacitor 8 alapértelmezése szerint.
- **Terraform:** a Firebase Android és Apple app `google_firebase_android_app` és `google_firebase_apple_app`
  erőforrásként az `infra/modules/firebase` alá kerül, a dev és a prod környezetben is (ma csak a
  `google_firebase_web_app` van ott).
  - A SHA ujjlenyomatok a `google_firebase_android_app.sha1_hashes` és `sha256_hashes` mezőben vannak.
  - A konfigurációs fájlok a `google_firebase_android_app_config` és `google_firebase_apple_app_config`
    data forrásból jönnek.
  - Az applyt a maintainer futtatja.

## Változatok és azonosítók

| Változat | iOS bundle ID | Android applicationId | Firebase projekt | App név |
|---|---|---|---|---|
| dev | `hu.zssoft.musiccollection.dev` | `hu.zssoft.musiccollection.dev` | `music-collection-16676` | MC Dev |
| prod | `hu.zssoft.musiccollection` | `hu.zssoft.musiccollection` | prod projekt | Music Collection |

- **iOS:** külön Xcode build-konfiguráció (Debug-Dev, Release-Dev, Release-Prod). Mindegyik a saját
  `GoogleService-Info.plist`-jét másolja be egy build phase-ben.
- **Android:** `productFlavors { dev, prod }`, flavoronként `google-services.json`
  (`src/dev/`, `src/prod/`).
- **Angular:** `environment.ts` és `environment.prod.ts`, a webbel azonos módon. A Capacitor `appId` a
  változattól függ (`capacitor.config.ts` környezeti változóból).

## Belső tesztelés

- **iOS:** archív build a Release-Dev konfigurációval, feltöltés TestFlightra. Ehhez Apple Developer fiók és
  App Store Connect app rekord kell.
- **Android:** aláírt AAB a dev flavorral, feltöltés a Play Console belső tesztelési sávjára. Ehhez Play
  Console fiók és upload kulcs kell.
- **Aláíró kulcsok:** az iOS distribution tanúsítvány és az Android upload kulcs a maintainer gépén él,
  jelszókezelőben mentve. Nem kerülnek a repóba és a CI-ba.
  - A feltöltés kézzel megy (Xcode Organizer, Play Console).
  - A CI-s automatizálás (fastlane) a nyilvános kiadás ticketjébe tartozik.
