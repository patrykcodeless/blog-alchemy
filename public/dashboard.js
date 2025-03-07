// DOM Elements
const userEmail = document.getElementById('userEmail');
const logoutButton = document.getElementById('logoutButton');
const alertMessages = document.getElementById('alertMessages');
const saveSettingsButton = document.getElementById('saveSettings');

// Sprawdź czy przycisk wylogowania istnieje
if (!logoutButton) {
    console.error('Logout button not found!');
}

// Navigation Elements
const navItems = document.querySelectorAll('.sidebar-nav .nav-link');
const pages = document.querySelectorAll('.page-content');

// Profile update handlers
const updateEmailBtn = document.getElementById('updateEmail');
const updatePasswordBtn = document.getElementById('updatePassword');
const saveProfileBtn = document.getElementById('saveProfile');

// Posts variables
let currentPage = 1;
const postsPerPage = 10;
let totalPosts = 0;
let posts = [];
let allPosts = [];
let filteredPosts = [];

// Modal variables
let deleteModal;
let postToDelete = null;

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

// Function to switch pages
function switchPage(pageId) {
    // Hide all pages
    pages.forEach(page => page.classList.add('d-none'));

    // Show selected page
    document.getElementById(`${pageId}Page`).classList.remove('d-none');

    // Update navigation
    navItems.forEach(item => {
        const parent = item.parentElement;
        if (item.getAttribute('data-page') === pageId) {
            parent.classList.add('active');
        } else {
            parent.classList.remove('active');
        }
    });

    // Save current page to localStorage
    localStorage.setItem('currentPage', pageId);
}

// Navigation event listeners
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = item.getAttribute('data-page');
        switchPage(pageId);
    });
});

// Settings save handler
if (saveSettingsButton) {
    saveSettingsButton.addEventListener('click', async () => {
        const wordpressApiKey = document.getElementById('wordpressApiKey').value;
        const webflowApiKey = document.getElementById('webflowApiKey').value;

        try {
            const response = await fetch('/api/save-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({
                    wordpress_api_key: wordpressApiKey,
                    webflow_api_key: webflowApiKey
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            showAlert('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            showAlert('Failed to save settings. Please try again.', 'danger');
        }
    });
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
        userEmail.textContent = data.email;

        // Load saved settings if on settings page
        if (document.getElementById('settingsPage')) {
            loadUserSettings();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/';
    }
}

// Load saved settings
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
        showAlert('Failed to load settings', 'danger');
    }
}

// Logout handler
logoutButton.addEventListener('click', async () => {
    try {
        console.log('Logout clicked'); // Dodaj log
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

        console.log('Logout response:', response.status); // Dodaj log

        if (!response.ok) {
            throw new Error('Logout failed');
        }

        // Wyczyść token i inne dane z localStorage
        localStorage.clear(); // Użyj clear() zamiast usuwania pojedynczych elementów

        console.log('Redirecting to login page'); // Dodaj log
        window.location.href = '/';
    } catch (error) {
        console.error('Logout failed:', error);
        showAlert('Failed to logout. Please try again.', 'danger');
    }
});

// Load user profile data
async function loadUserProfile() {
    try {
        const token = localStorage.getItem('accessToken');
        const userEmailElement = document.getElementById('userEmail');

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
        if (userEmailElement) {
            const displayName = data.user?.user_metadata?.display_name || data.email;
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
        showAlert('Failed to load profile data', 'danger', 'profileAlerts');
    }
}

// Update email handler
updateEmailBtn.addEventListener('click', async () => {
    const newEmail = document.getElementById('newEmail').value;

    if (!newEmail) {
        showAlert('Please enter new email address', 'warning', 'emailAlerts');
        return;
    }

    try {
        const response = await fetch('/api/update-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({ newEmail })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to update email');
        }

        const data = await response.json();
        showAlert('Email updated successfully! You will be redirected to login page in 5 seconds...', 'success', 'emailAlerts');

        // Clear local storage and redirect after delay
        setTimeout(() => {
            localStorage.clear();
            window.location.href = '/';
        }, 5000);
    } catch (error) {
        console.error('Error updating email:', error);
        showAlert(error.message, 'danger', 'emailAlerts');
    }
});

// Update password handler
updatePasswordBtn.addEventListener('click', async () => {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert('Please fill in all password fields', 'warning', 'passwordAlerts');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert('New passwords do not match', 'warning', 'passwordAlerts');
        return;
    }

    try {
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to change password');
        }

        showAlert('Password updated successfully! You will be redirected to login page in 5 seconds...', 'success', 'passwordAlerts');

        // Clear form fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        // Clear local storage and redirect after delay
        setTimeout(() => {
            localStorage.clear();
            window.location.href = '/';
        }, 5000);
    } catch (error) {
        console.error('Error changing password:', error);
        showAlert(error.message, 'danger', 'passwordAlerts');
    }
});

