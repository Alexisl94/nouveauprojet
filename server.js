import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { exec } from 'child_process';

// Charger les variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware pour parser le JSON
app.use(express.json());

// Servir les fichiers statiques du dossier 'public'
app.use(express.static(join(__dirname, 'public')));

// Route pour la page d'invitation
app.get('/invitation', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'invitation.html'));
});

// Import des routes API
import { register, login } from './api/auth.js';
import {
    creerBien,
    obtenirBiens,
    obtenirBien,
    supprimerBien,
    modifierBien,
    dupliquerBien,
    ajouterObjet,
    supprimerObjet,
    mettreAJourObjet,
    ajouterSection,
    modifierSection,
    supprimerSection,
    reorganiser,
    creerEtatDesLieux,
    obtenirEtatsDesLieux,
    obtenirEtatDesLieux,
    terminerEtatDesLieux,
    mettreAJourObjetEtatDesLieux,
    supprimerEtatDesLieux
} from './api/biens.js';
import { genererPDF, genererPDFEtat } from './api/pdf.js';
import { obtenirPhotos, uploadPhoto, supprimerPhoto, updatePhotoLegende } from './api/photos.js';
import { obtenirContrats, creerContrat, archiverContrat, terminerContrat, supprimerContrat, genererContratPDF, getInvitationStatus, obtenirTousLesContrats } from './api/contrats.js';
import { obtenirQuittances, creerQuittance, supprimerQuittance, obtenirQuittance, envoyerQuittanceEmail, genererQuittancePDF } from './api/quittances.js';
import { uploadMiddleware, uploadPhotoToStorage } from './api/upload.js';
import { obtenirAdministrateurs, ajouterAdministrateur, revoquerAdministrateur, obtenirBiensAccessibles } from './api/administrateurs.js';
import { obtenirBailleur, upsertBailleur } from './api/bailleur.js';
import { inviteLocataire, verifyInvitationToken, acceptInvitation, createLocataireAccount } from './api/invitations.js';
import {
    getLocataireDashboard,
    getLocataireContratAPI,
    getLocataireQuittances,
    getLocataireQuittance,
    getLocataireEtatDesLieux,
    getLocatairePhotos,
    getLocataireBien,
    getLocataireContratPDF,
    getLocataireEtatDesLieuxPDF,
    getLocataireQuittancePDF,
    getLocataireEtatDesLieuxByIdPDF
} from './api/locataire.js';

// Routes d'authentification
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

// Routes pour les biens
app.post('/api/biens', creerBien);
app.get('/api/biens', obtenirBiens);
app.get('/api/biens/:id', obtenirBien);
app.put('/api/biens/:id', modifierBien);
app.post('/api/biens/:id/duplicate', dupliquerBien);
app.delete('/api/biens/:id', supprimerBien);

// Routes pour les objets
app.post('/api/biens/:bienId/objets', ajouterObjet);
app.delete('/api/biens/:bienId/objets/:objetId', supprimerObjet);
app.put('/api/biens/:bienId/objets/:objetId', mettreAJourObjet);

// Routes pour les sections
app.post('/api/biens/sections', ajouterSection);
app.put('/api/biens/:bienId/sections/:sectionId', modifierSection);
app.delete('/api/biens/:bienId/sections/:sectionId', supprimerSection);

// Route pour réorganiser
app.put('/api/biens/:bienId/reorganiser', reorganiser);

// Routes pour les états des lieux
app.post('/api/etats-des-lieux', creerEtatDesLieux);
app.get('/api/biens/:bienId/etats-des-lieux', obtenirEtatsDesLieux);
app.get('/api/biens/:bienId/etats-des-lieux/:etatId', obtenirEtatDesLieux);
app.put('/api/biens/:bienId/etats-des-lieux/:etatId/terminer', terminerEtatDesLieux);
app.put('/api/biens/:bienId/etats-des-lieux/:etatId/objets/:objetId', mettreAJourObjetEtatDesLieux);
app.delete('/api/biens/:bienId/etats-des-lieux/:etatId', supprimerEtatDesLieux);

