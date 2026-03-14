// Состояние авторизации
let currentUser = null;

// Элементы DOM
const authModal = document.getElementById('auth-modal');
const userMenu = document.getElementById('user-menu');
const userName = document.getElementById('user-name');
const userAvatar = document.getElementById('user-avatar');

// Показать уведомление
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.borderLeftColor = type === 'success' ? 'var(--accent-primary)' : '#ff4444';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Переключение вкладок
function switchTab(tabId) {
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.toggle('active', form.id === `${tabId}-form`);
    });
}

// Открыть модалку
function openAuthModal(tab = 'login') {
    authModal.classList.add('active');
    switchTab(tab);
}

// Закрыть модалку
function closeAuthModal() {
    authModal.classList.remove('active');
}

// РЕГИСТРАЦИЯ (исправлено)
async function register(email, username, password) {
    const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password })
    });
    
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.message);
    }
    
    return data.user;
}

// ЛОГИН (исправлено)
async function login(email, password) {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.message);
    }
    
    return data.user;
}

// Выход
function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    if (typeof userReactions !== 'undefined') {
        userReactions = {};
    }
    updateUserUI(null);
    showNotification('Вы вышли из аккаунта');
}

// Проверка сессии
function checkAuth() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUserUI(currentUser);
    }
}

// Обновление UI после входа/выхода
window.updateUserUI = function(user) {
    const loginBtn = document.getElementById('login-btn');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    
    if (user) {
        userName.textContent = user.username;
        userAvatar.textContent = user.username[0].toUpperCase();
        userMenu.style.display = 'block';
        loginBtn.style.display = 'none';
        
        // Сохраняем в localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));
        currentUser = user;
        
        // Загружаем реакции пользователя
        if (typeof loadUserReactions === 'function') {
            loadUserReactions();
        }
        
        // Обновляем состояние кнопок
        if (typeof refreshReactionsState === 'function') {
            refreshReactionsState();
        }
    } else {
        userMenu.style.display = 'none';
        loginBtn.style.display = 'flex';
        localStorage.removeItem('currentUser');
        currentUser = null;
        
        if (typeof userReactions !== 'undefined') {
            userReactions = {};
        }
        
        if (typeof refreshReactionsState === 'function') {
            refreshReactionsState();
        }
    }
};

// Обработчики событий
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Открытие модалки
    document.getElementById('login-btn').addEventListener('click', () => openAuthModal('login'));
    
    // Закрытие модалки
    document.querySelector('.auth-close').addEventListener('click', closeAuthModal);
    document.getElementById('cancel-auth').addEventListener('click', closeAuthModal);
    
    // Переключение вкладок
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Переключение между формами
    document.getElementById('switch-to-register').addEventListener('click', () => switchTab('register'));
    document.getElementById('switch-to-login').addEventListener('click', () => switchTab('login'));
    
    // Регистрация
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('reg-email').value;
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm').value;
        
        if (password !== confirm) {
            showNotification('Пароли не совпадают', 'error');
            return;
        }
        
        try {
            const user = await register(email, username, password);
            updateUserUI(user);
            closeAuthModal();
            showNotification(`Добро пожаловать, ${user.username}!`);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
    
    // Логин
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const user = await login(email, password);
            updateUserUI(user);
            closeAuthModal();
            showNotification(`С возвращением, ${user.username}!`);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
    
    // Меню пользователя
    const userBtn = document.querySelector('.user-btn');
    userBtn.addEventListener('click', () => {
        userMenu.classList.toggle('active');
    });
    
    // Закрытие меню при клике вне
    document.addEventListener('click', (e) => {
        if (!userMenu.contains(e.target)) {
            userMenu.classList.remove('active');
        }
    });
    
    // Выход
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Закрытие модалки по клику на фон
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            closeAuthModal();
        }
    });
});