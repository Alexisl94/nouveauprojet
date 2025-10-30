import { supabase } from '../lib/supabase.js';

// Helper pour récupérer le contrat actif du locataire
async function getLocataireContrat(locataireUserId) {
    const { data, error } = await supabase
        .from('contrats')
        .select(`
            *,
            bien:biens(
                id,
                nom,
                adresse,
                type,
                surface
            )
        `)
        .eq('locataire_user_id', locataireUserId)
        .eq('statut', 'actif')
        .single();

    return { data, error };
}

// GET /api/locataire/dashboard
// Dashboard de l'espace locataire
export async function getLocataireDashboard(req, res) {
    const { userId } = req.query;

    console.log('📊 Dashboard locataire - userId:', userId);

    if (!userId) {
        return res.status(400).json({ error: 'userId requis' });
    }

    try {
        // Récupérer le contrat actif
        console.log('🔍 Recherche du contrat pour userId:', userId);
        const { data: contrat, error: contratError } = await getLocataireContrat(userId);

        console.log('📄 Contrat trouvé:', contrat);
        console.log('❌ Erreur contrat:', contratError);

        if (contratError || !contrat) {
            return res.status(404).json({ error: 'Aucun contrat actif trouvé' });
        }

        // Récupérer les quittances (12 dernières)
        const { data: quittances, error: quittancesError } = await supabase
            .from('quittances')
            .select('*')
            .eq('contrat_id', contrat.id)
            .order('periode', { ascending: false })
            .limit(12);

        // Récupérer l'état des lieux d'entrée uniquement
        const { data: etatDesLieux } = await supabase
            .from('etats_des_lieux')
            .select('*, objets')
            .eq('contrat_id', contrat.id)
            .eq('type', 'entree')
            .single();

        // Calculer la prochaine échéance
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, contrat.jour_paiement || 5);

        // Statistiques
        const stats = {
            loyer_mensuel: contrat.loyer || 0,
            charges: contrat.charges || 0,
            total_mensuel: (contrat.loyer || 0) + (contrat.charges || 0),
            prochaine_echeance: nextMonth.toISOString().split('T')[0],
            nombre_quittances: quittances?.length || 0,
            a_etat_des_lieux: !!etatDesLieux
        };

        res.json({
            contrat: {
                id: contrat.id,
                date_debut: contrat.date_debut,
                date_fin: contrat.date_fin,
                loyer: contrat.loyer,
                charges: contrat.charges,
                depot_garantie: contrat.depot_garantie,
                statut: contrat.statut
            },
            bien: contrat.bien,
            stats,
            quittances_recentes: quittances?.slice(0, 3) || [],
            etat_des_lieux: etatDesLieux ? {
                id: etatDesLieux.id,
                date: etatDesLieux.date,
                type: etatDesLieux.type,
                nombre_objets: etatDesLieux.objets?.length || 0
            } : null
        });

    } catch (error) {
        console.error('Erreur dashboard locataire:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// GET /api/locataire/contrat
// Détails complets du contrat
export async function getLocataireContratAPI(req, res) {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId requis' });
    }


    try {
        const { data: contrat, error } = await getLocataireContrat(userId);

        if (error || !contrat) {
            return res.status(404).json({ error: 'Aucun contrat actif trouvé' });
        }

        res.json({ contrat });

    } catch (error) {
        console.error('Erreur récupération contrat:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// GET /api/locataire/quittances
// Liste des quittances du locataire
export async function getLocataireQuittances(req, res) {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId requis' });
    }


    try {
        const { data: contrat } = await getLocataireContrat(userId);

        if (!contrat) {
            return res.status(404).json({ error: 'Aucun contrat actif' });
        }

        const { data: quittances, error } = await supabase
            .from('quittances')
            .select('*')
            .eq('contrat_id', contrat.id)
            .order('periode', { ascending: false });

        if (error) {
            console.error('Erreur quittances:', error);
            return res.status(500).json({ error: 'Erreur lors de la récupération des quittances' });
        }

        res.json({ quittances: quittances || [] });

    } catch (error) {
        console.error('Erreur quittances locataire:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// GET /api/locataire/quittances/:quittanceId
// Détail d'une quittance spécifique
export async function getLocataireQuittance(req, res) {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId requis' });
    }
    const { quittanceId } = req.params;


    try {
        const { data: contrat } = await getLocataireContrat(userId);

        if (!contrat) {
            return res.status(404).json({ error: 'Aucun contrat actif' });
        }

        // Vérifier que la quittance appartient bien au contrat du locataire
        const { data: quittance, error } = await supabase
            .from('quittances')
            .select('*')
            .eq('id', quittanceId)
            .eq('contrat_id', contrat.id)
            .single();

        if (error || !quittance) {
            return res.status(404).json({ error: 'Quittance non trouvée' });
        }

        res.json({ quittance });

    } catch (error) {
        console.error('Erreur quittance:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// GET /api/locataire/etat-des-lieux
// État des lieux d'entrée uniquement
export async function getLocataireEtatDesLieux(req, res) {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId requis' });
    }


    try {
        const { data: contrat } = await getLocataireContrat(userId);

        if (!contrat) {
            return res.status(404).json({ error: 'Aucun contrat actif' });
        }

        // Récupérer UNIQUEMENT l'état des lieux d'ENTRÉE
        const { data: etatDesLieux, error } = await supabase
            .from('etats_des_lieux')
            .select('*')
            .eq('contrat_id', contrat.id)
            .eq('type', 'entree')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = pas de résultat
            console.error('Erreur EDL:', error);
            return res.status(500).json({ error: 'Erreur lors de la récupération de l\'état des lieux' });
        }

        res.json({ etatDesLieux: etatDesLieux || null });

    } catch (error) {
        console.error('Erreur EDL locataire:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// GET /api/locataire/photos
// Photos du bien pendant la période du contrat
export async function getLocatairePhotos(req, res) {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId requis' });
    }


    try {
        const { data: contrat } = await getLocataireContrat(userId);

        if (!contrat) {
            return res.status(404).json({ error: 'Aucun contrat actif' });
        }

        // Récupérer toutes les photos du bien
        // Note: Pour filtrer par date, il faudra ajouter une colonne 'date_prise' à la table photos
        const { data: photos, error } = await supabase
            .from('photos')
            .select('*')
            .eq('bien_id', contrat.bien_id)
            .order('ordre', { ascending: true });

        if (error) {
            console.error('Erreur photos:', error);
            return res.status(500).json({ error: 'Erreur lors de la récupération des photos' });
        }

        res.json({ photos: photos || [] });

    } catch (error) {
        console.error('Erreur photos locataire:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// GET /api/locataire/bien
// Informations du bien loué
export async function getLocataireBien(req, res) {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId requis' });
    }


    try {
        const { data: contrat } = await getLocataireContrat(userId);

        if (!contrat) {
            return res.status(404).json({ error: 'Aucun contrat actif' });
        }

        res.json({ bien: contrat.bien });

    } catch (error) {
        console.error('Erreur bien locataire:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
