-- Migration : Unification de l'architecture utilisateurs
-- Suppression de la table proprietaires et centralisation sur utilisateurs
-- À exécuter dans Supabase SQL Editor

-- ============================================
-- ÉTAPE 1 : Vérification préalable
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration : Unification utilisateurs';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Cette migration va :';
    RAISE NOTICE '  1. Migrer biens.proprietaire_id vers biens.utilisateur_id';
    RAISE NOTICE '  2. Supprimer la table proprietaires';
    RAISE NOTICE '  3. Simplifier administrateurs_proprietaire';
    RAISE NOTICE '';
END $$;

-- ============================================
-- ÉTAPE 2 : Ajouter la colonne utilisateur_id à biens
-- ============================================

-- Ajouter la nouvelle colonne
ALTER TABLE biens
ADD COLUMN IF NOT EXISTS utilisateur_id UUID REFERENCES utilisateurs(id) ON DELETE CASCADE;

-- Migrer les données : lier chaque bien à son utilisateur via l'email
UPDATE biens b
SET utilisateur_id = u.id
FROM proprietaires p
JOIN utilisateurs u ON u.email = p.email
WHERE b.proprietaire_id = p.id;

-- Vérifier que tous les biens ont été migrés
DO $$
DECLARE
    biens_non_migres INTEGER;
BEGIN
    SELECT COUNT(*) INTO biens_non_migres
    FROM biens
    WHERE utilisateur_id IS NULL;

    IF biens_non_migres > 0 THEN
        RAISE EXCEPTION 'Migration échouée: % biens n''ont pas été migrés', biens_non_migres;
    ELSE
        RAISE NOTICE '✓ Tous les biens ont été migrés vers utilisateur_id';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 3 : Renommer administrateurs_proprietaire
-- ============================================

-- Renommer la colonne proprietaire_id en utilisateur_proprietaire_id pour plus de clarté
ALTER TABLE administrateurs_proprietaire
RENAME COLUMN proprietaire_id TO utilisateur_proprietaire_id;

-- Mettre à jour les références pour pointer vers utilisateurs (via email)
UPDATE administrateurs_proprietaire ap
SET utilisateur_proprietaire_id = u.id
FROM proprietaires p
JOIN utilisateurs u ON u.email = p.email
WHERE ap.utilisateur_proprietaire_id = p.id;

-- Commentaires
COMMENT ON TABLE administrateurs_proprietaire IS 'Lie un utilisateur administrateur à un propriétaire (tous deux dans la table utilisateurs)';
COMMENT ON COLUMN administrateurs_proprietaire.utilisateur_proprietaire_id IS 'ID de l''utilisateur propriétaire (role=proprietaire)';
COMMENT ON COLUMN administrateurs_proprietaire.utilisateur_id IS 'ID de l''utilisateur administrateur invité (role=administrateur)';

-- ============================================
-- ÉTAPE 4 : Mettre à jour la fonction get_biens_accessibles
-- ============================================

