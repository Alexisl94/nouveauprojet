import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase } from '../lib/supabase.js';

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
        const { bienId, etatId } = req.params;

        // Récupérer l'état des lieux
        const { data: etat, error: etatError } = await supabase
            .from('etats_des_lieux')
            .select('*')
            .eq('id', etatId)
            .eq('bien_id', bienId)
            .single();

        if (etatError || !etat) {
            return res.status(404).json({ error: 'État des lieux non trouvé' });
        }

        // Récupérer le bien
        const { data: bien, error: bienError } = await supabase
            .from('biens')
            .select('*')
            .eq('id', bienId)
            .single();

        if (bienError || !bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        // Récupérer les sections
        const { data: sections } = await supabase
            .from('sections')
            .select('*')
            .eq('bien_id', bienId)
            .order('ordre');

        // Récupérer les objets de cet état
        const { data: objets } = await supabase
            .from('objets_etat_des_lieux')
            .select('*')
            .eq('etat_des_lieux_id', etatId)
            .order('ordre');

        // Récupérer le propriétaire
        const { data: proprietaire } = await supabase
            .from('proprietaires')
            .select('*')
            .eq('id', bien.proprietaire_id)
            .single();

        // Si c'est un état de sortie, récupérer l'état d'entrée correspondant
        let objetsEntree = [];
        if (etat.type === 'sortie' && etat.etat_entree_id) {
            const { data: objetsEntreeData } = await supabase
                .from('objets_etat_des_lieux')
                .select('*')
                .eq('etat_des_lieux_id', etat.etat_entree_id)
                .order('ordre');
            objetsEntree = objetsEntreeData || [];
        }

        // Créer le document PDF
        const doc = new PDFDocument({ margin: 40, size: 'A4' });

        // Envoyer le PDF en streaming
        const typeLabel = etat.type === 'entree' ? 'entree' : 'sortie';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=etat-${typeLabel}-${bien.nom.replace(/\s/g, '-')}.pdf`);
        doc.pipe(res);

        // En-tête professionnel
        const titre = etat.type === 'entree' ? 'ÉTAT DES LIEUX D\'ENTRÉE' : 'ÉTAT DES LIEUX DE SORTIE';
        doc.fontSize(18).font('Helvetica-Bold').text(titre, { align: 'center' });
        doc.moveDown(0.5);

        // Ligne de séparation
        doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(1);

        // Informations du bien
        doc.fontSize(10).font('Helvetica');
        const startY = doc.y;
        doc.text(`Bien: ${bien.nom}`, 40, startY);
        if (bien.adresse) doc.text(`Adresse: ${bien.adresse}`, 40);

        const rightStartY = startY;
        if (proprietaire) doc.text(`Propriétaire: ${proprietaire.nom}`, 320, rightStartY);
        if (etat.locataire) doc.text(`Locataire: ${etat.locataire}`, 320);
        doc.text(`Date: ${new Date(etat.date_creation).toLocaleDateString('fr-FR')}`, 320);

        doc.moveDown(2);

        // Créer le tableau pour les objets
        if (!objets || objets.length === 0) {
            doc.fontSize(12).text('Aucun élément dans cet état des lieux.');
        } else {
            // Fonction pour créer l'en-tête du tableau
            const drawTableHeader = (y) => {
                const colWidths = etat.type === 'sortie' ? [200, 80, 120, 80, 120] : [250, 100, 150];
                let xPos = 40;

                doc.font('Helvetica-Bold').fontSize(9);
                doc.rect(40, y, 515, 20).fillAndStroke('#667eea', '#000000');

                doc.fillColor('white');
                doc.text('Élément', xPos + 5, y + 6, { width: colWidths[0] - 10 });
                xPos += colWidths[0];

                if (etat.type === 'sortie') {
                    doc.text('Note Entrée', xPos + 5, y + 6, { width: colWidths[1] - 10 });
                    xPos += colWidths[1];
                    doc.text('Comm. Entrée', xPos + 5, y + 6, { width: colWidths[2] - 10 });
                    xPos += colWidths[2];
                    doc.text('Note Sortie', xPos + 5, y + 6, { width: colWidths[3] - 10 });
                    xPos += colWidths[3];
                    doc.text('Comm. Sortie', xPos + 5, y + 6, { width: colWidths[4] - 10 });
                } else {
                    doc.text('Note', xPos + 5, y + 6, { width: colWidths[1] - 10 });
                    xPos += colWidths[1];
                    doc.text('Commentaires', xPos + 5, y + 6, { width: colWidths[2] - 10 });
                }

                doc.fillColor('black').font('Helvetica');
                return y + 20;
            };

            // Grouper les objets par section
            const groupedObjets = {};
            sections?.forEach(section => {
                const objetsSection = objets.filter(o => o.section_id === section.id);
                if (objetsSection.length > 0) {
                    groupedObjets[section.nom] = objetsSection;
                }
            });

            const objetsSansSection = objets.filter(o => !o.section_id);
            if (objetsSansSection.length > 0) {
                groupedObjets['Sans section'] = objetsSansSection;
            }

            // Afficher chaque section
            for (const [sectionNom, objetsSection] of Object.entries(groupedObjets)) {
                // Vérifier si on a assez d'espace pour la section
                if (doc.y > 700) {
                    doc.addPage();
                }

                // Titre de section
                doc.fontSize(11).font('Helvetica-Bold');
                doc.fillColor('#667eea').text(sectionNom, 40);
                doc.fillColor('black');
                doc.moveDown(0.5);

                // En-tête du tableau
                let currentY = drawTableHeader(doc.y);

                // Lignes du tableau
                objetsSection.forEach((objet, index) => {
                    // Vérifier si on a besoin d'une nouvelle page
                    if (currentY > 720) {
                        doc.addPage();
                        currentY = drawTableHeader(60);
                    }

                    const colWidths = etat.type === 'sortie' ? [200, 80, 120, 80, 120] : [250, 100, 150];
                    const rowHeight = 25;
                    let xPos = 40;

                    // Fond alternant pour meilleure lisibilité
                    if (index % 2 === 0) {
                        doc.rect(40, currentY, 515, rowHeight).fill('#f8f9fa');
                    }

                    doc.fontSize(9).font('Helvetica');

                    // Élément
                    doc.fillColor('black').text(objet.nom || '', xPos + 5, currentY + 8, { width: colWidths[0] - 10, height: rowHeight - 10 });
                    xPos += colWidths[0];

                    if (etat.type === 'sortie') {
                        // Trouver l'objet d'entrée correspondant
                        const objetEntree = objetsEntree.find(oe => oe.objet_id === objet.objet_id);

                        // Note Entrée
                        const noteEntree = objetEntree?.note > 0 ? '★'.repeat(objetEntree.note) : '-';
                        doc.text(noteEntree, xPos + 5, currentY + 8, { width: colWidths[1] - 10 });
                        xPos += colWidths[1];

                        // Comm. Entrée
                        doc.text(objetEntree?.commentaires || '-', xPos + 5, currentY + 8, { width: colWidths[2] - 10 });
                        xPos += colWidths[2];

                        // Note Sortie
                        const noteSortie = objet.note > 0 ? '★'.repeat(objet.note) : '-';
                        doc.text(noteSortie, xPos + 5, currentY + 8, { width: colWidths[3] - 10 });
                        xPos += colWidths[3];

                        // Comm. Sortie
                        doc.text(objet.commentaires || '-', xPos + 5, currentY + 8, { width: colWidths[4] - 10 });
                    } else {
                        // Note
                        const note = objet.note > 0 ? '★'.repeat(objet.note) : '-';
                        doc.text(note, xPos + 5, currentY + 8, { width: colWidths[1] - 10 });
                        xPos += colWidths[1];

                        // Commentaires
                        doc.text(objet.commentaires || '-', xPos + 5, currentY + 8, { width: colWidths[2] - 10 });
                    }

                    // Bordures
                    doc.rect(40, currentY, 515, rowHeight).stroke();

                    currentY += rowHeight;
                });

                doc.moveDown(1);
                currentY = doc.y;
            }
        }

        // Signatures
        if (doc.y > 650) {
            doc.addPage();
        }

        doc.moveDown(2);
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Signatures', 40);
        doc.moveDown(1);

        doc.font('Helvetica').fontSize(10);
        const sigY = doc.y;
        doc.text('Le propriétaire:', 40, sigY);
        doc.text('Le locataire:', 320, sigY);

        doc.moveDown(3);
        const lineY = doc.y;
        doc.moveTo(40, lineY).lineTo(240, lineY).stroke();
        doc.moveTo(320, lineY).lineTo(520, lineY).stroke();

        doc.moveDown(3);
        doc.fontSize(8).fillColor('gray');
        doc.text(`Document généré le ${new Date().toLocaleString('fr-FR')}`, 40, 780, { align: 'center' });

        // Finaliser le PDF
        doc.end();
    } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
