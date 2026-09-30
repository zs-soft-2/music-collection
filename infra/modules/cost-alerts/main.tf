# Költség-riasztás egy projektre: mikor tudjuk meg, hogy elszaladt a számla.
#
# Két, egymást kiegészítő riasztás él itt, mert két különböző dolgot vesznek
# észre:
#
#   1. A BUDGET a hónapra eső KÖLTÉST figyeli, dollárban. Lassú: mire egy
#      $10-es keret 50%-ánál tartunk, addigra napok teltek el. Viszont mindent
#      lát — a Firestore-t, a Storage-ot, a functionöket, a Vertex AI-t.
#
#   2. A HASZNÁLATI RIASZTÁS a Firestore dokumentum-olvasásokat figyeli,
#      darabban, gördülő órás ablakban. Gyors: percek alatt szól. Viszont csak
#      ezt az egy metrikát nézi.
#
# Az elsőt a pénz mozgatja, a másodikat a viselkedés. Egy elszabadult script
# 200 ezer olvasása néhány tíz cent — a budgetnek szinte láthatatlan, a
# használati riasztásnak azonnal feltűnik. Fordítva: egy lassan hízó Storage-
# számlát csak a budget vesz észre.
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"

      # A budget a Cloud Billing Budget API-n megy, amit a hívó „quota project"-je
      # számol el. A gyökerek ezért egy külön, `billing_project`-tel felkonfigurált
      # példányt adnak be, hogy a prod apply a PROD projekt API-ját használja, ne
      # azt, ami a fejlesztő gcloud ADC-jében véletlenül be van állítva.
      configuration_aliases = [google.billing]
    }
  }
}

variable "project_id" { type = string }

variable "project_number" {
  type        = string
  description = "A `budget_filter.projects` a projekt SZÁMÁT várja, nem az azonosítóját."
}

variable "billing_account" {
  type        = string
  description = "A számlázási fiók azonosítója (pl. 01F27E-...), prefix nélkül."
}

variable "display_name" {
  type        = string
  description = "A környezet neve a konzolon megjelenő címekben. Legfeljebb 60 karakter (a budget korlátja)."

  validation {
    condition     = length(var.display_name) <= 60
    error_message = "A budget neve legfeljebb 60 karakter lehet."
  }
}

# ── Értesítési csatornák ────────────────────────────────────────────────────
variable "alert_emails" {
  type        = list(string)
  default     = []
  description = <<-EOT
    A riasztások címzettjei. A repó PUBLIKUS, ezért itt az alapértelmezés az
    üres lista, és a címet nem a `<env>.tfvars`-ba írjuk, hanem egy git által
    nem látott `local.auto.tfvars`-ba (vagy a `TF_VAR_alert_emails`-be).

    Ami üresen marad: a BUDGET ettől még küld levelet, a számlázási fiók
    Billing Account Administrator / User szerepköreire. A HASZNÁLATI RIASZTÁS
    viszont nem — annak nincs alapértelmezett címzettje, csak a Cloud Console
    Monitoring → Alerting lapján látszana.
  EOT

  validation {
    condition     = length(var.alert_emails) <= 5
    error_message = "A budget legfeljebb 5 értesítési csatornát fogad el."
  }
}

# ── Budget ──────────────────────────────────────────────────────────────────
variable "budget_amount" {
  type        = number
  description = "A havi keret egész egységben, a számlázási fiók pénznemében (a fiók USD-ben számol). A pénznemet szándékosan nem adjuk meg: a budget a fiókét örökli, így nem tud eltérni tőle."
}

