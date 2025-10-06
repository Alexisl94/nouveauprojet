import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware pour parser le JSON
app.use(express.json());

// Servir les fichiers statiques du dossier 'public'
app.use(express.static(join(__dirname, 'public')));

// Import des routes API
import { register, login } from './api/auth.js';
import {
    creerBien,
    obtenirBiens,
    obtenirBien,
    supprimerBien,
    ajouterObjet,
    supprimerObjet,
    mettreAJourObjet
} from './api/biens.js';
import { genererPDF } from './api/pdf.js';

// Routes d'authentification
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

// Routes pour les biens
app.post('/api/biens', creerBien);
app.get('/api/biens', obtenirBiens);
app.get('/api/biens/:id', obtenirBien);
app.delete('/api/biens/:id', supprimerBien);

// Routes pour les objets
app.post('/api/biens/:bienId/objets', ajouterObjet);
app.delete('/api/biens/:bienId/objets/:objetId', supprimerObjet);
app.put('/api/biens/:bienId/objets/:objetId', mettreAJourObjet);

// Route pour générer le PDF
app.get('/api/pdf/:bienId', genererPDF);

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📍 Ouvrez votre navigateur à cette adresse pour voir l'application`);
});
