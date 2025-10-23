-- Table des quittances de loyer
CREATE TABLE IF NOT EXISTS quittances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrat_id UUID NOT NULL REFERENCES contrats(id) ON DELETE CASCADE,
    bien_id UUID NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
    mois INTEGER NOT NULL CHECK (mois >= 1 AND mois <= 12),
    annee INTEGER NOT NULL,
    montant_loyer DECIMAL(10, 2) NOT NULL,
    montant_charges DECIMAL(10, 2) DEFAULT 0,
    montant_total DECIMAL(10, 2) NOT NULL,
    date_paiement DATE,
    mode_paiement TEXT DEFAULT 'Virement bancaire',
    observations TEXT,
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contrat_id, mois, annee)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_quittances_contrat_id ON quittances(contrat_id);
CREATE INDEX IF NOT EXISTS idx_quittances_bien_id ON quittances(bien_id);
CREATE INDEX IF NOT EXISTS idx_quittances_annee_mois ON quittances(annee, mois);

-- Activer Row Level Security
ALTER TABLE quittances ENABLE ROW LEVEL SECURITY;

-- Politique RLS
CREATE POLICY "Enable all for quittances" ON quittances FOR ALL USING (true) WITH CHECK (true);
