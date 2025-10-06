import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataPath = join(__dirname, '../data.json');

// Charger les données
async function loadData() {
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
}

// Sauvegarder les données
async function saveData(data) {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
}

// Route d'inscription
export async function register(req, res) {
    try {
        const { email, nom, motDePasse } = req.body;

        if (!email || !nom || !motDePasse) {
            return res.status(400).json({ error: 'Tous les champs sont requis' });
        }

        const data = await loadData();

        // Vérifier si l'email existe déjà
        if (data.proprietaires.find(p => p.email === email)) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Créer le nouveau propriétaire
        const proprietaire = {
            id: Date.now().toString(),
            email,
            nom,
            motDePasse, // Note: En production, il faudrait hasher le mot de passe
            creeLe: new Date().toISOString()
        };

        data.proprietaires.push(proprietaire);
        await saveData(data);

        // Ne pas renvoyer le mot de passe
        const { motDePasse: _, ...proprietaireSafe } = proprietaire;
        res.json({ proprietaire: proprietaireSafe });
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Route de connexion
export async function login(req, res) {
    try {
        const { email, motDePasse } = req.body;

        if (!email || !motDePasse) {
            return res.status(400).json({ error: 'Email et mot de passe requis' });
        }

        const data = await loadData();
        const proprietaire = data.proprietaires.find(
            p => p.email === email && p.motDePasse === motDePasse
        );

        if (!proprietaire) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Ne pas renvoyer le mot de passe
        const { motDePasse: _, ...proprietaireSafe } = proprietaire;
        res.json({ proprietaire: proprietaireSafe });
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
