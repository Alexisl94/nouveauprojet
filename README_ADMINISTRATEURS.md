# Système d'Administrateurs Globaux

## Vue d'ensemble

Le système d'administrateurs permet de partager l'accès à **TOUS** les biens d'un propriétaire avec d'autres utilisateurs. Par exemple, si ton frère et toi gérez ensemble tous les appartements, il peut être ajouté comme administrateur et aura accès complet à l'ensemble du patrimoine.

**Différence importante :** Les administrateurs ne sont PAS liés à un bien spécifique, mais au propriétaire. Ainsi, un administrateur a automatiquement accès à tous les biens, présents et futurs.

## Configuration de la Base de Données

### Étape 1: Exécuter le Script SQL de Migration

1. Connecte-toi à ton tableau de bord Supabase
2. Va dans l'éditeur SQL
3. Copie et exécute le contenu du fichier `database/05_administrateurs_globaux.sql`

Ce script va:
- Supprimer l'ancienne table `partages_biens` (partage par bien)
- Supprimer la colonne `utilisateur_id` de la table `biens`
- Créer la nouvelle table `administrateurs_proprietaire` (administrateurs globaux)
- Créer une fonction SQL `get_biens_accessibles()` pour récupérer efficacement tous les biens accessibles par un utilisateur

### Étape 2: Vérifier la Configuration

Vérifie que la table a été créée correctement:
```sql
SELECT * FROM administrateurs_proprietaire;
```

## Architecture du Système

### Structure de la Base de Données

#### Table `administrateurs_proprietaire`
```
- id: UUID (clé primaire)
- proprietaire_id: UUID (référence vers proprietaires)
- utilisateur_id: UUID (référence vers utilisateurs)
- date_ajout: TIMESTAMP
- actif: BOOLEAN
```

**Relation :** Un propriétaire peut avoir plusieurs administrateurs, et un utilisateur peut être administrateur de plusieurs propriétaires.

### Fonction SQL `get_biens_accessibles()`

Cette fonction retourne tous les biens accessibles par un utilisateur:
- Biens dont l'utilisateur est le propriétaire (via correspondance email entre `proprietaires` et `utilisateurs`)
- Biens dont l'utilisateur est administrateur (via `administrateurs_proprietaire`)

## Fonctionnalités

### Backend (APIs)

Toutes les APIs sont dans le fichier `api/administrateurs.js`:

1. **GET `/api/proprietaires/:proprietaireId/administrateurs`**
   - Liste tous les administrateurs d'un propriétaire
   - Retourne: liste des administrateurs avec leurs informations

2. **POST `/api/proprietaires/:proprietaireId/administrateurs`**
   - Ajoute un administrateur à un propriétaire
   - Body: `{ "utilisateurEmail": "email@exemple.com" }`
   - Vérifie que l'utilisateur existe dans la table `utilisateurs`
   - Empêche le propriétaire de s'ajouter lui-même

3. **DELETE `/api/administrateurs/:adminId`**
   - Révoque un administrateur (marqué comme inactif)
   - L'administrateur perd l'accès à tous les biens

4. **GET `/api/biens-accessibles?userId=xxx`**
   - Récupère tous les biens accessibles par un utilisateur
   - Utilise la fonction SQL `get_biens_accessibles()`
   - Retourne les biens avec un flag `est_proprietaire`

### Frontend

#### Bouton Paramètres
Un bouton "Paramètres" est disponible dans la navbar de la page d'accueil, à côté du bouton de déconnexion.

#### Modal de Gestion
Le modal permet de:
- Voir la liste des administrateurs actuels
- Ajouter un nouvel administrateur via son email
- Révoquer l'accès d'un administrateur

#### Affichage des Biens
- Tous les biens sont affichés sans distinction (pas de badge "partagé")
- Un utilisateur voit:
  - Ses propres biens (en tant que propriétaire)
  - Tous les biens des propriétaires dont il est administrateur

## Utilisation

### Ajouter un Administrateur

1. Clique sur le bouton "Paramètres" en haut de la page
2. Entre l'email de l'utilisateur à ajouter
3. Clique sur "Ajouter"

**Important :** L'utilisateur doit avoir un compte dans la table `utilisateurs` (email correspondant).

### Révoquer un Administrateur

1. Ouvre le modal Paramètres
2. Clique sur "Révoquer" à côté de l'administrateur
3. Confirme la révocation

L'utilisateur perd immédiatement l'accès à tous les biens.

## Notes Techniques

### Lien entre `proprietaires` et `utilisateurs`

Le système actuel utilise deux tables séparées:
- `proprietaires`: Pour l'authentification (ancien système)
- `utilisateurs`: Pour les administrateurs (nouveau système)

La fonction `get_biens_accessibles()` fait le lien via l'email:
```sql
-- Biens où l'utilisateur est propriétaire
SELECT b.id FROM biens b
JOIN proprietaires p ON b.proprietaire_id = p.id
JOIN utilisateurs u ON u.email = p.email
WHERE u.id = p_utilisateur_id
```

**TODO futur :** Migrer complètement vers la table `utilisateurs` et ajouter un lien direct.

### Gestion du userId

Actuellement, le frontend utilise un userId hardcodé (`ec55c8f2-c42d-40da-885b-90b1fc691b53`) car le système d'auth utilise encore `proprietaires`.

**TODO futur :** Mettre à jour l'auth pour stocker l'utilisateur_id dans localStorage après login.

## Vision Future: Accès Locataires

Le système est conçu pour être étendu aux locataires dans le futur:
- Même architecture avec un flag `role` dans une nouvelle table `acces_locataires`
- Un locataire aurait accès uniquement à SON bien
- Interface simplifiée pour les locataires (consultation documents seulement)

## Différences avec l'Ancien Système

| Aspect | Ancien Système (partages_biens) | Nouveau Système (administrateurs_proprietaire) |
|--------|--------------------------------|-----------------------------------------------|
| Scope | Par bien | Global (tous les biens) |
| Duplication | Les biens apparaissent en double | Aucune duplication |
| Gestion | Dans chaque bien | Centralisée dans Paramètres |
| Table | `partages_biens` | `administrateurs_proprietaire` |
| Lien | `bien_id` + `utilisateur_id` | `proprietaire_id` + `utilisateur_id` |

## Prochaines Étapes

Le système est complet et fonctionnel! Tu peux maintenant:

1. ✅ Ajouter ton frère comme administrateur
2. ✅ Il verra automatiquement tous tes biens
3. ✅ Il aura accès complet à toutes les fonctionnalités
4. ✅ Aucune duplication de biens

Plus tard, si besoin:
- Intégrer proprement l'auth avec la table `utilisateurs`
- Ajouter des permissions granulaires (lecture seule, etc.)
- Implémenter l'accès locataires
