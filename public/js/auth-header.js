document.addEventListener('DOMContentLoaded', () => {
    const authLinks = document.getElementById('authLinks');
    const token = localStorage.getItem('token');

    if (!authLinks) return;

    if (token) {
        authLinks.innerHTML = `
    <a href="/account">Личный кабинет</a>
    <a href="/orders">Мои заказы</a>
    <a href="/cart">Корзина</a>
    <a href="#" id="logoutHeaderBtn">Выход</a>
  `;

        document.getElementById('logoutHeaderBtn').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = '/';
        });
    } else {
        authLinks.innerHTML = '<a href="/auth.html">Вход</a>';
    }




    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
      if (link.getAttribute('href') === currentPath) {
        link.classList.add('active');
      }
    });
});


