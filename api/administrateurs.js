import { supabase } from '../lib/supabase.js';

// Obtenir tous les administrateurs d'un propriétaire
export async function obtenirAdministrateurs(req, res) {
    try {
        const { proprietaireId } = req.params;

        const { data: admins, error } = await supabase
            .from('administrateurs_proprietaire')
            .select(`
                id,
                date_ajout,
                actif,
                utilisateur:utilisateurs(id, email, nom)
            `)
            .eq('proprietaire_id', proprietaireId)
            .eq('actif', true)
            .order('date_ajout', { ascending: false });

        if (error) throw error;

        res.json({ administrateurs: admins || [] });
    } catch (error) {
        console.error('Erreur lors de la récupération des administrateurs:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Ajouter un administrateur à un propriétaire
export async function ajouterAdministrateur(req, res) {
    try {
        const { proprietaireId } = req.params;
        const { utilisateurEmail } = req.body;

        // Vérifier que le propriétaire existe
        const { data: proprietaire, error: propError } = await supabase
            .from('proprietaires')
            .select('id, email')
            .eq('id', proprietaireId)
            .single();

        if (propError || !proprietaire) {
            return res.status(404).json({ error: 'Propriétaire non trouvé' });
        }

        // Vérifier que l'utilisateur n'est pas le propriétaire lui-même
        if (proprietaire.email === utilisateurEmail) {
            return res.status(400).json({ error: 'Vous ne pouvez pas vous ajouter comme administrateur' });
        }

        // Trouver l'utilisateur par email
        const { data: utilisateur, error: userError } = await supabase
            .from('utilisateurs')
            .select('id, email, nom')
            .eq('email', utilisateurEmail)
            .single();

        if (userError || !utilisateur) {
            return res.status(404).json({ error: 'Utilisateur non trouvé avec cet email' });
        }

        // Vérifier si l'administrateur existe déjà
        const { data: adminExistant } = await supabase
            .from('administrateurs_proprietaire')
            .select('id, actif')
            .eq('proprietaire_id', proprietaireId)
            .eq('utilisateur_id', utilisateur.id)
            .single();

        if (adminExistant) {
            if (adminExistant.actif) {
                return res.status(400).json({ error: 'Cet utilisateur est déjà administrateur' });
            } else {
                // Réactiver l'administrateur
                const { data: updated, error: updateError } = await supabase
                    .from('administrateurs_proprietaire')
                    .update({ actif: true })
                    .eq('id', adminExistant.id)
                    .select(`
                        id,
                        date_ajout,
                        actif,
                        utilisateur:utilisateurs(id, email, nom)
                    `)
                    .single();

                if (updateError) throw updateError;
                return res.json({ administrateur: updated });
            }
        }

        // Créer le nouvel administrateur
        const { data: admin, error } = await supabase
            .from('administrateurs_proprietaire')
            .insert({
                proprietaire_id: proprietaireId,
                utilisateur_id: utilisateur.id
            })
            .select(`
                id,
                date_ajout,
                actif,
                utilisateur:utilisateurs(id, email, nom)
            `)
            .single();

        if (error) throw error;

        res.json({ administrateur: admin });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'administrateur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Révoquer un administrateur
export async function revoquerAdministrateur(req, res) {
    try {
        const { adminId } = req.params;

        const { error } = await supabase
            .from('administrateurs_proprietaire')
            .update({ actif: false })
            .eq('id', adminId);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la révocation de l\'administrateur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Obtenir tous les biens accessibles par un utilisateur
export async function obtenirBiensAccessibles(req, res) {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'userId requis' });
        }

        // Récupérer les biens via la fonction SQL
        const { data: biensAccessibles, error } = await supabase
            .rpc('get_biens_accessibles', { p_utilisateur_id: userId });

        if (error) throw error;

        // Récupérer les détails complets des biens
        const bienIds = biensAccessibles.map(b => b.bien_id);

        if (bienIds.length === 0) {
            return res.json({ biens: [] });
        }

        const { data: biens, error: biensError } = await supabase
            .from('biens')
            .select('*, proprietaire:proprietaires(*)')
            .in('id', bienIds);

        if (biensError) throw biensError;

        // Enrichir avec les informations de propriété
        const biensEnrichis = biens.map(bien => {
            const info = biensAccessibles.find(b => b.bien_id === bien.id);
            return {
                ...bien,
                est_proprietaire: info.est_proprietaire
            };
        });

        res.json({ biens: biensEnrichis });
    } catch (error) {
        console.error('Erreur lors de la récupération des biens accessibles:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
