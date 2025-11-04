import { supabase } from '../lib/supabase.js';
import puppeteer from 'puppeteer';

// Récupérer tous les contrats du propriétaire avec informations du bien et statut du locataire
export async function obtenirTousLesContrats(req, res) {
    try {
        // Récupérer le proprietaireId depuis la query string
        const { proprietaireId } = req.query;

        console.log('📋 Récupération des contrats pour proprietaireId:', proprietaireId);

        if (!proprietaireId) {
            return res.status(400).json({ error: 'proprietaireId requis' });
        }

        // D'ABORD : Récupérer le compte de l'utilisateur
        const { data: compte, error: compteError } = await supabase
            .from('comptes')
            .select('id')
            .eq('proprietaire_id', proprietaireId)
            .single();

        if (compteError || !compte) {
            console.log('⚠️ Aucun compte trouvé pour cet utilisateur');
            return res.json({ contrats: [] });
        }

        console.log('✅ Compte trouvé:', compte.id);

        // ENSUITE : Récupérer tous les contrats des biens de ce compte
        const { data: contrats, error } = await supabase
            .from('contrats')
            .select(`
                *,
                biens!inner (
                    id,
                    nom,
                    adresse,
                    compte_id
                )
            `)
            .eq('biens.compte_id', compte.id)
            .order('cree_le', { ascending: false });

        console.log('✅ Contrats trouvés:', contrats?.length || 0);
        if (error) {
            console.error('❌ Erreur Supabase:', error);
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

        // Vérifier que le bien existe
        const { data: bien, error: bienError } = await supabase
            .from('biens')
            .select('id, nom, compte_id')
            .eq('id', bienId)
            .single();

        if (bienError || !bien) {
            console.error('Erreur lors de la recherche du bien:', bienError);
            return res.status(404).json({
                error: 'Bien non trouvé',
                details: bienError ? bienError.message : 'Le bien n\'existe pas'
            });
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
            console.error('Erreur Supabase lors de la création du contrat:', error);
            return res.status(500).json({
                error: `Erreur lors de la création du contrat: ${error.message || 'Erreur inconnue'}`,
                details: error.details || error.hint || ''
            });
        }

        res.json({ contrat });
    } catch (error) {
        console.error('Erreur lors de la création du contrat:', error);
        return res.status(500).json({
            error: `Erreur lors de la création du contrat: ${error.message || 'Erreur inconnue'}`
        });
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
    }

    /* ——— Header ——— */
    .header {
      background: linear-gradient(135deg, #3E8914 0%, #2d7a45 100%);
      color: white;
      padding: 30px 40px;
      text-align: center;
      position: relative;
      page-break-after: avoid;
      margin-top: -20mm;
      margin-left: -0mm;
      margin-right: -0mm;
    }

    .header.header-annexe {
      margin-top: 0;
      page-break-before: always;
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
      padding: 30px 40px;
      background: #F8FAFB;
    }

    /* Sections principales */
    .section {
      page-break-inside: avoid;
      margin-bottom: 30px;
      background: white;
      padding: 24px;
      border-radius: 8px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }

    .card {
      background: white;
      padding: 20px;
      margin: 16px 0;
      border-radius: 8px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 14pt;
      font-weight: 700;
      color: #3E8914;
      margin: 0 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 3px solid #3E8914;
      page-break-after: avoid;
      background: #F0FDF4;
      padding: 12px 16px;
      border-radius: 6px 6px 0 0;
      margin: -24px -24px 20px -24px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 16px 0;
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

    /* ——— Paragraphes & listes ——— */
    p {
      margin: 0 0 12px 0;
      text-align: justify;
    }

    ul {
      margin: 8px 0 12px 20px;
      padding: 0;
    }

    li {
      margin: 6px 0;
    }

    .small {
      font-size: 9pt;
      color: #475569;
      line-height: 1.4;
    }

    .label {
      font-weight: 700;
      color: #1E293B;
    }

    /* ——— Footer ——— */
    .footer {
      background: #0F172A;
      color: white;
      padding: 20px 40px;
      text-align: center;
      font-size: 9pt;
      line-height: 1.6;
      margin-top: 60px;
      width: 100%;
    }

    .footer strong {
      font-size: 10pt;
      display: block;
      margin-bottom: 6px;
    }

    /* ——— Signatures ——— */
    .signature-section {
      page-break-inside: avoid;
      margin-top: 40px;
    }

    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin: 30px 0;
      padding: 20px;
      background: white;
      border-radius: 8px;
      page-break-inside: avoid;
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

    .page-break { page-break-after: always; }
    .spacer { margin-top: 16px; }


    /* ——— Style spécifique pour le règlement intérieur ——— */
    .reglement-section {
      page-break-inside: avoid;
      margin-bottom: 24px;
      background: white;
      padding: 20px;
      border-radius: 6px;
      border-left: 4px solid #64748B;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .reglement-title {
      font-size: 12pt;
      font-weight: 700;
      color: #1E293B;
      margin: 0 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 2px solid #E2E8F0;
      page-break-after: avoid;
    }

    .reglement-content {
      background: white;
      padding: 0;
    }

    .reglement-content p, .reglement-content ul {
      font-size: 9.5pt;
      color: #475569;
    }

    .reglement-content ul {
      margin-left: 16px;
    }
  </style>
</head>
<body>

  <div class="header">
    <h1>Contrat de Location</h1>
    <div class="subtitle">Document légal établi le ${aujourdhui}</div>
  </div>

  <div class="content">
    <div class="card">
      <p class="small">
        <strong>(Soumis au titre Ier bis de la loi du 6 juillet 1989 tendant à améliorer les rapports locatifs et portant modification de la loi n° 86-1290 du 23 décembre 1986)</strong>
      </p>
      <div class="spacer"></div>
      <p class="small">
        <strong>Modalités d'application du contrat :</strong> Le régime de droit commun en matière de baux d'habitation est défini principalement
        par la loi n° 89-462 du 6 juillet 1989 tendant à améliorer les rapports locatifs et portant modification de la loi n° 86-1290 du 23 décembre 1986.
        L'ensemble de ces dispositions étant d'ordre public, elles s'imposent aux parties qui, en principe, ne peuvent pas y renoncer.
      </p>
      <div class="spacer"></div>
      <p class="small"><strong>En conséquence :</strong></p>
      <ul class="small">
        <li>le présent contrat de location contient uniquement les clauses essentielles du contrat dont la législation et la réglementation en vigueur au jour de sa publication imposent la mention par les parties dans le contrat. Il appartient cependant aux parties de s'assurer des dispositions applicables au jour de la conclusion du contrat.</li>
        <li>au-delà de ces clauses, les parties sont également soumises à l'ensemble des dispositions légales et réglementaires d'ordre public applicables aux baux d'habitation sans qu'il soit nécessaire de les faire figurer dans le contrat et qui sont rappelées utilement dans la notice d'information qui doit être jointe à chaque contrat.</li>
        <li>les parties sont libres de prévoir dans le contrat d'autres clauses particulières, propres à chaque location, dans la mesure où celles-ci sont conformes aux dispositions législatives et réglementaires en vigueur. Les parties peuvent également convenir de l'utilisation de tout autre support pour établir leur contrat, dans le respect du présent contrat type.</li>
      </ul>
      <div class="spacer"></div>
      <p class="small">
        Le présent contrat est conclu au titre d'un <strong>bail d'habitation meublé</strong> constituant la résidence principale du locataire,
        conformément aux articles 25-3 et suivants de la loi du 6 juillet 1989.
      </p>
    </div>

    <div class="section">
      <h2 class="section-title">DÉSIGNATION DES PARTIES</h2>

      <p><strong>Le présent contrat est conclu entre les soussignés :</strong></p>

      <p style="margin-top: 16px;"><strong>Le Bailleur :</strong> SARL ALCAYAMA</p>
      <p style="margin-left: 20px; font-size: 9.5pt; color: #475569;">
        38 rue du moulin bâtard, 44490 Le Croisic<br>
        RCS : 892 739 764<br>
        Mail : alcamaya.contact@gmail.com
      </p>
      <p style="margin-top: 8px; margin-left: 20px; font-size: 9.5pt;">désigné ci-après « <strong>le bailleur</strong> ».</p>

      <p style="margin-top: 16px;"><strong>Le Locataire :</strong> ${contrat.prenom_locataire || 'Non renseigné'} ${contrat.nom_locataire || 'Non renseigné'}</p>
      <p style="margin-left: 20px; font-size: 9.5pt; color: #475569;">
        ${contrat.email_locataire ? 'Mail : ' + contrat.email_locataire : 'Email non renseigné'}
      </p>
      <p style="margin-top: 8px; margin-left: 20px; font-size: 9.5pt;">désigné ci-après « <strong>le locataire</strong> ».</p>

      <p style="margin-top: 16px;">Le locataire déclare louer le logement à titre de <strong>résidence principale</strong> au sens de l'article 2 de la loi du 6 juillet 1989.</p>
      <p style="margin-top: 12px;"><strong>Il a été convenu ce qui suit :</strong></p>
    </div>

    <div class="section">
      <h2 class="section-title">II. OBJET DU CONTRAT</h2>

      <p>Le présent contrat a pour objet la location d'un logement ainsi déterminé :</p>

      <div class="card">
        <p class="label">A. Consistance du logement</p>
        <ul>
          <li><strong>localisation du logement :</strong> 11 rue Marcel Deplantay, ${contrat.numero_chambre || 'Non renseigné'}</li>
          <li><strong>type d'habitat :</strong> Immeuble collectif</li>
          <li><strong>régime juridique de l'immeuble :</strong> Mono-propriété</li>
          <li><strong>période de construction :</strong> avant 1949</li>
          <li><strong>surface habitable :</strong> 180 m² (surface totale du logement). La partie mise à disposition en jouissance privative du locataire correspond à une chambre d'environ [À RENSEIGNER] m².</li>
          <li><strong>objet de la location :</strong> jouissance privative de la chambre désignée ci-dessus et jouissance commune et non exclusive des pièces et équipements suivants :
            <ul style="margin-left: 20px; margin-top: 6px;">
              <li>cuisine partagée</li>
              <li>salon</li>
              <li>WC</li>
              <li>salle de bain</li>
              <li>jardin</li>
            </ul>
          </li>
          <li><strong>le cas échéant, Éléments d'équipements du logement :</strong> salon équipé, cuisine équipée, salle de bain équipée, jardin équipé</li>
          <li><strong>modalité de production chauffage :</strong> électrique collectif</li>
          <li><strong>modalité de production d'eau chaude sanitaire :</strong> électrique collectif</li>
        </ul>
        <p style="margin-top: 12px; font-style: italic; color: #64748B;">
          Il est expressément précisé que le présent contrat ne confère pas la jouissance exclusive de l'intégralité du logement mais uniquement de la chambre désignée, les autres parties étant communes aux autres occupants.
        </p>
      </div>

      <div class="card">
        <p class="label">B. Destination des locaux</p>
        <p>Usage d'habitation.</p>
        <p style="margin-top: 8px;">Toute affectation professionnelle ou commerciale est interdite sans accord écrit du bailleur.</p>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">III. DATE DE PRISE D'EFFET ET DURÉE DU CONTRAT</h2>

      <p><strong>A. Date de prise d'effet du contrat :</strong> ${dateDebut}</p>
      <p style="margin-top: 8px;"><strong>B. Date de fin d'effet du contrat :</strong> ${dateFin}</p>
      <p style="margin-top: 8px;"><strong>C. Durée du contrat :</strong> ${duree}</p>

      <p style="margin-top: 12px; font-size: 9pt; color: #64748B;">(bail meublé d'une durée minimale légale de 1 an renouvelable tacitement, sauf mention contraire ci-dessus ou cas d'un locataire étudiant – 9 mois non reconductible).</p>

      <p style="margin-top: 12px;">À défaut de congé donné dans les formes et délais légaux par l'une ou l'autre des parties, le bail est reconduit tacitement dans les conditions prévues par la loi.</p>
      <p style="margin-top: 8px;"><strong>Le locataire peut mettre fin au bail à tout moment, après avoir donné un préavis d'un mois.</strong></p>
    </div>

    <div class="section">
      <h2 class="section-title">IV. CONDITIONS FINANCIÈRES</h2>

      <p>Les parties conviennent des conditions financières suivantes :</p>

      <div class="card">
        <p class="label">A. Loyer</p>
        <p style="margin-top: 12px;"><strong>Fixation du loyer initial :</strong></p>
        <p style="margin-top: 8px; font-size: 11pt;">Montant du loyer mensuel : <strong style="font-size: 14pt; color: #1E293B;">${contrat.loyer ? contrat.loyer + ' €' : 'Non défini'}</strong> (toutes charges incluses)</p>
        <p style="margin-top: 12px;">Le loyer comprend les charges récupérables suivantes : électricité, eau, charges de propriété, entretien des parties communes, ainsi que l'accès et l'usage normal des équipements communs.</p>
      </div>

      <div class="card">
        <p class="label">B. Modalités de paiement</p>
        <ul>
          <li><strong>méthode de paiement :</strong> transfert bancaire</li>
          <li><strong>date de paiement :</strong> le locataire s'engage à réaliser des transferts du montant du loyer avant le 5 de chaque mois</li>
          <li><strong>les charges incluent</strong> comprennent l'électricité, l'eau ainsi que l'ensemble des charges de propriété</li>
          <li><strong>les charges sont forfaitaires</strong> au sens de la réglementation sur les baux meublés (sauf mention contraire) et ne donnent pas lieu à régularisation, sauf usage manifestement abusif</li>
          <li class="small">⚠️ <strong>Les charges comprises au contrat n'incluent pas la consommation liée au chargement de véhicules électriques</strong> (voiture, trottinette, vélo, etc.), laquelle pourra faire l'objet d'une facturation supplémentaire. Cette facturation fera l'objet d'un décompte ou forfait complémentaire communiqué au locataire.</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">V. TRAVAUX</h2>
      <div class="card">
        <p>Le locataire s'engage à ne pas réaliser de travaux de tout ordre dans le logement sans l'accord préalable du bailleur.</p>
        <p style="margin-top: 8px;">Toute transformation des lieux, percement, ajout d'appareil consommateur d'énergie ou modification des parties communes est subordonné à un accord écrit du bailleur.</p>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">VI. GARANTIES</h2>
      <div class="card">
        <p><strong>Dépôt de garantie :</strong> <strong style="font-size: 14pt; color: #1E293B;">${contrat.depot_garantie ? contrat.depot_garantie + ' €' : contrat.loyer + ' €'}</strong></p>
        <p style="margin-top: 12px;">
          Le locataire dépose un chèque de caution ou effectue un virement bancaire d'une valeur égale à un mois de loyer (${contrat.loyer ? contrat.loyer + ' €' : 'Non défini'}),
          qui sera encaissé puis rendu par le bailleur au terme du présent contrat.
        </p>
        <p style="margin-top: 8px;">En cas de dégradation de l'immeuble, ou de meubles composant le logement, la valeur des dommages sera soustraite au montant rendu.</p>
        <p style="margin-top: 8px;">Le dépôt de garantie sera restitué dans le délai légal applicable (1 mois si l'état des lieux de sortie est conforme, 2 mois en cas de retenues justifiées), déduction faite, le cas échéant, des sommes restant dues par le locataire ou des réparations locatives.</p>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">VII. CLAUSE RÉSOLUTOIRE</h2>
      <div class="card">
        <p>
          Il est expressément convenu qu'à défaut de paiement du dépôt de garantie, d'un seul terme de loyer ou des charges à leur échéance et deux mois après un
          commandement de payer demeuré infructueux, le bail sera résilié de plein droit si bon semble au bailleur.
        </p>
        <p style="margin-top: 12px;">
          L'une ou plusieurs des conditions particulières suivantes (X), ne sont pas respectées, les propriétaires sont également dans leur bon droit de résilier le contrat de plein droit, utilisant cette condition comme clause résolutoire.
        </p>
        <p style="margin-top: 8px; font-size: 9pt; color: #64748B; font-style: italic;">
          Les clauses résolutoires s'appliquent dans les conditions de l'article 24 de la loi du 6 juillet 1989 (commandement de faire ou de payer délivré par huissier, délai laissé au locataire, saisine éventuelle du juge).
        </p>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">X. AUTRES CONDITIONS PARTICULIÈRES</h2>

      <div class="card">
        <p class="label">A. Condition(s) relative(s) à la sous-location</p>
        <p>
          Le logement en question ne pourra pas être sous-loué ou cédé à un tiers, le présent contrat s'applique uniquement entre les parties précédemment concernées.
        </p>
        <p style="margin-top: 8px;">
          Toute occupation par une personne non déclarée et excédant la durée tolérée pour les visiteurs pourra être considérée comme une sous-location déguisée.
        </p>
      </div>

      <div class="card">
        <p class="label">B. Autres conditions particulières</p>
        <ul>
          <li>Le locataire est tenu de respecter les règles du bon-vivre ensemble, de respect mutuel avec les locataires résidant dans les logements voisins, que ce soit dans l'usage des parties privées (nuisances sonores, olfactives), ou communes.</li>
          <li>Il est strictement interdit de fumer à l'intérieur du logement et des parties communes intérieures.</li>
          <li>Le locataire est tenu de ne pas ramener d'animaux dans le logement.</li>
          <li>Le locataire est tenu de souscrire et de maintenir pendant toute la durée du bail une assurance couvrant les risques locatifs (incendie, dégâts des eaux, explosion, etc.) et d'en justifier au bailleur chaque année sur demande. À défaut de fourniture de l'attestation d'assurance dans le délai d'un mois à compter de la demande du bailleur, ce dernier pourra souscrire une assurance pour le compte du locataire et en répercuter le coût.</li>
          <li>Le locataire s'engage à respecter les règles ci-dessus en cas de visite d'une personne tierce au contrat. Le logement vise à la location d'une personne seule. La présence d'un visiteur pour une durée supérieure à 4 jours consécutifs ou plus de 3 fois par mois, sans en avoir informé au préalable le bailleur, pourrait être considéré comme élément déclencheur de la clause résolutoire. Toute cohabitation durable non déclarée est interdite.</li>
        </ul>
      </div>

      <div class="card">
        <p class="label">C. Règlement intérieur</p>
        <p>Le locataire s'engage à respecter les règles du règlement intérieur ci-joint.</p>
        <p style="margin-top: 8px;">Le règlement intérieur a la même valeur contractuelle que le présent bail. En cas de contradiction, le bail prévaut.</p>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">XI. RÉVISION ET INDEXATION DU LOYER</h2>
      <div class="card">
        <p>Conformément aux dispositions de l'article 17-1 de la loi n° 89-462 du 6 juillet 1989 tendant à améliorer les rapports locatifs, le loyer pourra être révisé chaque année à la date anniversaire du présent bail.</p>
        <p style="margin-top: 12px;">La révision annuelle du loyer est effectuée en fonction de la variation de l'Indice de Référence des Loyers (IRL) publié par l'Institut National de la Statistique et des Études Économiques (INSEE).</p>
        <p style="margin-top: 12px;">L'indice de référence pris en compte est celui du trimestre : <strong>[À COMPLÉTER : 1er / 2e / 3e / 4e trimestre de l'année de signature]</strong> publié par l'INSEE.</p>
        <p style="margin-top: 12px;"><strong>Formule de révision :</strong> Nouveau loyer = Loyer actuel × (Nouvel IRL / IRL de référence)</p>
        <p class="small" style="margin-top: 12px;">La révision ne porte que sur le loyer hors charges.</p>
        <p class="small" style="margin-top: 8px;">Le loyer ainsi révisé prend effet à compter de la date anniversaire du bail, sans effet rétroactif. En cas d'omission de la révision par le bailleur, celle-ci ne pourra être réclamée que pour l'année précédant la demande, conformément à la loi.</p>
        <p class="small" style="margin-top: 8px;"><a href="https://www.service-public.fr/particuliers/vosdroits/F13723" target="_blank">https://www.service-public.fr/particuliers/vosdroits/F13723</a></p>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">XII. ANNEXES</h2>
      <div class="card">
        <p><strong>Sont annexées et jointes au contrat de location les pièces suivantes :</strong></p>
        <ul>
          <li>A. Un état des lieux, un inventaire et un état détaillé du mobilier</li>
          <li>B. Un règlement intérieur.</li>
          <li>C. La notice d'information relative aux droits et obligations des locataires et des bailleurs prévue par l'article 3 de la loi du 6 juillet 1989.</li>
          <li>D. Le cas échéant, le diagnostic de performance énergétique (DPE), le constat de risque d'exposition au plomb (CREP), l'état des risques (ERNMT/ERP) et, si applicable, le diagnostic électricité/gaz.</li>
        </ul>
      </div>
    </div>

    <div class="signature-section">
      <p style="text-align: center; margin: 20px 0;"><strong>Le ${aujourdhui}, à REDON</strong></p>

      <div class="signatures">
        <div class="signature-box">
          <div class="signature-label">Signature du bailleur</div>
          <div style="height: 60px;"></div>
          <div class="signature-line">SARL ALCAYAMA</div>
        </div>
        <div class="signature-box">
          <div class="signature-label">Signature du locataire</div>
          <div style="height: 60px;"></div>
          <div class="signature-line">${contrat.prenom_locataire || ''} ${contrat.nom_locataire || ''}</div>
        </div>
      </div>
    </div>

  </div>

  <!-- ANNEXE 2 : RÈGLEMENT INTÉRIEUR -->
  <div class="header header-annexe">
    <h1>ANNEXE 2</h1>
    <div class="subtitle">Règlement intérieur de la colocation</div>
  </div>

  <div class="content">
    <div class="card" style="margin-bottom: 20px;">
      <p style="font-style: italic;">Ce règlement intérieur complète le bail de location et s'applique à l'ensemble des colocataires occupant le logement. Chaque colocataire s'engage à le respecter dans un esprit de courtoisie, de propreté et de respect mutuel.</p>
    </div>

    <div class="reglement-section">
      <h3 class="reglement-title">Vie collective et respect mutuel</h3>
      <div class="reglement-content">
        <p>Les colocataires s'engagent à entretenir des relations courtoises et à respecter la tranquillité de chacun. Toute attitude agressive, discriminatoire, ou perturbant la vie du groupe est strictement interdite.</p>
      </div>
    </div>

    <div class="reglement-section">
      <h3 class="reglement-title">Propreté et entretien</h3>
      <div class="reglement-content">
        <ul>
          <li>Les parties communes (cuisine, salon, sanitaires, couloirs, etc.) doivent être maintenues propres en permanence.</li>
          <li>Les ordures ménagères doivent être triées et sorties régulièrement selon le calendrier de la mairie de Redon.</li>
          <li>Les parties privatives (chambres) doivent rester en bon état et propres afin d'éviter toute dégradation.</li>
          <li>Un défaut d'entretien répété des parties communes pourra être imputé au(x) colocataire(s) désigné(s) et faire l'objet d'une retenue sur le dépôt de garantie en cas de remise en état.</li>
        </ul>
      </div>
    </div>

    <div class="reglement-section">
      <h3 class="reglement-title">Bruit et nuisances</h3>
      <div class="reglement-content">
        <ul>
          <li>Le calme du logement doit être respecté, en particulier entre 22h00 et 8h00.</li>
          <li>Les fêtes ou rassemblements exceptionnels doivent être prévenus à l'avance aux autres colocataires et rester raisonnables.</li>
          <li>L'usage d'appareils sonores (enceintes, télévision, instruments de musique…) doit rester à un niveau modéré.</li>
        </ul>
      </div>
    </div>

    <div class="reglement-section">
      <h3 class="reglement-title">Cigarettes, drogues et substances</h3>
      <div class="reglement-content">
        <ul>
          <li>Il est strictement interdit de fumer dans toutes les pièces du logement, y compris les chambres, la cuisine, la salle de bain et les couloirs.</li>
          <li>Le tabac n'est autorisé qu'à l'extérieur du logement, en veillant à ne pas gêner le voisinage.</li>
          <li>La consommation, détention ou vente de drogues ou substances illicites est strictement prohibée.</li>
        </ul>
      </div>
    </div>

    <div class="reglement-section">
      <h3 class="reglement-title">Animaux</h3>
      <div class="reglement-content">
        <p>Aucun animal, même temporairement, n'est autorisé dans le logement ni dans ses dépendances (balcon, cave, jardin, etc.). Toute dérogation éventuelle devra être validée par écrit par le bailleur et l'ensemble des colocataires.</p>
      </div>
    </div>

    <div class="reglement-section">
      <h3 class="reglement-title">Sécurité et matériel</h3>
      <div class="reglement-content">
        <ul>
          <li>Chaque colocataire doit veiller à fermer portes et fenêtres en quittant le logement.</li>
          <li>Aucun appareil électrique défectueux ne doit être utilisé.</li>
          <li>Les détecteurs de fumée et extincteurs doivent être maintenus en bon état.</li>
          <li>En cas d'incident (fuite d'eau, panne, casse), le colocataire concerné doit prévenir immédiatement le bailleur ou la personne responsable.</li>
        </ul>
      </div>
    </div>

    <div class="reglement-section">
      <h3 class="reglement-title">Utilisation des équipements et des parties communes</h3>
      <div class="reglement-content">
        <ul>
          <li>Les équipements (électroménager, mobilier, vaisselle, Wi-Fi, etc.) sont à usage collectif et doivent être utilisés avec soin.</li>
          <li>Aucun meuble ne peut être déplacé des parties communes vers les chambres sans accord collectif.</li>
          <li>Les chambres sont personnelles et ne peuvent être utilisées comme lieu de stockage commun ou de passage.</li>
        </ul>
      </div>
    </div>

    <div class="reglement-section">
      <h3 class="reglement-title">Visites et hébergements extérieurs</h3>
      <div class="reglement-content">
        <ul>
          <li>Les colocataires peuvent recevoir des invités dans la limite du raisonnable et sous réserve du respect du calme et de la propreté.</li>
          <li>L'hébergement d'une personne extérieure ne doit pas excéder 3 nuits consécutives par mois, sauf accord de tous les colocataires et du bailleur.</li>
          <li>Les visiteurs sont sous la responsabilité du colocataire qui les invite.</li>
          <li>En cas d'hébergement régulier non déclaré, le bailleur pourra requalifier la situation et appliquer la clause résolutoire.</li>
        </ul>
      </div>
    </div>

    <div class="reglement-section">
      <h3 class="reglement-title">Dégradations et réparations</h3>
      <div class="reglement-content">
        <ul>
          <li>Toute dégradation volontaire ou par négligence engage la responsabilité du colocataire concerné.</li>
          <li>Les réparations locatives sont à la charge des colocataires selon la répartition prévue par la loi.</li>
          <li>Les dégâts constatés dans les parties communes devront être signalés immédiatement.</li>
        </ul>
      </div>
    </div>

    <div class="reglement-section">
      <h3 class="reglement-title">Respect du bail et du voisinage</h3>
      <div class="reglement-content">
        <p>Les colocataires s'engagent à respecter les règles du bail de location, du présent règlement, et du règlement de copropriété le cas échéant. Le bon voisinage est essentiel : les nuisances sonores, odeurs ou comportements gênants sont à proscrire.</p>
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

// Générer le PDF d'un contrat
export async function genererContratPDF(req, res) {
    let browser;
    try {
        const { contratId } = req.params;

        // Récupérer le contrat avec le bien et le compte
        const { data: contrat, error } = await supabase
            .from('contrats')
            .select('*, bien:biens(*, compte:comptes(proprietaire_id))')
            .eq('id', contratId)
            .single();

        if (error || !contrat) {
            console.error('Erreur récupération contrat pour PDF:', error);
            return res.status(404).json({ error: 'Contrat non trouvé' });
        }

        // Récupérer les informations du bailleur
        const proprietaireId = contrat.bien?.compte?.proprietaire_id;
        let bailleur = null;

        if (proprietaireId) {
            const { data: bailleurData } = await supabase
                .from('bailleurs')
                .select('*')
                .eq('proprietaire_id', proprietaireId)
                .maybeSingle();
            bailleur = bailleurData;
        }

        // Générer le HTML
        const html = genererHTMLContrat(contrat, bailleur, contrat.bien);

        console.log('🎨 [NOUVEAU DESIGN] Génération du PDF avec Puppeteer...');
        console.log('📝 Extrait HTML (premiers 500 caractères):', html.substring(0, 500));

        // DEBUG: Sauvegarder le HTML pour vérification
        const fs = await import('fs');
        await fs.promises.writeFile('/tmp/contrat-debug.html', html);
        console.log('💾 HTML sauvegardé dans /tmp/contrat-debug.html');

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
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=contrat-${contratId}.pdf`);
        res.end(pdfBuffer);

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

// Récupérer le statut d'invitation d'un contrat
export async function getInvitationStatus(req, res) {
    try {
        const { contratId } = req.params;

        // Récupérer le contrat
        const { data: contrat, error: contratError } = await supabase
            .from('contrats')
            .select('id, locataire_user_id, email_locataire')
            .eq('id', contratId)
            .single();

        if (contratError || !contrat) {
            return res.status(404).json({ error: 'Contrat non trouvé' });
        }

        // Vérifier si le locataire a un compte (connecté)
        const locataireConnected = contrat.locataire_user_id != null;

        // Récupérer les invitations pour ce contrat (la plus récente)
        const { data: invitation } = await supabase
            .from('invitations_locataires')
            .select('*')
            .eq('contrat_id', contratId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const status = {
            locataire_connected: locataireConnected,
            invitation_sent: !!invitation,
            invitation_accepted: invitation && invitation.accepted_at != null,
            invitation_expired: false,
            days_until_expiration: null,
            invitation_link: null
        };

        if (invitation) {
            const expiresAt = new Date(invitation.expires_at);
            const now = new Date();
            status.invitation_expired = expiresAt < now && !invitation.accepted_at;

            if (!status.invitation_expired && !invitation.accepted_at) {
                const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
                status.days_until_expiration = daysLeft;
                // Construire le lien d'invitation
                const baseUrl = req.protocol + '://' + req.get('host');
                status.invitation_link = `${baseUrl}/invitation?token=${invitation.token}`;
            }
        }

        res.json({ status });
    } catch (error) {
        console.error('Erreur lors de la récupération du statut d\'invitation:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
