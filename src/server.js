import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cookieParser from 'cookie-parser';

// Konfiguracja dla ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfiguracja środowiska
dotenv.config();

// Inicjalizacja Express
const app = express();
const PORT = process.env.PORT || 3000;

// Konfiguracja Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://lxvwbpcfpbfqboklprsb.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dndicGNmcGJmcWJva2xwcnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1NDc0MjEsImV4cCI6MjA1MzEyMzQyMX0.bv_wUqDwqV36RaH1qKDDGOSnnfzDTxTW-deVanTWjkM';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Inicjalizacja klientów Supabase
const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser());

// Middleware dla logowania requestów
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Middleware do autoryzacji
const authenticateUser = async (req, res, next) => {
    try {
        // Sprawdź token w nagłówku Authorization lub w ciasteczkach
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.accessToken;

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ======== ROUTES ========

// Obsługa potwierdzenia emaila
app.get('/login', async (req, res) => {
    const token = req.query.access_token;

    if (token) {
        try {
            const { error } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: 'email'
            });

            if (error) {
                console.error('Email verification error:', error);
                return res.redirect('/?error=verification_failed');
            }

            return res.redirect('/?verified=true');
        } catch (error) {
            console.error('Unexpected verification error:', error);
            return res.redirect('/?error=verification_failed');
        }
    }

    res.sendFile(path.join(__dirname, '../public/auth/index.html'));
});

// Obsługa strony resetowania hasła
app.get('/reset-password', (req, res) => {
    console.log('Reset password page requested, params:', req.query);
    res.sendFile(path.join(__dirname, '../public/auth/index.html'));
});

// Obsługa strony dashboard
app.get('/dashboard', (req, res) => {
    const dashboardPath = path.join(__dirname, '../public/dashboard/index.html');

    if (fs.existsSync(dashboardPath)) {
        res.sendFile(dashboardPath);
    } else {
        res.status(404).send('Dashboard file not found');
    }
});

// Obsługa strony głównej
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/auth/index.html'));
});

// ======== API ENDPOINTS ========

// Logowanie
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Ustaw token w ciasteczku HTTP-only (bezpieczniejsze)
        res.cookie('accessToken', data.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // W produkcji tylko przez HTTPS
            maxAge: 24 * 60 * 60 * 1000, // 24 godziny
            sameSite: 'strict',
            path: '/'
        });

        res.json({ user: data.user, session: data.session });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Rejestracja
