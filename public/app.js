// État de l'application
let currentUser = null;
let currentBienId = null;
let currentBien = null;
let editingBienId = null;
let currentEtatId = null;
let currentEtat = null;

// Flags pour drag & drop
let sectionDragEventsSetup = false;
let objetDragEventsSetup = false;

// Éléments DOM
const authSection = document.getElementById('auth-section');
const biensSection = document.getElementById('biens-section');
const bienDetailSection = document.getElementById('bien-detail-section');
const etatsListSection = document.getElementById('etats-list-section');
const etatDetailSection = document.getElementById('etat-detail-section');
const messageDiv = document.getElementById('message');
const loadingDiv = document.getElementById('loading');

// Authentification
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');
const userNameSpan = document.getElementById('user-name');

// Biens
const addBienBtn = document.getElementById('add-bien-btn');
const bienModal = document.getElementById('bien-modal');
const saveBienBtn = document.getElementById('save-bien-btn');
const biensList = document.getElementById('biens-list');
const editBienModal = document.getElementById('edit-bien-modal');
const updateBienBtn = document.getElementById('update-bien-btn');

// Détails du bien
const backBtn = document.getElementById('back-btn');
const addObjetBtn = document.getElementById('add-objet-btn');
const addSectionBtn = document.getElementById('add-section-btn');
const generatePdfBtn = document.getElementById('generate-pdf-btn');
const etatContainer = document.getElementById('etat-container');
const sectionModal = document.getElementById('section-modal');
const saveSectionBtn = document.getElementById('save-section-btn');
const objetModal = document.getElementById('objet-modal');
const saveObjetBtn = document.getElementById('save-objet-btn');
const demarrerEtatBtn = document.getElementById('demarrer-etat-btn');

// États des lieux
const demarrerEtatModal = document.getElementById('demarrer-etat-modal');
const etatTypeSelect = document.getElementById('etat-type');
const etatEntreeSelector = document.getElementById('etat-entree-selector');
const etatEntreeIdSelect = document.getElementById('etat-entree-id');
const startEtatBtn = document.getElementById('start-etat-btn');
const backFromEtatBtn = document.getElementById('back-from-etat-btn');
const generateEtatPdfBtn = document.getElementById('generate-etat-pdf-btn');
const terminerEtatBtn = document.getElementById('terminer-etat-btn');
const creerEtatSortieBtn = document.getElementById('creer-etat-sortie-btn');

// Fonctions utilitaires
function showMessage(text, type = 'success') {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');
    setTimeout(() => messageDiv.classList.add('hidden'), 3000);
}

function showLoading() {
    loadingDiv.classList.remove('hidden');
}

function hideLoading() {
    loadingDiv.classList.add('hidden');
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', closeModals);
});

// Authentification
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const motDePasse = document.getElementById('login-password').value;

    showLoading();
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, motDePasse })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erreur de connexion');

        currentUser = data.proprietaire;
        showBiensSection();
        showMessage('Connexion réussie !');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nom = document.getElementById('register-nom').value;
    const email = document.getElementById('register-email').value;
    const motDePasse = document.getElementById('register-password').value;

    showLoading();
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, email, motDePasse })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erreur d\'inscription');

        currentUser = data.proprietaire;
        showBiensSection();
        showMessage('Inscription réussie !');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
});

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    authSection.classList.remove('hidden');
    biensSection.classList.add('hidden');
    bienDetailSection.classList.add('hidden');
    loginForm.reset();
    registerForm.reset();
});

function showBiensSection() {
    authSection.classList.add('hidden');
    biensSection.classList.remove('hidden');
    bienDetailSection.classList.add('hidden');
    userNameSpan.textContent = currentUser.nom;
    loadBiens();
}

// Gestion des biens
addBienBtn.addEventListener('click', () => {
    bienModal.classList.remove('hidden');
    document.getElementById('bien-nom').value = '';
    document.getElementById('bien-adresse').value = '';
});

