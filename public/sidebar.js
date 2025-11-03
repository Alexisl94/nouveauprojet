// ==================== SIDEBAR NAVIGATION ====================

let allBiens = []; // Stocke tous les biens pour la sidebar

// Initialiser la sidebar après la connexion
function initSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const appContent = document.getElementById('app-content');

    // Afficher la sidebar et le contenu
    sidebar.classList.remove('hidden');
    appContent.classList.remove('hidden');

    // Mettre à jour le nom d'utilisateur
    document.getElementById('sidebar-user-name').textContent = currentUser.nom || currentUser.email;

    // Attacher les event listeners
    attachSidebarListeners();

    // Marquer le bouton "Mes Biens" comme actif
    const bienButton = document.querySelector('.sidebar-item[data-page="biens"]');
    if (bienButton) {
        bienButton.classList.add('active');
    }

    // Afficher la page par défaut (mes biens) immédiatement
    showBiensListPage();

    // Charger la liste des biens pour le sous-menu (asynchrone)
    loadBiensToSidebar();
}

// Charger les biens dans le sous-menu de la sidebar
async function loadBiensToSidebar() {
    try {
        const response = await fetch(`/api/biens?proprietaireId=${currentUser.id}`);
        const data = await response.json();

        allBiens = data.biens || [];

        const submenu = document.getElementById('biens-submenu');
        if (allBiens.length === 0) {
            submenu.innerHTML = '<div style="padding: 8px 20px 8px 32px; font-size: 0.75rem; color: rgba(255,255,255,0.4);">Aucun bien</div>';
            return;
        }

        submenu.innerHTML = allBiens.map(bien => `
            <button class="sidebar-submenu-item" data-bien-id="${bien.id}">
                <i class="fas fa-home"></i>
                <span>${bien.nom}</span>
            </button>
        `).join('');

        // Ouvrir automatiquement le sous-menu
        submenu.classList.add('open');

        // Event listeners pour les sous-items
        submenu.querySelectorAll('.sidebar-submenu-item').forEach(item => {
            item.addEventListener('click', () => {
                const bienId = item.dataset.bienId;
                navigateToBien(bienId);

                // Mettre à jour l'état actif
                submenu.querySelectorAll('.sidebar-submenu-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });

    } catch (error) {
        console.error('Erreur chargement biens sidebar:', error);
    }
}

// Attacher les event listeners de la sidebar
function attachSidebarListeners() {
    // Navigation principale
    document.querySelectorAll('.sidebar-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;

            // Navigation vers la page
            navigateToPage(page);

            // Mettre à jour l'état actif
            document.querySelectorAll('.sidebar-item[data-page]').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Désactiver les sous-items
            document.querySelectorAll('.sidebar-submenu-item').forEach(i => i.classList.remove('active'));

            // Toggle du sous-menu pour la page "biens"
            if (page === 'biens') {
                const submenu = document.getElementById('biens-submenu');
                submenu.classList.toggle('open');
            }
        });
    });

    // Déconnexion
    document.getElementById('sidebar-logout-btn').addEventListener('click', handleLogout);
}

// Fonction de déconnexion
function handleLogout() {
    currentUser = null;

    // Cacher la sidebar et app-content
    const sidebar = document.getElementById('app-sidebar');
    const appContent = document.getElementById('app-content');
    sidebar.classList.add('hidden');
    appContent.classList.add('hidden');

    // Afficher la section auth
    const authSection = document.getElementById('auth-section');
    authSection.classList.remove('hidden');

    // Cacher les anciennes sections
    const biensSection = document.getElementById('biens-section');
    const bienDetailSection = document.getElementById('bien-detail-section');
    if (biensSection) biensSection.classList.add('hidden');
    if (bienDetailSection) bienDetailSection.classList.add('hidden');

    // Réinitialiser les formulaires
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
}

// Navigation vers une page
function navigateToPage(page) {
    const appContent = document.getElementById('app-content');
    const bienDetailSection = document.getElementById('bien-detail-section');
    const etatsListSection = document.getElementById('etats-list-section');
    const etatDetailSection = document.getElementById('etat-detail-section');

    // Cacher toutes les sections de détail
    if (bienDetailSection) {
        bienDetailSection.classList.add('hidden');
    }
    if (etatsListSection) {
        etatsListSection.classList.add('hidden');
    }
    if (etatDetailSection) {
        etatDetailSection.classList.add('hidden');
    }

    // Réinitialiser les IDs courants
    window.currentBienId = null;
    window.currentBien = null;

    // S'assurer que app-content est visible
    appContent.classList.remove('hidden');

    // Nettoyer le contenu actuel
    appContent.innerHTML = '';

    switch(page) {
        case 'biens':
            showBiensListPage();
            break;
        case 'bailleur':
            showBailleurPage();
            break;
        case 'utilisateurs':
            showUtilisateursPage();
            break;
        case 'compte':
            showComptePage();
            break;
        case 'contrats':
            showContratsPage();
            break;
    }
}

// Afficher la page liste des biens
function showBiensListPage() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <!-- Dashboard Section -->
        <div class="dashboard">
            <h2 class="dashboard-title">Tableau de bord</h2>
            <div class="dashboard-grid">
                <!-- Carte Taux d'occupation -->
                <div class="dashboard-card card-occupancy">
                    <div class="card-header">
                        <div class="card-icon">
                            <i class="fas fa-chart-pie"></i>
                        </div>
                        <div>
                            <h4>Taux d'occupation</h4>
                            <p class="card-subtitle">Biens loués actuellement</p>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="metric-main">
                            <span id="dashboard-occupied" class="metric-number">0</span>
                            <span class="metric-separator">/</span>
                            <span id="dashboard-total" class="metric-total">0</span>
                        </div>
                        <div class="progress-bar">
                            <div id="dashboard-progress" class="progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="progress-label">
                            <span id="dashboard-percentage">0%</span>
                            <span class="progress-status" id="dashboard-status">Aucun bien</span>
                        </div>
                    </div>
                </div>

                <!-- Carte Loyers mensuels -->
                <div class="dashboard-card card-revenue">
                    <div class="card-header">
                        <div class="card-icon">
                            <i class="fas fa-euro-sign"></i>
                        </div>
                        <div>
                            <h4>Loyers mensuels</h4>
                            <p class="card-subtitle">Revenus des contrats actifs</p>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="metric-main revenue-metric">
                            <span id="dashboard-revenue" class="metric-number">0</span>
                            <span class="metric-currency">€</span>
                        </div>
                        <div class="revenue-details">
                            <div class="revenue-item">
                                <i class="fas fa-file-contract"></i>
                                <span><span id="dashboard-active-contracts">0</span> contrat(s) actif(s)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Carte Actions rapides -->
                <div class="dashboard-card card-quick-actions">
                    <div class="card-header">
                        <div class="card-icon">
                            <i class="fas fa-bolt"></i>
                        </div>
                        <div>
                            <h4>Actions rapides</h4>
                            <p class="card-subtitle">Créer rapidement</p>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="quick-actions-grid">
                            <button class="quick-action-btn" onclick="ouvrirCreationContrat()">
                                <div class="quick-action-icon">
                                    <i class="fas fa-file-contract"></i>
                                </div>
                                <span class="quick-action-label">Créer un contrat</span>
                            </button>
                            <button class="quick-action-btn" onclick="ouvrirCreationQuittance()">
                                <div class="quick-action-icon">
                                    <i class="fas fa-receipt"></i>
                                </div>
                                <span class="quick-action-label">Créer une quittance</span>
                            </button>
                            <button class="quick-action-btn" onclick="ouvrirCreationEtat()">
                                <div class="quick-action-icon">
                                    <i class="fas fa-clipboard-check"></i>
                                </div>
                                <span class="quick-action-label">Démarrer état des lieux</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="page-header">
            <h1>Mes Biens</h1>
            <button onclick="openCreateBienModal()" class="btn-primary">
                <i class="fas fa-plus"></i> Nouveau Bien
            </button>
        </div>
        <div id="biens-list-container" class="biens-grid"></div>
    `;

    // Charger et afficher les biens
    loadAndDisplayBiens();
}

// Fonction helper pour ouvrir le modal de création de bien
window.openCreateBienModal = function() {
    const modal = document.getElementById('bien-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('bien-nom').value = '';
        document.getElementById('bien-adresse').value = '';
    }
}

// Charger et afficher les biens
async function loadAndDisplayBiens() {
    try {
        showLoading();
        const response = await fetch(`/api/biens?proprietaireId=${currentUser.id}`);
        const data = await response.json();

        allBiens = data.biens || [];

        const container = document.getElementById('biens-list-container');

        if (allBiens.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun bien. Créez-en un pour commencer.</p>';
            return;
        }

        container.innerHTML = allBiens.map(bien => {
            const locataireText = bien.locataireActuel
                ? `${bien.locataireActuel.prenom} ${bien.locataireActuel.nom}`
                : '<span style="color: var(--text-lighter); font-style: italic;">Aucun</span>';

            return `
                <div class="item-card">
                    <h3>${bien.nom}</h3>
                    <p style="margin-bottom: 8px;">${bien.adresse || 'Pas d\'adresse renseignée'}</p>
                    <div class="bien-meta">
                        <small><i class="fas fa-cube"></i> ${bien.objets ? bien.objets.length : 0} élément(s)</small>
                        <small class="locataire-info"><i class="fas fa-user"></i> Locataire: ${locataireText}</small>
                    </div>
                    <div class="item-actions">
                        <button onclick="navigateToBien('${bien.id}')" class="btn-primary">Gérer</button>
                        <button onclick="editBien('${bien.id}', '${bien.nom.replace(/'/g, "\\'")}', '${(bien.adresse || '').replace(/'/g, "\\'")}')" class="btn-secondary" title="Modifier"><i class="fas fa-edit"></i></button>
                        <button onclick="duplicateBien('${bien.id}')" class="btn-secondary" title="Dupliquer"><i class="fas fa-clone"></i></button>
                        <button onclick="deleteBien('${bien.id}')" class="btn-danger" title="Supprimer"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');

        // Rafraîchir aussi le sous-menu
        loadBiensToSidebar();
        updateDashboard(allBiens);

    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Erreur de chargement des biens', 'error');
    } finally {
        hideLoading();
    }
}

