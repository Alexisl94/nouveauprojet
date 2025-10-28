-- Migration pour le système d'invitation des locataires
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter la colonne 'role' à la table utilisateurs
ALTER TABLE utilisateurs
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'proprietaire' CHECK (role IN ('proprietaire', 'administrateur', 'locataire'));

-- Index pour améliorer les requêtes par rôle
CREATE INDEX IF NOT EXISTS idx_utilisateurs_role ON utilisateurs(role);

-- Commentaire
COMMENT ON COLUMN utilisateurs.role IS 'Role de utilisateur: proprietaire, administrateur ou locataire';

-- 2. Ajouter la colonne 'locataire_user_id' à la table contrats
ALTER TABLE contrats
ADD COLUMN IF NOT EXISTS locataire_user_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL;

-- Index pour les requêtes locataires
CREATE INDEX IF NOT EXISTS idx_contrats_locataire_user ON contrats(locataire_user_id);

-- Commentaire
COMMENT ON COLUMN contrats.locataire_user_id IS 'ID de utilisateur locataire lie au contrat (NULL si pas encore inscrit)';

-- 3. Créer la table des invitations locataires
CREATE TABLE IF NOT EXISTS invitations_locataires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrat_id UUID NOT NULL REFERENCES contrats(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations_locataires(token);
CREATE INDEX IF NOT EXISTS idx_invitations_contrat ON invitations_locataires(contrat_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations_locataires(email);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations_locataires(expires_at);

-- Commentaires
COMMENT ON TABLE invitations_locataires IS 'Invitations envoyees aux locataires pour creer leur compte';
COMMENT ON COLUMN invitations_locataires.contrat_id IS 'Contrat associe a invitation';
COMMENT ON COLUMN invitations_locataires.email IS 'Email du locataire invite';
COMMENT ON COLUMN invitations_locataires.token IS 'Token unique pour invitation (UUID)';
COMMENT ON COLUMN invitations_locataires.expires_at IS 'Date expiration de invitation (7 jours)';
COMMENT ON COLUMN invitations_locataires.accepted_at IS 'Date acceptation de invitation';

-- 4. Fonction helper pour nettoyer les invitations expirées (optionnel)
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM invitations_locataires
    WHERE expires_at < NOW()
    AND accepted_at IS NULL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_invitations() IS 'Supprime les invitations expirees non acceptees';

-- 5. Ajouter la colonne 'contrat_id' à la table etats_des_lieux
ALTER TABLE etats_des_lieux
ADD COLUMN IF NOT EXISTS contrat_id UUID REFERENCES contrats(id) ON DELETE SET NULL;

-- Index pour les requêtes locataires
CREATE INDEX IF NOT EXISTS idx_etats_des_lieux_contrat ON etats_des_lieux(contrat_id);

-- Commentaire
COMMENT ON COLUMN etats_des_lieux.contrat_id IS 'ID du contrat associe a cet etat des lieux (NULL pour les anciens EDL)';

-- 6. Index supplémentaires pour optimiser les requêtes de l'espace locataire
CREATE INDEX IF NOT EXISTS idx_quittances_contrat ON quittances(contrat_id);
CREATE INDEX IF NOT EXISTS idx_etats_des_lieux_contrat_type ON etats_des_lieux(contrat_id, type);

-- Résumé des modifications
DO $$
BEGIN
    RAISE NOTICE 'Migration 06_locataires_invitations.sql terminee avec succes';
    RAISE NOTICE 'Modifications appliquees:';
    RAISE NOTICE '   - Colonne "role" ajoutee a utilisateurs';
    RAISE NOTICE '   - Colonne "locataire_user_id" ajoutee a contrats';
    RAISE NOTICE '   - Colonne "contrat_id" ajoutee a etats_des_lieux';
    RAISE NOTICE '   - Table "invitations_locataires" creee';
    RAISE NOTICE '   - Index optimises pour les requetes locataires';
    RAISE NOTICE '';
    RAISE NOTICE 'Prochaines etapes:';
    RAISE NOTICE '   1. Executer cette migration dans Supabase SQL Editor';
    RAISE NOTICE '   2. Verifier que les tables sont creees correctement';
    RAISE NOTICE '   3. Tester API invitation';
END $$;
