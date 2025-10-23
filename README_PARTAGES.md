# Système de Partage des Biens - Guide de Configuration

## Vue d'ensemble

Le système de partage permet de collaborer avec d'autres administrateurs sur la gestion des biens immobiliers. Un propriétaire principal peut partager l'accès à ses biens avec d'autres utilisateurs (par exemple, ton frère), qui auront alors accès complet aux mêmes fonctionnalités.

## Configuration de la Base de Données

### Étape 1: Exécuter le Script SQL

1. Connecte-toi à ton tableau de bord Supabase
2. Va dans l'éditeur SQL
3. Copie et exécute le contenu du fichier `database/04_partages_administrateurs.sql`

Ce script crée:
- La table `partages_biens` pour gérer les partages
- Des index pour améliorer les performances
- Une fonction `utilisateur_a_acces_bien()` pour vérifier les permissions

### Étape 2: Associer tes Biens Existants à ton Compte

Après avoir exécuté le script, tu dois associer tous tes biens existants à ton compte utilisateur.

1. Récupère ton ID utilisateur depuis la table `utilisateurs`:
```sql
SELECT id, email FROM utilisateurs WHERE email = 'ton-email@exemple.com';
```

2. Associe tous les biens existants à ton compte:
```sql
UPDATE biens
SET utilisateur_id = 'TON_USER_ID_ICI'
WHERE utilisateur_id IS NULL;
```

(Remplace `TON_USER_ID_ICI` par l'ID récupéré à l'étape 1)

## Fonctionnalités Implémentées

### Backend (APIs)

Toutes les APIs sont dans le fichier `api/partages.js`:

1. **GET `/api/utilisateurs`**
   - Liste tous les utilisateurs du système
   - Utilisé pour l'autocomplete lors du partage

2. **GET `/api/biens-accessibles?userId=xxx`**
   - Récupère tous les biens accessibles par un utilisateur
   - Inclut les biens dont il est propriétaire + les biens partagés avec lui

3. **GET `/api/biens/:bienId/partages`**
   - Liste tous les collaborateurs d'un bien spécifique

4. **POST `/api/biens/:bienId/partages`**
   - Partage un bien avec un autre utilisateur
   - Body: `{ "utilisateurEmail": "email@exemple.com", "role": "administrateur" }`

5. **DELETE `/api/partages/:partageId`**
   - Révoque un partage (le partage est marqué comme inactif)

### Structure des Données

#### Table `partages_biens`
```
- id: UUID
- bien_id: UUID (référence vers biens)
- proprietaire_id: UUID (référence vers proprietaires)
- utilisateur_id: UUID (référence vers utilisateurs)
- role: VARCHAR (administrateur ou locataire)
- date_partage: TIMESTAMP
- actif: BOOLEAN
```

#### Table `biens` (colonne ajoutée)
```
- utilisateur_id: UUID (propriétaire principal du bien)
```

## Frontend - Ce qui Reste à Faire

### 1. Modifier la Page "Mes Biens"

Actuellement, la page affiche les biens via `/api/biens`. Il faut:

1. Récupérer l'ID de l'utilisateur connecté (depuis le localStorage après login)
2. Appeler `/api/biens-accessibles?userId=xxx` au lieu de `/api/biens`
3. Afficher un badge sur les biens partagés (ex: "Partagé par Jean Dupont")

### 2. Ajouter une Section "Collaborateurs" dans la Page d'un Bien

Dans la page de détail d'un bien (`bien-detail-section`), ajouter:

1. Une nouvelle section "Collaborateurs" avec:
   - Liste des collaborateurs actuels (avec bouton "Révoquer")
   - Formulaire pour ajouter un nouveau collaborateur (email + role)

2. Exemple HTML à ajouter:
```html
<div class="collaborateurs-section">
    <h3>👥 Collaborateurs</h3>
    <div class="collaborateurs-list">
        <!-- Liste générée dynamiquement -->
    </div>
    <div class="add-collaborateur">
        <input type="email" id="collaborateur-email" placeholder="Email du collaborateur">
        <button onclick="partagerBien()">Partager</button>
    </div>
</div>
```

### 3. Fonctions JavaScript à Ajouter

```javascript
// Charger les collaborateurs d'un bien
async function loadCollaborateurs(bienId) {
    const response = await fetch(`/api/biens/${bienId}/partages`);
    const data = await response.json();
    // Afficher la liste
}

// Partager un bien
async function partagerBien() {
    const email = document.getElementById('collaborateur-email').value;
    const response = await fetch(`/api/biens/${currentBienId}/partages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utilisateurEmail: email, role: 'administrateur' })
    });
    // Rafraîchir la liste
}

// Révoquer un partage
async function revoquerPartage(partageId) {
    await fetch(`/api/partages/${partageId}`, { method: 'DELETE' });
    // Rafraîchir la liste
}
```

## Vision Future: Accès Locataires

Le système est déjà préparé pour les futurs accès locataires:

- Le champ `role` dans `partages_biens` peut être `'locataire'`
- Quand un locataire est ajouté, il aura accès uniquement à:
  - Ses états des lieux
  - Ses contrats
  - Ses quittances
  - Photos du bien

Pour implémenter cela plus tard, il faudra:
1. Ajouter des vérifications de permissions dans les APIs
2. Créer une interface spéciale pour les locataires
3. Implémenter un système d'invitation par email

## Prochaines Étapes

1. ✅ Base de données configurée
2. ✅ APIs créées et routes ajoutées
3. ⏳ Interface de gestion des collaborateurs à créer
4. ⏳ Mise à jour de la liste des biens pour afficher les biens partagés

Le backend est prêt! Il ne reste plus qu'à créer l'interface utilisateur pour gérer les partages.
