# Anecdotes Locales 📍

Une application web simple et épurée pour découvrir des anecdotes locales basées sur une adresse et une catégorie.

## 🛠️ Technologies

- **Frontend** : HTML, CSS, JavaScript Vanilla (pas de framework)
- **Backend** : Node.js avec Express
- **Architecture** : Single Page Application (SPA)

## 📁 Structure du projet

```
nouveauprojet/
├── public/              # Fichiers frontend
│   ├── index.html      # Page principale
│   ├── styles.css      # Styles CSS
│   └── app.js          # Logique JavaScript
├── api/                # Route backend
│   └── anecdote.js     # Endpoint pour générer les anecdotes
├── server.js           # Serveur Express
├── package.json        # Dépendances du projet
└── README.md           # Ce fichier
```

## 🚀 Installation et démarrage

### Étape 1 : Installer les dépendances

```bash
npm install
```

### Étape 2 : Démarrer le serveur

```bash
npm start
```

### Étape 3 : Ouvrir l'application

Ouvrez votre navigateur à l'adresse : **http://localhost:3000**

## 📝 Comment ça marche ?

### Frontend (public/)

1. **index.html** : Structure de la page avec :
   - Un champ pour saisir une adresse
   - 4 boutons de catégories (Aléatoire, Historique, Géographique, Social)
   - Un bouton "Générer une anecdote"
   - Une zone pour afficher le résultat

2. **styles.css** : Design épuré avec :
   - Dégradé de fond violet
   - Interface centrée et responsive
   - Boutons avec animations au survol
   - Messages d'erreur et de chargement

3. **app.js** : Logique JavaScript qui :
   - Gère la sélection des catégories
   - Valide les entrées utilisateur
   - Envoie une requête POST à `/api/anecdote`
   - Affiche l'anecdote reçue ou une erreur

### Backend (api/)

1. **server.js** : Serveur Express qui :
   - Sert les fichiers statiques du dossier `public/`
   - Expose la route POST `/api/anecdote`
   - Écoute sur le port 3000

2. **api/anecdote.js** : Handler qui :
   - Reçoit l'adresse et la catégorie
   - Génère une anecdote (version démo avec des textes aléatoires)
   - Retourne la réponse au format JSON

## 🔄 Flux de données

```
Utilisateur → Saisit adresse + sélectionne catégorie
     ↓
Frontend (app.js) → Validation + Envoi POST /api/anecdote
     ↓
Backend (anecdote.js) → Génère une anecdote
     ↓
Frontend → Affiche l'anecdote
```

## 🎨 Personnalisation

### Améliorer la génération d'anecdotes

Actuellement, `api/anecdote.js` contient des anecdotes de démonstration. Pour aller plus loin :

1. **Géocoder l'adresse** : Utilisez l'API Google Maps ou OpenStreetMap
2. **IA Générative** : Intégrez OpenAI, Claude ou une autre API d'IA
3. **Base de données** : Stockez des anecdotes réelles dans une BDD

### Exemple d'intégration avec une API d'IA

```javascript
// Dans api/anecdote.js
const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model: 'gpt-4',
        messages: [{
            role: 'user',
            content: `Génère une anecdote ${category} sur ${address}`
        }]
    })
});
```

## 📱 Responsive

L'application est entièrement responsive et s'adapte aux mobiles, tablettes et ordinateurs.

## 🐛 Dépannage

- **Erreur de port** : Si le port 3000 est occupé, modifiez `PORT` dans `server.js`
- **Erreur CORS** : L'application doit être servie depuis le même domaine (déjà configuré)
- **Modules non trouvés** : Vérifiez que `npm install` a bien été exécuté

## 📄 License

ISC
