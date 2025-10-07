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
const viewEtatsBtn = document.getElementById('view-etats-btn');

// États des lieux
const demarrerEtatModal = document.getElementById('demarrer-etat-modal');
const etatTypeSelect = document.getElementById('etat-type');
const etatEntreeSelector = document.getElementById('etat-entree-selector');
const etatEntreeIdSelect = document.getElementById('etat-entree-id');
const startEtatBtn = document.getElementById('start-etat-btn');
const demarrerEtatFromListBtn = document.getElementById('demarrer-etat-from-list-btn');
const backFromEtatsBtn = document.getElementById('back-from-etats-btn');
const backFromEtatBtn = document.getElementById('back-from-etat-btn');

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
        bienDetailSection.classList.remove('hidden');

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
    const sectionId = document.getElementById('objet-section').value || null;

    if (!nom) {
        showMessage('Veuillez entrer un nom d\'élément', 'error');
        return;
    }

    showLoading();
    try {
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

    // Toujours afficher la section "Sans section" pour permettre le drop
    const sansSection = document.createElement('div');
    sansSection.className = 'section-container';
    sansSection.dataset.sectionId = 'null'; // Marquer comme section virtuelle
    sansSection.innerHTML = `
        <div class="section-header">
            <i class="fas fa-grip-vertical drag-handle"></i>
            <h4 class="section-title">Sans section</h4>
        </div>
    `;

    const table = createObjetTable(objetsSansSection);
    sansSection.appendChild(table);
    container.appendChild(sansSection);

    // Drag and drop pour la section "Sans section"
    setupSectionDragAndDrop(sansSection);

    // Afficher les sections avec leurs objets
    sections.forEach(section => {
        const objetsSection = objets.filter(o => o.sectionId === section.id);

        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section-container';
        sectionDiv.dataset.sectionId = section.id;

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

        // Toujours créer un tableau (même vide) pour permettre le drop
        const table = createObjetTable(objetsSection);
        sectionDiv.appendChild(table);

        container.appendChild(sectionDiv);

        // Drag and drop pour les sections
        setupSectionDragAndDrop(sectionDiv);
    });

    // Setup global drag events (une seule fois après avoir créé tout le contenu)
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
                <th>Entrée</th>
                <th>Sortie</th>
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
                <input type="checkbox" ${objet.entree ? 'checked' : ''}
                       onchange="updateObjet('${objet.id}', 'entree', this.checked)">
            </td>
            <td>
                <input type="checkbox" ${objet.sortie ? 'checked' : ''}
                       onchange="updateObjet('${objet.id}', 'sortie', this.checked)">
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

    // Le handle déclenche le drag
    handle.addEventListener('mousedown', () => {
        sectionDiv.setAttribute('draggable', 'true');
    });

    handle.addEventListener('mouseup', () => {
        sectionDiv.setAttribute('draggable', 'false');
    });

    sectionDiv.addEventListener('dragstart', (e) => {
        draggedSection = sectionDiv;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => sectionDiv.classList.add('dragging'), 0);
    });

    sectionDiv.addEventListener('dragend', () => {
        sectionDiv.classList.remove('dragging');
        sectionDiv.setAttribute('draggable', 'false');
        setTimeout(async () => {
            if (draggedSection) {
                await saveSectionOrder();
                draggedSection = null;
            }
        }, 0);
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
let draggedFromTbody = null;

function setupObjetDragAndDrop(row) {
    const handle = row.querySelector('.drag-handle');

    if (!handle) return;

    // Le handle déclenche le drag
    handle.addEventListener('mousedown', () => {
        row.setAttribute('draggable', 'true');
    });

    handle.addEventListener('mouseup', () => {
        row.setAttribute('draggable', 'false');
    });

    row.addEventListener('dragstart', (e) => {
        draggedObjet = row;
        draggedFromTbody = row.parentElement;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => row.classList.add('dragging'), 0);
    });

    row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        row.setAttribute('draggable', 'false');
        setTimeout(async () => {
            if (draggedObjet) {
                await saveObjetOrderAndSection();
                draggedObjet = null;
                draggedFromTbody = null;
            }
        }, 0);
    });
}

