# Lejátszási napló architektúra

**Követelmények:** [REQ-PLAY-*](../../felhasznaloi/lejatszasi-naplo.md)

## Ami ma megvan

- **Hely:** `apps/music-collection/src/app/data/play-log/`.
  - `PlayLogRepository`: `FirestoreSyncService`, inkrementális, bundle nélkül.
  - `PlayLogEffect`: közös `list$()` és `record()`.
  - Külön store nincs; a lap-store-ok az effectet használják.
- **Modell (`PlayLogEntry`):** `uid` (`{albumId}-{startedAt}`), `albumId`, `albumTitle`, `artistName`,
  `source: PlayerSource`, `startedAt`, `endedAt`, `playedMs`, `playedTracks`, `trackCount`, `completed`.
  - Segédfüggvények: `listeningFor`, `listeningByAlbum`, `summariseListening` (top 5).
- **Írás:** csak a `shared/player/player.store.ts` (`SittingLog`, `flush`) ír.
  - A `PlayerSource` értéke `'spotify' | 'youtube'`.
  - A 30 másodpercnél rövidebb leülést eldobja (`MIN_SITTING_MS`).
- **Firestore:** `user/{uid}/play-log/{entryId}`. A rules `allow read, write: if isSelf(uid)`, tehát
  mezőellenőrzés nincs.
- **Megjelenítés:** `page/album/album-page.store.ts` (`listeningFor`) és `page/profile/profile-page.store.ts`
  (`summariseListening`) → `profile-listening`.

## Változás

1. **Kiemelés libbe:** a `data/play-log` (modell, repository, effect, segédfüggvények) egy domain libbe
   kerül, `/core` aliassal, hogy a mobil is elérje. A web importjai átállnak.
2. **Modell-bővítés:**
   - Új típus: `PlayLogSource = PlayerSource | 'record'`. A `PlayerSource` nem bővül, mert azt a lejátszó
     beállításai is használják (`PlayerSourceSetting`). A `PlayLogEntry.source` típusa erre vált.
   - Új, opcionális mező: `collectionItemId?: string | null`, amely a feltett példányra mutat (REQ-PLAY-002).
3. **Kézi rögzítés értékei:**
   - `startedAt = endedAt = most`;
   - `playedTracks = trackCount` (ha a számlista ismert, különben 0);
   - `completed = true`;
   - `playedMs` = az album ismert hossza, különben 0.
   - Az `uid` formája változatlan (`{albumId}-{startedAt}`).
4. **Összegzők:** a `summariseListening` és a `listeningFor` a darabszámot számolja, nem a `playedMs`-t. Ha
   valahol a `playedMs` összege számít, a `'record'` forrású tételeket ott külön kell kezelni. Ezt a ticket
   felméri.
5. **Mobil lánc:**

   ```
   ReleaseDetailPage → ReleaseDetailStore.markPlayed(itemId)
     → PlayLogEffect.record(entry) → PlayLogRepository → user/{uid}/play-log/{uid}
   ```

   A visszavonás a `PlayLogRepository.delete$(uid)` hívással megy. Ha ilyen nincs, a ticket hozzáadja.
6. **Web:** a `profile-listening` és az album lap a `'record'` forrásnál „lemezről” címkét mutat.

## Deploy-igény

Nincs. A rules mezőellenőrzés nélkül engedi.
