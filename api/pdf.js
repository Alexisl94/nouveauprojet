import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase } from '../lib/supabase.js';
import puppeteer from 'puppeteer';

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

// Fonction pour générer le HTML de l'état des lieux
function genererHTMLEtatDesLieux(etat, bien, proprietaire, sections, objets, objetsEntree) {
    const typeLabel = etat.type === 'entree' ? 'ENTRÉE' : 'SORTIE';
    const dateFormatted = new Date(etat.date_creation).toLocaleDateString('fr-FR');
    const aujourdhui = new Date().toLocaleDateString('fr-FR');

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

    // Générer les tableaux HTML
    let tableauxHTML = '';
    for (const [sectionNom, objetsSection] of Object.entries(groupedObjets)) {
        tableauxHTML += `
            <h3 class="section-subtitle">${sectionNom}</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: ${etat.type === 'sortie' ? '25%' : '40%'};">Élément</th>
                        ${etat.type === 'sortie' ? `
                            <th style="width: 15%;">Note Entrée</th>
                            <th style="width: 20%;">Comm. Entrée</th>
                            <th style="width: 15%;">Note Sortie</th>
                            <th style="width: 25%;">Comm. Sortie</th>
                        ` : `
                            <th style="width: 20%;">Note</th>
                            <th style="width: 40%;">Commentaires</th>
                        `}
                    </tr>
                </thead>
                <tbody>
        `;

        objetsSection.forEach((objet, index) => {
            const objetEntree = etat.type === 'sortie' ? objetsEntree.find(oe => oe.objet_id === objet.objet_id) : null;
            const rowClass = index % 2 === 0 ? 'even-row' : '';

            tableauxHTML += `
                <tr class="${rowClass}">
                    <td>${objet.nom || '-'}</td>
            `;

            if (etat.type === 'sortie') {
                const noteEntree = objetEntree?.note > 0 ? '★'.repeat(objetEntree.note) : '-';
                const noteSortie = objet.note > 0 ? '★'.repeat(objet.note) : '-';
                tableauxHTML += `
                    <td>${noteEntree}</td>
                    <td>${objetEntree?.commentaires || '-'}</td>
                    <td>${noteSortie}</td>
                    <td>${objet.commentaires || '-'}</td>
                `;
            } else {
                const note = objet.note > 0 ? '★'.repeat(objet.note) : '-';
                tableauxHTML += `
                    <td>${note}</td>
                    <td>${objet.commentaires || '-'}</td>
                `;
            }

            tableauxHTML += `</tr>`;
        });

        tableauxHTML += `
                </tbody>
            </table>
        `;
    }

    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>État des lieux ${typeLabel.toLowerCase()}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 0 25mm 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #0F172A;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      position: relative;
      min-height: 100vh;
    }

    /* ——— Header ——— */
    .header {
      background: linear-gradient(135deg, #3E8914 0%, #2d7a45 100%);
      color: white;
      padding: 30px 40px;
      text-align: center;
      page-break-after: avoid;
      margin-top: -20mm;
      margin-left: -0mm;
      margin-right: -0mm;
    }

    .header h1 {
      font-size: 24pt;
      font-weight: 700;
      margin: 0 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .header .subtitle {
      font-size: 11pt;
      opacity: 0.95;
      font-weight: 400;
    }

    /* ——— Content ——— */
    .content {
      padding: 30px 40px 100px 40px;
      background: #F8FAFB;
      min-height: calc(100vh - 200px);
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
      page-break-inside: avoid;
    }

    .info-block {
      background: #F0FDF4;
      padding: 16px;
      border-radius: 6px;
      border-left: 3px solid #3E8914;
    }

    .info-label {
      font-size: 9pt;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      font-weight: 600;
    }

    .info-value {
      font-size: 11pt;
      color: #0F172A;
      font-weight: 600;
    }

    .section-subtitle {
      font-size: 13pt;
      font-weight: 700;
      color: #3E8914;
      margin: 30px 0 16px 0;
      padding: 12px 16px 8px 16px;
      border-bottom: 3px solid #3E8914;
      background: #F0FDF4;
      border-radius: 6px 6px 0 0;
      page-break-after: avoid;
    }

    /* ——— Tableaux ——— */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
      page-break-inside: auto;
    }

    .items-table thead {
      background: linear-gradient(135deg, #3E8914 0%, #2d7a45 100%);
      color: white;
      display: table-header-group;
    }

    .items-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .items-table tbody {
      display: table-row-group;
    }

    .items-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 9pt;
    }

    .items-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    .items-table tbody tr:last-child td {
      border-bottom: none;
    }

    .even-row {
      background: #F8FAFB;
    }

    /* ——— Signatures ——— */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin: 30px 0;
      padding: 20px;
      background: white;
      border-radius: 8px;
    }

    .signature-box {
      text-align: center;
    }

    .signature-label {
      font-weight: 700;
      margin-bottom: 40px;
      color: #1E293B;
    }

    .signature-line {
      border-top: 2px solid #0F172A;
      padding-top: 8px;
      font-size: 9pt;
      color: #64748B;
    }

    /* ——— Footer ——— */
    .footer {
      background: #0F172A;
      color: white;
      padding: 20px 40px;
      text-align: center;
      font-size: 9pt;
      line-height: 1.6;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
    }

    .footer strong {
      font-size: 10pt;
      display: block;
      margin-bottom: 6px;
    }

    .page-break { page-break-after: always; }
  </style>
