(async () => {
  const panel = document.querySelector('.panel-open');
  if (!panel) return { error: 'No panel-open found' };
  const buttons = panel.querySelectorAll('.btn-more');
  buttons.forEach(btn => btn.click());
  await new Promise(r => setTimeout(r, 1500));
  const data = {};
  const priceElements = panel.querySelectorAll('.price-panel');
  priceElements.forEach(priceEl => {
    const parent = priceEl.parentElement;
    const nameEl = parent.querySelector('.name');
    if (nameEl) {
      data[nameEl.innerText.trim()] = priceEl.innerText.trim();
    }
  });
  return data;
})()