# Collection-pontozás architektúra

**Követelmények:** [REQ-SCORE-*](../../felhasznaloi/gyujtemeny-pontozas.md)
**Döntés:** [ADR-005](../adr/ADR-005-kiadas-ritkasaga-discogs-have-alapjan.md)

## Ami ma megvan

- **Szabály:** `MusicCollectionCriteria` (`libs/domain/music/music-collection/api`). Csak albumokat nevez meg
  (évek, stílusok, előadó, ország, közreműködők), kiadást nem. Albumot egyenként megnevező mező nincs benne.
- **Feloldás:** `resolveMusicCollection` (`engine`): a szabályból és a katalógusból `ResolvedMusicCollection`.
- **Teljesítés:** `compareWithCollection` (`engine`): a feloldott collection és a polc (`OwnedCopy[]`)
  összevetése.
- **Pontozás:** `scoreCollection` (`engine/music-collection-score.ts`). A mai képlet: alappont a méretből és az
  albumok korából (vagy a kurátor `basePoints` értéke), erre bónusz a legjobb példány címkéi után (eredeti
  nyomás, limitált, picture disc, box set, 180 g). Pont csak teljes collection-ért jár.
- **Írás:** `create/update/deleteMusicCollectionEntity` callable (`apps/functions/src/music-collection.functions.ts`),
  a validálás a `music-collection-definition.ts`-ben. A kliens a `music-collection` gyűjteményt nem írhatja.
- **Felhasználás:** `page/collections` (lista, lap, vadászlista), `data/collector-profile` (összpontszám,
  jelvények), `page/admin/music-collection` (szerkesztő).

A pontozás tiszta függvény, a kliensen fut, és semmit nem tárol. Ez így marad.

## Ami változik

```
Discogs API ──► refreshReleaseRarity (functions) ──► release.rarity (Firestore)
                                                          │
CollectionItem.release ──► toOwnedCopies (core mapper) ──► OwnedCopy { media, rarity }
                                                          │
ResolvedMusicCollection ──► scoreCollection (engine) ──► MusicCollectionScore
                                                          │
                     CollectionsPageStore / CollectionDetailPageStore / CollectorProfile
```

## A collection szabálya

- A `MusicCollectionCriteria` nem kap albumot megnevező mezőt, és a `music-collection-definition.ts` az
  ismeretlen kulcsot elutasítja (REQ-SCORE-001). Erre teszt van, hogy a szabály később se lazuljon fel.
- **Minimum (REQ-SCORE-002):** `MUSIC_COLLECTION_MINIMUM_ALBUMS = 2` az `api` rétegben.
    - A garancia a motorban van: a 2 albumnál kisebb feloldott collection szünetel. A `scoreCollection` nullát ad
      (`suspended: true`), a `compareWithCollection` nem jelzi teljesítettnek, a `listStandings$` pedig kiszűri a
      listákból. Így egy ilyen collection akkor sem ad pontot vagy jelvényt, ha publikálva van.
    - A szerkesztő ugyanazzal a motorral számolja az előnézetet, kiírja az albumszámot, és publikált állapotban
      nem engedi menteni (`MusicCollectionEditStore.tooFewAlbums`, `canSave`). A piszkozat menthető.
    - A szerver a publikálásnál **nem** oldja fel a szabályt. A resolver a `libs`-ben él, amit a functions nem
      lát, és a teljes katalógus beolvasása mentésenként több ezer olvasás lenne; ugyanezért nem futtatja a
      jelvény-rajzoló sem (`music-collection-badge-facts.ts`). A szerveroldali ellenőrzés a resolver
      megkettőzését jelentené, a motor garanciája mellett pedig nem ad többet.
    - Az admin lista a publikált, 2 album alatti collection-t „Szünetel” jelzéssel mutatja.
- **Felső korlát nincs** (REQ-SCORE-003). A jelvény-rajzoló `MAX_ALBUMS = 200` korlátja csak a modellnek
  küldött tények számát vágja, a collection méretét nem.
- A `basePoints` mező megszűnt (REQ-SCORE-014): nincs a `MusicCollection` modellben, a szerkesztő űrlapján és a
  definíció kimenetében. A callable a kulcsot még elfogadja, de nem írja be — a régi kliens így nem kap hibát a
  deploy alatt. A dokumentum minden mentéskor teljes egészében lecserélődik, tehát a mező az első mentéskor
  eltűnik; ami marad, azt a `tools/sync/remove-collection-base-points.mjs` törli (alapból dry-run).

