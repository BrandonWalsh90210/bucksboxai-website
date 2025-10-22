// Authentication check module for BucksBox.ai
// This module ensures only authenticated users can access the main application

// Pages that don't require authentication
const PUBLIC_PAGES = [
    '/index.html',
    '/',
    '/login.html',
    '/signup.html',
    '/signup-simple.html',
    '/reset-password.html',
    '/welcome.html',
    '/bucksbox-privacy-policy.html',
    '/bucksbox-terms-of-service.html',
    '/test-supabase.html',
    '/debug-signup.html',
    '/supabase-proxy.html',
    '/payment-success.html'
];

async function checkAuth() {
    // Get shared Supabase client from supabase-client.js
    const supabaseClient = window.getSupabaseClient();

    if (!supabaseClient) {
        console.error('Failed to get Supabase client');
        redirectToLogin();
        return;
    }

    // Check for logout flag in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const isLoggingOut = urlParams.get('logout') === 'true';

    if (isLoggingOut) {
        console.log('[AUTH-CHECK] Logout flag detected, forcing session cleanup...');

        try {
            // Force sign out if session still exists
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                console.log('[AUTH-CHECK] Session still exists, forcing signOut()...');
                await supabaseClient.auth.signOut();
            }

            // Clear all Supabase-related localStorage
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('supabase')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            console.log('[AUTH-CHECK] Cleared', keysToRemove.length, 'Supabase keys');

            // Wait for cleanup to complete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Remove logout parameter and stay on login page
            console.log('[AUTH-CHECK] Cleanup complete, removing logout flag...');
            window.history.replaceState({}, document.title, window.location.pathname);

            // Do not proceed with normal auth check
            return null;
        } catch (error) {
            console.error('[AUTH-CHECK] Logout cleanup error:', error);
            // Still remove the parameter
            window.history.replaceState({}, document.title, window.location.pathname);
            return null;
        }
    }

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        // GitHub Pagesのサブディレクトリを考慮したパス取得
        const currentPath = window.location.pathname.replace('/bucksboxai-website', '');
        const normalizedPath = currentPath === '' ? '/' : currentPath;
        const isPublicPage = PUBLIC_PAGES.some(page => {
            if (page === '/') return normalizedPath === '/';
            return normalizedPath.includes(page);
        });
        
        if (!session && !isPublicPage) {
            // Not logged in and trying to access protected page
            console.log('No session found, redirecting to login');
            redirectToLogin();
        } else if (session && isPublicPage && normalizedPath.includes('login.html')) {
            // Already logged in but on login page, redirect to main app
            console.log('Already logged in, redirecting to main app');
            window.location.href = 'index.html';
        }
        
        // Set up auth state listener
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                redirectToLogin();
            } else if (event === 'SIGNED_IN' && isPublicPage) {
                window.location.href = 'index.html';
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
        window.location.href = 'login.html';
    }
}

async function logout() {
    const supabaseClient = window.getSupabaseClient();
    if (!supabaseClient) {
        console.error('Failed to get Supabase client for logout');
        return;
    }

    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;

        window.location.href = 'login.html';
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
        const supabaseClient = window.getSupabaseClient();
        if (!supabaseClient) return null;
        return supabaseClient.auth.getSession();
    }
};