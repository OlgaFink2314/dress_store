document.addEventListener('DOMContentLoaded', async () => {
    // Загрузка категорий
    await loadCategories();
    
    // Загрузка всех платьев
    await loadDresses();
    
    // Настройка обработчиков событий
    document.getElementById('searchBtn').addEventListener('click', loadDresses);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') loadDresses();
    });
    
    document.getElementById('categoryFilter').addEventListener('change', loadDresses);
    document.getElementById('minPrice').addEventListener('change', loadDresses);
    document.getElementById('maxPrice').addEventListener('change', loadDresses);
    document.getElementById('sortSelect').addEventListener('change', loadDresses);
  });
  
  async function loadCategories() {
    try {
      const response = await fetch('/api/categories');
      const categories = await response.json();
      
      const categorySelect = document.getElementById('categoryFilter');
      
      // Очищаем существующие опции, кроме первой
      while (categorySelect.options.length > 1) {
        categorySelect.remove(1);
      }
      
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.category_id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });
    } catch (error) {
      console.error('Ошибка при загрузке категорий:', error);
    }
  }
  
  async function loadDresses() {
    try {
      // Получаем параметры фильтрации
      const search = document.getElementById('searchInput').value;
      const category = document.getElementById('categoryFilter').value;
      const minPrice = document.getElementById('minPrice').value;
      const maxPrice = document.getElementById('maxPrice').value;
      const sort = document.getElementById('sortSelect').value;
      
      // Формируем URL с параметрами
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (sort) params.append('sort', sort);
      
      const response = await fetch(`/api/dresses?${params.toString()}`);
      const dresses = await response.json();
      
      const container = document.getElementById('dressesContainer');
      
      if (dresses.length > 0) {
        container.innerHTML = dresses.map(dress => {
          // Преобразуем price в число, если это строка
          const price = typeof dress.price === 'string' 
            ? parseFloat(dress.price) 
            : dress.price;
          
          // Форматируем цену
          const formattedPrice = price && !isNaN(price) 
            ? `${price.toFixed(2)}  ₽` 
            : 'Цена не указана';
          
          // Обрезаем описание, если оно есть
          const description = dress.description 
            ? `${dress.description.substring(0, 60)}...` 
            : 'Описание отсутствует';
          
          // Возвращаем карточку товара С ССЫЛКОЙ на страницу продукта
          return `
          <div class="dress-card">
            <a href="/product.html?id=${dress.dress_id}" class="dress-image-link">
              <img src="${dress.image_url || '/public/images/no-image.jpg'}" 
                   alt="${dress.title || 'Свадебное платье'}" 
                   class="dress-image">
            </a>
            <div class="dress-info">
              <h3 class="dress-title">
                <a href="/product.html?id=${dress.dress_id}">
                  ${dress.title || 'Без названия'}
                </a>
              </h3>
              <p class="dress-price">${formattedPrice}</p>
            </div>
          </div>
        `;
        }).join('');
      } else {
        container.innerHTML = '<p class="no-results">По вашему запросу ничего не найдено</p>';
      }
    } catch (error) {
      console.error('Ошибка при загрузке платьев:', error);
      document.getElementById('dressesContainer').innerHTML = `
        <p class="error-message">Произошла ошибка при загрузке данных. Пожалуйста, попробуйте позже.</p>
      `;
    }
  }