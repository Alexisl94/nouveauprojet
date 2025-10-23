import { supabase } from './lib/supabase.js';

async function testSupabaseConnection() {
    console.log('🔍 Test de connexion à Supabase...\n');

    try {
        // Test 1: Vérifier la configuration
        console.log('1. Configuration:');
        console.log('   URL:', process.env.SUPABASE_URL);
        console.log('   Key présente:', process.env.SUPABASE_ANON_KEY ? 'Oui' : 'Non');
        console.log('');

        // Test 2: Tester une requête simple
        console.log('2. Test de requête...');
        const { data, error } = await supabase
            .from('proprietaires')
            .select('id')
            .limit(1);

        if (error) {
            console.error('   ❌ Erreur:', error);
            console.error('   Message:', error.message);
            console.error('   Details:', error.details);
            console.error('   Hint:', error.hint);
            console.error('   Code:', error.code);
        } else {
            console.log('   ✅ Connexion réussie !');
            console.log('   Résultat:', data);
        }

    } catch (err) {
        console.error('❌ Erreur critique:', err.message);
        console.error('Stack:', err.stack);
    }
}

testSupabaseConnection();
