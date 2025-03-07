/**
 * Posts Script
 * Zarządza funkcjonalnością związaną z postami
 */

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

// Inicjalizacja komponentu postów
function initPosts() {
    console.log('Initializing posts component');

    // Pobierz elementy DOM
    const searchInput = document.getElementById('searchPosts');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const newPostBtn = document.getElementById('newPostBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    // Inicjalizacja modala usuwania
    deleteModal = new bootstrap.Modal(document.getElementById('deletePostModal'));

    // Event listeners
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                loadPosts(currentPage - 1);
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (currentPage * postsPerPage < totalPosts) {
                loadPosts(currentPage + 1);
            }
        });
    }

    if (newPostBtn) {
        newPostBtn.addEventListener('click', createNewPost);
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (postToDelete) {
                deletePostConfirmed(postToDelete);
            }
        });
    }

    // Ładuj posty
    loadPosts(1);
}

// Funkcja wyszukiwania postów
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();

    if (searchTerm === '') {
        filteredPosts = [...allPosts];
    } else {
        filteredPosts = allPosts.filter(post =>
            post.title.toLowerCase().includes(searchTerm) ||
            post.content.toLowerCase().includes(searchTerm)
        );
    }

    totalPosts = filteredPosts.length;
    currentPage = 1;

    renderPosts(filteredPosts.slice(0, postsPerPage));
    updatePagination(1, filteredPosts.length);
}

// Funkcja ładowania postów
async function loadPosts(page = 1) {
    try {
        const postsLoader = document.getElementById('postsLoader');

        if (postsLoader) {
            postsLoader.classList.remove('d-none');
        }

        const token = localStorage.getItem('accessToken');
        const response = await fetch(`/api/posts?page=${page}&limit=${postsPerPage}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load posts');
        }

        const data = await response.json();
        currentPage = page;
        posts = data.posts || [];
        totalPosts = data.total || 0;

        // Zachowaj wszystkie posty do filtrowania
        if (page === 1) {
            allPosts = [...posts];
            filteredPosts = [...posts];
        }

        renderPosts(posts);
        updatePagination(page, totalPosts);

    } catch (error) {
        console.error('Error loading posts:', error);
        Dashboard.showAlert('Failed to load posts. Please try again.', 'danger');
    } finally {
        const postsLoader = document.getElementById('postsLoader');
        if (postsLoader) {
            postsLoader.classList.add('d-none');
        }
    }
}

// Funkcja aktualizacji paginacji
function updatePagination(currentPage, totalPosts) {
    const paginationInfo = document.getElementById('paginationInfo');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const currentPostsRange = document.getElementById('currentPostsRange');
    const totalPostsElement = document.getElementById('totalPosts');

    if (paginationInfo) {
        paginationInfo.textContent = `Page ${currentPage}`;
    }

    if (prevPageBtn) {
        prevPageBtn.disabled = currentPage <= 1;
    }

    if (nextPageBtn) {
        nextPageBtn.disabled = currentPage * postsPerPage >= totalPosts;
    }

    if (currentPostsRange) {
        const start = (currentPage - 1) * postsPerPage + 1;
        const end = Math.min(currentPage * postsPerPage, totalPosts);
        currentPostsRange.textContent = totalPosts > 0 ? `${start}-${end}` : '0-0';
    }

    if (totalPostsElement) {
        totalPostsElement.textContent = totalPosts;
    }
}

// Funkcja usuwania posta
function deletePost(postId) {
    postToDelete = postId;
    deleteModal.show();
}

// Funkcja potwierdzenia usunięcia posta
async function deletePostConfirmed(postId) {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete post');
        }

        // Odśwież posty po usunięciu
        loadPosts(currentPage);
        Dashboard.showAlert('Post deleted successfully', 'success');

    } catch (error) {
        console.error('Error deleting post:', error);
        Dashboard.showAlert('Failed to delete post. Please try again.', 'danger');
    } finally {
        deleteModal.hide();
        postToDelete = null;
    }
}

// Funkcja tworzenia nowego posta
function createNewPost() {
    // Ta funkcja zostanie zaimplementowana w przyszłości
    alert('Create new post functionality will be implemented soon!');
}

// Funkcja renderowania postów
function renderPosts(postsToRender) {
    const postsTableBody = document.getElementById('postsTableBody');

    if (!postsTableBody) {
        return;
    }

    postsTableBody.innerHTML = '';

    if (postsToRender.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="4" class="text-center">No posts found</td>
        `;
        postsTableBody.appendChild(emptyRow);
        return;
    }

    postsToRender.forEach(post => {
        const row = document.createElement('tr');
        const date = new Date(post.created_at).toLocaleDateString();

        row.innerHTML = `
            <td>${post.title}</td>
            <td>${date}</td>
            <td>
                <span class="badge bg-${post.status === 'published' ? 'success' : 'warning'}">
                    ${post.status === 'published' ? 'Published' : 'Draft'}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-primary btn-sm edit-post" data-id="${post.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-danger btn-sm delete-post" data-id="${post.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

        postsTableBody.appendChild(row);

        // Dodaj event listenery do przycisków
        const editBtn = row.querySelector('.edit-post');
        const deleteBtn = row.querySelector('.delete-post');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                // Funkcja edycji posta do zaimplementowania
                alert(`Edit post ${post.id} - functionality coming soon`);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                deletePost(post.id);
            });
        }
    });
}

// Eksportujemy funkcje
window.initPosts = initPosts; 