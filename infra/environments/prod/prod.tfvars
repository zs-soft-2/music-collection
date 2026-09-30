# Non-secret per-environment values for "prod". Commit this file.
#
# A prod a MEGLÉVŐ `music-collection-4e074` projekt (az azonosító nem nevezhető át). Az első
# apply előtt a meglévő erőforrásokat `zs cloud import --env prod`-dal state alá kell venni,
# különben a tofu újra létre akarná hozni őket.
env           = "prod"
project_id    = "music-collection-4e074"
region        = "europe-west1"
is_production = true
# A projekt alapértelmezett hosting site-ja (`music-collection-4e074`) a Firebase-szel együtt
# jött létre — a Hosting API `DEFAULT_SITE`-nak mutatja —, tofu-ból tehát nem teremthető: egy
# `google_firebase_hosting_site` rá 409-cel esik el. A deploy az `app` targeten (.firebaserc) éri el.
hosting_sites       = []
build_configuration = "production"
reviewer_users      = ["zsagia"]
firestore_location  = "eur3"
# App Check: a reCAPTCHA kulcs csak az éles hosting domainekről ad tokent.
app_check_domains = [
  "music-collection-4e074.web.app",
  "music-collection-4e074.firebaseapp.com",
]

# App Check enforcement — prodban egyelőre mindkettő csak mér.
#
# A hostingon egy 2025-01-13-i build fut, amiben nincs App Check: a prod site
# key csak a mai `environment.prod.ts`-ben van meg. Az ENFORCED tehát nem a
# scripteket zárná ki elsőként, hanem az élő appot. A sorrend: kideployolni a
# mai buildet, megnézni a konzol App Check lapján, hogy a forgalom ellenőrzött
# lett-e, és utána ENFORCED-ra váltani a Firestore-t. A Storage-ról ugyanaz a
# megfontolás dönt, ami a dev.tfvars-ban áll.
app_check_services = {
  "firestore.googleapis.com"       = "UNENFORCED"
  "firebasestorage.googleapis.com" = "UNENFORCED"
}
