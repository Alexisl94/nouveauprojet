import { supabase } from '../lib/supabase.js';
import crypto from 'crypto';

// Fonction helper pour générer un token unique
function generateInvitationToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Fonction helper pour calculer la date d'expiration (7 jours)
function getExpirationDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7); // Expire dans 7 jours
    return date.toISOString();
}

// POST /api/contrats/:contratId/invite-locataire
// Envoyer une invitation au locataire
export async function inviteLocataire(req, res) {
    const { contratId } = req.params;

    try {
        // Récupérer le contrat avec informations du bien
        const { data: contrat, error: contratError } = await supabase
            .from('contrats')
            .select(`
                *,
                biens!inner (
                    id,
                    nom,
                    adresse,
                    compte_id
                )
            `)
            .eq('id', contratId)
            .single();

        if (contratError || !contrat) {
            console.error('Erreur lors de la récupération du contrat:', contratError);
            return res.status(404).json({ error: 'Contrat non trouvé' });
        }

        // Vérifier qu'il y a bien un email locataire
        if (!contrat.email_locataire) {
            return res.status(400).json({ error: 'Aucun email de locataire renseigné dans le contrat' });
        }

        // Vérifier qu'il n'y a pas déjà une invitation en cours (non expirée)
        const { data: existingInvitation } = await supabase
            .from('invitations_locataires')
            .select('*')
            .eq('contrat_id', contratId)
            .is('accepted_at', null)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (existingInvitation) {
            return res.status(400).json({
                error: 'Une invitation est déjà en cours pour ce contrat',
                invitation: existingInvitation
            });
        }

        // Générer un nouveau token d'invitation
        const token = generateInvitationToken();
        const expiresAt = getExpirationDate();

        // Créer l'invitation en base
        const { data: invitation, error: invitationError } = await supabase
            .from('invitations_locataires')
            .insert({
                contrat_id: contratId,
                email: contrat.email_locataire,
                token: token,
                expires_at: expiresAt
            })
            .select()
            .single();

        if (invitationError) {
            console.error('Erreur création invitation:', invitationError);
            return res.status(500).json({ error: 'Erreur lors de la création de l\'invitation' });
        }

        // Construire le lien d'invitation
        const invitationLink = `${process.env.APP_URL || 'http://localhost:3000'}/invitation?token=${token}`;

        // TODO: Envoyer l'email d'invitation
        // Pour l'instant, on retourne juste le lien (à implémenter avec un service d'email)
        console.log('📧 Email d\'invitation à envoyer à:', contrat.email_locataire);
        console.log('🔗 Lien d\'invitation:', invitationLink);
        console.log('📄 Contrat:', contrat.biens.nom, '-', contrat.nom_locataire, contrat.prenom_locataire);

        res.json({
            success: true,
            message: 'Invitation créée avec succès',
            invitation: {
                id: invitation.id,
                email: invitation.email,
                expires_at: invitation.expires_at,
                invitation_link: invitationLink // À retirer en production (envoyé par email uniquement)
            }
        });

    } catch (error) {
        console.error('Erreur invitation locataire:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// GET /api/invitations/:token
// Vérifier qu'un token d'invitation est valide
export async function verifyInvitationToken(req, res) {
    const { token } = req.params;

    console.log('🔍 Vérification invitation avec token:', token);

    try {
        const { data: invitation, error } = await supabase
            .from('invitations_locataires')
            .select(`
                *,
                contrat:contrats(
                    id,
                    nom_locataire,
                    prenom_locataire,
                    bien:biens(
                        nom,
                        adresse
                    )
                )
            `)
            .eq('token', token)
            .single();

        console.log('📄 Résultat requête invitation:', { invitation, error });

        if (error || !invitation) {
            console.log('❌ Invitation non trouvée, erreur:', error);
            return res.status(404).json({
                valid: false,
                error: 'Invitation non trouvée'
            });
        }

        // Vérifier si déjà acceptée
        if (invitation.accepted_at) {
            return res.status(400).json({
                valid: false,
                error: 'Cette invitation a déjà été acceptée'
            });
        }

        // Vérifier si expirée
        if (new Date(invitation.expires_at) < new Date()) {
            return res.status(400).json({
                valid: false,
                error: 'Cette invitation a expiré'
            });
        }

        // Invitation valide
        res.json({
            valid: true,
            invitation: {
                email: invitation.email,
                locataire_nom: invitation.contrat.nom_locataire,
                locataire_prenom: invitation.contrat.prenom_locataire,
                bien: invitation.contrat.bien,
                expires_at: invitation.expires_at
            }
        });

    } catch (error) {
        console.error('Erreur vérification invitation:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// POST /api/invitations/:token/accept
// Accepter l'invitation et créer le compte locataire
export async function acceptInvitation(req, res) {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    try {
        // Récupérer l'invitation
        const { data: invitation, error: invError } = await supabase
            .from('invitations_locataires')
            .select('*')
            .eq('token', token)
            .single();

        if (invError || !invitation) {
            return res.status(404).json({ error: 'Invitation non trouvée' });
        }

        // Vérifier validité
        if (invitation.accepted_at) {
            return res.status(400).json({ error: 'Invitation déjà acceptée' });
        }

        if (new Date(invitation.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Invitation expirée' });
        }

        // Vérifier si un utilisateur existe déjà avec cet email
        const { data: existingUser } = await supabase
            .from('utilisateurs')
            .select('id')
            .eq('email', invitation.email)
            .single();

        if (existingUser) {
            return res.status(400).json({
                error: 'Un compte existe déjà avec cet email. Veuillez vous connecter.'
            });
        }

        // Créer le compte locataire
        const bcrypt = await import('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);

        const { data: newUser, error: userError } = await supabase
            .from('utilisateurs')
            .insert({
                email: invitation.email,
                nom: invitation.email.split('@')[0], // Nom temporaire
                mot_de_passe_hash: hashedPassword,
                role: 'locataire'
            })
            .select()
            .single();

        if (userError) {
            console.error('Erreur création utilisateur:', userError);
            return res.status(500).json({ error: 'Erreur lors de la création du compte' });
        }

        // Lier le contrat à l'utilisateur locataire
        const { error: contratUpdateError } = await supabase
            .from('contrats')
            .update({ locataire_user_id: newUser.id })
            .eq('id', invitation.contrat_id);

        if (contratUpdateError) {
            console.error('Erreur liaison contrat:', contratUpdateError);
            // On continue quand même, on peut corriger manuellement
        }

        // Marquer l'invitation comme acceptée
        await supabase
            .from('invitations_locataires')
            .update({ accepted_at: new Date().toISOString() })
            .eq('id', invitation.id);

        // Retourner l'utilisateur créé (pour connexion automatique)
        res.json({
            success: true,
            message: 'Compte créé avec succès',
            user: {
                id: newUser.id,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error('Erreur acceptation invitation:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// POST /api/contrats/:contratId/create-locataire-account
// Créer directement un compte locataire et le lier au contrat (pour tests/dev)
export async function createLocataireAccount(req, res) {
    const { contratId } = req.params;
    const { password } = req.body;

    console.log('🔧 Création compte locataire pour contrat:', contratId);

    if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    try {
        // Récupérer le contrat
        const { data: contrat, error: contratError } = await supabase
            .from('contrats')
            .select('*')
            .eq('id', contratId)
            .single();

        if (contratError || !contrat) {
            return res.status(404).json({ error: 'Contrat non trouvé' });
        }

        if (!contrat.email_locataire) {
            return res.status(400).json({ error: 'Aucun email de locataire renseigné dans le contrat' });
        }

        // Vérifier si le locataire a déjà un compte
        if (contrat.locataire_user_id) {
            return res.status(400).json({
                error: 'Un compte locataire est déjà lié à ce contrat',
                userId: contrat.locataire_user_id
            });
        }

        // Vérifier si un utilisateur existe déjà avec cet email
        const { data: existingUser } = await supabase
            .from('utilisateurs')
            .select('id, role')
            .eq('email', contrat.email_locataire)
            .single();

        let userId;

        if (existingUser) {
            console.log('👤 Utilisateur existant trouvé:', existingUser.id);

            // Mettre à jour son rôle si nécessaire
            if (existingUser.role !== 'locataire') {
                await supabase
                    .from('utilisateurs')
                    .update({ role: 'locataire' })
                    .eq('id', existingUser.id);
            }

            userId = existingUser.id;
        } else {
            // Créer le compte locataire
            const bcrypt = await import('bcrypt');
            const hashedPassword = await bcrypt.hash(password, 10);

            const { data: newUser, error: userError } = await supabase
                .from('utilisateurs')
                .insert({
                    email: contrat.email_locataire,
                    nom: contrat.nom_locataire || contrat.email_locataire.split('@')[0],
                    mot_de_passe_hash: hashedPassword,
                    role: 'locataire'
                })
                .select()
                .single();

            if (userError) {
                console.error('❌ Erreur création utilisateur:', userError);
                return res.status(500).json({ error: 'Erreur lors de la création du compte', details: userError.message });
            }

            console.log('✅ Nouveau compte créé:', newUser.id);
            userId = newUser.id;
        }

        // Lier le contrat à l'utilisateur locataire
        const { error: contratUpdateError } = await supabase
            .from('contrats')
            .update({ locataire_user_id: userId })
            .eq('id', contratId);

        if (contratUpdateError) {
            console.error('❌ Erreur liaison contrat:', contratUpdateError);
            return res.status(500).json({ error: 'Erreur lors de la liaison du contrat', details: contratUpdateError.message });
        }

        console.log('🔗 Contrat lié au locataire');

        res.json({
            success: true,
            message: 'Compte locataire créé et lié au contrat',
            data: {
                userId: userId,
                email: contrat.email_locataire,
                contratId: contratId
            }
        });

    } catch (error) {
        console.error('❌ Erreur création compte locataire:', error);
        res.status(500).json({ error: 'Erreur serveur', details: error.message });
    }
}
