// Main JavaScript file that imports the complete BookApp class
import { BookApp } from "./app.js";

// Initialize the app when the page loads
document.addEventListener("DOMContentLoaded", () => {
  const bookApp = new BookApp();

  // Setup event listeners directly on the bookApp instance
  bookApp.setupEventListeners();

  // Assign to window for global access
  window.bookApp = bookApp;
});
