# Configuration Supabase

Ce guide vous aidera à configurer Supabase comme base de données pour votre application de gestion d'états des lieux.

## Étapes de configuration

### 1. Créer un projet Supabase

1. Rendez-vous sur [supabase.com](https://supabase.com)
2. Créez un compte ou connectez-vous
3. Cliquez sur "New Project"
4. Remplissez les informations du projet :
   - Nom du projet
   - Mot de passe de la base de données (conservez-le en lieu sûr)
   - Région (choisissez la plus proche de vos utilisateurs)

### 2. Récupérer les identifiants

1. Une fois le projet créé, allez dans **Settings** > **API**
2. Copiez les valeurs suivantes :
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`

### 3. Configurer les variables d'environnement

1. Créez un fichier `.env` à la racine du projet (s'il n'existe pas déjà)
2. Ajoutez vos identifiants Supabase :

```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_cle_anonyme_ici
```

### 4. Exécuter le schéma SQL

1. Dans votre projet Supabase, allez dans **SQL Editor**
2. Cliquez sur **New query**
3. Copiez le contenu du fichier `schema.sql` de ce projet
4. Collez-le dans l'éditeur et cliquez sur **Run**

Cela créera toutes les tables nécessaires :
- `proprietaires` : Les propriétaires/utilisateurs
- `biens` : Les biens immobiliers
- `sections` : Les sections dans un bien
- `objets` : Les objets/items dans un bien
- `etats_des_lieux` : Les états des lieux (entrée/sortie)
- `objets_etat_des_lieux` : Les objets capturés dans un état des lieux

### 5. Vérifier la configuration

Après avoir exécuté le schéma SQL, vous devriez voir toutes les tables dans l'onglet **Table Editor** de Supabase.

### 6. Migration des données existantes (optionnel)

Si vous avez des données dans le fichier `data.json`, vous devrez les migrer manuellement vers Supabase. Vous pouvez :
- Utiliser l'interface Supabase pour insérer les données
- Créer un script de migration personnalisé
- Repartir avec une base de données vide

## Structure de la base de données

### Relations entre les tables

```
proprietaires
    └── biens
        ├── sections
        ├── objets
        └── etats_des_lieux
            └── objets_etat_des_lieux
```

## Sécurité

Le schéma inclut :
- **Row Level Security (RLS)** activé sur toutes les tables
- Des politiques de sécurité de base (à adapter selon vos besoins)
- Des index pour optimiser les performances

⚠️ **Important** : Les politiques RLS actuelles sont configurées en mode permissif pour le développement. Vous devrez les adapter pour la production en fonction de votre système d'authentification.

## Prochaines étapes

Actuellement, l'application utilise toujours le fichier `data.json` pour le stockage. Pour migrer vers Supabase, vous devrez :

1. Mettre à jour les fichiers API (`api/auth.js` et `api/biens.js`)
2. Remplacer les appels à `loadData()` et `saveData()` par des requêtes Supabase
3. Utiliser le client Supabase défini dans `lib/supabase.js`

Exemple de requête Supabase :
```javascript
import { supabase } from '../lib/supabase.js';

// Lire des données
const { data, error } = await supabase
    .from('biens')
    .select('*')
    .eq('proprietaire_id', proprietaireId);

// Insérer des données
const { data, error } = await supabase
    .from('biens')
    .insert([{ nom: 'Mon bien', proprietaire_id: 'xxx' }]);
```

## Support

Pour plus d'informations sur Supabase :
- [Documentation officielle](https://supabase.com/docs)
- [Guide JavaScript](https://supabase.com/docs/reference/javascript/introduction)
