-- Fix : Permettre l'inscription des utilisateurs
-- Les politiques RLS bloquaient l'insertion de nouveaux utilisateurs

-- Supprimer la politique trop restrictive
DROP POLICY IF EXISTS "Tous peuvent voir les utilisateurs" ON utilisateurs;

-- Politique pour permettre l'inscription (INSERT)
CREATE POLICY "Permettre l'inscription" ON utilisateurs
    FOR INSERT WITH CHECK (true);

-- Politique pour permettre la lecture (SELECT)
CREATE POLICY "Lecture utilisateurs" ON utilisateurs
    FOR SELECT USING (true);

-- Politique pour permettre la mise à jour de son propre profil (UPDATE)
CREATE POLICY "Mise à jour profil" ON utilisateurs
    FOR UPDATE USING (
        id = current_setting('app.current_user_id', true)::UUID
    );

-- Pour les autres tables, on va temporairement mettre des politiques permissives
-- (on les affinera plus tard avec un vrai système d'authentification)

DROP POLICY IF EXISTS "Accès biens par propriétaire et admins" ON biens;
CREATE POLICY "Accès biens permissif" ON biens FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Accès contrats" ON contrats;
CREATE POLICY "Accès contrats permissif" ON contrats FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Accès quittances" ON quittances;
CREATE POLICY "Accès quittances permissif" ON quittances FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Accès états des lieux" ON etats_des_lieux;
CREATE POLICY "Accès états des lieux permissif" ON etats_des_lieux FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Accès photos" ON photos;
CREATE POLICY "Accès photos permissif" ON photos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gestion administrateurs" ON administrateurs_proprietaire;
CREATE POLICY "Accès administrateurs permissif" ON administrateurs_proprietaire FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gestion invitations locataires" ON invitations_locataires;
CREATE POLICY "Accès invitations permissif" ON invitations_locataires FOR ALL USING (true) WITH CHECK (true);

-- Pour les sections et objets aussi
CREATE POLICY "Accès sections permissif" ON sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès objets permissif" ON objets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès objets_etat_des_lieux permissif" ON objets_etat_des_lieux FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
    RAISE NOTICE '✓ Politiques RLS corrigées - inscription possible';
    RAISE NOTICE 'Note: Les politiques sont permissives pour le développement';
    RAISE NOTICE 'Elles seront affinées plus tard avec un vrai middleware d''auth';
END $$;
