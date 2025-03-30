document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    alert('Пожалуйста, войдите в систему');
    window.location.href = '/auth.html';
    return;
  }

  try {
    await loadOrders(token);
  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    showError('Не удалось загрузить историю заказов');
  }
});

async function loadOrders(token) {
  try {
    const response = await fetch('/api/orders', {
      headers: {
        'Authorization': token
      }
    });

    if (!response.ok) {
      throw new Error('Ошибка загрузки заказов: ' + response.status);
    }

    const data = await response.json();
    console.log('Данные заказов:', data); // Для отладки
    
    if (!Array.isArray(data)) {
      throw new Error('Некорректный формат данных заказов');
    }

    renderOrders(data);
  } catch (error) {
    console.error('Ошибка:', error);
    throw error;
  }
}

function renderOrders(orders) {
  const ordersContainer = document.getElementById('ordersList');
  
  if (!orders || orders.length === 0) {
    ordersContainer.innerHTML = `
      <div class="no-orders">
        <p>У вас пока нет заказов</p>
        <a href="/catalog" class="btn">Перейти в каталог</a>
      </div>
    `;
    return;
  }

  ordersContainer.innerHTML = orders.map(order => {
    try {
      const orderDate = new Date(order.order_date).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      let statusClass = '';
      if (order.status === 'Completed') statusClass = 'status-completed';
      else if (order.status === 'Pending') statusClass = 'status-pending';

      // Преобразуем цены в числа
      const totalAmount = typeof order.total_amount === 'string' 
        ? parseFloat(order.total_amount) 
        : order.total_amount;

      return `
        <div class="order-card">
          <div class="order-header">
            <div>
              <span class="order-id">Заказ #${order.order_id}</span>
              <span class="order-date">${orderDate}</span>
            </div>
            <span class="order-status ${statusClass}">${order.status}</span>
          </div>
          
          <div class="order-items">
            ${order.items.map(item => {
              const totalPrice = typeof item.total_price === 'string' 
                ? parseFloat(item.total_price) 
                : item.total_price;
                
              return `
              <div class="order-item">
                <span>${item.title || 'Без названия'} (${item.quantity} шт.)</span>
                <span>${totalPrice.toFixed(2)} ₽</span>
              </div>
              `;
            }).join('')}
          </div>
          
          <div class="order-total">
            <span>Итого:</span>
            <span>${totalAmount.toFixed(2)} ₽</span>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Ошибка рендеринга заказа:', order, error);
      return '';
    }
  }).join('');
}

function showError(message) {
  const ordersContainer = document.getElementById('ordersList');
  if (ordersContainer) {
    ordersContainer.innerHTML = `
      <div class="error">
        <p>${message}</p>
        <a href="/account" class="btn">В личный кабинет</a>
      </div>
    `;
  }
}