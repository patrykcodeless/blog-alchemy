/**
 * Register Script
 * Obsługuje funkcjonalność rejestracji
 */

// Inicjalizacja rejestracji
function initRegister() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) {
        console.error('Register form not found');
        return;
    }

    // Dodaj obsługę formularza rejestracji
    registerForm.addEventListener('submit', handleRegister);

    // Dodaj obsługę przycisków pokazywania/ukrywania hasła
    const passwordToggle = document.querySelector('.password-toggle[data-target="registerPassword"]');
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

    console.log('Register component initialized with password toggle');
}

// Obsługa formularza rejestracji
async function handleRegister(e) {
    e.preventDefault();

    // Pobierz elementy formularza
    const firstNameField = document.getElementById('firstName');
    const lastNameField = document.getElementById('lastName');
    const emailField = document.getElementById('registerEmail');
    const passwordField = document.getElementById('registerPassword');

    // Walidacja pól
    let hasErrors = false;
    const firstNameError = Auth.validateField(firstNameField, 'First Name');
    const lastNameError = Auth.validateField(lastNameField, 'Last Name');
    const emailError = Auth.validateField(emailField, 'Email');
    const passwordError = Auth.validateField(passwordField, 'Password');

    if (firstNameError) {
        Auth.showAlert(firstNameError, 'danger', 'registerAlerts');
        hasErrors = true;
    }

    if (lastNameError) {
        Auth.showAlert(lastNameError, 'danger', 'registerAlerts');
        hasErrors = true;
    }

    if (emailError) {
        Auth.showAlert(emailError, 'danger', 'registerAlerts');
        hasErrors = true;
    }

    if (passwordError) {
        Auth.showAlert(passwordError, 'danger', 'registerAlerts');
        hasErrors = true;
    }

    if (hasErrors) return;

    // Próba rejestracji
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firstName: firstNameField.value,
                lastName: lastNameField.value,
                email: emailField.value,
                password: passwordField.value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        // Wyczyść formularz
        registerForm.reset();

        // Pokaż komunikat o sukcesie
        Auth.showAlert(
            'Registration successful! Please check your email to confirm your account.',
            'success',
            'registerAlerts'
        );

        // Przełącz na zakładkę logowania po krótkim opóźnieniu
        setTimeout(() => {
            Auth.switchToTab('login-tab');
        }, 3000);

    } catch (error) {
        console.error('Registration error:', error);
        Auth.showAlert(error.message || 'Registration failed. Please try again.', 'danger', 'registerAlerts');
    }
}

// Eksportujemy funkcje
window.initRegister = initRegister; 