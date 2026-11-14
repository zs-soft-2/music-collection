# Collection-ök pontozása

**Azonosító-előtag:** SCORE
**Technikai:** [pontozás architektúra](../technikai/architektura/gyujtemeny-pontozas.md) · [ADR-005](../technikai/adr/ADR-005-kiadas-ritkasaga-discogs-have-alapjan.md)
**UX:** [web: collection-ök pontozása](../ux/web/gyujtemeny-pontozas.md)

## Felhasználói leírás

Egy collection albumok szűrőkkel leírt halmaza: „a nyolcvanas évek thrash metal nagylemezei”, „a Death
stúdióalbumai”. A gyűjtő akkor teljesíti, ha a halmaz minden albumából van példány a polcán. A teljesített
collection jelvényt és pontot ér.

A pont azt méri, amit egy gyűjtő is mérne:

- **min van meg** az album: bakeliten többet ér, mint CD-n, CD-n többet, mint kazettán;
- **mennyire ritka** az a kiadás, amelyik a polcon áll;
- **mekkora** a collection: húsz albumot összeszedni nehezebb, mint ötöt;
- **egységes-e** a sorozat: aki mindet ugyanazon a hordozón gyűjtötte össze, külön bónuszt kap.

Amit egy lemezért fizetni kell vagy kérni lehet, az nem számít. A pont nem ár.

### A képlet

```
album pontja      = hordozó alappontja × ritkasági szorzó        (a gyűjtő számító példánya szerint)
collection pontja = albumok pontjainak összege × darabszám-szorzó × formátum-szorzó
```

| Hordozó | Alappont |     | Ritkasági szint | Szorzó |     | Egységes sorozat | Formátum-szorzó |
| ------- | -------- | --- | --------------- | ------ | --- | ---------------- | --------------- |
| Vinyl   | 10       |     | Gyakori         | ×1,0   |     | csupa vinyl      | ×1,5            |
| CD      | 7        |     | Ritkább         | ×1,25  |     | csupa CD         | ×1,3            |
| Kazetta | 5        |     | Ritka           | ×1,6   |     | csupa kazetta    | ×1,15           |
| Box set | 8        |     | Nagyon ritka    | ×2,0   |     | vegyes           | ×1,0            |
| DVD     | 5        |     | Kuriózum        | ×2,5   |     |                  |                 |

A darabszám-szorzó 2 albumnál ×1,00, és az albumszám minden megduplázódásával 0,25-öt nő. Felső határa nincs.

| Album  | 2    | 3    | 5    | 8    | 10   | 16   | 20   | 32   | 50   | 64   | 100  | 250  | 500  | 1000 |
| ------ | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| Szorzó | 1,00 | 1,15 | 1,33 | 1,50 | 1,58 | 1,75 | 1,83 | 2,00 | 2,16 | 2,25 | 2,41 | 2,74 | 2,99 | 3,24 |

### Példa

Egy 8 albumos collection, a gyűjtő polcán 6 vinyl és 2 CD:

| Példány              | Számítás     | Pont      |
| -------------------- | ------------ | --------- |
| vinyl, ritka         | 10 × 1,6     | 16        |
| vinyl, nagyon ritka  | 10 × 2,0     | 20        |
| vinyl, ritkább       | 10 × 1,25    | 12,5      |
| 3 × vinyl, gyakori   | 3 × 10 × 1,0 | 30        |
| CD, ritkább          | 7 × 1,25     | 8,75      |
| CD, gyakori          | 7 × 1,0      | 7         |
| **Albumok összesen** |              | **94,25** |

- Vegyes polc: 94,25 × 1,50 (8 album) × 1,0 = **141 pont**.
- Ha a két CD helyett gyakori vinyl áll a polcon: 98,5 × 1,50 × 1,5 (csupa vinyl) = **222 pont**.

Ugyanez a nyolc album 20 albumos collection részeként ×1,83-as szorzót kapna: a nagyobb collection albumonként
is többet ér.

## Követelmények

### REQ-SCORE-001: A collection tartalmát csak szűrők adják meg

A collection albumait szűrők határozzák meg (évek, stílusok, az előadó stílusai, albumformátum, előadók, az
előadó országa, közreműködők). A szerkesztő nem ad módot albumok egyenkénti felvételére vagy kizárására, és a
szerver sem fogad el ilyen szabályt. Ami megfelel a szűrőknek, az a collection része, a katalógus változásával
együtt.