saveBienBtn.addEventListener('click', async () => {
    const nom = document.getElementById('bien-nom').value.trim();
    const adresse = document.getElementById('bien-adresse').value.trim();

    if (!nom) {
        showMessage('Veuillez entrer un nom de bien', 'error');
        return;
    }

    showLoading();
    try {
        const response = await fetch('/api/biens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proprietaireId: currentUser.id, nom, adresse })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        closeModals();
        loadBiens();
        showMessage('Bien créé !');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
});

async function loadBiens() {
    showLoading();
    try {
        const response = await fetch(`/api/biens?proprietaireId=${currentUser.id}`);
        const data = await response.json();
        displayBiens(data.biens);
    } catch (error) {
        showMessage('Erreur de chargement des biens', 'error');
    } finally {
        hideLoading();
    }
}

function displayBiens(biens) {
    biensList.innerHTML = '';

    if (biens.length === 0) {
        biensList.innerHTML = '<p class="empty-state">Aucun bien. Créez-en un pour commencer.</p>';
        return;
    }

    biens.forEach(bien => {
        const div = document.createElement('div');
        div.className = 'item-card';
        div.innerHTML = `
            <h3>${bien.nom}</h3>
            <p>${bien.adresse || 'Pas d\'adresse renseignée'}</p>
            <small>${bien.objets ? bien.objets.length : 0} élément(s)</small>
            <div class="item-actions">
                <button onclick="openBienDetail('${bien.id}')" class="btn-primary">Gérer</button>
                <button onclick="editBien('${bien.id}', '${bien.nom.replace(/'/g, "\\'")}', '${(bien.adresse || '').replace(/'/g, "\\'")}')" class="btn-secondary" title="Modifier"><i class="fas fa-edit"></i></button>
                <button onclick="duplicateBien('${bien.id}')" class="btn-secondary" title="Dupliquer"><i class="fas fa-clone"></i></button>
                <button onclick="deleteBien('${bien.id}')" class="btn-danger" title="Supprimer"><i class="fas fa-trash"></i></button>
            </div>
        `;
        biensList.appendChild(div);
    });
}

window.editBien = (id, nom, adresse) => {
    editingBienId = id;
    document.getElementById('edit-bien-nom').value = nom;
    document.getElementById('edit-bien-adresse').value = adresse;
    editBienModal.classList.remove('hidden');
};

updateBienBtn.addEventListener('click', async () => {
    const nom = document.getElementById('edit-bien-nom').value.trim();
    const adresse = document.getElementById('edit-bien-adresse').value.trim();

    if (!nom) {
        showMessage('Veuillez entrer un nom de bien', 'error');
        return;
    }

    showLoading();
    try {
        const response = await fetch(`/api/biens/${editingBienId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, adresse })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        closeModals();
        loadBiens();
        showMessage('Bien modifié !');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
});

window.duplicateBien = async (id) => {
    if (!confirm('Dupliquer ce bien avec tous ses éléments ?')) return;

    showLoading();
    try {
        const response = await fetch(`/api/biens/${id}/duplicate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erreur de duplication');

        loadBiens();
        showMessage('Bien dupliqué !');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteBien = async (id) => {
    if (!confirm('Supprimer ce bien et tous ses éléments ?')) return;

    showLoading();
    try {
        const response = await fetch(`/api/biens/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Erreur de suppression');
        loadBiens();
        showMessage('Bien supprimé');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// Détails du bien
window.openBienDetail = async (bienId) => {
    currentBienId = bienId;

    // Réinitialiser les flags de drag & drop
    sectionDragEventsSetup = false;
    objetDragEventsSetup = false;

    showLoading();
    try {
        const response = await fetch(`/api/biens/${bienId}`);
        const data = await response.json();
        currentBien = data.bien;

        document.getElementById('bien-name').textContent = currentBien.nom;
        document.getElementById('bien-adresse-display').textContent = currentBien.adresse || 'Non renseignée';

        biensSection.classList.add('hidden');
        etatsListSection.classList.add('hidden');
        etatDetailSection.classList.add('hidden');
        bienDetailSection.classList.remove('hidden');

        // Charger le contrat actif, les documents archivés et les photos
        await displayContratActif();
        await displayDocuments();
        await loadPhotos();

        displayEtatTable();
    } catch (error) {
        showMessage('Erreur de chargement', 'error');
    } finally {
        hideLoading();
    }
};

backBtn.addEventListener('click', () => {
    bienDetailSection.classList.add('hidden');
    biensSection.classList.remove('hidden');
    currentBienId = null;
    currentBien = null;
});

// Afficher le contrat actif
async function displayContratActif() {
    const container = document.getElementById('contrat-actif-container');
    container.innerHTML = '';

    try {
        const response = await fetch(`/api/biens/${currentBienId}/contrats`);
        const data = await response.json();
        const contrats = data.contrats || [];

        const contratActif = contrats.find(c => c.actif);

        if (!contratActif) {
            container.innerHTML = '<div class="contrat-actif-empty">Aucun contrat en cours</div>';
            return;
        }

        const dateDebut = contratActif.date_debut ? new Date(contratActif.date_debut).toLocaleDateString('fr-FR') : 'Non définie';
        const dateFin = contratActif.date_fin ? new Date(contratActif.date_fin).toLocaleDateString('fr-FR') : 'Non définie';

        const card = document.createElement('div');
        card.className = 'contrat-actif-card';
        card.innerHTML = `
            <h4>${contratActif.prenom_locataire} ${contratActif.nom_locataire}</h4>
            <div class="contrat-actif-info">
                <div class="contrat-actif-info-item">
                    <div class="contrat-actif-info-label">Période</div>
                    <div class="contrat-actif-info-value">${dateDebut} - ${dateFin}</div>
                </div>
                <div class="contrat-actif-info-item">
                    <div class="contrat-actif-info-label">Loyer</div>
                    <div class="contrat-actif-info-value">${contratActif.loyer ? contratActif.loyer + '€' : 'Non défini'}</div>
                </div>
                <div class="contrat-actif-info-item">
                    <div class="contrat-actif-info-label">Charges</div>
                    <div class="contrat-actif-info-value">${contratActif.charges ? contratActif.charges + '€' : 'Non définies'}</div>
                </div>
                <div class="contrat-actif-info-item">
                    <div class="contrat-actif-info-label">Dépôt de garantie</div>
                    <div class="contrat-actif-info-value">${contratActif.depot_garantie ? contratActif.depot_garantie + '€' : 'Non défini'}</div>
                </div>
            </div>
            <div class="contrat-actif-actions">
                <button onclick="downloadContratPDF('${contratActif.id}')">
                    <i class="fas fa-download"></i> Télécharger PDF
                </button>
                <button onclick="archiverContrat('${contratActif.id}')">
                    <i class="fas fa-archive"></i> Archiver
                </button>
            </div>
        `;
        container.appendChild(card);
    } catch (error) {
        console.error('Erreur lors du chargement du contrat actif:', error);
        container.innerHTML = '<div class="contrat-actif-empty">Erreur de chargement</div>';
    }
}

// Afficher les documents archivés (états des lieux + anciens contrats)
async function displayDocuments() {
    const container = document.getElementById('documents-container');
    container.innerHTML = '';

    try {
        // Charger les états des lieux
        const etatsResponse = await fetch(`/api/biens/${currentBienId}/etats-des-lieux`);
        const etatsData = await etatsResponse.json();
        const etats = etatsData.etatsDesLieux || [];

        // Charger les contrats
        const contratsResponse = await fetch(`/api/biens/${currentBienId}/contrats`);
        const contratsData = await contratsResponse.json();
        const contrats = contratsData.contrats || [];

        // Ne garder que les contrats archivés (non actifs)
        const contratsArchives = contrats.filter(c => !c.actif);

        // Afficher message si aucun document
        if (etats.length === 0 && contratsArchives.length === 0) {
            container.innerHTML = '<div class="documents-empty">Aucun document archivé</div>';
            return;
        }

        // Afficher les états des lieux
        etats.forEach(etat => {
            const card = document.createElement('div');
            card.className = `document-card etat-${etat.type}`;
            card.onclick = () => openEtatDetail(etat.id);

            const typeIcon = etat.type === 'entree' ? '📥' : '📤';
            const typeLabel = etat.type === 'entree' ? 'État entrée' : 'État sortie';
            const date = new Date(etat.dateCreation).toLocaleDateString('fr-FR');

            card.innerHTML = `
                <div class="document-icon">${typeIcon}</div>
                <div class="document-title">${typeLabel}</div>
                <div class="document-subtitle">${etat.locataire || 'Sans locataire'}</div>
                <div class="document-date">${date}</div>
                <div class="document-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); generateEtatPdf('${etat.id}')" title="PDF">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); deleteEtat('${etat.id}')" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(card);
        });

        // Afficher les contrats archivés
        contratsArchives.forEach(contrat => {
            const card = document.createElement('div');
            card.className = 'document-card contrat';
            card.onclick = () => downloadContratPDF(contrat.id);

            const date = contrat.date_debut ? new Date(contrat.date_debut).toLocaleDateString('fr-FR') : '';

            card.innerHTML = `
                <div class="document-icon">📄</div>
                <div class="document-title">Contrat</div>
                <div class="document-subtitle">${contrat.prenom_locataire} ${contrat.nom_locataire}</div>
                <div class="document-date">${date}</div>
                <div class="document-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); deleteContrat(${contrat.id})" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des documents:', error);
        container.innerHTML = '<div class="documents-empty">Erreur de chargement</div>';
    }
}

// Changer la vue de l'explorateur
document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const view = this.dataset.view;
        const container = document.getElementById('documents-container');

        // Mettre à jour les boutons actifs
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        // Changer la vue
        container.classList.remove('view-grid', 'view-list');
        container.classList.add(`view-${view}`);
    });
});

// Gestion des sections
let editingSectionId = null;

addSectionBtn.addEventListener('click', () => {
    editingSectionId = null;
    sectionModal.classList.remove('hidden');
    document.getElementById('section-nom').value = '';
    saveSectionBtn.textContent = 'Créer';
});

saveSectionBtn.addEventListener('click', async () => {
    const nom = document.getElementById('section-nom').value.trim();

    if (!nom) {
        showMessage('Veuillez entrer un nom de section', 'error');
        return;
    }

    showLoading();
    try {
        let response;
        if (editingSectionId) {
            // Mode modification
            response = await fetch(`/api/biens/${currentBienId}/sections/${editingSectionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom })
            });
        } else {
            // Mode création
            response = await fetch('/api/biens/sections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bienId: currentBienId, nom })
            });
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        closeModals();
        await openBienDetail(currentBienId);
        showMessage(editingSectionId ? 'Section modifiée !' : 'Section ajoutée !');
        editingSectionId = null;
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
});

// Gestion des objets
addObjetBtn.addEventListener('click', () => {
    // Remplir le select des sections
    const objetSectionSelect = document.getElementById('objet-section');
    objetSectionSelect.innerHTML = '<option value="">Sans section</option>';

    if (currentBien.sections) {
        currentBien.sections
            .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
            .forEach(section => {
                const option = document.createElement('option');
                option.value = section.id;
                option.textContent = section.nom;
                objetSectionSelect.appendChild(option);
            });
    }

    objetModal.classList.remove('hidden');
    document.getElementById('objet-nom').value = '';
    document.getElementById('objet-description').value = '';
});

saveObjetBtn.addEventListener('click', async () => {
    const nom = document.getElementById('objet-nom').value.trim();
    const description = document.getElementById('objet-description').value.trim();
    let sectionId = document.getElementById('objet-section').value || null;

    if (!nom) {
        showMessage('Veuillez entrer un nom d\'élément', 'error');
        return;
    }

    showLoading();
    try {
        // Si aucune section n'est sélectionnée et qu'il n'y a pas de sections existantes, créer une section par défaut
        if (!sectionId && (!currentBien.sections || currentBien.sections.length === 0)) {
            console.log('Création de la section "Chambre" par défaut');
            const sectionResponse = await fetch(`/api/biens/sections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bienId: currentBienId, nom: 'Chambre' })
            });

            const sectionData = await sectionResponse.json();
            if (sectionResponse.ok) {
                sectionId = sectionData.section.id;
                console.log('Section créée avec ID:', sectionId);
            } else {
                console.error('Erreur création section:', sectionData);
            }
        } else if (!sectionId) {
            console.log('Objet créé sans section (sections existantes trouvées)');
        }

        const response = await fetch(`/api/biens/${currentBienId}/objets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bienId: currentBienId, nom, description, sectionId })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        closeModals();
        await openBienDetail(currentBienId);
        showMessage('Élément ajouté !');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
});

function displayEtatTable() {
    const container = document.getElementById('etat-container');
    container.innerHTML = '';

    const sections = (currentBien.sections || []).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const objets = (currentBien.objets || []).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

    // Objets sans section
    const objetsSansSection = objets.filter(o => !o.sectionId);

    // Si aucun élément et aucune section, afficher message vide
    if (sections.length === 0 && objets.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucun élément. Ajoutez des sections et des éléments pour créer l\'état des lieux.</p>';
        return;
    }

    // Afficher la section "Sans section" uniquement s'il y a des objets sans section
    if (objetsSansSection.length > 0) {
        const sansSection = document.createElement('div');
        sansSection.className = 'section-container section-sans-section';
        sansSection.dataset.sectionId = 'null';

        // Créer les boutons pour gérer les objets sans section
        let actionButtons = '';
        if (sections.length > 0) {
            actionButtons = `
                <div class="section-actions">
                    <button onclick="assignerTousObjetsASection()" class="btn-icon" title="Assigner à une section"><i class="fas fa-arrow-right"></i></button>
                </div>
            `;
        }

        sansSection.innerHTML = `
            <div class="section-header">
                <h4 class="section-title">📦 Sans section</h4>
                <small style="color: var(--text-light); font-size: 0.8125rem; margin-left: 8px;">Assignez ces éléments à une section</small>
                ${actionButtons}
            </div>
        `;

        const table = createObjetTable(objetsSansSection);
        sansSection.appendChild(table);
        container.appendChild(sansSection);
    }

    // Afficher les sections avec leurs objets
    sections.forEach(section => {
        const objetsSection = objets.filter(o => o.sectionId === section.id);

        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section-container';
        sectionDiv.dataset.sectionId = section.id;
        sectionDiv.draggable = true;

        sectionDiv.innerHTML = `
            <div class="section-header">
                <i class="fas fa-grip-vertical drag-handle"></i>
                <h4 class="section-title">${section.nom}</h4>
                <div class="section-actions">
                    <button onclick="editSection('${section.id}', '${section.nom.replace(/'/g, "\\'")}')" class="btn-icon" title="Modifier"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteSection('${section.id}')" class="btn-icon" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;

        const table = createObjetTable(objetsSection);
        sectionDiv.appendChild(table);

        container.appendChild(sectionDiv);

        // Drag and drop pour les sections
        setupSectionDragAndDrop(sectionDiv);
    });

    // Setup global drag events
    setupGlobalSectionDragEvents();
    setupGlobalObjetDragEvents();
}

function createObjetTable(objets) {
    const table = document.createElement('table');
    table.className = 'etat-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th style="width: 30px;"></th>
                <th>Élément</th>
                <th>Note (1-5)</th>
                <th>Commentaires</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    objets.forEach(objet => {
        const row = document.createElement('tr');
        row.dataset.objetId = objet.id;
        row.innerHTML = `
            <td class="drag-handle-cell"><i class="fas fa-grip-vertical drag-handle"></i></td>
            <td>
                <strong>${objet.nom}</strong>
                ${objet.description ? `<br><small>${objet.description}</small>` : ''}
            </td>
            <td>
                <select onchange="updateObjet('${objet.id}', 'note', parseInt(this.value))">
                    <option value="0" ${objet.note === 0 ? 'selected' : ''}>-</option>
                    <option value="1" ${objet.note === 1 ? 'selected' : ''}>⭐</option>
                    <option value="2" ${objet.note === 2 ? 'selected' : ''}>⭐⭐</option>
                    <option value="3" ${objet.note === 3 ? 'selected' : ''}>⭐⭐⭐</option>
                    <option value="4" ${objet.note === 4 ? 'selected' : ''}>⭐⭐⭐⭐</option>
                    <option value="5" ${objet.note === 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐</option>
                </select>
            </td>
            <td>
                <input type="text" value="${objet.commentaires || ''}"
                       placeholder="Commentaires..."
                       onchange="updateObjet('${objet.id}', 'commentaires', this.value)">
            </td>
            <td>
                <button onclick="deleteObjet('${objet.id}')" class="btn-icon" title="Supprimer"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);

        // Drag and drop pour les objets
        setupObjetDragAndDrop(row);
    });

    return table;
}

// Drag and drop pour les sections
let draggedSection = null;

function setupSectionDragAndDrop(sectionDiv) {
    const handle = sectionDiv.querySelector('.section-header .drag-handle');
    if (!handle) return;

    sectionDiv.draggable = false;

    handle.addEventListener('mousedown', () => {
        sectionDiv.draggable = true;
    });

    document.addEventListener('mouseup', () => {
        sectionDiv.draggable = false;
    });

    sectionDiv.addEventListener('dragstart', (e) => {
        draggedSection = sectionDiv;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => sectionDiv.classList.add('dragging'), 0);
    });

    sectionDiv.addEventListener('dragend', async () => {
        sectionDiv.classList.remove('dragging');
        sectionDiv.draggable = false;
        if (draggedSection) {
            await saveSectionOrder();
            draggedSection = null;
        }
    });
}

// Setup global dragover et drop pour les sections
function setupGlobalSectionDragEvents() {
    if (sectionDragEventsSetup) return;

    const container = document.getElementById('etat-container');

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedSection) return;

        const afterElement = getDragAfterElement(container, e.clientY, '.section-container:not(.dragging)');
        if (afterElement == null) {
            container.appendChild(draggedSection);
        } else {
            container.insertBefore(draggedSection, afterElement);
        }
    });

    sectionDragEventsSetup = true;
}

