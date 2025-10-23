-- Migration pour le système d'administrateurs globaux
-- Les administrateurs ont accès à TOUS les biens d'un propriétaire

-- Supprimer l'ancienne table de partages par bien
DROP TABLE IF EXISTS partages_biens;

-- Supprimer la colonne utilisateur_id de la table biens
ALTER TABLE biens DROP COLUMN IF EXISTS utilisateur_id;

-- Table pour lier les administrateurs aux propriétaires
CREATE TABLE IF NOT EXISTS administrateurs_proprietaire (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE CASCADE,
    utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    date_ajout TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actif BOOLEAN DEFAULT TRUE,
    UNIQUE(proprietaire_id, utilisateur_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_admin_proprietaire ON administrateurs_proprietaire(proprietaire_id);
CREATE INDEX IF NOT EXISTS idx_admin_utilisateur ON administrateurs_proprietaire(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_admin_actif ON administrateurs_proprietaire(actif);

-- Fonction pour récupérer tous les biens accessibles par un utilisateur
CREATE OR REPLACE FUNCTION get_biens_accessibles(p_utilisateur_id UUID)
RETURNS TABLE (
    bien_id UUID,
    est_proprietaire BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    -- Biens dont l'utilisateur est le propriétaire via la table proprietaires
    SELECT b.id as bien_id, TRUE as est_proprietaire
    FROM biens b
    JOIN proprietaires p ON b.proprietaire_id = p.id
    JOIN utilisateurs u ON u.email = p.email
    WHERE u.id = p_utilisateur_id

    UNION

    -- Biens accessibles car l'utilisateur est administrateur du propriétaire
    SELECT b.id as bien_id, FALSE as est_proprietaire
    FROM biens b
    JOIN administrateurs_proprietaire ap ON b.proprietaire_id = ap.proprietaire_id
    WHERE ap.utilisateur_id = p_utilisateur_id
    AND ap.actif = TRUE;
END;
$$ LANGUAGE plpgsql;
