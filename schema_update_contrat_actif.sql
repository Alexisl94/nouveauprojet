-- Ajouter un champ pour marquer le contrat actif
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT false;

-- Index pour trouver rapidement le contrat actif
CREATE INDEX IF NOT EXISTS idx_contrats_actif ON contrats(bien_id, actif) WHERE actif = true;
