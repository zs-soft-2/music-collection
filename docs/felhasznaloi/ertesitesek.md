# Értesítések

**Azonosító-előtag:** NOTIF
**Technikai:** [értesítések architektúra](../technikai/architektura/ertesitesek.md) · [ADR-004](../technikai/adr/ADR-004-push-fcm-mindket-platformon.md)
**UX:** [mobil értesítések](../ux/mobil/ertesitesek.md)

## Felhasználói leírás

Az app szól, ha valami rád tartozik: jóváhagyták a kérésedet, itt a napi kérdés, megjött a hét bandája,
lejárt egy kölcsön. Hogy mit kérsz, azt típusonként állítod be. Spam nincs: típusonként legfeljebb napi
egy értesítés jön.

## Követelmények

### REQ-NOTIF-001: Engedélykérés a megfelelő pillanatban

Az app nem az első indításkor kér értesítési engedélyt. Akkor kér, amikor annak értelme van:

- az első release-kérés elküldése után („Szóljunk, ha elbírálták?”),
- vagy ha a felhasználó a Profil → Értesítések alatt bekapcsol egy típust.

Megtagadás után az app nem kérdez újra. A beállításoknál egy gomb a rendszerbeállításokhoz vezet.

**Felület:** mobil
**Ticket:** #109
**UX:** [Engedélykérés](../ux/mobil/ertesitesek.md#engedélykérés)

### REQ-NOTIF-002: Beállítások típusonként

A Profil → Értesítések alatt típusonként be- és kikapcsolható:

| Típus | Alapérték |
|---|---|
| A release-kérésem elbírálása | be |
| Napi kérdés emlékeztető | be |
| A hét bandája | be |
| Kölcsön határideje lejárt | be |

A beállítás a fiókhoz tartozik: minden eszközére érvényes.

**Felület:** mobil
**Ticket:** #109
**UX:** [Beállítások](../ux/mobil/ertesitesek.md#beállítások)

### REQ-NOTIF-003: Release-kérés elbírálása

Jóváhagyáskor vagy elutasításkor a kérő értesítést kap. A jóváhagyásé: „Felvettük: <cím> — a
gyűjteményedben van”. Az elutasításé: „A kérésed nem ment át: <cím>”.

**Felület:** mobil
**Ticket:** #109

### REQ-NOTIF-004: Napi kérdés emlékeztető

Ha a felhasználó aznap még nem válaszolt a napi kérdésre, 18:00-kor (Europe/Budapest) emlékeztetőt kap.
Ha már válaszolt, nem kap.

**Felület:** mobil
**Ticket:** #113

### REQ-NOTIF-005: A hét bandája

Amikor elkészül az új hét bandája, a felhasználó értesítést kap a banda nevével.

**Felület:** mobil
**Ticket:** #113

### REQ-NOTIF-006: Kölcsön határideje

Ha egy kölcsönadott lemez határideje lejárt, a tulajdonos a lejárat napján egyszer értesítést kap
(REQ-LOAN-005).

**Felület:** mobil
**Ticket:** #113

### REQ-NOTIF-007: Koppintás a megfelelő helyre

Az értesítésre koppintva az app a hozzá tartozó képernyőn nyílik meg:

- kérés → Kéréseim,
- napi kérdés → a kérdés,
- a hét bandája → a banda,
- kölcsön → a lemez részletei.

**Felület:** mobil
**Ticket:** #109

### REQ-NOTIF-008: Kijelentkezés

Kijelentkezés után az eszköz nem kap több értesítést annak a fióknak a nevében.

**Felület:** mobil
**Ticket:** #109

### REQ-NOTIF-009: A felhasználó nyelvén

Az értesítés szövege a felhasználó beállított nyelvén (magyar vagy angol) érkezik.

**Felület:** mobil
**Ticket:** #109

## Nem része

- Webes push értesítés.
- E-mail értesítés.
- Új kiadás értesítő a gyűjtemény előadóitól. Heti összesítőként („3 új kiadás jön a kedvenceidtől”) jön
  majd, külön ticketben, az első két értesítési ticket után.
- Csendes órák beállítása (az emlékeztető fix 18:00-kor jön).
