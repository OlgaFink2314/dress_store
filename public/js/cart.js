document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      alert('Пожалуйста, войдите в систему');
      window.location.href = '/auth.html';
      return;
    }
  
    try {
      await loadCart(token);
      setupEventListeners();
    } catch (error) {
      console.error('Ошибка:', error);
      showError('Не удалось загрузить корзину');
    }
  });
  
  async function loadCart(token) {
    try {
      const response = await fetch('/api/cart', {
        headers: {
          'Authorization': token
        }
      });
  
      if (!response.ok) {
        throw new Error('Ошибка загрузки корзины');
      }
  
      const items = await response.json();
      renderCart(items);
    } catch (error) {
      console.error('Ошибка:', error);
      throw error;
    }
  }
  
  function renderCart(items) {
    const cartContent = document.getElementById('cartContent');
    const cartSummary = document.getElementById('cartSummary');
  
    if (!items || items.length === 0) {
      cartContent.innerHTML = `
        <div class="empty-cart">
          <p>Ваша корзина пуста</p>
          <a href="/catalog" class="btn">Перейти в каталог</a>
        </div>
      `;
      if (cartSummary) cartSummary.style.display = 'none';
      return;
    }
  
    let total = 0;
    cartContent.innerHTML = items.map(item => {
      const price = parseFloat(item.price);
      const itemTotal = price * item.quantity;
      total += itemTotal;
  
      return `
        <div class="cart-item" data-item-id="${item.cart_item_id}">
          <img src="${item.image_url || '/public/images/no-image.jpg'}" 
               alt="${item.title}" 
               class="cart-item-image">
          <div class="cart-item-info">
            <h3 class="cart-item-title">${item.title}</h3>
            <p class="cart-item-price">${price.toFixed(2)} ₽</p>
            <div class="quantity-display">
              Количество: <span>${item.quantity}</span>
            </div>
          </div>
          <div class="cart-item-actions">
            <button class="remove-btn">Удалить</button>
          </div>
        </div>
      `;
    }).join('');
  
    if (cartSummary) {
      document.getElementById('totalAmount').textContent = `${total.toFixed(2)} ₽`;
      cartSummary.style.display = 'block';
    }
  }
  
  function setupEventListeners() {
    // Обработчик для удаления
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const itemId = e.target.closest('.cart-item').dataset.itemId;
        const token = localStorage.getItem('token');
        
        try {
          const response = await fetch(`/api/cart/${itemId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': token
            }
          });
  
          if (response.ok) {
            await loadCart(token);
          }
        } catch (error) {
          console.error('Ошибка:', error);
        }
      });
    });
  
    // Новый обработчик для кнопки оформления заказа
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/checkout';
      });
    }
  }
  
  function showError(message) {
    const cartContent = document.getElementById('cartContent');
    if (cartContent) {
      cartContent.innerHTML = `
        <div class="error-message">
          <p>${message}</p>
          <a href="/" class="btn">На главную</a>
        </div>
      `;
    }
  }