-- Création de la table des utilisateurs
-- À exécuter en PREMIER dans Supabase SQL Editor

-- Table des utilisateurs de l'application
CREATE TABLE IF NOT EXISTS utilisateurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nom VARCHAR(255),
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dernier_login TIMESTAMP WITH TIME ZONE,
    actif BOOLEAN DEFAULT TRUE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON utilisateurs(email);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_actif ON utilisateurs(actif);

-- Commentaires
COMMENT ON TABLE utilisateurs IS 'Utilisateurs de l''application (propriétaires et futurs locataires)';
COMMENT ON COLUMN utilisateurs.email IS 'Email unique de connexion';
COMMENT ON COLUMN utilisateurs.nom IS 'Nom complet de l''utilisateur';
COMMENT ON COLUMN utilisateurs.mot_de_passe_hash IS 'Hash bcrypt du mot de passe';
