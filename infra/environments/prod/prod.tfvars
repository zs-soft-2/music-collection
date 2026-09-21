# Non-secret per-environment values for "prod". Commit this file.
#
# A prod a MEGLÉVŐ `music-collection-4e074` projekt (az azonosító nem nevezhető át). Az első
# apply előtt a meglévő erőforrásokat `zs cloud import --env prod`-dal state alá kell venni,
# különben a tofu újra létre akarná hozni őket.
env                 = "prod"
project_id          = "music-collection-4e074"
region              = "europe-west1"
is_production       = true
hosting_sites       = ["music-collection-4e074"]
build_configuration = "production"
reviewer_users      = ["zsagia"]
firestore_location  = "eur3"
# App Check: a reCAPTCHA kulcs csak az éles hosting domainekről ad tokent.
app_check_domains = [
  "music-collection-4e074.web.app",
  "music-collection-4e074.firebaseapp.com",
]
