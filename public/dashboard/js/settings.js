/**
 * Settings Script
 * Zarządza funkcjonalnością związaną z ustawieniami użytkownika
 */

// Funkcja inicjalizująca ustawienia
function initSettings() {
    console.log('Initializing settings component');

    // Załaduj dane użytkownika
    loadUserProfile();

    // Załaduj zapisane ustawienia
    loadUserSettings();

    // Dodaj event listenery do przycisków
    setupEventListeners();
}

// Funkcja ładująca profil użytkownika
async function loadUserProfile() {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/check-auth', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load profile');
        }

        // Aktualizuj powitanie w navbarze
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            const displayName = data.user?.user_metadata?.firstName || data.email;
            userEmailElement.textContent = `Hello, ${displayName}`;
        }

        // Wypełnij email
        const currentEmailInput = document.getElementById('currentEmail');
        if (currentEmailInput) {
            currentEmailInput.value = data.email;
        }

        // Wypełnij pola formularza
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');

        if (firstNameInput && data.user?.user_metadata?.firstName) {
            firstNameInput.value = data.user.user_metadata.firstName;
        }

        if (lastNameInput && data.user?.user_metadata?.lastName) {
            lastNameInput.value = data.user.user_metadata.lastName;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        Dashboard.showAlert('Failed to load profile data', 'danger', 'profileAlerts');
    }
}

// Funkcja ładująca ustawienia użytkownika
async function loadUserSettings() {
    try {
        console.log('Loading user settings...');
        const token = localStorage.getItem('accessToken');

        const response = await fetch('/api/get-settings', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load settings');
        }

        const data = await response.json();
        console.log('Received settings:', data);

        // Aktualizuj pola formularza
        const wordpressInput = document.getElementById('wordpressApiKey');
        const webflowInput = document.getElementById('webflowApiKey');

        if (wordpressInput) {
            wordpressInput.value = data.wordpress_api_key || '';
        }
        if (webflowInput) {
            webflowInput.value = data.webflow_api_key || '';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        Dashboard.showAlert('Failed to load settings', 'danger', 'alertMessages');
    }
}

// Funkcja konfigurująca event listenery
function setupEventListeners() {
    // Zapisywanie profilu
    const saveProfileBtn = document.getElementById('saveProfile');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', updateProfile);
    }

    // Aktualizacja email
    const updateEmailBtn = document.getElementById('updateEmail');
    if (updateEmailBtn) {
        updateEmailBtn.addEventListener('click', updateEmail);
    }

    // Aktualizacja hasła
    const updatePasswordBtn = document.getElementById('updatePassword');
    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', updatePassword);
    }

    // Zapisywanie ustawień
    const saveSettingsBtn = document.getElementById('saveSettings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }

    // Przyciski pokazywania/ukrywania hasła
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', togglePasswordVisibility);
    });
}

// Funkcja aktualizacji profilu
async function updateProfile() {
    try {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;

        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                firstName,
                lastName
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update profile');
        }

        Dashboard.showAlert('Profile updated successfully', 'success', 'profileAlerts');

        // Aktualizuj nagłówek
        const userEmail = document.getElementById('userEmail');
        if (userEmail) {
            userEmail.textContent = `Hello, ${firstName}`;
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        Dashboard.showAlert('Failed to update profile', 'danger', 'profileAlerts');
    }
}

// Funkcja aktualizacji email
async function updateEmail() {
    try {
        const newEmail = document.getElementById('newEmail').value;

        if (!newEmail) {
            throw new Error('Please enter a new email address');
        }

        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/update-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                email: newEmail
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update email');
        }

        Dashboard.showAlert('Email update confirmation sent. Please check your email', 'success', 'emailAlerts');
        document.getElementById('newEmail').value = '';
    } catch (error) {
        console.error('Error updating email:', error);
        Dashboard.showAlert(error.message || 'Failed to update email', 'danger', 'emailAlerts');
    }
}

// Funkcja aktualizacji hasła
async function updatePassword() {
    try {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            throw new Error('Please fill in all password fields');
        }

        if (newPassword !== confirmPassword) {
            throw new Error('New passwords do not match');
        }

        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/update-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update password');
        }

        Dashboard.showAlert('Password updated successfully', 'success', 'passwordAlerts');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    } catch (error) {
        console.error('Error updating password:', error);
        Dashboard.showAlert(error.message || 'Failed to update password', 'danger', 'passwordAlerts');
    }
}

// Funkcja zapisywania ustawień
async function saveSettings() {
    try {
        const wordpressApiKey = document.getElementById('wordpressApiKey').value;
        const webflowApiKey = document.getElementById('webflowApiKey').value;

        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/save-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                wordpress_api_key: wordpressApiKey,
                webflow_api_key: webflowApiKey
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save settings');
        }

        Dashboard.showAlert('Settings saved successfully', 'success', 'alertMessages');
    } catch (error) {
        console.error('Error saving settings:', error);
        Dashboard.showAlert('Failed to save settings', 'danger', 'alertMessages');
    }
}

// Funkcja przełączania widoczności hasła
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

// Eksportujemy funkcje
window.initSettings = initSettings; 