**Ticket:** #116
**Felület:** web
**UX:** [Szerkesztő](../ux/web/gyujtemeny-pontozas.md#szerkesztő-a-szűrők-és-az-érték)
**Technikai:** [Szabály](../technikai/architektura/gyujtemeny-pontozas.md#a-collection-szabálya)

### REQ-SCORE-002: Legalább két album

Collection akkor publikálható, ha a szűrői a katalógus legalább 2 albumára illenek. Ennél kevesebbnél a
szerkesztő megmondja, hány album illik a szűrőkre, és nem engedi publikálni. Piszkozat menthető kevesebb
albummal is.

Ha egy publikált collection a katalógus változása miatt 2 album alá esik, **szünetel**: nem ér pontot, nem ad
jelvényt, a listákban nem jelenik meg, a készítője pedig jelzést lát róla. Amint megint legalább 2 albuma van,
magától visszaáll. Ez a szabály a pontozásban él, ezért akkor is érvényes, ha egy 2 albumnál kisebb collection
a szerkesztőt megkerülve lett publikálva.

**Ticket:** #116
**Felület:** web
**UX:** [Szerkesztő](../ux/web/gyujtemeny-pontozas.md#szerkesztő-a-szűrők-és-az-érték)
**Technikai:** [Szabály](../technikai/architektura/gyujtemeny-pontozas.md#a-collection-szabálya)

### REQ-SCORE-003: Nincs felső darabszám

A collection albumainak számára nincs felső korlát. A pontozás bármekkora collection-re értelmes eredményt ad
(lásd REQ-SCORE-008).

**Ticket:** #116
**Felület:** mindkettő

### REQ-SCORE-004: Az album pontja a hordozóból és a kiadás ritkaságából áll

Egy album pontja a gyűjtő számító példányából (REQ-SCORE-010) adódik: a hordozó alappontja szorozva a kiadás
ritkasági szorzójával. A pénzben kifejezett érték (vételár, piaci ár, becsült érték) a pontot semmilyen
formában nem befolyásolja.

**Ticket:** #116
**Felület:** mindkettő
**Technikai:** [Motor](../technikai/architektura/gyujtemeny-pontozas.md#a-pontozó-motor)

### REQ-SCORE-005: Hordozó szerinti alappont

Az alappont: vinyl 10, box set 8, CD 7, kazetta 5, DVD 5.

**Ticket:** #116
**Felület:** mindkettő

### REQ-SCORE-006: Ritkasági szintek

Minden kiadásnak egy ritkasági szintje van az ötből: Gyakori (×1,0), Ritkább (×1,25), Ritka (×1,6), Nagyon
ritka (×2,0), Kuriózum (×2,5). A szint a kiadás lapján és a gyűjtő példányán is látszik.

A hordozóra szóló általános példány („megvan vinylen, a kiadást nem tudom”) mindig Gyakori: a ritkaságot meg
kell mutatni, nem lehet feltételezni.

**Ticket:** #116
**Felület:** mindkettő
**UX:** [Példány ritkasága](../ux/web/gyujtemeny-pontozas.md#ritkaság-a-kiadás-és-a-példány-lapján)

### REQ-SCORE-007: Miből áll össze a ritkaság

A szintet a szerver számolja, a kiadáson tárolja, és rendszeresen frissíti. A források, erősorrendben:

1. **Kurátori felülbírálat:** admin kézzel adhat szintet egy kiadásnak, indoklással. Ez mindent felülír.
2. **Példányszám:** ha a kiadásról tudjuk, hány darab készült belőle (számozott vagy limitált széria).
3. **Discogs:** hány Discogs-felhasználó gyűjteményében szerepel az adott kiadás.
4. **Katalógus-címkék:** ha a kiadásnak nincs Discogs-azonosítója, a címkék (limitált kiadás, eredeti nyomás és
   a kora) döntenek. Így legfeljebb Ritka szint érhető el.

A 2. és a 3. forrás közül a ritkább szint érvényes. A két évnél fiatalabb kiadás Discogs-adatból legfeljebb
Ritkább lehet, mert egy friss megjelenést még kevesen vettek fel. A Discogs árait és piactér-adatait az app
nem olvassa.

**Ticket:** #116
**Felület:** mindkettő
**Technikai:** [Ritkaság](../technikai/architektura/gyujtemeny-pontozas.md#a-kiadás-ritkasága) · [ADR-005](../technikai/adr/ADR-005-kiadas-ritkasaga-discogs-have-alapjan.md)

### REQ-SCORE-008: Darabszám-szorzó

A collection pontját az albumainak száma szorozza: 2 albumnál ×1,00, és minden megduplázódás 0,25-öt ad hozzá
(`1 + 0,25 × log2(n / 2)`, két tizedesre kerekítve). A szorzó minden teljesített collection-nek jár, a polc
hordozóitól függetlenül, és felső határa nincs.

**Ticket:** #116
**Felület:** mindkettő

### REQ-SCORE-009: Formátum-szorzó csak egységes sorozatnak

Egy collection teljesíthető vegyesen, vinylből, CD-ből és kazettából. Formátum-szorzót viszont csak az kap,
akinek a collection minden albuma ugyanazon a hordozón van meg: csupa vinyl ×1,5, csupa CD ×1,3, csupa kazetta
×1,15. Vegyes polcnál, box setnél és DVD-nél a szorzó ×1,0.

**Ticket:** #116
**Felület:** mindkettő

### REQ-SCORE-010: Melyik példány számít

Ha a gyűjtőnek egy albumból több példánya van, az app azt a kiosztást számolja, amelyik a collection-re a
legtöbb pontot adja. Ez vagy albumonként a legtöbbet érő példány (vegyes sorozat), vagy egy olyan hordozó
példányai, amelyiken minden album megvan (egységes sorozat, formátum-szorzóval). Az eladott, elajándékozott
példány nem számít.

**Ticket:** #116
**Felület:** mindkettő
**Technikai:** [Motor](../technikai/architektura/gyujtemeny-pontozas.md#a-pontozó-motor)

### REQ-SCORE-011: Pont csak teljes collection-ért jár

A gyűjtő akkor kapja meg a pontot és a jelvényt, ha a collection minden albumából van példánya. Addig 0 pontja
van belőle, és az app azt mutatja, mennyit érne: a meglévő albumok a valódi pontjukkal, a hiányzók a
legalacsonyabb albumponttal (5) számolva, „legalább ennyi” megjelöléssel.

A collection **alapértéke** mindenkinek ugyanaz: `albumszám × 5 × darabszám-szorzó`. Ennyit ér a collection a
legszerényebb polccal, és ezt mutatja az app annak, akinek még egy albuma sincs meg belőle.

**Ticket:** #116
**Felület:** mindkettő
**UX:** [Kártya](../ux/web/gyujtemeny-pontozas.md#collection-kártya)

### REQ-SCORE-012: A pontszám levezetése látszik

A collection lapján a gyűjtő látja, miből áll össze a pontja: albumonként a számító példány hordozóját,
ritkasági szintjét és pontját, az albumok összegét, a darabszám-szorzót, a formátum-szorzót és a végeredményt.

**Ticket:** #116
**Felület:** web
**UX:** [Így áll össze a pontszám](../ux/web/gyujtemeny-pontozas.md#így-áll-össze-a-pontszám)

### REQ-SCORE-013: Tipp az egységes sorozathoz

Ha a gyűjtőnek a collection albumainak legalább a fele megvan egy hordozón, de nem mind, az app megmondja,
mely albumok hiányoznak azon a hordozón az egységes sorozathoz, és legalább hány pontot érne az a sorozat.

**Ticket:** #116
**Felület:** web
**UX:** [Így áll össze a pontszám](../ux/web/gyujtemeny-pontozas.md#így-áll-össze-a-pontszám)

### REQ-SCORE-014: Pontérték kézzel nem adható meg

A collection pontértékét senki nem írhatja be kézzel. A kurátor által korábban megadott alappont megszűnik,
minden collection értéke a képletből adódik.

**Ticket:** #116
**Felület:** web

### REQ-SCORE-015: A pont a mostani állapotot tükrözi

A pont a katalógus és a polc pillanatnyi állapotából számolódik, az app nem őriz korábbi pontszámot. Ha a
collection új albumot kap, egy példány elkerül a polcról, vagy egy kiadás ritkasági szintje változik, a pont
vele változik.

**Ticket:** #116
**Felület:** mindkettő

### REQ-SCORE-016: Átfedő collection-ök a gyűjtő összpontszámában

A gyűjtő összpontszámában egy album pontja a legtöbbet érő teljesített collection-jében teljes értékkel
számít, a másodikban a felével, a harmadikban a negyedével, a továbbiakban nem. A collection saját, a lapján
mutatott pontját ez nem érinti. A szabály azért kell, hogy a gyűjtők által készített, egymást átfedő
collection-ökkel ne lehessen ugyanazt a polcot korlátlanul sokszor elszámolni.

**Felület:** mindkettő
**Megjegyzés:** a gyűjtői collection-szerkesztő ticketjével együtt valósul meg (lásd Q-SCORE-001).

## Nem része

- **Gyűjtői collection-szerkesztő.** Eldőlt, hogy collection-t bármely gyűjtő készíthet, de a szerkesztő,
  a láthatóság és a moderálás külön feature és külön ticket. A pontozás úgy készül, hogy arra is érvényes
  legyen (REQ-SCORE-001, -002, -016).
- **Hordozóra szűrő collection** („csak vinylen teljesíthető”). A szabály albumokat nevez meg, nem kiadásokat;
  a hordozót a formátum-szorzó jutalmazza.
- **Részpont** félkész collection-ért.
- **Állapot (grading) szerinti pont.** A példány állapota nem befolyásolja a pontot.
- **Pontszám-történet**, szezonok, visszamenőleges ranglisták.
- **Mobil felület.** A mobil app a webbel azonos motort használja; a képernyői a mobil collection-nézet
  ticketjében készülnek.

## Nyitott kérdések

### Q-SCORE-001: Mi védje a ranglistát a saját polcra szabott collection-öktől?

Ha bárki készíthet collection-t, a gyűjtő a saját polcára illő szűrőkből tetszőlegesen sok, egymást átfedő
collection-t gyárthat.

- **A)** Átfedés-szabály (REQ-SCORE-016): egy album legfeljebb háromszor számít, csökkenő súllyal. Nem kell
  hozzá moderálás, és a kurátori collection-ökre is érvényes.
- **B)** Elismerés: a gyűjtői collection pontja csak akkor számít az összpontszámba, ha kurátor jóváhagyta.
- **C)** Mindkettő.

**Javaslat:** A. A REQ-SCORE-016 ezt írja le; a gyűjtői szerkesztő ticketjének megnyitásakor véglegesítjük.

### Q-SCORE-002: A ritkasági küszöbök kalibrálása

A Discogs-darabszám és a példányszám küszöbei ([architektúra](../technikai/architektura/gyujtemeny-pontozas.md#a-kiadás-ritkasága))
kiinduló értékek. A kazettát kevesebb Discogs-felhasználó gyűjti, ezért ugyanaz a darabszám kazettánál kisebb
ritkaságot jelent.

- **A)** Egy küszöbsor minden hordozóra.
- **B)** Hordozónként külön küszöbsor, a katalógus tényleges eloszlásából.

**Javaslat:** B, a ticket részeként futó kalibráló riport alapján; a cél, hogy a katalógus kiadásainak nagyjából
60%-a Gyakori, 20%-a Ritkább, 12%-a Ritka, 6%-a Nagyon ritka és 2%-a Kuriózum legyen.

**Állás (2026-11-14):** a riport lefutott a dev katalóguson. A 712 kiadásból 11-nek van Discogs-azonosítója
(9 vinyl, 2 box set; CD és kazetta egy sem), ebből küszöböt hangolni nem lehet. A kiinduló értékek maradnak, a
kérdés nyitva. Amíg a kiadások nincsenek Discogs-hoz kötve, a szintjük a címkékből adódik, legfeljebb Ritka
szintig; a kalibrálás előfeltétele ezért a Discogs-azonosítók pótlása.

### Q-SCORE-003: Box set és DVD

A box set hordozóként szerepel a katalógusban, de nem mondja meg, vinyl vagy CD van-e benne.

- **A)** Box set 8 pont, DVD 5 pont, egyik sem kap formátum-szorzót, és megtöri az egységes sorozatot.
- **B)** A box set kapjon „tartalom” mezőt (vinyl / CD / kazetta), és aszerint számítson.

**Javaslat:** A most; B akkor, ha a box setek miatt sok egységes sorozat törik meg.
