// Элементы DOM
const grid = document.getElementById('masonry-grid');
const loadMoreBtn = document.getElementById('load-more-btn');
let currentPage = 1;
let loading = false;
let hasMore = true;

// Хранилище поставленных реакций
let userReactions = {};

// Загружаем реакции пользователя из localStorage
function loadUserReactions() {
    if (currentUser) {
        const saved = localStorage.getItem(`reactions_${currentUser.id}`);
        if (saved) {
            userReactions = JSON.parse(saved);
        } else {
            userReactions = {};
        }
    }
}

// Сохраняем реакции пользователя
function saveUserReactions() {
    if (currentUser) {
        localStorage.setItem(`reactions_${currentUser.id}`, JSON.stringify(userReactions));
    }
}

// Создание карточки мема (БЕЗ ТЕГОВ)
function createMemeCard(meme) {
    const card = document.createElement('div');
    card.className = 'meme-card';
    card.dataset.id = meme.id;
    
    // Формируем реакции
    const reactionsHtml = Object.entries(meme.reactions || {}).map(([tag, count]) => {
        const emoji = {
            смешно: '😂',
            чернуха: '💀',
            абсурд: '🌀',
            ирония: '🎭',
            без_мема: '⬜'
        }[tag] || '👍';
        
        const userVoted = userReactions[meme.id]?.includes(tag);
        
        return `
            <button class="reaction-btn ${userVoted ? 'voted' : ''}" 
                    data-tag="${tag}" 
                    data-meme-id="${meme.id}"
                    ${!currentUser ? 'disabled' : ''}>
                ${emoji} <span class="count">${count}</span>
            </button>
        `;
    }).join('');
    
    card.innerHTML = `
        <img src="${meme.imageUrl}" alt="Мем ${meme.id}" class="meme-image" loading="lazy">
        <div class="meme-footer">
            <div class="reactions">
                ${reactionsHtml}
            </div>
        </div>
    `;
    
    return card;
}

// Загрузка мемов
async function loadMemes(page = 1, reset = false) {
    if (loading || !hasMore) return;
    
    loading = true;
    loadMoreBtn.classList.add('loading');
    loadMoreBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/memes?page=${page}`);
        const data = await response.json();
        
        if (reset) {
            grid.innerHTML = '';
        }
        
        if (data.memes.length === 0 && page === 1) {
            grid.innerHTML = `
                <div class="empty-gallery">
                    <div class="empty-icon">😢</div>
                    <h3>Здесь пока пусто</h3>
                    <p>Будь первым, кто загрузит мем!</p>
                    ${currentUser ? '<button class="upload-empty-btn" onclick="document.getElementById(\'upload-btn\').click()">Загрузить мем</button>' : ''}
                </div>
            `;
            loadMoreBtn.style.display = 'none';
        } else {
            data.memes.forEach(meme => {
                const card = createMemeCard(meme);
                grid.appendChild(card);
            });
            
            hasMore = data.hasMore;
            loadMoreBtn.style.display = hasMore ? 'flex' : 'none';
            currentPage = page;
        }
    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        loading = false;
        loadMoreBtn.classList.remove('loading');
        loadMoreBtn.disabled = false;
    }
}

// Обработчики для реакций
function setupReactions() {
    grid.addEventListener('click', async (e) => {
        const reactionBtn = e.target.closest('.reaction-btn');
        if (!reactionBtn) return;
        
        if (!currentUser) {
            showNotification('Сначала войдите в аккаунт', 'error');
            openAuthModal('login');
            return;
        }
        
        const memeId = reactionBtn.dataset.memeId;
        const tag = reactionBtn.dataset.tag;
        const countSpan = reactionBtn.querySelector('.count');
        const currentCount = parseInt(countSpan.textContent);
        
        const hasVoted = userReactions[memeId]?.includes(tag);
        
        // Анимация
        reactionBtn.style.transform = 'scale(1.2)';
        setTimeout(() => {
            reactionBtn.style.transform = '';
        }, 200);
        
        const action = hasVoted ? 'remove' : 'add';
        
        try {
            await fetch('/api/reaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    memeId,
                    tag,
                    userId: currentUser.id,
                    action
                })
            });
            
            if (hasVoted) {
                // Убираем реакцию
                userReactions[memeId] = userReactions[memeId].filter(t => t !== tag);
                if (userReactions[memeId].length === 0) {
                    delete userReactions[memeId];
                }
                countSpan.textContent = currentCount - 1;
                reactionBtn.classList.remove('voted');
                showNotification(`Реакция убрана`, 'info');
            } else {
                // Добавляем реакцию
                if (!userReactions[memeId]) {
                    userReactions[memeId] = [];
                }
                userReactions[memeId].push(tag);
                countSpan.textContent = currentCount + 1;
                reactionBtn.classList.add('voted');
                showNotification(`Реакция добавлена!`, 'success');
            }
            
            saveUserReactions();
            
        } catch (error) {
            console.error('Ошибка:', error);
            showNotification('Ошибка', 'error');
        }
    });
}

// Обновление карточек после авторизации
function refreshReactionsState() {
    const cards = document.querySelectorAll('.meme-card');
    cards.forEach(card => {
        const memeId = card.dataset.id;
        const reactionBtns = card.querySelectorAll('.reaction-btn');
        
        reactionBtns.forEach(btn => {
            const tag = btn.dataset.tag;
            
            if (!currentUser) {
                btn.disabled = true;
                btn.classList.remove('voted');
            } else {
                const userVoted = userReactions[memeId]?.includes(tag);
                if (userVoted) {
                    btn.classList.add('voted');
                } else {
                    btn.classList.remove('voted');
                }
                btn.disabled = false;
            }
        });
    });
}

// Обновляем функцию updateUserUI из auth.js
window.updateUserUI = function(user) {
    const loginBtn = document.getElementById('login-btn');
    const userMenu = document.getElementById('user-menu');
    
    if (user) {
        document.getElementById('user-name').textContent = user.username;
        document.getElementById('user-avatar').textContent = user.username[0].toUpperCase();
        userMenu.style.display = 'block';
        loginBtn.style.display = 'none';
        
        loadUserReactions();
        refreshReactionsState();
    } else {
        userMenu.style.display = 'none';
        loginBtn.style.display = 'flex';
        userReactions = {};
        refreshReactionsState();
    }
};

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Запуск...');
    loadMemes(1);
    setupReactions();
    setupUpload(); // если есть функция загрузки
    
    loadMoreBtn.addEventListener('click', () => {
        loadMemes(currentPage + 1);
    });
});