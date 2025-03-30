document.addEventListener('DOMContentLoaded', async () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const dressId = urlParams.get('id');

        if (!dressId) {
            throw new Error('ID товара не указан');
        }

        const response = await fetch(`/api/dresses/${dressId}`);
        const dress = await response.json();

        if (!dress) {
            throw new Error('Товар не найден');
        }

        displayProductInfo(dress);
    } catch (error) {
        console.error('Ошибка:', error);
        document.querySelector('.product-container').innerHTML = `
        <div class="error" style="grid-column: 1/-1; text-align: center; padding: 50px 0;">
          <p style="font-size: 1.2rem; margin-bottom: 20px;">${error.message}</p>
          <a href="/catalog" class="btn">Вернуться в каталог</a>
        </div>
      `;
    }
});

function displayProductInfo(dress) {
    // Устанавливаем основную информацию
    document.getElementById('productTitle').textContent = dress.title || 'Без названия';

    const price = typeof dress.price === 'string'
        ? parseFloat(dress.price)
        : dress.price;
    document.getElementById('productPrice').textContent =
        price && !isNaN(price) ? `${price.toFixed(2)}  ₽` : 'Цена не указана';

    document.getElementById('productDescription').textContent =
        dress.description || 'Описание отсутствует';

    // Устанавливаем изображения
    const mainImage = document.getElementById('mainProductImage');
    const thumbnailsContainer = document.getElementById('productThumbnails');

    if (dress.images && dress.images.length > 0) {
        const mainImg = dress.images.find(img => img.is_main) || dress.images[0];
        mainImage.src = mainImg.image_url;
        mainImage.alt = dress.title || 'Свадебное платье';

        thumbnailsContainer.innerHTML = dress.images.map(img => `
        <img src="${img.image_url}" 
             alt="${dress.title || ''}" 
             onclick="document.getElementById('mainProductImage').src='${img.image_url}'">
      `).join('');
    } else {
        mainImage.src = '/public/images/no-image.jpg';
        thumbnailsContainer.innerHTML = '';
    }

    // Добавляем характеристики
    const specsContainer = document.getElementById('productSpecs');
    const specs = [
        { label: 'Размер', value: dress.size },
        { label: 'Цвет', value: dress.color },
        { label: 'Ткань', value: dress.fabric },
        { label: 'Вырез', value: dress.neckline },
        { label: 'Силуэт', value: dress.silhouette },
        { label: 'Бренд', value: dress.brand_name }
    ].filter(spec => spec.value);

    specsContainer.innerHTML = specs.map(spec => `
      <div class="spec-item">
        <span class="spec-label">${spec.label}:</span>
        <span class="spec-value">${spec.value}</span>
      </div>
    `).join('');


    // В функции displayProductInfo добавляем:
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    window.location.href = '/auth.html';
                    return;
                }

                const response = await fetch('/api/cart/add', {
                    method: 'POST',
                    headers: {
                        'Authorization': token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        dress_id: dress.dress_id
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    alert(`Платье "${dress.title}" добавлено в корзину!`);
                } else {
                    alert(result.error || 'Ошибка добавления в корзину');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Не удалось добавить в корзину');
            }
        });
    }


}