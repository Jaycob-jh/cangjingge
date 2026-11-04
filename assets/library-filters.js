// Keep Quarto's native category filtering available on small screens.
document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("library-category-select");
  if (!select) return;
  const categories = [...document.querySelectorAll(".quarto-listing-category .category")];
  for (const category of categories) {
    const value = category.dataset.category;
    if (value) select.add(new Option(category.textContent.trim(), value));
    category.addEventListener("click", () => { select.value = value; });
  }
  select.addEventListener("change", () => {
    categories.find(category => category.dataset.category === select.value)?.click();
  });
});
