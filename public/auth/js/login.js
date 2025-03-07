/**
 * Login Script
 * Obsługuje funkcjonalność logowania
 */

// Inicjalizacja logowania
function initLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.error('Login form not found');
        return;
    }

    // Dodaj obsługę formularza logowania
    loginForm.addEventListener('submit', handleLogin);

    // Dodaj obsługę przycisków pokazywania/ukrywania hasła
    const passwordToggle = document.querySelector('.password-toggle[data-target="loginPassword"]');
    if (passwordToggle) {
        passwordToggle.addEventListener('click', (e) => {
            const targetId = passwordToggle.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            const toggleText = passwordToggle.querySelector('.password-toggle-text');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleText.textContent = 'Hide';
            } else {
                passwordInput.type = 'password';
                toggleText.textContent = 'Show';
            }
        });
    }

    console.log('Login component initialized with password toggle');
}

// Obsługa formularza logowania
async function handleLogin(e) {
    e.preventDefault();

    // Pobierz elementy formularza
    const emailField = document.getElementById('loginEmail');
    const passwordField = document.getElementById('loginPassword');

    // Walidacja pól
    let hasErrors = false;
    const emailError = Auth.validateField(emailField, 'Email');
    const passwordError = Auth.validateField(passwordField, 'Password');

    if (emailError) {
        Auth.showAlert(emailError, 'danger', 'loginAlerts');
        hasErrors = true;
    }

    if (passwordError) {
        Auth.showAlert(passwordError, 'danger', 'loginAlerts');
        hasErrors = true;
    }

    if (hasErrors) return;

    // Próba logowania
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: emailField.value,
                password: passwordField.value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Zapisz token i przekieruj do dashboardu
        localStorage.setItem('accessToken', data.session.access_token);
        localStorage.setItem('refreshToken', data.session.refresh_token);

        Auth.showAlert('Login successful! Redirecting...', 'success', 'loginAlerts');

        // Przekierowanie po krótkim opóźnieniu
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        Auth.showAlert(error.message || 'Login failed. Please check your credentials.', 'danger', 'loginAlerts');
    }
}

// Eksportujemy funkcje
window.initLogin = initLogin; 