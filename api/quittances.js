import { supabase } from '../lib/supabase.js';
import puppeteer from 'puppeteer';

// Récupérer toutes les quittances d'un bien
export async function obtenirQuittances(req, res) {
    try {
        const { bienId } = req.params;

        const { data: quittances, error } = await supabase
            .from('quittances')
            .select('*, contrats(nom_locataire, prenom_locataire)')
            .eq('bien_id', bienId)
            .order('annee', { ascending: false })
            .order('mois', { ascending: false });

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        res.json({ quittances: quittances || [] });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Créer une quittance
export async function creerQuittance(req, res) {
    try {
        const {
            contratId,
            bienId,
            mois,
            annee,
            montantLoyer,
            montantCharges,
            datePaiement,
            modePaiement,
            observations
        } = req.body;

        if (!contratId || !bienId || !mois || !annee || !montantLoyer) {
            return res.status(400).json({ error: 'Champs requis manquants' });
        }

        const montantTotal = parseFloat(montantLoyer) + parseFloat(montantCharges || 0);

        // Vérifier si une quittance existe déjà pour ce mois
        const { data: existing } = await supabase
            .from('quittances')
            .select('id')
            .eq('contrat_id', contratId)
            .eq('mois', mois)
            .eq('annee', annee)
            .single();

        if (existing) {
            return res.status(400).json({ error: 'Une quittance existe déjà pour ce mois' });
        }

        const { data: quittance, error } = await supabase
            .from('quittances')
            .insert([{
                contrat_id: contratId,
                bien_id: bienId,
                mois: parseInt(mois),
                annee: parseInt(annee),
                montant_loyer: parseFloat(montantLoyer),
                montant_charges: parseFloat(montantCharges || 0),
                montant_total: montantTotal,
                date_paiement: datePaiement || null,
                mode_paiement: modePaiement || 'Virement bancaire',
                observations: observations || null
            }])
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase lors de la création de quittance:', error);
            return res.status(500).json({
                error: `Erreur lors de la création de la quittance: ${error.message || 'Erreur inconnue'}`,
                details: error.details || error.hint || ''
            });
        }

        res.json({ quittance });
    } catch (error) {
        console.error('Erreur lors de la création de la quittance:', error);
        return res.status(500).json({
            error: `Erreur lors de la création de la quittance: ${error.message || 'Erreur inconnue'}`
        });
    }
}

// Supprimer une quittance
export async function supprimerQuittance(req, res) {
    try {
        const { quittanceId } = req.params;

        const { error } = await supabase
            .from('quittances')
            .delete()
            .eq('id', quittanceId);

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

// Récupérer une quittance spécifique
export async function obtenirQuittance(req, res) {
    try {
        const { quittanceId } = req.params;

        const { data: quittance, error } = await supabase
            .from('quittances')
            .select('*, contrats(*, biens(*))')
            .eq('id', quittanceId)
            .single();

        if (error || !quittance) {
            return res.status(404).json({ error: 'Quittance non trouvée' });
        }

        res.json({ quittance });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Envoyer une quittance par email via Brevo
export async function envoyerQuittanceEmail(req, res) {
    try {
        const { quittanceId } = req.params;

        // Récupérer la quittance avec toutes les informations
        const { data: quittance, error } = await supabase
            .from('quittances')
            .select('*, contrats(*, biens(*))')
            .eq('id', quittanceId)
            .single();

        if (error || !quittance) {
            return res.status(404).json({ error: 'Quittance non trouvée' });
        }

        const contrat = quittance.contrats;
        const bien = contrat.biens;
        const emailLocataire = contrat.email_locataire;

        if (!emailLocataire) {
            return res.status(400).json({ error: 'Aucune adresse email associée à ce contrat' });
        }

        const moisNoms = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const moisNom = moisNoms[quittance.mois];

        // Construire le corps de l'email HTML
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #0F172A; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563EB; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px 20px; }
        .card { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border: 1px solid #E2E8F0; }
        .label { color: #64748B; font-size: 14px; margin-bottom: 5px; }
        .value { color: #0F172A; font-size: 16px; font-weight: 600; }
        .montant { background: #F0FDF4; padding: 20px; border-left: 4px solid #059669; margin: 20px 0; border-radius: 4px; }
        .footer { background: #0F172A; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">Quittance de Loyer</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${moisNom} ${quittance.annee}</p>
        </div>

        <div class="content">
            <p>Bonjour ${contrat.prenom_locataire} ${contrat.nom_locataire},</p>

            <p>Vous trouverez ci-dessous le récapitulatif de votre quittance de loyer pour le mois de <strong>${moisNom} ${quittance.annee}</strong>.</p>

            <div class="card">
                <div class="label">Bien loué</div>
                <div class="value">${bien.nom || 'Non renseigné'}</div>
                ${bien.adresse ? `<div class="label" style="margin-top: 10px;">Adresse</div><div class="value">${bien.adresse}</div>` : ''}
                ${contrat.numero_chambre ? `<div class="label" style="margin-top: 10px;">Logement</div><div class="value">${contrat.numero_chambre}</div>` : ''}
            </div>

            <div class="montant">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0;">Loyer</td>
                        <td style="text-align: right; font-weight: 600;">${quittance.montant_loyer.toFixed(2)} €</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0;">Charges</td>
                        <td style="text-align: right; font-weight: 600;">${quittance.montant_charges.toFixed(2)} €</td>
                    </tr>
                    <tr style="border-top: 2px solid #059669;">
                        <td style="padding: 12px 0; font-size: 18px; font-weight: 700; color: #059669;">TOTAL</td>
                        <td style="text-align: right; font-size: 18px; font-weight: 700; color: #059669;">${quittance.montant_total.toFixed(2)} €</td>
                    </tr>
                </table>
            </div>

            ${quittance.date_paiement || quittance.mode_paiement ? `
            <div class="card">
                ${quittance.date_paiement ? `<div class="label">Date de paiement</div><div class="value">${new Date(quittance.date_paiement).toLocaleDateString('fr-FR')}</div>` : ''}
                ${quittance.mode_paiement ? `<div class="label" style="margin-top: ${quittance.date_paiement ? '10px' : '0'};">Mode de paiement</div><div class="value">${quittance.mode_paiement}</div>` : ''}
            </div>
            ` : ''}

            ${quittance.observations ? `
            <div class="card">
                <div class="label">Observations</div>
                <div class="value">${quittance.observations}</div>
            </div>
            ` : ''}

            <p style="margin-top: 30px; font-size: 14px; color: #64748B; font-style: italic;">
                Le présent document certifie que le locataire a réglé la totalité du loyer et des charges pour la période indiquée ci-dessus.
            </p>

            <p>Cordialement,<br><strong>SARL ALCAYAMA</strong></p>
        </div>

        <div class="footer">
            SARL ALCAYAMA<br>
            38 rue du moulin bâtard, 44490 Le Croisic<br>
            RCS : 892 739 764
        </div>
    </div>
</body>
</html>
        `;

        // Envoyer l'email via Brevo
        const brevoApiKey = process.env.BREVO_API_KEY;
        if (!brevoApiKey) {
            return res.status(500).json({ error: 'Clé API Brevo non configurée' });
        }

        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'api-key': brevoApiKey
            },
            body: JSON.stringify({
                sender: {
                    name: 'SARL ALCAYAMA',
                    email: 'alcamaya.contact@gmail.com'
                },
                to: [{
                    email: emailLocataire,
                    name: `${contrat.prenom_locataire} ${contrat.nom_locataire}`
                }],
                subject: `Quittance de loyer - ${moisNom} ${quittance.annee}`,
                htmlContent: emailHtml
            })
        });

        if (!brevoResponse.ok) {
            const errorData = await brevoResponse.json();
            console.error('Erreur Brevo:', errorData);
            return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
        }

        res.json({ success: true, message: 'Email envoyé avec succès' });

    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Générer le PDF d'une quittance
export async function genererQuittancePDF(req, res) {
    let browser;
    try {
        const { quittanceId } = req.params;

        const { data: quittance, error } = await supabase
            .from('quittances')
            .select('*, contrats(*, biens(*))')
            .eq('id', quittanceId)
            .single();

        if (error || !quittance) {
            console.error('Erreur quittance PDF:', error);
            return res.status(404).json({ error: 'Quittance non trouvée' });
        }

        const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][quittance.mois - 1];
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Quittance de loyer</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { text-align: center; color: #333; }
        .header { margin-bottom: 30px; }
        .info { margin: 20px 0; }
        .info-row { margin: 10px 0; }
        .label { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; }
        .total { font-weight: bold; font-size: 1.2em; }
    </style>
</head>
<body>
    <h1>QUITTANCE DE LOYER</h1>
    
    <div class="header">
        <div class="info-row">
            <span class="label">Période:</span> ${mois} ${quittance.annee}
        </div>
        <div class="info-row">
            <span class="label">Locataire:</span> ${quittance.contrats.nom_locataire} ${quittance.contrats.prenom_locataire}
        </div>
        <div class="info-row">
            <span class="label">Bien:</span> ${quittance.contrats.biens.nom} - ${quittance.contrats.biens.adresse}
        </div>
        <div class="info-row">
            <span class="label">Date de paiement:</span> ${quittance.date_paiement ? new Date(quittance.date_paiement).toLocaleDateString('fr-FR') : 'Non payé'}
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Désignation</th>
                <th>Montant</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Loyer</td>
                <td>${quittance.montant_loyer.toFixed(2)} €</td>
            </tr>
            <tr>
                <td>Charges</td>
                <td>${(quittance.montant_charges || 0).toFixed(2)} €</td>
            </tr>
            <tr class="total">
                <td>TOTAL</td>
                <td>${quittance.montant_total.toFixed(2)} €</td>
            </tr>
        </tbody>
    </table>

    ${quittance.observations ? `<div class="info"><span class="label">Observations:</span> ${quittance.observations}</div>` : ''}
    
    <div style="margin-top: 50px; font-size: 0.9em; color: #666;">
        <p>Quittance générée le ${new Date().toLocaleDateString('fr-FR')}</p>
    </div>
</body>
</html>
        `;

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
        });

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=quittance-${mois}-${quittance.annee}.pdf`);
        res.end(pdfBuffer);

    } catch (error) {
        console.error('Erreur génération PDF quittance:', error);
        if (browser) await browser.close();
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
