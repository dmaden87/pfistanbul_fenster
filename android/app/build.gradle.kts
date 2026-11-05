/*
 * Die Admin-App ist eine "Trusted Web Activity": eine kleine Huelle, die
 * https://pfistanbul.ch/admin in Chrome oeffnet - im Vollbild, ohne
 * Adresszeile, mit eigenem Symbol. Der Adminbereich selbst bleibt die
 * Webseite; neue Funktionen kommen mit dem naechsten Deploy auf Vercel, ohne
 * neues APK.
 *
 * Signiert wird mit dem Schluessel aus den GitHub-Secrets (siehe
 * .github/workflows/admin-apk.yml). Sein Fingerabdruck steht in
 * public/.well-known/assetlinks.json - nur wenn beide zusammenpassen,
 * blendet Chrome die Adresszeile aus.
 */
plugins {
    id("com.android.application")
}

val keystorePfad: String? = System.getenv("PF_KEYSTORE")
val keystorePasswort: String? = System.getenv("PF_KEYSTORE_PASSWORT")

android {
    namespace = "ch.pfistanbul.admin"
    compileSdk = 36

    defaultConfig {
        applicationId = "ch.pfistanbul.admin"
        minSdk = 24
        targetSdk = 35
        versionCode = (System.getenv("PF_VERSION_CODE") ?: "1").toInt()
        versionName = System.getenv("PF_VERSION_NAME") ?: "1.0"

        manifestPlaceholders["hostName"] = "pfistanbul.ch"
        manifestPlaceholders["startUrl"] = "https://pfistanbul.ch/admin"
    }

    signingConfigs {
        if (keystorePfad != null && keystorePasswort != null) {
            create("release") {
                storeFile = file(keystorePfad)
                storePassword = keystorePasswort
                keyAlias = "pfadmin"
                keyPassword = keystorePasswort
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.findByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.7.4")
}
