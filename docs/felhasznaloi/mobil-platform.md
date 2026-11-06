# Mobil app: platform

**Azonosító-előtag:** MOB
**Technikai:** [mobil app architektúra](../technikai/architektura/mobil-app.md) · [ADR-001](../technikai/adr/ADR-001-hibrid-mobil-app-capacitorral.md) · [ADR-002](../technikai/adr/ADR-002-mobil-ag-ujraepitese-merge-helyett.md)
**UX:** [navigáció](../ux/mobil/navigacio.md)

## Felhasználói leírás

A music-collection telefonos appja iPhone-ra és Androidra. Ott segít, ahol a gyűjtő a lemezei mellett áll:
a boltban, a börzén vagy otthon a polc előtt.

- **Ugyanaz a fiók, ugyanaz a gyűjtemény.** A felhasználó ugyanazzal a Google-fiókkal lép be, mint a weben,
  és ugyanazt a gyűjteményt és kívánságlistát látja.
- **Térerő nélkül is olvasható.** Egyszeri betöltés után a gyűjtemény és a kívánságlista a pincében és a
  börzecsarnokban is böngészhető.
- **A gyors teendők a mobilon vannak:** szkennelés, felvitel, „feltettem”, kölcsönadás. A nagy munkák
  maradnak a weben: a polc rendezése, az admin, a vizuális élmény.

## Követelmények

### REQ-MOB-001: iOS app a mai kódra építve

Az iOS app a `dev` ág mai kódjára épül. A gyűjtemény, a lemez részletei, a kívánságlista és a profil ugyanúgy
működik, mint a régi `mobile` ágon. Az adatréteget a webbel közösen használja.

**Felület:** mobil
**Technikai:** [a `mobile` ág áthozása](../technikai/architektura/mobil-app.md#a-mobile-ág-áthozása)

### REQ-MOB-002: Android app

Az app Androidon is elérhető, ugyanazokkal a képernyőkkel és funkciókkal, mint iOS-en.

**Felület:** mobil
**Technikai:** [Android](../technikai/architektura/mobil-app.md#android)

### REQ-MOB-003: Bejelentkezés Google-fiókkal

A felhasználó a telefon natív Google-bejelentkezésével lép be iOS-en és Androidon is. A munkamenet az app
újraindítása után is megmarad. A kijelentkezés a natív rétegből is kiléptet.

**Felület:** mobil
**UX:** [Bejelentkezés](../ux/mobil/navigacio.md#bejelentkezés)

### REQ-MOB-004: Offline olvasás

A gyűjtemény, a lemez részletei és a kívánságlista hálózat nélkül is megnyílik abból, amit az app korábban
betöltött.

- Ha egy művelethez hálózat kell (szkennelés, kérés), az app ezt kiírja, és nem akad meg.
- Az offline végzett írás (például „megtaláltam”) a kapcsolat visszatértekor szinkronizálódik.

**Felület:** mobil
**UX:** [Offline sáv](../ux/mobil/navigacio.md#offline-sáv)

### REQ-MOB-005: Magyar és angol felület

A mobil app a web fordításait használja, és a profilban beállított nyelven jelenik meg. Beégetett felületi
szöveg nincs.

**Felület:** mobil

### REQ-MOB-006: Alsó fülsáv

Az app négy fő helyre vezet egy alsó fülsávon:

- Gyűjtemény,
- Kívánságlista,
- Szkennelés,
- Profil.

A szkennelés kiemelt kör-gomb, hogy egy mozdulattal elérhető legyen.

**Felület:** mobil
**UX:** [Fülsáv](../ux/mobil/navigacio.md#fülsáv)

### REQ-MOB-007: Dev és prod változat egymás mellett

A fejlesztői (dev Firebase projekt) és az éles (prod Firebase projekt) változat külön alkalmazás-azonosítóval
fut. Egy telefonra mindkettő telepíthető, és a nevük megkülönbözteti őket („MC Dev”, „Music Collection”).

**Felület:** mobil
**Technikai:** [Változatok](../technikai/architektura/mobil-app.md#változatok-és-azonosítók)

### REQ-MOB-008: Belső tesztelés

A dev változat TestFlighton (iOS) és a Google Play belső tesztelési sávján (Android) kiadható a
tesztelőknek.

**Felület:** mobil

## Nem része

- Nyilvános App Store vagy Google Play kiadás. A prod adat-migráció után jön, külön ticketben. Addig a
  belső tesztelés a dev változattal fut (REQ-MOB-008).
- Tablet-specifikus elrendezés.
- Webes PWA. Ezt a hibrid app kiváltja ([ADR-001](../technikai/adr/ADR-001-hibrid-mobil-app-capacitorral.md)).