// Navigation vers un bien spécifique
window.navigateToBien = async function(bienId) {
    console.log('Navigation vers bien:', bienId);

    // Stocker l'ID du bien actuel
    window.currentBienId = bienId;

    // Simplement appeler openBienDetail qui va gérer l'affichage
    if (typeof window.openBienDetail === 'function') {
        await window.openBienDetail(bienId);
    }
}

// Éditer un bien
window.editBien = function(bienId, nom, adresse) {
    const modal = document.getElementById('bien-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('bien-nom').value = nom;
        document.getElementById('bien-adresse').value = adresse;
        // TODO: Stocker l'ID pour faire un UPDATE au lieu d'un INSERT
        window.currentEditingBienId = bienId;
    }
}

// Dupliquer un bien
window.duplicateBien = async function(bienId) {
    if (!confirm('Voulez-vous dupliquer ce bien ?')) return;

    try {
        showLoading();
        const response = await fetch(`/api/biens/${bienId}/duplicate`, {
            method: 'POST'
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de la duplication');
        }

        showMessage('Bien dupliqué avec succès', 'success');
        loadAndDisplayBiens();
    } catch (error) {
        console.error('Erreur:', error);
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Supprimer un bien
window.deleteBien = async function(bienId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bien ? Cette action est irréversible.')) return;

    try {
        showLoading();
        const response = await fetch(`/api/biens/${bienId}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de la suppression');
        }

        showMessage('Bien supprimé avec succès', 'success');
        loadAndDisplayBiens();
    } catch (error) {
        console.error('Erreur:', error);
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Actions rapides - Créer un contrat
window.ouvrirCreationContrat = function() {
    showMessage('Fonctionnalité de création de contrat à venir', 'info');
}

// Actions rapides - Créer une quittance
window.ouvrirCreationQuittance = function() {
    showMessage('Fonctionnalité de création de quittance à venir', 'info');
}

// Actions rapides - Démarrer un état des lieux
window.ouvrirCreationEtat = function() {
    showMessage('Fonctionnalité de création d\'état des lieux à venir', 'info');
}

// Afficher la page Bailleur
function showBailleurPage() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div class="page-header">
            <h1>Informations du Bailleur</h1>
        </div>
        <div class="settings-card">
            <div class="settings-card-header">
                <p class="settings-subtitle">Ces informations seront utilisées automatiquement dans vos contrats, quittances et documents</p>
            </div>
            <div class="settings-card-body">
                <form id="bailleur-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="bailleur-nom">Nom / Raison sociale *</label>
                            <input type="text" id="bailleur-nom" required>
                        </div>
                        <div class="form-group">
                            <label for="bailleur-prenom">Prénom (si personne physique)</label>
                            <input type="text" id="bailleur-prenom">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="bailleur-adresse">Adresse complète *</label>
                            <input type="text" id="bailleur-adresse" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="bailleur-code-postal">Code postal *</label>
                            <input type="text" id="bailleur-code-postal" required>
                        </div>
                        <div class="form-group">
                            <label for="bailleur-ville">Ville *</label>
                            <input type="text" id="bailleur-ville" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="bailleur-telephone">Téléphone</label>
                            <input type="tel" id="bailleur-telephone">
                        </div>
                        <div class="form-group">
                            <label for="bailleur-email">Email</label>
                            <input type="email" id="bailleur-email">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="bailleur-siret">SIRET (si société)</label>
                            <input type="text" id="bailleur-siret" placeholder="14 chiffres">
                        </div>
                        <div class="form-group">
                            <label for="bailleur-iban">IBAN</label>
                            <input type="text" id="bailleur-iban" placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX">
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Enregistrer les informations
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Charger les données
    loadBailleurInfo();

    // Attacher l'event listener du formulaire
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
}

// Afficher la page Utilisateurs
function showUtilisateursPage() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div class="page-header">
            <h1>Gestion des Utilisateurs</h1>
        </div>
        <div class="settings-card">
            <div class="settings-card-header">
                <p class="settings-subtitle">Ajoutez des utilisateurs qui pourront accéder à vos biens</p>
            </div>
            <div class="settings-card-body">
                <div class="admin-add-section">
                    <h4>Ajouter un utilisateur</h4>
                    <div class="form-row">
                        <input type="email" id="new-admin-email" placeholder="Email de l'utilisateur" class="form-control">
                        <button onclick="ajouterAdministrateur()" class="btn-success">
                            <i class="fas fa-user-plus"></i> Inviter
                        </button>
                    </div>
                </div>

                <div class="admin-list-section">
                    <h4>Utilisateurs avec accès</h4>
                    <div id="settings-admin-list" class="admin-list">
                        <!-- Liste chargée dynamiquement -->
                    </div>
                </div>
            </div>
        </div>
    `;

    loadAdministrateursSettings();
}

// Afficher la page Mon Compte
function showComptePage() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div class="page-header">
            <h1>Mon Compte</h1>
        </div>
        <div class="settings-card">
            <div class="settings-card-header">
                <p class="settings-subtitle">Gérez vos informations personnelles</p>
            </div>
            <div class="settings-card-body">
                <form id="compte-form">
                    <div class="form-group">
                        <label for="compte-nom">Nom</label>
                        <input type="text" id="compte-nom" readonly>
                    </div>

                    <div class="form-group">
                        <label for="compte-email">Email</label>
                        <input type="email" id="compte-email" readonly>
                    </div>

                    <div class="form-section-divider">
                        <h4>Modifier le mot de passe</h4>
                    </div>

                    <div class="form-group">
                        <label for="compte-ancien-mdp">Ancien mot de passe</label>
                        <input type="password" id="compte-ancien-mdp">
                    </div>

                    <div class="form-group">
                        <label for="compte-nouveau-mdp">Nouveau mot de passe</label>
                        <input type="password" id="compte-nouveau-mdp">
                    </div>

                    <div class="form-group">
                        <label for="compte-confirmer-mdp">Confirmer le nouveau mot de passe</label>
                        <input type="password" id="compte-confirmer-mdp">
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-key"></i> Changer le mot de passe
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    loadCompteInfo();

    // Event listener pour le formulaire
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
            showMessage('Fonctionnalité de changement de mot de passe à implémenter', 'error');

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
}

// ==================== FONCTIONS HELPER POUR LES PAGES ====================

// Charger les informations du bailleur
async function loadBailleurInfo() {
    try {
        const response = await fetch('/api/bailleur');
        const data = await response.json();

        if (response.ok && data.bailleur) {
            const b = data.bailleur;
            document.getElementById('bailleur-nom').value = b.nom || '';
            document.getElementById('bailleur-prenom').value = b.prenom || '';
            document.getElementById('bailleur-adresse').value = b.adresse || '';
            document.getElementById('bailleur-code-postal').value = b.code_postal || '';
            document.getElementById('bailleur-ville').value = b.ville || '';
            document.getElementById('bailleur-telephone').value = b.telephone || '';
            document.getElementById('bailleur-email').value = b.email || '';
            document.getElementById('bailleur-siret').value = b.siret || '';
            document.getElementById('bailleur-iban').value = b.iban || '';
        }
    } catch (error) {
        console.error('Erreur chargement bailleur:', error);
    }
}

// Charger les informations du compte
function loadCompteInfo() {
    if (currentUser) {
        document.getElementById('compte-nom').value = currentUser.nom || '';
        document.getElementById('compte-email').value = currentUser.email || '';
    }
}

// Charger les administrateurs pour les paramètres
async function loadAdministrateursSettings() {
    if (!currentUser) return;

    try {
        const response = await fetch(`/api/proprietaires/${currentUser.id}/administrateurs`);
        const data = await response.json();

        if (response.ok && data.administrateurs) {
            const listContainer = document.getElementById('settings-admin-list');

            if (data.administrateurs.length === 0) {
                listContainer.innerHTML = '<p class="empty-message">Aucun utilisateur avec accès pour le moment</p>';
                return;
            }

            listContainer.innerHTML = data.administrateurs.map(admin => `
                <div class="admin-item">
                    <div class="admin-info">
                        <i class="fas fa-user-circle"></i>
                        <span>${admin.email}</span>
                    </div>
                    <button onclick="revoquerAdministrateurSettings('${admin.id}')" class="btn-danger-small">
                        <i class="fas fa-times"></i> Révoquer
                    </button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Erreur chargement administrateurs:', error);
    }
}

// Ajouter un administrateur depuis les paramètres
window.ajouterAdministrateur = async function() {
    const email = document.getElementById('new-admin-email').value.trim();

    if (!email) {
        showMessage('Veuillez entrer un email', 'error');
        return;
    }

    if (!currentUser) return;

    try {
        showLoading();

        const response = await fetch(`/api/proprietaires/${currentUser.id}/administrateurs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de l\'ajout');
        }

        showMessage('Utilisateur ajouté avec succès', 'success');
        document.getElementById('new-admin-email').value = '';
        loadAdministrateursSettings();

    } catch (error) {
        console.error('Erreur:', error);
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Révoquer un administrateur depuis les paramètres
window.revoquerAdministrateurSettings = async function(adminId) {
    if (!confirm('Êtes-vous sûr de vouloir révoquer l\'accès de cet utilisateur ?')) {
        return;
    }

    try {
        showLoading();

        const response = await fetch(`/api/administrateurs/${adminId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de la révocation');
        }

        showMessage('Accès révoqué avec succès', 'success');
        loadAdministrateursSettings();

    } catch (error) {
        console.error('Erreur:', error);
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== PAGE CONTRATS & LOCATAIRES ====================

let contratsData = [];
let currentContratIdForInvitation = null;

// Afficher la page des contrats
function showContratsPage() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div class="page-header">
            <h1>Gestion des Contrats</h1>
            <p style="color: var(--text-secondary); margin-top: 8px;">Gérez vos contrats de location et invitez vos locataires</p>
        </div>

        <div class="settings-card">
            <div class="settings-card-header">
                <h3>Contrats actifs</h3>
            </div>
            <div class="settings-card-body">
                <div id="contrats-list-container">
                    <div class="loading-spinner" style="text-align: center; padding: 40px;">
                        <div class="spinner" style="border: 3px solid var(--border-primary); border-top: 3px solid var(--primary-color); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
                        <p>Chargement des contrats...</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal d'invitation -->
        <div id="invitation-modal-contrats" class="modal hidden">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>Inviter le locataire</h3>
                    <button class="close-modal" onclick="closeInvitationModalContrats()">×</button>
                </div>
                <div class="modal-body">
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">
                        Le locataire recevra une invitation pour créer son compte et accéder à son espace personnel.
                    </p>

                    <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="margin-bottom: 12px;">
                            <strong>Contrat:</strong> <span id="modal-contrat-nom"></span>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <strong>Locataire:</strong> <span id="modal-locataire-nom"></span>
                        </div>
                        <div>
                            <strong>Email:</strong> <span id="modal-locataire-email"></span>
                        </div>
                    </div>

                    <div id="invitation-result" class="hidden"></div>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="closeInvitationModalContrats()">Annuler</button>
                    <button class="btn-primary" id="send-invitation-btn-contrats" onclick="sendInvitationContrats()">
                        <i class="fas fa-paper-plane"></i> Envoyer l'invitation
                    </button>
                </div>
            </div>
        </div>

        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .contrat-card {
                border: 1px solid var(--border-primary);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 16px;
                background: white;
                transition: all 0.2s;
            }

            .contrat-card:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .contrat-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 16px;
            }

            .contrat-title {
                font-size: 18px;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 4px;
            }

            .contrat-subtitle {
                font-size: 14px;
                color: var(--text-secondary);
            }

            .contrat-actions {
                display: flex;
                gap: 8px;
            }

            .contrat-info {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 16px;
            }

            .info-item {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
            }

            .info-item i {
                color: var(--primary-color);
                width: 20px;
            }

            .badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
            }

            .badge.success {
                background: var(--bg-success);
                color: var(--primary-color);
            }

            .badge.warning {
                background: #fed7aa;
                color: #ea580c;
            }

            .btn-invite {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                background: var(--primary-color);
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }

            .btn-invite:hover {
                background: #2d7a45;
                transform: translateY(-2px);
            }

            .btn-invite:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }

            .empty-state {
                text-align: center;
                padding: 60px 20px;
            }

            .empty-state i {
                font-size: 48px;
                color: var(--border-primary);
                margin-bottom: 16px;
            }

            .empty-state h3 {
                font-size: 18px;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0 0 8px 0;
            }

            .empty-state p {
                font-size: 14px;
                color: var(--text-secondary);
                margin: 0;
            }

            .success-message {
                background: var(--bg-success);
                color: var(--primary-color);
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 16px;
            }

            .link-box {
                background: var(--bg-secondary);
                padding: 12px;
                border-radius: 8px;
                font-family: monospace;
                word-break: break-all;
                margin-top: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .link-box code {
                flex: 1;
                font-size: 13px;
            }

            .copy-btn {
                padding: 6px 12px;
                background: white;
                border: 1px solid var(--border-primary);
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                white-space: nowrap;
            }

            .copy-btn:hover {
                background: var(--bg-secondary);
            }
        </style>
    `;

    // Charger les contrats
    loadContratsData();
}

// Charger les données des contrats
async function loadContratsData() {
    const container = document.getElementById('contrats-list-container');

    try {
        const response = await fetch(`/api/contrats?proprietaireId=${currentUser.id}`);

        if (!response.ok) {
            throw new Error('Erreur lors du chargement des contrats');
        }

        const data = await response.json();
        contratsData = data.contrats || [];

        if (contratsData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-contract"></i>
                    <h3>Aucun contrat</h3>
                    <p>Vous n'avez pas encore de contrat enregistré</p>
                </div>
            `;
            return;
        }

        // Afficher les contrats
        container.innerHTML = contratsData.map(contrat => createContratCardHTML(contrat)).join('');

        // Charger le statut d'invitation pour chaque contrat
        for (const contrat of contratsData) {
            loadInvitationStatusForContrat(contrat.id);
        }

    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erreur</h3>
                <p>Impossible de charger les contrats</p>
            </div>
        `;
    }
}

// Charger le statut d'invitation pour un contrat spécifique
async function loadInvitationStatusForContrat(contratId) {
    const contrat = contratsData.find(c => c.id === contratId);
    if (!contrat) return;

    const statusBadge = document.getElementById(`status-${contratId}`);
    const actionsZone = document.getElementById(`actions-${contratId}`);

    try {
        const response = await fetch(`/api/contrats/${contratId}/invitation-status`);
        const data = await response.json();

        if (response.ok && data.status) {
            const status = data.status;

            // Mettre à jour le badge de statut
            statusBadge.innerHTML = generateInvitationBadge(contrat, status);

            // Mettre à jour les actions
            actionsZone.innerHTML = generateInvitationActions(contrat, status);
        } else {
            // Fallback en cas d'erreur
            statusBadge.innerHTML = generateInvitationBadge(contrat, null);
            actionsZone.innerHTML = generateInvitationActions(contrat, null);
        }
    } catch (error) {
        console.error(`Erreur chargement statut invitation pour contrat ${contratId}:`, error);
        // Fallback en cas d'erreur
        statusBadge.innerHTML = generateInvitationBadge(contrat, null);
        actionsZone.innerHTML = generateInvitationActions(contrat, null);
    }
}

// Générer le badge d'invitation simplifié
function generateInvitationBadge(contrat, status) {
    const hasEmail = contrat.locataire_email && contrat.locataire_email.trim() !== '';

    if (!hasEmail) {
        return '<span class="status-badge badge-warning">Aucun email</span>';
    }

    if (status && status.locataire_connected) {
        return '<span class="status-badge badge-success">✓ Accès actif</span>';
    }

    if (status && status.invitation_sent && !status.invitation_expired) {
        return '<span class="status-badge badge-info">En attente</span>';
    }

    if (status && status.invitation_expired) {
        return '<span class="status-badge badge-warning">Expirée</span>';
    }

    return '<span class="status-badge badge-default">Non invité</span>';
}

// Générer les actions d'invitation simplifiées
function generateInvitationActions(contrat, status) {
    const hasEmail = contrat.locataire_email && contrat.locataire_email.trim() !== '';

    if (!hasEmail) {
        return `<p class="help-text">Ajoutez un email pour inviter ce locataire</p>`;
    }

    if (status && status.locataire_connected) {
        return `<p class="success-text">✓ Le locataire peut se connecter à son espace</p>`;
    }

    if (status && status.invitation_sent && !status.invitation_expired && status.invitation_link) {
        return `
            <div class="link-share-row">
                <input type="text" readonly value="${status.invitation_link}" class="link-input" id="link-${contrat.id}">
                <button class="btn-copy" onclick="copyInvitationLinkFromCard('${contrat.id}')">
                    <i class="fas fa-copy"></i> Copier
                </button>
            </div>
        `;
    }

    // Pas encore invité ou expiré
    return `
        <button class="btn-invite" onclick="openInvitationModalContrats('${contrat.id}')">
            ${(status && status.invitation_expired) ? 'Renvoyer l\'invitation' : 'Donner accès'}
        </button>
    `;
}

// Copier le lien d'invitation depuis une carte
window.copyInvitationLinkFromCard = function(contratId) {
    const input = document.getElementById(`link-${contratId}`);
    if (input) {
        input.select();
        navigator.clipboard.writeText(input.value).then(() => {
            const btn = event.target.closest('.btn-copy-link');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copié !';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        });
    }
}

// Créer le HTML d'une carte de contrat simple et épurée
function createContratCardHTML(contrat) {
    const hasEmail = contrat.locataire_email && contrat.locataire_email.trim() !== '';
    const prenom = contrat.locataire_prenom || '';
    const nom = contrat.locataire_nom || '';
    const nomComplet = `${prenom} ${nom}`.trim() || 'Locataire';

    return `
        <div class="contrat-simple-card" id="contrat-${contrat.id}">
            <div class="contrat-simple-header">
                <div class="contrat-main-info">
                    <h3 class="contrat-locataire-name">${nomComplet}</h3>
                    <p class="contrat-bien-name">${contrat.bien_nom || 'Bien'}</p>
                </div>
                <div class="contrat-status-container" id="status-${contrat.id}">
                    <div class="loading-dot"></div>
                </div>
            </div>

            <div class="contrat-simple-body">
                <div class="contrat-email-row">
                    <span class="label-text">Email :</span>
                    <span class="value-text ${!hasEmail ? 'text-muted' : ''}">${hasEmail ? contrat.locataire_email : 'Non renseigné'}</span>
                </div>

                <div class="contrat-actions-container" id="actions-${contrat.id}">
                    <div class="loading-dot"></div>
                </div>
            </div>
        </div>
    `;
}

// Ouvrir le modal d'invitation
window.openInvitationModalContrats = function(contratId) {
    const contrat = contratsData.find(c => c.id === contratId);
    if (!contrat) return;

    currentContratIdForInvitation = contratId;

    // Remplir les informations
    document.getElementById('modal-contrat-nom').textContent = contrat.bien_nom || 'Bien';
    document.getElementById('modal-locataire-nom').textContent =
        `${contrat.locataire_prenom || ''} ${contrat.locataire_nom || 'Locataire'}`.trim();
    document.getElementById('modal-locataire-email').textContent = contrat.locataire_email || '';

    // Afficher le modal
    document.getElementById('invitation-modal-contrats').classList.remove('hidden');
    document.getElementById('invitation-result').classList.add('hidden');
    document.getElementById('send-invitation-btn-contrats').disabled = false;
}

// Fermer le modal
window.closeInvitationModalContrats = function() {
    document.getElementById('invitation-modal-contrats').classList.add('hidden');
    currentContratIdForInvitation = null;
}

// Envoyer l'invitation
window.sendInvitationContrats = async function() {
    if (!currentContratIdForInvitation) return;

    const btn = document.getElementById('send-invitation-btn-contrats');
    const resultDiv = document.getElementById('invitation-result');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
    resultDiv.classList.add('hidden');

    try {
        const response = await fetch(`/api/contrats/${currentContratIdForInvitation}/invite-locataire`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de l\'envoi de l\'invitation');
        }

        // Succès
        resultDiv.innerHTML = `
            <div class="success-message">
                <h4 style="margin: 0 0 8px 0;"><i class="fas fa-check-circle"></i> Invitation envoyée !</h4>
                <p style="margin: 0 0 12px 0; font-size: 14px;">
                    Une invitation a été créée pour ce locataire.
                </p>
                <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600;">
                    Lien d'invitation (à envoyer au locataire) :
                </p>
                <div class="link-box">
                    <code id="invitation-link-contrats">${data.invitation.invitation_link}</code>
                    <button class="copy-btn" onclick="copyInvitationLinkContrats()">
                        <i class="fas fa-copy"></i> Copier
                    </button>
                </div>
                <p style="margin: 12px 0 0 0; font-size: 12px; color: var(--text-secondary);">
                    Le lien expire le ${formatDateTimeContrat(data.invitation.expires_at)}
                </p>
            </div>
        `;
        resultDiv.classList.remove('hidden');

        btn.innerHTML = '<i class="fas fa-check"></i> Invitation créée';

        // Recharger le statut d'invitation pour ce contrat immédiatement
        loadInvitationStatusForContrat(currentContratIdForInvitation);

        // Fermer le modal après 3 secondes
        setTimeout(() => {
            closeInvitationModalContrats();
        }, 3000);

    } catch (error) {
        console.error('Erreur:', error);
        resultDiv.innerHTML = `
            <div style="background: #fee2e2; color: #dc2626; padding: 16px; border-radius: 8px;">
                <h4 style="margin: 0 0 8px 0;"><i class="fas fa-exclamation-circle"></i> Erreur</h4>
                <p style="margin: 0; font-size: 14px;">${error.message}</p>
            </div>
        `;
        resultDiv.classList.remove('hidden');

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer l\'invitation';
    }
}

// Copier le lien d'invitation
window.copyInvitationLinkContrats = function() {
    const link = document.getElementById('invitation-link-contrats').textContent;
    navigator.clipboard.writeText(link).then(() => {
        const btn = event.target.closest('.copy-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copié !';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 2000);
    });
}

// Utilitaires de formatage pour les contrats
function formatCurrencyContrat(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount || 0);
}

function formatDateContrat(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

function formatDateTimeContrat(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}