## A kiadás ritkasága

### Adatmodell

A `RarityTier` a `libs/common/api`-ban van (`music/rarity`), mert a motor és a release modell is használja.
A többi a `libs/api/src/lib/domain/music/release/release.ts`-ben. A functions a `libs`-et nem látja, ezért a
`release-rarity.ts` a szintek saját másolatát hordozza.

```ts
export type RarityTier = 'common' | 'uncommon' | 'rare' | 'veryRare' | 'ultraRare';

export interface ReleaseRarity {
	tier: RarityTier;
	/** Melyik forrás döntött. */
	source: 'manual' | 'edition' | 'discogs' | 'catalog';
	/** A Discogs „have” száma a számítás pillanatában; null, ha nem ebből jött. */
	have: number | null;
	/** Epoch ms. */
	calculatedAt: number;
}

export interface ReleaseRarityOverride {
	tier: RarityTier;
	note: string;
	byUserId: string;
	/** Epoch ms. */
	at: number;
}

export interface Release {
	// …
	/** Hány darab készült a kiadásból, ha tudjuk. Admin tölti ki. */
	editionSize?: number | null;
	/** Szerver számolja; hiányzik, amíg nem futott rá számítás (ekkor Gyakori). */
	rarity?: ReleaseRarity | null;
	/** Kurátori felülbírálat; a `rarity.tier` ezt követi. */
	rarityOverride?: ReleaseRarityOverride | null;
}
```

A példányszám a kiadás mezője, nem a példányé. A gyűjtő a saját példányán megadhat sorszámot
(`CollectionItemSerial.total`), de az a pontozásba nem számít bele: amit a gyűjtő maga ír be, az nem dönthet a
saját pontjáról.

### Számítás

`apps/functions/src/release-rarity.ts` (tiszta logika, `functions` teszttel); a Discogs-hívás és a Firestore a
`release-rarity-refresh.ts`-ben, a callable-ök és az ütemezés a `release-rarity.functions.ts`-ben:

| Szint        | Discogs „have” | Példányszám                 | Katalógus-címkék (Discogs-azonosító nélkül)            |
| ------------ | -------------- | --------------------------- | ------------------------------------------------------ |
| Gyakori      | 1000 felett    | 3000 felett vagy ismeretlen | minden más                                             |
| Ritkább      | 300–999        | 1001–3000                   | limitált kiadás, vagy 20 évnél régebbi eredeti nyomás  |
| Ritka        | 100–299        | 301–1000                    | limitált kiadás, amely 20 évnél régebbi eredeti nyomás |
| Nagyon ritka | 25–99          | 101–300                     | —                                                      |
| Kuriózum     | 25 alatt       | 100 vagy kevesebb           | —                                                      |

- A szint: felülbírálat, ha van; különben a példányszám és a Discogs szintje közül a ritkább; Discogs-azonosító
  nélkül a címkék szerinti.
- A két évnél fiatalabb kiadás Discogs-szintje legfeljebb Ritkább.
- A küszöbök egy `RARITY_THRESHOLDS` konstansban állnak. A kiinduló értékeket a Q-SCORE-002 szerint a katalógus
  eloszlásához igazítjuk (`tools/discogs/rarity-report.mjs`, csak olvas).
- A Discogs-ból a kiadás `community.have` értéke kell. Árat, `lowest_price`-t, `num_for_sale`-t a kód nem kér
  le és nem tárol.

### Mikor fut

