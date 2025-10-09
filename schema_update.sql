-- Mise à jour du schéma pour ajouter Photos et Contrats
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Table des photos de biens
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bien_id UUID NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    legende TEXT,
    ordre INTEGER DEFAULT 0,
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des contrats
CREATE TABLE IF NOT EXISTS contrats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bien_id UUID NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'bail', 'etat_lieux_entree', 'etat_lieux_sortie', etc.
    nom_locataire TEXT NOT NULL,
    prenom_locataire TEXT NOT NULL,
    adresse_locataire TEXT,
    date_debut DATE,
    date_fin DATE,
    loyer DECIMAL(10,2),
    charges DECIMAL(10,2),
    depot_garantie DECIMAL(10,2),
    donnees_json JSONB, -- Stocke toutes les variables du contrat
    pdf_url TEXT, -- URL du PDF généré
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_photos_bien_id ON photos(bien_id);
CREATE INDEX IF NOT EXISTS idx_contrats_bien_id ON contrats(bien_id);

-- Activer Row Level Security (RLS)
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrats ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Enable all for photos" ON photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for contrats" ON contrats FOR ALL USING (true) WITH CHECK (true);

-- Créer un bucket de stockage pour les photos (à exécuter manuellement dans l'interface Supabase Storage)
-- Nom du bucket: 'photos-biens'
-- Public: true
