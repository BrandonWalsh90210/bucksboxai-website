// Authentication check module for BucksBox.ai
// This module ensures only authenticated users can access the main application

const SUPABASE_URL = 'https://ypesemlagxsdixjxvrpb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZXNlbWxhZ3hzZGl4anh2cnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NzYzODgsImV4cCI6MjA3MjU1MjM4OH0.Q6OnAHRJCpIAdWP3fCgtsaVF_YLM0ov9-p6nhluUPm8';

// Pages that don't require authentication
const PUBLIC_PAGES = [
    '/login.html',
    '/signup.html',
    '/signup-simple.html',
    '/reset-password.html',
    '/bucksbox-privacy-policy.html',
    '/bucksbox-terms-of-service.html',
    '/test-supabase.html',
    '/debug-signup.html',
    '/supabase-proxy.html'
];

// Initialize Supabase client
let supabaseClient = null;

async function initializeAuth() {
    // Wait for Supabase library to load
    if (typeof supabase === 'undefined') {
        console.error('Supabase library not loaded');
        return false;
    }
    
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    return true;
}

async function checkAuth() {
    if (!supabaseClient) {
        const initialized = await initializeAuth();
        if (!initialized) {
            console.error('Failed to initialize Supabase');
            redirectToLogin();
            return;
        }
    }
    
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        const currentPath = window.location.pathname;
        const isPublicPage = PUBLIC_PAGES.some(page => currentPath.includes(page));
        
        if (!session && !isPublicPage) {
            // Not logged in and trying to access protected page
            console.log('No session found, redirecting to login');
            redirectToLogin();
        } else if (session && isPublicPage && currentPath.includes('login.html')) {
            // Already logged in but on login page, redirect to main app
            console.log('Already logged in, redirecting to main app');
            window.location.href = '/bucksboxai-website/index.html';
        }
        
        // Set up auth state listener
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                redirectToLogin();
            } else if (event === 'SIGNED_IN' && isPublicPage) {
                window.location.href = '/bucksboxai-website/index.html';
            }
        });
        
        return session;
    } catch (error) {
        console.error('Auth check error:', error);
        redirectToLogin();
    }
}

function redirectToLogin() {
    const currentPath = window.location.pathname;
    if (!currentPath.includes('login.html')) {
        window.location.href = '/bucksboxai-website/login.html';
    }
}

async function logout() {
    if (!supabaseClient) {
        await initializeAuth();
    }
    
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        
        window.location.href = '/bucksboxai-website/login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Auto-check auth on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
} else {
    checkAuth();
}

// Export for use in other scripts
window.authModule = {
    checkAuth,
    logout,
    getSession: async () => {
        if (!supabaseClient) await initializeAuth();
        return supabaseClient.auth.getSession();
    }
};