app.post('/api/register', async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    firstName,
                    lastName
                },
                emailRedirectTo: `${req.protocol}://${req.get('host')}/login`
            }
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            message: 'Registration successful. Please check your email.',
            user: data.user,
            confirmationSent: data.user?.confirmation_sent_at
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Żądanie resetu hasła
app.post('/api/reset-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${req.protocol}://${req.get('host')}/reset-password`
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            message: 'Password reset link sent successfully. Please check your email.',
            data
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Aktualizacja hasła
app.post('/api/update-password', async (req, res) => {
    const { password, token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token is required for password reset' });
    }

    try {
        const { data: { user }, error: verifyError } = await supabase.auth.getUser(token);

        if (verifyError) {
            return res.status(400).json({
                error: 'Invalid reset token',
                details: verifyError.message
            });
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { password }
        );

        if (updateError) {
            return res.status(400).json({
                error: 'Failed to update password',
                details: updateError.message
            });
        }

        res.json({ message: 'Password has been successfully updated' });
    } catch (error) {
        console.error('Password update error:', error);
        res.status(500).json({
            error: 'Server error',
            details: error.message
        });
    }
});

// Sprawdzanie autentykacji
app.get('/api/check-auth', authenticateUser, async (req, res) => {
    try {
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('user_settings')
            .select('wordpress_api_key, webflow_api_key')
            .eq('user_id', req.user.id)
            .single();

        // Domyślne ustawienia
        const userSettings = (settingsError || !settings)
            ? { wordpress_api_key: '', webflow_api_key: '' }
            : settings;

        res.json({
            user: req.user,
            email: req.user.email,
            user_metadata: req.user.user_metadata,
            settings: userSettings
        });
    } catch (error) {
        console.error('Check auth error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Zapisywanie ustawień
app.post('/api/save-settings', authenticateUser, async (req, res) => {
    try {
        const { wordpress_api_key, webflow_api_key } = req.body;

        const { data, error } = await supabaseAdmin
            .from('user_settings')
            .upsert(
                {
                    user_id: req.user.id,
                    wordpress_api_key,
                    webflow_api_key,
                    updated_at: new Date().toISOString()
                },
                {
                    onConflict: 'user_id',
                    returning: true
                }
            );

        if (error) {
            throw error;
        }

        res.json({ message: 'Settings saved successfully', data });
    } catch (error) {
        console.error('Save settings error:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// Pobieranie ustawień
app.get('/api/get-settings', authenticateUser, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('user_settings')
            .select('*')
            .eq('user_id', req.user.id)
            .single();

        if (error && error.code === 'PGRST116') {
            return res.json({
                wordpress_api_key: '',
                webflow_api_key: ''
            });
        }

        if (error) {
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Wylogowanie
app.post('/api/logout', authenticateUser, async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Usuń ciasteczko z tokenem
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        res.json({ success: true, message: 'Successfully logged out' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Pobieranie postów
app.get('/api/posts', authenticateUser, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const per_page = parseInt(req.query.per_page) || 10;
        const start = (page - 1) * per_page;
        const end = start + per_page - 1;

        const { data: posts, error, count } = await supabaseAdmin
            .from('posts')
            .select('*', { count: 'exact' })
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) {
            throw error;
        }

        res.json({
            posts: posts || [],
            total: count || 0,
            page,
            per_page
        });
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Usuwanie posta
app.delete('/api/posts/:id', authenticateUser, async (req, res) => {
    try {
        const postId = req.params.id;

        // Sprawdź czy post istnieje i należy do użytkownika
        const { data: post, error: postError } = await supabaseAdmin
            .from('posts')
            .select('*')
            .eq('id', postId)
            .eq('user_id', req.user.id)
            .single();

        if (postError || !post) {
            return res.status(404).json({ error: 'Post not found or access denied' });
        }

        // Usuń post
        const { error } = await supabaseAdmin
            .from('posts')
            .delete()
            .eq('id', postId)
            .eq('user_id', req.user.id);

        if (error) {
            throw error;
        }

        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// Aktualizacja profilu
app.post('/api/update-profile', authenticateUser, async (req, res) => {
    try {
        const { firstName, lastName } = req.body;

        const { error } = await supabaseAdmin.auth.admin.updateUserById(
            req.user.id,
            {
                user_metadata: {
                    ...req.user.user_metadata,
                    firstName,
                    lastName
                }
            }
        );

        if (error) {
            throw error;
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Zmiana hasła
app.post('/api/change-password', authenticateUser, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Sprawdź aktualne hasło
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: req.user.email,
            password: currentPassword
        });

        if (signInError) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Zmień hasło
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
            req.user.id,
            { password: newPassword }
        );

        if (error) {
            throw error;
        }

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Aktualizacja adresu e-mail
app.post('/api/update-email', authenticateUser, async (req, res) => {
    try {
        const { newEmail } = req.body;

        const { error } = await supabaseAdmin.auth.admin.updateUserById(
            req.user.id,
            { email: newEmail }
        );

        if (error) {
            throw error;
        }

        res.json({ message: 'Email updated successfully' });
    } catch (error) {
        console.error('Update email error:', error);
        res.status(500).json({ error: 'Failed to update email' });
    }
});

// Middleware dla obsługi 404 - musi być po wszystkich zdefiniowanych ścieżkach
app.use(async (req, res, next) => {
    // Sprawdzamy, czy ścieżka nie jest plikiem statycznym lub API
    if (!req.path.startsWith('/api/') && !req.path.match(/\.[a-zA-Z0-9]+$/)) {
        console.log(`404 handler: ${req.path}`);

        // Sprawdzamy, czy użytkownik jest zalogowany
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.accessToken;

        if (token) {
            try {
                // Próbujemy zweryfikować token
                const { data: { user }, error } = await supabase.auth.getUser(token);

                if (!error && user) {
                    // Użytkownik jest zalogowany, przekieruj na dashboard
                    console.log('Authenticated user found, redirecting to dashboard');
                    return res.redirect('/dashboard');
                }
            } catch (error) {
                console.error('Error verifying token:', error);
            }
        }

        // Użytkownik nie jest zalogowany lub wystąpił błąd, przekieruj na stronę logowania
        console.log('No authenticated user, redirecting to login page');
        return res.redirect('/');
    }

    next();
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is busy. Trying ${PORT + 1}...`);
        app.listen(PORT + 1);
    } else {
        console.error('Server error:', err);
    }
});

export default app;