import { supabase } from '../lib/supabase.js';

// Créer un bien
export async function creerBien(req, res) {
    try {
        const { proprietaireId, nom, adresse } = req.body;

        if (!proprietaireId || !nom) {
            return res.status(400).json({ error: 'ID propriétaire et nom du bien requis' });
        }

        // Vérifier que le propriétaire existe
        const { data: proprietaire, error: propError } = await supabase
            .from('proprietaires')
            .select('id')
            .eq('id', proprietaireId)
            .single();

        if (propError || !proprietaire) {
            return res.status(404).json({ error: 'Propriétaire non trouvé' });
        }

        // Créer le bien
        const { data: bien, error } = await supabase
            .from('biens')
            .insert([{
                proprietaire_id: proprietaireId,
                nom,
                adresse: adresse || ''
            }])
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase lors de la création du bien:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        // Retourner le bien avec les propriétés attendues par le frontend
        res.json({
            bien: {
                id: bien.id,
                proprietaireId: bien.proprietaire_id,
                nom: bien.nom,
                adresse: bien.adresse,
                creeLe: bien.cree_le,
                sections: [],
                objets: [],
                etatsDesLieux: []
            }
        });
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

        // Récupérer les biens
        const { data: biens, error: biensError } = await supabase
            .from('biens')
            .select('*')
            .eq('proprietaire_id', proprietaireId);

        if (biensError) {
            console.error('Erreur Supabase:', biensError);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        // Pour chaque bien, récupérer ses sections, objets, états des lieux et contrat actif
        const biensComplets = await Promise.all(biens.map(async (bien) => {
            // Récupérer les sections
            const { data: sections } = await supabase
                .from('sections')
                .select('*')
                .eq('bien_id', bien.id)
                .order('ordre');

            // Récupérer les objets
            const { data: objets } = await supabase
                .from('objets')
                .select('*')
                .eq('bien_id', bien.id)
                .order('ordre');

            // Récupérer les états des lieux
            const { data: etatsDesLieux } = await supabase
                .from('etats_des_lieux')
                .select('*')
                .eq('bien_id', bien.id)
                .order('date_creation', { ascending: false });

            // Récupérer le contrat actif (non archivé et actif)
            const { data: contratActif } = await supabase
                .from('contrats')
                .select('*')
                .eq('bien_id', bien.id)
                .eq('actif', true)
                .order('date_debut', { ascending: false })
                .limit(1)
                .single();

            // Transformation du contrat avec camelCase pour le frontend
            const contratFormate = contratActif ? {
                id: contratActif.id,
                nom: contratActif.nom_locataire,
                prenom: contratActif.prenom_locataire,
                email: contratActif.email_locataire,
                numeroChambre: contratActif.numero_chambre,
                dateDebut: contratActif.date_debut,
                dateFin: contratActif.date_fin,
                loyer: contratActif.loyer,
                charges: contratActif.charges,
                depotGarantie: contratActif.depot_garantie,
                type: contratActif.type,
                actif: contratActif.actif
            } : null;

            return {
                id: bien.id,
                proprietaireId: bien.proprietaire_id,
                nom: bien.nom,
                adresse: bien.adresse,
                creeLe: bien.cree_le,
                sections: sections || [],
                objets: objets || [],
                etatsDesLieux: etatsDesLieux || [],
                contratActif: contratFormate,
                // Pour compatibilité avec l'ancien code
                locataireActuel: contratFormate ? {
                    nom: contratFormate.nom,
                    prenom: contratFormate.prenom,
                    loyer: contratFormate.loyer
                } : null
            };
        }));

        res.json({ biens: biensComplets });
    } catch (error) {
        console.error('Erreur lors de la récupération des biens:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Obtenir un bien spécifique
export async function obtenirBien(req, res) {
    try {
        const { id } = req.params;

        const { data: bien, error } = await supabase
            .from('biens')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        // Récupérer les sections
        const { data: sections } = await supabase
            .from('sections')
            .select('*')
            .eq('bien_id', bien.id)
            .order('ordre');

        // Récupérer les objets
        const { data: objets } = await supabase
            .from('objets')
            .select('*')
            .eq('bien_id', bien.id)
            .order('ordre');

        // Récupérer les états des lieux
        const { data: etatsDesLieux } = await supabase
            .from('etats_des_lieux')
            .select('*')
            .eq('bien_id', bien.id)
            .order('date_creation', { ascending: false });

        res.json({
            bien: {
                id: bien.id,
                proprietaireId: bien.proprietaire_id,
                nom: bien.nom,
                adresse: bien.adresse,
                creeLe: bien.cree_le,
                sections: sections || [],
                objets: objets || [],
                etatsDesLieux: etatsDesLieux || []
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du bien:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Supprimer un bien
export async function supprimerBien(req, res) {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('biens')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

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

        // Vérifier que le bien existe
        const { data: bien, error: bienError } = await supabase
            .from('biens')
            .select('id')
            .eq('id', bienId)
            .single();

        if (bienError || !bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        // Obtenir le nombre d'objets existants pour l'ordre
        const { count } = await supabase
            .from('objets')
            .select('*', { count: 'exact', head: true })
            .eq('bien_id', bienId);

        const { data: objet, error } = await supabase
            .from('objets')
            .insert([{
                bien_id: bienId,
                nom,
                description: description || '',
                section_id: sectionId || null,
                ordre: count || 0
            }])
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        res.json({
            objet: {
                id: objet.id,
                nom: objet.nom,
                description: objet.description,
                sectionId: objet.section_id,
                ordre: objet.ordre
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'objet:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Supprimer un objet
export async function supprimerObjet(req, res) {
    try {
        const { bienId, objetId } = req.params;

        const { error } = await supabase
            .from('objets')
            .delete()
            .eq('id', objetId)
            .eq('bien_id', bienId);

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

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

        const updates = {};
        if (sectionId !== undefined) updates.section_id = sectionId;

        const { data: objet, error } = await supabase
            .from('objets')
            .update(updates)
            .eq('id', objetId)
            .eq('bien_id', bienId)
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (!objet) {
            return res.status(404).json({ error: 'Objet non trouvé' });
        }

        res.json({
            objet: {
                id: objet.id,
                nom: objet.nom,
                description: objet.description,
                sectionId: objet.section_id,
                ordre: objet.ordre
            }
        });
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

        const updates = { nom };
        if (adresse !== undefined) updates.adresse = adresse;

        const { data: bien, error } = await supabase
            .from('biens')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error || !bien) {
            console.error('Erreur Supabase:', error);
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        res.json({
            bien: {
                id: bien.id,
                proprietaireId: bien.proprietaire_id,
                nom: bien.nom,
                adresse: bien.adresse,
                creeLe: bien.cree_le
            }
        });
    } catch (error) {
        console.error('Erreur lors de la modification du bien:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Dupliquer un bien
export async function dupliquerBien(req, res) {
    try {
        const { id } = req.params;

        // Récupérer le bien original
        const { data: bienOriginal, error: bienError } = await supabase
            .from('biens')
            .select('*')
            .eq('id', id)
            .single();

        if (bienError || !bienOriginal) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        // Créer le bien dupliqué
        const { data: bienDuplique, error: dupError } = await supabase
            .from('biens')
            .insert([{
                proprietaire_id: bienOriginal.proprietaire_id,
                nom: `${bienOriginal.nom} (Copie)`,
                adresse: bienOriginal.adresse
            }])
            .select()
            .single();

        if (dupError) {
            console.error('Erreur Supabase:', dupError);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        // Récupérer et dupliquer les sections
        const { data: sectionsOriginales } = await supabase
            .from('sections')
            .select('*')
            .eq('bien_id', id);

        const sectionMap = {};
        if (sectionsOriginales && sectionsOriginales.length > 0) {
            const { data: sectionsDupliquees } = await supabase
                .from('sections')
                .insert(sectionsOriginales.map(s => ({
                    bien_id: bienDuplique.id,
                    nom: s.nom,
                    ordre: s.ordre
                })))
                .select();

            // Créer un mapping entre anciennes et nouvelles sections
            sectionsOriginales.forEach((sOrig, index) => {
                if (sectionsDupliquees && sectionsDupliquees[index]) {
                    sectionMap[sOrig.id] = sectionsDupliquees[index].id;
                }
            });
        }

        // Récupérer et dupliquer les objets
        const { data: objetsOriginaux } = await supabase
            .from('objets')
            .select('*')
            .eq('bien_id', id);

        if (objetsOriginaux && objetsOriginaux.length > 0) {
            await supabase
                .from('objets')
                .insert(objetsOriginaux.map(o => ({
                    bien_id: bienDuplique.id,
                    nom: o.nom,
                    description: o.description,
                    section_id: o.section_id ? sectionMap[o.section_id] || null : null,
                    ordre: o.ordre
                })));
        }

        res.json({
            bien: {
                id: bienDuplique.id,
                proprietaireId: bienDuplique.proprietaire_id,
                nom: bienDuplique.nom,
                adresse: bienDuplique.adresse,
                creeLe: bienDuplique.cree_le,
                sections: [],
                objets: [],
                etatsDesLieux: []
            }
        });
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

        // Vérifier que le bien existe
        const { data: bien, error: bienError } = await supabase
            .from('biens')
            .select('id')
            .eq('id', bienId)
            .single();

        if (bienError || !bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        // Obtenir le nombre de sections existantes
        const { count } = await supabase
            .from('sections')
            .select('*', { count: 'exact', head: true })
            .eq('bien_id', bienId);

        const { data: section, error } = await supabase
            .from('sections')
            .insert([{
                bien_id: bienId,
                nom,
                ordre: count || 0
            }])
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

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

        const { data: section, error } = await supabase
            .from('sections')
            .update({ nom })
            .eq('id', sectionId)
            .eq('bien_id', bienId)
            .select()
            .single();

        if (error || !section) {
            console.error('Erreur Supabase:', error);
            return res.status(404).json({ error: 'Section non trouvée' });
        }

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

        // Mettre à null le section_id des objets de cette section
        await supabase
            .from('objets')
            .update({ section_id: null })
            .eq('section_id', sectionId);

        // Supprimer la section
        const { error } = await supabase
            .from('sections')
            .delete()
            .eq('id', sectionId)
            .eq('bien_id', bienId);

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

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

        // Mettre à jour l'ordre des sections si fourni
        if (sections) {
            for (let index = 0; index < sections.length; index++) {
                await supabase
                    .from('sections')
                    .update({ ordre: index })
                    .eq('id', sections[index].id)
                    .eq('bien_id', bienId);
            }
        }

        // Mettre à jour l'ordre et la section des objets si fourni
        if (objets) {
            for (let index = 0; index < objets.length; index++) {
                const updates = { ordre: index };
                if (objets[index].sectionId !== undefined) {
                    updates.section_id = objets[index].sectionId;
                }
                await supabase
                    .from('objets')
                    .update(updates)
                    .eq('id', objets[index].id)
                    .eq('bien_id', bienId);
            }
        }

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

        // Vérifier que le bien existe
        const { data: bien, error: bienError } = await supabase
            .from('biens')
            .select('id')
            .eq('id', bienId)
            .single();

        if (bienError || !bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        let objetsCopies = [];
        if (type === 'sortie') {
            if (!etatEntreeId) {
                return res.status(400).json({ error: 'ID état d\'entrée requis pour une sortie' });
            }

            // Vérifier que l'état d'entrée existe
            const { data: etatEntree, error: etatError } = await supabase
                .from('etats_des_lieux')
                .select('id')
                .eq('id', etatEntreeId)
                .single();

            if (etatError || !etatEntree) {
                return res.status(404).json({ error: 'État d\'entrée non trouvé' });
            }

            // Copier les objets de l'état d'entrée
            const { data: objetsEntree } = await supabase
                .from('objets_etat_des_lieux')
                .select('*')
                .eq('etat_des_lieux_id', etatEntreeId)
                .order('ordre');

            objetsCopies = objetsEntree || [];
        } else {
            // Pour une entrée, copier les objets du template (bien)
            const { data: objetsTemplate } = await supabase
                .from('objets')
                .select('*')
                .eq('bien_id', bienId)
                .order('ordre');

            objetsCopies = objetsTemplate || [];
        }

        // Créer l'état des lieux
        const { data: etatDesLieux, error: etatError } = await supabase
            .from('etats_des_lieux')
            .insert([{
                bien_id: bienId,
                type,
                locataire: locataire || '',
                etat_entree_id: type === 'sortie' ? etatEntreeId : null
            }])
            .select()
            .single();

        if (etatError) {
            console.error('Erreur Supabase:', etatError);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        // Insérer les objets dans objets_etat_des_lieux
        if (objetsCopies.length > 0) {
            const objetsToInsert = objetsCopies.map(obj => ({
                etat_des_lieux_id: etatDesLieux.id,
                objet_id: type === 'sortie' ? obj.objet_id : obj.id,
                section_id: type === 'sortie' ? obj.section_id : obj.section_id,
                nom: obj.nom,
                description: obj.description || '',
                entree: type === 'sortie' ? obj.entree : false,
                sortie: false,
                note: type === 'sortie' ? obj.note : 0,
                commentaires: type === 'sortie' ? obj.commentaires : '',
                ordre: obj.ordre
            }));

            await supabase
                .from('objets_etat_des_lieux')
                .insert(objetsToInsert);
        }

        // Retourner l'état des lieux complet
        const { data: objetsEtat } = await supabase
            .from('objets_etat_des_lieux')
            .select('*')
            .eq('etat_des_lieux_id', etatDesLieux.id)
            .order('ordre');

        res.json({
            etat: {
                id: etatDesLieux.id,
                type: etatDesLieux.type,
                locataire: etatDesLieux.locataire,
                etatEntreeId: etatDesLieux.etat_entree_id,
                dateCreation: etatDesLieux.date_creation,
                etat_objets: objetsEtat || []
            }
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'état des lieux:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Obtenir tous les états des lieux d'un bien
export async function obtenirEtatsDesLieux(req, res) {
    try {
        const { bienId } = req.params;

        const { data: etatsDesLieux, error } = await supabase
            .from('etats_des_lieux')
            .select('*')
            .eq('bien_id', bienId)
            .order('date_creation', { ascending: false });

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        res.json({ etats: etatsDesLieux || [] });
    } catch (error) {
        console.error('Erreur lors de la récupération des états des lieux:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Obtenir un état des lieux spécifique
export async function obtenirEtatDesLieux(req, res) {
    try {
        const { bienId, etatId } = req.params;

        const { data: etatDesLieux, error } = await supabase
            .from('etats_des_lieux')
            .select('*')
            .eq('id', etatId)
            .eq('bien_id', bienId)
            .single();

        if (error || !etatDesLieux) {
            return res.status(404).json({ error: 'État des lieux non trouvé' });
        }

        // Récupérer les objets de cet état des lieux
        const { data: objets } = await supabase
            .from('objets_etat_des_lieux')
            .select('*')
            .eq('etat_des_lieux_id', etatId)
            .order('ordre');

        // Récupérer les sections du bien pour organiser l'affichage
        const { data: sections } = await supabase
            .from('sections')
            .select('*')
            .eq('bien_id', bienId)
            .order('ordre');

        res.json({
            etat: {
                id: etatDesLieux.id,
                type: etatDesLieux.type,
                locataire: etatDesLieux.locataire,
                date: etatDesLieux.date_creation,
                etatEntreeId: etatDesLieux.etat_entree_id,
                dateCreation: etatDesLieux.date_creation,
                sections: sections || [],
                etat_objets: objets || []
            }
        });
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

        console.log('Mise à jour objet état:', { bienId, etatId, objetId, updates: { entree, sortie, note, commentaires } });

        const updates = {};
        if (entree !== undefined) updates.entree = entree;
        if (sortie !== undefined) updates.sortie = sortie;
        if (note !== undefined) updates.note = note;
        if (commentaires !== undefined) updates.commentaires = commentaires;

        // Chercher d'abord l'objet dans objets_etat_des_lieux
        // L'objetId peut être soit l'id de l'objet_etat_des_lieux, soit l'objet_id original
        const { data: objet, error } = await supabase
            .from('objets_etat_des_lieux')
            .update(updates)
            .eq('id', objetId)
            .eq('etat_des_lieux_id', etatId)
            .select()
            .single();

        if (error || !objet) {
            console.error('Erreur Supabase (recherche par id):', error);
            // Essayer avec objet_id
            const { data: objetAlt, error: errorAlt } = await supabase
                .from('objets_etat_des_lieux')
                .update(updates)
                .eq('objet_id', objetId)
                .eq('etat_des_lieux_id', etatId)
                .select()
                .single();

            if (errorAlt || !objetAlt) {
                console.error('Erreur Supabase (recherche par objet_id):', errorAlt);
                return res.status(404).json({ error: 'Objet non trouvé' });
            }

            console.log('Objet mis à jour (par objet_id):', objetAlt);
            return res.json({ objet: objetAlt });
        }

        console.log('Objet mis à jour (par id):', objet);
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

        // Récupérer l'état des lieux
        const { data: etatDesLieux, error: getError } = await supabase
            .from('etats_des_lieux')
            .select('*')
            .eq('id', etatId)
            .eq('bien_id', bienId)
            .single();

        if (getError || !etatDesLieux) {
            return res.status(404).json({ error: 'État des lieux non trouvé' });
        }

        // Si c'est un état d'entrée, vérifier qu'il n'a pas d'état de sortie lié
        if (etatDesLieux.type === 'entree') {
            const { data: etatsLies } = await supabase
                .from('etats_des_lieux')
                .select('id')
                .eq('etat_entree_id', etatId);

            if (etatsLies && etatsLies.length > 0) {
                return res.status(400).json({ error: 'Impossible de supprimer : un état de sortie est lié à cet état d\'entrée' });
            }
        }

        // Supprimer l'état des lieux (les objets seront supprimés en cascade)
        const { error } = await supabase
            .from('etats_des_lieux')
            .delete()
            .eq('id', etatId);

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'état des lieux:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Marquer un état des lieux comme terminé
export async function terminerEtatDesLieux(req, res) {
    try {
        const { bienId, etatId } = req.params;

        // Mettre à jour le champ termine
        const { data, error } = await supabase
            .from('etats_des_lieux')
            .update({ termine: true })
            .eq('id', etatId)
            .eq('bien_id', bienId)
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (!data) {
            return res.status(404).json({ error: 'État des lieux non trouvé' });
        }

        res.json({ success: true, etat: data });
    } catch (error) {
        console.error('Erreur lors de la finalisation de l\'état des lieux:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
