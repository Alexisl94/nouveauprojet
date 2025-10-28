-- Migration : Introduction de la notion de "Compte"
-- Un compte regroupe : biens, membres, informations bailleur

-- ============================================
-- ÉTAPE 1 : Créer la table comptes
-- ============================================

CREATE TABLE IF NOT EXISTS comptes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'particulier' CHECK (type IN ('particulier', 'professionnel', 'sci')),
    proprietaire_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actif BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_comptes_proprietaire ON comptes(proprietaire_id);
CREATE INDEX IF NOT EXISTS idx_comptes_actif ON comptes(actif);

COMMENT ON TABLE comptes IS 'Comptes/organisations gérant un patrimoine immobilier';
COMMENT ON COLUMN comptes.proprietaire_id IS 'Utilisateur créateur et propriétaire principal du compte';

-- ============================================
-- ÉTAPE 2 : Créer la table membres_compte
-- ============================================

CREATE TABLE IF NOT EXISTS membres_compte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compte_id UUID NOT NULL REFERENCES comptes(id) ON DELETE CASCADE,
    utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    role_compte VARCHAR(50) DEFAULT 'lecteur' CHECK (role_compte IN ('admin', 'gestionnaire', 'lecteur')),
    date_ajout TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actif BOOLEAN DEFAULT TRUE,
    UNIQUE(compte_id, utilisateur_id)
);

