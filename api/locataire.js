import { supabase } from '../lib/supabase.js';

// Helper pour récupérer le contrat actif du locataire
async function getLocataireContrat(locataireUserId) {
    // Récupérer tous les contrats actifs pour ce locataire
    const { data: contrats, error } = await supabase
        .from('contrats')
        .select(`
            *,
            bien:biens(
                id,
                nom,
                adresse
            )
        `)
        .eq('locataire_user_id', locataireUserId)
        .eq('actif', true)
        .order('cree_le', { ascending: false });

    // Si erreur, retourner l'erreur
    if (error) {
        return { data: null, error };
    }

    // Si aucun contrat, retourner null
    if (!contrats || contrats.length === 0) {
        return { data: null, error: { message: 'Aucun contrat actif trouvé' } };
    }

    // Si plusieurs contrats, prendre le plus récent
    if (contrats.length > 1) {
        console.log(`⚠️ Plusieurs contrats actifs trouvés (${contrats.length}), utilisation du plus récent`);
    }

    // Retourner le contrat le plus récent
    return { data: contrats[0], error: null };
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
            .order('annee', { ascending: false })
            .order('mois', { ascending: false })
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
            .order('annee', { ascending: false })
            .order('mois', { ascending: false });

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
// Tous les états des lieux (entrée et sortie)
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

        // Récupérer TOUS les états des lieux (entrée et sortie)
        const { data: etatsDesLieux, error } = await supabase
            .from('etats_des_lieux')
            .select('*')
            .eq('contrat_id', contrat.id)
            .order('date_creation', { ascending: false });

        if (error) {
            console.error('Erreur EDL:', error);
            return res.status(500).json({ error: 'Erreur lors de la récupération des états des lieux' });
        }

        res.json({ etatsDesLieux: etatsDesLieux || [] });

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

// GET /api/locataire/contrat/pdf
// Télécharger le PDF du contrat
export async function getLocataireContratPDF(req, res) {
    const { userId } = req.query;

    console.log('📄 Demande PDF contrat pour userId:', userId);

    if (!userId) {
        return res.status(400).json({ error: 'userId requis' });
    }

    try {
        const { data: contrat, error } = await getLocataireContrat(userId);

        console.log('📄 Résultat getLocataireContrat:', { contrat: contrat?.id, error });

        if (error || !contrat) {
            console.log('❌ Contrat non trouvé pour le PDF');
            return res.status(404).json({ error: 'Contrat non trouvé' });
        }

        console.log('✅ Redirection vers PDF du contrat:', contrat.id);
        // Rediriger vers la route de génération de PDF du contrat
        res.redirect(`/api/contrats/${contrat.id}/pdf`);

    } catch (error) {
        console.error('❌ Erreur PDF contrat locataire:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// GET /api/locataire/etat-des-lieux/pdf
// Télécharger le PDF de l'état des lieux d'entrée
export async function getLocataireEtatDesLieuxPDF(req, res) {
    const { userId } = req.query;

    console.log('📋 Demande PDF EDL pour userId:', userId);

    if (!userId) {
        return res.status(400).json({ error: 'userId requis' });
    }

    try {
        const { data: contrat, error } = await getLocataireContrat(userId);

        console.log('📋 Résultat getLocataireContrat pour EDL:', { contrat: contrat?.id, error });

        if (error || !contrat) {
            console.log('❌ Contrat non trouvé pour le PDF EDL');
            return res.status(404).json({ error: 'Contrat non trouvé' });
        }

        // Récupérer l'état des lieux d'entrée
        const { data: etatDesLieux, error: edlError } = await supabase
            .from('etats_des_lieux')
            .select('id, bien_id')
            .eq('contrat_id', contrat.id)
            .eq('type', 'entree')
            .single();

        console.log('📋 État des lieux trouvé:', { edl: etatDesLieux?.id, error: edlError });

        if (edlError || !etatDesLieux) {
            return res.status(404).json({ error: 'État des lieux d\'entrée non trouvé' });
        }

        console.log('✅ Redirection vers PDF de l\'EDL:', etatDesLieux.id);
        // Rediriger vers la route de génération de PDF de l'état des lieux
        res.redirect(`/api/biens/${etatDesLieux.bien_id}/etats-des-lieux/${etatDesLieux.id}/pdf`);

    } catch (error) {
        console.error('❌ Erreur PDF état des lieux locataire:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// GET /api/locataire/quittances/:quittanceId/pdf
// Télécharger le PDF d'une quittance spécifique
export async function getLocataireQuittancePDF(req, res) {
    const { userId } = req.query;
    const { quittanceId } = req.params;

    if (!userId) {
        return res.status(400).json({ error: 'userId requis' });
    }

    try {
        const { data: contrat } = await getLocataireContrat(userId);

        if (!contrat) {
            return res.status(404).json({ error: 'Aucun contrat actif' });
        }

        // Vérifier que la quittance appartient bien au contrat du locataire
        const { data: quittance, error } = await supabase
            .from('quittances')
            .select('id, contrat_id')
            .eq('id', quittanceId)
            .eq('contrat_id', contrat.id)
            .single();

        if (error || !quittance) {
            return res.status(404).json({ error: 'Quittance non trouvée ou non autorisée' });
        }

        // Rediriger vers la route de génération de PDF
        res.redirect(`/api/quittances/${quittanceId}/pdf`);

    } catch (error) {
        console.error('Erreur PDF quittance locataire:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// GET /api/locataire/etats-des-lieux/:edlId/pdf
// Télécharger le PDF d'un état des lieux spécifique
export async function getLocataireEtatDesLieuxByIdPDF(req, res) {
    const { userId } = req.query;
    const { edlId } = req.params;

    if (!userId) {
        return res.status(400).json({ error: 'userId requis' });
    }

    try {
        const { data: contrat } = await getLocataireContrat(userId);

        if (!contrat) {
            return res.status(404).json({ error: 'Aucun contrat actif' });
        }

        // Vérifier que l'état des lieux appartient bien au contrat du locataire
        const { data: etatDesLieux, error } = await supabase
            .from('etats_des_lieux')
            .select('id, bien_id, contrat_id')
            .eq('id', edlId)
            .eq('contrat_id', contrat.id)
            .single();

        if (error || !etatDesLieux) {
            return res.status(404).json({ error: 'État des lieux non trouvé ou non autorisé' });
        }

        // Rediriger vers la route de génération de PDF
        res.redirect(`/api/biens/${etatDesLieux.bien_id}/etats-des-lieux/${edlId}/pdf`);

    } catch (error) {
        console.error('Erreur PDF état des lieux locataire:', error);
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
