import { supabase } from '../lib/supabase.js';
import multer from 'multer';

// Configuration de multer pour gérer les uploads en mémoire
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images sont acceptées'));
        }
    }
});

// Middleware pour parser les fichiers
export const uploadMiddleware = upload.single('photo');

// Upload une photo vers Supabase Storage
export async function uploadPhotoToStorage(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const fileName = `${Date.now()}-${req.file.originalname}`;

        // Upload vers Supabase Storage
        const { data, error } = await supabase.storage
            .from('photos-biens')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                cacheControl: '3600'
            });

        if (error) {
            console.error('Erreur Supabase Storage:', error);
            return res.status(500).json({ error: 'Erreur lors de l\'upload' });
        }

        // Obtenir l'URL publique
        const { data: { publicUrl } } = supabase.storage
            .from('photos-biens')
            .getPublicUrl(fileName);

        res.json({ url: publicUrl, fileName });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