// Drag and drop pour les objets
let draggedObjet = null;

function setupObjetDragAndDrop(row) {
    const handle = row.querySelector('.drag-handle');
    if (!handle) return;

    row.draggable = false;

    handle.addEventListener('mousedown', () => {
        row.draggable = true;
    });

    document.addEventListener('mouseup', () => {
        row.draggable = false;
    });

    row.addEventListener('dragstart', (e) => {
        draggedObjet = row;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => row.classList.add('dragging'), 0);
    });

    row.addEventListener('dragend', async () => {
        row.classList.remove('dragging');
        row.draggable = false;
        if (draggedObjet) {
            console.log('🎯 Drop terminé, sauvegarde...');
            await saveObjetOrderAndSection();
            draggedObjet = null;
        }
    });
}

// Setup global dragover pour les objets (appelé une seule fois au chargement du bien)
function setupGlobalObjetDragEvents() {
    if (objetDragEventsSetup) return;

    const container = document.getElementById('etat-container');
    let lastTargetSection = null;

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedObjet) return;

        // Trouver la section la plus proche en remontant depuis l'élément cible
        let element = e.target;
        let sectionContainer = null;

        while (element && element !== container) {
            if (element.classList && element.classList.contains('section-container')) {
                sectionContainer = element;
                break;
            }
            element = element.parentElement;
        }

        if (!sectionContainer) return;

        // Trouver le tbody dans cette section
        const target = sectionContainer.querySelector('tbody');
        if (!target) return;

        // Ajouter un indicateur visuel sur la section cible
        if (lastTargetSection !== sectionContainer) {
            document.querySelectorAll('.section-container').forEach(s => s.classList.remove('drag-target'));
            sectionContainer.classList.add('drag-target');
            lastTargetSection = sectionContainer;
        }

        const afterElement = getDragAfterElement(target, e.clientY, 'tr:not(.dragging)');
        if (afterElement == null) {
            target.appendChild(draggedObjet);
        } else {
            target.insertBefore(draggedObjet, afterElement);
        }
    });

    container.addEventListener('drop', () => {
        // Nettoyer les indicateurs visuels après le drop
        document.querySelectorAll('.section-container').forEach(s => s.classList.remove('drag-target'));
        lastTargetSection = null;
    });

    container.addEventListener('dragleave', (e) => {
        // Ne nettoyer que si on quitte vraiment le container
        const relatedTarget = e.relatedTarget;
        if (!relatedTarget || !container.contains(relatedTarget)) {
            document.querySelectorAll('.section-container').forEach(s => s.classList.remove('drag-target'));
            lastTargetSection = null;
        }
    });

    objetDragEventsSetup = true;
}