CREATE INDEX IF NOT EXISTS idx_membres_compte_compte ON membres_compte(compte_id);
CREATE INDEX IF NOT EXISTS idx_membres_compte_utilisateur ON membres_compte(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_membres_compte_actif ON membres_compte(actif);

COMMENT ON TABLE membres_compte IS 'Utilisateurs ayant accès à un compte (propriétaire + invités)';
COMMENT ON COLUMN membres_compte.role_compte IS 'Rôle dans le compte: admin (tout), gestionnaire (gérer), lecteur (voir)';

-- ============================================
-- ÉTAPE 3 : Modifier la table biens
-- ============================================

-- Ajouter la colonne compte_id
ALTER TABLE biens ADD COLUMN IF NOT EXISTS compte_id UUID REFERENCES comptes(id) ON DELETE CASCADE;

-- Pour les biens existants, créer un compte pour chaque utilisateur propriétaire
DO $$
DECLARE
    user_record RECORD;
    new_compte_id UUID;
BEGIN
    -- Pour chaque utilisateur qui possède des biens
    FOR user_record IN
        SELECT DISTINCT utilisateur_id, u.nom
        FROM biens b
        JOIN utilisateurs u ON u.id = b.utilisateur_id
        WHERE b.compte_id IS NULL
    LOOP
        -- Créer un compte pour cet utilisateur
        INSERT INTO comptes (nom, proprietaire_id)
        VALUES (
            'Patrimoine ' || user_record.nom,
            user_record.utilisateur_id
        )
        RETURNING id INTO new_compte_id;

        -- Migrer tous les biens de cet utilisateur vers ce compte
        UPDATE biens
        SET compte_id = new_compte_id
        WHERE utilisateur_id = user_record.utilisateur_id
        AND compte_id IS NULL;

        RAISE NOTICE 'Compte créé pour utilisateur % : %', user_record.nom, new_compte_id;
    END LOOP;
END $$;

-- Vérifier que tous les biens ont été migrés
DO $$
DECLARE
    biens_non_migres INTEGER;
BEGIN
    SELECT COUNT(*) INTO biens_non_migres
    FROM biens
    WHERE compte_id IS NULL;

    IF biens_non_migres > 0 THEN
        RAISE EXCEPTION 'Migration échouée: % biens n''ont pas été migrés vers un compte', biens_non_migres;
    ELSE
        RAISE NOTICE '✓ Tous les biens ont été migrés vers des comptes';
    END IF;
END $$;

-- Rendre compte_id obligatoire
ALTER TABLE biens ALTER COLUMN compte_id SET NOT NULL;

-- Supprimer l'ancienne colonne utilisateur_id (devenue inutile)
ALTER TABLE biens DROP COLUMN IF EXISTS utilisateur_id CASCADE;

CREATE INDEX IF NOT EXISTS idx_biens_compte ON biens(compte_id);

-- ============================================
-- ÉTAPE 4 : Créer/Migrer table informations_bailleur
-- ============================================

-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS informations_bailleur (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compte_id UUID REFERENCES comptes(id) ON DELETE CASCADE,
    nom VARCHAR(255),
    prenom VARCHAR(255),
    adresse TEXT,
    code_postal VARCHAR(10),
    ville VARCHAR(255),
    telephone VARCHAR(20),
    email VARCHAR(255),
    siret VARCHAR(14),
    iban VARCHAR(34),
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_modification TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrer si la table existait déjà avec une ancienne structure
DO $$
BEGIN
    -- Si la table a une colonne utilisateur_id, la migrer
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'informations_bailleur'
        AND column_name = 'utilisateur_id'
    ) THEN
        -- Ajouter compte_id si elle n'existe pas
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'informations_bailleur'
            AND column_name = 'compte_id'
        ) THEN
            ALTER TABLE informations_bailleur ADD COLUMN compte_id UUID REFERENCES comptes(id) ON DELETE CASCADE;
        END IF;

        -- Migrer les données : lier chaque info bailleur au compte du propriétaire
        UPDATE informations_bailleur ib
        SET compte_id = c.id
        FROM comptes c
        WHERE c.proprietaire_id = ib.utilisateur_id
        AND ib.compte_id IS NULL;

        -- Supprimer l'ancienne colonne
        ALTER TABLE informations_bailleur DROP COLUMN IF EXISTS utilisateur_id;
    END IF;

    -- Rendre compte_id unique (un seul bailleur par compte)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_compte_bailleur'
    ) THEN
        ALTER TABLE informations_bailleur ADD CONSTRAINT unique_compte_bailleur UNIQUE (compte_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_informations_bailleur_compte ON informations_bailleur(compte_id);

COMMENT ON COLUMN informations_bailleur.compte_id IS 'Compte associé à ces informations de bailleur';

-- ============================================
-- ÉTAPE 5 : Migrer administrateurs_proprietaire vers membres_compte
-- ============================================

-- Migrer les administrateurs existants
INSERT INTO membres_compte (compte_id, utilisateur_id, role_compte, actif)
SELECT c.id, ap.utilisateur_id, 'admin', ap.actif
FROM administrateurs_proprietaire ap
JOIN comptes c ON c.proprietaire_id = ap.utilisateur_proprietaire_id
ON CONFLICT (compte_id, utilisateur_id) DO NOTHING;

-- Ajouter aussi le propriétaire comme membre admin de son propre compte
INSERT INTO membres_compte (compte_id, utilisateur_id, role_compte, actif)
SELECT id, proprietaire_id, 'admin', TRUE
FROM comptes
ON CONFLICT (compte_id, utilisateur_id) DO NOTHING;

-- Supprimer l'ancienne table
DROP TABLE IF EXISTS administrateurs_proprietaire CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✓ Table administrateurs_proprietaire migrée vers membres_compte';
END $$;

-- ============================================
-- ÉTAPE 6 : Mettre à jour la fonction get_biens_accessibles
-- ============================================

DROP FUNCTION IF EXISTS get_biens_accessibles(UUID);

CREATE OR REPLACE FUNCTION get_biens_accessibles(p_utilisateur_id UUID)
RETURNS TABLE (
    bien_id UUID,
    compte_id UUID,
    est_proprietaire BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    -- Biens des comptes dont l'utilisateur est propriétaire
    SELECT b.id as bien_id, b.compte_id, TRUE as est_proprietaire
    FROM biens b
    JOIN comptes c ON c.id = b.compte_id
    WHERE c.proprietaire_id = p_utilisateur_id

    UNION

    -- Biens des comptes dont l'utilisateur est membre
    SELECT b.id as bien_id, b.compte_id, FALSE as est_proprietaire
    FROM biens b
    JOIN membres_compte mc ON mc.compte_id = b.compte_id
    WHERE mc.utilisateur_id = p_utilisateur_id
    AND mc.actif = TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_biens_accessibles IS 'Retourne tous les biens accessibles par un utilisateur (comptes propriétaire + membre)';

-- ============================================
-- ÉTAPE 7 : Fonction helper pour créer un compte complet
-- ============================================

CREATE OR REPLACE FUNCTION creer_compte_complet(
    p_utilisateur_id UUID,
    p_nom_compte VARCHAR,
    p_type_compte VARCHAR DEFAULT 'particulier'
)
RETURNS UUID AS $$
DECLARE
    v_compte_id UUID;
BEGIN
    -- Créer le compte
    INSERT INTO comptes (nom, type, proprietaire_id)
    VALUES (p_nom_compte, p_type_compte, p_utilisateur_id)
    RETURNING id INTO v_compte_id;

    -- Ajouter l'utilisateur comme membre admin
    INSERT INTO membres_compte (compte_id, utilisateur_id, role_compte)
    VALUES (v_compte_id, p_utilisateur_id, 'admin');

    RETURN v_compte_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION creer_compte_complet IS 'Crée un compte et ajoute le créateur comme membre admin';

-- ============================================
-- ÉTAPE 8 : Politiques RLS
-- ============================================

-- Activer RLS
ALTER TABLE comptes ENABLE ROW LEVEL SECURITY;
ALTER TABLE membres_compte ENABLE ROW LEVEL SECURITY;

-- Comptes : accessible par propriétaire + membres
DROP POLICY IF EXISTS "Accès comptes" ON comptes;
CREATE POLICY "Accès comptes" ON comptes FOR ALL USING (
    proprietaire_id = current_setting('app.current_user_id', true)::UUID
    OR EXISTS (
        SELECT 1 FROM membres_compte mc
        WHERE mc.compte_id = comptes.id
        AND mc.utilisateur_id = current_setting('app.current_user_id', true)::UUID
        AND mc.actif = true
    )
) WITH CHECK (
    proprietaire_id = current_setting('app.current_user_id', true)::UUID
);

-- Pour le développement, on met des politiques permissives temporairement
DROP POLICY IF EXISTS "Accès comptes permissif" ON comptes;
CREATE POLICY "Accès comptes permissif" ON comptes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Accès membres permissif" ON membres_compte;
CREATE POLICY "Accès membres permissif" ON membres_compte FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- RÉSUMÉ DE LA MIGRATION
-- ============================================

DO $$
DECLARE
    nb_comptes INTEGER;
    nb_membres INTEGER;
BEGIN
    SELECT COUNT(*) INTO nb_comptes FROM comptes;
    SELECT COUNT(*) INTO nb_membres FROM membres_compte;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Migration COMPTES terminée avec succès !';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Résumé :';
    RAISE NOTICE '  ✓ Table comptes créée : % comptes', nb_comptes;
    RAISE NOTICE '  ✓ Table membres_compte créée : % membres', nb_membres;
    RAISE NOTICE '  ✓ Biens migrés vers compte_id';
    RAISE NOTICE '  ✓ Informations bailleur liées aux comptes';
    RAISE NOTICE '  ✓ Administrateurs migrés vers membres_compte';
    RAISE NOTICE '  ✓ Fonction get_biens_accessibles() mise à jour';
    RAISE NOTICE '';
    RAISE NOTICE 'Prochaines étapes :';
    RAISE NOTICE '  1. Adapter le backend (API)';
    RAISE NOTICE '  2. Créer le flow d''onboarding';
    RAISE NOTICE '  3. Tester l''inscription complète';
    RAISE NOTICE '';
END $$;
