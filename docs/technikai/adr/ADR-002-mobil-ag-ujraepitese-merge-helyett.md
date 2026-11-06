# ADR-002: A mobil app újraépítése a dev-en, nem a `mobile` ág összefésülése

**Állapot:** javasolt
**Kapcsolódó:** [REQ-MOB-001](../../felhasznaloi/mobil-platform.md#req-mob-001-ios-app-a-mai-kódra-építve), [mobil app architektúra](../architektura/mobil-app.md#a-mobile-ág-áthozása)

## Kontextus

- A `mobile` ág 4 kommitot tartalmaz (merge-base `0a0b971e`), és 2026-11-06-án ~325 kommittal jár a `dev`
  mögött. A 4 kommit:
  - `56e0a3f8`: az Ionic iOS app,
  - `7dfda03b`: a gyűjtemény és a wishlist logikája a domain libekbe,
  - `acca3b78`: Nx `layer:*` tagek,
  - `51fe86d3`: az előadó-profil és két repository libbe.
- A `dev` közben ugyanazokat a fájlokat írta át. A legnagyobb ütközések:
  - **Web app store-ok:** a `collection-page.store` (+770 sor) a `dev`-en; az `album-page.store` (#85) és a
    `player.store` (#84) szét lett vágva. A `mobile` ág ezeket vékony burkolóvá szűkítette.
  - **Nx tagek:** a `dev` `type:*` és `platform:*` tageket használ, a `mobile` `layer:*`-t adott minden
    `project.json`-ba.
  - **Aliasok:** a `tsconfig.base.json`-ban a `dev` `/core` aliasokat vezetett be, a `mobile` `/state`
    aliasokat, és törölte a `ui/music-view`-t.
  - **Áthelyezett szolgáltatás:** az `AuthenticationProviderService` a `dev`-en a `libs/core/api` alá került.
  - **Törölt fájlok:** a `release-request-admin.store` és a `membership.repository` a `dev`-en már nem létezik (#87).

## Döntés

A `mobile` ágat **nem fésüljük össze**. A mobil appot a mai `dev`-re építjük újra. A régi ág receptként
szolgál, nem merge-forrásként:

1. **Átmegy változtatás nélkül:**
   - az `apps/music-collection-mobile/` (képernyők, `capacitor.config.ts`, `ios/`),
   - a natív bejelentkezés (`NativeAuthenticationProviderService`),
   - az `initializeAuth` IndexedDB-perzisztenciával és a Firestore tartós cache.
2. **Újraírva, a `dev` mai konvenciói szerint:** a megosztott logika kiemelése. Ide tartozik a gyűjtemény-lista
   és a wishlist-lista store, valamint a nézetmodell. A web app store-ait nem szűkítjük vissza; csak azt emeljük
   ki, amit a mobil ténylegesen használ.
3. **Nx tagek:** a `dev` `type:` és `platform:` rendszere marad, a `layer:` tageket nem hozzuk át.
4. A `mobile` ágat az új app élesítése után archiváljuk (`archive/mobile` tag), majd töröljük.

## Következmények

- **Kisebb kockázat:** a `dev` friss refaktorjai (#82–#88) nem sérülnek.
- **Kicsit több munka, mint egy sikeres merge**, de nem kell 25+ ütköző fájlt kézzel összefésülni.
- **A package-lock-ot újra kell generálni** a Capacitor és Ionic függőségekkel.

## Alternatívák

- **Rebase vagy merge, kézi ütközésfeloldással:** a `dev` legnagyobb store-jain kellene döntéseket hozni,
  a régi szűkítések pedig a `dev` új logikáját vesztenék el. Elvetve.
- **Az ág eldobása, nulláról újraírás:** a natív projekt, a bejelentkezés és az offline beállítás már
  működik. Kár lenne elveszíteni. Elvetve.
