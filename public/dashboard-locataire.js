// Configuration de l'API
const API_BASE = window.location.origin;

// État de l'application
let currentUser = null;
let token = null;
let dashboardData = null;

// Vérification de l'authentification au chargement
window.addEventListener('DOMContentLoaded', async () => {
    // Récupérer le token et l'utilisateur depuis localStorage
    token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        // Pas de token, rediriger vers la page de connexion
        window.location.href = '/';
        return;
    }

    currentUser = JSON.parse(userStr);

    // Vérifier que c'est bien un locataire
    if (currentUser.role !== 'locataire') {
        alert('Accès réservé aux locataires');
        window.location.href = '/';
        return;
    }

    // Afficher les infos utilisateur
    displayUserInfo();

    // Charger le dashboard
    await loadDashboard();

    // Setup de la navigation
    setupNavigation();

    // Setup du bouton de déconnexion
    document.getElementById('logout-btn').addEventListener('click', logout);
});

// Afficher les infos utilisateur dans la sidebar
function displayUserInfo() {
    const avatar = document.getElementById('user-avatar');
    const name = document.getElementById('user-name');
    const email = document.getElementById('user-email');

    const initials = currentUser.nom ? currentUser.nom.charAt(0).toUpperCase() : 'L';
    avatar.textContent = initials;
    name.textContent = currentUser.nom || 'Locataire';
    email.textContent = currentUser.email;
}

// Charger les données du dashboard
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/api/locataire/dashboard?userId=${currentUser.id}`);

        if (!response.ok) {
            if (response.status === 401) {
                alert('Session expirée, veuillez vous reconnecter');
                logout();
                return;
            }
            throw new Error('Erreur lors du chargement du dashboard');
        }

        dashboardData = await response.json();
        displayDashboard();
    } catch (error) {
        console.error('Erreur:', error);
        showError('dashboard', 'Impossible de charger les données du dashboard');
    }
}

// Afficher le dashboard
function displayDashboard() {
    // Statistiques
    const stats = dashboardData.stats || {};
    document.getElementById('stat-loyer').textContent = formatCurrency(stats.total_mensuel || 0);
    document.getElementById('stat-echeance').textContent = stats.prochaine_echeance
        ? formatDate(stats.prochaine_echeance)
        : '-';
    document.getElementById('stat-quittances').textContent = stats.nombre_quittances || 0;
    document.getElementById('stat-depot').textContent = formatCurrency(dashboardData.contrat?.depot_garantie || 0);

    // Informations du bien
    const bienInfo = document.getElementById('bien-info');
    if (dashboardData.bien) {
        bienInfo.innerHTML = `
            <div class="info-row">
                <span class="info-label">Nom du bien</span>
                <span class="info-value">${dashboardData.bien.nom || '-'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Adresse</span>
                <span class="info-value">${dashboardData.bien.adresse || '-'}</span>
            </div>
        `;
    } else {
        bienInfo.innerHTML = '<div class="empty-state"><p>Aucune information disponible</p></div>';
    }

    // Dernières quittances
    const recentQuittances = document.getElementById('recent-quittances');
    if (dashboardData.quittances_recentes && dashboardData.quittances_recentes.length > 0) {
        recentQuittances.innerHTML = `
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Période</th>
                            <th>Montant</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dashboardData.quittances_recentes.map(q => {
                            const statut = q.date_paiement ? 'Payée' : 'En attente';
                            const badgeClass = q.date_paiement ? 'success' : 'warning';
                            return `
                            <tr>
                                <td>${formatPeriod(q)}</td>
                                <td>${formatCurrency(q.montant_total)}</td>
                                <td><span class="badge ${badgeClass}">${statut}</span></td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        recentQuittances.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <h3>Aucune quittance</h3>
                <p>Aucune quittance disponible pour le moment</p>
            </div>
        `;
    }
}

// Configuration de la navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.tenant-nav-item');
    const sections = document.querySelectorAll('.tenant-section');

    navItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const sectionName = item.dataset.section;

            // Mettre à jour l'UI
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(sec => sec.classList.remove('active'));
            const section = document.getElementById(sectionName);
            section.classList.add('active');

            // Charger les données de la section si nécessaire
            await loadSection(sectionName);
        });
    });
}

// Charger une section spécifique
async function loadSection(sectionName) {
    switch(sectionName) {
        case 'dashboard':
            // Déjà chargé
            break;
        case 'contrat':
            await loadContrat();
            break;
        case 'quittances':
            await loadQuittances();
            break;
        case 'etat-des-lieux':
            await loadEtatDesLieux();
            break;
        case 'bien':
            await loadBien();
            break;
        case 'documents':
            await loadDocuments();
            break;
    }
}

