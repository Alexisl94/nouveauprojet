-- Migration pour ajouter le système de partage des biens entre administrateurs
-- À exécuter dans l'éditeur SQL de Supabase

-- Table pour gérer les partages de biens entre utilisateurs
CREATE TABLE IF NOT EXISTS partages_biens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bien_id UUID NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
    proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE CASCADE,
    utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'administrateur', -- 'administrateur' ou 'locataire' (pour plus tard)
    date_partage TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actif BOOLEAN DEFAULT TRUE,
    UNIQUE(bien_id, utilisateur_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_partages_biens_bien ON partages_biens(bien_id);
CREATE INDEX IF NOT EXISTS idx_partages_biens_utilisateur ON partages_biens(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_partages_biens_actif ON partages_biens(actif);

-- Ajouter une colonne pour identifier le propriétaire principal du bien
ALTER TABLE biens ADD COLUMN IF NOT EXISTS utilisateur_id UUID REFERENCES utilisateurs(id);

-- Migration des données existantes : associer tous les biens existants à l'utilisateur connecté
-- Note: Tu devras exécuter cette requête manuellement en remplaçant 'TON_USER_ID' par ton ID utilisateur
-- UPDATE biens SET utilisateur_id = 'TON_USER_ID' WHERE utilisateur_id IS NULL;

-- Fonction pour vérifier si un utilisateur a accès à un bien
CREATE OR REPLACE FUNCTION utilisateur_a_acces_bien(p_bien_id UUID, p_utilisateur_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        -- Soit l'utilisateur est le propriétaire principal
        SELECT 1 FROM biens WHERE id = p_bien_id AND utilisateur_id = p_utilisateur_id
        UNION
        -- Soit le bien a été partagé avec lui
        SELECT 1 FROM partages_biens
        WHERE bien_id = p_bien_id
        AND utilisateur_id = p_utilisateur_id
        AND actif = TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- Commentaires pour la documentation
COMMENT ON TABLE partages_biens IS 'Gère les partages de biens immobiliers entre utilisateurs (administrateurs et futurs locataires)';
COMMENT ON COLUMN partages_biens.role IS 'Rôle de l''utilisateur : administrateur (accès complet) ou locataire (accès limité aux documents)';
COMMENT ON COLUMN biens.utilisateur_id IS 'Propriétaire principal du bien (créateur)';
