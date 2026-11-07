# Katalógus-képek

**Azonosító-előtag:** IMG

## Felhasználói leírás

Az admin egy albumhoz és egy előadóhoz is csatolhat képet, vagy megadhat egy kép-címet (URL-t). A megadott cím
mindenhol előnyt élvez: ahol az app az album borítóját vagy az előadó képét mutatja, ott a megadott cím szerepel,
és csak ennek hiányában jön a csatolt kép.

## Követelmények

### REQ-IMG-001: Album borítójának sorrendje

Az album borítója a megadott kép-cím. Ha nincs megadott cím, akkor a csatolt borító. Ez minden felületen így van,
azokon is, amelyek az album eltárolt másolatát mutatják (a lemez-kiadás, a gyűjteménybeli példány és a kívánság).

**Felület:** mindkettő
**Ticket:** #79

### REQ-IMG-002: Előadó képének és fejlécének sorrendje

Az előadó képe a megadott kép-cím. Ha nincs, akkor a csatolt fő kép, és ha az sincs, akkor az importált (Discogs)
fotó. Az előadó fejléce a csatolt fejléckép, ennek hiányában az előadó képe. Az üres fejléc-útvonal úgy számít,
mintha nem is lenne.

**Felület:** mindkettő
**Ticket:** #79

## Nem része

- Az eltárolt másolatok utólagos szinkronban tartása, ha egy album kép-címe később megváltozik.