| Hívás                                                    | Mikor                                                                                 | Megjegyzés                                                                                                                                                                                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rateReleaseOnWrite`, `rateRootReleaseOnWrite` (trigger) | a kiadás létrejön, vagy változik a Discogs-azonosítója, példányszáma, címkéje, dátuma | a kiadások két helyen élnek (`release/…` és `artist/…/album/…/release/…`), ezért két trigger; a `rarity` beírása nem bemenet, így a trigger a saját írására nem fut újra                                                                          |
| `refreshReleaseRarityNightly` (ütemezett, 02:20)         | minden éjjel                                                                          | a katalógus következő szelete (legfeljebb 400 kiadás, 8 perc); a Discogs percenkénti 60 kérése miatt 1,1 mp szünet a kérések között. Hol tart, a `release-rarity/state` dokumentum őrzi; a végén elölről kezdi. 429-re megáll, és onnan folytatja |
| `refreshReleaseRarityNow` (admin callable)               | kézzel                                                                                | `{ uid }`: egy kiadás azonnal; uid nélkül a következő szelet                                                                                                                                                                                      |
| `setReleaseRarityOverride` (admin callable)              | kézzel                                                                                | `{ uid, tier, note }`; `tier: null` visszavonja. Az indoklás kötelező                                                                                                                                                                             |

Az írás a `catalog-sync` `stamp` / `touchCatalog` útján megy, hogy a kliens cache-e frissüljön. A szint csak
akkor íródik, ha a szint vagy a forrása változott: a „have” hétről hétre mozog, és ha minden mozdulása írás
lenne, minden kliens minden futás után újratöltené a kiadásokat.

A gyűjtő példánya (`CollectionItem.release`) a kiadás másolatát hordozza. A ritkaság ezért a katalógus
kiadásából olvasódik: a `MusicCollectionEffect` a `ReleaseStateService` kiadásait adja át a `toOwnedCopies`-nak,
amely a kiadás uid-ja alapján az aktuális `rarity`-t veszi, és csak ennek híján a példány másolatát.

### Jogosultság és rules

- `release.rarity` és `release.rarityOverride`: kliens nem írhatja. A `release` rules létrehozáskor egyiket sem
  engedi, módosításkor pedig csak változatlanul (`isValidReleaseCreate`, `isValidReleaseUpdate`); `rules` teszt.
  A kliens a kiadás mentésekor ki is hagyja őket (`withoutServerRarity`), így egy régebbi, cache-ből olvasott
  szint nem ütközik a szerver frissebb értékével.
- `release.editionSize`: a kiadás szerkesztésére jogosult admin írhatja, 1 és 1 000 000 közötti egész.
- `setReleaseRarityOverride`, `refreshReleaseRarityNow`: `updateReleaseEntity` jog.
- `release-rarity/state`: csak az Admin SDK éri el.

## A pontozó motor

`libs/domain/music/music-collection/engine/src/lib/music-collection-score.ts`, tiszta függvények, DI nélkül.

### Bemenet

```ts
export interface OwnedCopy {
	albumUid: string;
	disposedAt: number | null;
	/** Új: a példány hordozója. */
	media: MediaEnum;
	/** Új: a kiadás szintje; általános példánynál és ismeretlennél 'common'. */
	rarity: RarityTier;
}
```

A `releaseYear` és az `editions` kikerül a portból: az eredeti nyomás és a limitált kiadás már a ritkasági
szinten keresztül hat.

### Konstansok

```ts
MEDIA_POINTS    = { vinyl: 10, boxset: 8, cd: 7, cassette: 5, dvd: 5 }
RARITY_FACTORS  = { common: 1, uncommon: 1.25, rare: 1.6, veryRare: 2, ultraRare: 2.5 }
FORMAT_FACTORS  = { vinyl: 1.5, cd: 1.3, cassette: 1.15 }   // csak egységes sorozatnál
MINIMUM_ALBUM_POINTS = 5
sizeFactor(n)   = round2(1 + 0.25 × log2(n / 2))            // n ≥ 2
```

### Algoritmus (REQ-SCORE-004…011)

1. `n < 2` → szünetel, minden pont 0.
2. **Vegyes jelölt:** albumonként a legtöbb pontot érő, még birtokolt példány. Összeg × `sizeFactor(n)`.
3. **Egységes jelöltek:** minden hordozóra a `FORMAT_FACTORS` kulcsai közül, amelyiken a gyűjtőnek _minden_
   albumból van példánya: albumonként a legjobb példány azon a hordozón, összeg × `sizeFactor(n)` ×
   `FORMAT_FACTORS[hordozó]`.
4. A legtöbb pontot adó jelölt nyer; egyenlőségnél az egységes, azon belül vinyl, CD, kazetta sorrendben.
5. A végeredmény egészre kerekített. Az albumpontok nem kerekítődnek, a megjelenítés egy tizedest mutat.
6. Hiányzó albumnál (félkész collection) az album `MINIMUM_ALBUM_POINTS`-ot ér, formátum-szorzó nélkül: ez a
   „legalább ennyit érne” érték.

A számítás albumonként és hordozónként egy menet, `O(példányok + albumok)`; ezres collection-nél sem lassú.

### Kimenet

```ts
export interface AlbumScore {
	albumUid: string;
	albumName: string;
	/** null: az album hiányzik a polcról. */
	media: MediaEnum | null;
	rarity: RarityTier | null;
	points: number;
	/** Hány példánya van a gyűjtőnek; a legjobb számít. */
	copies: number;
}

