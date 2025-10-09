# Configuration du Storage Supabase pour les Photos

## Étapes à suivre

### 1. Créer le bucket de stockage

1. Allez sur https://supabase.com/dashboard/project/fyzfrhtxxtzrpkxznhvu/storage/buckets
2. Cliquez sur **"New bucket"**
3. Configurez le bucket :
   - **Name:** `photos-biens`
   - **Public bucket:** ✅ Coché (pour permettre l'accès public aux photos)
   - Cliquez sur **Create bucket**

### 2. Configurer les politiques de stockage

Par défaut, le bucket aura des restrictions. Pour permettre l'upload et la lecture :

1. Allez dans **Storage** > **Policies**
2. Pour le bucket `photos-biens`, ajoutez ces politiques :

**Politique de lecture (SELECT):**
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos-biens');
```

**Politique d'upload (INSERT):**
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'photos-biens');
```

**Politique de suppression (DELETE):**
```sql
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'photos-biens');
```

### 3. Exécuter le script SQL

Exécutez le fichier `schema_update.sql` dans l'éditeur SQL de Supabase pour créer les tables `photos` et `contrats`.

### 4. Vérifier la configuration

Une fois configuré :
- Les photos seront accessibles via : `https://fyzfrhtxxtzrpkxznhvu.supabase.co/storage/v1/object/public/photos-biens/{filename}`
- Les uploads se feront via l'API Supabase Storage

## Structure des données

### Table photos
- `id` : UUID unique
- `bien_id` : Référence au bien
- `url` : URL de la photo dans Supabase Storage
- `legende` : Description de la photo (optionnel)
- `ordre` : Ordre d'affichage
- `cree_le` : Date de création

### Table contrats
- `id` : UUID unique
- `bien_id` : Référence au bien
- `type` : Type de contrat
- Données du locataire (nom, prénom, adresse)
- Données financières (loyer, charges, dépôt)
- `donnees_json` : Toutes les variables du contrat
- `pdf_url` : URL du PDF généré
