# Kölcsönadás

**Azonosító-előtag:** LOAN
**Technikai:** [kölcsönadás architektúra](../technikai/architektura/kolcsonadas.md)
**UX:** [mobil kölcsönadás](../ux/mobil/kolcsonadas.md)

## Felhasználói leírás

Kölcsönadtad a lemezt egy barátodnak, és fél év múlva már nem emlékszel, kinél van. A kölcsönadást egy
mozdulattal rögzíted: kinek, mikor, meddig. Az app egy listán mutatja, mi van kint, és szól, ha egy határidő
lejárt.

## Követelmények

### REQ-LOAN-001: Kölcsönadás rögzítése

A lemez részletei képernyőn a felhasználó egy példányt kölcsönadottnak jelöl. Megadja:

- kinek adta (név, legfeljebb 80 karakter),
- mikor; az alapérték a mai nap,
- opcionálisan a határidőt,
- és egy megjegyzést (legfeljebb 200 karakter).

Az app felajánlja a korábban megadott neveket.

**Felület:** mobil
**UX:** [Kölcsönadás lap](../ux/mobil/kolcsonadas.md#kölcsönadás-lap)

### REQ-LOAN-002: Visszakaptam

Egy kölcsönben lévő példánynál a „Visszakaptam” lezárja a kölcsönt. A lezárt kölcsön az előzmények közé
kerül.

**Felület:** mobil

### REQ-LOAN-003: Kölcsönben lévő lemezek

A Profil → „Kölcsönben” lista mutatja az összes kint lévő példányt, a kölcsönadás ideje szerint. A lejárt
határidejűek elöl állnak, kiemelve.

**Felület:** mobil
**UX:** [Kölcsönben lista](../ux/mobil/kolcsonadas.md#kölcsönben-lista)

### REQ-LOAN-004: Jelzés a lemezen

Egy kölcsönben lévő példánynál ez látszik (például „Kölcsönben: Péter, okt. 12. óta”):

- a mobilon a lemez részleteinél és a gyűjtemény-listában,
- a weben a példány lapján és a polcon.

**Felület:** mindkettő

### REQ-LOAN-005: Emlékeztető a határidőn

Ha a határidő lejárt, és a felhasználó ezt engedélyezte, a lejárat napján egyszer push értesítést kap
(REQ-NOTIF-006).

**Felület:** mobil

### REQ-LOAN-006: Előzmények

A lemez részleteinél látszik, kinél járt már a példány (név, mettől meddig), a legutóbbi 20 kölcsönig.

**Felület:** mobil

## Nem része

- Névjegy-választó a telefon címjegyzékéből.
- Kölcsön kérése vagy felajánlása más gyűjtőnek az appon belül.
- Kölcsönadás rögzítése a weben. A web csak mutatja.