export interface FormatOpportunity {
	media: 'vinyl' | 'cd' | 'cassette';
	missingAlbumUids: string[];
	/** Legalább ennyit érne az egységes sorozat. */
	minimumPoints: number;
}

export interface MusicCollectionScore {
	collectionUid: string;
	/** albumszám × 5 × darabszám-szorzó: mindenkinek ugyanaz. */
	basePoints: number;
	albumPoints: number;
	sizeFactor: number;
	/** 1, ha a sorozat vegyes. */
	formatFactor: number;
	uniformMedia: 'vinyl' | 'cd' | 'cassette' | null;
	/** Teljes collection: a pont. Félkész: legalább ennyit érne. */
	totalPoints: number;
	/** 0, amíg a collection nem teljes. */
	earnedPoints: number;
	/** A collection 2 album alá esett. */
	suspended: boolean;
	albums: AlbumScore[];
	/** REQ-SCORE-013: hordozók, amelyeken az albumok legalább fele megvan, de nem mind. */
	opportunities: FormatOpportunity[];
}
```

A `bonusPoints`, a `derived` és a `highlights` megszűnik; a lap a `albums` listából mutatja a levezetést.

### Ami a motorra épül

- `music-collection-next.ts` (vadászlista): változatlan, a `totalPoints`-ból számol — ami félkész collection-nél
  mostantól a „legalább ennyi” érték.
- `collections.mapper.ts`, `collections.model.ts`: a kártya `points`, `earnedPoints` mellé `basePoints`,
  `sizeFactor`, `formatFactor`, `uniformMedia`; a `bonusPoints` megszűnik. A levezetés a
  `toCollectionScore` → `CollectionScoreView` → `mc-collection-score` úton jut a lapra.
- `shared/music-ui/rarity-badge`: a szint és a forrása a kiadás és a példány lapján.
- `page/release`: `mc-release-rarity-admin` panel adminnak, a `ReleasePageStore` → `ReleaseDetailsEffect` →
  `ReleaseRarityRepository` (callable) láncon.
- `domain/release` űrlap: `editionSize` mező.
- `collector-profile.model.ts`: az összpontszám az `earnedPoints` összege. Az átfedés-szabály
  (REQ-SCORE-016) ide kerül majd, `collectorTotalPoints(standings)` néven a motorban, a gyűjtői szerkesztő
  ticketjével.
- `music-collection-admin`: a `basePoints` mező és a „From the rule” jelzés megszűnik; a sor az alapértéket és
  az albumszámot mutatja, a 2 album alatti collection jelzést kap.
- Fordítások: `page.collections.*`, `ui.collectionDetailPage.score.*` új kulcsok mindhárom nyelven
  (hu, en, de).

## Deploy-igény

- **Functions:** `rateReleaseOnWrite`, `rateRootReleaseOnWrite`, `refreshReleaseRarityNightly`,
  `refreshReleaseRarityNow`, `setReleaseRarityOverride`, és a módosított `create/updateMusicCollectionEntity`.
  A sorrend nem kötött: a kliens a hiányzó `rarity`-t Gyakorinak olvassa, a szerver a régi kliens `basePoints`
  kulcsát elfogadja.
- **Rules:** a `release` új mezői.
- **Első futás:** a deploy után a `refreshReleaseRarityNow` uid nélkül, ismételve, amíg `wrapped` nem lesz —
  vagy megvárni, amíg az éjszakai futás körbeér. Amíg egy kiadás nem került sorra, Gyakori, vagyis a pontok
  alulról közelítenek, nem felülről.
- **Kalibrálás:** `node tools/discogs/rarity-report.mjs --env dev` (csak olvas), utána a `RARITY_THRESHOLDS`
  igazítása.
- **Adat:** `node tools/sync/remove-collection-base-points.mjs`. Minden deploy és `--confirm` futtatás a maintainer
  jóváhagyásával történik.
