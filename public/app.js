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
const templateEditSection = document.getElementById('template-edit-section');
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
// const generatePdfBtn = document.getElementById('generate-pdf-btn'); // Bouton supprimé
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

// Fonction utilitaire pour afficher un modal de confirmation personnalisé
function showConfirmModal(title, message, confirmText = 'Supprimer', confirmClass = 'btn-danger') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-delete-modal');
        const titleElement = document.getElementById('confirm-modal-title');
        const messageElement = document.getElementById('confirm-modal-message');
        const confirmBtn = document.getElementById('confirm-delete-btn');
        const cancelBtn = document.getElementById('cancel-delete-btn');

        titleElement.textContent = title;
        messageElement.textContent = message;
        confirmBtn.textContent = confirmText;

        // Changer la classe du bouton selon le contexte
        confirmBtn.className = confirmClass;

        modal.classList.remove('hidden');

        const handleConfirm = () => {
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

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

        // Stocker le token et les infos utilisateur
        if (data.token) {
            localStorage.setItem('token', data.token);
        }
        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        currentUser = data.proprietaire || data.user;

        // Redirection basée sur le rôle
        if (data.user && data.user.role === 'locataire') {
            // Rediriger vers l'espace locataire
            window.location.href = '/dashboard-locataire.html';
        } else {
            // Afficher l'interface propriétaire/admin
            showBiensSection();
            showMessage('Connexion réussie !');
        }
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
    // Cacher la section auth
    authSection.classList.add('hidden');

    // Initialiser la nouvelle sidebar
    initSidebar();

    // Cacher les anciennes sections (gardées pour compatibilité avec les modals)
    if (biensSection) biensSection.classList.add('hidden');
    if (bienDetailSection) bienDetailSection.classList.add('hidden');
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

        // Recharger automatiquement la liste et la sidebar
        if (typeof loadAndDisplayBiens === 'function') {
            await loadAndDisplayBiens();
        }

        showMessage('Bien créé avec succès !');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
});

async function loadBiens() {
    showLoading();
    try {
        // Charger les biens du propriétaire connecté
        const response = await fetch(`/api/biens?proprietaireId=${currentUser.id}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors du chargement des biens');
        }

        const biens = data.biens || [];
        displayBiens(biens);
        updateDashboard(biens);
    } catch (error) {
        console.error('Erreur dans loadBiens:', error);
        showMessage(error.message || 'Erreur de chargement des biens', 'error');
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

        // Formatage du nom du locataire
        const locataireText = bien.locataireActuel
            ? `${bien.locataireActuel.prenom} ${bien.locataireActuel.nom}`
            : '<span style="color: var(--text-lighter); font-style: italic;">Aucun</span>';

        div.innerHTML = `
            <h3>${bien.nom}</h3>
            <p style="margin-bottom: 8px;">${bien.adresse || 'Pas d\'adresse renseignée'}</p>
            <div class="bien-meta">
                <small><i class="fas fa-cube"></i> ${bien.objets ? bien.objets.length : 0} élément(s)</small>
                <small class="locataire-info"><i class="fas fa-user"></i> Locataire: ${locataireText}</small>
            </div>
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

// Mettre à jour le dashboard avec les métriques
function updateDashboard(biens) {
    console.log('=== updateDashboard appelé ===');
    console.log('Nombre de biens:', biens.length);
    console.log('Données des biens:', biens);

    const totalBiens = biens.length;
    const biensOccupes = biens.filter(bien => bien.locataireActuel).length;
    const biensDisponibles = totalBiens - biensOccupes;
    const tauxOccupation = totalBiens > 0 ? Math.round((biensOccupes / totalBiens) * 100) : 0;

    console.log('Biens occupés:', biensOccupes);
    console.log('Biens disponibles:', biensDisponibles);
    console.log('Taux occupation:', tauxOccupation + '%');

    // Calculer le total des loyers
    const totalLoyers = biens.reduce((sum, bien) => {
        console.log('Bien:', bien.nom, '- Locataire:', bien.locataireActuel);
        if (bien.locataireActuel && bien.locataireActuel.loyer) {
            console.log('  -> Loyer:', bien.locataireActuel.loyer);
            return sum + parseFloat(bien.locataireActuel.loyer);
        }
        return sum;
    }, 0);

    console.log('Total loyers:', totalLoyers);

    // Fonction helper pour mettre à jour un élément de façon sécurisée
    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = text;
        } else {
            console.warn(`Élément #${id} non trouvé dans le DOM`);
        }
    };

    const safeSetStyle = (id, property, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.style[property] = value;
        } else {
            console.warn(`Élément #${id} non trouvé dans le DOM`);
        }
    };

    // Mettre à jour les éléments du dashboard
    safeSetText('dashboard-occupied', biensOccupes);
    safeSetText('dashboard-total', totalBiens);
    safeSetText('dashboard-percentage', tauxOccupation + '%');
    safeSetStyle('dashboard-progress', 'width', tauxOccupation + '%');

    // Mettre à jour le statut
    const statusElement = document.getElementById('dashboard-status');
    if (statusElement) {
        if (totalBiens === 0) {
            statusElement.textContent = 'Aucun bien';
        } else if (tauxOccupation === 100) {
            statusElement.textContent = 'Tous loués';
        } else if (tauxOccupation === 0) {
            statusElement.textContent = 'Tous disponibles';
        } else {
            statusElement.textContent = `${biensDisponibles} disponible${biensDisponibles > 1 ? 's' : ''}`;
        }
    }

    // Mettre à jour les revenus
    safeSetText('dashboard-revenue', totalLoyers.toFixed(0));
    safeSetText('dashboard-active-contracts', biensOccupes);

    // Mettre à jour la vue rapide
    safeSetText('dashboard-total-biens', totalBiens);
    safeSetText('dashboard-available', biensDisponibles);

    console.log('=== updateDashboard terminé ===');
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
    const confirmed = await showConfirmModal(
        'Dupliquer ce bien ?',
        'Une copie complète de ce bien sera créée avec tous ses éléments (sections et objets).'
    );

    if (!confirmed) return;

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
    const confirmed = await showConfirmModal(
        'Supprimer ce bien ?',
        'Cette action est irréversible. Le bien et tous ses éléments (sections, objets, états des lieux, contrats, photos) seront définitivement supprimés.'
    );

    if (!confirmed) return;

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

        // Nouveau comportement: garder la sidebar visible
        const appSidebar = document.getElementById('app-sidebar');
        const appContent = document.getElementById('app-content');

        // Cacher toutes les autres sections
        biensSection.classList.add('hidden');
        etatsListSection.classList.add('hidden');
        etatDetailSection.classList.add('hidden');
        templateEditSection.classList.add('hidden');

        // Si on est dans le nouveau layout (sidebar visible), vider app-content
        if (appSidebar && !appSidebar.classList.contains('hidden')) {
            appContent.innerHTML = '';
            // Cacher le contenu dynamique de app-content pour laisser place à bien-detail-section
            appContent.classList.add('hidden');
        }

        // Afficher la section de détail du bien
        bienDetailSection.classList.remove('hidden');

        // Charger le contrat actif, les documents archivés et les photos
        await displayContratActif();
        await displayDocuments();
        await loadPhotos();
        await loadQuittances();

        await updateTemplateSummary();
    } catch (error) {
        showMessage('Erreur de chargement', 'error');
    } finally {
        hideLoading();
    }
};