// Charger le contrat
async function loadContrat() {
    const content = document.getElementById('contrat-content');

    if (!dashboardData || !dashboardData.contrat) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-contract"></i>
                <h3>Aucun contrat</h3>
                <p>Aucun contrat actif trouvé</p>
            </div>
        `;
        return;
    }

    const contrat = dashboardData.contrat;
    const bien = dashboardData.bien || {};

    content.innerHTML = `
        <div class="content-card-header">
            <h3 class="content-card-title">Détails du contrat</h3>
            <span class="badge success">Actif</span>
        </div>

        <div class="info-row">
            <span class="info-label">Date de début</span>
            <span class="info-value">${formatDate(contrat.date_debut)}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Date de fin</span>
            <span class="info-value">${contrat.date_fin ? formatDate(contrat.date_fin) : 'Non définie'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Loyer mensuel</span>
            <span class="info-value">${formatCurrency(contrat.loyer)}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Charges</span>
            <span class="info-value">${formatCurrency(contrat.charges || 0)}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Total mensuel</span>
            <span class="info-value">${formatCurrency((contrat.loyer || 0) + (contrat.charges || 0))}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Dépôt de garantie</span>
            <span class="info-value">${formatCurrency(contrat.depot_garantie || 0)}</span>
        </div>

        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border-primary);">
            <h4 style="margin-bottom: 16px; font-size: 16px; font-weight: 600;">Informations du bien</h4>
            <div class="info-row">
                <span class="info-label">Nom</span>
                <span class="info-value">${bien.nom || '-'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Adresse</span>
                <span class="info-value">${bien.adresse || '-'}</span>
            </div>
        </div>
    `;
}

// Charger les quittances
async function loadQuittances() {
    const content = document.getElementById('quittances-content');
    content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Chargement...</p></div>';

    try {
        const response = await fetch(`${API_BASE}/api/locataire/quittances?userId=${currentUser.id}`);

        if (!response.ok) throw new Error('Erreur lors du chargement des quittances');

        const data = await response.json();

        if (data.quittances && data.quittances.length > 0) {
            content.innerHTML = `
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Période</th>
                                <th>Loyer</th>
                                <th>Charges</th>
                                <th>Total</th>
                                <th>Statut</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.quittances.map(q => {
                                const statut = q.date_paiement ? 'Payée' : 'En attente';
                                const badgeClass = q.date_paiement ? 'success' : 'warning';
                                return `
                                <tr>
                                    <td>${formatPeriod(q)}</td>
                                    <td>${formatCurrency(q.montant_loyer)}</td>
                                    <td>${formatCurrency(q.montant_charges || 0)}</td>
                                    <td><strong>${formatCurrency(q.montant_total)}</strong></td>
                                    <td><span class="badge ${badgeClass}">${statut}</span></td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <h3>Aucune quittance</h3>
                    <p>Aucune quittance disponible pour le moment</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erreur:', error);
        content.innerHTML = '<div class="empty-state"><p>Erreur lors du chargement des quittances</p></div>';
    }
}

// Charger l'état des lieux
async function loadEtatDesLieux() {
    const content = document.getElementById('edl-content');
    content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Chargement...</p></div>';

    try {
        const response = await fetch(`${API_BASE}/api/locataire/etat-des-lieux?userId=${currentUser.id}`);

        if (!response.ok) throw new Error('Erreur lors du chargement de l\'état des lieux');

        const data = await response.json();

        if (data.etatDesLieux) {
            const edl = data.etatDesLieux;
            content.innerHTML = `
                <div class="content-card-header">
                    <h3 class="content-card-title">État des lieux d'entrée</h3>
                    <span class="badge success">${formatDate(edl.date)}</span>
                </div>

                <div class="info-row">
                    <span class="info-label">Date</span>
                    <span class="info-value">${formatDate(edl.date)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Type</span>
                    <span class="info-value">Entrée</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Locataire</span>
                    <span class="info-value">${edl.locataire || currentUser.nom}</span>
                </div>

                ${edl.objets && edl.objets.length > 0 ? `
                    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border-primary);">
                        <h4 style="margin-bottom: 16px; font-size: 16px; font-weight: 600;">Éléments inventoriés (${edl.objets.length})</h4>
                        <div class="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Section</th>
                                        <th>Élément</th>
                                        <th>État</th>
                                        <th>Observations</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${edl.objets.map(obj => `
                                        <tr>
                                            <td>${obj.section || '-'}</td>
                                            <td>${obj.nom || '-'}</td>
                                            <td><span class="badge ${getEtatColor(obj.etat)}">${obj.etat || '-'}</span></td>
                                            <td>${obj.observations || '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}
            `;
        } else {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-check"></i>
                    <h3>Aucun état des lieux</h3>
                    <p>L'état des lieux d'entrée n'est pas encore disponible</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erreur:', error);
        content.innerHTML = '<div class="empty-state"><p>Erreur lors du chargement de l\'état des lieux</p></div>';
    }
}

// Charger les infos du bien
async function loadBien() {
    const content = document.getElementById('bien-content');

    if (!dashboardData || !dashboardData.bien) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-building"></i>
                <h3>Aucune information</h3>
                <p>Les informations du bien ne sont pas disponibles</p>
            </div>
        `;
        return;
    }

    const bien = dashboardData.bien;

    content.innerHTML = `
        <div class="content-card-header">
            <h3 class="content-card-title">Informations du logement</h3>
        </div>

        <div class="info-row">
            <span class="info-label">Nom</span>
            <span class="info-value">${bien.nom || '-'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Adresse</span>
            <span class="info-value">${bien.adresse || '-'}</span>
        </div>

        ${bien.description ? `
            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-primary);">
                <h4 style="margin-bottom: 12px; font-size: 16px; font-weight: 600;">Description</h4>
                <p style="color: var(--text-secondary); line-height: 1.6;">${bien.description}</p>
            </div>
        ` : ''}
    `;

    // Charger les photos
    await loadPhotos(content);
}

// Charger les photos du bien
async function loadPhotos(parentElement) {
    try {
        const response = await fetch(`${API_BASE}/api/locataire/photos?userId=${currentUser.id}`);

        if (!response.ok) return;

        const data = await response.json();

        if (data.photos && data.photos.length > 0) {
            const photosHTML = `
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border-primary);">
                    <h4 style="margin-bottom: 16px; font-size: 16px; font-weight: 600;">Photos du logement (${data.photos.length})</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
                        ${data.photos.map(photo => `
                            <div style="aspect-ratio: 4/3; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-primary);">
                                <img src="${photo.url}" alt="Photo du bien" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            parentElement.insertAdjacentHTML('beforeend', photosHTML);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des photos:', error);
    }
}

// Déconnexion
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Utilitaires de formatage
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

function formatPeriod(period) {
    if (!period) return '-';

    // Si c'est un objet avec mois et annee
    if (typeof period === 'object' && period.mois && period.annee) {
        const date = new Date(period.annee, period.mois - 1);
        return new Intl.DateTimeFormat('fr-FR', {
            year: 'numeric',
            month: 'long'
        }).format(date);
    }

    // Sinon format string "YYYY-MM"
    const [year, month] = period.split('-');
    const date = new Date(year, month - 1);
    return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long'
    }).format(date);
}

function getEtatColor(etat) {
    if (!etat) return '';
    const lowerEtat = etat.toLowerCase();
    if (lowerEtat.includes('bon') || lowerEtat.includes('neuf') || lowerEtat.includes('excellent')) {
        return 'success';
    }
    if (lowerEtat.includes('moyen') || lowerEtat.includes('correct')) {
        return 'warning';
    }
    if (lowerEtat.includes('mauvais') || lowerEtat.includes('défectueux')) {
        return 'danger';
    }
    return '';
}

function showError(sectionId, message) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.querySelector('.loading-spinner, .content-card').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erreur</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// ==========================================
// FONCTIONS POUR LA GESTION DES PDFs
// ==========================================

// Télécharger le PDF du contrat
function downloadContrat() {
    window.open(`${API_BASE}/api/locataire/contrat/pdf?userId=${currentUser.id}`, '_blank');
}

// Télécharger le PDF de l'état des lieux
function downloadEtatDesLieux() {
    window.open(`${API_BASE}/api/locataire/etat-des-lieux/pdf?userId=${currentUser.id}`, '_blank');
}

// Charger et afficher les quittances en vue liste moderne
async function loadQuittancesCards() {
    const listElement = document.getElementById('quittances-list');

    try {
        const response = await fetch(`${API_BASE}/api/locataire/quittances?userId=${currentUser.id}`);

        if (!response.ok) throw new Error('Erreur lors du chargement des quittances');

        const data = await response.json();

        if (data.quittances && data.quittances.length > 0) {
            // Afficher toutes les quittances en vue liste
            listElement.innerHTML = data.quittances.map(q => {
                const isPaid = !!q.date_paiement;
                const statutText = isPaid ? 'Payée' : 'En attente';
                const badgeClass = isPaid ? 'paid' : 'pending';
                const iconBg = isPaid ? '#DCFCE7' : '#FEF3C7';
                const iconColor = isPaid ? '#059669' : '#D97706';

                return `
                <div class="quittance-list-item">
                    <div class="quittance-period">
                        <div class="quittance-period-icon" style="background: ${iconBg}; color: ${iconColor};">
                            <i class="fas fa-receipt"></i>
                        </div>
                        <div class="quittance-period-text">
                            <h4>${formatPeriod(q)}</h4>
                            <p>${isPaid && q.date_paiement ? 'Payée le ' + new Date(q.date_paiement).toLocaleDateString('fr-FR') : 'En attente de paiement'}</p>
                        </div>
                    </div>
                    <div class="quittance-amount">
                        ${formatCurrency(q.montant_total)}
                    </div>
                    <div>
                        <span class="quittance-status-badge ${badgeClass}">
                            <i class="fas fa-circle"></i>
                            ${statutText}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: flex-end;">
                        <button class="quittance-download-btn" onclick="downloadQuittance('${q.id}')" title="Télécharger">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
                `;
            }).join('');
        } else {
            listElement.innerHTML = `
                <div class="quittances-empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>Aucune quittance disponible pour le moment</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erreur:', error);
        listElement.innerHTML = `
            <div class="quittances-empty-state">
                <i class="fas fa-exclamation-circle" style="color: #EF4444;"></i>
                <p>Erreur lors du chargement des quittances</p>
            </div>
        `;
    }
}

// Télécharger une quittance spécifique
function downloadQuittance(quittanceId) {
    window.open(`${API_BASE}/api/locataire/quittances/${quittanceId}/pdf?userId=${currentUser.id}`, '_blank');
}

// Charger et afficher les états des lieux en vue liste
async function loadEtatsDesLieuxList() {
    const listElement = document.getElementById('edl-list');

    try {
        const response = await fetch(`${API_BASE}/api/locataire/etat-des-lieux?userId=${currentUser.id}`);

        if (!response.ok) throw new Error('Erreur lors du chargement des états des lieux');

        const data = await response.json();

        if (data.etatsDesLieux && data.etatsDesLieux.length > 0) {
            // Afficher tous les états des lieux en vue liste
            listElement.innerHTML = data.etatsDesLieux.map(edl => {
                const typeText = edl.type === 'entree' ? "État des lieux d'entrée" : "État des lieux de sortie";
                const statutText = 'Disponible';
                const badgeClass = 'paid';
                const iconBg = edl.type === 'entree' ? '#DBEAFE' : '#FCE7F3';
                const iconColor = edl.type === 'entree' ? '#2563EB' : '#DB2777';

                return `
                <div class="quittance-list-item">
                    <div class="quittance-period">
                        <div class="quittance-period-icon" style="background: ${iconBg}; color: ${iconColor};">
                            <i class="fas fa-clipboard-check"></i>
                        </div>
                        <div class="quittance-period-text">
                            <h4>${typeText}</h4>
                            <p>${edl.date_creation ? 'Créé le ' + new Date(edl.date_creation).toLocaleDateString('fr-FR') : 'Date non renseignée'}</p>
                        </div>
                    </div>
                    <div class="quittance-amount" style="font-size: 14px; font-weight: 500;">
                        ${edl.date_creation ? new Date(edl.date_creation).toLocaleDateString('fr-FR') : 'N/A'}
                    </div>
                    <div>
                        <span class="quittance-status-badge ${badgeClass}">
                            <i class="fas fa-circle"></i>
                            ${statutText}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: flex-end;">
                        <button class="quittance-download-btn" onclick="downloadEtatDesLieuxById('${edl.id}')" title="Télécharger">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
                `;
            }).join('');
        } else {
            listElement.innerHTML = `
                <div class="quittances-empty-state">
                    <i class="fas fa-clipboard-check"></i>
                    <p>Aucun état des lieux disponible pour le moment</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erreur:', error);
        listElement.innerHTML = `
            <div class="quittances-empty-state">
                <i class="fas fa-exclamation-circle" style="color: #EF4444;"></i>
                <p>Erreur lors du chargement des états des lieux</p>
            </div>
        `;
    }
}

// Télécharger un état des lieux spécifique par son ID
function downloadEtatDesLieuxById(edlId) {
    window.open(`${API_BASE}/api/locataire/etats-des-lieux/${edlId}/pdf?userId=${currentUser.id}`, '_blank');
}

// Charger la section documents
async function loadDocuments() {
    // Setup des event listeners pour les boutons de téléchargement
    const btnContrat = document.getElementById('btn-download-contrat');

    if (btnContrat) {
        btnContrat.addEventListener('click', (e) => {
            e.preventDefault();
            downloadContrat();
        });
    }

    // Charger automatiquement les états des lieux et les quittances
    await loadEtatsDesLieuxList();
    await loadQuittancesCards();
}
