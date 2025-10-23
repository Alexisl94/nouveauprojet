import { supabase } from '../lib/supabase.js';

// Obtenir tous les utilisateurs (pour l'autocomplete lors du partage)
export async function obtenirUtilisateurs(req, res) {
    try {
        const { data: utilisateurs, error } = await supabase
            .from('utilisateurs')
            .select('id, email, nom')
            .order('nom');

        if (error) throw error;

        res.json({ utilisateurs: utilisateurs || [] });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Obtenir les partages d'un bien
export async function obtenirPartagesBien(req, res) {
    try {
        const { bienId } = req.params;

        const { data: partages, error } = await supabase
            .from('partages_biens')
            .select(`
                id,
                role,
                date_partage,
                actif,
                utilisateur:utilisateurs(id, email, nom)
            `)
            .eq('bien_id', bienId)
            .eq('actif', true)
            .order('date_partage', { ascending: false });

        if (error) throw error;

        res.json({ partages: partages || [] });
    } catch (error) {
        console.error('Erreur lors de la récupération des partages:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Partager un bien avec un utilisateur
export async function partagerBien(req, res) {
    try {
        const { bienId } = req.params;
        const { utilisateurEmail, role } = req.body;

        // Vérifier que le bien existe
        const { data: bien, error: bienError } = await supabase
            .from('biens')
            .select('id, utilisateur_id, proprietaire_id')
            .eq('id', bienId)
            .single();

        if (bienError || !bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        // Trouver l'utilisateur par email
        const { data: utilisateur, error: userError } = await supabase
            .from('utilisateurs')
            .select('id')
            .eq('email', utilisateurEmail)
            .single();

        if (userError || !utilisateur) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Vérifier si le partage existe déjà
        const { data: partageExistant } = await supabase
            .from('partages_biens')
            .select('id, actif')
            .eq('bien_id', bienId)
            .eq('utilisateur_id', utilisateur.id)
            .single();

        if (partageExistant) {
            if (partageExistant.actif) {
                return res.status(400).json({ error: 'Ce bien est déjà partagé avec cet utilisateur' });
            } else {
                // Réactiver le partage
                const { data: updated, error: updateError } = await supabase
                    .from('partages_biens')
                    .update({ actif: true, role: role || 'administrateur' })
                    .eq('id', partageExistant.id)
                    .select()
                    .single();

                if (updateError) throw updateError;
                return res.json({ partage: updated });
            }
        }

        // Créer le nouveau partage
        const { data: partage, error } = await supabase
            .from('partages_biens')
            .insert({
                bien_id: bienId,
                proprietaire_id: bien.proprietaire_id,
                utilisateur_id: utilisateur.id,
                role: role || 'administrateur'
            })
            .select(`
                id,
                role,
                date_partage,
                actif,
                utilisateur:utilisateurs(id, email, nom)
            `)
            .single();

        if (error) throw error;

        res.json({ partage });
    } catch (error) {
        console.error('Erreur lors du partage du bien:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Révoquer un partage
export async function revoquerPartage(req, res) {
    try {
        const { partageId } = req.params;

        const { error } = await supabase
            .from('partages_biens')
            .update({ actif: false })
            .eq('id', partageId);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la révocation du partage:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Obtenir tous les biens accessibles par un utilisateur (ses biens + biens partagés)
export async function obtenirBiensAccessibles(req, res) {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'userId requis' });
        }

        // Récupérer les biens dont l'utilisateur est propriétaire
        const { data: biensPropres, error: biensError } = await supabase
            .from('biens')
            .select('*, proprietaire:proprietaires(*)')
            .eq('utilisateur_id', userId);

        if (biensError) throw biensError;

        // Récupérer les biens partagés avec l'utilisateur
        const { data: biensPartages, error: partagesError } = await supabase
            .from('partages_biens')
            .select(`
                role,
                bien:biens(*, proprietaire:proprietaires(*))
            `)
            .eq('utilisateur_id', userId)
            .eq('actif', true);

        if (partagesError) throw partagesError;

        // Combiner les deux listes
        const biensAvecPartages = (biensPropres || []).map(bien => ({
            ...bien,
            est_proprietaire: true,
            role: 'proprietaire'
        }));

        (biensPartages || []).forEach(partage => {
            if (partage.bien) {
                biensAvecPartages.push({
                    ...partage.bien,
                    est_proprietaire: false,
                    role: partage.role
                });
            }
        });

        res.json({ biens: biensAvecPartages });
    } catch (error) {
        console.error('Erreur lors de la récupération des biens accessibles:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
