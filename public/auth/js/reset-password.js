/**
 * Reset Password Script
 * Obsługuje funkcjonalność resetowania hasła
 */

// Inicjalizacja resetowania hasła
function initResetPassword() {
    const resetForm = document.getElementById('resetPasswordForm');
    if (!resetForm) {
        console.error('Reset password form not found');
        return;
    }

    // Dodaj obsługę formularza resetowania
    resetForm.addEventListener('submit', handleResetPassword);

    // Dodaj obsługę przycisków pokazywania/ukrywania hasła
    document.querySelectorAll('.password-toggle').forEach(button => {
        button.addEventListener('click', togglePasswordVisibility);
    });

    console.log('Reset password component initialized');
}

// Obsługa przycisku pokazywania/ukrywania hasła
function togglePasswordVisibility(e) {
    const targetId = e.currentTarget.getAttribute('data-target');
    const passwordInput = document.getElementById(targetId);
    const toggleText = e.currentTarget.querySelector('.password-toggle-text');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleText.textContent = 'Hide';
    } else {
        passwordInput.type = 'password';
        toggleText.textContent = 'Show';
    }
}

// Obsługa formularza resetowania hasła
async function handleResetPassword(e) {
    e.preventDefault();
    console.log('Reset password form submitted');

    // Pobierz elementy formularza
    const newPasswordField = document.getElementById('newPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');

    // Walidacja pól
    if (newPasswordField.value !== confirmPasswordField.value) {
        Auth.showAlert('Passwords do not match', 'danger', 'resetPasswordAlerts');
        return;
    }

    let hasErrors = false;
    const newPasswordError = Auth.validateField(newPasswordField, 'New Password');
    const confirmPasswordError = Auth.validateField(confirmPasswordField, 'Confirm Password');

    if (newPasswordError) {
        Auth.showAlert(newPasswordError, 'danger', 'resetPasswordAlerts');
        hasErrors = true;
    }

    if (confirmPasswordError) {
        Auth.showAlert(confirmPasswordError, 'danger', 'resetPasswordAlerts');
        hasErrors = true;
    }

    if (hasErrors) return;

    try {
        // Pobierz token z URL
        const url = new URL(window.location.href);
        let token = null;

        // Sprawdź różne możliwe lokalizacje tokena
        if (url.hash) {
            // Token w hash (#)
            const hashParams = new URLSearchParams(url.hash.substring(1));
            token = hashParams.get('access_token');
        }

        if (!token && url.searchParams.has('token')) {
            // Token w query params
            token = url.searchParams.get('token');
        }

        if (!token) {
            // Spróbuj znaleźć token w całym URL
            const fullUrl = window.location.href;
            const tokenMatch = fullUrl.match(/[?#&](?:access_token|token)=([^&]+)/);
            token = tokenMatch ? tokenMatch[1] : null;
        }

        console.log('Found token:', token ? 'yes' : 'no');

        if (!token) {
            throw new Error('Reset token not found. Please request a new password reset link.');
        }

        Auth.showAlert('Updating password...', 'info', 'resetPasswordAlerts');

        const response = await fetch('/api/update-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: newPasswordField.value,
                token: token
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.details || 'Failed to reset password');
        }

        Auth.showAlert('Password reset successful! Redirecting to login...', 'success', 'resetPasswordAlerts');

        // Przekierowanie po krótkim opóźnieniu
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);

    } catch (error) {
        console.error('Error resetting password:', error);
        Auth.showAlert(error.message || 'Failed to reset password. Please try again.', 'danger', 'resetPasswordAlerts');
    }
}

// Obsługa formularza wysyłania linku resetującego
function initResetEmailForm() {
    console.log('Initializing reset email form');

    const resetEmailForm = document.getElementById('resetPasswordForm');
    if (!resetEmailForm) {
        console.error('Reset email form not found');
        return;
    }

    // Dodajemy handler zdarzenia tylko jeśli jeszcze nie został dodany
    if (!resetEmailForm.hasAttribute('data-initialized')) {
        resetEmailForm.setAttribute('data-initialized', 'true');

        resetEmailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Reset email form submitted');

            const resetEmailField = document.getElementById('resetEmail');

            // Walidacja pola
            const emailError = Auth.validateField(resetEmailField, 'Email');
            if (emailError) {
                Auth.showAlert(emailError, 'danger', 'resetAlerts');
                return;
            }

            try {
                Auth.showAlert('Sending reset link...', 'info', 'resetAlerts');

                const response = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: resetEmailField.value
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    // Sprawdź czy to błąd związany z limitem emaili
                    if (data.error && data.error.toLowerCase().includes('rate limit')) {
                        throw new Error('Too many reset attempts. Please wait a few minutes before trying again.');
                    }
                    throw new Error(data.error || 'Failed to send reset link');
                }

                // Wyczyść formularz
                resetEmailForm.reset();

                // Pokaż komunikat o sukcesie
                Auth.showAlert('Password reset link sent to your email. Please check your inbox.', 'success', 'resetAlerts');

                // Nie przekierowujemy automatycznie na stronę logowania

            } catch (error) {
                console.error('Reset password error:', error);
                Auth.showAlert(error.message || 'Failed to send reset link. Please try again.', 'danger', 'resetAlerts');
            }
        });
    }
}

// Eksportujemy funkcje
window.initResetPassword = initResetPassword;
window.initResetEmailForm = initResetEmailForm;

// Inicjalizacja po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    // Ta logika jest teraz obsługiwana przez component-loader.js
    // Inicjalizacja będzie wykonana, gdy komponent zostanie załadowany
}); 