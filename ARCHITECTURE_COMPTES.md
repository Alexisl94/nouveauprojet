# Architecture avec Notion de "Compte"

## 🎯 Objectif
Introduire une entité **Compte** qui centralise toute la gestion d'un patrimoine immobilier.

---

## 📊 Nouveau Schéma de Base de Données

### Table `comptes`
```sql
comptes
├── id (UUID, PK)
├── nom (VARCHAR) -- Nom du compte (ex: "Patrimoine Jean Dupont", "SCI Les Chênes")
├── type (VARCHAR) -- 'particulier' | 'professionnel' | 'sci'
├── proprietaire_id (UUID, FK → utilisateurs.id) -- L'utilisateur créateur du compte
├── date_creation (TIMESTAMP)
├── actif (BOOLEAN)
```

### Table `utilisateurs` (inchangée)
```sql
utilisateurs
├── id (UUID, PK)
├── email (VARCHAR UNIQUE)
├── nom (VARCHAR)
├── mot_de_passe_hash (VARCHAR)
├── role (VARCHAR) -- 'proprietaire' | 'administrateur' | 'locataire'
├── date_creation (TIMESTAMP)
```

### Table `membres_compte` (nouvelle - remplace administrateurs_proprietaire)
```sql
membres_compte
├── id (UUID, PK)
├── compte_id (UUID, FK → comptes.id)
├── utilisateur_id (UUID, FK → utilisateurs.id)
├── role_compte (VARCHAR) -- 'admin' | 'gestionnaire' | 'lecteur'
├── date_ajout (TIMESTAMP)
├── actif (BOOLEAN)
```

### Table `informations_bailleur` (liée au compte)
```sql
informations_bailleur
├── id (UUID, PK)
├── compte_id (UUID, FK → comptes.id, UNIQUE) -- Un seul bailleur par compte
├── nom (VARCHAR)
├── prenom (VARCHAR)
├── adresse (VARCHAR)
├── code_postal (VARCHAR)
├── ville (VARCHAR)
├── telephone (VARCHAR)
├── email (VARCHAR)
├── siret (VARCHAR)
├── iban (VARCHAR)
├── date_creation (TIMESTAMP)
├── date_modification (TIMESTAMP)
```

### Tables modifiées

#### `biens` (lié au compte, pas à l'utilisateur)
```sql
biens
├── id (UUID, PK)
├── compte_id (UUID, FK → comptes.id) -- ⬅️ CHANGEMENT
├── nom (VARCHAR)
├── adresse (VARCHAR)
├── date_creation (TIMESTAMP)
```

---

## 🔄 Flow Utilisateur

### 1. **Inscription** (nouveau utilisateur)
```
1. Page inscription : email, nom, mot de passe
   └─> Création utilisateur (role='proprietaire')

2. Redirection vers onboarding
   └─> Création automatique du compte
   └─> Formulaire "Informations Bailleur"

3. Validation onboarding
   └─> Redirection vers dashboard "Mes Biens"
```

### 2. **Connexion** (utilisateur existant)
```
1. Login
   └─> Si utilisateur a un compte complété
       └─> Dashboard
   └─> Si utilisateur n'a pas complété l'onboarding
       └─> Formulaire "Informations Bailleur"
```

### 3. **Invitation Administrateur**
```
1. Admin principal invite un email
   └─> Création invitation

2. Invité clique sur le lien
   └─> Si compte existe : ajout direct au compte
   └─> Si pas de compte : inscription puis ajout au compte
```

---

## 🏗️ Modifications à Apporter

### Base de Données
- ✅ Créer table `comptes`
- ✅ Créer table `membres_compte`
- ✅ Modifier table `biens` : `utilisateur_id` → `compte_id`
- ✅ Lier table `informations_bailleur` au compte
- ✅ Supprimer table `administrateurs_proprietaire` (remplacée par `membres_compte`)

### Backend
- ✅ API inscription : créer utilisateur + compte
- ✅ API onboarding : sauvegarder infos bailleur
- ✅ API biens : utiliser `compte_id` au lieu de `utilisateur_id`
- ✅ API membres : gérer les invitations et accès au compte

### Frontend
- ✅ Page onboarding (formulaire bailleur)
- ✅ Vérifier si onboarding complété au login
- ✅ Adapter dashboard pour afficher le nom du compte

---

## 💡 Avantages de cette Architecture

1. **Séparation claire** : Utilisateur ≠ Compte
2. **Multi-comptes** : Un utilisateur peut gérer plusieurs comptes (futur)
3. **Données centralisées** : Toutes les infos du bailleur au même endroit
4. **Onboarding structuré** : Processus guidé pour les nouveaux utilisateurs
5. **Gestion des membres** : Inviter des gestionnaires au compte

---

## 🎨 Wireframe du Flow

```
┌─────────────────┐
│   INSCRIPTION   │
│  (email, mdp)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   ONBOARDING    │
│  Infos Bailleur │
│  - Nom          │
│  - Adresse      │
│  - IBAN, etc.   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   DASHBOARD     │
│   "Mes Biens"   │
│   du Compte     │
└─────────────────┘
```

---

## ⚠️ Migration des Données Existantes

Si vous avez déjà des utilisateurs et biens :
1. Créer un compte pour chaque utilisateur propriétaire
2. Migrer les biens vers le compte correspondant
3. Migrer les administrateurs vers membres_compte

---

**Prêt à implémenter ?**
