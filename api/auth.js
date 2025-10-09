import { supabase } from '../lib/supabase.js';

// Route d'inscription
export async function register(req, res) {
    try {
        const { email, nom, motDePasse } = req.body;

        if (!email || !nom || !motDePasse) {
            return res.status(400).json({ error: 'Tous les champs sont requis' });
        }

        // Vérifier si l'email existe déjà
        const { data: existingUser, error: checkError } = await supabase
            .from('proprietaires')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Créer le nouveau propriétaire
        const { data: proprietaire, error } = await supabase
            .from('proprietaires')
            .insert([{
                email,
                nom,
                mot_de_passe: motDePasse // Note: En production, il faudrait hasher le mot de passe
            }])
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase lors de l\'inscription:', error);
            return res.status(500).json({ error: 'Erreur lors de l\'inscription' });
        }

        // Ne pas renvoyer le mot de passe
        const { mot_de_passe: _, ...proprietaireSafe } = proprietaire;
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

        const { data: proprietaire, error } = await supabase
            .from('proprietaires')
            .select('*')
            .eq('email', email)
            .eq('mot_de_passe', motDePasse)
            .single();

        if (error || !proprietaire) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Ne pas renvoyer le mot de passe
        const { mot_de_passe: _, ...proprietaireSafe } = proprietaire;
        res.json({ proprietaire: proprietaireSafe });
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