function getDragAfterElement(container, y, selector) {
    const draggableElements = [...container.querySelectorAll(`${selector}:not(.dragging)`)];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function saveSectionOrder() {
    const container = document.getElementById('etat-container');
    const sections = [...container.querySelectorAll('.section-container[data-section-id]')]
        .filter(div => div.dataset.sectionId !== 'null') // Exclure la section virtuelle "Sans section"
        .map((div, index) => ({
            id: div.dataset.sectionId,
            ordre: index
        }));

    try {
        await fetch(`/api/biens/${currentBienId}/reorganiser`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sections })
        });
    } catch (error) {
        showMessage('Erreur lors de la réorganisation', 'error');
    }
}

async function saveObjetOrderAndSection() {
    const container = document.getElementById('etat-container');
    const objets = [];

    console.log('💾 Sauvegarde de l\'ordre et des sections...');

    // Parcourir toutes les sections
    container.querySelectorAll('.section-container').forEach(sectionDiv => {
        const sectionId = sectionDiv.dataset.sectionId === 'null' ? null : sectionDiv.dataset.sectionId;
        const tbody = sectionDiv.querySelector('tbody');

        if (tbody) {
            const rows = [...tbody.querySelectorAll('tr[data-objet-id]')];
            rows.forEach(row => {
                const objetData = {
                    id: row.dataset.objetId,
                    sectionId: sectionId,
                    ordre: objets.length // Ordre global
                };
                console.log('  - Objet:', row.dataset.objetId, 'dans section:', sectionId);
                objets.push(objetData);
            });
        }
    });

    console.log('📦 Total objets à sauvegarder:', objets.length);

    try {
        const response = await fetch(`/api/biens/${currentBienId}/reorganiser`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ objets })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Erreur lors de la sauvegarde:', data);
            showMessage('Erreur lors de la réorganisation', 'error');
            return;
        }

        console.log('✅ Sauvegarde réussie ! Les changements ont été enregistrés.');
    } catch (error) {
        console.error('❌ Erreur:', error);
        showMessage('Erreur lors de la réorganisation', 'error');
    }
}

