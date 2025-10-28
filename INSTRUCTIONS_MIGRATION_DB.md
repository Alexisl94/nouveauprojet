# Instructions pour la migration de la base de données

## Problème résolu temporairement
Le bouton "Ajouter un bien" ne fonctionnait pas car l'application tentait de charger une table `administrateurs_proprietaire` qui n'existe pas encore dans votre base de données Supabase.

**Correctif temporaire appliqué** : Le code gère maintenant l'erreur silencieusement, permettant à l'application de fonctionner normalement.

## Solution permanente : Exécuter le script SQL dans Supabase

Pour avoir toutes les fonctionnalités (notamment la gestion des utilisateurs), vous devez créer la table manquante dans Supabase :

### Étapes :

1. **Connectez-vous à votre projet Supabase** : https://app.supabase.com

2. **Allez dans le SQL Editor** (dans le menu de gauche)

3. **Créez une nouvelle requête** et collez le contenu du fichier : `database/05_administrateurs_globaux.sql`

4. **Exécutez le script** en cliquant sur "Run"

### Que fait ce script ?

- Crée la table `administrateurs_proprietaire` pour gérer les accès multi-utilisateurs
- Crée une fonction SQL `get_biens_accessibles()` pour récupérer les biens accessibles par un utilisateur
- Ajoute les index nécessaires pour améliorer les performances

### Après l'exécution du script

Une fois le script exécuté, toutes les fonctionnalités de gestion des utilisateurs fonctionneront correctement :
- Ajouter des administrateurs
- Partager l'accès à vos biens avec d'autres utilisateurs
- Gérer les permissions

## Fichiers modifiés

Les fichiers suivants ont été modifiés pour gérer l'erreur temporairement :
- `public/app.js` : Gestion des erreurs pour `loadAdministrateurs()` et `loadAdministrateursSettings()`

Ces modifications n'empêchent pas le bon fonctionnement une fois la table créée.
