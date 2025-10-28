// Configuration
const API_BASE = window.location.origin;
let contrats = [];
let currentContratId = null;

// Charger les contrats au démarrage
window.addEventListener('DOMContentLoaded', async () => {
    await loadContrats();
});

// Charger tous les contrats
async function loadContrats() {
    const container = document.getElementById('contrats-list');
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Chargement...</p></div>';

    try {
        // Pour l'instant, on récupère tous les contrats via l'API
        // TODO: Créer un endpoint dédié /api/contrats
        const response = await fetch(`${API_BASE}/api/contrats`);

        if (!response.ok) {
            throw new Error('Erreur lors du chargement des contrats');
        }

        const data = await response.json();
        contrats = data.contrats || [];

        if (contrats.length === 0) {
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
        container.innerHTML = contrats.map(contrat => createContratCard(contrat)).join('');

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

// Créer une carte de contrat
function createContratCard(contrat) {
    const hasEmail = contrat.locataire_email && contrat.locataire_email.trim() !== '';
    const locataireLinked = contrat.locataire_user_id != null;

    return `
        <div class="contrat-card">
            <div class="contrat-header">
                <div>
                    <div class="contrat-title">
                        ${contrat.locataire_prenom || ''} ${contrat.locataire_nom || 'Locataire'}
                        ${locataireLinked ? '<span class="badge success"><i class="fas fa-check"></i> Compte actif</span>' : ''}
                    </div>
                    <div class="contrat-subtitle">
                        ${contrat.bien_nom || 'Bien'} - ${formatDate(contrat.date_debut)}
                    </div>
                </div>
                <div class="contrat-actions">
                    ${hasEmail && !locataireLinked ? `
                        <button class="btn-invite" onclick="openInvitationModal('${contrat.id}')">
                            <i class="fas fa-paper-plane"></i>
                            Inviter
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="contrat-info">
                <div class="info-item">
                    <i class="fas fa-envelope"></i>
                    <span>${hasEmail ? contrat.locataire_email : 'Aucun email'}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-euro-sign"></i>
                    <span>${formatCurrency(contrat.loyer || 0)} / mois</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <span>Du ${formatDate(contrat.date_debut)} ${contrat.date_fin ? 'au ' + formatDate(contrat.date_fin) : ''}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-${contrat.statut === 'actif' ? 'check-circle' : 'clock'}"></i>
                    <span class="badge ${contrat.statut === 'actif' ? 'success' : 'warning'}">${contrat.statut || 'Inconnu'}</span>
                </div>
            </div>

            ${!hasEmail ? `
                <div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin-top: 12px; font-size: 14px; color: #92400e;">
                    <i class="fas fa-info-circle"></i> Ajoutez un email au locataire pour pouvoir l'inviter
                </div>
            ` : ''}

            ${locataireLinked ? `
                <div style="background: var(--bg-success); padding: 12px; border-radius: 8px; margin-top: 12px; font-size: 14px; color: var(--primary-color);">
                    <i class="fas fa-check-circle"></i> Le locataire a accès à son espace personnel
                </div>
            ` : ''}
        </div>
    `;
}

// Ouvrir le modal d'invitation
function openInvitationModal(contratId) {
    const contrat = contrats.find(c => c.id === contratId);
    if (!contrat) return;

    currentContratId = contratId;

    // Remplir les informations
    document.getElementById('modal-contrat-nom').textContent = contrat.bien_nom || 'Bien';
    document.getElementById('modal-locataire-nom').textContent =
        `${contrat.locataire_prenom || ''} ${contrat.locataire_nom || 'Locataire'}`.trim();
    document.getElementById('modal-locataire-email').textContent = contrat.locataire_email || '';

    // Afficher le modal
    document.getElementById('invitation-modal').classList.remove('hidden');
    document.getElementById('invitation-result').classList.add('hidden');
    document.getElementById('send-invitation-btn').disabled = false;
}

// Fermer le modal
function closeInvitationModal() {
    document.getElementById('invitation-modal').classList.add('hidden');
    currentContratId = null;
}

// Envoyer l'invitation
async function sendInvitation() {
    if (!currentContratId) return;

    const btn = document.getElementById('send-invitation-btn');
    const resultDiv = document.getElementById('invitation-result');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
    resultDiv.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE}/api/contrats/${currentContratId}/invite-locataire`, {
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
                    <code id="invitation-link">${data.invitation.invitation_link}</code>
                    <button class="copy-btn" onclick="copyInvitationLink()">
                        <i class="fas fa-copy"></i> Copier
                    </button>
                </div>
                <p style="margin: 12px 0 0 0; font-size: 12px; color: var(--text-secondary);">
                    Le lien expire le ${formatDateTime(data.invitation.expires_at)}
                </p>
            </div>
        `;
        resultDiv.classList.remove('hidden');

        btn.innerHTML = '<i class="fas fa-check"></i> Invitation créée';

        // Recharger la liste des contrats après 2 secondes
        setTimeout(() => {
            loadContrats();
        }, 2000);

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
function copyInvitationLink() {
    const link = document.getElementById('invitation-link').textContent;
    navigator.clipboard.writeText(link).then(() => {
        const btn = event.target.closest('.copy-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copié !';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 2000);
    });
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

function formatDateTime(dateStr) {
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
