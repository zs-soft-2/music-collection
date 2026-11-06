# Lejátszási napló: „Feltettem”

**Azonosító-előtag:** PLAY
**Technikai:** [lejátszási napló architektúra](../technikai/architektura/lejatszasi-naplo.md)
**UX:** [mobil lejátszási napló](../ux/mobil/lejatszasi-naplo.md)

## Felhasználói leírás

Ma a napló csak azt rögzíti, ami az appban szólt, Spotifyról vagy YouTube-ról. A gyűjtő viszont a lemezjátszón
hallgat. A „Feltettem” gombbal a telefonon egy koppintással rögzíted, hogy a lemezt feltetted. Így a
hallgatási összegződben végre a polcod szerepel, nem a streaming.

## Követelmények

### REQ-PLAY-001: „Feltettem” gomb

A lemez részletei képernyőn egy „Feltettem” gomb egy hallgatást rögzít a lemezre, a mostani időponttal.

**Felület:** mobil
**UX:** [Lemez részletei](../ux/mobil/lejatszasi-naplo.md#feltettem-gomb)

### REQ-PLAY-002: Melyik példány

Ha a lemezből több példány van, a felhasználó választ, melyiket tette fel. Az alapérték a legutóbb
hallgatott példány. Egy példánynál nincs kérdés.

**Felület:** mobil

### REQ-PLAY-003: Visszavonás

A rögzítés után néhány másodpercig egy „Visszavonás” gomb látszik. Ez törli a hallgatást.

**Felület:** mobil

### REQ-PLAY-004: Utoljára hallgatva

A lemez részletei mutatják, mikor hallgatta utoljára (például „Utoljára: 3 hete”), és hányszor összesen.
Ebbe a lemezről és a streamingről rögzített hallgatások is beleszámítanak.

**Felület:** mobil

### REQ-PLAY-005: A hallgatási összegzőben

A lemezről rögzített hallgatások megjelennek a profil hallgatási összegzőjében és a webes album lapon is,
„lemezről” jelöléssel.

**Felület:** mindkettő

### REQ-PLAY-006: Offline

A „Feltettem” offline is működik, és a kapcsolat visszatértekor szinkronizálódik.

**Felület:** mobil

## Nem része

- Oldalankénti (A/B) rögzítés.
- „Feltettem” gomb a weben.
- Értékelés-kérés a rögzítés után. A streamingnél a végighallgatott albumra ez ma így van, itt nem kérünk.
- Év-összegző és hallgatási statisztika lap.
