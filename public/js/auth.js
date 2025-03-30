document.addEventListener('DOMContentLoaded', () => {
    // Переключение между вкладками
    const tabBtns = document.querySelectorAll('.tab-btn');
    const authForms = document.querySelectorAll('.auth-form');
    
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        authForms.forEach(f => f.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`${btn.dataset.tab}Form`).classList.add('active');
      });
    });
    
    // Обработка формы входа
    document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('loginUsername').value;
      const password = document.getElementById('loginPassword').value;
      
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          localStorage.setItem('token', data.token);
          window.location.href = '/account.html';
        } else {
          alert(data.error || 'Ошибка авторизации');
        }
      } catch (err) {
        console.error(err);
        alert('Ошибка соединения');
      }
    });
    
    // Обработка формы регистрации
    document.getElementById('registerFormElement').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userData = {
          username: document.getElementById('regUsername').value,
          email: document.getElementById('regEmail').value,
          password: document.getElementById('regPassword').value,
          firstName: document.getElementById('regFirstName').value,
          lastName: document.getElementById('regLastName').value,
          phone: document.getElementById('regPhone').value,
          address: document.getElementById('regAddress').value
        };
        
        try {
          const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
          });
          
          const data = await response.json();
          
          if (response.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = '/account.html';
          } else {
            alert(data.error || 'Ошибка регистрации');
          }
        } catch (err) {
          console.error(err);
          alert('Ошибка соединения');
        }
      });
  });