# A küszöbök szándékosan itt élnek, nem a környezeti gyökerekben: a riasztás
# rendje mindkét környezetben ugyanaz, csak a keret nagysága tér el.
#
# A FORECASTED_SPEND az, ami egy tartós megugrást hamarabb elkap. A
# CURRENT_SPEND küszöbei akkor szólalnak meg, amikor a pénz MÁR elment; az
# előrejelzés viszont a hónap eddigi üteméből számol.
variable "budget_thresholds" {
  type = list(object({
    percent = number
    basis   = string
  }))

  default = [
    { percent = 0.5, basis = "CURRENT_SPEND" },
    { percent = 0.9, basis = "CURRENT_SPEND" },
    { percent = 1.0, basis = "CURRENT_SPEND" },
    { percent = 1.0, basis = "FORECASTED_SPEND" },
  ]

  description = "Riasztási küszöbök: `percent` 1.0-alapú arány (0.5 = 50%), `basis` CURRENT_SPEND vagy FORECASTED_SPEND."

  validation {
    condition = alltrue([
      for t in var.budget_thresholds : contains(["CURRENT_SPEND", "FORECASTED_SPEND"], t.basis)
    ])
    error_message = "A küszöb alapja csak CURRENT_SPEND vagy FORECASTED_SPEND lehet."
  }
}

# ── Firestore olvasás-riasztás ──────────────────────────────────────────────
variable "firestore_read_threshold" {
  type        = number
  description = "Hány dokumentum-olvasás fölött szóljon a riasztás egy gördülő órás ablakban. 0 = ne jöjjön létre a riasztás."

  validation {
    condition     = var.firestore_read_threshold >= 0
    error_message = "A küszöb nem lehet negatív; a kikapcsoláshoz add meg 0-t."
  }
}

variable "firestore_read_window" {
  type        = string
  default     = "3600s"
  description = "Az az ablak, amire a Monitoring összegzi az olvasásokat. Gördülő, nem naptári: egy hirtelen csúcs percek alatt átviszi a küszöböt, nem az óra végén."
}

# ── Csatornák ───────────────────────────────────────────────────────────────
# Ugyanaz a csatorna szolgálja ki a budgetet és a használati riasztást — a
# budget a Monitoring csatornáira hivatkozik, nem sajátot tart.
resource "google_monitoring_notification_channel" "alerts" {
  for_each = toset(var.alert_emails)

  project      = var.project_id
  display_name = "${var.display_name} költség-riasztás"
  type         = "email"

  labels = {
    email_address = each.value
  }
}

locals {
  channel_ids = [for c in google_monitoring_notification_channel.alerts : c.id]
}

# A használati riasztásnak — a budgettel ellentétben — NINCS alapértelmezett
# címzettje. Cím nélkül létrejön és működik, de csak a konzolon látszik, levelet
# nem küld. Ez figyelmeztetés, nem hiba: a `check` blokk minden plan/apply
# végén kiírja, amíg nincs cím.
check "van_ertesitesi_csatorna" {
  assert {
    condition     = var.firestore_read_threshold == 0 || length(var.alert_emails) > 0
    error_message = "A Firestore olvasás-riasztás létrejön, de NEM küld levelet: nincs értesítési csatorna. Add meg az `alert_emails` értékét egy git által nem látott `local.auto.tfvars`-ban (a repó publikus, a `<env>.tfvars`-ba nem való cím)."
  }
}

# ── A budget ────────────────────────────────────────────────────────────────
resource "google_billing_budget" "project" {
  provider = google.billing

  billing_account = var.billing_account
  display_name    = var.display_name

  budget_filter {
    projects = ["projects/${var.project_number}"]

    # Naptári hónap: a keret minden hónap elsején nulláról indul. A tervben
    # ez `null`-ként jelenik meg — a provider elnyeli, mert a "MONTH" az
    # alapértelmezés (egy "QUARTER" már látszana), és az API is hónapot ért
    # rajta. Kiírva marad, mert a szándékot ez mondja ki, nem egy hiányzó sor.
    calendar_period = "MONTH"

    # A kreditek (ingyenes keret, promóció) levonódnak a költésből — a riasztás
    # tehát arról szól, amit tényleg fizetünk, nem a listaárról.
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
  }

  amount {
    specified_amount {
      units = tostring(var.budget_amount)
    }
  }

  dynamic "threshold_rules" {
    for_each = var.budget_thresholds

    content {
      threshold_percent = threshold_rules.value.percent
      spend_basis       = threshold_rules.value.basis
    }
  }

  # Csatorna nélkül a blokkot elhagyjuk: úgy marad az alapértelmezés, hogy a
  # fiók számlázási adminjai kapják a levelet. Egy üres `all_updates_rule`
  # ennél nem tenne hozzá semmit, csak zajt a tervbe.
  dynamic "all_updates_rule" {
    for_each = length(local.channel_ids) > 0 ? [1] : []

    content {
      monitoring_notification_channels = local.channel_ids

      # A számlázási adminok ATTÓL MÉG kapjanak levelet, hogy van külön címzett.
      disable_default_iam_recipients = false
    }
  }
}

