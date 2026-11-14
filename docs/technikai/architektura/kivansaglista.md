# Kívánságlista architektúra

**Követelmények:** [REQ-WISH-*](../../felhasznaloi/kivansaglista.md)

## Ami ma megvan

- **Modell:** `libs/api/src/lib/domain/music/wishlist-item/wishlist-item.ts`.
  - `WishlistItem { albumReference, artistReference, medias: MediaEnum[], sourceLink, userReference }`;
  - `WishlistItemEntity = WishlistItem & Activable & Entity`.
  - Az `AlbumReference` a `{ uid, name, coverImage, coverImageUrl }` mezőket tartalmazza, és minden író a
    `toAlbumReference`-szel építi (`libs/api/src/lib/domain/music/album/album-reference.ts`).
- **Visszatöltés:** a #79 előtt felvett tételek a címet a `tools/sync/backfill-album-cover-url.mjs`-től kapták.
- **Felvétel (web):** album lap → `wishlist-dialog` → `page/album/store/album-wishlist.feature.ts`
  `addToWishlist()`.
  - A tétel `isActive: true`-val jön létre.
  - Már keresett albumot elutasít.
  - Az `add_to_wishlist` analytics esemény a weben fut.
- **Megtaláltam (web):** `page/wishlist/wishlist-page.store.ts` `setFound(id, found)`, amely
  `isActive: !found` frissítést küld.
- **Lánc:**

  ```
  WishlistItemStateService (libs/api)
    → wishlist-item.effects.ts (libs/domain/music/wishlist-item)
    → UserDataService.addWishlistItem$ / updateWishlistItem$ (libs/domain/user)
    → user/{uid}/wishlist-item/{itemId}
  ```

  A lista a `wishlist-item-data.service.impl.ts` `listByUser$`-ával töltődik.
- **Rules:**
  - csak a tulajdonos olvashat és írhat;
  - a create, update és delete a `create`/`update`/`deleteWishlistItemEntity` jogosultságot kéri;
  - kötelező a `userReference.uid == uid`.
- **Mellékes megfigyelés:** a data service saját `add$`-ja egy más útvonalra
  (`wishlist-item/{uid}/wishlist-item/{uid}`) írna. Nem használt kód, nem része ennek a munkának.

## Mobil

```
WishlistPage (mobil) → WishlistPageStore (képernyő)
  → WishlistListStore (libs/domain/music/wishlist-item): lista, keresés, szűrés, setFound
  → withWishlistAdding() (libs, a web album-wishlist.feature.ts-éből kiemelve)
  → WishlistItemStateService → effect → UserDataService → Firestore
```

- **`WishlistListStore`:** a `mobile` ágon már létezett. A `dev` mai konvenciója szerint (`/core` alias)
  újra kell létrehozni ([ADR-002](../adr/ADR-002-mobil-ag-ujraepitese-merge-helyett.md)). A web
  `wishlist-page.store`-ja rá delegálhat.
- **A felvétel kiemelése:** az `album-wishlist.feature.ts` duplikátum-ellenőrzése és entitás-építése
  `withWishlistAdding()` feature-ként a domain libbe kerül. A felvételhez kell az album `uid`, `name`,
  `coverImage` és `coverImageUrl` mezője és az előadó referenciája. Ezeket a szkennelés
  `catalogMatch.albumUid`-ja alapján egyedi album-betöltés adja.
- **Eltávolítás:** `dispatchDeleteEntityAction`, a `deleteWishlistItemEntity` jogosultsággal. A rules már
  engedi.
- **Offline:** a Firestore tartós cache sorba állítja az írást. A store optimistán frissít.
- **Analytics:** az `add_to_wishlist` eseményt a mobil is küldi, ha a mobilon van analytics (nem része az
  első ticketnek).

## Deploy-igény

Nincs.
