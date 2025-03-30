document.addEventListener('DOMContentLoaded', async () => {
    try {
      const token = localStorage.getItem('token') || getCookie('token');
      if (!token) {
        redirectToLogin();
        return;
      }
  
      const response = await fetch('/api/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
  
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
  
      if (!response.ok) {
        throw new Error(`Ошибка ${response.status}: ${await response.text()}`);
      }
  
      const data = await response.json();
      renderStats(data.dailyStats);
      renderPopularProducts(data.popularProducts);
  
    } catch (error) {
      console.error('Ошибка:', error);
      showError(error.message || 'Ошибка загрузки статистики');
    }
  });
  
  function renderStats(statsData) {
    if (!statsData || statsData.length === 0) {
      showError('Нет данных для отображения');
      return;
    }
  
    // Сортируем по дате (от старых к новым)
    const sortedData = [...statsData].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // График выручки
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    new Chart(revenueCtx, {
      type: 'bar',
      data: {
        labels: sortedData.map(item => new Date(item.date).toLocaleDateString()),
        datasets: [{
          label: 'Выручка (руб)',
          data: sortedData.map(item => item.total_revenue),
          backgroundColor: 'rgba(54, 162, 235, 0.5)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
  
  function renderPopularProducts(products) {
    const container = document.getElementById('popularProducts');
    if (!container) return;
  
    if (products && products.length > 0) {
      container.innerHTML = products.map(product => `
        <div class="product-item">
          <span>${product.title}</span>
          <span>${product.sales_count} продаж</span>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p>Нет данных о популярных товарах</p>';
    }
  }
  


function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// В stats.js
async function updateStats() {
    try {
      const response = await fetch('/api/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        renderStats(data.dailyStats);
        renderPopularProducts(data.popularProducts);
      }
    } catch (error) {
      console.error('Ошибка обновления:', error);
    }
  }
  
  // Обновляем каждые 5 минут
  setInterval(updateStats, 5 * 60 * 1000);