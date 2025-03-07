// DOM Elements
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const resetTab = document.getElementById('reset-tab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const newPasswordForm = document.getElementById('setNewPassword');
const alertMessages = document.getElementById('alertMessages');
const resetEmailDisplay = document.getElementById('resetEmailDisplay');

// Zmienna globalna dla tokena
let currentAccessToken = null;

// Helper function to show alerts
function showAlert(message, type, container = 'alertMessages') {
    const alertContainer = document.getElementById(container);
    if (!alertContainer) {
        console.error('Alert container not found:', container);
        return;
    }

    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Add alert to container
    alertContainer.appendChild(alertDiv);

    // Force reflow
    alertDiv.offsetHeight;

    // Add show class for animation
    setTimeout(() => {
        alertDiv.classList.add('show');
    }, 10);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
            alertDiv.classList.remove('show');
            setTimeout(() => {
                if (alertDiv && alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 300);
        }
    }, 5000);

    // Handle close button
    const closeButton = alertDiv.querySelector('.btn-close');
    closeButton.addEventListener('click', (e) => {
        e.preventDefault();
        alertDiv.classList.remove('show');
        setTimeout(() => {
            if (alertDiv && alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 300);
    });
}

// Helper function to switch to tab
function switchToTab(tabId) {
    const tab = new bootstrap.Tab(document.getElementById(tabId));
    tab.show();
}

// Helper function to parse JWT token
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Error parsing JWT:', e);
        return null;
    }
}

// Helper function to check if token is expired
function isTokenExpired(token) {
    try {
        const tokenData = parseJwt(token);
        if (!tokenData || !tokenData.exp) return true;
        const expirationTime = tokenData.exp * 1000; // convert to milliseconds
        return Date.now() >= expirationTime;
    } catch (e) {
        console.error('Error checking token expiration:', e);
        return true;
    }
}

// Function to handle URL changes
function handleUrlChange() {
    console.log('Checking URL parameters...');

    // Parse hash parameters
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);

    // Check for errors first
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    const errorCode = hashParams.get('error_code');

    if (error) {
        console.log('Error found in URL:', { error, errorCode, errorDescription });

        // Handle specific error cases
        if (error === 'access_denied' && errorCode === 'otp_expired') {
            switchToTab('reset-tab');
            showAlert('The password reset link has expired. Please request a new one.', 'warning', 'resetAlerts');
            return;
        }

        // Handle other errors
        switchToTab('reset-tab');
        showAlert(errorDescription || 'An error occurred. Please try again.', 'danger', 'resetAlerts');
        return;
    }

    // Check for recovery type
    const isRecovery = hashParams.get('type') === 'recovery';
    console.log('Is recovery type:', isRecovery);

    // Get access token from various possible locations
    const accessToken = hashParams.get('access_token');
    console.log('Access token found:', !!accessToken);

    if (accessToken) {
        console.log('Processing access token...');
        currentAccessToken = accessToken;

        if (isTokenExpired(accessToken)) {
            console.log('Token has expired');
            switchToTab('reset-tab');
            showAlert('Password reset link has expired. Please request a new one.', 'warning', 'resetAlerts');
            return;
        }

        // Show new password form for recovery
        if (isRecovery || hash.includes('type=recovery')) {
            console.log('Showing password reset form');
            const tokenData = parseJwt(accessToken);
            if (tokenData && tokenData.email) {
                console.log('Email from token:', tokenData.email);
                const resetEmailField = document.getElementById('resetEmailDisplay');
                if (resetEmailField) {
                    resetEmailField.value = tokenData.email;
                }

                // Find and show the new password form tab
                const newPasswordFormElement = document.getElementById('newPasswordForm');
                if (newPasswordFormElement) {
                    const tabPanes = document.querySelectorAll('.tab-pane');
                    tabPanes.forEach(pane => pane.classList.remove('show', 'active'));
                    newPasswordFormElement.classList.add('show', 'active');

                    // Update tab button states
                    const tabButtons = document.querySelectorAll('.nav-link');
                    tabButtons.forEach(button => button.classList.remove('active'));
                    const resetTab = document.getElementById('reset-tab');
                    if (resetTab) {
                        resetTab.classList.add('active');
                    }
                } else {
                    console.error('New password form element not found');
                }
            }
        }
    } else {
        console.log('No access token found in URL');
    }
}

// Call handleUrlChange on page load and when hash changes
window.addEventListener('load', handleUrlChange);
window.addEventListener('hashchange', handleUrlChange);

// Sprawdź parametry URL
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('verified') === 'true') {
    switchToTab('login-tab');
    showAlert('Email verified successfully. You can now sign in.', 'success');
} else if (urlParams.get('error') === 'verification_failed') {
    switchToTab('login-tab');
    showAlert('Email verification failed. Please try again or contact support.', 'danger');
}

// Field validation function
function validateField(field, fieldName) {
    field.classList.remove('is-invalid');

    if (!field.value || field.value.trim() === '') {
        field.classList.add('is-invalid');
        return `${fieldName} is required`;
    }

    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
        field.classList.add('is-invalid');
        return 'Please enter a valid email address';
    }

    if (field.type === 'password' && field.value.length < 6) {
        field.classList.add('is-invalid');
        return 'Password must be at least 6 characters long';
    }

    return null;
}

