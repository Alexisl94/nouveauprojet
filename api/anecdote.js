// Vercel Serverless Function pour générer une anecdote avec Claude API
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
    // Vérifier que c'est une requête POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const { address, category } = req.body;

        // Validation des données
        if (!address || !category) {
            return res.status(400).json({
                error: 'Adresse et catégorie requises'
            });
        }

        // Vérifier que la clé API est définie
        if (!process.env.ANTHROPIC_API_KEY) {
            console.error('ANTHROPIC_API_KEY non définie');
            return res.status(500).json({
                error: 'Configuration serveur manquante'
            });
        }

        // Initialiser le client Anthropic
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        // Construire le prompt pour Claude
        const userPrompt = buildUserPrompt(address, category);
        const systemPrompt = buildSystemPrompt();

        // Appeler l'API Claude
        const message = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 500,
            temperature: 0.3,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: userPrompt
                }
            ]
        });

        // Extraire l'anecdote de la réponse
        const anecdote = message.content[0].text;

        // Retourner l'anecdote
        return res.status(200).json({
            anecdote: anecdote.trim()
        });

    } catch (error) {
        console.error('Erreur API Claude:', error);

        // Gestion des erreurs spécifiques
        if (error.status === 401) {
            return res.status(500).json({
                error: 'Erreur d\'authentification API'
            });
        }

        if (error.status === 429) {
            return res.status(429).json({
                error: 'Limite de requêtes dépassée. Réessayez dans quelques instants.'
            });
        }

        // Erreur générique
        return res.status(500).json({
            error: 'Une erreur est survenue lors de la génération de l\'anecdote'
        });
    }
}

// Fonction pour construire le prompt système
function buildSystemPrompt() {
    return `Tu es un assistant spécialisé en anecdotes locales historiques et géographiques.
Tu dois utiliser UNIQUEMENT tes connaissances factuelles réelles sur les lieux.
Fournis TOUJOURS exactement UNE anecdote courte (1 à 4 phrases) basée sur des faits historiques, géographiques ou culturels AVÉRÉS.
Stratégie : cherche au plus près du lieu, puis élargis progressivement jusqu'à trouver une anecdote intéressante.
ZÉRO INVENTION - uniquement des faits vérifiables.
Ne donne jamais de sources, pas d'explications techniques, juste l'anecdote.`;
}

// Fonction pour construire le prompt utilisateur selon la catégorie
function buildUserPrompt(address, category) {
    // Hint spécial pour la catégorie aléatoire
    const randomHint = category === 'aléatoire'
        ? '\n- Choisis la catégorie la plus pertinente d\'après le lieu (historique, culturelle, géographique ou sociale).'
        : '';

    return `Adresse : ${address}
Catégorie demandée : ${category}

Instructions :
- Cherche dans TES CONNAISSANCES une anecdote VRAIE et VÉRIFIABLE
- Stratégie de recherche (du plus proche au plus large) :
  1. L'adresse exacte ou le monument/lieu précis
  2. La rue ou le quartier immédiat
  3. Le quartier ou arrondissement
  4. La ville entière
  5. La région ou département
  6. Si nécessaire, élargis à la zone géographique proche (pays/région historique)
- Tu DOIS toujours trouver une anecdote intéressante en élargissant progressivement
- Types d'anecdotes (selon catégorie) :
  • Historiques : événements, personnages célèbres, batailles, transformations urbaines
  • Culturelles/sociales : traditions, fêtes, vie locale, patrimoine
  • Insolites/dramatiques : incidents historiques, catastrophes, crimes célèbres
  • Géographiques : caractéristiques naturelles, géologie, monuments, infrastructures
- N'invente JAMAIS. Utilise uniquement ce que tu SAIS être vrai.${randomHint}
- Format : uniquement l'anecdote (1–4 phrases), rien d'autre.
- Commence l'anecdote en mentionnant le lieu précis dont tu parles.`;
}
