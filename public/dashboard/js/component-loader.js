/**
 * Component Loader
 * Odpowiada za dynamiczne ładowanie komponentów HTML
 */

// Główny kontener, do którego będą ładowane komponenty
const componentContainer = document.getElementById('componentContainer');

// Mapowanie stron do ścieżek komponentów
const componentPaths = {
    'home': '/dashboard/components/home.html',
    'posts': '/dashboard/components/posts.html',
    'settings': {
        'profile': '/dashboard/components/settings/profile.html',
        'email': '/dashboard/components/settings/email.html',
        'password': '/dashboard/components/settings/password.html',
        'integrations': '/dashboard/components/settings/integrations.html'
    }
};

// Aktualnie załadowany główny komponent
let currentComponent = null;

// Aktualnie załadowane podkomponenty (dla settings)
let currentSubComponents = [];

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
 * Ładuje główny komponent
 * @param {string} componentId - Identyfikator komponentu (np. 'home', 'posts', 'settings')
 */
async function loadMainComponent(componentId) {
    // Jeśli to ustawienia, potrzebujemy załadować wszystkie podkomponenty
    if (componentId === 'settings') {
        // Najpierw czyścimy kontener
        componentContainer.innerHTML = '';

        // Tworzymy kontener dla ustawień
        const settingsContainer = document.createElement('div');
        settingsContainer.id = 'settingsPage';
        settingsContainer.className = 'page-content';
        settingsContainer.innerHTML = `
            <div class="container-fluid">
                <div class="row">
                    <div class="col-12" id="settingsComponentsContainer"></div>
                </div>
            </div>
        `;

        // Dodajemy do głównego kontenera
        componentContainer.appendChild(settingsContainer);

        // Pobieramy kontener na komponenty ustawień
        const settingsComponentsContainer = document.getElementById('settingsComponentsContainer');

        // Ładujemy komponenty ustawień
        const subComponents = ['profile', 'email', 'password', 'integrations'];
        currentSubComponents = [];

        for (const subComponent of subComponents) {
            const component = await loadComponent(componentPaths.settings[subComponent]);
            settingsComponentsContainer.appendChild(component);
            currentSubComponents.push(component);
        }

        // Inicjalizujemy ustawienia
        if (typeof initSettings === 'function') {
            initSettings();
        }

        currentComponent = settingsContainer;
    } else {
        // Dla innych komponentów, po prostu ładujemy jeden komponent
        const component = await loadComponent(componentPaths[componentId]);

        // Czyścimy kontener i dodajemy komponent
        componentContainer.innerHTML = '';
        componentContainer.appendChild(component);

        // Inicjalizujemy odpowiednie funkcje w zależności od komponentu
        if (componentId === 'posts' && typeof initPosts === 'function') {
            initPosts();
        }

        currentComponent = component;
    }

    // Zapisujemy aktualny komponent w localStorage
    localStorage.setItem('currentPage', componentId);

    // Aktualizujemy stan nawigacji
    updateNavigation(componentId);
}

/**
 * Aktualizuje aktywny element nawigacji
 * @param {string} componentId - Identyfikator komponentu
 */
function updateNavigation(componentId) {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');

    navItems.forEach(item => {
        const link = item.querySelector('.nav-link');
        const pageId = link.getAttribute('data-page');

        if (pageId === componentId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Inicjalizacja nawigacji
document.addEventListener('DOMContentLoaded', () => {
    // Dodajemy obsługę kliknięć w elementy nawigacji
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const componentId = link.getAttribute('data-page');
            loadMainComponent(componentId);
        });
    });

    // Ładujemy ostatnio używany komponent lub domyślnie 'home'
    const lastComponent = localStorage.getItem('currentPage') || 'home';
    loadMainComponent(lastComponent);
});

// Eksportujemy funkcje do użycia w innych skryptach
window.ComponentLoader = {
    loadMainComponent,
    loadComponent
}; 