// Login form handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Login attempt...');

    const emailField = document.getElementById('loginEmail');
    const passwordField = document.getElementById('loginPassword');

    // Validation
    const emailError = validateField(emailField, 'Email');
    const passwordError = validateField(passwordField, 'Password');

    if (emailError || passwordError) {
        if (emailError) showAlert(emailError, 'danger', 'loginAlerts');
        if (passwordError) showAlert(passwordError, 'danger', 'loginAlerts');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: emailField.value,
                password: passwordField.value
            })
        });

        const data = await response.json();

        if (response.ok && data.session) {
            localStorage.setItem('accessToken', data.session.access_token);
            showAlert('Login successful! Redirecting...', 'success', 'loginAlerts');

            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } else {
            showAlert(data.error || 'Login failed. Please check your credentials.', 'danger', 'loginAlerts');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('An error occurred during login. Please try again.', 'danger', 'loginAlerts');
    }
});

// Registration form handler
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Registration attempt...');

    const firstNameField = document.getElementById('firstName');
    const lastNameField = document.getElementById('lastName');
    const emailField = document.getElementById('registerEmail');
    const passwordField = document.getElementById('registerPassword');

    // Validation
    const firstNameError = validateField(firstNameField, 'First name');
    const lastNameError = validateField(lastNameField, 'Last name');
    const emailError = validateField(emailField, 'Email');
    const passwordError = validateField(passwordField, 'Password');

    if (firstNameError || lastNameError || emailError || passwordError) {
        if (firstNameError) showAlert(firstNameError, 'danger', 'registerAlerts');
        if (lastNameError) showAlert(lastNameError, 'danger', 'registerAlerts');
        if (emailError) showAlert(emailError, 'danger', 'registerAlerts');
        if (passwordError) showAlert(passwordError, 'danger', 'registerAlerts');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                firstName: firstNameField.value,
                lastName: lastNameField.value,
                email: emailField.value,
                password: passwordField.value
            })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Registration successful! Please check your email to verify your account.', 'success', 'registerAlerts');
            e.target.reset();
        } else {
            showAlert(data.error || 'Registration failed. Please try again.', 'danger', 'registerAlerts');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('An error occurred during registration. Please try again.', 'danger', 'registerAlerts');
    }
});

// Password reset form handler
if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;

        if (!email) {
            showAlert('Please enter your email address', 'danger');
            return;
        }

        try {
            console.log('Wysyłanie żądania resetowania hasła dla:', email);
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            console.log('Odpowiedź z serwera:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send reset password link');
            }

            showAlert('Reset password link has been sent to your email. Please check your inbox.', 'success');

            // Wyczyść formularz
            resetPasswordForm.reset();

            // Przekieruj do strony logowania po 3 sekundach
            setTimeout(() => {
                window.location.href = '/#login';
            }, 3000);
        } catch (error) {
            console.error('Error:', error);
            showAlert(error.message || 'Failed to send reset password link', 'danger');
        }
    });
}

// Set new password handler
document.getElementById('setNewPassword').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Starting password update...');

    if (!currentAccessToken) {
        console.error('No access token available');
        showAlert('Access token is missing. Please try resetting your password again.', 'danger');
        return;
    }

    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
        console.log('Passwords do not match');
        showAlert('Passwords do not match!', 'danger');
        return;
    }

    try {
        console.log('Sending password update request...');
        const response = await fetch('/api/update-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                password: newPassword,
                access_token: currentAccessToken
            }),
        });

        console.log('Response received:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update password');
        }

        showAlert('Password has been successfully updated!', 'success');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    } catch (error) {
        console.error('Error during password update:', error);
        showAlert(error.message, 'danger');
    }
});

async function testConnection() {
    try {
        const { data, error } = await supabase.from('your_table').select('*').limit(1)
        if (error) {
            console.error('Błąd połączenia z Supabase:', error.message)
            return false
        }
        console.log('Połączenie z Supabase działa poprawnie')
        return true
    } catch (err) {
        console.error('Nieoczekiwany błąd:', err)
        return false
    }
}

// Obsługa linku "Forgot password"
document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
    e.preventDefault();

    // Znajdź i kliknij tab resetowania hasła
    const resetTab = document.getElementById('reset-tab');
    resetTab.click();
});

// Dodaj też obsługę powrotu do logowania
document.getElementById('backToLoginLink')?.addEventListener('click', (e) => {
    e.preventDefault();

    // Pokaż formularz logowania
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('resetPasswordForm').style.display = 'none';

    // Zaktualizuj nagłówek
    document.querySelector('.card-title').textContent = 'Login';

    // Zaktualizuj URL
    window.location.hash = 'login';
});

// Obsługa pokazywania/ukrywania hasła
document.querySelectorAll('.password-toggle').forEach(button => {
    button.addEventListener('click', (e) => {
        const targetId = button.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);
        const toggleText = button.querySelector('.password-toggle-text');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleText.textContent = 'Hide';
        } else {
            passwordInput.type = 'password';
            toggleText.textContent = 'Show';
        }
    });
}); 