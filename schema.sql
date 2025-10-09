-- Schéma de base de données pour Supabase
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Table des propriétaires
CREATE TABLE IF NOT EXISTS proprietaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    nom TEXT NOT NULL,
    mot_de_passe TEXT NOT NULL,
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des biens immobiliers
CREATE TABLE IF NOT EXISTS biens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    adresse TEXT,
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des sections
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bien_id UUID NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    ordre INTEGER DEFAULT 0
);

-- Table des objets (items dans un bien)
CREATE TABLE IF NOT EXISTS objets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bien_id UUID NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
    nom TEXT NOT NULL,
    description TEXT,
    ordre INTEGER DEFAULT 0
);

-- Table des états des lieux
CREATE TABLE IF NOT EXISTS etats_des_lieux (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bien_id UUID NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('entree', 'sortie')),
    locataire TEXT,
    etat_entree_id UUID REFERENCES etats_des_lieux(id) ON DELETE SET NULL,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des objets dans un état des lieux (snapshot des objets)
CREATE TABLE IF NOT EXISTS objets_etat_des_lieux (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etat_des_lieux_id UUID NOT NULL REFERENCES etats_des_lieux(id) ON DELETE CASCADE,
    objet_id UUID NOT NULL, -- Référence l'ID de l'objet original
    section_id UUID, -- Section au moment de l'état des lieux
    nom TEXT NOT NULL,
    description TEXT,
    entree BOOLEAN DEFAULT FALSE,
    sortie BOOLEAN DEFAULT FALSE,
    note INTEGER DEFAULT 0,
    commentaires TEXT,
    ordre INTEGER DEFAULT 0
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_biens_proprietaire_id ON biens(proprietaire_id);
CREATE INDEX IF NOT EXISTS idx_sections_bien_id ON sections(bien_id);
CREATE INDEX IF NOT EXISTS idx_objets_bien_id ON objets(bien_id);
CREATE INDEX IF NOT EXISTS idx_objets_section_id ON objets(section_id);
CREATE INDEX IF NOT EXISTS idx_etats_des_lieux_bien_id ON etats_des_lieux(bien_id);
CREATE INDEX IF NOT EXISTS idx_objets_etat_des_lieux_etat_id ON objets_etat_des_lieux(etat_des_lieux_id);

-- Activer Row Level Security (RLS)
ALTER TABLE proprietaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE biens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE objets ENABLE ROW LEVEL SECURITY;
ALTER TABLE etats_des_lieux ENABLE ROW LEVEL SECURITY;
ALTER TABLE objets_etat_des_lieux ENABLE ROW LEVEL SECURITY;

-- Politiques RLS (à adapter selon vos besoins d'authentification)
-- Pour l'instant, on permet tout en mode développement
CREATE POLICY "Enable all for proprietaires" ON proprietaires FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for biens" ON biens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for sections" ON sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for objets" ON objets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for etats_des_lieux" ON etats_des_lieux FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for objets_etat_des_lieux" ON objets_etat_des_lieux FOR ALL USING (true) WITH CHECK (true);
