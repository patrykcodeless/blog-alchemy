import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Konfiguracja dla ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfiguracja środowiska
dotenv.config();

// Inicjalizacja Express
const app = express();
const PORT = process.env.PORT || 3000;

// Konfiguracja Supabase
const supabaseUrl = 'https://lxvwbpcfpbfqboklprsb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dndicGNmcGJmcWJva2xwcnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1NDc0MjEsImV4cCI6MjA1MzEyMzQyMX0.bv_wUqDwqV36RaH1qKDDGOSnnfzDTxTW-deVanTWjkM';
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key length:', supabaseKey?.length || 0);

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Obsługa potwierdzenia emaila
app.get('/login', async (req, res) => {
    const token = req.query.access_token;

    if (token) {
        try {
            // Próba potwierdzenia emaila
            const { error } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: 'email'
            });

            if (error) {
                console.error('Błąd potwierdzenia emaila:', error);
                return res.redirect('/?error=verification_failed');
            }

            // Przekierowanie do strony logowania z informacją o sukcesie
            return res.redirect('/?verified=true');
        } catch (error) {
            console.error('Nieoczekiwany błąd podczas potwierdzania:', error);
            return res.redirect('/?error=verification_failed');
        }
    }

    // Jeśli nie ma tokena, po prostu pokaż stronę logowania
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Logowanie
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Próba logowania:', { email });

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('Błąd logowania:', error.message);
            console.error('Szczegóły błędu:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('Zalogowano pomyślnie:', data);
        console.log('Session:', data.session);
        console.log('User:', data.user);
        res.json({ user: data.user, session: data.session });
    } catch (error) {
        console.error('Nieoczekiwany błąd:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Rejestracja
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    console.log('Próba rejestracji:', { email });

    try {
        console.log('Rozpoczynam rejestrację użytkownika...');
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `http://localhost:${PORT}/login`
            }
        });

        if (error) {
            console.error('Błąd rejestracji:', error.message);
            console.error('Szczegóły błędu:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('Zarejestrowano pomyślnie:', data);
        console.log('User:', data.user);
        console.log('Session:', data.session);

        if (data.user) {
            console.log('ID użytkownika:', data.user.id);
            console.log('Email użytkownika:', data.user.email);
            console.log('Status potwierdzenia:', data.user.confirmed_at);
        }

        res.json({
            message: 'Rejestracja udana. Sprawdź swoją skrzynkę email.',
            user: data.user,
            confirmationSent: data.user?.confirmation_sent_at
        });
    } catch (error) {
        console.error('Nieoczekiwany błąd:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Password reset request handler - alternatywna wersja
app.post('/api/reset-password', async (req, res) => {
    const { email } = req.body;
    console.log('Otrzymano żądanie resetowania hasła dla:', email);

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Sprawdź czy użytkownik istnieje
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
            console.error('Błąd podczas sprawdzania użytkowników:', listError);
            return res.status(500).json({ error: 'Internal server error' });
        }

        const userExists = users.some(user => user.email === email);

        if (!userExists) {
            console.log('Nie znaleziono użytkownika z emailem:', email);
            return res.status(404).json({
                error: 'Unfortunately, we could not find an account associated with this email address.'
            });
        }

        console.log('Znaleziono użytkownika, wysyłam żądanie resetowania hasła...');
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'http://localhost:3000/reset-password'
        });

        if (error) {
            console.error('Błąd podczas wysyłania linku:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('Link do resetowania hasła wysłany pomyślnie');
        res.json({
            message: 'Password reset link sent successfully. Please check your email.',
            data: data
        });
    } catch (error) {
        console.error('Nieoczekiwany błąd:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Obsługa strony resetowania hasła
app.get('/reset-password', (req, res) => {
    console.log('Reset password page requested');
    console.log('Full URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
    console.log('Query parameters:', req.query);
    console.log('Hash (if available):', req.hash);
    console.log('Headers:', req.headers);

    // Zawsze wysyłaj stronę resetowania hasła
    res.sendFile(path.join(__dirname, '../public/reset-password.html'));
});

// Update password handler
app.post('/api/update-password', async (req, res) => {
    const { password, token } = req.body;
    console.log('Password update request received');

    if (!token) {
        return res.status(400).json({ error: 'Token is required for password reset' });
    }

    try {
        // Najpierw spróbujmy zweryfikować token
        const { data: { user }, error: verifyError } = await supabase.auth.getUser(token);

        if (verifyError) {
            console.error('Token verification failed:', verifyError);
            return res.status(400).json({
                error: 'Invalid reset token',
                details: verifyError.message
            });
        }

        // Teraz użyjmy service role key do aktualizacji hasła
        const adminAuthClient = supabaseAdmin.auth.admin;
        const { data, error: updateError } = await adminAuthClient.updateUserById(
            user.id,
            { password: password }
        );

        if (updateError) {
            console.error('Password update failed:', updateError);
            return res.status(400).json({
                error: 'Failed to update password',
                details: updateError.message
            });
        }

        console.log('Password updated successfully');
        res.json({ message: 'Password has been successfully updated' });
    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({
            error: 'Server error',
            details: error.message
        });
    }
});

// Endpoint do sprawdzania autoryzacji i pobierania danych użytkownika
app.get('/api/check-auth', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) {
            return res.status(401).json({ error: error.message });
        }

        // Użyj supabaseAdmin do pobierania ustawień
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('user_settings')
            .select('wordpress_api_key, webflow_api_key')
            .eq('user_id', user.id)
            .single();

        // Przygotuj domyślne ustawienia
        const defaultSettings = {
            wordpress_api_key: '',
            webflow_api_key: ''
        };

        // Jeśli nie ma ustawień lub wystąpił błąd, użyj domyślnych
        const userSettings = (settingsError || !settings) ? defaultSettings : settings;

        // Zwróć dane użytkownika i ustawienia
        res.json({
            user: user,
            email: user.email,
            user_metadata: user.user_metadata,
            settings: userSettings
        });
    } catch (error) {
        console.error('Error in check-auth:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint do zapisywania ustawień
app.post('/api/save-settings', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const { wordpress_api_key, webflow_api_key } = req.body;
        console.log('Attempting to save settings for user:', user.id);

        // Użyj upsert z prawidłową konfiguracją
        const { data, error } = await supabaseAdmin
            .from('user_settings')
            .upsert(
                {
                    user_id: user.id,
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
            console.error('Error saving settings:', error);
            throw error;
        }

        console.log('Settings saved successfully:', data);
        res.json({ message: 'Settings saved successfully', data });
    } catch (error) {
        console.error('Unexpected error saving settings:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Endpoint do pobierania ustawień
app.get('/api/get-settings', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Użyj supabaseAdmin do pobierania ustawień
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (settingsError && settingsError.code === 'PGRST116') {
            return res.json({
                wordpress_api_key: '',
                webflow_api_key: ''
            });
        }

        if (settingsError) {
            throw settingsError;
        }

        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Obsługa strony dashboard
app.get('/dashboard', (req, res) => {
    console.log('Próba dostępu do dashboard');
    const dashboardPath = path.join(__dirname, '../public/dashboard.html');
    console.log('Ścieżka do pliku dashboard:', dashboardPath);

    try {
        if (fs.existsSync(dashboardPath)) {
            console.log('Plik dashboard.html znaleziony');
            res.sendFile(dashboardPath);
        } else {
            console.error('Plik dashboard.html nie istnieje pod ścieżką:', dashboardPath);
            res.status(404).send('Dashboard file not found');
        }
    } catch (err) {
        console.error('Błąd podczas sprawdzania/wysyłania pliku dashboard:', err);
        res.status(500).send('Internal server error');
    }
});

// Obsługa strony głównej
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Endpoint do wylogowania
app.post('/api/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        console.log('Logout request received, token:', token ? 'present' : 'missing');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Error during logout:', error);
            return res.status(500).json({ error: error.message });
        }

        console.log('User logged out successfully');
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Unexpected error during logout:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint testowy do sprawdzenia konfiguracji email
app.post('/api/test-email', async (req, res) => {
    const { email } = req.body;

    try {
        const { data, error } = await supabase.auth.admin.sendEmail(email, {
            template: 'RESET_PASSWORD',
            data: {
                email: email,
                redirectTo: 'http://localhost:3000/reset-password'
            }
        });

        if (error) {
            console.error('Test email error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Test email sent', data });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ error: 'Failed to send test email' });
    }
});

// Endpoint do pobierania postów
app.get('/api/posts', async (req, res) => {
    console.log('Otrzymano żądanie GET /api/posts');
    try {
        const token = req.headers.authorization?.split(' ')[1];
        console.log('Token present:', !!token);

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) {
            console.error('Auth error:', authError);
            return res.status(401).json({ error: 'Invalid token' });
        }
        console.log('Authenticated user:', user.id);

        const page = parseInt(req.query.page) || 1;
        const per_page = parseInt(req.query.per_page) || 10;
        const start = (page - 1) * per_page;
        const end = start + per_page - 1;

        console.log('Fetching posts with params:', { page, per_page, start, end });

        // Pobierz posty z bazy danych
        const { data: posts, error: postsError, count } = await supabaseAdmin
            .from('posts')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(start, end);

        if (postsError) {
            console.error('Error fetching posts:', postsError);
            throw postsError;
        }

        console.log(`Found ${count} posts total, returning ${posts?.length || 0} posts`);

        res.json({
            posts: posts || [],
            total: count || 0,
            page,
            per_page
        });

    } catch (error) {
        console.error('Error in /api/posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Endpoint do usuwania posta
app.delete('/api/posts/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const postId = req.params.id;

        // Sprawdź czy post należy do użytkownika
        const { data: post, error: postError } = await supabaseAdmin
            .from('posts')
            .select('*')
            .eq('id', postId)
            .eq('user_id', user.id)
            .single();

        if (postError || !post) {
            return res.status(404).json({ error: 'Post not found or access denied' });
        }

        // Usuń post
        const { error: deleteError } = await supabaseAdmin
            .from('posts')
            .delete()
            .eq('id', postId)
            .eq('user_id', user.id);

        if (deleteError) {
            throw deleteError;
        }

        res.json({ message: 'Post deleted successfully' });

    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// Uruchomienie serwera
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Available endpoints:');
    app._router.stack.forEach(function (r) {
        if (r.route && r.route.path) {
            console.log(`${Object.keys(r.route.methods)} ${r.route.path}`);
        }
    });
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is busy. Trying ${PORT + 1}...`);
        server.listen(PORT + 1);
    } else {
        console.error('Server error:', err);
    }
});
