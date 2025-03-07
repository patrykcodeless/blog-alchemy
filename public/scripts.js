// Funkcja do pokazywania powiadomień
function showAlert(message, type, container) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.getElementById(container).appendChild(alertDiv);

    // Automatyczne usuwanie po 5 sekundach
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Funkcja do walidacji pól
function validateField(value, fieldName) {
    if (!value || value.trim() === '') {
        return `${fieldName} jest wymagane`;
    }
    if (fieldName === 'Email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Podaj prawidłowy adres email';
    }
    if (fieldName === 'Hasło' && value.length < 6) {
        return 'Hasło musi mieć co najmniej 6 znaków';
    }
    return null;
}

// Obsługa formularza logowania
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // Walidacja
    const emailError = validateField(email, 'Email');
    const passwordError = validateField(password, 'Hasło');

    if (emailError || passwordError) {
        if (emailError) showAlert(emailError, 'danger', 'loginAlerts');
        if (passwordError) showAlert(passwordError, 'danger', 'loginAlerts');
        return;
    }

    // Kontynuuj z logowaniem...
});

// Obsługa formularza rejestracji
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;

    // Walidacja
    const emailError = validateField(email, 'Email');
    const passwordError = validateField(password, 'Hasło');
    const firstNameError = validateField(firstName, 'Imię');
    const lastNameError = validateField(lastName, 'Nazwisko');

    if (emailError || passwordError || firstNameError || lastNameError) {
        if (emailError) showAlert(emailError, 'danger', 'registerAlerts');
        if (passwordError) showAlert(passwordError, 'danger', 'registerAlerts');
        if (firstNameError) showAlert(firstNameError, 'danger', 'registerAlerts');
        if (lastNameError) showAlert(lastNameError, 'danger', 'registerAlerts');
        return;
    }

    // Kontynuuj z rejestracją...
});

// Obsługa formularza resetowania hasła
document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('resetEmail').value;

    // Walidacja
    const emailError = validateField(email, 'Email');

    if (emailError) {
        showAlert(emailError, 'danger', 'resetAlerts');
        return;
    }

    // Kontynuuj z resetowaniem hasła...
});

const supabaseUrl = 'https://lxvwbpcfpbfqboklprsb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dndicGNmcGJmcWJva2xwcnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1NDc0MjEsImV4cCI6MjA1MzEyMzQyMX0.bv_wUqDwqV36RaH1qKDDGOSnnfzDTxTW-deVanTWjkM'

// Inicjalizacja klienta Supabase
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('Supabase initialized with URL:', supabaseUrl) 