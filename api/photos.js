import { supabase } from '../lib/supabase.js';

// Récupérer toutes les photos d'un bien
export async function obtenirPhotos(req, res) {
    try {
        const { bienId } = req.params;

        const { data: photos, error } = await supabase
            .from('photos')
            .select('*')
            .eq('bien_id', bienId)
            .order('ordre');

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        res.json({ photos: photos || [] });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Upload une photo
export async function uploadPhoto(req, res) {
    try {
        const { bienId, url, legende } = req.body;

        if (!bienId || !url) {
            return res.status(400).json({ error: 'Bien ID et URL requis' });
        }

        // Obtenir le nombre de photos existantes pour l'ordre
        const { count } = await supabase
            .from('photos')
            .select('*', { count: 'exact', head: true })
            .eq('bien_id', bienId);

        const { data: photo, error } = await supabase
            .from('photos')
            .insert([{
                bien_id: bienId,
                url,
                legende: legende || '',
                ordre: count || 0
            }])
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        res.json({ photo });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Supprimer une photo
export async function supprimerPhoto(req, res) {
    try {
        const { photoId } = req.params;

        // Récupérer l'URL de la photo pour supprimer le fichier du storage
        const { data: photo } = await supabase
            .from('photos')
            .select('url')
            .eq('id', photoId)
            .single();

        if (photo && photo.url) {
            // Extraire le nom du fichier de l'URL
            const fileName = photo.url.split('/').pop();

            // Supprimer du storage
            await supabase.storage
                .from('photos-biens')
                .remove([fileName]);
        }

        // Supprimer de la base de données
        const { error } = await supabase
            .from('photos')
            .delete()
            .eq('id', photoId);

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

// Mettre à jour la légende d'une photo
export async function updatePhotoLegende(req, res) {
    try {
        const { photoId } = req.params;
        const { legende } = req.body;

        const { data: photo, error } = await supabase
            .from('photos')
            .update({ legende })
            .eq('id', photoId)
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        res.json({ photo });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
