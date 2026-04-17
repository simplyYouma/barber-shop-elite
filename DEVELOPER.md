# 📘 Guide Technique & Architecture — {{PROJECT_NAME}}

Ce document détaille les entrailles techniques du projet pour assurer une maintenance et une évolution fluides.

---

## 🏗️ Architecture Sécurité (LicenseGuard)

Le système de sécurité est modulaire et découplé de l'application métier. Il est situé dans `src/components/Guard/LicenseGuard/`.

### 🔧 Installation & Personnalisation (5 min)

1. **Intégration** : Copiez le dossier `src/components/Guard/LicenseGuard` dans votre projet.
2. **Configuration** : Ajoutez ces clés à votre fichier `.env` :
   ```env
   VITE_YUMI_HUB_URL=votre_api_url
   VITE_YUMI_PROJECT_ID=votre_id_projet
   VITE_ACCENT_COLOR="#VOTRE_COULEUR"
   VITE_FONT_SERIF='"Votre Police", serif'
   ```
3. **Usage** : Enveloppez votre application dans le composant `LicenseGuard`.

### ✨ Fonctionnalités Elite incluses
- **Kill-Switch** : Suppression distante immédiate de la licence.
- **Mesh Background** : Fond dynamique teinté selon votre charte.
- **Grace Period** : Avertissement de synchronisation avant blocage.
- **Multi-Fonts** : Support natif des chartes graphiques Premium.

### 1. Circuit de Validation
L'application ne s'affiche que si le `useLicense` (hook central) renvoie `isLicensed: true`. Toute tentative de modification du circuit est protégée par :
- **HWID (Hardware ID)** : Identifiant unique de la carte mère généré en Rust.
- **Signature Ed25519** : Les clés de licence sont signées par le Hub et validées localement sans internet.
- **Anti-Clock Fraud** : Détection des retours en arrière de l'horloge système.

### 2. Synchronisation Hub & Kill-Switch
Toutes les 30 minutes, l'app contacte le Hub Yumi pour :
- **Remote Wipe (Kill-Switch)** : Si la licence est supprimée du Hub, le PC client efface automatiquement sa clé locale et se réinitialise instantanément.
- **Récupération de Clé** : Mise à jour automatique si vous modifiez la licence côté administrateur.
- **Notifications** : Réception de messages broadcastés en temps réel.

### 3. Design Système & Branding
Le Guard s'adapte dynamiquement à l'application hôte via `theme.ts` :
- **Accent Color** : Utilisation de `VITE_ACCENT_COLOR` pour toutes les interactions.
- **Typography** : Support des polices Serif/Sans via `VITE_FONT_SERIF` (ex: Baskervville pour The Tailor).
- **Elite UI** : Mesh background teinté et spinner minimaliste haute fidélité.

---

## 🗺️ Roadmap Stratégique : Cloud & Mobile

Ce projet est conçu pour être **Tauri v2 Native**, ce qui facilite l'expansion :

### 📱 Tablette POS (Android/iOS)
Grâce à Tauri, vous pouvez compiler la même base de code pour tablettes. Le système SQLite local restera prioritaire pour assurer la vitesse de service en restaurant/boutique.

### ☁️ Mode Hybride Cloud
Pour activer l'accès multi-sites :
1. Abstraire la couche de données dans `src/lib/db.ts`.
2. Utiliser une API Gateway vers PostgreSQL/Supabase pour la consultation à distance, tout en gardant SQLite pour la saisie locale rapide.

---

## 🤖 Orientation IA (AI-Skill)

**Instructions pour les agents de codage :**
- **Priorité Sécurité** : Ne jamais contourner le `<LicenseGuard>` dans `App.tsx`.
- **Zustand Discipline** : Privilégier des sélecteurs fins pour éviter les re-renders inutiles.
- **Style CSS** : Utiliser exclusivement les variables définies dans `src/components/Guard/LicenseGuard/theme.ts` pour maintenir la cohérence de marque.

---

## 🔧 Maintenance Day-to-Day
- **Logs** : Les logs de sécurité sont visibles uniquement en mode développement dans la console Tauri.
- **Backups** : Le backend Rust gère une rotation de backups SQLite sur 7 jours dans le dossier `AppData` de l'utilisateur.

---
*Document confidentiel — Réservé à l'équipe technique.*
