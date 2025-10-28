# Plan de Refonte de l'Architecture des Profils Utilisateurs

## 🎯 Objectif
Simplifier l'architecture pour avoir **2 profils distincts** avec des accès clairement définis :
1. **Administrateurs** (propriétaire + invités administrateurs)
2. **Locataires** (accès très restreint à leurs propres données uniquement)

---

## 📋 PLAN DE MIGRATION

### PHASE 1 : Nettoyage de la Base de Données

#### 1.1 Supprimer la table `proprietaires` (devenue redondante)
- Migrer toutes les relations `proprietaire_id` vers `utilisateur_id`
- Tables concernées : `biens`, `administrateurs_proprietaire`

#### 1.2 Conserver uniquement la table `utilisateurs`
Avec la structure :
```sql
utilisateurs
├── id (UUID)
├── email (unique)
├── nom
├── mot_de_passe_hash
├── role ('proprietaire' | 'administrateur' | 'locataire')
├── date_creation
├── dernier_login
└── actif
```

#### 1.3 Adapter les tables de relation
- `biens` : `proprietaire_id` → `utilisateur_id` (référence l'utilisateur créateur)
- `administrateurs_proprietaire` : garde `proprietaire_id` et `utilisateur_id` mais pointe vers `utilisateurs`
- `contrats` : garde `locataire_user_id` (référence vers utilisateur locataire)

---

### PHASE 2 : Règles d'Accès par Profil

#### 👨‍💼 PROFIL ADMINISTRATEUR (proprietaire + administrateur)

**Accès COMPLET à :**
- ✅ Tous les biens (créés par eux OU partagés via `administrateurs_proprietaire`)
- ✅ Tous les contrats de ces biens
- ✅ Toutes les quittances de ces biens
- ✅ Tous les états des lieux de ces biens
- ✅ Toutes les photos de ces biens
- ✅ Gestion des utilisateurs (inviter des admins ou locataires)
- ✅ Paramètres du bailleur

**Distinction :**
- `role = 'proprietaire'` : Celui qui crée son compte (propriétaire principal)
- `role = 'administrateur'` : Ceux invités par un propriétaire (administrateurs secondaires)

**Fonctionnalité :**
- Les deux ont les mêmes droits sur les biens partagés
- Seul le propriétaire peut révoquer un administrateur

---

#### 🏠 PROFIL LOCATAIRE

**Accès TRÈS RESTREINT - Uniquement :**

1. **Son contrat actif uniquement**
   - Via `contrats.locataire_user_id = utilisateur.id`
   - Peut voir : dates, loyer, bien associé
   - **NE PEUT PAS** : modifier, supprimer, voir les autres contrats

2. **Ses quittances uniquement**
   - Via `quittances.contrat_id = son_contrat.id`
   - Peut : voir, télécharger en PDF
   - **NE PEUT PAS** : modifier, supprimer

3. **Ses états des lieux uniquement**
   - Via `etats_des_lieux.contrat_id = son_contrat.id`
   - Peut : consulter
   - **NE PEUT PAS** : modifier, créer, supprimer

4. **Photos du bien qu'il loue**
   - Via `photos.bien_id = son_contrat.bien_id`
   - Peut : consulter uniquement
   - **NE PEUT PAS** : ajouter, modifier, supprimer

5. **Informations du bien qu'il loue**
   - Adresse, nom du bien uniquement
   - **NE PEUT PAS** : voir les autres biens, voir les infos du propriétaire

**Interface dédiée :**
- Page d'accueil : "Mon Bail" (tableau de bord simplifié)
- Sections : Mon Contrat | Mes Quittances | État des Lieux | Photos du Logement
- **AUCUN accès** aux fonctions de gestion (créer, modifier, supprimer)

---

### PHASE 3 : Modifications Techniques

#### 3.1 Base de Données

**Script SQL à créer : `migration_unifie_utilisateurs.sql`**

```sql
-- 1. Migrer les données de proprietaires vers utilisateurs
-- 2. Mettre à jour biens.proprietaire_id → biens.utilisateur_id
-- 3. Supprimer la table proprietaires
-- 4. Créer des politiques RLS (Row Level Security) strictes
```

#### 3.2 Backend (API)

**Fichiers à modifier :**
1. `api/auth.js`
   - Supprimer la création dans `proprietaires`
   - Gérer l'invitation locataire (création avec role='locataire')

2. `api/biens.js`
   - Vérifier que l'utilisateur a accès via `get_biens_accessibles()`
   - Les locataires ne doivent PAS pouvoir lister les biens

3. `api/contrats.js`
   - Ajouter un endpoint GET `/api/locataire/mon-contrat`
   - Filtrer strictement par `locataire_user_id`

4. `api/quittances.js`
   - Endpoint GET `/api/locataire/mes-quittances`
   - Filtrer par contrat du locataire uniquement

5. **NOUVEAU** : `api/middleware/auth.js`
   - Middleware pour vérifier le rôle de l'utilisateur
   - Bloquer les locataires des routes admin

#### 3.3 Frontend

**Fichiers à modifier :**
1. `public/app.js`
   - Détecter le rôle de l'utilisateur après login
   - Rediriger vers l'interface appropriée

2. **NOUVEAU** : `public/locataire.html` (interface locataire)
   - Interface simplifiée et épurée
   - Uniquement consultation

3. **NOUVEAU** : `public/locataire.js`
   - Logique spécifique locataire
   - Appels API vers les endpoints locataire

4. `public/sidebar.js`
   - Cacher les menus admin pour les locataires
   - Afficher un menu locataire simplifié

---

### PHASE 4 : Sécurité (Row Level Security)

**Politiques RLS à implémenter dans Supabase :**

```sql
-- Biens : accessible par propriétaire + administrateurs
-- Contrats : accessible par propriétaire + admin du bien + locataire concerné
-- Quittances : accessible par propriétaire + admin + locataire du contrat
-- Etats des lieux : accessible par propriétaire + admin + locataire du contrat
-- Photos : accessible par propriétaire + admin + locataire du bien
```

---

## 🔄 ORDRE D'EXÉCUTION

1. ✅ **Valider ce plan avec vous**
2. 🔧 **Créer le script SQL de migration**
3. 🗄️ **Exécuter la migration sur Supabase** (backup avant!)
4. 💻 **Adapter le backend** (API + middleware)
5. 🎨 **Créer l'interface locataire**
6. 🔐 **Implémenter les politiques RLS**
7. ✅ **Tests complets** (admin + locataire)

---

## ⚠️ POINTS D'ATTENTION

1. **Migration des données existantes**
   - Les utilisateurs actuels ont des biens liés à `proprietaires`
   - Il faudra migrer ces liens vers `utilisateurs`

2. **Compatibilité temporaire**
   - Garder une période de transition si nécessaire

3. **Invitations locataires**
   - Le système d'invitation existe déjà
   - Il faut juste s'assurer qu'il crée bien un utilisateur avec `role='locataire'`

4. **Interface locataire**
   - Créer une expérience utilisateur différente, très simple
   - Pas de confusion possible avec l'interface admin

---

## ❓ QUESTIONS POUR VOUS

1. **Migration** : Avez-vous des données de production actuellement ou on peut tout nettoyer ?

2. **Administrateurs secondaires** : Doivent-ils pouvoir inviter d'autres administrateurs ou seulement le propriétaire principal ?

3. **Locataires** : Doivent-ils pouvoir contacter le propriétaire depuis l'interface ?

4. **Design** : Voulez-vous une interface locataire avec un design différent (couleurs, logo) ou juste simplifiée ?

5. **Notifications** : Les locataires doivent-ils recevoir des emails (nouvelles quittances, etc.) ?

---

**Êtes-vous d'accord avec ce plan ? Des modifications à apporter avant de commencer ?**
