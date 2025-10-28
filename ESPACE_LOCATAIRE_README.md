# 🏠 Espace Locataire - Guide d'installation et d'utilisation

## 📋 Vue d'ensemble

Ce système permet aux propriétaires d'inviter leurs locataires à accéder à un espace personnel où ils peuvent consulter :
- ✅ Leur contrat de location
- ✅ Leurs quittances de loyer
- ✅ L'état des lieux d'entrée
- ✅ Les photos du bien pendant leur période de location

## 🛠️ Installation - Étape par étape

### 1. Migration de la base de données Supabase

**IMPORTANT** : Cette étape est OBLIGATOIRE avant toute utilisation

1. Ouvrez votre projet Supabase : https://supabase.com/dashboard
2. Allez dans le menu **SQL Editor**
3. Créez une nouvelle query
4. Copiez-collez le contenu du fichier `database/06_locataires_invitations.sql`
5. Cliquez sur **Run** pour exécuter la migration

**Vérifications après migration :**
```sql
-- Vérifier que la colonne role existe
SELECT role FROM utilisateurs LIMIT 1;

-- Vérifier que la table invitations_locataires existe
SELECT * FROM invitations_locataires LIMIT 1;

-- Vérifier que la colonne locataire_user_id existe dans contrats
SELECT locataire_user_id FROM contrats LIMIT 1;

-- Vérifier que la colonne contrat_id existe dans etats_des_lieux
SELECT contrat_id FROM etats_des_lieux LIMIT 1;
```

### 2. Mise à jour des variables d'environnement

Ajoutez cette variable dans votre fichier `.env` :

```env
APP_URL=http://localhost:3000
```

En production, remplacez par votre URL réelle (ex: `https://monapp.com`)

### 3. Redémarrer le serveur

```bash
# Arrêtez le serveur actuel (Ctrl+C)
# Puis redémarrez
npm start
```

## 🚀 Utilisation

### Flux complet d'invitation d'un locataire

#### Étape 1 : Créer un contrat avec email locataire

Lors de la création d'un contrat, assurez-vous de renseigner l'email du locataire dans le champ `locataire_email`.

#### Étape 2 : Envoyer l'invitation

**Via l'interface (à implémenter)** :
- Ouvrir le contrat
- Cliquer sur le bouton "Inviter le locataire"

**Via API directement** (pour test) :
```bash
POST /api/contrats/:contratId/invite-locataire
Headers:
  Authorization: Bearer <votre_token>
  Content-Type: application/json
```

**Réponse** :
```json
{
  "success": true,
  "message": "Invitation créée avec succès",
  "invitation": {
    "id": "uuid",
    "email": "locataire@example.com",
    "expires_at": "2025-11-01T...",
    "invitation_link": "http://localhost:3000/invitation?token=abc123..."
  }
}
```

> **Note** : Pour l'instant, le lien d'invitation est retourné dans la réponse API. En production, il sera envoyé par email uniquement.

#### Étape 3 : Le locataire accepte l'invitation

Le locataire clique sur le lien et arrive sur la page `/invitation?token=xxx`

**Page à implémenter** qui doit :
1. Vérifier le token : `GET /api/invitations/:token`
2. Afficher un formulaire avec :
   - Email (pré-rempli et disabled)
   - Mot de passe (minimum 8 caractères)
   - Confirmer mot de passe
3. Soumettre : `POST /api/invitations/:token/accept`

**Exemple de requête d'acceptation** :
```bash
POST /api/invitations/abc123.../accept
Content-Type: application/json

{
  "password": "motdepasse123"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Compte créé avec succès",
  "user": {
    "id": "uuid",
    "email": "locataire@example.com",
    "role": "locataire"
  }
}
```

#### Étape 4 : Le locataire se connecte

Le locataire peut maintenant se connecter avec son email et mot de passe via la page de login normale.

**Important** : Après login, vérifier le `role` retourné pour rediriger vers :
- `role === 'locataire'` → Espace locataire
- `role === 'proprietaire' | 'administrateur'` → Dashboard propriétaire

## 📡 Routes API disponibles

### Routes d'invitation

| Méthode | Route | Description | Rôle requis |
|---------|-------|-------------|-------------|
| POST | `/api/contrats/:contratId/invite-locataire` | Envoyer une invitation | Propriétaire/Admin |
| GET | `/api/invitations/:token` | Vérifier validité du token | Public |
| POST | `/api/invitations/:token/accept` | Accepter invitation et créer compte | Public |

### Routes espace locataire

