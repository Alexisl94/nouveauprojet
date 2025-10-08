import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataPath = join(__dirname, '../data.json');

async function loadData() {
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
}

export async function genererPDF(req, res) {
    try {
        const { bienId } = req.params;

        const data = await loadData();
        const bien = data.biens.find(b => b.id === bienId);

        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        const proprietaire = data.proprietaires.find(p => p.id === bien.proprietaireId);

        // Créer le document PDF
        const doc = new PDFDocument({ margin: 50 });

        // Envoyer le PDF en streaming
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=etat-des-lieux-${bien.nom.replace(/\s/g, '-')}.pdf`);
        doc.pipe(res);

        // En-tête
        doc.fontSize(20).text('ÉTAT DES LIEUX', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12);
        doc.text(`Bien: ${bien.nom}`);
        if (bien.adresse) doc.text(`Adresse: ${bien.adresse}`);
        doc.text(`Propriétaire: ${proprietaire.nom}`);
        doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`);
        doc.moveDown(2);

        // Tableau des objets
        doc.fontSize(14).text('État du bien', { underline: true });
        doc.moveDown();

        if (bien.objets.length === 0) {
            doc.fontSize(12).text('Aucun objet défini pour ce bien.');
        } else {
            bien.objets.forEach((objet) => {
                doc.fontSize(12).font('Helvetica-Bold');
                doc.text(objet.nom, { continued: false });
                doc.font('Helvetica');

                if (objet.description) {
                    doc.fontSize(10).fillColor('gray');
                    doc.text(`   Description: ${objet.description}`);
                    doc.fillColor('black');
                }

                doc.fontSize(10);
                const entreeText = objet.entree ? '☑' : '☐';
                const sortieText = objet.sortie ? '☑' : '☐';
                doc.text(`   ${entreeText} Entrée    ${sortieText} Sortie`);

                if (objet.note > 0) {
                    const etoiles = '★'.repeat(objet.note) + '☆'.repeat(5 - objet.note);
                    doc.text(`   Note: ${etoiles} (${objet.note}/5)`);
                }

                if (objet.commentaires) {
                    doc.fillColor('blue');
                    doc.text(`   Commentaires: ${objet.commentaires}`);
                    doc.fillColor('black');
                }

                doc.moveDown(1);
            });
        }

        // Signatures
        doc.addPage();
        doc.fontSize(12);
        doc.text('Signatures', { underline: true });
        doc.moveDown(2);

        doc.text('Le propriétaire:');
        doc.moveDown(3);
        doc.text('________________________________');

        doc.moveDown(2);
        doc.text('Le locataire:');
        doc.moveDown(3);
        doc.text('________________________________');

        doc.moveDown(2);
        doc.fontSize(10).fillColor('gray');
        doc.text(`Document généré le ${new Date().toLocaleString('fr-FR')}`);

        // Finaliser le PDF
        doc.end();
    } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

