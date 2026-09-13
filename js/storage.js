/**
 * storage.js
 * Simple localStorage-backed data layer for the TinDARhan POS.
 * No backend/server required — all data lives in the browser.
 */

const DB = {
  KEYS: {
    ITEMS: 'tindarhan_items',
    SALES: 'tindarhan_sales',
    SETTINGS: 'tindarhan_settings',
    ITEM_SEQ: 'tindarhan_item_seq',
    SALE_SEQ: 'tindarhan_sale_seq',
  },

  // ---------- generic helpers ----------
  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('DB read error for', key, e);
      return fallback;
    }
  },

  _write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  _nextSeq(key) {
    const current = this._read(key, 0) + 1;
    this._write(key, current);
    return current;
  },

  // ---------- items ----------
  getItems() {
    return this._read(this.KEYS.ITEMS, []);
  },
  saveItems(items) {
    this._write(this.KEYS.ITEMS, items);
  },
  addItem(item) {
    const items = this.getItems();
    item.id = 'ITM' + String(this._nextSeq(this.KEYS.ITEM_SEQ)).padStart(4, '0');
    if (!item.sku) item.sku = item.id;
    items.push(item);
    this.saveItems(items);
    return item;
  },
  updateItem(updated) {
    const items = this.getItems().map(i => (i.id === updated.id ? updated : i));
    this.saveItems(items);
  },
  deleteItem(id) {
    const items = this.getItems().filter(i => i.id !== id);
    this.saveItems(items);
  },
  adjustStock(id, delta) {
    const items = this.getItems();
    const item = items.find(i => i.id === id);
    if (item) {
      item.stock = Math.max(0, item.stock + delta);
      this.saveItems(items);
    }
  },

  // ---------- sales ----------
  getSales() {
    return this._read(this.KEYS.SALES, []);
  },
  saveSales(sales) {
    this._write(this.KEYS.SALES, sales);
  },
  addSale(sale) {
    const sales = this.getSales();
    sale.id = 'SALE' + String(this._nextSeq(this.KEYS.SALE_SEQ)).padStart(5, '0');
    sales.push(sale);
    this.saveSales(sales);
    return sale;
  },

  // ---------- settings ----------
  getSettings() {
    return this._read(this.KEYS.SETTINGS, { cashier: '' });
  },
  saveSettings(settings) {
    this._write(this.KEYS.SETTINGS, settings);
  },

  // ---------- seed ----------
  seedIfEmpty() {
    if (this.getItems().length > 0) return;

    const seedItems = [
      { name: 'Banana Chips', category: 'Chips & Snacks', icon: '🍌', price: 60, stock: 40, lowStockThreshold: 10 },
      { name: 'Rice Chips (Ampao)', category: 'Chips & Snacks', icon: '🍘', price: 55, stock: 35, lowStockThreshold: 10 },
      { name: 'Boiled Peanuts', category: 'Chips & Snacks', icon: '🥜', price: 45, stock: 30, lowStockThreshold: 8 },
      { name: 'Calamansi Juice Concentrate', category: 'Beverages', icon: '🍋', price: 90, stock: 25, lowStockThreshold: 5 },
      { name: 'Batangas Kapeng Barako', category: 'Beverages', icon: '☕', price: 150, stock: 20, lowStockThreshold: 5 },
      { name: 'Pure Honey (Bottle)', category: 'Preserves & Jams', icon: '🍯', price: 180, stock: 18, lowStockThreshold: 4 },
      { name: 'Turmeric Powder (Dilaw)', category: 'Condiments & Sauces', icon: '🧂', price: 70, stock: 22, lowStockThreshold: 5 },
      { name: 'Spiced Vinegar', category: 'Wine & Vinegar', icon: '🍶', price: 65, stock: 28, lowStockThreshold: 6 },
      { name: 'Batangas Lambanog', category: 'Wine & Vinegar', icon: '🍾', price: 220, stock: 15, lowStockThreshold: 3 },
      { name: 'Coco Jam (Minatamis)', category: 'Preserves & Jams', icon: '🥥', price: 95, stock: 20, lowStockThreshold: 5 },
      { name: 'Bagoong / Sardines Pack', category: 'Condiments & Sauces', icon: '🐟', price: 85, stock: 24, lowStockThreshold: 6 },
      { name: 'Woven Souvenir Item', category: 'Others', icon: '🧺', price: 120, stock: 12, lowStockThreshold: 3 },
    ];

    seedItems.forEach(i => this.addItem(i));
  },
};

DB.seedIfEmpty();