CREATE OR REPLACE FUNCTION get_biens_accessibles(p_utilisateur_id UUID)
RETURNS TABLE (
    bien_id UUID,
    est_proprietaire BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    -- Biens dont l'utilisateur est le propriétaire direct
    SELECT b.id as bien_id, TRUE as est_proprietaire
    FROM biens b
    WHERE b.utilisateur_id = p_utilisateur_id

    UNION

    -- Biens accessibles car l'utilisateur est administrateur du propriétaire
    SELECT b.id as bien_id, FALSE as est_proprietaire
    FROM biens b
    JOIN administrateurs_proprietaire ap ON b.utilisateur_id = ap.utilisateur_proprietaire_id
    WHERE ap.utilisateur_id = p_utilisateur_id
    AND ap.actif = TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_biens_accessibles IS 'Retourne tous les biens accessibles par un utilisateur (propriétaire ou admin)';

-- ============================================
-- ÉTAPE 5 : Supprimer l'ancienne colonne et la table proprietaires
-- ============================================

-- Supprimer la contrainte de clé étrangère et la colonne proprietaire_id
ALTER TABLE biens DROP COLUMN IF EXISTS proprietaire_id CASCADE;

-- Rendre utilisateur_id NOT NULL maintenant que tout est migré
ALTER TABLE biens ALTER COLUMN utilisateur_id SET NOT NULL;

-- Supprimer la table proprietaires (devenue inutile)
DROP TABLE IF EXISTS proprietaires CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✓ Table proprietaires supprimée';
END $$;

-- ============================================
-- ÉTAPE 6 : Créer des index pour optimiser les performances
-- ============================================

CREATE INDEX IF NOT EXISTS idx_biens_utilisateur_id ON biens(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_admin_prop_utilisateur_proprietaire ON administrateurs_proprietaire(utilisateur_proprietaire_id);

-- ============================================
-- ÉTAPE 7 : Politiques de sécurité RLS (Row Level Security)
-- ============================================

-- Activer RLS sur toutes les tables si pas déjà fait
ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE biens ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrats ENABLE ROW LEVEL SECURITY;
ALTER TABLE quittances ENABLE ROW LEVEL SECURITY;
ALTER TABLE etats_des_lieux ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE administrateurs_proprietaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations_locataires ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques "tout permis" (mode dev)
DROP POLICY IF EXISTS "Enable all for proprietaires" ON biens;
DROP POLICY IF EXISTS "Enable all for biens" ON biens;
DROP POLICY IF EXISTS "Enable all for sections" ON sections;
DROP POLICY IF EXISTS "Enable all for objets" ON objets;
DROP POLICY IF EXISTS "Enable all for etats_des_lieux" ON etats_des_lieux;

-- POLITIQUE : Utilisateurs (pour le moment, tout permis - à affiner plus tard)
DROP POLICY IF EXISTS "Tous peuvent voir les utilisateurs" ON utilisateurs;
CREATE POLICY "Tous peuvent voir les utilisateurs" ON utilisateurs
    FOR SELECT USING (true);

-- POLITIQUE : Biens - Accessible par propriétaire + administrateurs
DROP POLICY IF EXISTS "Accès biens par propriétaire et admins" ON biens;
CREATE POLICY "Accès biens par propriétaire et admins" ON biens
    FOR ALL USING (
        utilisateur_id = current_setting('app.current_user_id', true)::UUID
        OR EXISTS (
            SELECT 1 FROM administrateurs_proprietaire ap
            WHERE ap.utilisateur_proprietaire_id = biens.utilisateur_id
            AND ap.utilisateur_id = current_setting('app.current_user_id', true)::UUID
            AND ap.actif = true
        )
    );

-- POLITIQUE : Contrats - Accessible par propriétaire + admins + locataire concerné
DROP POLICY IF EXISTS "Accès contrats" ON contrats;
CREATE POLICY "Accès contrats" ON contrats
    FOR ALL USING (
        -- Propriétaire du bien
        EXISTS (
            SELECT 1 FROM biens b
            WHERE b.id = contrats.bien_id
            AND b.utilisateur_id = current_setting('app.current_user_id', true)::UUID
        )
        -- OU administrateur du propriétaire
        OR EXISTS (
            SELECT 1 FROM biens b
            JOIN administrateurs_proprietaire ap ON b.utilisateur_id = ap.utilisateur_proprietaire_id
            WHERE b.id = contrats.bien_id
            AND ap.utilisateur_id = current_setting('app.current_user_id', true)::UUID
            AND ap.actif = true
        )
        -- OU locataire du contrat
        OR contrats.locataire_user_id = current_setting('app.current_user_id', true)::UUID
    );

-- POLITIQUE : Quittances - Même logique que contrats
DROP POLICY IF EXISTS "Accès quittances" ON quittances;
CREATE POLICY "Accès quittances" ON quittances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contrats c
            JOIN biens b ON b.id = c.bien_id
            WHERE c.id = quittances.contrat_id
            AND (
                b.utilisateur_id = current_setting('app.current_user_id', true)::UUID
                OR EXISTS (
                    SELECT 1 FROM administrateurs_proprietaire ap
                    WHERE ap.utilisateur_proprietaire_id = b.utilisateur_id
                    AND ap.utilisateur_id = current_setting('app.current_user_id', true)::UUID
                    AND ap.actif = true
                )
                OR c.locataire_user_id = current_setting('app.current_user_id', true)::UUID
            )
        )
    );

