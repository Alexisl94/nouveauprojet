import { supabase } from '../lib/supabase.js';

// Récupérer tous les contrats d'un bien
export async function obtenirContrats(req, res) {
    try {
        const { bienId } = req.params;

        const { data: contrats, error } = await supabase
            .from('contrats')
            .select('*')
            .eq('bien_id', bienId)
            .order('cree_le', { ascending: false });

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        res.json({ contrats: contrats || [] });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Créer un contrat
export async function creerContrat(req, res) {
    try {
        const {
            bienId,
            type,
            nomLocataire,
            prenomLocataire,
            adresseLocataire,
            dateDebut,
            dateFin,
            loyer,
            charges,
            depotGarantie,
            donneesJson
        } = req.body;

        if (!bienId || !type || !nomLocataire || !prenomLocataire) {
            return res.status(400).json({ error: 'Champs requis manquants' });
        }

        // Récupérer les infos du bien
        const { data: bien, error: bienError } = await supabase
            .from('biens')
            .select('*, proprietaires(*)')
            .eq('id', bienId)
            .single();

        if (bienError || !bien) {
            return res.status(404).json({ error: 'Bien non trouvé' });
        }

        // Désactiver tous les contrats actifs pour ce bien
        await supabase
            .from('contrats')
            .update({ actif: false })
            .eq('bien_id', bienId)
            .eq('actif', true);

        const { data: contrat, error } = await supabase
            .from('contrats')
            .insert([{
                bien_id: bienId,
                type,
                nom_locataire: nomLocataire,
                prenom_locataire: prenomLocataire,
                adresse_locataire: adresseLocataire,
                date_debut: dateDebut,
                date_fin: dateFin,
                loyer,
                charges,
                depot_garantie: depotGarantie,
                donnees_json: donneesJson || {},
                actif: true  // Le nouveau contrat est actif par défaut
            }])
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        res.json({ contrat });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Template HTML du contrat
function genererHTMLContrat(contrat, proprietaire, bien) {
    const dateDebut = contrat.date_debut ? new Date(contrat.date_debut).toLocaleDateString('fr-FR') : 'Non définie';
    const dateFin = contrat.date_fin ? new Date(contrat.date_fin).toLocaleDateString('fr-FR') : 'Non définie';
    const aujourdhui = new Date().toLocaleDateString('fr-FR');

    // Calculer la durée en mois
    let duree = 'Non définie';
    if (contrat.date_debut && contrat.date_fin) {
        const debut = new Date(contrat.date_debut);
        const fin = new Date(contrat.date_fin);
        const mois = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth());
        duree = `${mois} mois`;
    }

    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Contrat de location</title>
  <style>
    :root { --fs: 11pt; }
    html, body { margin:0; padding:0; font-family: system-ui, -apple-system, sans-serif; font-size: var(--fs); line-height: 1.35; }
    @page { size: A4; margin: 18mm 18mm 20mm 18mm; }
    h1, h2 { margin: 0 0 8px; }
    h1 { font-size: 16pt; text-transform: uppercase; text-align:center; margin-bottom: 10px; }
    h2 { font-size: 12.5pt; margin-top: 14px; }
    .small { font-size: 9.5pt; color:#444; }
    .block { margin-bottom: 10px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .field { margin: 2px 0; }
    .label { font-weight: 600; }
    .signature-box { height: 60px; border-top: 1px solid #000; margin-top: 28px; }
    .page-break { page-break-after: always; }
    ul { margin: 6px 0 6px 18px; }
  </style>
</head>
<body>

  <h1>CONTRAT DE LOCATION TYPE</h1>
  <p class="small">
    (Soumis au titre Ier bis de la loi du 6 juillet 1989…). Rappel : ce contrat contient les clauses essentielles et s'applique sous réserve des dispositions d'ordre public et de la notice d'information jointe.
  </p>

  <h2>I. DÉSIGNATION DES PARTIES</h2>
  <div class="grid-2">
    <div class="block">
      <div class="label">Bailleur</div>
      <div class="field">${proprietaire.nom || 'Non renseigné'}</div>
      <div class="field">${proprietaire.email || 'Non renseigné'}</div>
    </div>
    <div class="block">
      <div class="label">Locataire</div>
      <div class="field">Nom : ${contrat.nom_locataire}</div>
      <div class="field">Prénom : ${contrat.prenom_locataire}</div>
      <div class="field">Adresse : ${contrat.adresse_locataire || 'Non renseignée'}</div>
    </div>
  </div>

  <h2>II. OBJET DU CONTRAT</h2>
  <div class="block">
    <div class="label">A. Consistance du logement</div>
    <div class="field">Désignation : ${bien.nom || 'Non renseigné'}</div>
    <div class="field">Adresse : ${bien.adresse || 'Non renseignée'}</div>
    <div class="field">Type d'habitat : Logement individuel</div>
    <div class="field">Régime juridique : Location vide</div>
  </div>
  <div class="block">
    <div class="label">B. Destination des locaux</div>
    <div class="field">Usage d'habitation exclusive (résidence principale du locataire)</div>
  </div>

  <div class="page-break"></div>

  <h2>III. DATE DE PRISE D'EFFET ET DURÉE</h2>
  <div class="grid-2">
    <div class="field">Prise d'effet : ${dateDebut}</div>
    <div class="field">Fin d'effet : ${dateFin}</div>
  </div>
  <div class="field">Durée du contrat : ${duree}</div>
  <p class="small">Le locataire peut résilier à tout moment avec un préavis d'un mois.</p>

  <h2>IV. CONDITIONS FINANCIÈRES</h2>
  <div class="block">
    <div class="label">A. Loyer</div>
    <div class="field">Montant mensuel : ${contrat.loyer ? contrat.loyer + ' €' : 'Non défini'}</div>
    ${contrat.charges ? `<div class="field">Charges : ${contrat.charges} €</div>` : ''}
  </div>
  <div class="block">
    <div class="label">B. Modalités de paiement</div>
    <ul>
      <li>Méthode : Virement bancaire</li>
      <li>Date de paiement : Le 1er du mois</li>
      <li>Charges incluses : ${contrat.charges ? 'Oui' : 'Non'}</li>
    </ul>
  </div>

  <h2>V. TRAVAUX</h2>
  <p>Le locataire s'engage à ne pas réaliser de travaux sans accord écrit préalable du bailleur.</p>

  <h2>VI. GARANTIES</h2>
  <p>Dépôt de garantie : ${contrat.depot_garantie ? contrat.depot_garantie + ' €' : 'Non défini'}.</p>
  <p class="small">En cas de dégradation, le coût sera déduit du montant restitué.</p>

  <h2>VII. CLAUSE RÉSOLUTOIRE</h2>
  <p>À défaut de paiement à la date convenue, après un commandement de payer resté infructueux 2 mois, le bail peut être résilié de plein droit.</p>

  <h2>X. AUTRES CONDITIONS PARTICULIÈRES</h2>
  <p>Sous-location interdite. Respect du bon-vivre ensemble. Interdiction de fumer. Pas d'animaux.</p>
  <p class="small">Présence d'un visiteur > 4 jours non signalée : peut déclencher la clause résolutoire.</p>

  <h2>XI. ANNEXES</h2>
  <ul>
    <li>État des lieux d'entrée</li>
    <li>Inventaire du mobilier (le cas échéant)</li>
  </ul>

  <div class="block" style="margin-top:22mm">
    <div>Fait le ${aujourdhui}</div>
    <div class="grid-2" style="gap:40px; margin-top:18mm;">
      <div>
        <div class="label">Signature du bailleur</div>
        <div class="signature-box"></div>
      </div>
      <div>
        <div class="label">Signature du locataire</div>
        <div class="signature-box"></div>
      </div>
    </div>
  </div>

</body>
</html>`;
}

// Générer le PDF d'un contrat
export async function genererContratPDF(req, res) {
    let browser;
    try {
        const { contratId } = req.params;

        const { data: contrat, error } = await supabase
            .from('contrats')
            .select('*, biens(*, proprietaires(*))')
            .eq('id', contratId)
            .single();

        if (error || !contrat) {
            return res.status(404).json({ error: 'Contrat non trouvé' });
        }

        // Générer le HTML
        const html = genererHTMLContrat(contrat, contrat.biens.proprietaires, contrat.biens);

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
                top: '18mm',
                right: '18mm',
                bottom: '20mm',
                left: '18mm'
            }
        });

        await browser.close();

        // Envoyer le PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=contrat-${contratId}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Erreur:', error);
        if (browser) await browser.close();
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Archiver un contrat (désactiver)
export async function archiverContrat(req, res) {
    try {
        const { contratId } = req.params;

        const { data: contrat, error } = await supabase
            .from('contrats')
            .update({ actif: false })
            .eq('id', contratId)
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        res.json({ contrat });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Supprimer un contrat
export async function supprimerContrat(req, res) {
    try {
        const { contratId } = req.params;

        const { error } = await supabase
            .from('contrats')
            .delete()
            .eq('id', contratId);

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