// Routes pour générer les PDFs
app.get('/api/pdf/:bienId', genererPDF);
app.get('/api/biens/:bienId/etats-des-lieux/:etatId/pdf', genererPDFEtat);

// Routes pour les photos
app.get('/api/biens/:bienId/photos', obtenirPhotos);
app.post('/api/biens/:bienId/photos', uploadPhoto);
app.delete('/api/photos/:photoId', supprimerPhoto);
app.put('/api/photos/:photoId/legende', updatePhotoLegende);

// Route pour l'upload de photo vers Supabase Storage
app.post('/api/upload/photo', uploadMiddleware, uploadPhotoToStorage);

// Routes pour les contrats
app.get('/api/contrats', obtenirTousLesContrats);
app.get('/api/biens/:bienId/contrats', obtenirContrats);
app.post('/api/biens/:bienId/contrats', creerContrat);
app.get('/api/contrats/:contratId/pdf', genererContratPDF);
app.get('/api/contrats/:contratId/invitation-status', getInvitationStatus);
app.put('/api/contrats/:contratId/archiver', archiverContrat);
app.put('/api/contrats/:contratId/terminer', terminerContrat);
app.delete('/api/contrats/:contratId', supprimerContrat);

// Routes pour les quittances
app.get('/api/biens/:bienId/quittances', obtenirQuittances);
app.post('/api/biens/:bienId/quittances', creerQuittance);
app.get('/api/quittances/:quittanceId', obtenirQuittance);
app.get('/api/quittances/:quittanceId/pdf', genererQuittancePDF);
app.delete('/api/quittances/:quittanceId', supprimerQuittance);
app.post('/api/quittances/:quittanceId/send', envoyerQuittanceEmail);

// Routes pour les administrateurs globaux
app.get('/api/biens-accessibles', obtenirBiensAccessibles);
app.get('/api/proprietaires/:proprietaireId/administrateurs', obtenirAdministrateurs);
app.post('/api/proprietaires/:proprietaireId/administrateurs', ajouterAdministrateur);
app.delete('/api/administrateurs/:adminId', revoquerAdministrateur);

// Routes pour les informations du bailleur
app.get('/api/bailleur', obtenirBailleur);
app.post('/api/proprietaires/:proprietaireId/bailleur', upsertBailleur);

// Routes pour les invitations locataires
app.post('/api/contrats/:contratId/invite-locataire', inviteLocataire);
app.get('/api/invitations/:token', verifyInvitationToken);
app.post('/api/invitations/:token/accept', acceptInvitation);
// Route pour créer directement un compte locataire (pour tests/dev)
app.post('/api/contrats/:contratId/create-locataire-account', createLocataireAccount);

// Routes pour l'espace locataire
app.get('/api/locataire/dashboard', getLocataireDashboard);
app.get('/api/locataire/contrat', getLocataireContratAPI);
app.get('/api/locataire/quittances', getLocataireQuittances);
app.get('/api/locataire/quittances/:quittanceId', getLocataireQuittance);
app.get('/api/locataire/etat-des-lieux', getLocataireEtatDesLieux);
app.get('/api/locataire/photos', getLocatairePhotos);
app.get('/api/locataire/bien', getLocataireBien);

// Routes PDF pour l'espace locataire
app.get('/api/locataire/contrat/pdf', getLocataireContratPDF);
app.get('/api/locataire/etat-des-lieux/pdf', getLocataireEtatDesLieuxPDF);
app.get('/api/locataire/etats-des-lieux/:edlId/pdf', getLocataireEtatDesLieuxByIdPDF);
app.get('/api/locataire/quittances/:quittanceId/pdf', getLocataireQuittancePDF);

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📍 Ouvrez votre navigateur à cette adresse pour voir l'application`);

    // Afficher l'IP WSL pour accès depuis Windows
    exec('hostname -I', (error, stdout) => {
        if (!error && stdout) {
            const wslIp = stdout.trim().split(' ')[0];
            console.log(`\n🌐 Accès depuis Windows (WSL2): http://${wslIp}:${PORT}`);
        }
    });
});
