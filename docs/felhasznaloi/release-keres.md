# Release-kérés a katalógusba

**Azonosító-előtag:** RREQ
**Technikai:** [release-kérés architektúra](../technikai/architektura/release-keres.md)
**UX:** [mobil release-kérés](../ux/mobil/release-keres.md)

## Felhasználói leírás

Olyan lemezt szkenneltél, amit a Discogs ismer, de a katalógusunk még nem. Egy koppintással kéred, hogy
felvegyük. A kérést egy admin bírálja el. Ha jóváhagyja, a lemez automatikusan a gyűjteményedbe kerül, és erről
értesítést kapsz.

## Követelmények

### REQ-RREQ-001: Kérés a szkennelésből

A szkennelés „Új” eredményénél a „Kérés a katalógusba” gomb elküldi a kérést. A kérés a felismert kiadás
adataival megy el: Discogs master- és release-azonosító, formátum, kiadó, katalógusszám, ország, év. Ehhez
egy legfeljebb 500 karakteres megjegyzés írható.

**Felület:** mobil
**Ticket:** #108
**UX:** [Kérés lap](../ux/mobil/release-keres.md#kérés-lap)

### REQ-RREQ-002: Ismételt kérés

Ha a felhasználónak ugyanerre a Discogs-kiadásra már van függő kérése, az app nem küld újat, hanem kiírja:
„Ezt már kérted, elbírálásra vár”.

**Felület:** mobil
**Ticket:** #108

### REQ-RREQ-003: Kéréseim

A Profil alatt a „Kéréseim” lista mutatja a release-kéréseket, állapottal:

- függő,
- jóváhagyva, linkkel a felvett lemezre,
- elutasítva, az admin megjegyzésével.

**Felület:** mobil
**Ticket:** #108
**UX:** [Kéréseim](../ux/mobil/release-keres.md#kéréseim)

### REQ-RREQ-004: Jóváhagyás után a gyűjteményben

A jóváhagyott kérés lemeze a felhasználó gyűjteményébe kerül, külön teendő nélkül. Ez ma is így működik
(`approveReleaseRequest`). A mobil gyűjteménye ezt frissítés nélkül mutatja.

**Felület:** mindkettő
**Ticket:** #108

### REQ-RREQ-005: Értesítés az elbírálásról

A felhasználó push értesítést kap, amikor a kérését jóváhagyták vagy elutasították (REQ-NOTIF-003).

**Felület:** mobil
**Ticket:** #109

## Nem része

- Teljesen új album kérése Discogs-találat nélkül (szabad szöveges kérés).
- A kérés szerkesztése vagy visszavonása a mobilon.
- Kívánságlistára szánt kérés: a jóváhagyás ma mindig példányt hoz létre.
