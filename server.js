const express = require('express');
const multer = require('multer');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt'); // ДОБАВИТЬ

const app = express();
const PORT = process.env.PORT || 3000; // ДЛЯ VPS

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' })); // Ограничение

// Статические файлы
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Пути
const UPLOAD_DIR = path.join(__dirname, 'uploads', 'memes');
const DB_PATH = path.join(__dirname, 'db.json');

// Создаем папки если нет
async function ensureDirs() {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        console.log('📁 Папка загрузки готова:', UPLOAD_DIR);
    } catch (error) {
        console.error('Ошибка создания папки:', error);
    }
}
ensureDirs();

// Чтение БД
async function readDB() {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        const emptyDB = {
            memes: [],
            users: [],
            userReactions: []
        };
        await writeDB(emptyDB);
        return emptyDB;
    }
}

// Запись в БД
async function writeDB(data) {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// Настройка загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, unique + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Уменьшил до 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Неподдерживаемый формат'));
        }
    }
});

// ==== API МАРШРУТЫ ====

// Получить все мемы
app.get('/api/memes', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        
        const db = await readDB();
        const memes = db.memes;
        
        const start = (page - 1) * limit;
        const paginatedMemes = memes.slice(start, start + limit);
        
        res.json({
            success: true,
            memes: paginatedMemes,
            total: memes.length,
            page: page,
            hasMore: memes.length > start + limit
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Загрузить мем
app.post('/api/upload', upload.single('meme'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Файл не загружен' });
        }
        
        const { userId } = req.body;
        
        const fileUrl = `/uploads/memes/${req.file.filename}`;
        
        const db = await readDB();
        
        const newMeme = {
            id: Date.now(),
            imageUrl: fileUrl,
            uploadedBy: userId ? parseInt(userId) : null,
            uploadedAt: new Date().toISOString(),
            reactions: {
                смешно: 0,
                чернуха: 0,
                абсурд: 0,
                ирония: 0,
                без_мема: 0
            }
        };
        
        db.memes.push(newMeme);
        await writeDB(db);
        
        res.json({
            success: true,
            message: 'Мем загружен',
            meme: newMeme
        });
        
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Поставить/убрать реакцию
app.post('/api/reaction', async (req, res) => {
    try {
        const { memeId, tag, userId, action } = req.body;
        
        const db = await readDB();
        const meme = db.memes.find(m => m.id === parseInt(memeId));
        
        if (!meme) {
            return res.status(404).json({ success: false, message: 'Мем не найден' });
        }
        
        if (action === 'add') {
            meme.reactions[tag] = (meme.reactions[tag] || 0) + 1;
        } else {
            meme.reactions[tag] = Math.max(0, (meme.reactions[tag] || 0) - 1);
        }
        
        await writeDB(db);
        
        res.json({
            success: true,
            reactions: meme.reactions
        });
        
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Регистрация (С ХЕШИРОВАНИЕМ)
app.post('/api/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        
        // Валидация
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Пароль должен быть минимум 6 символов' });
        }
        
        const db = await readDB();
        
        if (db.users.find(u => u.email === email)) {
            return res.status(400).json({ success: false, message: 'Email уже существует' });
        }
        
        if (db.users.find(u => u.username === username)) {
            return res.status(400).json({ success: false, message: 'Имя уже занято' });
        }
        
        // Хешируем пароль
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const newUser = {
            id: Date.now(),
            email,
            username,
            password: hashedPassword, // Теперь хеш, не base64
            role: 'user',
            createdAt: new Date().toISOString()
        };
        
        db.users.push(newUser);
        await writeDB(db);
        
        const { password: _, ...userWithoutPassword } = newUser;
        
        res.json({ success: true, user: userWithoutPassword });
        
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Логин (С ПРОВЕРКОЙ ХЕША)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = await readDB();
        
        const user = db.users.find(u => u.email === email);
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Неверный email или пароль' });
        }
        
        // Сравниваем пароль с хешем
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Неверный email или пароль' });
        }
        
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({ success: true, user: userWithoutPassword });
        
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Создать тестового админа (С ХЕШИРОВАНИЕМ)
async function createTestUser() {
    const db = await readDB();
    
    if (!db.users.find(u => u.username === 'admin')) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        db.users.push({
            id: 9999,
            email: 'admin@memes.com',
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            createdAt: new Date().toISOString()
        });
        await writeDB(db);
        console.log('✅ Тестовый админ создан: admin@memes.com / admin123');
    }
}

// Запуск сервера
// Замени последнюю строку с app.listen на:
app.listen(PORT, '0.0.0.0', async () => {
    await createTestUser();
    console.log(`🚀 Сервер запущен на http://0.0.0.0:${PORT}`);
    console.log(`📱 Доступен извне по: http://144.31.180.57:${PORT}`);
});