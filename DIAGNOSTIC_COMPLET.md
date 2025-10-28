# 🔍 DIAGNOSTIC COMPLET - Analyse de la cohérence

## 🎯 PROBLÈME ACTUEL
Le bouton "+ Nouveau Bien" ne fait rien. Pas de modal, pas d'erreur visible.

---

## 📊 ÉTAT DE LA BASE DE DONNÉES

### Tables actuelles :
1. ✅ `utilisateurs` - Authentification (role: proprietaire/administrateur/locataire)
2. ✅ `comptes` - Nouveau : regroupe biens + membres
3. ✅ `membres_compte` - Nouveau : accès au compte
4. ✅ `biens` - Lié à `compte_id` (plus `utilisateur_id`)
5. ✅ `informations_bailleur` - Lié à `compte_id`

### Migrations effectuées :
- ✅ Suppression table `proprietaires`
- ✅ Suppression table `administrateurs_proprietaire`
- ✅ Migration `biens.utilisateur_id` → `biens.compte_id`

---

## 🔐 POLITIQUES RLS (Row Level Security)

### Actuellement :
```sql
-- PERMISSIVES pour développement
- utilisateurs : INSERT permis, SELECT permis
- comptes : ALL permis
- membres_compte : ALL permis
- biens : ALL permis
```

**État** : ✅ Les politiques ne bloquent PAS la création

---

## 💻 BACKEND (API)

### `/api/auth` - Inscription
```javascript
1. Crée utilisateur (role='proprietaire')
2. Appelle creer_compte_complet(utilisateur.id)
3. Retourne token JWT
```
**État** : ✅ Devrait créer un compte automatiquement

### `/api/biens` - Création bien
```javascript
1. Vérifie utilisateur existe
2. Récupère compte (WHERE proprietaire_id = userId)
3. Crée bien avec compte_id
```
**État** : ✅ Logique correcte

---

## 🎨 FRONTEND

### Structure HTML (`index.html`)
- ✅ Modal `bien-modal` existe (ligne 214-224)
- ✅ Bouton dans sidebar appelle `onclick="openCreateBienModal()"`
- ✅ Script sidebar.js chargé : `<script src="sidebar.js?v=10"></script>`

### JavaScript (`sidebar.js`)
```javascript
window.openCreateBienModal = function() {
    const modal = document.getElementById('bien-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('bien-nom').value = '';
        document.getElementById('bien-adresse').value = '';
    }
}
```
**État** : ✅ Fonction devrait être globale

### JavaScript (`app.js`)
```javascript
saveBienBtn.addEventListener('click', async () => {
    // Envoie POST /api/biens
    // Avec proprietaireId: currentUser.id
});
```
**État** : ✅ Logique correcte

---

## 🚨 PROBLÈMES IDENTIFIÉS

### 1. **Fonctions onclick non globales**
Le code sidebar.js définit plusieurs fonctions appelées par onclick :
- `openCreateBienModal()` ✅ Globale
- `navigateToBien()` ❌ Pas globale
- `editBien()` ❌ Pas globale
- `duplicateBien()` ❌ Pas globale
- `deleteBien()` ❌ Pas globale
- `ouvrirCreationContrat()` ❌ Pas globale
- `ouvrirCreationQuittance()` ❌ Pas globale
- `ouvrirCreationEtat()` ❌ Pas globale
- `ajouterAdministrateur()` ❌ Pas globale
- ... et autres

**Impact** : Si une SEULE fonction échoue, TOUT le script peut être bloqué

### 2. **Ordre de chargement des scripts**
```html
<script src="sidebar.js?v=10"></script>
<script src="app.js?v=6"></script>
```
Si app.js utilise des fonctions de sidebar.js, il peut y avoir conflit.

### 3. **Cache navigateur persistant**
Version v=10 mais le navigateur peut avoir mis en cache une version corrompue.

### 4. **Erreurs JavaScript non visibles**
Une erreur de syntaxe dans sidebar.js empêcherait TOUT le fichier de se charger.

---

## 🔧 SOLUTIONS À APPLIQUER

### Solution 1 : Rendre TOUTES les fonctions onclick globales
Toutes les fonctions appelées depuis HTML doivent être sur `window.*`

### Solution 2 : Incrémenter version + hard reload
Passer à v=11 et forcer le rechargement

### Solution 3 : Vérifier erreurs console
F12 → Console → Chercher erreurs rouges

### Solution 4 : Simplifier le bouton
Enlever onclick, utiliser addEventListener dans JS

---

## 📝 PLAN D'ACTION IMMÉDIAT

1. **Lire sidebar.js** et identifier TOUTES les fonctions onclick
2. **Rendre toutes ces fonctions globales** avec window.*
3. **Incrémenter version** à v=11
4. **Tester en console** : `typeof window.openCreateBienModal`
5. **Si ça marche toujours pas** : Créer un nouveau fichier simplifié

---

## 🎯 COHÉRENCE GLOBALE

### Backend ↔ Frontend ✅
- Backend attend `proprietaireId`
- Frontend envoie `currentUser.id`
- Backend récupère compte via `proprietaire_id`
- **COHÉRENT**

### Backend ↔ BDD ✅
- API biens utilise `compte_id`
- Table biens a colonne `compte_id`
- Fonction `get_biens_accessibles()` utilise comptes
- **COHÉRENT**

### Frontend ↔ BDD ⚠️
- Frontend ne connaît pas encore la notion de "compte"
- Frontend utilise toujours `proprietaireId` = `userId`
- **FONCTIONNE mais à améliorer**

---

## 🏁 CONCLUSION

**Problème principal** : Les fonctions onclick ne sont pas toutes globales dans sidebar.js

**Solution** : Rendre toutes les fonctions globales OU utiliser un système d'événements

**Priorité** : HAUTE - Bloque l'utilisation de l'app