// Save profile handler
saveProfileBtn.addEventListener('click', async () => {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;

    try {
        const response = await fetch('/api/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({ firstName, lastName })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update profile');
        }

        showAlert('Profile updated successfully', 'success', 'profileAlerts');
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert(error.message, 'danger', 'profileAlerts');
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();

    // Load user profile data
    loadUserProfile();

    // Load last active page or default to home
    const lastPage = localStorage.getItem('currentPage') || 'home';
    switchPage(lastPage);

    // Inicjalizacja modalu usuwania
    deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));

    // Dodaj obsługę przycisku potwierdzenia usunięcia
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        if (postToDelete) {
            await deletePostConfirmed(postToDelete.id);
            deleteModal.hide();
        }
    });

    // Jeśli aktywna jest zakładka posts, załaduj posty
    if (localStorage.getItem('currentPage') === 'posts') {
        loadPosts(1);
    }

    // Dodaj nasłuchiwanie na zmianę zakładki
    document.querySelectorAll('[data-page]').forEach(tab => {
        tab.addEventListener('click', () => {
            const page = tab.getAttribute('data-page');
            if (page === 'posts') {
                loadPosts(1);
            }
        });
    });

    document.getElementById('searchPosts').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filteredPosts = allPosts.filter(post =>
            post.title.toLowerCase().includes(searchTerm)
        );
        renderPosts(filteredPosts);
    });
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

// Load posts function
async function loadPosts(page = 1) {
    const loader = document.getElementById('postsLoader');
    const tableBody = document.getElementById('postsTableBody');
    const table = document.getElementById('postsTable');

    try {
        if (loader) loader.classList.remove('d-none');
        if (table) table.classList.add('d-none');

        currentPage = page;
        const token = localStorage.getItem('accessToken');
        console.log('Sending request with token:', token ? 'present' : 'missing');

        const response = await fetch(`/api/posts?page=${page}&per_page=${postsPerPage}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Otrzymane dane:', data);

        const { posts: loadedPosts, total } = data;
        allPosts = loadedPosts;
        filteredPosts = loadedPosts;
        posts = loadedPosts;
        totalPosts = total || 0;

        if (!tableBody) {
            console.error('Nie znaleziono elementu postsTableBody');
            return;
        }

        renderPosts(posts);

        // Update pagination
        updatePagination(page, totalPosts);

        // Update posts count
        const start = (page - 1) * postsPerPage + 1;
        const end = Math.min(page * postsPerPage, totalPosts);
        const currentPostsRange = document.getElementById('currentPostsRange');
        const totalPostsElement = document.getElementById('totalPosts');

        if (currentPostsRange) currentPostsRange.textContent = `${start}-${end}`;
        if (totalPostsElement) totalPostsElement.textContent = totalPosts;

    } catch (error) {
        console.error('Error loading posts:', error);
        showAlert('Failed to load posts: ' + error.message, 'danger');
    } finally {
        // Zawsze ukryj loader i pokaż tabelę na końcu
        if (loader) loader.classList.add('d-none');
        if (table) table.classList.remove('d-none');
    }
}

// Update pagination function
function updatePagination(currentPage, totalPosts) {
    const pagination = document.getElementById('postsPagination');
    if (!pagination) return;

    const totalPages = Math.ceil(totalPosts / postsPerPage);
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="event.preventDefault(); loadPosts(${currentPage - 1})" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;

    // Pokaż maksymalnie 5 numerów stron
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="event.preventDefault(); loadPosts(${i})">${i}</a>
            </li>
        `;
    }

    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="event.preventDefault(); loadPosts(${currentPage + 1})" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;

    pagination.innerHTML = paginationHTML;
}

// Funkcja pokazująca modal potwierdzenia
function deletePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (post) {
        postToDelete = post;
        document.getElementById('postTitleToDelete').textContent = post.title;
        deleteModal.show();
    }
}

// Funkcja wykonująca faktyczne usunięcie
async function deletePostConfirmed(postId) {
    try {
        console.log('Próba usunięcia posta:', postId);
        const token = localStorage.getItem('accessToken');

        if (!token) {
            throw new Error('No access token found');
        }

        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete post');
        }

        const data = await response.json();
        console.log('Odpowiedź z serwera:', data);
        showAlert('Post deleted successfully', 'success');

        // Odśwież listę postów
        const currentPosts = posts.length;
        if (currentPosts === 1 && currentPage > 1) {
            await loadPosts(currentPage - 1);
        } else {
            await loadPosts(currentPage);
        }

    } catch (error) {
        console.error('Error deleting post:', error);
        showAlert('Failed to delete post: ' + error.message, 'danger');
    }
}

function renderPosts(postsToRender) {
    const tableBody = document.getElementById('postsTableBody');

    if (!postsToRender || postsToRender.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">No posts found</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = postsToRender.map(post => `
        <tr>
            <td>
                <div class="post-title">${post.title}</div>
                <div class="tags-container">
                    ${post.keywords ? post.keywords.map(keyword =>
        `<span class="tag">${keyword}</span>`
    ).join('') : ''}
                </div>
            </td>
            <td>${new Date(post.created_at).toLocaleDateString()}</td>
            <td><span class="badge bg-${post.status === 'published' ? 'success' : 'warning'}">${post.status}</span></td>
            <td>
                <div class="btn-group" role="group" style="gap: 5px;">
                    <button class="btn btn-sm btn-outline-primary" onclick="editPost('${post.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deletePost('${post.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}