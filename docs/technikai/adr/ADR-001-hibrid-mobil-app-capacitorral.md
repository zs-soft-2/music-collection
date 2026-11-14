# ADR-001: Hibrid mobil app Ionic + Capacitor alapon, iOS-re és Androidra

**Állapot:** javasolt
**Kapcsolódó:** [mobil-platform](../../felhasznaloi/mobil-platform.md), [mobil app architektúra](../architektura/mobil-app.md)

## Kontextus

- A gyűjtők egy része a telefonján dolgozik: lemezboltban, börzén, a lemezjátszó mellett. A versenytársak
  (Discogs, CLZ, MusicBuddy és az új vinyl-appok) mind natív appok.
- A `mobile` ágon 2026-09 óta van egy Ionic Angular + Capacitor 8 iOS app. Az adatréteget közösen használja
  a webbel: a store → effect → repository lánc ugyanaz.
- Android változat még nincs.

## Döntés

- Egy közös kódbázisú hibrid app készül Ionic Angular + Capacitor alapon, **iOS-re és Androidra** egyszerre.
- Az Nx workspace-en belül él: `apps/music-collection-mobile`, tagjei `type:app` és `platform:angular`.
- Az adatréteget a webbel közös libekből kapja, a PrimeNG-mentes belépési pontokon át.
- A natív képességek Capacitor pluginokon keresztül jönnek: bejelentkezés, kamera, vonalkód, push.
- Minden pluginnak iOS-en és Androidon is működnie kell. Csak egy platformot támogató plugin nem kerülhet be.

## Következmények

- **Előnyök:**
  - Egy feature egyszer készül el, és mindkét platformra kimegy.
  - A domain logika a webbel közös marad.
- **A közös logikának libben kell élnie.** Ami ma az `apps/music-collection/src/app/data/` alatt van
  (lejátszási napló, fotós felismerés, release-kérés, napi kérdés), azt a mobil használata előtt a domain
  libekbe kell emelni.
- **Két natív projektet kell karbantartani:** `ios/` (Swift Package Manager) és `android/` (Gradle).
  Mindkettőnek saját Firebase appja és konfigurációs fájlja van.
- **A PWA (telepíthető webapp) ötletét ez kiváltja.** Webes push értesítés nem része ennek a döntésnek.

## Alternatívák

- **Natív Swift + Kotlin:** két kódbázis, a domain logika duplikálva. Elvetve.
- **React Native vagy Flutter:** a meglévő Angular store-ok nem használhatók újra. Elvetve.
- **Csak PWA:** iOS-en korlátozott a push és a kamera-API, a boltokban pedig nem jelenik meg. Elvetve.
