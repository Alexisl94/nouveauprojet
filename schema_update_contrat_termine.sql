-- Migration pour ajouter le champ 'termine' à la table contrats
-- Ce champ permet de distinguer les contrats actifs archivés des contrats terminés

-- Ajouter le champ termine (false par défaut = contrat en cours)
ALTER TABLE contrats
ADD COLUMN IF NOT EXISTS termine BOOLEAN DEFAULT false;

-- Les contrats actuellement marqués comme non actifs sont considérés comme terminés
UPDATE contrats
SET termine = true
WHERE actif = false;

-- Les contrats actuellement actifs ne sont pas terminés
UPDATE contrats
SET termine = false
WHERE actif = true;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_contrats_termine ON contrats(termine);

-- COMMENT:
-- Maintenant la logique est:
-- - actif = true, archive = false, termine = false -> Contrat en cours, affiché dans "Contrat en cours"
-- - actif = true, archive = true, termine = false -> Contrat en cours (bien occupé), archivé dans "Documents"
-- - actif = false, archive = true, termine = true -> Contrat terminé (bien disponible), archivé dans "Documents"
