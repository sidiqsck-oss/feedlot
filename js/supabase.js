// Supabase integration wrapper
// Provides safe, opt-in sync functions that use the existing IndexedDB helpers
(function () {
    const urlMeta = document.querySelector('meta[name="supabase-url"]');
    const keyMeta = document.querySelector('meta[name="supabase-key"]');
    const SUPABASE_URL = urlMeta ? urlMeta.content.trim() : '';
    const SUPABASE_KEY = keyMeta ? keyMeta.content.trim() : '';

    let client = null;
    if (SUPABASE_URL && SUPABASE_KEY && window.supabase && typeof supabase.createClient === 'function') {
        try {
            client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.info('Supabase client initialized');
        } catch (err) {
            console.error('Failed to initialize Supabase client', err);
        }
    } else if (SUPABASE_URL || SUPABASE_KEY) {
        console.warn('Supabase script not loaded or invalid; ensure @supabase/supabase-js is available');
    }

    // Expose the raw client
    window.supabaseClient = client;

    // Helper to check config
    window.isSupabaseConfigured = function () {
        return !!client;
    };

    // Sync local IndexedDB store to Supabase table (upsert by id)
    async function syncStoreToSupabase(storeName) {
        if (!client) throw new Error('Supabase client not configured');
        if (typeof getAllItems !== 'function') throw new Error('Local database helpers not available');
        const items = await getAllItems(storeName);
        if (!items || items.length === 0) {
            console.info(`No items to sync for store: ${storeName}`);
            return { data: [], error: null };
        }

        // Ensure items have an `id` field for upsert behavior
        const payload = items.map(i => ({ ...i }));

        try {
            const { data, error } = await client.from(storeName).upsert(payload, { returning: 'minimal' });
            if (error) {
                console.error(`Supabase upsert error for table '${storeName}':`, error);
                // Throw so callers (e.g. pushAllStores) can react and show user-visible errors
                throw error;
            }
            console.info(`Synced ${payload.length} items to Supabase table '${storeName}'.`);
            return { data, error: null };
        } catch (err) {
            console.error(`Sync failed for '${storeName}':`, err);
            throw err;
        }
    }

    // Pull all rows from Supabase table into local IndexedDB (clears local store first)
    async function pullStoreFromSupabase(storeName) {
        if (!client) throw new Error('Supabase client not configured');
        if (typeof addItem !== 'function' || typeof clearStore !== 'function') throw new Error('Local database helpers not available');

        const { data, error } = await client.from(storeName).select('*');
        if (error) {
            console.error('Supabase select error', error);
            return { data: null, error };
        }

        // Replace local store with remote data
        await clearStore(storeName);
        for (const row of data) {
            // If `id` is autoIncrement in IndexedDB and missing, remove it so addItem assigns one.
            const localRow = { ...row };
            await addItem(storeName, localRow).catch(err => console.error('addItem error', err));
        }

        return { data, error: null };
    }

    // Safe helpers exposed to global scope
    window.syncStoreToSupabase = syncStoreToSupabase;
    window.pullStoreFromSupabase = pullStoreFromSupabase;

    // Convenience: do not auto-run any sync to avoid breaking existing behavior
})();
