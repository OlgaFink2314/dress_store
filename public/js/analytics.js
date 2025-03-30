// Отправка событий на сервер
function trackEvent(eventType, eventData = {}) {
    try {
        // Добавляем дополнительную информацию
        const enhancedData = {
            ...eventData,
            page_url: window.location.pathname,
            referrer: document.referrer,
            screen_width: window.screen.width,
            screen_height: window.screen.height,
            timestamp: new Date().toISOString()
        };
        
        // Проверяем, есть ли sessionId в localStorage (резервный вариант)
        let sessionId = localStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem('sessionId', sessionId);
        }
        
        fetch('/api/track-event', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify({
                eventType,
                eventData: enhancedData,
                sessionId // Добавляем sessionId в тело запроса
            })
        }).catch(err => console.error('Ошибка при отправке события:', err));
    } catch (err) {
        console.error('Ошибка в trackEvent:', err);
    }
}

// Отслеживание времени на странице
let pageEnterTime = new Date();

window.addEventListener('beforeunload', () => {
    const timeSpent = Math.round((new Date() - pageEnterTime) / 1000);
    trackEvent('page_exit', { time_spent: timeSpent });
});

// Отслеживание кликов по товарам
document.addEventListener('DOMContentLoaded', () => {
    // Клики по товарам в каталоге
    document.querySelectorAll('.dress-card').forEach(card => {
        card.addEventListener('click', () => {
            const dressId = card.dataset.dressId;
            if (dressId) {
                trackEvent('product_click', { dress_id: dressId });
            }
        });
    });
    
    // Добавление в корзину
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', () => {
            const dressId = button.dataset.dressId;
            if (dressId) {
                trackEvent('add_to_cart', { dress_id: dressId });
            }
        });
    });
    
    // Просмотр корзины
    if (window.location.pathname === '/cart') {
        trackEvent('view_cart');
    }
    
    // Начало оформления заказа
    if (window.location.pathname === '/checkout') {
        trackEvent('checkout_start');
    }
    
    // Успешный заказ
    if (window.location.pathname === '/checkout/success') {
        trackEvent('purchase');
    }
});

// Отправляем событие просмотра страницы
trackEvent('page_view');