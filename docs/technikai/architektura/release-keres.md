# Release-kérés architektúra

**Követelmények:** [REQ-RREQ-*](../../felhasznaloi/release-keres.md)

## Ami ma megvan

- **Dokumentum:** `release-request/{uid}`, modell: `libs/api/.../release-request/release-request.ts`.
  - Mezők: `userId`, `album { uid | null, name, artistUid, artistName }`, `status: 'pending'`,
    `discogsMasterId`, `discogsReleaseId`, `pressing { format, label, catno, country, year } | null`, `note`,
    `createdAt`.
- **Kliens:** `apps/music-collection/src/app/data/release-request/` (`ReleaseRequestRepository.add$`,
  `ReleaseRequestEffect.request$`). Közvetlenül Firestore-ba ír.
  - Források: a szkennelés lap (`toScanRequest`), a polc-szkennelés (`toShelfRequest`) és az album lap
    (`album-release-request.feature.ts`).
- **Rules (`release-request/{requestId}`):**
  - kell a `createCollectionItemEntity` jogosultság, a saját `userId` és a `pending` állapot;
  - a kulcskészlet rögzített, a jegyzet legfeljebb 500 karakter (`MAX_REQUEST_NOTE_LENGTH`);
  - kötelező, hogy `album.uid != null || discogsReleaseId != null`.
- **Jóváhagyás:** `approveReleaseRequest` (ADMIN, `release-request-approval.ts`).
  - Importálja a Discogs-kiadást, és ha kell, az albumot, az előadót és a kiadót is.
  - Egy tranzakcióban létrehozza a `user/{userId}/collection-item/{új}` dokumentumot a beágyazott
    kiadással, és a kérést `approved`-ra állítja (`decidedAt`, `decidedBy`).
- **Elutasítás:** kliensoldali update, `status: 'rejected'` és `adminNote` (csak admin).
- **Lista:** `page/my-request` (`/my-requests`). A release-kéréseket és az entitás-javaslatokat együtt mutatja.

## Mobil

```
ReleaseRequestSheet (mobil) → ReleaseRequestStore (képernyő)
  → ReleaseRequestEffect (libs/domain/music/release, /core alias) → ReleaseRequestRepository → Firestore
MyRequestsPage (mobil) → MyRequestsStore → ReleaseRequestEffect.listMine$
```

1. **Kiemelés:** a `data/release-request` (effect, repository, `toScanRequest` mapper) a
   `libs/domain/music/release` alá költözik. A `mobile` ág ugyanígy tett (`lib/request`); ezt a `dev`
   mai konvenciójával kell újracsinálni. A web importjai átállnak, a viselkedése nem változik.
2. **Ismételt kérés (REQ-RREQ-002):** a store a felhasználó saját függő kéréseiből dönt
   (`listMine$`, `status == 'pending'`, azonos `discogsReleaseId`). Új lekérdezés vagy index nem kell, ha a
   `listMine$` a felhasználó összes kérését hozza. Ha szűrt lekérdezés kell, azt a ticket méri fel.
3. **Kéréseim:** csak a release-kérések jelennek meg; az entitás-javaslatok a weben maradnak.
4. **Jóváhagyás után:** a felvett példány a `user/{uid}/collection-item` élő lekérdezésén át jelenik meg.
   Külön mobil kód nem kell.
5. **Értesítés:** [értesítések architektúra](ertesitesek.md#release-kérés-elbírálása).

## Deploy-igény

Nincs. Az értesítés deploy-igénye az értesítéseknél szerepel.
