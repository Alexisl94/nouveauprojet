// Gestion de la page d'invitation locataire
const API_BASE = window.location.origin;

// Récupérer le token depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const invitationToken = urlParams.get('token');

// États de la page
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const formState = document.getElementById('form-state');
const successState = document.getElementById('success-state');

// Éléments du formulaire
const invitationForm = document.getElementById('invitation-form');
const passwordInput = document.getElementById('password');
const passwordConfirmInput = document.getElementById('password-confirm');
const emailInput = document.getElementById('email');
const submitBtn = document.getElementById('submit-btn');
const formError = document.getElementById('form-error');
const strengthFill = document.getElementById('strength-fill');

// Vérifier le token au chargement
window.addEventListener('DOMContentLoaded', async () => {
    if (!invitationToken) {
        showError('Aucun token d\'invitation fourni');
        return;
    }

    await verifyInvitation();
});

// Vérifier la validité de l'invitation
async function verifyInvitation() {
    try {
        const response = await fetch(`${API_BASE}/api/invitations/${invitationToken}`);
        const data = await response.json();

        if (!response.ok || !data.valid) {
            showError(data.error || 'Invitation invalide ou expirée');
            return;
        }

        // Afficher le formulaire avec les informations
        showForm(data.invitation);

    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors de la vérification de l\'invitation');
    }
}

// Afficher le formulaire
function showForm(invitation) {
    // Masquer le loading
    loadingState.classList.add('hidden');

    // Remplir les informations
    document.getElementById('bien-info').textContent = invitation.bien.nom;
    document.getElementById('adresse-info').textContent = invitation.bien.adresse;
    document.getElementById('email-info').textContent = invitation.email;
    emailInput.value = invitation.email;

    // Afficher le formulaire
    formState.classList.remove('hidden');
}

// Afficher l'erreur
function showError(message) {
    loadingState.classList.add('hidden');
    formState.classList.add('hidden');
    errorState.classList.remove('hidden');
    document.getElementById('error-message').textContent = message;
}

// Calculer la force du mot de passe
function calculatePasswordStrength(password) {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    return Math.min(strength, 3);
}

// Mettre à jour l'indicateur de force
passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const strength = calculatePasswordStrength(password);

    strengthFill.className = 'strength-bar-fill';

    if (password.length === 0) {
        strengthFill.style.width = '0%';
    } else if (strength === 1) {
        strengthFill.classList.add('strength-weak');
    } else if (strength === 2) {
        strengthFill.classList.add('strength-medium');
    } else {
        strengthFill.classList.add('strength-strong');
    }
});

// Gérer la soumission du formulaire
invitationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;

    // Validation
    if (password.length < 8) {
        showFormError('Le mot de passe doit contenir au moins 8 caractères');
        return;
    }

    if (password !== passwordConfirm) {
        showFormError('Les mots de passe ne correspondent pas');
        return;
    }

    // Désactiver le bouton
    submitBtn.disabled = true;
    submitBtn.textContent = 'Création en cours...';
    hideFormError();

    try {
        const response = await fetch(`${API_BASE}/api/invitations/${invitationToken}/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de la création du compte');
        }

        // Succès !
        showSuccess();

        // Auto-connexion et redirection après 2 secondes
        setTimeout(async () => {
            await loginAndRedirect(data.user.email, password);
        }, 2000);

    } catch (error) {
        console.error('Erreur:', error);
        showFormError(error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Créer mon compte';
    }
});

// Afficher le succès
function showSuccess() {
    formState.classList.add('hidden');
    successState.classList.remove('hidden');
}

// Afficher une erreur dans le formulaire
function showFormError(message) {
    formError.textContent = message;
    formError.classList.add('show');
}

// Masquer l'erreur du formulaire
function hideFormError() {
    formError.classList.remove('show');
}

// Connexion automatique et redirection
async function loginAndRedirect(email, password) {
    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.token) {
            // Stocker le token et les infos utilisateur
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Rediriger vers l'espace locataire
            window.location.href = '/';
        } else {
            // En cas d'échec, rediriger vers la page de connexion
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Erreur connexion:', error);
        window.location.href = '/';
    }
}