backBtn.addEventListener('click', () => {
    bienDetailSection.classList.add('hidden');

    // Vérifier si on est dans le nouveau layout avec sidebar
    const appSidebar = document.getElementById('app-sidebar');
    const appContent = document.getElementById('app-content');

    if (appSidebar && !appSidebar.classList.contains('hidden')) {
        // Retour à la page Mes Biens dans le nouveau layout
        appContent.classList.remove('hidden');
        if (typeof navigateToPage === 'function') {
            navigateToPage('biens');
        }
    } else {
        // Ancien comportement
        biensSection.classList.remove('hidden');
    }

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

        // Trouver le contrat actif et non archivé
        // Si le champ archive n'existe pas (undefined/null), on considère que ce n'est pas archivé
        const contratActif = contrats.find(c => c.actif && !c.archive);

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
                <button onclick="archiverContrat('${contratActif.id}')" title="Archiver dans les documents (le bien reste occupé)">
                    <i class="fas fa-archive"></i> Archiver
                </button>
                <button onclick="terminerContrat('${contratActif.id}')" class="btn-danger" title="Terminer le contrat (le bien devient disponible)">
                    <i class="fas fa-times-circle"></i> Terminer le contrat
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
        const etats = etatsData.etats || [];

        // Charger les contrats
        const contratsResponse = await fetch(`/api/biens/${currentBienId}/contrats`);
        const contratsData = await contratsResponse.json();
        const contrats = contratsData.contrats || [];

        // Ne garder que les contrats archivés (archive = true)
        // Ceci inclut à la fois les contrats archivés mais actifs, et les contrats terminés
        const contratsArchives = contrats.filter(c => c.archive === true);

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
                    <button class="btn-icon" onclick="event.stopPropagation(); generateEtatPdf('${currentBienId}', '${etat.id}')" title="PDF">
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
    console.log('🔵 Clic sur "Ajouter une section"');
    if (!currentBienId) {
        console.error('❌ Aucun bien sélectionné');
        showMessage('Erreur : aucun bien sélectionné', 'error');
        return;
    }
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
        // Recharger les données et rafraîchir l'affichage sans changer de page
        await reloadCurrentBien();
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
    console.log('🔵 Clic sur "Ajouter un élément"');
    if (!currentBienId) {
        console.error('❌ Aucun bien sélectionné');
        showMessage('Erreur : aucun bien sélectionné', 'error');
        return;
    }
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
        await reloadCurrentBien();
        showMessage('Élément ajouté !');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
});

// Recharger les données du bien actuel sans changer de page
async function reloadCurrentBien() {
    const response = await fetch(`/api/biens/${currentBienId}`);
    const data = await response.json();
    currentBien = data.bien;

    // Rafraîchir l'affichage du template
    displayEtatTable();
}

