// Sélection des éléments du DOM
const addressInput = document.getElementById('address');
const categoryButtons = document.querySelectorAll('.category-btn');
const generateBtn = document.getElementById('generate-btn');
const resultDiv = document.getElementById('result');
const anecdoteText = document.getElementById('anecdote-text');
const errorDiv = document.getElementById('error');
const loadingDiv = document.getElementById('loading');

// Variable pour stocker la catégorie sélectionnée
let selectedCategory = '';

// Gestion de la sélection des catégories
categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Retirer la classe active de tous les boutons
        categoryButtons.forEach(btn => btn.classList.remove('active'));

        // Ajouter la classe active au bouton cliqué
        button.classList.add('active');

        // Stocker la catégorie sélectionnée
        selectedCategory = button.dataset.category;
    });
});

// Gestion du clic sur le bouton "Générer"
generateBtn.addEventListener('click', async () => {
    // Récupérer l'adresse
    const address = addressInput.value.trim();

    // Validation
    if (!address) {
        showError('Veuillez entrer une adresse.');
        return;
    }

    if (!selectedCategory) {
        showError('Veuillez sélectionner une catégorie.');
        return;
    }

    // Cacher les messages précédents
    hideMessages();

    // Afficher le loader
    loadingDiv.classList.remove('hidden');
    generateBtn.disabled = true;

    try {
        // Appel à l'API
        const response = await fetch('/api/anecdote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                address: address,
                category: selectedCategory
            })
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération de l\'anecdote');
        }

        const data = await response.json();

        // Afficher l'anecdote
        showAnecdote(data.anecdote);

    } catch (error) {
        showError('Une erreur est survenue. Veuillez réessayer.');
        console.error('Erreur:', error);
    } finally {
        // Cacher le loader et réactiver le bouton
        loadingDiv.classList.add('hidden');
        generateBtn.disabled = false;
    }
});

// Fonction pour afficher une anecdote
function showAnecdote(anecdote) {
    anecdoteText.textContent = anecdote;
    resultDiv.classList.remove('hidden');
}

// Fonction pour afficher une erreur
function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

// Fonction pour cacher tous les messages
function hideMessages() {
    resultDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
}

// Permettre de valider avec la touche Enter
addressInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        generateBtn.click();
    }
});
