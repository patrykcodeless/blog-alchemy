// Dodaj funkcję do logowania URL i parametrów przy ładowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    console.log('Current URL:', window.location.href);
    console.log('Hash:', window.location.hash);
    console.log('Search:', window.location.search);
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

document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submitted');

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match', 'danger');
        return;
    }

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

        const response = await fetch('/api/update-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: newPassword,
                token: token
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.details || 'Failed to reset password');
        }

        showAlert('Password reset successful! Redirecting to login...', 'success');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    } catch (error) {
        console.error('Error resetting password:', error);
        showAlert(error.message || 'Failed to reset password. Please try again.', 'danger');
    }
});

function showAlert(message, type) {
    const alertsContainer = document.getElementById('alertMessages');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertsContainer.appendChild(alert);
} 