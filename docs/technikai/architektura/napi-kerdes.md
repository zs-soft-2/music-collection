# Napi kérdés architektúra

**Követelmények:** [REQ-DAILY-*](../../felhasznaloi/napi-kerdes.md)

## Ami ma megvan

**Szerver** (`apps/functions/src/daily-question.functions.ts` és a logikai fájlok: `daily-question-compose.ts`,
`daily-question.ts`, `daily-answer.ts`, `daily-question-leaderboard.ts`, `daily-question-settings.ts`):

- **Ütemezések:**
  - `composeDailyQuestionDaily` (`5 0 * * *`, Europe/Budapest), idempotens;
  - `refreshDailyQuestionLeaderboardDaily` (`40 23 * * *`).
- **Callable:** `answerDailyQuestion`.
  - Bejelentkezés kell hozzá.
  - Kérés: `{ day, optionId, elapsedSec }`. Egy tipp lehetséges.
- **Admin callable-ök:** `composeDailyQuestionNow`, `read/updateDailyQuestionSettings`,
  `refreshDailyQuestionLeaderboardNow`.

**Firestore:**

| Útvonal | Hozzáférés |
|---|---|
| `daily-question/{YYYY-MM-DD}` | bejelentkezett olvas |
| `daily-question/{day}/secret/answer` | senki (kliens) |
| `user/{uid}/daily-answer/{day}` | tulajdonos olvas, szerver ír |
| `user/{uid}/game/daily-question` | pont és sorozat, tulajdonos olvas |
| `leaderboard/daily-question` | bejelentkezett olvas |

**Kliens (web):**

- `page/daily-question/` (lap, store, mapper, modell),
- `data/daily-question/` (repository, effect, konstansok),
- `shared/daily-question/`: banner és emlékeztető. Az elrejtés localStorage-ban él
  (`mc.daily-question.dismissed.{day}`).

## Mobil

```
DailyQuestionPage (mobil) → DailyQuestionPageStore (képernyő)
  → DailyQuestionEffect (libs, /core alias) → DailyQuestionRepository → Firestore + answerDailyQuestion
CollectionPage kártya → DailyQuestionBannerStore (libs) → DailyQuestionEffect
```

1. **Kiemelés libbe:** a `data/daily-question` (repository, effect, konstansok) és a lap mapper/modell
   logikája. A `libs/api/.../daily-question` modell már ott van. A web a kiemelt kódot használja, a
   viselkedése nem változik.
2. **Elrejtés:** a banner elrejtésének kulcsa ugyanaz marad, a Capacitor WebView localStorage-ában. A web és
   a mobil elrejtése nem szinkronizálódik, és ez szándékos: a kártya eszközönkénti kényelmi funkció.
3. **Válaszidő:** az `elapsedSec` a kérdés megjelenésétől a tippig mért idő, a webbel azonos módon.
4. **Útvonal:** a `/tabs/daily-question` (nem fül, hanem a Gyűjtemény fül alól nyíló képernyő). Ez az
   értesítés route-ja is.

## Deploy-igény

- A mobil kliens nem igényel új deployt.
- **Előfeltétel:** a napi kérdés function-jei ki legyenek deployolva a cél-projektre, különben a kérdés
  dokumentuma nem jön létre. A memória szerint a dev-en deploy nélkül a fele nem működik; ezt a ticket
  ellenőrzi.
