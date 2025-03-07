/**
 * Component Loader
 * Odpowiada za dynamiczne ładowanie komponentów HTML dla autoryzacji
 */

// Główny kontener, do którego będą ładowane komponenty
const componentContainer = document.getElementById('componentContainer');

// Mapowanie zakładek do ścieżek komponentów
const componentPaths = {
    'loginTab': '/auth/components/login.html',
    'registerTab': '/auth/components/register.html',
    'resetTab': '/auth/components/reset-password.html',
    'newPasswordTab': '/auth/components/new-password.html'
};

// Aktualnie załadowane komponenty
const loadedComponents = {};

/**
 * Ładuje komponent HTML do kontenera
 * @param {string} path - Ścieżka do pliku komponentu
 * @returns {Promise<HTMLElement>} - Promise z załadowanym elementem
 */
async function loadComponent(path) {
    try {
        const response = await fetch(path);

        if (!response.ok) {
            throw new Error(`Failed to load component: ${path}`);
        }

        const html = await response.text();

        // Tworzymy tymczasowy kontener
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = html;

        return tempContainer.firstElementChild;
    } catch (error) {
        console.error('Error loading component:', error);
        return createErrorComponent(error.message);
    }
}

/**
 * Tworzy komponent błędu
 * @param {string} message - Komunikat błędu
 * @returns {HTMLElement} - Element HTML z komunikatem błędu
 */
function createErrorComponent(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'alert alert-danger';
    errorElement.innerHTML = `<strong>Error:</strong> ${message}`;
    return errorElement;
}

/**
 * Ładuje wszystkie komponenty autoryzacji
 */
async function loadAuthComponents() {
    console.log('Loading auth components');
    componentContainer.innerHTML = ''; // Czyścimy kontener

    // Najpierw załadujmy wszystkie komponenty
    for (const [tabId, path] of Object.entries(componentPaths)) {
        if (tabId === 'newPasswordTab') continue; // Ten komponent ładujemy tylko na żądanie

        try {
            console.log(`Loading component: ${tabId} from ${path}`);
            const component = await loadComponent(path);
            componentContainer.appendChild(component);
            loadedComponents[tabId] = component;
        } catch (error) {
            console.error(`Failed to load component ${tabId}:`, error);
        }
    }

    // Potem zainicjujmy formularze (żeby wszystkie elementy DOM już istniały)
    setTimeout(() => {
        console.log('Initializing component handlers');

        // Login component
        if (typeof initLogin === 'function') {
            initLogin();

            // Dodaj obsługę przycisku "Forgot password"
            const forgotPasswordLink = document.getElementById('forgotPasswordLink');
            if (forgotPasswordLink) {
                forgotPasswordLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Forgot password link clicked');
                    const resetTab = document.getElementById('reset-tab');
                    if (resetTab) {
                        resetTab.click();
                    } else {
                        // Próbujemy znaleźć zakładkę resetowania hasła po selektorze
                        const resetTabAlternative = document.querySelector('[data-bs-target="#resetTab"]');
                        if (resetTabAlternative) {
                            console.log('Found reset tab by selector');
                            resetTabAlternative.click();
                        } else {
                            console.error('Reset tab button not found');
                        }
                    }
                });
            }
        }

        // Register component
        if (typeof initRegister === 'function') {
            initRegister();
        }

        // Reset password component
        if (typeof initResetEmailForm === 'function') {
            initResetEmailForm();
        }

        // Każdy komponent ma już własną obsługę przycisków pokazywania/ukrywania hasła

    }, 100); // Małe opóźnienie, aby upewnić się, że DOM jest gotowy
}

/**
 * Ładuje komponent resetowania hasła
 */
async function loadResetPasswordComponent() {
    try {
        console.log('Loading reset password component');

        // Usuń wszystkie istniejące komponenty i wyczyść kontener
        componentContainer.innerHTML = '';

        // Dodaj klasę do body dla specjalnego stylowania
        document.body.classList.add('reset-password-page');

        // Pobierz komponent resetowania hasła
        const component = await loadComponent(componentPaths.newPasswordTab);

        // Dodaj odpowiedni wrapper dla formularza
        const formWrapper = document.createElement('div');
        formWrapper.className = 'reset-password-form-wrapper';
        formWrapper.appendChild(component);

        // Wstaw do kontenera
        componentContainer.appendChild(formWrapper);

        // Inicjalizacja funkcjonalności
        if (typeof initResetPassword === 'function') {
            console.log('Initializing reset password functionality');
            setTimeout(() => {
                initResetPassword();
            }, 100);
        } else {
            console.error('initResetPassword function not found');
        }
    } catch (error) {
        console.error('Failed to load reset password component:', error);
        componentContainer.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error:</strong> Failed to load reset password form. Please try again or request a new password reset link.
            </div>
        `;
    }
}

// Inicjalizacja ładowania komponentów
document.addEventListener('DOMContentLoaded', () => {
    // Sprawdź, czy URL zawiera parametry dla resetowania hasła
    const url = new URL(window.location.href);
    const hasResetToken = url.hash.includes('access_token') || url.search.includes('token');

    if (hasResetToken) {
        console.log('Reset token detected in URL, loading reset password form');
        // Ukryj zakładki, gdy jesteśmy w trybie resetowania hasła
        const tabsContainer = document.querySelector('.auth-tabs');
        if (tabsContainer) {
            tabsContainer.style.display = 'none';
        }

        // Zmień tytuł karty
        const cardBody = document.querySelector('.card-body');
        if (cardBody) {
            cardBody.classList.add('reset-password-mode');
        }

        // Pokaż tylko formularz resetowania hasła
        loadResetPasswordComponent();
    } else {
        // Standardowy widok z zakładkami
        loadAuthComponents();
    }

    // Dodaj obsługę zakładek
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tabElement => {
        tabElement.addEventListener('shown.bs.tab', (event) => {
            const targetId = event.target.getAttribute('data-bs-target').substring(1);
            console.log('Tab switched to:', targetId);
        });
    });
});

// Eksportujemy funkcje
window.ComponentLoader = {
    loadComponent,
    loadResetPasswordComponent
}; 