</head>
<body>

  <div class="header">
    <h1>État des Lieux ${typeLabel}</h1>
    <div class="subtitle">Établi le ${dateFormatted}</div>
  </div>

  <div class="content">
    <div class="info-grid">
      <div class="info-block">
        <div class="info-label">Bien</div>
        <div class="info-value">${bien.nom}</div>
        ${bien.adresse ? `<p style="margin-top: 8px; font-size: 9pt; color: #475569;">${bien.adresse}</p>` : ''}
      </div>
      ${proprietaire ? `
      <div class="info-block">
        <div class="info-label">Propriétaire</div>
        <div class="info-value">${proprietaire.nom || 'SARL ALCAYAMA'}</div>
      </div>
      ` : ''}
    </div>

    ${etat.locataire ? `
    <div class="info-block" style="margin-bottom: 20px;">
      <div class="info-label">Locataire</div>
      <div class="info-value">${etat.locataire}</div>
    </div>
    ` : ''}

    ${objets && objets.length > 0 ? tableauxHTML : '<p style="text-align: center; padding: 40px; color: #64748B;">Aucun élément dans cet état des lieux.</p>'}

    <div style="margin-top: 30px;">
      <p style="text-align: center; margin: 20px 0;"><strong>Fait le ${aujourdhui}, à Redon</strong></p>

      <div class="signatures">
        <div class="signature-box">
          <div class="signature-label">Signature du propriétaire</div>
          <div style="height: 60px;"></div>
          <div class="signature-line">${proprietaire?.nom || 'SARL ALCAYAMA'}</div>
        </div>
        <div class="signature-box">
          <div class="signature-label">Signature du locataire</div>
          <div style="height: 60px;"></div>
          <div class="signature-line">${etat.locataire || 'Locataire'}</div>
        </div>
      </div>
    </div>

  </div>

  <div class="footer">
    <strong>SARL ALCAYAMA</strong>
    38 rue du moulin bâtard, 44490 Le Croisic<br>
    RCS : 892 739 764 | Email : alcamaya.contact@gmail.com
  </div>

</body>
</html>`;
}

export async function genererPDFEtat(req, res) {
    let browser;
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

        // Générer le HTML
        const html = genererHTMLEtatDesLieux(etat, bien, proprietaire, sections, objets, objetsEntree);

        // Lancer puppeteer
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Générer le PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm'
            }
        });

        await browser.close();

        // Envoyer le PDF
        const typeLabel = etat.type === 'entree' ? 'entree' : 'sortie';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=etat-${typeLabel}-${bien.nom.replace(/\s/g, '-')}.pdf`);
        res.end(pdfBuffer);
    } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
        if (browser) await browser.close();
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
