# Szkennelés

**Azonosító-előtag:** SCAN
**Technikai:** [szkennelés architektúra](../technikai/architektura/szkenneles.md) · [ADR-003](../technikai/adr/ADR-003-nativ-vonalkod-olvaso.md)
**UX:** [mobil szkennelés](../ux/mobil/szkenneles.md)

## Felhasználói leírás

A börzén egy doboz lemez előtt állsz, és nem emlékszel, megvan-e már az a préselés. A telefon kamerájával
ráolvasol a vonalkódra, és egy pillanat múlva látod:

- **megvan** (és hány példányban),
- **a kívánságlistádon van**,
- **nincs meg, de ismerjük**,
- vagy **új nekünk**.

Innen egy koppintással felveheted a gyűjteményedbe, a kívánságlistára teheted, vagy kérheted a katalógusba.

Ha nincs vonalkód (régi lemez, letépett matrica), a borítóról vagy a hátlapról készült fotóból ismerjük fel
a lemezt.

## Követelmények

### REQ-SCAN-001: Élő vonalkód-olvasás

A felhasználó a Szkennelés fülön a kamera élőképével olvas vonalkódot (EAN-13, EAN-8, UPC-A, UPC-E), fotó
készítése nélkül. Az olvasás iOS-en és Androidon is működik.

**Felület:** mobil
**UX:** [Élő olvasó](../ux/mobil/szkenneles.md#élő-olvasó)
**Technikai:** [Vonalkód](../technikai/architektura/szkenneles.md#vonalkód-olvasás)

### REQ-SCAN-002: „Megvan-e már?” eredmény

Egy beolvasott kód után az app egy eredménylapon a felismert kiadást és az egyik állapotot mutatja:

1. **Megvan:** a gyűjteményben van, a példányszámmal.
2. **Kívánságlistán:** a lemez albuma a kívánságlistán van.
3. **Nincs meg:** a kiadás vagy az albuma ismert a katalógusban.
4. **Új:** a Discogs ismeri, de a katalógusunk nem.
5. **Nem ismert:** a Discogs sem ismeri a kódot.

Ha a kód több kiadásra illik, az app legfeljebb hat jelöltet mutat, a legjobb egyezéssel elöl.

**Felület:** mobil
**UX:** [Eredménylap](../ux/mobil/szkenneles.md#eredménylap)

### REQ-SCAN-003: Sorozat-szkennelés

Az olvasó egy eredmény után is nyitva marad, így a következő kód azonnal olvasható. A munkamenetben beolvasott
lemezek egy listában gyűlnek, állapotjelzővel. Ugyanaz a kód másodszor nem kerül fel a listára, csak
kiemelődik.

**Felület:** mobil
**UX:** [Munkamenet-lista](../ux/mobil/szkenneles.md#munkamenet-lista)

### REQ-SCAN-004: Műveletek az eredményből

Az eredménylapról, állapottól függően:

- **Felvétel a gyűjteménybe:** gyors felvitel (REQ-COPY-001). Csak katalógusban lévő kiadásnál.
- **Kívánságlistára:** REQ-WISH-002.
- **Megtaláltam:** ha a lemez a kívánságlistán van (REQ-WISH-003).
- **Kérés a katalógusba:** REQ-RREQ-001. „Új” állapotnál.
- **Megnyitás:** a lemez részletei, ha megvan.

**Felület:** mobil

### REQ-SCAN-005: Kézi kódbevitel

Ha a kód sérült vagy a kamera nem olvassa, a felhasználó számmal is beírhatja. Az eredmény ugyanaz, mint az
olvasásé.

**Felület:** mobil
**UX:** [Kézi bevitel](../ux/mobil/szkenneles.md#kézi-bevitel)

### REQ-SCAN-006: Visszajelzés olvasáskor

Sikeres olvasáskor a telefon röviden rezeg, és az élőképen a kód kerete kiemelődik.

**Felület:** mobil

### REQ-SCAN-007: Kamera-engedély

Az app az első szkenneléskor kér kamera-engedélyt, egy mondatos indoklással. Ha a felhasználó megtagadja, az
olvasó helyén magyarázat jelenik meg, egy gomb a rendszerbeállításokhoz, és a kézi kódbevitel.

**Felület:** mobil
**UX:** [Nincs engedély](../ux/mobil/szkenneles.md#élő-olvasó)

### REQ-SCAN-008: Felismerés fotóból

Ha nincs vonalkód, a felhasználó fotót készít a borítóról vagy a hátlapról, vagy a galériából választ egyet.
Az app a fotóból felismeri a lemezt, és ugyanazt az eredménylapot mutatja, mint a vonalkódnál (REQ-SCAN-002).

- A fotós felismerés napi kvótához kötött. A lap mutatja, mennyi maradt.
- Ha a kvóta elfogyott vagy a funkció ki van kapcsolva, az app ezt kiírja, és felajánlja a kézi kódbevitelt.

**Felület:** mobil
**UX:** [Fotó mód](../ux/mobil/szkenneles.md#fotó-mód)
**Technikai:** [Fotós felismerés](../technikai/architektura/szkenneles.md#fotós-felismerés)

### REQ-SCAN-009: Hálózat nélkül

Offline beolvasott kód egy „Kapcsolatra vár” listába kerül, és nem vész el az app bezárásakor sem.

- Amikor visszatér a kapcsolat, az app sorban lefuttatja a keresést. A munkamenet-listában a kód ekkor
  megkapja az állapotát.
- Offline a kézi kódbevitel is a függő listába ír.

**Felület:** mobil

## Nem része

- Polc-szkennelés (több gerinc egy fotóról) a mobilon. A weben megvan (`/shelf-scan`), a mobilra később jöhet.
- Piaci ár mutatása az eredménylapon. Az értékbecslés külön feature lesz.
- Matrix- vagy runout-kód felismerése.
- A vonalkód tárolása a release-en (`barcodes` mező), amitől a „megvan” helyben és offline is eldőlne.
  Ez külön ticket, a Discogs-azonosítók visszatöltésével együtt.
