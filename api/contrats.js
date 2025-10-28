import { supabase } from '../lib/supabase.js';
import puppeteer from 'puppeteer';

// Récupérer tous les contrats du propriétaire avec informations du bien et statut du locataire
export async function obtenirTousLesContrats(req, res) {
    try {
        // Récupérer le proprietaireId depuis la query string
        const { proprietaireId } = req.query;

        if (!proprietaireId) {
            return res.status(400).json({ error: 'proprietaireId requis' });
        }

        // Récupérer tous les contrats des biens du propriétaire avec les infos du bien
        const { data: contrats, error } = await supabase
            .from('contrats')
            .select(`
                *,
                biens!inner (
                    id,
                    nom,
                    adresse,
                    proprietaire_id
                )
            `)
            .eq('biens.proprietaire_id', proprietaireId)
            .order('cree_le', { ascending: false });

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        // Formatter les données pour le frontend
        const contratsFormattes = (contrats || []).map(contrat => ({
            id: contrat.id,
            bien_id: contrat.bien_id,
            bien_nom: contrat.biens?.nom || 'Bien inconnu',
            locataire_nom: contrat.nom_locataire,
            locataire_prenom: contrat.prenom_locataire,
            locataire_email: contrat.email_locataire,
            locataire_user_id: contrat.locataire_user_id,
            date_debut: contrat.date_debut,
            date_fin: contrat.date_fin,
            loyer: contrat.loyer,
            charges: contrat.charges,
            depot_garantie: contrat.depot_garantie,
            statut: contrat.actif ? 'actif' : 'terminé',
            type: contrat.type,
            numero_chambre: contrat.numero_chambre
        }));

        res.json({ contrats: contratsFormattes });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

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
            emailLocataire,
            numeroChambre,
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
                email_locataire: emailLocataire,
                numero_chambre: numeroChambre,
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
    /* ——— Mise en page A4 ——— */
    @page { size: A4; margin: 18mm 18mm 20mm 18mm; }
    html, body {
      margin: 0; padding: 0;
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt; line-height: 1.35; color: #000;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }

    /* ——— Titres ——— */
    h1, h2 { margin: 0 0 8pt 0; font-weight: bold; }
    h1 { font-size: 16pt; text-transform: uppercase; text-align: center; margin-bottom: 10pt; }
    h2 { font-size: 12.5pt; margin-top: 14pt; }

    /* ——— Paragraphes & listes ——— */
    p { margin: 0 0 8pt 0; }
    ul { margin: 6pt 0 6pt 18pt; }
    .small { font-size: 10pt; color: #111; }

    /* ——— Blocs & utilitaires ——— */
    .block { margin-bottom: 10pt; }
    .label { font-weight: bold; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; }
    .field { margin: 2pt 0; }
    .page-break { page-break-after: always; }
    .signature-box { height: 60px; border-top: 1px solid #000; margin-top: 24pt; }
    .spacer-lg { margin-top: 20pt; }
  </style>
</head>
<body>

  <h1>CONTRAT DE LOCATION</h1>

  <p class="small">
    (Soumis au titre Ier bis de la loi du 6 juillet 1989 tendant à améliorer les rapports locatifs et portant
    modification de la loi n° 86-1290 du 23 décembre 1986)
  </p>

  <p class="small">
    <strong>Modalités d'application du contrat :</strong> Le régime de droit commun en matière de baux d'habitation est défini principalement
    par la loi n° 89-462 du 6 juillet 1989 tendant à améliorer les rapports locatifs et portant modification de la loi n° 86-1290 du 23 décembre 1986.
    L'ensemble de ces dispositions étant d'ordre public, elles s'imposent aux parties qui, en principe, ne peuvent pas y renoncer.
  </p>

  <p class="small">
    En conséquence :
    <br>- le présent contrat de location contient uniquement les clauses essentielles du contrat dont la législation et la réglementation en vigueur
    au jour de sa publication imposent la mention par les parties dans le contrat. Il appartient cependant aux parties de s'assurer des dispositions
    applicables au jour de la conclusion du contrat.
    <br>- au-delà de ces clauses, les parties sont également soumises à l'ensemble des dispositions légales et réglementaires d'ordre public applicables aux baux d'habitation
    sans qu'il soit nécessaire de les faire figurer dans le contrat et qui sont rappelées utilement dans la notice d'information qui doit être jointe à chaque contrat.
    <br>- les parties sont libres de prévoir dans le contrat d'autres clauses particulières, propres à chaque location, dans la mesure où celles-ci sont conformes aux dispositions législatives
    et réglementaires en vigueur. Les parties peuvent également convenir de l'utilisation de tout autre support pour établir leur contrat, dans le respect du présent contrat type.
  </p>

  <h2>DÉSIGNATION DES PARTIES</h2>

  <p><strong>Le présent contrat est conclu entre les soussignés :</strong></p>

  <div class="block">
    <p><strong>SARL ALCAYAMA,</strong></p>
    <p>38 rue du moulin bâtard, 44490, Le Croisic,</p>
    <p>personne morale inscrite au RCS au numéro 892 739 764</p>
    <p>Mail : alcamaya.contact@gmail.com</p>
    <p>désigné(s) ci-après «&nbsp;le bailleur&nbsp;».</p>
  </div>

  <div class="block">
    <p>Nom : ${contrat.nom_locataire || 'Non renseigné'}</p>
    <p>Prénom : ${contrat.prenom_locataire || 'Non renseigné'}</p>
    <p>Mail : ${contrat.email_locataire || 'Non renseigné'}</p>
    <p>désigné(s) ci-après «&nbsp;le locataire&nbsp;».</p>
  </div>

  <p>Il a été convenu ce qui suit :</p>

  <h2>II. OBJET DU CONTRAT</h2>

  <p>Le présent contrat a pour objet la location d'un logement ainsi déterminé :</p>

  <div class="block">
    <p class="label">A. Consistance du logement</p>
    <ul>
      <li>localisation du logement : 11 rue Marcel Deplantay, ${contrat.numero_chambre || 'Non renseigné'}</li>
      <li>type d'habitat : Immeuble collectif</li>
      <li>régime juridique de l'immeuble : Mono-propriété</li>
      <li>période de construction : avant 1949</li>
      <li>surface habitable : 180 m2</li>
      <li>nombre de pièces principales : 1</li>
      <li>le cas échéant, autres parties du logement : une cuisine partagée, salon, WC, salle de bain, jardin</li>
      <li>le cas échéant, Éléments d'équipements du logement : salon équipé, cuisine équipée, salle de bain équipée, jardin équipé</li>
      <li>modalité de production chauffage : électrique collectif</li>
      <li>modalité de production d'eau chaude sanitaire : électrique collectif</li>
    </ul>
  </div>

  <div class="block">
    <p class="label">B. Destination des locaux :</p>
    <p>Usage d'habitation.</p>
  </div>

  <div class="page-break"></div>

  <h2>III. DATE DE PRISE D'EFFET ET DURÉE DU CONTRAT</h2>

  <p>La durée du contrat et sa date de prise d'effet sont ainsi définies :</p>
  <ul>
    <li>A. Date de prise d'effet du contrat : ${dateDebut}</li>
    <li>B. Date de fin d'effet du contrat : ${dateFin}</li>
    <li>C. Durée du contrat : ${duree}</li>
  </ul>

  <p>Le locataire peut mettre fin au bail à tout moment, après avoir donné un préavis d'un mois.</p>

  <h2>IV. CONDITIONS FINANCIÈRES</h2>

  <div class="block">
    <p class="label">Les parties conviennent des conditions financières suivantes :</p>

    <p class="label">A. Loyer</p>
    <p><em>Fixation du loyer initial :</em></p>
    <p>Montant du loyer mensuel : ${contrat.loyer ? contrat.loyer + ' €' : 'Non défini'} toutes charges incluses.</p>

    <p class="label spacer-lg">B. Modalités de paiement</p>
    <ul>
      <li>méthode de paiement : transfert bancaire</li>
      <li>date de paiement : le locataire s'engage à réaliser des transferts du montant du loyer avant le 5 de chaque mois</li>
      <li>les charges incluent comprennent l'électricité, l'eau ainsi que l'ensemble des charges de propriété.<br>
          Les charges comprises au contrat n'incluent pas la consommation liée au chargement de véhicules électriques (voiture, trottinette, vélo, etc.),
          laquelle pourra faire l'objet d'une facturation supplémentaire.</li>
    </ul>
  </div>

  <h2>V. TRAVAUX</h2>
  <p>Le locataire s'engage à ne pas réaliser de travaux de tout ordre dans le logement sans l'accord préalable du bailleur.</p>

  <h2>VI. GARANTIES</h2>
  <p>
    Le locataire dépose un chèque de caution ou effectue un virement bancaire d'une valeur égale à un mois de loyer
    ( ${contrat.depot_garantie ? contrat.depot_garantie + ' €' : contrat.loyer + ' €'} ), qui sera encaissé puis rendu par le bailleur au terme du présent contrat.
  </p>
  <p>En cas de dégradation de l'immeuble, ou de meubles composant le logement, la valeur des dommages sera soustraite au montant rendu.</p>

  <h2>VII. CLAUSE RÉSOLUTOIRE</h2>
  <p>
    Il est expressément convenu qu'à défaut de paiement du dépôt de garantie, d'un seul terme de loyer ou des charges à leur échéance et deux mois après un
    commandement de payer demeuré infructueux, le bail sera résilié de plein droit si bon semble au bailleur.
  </p>

  <h2>X. AUTRES CONDITIONS PARTICULIÈRES</h2>

  <p class="label">A. Condition(s) relative(s) à la sous-location</p>
  <p>
    Le logement en question ne pourra pas être sous-loué ou cédé à un tiers, le présent contrat s'applique uniquement entre les parties précédemment concernées.
  </p>

  <p class="label spacer-lg">B. Autres conditions particulières</p>
  <p>
    Le locataire est tenu de respecter les règles du bon-vivre ensemble, de respect mutuel avec les locataires résidant dans les logements voisins,
    que ce soit dans l'usage des parties privées (nuisances sonores), ou communes.
  </p>
  <p>Il est strictement interdit de fumer à l'intérieur du logement et des parties communes intérieures.</p>
  <p>Le locataire est tenu de ne pas ramener d'animaux dans le logement.</p>
  <p>
    Le locataire est tenu de souscrire et de maintenir pendant toute la durée du bail une assurance couvrant les risques locatifs
    (incendie, dégâts des eaux, explosion, etc.) et d'en justifier au bailleur chaque année sur demande.
  </p>
  <p>
    Le locataire s'engage à respecter les règles ci-dessus en cas de visite d'une personne tierce au contrat.
    Le logement vise à la location d'une personne seule. La présence d'un visiteur pour une durée supérieure à 4 jours, sans en avoir informé au préalable le bailleur,
    pourrait être considérée comme élément déclencheur de la clause résolutoire.
  </p>

  <h2>XI. ANNEXES</h2>
  <p><strong>Sont annexées et jointes au contrat de location les pièces suivantes :</strong></p>
  <ul>
    <li>Un état des lieux, un inventaire et un état détaillé du mobilier</li>
  </ul>

  <div class="spacer-lg"></div>

  <p>Le ${aujourdhui}, à REDON</p>

  <div class="grid-2" style="gap:40px; margin-top:18pt;">
    <div>
      <div class="label">Signature du bailleur</div>
      <div class="signature-box"></div>
    </div>
    <div>
      <div class="label">Signature du locataire</div>
      <div class="signature-box"></div>
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

// Archiver un contrat (le déplacer dans les documents mais le garder actif)
export async function archiverContrat(req, res) {
    try {
        const { contratId } = req.params;

        const { data: contrat, error } = await supabase
            .from('contrats')
            .update({
                archive: true,
                actif: true,  // Le contrat reste actif (bien occupé)
                termine: false  // Le contrat n'est pas terminé
            })
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

// Terminer un contrat (le bien devient disponible et le contrat est archivé)
export async function terminerContrat(req, res) {
    try {
        const { contratId } = req.params;

        const { data: contrat, error } = await supabase
            .from('contrats')
            .update({
                actif: false,  // Le contrat n'est plus actif (bien disponible)
                archive: true,  // Le contrat est archivé
                termine: true  // Le contrat est terminé
            })
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