export async function genererPDFEtat(req, res) {
    try {
        const { etatId } = req.params;

        const data = await loadData();
        const etat = data.etatsDesLieux.find(e => e.id === etatId);

        if (!etat) {
            return res.status(404).json({ error: 'État des lieux non trouvé' });
        }

        const bien = data.biens.find(b => b.id === etat.bienId);
        if (!bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        const proprietaire = data.proprietaires.find(p => p.id === bien.proprietaireId);

        // Créer le document PDF
        const doc = new PDFDocument({ margin: 50 });

        // Envoyer le PDF en streaming
        const typeLabel = etat.type === 'entree' ? 'entree' : 'sortie';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=etat-${typeLabel}-${bien.nom.replace(/\s/g, '-')}.pdf`);
        doc.pipe(res);

        // En-tête
        const titre = etat.type === 'entree' ? 'ÉTAT DES LIEUX D\'ENTRÉE' : 'ÉTAT DES LIEUX DE SORTIE';
        doc.fontSize(20).text(titre, { align: 'center' });
        doc.moveDown();

        doc.fontSize(12);
        doc.text(`Bien: ${bien.nom}`);
        if (bien.adresse) doc.text(`Adresse: ${bien.adresse}`);
        doc.text(`Propriétaire: ${proprietaire.nom}`);
        if (etat.locataire) doc.text(`Locataire: ${etat.locataire}`);
        doc.text(`Date: ${new Date(etat.dateCreation).toLocaleDateString('fr-FR')}`);
        doc.moveDown(2);

        // Regrouper les objets par section
        const sections = etat.sections || [];
        const objets = etat.objets || [];

        if (objets.length === 0) {
            doc.fontSize(12).text('Aucun élément dans cet état des lieux.');
        } else {
            // Objets sans section
            const objetsSansSection = objets.filter(o => !o.sectionId);
            if (objetsSansSection.length > 0) {
                doc.fontSize(14).fillColor('#667eea').text('Sans section', { underline: true });
                doc.fillColor('black');
                doc.moveDown(0.5);
                afficherObjetsEtat(doc, objetsSansSection, etat.type);
                doc.moveDown(1);
            }

            // Objets par section
            sections.forEach(section => {
                const objetsSection = objets.filter(o => o.sectionId === section.id);
                if (objetsSection.length > 0) {
                    doc.fontSize(14).fillColor('#667eea').text(section.nom, { underline: true });
                    doc.fillColor('black');
                    doc.moveDown(0.5);
                    afficherObjetsEtat(doc, objetsSection, etat.type);
                    doc.moveDown(1);
                }
            });
        }

        // Signatures
        doc.addPage();
        doc.fontSize(12);
        doc.text('Signatures', { underline: true });
        doc.moveDown(2);

        doc.text('Le propriétaire:');
        doc.moveDown(3);
        doc.text('________________________________');

        doc.moveDown(2);
        doc.text('Le locataire:');
        doc.moveDown(3);
        doc.text('________________________________');

        doc.moveDown(2);
        doc.fontSize(10).fillColor('gray');
        doc.text(`Document généré le ${new Date().toLocaleString('fr-FR')}`);

        // Finaliser le PDF
        doc.end();
    } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

function afficherObjetsEtat(doc, objets, typeEtat) {
    objets.forEach((objet) => {
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(objet.nom, { continued: false });
        doc.font('Helvetica');

        if (objet.description) {
            doc.fontSize(10).fillColor('gray');
            doc.text(`   Description: ${objet.description}`);
            doc.fillColor('black');
        }

        doc.fontSize(10);

        if (typeEtat === 'sortie') {
            // Pour un état de sortie, afficher entrée et sortie
            if (objet.note > 0) {
                const etoiles = '★'.repeat(objet.note) + '☆'.repeat(5 - objet.note);
                doc.text(`   Note entrée: ${etoiles} (${objet.note}/5)`);
            }

            if (objet.commentaires) {
                doc.fillColor('blue');
                doc.text(`   Commentaires entrée: ${objet.commentaires}`);
                doc.fillColor('black');
            }

            if (objet.noteSortie > 0) {
                const etoiles = '★'.repeat(objet.noteSortie) + '☆'.repeat(5 - objet.noteSortie);
                doc.text(`   Note sortie: ${etoiles} (${objet.noteSortie}/5)`);
            }

            if (objet.commentairesSortie) {
                doc.fillColor('red');
                doc.text(`   Commentaires sortie: ${objet.commentairesSortie}`);
                doc.fillColor('black');
            }
        } else {
            // Pour un état d'entrée, afficher seulement les infos simples
            if (objet.note > 0) {
                const etoiles = '★'.repeat(objet.note) + '☆'.repeat(5 - objet.note);
                doc.text(`   Note: ${etoiles} (${objet.note}/5)`);
            }

            if (objet.commentaires) {
                doc.fillColor('blue');
                doc.text(`   Commentaires: ${objet.commentaires}`);
                doc.fillColor('black');
            }
        }

        doc.moveDown(0.8);
    });
}