function displayEtatTable() {
    const container = document.getElementById('etat-container');
    container.innerHTML = '';

    const sections = (currentBien.sections || []).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const objets = (currentBien.objets || []).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

    // Objets sans section (utiliser section_id car vient de la DB)
    const objetsSansSection = objets.filter(o => !o.section_id);

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

    // Afficher les sections avec leurs objets (utiliser section_id car vient de la DB)
    sections.forEach(section => {
        const objetsSection = objets.filter(o => o.section_id === section.id);

        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section-container';
        sectionDiv.dataset.sectionId = section.id;

        sectionDiv.innerHTML = `
            <div class="section-header">
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
    });

    // Setup global drag events pour les objets uniquement
    setupGlobalObjetDragEvents();
}

// Mettre à jour le résumé du template avec les dernières évaluations
async function updateTemplateSummary() {
    const container = document.getElementById('template-items-list');

    console.log('🔄 Mise à jour du template summary pour le bien:', currentBienId);

    const sections = (currentBien.sections || []).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const objets = (currentBien.objets || []).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

    if (objets.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucun élément configuré</p>';
        return;
    }

    // Récupérer le dernier état des lieux pour obtenir les notes
    let derniereEvaluations = {};
    let dernierEtat = null;
    try {
        const response = await fetch(`/api/biens/${currentBienId}/etats-des-lieux`);
        const data = await response.json();
        const etats = data.etats || [];

        console.log('📊 États des lieux trouvés:', etats.length);

        // Prendre le dernier état terminé
        dernierEtat = etats
            .filter(e => e.termine)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        console.log('✅ Dernier état terminé:', dernierEtat ? dernierEtat.id : 'Aucun');

        if (dernierEtat) {
            // Récupérer les détails de cet état
            const detailResponse = await fetch(`/api/biens/${currentBienId}/etats-des-lieux/${dernierEtat.id}`);
            const detailData = await detailResponse.json();

            console.log('📄 Détails de l\'état:', detailData);

            // Vérifier la structure des données
            if (detailData && detailData.etat) {
                const etatObjets = detailData.etat.etat_objets || [];
                console.log('📝 Évaluations trouvées:', etatObjets.length);

                etatObjets.forEach(eo => {
                    if (eo && eo.objet_id) {
                        derniereEvaluations[eo.objet_id] = {
                            note: eo.note || null,
                            commentaires: eo.commentaires || null
                        };
                    }
                });

                console.log('💾 Évaluations chargées:', Object.keys(derniereEvaluations).length);
                console.log('🔍 Contenu des évaluations:', derniereEvaluations);
            } else {
                console.error('⚠️ Structure de données inattendue:', detailData);
            }
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des évaluations:', error);
    }

    container.innerHTML = '';

    // Créer le tableau principal
    const table = document.createElement('table');
    table.className = 'template-summary-table';

    // En-tête du tableau
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    let dateInfo = 'Aucune évaluation';
    if (dernierEtat) {
        const dateFormatee = new Date(dernierEtat.date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        dateInfo = `Évaluation du ${dateFormatee}`;
    }

    headerRow.innerHTML = `
        <th class="col-element">Élément</th>
        <th class="col-note">Note</th>
        <th class="col-comment">Commentaire</th>
    `;
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    // Objets sans section (utiliser section_id car vient de la DB)
    const objetsSansSection = objets.filter(o => !o.section_id);
    if (objetsSansSection.length > 0) {
        objetsSansSection.forEach(objet => {
            tbody.appendChild(createTemplateItemRow(objet, derniereEvaluations));
        });
    }

    // Objets par section (utiliser section_id car vient de la DB)
    sections.forEach(section => {
        const objetsSection = objets.filter(o => o.section_id === section.id);
        if (objetsSection.length > 0) {
            // Ligne de séparation de section
            const sectionRow = document.createElement('tr');
            sectionRow.className = 'template-section-row';
            sectionRow.innerHTML = `<td colspan="3">${section.nom}</td>`;
            tbody.appendChild(sectionRow);

            objetsSection.forEach(objet => {
                tbody.appendChild(createTemplateItemRow(objet, derniereEvaluations));
            });
        }
    });

    table.appendChild(tbody);

    // Ajouter la note avec la date
    const dateNote = document.createElement('div');
    dateNote.className = 'template-date-note';
    dateNote.innerHTML = `<small><i class="fas fa-info-circle"></i> ${dateInfo}</small>`;

    container.appendChild(dateNote);
    container.appendChild(table);
}

function createTemplateItemRow(objet, evaluations) {
    const row = document.createElement('tr');
    row.className = 'template-item-row';

    const eval = evaluations[objet.id];

    console.log(`🔎 Objet "${objet.nom}" (ID: ${objet.id}):`, eval ? `Note=${eval.note}, Comment=${eval.commentaires}` : 'PAS D\'ÉVALUATION');

    let noteDisplay = '-';
    let noteClass = '';
    if (eval && eval.note) {
        noteDisplay = eval.note;
        if (eval.note >= 4) noteClass = 'note-good';
        else if (eval.note >= 3) noteClass = 'note-medium';
        else noteClass = 'note-bad';
    }

    row.innerHTML = `
        <td class="template-item-name">${objet.nom}</td>
        <td class="template-item-note ${noteClass}">${noteDisplay}</td>
        <td class="template-item-comment">${eval && eval.commentaires ? eval.commentaires : '-'}</td>
    `;

    return row;
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

        // Recharger les données du bien pour synchroniser
        const response2 = await fetch(`/api/biens/${currentBienId}`);
        const data2 = await response2.json();
        currentBien = data2.bien;

        console.log('✅ Données rechargées depuis la base de données');
        console.log('📊 Objets après rechargement:', currentBien.objets.map(o => ({ id: o.id, nom: o.nom, section_id: o.section_id })));

        // Rafraîchir l'affichage avec les nouvelles données
        displayEtatTable();
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
    const confirmed = await showConfirmModal(
        'Supprimer cet élément ?',
        'Cet élément sera définitivement supprimé du bien.'
    );

    if (!confirmed) return;

    showLoading();
    try {
        const response = await fetch(`/api/biens/${currentBienId}/objets/${objetId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Erreur de suppression');

        await reloadCurrentBien();
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
    const confirmed = await showConfirmModal(
        'Supprimer cette section ?',
        'La section sera supprimée et ses éléments seront déplacés dans "Sans section".'
    );

    if (!confirmed) return;

    showLoading();
    try {
        const response = await fetch(`/api/biens/${currentBienId}/sections/${sectionId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Erreur de suppression');

        await reloadCurrentBien();
        showMessage('Section supprimée');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// generatePdfBtn supprimé - fonctionnalité retirée

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

        const etatsEntree = data.etats.filter(e => e.type === 'entree');

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
        await openEtatDetail(data.etat.id);
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
        currentEtat = data.etat;

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
    const objets = (currentEtat.etat_objets || []).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

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
                    <select onchange="updateEtatObjet('${objet.id}', 'note', parseInt(this.value))">
                        <option value="0" ${(objet.note === 0 || !objet.note) ? 'selected' : ''}>-</option>
                        <option value="1" ${objet.note === 1 ? 'selected' : ''}>⭐</option>
                        <option value="2" ${objet.note === 2 ? 'selected' : ''}>⭐⭐</option>
                        <option value="3" ${objet.note === 3 ? 'selected' : ''}>⭐⭐⭐</option>
                        <option value="4" ${objet.note === 4 ? 'selected' : ''}>⭐⭐⭐⭐</option>
                        <option value="5" ${objet.note === 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐</option>
                    </select>
                </td>
                <td>
                    <input type="text" value="${objet.commentaires || ''}"
                           placeholder="Commentaires sortie..."
                           onchange="updateEtatObjet('${objet.id}', 'commentaires', this.value)">
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
        console.log('📝 Update objet:', { objetId, field, value });
        const body = { [field]: value };

        const response = await fetch(`/api/biens/${currentBienId}/etats-des-lieux/${currentEtatId}/objets/${objetId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            console.error('❌ Erreur update:', response.status);
            throw new Error('Erreur de mise à jour');
        }

        console.log('✅ Update réussi');
        // Mettre à jour localement
        const objet = currentEtat.etat_objets.find(o => o.id === objetId);
        if (objet) objet[field] = value;
    } catch (error) {
        console.error('❌ Erreur updateEtatObjet:', error);
        showMessage(error.message, 'error');
    }
};

// Supprimer un état des lieux
window.deleteEtat = async (etatId) => {
    const confirmed = await showConfirmModal(
        'Supprimer cet état des lieux ?',
        'Cette action est irréversible. L\'état des lieux et toutes ses données seront définitivement supprimés.'
    );

    if (!confirmed) return;

    showLoading();
    try {
        const response = await fetch(`/api/biens/${currentBienId}/etats-des-lieux/${etatId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erreur de suppression');

        // Si l'état supprimé est celui en cours de consultation, revenir à la vue du bien
        if (currentEtatId === etatId) {
            etatDetailSection.classList.add('hidden');
            bienDetailSection.classList.remove('hidden');
            currentEtatId = null;
            currentEtat = null;
        }

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
terminerEtatBtn.addEventListener('click', async () => {
    if (!currentEtatId) {
        showMessage('Erreur : aucun état des lieux actif', 'error');
        return;
    }

    showLoading();
    try {
        // Marquer l'état des lieux comme terminé dans la base de données
        const response = await fetch(`/api/biens/${currentBienId}/etats-des-lieux/${currentEtatId}/terminer`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la finalisation de l\'état des lieux');
        }

        etatDetailSection.classList.add('hidden');
        await openBienDetail(currentBienId);
        currentEtatId = null;
        currentEtat = null;
        showMessage('État des lieux terminé !');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
});

// Générer le PDF de l'état en cours de consultation
generateEtatPdfBtn.addEventListener('click', () => {
    if (currentEtatId && currentBienId) {
        window.open(`/api/biens/${currentBienId}/etats-des-lieux/${currentEtatId}/pdf`, '_blank');
    }
});

// Générer le PDF d'un état des lieux (depuis la liste)
window.generateEtatPdf = (bienId, etatId) => {
    window.open(`/api/biens/${bienId}/etats-des-lieux/${etatId}/pdf`, '_blank');
};

// Navigation vers l'édition du template
document.getElementById('edit-template-btn').addEventListener('click', () => {
    bienDetailSection.classList.add('hidden');
    templateEditSection.classList.remove('hidden');
    displayEtatTable();
});

// Retour depuis l'édition du template
document.getElementById('back-from-template-btn').addEventListener('click', () => {
    templateEditSection.classList.add('hidden');
    openBienDetail(currentBienId);
});

// Sauvegarder le template
document.getElementById('save-template-btn').addEventListener('click', () => {
    showMessage('Template sauvegardé avec succès !', 'success');
    templateEditSection.classList.add('hidden');
    openBienDetail(currentBienId);
});

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
        await openEtatDetail(data.etat.id);
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
    const confirmed = await showConfirmModal(
        'Supprimer cette photo ?',
        'Cette photo sera définitivement supprimée.'
    );

    if (!confirmed) return;

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
    document.getElementById('contrat-email').value = '';
    document.getElementById('contrat-numero-chambre').value = '';
    document.getElementById('contrat-date-debut').value = '';
    document.getElementById('contrat-date-fin').value = '';
    document.getElementById('contrat-loyer').value = '';
    document.getElementById('contrat-depot').value = '';
});

// Créer un contrat
saveContratBtn.addEventListener('click', async () => {
    const nom = document.getElementById('contrat-nom').value;
    const prenom = document.getElementById('contrat-prenom').value;
    const dateDebut = document.getElementById('contrat-date-debut').value;
    const dateFin = document.getElementById('contrat-date-fin').value;
    const loyer = document.getElementById('contrat-loyer').value;

    if (!nom || !prenom) {
        showMessage('Nom et prénom requis', 'error');
        return;
    }

    if (!dateDebut || !dateFin) {
        showMessage('Les dates de début et de fin sont requises', 'error');
        return;
    }

    if (!loyer) {
        showMessage('Le loyer est requis', 'error');
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
                emailLocataire: document.getElementById('contrat-email').value,
                numeroChambre: document.getElementById('contrat-numero-chambre').value,
                dateDebut: dateDebut,
                dateFin: dateFin,
                loyer: parseFloat(loyer),
                depotGarantie: parseFloat(document.getElementById('contrat-depot').value) || null
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showMessage('Contrat créé avec succès !');
        closeModals();
        await displayContratActif();
        await displayDocuments();
        // Recharger les biens pour mettre à jour le dashboard
        await loadBiens();
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

        // Calculer la durée en mois
        let duree = 'Non définie';
        if (contrat.date_debut && contrat.date_fin) {
            const debut = new Date(contrat.date_debut);
            const fin = new Date(contrat.date_fin);
            const mois = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth());
            duree = `${mois} mois`;
        }

        const dateDebut = contrat.date_debut ? new Date(contrat.date_debut).toLocaleDateString('fr-FR') : 'Non définie';
        const dateFin = contrat.date_fin ? new Date(contrat.date_fin).toLocaleDateString('fr-FR') : 'Non définie';
        const aujourdhui = new Date().toLocaleDateString('fr-FR');

        // Générer le PDF avec jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 18;
        let y = 20;

        // Helper pour ajouter une nouvelle page si nécessaire
        const checkPageBreak = (neededSpace = 20) => {
            if (y + neededSpace > pageHeight - 20) {
                doc.addPage();
                y = 20;
            }
        };

        // Titre
        doc.setFontSize(16);
        doc.setFont('times', 'bold');
        doc.text('CONTRAT DE LOCATION', pageWidth / 2, y, { align: 'center' });
        y += 10;

        // Sous-titre loi
        doc.setFontSize(10);
        doc.setFont('times', 'normal');
        const sousTitre = '(Soumis au titre Ier bis de la loi du 6 juillet 1989 tendant à améliorer les rapports locatifs et portant modification de la loi n° 86-1290 du 23 décembre 1986)';
        const splitSousTitre = doc.splitTextToSize(sousTitre, pageWidth - 2 * margin);
        doc.text(splitSousTitre, pageWidth / 2, y, { align: 'center' });
        y += splitSousTitre.length * 5 + 10;

        // DÉSIGNATION DES PARTIES
        checkPageBreak();
        doc.setFontSize(12.5);
        doc.setFont('times', 'bold');
        doc.text('DÉSIGNATION DES PARTIES', margin, y);
        y += 8;

        doc.setFontSize(11);
        doc.setFont('times', 'bold');
        doc.text('Le présent contrat est conclu entre les soussignés :', margin, y);
        y += 8;

        doc.setFont('times', 'normal');
        doc.text('SARL ALCAYAMA,', margin, y);
        y += 5;
        doc.text('38 rue du moulin bâtard, 44490, Le Croisic,', margin, y);
        y += 5;
        doc.text('personne morale inscrite au RCS au numéro 892 739 764', margin, y);
        y += 5;
        doc.text('Mail : alcamaya.contact@gmail.com', margin, y);
        y += 5;
        doc.text('désigné(s) ci-après « le bailleur ».', margin, y);
        y += 10;

        doc.text(`Nom : ${contrat.nom_locataire || 'Non renseigné'}`, margin, y);
        y += 5;
        doc.text(`Prénom : ${contrat.prenom_locataire || 'Non renseigné'}`, margin, y);
        y += 5;
        doc.text(`Mail : ${contrat.email_locataire || 'Non renseigné'}`, margin, y);
        y += 5;
        doc.text('désigné(s) ci-après « le locataire ».', margin, y);
        y += 10;

        doc.text('Il a été convenu ce qui suit :', margin, y);
        y += 12;

        // II. OBJET DU CONTRAT
        checkPageBreak();
        doc.setFontSize(12.5);
        doc.setFont('times', 'bold');
        doc.text('II. OBJET DU CONTRAT', margin, y);
        y += 8;

        doc.setFontSize(11);
        doc.setFont('times', 'normal');
        doc.text('Le présent contrat a pour objet la location d\'un logement ainsi déterminé :', margin, y);
        y += 8;

        doc.setFont('times', 'bold');
        doc.text('A. Consistance du logement', margin, y);
        y += 6;
        doc.setFont('times', 'normal');

        const items = [
            `localisation du logement : 11 rue Marcel Deplantay, ${contrat.numero_chambre || 'Non renseigné'}`,
            'type d\'habitat : Immeuble collectif',
            'régime juridique de l\'immeuble : Mono-propriété',
            'période de construction : avant 1949',
            'surface habitable : 180 m2',
            'nombre de pièces principales : 1',
            'le cas échéant, autres parties du logement : une cuisine partagée, salon, WC, salle de bain, jardin',
            'le cas échéant, Éléments d\'équipements du logement : salon équipé, cuisine équipée, salle de bain équipée, jardin équipé',
            'modalité de production chauffage : électrique collectif',
            'modalité de production d\'eau chaude sanitaire : électrique collectif'
        ];

        items.forEach(item => {
            checkPageBreak();
            const splitItem = doc.splitTextToSize(`• ${item}`, pageWidth - 2 * margin - 5);
            doc.text(splitItem, margin + 2, y);
            y += splitItem.length * 5;
        });
        y += 5;

        checkPageBreak();
        doc.setFont('times', 'bold');
        doc.text('B. Destination des locaux :', margin, y);
        y += 6;
        doc.setFont('times', 'normal');
        doc.text('Usage d\'habitation.', margin, y);
        y += 12;

        // Nouvelle page
        doc.addPage();
        y = 20;

        // III. DATE DE PRISE D'EFFET ET DURÉE
        doc.setFontSize(12.5);
        doc.setFont('times', 'bold');
        doc.text('III. DATE DE PRISE D\'EFFET ET DURÉE DU CONTRAT', margin, y);
        y += 8;

        doc.setFontSize(11);
        doc.setFont('times', 'normal');
        doc.text('La durée du contrat et sa date de prise d\'effet sont ainsi définies :', margin, y);
        y += 8;

        doc.text(`• A. Date de prise d'effet du contrat : ${dateDebut}`, margin + 2, y);
        y += 5;
        doc.text(`• B. Date de fin d'effet du contrat : ${dateFin}`, margin + 2, y);
        y += 5;
        doc.text(`• C. Durée du contrat : ${duree}`, margin + 2, y);
        y += 8;

        doc.text('Le locataire peut mettre fin au bail à tout moment, après avoir donné un préavis d\'un mois.', margin, y);
        y += 12;

        // IV. CONDITIONS FINANCIÈRES
        checkPageBreak();
        doc.setFontSize(12.5);
        doc.setFont('times', 'bold');
        doc.text('IV. CONDITIONS FINANCIÈRES', margin, y);
        y += 8;

        doc.setFontSize(11);
        doc.setFont('times', 'normal');
        doc.text('Les parties conviennent des conditions financières suivantes :', margin, y);
        y += 8;

        doc.setFont('times', 'bold');
        doc.text('A. Loyer', margin, y);
        y += 6;
        doc.setFont('times', 'italic');
        doc.text('Fixation du loyer initial :', margin, y);
        y += 6;
        doc.setFont('times', 'normal');
        doc.text(`Montant du loyer mensuel : ${contrat.loyer || 'Non défini'} € toutes charges incluses.`, margin, y);
        y += 10;

        doc.setFont('times', 'bold');
        doc.text('B. Modalités de paiement', margin, y);
        y += 6;
        doc.setFont('times', 'normal');
        doc.text('• méthode de paiement : transfert bancaire', margin + 2, y);
        y += 5;
        doc.text('• date de paiement : le locataire s\'engage à réaliser des transferts du montant du loyer', margin + 2, y);
        y += 5;
        doc.text('  avant le 5 de chaque mois', margin + 2, y);
        y += 5;
        const chargesText = '• les charges incluent comprennent l\'électricité, l\'eau ainsi que l\'ensemble des charges de propriété. Les charges comprises au contrat n\'incluent pas la consommation liée au chargement de véhicules électriques (voiture, trottinette, vélo, etc.), laquelle pourra faire l\'objet d\'une facturation supplémentaire.';
        const splitCharges = doc.splitTextToSize(chargesText, pageWidth - 2 * margin - 5);
        doc.text(splitCharges, margin + 2, y);
        y += splitCharges.length * 5 + 10;

        // V. TRAVAUX
        checkPageBreak();
        doc.setFontSize(12.5);
        doc.setFont('times', 'bold');
        doc.text('V. TRAVAUX', margin, y);
        y += 6;
        doc.setFontSize(11);
        doc.setFont('times', 'normal');
        doc.text('Le locataire s\'engage à ne pas réaliser de travaux de tout ordre dans le logement sans', margin, y);
        y += 5;
        doc.text('l\'accord préalable du bailleur.', margin, y);
        y += 12;

        // VI. GARANTIES
        checkPageBreak();
        doc.setFontSize(12.5);
        doc.setFont('times', 'bold');
        doc.text('VI. GARANTIES', margin, y);
        y += 6;
        doc.setFontSize(11);
        doc.setFont('times', 'normal');
        const depotGarantie = contrat.depot_garantie || contrat.loyer || 'Non défini';
        const garantieText = `Le locataire dépose un chèque de caution ou effectue un virement bancaire d'une valeur égale à un mois de loyer (${depotGarantie} €), qui sera encaissé puis rendu par le bailleur au terme du présent contrat.`;
        const splitGarantie = doc.splitTextToSize(garantieText, pageWidth - 2 * margin);
        doc.text(splitGarantie, margin, y);
        y += splitGarantie.length * 5 + 5;
        doc.text('En cas de dégradation de l\'immeuble, ou de meubles composant le logement, la valeur des', margin, y);
        y += 5;
        doc.text('dommages sera soustraite au montant rendu.', margin, y);
        y += 12;

        // VII. CLAUSE RÉSOLUTOIRE
        checkPageBreak();
        doc.setFontSize(12.5);
        doc.setFont('times', 'bold');
        doc.text('VII. CLAUSE RÉSOLUTOIRE', margin, y);
        y += 6;
        doc.setFontSize(11);
        doc.setFont('times', 'normal');
        const clauseResolutoire = 'Il est expressément convenu qu\'à défaut de paiement du dépôt de garantie, d\'un seul terme de loyer ou des charges à leur échéance et deux mois après un commandement de payer demeuré infructueux, le bail sera résilié de plein droit si bon semble au bailleur.';
        const splitClause = doc.splitTextToSize(clauseResolutoire, pageWidth - 2 * margin);
        doc.text(splitClause, margin, y);
        y += splitClause.length * 5 + 12;

        // X. AUTRES CONDITIONS PARTICULIÈRES
        checkPageBreak(50);
        doc.setFontSize(12.5);
        doc.setFont('times', 'bold');
        doc.text('X. AUTRES CONDITIONS PARTICULIÈRES', margin, y);
        y += 8;

        doc.setFontSize(11);
        doc.text('A. Condition(s) relative(s) à la sous-location', margin, y);
        y += 6;
        doc.setFont('times', 'normal');
        const sousLoc = 'Le logement en question ne pourra pas être sous-loué ou cédé à un tiers, le présent contrat s\'applique uniquement entre les parties précédemment concernées.';
        const splitSousLoc = doc.splitTextToSize(sousLoc, pageWidth - 2 * margin);
        doc.text(splitSousLoc, margin, y);
        y += splitSousLoc.length * 5 + 10;

        checkPageBreak();
        doc.setFont('times', 'bold');
        doc.text('B. Autres conditions particulières', margin, y);
        y += 6;
        doc.setFont('times', 'normal');

        const autresConditions = [
            'Le locataire est tenu de respecter les règles du bon-vivre ensemble, de respect mutuel avec les locataires résidant dans les logements voisins, que ce soit dans l\'usage des parties privées (nuisances sonores), ou communes.',
            'Il est strictement interdit de fumer à l\'intérieur du logement et des parties communes intérieures.',
            'Le locataire est tenu de ne pas ramener d\'animaux dans le logement.',
            'Le locataire est tenu de souscrire et de maintenir pendant toute la durée du bail une assurance couvrant les risques locatifs (incendie, dégâts des eaux, explosion, etc.) et d\'en justifier au bailleur chaque année sur demande.',
            'Le locataire s\'engage à respecter les règles ci-dessus en cas de visite d\'une personne tierce au contrat. Le logement vise à la location d\'une personne seule. La présence d\'un visiteur pour une durée supérieure à 4 jours, sans en avoir informé au préalable le bailleur, pourrait être considérée comme élément déclencheur de la clause résolutoire.'
        ];

        autresConditions.forEach(condition => {
            checkPageBreak();
            const split = doc.splitTextToSize(condition, pageWidth - 2 * margin);
            doc.text(split, margin, y);
            y += split.length * 5 + 5;
        });
        y += 10;

        // XI. ANNEXES
        checkPageBreak();
        doc.setFontSize(12.5);
        doc.setFont('times', 'bold');
        doc.text('XI. ANNEXES', margin, y);
        y += 6;
        doc.setFontSize(11);
        doc.setFont('times', 'bold');
        doc.text('Sont annexées et jointes au contrat de location les pièces suivantes :', margin, y);
        y += 6;
        doc.setFont('times', 'normal');
        doc.text('• Un état des lieux, un inventaire et un état détaillé du mobilier', margin + 2, y);
        y += 15;

        // Signatures
        checkPageBreak(40);
        doc.text(`Le ${aujourdhui}, à REDON`, margin, y);
        y += 20;

        doc.setFont('times', 'bold');
        const colWidth = (pageWidth - 2 * margin) / 2;
        doc.text('Signature du bailleur', margin, y);
        doc.text('Signature du locataire', margin + colWidth, y);
        y += 15;
        doc.line(margin, y, margin + 60, y);
        doc.line(margin + colWidth, y, margin + colWidth + 60, y);

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

// Archiver un contrat (le déplace dans documents mais reste actif)
window.archiverContrat = async (contratId) => {
    if (!confirm('Archiver ce contrat ? Il sera déplacé dans les documents mais le bien restera occupé.')) return;

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
        // Le dashboard n'a pas besoin d'être rechargé car le contrat reste actif
        // (le bien reste occupé même si le contrat est archivé)
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Erreur lors de l\'archivage', 'error');
    } finally {
        hideLoading();
    }
};

// Terminer un contrat (le bien devient disponible et le contrat est archivé)
window.terminerContrat = async (contratId) => {
    if (!confirm('Terminer ce contrat ? Le bien deviendra disponible et le contrat sera archivé dans les documents.')) return;

    showLoading();
    try {
        const response = await fetch(`/api/contrats/${contratId}/terminer`, {
            method: 'PUT'
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showMessage('Contrat terminé');
        await displayContratActif();
        await displayDocuments();
        await loadBiens(); // Recharger pour mettre à jour le dashboard
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Erreur lors de la terminaison du contrat', 'error');
    } finally {
        hideLoading();
    }
};

// Supprimer un contrat
window.deleteContrat = async (contratId) => {
    const confirmed = await showConfirmModal(
        'Supprimer ce contrat ?',
        'Cette action est irréversible. Le contrat sera définitivement supprimé.'
    );

    if (!confirmed) return;

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

// ==================== ACTIONS RAPIDES DASHBOARD ====================
// Fonction pour sélectionner un bien et créer un contrat
window.ouvrirCreationContrat = async () => {
    try {
        const response = await fetch(`/api/biens?proprietaireId=${currentUser.id}`);
        const data = await response.json();
        const biens = data.biens || [];

        if (biens.length === 0) {
            showMessage('Aucun bien disponible. Créez un bien d\'abord.', 'error');
            return;
        }

        // Créer un modal de sélection
        const bienId = await showBienSelector(biens, 'Sélectionnez un bien pour créer un contrat');
        if (bienId) {
            await openBienDetail(bienId);
            // Attendre que le detail du bien soit chargé
            setTimeout(() => {
                const contratModal = document.getElementById('contrat-modal');
                contratModal.classList.remove('hidden');
            }, 100);
        }
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Erreur lors de l\'ouverture', 'error');
    }
};

// Fonction pour sélectionner un bien et créer une quittance
window.ouvrirCreationQuittance = async () => {
    try {
        const response = await fetch(`/api/biens?proprietaireId=${currentUser.id}`);
        const data = await response.json();
        const biens = data.biens || [];

        if (biens.length === 0) {
            showMessage('Aucun bien disponible. Créez un bien d\'abord.', 'error');
            return;
        }

        // Créer un modal de sélection
        const bienId = await showBienSelector(biens, 'Sélectionnez un bien pour créer une quittance');
        if (bienId) {
            await openBienDetail(bienId);
            // Attendre que le detail du bien soit chargé
            setTimeout(() => {
                const quittanceModal = document.getElementById('quittance-modal');
                quittanceModal.classList.remove('hidden');
            }, 100);
        }
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Erreur lors de l\'ouverture', 'error');
    }
};

// Fonction pour sélectionner un bien et démarrer un état des lieux
window.ouvrirCreationEtat = async () => {
    try {
        const response = await fetch(`/api/biens?proprietaireId=${currentUser.id}`);
        const data = await response.json();
        const biens = data.biens || [];

        if (biens.length === 0) {
            showMessage('Aucun bien disponible. Créez un bien d\'abord.', 'error');
            return;
        }

        // Créer un modal de sélection
        const bienId = await showBienSelector(biens, 'Sélectionnez un bien pour démarrer un état des lieux');
        if (bienId) {
            await openBienDetail(bienId);
            // Attendre que le detail du bien soit chargé
            setTimeout(() => {
                const demarrerEtatModal = document.getElementById('demarrer-etat-modal');
                demarrerEtatModal.classList.remove('hidden');
            }, 100);
        }
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Erreur lors de l\'ouverture', 'error');
    }
};

// Fonction utilitaire pour afficher un sélecteur de bien
function showBienSelector(biens, title) {
    return new Promise((resolve) => {
        // Créer le modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.maxWidth = '500px';

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>${title}</h3>
            </div>
            <div class="modal-body">
                <div id="bien-selector-list" style="display: flex; flex-direction: column; gap: 12px;">
                    ${biens.map(bien => `
                        <button class="bien-selector-item" data-bien-id="${bien.id}" style="
                            padding: 16px;
                            background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(110, 231, 183, 0.05) 100%);
                            border: 2px solid transparent;
                            border-radius: 12px;
                            cursor: pointer;
                            text-align: left;
                            transition: all 0.3s;
                        ">
                            <div style="font-weight: 600; margin-bottom: 4px;">${bien.nom}</div>
                            <div style="font-size: 0.875rem; color: var(--text-mid);">${bien.adresse || 'Pas d\'adresse'}</div>
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button id="cancel-bien-selector" class="btn-secondary">Annuler</button>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Ajouter les événements
        const bienButtons = modal.querySelectorAll('.bien-selector-item');
        bienButtons.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.borderColor = 'var(--primary-color)';
                btn.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(110, 231, 183, 0.1) 100%)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.borderColor = 'transparent';
                btn.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(110, 231, 183, 0.05) 100%)';
            });
            btn.addEventListener('click', () => {
                const bienId = btn.getAttribute('data-bien-id');
                document.body.removeChild(modal);
                resolve(bienId);
            });
        });

        const cancelBtn = modal.querySelector('#cancel-bien-selector');
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(null);
        });

        // Fermer en cliquant en dehors
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                resolve(null);
            }
        });
    });
}

// ==================== QUITTANCES ====================
const createQuittanceBtn = document.getElementById('create-quittance-btn');
const quittanceModal = document.getElementById('quittance-modal');
const saveQuittanceBtn = document.getElementById('save-quittance-btn');
const quittancesContainer = document.getElementById('quittances-container');

// ==================== PARAMÈTRES / ADMINISTRATEURS ====================
const settingsBtn = document.getElementById('settings-btn');

settingsBtn.addEventListener('click', () => {
    openSettingsModal();
});

// Ouvrir le modal de création de quittance
createQuittanceBtn.addEventListener('click', async () => {
    // Charger les contrats disponibles
    try {
        const response = await fetch(`/api/biens/${currentBienId}/contrats`);
        const data = await response.json();
        const contrats = data.contrats.filter(c => c.actif);

        const selectContrat = document.getElementById('quittance-contrat');
        selectContrat.innerHTML = '<option value="">Sélectionner un contrat</option>';

        contrats.forEach(contrat => {
            const option = document.createElement('option');
            option.value = contrat.id;
            option.textContent = `${contrat.prenom_locataire} ${contrat.nom_locataire}`;
            option.dataset.loyer = contrat.loyer;
            selectContrat.appendChild(option);
        });

        // Pré-remplir avec la date actuelle
        const now = new Date();
        document.getElementById('quittance-mois').value = now.getMonth() + 1;
        document.getElementById('quittance-annee').value = now.getFullYear();
        document.getElementById('quittance-date-paiement').value = now.toISOString().split('T')[0];

        quittanceModal.classList.remove('hidden');
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Erreur lors du chargement des contrats', 'error');
    }
});

// Auto-remplir le loyer quand on sélectionne un contrat
document.getElementById('quittance-contrat').addEventListener('change', (e) => {
    const selectedOption = e.target.selectedOptions[0];
    if (selectedOption && selectedOption.dataset.loyer) {
        document.getElementById('quittance-loyer').value = selectedOption.dataset.loyer;
    }
});

// Créer une quittance
saveQuittanceBtn.addEventListener('click', async () => {
    const contratId = document.getElementById('quittance-contrat').value;
    const mois = document.getElementById('quittance-mois').value;
    const annee = document.getElementById('quittance-annee').value;
    const montantLoyer = document.getElementById('quittance-loyer').value;
    const montantCharges = document.getElementById('quittance-charges').value;
    const datePaiement = document.getElementById('quittance-date-paiement').value;
    const modePaiement = document.getElementById('quittance-mode-paiement').value;
    const observations = document.getElementById('quittance-observations').value;

    if (!contratId || !mois || !annee || !montantLoyer) {
        showMessage('Veuillez remplir tous les champs requis', 'error');
        return;
    }

    showLoading();
    try {
        const response = await fetch(`/api/biens/${currentBienId}/quittances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contratId,
                bienId: currentBienId,
                mois: parseInt(mois),
                annee: parseInt(annee),
                montantLoyer: parseFloat(montantLoyer),
                montantCharges: parseFloat(montantCharges) || 0,
                datePaiement: datePaiement || null,
                modePaiement,
                observations
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erreur lors de la création');

        showMessage('Quittance créée avec succès !');
        closeModals();
        await loadQuittances();
    } catch (error) {
        console.error('Erreur:', error);
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
});

// Charger les quittances
async function loadQuittances() {
    try {
        const response = await fetch(`/api/biens/${currentBienId}/quittances`);
        const data = await response.json();
        const quittances = data.quittances || [];

        if (quittances.length === 0) {
            quittancesContainer.innerHTML = '<p style="color: var(--text-light); padding: 20px;">Aucune quittance générée</p>';
            return;
        }

        const moisNoms = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

        quittancesContainer.innerHTML = quittances.map(q => `
            <div class="quittance-item">
                <div class="quittance-info">
                    <div class="quittance-date">${moisNoms[q.mois]} ${q.annee}</div>
                    <div class="quittance-locataire">${q.contrats?.prenom_locataire} ${q.contrats?.nom_locataire}</div>
                    <div class="quittance-montant">${q.montant_total.toFixed(2)} €</div>
                </div>
                <div class="quittance-actions">
                    <button onclick="downloadQuittancePDF('${q.id}')" class="btn-primary btn-small">
                        <i class="fas fa-download"></i> PDF
                    </button>
                    <button onclick="sendQuittanceEmail('${q.id}')" class="btn-success btn-small">
                        <i class="fas fa-envelope"></i> Envoyer
                    </button>
                    <button onclick="deleteQuittance('${q.id}')" class="btn-danger-small">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Erreur lors du chargement des quittances', 'error');
    }
}

// Supprimer une quittance
window.deleteQuittance = async (quittanceId) => {
    const confirmed = await showConfirmModal(
        'Supprimer cette quittance ?',
        'Cette action est irréversible.'
    );

    if (!confirmed) return;

    showLoading();
    try {
        const response = await fetch(`/api/quittances/${quittanceId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Erreur lors de la suppression');

        showMessage('Quittance supprimée');
        await loadQuittances();
    } catch (error) {
        console.error('Erreur:', error);
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// Générer le PDF d'une quittance
window.downloadQuittancePDF = async (quittanceId) => {
    try {
        showLoading();

        // Récupérer les données de la quittance
        const response = await fetch(`/api/quittances/${quittanceId}`);
        const data = await response.json();
        const quittance = data.quittance;

        if (!quittance) {
            showMessage('Quittance non trouvée', 'error');
            return;
        }

        const contrat = quittance.contrats;
        const bien = contrat.biens;
        const moisNoms = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

        // Générer le PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        let y = 20;

        // Couleurs de la direction artistique
        const primaryColor = [37, 99, 235]; // #2563EB
        const darkColor = [15, 23, 42]; // #0F172A
        const lightGray = [226, 232, 240]; // #E2E8F0
        const successColor = [5, 150, 105]; // #059669

        // Bandeau supérieur avec couleur primaire
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 35, 'F');

        // En-tête blanc sur fond bleu
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('QUITTANCE DE LOYER', pageWidth / 2, 15, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${moisNoms[quittance.mois]} ${quittance.annee}`, pageWidth / 2, 25, { align: 'center' });

        y = 45;
        doc.setTextColor(...darkColor);

        // Carte Bailleur avec fond gris clair
        doc.setFillColor(...lightGray);
        doc.roundedRect(margin, y, pageWidth - 2 * margin, 38, 3, 3, 'F');

        doc.setTextColor(...primaryColor);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('BAILLEUR', margin + 5, y + 7);

        doc.setTextColor(...darkColor);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('SARL ALCAYAMA', margin + 5, y + 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('38 rue du moulin bâtard, 44490 Le Croisic', margin + 5, y + 20);
        doc.text('RCS : 892 739 764', margin + 5, y + 26);
        doc.text('Email : alcamaya.contact@gmail.com', margin + 5, y + 32);

        y += 48;

        // Carte Locataire avec fond gris clair
        const locataireHeight = contrat.email_locataire ? 28 : 22;
        doc.setFillColor(...lightGray);
        doc.roundedRect(margin, y, pageWidth - 2 * margin, locataireHeight, 3, 3, 'F');

        doc.setTextColor(...primaryColor);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('LOCATAIRE', margin + 5, y + 7);

        doc.setTextColor(...darkColor);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${contrat.prenom_locataire} ${contrat.nom_locataire}`, margin + 5, y + 14);

        if (contrat.email_locataire) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Email : ${contrat.email_locataire}`, margin + 5, y + 20);
        }

        y += locataireHeight + 10;

        // Carte Période et bien avec fond gris clair
        let bienHeight = 22;
        if (bien.adresse) bienHeight += 6;
        if (contrat.numero_chambre) bienHeight += 6;

        doc.setFillColor(...lightGray);
        doc.roundedRect(margin, y, pageWidth - 2 * margin, bienHeight, 3, 3, 'F');

        doc.setTextColor(...primaryColor);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('PÉRIODE ET BIEN CONCERNÉS', margin + 5, y + 7);

        doc.setTextColor(...darkColor);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        let yBien = y + 14;
        doc.text(`Période : ${moisNoms[quittance.mois]} ${quittance.annee}`, margin + 5, yBien);
        yBien += 6;
        doc.text(`Bien loué : ${bien.nom || 'Non renseigné'}`, margin + 5, yBien);
        if (bien.adresse) {
            yBien += 6;
            doc.text(`Adresse : ${bien.adresse}`, margin + 5, yBien);
        }
        if (contrat.numero_chambre) {
            yBien += 6;
            doc.text(`Logement : ${contrat.numero_chambre}`, margin + 5, yBien);
        }

        y += bienHeight + 12;

        // Carte Détail des montants avec bordure bleue
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, y, pageWidth - 2 * margin, 42, 3, 3, 'FD');

        doc.setTextColor(...primaryColor);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('DÉTAIL DES MONTANTS', margin + 5, y + 7);

        doc.setTextColor(...darkColor);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Loyer', margin + 5, y + 16);
        doc.text(`${quittance.montant_loyer.toFixed(2)} €`, pageWidth - margin - 5, y + 16, { align: 'right' });

        doc.text('Charges', margin + 5, y + 24);
        doc.text(`${quittance.montant_charges.toFixed(2)} €`, pageWidth - margin - 5, y + 24, { align: 'right' });

        // Ligne de séparation
        doc.setDrawColor(...lightGray);
        doc.line(margin + 5, y + 28, pageWidth - margin - 5, y + 28);

        // Total en vert
        doc.setTextColor(...successColor);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL', margin + 5, y + 36);
        doc.text(`${quittance.montant_total.toFixed(2)} €`, pageWidth - margin - 5, y + 36, { align: 'right' });

        y += 52;
        doc.setTextColor(...darkColor);

        // Informations de paiement
        if (quittance.date_paiement || quittance.mode_paiement) {
            const paiementHeight = (quittance.date_paiement && quittance.mode_paiement) ? 28 : 22;
            doc.setFillColor(...lightGray);
            doc.roundedRect(margin, y, pageWidth - 2 * margin, paiementHeight, 3, 3, 'F');

            doc.setTextColor(...primaryColor);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('INFORMATIONS DE PAIEMENT', margin + 5, y + 7);

            doc.setTextColor(...darkColor);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            let yPaiement = y + 14;
            if (quittance.date_paiement) {
                const datePaiement = new Date(quittance.date_paiement).toLocaleDateString('fr-FR');
                doc.text(`Date de paiement : ${datePaiement}`, margin + 5, yPaiement);
                yPaiement += 6;
            }
            if (quittance.mode_paiement) {
                doc.text(`Mode de paiement : ${quittance.mode_paiement}`, margin + 5, yPaiement);
            }
            y += paiementHeight + 10;
        }

        // Observations
        if (quittance.observations) {
            const splitObs = doc.splitTextToSize(quittance.observations, pageWidth - 2 * margin - 10);
            const obsHeight = 14 + (splitObs.length * 5);

            doc.setFillColor(...lightGray);
            doc.roundedRect(margin, y, pageWidth - 2 * margin, obsHeight, 3, 3, 'F');

            doc.setTextColor(...primaryColor);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('OBSERVATIONS', margin + 5, y + 7);

            doc.setTextColor(...darkColor);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(splitObs, margin + 5, y + 14);

            y += obsHeight + 10;
        }

        // Texte légal avec fond bleu clair
        y += 5;
        const texteLegal = 'Le présent document certifie que le locataire a réglé la totalité du loyer et des charges pour la période indiquée ci-dessus.';
        const splitLegal = doc.splitTextToSize(texteLegal, pageWidth - 2 * margin - 10);
        const legalHeight = 8 + (splitLegal.length * 5);

        doc.setFillColor(239, 246, 255); // Bleu très clair
        doc.roundedRect(margin, y, pageWidth - 2 * margin, legalHeight, 3, 3, 'F');

        doc.setTextColor(...primaryColor);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(splitLegal, margin + 5, y + 6);

        y += legalHeight + 15;
        doc.setTextColor(...darkColor);

        // Date et signature
        const aujourdhui = new Date().toLocaleDateString('fr-FR');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fait à REDON, le ${aujourdhui}`, margin, y);
        y += 12;

        doc.setTextColor(...primaryColor);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Signature du bailleur', margin, y);
        y += 8;

        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin + 60, y);

        // Pied de page avec bandeau bleu
        doc.setFillColor(...primaryColor);
        doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('SARL ALCAYAMA - Document généré automatiquement', pageWidth / 2, pageHeight - 4, { align: 'center' });

        // Télécharger
        doc.save(`quittance-${moisNoms[quittance.mois]}-${quittance.annee}-${contrat.nom_locataire}.pdf`);

        hideLoading();
        showMessage('PDF généré avec succès', 'success');

    } catch (error) {
        console.error('Erreur:', error);
        hideLoading();
        showMessage('Erreur lors de la génération du PDF', 'error');
    }
};

// Envoyer une quittance par email
window.sendQuittanceEmail = async (quittanceId) => {
    try {
        showLoading();

        // Récupérer les données de la quittance
        const response = await fetch(`/api/quittances/${quittanceId}`);
        const data = await response.json();
        const quittance = data.quittance;

        if (!quittance) {
            showMessage('Quittance non trouvée', 'error');
            hideLoading();
            return;
        }

        const contrat = quittance.contrats;
        const emailLocataire = contrat.email_locataire;

        if (!emailLocataire) {
            hideLoading();
            showMessage('Aucune adresse email associée à ce contrat', 'error');
            return;
        }

        hideLoading();

        // Demander confirmation
        const moisNoms = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const confirmed = await showConfirmModal(
            'Envoyer la quittance par email ?',
            `La quittance de ${moisNoms[quittance.mois]} ${quittance.annee} sera envoyée à ${emailLocataire}`,
            'Oui, envoyer',
            'btn-success'
        );

        if (!confirmed) return;

        // Envoyer l'email
        showLoading();
        const sendResponse = await fetch(`/api/quittances/${quittanceId}/send`, {
            method: 'POST'
        });

        const sendData = await sendResponse.json();

        if (!sendResponse.ok) {
            throw new Error(sendData.error || 'Erreur lors de l\'envoi');
        }

        hideLoading();
        showMessage('Quittance envoyée par email avec succès !', 'success');

    } catch (error) {
        console.error('Erreur:', error);
        hideLoading();
        showMessage(error.message || 'Erreur lors de l\'envoi de l\'email', 'error');
    }
};

// ====== ADMINISTRATEURS GLOBAUX ======

// Ouvrir le modal des paramètres
// Remplacé par la navigation vers la page paramètres
window.openSettingsModal = async () => {
    openSettingsPage();
};

// Variable pour savoir si les event listeners sont déjà attachés
let settingsEventListenersAttached = false;

// Ouvrir la page paramètres
async function openSettingsPage() {
    // Cacher toutes les sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });

    // Afficher la section paramètres
    document.getElementById('settings-section').classList.remove('hidden');

    // Mettre à jour le nom d'utilisateur
    document.getElementById('user-name-settings').textContent = currentUser.nom || currentUser.email;

    // Attacher les event listeners une seule fois
    if (!settingsEventListenersAttached) {
        initSettingsEventListeners();
        settingsEventListenersAttached = true;
    }

    // Charger les données
    await Promise.all([
        loadBailleurInfo(),
        loadAdministrateursSettings(),
        loadCompteInfo()
    ]);
}

// Changer d'onglet dans les paramètres
window.switchSettingsTab = function(tabName) {
    console.log('Switching to tab:', tabName);

    // Mettre à jour les onglets actifs dans la sidebar
    document.querySelectorAll('.settings-tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Mettre à jour le contenu actif
    document.querySelectorAll('.settings-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetContent = document.getElementById(`tab-${tabName}`);
    if (targetContent) {
        targetContent.classList.add('active');
        console.log('Tab switched successfully to:', tabName);
    } else {
        console.error('Tab content not found:', `tab-${tabName}`);
    }
};

// Initialiser les event listeners de la page paramètres
function initSettingsEventListeners() {
    // Bouton retour depuis les paramètres
    document.getElementById('back-from-settings-btn').addEventListener('click', () => {
        document.getElementById('settings-section').classList.add('hidden');
        document.getElementById('biens-section').classList.remove('hidden');
    });

    // Bouton déconnexion depuis les paramètres
    document.getElementById('logout-settings-btn').addEventListener('click', logout);
}

// Charger les informations du bailleur
async function loadBailleurInfo() {
    try {
        const response = await fetch(`/api/bailleur?proprietaireId=${currentUser.id}`);
        const data = await response.json();

        if (data.bailleur) {
            document.getElementById('bailleur-nom').value = data.bailleur.nom || '';
            document.getElementById('bailleur-prenom').value = data.bailleur.prenom || '';
            document.getElementById('bailleur-adresse').value = data.bailleur.adresse || '';
            document.getElementById('bailleur-code-postal').value = data.bailleur.codePostal || '';
            document.getElementById('bailleur-ville').value = data.bailleur.ville || '';
            document.getElementById('bailleur-telephone').value = data.bailleur.telephone || '';
            document.getElementById('bailleur-email').value = data.bailleur.email || '';
            document.getElementById('bailleur-siret').value = data.bailleur.siret || '';
            document.getElementById('bailleur-iban').value = data.bailleur.iban || '';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des informations du bailleur:', error);
    }
}

// Sauvegarder les informations du bailleur
document.getElementById('bailleur-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const bailleurData = {
        nom: document.getElementById('bailleur-nom').value,
        prenom: document.getElementById('bailleur-prenom').value,
        adresse: document.getElementById('bailleur-adresse').value,
        codePostal: document.getElementById('bailleur-code-postal').value,
        ville: document.getElementById('bailleur-ville').value,
        telephone: document.getElementById('bailleur-telephone').value,
        email: document.getElementById('bailleur-email').value,
        siret: document.getElementById('bailleur-siret').value,
        iban: document.getElementById('bailleur-iban').value
    };

    try {
        showLoading();

        const response = await fetch(`/api/proprietaires/${currentUser.id}/bailleur`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bailleurData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de l\'enregistrement');
        }

        showMessage('Informations du bailleur enregistrées avec succès', 'success');
    } catch (error) {
        console.error('Erreur:', error);
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
});

// Charger les informations du compte
async function loadCompteInfo() {
    document.getElementById('compte-nom').value = currentUser.nom || '';
    document.getElementById('compte-email').value = currentUser.email || '';
}

// Gérer le changement de mot de passe
document.getElementById('compte-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const ancienMdp = document.getElementById('compte-ancien-mdp').value;
    const nouveauMdp = document.getElementById('compte-nouveau-mdp').value;
    const confirmerMdp = document.getElementById('compte-confirmer-mdp').value;

    if (!ancienMdp || !nouveauMdp || !confirmerMdp) {
        showMessage('Veuillez remplir tous les champs', 'error');
        return;
    }

    if (nouveauMdp !== confirmerMdp) {
        showMessage('Les mots de passe ne correspondent pas', 'error');
        return;
    }

    if (nouveauMdp.length < 6) {
        showMessage('Le mot de passe doit contenir au moins 6 caractères', 'error');
        return;
    }

    try {
        showLoading();

        // TODO: Implémenter l'API de changement de mot de passe avec Supabase
        showMessage('Fonctionnalité de changement de mot de passe à implémenter', 'error');

        // Réinitialiser les champs
        document.getElementById('compte-ancien-mdp').value = '';
        document.getElementById('compte-nouveau-mdp').value = '';
        document.getElementById('compte-confirmer-mdp').value = '';

    } catch (error) {
        console.error('Erreur:', error);
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
});

window.closeSettingsModal = () => {
    // Cette fonction n'est plus utilisée avec la nouvelle page
    openSettingsPage();
};

// Charger la liste des administrateurs (pour l'ancien modal - rétrocompatibilité)
async function loadAdministrateurs() {
    if (!currentUser || !currentUser.id) return;

    try {
        const response = await fetch(`/api/proprietaires/${currentUser.id}/administrateurs`);
        const data = await response.json();

        const container = document.getElementById('administrateurs-list');
        if (!container) return; // Si le modal n'existe plus

        if (!data.administrateurs || data.administrateurs.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun administrateur. Vous êtes le seul à gérer ces biens.</p>';
            return;
        }

        container.innerHTML = data.administrateurs.map(admin => `
            <div class="collaborateur-item">
                <div class="collaborateur-info">
                    <i class="fas fa-user-shield"></i>
                    <div>
                        <strong>${admin.utilisateur.nom || admin.utilisateur.email}</strong>
                        <small>${admin.utilisateur.email}</small>
                        <span class="badge badge-administrateur">Administrateur</span>
                    </div>
                </div>
                <button class="btn-danger-small" onclick="revoquerAdministrateur('${admin.id}')">
                    <i class="fas fa-user-times"></i> Révoquer
                </button>
            </div>
        `).join('');

    } catch (error) {
        console.error('Erreur lors du chargement des administrateurs:', error);
        // Ne pas afficher d'erreur si la table n'existe pas encore (en développement)
        const container = document.getElementById('administrateurs-list');
        if (container) {
            container.innerHTML = '<p class="empty-state">Aucun administrateur. Vous êtes le seul à gérer ces biens.</p>';
        }
    }
}

// Charger la liste des administrateurs pour la nouvelle page paramètres
async function loadAdministrateursSettings() {
    if (!currentUser || !currentUser.id) return;

    try {
        const response = await fetch(`/api/proprietaires/${currentUser.id}/administrateurs`);
        const data = await response.json();

        const container = document.getElementById('settings-admin-list');

        if (!data.administrateurs || data.administrateurs.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun utilisateur. Vous êtes le seul à gérer ces biens.</p>';
            return;
        }

        container.innerHTML = data.administrateurs.map(admin => {
            const initials = (admin.utilisateur.nom || admin.utilisateur.email).substring(0, 2).toUpperCase();
            return `
                <div class="admin-item">
                    <div class="admin-info">
                        <div class="admin-avatar">${initials}</div>
                        <div class="admin-details">
                            <div class="admin-email">${admin.utilisateur.email}</div>
                            <div class="admin-role">Administrateur</div>
                        </div>
                    </div>
                    <div class="admin-actions">
                        <button class="btn-danger" onclick="revoquerAdministrateurSettings('${admin.id}')">
                            <i class="fas fa-user-times"></i> Révoquer
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erreur lors du chargement des administrateurs:', error);
        // Ne pas afficher d'erreur si la table n'existe pas encore (en développement)
        const container = document.getElementById('settings-admin-list');
        if (container) {
            container.innerHTML = '<p class="empty-state">Aucun utilisateur. Vous êtes le seul à gérer ces biens.</p>';
        }
    }
}

// Ajouter un administrateur (fonctionne avec l'ancien modal et la nouvelle page)
window.ajouterAdministrateur = async () => {
    // Essayer de récupérer l'email depuis la nouvelle page ou l'ancien modal
    const emailInput = document.getElementById('new-admin-email') || document.getElementById('admin-email-input');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) {
        showMessage('Veuillez entrer un email', 'error');
        return;
    }

    try {
        showLoading();

        const response = await fetch(`/api/proprietaires/${currentUser.id}/administrateurs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ utilisateurEmail: email })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de l\'ajout');
        }

        showMessage('Administrateur ajouté avec succès', 'success');

        // Vider le champ
        if (emailInput) emailInput.value = '';

        // Recharger les listes
        await loadAdministrateurs(); // Pour l'ancien modal
        await loadAdministrateursSettings(); // Pour la nouvelle page

    } catch (error) {
        console.error('Erreur:', error);
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// Révoquer un administrateur (pour l'ancien modal)
window.revoquerAdministrateur = async (adminId) => {
    const confirmed = await showConfirmModal(
        'Révoquer l\'accès administrateur ?',
        'Cet utilisateur n\'aura plus accès à vos biens.',
        'Oui, révoquer',
        'btn-danger'
    );

    if (!confirmed) return;

    try {
        showLoading();

        const response = await fetch(`/api/administrateurs/${adminId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Erreur lors de la révocation');

        showMessage('Administrateur révoqué', 'success');
        await loadAdministrateurs();

    } catch (error) {
        console.error('Erreur:', error);
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// Révoquer un administrateur depuis la page paramètres
window.revoquerAdministrateurSettings = async (adminId) => {
    const confirmed = await showConfirmModal(
        'Révoquer l\'accès administrateur ?',
        'Cet utilisateur n\'aura plus accès à vos biens.',
        'Oui, révoquer',
        'btn-danger'
    );

    if (!confirmed) return;

    try {
        showLoading();

        const response = await fetch(`/api/administrateurs/${adminId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Erreur lors de la révocation');

        showMessage('Administrateur révoqué', 'success');
        await loadAdministrateursSettings();

    } catch (error) {
        console.error('Erreur:', error);
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
};
