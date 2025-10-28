import { supabase } from '../lib/supabase.js';

// Obtenir les informations du bailleur pour un propriétaire
export async function obtenirBailleur(req, res) {
    try {
        const { proprietaireId } = req.query;

        if (!proprietaireId) {
            return res.status(400).json({ error: 'proprietaireId requis' });
        }

        const { data: bailleur, error } = await supabase
            .from('bailleurs')
            .select('*')
            .eq('proprietaire_id', proprietaireId)
            .maybeSingle();

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        // Convertir snake_case vers camelCase pour le frontend
        const bailleurFormatted = bailleur ? {
            id: bailleur.id,
            proprietaireId: bailleur.proprietaire_id,
            nom: bailleur.nom,
            prenom: bailleur.prenom,
            adresse: bailleur.adresse,
            codePostal: bailleur.code_postal,
            ville: bailleur.ville,
            telephone: bailleur.telephone,
            email: bailleur.email,
            siret: bailleur.siret,
            iban: bailleur.iban,
            createdAt: bailleur.created_at,
            updatedAt: bailleur.updated_at
        } : null;

        res.json({ bailleur: bailleurFormatted });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Créer ou mettre à jour les informations du bailleur
export async function upsertBailleur(req, res) {
    try {
        const { proprietaireId } = req.params;
        const {
            nom,
            prenom,
            adresse,
            codePostal,
            ville,
            telephone,
            email,
            siret,
            iban
        } = req.body;

        // Validation des champs requis
        if (!nom || !adresse || !codePostal || !ville) {
            return res.status(400).json({ error: 'Les champs nom, adresse, code postal et ville sont requis' });
        }

        // Convertir camelCase vers snake_case pour la base de données
        const bailleurData = {
            proprietaire_id: proprietaireId,
            nom,
            prenom: prenom || null,
            adresse,
            code_postal: codePostal,
            ville,
            telephone: telephone || null,
            email: email || null,
            siret: siret || null,
            iban: iban || null,
            updated_at: new Date().toISOString()
        };

        // Vérifier si le bailleur existe déjà
        const { data: existing } = await supabase
            .from('bailleurs')
            .select('id')
            .eq('proprietaire_id', proprietaireId)
            .maybeSingle();

        let bailleur;
        if (existing) {
            // Mise à jour
            const { data, error } = await supabase
                .from('bailleurs')
                .update(bailleurData)
                .eq('proprietaire_id', proprietaireId)
                .select()
                .single();

            if (error) {
                console.error('Erreur Supabase:', error);
                return res.status(500).json({ error: 'Erreur serveur' });
            }
            bailleur = data;
        } else {
            // Création
            const { data, error } = await supabase
                .from('bailleurs')
                .insert([bailleurData])
                .select()
                .single();

            if (error) {
                console.error('Erreur Supabase:', error);
                return res.status(500).json({ error: 'Erreur serveur' });
            }
            bailleur = data;
        }

        // Convertir snake_case vers camelCase pour le frontend
        const bailleurFormatted = {
            id: bailleur.id,
            proprietaireId: bailleur.proprietaire_id,
            nom: bailleur.nom,
            prenom: bailleur.prenom,
            adresse: bailleur.adresse,
            codePostal: bailleur.code_postal,
            ville: bailleur.ville,
            telephone: bailleur.telephone,
            email: bailleur.email,
            siret: bailleur.siret,
            iban: bailleur.iban,
            createdAt: bailleur.created_at,
            updatedAt: bailleur.updated_at
        };

        res.json({ bailleur: bailleurFormatted });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
