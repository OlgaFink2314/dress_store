document.addEventListener('DOMContentLoaded', async () => {
    try {
      const response = await fetch('/api/dresses?sort=price_desc&limit=4');
      const dresses = await response.json();
      
      const featuredContainer = document.getElementById('featuredDresses');
      
      if (dresses.length > 0) {
        featuredContainer.innerHTML = dresses.map(dress => {
          // Преобразуем price в число, если это необходимо
          const price = typeof dress.price === 'string' 
            ? parseFloat(dress.price) 
            : dress.price;
            
          return `
          <div class="dress-card">
            <img src="${dress.image_url}" alt="${dress.title}" class="dress-image">
            <div class="dress-info">
              <h3 class="dress-title">${dress.title}</h3>
              <p class="dress-price">${Number(price).toFixed(2)}  ₽</p>
            </div>
          </div>
          `;
        }).join('');
      } else {
        featuredContainer.innerHTML = '<p>Популярные платья не найдены</p>';
      }
    } catch (error) {
      console.error('Ошибка при загрузке платьев:', error);
    }
});