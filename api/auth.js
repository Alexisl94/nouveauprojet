import { supabase } from '../lib/supabase.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'votre-secret-jwt-a-changer';

// Route d'inscription
export async function register(req, res) {
    try {
        const { email, nom, motDePasse } = req.body;

        if (!email || !nom || !motDePasse) {
            return res.status(400).json({ error: 'Tous les champs sont requis' });
        }

        // Vérifier si l'email existe déjà
        const { data: existingUser } = await supabase
            .from('utilisateurs')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(motDePasse, 10);

        // Créer le nouvel utilisateur (par défaut en tant que propriétaire)
        const { data: utilisateur, error } = await supabase
            .from('utilisateurs')
            .insert([{
                email,
                nom,
                mot_de_passe_hash: hashedPassword,
                role: 'proprietaire'
            }])
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase lors de l\'inscription:', error);
            return res.status(500).json({ error: 'Erreur lors de l\'inscription' });
        }

        // Créer automatiquement un compte pour l'utilisateur
        const { data: compte, error: compteError } = await supabase
            .rpc('creer_compte_complet', {
                p_utilisateur_id: utilisateur.id,
                p_nom_compte: `Patrimoine ${nom}`,
                p_type_compte: 'particulier'
            });

        if (compteError) {
            console.error('Erreur lors de la création du compte:', compteError);
            // On continue quand même, le compte pourra être créé plus tard
        }

        // Générer un token JWT
        const token = jwt.sign(
            { id: utilisateur.id, email: utilisateur.email, role: utilisateur.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Ne pas renvoyer le hash du mot de passe
        const { mot_de_passe_hash: _, ...utilisateurSafe } = utilisateur;
        res.json({
            token,
            user: utilisateurSafe,
            // Pour compatibilité avec l'ancien code
            proprietaire: {
                ...utilisateurSafe,
                utilisateur_id: utilisateur.id
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Route de connexion
export async function login(req, res) {
    try {
        const { email, password, motDePasse } = req.body;
        const passwordToCheck = password || motDePasse; // Support des deux formats

        if (!email || !passwordToCheck) {
            return res.status(400).json({ error: 'Email et mot de passe requis' });
        }

        // Récupérer l'utilisateur
        const { data: utilisateur, error } = await supabase
            .from('utilisateurs')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !utilisateur) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Vérifier le mot de passe (hasher avec bcrypt)
        const isPasswordValid = await bcrypt.compare(passwordToCheck, utilisateur.mot_de_passe_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Générer un token JWT
        const token = jwt.sign(
            { id: utilisateur.id, email: utilisateur.email, role: utilisateur.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Ne pas renvoyer le hash du mot de passe
        const { mot_de_passe_hash: _, ...utilisateurSafe } = utilisateur;
        res.json({
            token,
            user: utilisateurSafe,
            // Pour compatibilité avec l'ancien code
            proprietaire: {
                ...utilisateurSafe,
                utilisateur_id: utilisateur.id
            }
        });
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
