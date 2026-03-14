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

// Обновить UI после входа
function updateUserUI(user) {
    if (user) {
        userName.textContent = user.username;
        userAvatar.textContent = user.username[0].toUpperCase();
        userMenu.style.display = 'block';
    } else {
        userMenu.style.display = 'none';
    }
}

// Регистрация
async function register(email, username, password) {
    // Имитация запроса к серверу
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Проверка на существующего пользователя
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            
            if (users.find(u => u.email === email)) {
                reject('Email уже зарегистрирован');
                return;
            }
            
            if (users.find(u => u.username === username)) {
                reject('Имя пользователя уже занято');
                return;
            }
            
            // Создаем пользователя
            const newUser = {
                id: Date.now(),
                email,
                username,
                password: btoa(password), // Просто для демо, в реальности хешировать
                createdAt: new Date().toISOString()
            };
            
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            
            // Сохраняем сессию
            const { password: _, ...userWithoutPassword } = newUser;
            localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
            
            resolve(userWithoutPassword);
        }, 800);
    });
}

// Логин
async function login(email, password) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email === email && u.password === btoa(password));
            
            if (!user) {
                reject('Неверный email или пароль');
                return;
            }
            
            const { password: _, ...userWithoutPassword } = user;
            localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
            
            resolve(userWithoutPassword);
        }, 800);
    });
}

// Выход
function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    userReactions = {};
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
            currentUser = user;
            updateUserUI(user);
            closeAuthModal();
            showNotification(`Добро пожаловать, ${user.username}!`);
        } catch (error) {
            showNotification(error, 'error');
        }
    });
    
    // Логин
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const user = await login(email, password);
            currentUser = user;
            updateUserUI(user);
            closeAuthModal();
            showNotification(`С возвращением, ${user.username}!`);
        } catch (error) {
            showNotification(error, 'error');
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

function updateUserUI(user) {
    const loginBtn = document.getElementById('login-btn');
    const userMenu = document.getElementById('user-menu');
    
    if (user) {
        // Показываем меню пользователя
        userName.textContent = user.username;
        userAvatar.textContent = user.username[0].toUpperCase();
        userMenu.style.display = 'block';
        
        // Прячем кнопку входа
        loginBtn.style.display = 'none';
        
        // Загружаем реакции пользователя
        loadUserReactions();
        
        // Обновляем состояние кнопок
        if (typeof refreshReactionsState === 'function') {
            refreshReactionsState();
        }
    } else {
        // Прячем меню пользователя
        userMenu.style.display = 'none';
        
        // Показываем кнопку входа
        loginBtn.style.display = 'flex';
        
        // Очищаем реакции
        userReactions = {};
        
        // Обновляем состояние кнопок
        if (typeof refreshReactionsState === 'function') {
            refreshReactionsState();
        }
    }
}