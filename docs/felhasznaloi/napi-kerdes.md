# Napi kérdés a mobilon

**Azonosító-előtag:** DAILY
**Technikai:** [napi kérdés architektúra](../technikai/architektura/napi-kerdes.md)
**UX:** [mobil napi kérdés](../ux/mobil/napi-kerdes.md)

## Felhasználói leírás

Minden nap egy zenei kérdés, egy tipp, pont és sorozat. A weben már megvan. A mobilon reggel a buszon
válaszolsz rá, és ha elfelejtenéd, este szól az app.

## Követelmények

### REQ-DAILY-001: Kártya a Gyűjtemény fülön

Ha a felhasználó aznap még nem válaszolt, a Gyűjtemény fül tetején egy kártya hívja a napi kérdésre. A kártya
aznapra elrejthető.

**Felület:** mobil
**Ticket:** #112
**UX:** [Kártya](../ux/mobil/napi-kerdes.md#kártya)

### REQ-DAILY-002: Válaszadás

A kérdés képernyőjén a felhasználó látja a kérdést és a lehetőségeket. Egyszer tippelhet, és a válaszidő
számít. Tipp után látja, jó volt-e, a helyes választ, a szerzett pontot és a sorozatát.

**Felület:** mobil
**Ticket:** #112
**UX:** [Kérdés](../ux/mobil/napi-kerdes.md#kérdés)

### REQ-DAILY-003: Ranglista

A kérdés képernyőjéről elérhető a ranglista, a felhasználó saját helyével.

**Felület:** mobil
**Ticket:** #112

### REQ-DAILY-004: Emlékeztető

Az emlékeztető push a REQ-NOTIF-004 szerint működik.

**Felület:** mobil
**Ticket:** #113

### REQ-DAILY-005: Ugyanaz a játék

A mobilon adott válasz ugyanaz a válasz, mint a weben. Ha a felhasználó az egyik felületen már tippelt, a
másikon az eredményt látja, és nem tippelhet újra.

**Felület:** mindkettő
**Ticket:** #112

## Nem része

- A napi kérdés adminja a mobilon.
- Offline válaszadás. A tipp szerveroldali ellenőrzést kér, offline az app jelzi, hogy kapcsolat kell.
