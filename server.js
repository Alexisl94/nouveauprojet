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

// Import de la route API
import handler from './api/anecdote.js';

// Route API pour les anecdotes
app.post('/api/anecdote', (req, res) => {
    handler(req, res);
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📍 Ouvrez votre navigateur à cette adresse pour voir l'application`);
});
