document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/auth.html';
      return;
    }
    
    try {
      // Загрузка данных пользователя
      const response = await fetch('/api/user', {
        headers: {
          'Authorization': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      
      const user = await response.json();
      
      // Заполняем данные на странице
      document.getElementById('userFirstName').textContent = user.first_name || 'Не указано';
      document.getElementById('userLastName').textContent = user.last_name || 'Не указано';
      document.getElementById('userUsername').textContent = user.username;
      document.getElementById('userEmail').textContent = user.email;
      document.getElementById('userPhone').textContent = user.phone || 'Не указано';
      document.getElementById('userAddress').textContent = user.address || 'Не указано';
      
      // Добавляем обработчик выхода
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          localStorage.removeItem('token');
          window.location.href = '/';
        });
      }
      
    } catch (err) {
      console.error(err);
      alert(err.message);
      window.location.href = '/auth.html';
    }
  });