| Méthode | Route | Description | Rôle requis |
|---------|-------|-------------|-------------|
| GET | `/api/locataire/dashboard` | Dashboard complet | Locataire |
| GET | `/api/locataire/contrat` | Détails du contrat | Locataire |
| GET | `/api/locataire/quittances` | Liste des quittances | Locataire |
| GET | `/api/locataire/quittances/:id` | Détail d'une quittance | Locataire |
| GET | `/api/locataire/etat-des-lieux` | État des lieux d'entrée | Locataire |
| GET | `/api/locataire/photos` | Photos du bien (période contrat) | Locataire |
| GET | `/api/locataire/bien` | Informations du bien | Locataire |

## 🔒 Sécurité

### Permissions par rôle

**Locataire peut voir** :
- ✅ Son contrat actif uniquement
- ✅ Ses quittances uniquement
- ✅ L'EDL d'entrée de son contrat
- ✅ Les photos prises pendant son contrat
- ❌ AUCUN autre bien
- ❌ AUCUN autre contrat
- ❌ Informations du bailleur
- ❌ Dashboard propriétaire

**Propriétaire/Admin peut voir** :
- ✅ TOUS les biens
- ✅ TOUS les contrats
- ✅ TOUTES les quittances
- ✅ TOUS les états des lieux
- ✅ TOUTES les photos
- ✅ Informations bailleur
- ✅ Dashboard complet

### Filtrage côté serveur

Chaque route locataire vérifie :
1. Que l'utilisateur est connecté (`req.user`)
2. Que son rôle est `'locataire'`
3. Que le contrat lui appartient (`contrats.locataire_user_id === userId`)
4. Que les données demandées sont liées à son contrat

## 🧪 Tests manuels

### 1. Tester l'invitation

```bash
# 1. Créer un contrat avec un email locataire
# 2. Récupérer l'ID du contrat
# 3. Envoyer l'invitation
curl -X POST http://localhost:3000/api/contrats/[CONTRAT_ID]/invite-locataire \
  -H "Authorization: Bearer [VOTRE_TOKEN]" \
  -H "Content-Type: application/json"

# 4. Noter le token retourné dans la réponse
```

### 2. Tester la vérification du token

```bash
curl http://localhost:3000/api/invitations/[TOKEN]
```

### 3. Tester l'acceptation

```bash
curl -X POST http://localhost:3000/api/invitations/[TOKEN]/accept \
  -H "Content-Type: application/json" \
  -d '{"password":"test1234"}'
```

### 4. Tester la connexion locataire

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"locataire@example.com","password":"test1234"}'
```

### 5. Tester l'espace locataire

```bash
# Dashboard
curl http://localhost:3000/api/locataire/dashboard \
  -H "Authorization: Bearer [TOKEN_LOCATAIRE]"

# Quittances
curl http://localhost:3000/api/locataire/quittances \
  -H "Authorization: Bearer [TOKEN_LOCATAIRE]"
```

## 📝 TODO - Frontend à implémenter

### Pages à créer

1. **Page `/invitation` (public)**
   - Vérifier le token
   - Afficher formulaire inscription
   - Gérer les erreurs (token expiré, invalide, déjà utilisé)

2. **Espace locataire** (authentifié, role='locataire')
   - Sidebar spécifique locataire
   - Dashboard locataire
   - Page "Mon contrat"
   - Page "Mes quittances"
   - Page "État des lieux"
   - Page "Mon compte"

3. **Modifications interface propriétaire**
   - Bouton "Inviter le locataire" dans les contrats
   - Indicateur visuel si locataire invité/inscrit
   - Redirection selon le rôle après login

### Composants à modifier

- `public/auth.js` : Ajouter gestion du rôle après login
- `public/sidebar.js` : Créer sidebar locataire
- `public/app.js` : Ajouter routage selon rôle

## 🔄 Prochaines améliorations

1. **Service d'envoi d'email** (Resend, SendGrid, Brevo)
2. **Templates d'emails** personnalisés
3. **Rappels automatiques** pour invitations non acceptées
4. **Révoquer une invitation**
5. **Réinitialisation mot de passe** pour locataires
6. **Notifications** (nouveau contrat, nouvelle quittance)

## ❓ FAQ

**Q : Que se passe-t-il si j'invite un locataire qui a déjà un compte ?**
R : L'acceptation de l'invitation échouera avec une erreur. Le locataire devra se connecter avec son compte existant.

**Q : Un locataire peut-il voir les contrats précédents ?**
R : Non, il ne voit que son contrat actif (statut='actif' et locataire_user_id = son ID).

**Q : Les invitations expirent quand ?**
R : 7 jours après création. Vous pouvez renvoyer une nouvelle invitation.

**Q : Comment supprimer l'accès d'un locataire ?**
R : Il faut mettre le contrat en statut 'termine' ou supprimer la liaison `locataire_user_id` dans la base.

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez que la migration SQL est bien exécutée
2. Vérifiez les logs du serveur Node.js
3. Vérifiez les logs Supabase (SQL Editor > Logs)
4. Vérifiez que l'authentification fonctionne (token valide)
