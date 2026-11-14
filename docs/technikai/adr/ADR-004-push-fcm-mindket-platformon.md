# ADR-004: Push értesítések FCM-en át, mindkét platformon

**Állapot:** javasolt
**Kapcsolódó:** [értesítések](../../felhasznaloi/ertesitesek.md), [értesítések architektúra](../architektura/ertesitesek.md)

## Kontextus

- Az appban nincs push, nincs eszköz-token tárolás, és nincs e-mail küldés.
- Közben több szerveroldali esemény van, amiről a felhasználónak érdemes tudnia:
  - a napi kérdés (`composeDailyQuestionDaily`, 00:05),
  - a hét bandája (`composeBandOfTheWeekDaily`),
  - a közelgő kiadások (`refreshUpcomingReleases`, 03:30),
  - a release-kérés elbírálása (`approveReleaseRequest`, illetve az elutasítás).
- A mobil app a `@capacitor-firebase/authentication` plugint már használja.

## Döntés

- A push **Firebase Cloud Messaging (FCM)** alapon megy iOS-re (APNs-en át) és Androidra is.
- A kliens plugin a `@capacitor-firebase/messaging`: ugyanabból a pluginkészletből jön, mint a bejelentkezés.
  Mindkét platformon FCM-tokent ad, iOS-en is.
- **Eszköz-tokenek:** `user/{uid}/device/{deviceId}` dokumentumok. A tulajdonos írja és olvassa.
  Mezők: `token`, `platform`, `appVersion`, `locale`, `updatedAt`.
- **Küldés csak szerverről**, az Admin SDK `messaging().sendEach…` hívásával. A kliens nem küld értesítést.
  - Elavult tokennél (`messaging/registration-token-not-registered`) a szerver törli a dokumentumot.
- **Beállítások** típusonként: `user/{uid}/setting/notifications`, ugyanabban a setting-mintában, mint a profil
  többi beállítása.
- **iOS-hez APNs kulcs (.p8)** kell, amelyet a Firebase konzolra kell feltölteni (dev és prod projektbe külön).
  Ez kézi lépés, a Terraform nem kezeli. A functions-be nem kerül új secret.

## Következmények

- **Új Firestore útvonal (device) és rules:** a rules teszttel együtt változik (alkotmány: firebase-rules).
- **Új vagy bővített function-ök kellenek.** Ezek deploy nélkül nem működnek (alkotmány: no-live-changes).
  A deployt a maintainer végzi.
- **Webes push** (service worker, VAPID) nem része ennek a döntésnek.

## Alternatívák

- **`@capacitor/push-notifications`:** iOS-en nyers APNs-tokent ad, amihez külön APNs-küldés vagy
  token-konverzió kellene. Elvetve.
- **Harmadik fél (OneSignal és társai):** új szolgáltató, új adatkezelés. Elvetve.
