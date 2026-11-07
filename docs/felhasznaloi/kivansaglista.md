# Kívánságlista

**Azonosító-előtag:** WISH
**Technikai:** [kívánságlista architektúra](../technikai/architektura/kivansaglista.md)
**UX:** [mobil kívánságlista](../ux/mobil/kivansaglista.md)

## Felhasználói leírás

A kívánságlista a vadászlistád. A boltban előveszed, megnézed, mit keresel, és amit megtaláltál, kipipálod.
Ha valami megtetszik, de most nem veszed meg, egy szkenneléssel felteszed a listára.

## Követelmények

### REQ-WISH-001: Lista a mobilon

A felhasználó a Kívánságlista fülön látja a keresett lemezeit:

- kereséssel,
- formátum szerinti szűréssel,
- a „Megtaláltak is” kapcsolóval, amely a már megtalált tételeket is mutatja.

A lista offline is megnyílik.

**Felület:** mobil
**Ticket:** #107
**UX:** [Lista](../ux/mobil/kivansaglista.md#lista)

### REQ-WISH-002: Kívánságlistára tétel

A szkennelés eredménylapjáról egy katalógusban lévő lemez kívánságlistára tehető. A felhasználó megadja,
milyen formátumban keresi (LP, CD, kazetta…), és opcionálisan egy bolti linket. Ha az album már a listán van,
az app ezt kiírja, és nem veszi fel újra.

**Felület:** mobil
**Ticket:** #107
**UX:** [Felvétel](../ux/mobil/kivansaglista.md#felvétel-a-listára)

### REQ-WISH-003: Megtaláltam

A felhasználó egy tételt „megtaláltnak” jelöl, a listában vagy a szkennelés eredménylapján. A tétel a
listán marad, megtaláltként. Rögtön utána az app felajánlja a példány felvételét is (REQ-COPY-001).

**Felület:** mobil
**Ticket:** #107

### REQ-WISH-004: Eltávolítás

A felhasználó egy tételt eltávolíthat a listáról, elhúzással vagy a tétel menüjéből. Ehhez megerősítés
kell.

**Felület:** mobil
**Ticket:** #107

### REQ-WISH-005: Offline módosítás

A „megtaláltam” és az eltávolítás offline is működik, és a kapcsolat visszatértekor szinkronizálódik.

**Felület:** mobil
**Ticket:** #107

### REQ-WISH-006: A tétel borítója

A kívánságlista tétele mindenhol, ahol megjelenik (a lista, a tétel saját lapja, az admin lista és tábla,
a megosztott gyűjtő-profil), az album megadott kép-címét mutatja, ennek hiányában a csatolt borítót.
A tétel a címet a létrehozásakor eltárolja. Szerkesztéskor megtartja, ha pedig az albumot újraválasztják,
az új album címét veszi át. Az album címének későbbi változása nem frissíti a már tárolt tételt. A korábban
felvett tételek egy egyszeri frissítéssel kapták meg a címet.

**Felület:** mindkettő
**Ticket:** #79
**Technikai:** [Kívánságlista architektúra](../technikai/architektura/kivansaglista.md)

## Nem része

- Piaci ár és elérhetőség a tételek mellett.
- A kívánságlista megosztása. Ezt a gyűjtő-profil beállítása intézi a weben.
- Katalógusban nem lévő lemez kívánságlistára tétele. A wishlist-tétel katalógus-albumra hivatkozik
  (`albumReference.uid`). Az app ilyenkor a „Kérés a katalógusba” gombot ajánlja. A kívánságlistára szánt
  release-kérés később külön ticket lehet.
