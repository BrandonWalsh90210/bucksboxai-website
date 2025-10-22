// Supabase Client Module
// Single source of truth for Supabase configuration and client instance

const SUPABASE_CONFIG = {
    url: 'https://ypesemlagxsdixjxvrpb.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZXNlbWxhZ3hzZGl4anh2cnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NzYzODgsImV4cCI6MjA3MjU1MjM4OH0.Q6OnAHRJCpIAdWP3fCgtsaVF_YLM0ov9-p6nhluUPm8'
};

// Global Supabase client instance
let supabaseClientInstance = null;

// Initialize and return the Supabase client
function getSupabaseClient() {
    if (!supabaseClientInstance) {
        if (typeof supabase === 'undefined') {
            console.error('Supabase library not loaded');
            return null;
        }
        const { createClient } = supabase;
        supabaseClientInstance = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    }
    return supabaseClientInstance;
}

// Export for use in other scripts
window.getSupabaseClient = getSupabaseClient;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;

// Notify that supabase-client.js is ready
window.supabaseClientReady = true;
console.log('[SUPABASE-CLIENT] Module loaded and ready');

// Dispatch custom event for other scripts to listen
if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supabaseClientReady'));
}
