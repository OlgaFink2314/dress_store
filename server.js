require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const port = 3000;

// Подключение к PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false // Для внешних БД обычно требуется SSL
    }
});

// Подключаем middleware для работы с cookies
app.use(cookieParser());

app.use((req, res, next) => {
    // Разрешаем запросы с любого origin (для разработки)
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    // Пропускаем preflight запросы
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});


// Middleware для статических файлов
app.use(express.static(path.join(__dirname, 'public')));
// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware для отслеживания посещений
app.use(async (req, res, next) => {
    try {
        // Пропускаем статические файлы и API-запросы
        if (req.path.startsWith('/public/') || req.path.startsWith('/api/')) {
            return next();
        }

        // Убедимся, что куки доступны
        if (!req.cookies) {
            console.warn('Cookies не доступны');
            return next();
        }

        // Создаем или получаем sessionId
        let sessionId = req.cookies.sessionId;
        if (!sessionId) {
            sessionId = require('crypto').randomBytes(16).toString('hex');
            res.cookie('sessionId', sessionId, {
                maxAge: 30 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Используем secure в production
                sameSite: 'lax'
            });
        }

        // Добавляем sessionId в объект запроса для последующего использования
        req.sessionId = sessionId;

        // Логируем посещение страницы
        await pool.query(
            `INSERT INTO page_visits (
                session_id,
                user_id,
                page_url,
                referrer_url,
                ip_address,
                user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                sessionId,
                req.user?.userId || null,
                req.path,
                req.get('Referrer') || '',
                req.ip,
                req.get('User-Agent') || ''
            ]
        );

        next();
    } catch (err) {
        console.error('Ошибка при логировании посещения:', err);
        next();
    }
});





// Добавляем в server.js после других маршрутов
app.get('/catalog', (req, res) => {
    res.sendFile(path.join(__dirname, 'catalog.html'));
});

app.get('/account', (req, res) => {
    res.sendFile(path.join(__dirname, 'account.html'));
});

app.get('/auth.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/cart', (req, res) => {
    res.sendFile(path.join(__dirname, 'cart.html'));
});

app.get('/checkout', (req, res) => {
    res.sendFile(path.join(__dirname, 'checkout.html'));
});

// Простая проверка авторизации
const authenticate = (req, res, next) => {
    try {
        // Проверяем токен из кук или заголовка
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

        if (!token) {
            console.log('Токен не найден');
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        // Проверяем валидность токена
        const decoded = jwt.verify(token, 'simple_secret_key');
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Ошибка проверки токена:', err.message);

        // Удаляем невалидный cookie
        res.clearCookie('token');

        res.status(401).json({ error: 'Неверный или просроченный токен' });
    }
};

// Удаляем дублирующийся маршрут /stats (оставляем только один)
app.get('/stats', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, 'stats.html')); // Убедитесь, что файл существует по этому пути
});

// Аналогично для analytics
app.get('/analytics', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, 'analytics.html'));
});

// Маршрут для orders.html
app.get('/orders', (req, res) => {
    res.sendFile(path.join(__dirname, 'orders.html'));
});



// Маршруты авторизации
app.post('/api/register', async (req, res) => {
    try {
        const {
            username,
            password,
            email,
            firstName,
            lastName,
            phone,
            address
        } = req.body;

        // Проверка существования пользователя
        const userExists = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }

        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создание пользователя
        const newUser = await pool.query(
            `INSERT INTO users (
          username, 
          password_hash, 
          email, 
          first_name, 
          last_name,
          phone,
          address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                username,
                hashedPassword,
                email,
                firstName,
                lastName,
                phone,
                address
            ]
        );

        // Создаем корзину для пользователя
        await pool.query(
            'INSERT INTO cart (user_id) VALUES ($1)',
            [newUser.rows[0].user_id]
        );

        // Генерация токена
        const token = jwt.sign(
            { userId: newUser.rows[0].user_id, username },
            'simple_secret_key',
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: newUser.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка регистрации' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (user.rows.length === 0) {
            return res.status(400).json({ error: 'Неверные данные' });
        }

        const isValid = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!isValid) {
            return res.status(400).json({ error: 'Неверные данные' });
        }

        const token = jwt.sign(
            { userId: user.rows[0].user_id, username },
            'simple_secret_key',
            { expiresIn: '30d' }
        );

        // Устанавливаем cookie
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        res.json({
            token,
            user: {
                user_id: user.rows[0].user_id,
                username: user.rows[0].username,
                email: user.rows[0].email
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/user', authenticate, async (req, res) => {
    try {
        const user = await pool.query(
            'SELECT user_id, username, email, first_name, last_name, phone, address FROM users WHERE user_id = $1',
            [req.user.userId]
        );

        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json(user.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


// API для получения платьев
app.get('/api/dresses', async (req, res) => {
    try {
        const { search, minPrice, maxPrice, category, sort } = req.query;

        let query = 'SELECT * FROM wedding_dresses JOIN dress_images ON wedding_dresses.dress_id = dress_images.dress_id WHERE is_main = TRUE';
        const params = [];

        if (search) {
            query += ' AND title ILIKE $1';
            params.push(`%${search}%`);
        }

        if (minPrice) {
            query += ` AND price >= $${params.length + 1}`;
            params.push(minPrice);
        }

        if (maxPrice) {
            query += ` AND price <= $${params.length + 1}`;
            params.push(maxPrice);
        }

        if (category) {
            query += ` AND category_id = $${params.length + 1}`;
            params.push(category);
        }

        if (sort === 'price_asc') {
            query += ' ORDER BY price ASC';
        } else if (sort === 'price_desc') {
            query += ' ORDER BY price DESC';
        } else {
            query += ' ORDER BY created_at DESC';
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// API для получения категорий
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categories');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});



// API для получения одного платья с изображениями
app.get('/api/dresses/:id', async (req, res) => {
    try {
        const dressId = req.params.id;

        // Получаем основную информацию о платье
        const dressQuery = await pool.query(
            `SELECT * FROM wedding_dresses WHERE dress_id = $1`,
            [dressId]
        );

        if (dressQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Платье не найдено' });
        }

        const dress = dressQuery.rows[0];

        // Получаем все изображения для этого платья
        const imagesQuery = await pool.query(
            `SELECT * FROM dress_images WHERE dress_id = $1`,
            [dressId]
        );

        // Добавляем изображения к объекту платья
        dress.images = imagesQuery.rows;

        // Находим главное изображение
        const mainImage = imagesQuery.rows.find(img => img.is_main);
        dress.image_url = mainImage ? mainImage.image_url : null;

        res.json(dress);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Добавляем после других маршрутов

// Добавляем в server.js после других маршрутов

// Добавление в корзину
app.post('/api/cart/add', authenticate, async (req, res) => {
    try {
        const { dress_id } = req.body;
        const user_id = req.user.userId;

        // 1. Находим или создаем корзину пользователя
        let cart = await pool.query(
            'SELECT cart_id FROM cart WHERE user_id = $1',
            [user_id]
        );

        if (cart.rows.length === 0) {
            cart = await pool.query(
                'INSERT INTO cart (user_id) VALUES ($1) RETURNING cart_id',
                [user_id]
            );
        }

        const cart_id = cart.rows[0].cart_id;

        // 2. Проверяем, есть ли уже этот товар в корзине
        const existingItem = await pool.query(
            'SELECT cart_item_id FROM cart_items WHERE cart_id = $1 AND dress_id = $2',
            [cart_id, dress_id]
        );

        if (existingItem.rows.length > 0) {
            return res.status(400).json({ error: 'Это платье уже в вашей корзине' });
        }

        // 3. Добавляем новый товар
        await pool.query(
            'INSERT INTO cart_items (cart_id, dress_id, quantity) VALUES ($1, $2, 1)',
            [cart_id, dress_id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка добавления в корзину' });
    }
});

// Получение корзины
app.get('/api/cart', authenticate, async (req, res) => {
    try {
        const user_id = req.user.userId;

        const cartItems = await pool.query(
            `SELECT 
          ci.cart_item_id,
          ci.quantity,
          wd.dress_id,
          wd.title,
          wd.price,
          di.image_url
         FROM cart c
         JOIN cart_items ci ON c.cart_id = ci.cart_id
         JOIN wedding_dresses wd ON ci.dress_id = wd.dress_id
         LEFT JOIN dress_images di ON wd.dress_id = di.dress_id AND di.is_main = true
         WHERE c.user_id = $1`,
            [user_id]
        );

        res.json(cartItems.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка загрузки корзины' });
    }
});

// Удаление из корзины
app.delete('/api/cart/:item_id', authenticate, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM cart_items WHERE cart_item_id = $1',
            [req.params.item_id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка удаления из корзины' });
    }
});


// Удаление из корзины
app.delete('/api/cart/remove/:item_id', authenticate, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM cart_items WHERE cart_item_id = $1',
            [req.params.item_id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка удаления из корзины' });
    }
});


// Оформление заказа
app.post('/api/orders', authenticate, async (req, res) => {
    try {
        const user_id = req.user.userId;
        const { fullName, phone, email, address, paymentMethod, comments } = req.body;

        // 1. Получаем корзину пользователя
        const cart = await pool.query(
            `SELECT c.cart_id, 
                SUM(wd.price * ci.quantity) as total_amount
         FROM cart c
         JOIN cart_items ci ON c.cart_id = ci.cart_id
         JOIN wedding_dresses wd ON ci.dress_id = wd.dress_id
         WHERE c.user_id = $1
         GROUP BY c.cart_id`,
            [user_id]
        );

        if (cart.rows.length === 0 || !cart.rows[0].cart_id) {
            return res.status(400).json({ error: 'Корзина пуста' });
        }

        const cart_id = cart.rows[0].cart_id;
        const total_amount = cart.rows[0].total_amount;

        // 2. Создаем заказ
        const order = await pool.query(
            `INSERT INTO orders (
          user_id,
          total_amount,
          shipping_address,
          payment_method
        ) VALUES ($1, $2, $3, $4)
        RETURNING order_id`,
            [user_id, total_amount, address, paymentMethod]
        );

        const order_id = order.rows[0].order_id;

        // 3. Переносим товары из корзины в заказ
        const cartItems = await pool.query(
            `SELECT ci.dress_id, ci.quantity, wd.price
         FROM cart_items ci
         JOIN wedding_dresses wd ON ci.dress_id = wd.dress_id
         WHERE ci.cart_id = $1`,
            [cart_id]
        );

        for (const item of cartItems.rows) {
            await pool.query(
                `INSERT INTO order_items (
            order_id,
            dress_id,
            quantity,
            unit_price,
            total_price
          ) VALUES ($1, $2, $3, $4, $5)`,
                [order_id, item.dress_id, item.quantity, item.price, item.price * item.quantity]
            );

            // Уменьшаем количество на складе
            await pool.query(
                `UPDATE wedding_dresses 
           SET stock_quantity = stock_quantity - $1
           WHERE dress_id = $2`,
                [item.quantity, item.dress_id]
            );
        }

        // 4. Очищаем корзину
        await pool.query(
            'DELETE FROM cart_items WHERE cart_id = $1',
            [cart_id]
        );

        // 5. Обновляем информацию о доставке
        await pool.query(
            `INSERT INTO order_shipping (
          order_id,
          shipping_method
        ) VALUES ($1, 'standard')`,
            [order_id]
        );

        // 6. Обновляем данные пользователя (если изменились)
        await pool.query(
            `UPDATE users SET
          first_name = $1,
          last_name = $2,
          phone = $3,
          address = $4
         WHERE user_id = $5`,
            [fullName.split(' ')[0], fullName.split(' ')[1], phone, address, user_id]
        );

        res.json({
            success: true,
            order_id: order_id
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка оформления заказа' });
    }
});

// Получение истории заказов
app.get('/api/orders', authenticate, async (req, res) => {
    try {
        const user_id = req.user.userId;

        // Получаем список заказов
        const orders = await pool.query(
            `SELECT 
          o.order_id,
          o.order_date,
          o.status,
          o.total_amount
         FROM orders o
         WHERE o.user_id = $1
         ORDER BY o.order_date DESC`,
            [user_id]
        );

        if (orders.rows.length === 0) {
            return res.json([]);
        }

        // Для каждого заказа получаем товары
        const ordersWithItems = await Promise.all(orders.rows.map(async order => {
            const items = await pool.query(
                `SELECT 
            oi.dress_id,
            wd.title,
            oi.quantity,
            oi.unit_price,
            oi.total_price
           FROM order_items oi
           JOIN wedding_dresses wd ON oi.dress_id = wd.dress_id
           WHERE oi.order_id = $1`,
                [order.order_id]
            );

            return {
                ...order,
                items: items.rows,
                order_date: new Date(order.order_date).toISOString()
            };
        }));

        res.json(ordersWithItems);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка загрузки заказов' });
    }
});

// История заказов
app.get('/api/orders', authenticate, async (req, res) => {
    try {
        const user_id = req.user.userId;

        // 1. Получаем основные данные заказов
        const ordersQuery = await pool.query(
            `SELECT 
          order_id,
          order_date,
          status,
          total_amount::numeric,
          payment_method,
          shipping_address
         FROM orders 
         WHERE user_id = $1
         ORDER BY order_date DESC`,
            [user_id]
        );

        if (ordersQuery.rows.length === 0) {
            return res.json([]);
        }

        // 2. Для каждого заказа получаем товары
        const ordersWithItems = await Promise.all(
            ordersQuery.rows.map(async (order) => {
                const itemsQuery = await pool.query(
                    `SELECT 
              oi.dress_id,
              wd.title,
              oi.quantity,
              oi.unit_price::numeric,
              oi.total_price::numeric,
              di.image_url
             FROM order_items oi
             JOIN wedding_dresses wd ON oi.dress_id = wd.dress_id
             LEFT JOIN dress_images di ON wd.dress_id = di.dress_id AND di.is_main = true
             WHERE oi.order_id = $1`,
                    [order.order_id]
                );

                return {
                    ...order,
                    items: itemsQuery.rows,
                    order_date: order.order_date.toISOString()
                };
            })
        );

        res.json(ordersWithItems);
    } catch (err) {
        console.error('Ошибка при загрузке заказов:', err);
        res.status(500).json({ error: 'Ошибка сервера при загрузке заказов' });
    }
});

// Маршрут для страницы заказов
app.get('/orders', (req, res) => {
    res.sendFile(path.join(__dirname, 'orders.html'));
});




// Обновленный API для статистики
app.get('/api/stats', authenticate, async (req, res) => {
    try {
        // Получаем статистику за последние 30 дней
        const stats = await pool.query(`
        SELECT 
          DATE(order_date) as date,
          COUNT(*) as total_orders,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as avg_order_value
        FROM orders
        WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(order_date)
        ORDER BY DATE(order_date) DESC
      `);

        // Получаем самые популярные товары
        const popularProducts = await pool.query(`
        SELECT 
          wd.dress_id,
          wd.title,
          COUNT(oi.order_id) as sales_count
        FROM order_items oi
        JOIN wedding_dresses wd ON oi.dress_id = wd.dress_id
        JOIN orders o ON oi.order_id = o.order_id
        WHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY wd.dress_id, wd.title
        ORDER BY sales_count DESC
        LIMIT 5
      `);

        res.json({
            dailyStats: stats.rows,
            popularProducts: popularProducts.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


// API для получения аналитики (только популярные страницы)
app.get('/api/analytics', authenticate, async (req, res) => {
    try {
        // Получаем популярные страницы за последние 30 дней
        const popularPages = await pool.query(`
        SELECT 
          page_url as url, 
          COUNT(*) as visits,
          COUNT(DISTINCT session_id) as unique_visitors
        FROM page_visits
        WHERE visit_time >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY page_url
        ORDER BY visits DESC
        LIMIT 10
      `);

        res.json({
            popularPages: popularPages.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});



// API для логирования событий
app.post('/api/track-event', async (req, res) => {
    try {
        const { eventType, eventData } = req.body;

        // Получаем sessionId из кук или из объекта запроса
        const sessionId = req.cookies?.sessionId || req.sessionId;

        if (!sessionId) {
            console.warn('Не удалось получить sessionId для трекинга события');
            return res.status(400).json({ error: 'Отсутствует идентификатор сессии' });
        }

        // Определяем user_id, если пользователь авторизован
        let userId = null;
        try {
            const token = req.headers['authorization'] || req.cookies?.token;
            if (token) {
                const decoded = jwt.verify(token.replace('Bearer ', ''), 'simple_secret_key');
                userId = decoded.userId;
            }
        } catch (e) {
            // Невалидный токен - игнорируем
        }

        // Валидация eventData
        const sanitizedEventData = {
            ...(eventData || {}),
            page_url: req.path || '',
            referrer: req.get('Referrer') || '',
            screen_width: eventData?.screen_width || 0,
            screen_height: eventData?.screen_height || 0
        };

        await pool.query(
            `INSERT INTO user_events (
                session_id,
                user_id,
                event_type,
                event_data
            ) VALUES ($1, $2, $3, $4)`,
            [
                sessionId,
                userId,
                eventType,
                sanitizedEventData
            ]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка при логировании события:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Функция для ежедневного обновления статистики
async function updateDailyStatistics() {
    try {
        // Получаем данные за вчерашний день
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        // Проверяем, есть ли уже статистика за этот день
        const exists = await pool.query(
            'SELECT 1 FROM sales_statistics WHERE date = $1',
            [dateStr]
        );

        if (exists.rows.length > 0) {
            return; // Уже обновлено
        }

        // Получаем данные о заказах
        const orders = await pool.query(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as avg_order_value
            FROM orders
            WHERE DATE(order_date) = $1
        `, [dateStr]);

        // Получаем данные о новых и вернувшихся покупателях
        const customers = await pool.query(`
            WITH yesterday_orders AS (
                SELECT DISTINCT user_id 
                FROM orders 
                WHERE DATE(order_date) = $1
            )
            SELECT 
                COUNT(CASE WHEN u.registration_date::date = $1 THEN 1 END) as new_customers,
                COUNT(CASE WHEN u.registration_date::date < $1 THEN 1 END) as returning_customers
            FROM yesterday_orders yo
            JOIN users u ON yo.user_id = u.user_id
        `, [dateStr]);

        // Получаем самое популярное платье
        const popularDress = await pool.query(`
            SELECT 
                oi.dress_id,
                COUNT(*) as order_count
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            WHERE DATE(o.order_date) = $1
            GROUP BY oi.dress_id
            ORDER BY order_count DESC
            LIMIT 1
        `, [dateStr]);

        // Получаем самую популярную категорию
        const popularCategory = await pool.query(`
            SELECT 
                wd.category_id,
                COUNT(*) as order_count
            FROM order_items oi
            JOIN wedding_dresses wd ON oi.dress_id = wd.dress_id
            JOIN orders o ON oi.order_id = o.order_id
            WHERE DATE(o.order_date) = $1
            GROUP BY wd.category_id
            ORDER BY order_count DESC
            LIMIT 1
        `, [dateStr]);

        // Сохраняем статистику
        await pool.query(`
            INSERT INTO sales_statistics (
                date,
                total_orders,
                total_revenue,
                avg_order_value,
                popular_dress_id,
                popular_category_id,
                new_customers,
                returning_customers
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            dateStr,
            parseInt(orders.rows[0].total_orders || 0),
            parseFloat(orders.rows[0].total_revenue || 0),
            parseFloat(orders.rows[0].avg_order_value || 0),
            popularDress.rows[0]?.dress_id || null,
            popularCategory.rows[0]?.category_id || null,
            parseInt(customers.rows[0].new_customers || 0),
            parseInt(customers.rows[0].returning_customers || 0)
        ]);

        console.log(`Статистика за ${dateStr} успешно обновлена`);
    } catch (err) {
        console.error('Ошибка при обновлении статистики:', err);
    }
}

// Запускаем обновление статистики каждый день в 3:00
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 3 && now.getMinutes() === 0) {
        updateDailyStatistics();
    }
}, 60 * 1000); // Проверяем каждую минуту

// Запускаем сразу при старте сервера (для тестирования)
updateDailyStatistics();


app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});