// Setup global dragover pour les objets (appelé une seule fois au chargement du bien)
function setupGlobalObjetDragEvents() {
    if (objetDragEventsSetup) return;

    const container = document.getElementById('etat-container');

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedObjet) return;

        // Trouver le tbody le plus proche (permet le déplacement entre sections)
        const target = e.target.closest('tbody');
        if (!target) return;

        const afterElement = getDragAfterElement(target, e.clientY, 'tr:not(.dragging)');
        if (afterElement == null) {
            target.appendChild(draggedObjet);
        } else {
            target.insertBefore(draggedObjet, afterElement);
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

    // Parcourir toutes les sections
    container.querySelectorAll('.section-container').forEach(sectionDiv => {
        const sectionId = sectionDiv.dataset.sectionId === 'null' ? null : sectionDiv.dataset.sectionId;
        const tbody = sectionDiv.querySelector('tbody');

        if (tbody) {
            const rows = [...tbody.querySelectorAll('tr[data-objet-id]')];
            rows.forEach(row => {
                objets.push({
                    id: row.dataset.objetId,
                    sectionId: sectionId,
                    ordre: objets.length // Ordre global
                });
            });
        }
    });

    try {
        await fetch(`/api/biens/${currentBienId}/reorganiser`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ objets })
        });

        // Recharger pour afficher les changements
        await openBienDetail(currentBienId);
    } catch (error) {
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

// Afficher la liste des états des lieux
viewEtatsBtn.addEventListener('click', async () => {
    showLoading();
    try {
        const response = await fetch(`/api/biens/${currentBienId}/etats-des-lieux`);
        const data = await response.json();

        bienDetailSection.classList.add('hidden');
        etatsListSection.classList.remove('hidden');

        displayEtatsList(data.etatsDesLieux);
    } catch (error) {
        showMessage('Erreur de chargement des états des lieux', 'error');
    } finally {
        hideLoading();
    }
});

// Afficher les états des lieux
function displayEtatsList(etats) {
    const etatsList = document.getElementById('etats-list');
    etatsList.innerHTML = '';

    if (etats.length === 0) {
        etatsList.innerHTML = '<p class="empty-state">Aucun état des lieux réalisé. Cliquez sur "Démarrer" pour en créer un.</p>';
        return;
    }

    etats.forEach(etat => {
        const div = document.createElement('div');
        div.className = 'item-card';

        const typeLabel = etat.type === 'entree' ? '📥 Entrée' : '📤 Sortie';
        const date = new Date(etat.dateCreation).toLocaleDateString('fr-FR');

        div.innerHTML = `
            <h3>${typeLabel} - ${etat.locataire || 'Sans locataire'}</h3>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Éléments:</strong> ${etat.objets ? etat.objets.length : 0}</p>
            <div class="item-actions">
                <button onclick="openEtatDetail('${etat.id}')" class="btn-primary">Consulter</button>
                <button onclick="deleteEtat('${etat.id}')" class="btn-danger" title="Supprimer"><i class="fas fa-trash"></i></button>
            </div>
        `;
        etatsList.appendChild(div);
    });
}

// Retour à la page du bien depuis la liste des états
backFromEtatsBtn.addEventListener('click', () => {
    etatsListSection.classList.add('hidden');
    bienDetailSection.classList.remove('hidden');
});

// Démarrer un nouvel état des lieux
demarrerEtatBtn.addEventListener('click', () => {
    openDemarrerEtatModal();
});

demarrerEtatFromListBtn.addEventListener('click', () => {
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

    const objetsSansSection = objets.filter(o => !o.sectionId);

    if (sections.length === 0 && objets.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucun élément dans cet état des lieux.</p>';
        return;
    }

    // Afficher "Sans section"
    const sansSection = document.createElement('div');
    sansSection.className = 'section-container';
    sansSection.innerHTML = `<h4 class="section-title">Sans section</h4>`;

    const table1 = createEtatObjetTable(objetsSansSection);
    sansSection.appendChild(table1);
    container.appendChild(sansSection);

    // Afficher les sections
    sections.forEach(section => {
        const objetsSection = objets.filter(o => o.sectionId === section.id);

        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section-container';
        sectionDiv.innerHTML = `<h4 class="section-title">${section.nom}</h4>`;

        const table = createEtatObjetTable(objetsSection);
        sectionDiv.appendChild(table);

        container.appendChild(sectionDiv);
    });
}

function createEtatObjetTable(objets) {
    const table = document.createElement('table');
    table.className = 'etat-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Élément</th>
                <th>Entrée</th>
                <th>Sortie</th>
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
                <input type="checkbox" ${objet.entree ? 'checked' : ''}
                       onchange="updateEtatObjet('${objet.id}', 'entree', this.checked)">
            </td>
            <td>
                <input type="checkbox" ${objet.sortie ? 'checked' : ''}
                       onchange="updateEtatObjet('${objet.id}', 'sortie', this.checked)">
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

        // Recharger la liste
        viewEtatsBtn.click();
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
    etatsListSection.classList.remove('hidden');
    currentEtatId = null;
    currentEtat = null;
});
