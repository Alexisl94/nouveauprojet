# Implémentation Photos et Contrats - Suite

## ✅ Ce qui est déjà fait

1. **Schémas SQL créés** (`schema_update.sql`)
   - Table `photos`
   - Table `contrats`

2. **APIs créées**
   - `api/photos.js` : CRUD pour les photos
   - `api/contrats.js` : CRUD + génération PDF pour les contrats

3. **Routes ajoutées** dans `server.js`
   - GET/POST/DELETE pour photos
   - GET/POST/DELETE + PDF pour contrats

## 📝 Ce qui reste à faire

### 1. Ajouter l'interface dans index.html

Après la ligne `</div>` qui ferme `#etats-realises-container`, ajouter :

```html
<!-- Section Photos -->
<div class="photos-section">
    <div class="section-header-with-action">
        <h3>📸 Photos du bien</h3>
        <button id="add-photo-btn" class="btn-primary">+ Ajouter une photo</button>
    </div>
    <div id="photos-container" class="photos-grid"></div>
</div>

<!-- Section Contrats -->
<div class="contrats-section">
    <div class="section-header-with-action">
        <h3>📄 Contrats</h3>
        <button id="create-contrat-btn" class="btn-success">+ Créer un contrat</button>
    </div>
    <div id="contrats-container" class="contrats-list"></div>
</div>

<!-- Modal pour ajouter une photo -->
<div id="photo-modal" class="modal hidden">
    <div class="modal-content">
        <h3>Ajouter une photo</h3>

        <div class="photo-upload-zone" id="photo-drop-zone">
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Glissez une photo ici ou cliquez pour choisir</p>
            <input type="file" id="photo-file-input" accept="image/*" hidden>
        </div>

        <button id="photo-camera-btn" class="btn-secondary">
            <i class="fas fa-camera"></i> Prendre une photo
        </button>

        <input type="text" id="photo-legende" placeholder="Légende (optionnel)">

        <div id="photo-preview"></div>

        <div class="modal-actions">
            <button id="upload-photo-btn" class="btn-primary" disabled>Uploader</button>
            <button class="close-modal btn-secondary">Annuler</button>
        </div>
    </div>
</div>

<!-- Modal pour créer un contrat -->
<div id="contrat-modal" class="modal hidden">
    <div class="modal-content modal-large">
        <h3>Créer un contrat de bail</h3>

        <div class="form-grid">
            <div class="form-group">
                <label>Nom du locataire *</label>
                <input type="text" id="contrat-nom" required>
            </div>

            <div class="form-group">
                <label>Prénom du locataire *</label>
                <input type="text" id="contrat-prenom" required>
            </div>

            <div class="form-group full-width">
                <label>Adresse du locataire</label>
                <input type="text" id="contrat-adresse-locataire">
            </div>

            <div class="form-group">
                <label>Date de début</label>
                <input type="date" id="contrat-date-debut">
            </div>

            <div class="form-group">
                <label>Date de fin</label>
                <input type="date" id="contrat-date-fin">
            </div>

            <div class="form-group">
                <label>Loyer mensuel (€)</label>
                <input type="number" id="contrat-loyer" step="0.01">
            </div>

            <div class="form-group">
                <label>Charges (€)</label>
                <input type="number" id="contrat-charges" step="0.01">
            </div>

            <div class="form-group">
                <label>Dépôt de garantie (€)</label>
                <input type="number" id="contrat-depot" step="0.01">
            </div>
        </div>

        <div class="modal-actions">
            <button id="save-contrat-btn" class="btn-primary">Créer le contrat</button>
            <button class="close-modal btn-secondary">Annuler</button>
        </div>
    </div>
</div>
```

### 2. Ajouter les styles dans styles.css

```css
/* Photos Section */
.photos-section,
.contrats-section {
    background: var(--card-bg);
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 24px;
    border: 1px solid var(--border-color);
}

.section-header-with-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.section-header-with-action h3 {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
}

.photos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
}

.photo-card {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border-color);
    background: var(--card-bg);
}

.photo-card img {
    width: 100%;
    height: 200px;
    object-fit: cover;
}

.photo-card-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
}

.photo-legende {
    padding: 12px;
    font-size: 0.875rem;
    color: var(--text-mid);
}

.photo-upload-zone {
    border: 2px dashed var(--border-color);
    border-radius: 8px;
    padding: 40px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 16px;
}

.photo-upload-zone:hover {
    border-color: var(--primary-color);
    background: var(--hover-bg);
}

.photo-upload-zone i {
    font-size: 48px;
    color: var(--text-light);
    margin-bottom: 12px;
}

#photo-preview {
    margin: 16px 0;
}

#photo-preview img {
    max-width: 100%;
    border-radius: 8px;
}

/* Contrats */
.contrats-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.contrat-card {
    background: var(--card-bg);
    padding: 16px 20px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.contrat-info {
    flex: 1;
}

.contrat-info h4 {
    margin: 0 0 8px 0;
    font-size: 0.9375rem;
}

.contrat-details {
    font-size: 0.8125rem;
    color: var(--text-light);
}

.modal-large .modal-content {
    max-width: 700px;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
}

.form-group.full-width {
    grid-column: 1 / -1;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-dark);
}

.form-group input {
    width: 100%;
}
```

### 3. Code JavaScript à ajouter dans app.js

Le code est trop long pour être inclus ici. Voici les fonctions principales à implémenter :

**Initialisation des boutons:**
```javascript
document.getElementById('add-photo-btn').addEventListener('click', openPhotoModal);
document.getElementById('create-contrat-btn').addEventListener('click', openContratModal);
```

**Fonctions photos:**
- `loadPhotos()` - Charger les photos
- `openPhotoModal()` - Ouvrir la modal
- `handlePhotoUpload()` - Upload vers Supabase Storage
- `deletePhoto(photoId)` - Supprimer une photo

**Fonctions contrats:**
- `loadContrats()` - Charger les contrats
- `openContratModal()` - Ouvrir le formulaire
- `saveContrat()` - Créer un contrat
- `downloadContratPDF(contratId)` - Télécharger le PDF

### 4. Upload vers Supabase Storage (côté client)

Utilisez directement le client Supabase pour uploader :

```javascript
// Upload dans public/upload.js
import { supabase } from '../lib/supabase.js';

async function uploadPhotoToStorage(file) {
    const fileName = `${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
        .from('photos-biens')
        .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from('photos-biens')
        .getPublicUrl(fileName);

    return publicUrl;
}
```

## 🔄 Prochaines étapes

1. Redémarrez le serveur
2. Testez l'upload de photos
3. Testez la création de contrats
4. Vérifiez que les PDFs se génèrent correctement

Besoin d'aide pour l'implémentation complète du JavaScript ? Dites-le moi!
