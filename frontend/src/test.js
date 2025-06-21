console.log('Test JS Loaded - JavaScript is working!');
document.addEventListener('DOMContentLoaded', () => {
  console.log('Test JS - DOM Content Loaded');
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = '<div style="color: green; padding: 20px;"><h1>✅ JavaScript is working!</h1><p>Test file loaded successfully.</p></div>';
  }
}); 