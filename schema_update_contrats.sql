-- Migration pour ajouter les nouveaux champs à la table contrats
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Ajouter les nouvelles colonnes si elles n'existent pas
ALTER TABLE contrats
ADD COLUMN IF NOT EXISTS email_locataire TEXT,
ADD COLUMN IF NOT EXISTS numero_chambre TEXT;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_contrats_bien_id ON contrats(bien_id);
CREATE INDEX IF NOT EXISTS idx_contrats_actif ON contrats(actif);
