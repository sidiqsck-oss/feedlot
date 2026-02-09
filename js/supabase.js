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
                // Try fallback strategies for common schema/name mismatches below
                // Throw into outer catch to handle fallback
                throw error;
            }
            console.info(`Synced ${payload.length} items to Supabase table '${storeName}'.`);
            return { data, error: null };
        } catch (err) {
            console.error(`Sync failed for '${storeName}':`, err);

            // Fallback 1: try lowercased table name with snake_case keys
            try {
                const tableLower = String(storeName).toLowerCase();

                function camelToSnake(str) {
                    return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
                }

                const altPayload = payload.map(item => {
                    const o = {};
                    for (const k of Object.keys(item)) {
                        // keep `id` as-is
                        if (k === 'id') { o[k] = item[k]; continue; }
                        o[camelToSnake(k)] = item[k];
                    }
                    return o;
                });

                console.info(`Attempting fallback sync to '${tableLower}' with snake_case keys.`);
                const { data: data2, error: error2 } = await client.from(tableLower).upsert(altPayload, { returning: 'minimal' });
                if (error2) {
                    console.error(`Fallback upsert error for table '${tableLower}':`, error2);
                    throw error2;
                }
                console.info(`Fallback synced ${altPayload.length} items to Supabase table '${tableLower}'.`);
                return { data: data2, error: null };
            } catch (err2) {
                console.error(`All sync attempts failed for '${storeName}':`, err2);
                throw err2;
            }
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