# ── A használati riasztás ───────────────────────────────────────────────────
# Ez az, ami egy egynapos csúcsot tényleg elkap. A metrika DELTA típusú (egy
# adatpont = az adott percben történt olvasások száma), ezért ALIGN_SUM-mal
# összegezzük az ablakra, és REDUCE_SUM-mal a sorozatokra: a metrikának `type`
# címkéje van (LOOKUP, QUERY, …), külön összegzés nélkül minden fajta olvasás
# önálló sorozat lenne, és egyik sem érné el a küszöböt.
resource "google_monitoring_alert_policy" "firestore_reads" {
  count = var.firestore_read_threshold > 0 ? 1 : 0

  project      = var.project_id
  display_name = "${var.display_name}: sok Firestore-olvasás"
  combiner     = "OR"
  severity     = "WARNING"

  notification_channels = local.channel_ids

  conditions {
    display_name = "Dokumentum-olvasás ${var.firestore_read_window} alatt"

    condition_threshold {
      filter          = "resource.type = \"firestore_instance\" AND metric.type = \"firestore.googleapis.com/document/read_count\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.firestore_read_threshold

      # Ez a lehető leggyorsabb, amit az API enged. A `0s` (szólj az első
      # kiértékelésnél) kézenfekvő volna, de a Monitoring elutasítja, ha a
      # feltétel az adathiányról is rendelkezik: "Conditions setting
      # evaluation_missing_data must have a non-zero duration".
      #
      # A 60s gyakorlatilag nem késleltet: az ablak GÖRDÜLŐ, tehát ha egyszer
      # átlépte a küszöböt, a következő kiértékeléskor is fölötte lesz — egy
      # csúcs után az összeg még kb. egy ablaknyi ideig magasan marad.
      duration = "60s"

      aggregations {
        alignment_period     = var.firestore_read_window
        per_series_aligner   = "ALIGN_SUM"
        cross_series_reducer = "REDUCE_SUM"
      }

      trigger {
        count = 1
      }

      # Ha elfogy az adat, az nem jelent olvasást: a nyitott incidens záruljon,
      # ne maradjon örökre égve egy csendes éjszaka miatt.
      evaluation_missing_data = "EVALUATION_MISSING_DATA_INACTIVE"
    }
  }

  # Az ablak gördülő, tehát egy csúcs után az összeg még kb. egy ablaknyi ideig
  # a küszöb fölött marad. A 30 perc (az API minimuma) azután zárja az
  # incidenst, hogy a metrika már nem érkezik.
  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    mime_type = "text/markdown"
    content   = <<-EOT
      A(z) `${var.project_id}` projektben ${var.firestore_read_window} alatt több mint
      ${var.firestore_read_threshold} Firestore dokumentum-olvasás történt.

      Ez általában a `tools/` alatti katalógus-scriptek valamelyike (egy futás
      nagyságrendileg 25 ezer olvasás, a dry run is), vagy egy kliensoldali
      lekérdezés, ami nem a bundle-ből dolgozik.

      Hol nézd meg: **Cloud Console → Firestore → Usage**, illetve
      **Monitoring → Metrics Explorer**, a
      `firestore.googleapis.com/document/read_count` metrikán, `type` szerint
      bontva.
    EOT
  }
}

output "budget_name" {
  value       = google_billing_budget.project.name
  description = "A költségvetési riasztás erőforrásneve a számlázási fiókon."
}

output "firestore_read_alert_name" {
  value       = one(google_monitoring_alert_policy.firestore_reads[*].name)
  description = "A Firestore olvasás-riasztás erőforrásneve. Üres, ha ki van kapcsolva."
}

output "notification_channel_count" {
  value       = length(local.channel_ids)
  description = "Hány címre megy a riasztás. 0 esetén a használati riasztás csak a konzolon látszik."
}
