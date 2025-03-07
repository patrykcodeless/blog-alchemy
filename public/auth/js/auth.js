/**
 * Auth Main Script
 * Zawiera główne funkcje autoryzacji i obsługi sesji
 */

// Zmienna globalna dla tokena
let currentAccessToken = null;

// Helper function to show alerts
function showAlert(message, type, container = 'alertMessages') {
    const alertContainer = document.getElementById(container);
    if (!alertContainer) {
        console.error('Alert container not found:', container);
        // Spróbuj użyć domyślnego kontenera, jeśli określony nie istnieje
        const defaultContainer = document.getElementById('alertMessages');
        if (defaultContainer) {
            alertContainer = defaultContainer;
        } else {
            return; // Jeśli nie znaleziono żadnego kontenera, przerwij
        }
    }

    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Add alert to container
    alertContainer.appendChild(alertDiv);

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
}

// Funkcja przełączania między zakładkami
function switchToTab(tabId) {
    console.log('Switching to tab:', tabId);
    const tabElement = document.getElementById(tabId);
    if (!tabElement) {
        console.error('Tab element not found:', tabId);
        return;
    }

    const tab = new bootstrap.Tab(tabElement);
    tab.show();
}

// Funkcja parsowania JWT
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// Sprawdzanie czy token wygasł
function isTokenExpired(token) {
    try {
        const payload = parseJwt(token);
        if (!payload || !payload.exp) return true;

        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
    } catch (e) {
        return true;
    }
}

// Obsługa parametrów URL
function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);

    // Sprawdzenie, czy istnieje parametr 'verified'
    if (urlParams.has('verified')) {
        showAlert('Your email has been verified. You can now log in.', 'success');
    }

    // Sprawdzenie, czy istnieje parametr 'error'
    if (urlParams.has('error')) {
        const error = urlParams.get('error');
        switch (error) {
            case 'verification_failed':
                showAlert('Email verification failed. Please try again or contact support.', 'danger');
                break;
            default:
                showAlert('An error occurred. Please try again.', 'danger');
        }
    }
}

// Walidacja pola
function validateField(field, fieldName) {
    if (!field.value.trim()) {
        field.classList.add('is-invalid');
        return `${fieldName} is required`;
    }

    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
        field.classList.add('is-invalid');
        return 'Please enter a valid email address';
    }

    if (field.id.includes('Password') && field.value.length < 6) {
        field.classList.add('is-invalid');
        return 'Password must be at least 6 characters long';
    }

    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
    return null;
}

// Toggle pokazywania/ukrywania hasła
function setupPasswordToggles() {
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
}

// Inicjalizacja strony autoryzacji
function initAuth() {
    console.log('Initializing auth system');

    // Dodaj obsługę przycisków pokazywania/ukrywania hasła
    setupPasswordToggles();

    // Obsługa parametrów URL
    handleUrlParameters();

    // Obsługa zdarzenia dla linku "Forgot password"
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Forgot password link clicked, switching to reset tab');
            switchToTab('reset-tab');
        });
    }

    console.log('Auth system initialized');
}

// Eksportujemy funkcje do użycia w innych skryptach
window.Auth = {
    showAlert,
    switchToTab,
    parseJwt,
    isTokenExpired,
    validateField
};

// Uruchamiamy inicjalizację po załadowaniu strony
document.addEventListener('DOMContentLoaded', initAuth); 