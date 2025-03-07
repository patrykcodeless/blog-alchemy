/**
 * Dashboard Main Script
 * Zawiera główne funkcje dashboardu, autoryzację i podstawowe operacje
 */

// DOM Elements
const userEmail = document.getElementById('userEmail');
const logoutButton = document.getElementById('logoutButton');

// Sprawdź czy przycisk wylogowania istnieje
if (!logoutButton) {
    console.error('Logout button not found!');
}

// Helper function to show alerts
function showAlert(message, type = 'info', container = 'alertMessages') {
    const alertContainer = document.getElementById(container);
    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    alertContainer.appendChild(alert);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// Check auth and load user data
async function checkAuth() {
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            throw new Error('No access token found');
        }

        const response = await fetch('/api/check-auth', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Authentication failed');
        }

        // Display user email
        if (userEmail) {
            const displayName = data.user?.user_metadata?.firstName || data.email;
            userEmail.textContent = `Hello, ${displayName}`;
        }

        return data;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/';
        return null;
    }
}

// Logout handler
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            console.log('Logout clicked');
            const token = localStorage.getItem('accessToken');

            if (!token) {
                console.log('No token found, redirecting to login');
                window.location.href = '/';
                return;
            }

            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Logout response:', response.status);

            // Wyczyść token i inne dane z localStorage
            localStorage.clear();

            console.log('Redirecting to login page');
            window.location.href = '/';
        } catch (error) {
            console.error('Logout failed:', error);
            showAlert('Failed to logout. Please try again.', 'danger');
        }
    });
}

// Inicjalizacja dashboardu
async function initDashboard() {
    // Sprawdź autoryzację
    const authData = await checkAuth();

    if (!authData) {
        return; // checkAuth przekieruje do strony logowania
    }

    console.log('Dashboard initialized');
}

// Eksportujemy funkcje do użycia w innych skryptach
window.Dashboard = {
    showAlert,
    checkAuth
};

// Uruchamiamy inicjalizację po załadowaniu strony
document.addEventListener('DOMContentLoaded', initDashboard); 