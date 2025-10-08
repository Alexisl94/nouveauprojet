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
            sections: [],
            objets: [],
            etatsDesLieux: [] // Stocke les états des lieux réalisés
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
        const { bienId, nom, description, sectionId } = req.body;

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
            commentaires: '',
            sectionId: sectionId || null,
            ordre: bien.objets.length
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
        const { bienId, objetId, entree, sortie, note, commentaires, sectionId } = req.body;

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
        if (sectionId !== undefined) objet.sectionId = sectionId;

        await saveData(data);
        res.json({ objet });
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Modifier un bien
export async function modifierBien(req, res) {
    try {
        const { id } = req.params;
        const { nom, adresse } = req.body;

        if (!nom) {
            return res.status(400).json({ error: 'Le nom du bien est requis' });
        }

        const data = await loadData();
        const bien = data.biens.find(b => b.id === id);

        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        bien.nom = nom;
        if (adresse !== undefined) bien.adresse = adresse;

        await saveData(data);
        res.json({ bien });
    } catch (error) {
        console.error('Erreur lors de la modification du bien:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Dupliquer un bien
export async function dupliquerBien(req, res) {
    try {
        const { id } = req.params;

        const data = await loadData();
        const bienOriginal = data.biens.find(b => b.id === id);

        if (!bienOriginal) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        // Créer une copie du bien avec un nouvel ID
        const bienDuplique = {
            id: Date.now().toString(),
            proprietaireId: bienOriginal.proprietaireId,
            nom: `${bienOriginal.nom} (Copie)`,
            adresse: bienOriginal.adresse,
            creeLe: new Date().toISOString(),
            sections: (bienOriginal.sections || []).map(section => ({
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                nom: section.nom,
                ordre: section.ordre
            })),
            objets: bienOriginal.objets.map((objet, index) => ({
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
                nom: objet.nom,
                description: objet.description,
                entree: false,
                sortie: false,
                note: 0,
                commentaires: '',
                sectionId: objet.sectionId || null,
                ordre: objet.ordre || index
            }))
        };

        data.biens.push(bienDuplique);
        await saveData(data);

        res.json({ bien: bienDuplique });
    } catch (error) {
        console.error('Erreur lors de la duplication du bien:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Ajouter une section
export async function ajouterSection(req, res) {
    try {
        const { bienId, nom } = req.body;

        if (!bienId || !nom) {
            return res.status(400).json({ error: 'ID bien et nom de la section requis' });
        }

        const data = await loadData();
        const bien = data.biens.find(b => b.id === bienId);

        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        if (!bien.sections) {
            bien.sections = [];
        }

        const section = {
            id: Date.now().toString(),
            nom,
            ordre: bien.sections.length
        };

        bien.sections.push(section);
        await saveData(data);

        res.json({ section });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la section:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Modifier une section
export async function modifierSection(req, res) {
    try {
        const { bienId, sectionId } = req.params;
        const { nom } = req.body;

        if (!nom) {
            return res.status(400).json({ error: 'Le nom de la section est requis' });
        }

        const data = await loadData();
        const bien = data.biens.find(b => b.id === bienId);

        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        const section = (bien.sections || []).find(s => s.id === sectionId);

        if (!section) {
            return res.status(404).json({ error: 'Section non trouvée' });
        }

        section.nom = nom;
        await saveData(data);

        res.json({ section });
    } catch (error) {
        console.error('Erreur lors de la modification de la section:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Supprimer une section
export async function supprimerSection(req, res) {
    try {
        const { bienId, sectionId } = req.params;

        const data = await loadData();
        const bien = data.biens.find(b => b.id === bienId);

        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        if (!bien.sections) {
            return res.status(404).json({ error: 'Section non trouvée' });
        }

        const index = bien.sections.findIndex(s => s.id === sectionId);

        if (index === -1) {
            return res.status(404).json({ error: 'Section non trouvée' });
        }

        // Mettre à null le sectionId des objets de cette section
        bien.objets.forEach(objet => {
            if (objet.sectionId === sectionId) {
                objet.sectionId = null;
            }
        });

        bien.sections.splice(index, 1);
        await saveData(data);

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la suppression de la section:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Réorganiser les sections et objets (drag and drop)
export async function reorganiser(req, res) {
    try {
        const { bienId } = req.params;
        const { sections, objets } = req.body;

        const data = await loadData();
        const bien = data.biens.find(b => b.id === bienId);

        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        // Mettre à jour l'ordre des sections si fourni
        if (sections) {
            sections.forEach((sectionUpdate, index) => {
                const section = (bien.sections || []).find(s => s.id === sectionUpdate.id);
                if (section) {
                    section.ordre = index;
                }
            });
        }

        // Mettre à jour l'ordre et la section des objets si fourni
        if (objets) {
            objets.forEach((objetUpdate, index) => {
                const objet = bien.objets.find(o => o.id === objetUpdate.id);
                if (objet) {
                    objet.ordre = index;
                    if (objetUpdate.sectionId !== undefined) {
                        objet.sectionId = objetUpdate.sectionId;
                    }
                }
            });
        }

        await saveData(data);
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la réorganisation:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Créer un état des lieux
export async function creerEtatDesLieux(req, res) {
    try {
        const { bienId, type, locataire, etatEntreeId } = req.body;

        if (!bienId || !type) {
            return res.status(400).json({ error: 'ID bien et type requis' });
        }

        if (!['entree', 'sortie'].includes(type)) {
            return res.status(400).json({ error: 'Type invalide (entree ou sortie)' });
        }

        const data = await loadData();
        const bien = data.biens.find(b => b.id === bienId);

        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        if (!bien.etatsDesLieux) {
            bien.etatsDesLieux = [];
        }

        // Pour une sortie, vérifier que l'état d'entrée existe
        let objetsCopies = [];
        if (type === 'sortie') {
            if (!etatEntreeId) {
                return res.status(400).json({ error: 'ID état d\'entrée requis pour une sortie' });
            }

            const etatEntree = bien.etatsDesLieux.find(e => e.id === etatEntreeId);
            if (!etatEntree) {
                return res.status(404).json({ error: 'État d\'entrée non trouvé' });
            }

            // Copier les objets de l'état d'entrée avec les notes
            objetsCopies = etatEntree.objets.map(obj => ({
                ...obj,
                sortie: false // Réinitialiser le checkbox sortie
            }));
        } else {
            // Pour une entrée, copier les objets du template (bien) sans les notes
            objetsCopies = bien.objets.map(obj => ({
                id: obj.id,
                nom: obj.nom,
                description: obj.description,
                sectionId: obj.sectionId,
                ordre: obj.ordre,
                entree: false,
                sortie: false,
                note: 0,
                commentaires: ''
            }));
        }

        const etatDesLieux = {
            id: Date.now().toString(),
            type,
            locataire: locataire || '',
            etatEntreeId: type === 'sortie' ? etatEntreeId : null,
            dateCreation: new Date().toISOString(),
            sections: JSON.parse(JSON.stringify(bien.sections || [])), // Copie des sections
            objets: objetsCopies
        };

        bien.etatsDesLieux.push(etatDesLieux);
        await saveData(data);

        res.json({ etatDesLieux });
    } catch (error) {
        console.error('Erreur lors de la création de l\'état des lieux:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Obtenir tous les états des lieux d'un bien
export async function obtenirEtatsDesLieux(req, res) {
    try {
        const { bienId } = req.params;

        const data = await loadData();
        const bien = data.biens.find(b => b.id === bienId);

        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        // Filtrer pour s'assurer que seuls les états de ce bien sont retournés
        const etatsDesLieux = (bien.etatsDesLieux || []).filter(etat => {
            // Vérifier que l'état appartient bien à ce bien
            return etat && etat.id;
        });

        res.json({ etatsDesLieux });
    } catch (error) {
        console.error('Erreur lors de la récupération des états des lieux:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Obtenir un état des lieux spécifique
export async function obtenirEtatDesLieux(req, res) {
    try {
        const { bienId, etatId } = req.params;

        const data = await loadData();
        const bien = data.biens.find(b => b.id === bienId);

        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        const etatDesLieux = (bien.etatsDesLieux || []).find(e => e.id === etatId);

        if (!etatDesLieux) {
            return res.status(404).json({ error: 'État des lieux non trouvé' });
        }

        res.json({ etatDesLieux });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'état des lieux:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Mettre à jour un objet dans un état des lieux
export async function mettreAJourObjetEtatDesLieux(req, res) {
    try {
        const { bienId, etatId, objetId } = req.params;
        const { entree, sortie, note, commentaires } = req.body;

        const data = await loadData();
        const bien = data.biens.find(b => b.id === bienId);

        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        const etatDesLieux = (bien.etatsDesLieux || []).find(e => e.id === etatId);

        if (!etatDesLieux) {
            return res.status(404).json({ error: 'État des lieux non trouvé' });
        }

        const objet = etatDesLieux.objets.find(o => o.id === objetId);

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

// Supprimer un état des lieux
export async function supprimerEtatDesLieux(req, res) {
    try {
        const { bienId, etatId } = req.params;

        const data = await loadData();
        const bien = data.biens.find(b => b.id === bienId);

        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        if (!bien.etatsDesLieux) {
            return res.status(404).json({ error: 'État des lieux non trouvé' });
        }

        const index = bien.etatsDesLieux.findIndex(e => e.id === etatId);

        if (index === -1) {
            return res.status(404).json({ error: 'État des lieux non trouvé' });
        }

        const etatDesLieux = bien.etatsDesLieux[index];

        // Si c'est un état d'entrée, vérifier qu'il n'a pas d'état de sortie lié
        if (etatDesLieux.type === 'entree') {
            const hasSortie = bien.etatsDesLieux.some(e => e.etatEntreeId === etatId);
            if (hasSortie) {
                return res.status(400).json({ error: 'Impossible de supprimer : un état de sortie est lié à cet état d\'entrée' });
            }
        }

        bien.etatsDesLieux.splice(index, 1);
        await saveData(data);

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'état des lieux:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
