document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('tool-form');
  const result = document.getElementById('result');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const output = calculate();
    result.textContent = output;
    result.style.display = 'block';
  });

  function calculate() {
    // ツール固有のロジックをここに実装する
    return '結果がここに表示されます';
  }
});
