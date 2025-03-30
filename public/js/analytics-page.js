document.addEventListener('DOMContentLoaded', async () => {
    try {
      // Проверяем авторизацию
      const token = localStorage.getItem('token') || getCookie('token');
      if (!token) {
        redirectToLogin();
        return;
      }
  
      // Загружаем данные аналитики
      const response = await fetch('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
  
      // Обрабатываем ответ
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
  
      if (!response.ok) {
        throw new Error(`Ошибка загрузки данных: ${response.statusText}`);
      }
  
      // Получаем и отображаем данные
      const data = await response.json();
      renderPopularPages(data.popularPages);
  
    } catch (error) {
      console.error('Ошибка:', error);
      showError(error.message || 'Ошибка загрузки аналитики');
    }
  });
  
  // Функция для отображения популярных страниц
  function renderPopularPages(pages) {
    const container = document.getElementById('popularPagesList');
    if (!container) return;
  
    if (pages && pages.length > 0) {
      container.innerHTML = `
        <table class="popular-pages-table">
          <thead>
            <tr>
              <th>Страница</th>
              <th>Посещений</th>
              <th>Уникальных посетителей</th>
            </tr>
          </thead>
          <tbody>
            ${pages.map(page => `
              <tr>
                <td>${page.url}</td>
                <td>${page.visits}</td>
                <td>${page.unique_visitors}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      container.innerHTML = '<p class="no-data">Нет данных о посещениях страниц</p>';
    }
  }
  
  // Вспомогательные функции
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }
  
  function redirectToLogin() {
    sessionStorage.setItem('redirectUrl', window.location.pathname);
    window.location.href = '/auth.html';
  }
  
  function handleUnauthorized() {
    localStorage.removeItem('token');
    document.cookie = 'token=; Max-Age=0; path=/';
    redirectToLogin();
  }
  
  function showError(message) {
    const container = document.getElementById('error-container') || document.body;
    container.innerHTML = `
      <div class="error-alert">
        <p>${message}</p>
        <button onclick="window.location.href='/auth.html'">Войти</button>
      </div>
    `;
  }