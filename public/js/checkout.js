document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      alert('Пожалуйста, войдите в систему');
      window.location.href = '/auth.html';
      return;
    }
  
    try {
      // Загружаем данные пользователя
      const userResponse = await fetch('/api/user', {
        headers: {
          'Authorization': token
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('Ошибка загрузки данных пользователя');
      }
      
      const user = await userResponse.json();
      
      // Заполняем форму данными пользователя
      if (user) {
        document.getElementById('fullName').value = 
          `${user.first_name || ''} ${user.last_name || ''}`.trim();
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('address').value = user.address || '';
      }
      
      // Загружаем корзину
      await loadCartItems(token);
      
      // Настраиваем обработчик формы
      document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await placeOrder(token);
      });
      
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Не удалось загрузить данные для оформления заказа');
      window.location.href = '/cart';
    }
  });
  
  async function loadCartItems(token) {
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
      renderOrderItems(items);
      
    } catch (error) {
      console.error('Ошибка:', error);
      throw error;
    }
  }
  
  function renderOrderItems(items) {
    const orderItemsContainer = document.getElementById('orderItems');
    let total = 0;
    
    if (!items || items.length === 0) {
      orderItemsContainer.innerHTML = '<p>Ваша корзина пуста</p>';
      return;
    }
    
    orderItemsContainer.innerHTML = items.map(item => {
      const price = parseFloat(item.price);
      const itemTotal = price * item.quantity;
      total += itemTotal;
      
      return `
        <div class="order-item">
          <span>${item.title} (${item.quantity} шт.)</span>
          <span>${itemTotal.toFixed(2)} ₽</span>
        </div>
      `;
    }).join('');
    
    document.getElementById('orderTotal').textContent = `${total.toFixed(2)} ₽`;
  }
  
  async function placeOrder(token) {
    const orderData = {
      fullName: document.getElementById('fullName').value,
      phone: document.getElementById('phone').value,
      email: document.getElementById('email').value,
      address: document.getElementById('address').value,
      paymentMethod: document.getElementById('paymentMethod').value,
      comments: document.getElementById('comments').value
    };
    
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка оформления заказа');
      }
      
      const result = await response.json();
      alert('Ваш заказ успешно оформлен! Номер заказа: ' + result.order_id);
      window.location.href = '/account';
      
    } catch (error) {
      console.error('Ошибка:', error);
      alert(error.message || 'Не удалось оформить заказ');
    }
  }