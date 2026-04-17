# 🚀 Yumi Security Template — React 19 Elite (Tauri v2)

Bienvenue dans le standard de développement **Yumi Hub**. Ce template est une fondation robuste, sécurisée et esthétiquement premium pour créer des applications Desktop (Windows/macOS) et Mobiles (Android/iOS) avec une protection de licence intégrée.

---

## ⚡️ Démarrage Rapide (5 Minutes)

Pour initialiser votre nouveau projet, suivez ces étapes simples :

### 1. Remplacement des Placeholders
Utilisez `Ctrl+Shift+H` dans votre IDE pour remplacer les tags suivants par vos valeurs :

| Tag | Utilité | Exemple |
|:--- |:--- |:--- |
| `{{PROJECT_NAME}}` | Nom public de l'app | `Pharma Pro` |
| `{{project_name}}` | ID technique (slug) | `pharma-pro` |
| `{{DB_NAME}}` | Nom de la base SQLite | `pharma.db` |
| `{{YUMI_PROJECT_ID}}` | ID du projet sur le Hub | `xxxxxxxx-...` |
| `{{ACCENT_COLOR}}` | Couleur principale Hex | `#2563EB` |

### 2. Configuration & Installation
```bash
# 1. Préparer l'environnement
cp .env.example .env

# 2. Installer les dépendances
npm install

# 3. Lancer en mode développement (Desktop)
npm run tauri dev
```

---

## 🛠️ Ce qui est inclus (Elite Suite)

Ce template ne se contente pas de l'UI; il embarque une infrastructure de production complète :

- 🛡️ **LicenseGuard Modular** : Système de verrouillage HWID + Ed25519 (Signature cryptographique) avec **Kill-Switch** (réinitialisation distante).
- 📡 **Cloud Sync Ready** : Architecture déconnectée-d'abord (Offline-first) avec synchronisation périodique vers le Hub.
- 🗄️ **Smart Storage** : SQLite natif avec gestion des sauvegardes automatiques.
- 🎨 **Premium Branding** : Couleurs dynamiques et support Multi-Fonts (Serif/Sans) pour une intégration parfaite au projet.
- 🤖 **AI-Ready** : Structure optimisée pour le travail assisté par IA (Agentic Coding compatible).

---

## 📂 Documentation Centralisée

Pour aller plus loin, consultez les guides spécialisés à la racine :

- 📘 **[DEVELOPER.md](./DEVELOPER.md)** : Architecture technique, Sécurité, Roadmap stratégique et Instructions IA.
- 📙 **[CLIENT.md](./CLIENT.md)** : Guide d'installation et de support pour vos utilisateurs finaux.

---
*Propriété de Yumi Hub — Dédié aux développeurs Elite.*
