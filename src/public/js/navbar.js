const toggleButton = document.getElementById('dark-mode-toggle');
const toggleLightIcon = document.getElementById('toggle-light-icon');
const toggleDarkIcon = document.getElementById('toggle-dark-icon');
const toggleDefaultIcon = document.getElementById('toggle-default-icon');

// Initialize icons based on current theme
if (document.documentElement.classList.contains('dark')) {
    toggleDarkIcon.classList.remove('hidden');
    toggleDefaultIcon.classList.add('hidden');
} else {
    toggleLightIcon.classList.remove('hidden');
    toggleDefaultIcon.classList.add('hidden');
}

    toggleButton.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
      
      console.log('Dark Mode: ', document.documentElement.classList.contains('dark'));
      // Toggle icons
      toggleLightIcon.classList.toggle('hidden');
      toggleDarkIcon.classList.toggle('hidden');
      toggleDefaultIcon.classList.toggle('hidden');
      
      // Save user preference to localStorage (optional)
      if (document.documentElement.classList.contains('dark')) {
        localStorage.setItem('theme', 'dark');
      } else {
        localStorage.setItem('theme', 'light');
      }
    });

    // On page load, check for user preference
    window.addEventListener('DOMContentLoaded', () => {
      const theme = localStorage.getItem('theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        toggleDarkIcon.classList.remove('hidden');
        toggleDefaultIcon.classList.add('hidden');
      } else {
        document.documentElement.classList.remove('dark');
        toggleLightIcon.classList.remove('hidden');
        toggleDefaultIcon.classList.add('hidden');
      }
    });