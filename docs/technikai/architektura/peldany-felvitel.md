# Példány-felvitel architektúra

**Követelmények:** [REQ-COPY-*](../../felhasznaloi/peldany-felvitel.md)

## Ami ma megvan (web)

- **Lánc:**

  ```
  album lap ?pick=release:{uid} → album-copy-adding.feature.ts addToCollection(pick)
    → CollectionItemStateService.dispatchAddEntityAction
    → collection-item.effects.ts addCollectionItem
    → UserDataServiceImpl.addCollectionItem$ (libs/domain/user)
    → user/{uid}/collection-item/{uid}
  ```

- **Létrehozáskori adat:** `{ entityType, date, release (teljes ReleaseEntity pillanatfelvétel), serial, userId }`.
  A `convertEntityAddToModelAdd` adja hozzá a `searchParameters`-t és az `artistSearchParameters`-t.
- **Opcionális mezők** (`libs/api/.../collection-item/collection-item.ts`):
  - `purchase { date, place, price, currency }`,
  - `condition { media, sleeve }` (Goldmine M–P),
  - `photos[] { path, width, height }`, legfeljebb 2,
  - `placement`, `story`, `serial`, `disposal`.
- **Fotók:** `apps/music-collection/src/app/data/copy-photo/`.
  - Formátum: JPEG, 2000 px-es él, 0,82-es minőség.
  - Útvonal: `collection-item/{userId}/{itemId}/{fileName}`.
  - Csak az útvonal tárolódik, letöltési URL soha.
- **Rules (`firestore.rules`, `user/{uid}/collection-item/{itemId}`):**
  - a create a `createCollectionItemEntity` jogosultságot, a saját `userId`-t, valamint érvényes placement,
    story és photos mezőket kér. Mezőkészlet-korlát nincs, tehát a purchase és a condition már a
    létrehozásban mehet;
  - az update az `updateCollectionItemEntity`-t kéri;
  - a delete a `deleteCollectionItemEntity`-t.
- **Storage (`storage.rules`):** a tulajdonos írhat, ha van `updateCollectionItemEntity` jogosultsága; csak
  kép, legfeljebb 2 MB.

## Mobil felvitel

```
CopyQuickAddSheet (mobil) → CopyQuickAddStore (képernyő-store)
  → withCopyAdding() (signalStore feature, libs/domain/music/collection-item)
  → CollectionItemStateService → effect → UserDataService → Firestore
  → CopyPhotoEffect (libs) → Storage → CollectionItemStateService.update (photos)
```

1. **Kiemelés libbe:**
   - az `album-copy-adding.feature.ts` kiadás-alapú ága `withCopyAdding()` feature-ként a
     `libs/domain/music/collection-item` alá;
   - a `data/copy-photo` (effect, repository, méretezés) ugyanoda.

   A web album lapja a kiemelt feature-t használja, a viselkedése nem változik (a meglévő tesztekkel
   rögzítve).
2. **Kiadás-pillanatfelvétel:** a szkennelés `catalogMatch.releaseUid`-ja alapján a teljes `ReleaseEntity`-t
   be kell tölteni. A release dokumentumok az album alatt élnek, tehát kell hozzá az `albumUid` is, amit a
   `catalogMatch` ad. A mobil a `ReleaseStateService` egyedi betöltését használja; a teljes katalógust nem
   tölti le.
3. **Mentés:** egyetlen `dispatchAddEntityAction`, a purchase és a condition mezővel együtt. Offline is
   lefut, mert a Firestore sorba állítja (REQ-COPY-007).
4. **Fotók:**
   - Mentés után, ha van hálózat: méretezés → feltöltés a `collection-item/{uid}/{itemId}/` alá → update
     a `photos[]`-szal.
   - A kép a `@capacitor/camera`-tól jön (`resultType: Uri` vagy `Base64`). A méretezés a meglévő canvas-os
     kóddal megy.
5. **Megjegyzett értékek** (utolsó pénznem, legutóbbi vásárlási helyek): `user/{uid}/setting/copy-defaults`,
   ugyanabban a setting-mintában, mint a lejátszó beállításai. A rules ezt már engedi
   (`match /setting/{settingId}`).
6. **Visszavonás:** a frissen létrehozott `itemId` fizikai törlése (`dispatchDeleteEntityAction`), és a
   feltöltött fotóké, ha már felmentek.
   - Ez nem ütközik az entitás-törlés modelljével: a saját, most létrehozott példányról van szó, előzmény
     nélkül.
   - Ha közben sorszám-foglalás (`serial`) jött volna létre, azt is törölni kellene, de a mobil nem ad
     sorszámot.

## Deploy-igény

Nincs. Rules, function és index változatlan.
