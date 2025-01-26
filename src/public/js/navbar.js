const toggleButton = document.getElementById('dark-mode-toggle');
const toggleLightIcon = document.getElementById('toggle-light-icon');
const toggleDarkIcon = document.getElementById('toggle-dark-icon');
const toggleDefaultIcon = document.getElementById('toggle-default-icon');

// Function to set theme based on preference
function setTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    toggleDarkIcon.classList.remove('hidden');
    toggleLightIcon.classList.add('hidden');
  } else {
    document.documentElement.classList.remove('dark');
    toggleLightIcon.classList.remove('hidden');
    toggleDarkIcon.classList.add('hidden');
  }
  toggleDefaultIcon.classList.add('hidden');
}

// Initialize theme on script load
(function initializeTheme() {
  const storedTheme = localStorage.getItem('theme');
  
  if (storedTheme) {
    setTheme(storedTheme);
  } else {
    // Default to light mode if no preference is stored
    setTheme('light');
    localStorage.setItem('theme', 'light');
  }
})();

// Toggle theme on button click
toggleButton.addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  
  if (isDark) {
    setTheme('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    setTheme('light');
    localStorage.setItem('theme', 'light');
  }

  console.log('Dark Mode:', isDark);
});