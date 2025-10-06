import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataPath = join(__dirname, '../data.json');

async function loadData() {
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
}

async function saveData(data) {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
}

// Créer un bien
export async function creerBien(req, res) {
    try {
        const { proprietaireId, nom, adresse } = req.body;

        if (!proprietaireId || !nom) {
            return res.status(400).json({ error: 'ID propriétaire et nom du bien requis' });
        }

        const data = await loadData();

        if (!data.proprietaires.find(p => p.id === proprietaireId)) {
            return res.status(404).json({ error: 'Propriétaire non trouvé' });
        }

        const bien = {
            id: Date.now().toString(),
            proprietaireId,
            nom,
            adresse: adresse || '',
            creeLe: new Date().toISOString(),
            objets: []
        };

        data.biens.push(bien);
        await saveData(data);

        res.json({ bien });
    } catch (error) {
        console.error('Erreur lors de la création du bien:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Obtenir tous les biens d'un propriétaire
export async function obtenirBiens(req, res) {
    try {
        const { proprietaireId } = req.query;

        if (!proprietaireId) {
            return res.status(400).json({ error: 'ID propriétaire requis' });
        }

        const data = await loadData();
        const biens = data.biens.filter(b => b.proprietaireId === proprietaireId);

        res.json({ biens });
    } catch (error) {
        console.error('Erreur lors de la récupération des biens:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Obtenir un bien spécifique
export async function obtenirBien(req, res) {
    try {
        const { id } = req.params;

        const data = await loadData();
        const bien = data.biens.find(b => b.id === id);

        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        res.json({ bien });
    } catch (error) {
        console.error('Erreur lors de la récupération du bien:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Supprimer un bien
export async function supprimerBien(req, res) {
    try {
        const { id } = req.params;

        const data = await loadData();
        const index = data.biens.findIndex(b => b.id === id);

        if (index === -1) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        data.biens.splice(index, 1);
        await saveData(data);

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la suppression du bien:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Ajouter un objet à un bien
export async function ajouterObjet(req, res) {
    try {
        const { bienId, nom, description } = req.body;

        if (!bienId || !nom) {
            return res.status(400).json({ error: 'ID bien et nom de l\'objet requis' });
        }

        const data = await loadData();
        const bien = data.biens.find(b => b.id === bienId);

        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        const objet = {
            id: Date.now().toString(),
            nom,
            description: description || '',
            entree: false,
            sortie: false,
            note: 0,
            commentaires: ''
        };

        bien.objets.push(objet);
        await saveData(data);

        res.json({ objet });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'objet:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Supprimer un objet
export async function supprimerObjet(req, res) {
    try {
        const { bienId, objetId } = req.params;

        const data = await loadData();
        const bien = data.biens.find(b => b.id === bienId);

        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        const index = bien.objets.findIndex(o => o.id === objetId);

        if (index === -1) {
            return res.status(404).json({ error: 'Objet non trouvé' });
        }

        bien.objets.splice(index, 1);
        await saveData(data);

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'objet:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Mettre à jour l'état d'un objet
export async function mettreAJourObjet(req, res) {
    try {
        const { bienId, objetId, entree, sortie, note, commentaires } = req.body;

        if (!bienId || !objetId) {
            return res.status(400).json({ error: 'ID bien et ID objet requis' });
        }

        const data = await loadData();
        const bien = data.biens.find(b => b.id === bienId);

        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        const objet = bien.objets.find(o => o.id === objetId);

        if (!objet) {
            return res.status(404).json({ error: 'Objet non trouvé' });
        }

        if (entree !== undefined) objet.entree = entree;
        if (sortie !== undefined) objet.sortie = sortie;
        if (note !== undefined) objet.note = note;
        if (commentaires !== undefined) objet.commentaires = commentaires;

        await saveData(data);
        res.json({ objet });
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
