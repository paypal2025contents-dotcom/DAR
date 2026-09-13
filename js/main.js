/**
 * main.js
 * App bootstrap: tab navigation, clock, and module initialization.
 */

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });
  if (tabName === 'reports') Reports.render();
  if (tabName === 'inventory') Inventory.render();
}

function startClock() {
  const clockEl = document.getElementById('liveClock');
  const tick = () => {
    clockEl.textContent = new Date().toLocaleTimeString('en-PH', { hour12: true });
  };
  tick();
  setInterval(tick, 1000);
}

function initCashierPersistence() {
  const input = document.getElementById('cashierName');
  const settings = DB.getSettings();
  input.value = settings.cashier || '';
  input.addEventListener('change', () => {
    DB.saveSettings({ ...DB.getSettings(), cashier: input.value.trim() });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  startClock();
  initCashierPersistence();

  POS.init();
  Inventory.init();
  Receipt.init();
  Reports.init();
});
