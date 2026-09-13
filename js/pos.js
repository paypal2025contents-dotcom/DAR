/**
 * pos.js
 * Point-of-Sale screen: tap items to build a cart, take payment, checkout.
 */

const POS = {
  cart: [], // { id, name, price, qty }

  init() {
    document.getElementById('posSearch').addEventListener('input', () => this.renderItemGrid());
    document.getElementById('posCategoryFilter').addEventListener('change', () => this.renderItemGrid());
    document.getElementById('amountPaid').addEventListener('input', () => this.renderCartSummary());
    document.getElementById('clearCartBtn').addEventListener('click', () => this.clearCart());
    document.getElementById('checkoutBtn').addEventListener('click', () => this.checkout());

    this.renderCategoryFilter();
    this.renderItemGrid();
    this.renderCart();
  },

  renderCategoryFilter() {
    const select = document.getElementById('posCategoryFilter');
    const categories = [...new Set(DB.getItems().map(i => i.category))].sort();
    const current = select.value;
    select.innerHTML = '<option value="all">All Categories</option>' +
      categories.map(c => `<option value="${UI.escapeHtml(c)}">${UI.escapeHtml(c)}</option>`).join('');
    if (categories.includes(current)) select.value = current;
  },

  renderItemGrid() {
    const grid = document.getElementById('posItemGrid');
    const search = document.getElementById('posSearch').value.trim().toLowerCase();
    const category = document.getElementById('posCategoryFilter').value;

    let items = DB.getItems();
    if (category !== 'all') items = items.filter(i => i.category === category);
    if (search) {
      items = items.filter(i =>
        i.name.toLowerCase().includes(search) ||
        (i.sku || '').toLowerCase().includes(search)
      );
    }

    if (items.length === 0) {
      grid.innerHTML = '<p class="empty-hint">No products match your search.</p>';
      return;
    }

    grid.innerHTML = items.map(item => {
      const outOfStock = item.stock <= 0;
      const lowStock = !outOfStock && item.stock <= item.lowStockThreshold;
      return `
        <div class="item-card ${outOfStock ? 'out-of-stock' : ''}" data-id="${item.id}">
          <span class="stock-badge ${lowStock ? 'low' : ''}">${outOfStock ? 'Out' : item.stock + ' left'}</span>
          <span class="icon">${item.icon || '🛍️'}</span>
          <div class="name">${UI.escapeHtml(item.name)}</div>
          <div class="price">${UI.peso(item.price)}</div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', () => {
        if (card.classList.contains('out-of-stock')) return;
        this.addToCart(card.dataset.id);
      });
    });
  },

  addToCart(itemId) {
    const item = DB.getItems().find(i => i.id === itemId);
    if (!item) return;

    const existing = this.cart.find(c => c.id === itemId);
    const qtyInCart = existing ? existing.qty : 0;
    if (qtyInCart + 1 > item.stock) {
      UI.toast(`Only ${item.stock} ${item.name} in stock.`);
      return;
    }

    if (existing) {
      existing.qty += 1;
    } else {
      this.cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
    }
    this.renderCart();
  },

  changeQty(itemId, delta) {
    const line = this.cart.find(c => c.id === itemId);
    if (!line) return;
    const stockItem = DB.getItems().find(i => i.id === itemId);

    const newQty = line.qty + delta;
    if (newQty <= 0) {
      this.cart = this.cart.filter(c => c.id !== itemId);
    } else if (stockItem && newQty > stockItem.stock) {
      UI.toast(`Only ${stockItem.stock} ${stockItem.name} in stock.`);
      return;
    } else {
      line.qty = newQty;
    }
    this.renderCart();
  },

  removeFromCart(itemId) {
    this.cart = this.cart.filter(c => c.id !== itemId);
    this.renderCart();
  },

  clearCart() {
    this.cart = [];
    document.getElementById('amountPaid').value = '';
    this.renderCart();
  },

  getTotal() {
    return this.cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  },

  renderCart() {
    const list = document.getElementById('cartList');
    if (this.cart.length === 0) {
      list.innerHTML = '<p class="empty-hint">Tap a product to add it to the sale.</p>';
    } else {
      list.innerHTML = this.cart.map(c => `
        <div class="cart-item" data-id="${c.id}">
          <div class="ci-info">
            <div class="ci-name">${UI.escapeHtml(c.name)}</div>
            <div class="ci-unit">${UI.peso(c.price)} each</div>
          </div>
          <div class="qty-control">
            <button class="qty-minus" aria-label="Decrease">−</button>
            <span>${c.qty}</span>
            <button class="qty-plus" aria-label="Increase">+</button>
          </div>
          <div class="ci-subtotal">${UI.peso(c.price * c.qty)}</div>
          <button class="ci-remove" aria-label="Remove">✕</button>
        </div>
      `).join('');

      list.querySelectorAll('.cart-item').forEach(row => {
        const id = row.dataset.id;
        row.querySelector('.qty-plus').addEventListener('click', () => this.changeQty(id, 1));
        row.querySelector('.qty-minus').addEventListener('click', () => this.changeQty(id, -1));
        row.querySelector('.ci-remove').addEventListener('click', () => this.removeFromCart(id));
      });
    }
    // Refresh the grid so stock badges reflect quantities held in the cart.
    this.renderItemGrid();
    this.renderCartSummary();
  },

  renderCartSummary() {
    const total = this.getTotal();
    const paid = parseFloat(document.getElementById('amountPaid').value) || 0;
    const change = paid - total;
    const itemCount = this.cart.reduce((sum, c) => sum + c.qty, 0);

    document.getElementById('cartItemCount').textContent = itemCount;
    document.getElementById('cartTotal').textContent = UI.peso(total);
    document.getElementById('cartChange').textContent = UI.peso(Math.max(change, 0));

    const checkoutBtn = document.getElementById('checkoutBtn');
    checkoutBtn.disabled = this.cart.length === 0 || paid < total;
  },

  checkout() {
    const total = this.getTotal();
    const paid = parseFloat(document.getElementById('amountPaid').value) || 0;

    if (this.cart.length === 0) {
      UI.toast('Cart is empty.');
      return;
    }
    if (paid < total) {
      UI.toast('Amount paid is less than the total.');
      return;
    }

    const cashier = document.getElementById('cashierName').value.trim() || 'Unassigned';
    const change = paid - total;

    const sale = {
      datetime: new Date().toISOString(),
      cashier,
      items: this.cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty, subtotal: c.price * c.qty })),
      total,
      amountPaid: paid,
      change,
    };

    const savedSale = DB.addSale(sale);

    // Deduct stock
    this.cart.forEach(c => DB.adjustStock(c.id, -c.qty));

    Receipt.show(savedSale);

    this.clearCart();
    Inventory.render();
    if (typeof Reports !== 'undefined') Reports.render();
  },
};
