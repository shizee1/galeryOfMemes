// Настройка загрузки
function setupUpload() {
    console.log('📤 Настройка загрузки...');
    
    const uploadBtn = document.getElementById('upload-btn');
    const uploadModal = document.getElementById('upload-modal');
    const closeBtn = document.getElementById('close-upload');
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('meme-file');
    const preview = document.getElementById('image-preview');
    
    if (!uploadBtn) {
        console.error('❌ Кнопка загрузки не найдена!');
        return;
    }
    
    // Открытие модалки
    uploadBtn.addEventListener('click', () => {
        console.log('👆 Нажата кнопка загрузки');
        if (!currentUser) {
            showNotification('Сначала войдите в аккаунт', 'error');
            openAuthModal('login');
            return;
        }
        uploadModal.classList.add('active');
    });
    
    // Закрытие
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            uploadModal.classList.remove('active');
            uploadForm.reset();
            preview.innerHTML = '';
        });
    }
    
    // Превью изображений
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        preview.innerHTML = '';
        
        files.forEach(file => {
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'preview-item';
                    imgContainer.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                    preview.appendChild(imgContainer);
                };
                reader.readAsDataURL(file);
            }
        });
    });
    
    // Отправка формы
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const files = Array.from(fileInput.files);
        if (files.length === 0) {
            showNotification('Выберите изображения', 'error');
            return;
        }
        
        // ТЕПЕРЬ БЕЗ ТЕГОВ - используем пустой массив
        const selectedTags = []; // Всегда пустой массив
        
        const submitBtn = document.getElementById('submit-upload');
        submitBtn.disabled = true;
        submitBtn.textContent = `Загрузка 0/${files.length}...`;
        
        let successCount = 0;
        let errorCount = 0;
        
        // Загружаем файлы по одному
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            const formData = new FormData();
            formData.append('meme', file);
            formData.append('userId', currentUser.id);
            
            try {
                submitBtn.textContent = `Загрузка ${i+1}/${files.length}...`;
                
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    successCount++;
                } else {
                    console.error('Ошибка:', result.message);
                    errorCount++;
                }
            } catch (error) {
                console.error('Ошибка загрузки:', error);
                errorCount++;
            }
        }
        
        // Показываем результат
        showNotification(`Загружено: ${successCount}, Ошибок: ${errorCount}`, 
                        errorCount === 0 ? 'success' : 'warning');
        
        // Закрываем и сбрасываем
        uploadModal.classList.remove('active');
        uploadForm.reset();
        preview.innerHTML = '';
        
        // Перезагружаем первую страницу
        currentPage = 1;
        await loadMemes(1, true);
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Загрузить';
    });
    
    // Закрытие по клику на фон
    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) {
            uploadModal.classList.remove('active');
            uploadForm.reset();
            preview.innerHTML = '';
        }
    });
}