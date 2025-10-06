// État de l'application
let currentUser = null;
let currentBienId = null;
let currentBien = null;

// Éléments DOM
const authSection = document.getElementById('auth-section');
const biensSection = document.getElementById('biens-section');
const bienDetailSection = document.getElementById('bien-detail-section');
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

// Détails du bien
const backBtn = document.getElementById('back-btn');
const addObjetBtn = document.getElementById('add-objet-btn');
const generatePdfBtn = document.getElementById('generate-pdf-btn');
const etatTableBody = document.getElementById('etat-table-body');

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
                <button onclick="deleteBien('${bien.id}')" class="btn-danger">Supprimer</button>
            </div>
        `;
        biensList.appendChild(div);
    });
}

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

addObjetBtn.addEventListener('click', async () => {
    const nom = document.getElementById('objet-nom').value.trim();
    const description = document.getElementById('objet-description').value.trim();

    if (!nom) {
        showMessage('Veuillez entrer un nom d\'élément', 'error');
        return;
    }

    showLoading();
    try {
        const response = await fetch(`/api/biens/${currentBienId}/objets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bienId: currentBienId, nom, description })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        document.getElementById('objet-nom').value = '';
        document.getElementById('objet-description').value = '';

        // Recharger le bien
        await openBienDetail(currentBienId);
        showMessage('Élément ajouté !');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
});

function displayEtatTable() {
    etatTableBody.innerHTML = '';
    const emptyMessage = document.getElementById('empty-table-message');
    const table = document.getElementById('etat-table');

    if (!currentBien.objets || currentBien.objets.length === 0) {
        table.classList.add('hidden');
        emptyMessage.classList.remove('hidden');
        return;
    }

    table.classList.remove('hidden');
    emptyMessage.classList.add('hidden');

    currentBien.objets.forEach((objet, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
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
                <button onclick="deleteObjet('${objet.id}')" class="btn-danger-small">🗑️</button>
            </td>
        `;
        etatTableBody.appendChild(row);
    });
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

generatePdfBtn.addEventListener('click', () => {
    window.open(`/api/pdf/${currentBienId}`, '_blank');
});
