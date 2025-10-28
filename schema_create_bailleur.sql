-- Migration pour créer la table 'bailleurs' (informations du propriétaire/bailleur)

CREATE TABLE IF NOT EXISTS bailleurs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE CASCADE,

    -- Informations personnelles/société
    nom TEXT NOT NULL,
    prenom TEXT,

    -- Adresse
    adresse TEXT NOT NULL,
    code_postal TEXT NOT NULL,
    ville TEXT NOT NULL,

    -- Contact
    telephone TEXT,
    email TEXT,

    -- Informations légales
    siret TEXT,
    iban TEXT,

    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Un propriétaire ne peut avoir qu'un seul enregistrement bailleur
    UNIQUE(proprietaire_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_bailleurs_proprietaire ON bailleurs(proprietaire_id);

-- Commentaires
COMMENT ON TABLE bailleurs IS 'Stocke les informations du bailleur pour génération automatique dans les documents';
COMMENT ON COLUMN bailleurs.nom IS 'Nom de famille ou raison sociale';
COMMENT ON COLUMN bailleurs.prenom IS 'Prénom (si personne physique)';
COMMENT ON COLUMN bailleurs.siret IS 'Numéro SIRET si société';
COMMENT ON COLUMN bailleurs.iban IS 'IBAN pour les paiements';