window.updateObjet = async (objetId, field, value) => {
    try {
        const body = {
            bienId: currentBienId,
            objetId,
            [field]: value
        };

        const response = await fetch(`/api/biens/${currentBienId}/objets/${objetId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error('Erreur de mise à jour');

        // Mettre à jour l'objet localement
        const objet = currentBien.objets.find(o => o.id === objetId);
        if (objet) objet[field] = value;
    } catch (error) {
        showMessage(error.message, 'error');
    }
};

window.deleteObjet = async (objetId) => {
    if (!confirm('Supprimer cet élément ?')) return;

    showLoading();
    try {
        const response = await fetch(`/api/biens/${currentBienId}/objets/${objetId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Erreur de suppression');

        await openBienDetail(currentBienId);
        showMessage('Élément supprimé');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.editSection = (sectionId, nom) => {
    editingSectionId = sectionId;
    document.getElementById('section-nom').value = nom;
    sectionModal.classList.remove('hidden');
    saveSectionBtn.textContent = 'Modifier';
};

window.deleteSection = async (sectionId) => {
    if (!confirm('Supprimer cette section ? Les éléments seront déplacés dans "Sans section".')) return;

    showLoading();
    try {
        const response = await fetch(`/api/biens/${currentBienId}/sections/${sectionId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Erreur de suppression');

        await openBienDetail(currentBienId);
        showMessage('Section supprimée');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
};

generatePdfBtn.addEventListener('click', () => {
    window.open(`/api/pdf/${currentBienId}`, '_blank');
});

// ===== GESTION DES ÉTATS DES LIEUX =====

// Démarrer un nouvel état des lieux
demarrerEtatBtn.addEventListener('click', () => {
    openDemarrerEtatModal();
});

async function openDemarrerEtatModal() {
    // Charger les états d'entrée existants
    try {
        const response = await fetch(`/api/biens/${currentBienId}/etats-des-lieux`);
        const data = await response.json();

        const etatsEntree = data.etatsDesLieux.filter(e => e.type === 'entree');

        // Remplir le select des états d'entrée
        etatEntreeIdSelect.innerHTML = '';
        if (etatsEntree.length === 0) {
            etatEntreeIdSelect.innerHTML = '<option>Aucun état d\'entrée disponible</option>';
        } else {
            etatsEntree.forEach(etat => {
                const option = document.createElement('option');
                option.value = etat.id;
                const date = new Date(etat.dateCreation).toLocaleDateString('fr-FR');
                option.textContent = `${etat.locataire || 'Sans locataire'} - ${date}`;
                etatEntreeIdSelect.appendChild(option);
            });
        }

        // Réinitialiser le formulaire
        etatTypeSelect.value = 'entree';
        etatEntreeSelector.classList.add('hidden');
        document.getElementById('etat-locataire').value = '';

        demarrerEtatModal.classList.remove('hidden');
    } catch (error) {
        showMessage('Erreur de chargement', 'error');
    }
}

// Changer le type d'état
etatTypeSelect.addEventListener('change', () => {
    if (etatTypeSelect.value === 'sortie') {
        etatEntreeSelector.classList.remove('hidden');
    } else {
        etatEntreeSelector.classList.add('hidden');
    }
});

// Démarrer l'état des lieux
startEtatBtn.addEventListener('click', async () => {
    const type = etatTypeSelect.value;
    const locataire = document.getElementById('etat-locataire').value.trim();
    let etatEntreeId = null;

    if (type === 'sortie') {
        etatEntreeId = etatEntreeIdSelect.value;
        if (!etatEntreeId || etatEntreeId === 'Aucun état d\'entrée disponible') {
            showMessage('Veuillez sélectionner un état d\'entrée', 'error');
            return;
        }
    }

    showLoading();
    try {
        const response = await fetch('/api/etats-des-lieux', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bienId: currentBienId, type, locataire, etatEntreeId })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        closeModals();
        showMessage('État des lieux créé !');

        // Ouvrir directement l'état des lieux créé
        await openEtatDetail(data.etatDesLieux.id);
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
});

// Ouvrir un état des lieux
window.openEtatDetail = async (etatId) => {
    currentEtatId = etatId;
    showLoading();
    try {
        const response = await fetch(`/api/biens/${currentBienId}/etats-des-lieux/${etatId}`);
        const data = await response.json();
        currentEtat = data.etatDesLieux;

        const typeLabel = currentEtat.type === 'entree' ? 'État d\'entrée' : 'État de sortie';
        document.getElementById('etat-title').textContent = `${typeLabel} - ${currentEtat.locataire || 'Sans locataire'}`;
        document.getElementById('etat-type-display').textContent = typeLabel;
        document.getElementById('etat-locataire-display').textContent = currentEtat.locataire || 'Non renseigné';
        document.getElementById('etat-date-display').textContent = new Date(currentEtat.dateCreation).toLocaleString('fr-FR');

        // Afficher le bouton "Créer état de sortie" seulement si c'est un état d'entrée
        if (currentEtat.type === 'entree') {
            creerEtatSortieBtn.classList.remove('hidden');
        } else {
            creerEtatSortieBtn.classList.add('hidden');
        }

        bienDetailSection.classList.add('hidden');
        etatsListSection.classList.add('hidden');
        etatDetailSection.classList.remove('hidden');

        displayEtatDetail();
    } catch (error) {
        showMessage('Erreur de chargement', 'error');
    } finally {
        hideLoading();
    }
};

// Afficher le détail de l'état des lieux
function displayEtatDetail() {
    const container = document.getElementById('etat-detail-container');
    container.innerHTML = '';

    const sections = (currentEtat.sections || []).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const objets = (currentEtat.objets || []).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

    const objetsSansSection = objets.filter(o => !o.section_id);

    if (sections.length === 0 && objets.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucun élément dans cet état des lieux.</p>';
        return;
    }

    // N'afficher "Sans section" que s'il y a des objets sans section
    if (objetsSansSection.length > 0) {
        const sansSection = document.createElement('div');
        sansSection.className = 'section-container section-sans-section';
        sansSection.innerHTML = `<h4 class="section-title">Sans section</h4>`;

        const table1 = createEtatObjetTable(objetsSansSection);
        sansSection.appendChild(table1);
        container.appendChild(sansSection);
    }

    // Afficher les sections
    sections.forEach(section => {
        const objetsSection = objets.filter(o => o.section_id === section.id);

        if (objetsSection.length > 0) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'section-container';
            sectionDiv.innerHTML = `<h4 class="section-title">${section.nom}</h4>`;

            const table = createEtatObjetTable(objetsSection);
            sectionDiv.appendChild(table);

            container.appendChild(sectionDiv);
        }
    });
}

function createEtatObjetTable(objets) {
    const table = document.createElement('table');
    table.className = 'etat-table';

    const isEtatSortie = currentEtat && currentEtat.type === 'sortie';

    if (isEtatSortie) {
        // Pour un état de sortie : colonnes entrée + sortie
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Élément</th>
                    <th>Note (1-5) entrée</th>
                    <th>Commentaires entrée</th>
                    <th>Note (1-5) sortie</th>
                    <th>Commentaires sortie</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        objets.forEach(objet => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <strong>${objet.nom}</strong>
                    ${objet.description ? `<br><small>${objet.description}</small>` : ''}
                </td>
                <td>
                    <select disabled>
                        <option value="0" ${objet.note === 0 ? 'selected' : ''}>-</option>
                        <option value="1" ${objet.note === 1 ? 'selected' : ''}>⭐</option>
                        <option value="2" ${objet.note === 2 ? 'selected' : ''}>⭐⭐</option>
                        <option value="3" ${objet.note === 3 ? 'selected' : ''}>⭐⭐⭐</option>
                        <option value="4" ${objet.note === 4 ? 'selected' : ''}>⭐⭐⭐⭐</option>
                        <option value="5" ${objet.note === 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐</option>
                    </select>
                </td>
                <td>
                    <input type="text" value="${objet.commentaires || ''}" disabled
                           placeholder="Commentaires entrée...">
                </td>
                <td>
                    <select onchange="updateEtatObjet('${objet.id}', 'noteSortie', parseInt(this.value))">
                        <option value="0" ${(objet.noteSortie === 0 || !objet.noteSortie) ? 'selected' : ''}>-</option>
                        <option value="1" ${objet.noteSortie === 1 ? 'selected' : ''}>⭐</option>
                        <option value="2" ${objet.noteSortie === 2 ? 'selected' : ''}>⭐⭐</option>
                        <option value="3" ${objet.noteSortie === 3 ? 'selected' : ''}>⭐⭐⭐</option>
                        <option value="4" ${objet.noteSortie === 4 ? 'selected' : ''}>⭐⭐⭐⭐</option>
                        <option value="5" ${objet.noteSortie === 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐</option>
                    </select>
                </td>
                <td>
                    <input type="text" value="${objet.commentairesSortie || ''}"
                           placeholder="Commentaires sortie..."
                           onchange="updateEtatObjet('${objet.id}', 'commentairesSortie', this.value)">
                </td>
            `;
            tbody.appendChild(row);
        });
    } else {
        // Pour un état d'entrée : colonnes simples
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Élément</th>
                    <th>Note (1-5)</th>
                    <th>Commentaires</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        objets.forEach(objet => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <strong>${objet.nom}</strong>
                    ${objet.description ? `<br><small>${objet.description}</small>` : ''}
                </td>
                <td>
                    <select onchange="updateEtatObjet('${objet.id}', 'note', parseInt(this.value))">
                        <option value="0" ${objet.note === 0 ? 'selected' : ''}>-</option>
                        <option value="1" ${objet.note === 1 ? 'selected' : ''}>⭐</option>
                        <option value="2" ${objet.note === 2 ? 'selected' : ''}>⭐⭐</option>
                        <option value="3" ${objet.note === 3 ? 'selected' : ''}>⭐⭐⭐</option>
                        <option value="4" ${objet.note === 4 ? 'selected' : ''}>⭐⭐⭐⭐</option>
                        <option value="5" ${objet.note === 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐</option>
                    </select>
                </td>
                <td>
                    <input type="text" value="${objet.commentaires || ''}"
                           placeholder="Commentaires..."
                           onchange="updateEtatObjet('${objet.id}', 'commentaires', this.value)">
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    return table;
}

// Mettre à jour un objet dans un état des lieux
window.updateEtatObjet = async (objetId, field, value) => {
    try {
        const body = { [field]: value };

        const response = await fetch(`/api/biens/${currentBienId}/etats-des-lieux/${currentEtatId}/objets/${objetId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error('Erreur de mise à jour');

        // Mettre à jour localement
        const objet = currentEtat.objets.find(o => o.id === objetId);
        if (objet) objet[field] = value;
    } catch (error) {
        showMessage(error.message, 'error');
    }
};

// Supprimer un état des lieux
window.deleteEtat = async (etatId) => {
    if (!confirm('Supprimer cet état des lieux ?')) return;

    showLoading();
    try {
        const response = await fetch(`/api/biens/${currentBienId}/etats-des-lieux/${etatId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erreur de suppression');

        // Recharger les documents
        await displayDocuments();
        showMessage('État des lieux supprimé');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// Retour depuis la consultation d'un état
backFromEtatBtn.addEventListener('click', () => {
    etatDetailSection.classList.add('hidden');
    openBienDetail(currentBienId);
    currentEtatId = null;
    currentEtat = null;
});

// Bouton Terminer dans un état des lieux
terminerEtatBtn.addEventListener('click', () => {
    etatDetailSection.classList.add('hidden');
    openBienDetail(currentBienId);
    currentEtatId = null;
    currentEtat = null;
    showMessage('État des lieux terminé !');
});

// Générer le PDF de l'état en cours de consultation
generateEtatPdfBtn.addEventListener('click', () => {
    if (currentEtatId) {
        window.open(`/api/pdf/etat/${currentEtatId}`, '_blank');
    }
});

// Générer le PDF d'un état des lieux (depuis la liste)
window.generateEtatPdf = (etatId) => {
    window.open(`/api/pdf/etat/${etatId}`, '_blank');
};

// Créer l'état de sortie depuis un état d'entrée
creerEtatSortieBtn.addEventListener('click', async () => {
    if (!currentEtat || currentEtat.type !== 'entree') {
        showMessage('Impossible de créer un état de sortie', 'error');
        return;
    }

    const locataire = prompt('Nom du locataire (optionnel) :', currentEtat.locataire || '');

    showLoading();
    try {
        const response = await fetch('/api/etats-des-lieux', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bienId: currentBienId,
                type: 'sortie',
                locataire: locataire || currentEtat.locataire,
                etatEntreeId: currentEtatId
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showMessage('État de sortie créé !');

        // Ouvrir directement l'état de sortie créé
        await openEtatDetail(data.etatDesLieux.id);
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
});

// ==================== PHOTOS ====================
let selectedPhotoFile = null;

const addPhotoBtn = document.getElementById('add-photo-btn');
const photoModal = document.getElementById('photo-modal');
const photoDropZone = document.getElementById('photo-drop-zone');
const photoFileInput = document.getElementById('photo-file-input');
const photoCameraBtn = document.getElementById('photo-camera-btn');
const photoLegendeInput = document.getElementById('photo-legende');
const photoPreview = document.getElementById('photo-preview');
const uploadPhotoBtn = document.getElementById('upload-photo-btn');
const photosContainer = document.getElementById('photos-container');

// Charger les photos d'un bien
async function loadPhotos() {
    if (!currentBienId) return;

    try {
        const response = await fetch(`/api/biens/${currentBienId}/photos`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        photosContainer.innerHTML = '';

        if (data.photos.length === 0) {
            photosContainer.innerHTML = '<p class="empty-state">Aucune photo ajoutée.</p>';
            return;
        }

        data.photos.forEach(photo => {
            const photoCard = document.createElement('div');
            photoCard.className = 'photo-card';
            photoCard.innerHTML = `
                <img src="${photo.url}" alt="${photo.legende || 'Photo du bien'}">
                <div class="photo-card-actions">
                    <button class="btn-icon" onclick="deletePhoto(${photo.id})" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${photo.legende ? `<div class="photo-legende">${photo.legende}</div>` : ''}
            `;
            photosContainer.appendChild(photoCard);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des photos:', error);
        showMessage('Erreur lors du chargement des photos', 'error');
    }
}

// Ouvrir la modal photo
addPhotoBtn.addEventListener('click', () => {
    photoModal.classList.remove('hidden');
    selectedPhotoFile = null;
    photoPreview.innerHTML = '';
    photoLegendeInput.value = '';
    uploadPhotoBtn.disabled = true;
});

// Drag & drop zone
photoDropZone.addEventListener('click', () => {
    photoFileInput.click();
});

photoDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    photoDropZone.style.borderColor = 'var(--primary-color)';
});

photoDropZone.addEventListener('dragleave', () => {
    photoDropZone.style.borderColor = 'var(--border-color)';
});

photoDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    photoDropZone.style.borderColor = 'var(--border-color)';

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        handlePhotoSelect(files[0]);
    }
});

photoFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handlePhotoSelect(e.target.files[0]);
    }
});

// Gérer la sélection de photo
function handlePhotoSelect(file) {
    selectedPhotoFile = file;

    // Afficher la preview
    const reader = new FileReader();
    reader.onload = (e) => {
        photoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);

    uploadPhotoBtn.disabled = false;
}

// Prendre une photo avec la caméra
photoCameraBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });

        // Créer un élément vidéo pour la caméra
        photoPreview.innerHTML = `
            <video id="camera-stream" autoplay style="max-width: 100%; border-radius: 8px;"></video>
            <button id="capture-photo-btn" class="btn-primary" style="margin-top: 12px;">📸 Capturer</button>
        `;

        const video = document.getElementById('camera-stream');
        video.srcObject = stream;

        document.getElementById('capture-photo-btn').addEventListener('click', () => {
            // Créer un canvas pour capturer l'image
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);

            // Convertir en blob
            canvas.toBlob((blob) => {
                selectedPhotoFile = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

                // Afficher la preview
                photoPreview.innerHTML = `<img src="${canvas.toDataURL()}" alt="Preview">`;
                uploadPhotoBtn.disabled = false;

                // Arrêter le stream
                stream.getTracks().forEach(track => track.stop());
            }, 'image/jpeg');
        });
    } catch (error) {
        console.error('Erreur caméra:', error);
        showMessage('Impossible d\'accéder à la caméra', 'error');
    }
});

// Upload de la photo
uploadPhotoBtn.addEventListener('click', async () => {
    if (!selectedPhotoFile) return;

    showLoading();
    try {
        // Upload vers Supabase Storage via le serveur
        const formData = new FormData();
        formData.append('photo', selectedPhotoFile);

        const uploadResponse = await fetch('/api/upload/photo', {
            method: 'POST',
            body: formData
        });

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error || 'Erreur lors de l\'upload');

        // Enregistrer dans la base de données
        const response = await fetch(`/api/biens/${currentBienId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bienId: currentBienId,
                url: uploadData.url,
                legende: photoLegendeInput.value
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showMessage('Photo ajoutée avec succès !');
        closeModals();
        await loadPhotos();
    } catch (error) {
        console.error('Erreur:', error);
        showMessage(error.message || 'Erreur lors de l\'ajout de la photo', 'error');
    } finally {
        hideLoading();
    }
});

// Supprimer une photo
window.deletePhoto = async (photoId) => {
    if (!confirm('Supprimer cette photo ?')) return;

    showLoading();
    try {
        const response = await fetch(`/api/photos/${photoId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showMessage('Photo supprimée');
        await loadPhotos();
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Erreur lors de la suppression', 'error');
    } finally {
        hideLoading();
    }
};

// ==================== CONTRATS ====================
const createContratBtn = document.getElementById('create-contrat-btn');
const contratModal = document.getElementById('contrat-modal');
const saveContratBtn = document.getElementById('save-contrat-btn');

// Ouvrir la modal contrat
createContratBtn.addEventListener('click', () => {
    contratModal.classList.remove('hidden');
    document.getElementById('contrat-nom').value = '';
    document.getElementById('contrat-prenom').value = '';
    document.getElementById('contrat-adresse-locataire').value = '';
    document.getElementById('contrat-date-debut').value = '';
    document.getElementById('contrat-date-fin').value = '';
    document.getElementById('contrat-loyer').value = '';
    document.getElementById('contrat-charges').value = '';
    document.getElementById('contrat-depot').value = '';
});

// Créer un contrat
saveContratBtn.addEventListener('click', async () => {
    const nom = document.getElementById('contrat-nom').value;
    const prenom = document.getElementById('contrat-prenom').value;

    if (!nom || !prenom) {
        showMessage('Nom et prénom requis', 'error');
        return;
    }

    showLoading();
    try {
        const response = await fetch(`/api/biens/${currentBienId}/contrats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bienId: currentBienId,
                type: 'bail',
                nomLocataire: nom,
                prenomLocataire: prenom,
                adresseLocataire: document.getElementById('contrat-adresse-locataire').value,
                dateDebut: document.getElementById('contrat-date-debut').value,
                dateFin: document.getElementById('contrat-date-fin').value,
                loyer: parseFloat(document.getElementById('contrat-loyer').value) || null,
                charges: parseFloat(document.getElementById('contrat-charges').value) || null,
                depotGarantie: parseFloat(document.getElementById('contrat-depot').value) || null
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showMessage('Contrat créé avec succès !');
        closeModals();
        await displayContratActif();
        await displayDocuments();
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Erreur lors de la création du contrat', 'error');
    } finally {
        hideLoading();
    }
});

// Télécharger le PDF d'un contrat (généré côté client avec jsPDF)
window.downloadContratPDF = async (contratId) => {
    try {
        showLoading();

        // Récupérer les données du contrat
        const response = await fetch(`/api/biens/${currentBienId}/contrats`);
        const data = await response.json();
        const contrat = data.contrats.find(c => c.id === contratId);

        if (!contrat) {
            showMessage('Contrat non trouvé', 'error');
            return;
        }

        // Récupérer les infos du bien et propriétaire
        const bienResponse = await fetch(`/api/biens/${currentBienId}`);
        const bienData = await bienResponse.json();
        const bien = bienData.bien;
        const proprietaire = bienData.bien.proprietaires;

        // Générer le PDF avec jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let y = 20;

        // Titre
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('CONTRAT DE LOCATION TYPE', pageWidth / 2, y, { align: 'center' });
        y += 10;

        // Sous-titre
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const sousTitre = '(Soumis au titre Ier bis de la loi du 6 juillet 1989...)';
        doc.text(sousTitre, pageWidth / 2, y, { align: 'center' });
        y += 15;

        // I. DÉSIGNATION DES PARTIES
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('I. DÉSIGNATION DES PARTIES', margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Bailleur', margin, y);
        doc.text('Locataire', pageWidth / 2 + 10, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.text(proprietaire?.nom || 'Non renseigné', margin, y);
        doc.text(`${contrat.prenom_locataire} ${contrat.nom_locataire}`, pageWidth / 2 + 10, y);
        y += 5;
        doc.text(proprietaire?.email || 'Non renseigné', margin, y);
        doc.text(contrat.adresse_locataire || 'Non renseignée', pageWidth / 2 + 10, y);
        y += 12;

        // II. OBJET DU CONTRAT
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('II. OBJET DU CONTRAT', margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.text('A. Consistance du logement', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Désignation : ${bien.nom || 'Non renseigné'}`, margin, y);
        y += 5;
        doc.text(`Adresse : ${bien.adresse || 'Non renseignée'}`, margin, y);
        y += 5;
        doc.text('Type d\'habitat : Logement individuel', margin, y);
        y += 5;
        doc.text('Régime juridique : Location vide', margin, y);
        y += 10;

        doc.setFont('helvetica', 'bold');
        doc.text('B. Destination des locaux', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text('Usage d\'habitation exclusive (résidence principale du locataire)', margin, y);
        y += 15;

        // III. DATE DE PRISE D'EFFET ET DURÉE
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('III. DATE DE PRISE D\'EFFET ET DURÉE', margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const dateDebut = contrat.date_debut ? new Date(contrat.date_debut).toLocaleDateString('fr-FR') : 'Non définie';
        const dateFin = contrat.date_fin ? new Date(contrat.date_fin).toLocaleDateString('fr-FR') : 'Non définie';
        doc.text(`Prise d'effet : ${dateDebut}`, margin, y);
        doc.text(`Fin d'effet : ${dateFin}`, pageWidth / 2 + 10, y);
        y += 6;

        // Calculer la durée
        let duree = 'Non définie';
        if (contrat.date_debut && contrat.date_fin) {
            const debut = new Date(contrat.date_debut);
            const fin = new Date(contrat.date_fin);
            const mois = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth());
            duree = `${mois} mois`;
        }
        doc.text(`Durée du contrat : ${duree}`, margin, y);
        y += 8;

        doc.setFontSize(9);
        doc.text('Le locataire peut résilier à tout moment avec un préavis d\'un mois.', margin, y);
        y += 12;

        // IV. CONDITIONS FINANCIÈRES
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('IV. CONDITIONS FINANCIÈRES', margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.text('A. Loyer', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Montant mensuel : ${contrat.loyer ? contrat.loyer + ' €' : 'Non défini'}`, margin, y);
        y += 5;
        if (contrat.charges) {
            doc.text(`Charges : ${contrat.charges} €`, margin, y);
            y += 5;
        }
        y += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('B. Modalités de paiement', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text('• Méthode : Virement bancaire', margin + 5, y);
        y += 5;
        doc.text('• Date de paiement : Le 1er du mois', margin + 5, y);
        y += 5;
        doc.text(`• Charges incluses : ${contrat.charges ? 'Oui' : 'Non'}`, margin + 5, y);
        y += 12;

        // V. TRAVAUX
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('V. TRAVAUX', margin, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Le locataire s\'engage à ne pas réaliser de travaux sans accord écrit préalable du bailleur.', margin, y);
        y += 12;

        // VI. GARANTIES
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('VI. GARANTIES', margin, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Dépôt de garantie : ${contrat.depot_garantie ? contrat.depot_garantie + ' €' : 'Non défini'}.`, margin, y);
        y += 5;
        doc.setFontSize(9);
        doc.text('En cas de dégradation, le coût sera déduit du montant restitué.', margin, y);
        y += 12;

        // Nouvelle page si nécessaire
        if (y > 250) {
            doc.addPage();
            y = 20;
        }

        // VII. CLAUSE RÉSOLUTOIRE
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('VII. CLAUSE RÉSOLUTOIRE', margin, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const textClause = 'À défaut de paiement à la date convenue, après un commandement de payer resté infructueux 2 mois, le bail peut être résilié de plein droit.';
        const splitClause = doc.splitTextToSize(textClause, pageWidth - 2 * margin);
        doc.text(splitClause, margin, y);
        y += splitClause.length * 5 + 8;

        // X. AUTRES CONDITIONS PARTICULIÈRES
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('X. AUTRES CONDITIONS PARTICULIÈRES', margin, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Sous-location interdite. Respect du bon-vivre ensemble. Interdiction de fumer. Pas d\'animaux.', margin, y);
        y += 5;
        doc.setFontSize(9);
        doc.text('Présence d\'un visiteur > 4 jours non signalée : peut déclencher la clause résolutoire.', margin, y);
        y += 12;

        // XI. ANNEXES
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('XI. ANNEXES', margin, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('• État des lieux d\'entrée', margin + 5, y);
        y += 5;
        doc.text('• Inventaire du mobilier (le cas échéant)', margin + 5, y);
        y += 20;

        // Signatures
        const aujourdhui = new Date().toLocaleDateString('fr-FR');
        doc.text(`Fait le ${aujourdhui}`, margin, y);
        y += 20;

        doc.setFont('helvetica', 'bold');
        doc.text('Signature du bailleur', margin, y);
        doc.text('Signature du locataire', pageWidth / 2 + 10, y);
        y += 15;
        doc.line(margin, y, margin + 60, y);
        doc.line(pageWidth / 2 + 10, y, pageWidth / 2 + 70, y);

        // Télécharger le PDF
        doc.save(`contrat-${contrat.nom_locataire}-${contrat.prenom_locataire}.pdf`);

        hideLoading();
        showMessage('PDF généré avec succès', 'success');

    } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
        hideLoading();
        showMessage('Erreur lors de la génération du PDF', 'error');
    }
};

// Archiver un contrat
window.archiverContrat = async (contratId) => {
    if (!confirm('Archiver ce contrat ? Il sera déplacé dans les documents archivés.')) return;

    showLoading();
    try {
        const response = await fetch(`/api/contrats/${contratId}/archiver`, {
            method: 'PUT'
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showMessage('Contrat archivé');
        await displayContratActif();
        await displayDocuments();
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Erreur lors de l\'archivage', 'error');
    } finally {
        hideLoading();
    }
};

// Supprimer un contrat
window.deleteContrat = async (contratId) => {
    if (!confirm('Supprimer ce contrat ?')) return;

    showLoading();
    try {
        const response = await fetch(`/api/contrats/${contratId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showMessage('Contrat supprimé');
        await displayContratActif();
        await displayDocuments();
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Erreur lors de la suppression', 'error');
    } finally {
        hideLoading();
    }
};