-- POLITIQUE : États des lieux - Même logique
DROP POLICY IF EXISTS "Accès états des lieux" ON etats_des_lieux;
CREATE POLICY "Accès états des lieux" ON etats_des_lieux
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM biens b
            WHERE b.id = etats_des_lieux.bien_id
            AND (
                b.utilisateur_id = current_setting('app.current_user_id', true)::UUID
                OR EXISTS (
                    SELECT 1 FROM administrateurs_proprietaire ap
                    WHERE ap.utilisateur_proprietaire_id = b.utilisateur_id
                    AND ap.utilisateur_id = current_setting('app.current_user_id', true)::UUID
                    AND ap.actif = true
                )
            )
        )
        -- OU locataire si l'état des lieux est lié à son contrat
        OR EXISTS (
            SELECT 1 FROM contrats c
            WHERE c.id = etats_des_lieux.contrat_id
            AND c.locataire_user_id = current_setting('app.current_user_id', true)::UUID
        )
    );

-- POLITIQUE : Photos - Accessible par propriétaire + admins + locataire du bien
DROP POLICY IF EXISTS "Accès photos" ON photos;
CREATE POLICY "Accès photos" ON photos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM biens b
            WHERE b.id = photos.bien_id
            AND (
                b.utilisateur_id = current_setting('app.current_user_id', true)::UUID
                OR EXISTS (
                    SELECT 1 FROM administrateurs_proprietaire ap
                    WHERE ap.utilisateur_proprietaire_id = b.utilisateur_id
                    AND ap.utilisateur_id = current_setting('app.current_user_id', true)::UUID
                    AND ap.actif = true
                )
                OR EXISTS (
                    SELECT 1 FROM contrats c
                    WHERE c.bien_id = b.id
                    AND c.locataire_user_id = current_setting('app.current_user_id', true)::UUID
                    AND c.actif = true
                )
            )
        )
    );

-- POLITIQUE : Administrateurs - Seul le propriétaire peut gérer ses admins
DROP POLICY IF EXISTS "Gestion administrateurs" ON administrateurs_proprietaire;
CREATE POLICY "Gestion administrateurs" ON administrateurs_proprietaire
    FOR ALL USING (
        utilisateur_proprietaire_id = current_setting('app.current_user_id', true)::UUID
    );

-- POLITIQUE : Invitations locataires - Seul le propriétaire/admin du bien peut inviter
DROP POLICY IF EXISTS "Gestion invitations locataires" ON invitations_locataires;
CREATE POLICY "Gestion invitations locataires" ON invitations_locataires
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contrats c
            JOIN biens b ON b.id = c.bien_id
            WHERE c.id = invitations_locataires.contrat_id
            AND (
                b.utilisateur_id = current_setting('app.current_user_id', true)::UUID
                OR EXISTS (
                    SELECT 1 FROM administrateurs_proprietaire ap
                    WHERE ap.utilisateur_proprietaire_id = b.utilisateur_id
                    AND ap.utilisateur_id = current_setting('app.current_user_id', true)::UUID
                    AND ap.actif = true
                )
            )
        )
    );

-- ============================================
-- RÉSUMÉ DE LA MIGRATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Migration terminée avec succès !';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Modifications appliquées :';
    RAISE NOTICE '  ✓ biens.utilisateur_id créé et migré';
    RAISE NOTICE '  ✓ biens.proprietaire_id supprimé';
    RAISE NOTICE '  ✓ Table proprietaires supprimée';
    RAISE NOTICE '  ✓ administrateurs_proprietaire mis à jour';
    RAISE NOTICE '  ✓ Fonction get_biens_accessibles() mise à jour';
    RAISE NOTICE '  ✓ Politiques RLS configurées';
    RAISE NOTICE '';
    RAISE NOTICE 'Prochaines étapes :';
    RAISE NOTICE '  1. Adapter le code backend (api/auth.js, api/biens.js)';
    RAISE NOTICE '  2. Créer l''interface locataire';
    RAISE NOTICE '  3. Tester les accès par rôle';
    RAISE NOTICE '';
END $$;
