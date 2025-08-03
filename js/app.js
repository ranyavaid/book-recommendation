// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  collection,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables for Canvas environment. These will be undefined when run locally.
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

// Firebase configuration for local testing.
// IMPORTANT: Replace these with your actual Firebase project configuration.
// You can find this in your Firebase project settings -> "Your apps" -> Web app -> "Config"
const localFirebaseConfig = {
  apiKey: "AIzaSyCSVx_kO5BihsOLuBgpxD_WUVPRy_NiWb0",
  authDomain: "bookrec-d5c37.firebaseapp.com",
  projectId: "bookrec-d5c37",
  storageBucket: "bookrec-d5c37.firebasestorage.app",
  messagingSenderId: "420099286541",
  appId: "1:420099286541:web:854ad158f71ee365d69744",
  measurementId: "G-81QZERBNM8",
};

// Use the Canvas provided config if available, otherwise use the local config
const firebaseConfig =
  typeof __firebase_config !== "undefined"
    ? JSON.parse(__firebase_config)
    : localFirebaseConfig;

// Declare bookApp globally
window.bookApp;

class BookApp {
  constructor() {
    // Firebase Initialization
    this.app = initializeApp(firebaseConfig);
    this.db = getFirestore(this.app);
    this.auth = getAuth(this.app);
    this.userId = null; // Will be set after authentication

    // Initialize initialAuthToken here, making it a property of the class
    this.initialAuthToken =
      typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

    // Store current note content as a class property for easy access
    this.currentNoteContent = "";

    // Main Landing Page Container
    this.mainLandingPage = document.getElementById("mainLandingPage");

    // Book Selection Section Elements (repurposed from search)
    this.bookSelectionSection = document.getElementById("bookSelectionSection");
    this.bookDisplayGrid = document.getElementById("bookDisplayGrid"); // This will hold both top books and search results
    this.bookListTitle = document.getElementById("bookListTitle"); // New element for dynamic title

    // Search Bar Elements
    this.searchInput = document.getElementById("searchInput");
    this.clearSearchBtn = document.getElementById("clearSearchBtn"); // New clear button

    // Book Display Elements (Customization Page)
    this.bookDisplayArea = document.getElementById("bookDisplayArea");
    this.bookCoverWrapper = document.getElementById("bookCoverWrapper"); // Customization page book wrapper
    this.bookCoverFront = document.getElementById("bookCoverFront");
    this.bookCoverInside = document.getElementById("bookCoverInside");
    this.bookFirstPage = document.getElementById("bookFirstPage");
    this.noteInput = document.getElementById("noteInput");
    this.noteDisplay = document.getElementById("noteDisplay");
    this.stickerContainer = this.bookFirstPage; // Stickers go directly on the first page

    // Floating Menu Elements
    this.fontMenuBtn = document.getElementById("fontMenuBtn");
    this.stickerMenuBtn = document.getElementById("stickerMenuBtn");
    this.shareMenuBtn = document.getElementById("shareMenuBtn");

    this.fontSubMenu = document.getElementById("fontSubMenu");
    this.stickerSubMenu = document.getElementById("stickerSubMenu");
    this.shareSubMenu = document.getElementById("shareSubMenu");

    this.fontButtons = document.querySelectorAll("#fontSubMenu .font-btn"); // Select font buttons within sub-menu
    this.stickerButtons = document.querySelectorAll(
      "#stickerSubMenu .sticker-btn"
    ); // Select sticker buttons within sub-menu

    // Share Page Elements
    this.sharePage = document.getElementById("sharePage");
    this.backToEditingLink = document.getElementById("backToEditingLink");
    this.shareBookCoverWrapper = document.getElementById(
      "shareBookCoverWrapper"
    ); // Share page book wrapper
    this.shareBookCoverFront = document.getElementById("shareBookCoverFront");
    this.shareBookCoverInside = document.getElementById("shareBookCoverInside"); // Corrected reference
    this.shareBookFirstPage = document.getElementById("shareBookFirstPage");
    this.shareNoteDisplay = document.getElementById("shareNoteDisplay");
    this.senderNameInput = document.getElementById("senderName");
    this.viewOnlyHeading = document.getElementById("viewOnlyHeading"); // New view-only heading
    this.sharePageOriginalHeading = document.getElementById(
      "sharePageOriginalHeading"
    ); // Original heading
    this.shareDetailsWrapper = document.getElementById("shareDetailsWrapper"); // Wrapper for sender name and copy button
    this.copyTooltip = document.getElementById("copyTooltip"); // Tooltip element
    this.createYourOwnCta = document.getElementById("createYourOwnCta"); // Create your own CTA
    this.createYourOwnBtn = document.getElementById("createYourOwnBtn"); // Create your own button

    // Modal Elements (These are not currently used for back navigation but are kept in the code)
    this.confirmationModal = document.getElementById("confirmationModal");
    this.confirmYesBtn = document.getElementById("confirmYes");
    this.confirmNoBtn = document.getElementById("confirmNo");

    // This is the one the user specifically asked about.
    this.backToSelectionLink = document.getElementById("backToSelectionLink");

    this.selectedBook = null;
    this.stickers = []; // Stores sticker data {emoji, element}
    this.isBookOpen = false; // For customization page book
    this.isShareBookOpen = false; // For share page book
    this.searchTimeout = null; // For debouncing search input
    this.isViewOnlyMode = false; // New state to track view-only mode

    this.init();
  }

  async init() {
    // Authenticate with Firebase first
    try {
      if (this.initialAuthToken) {
        await signInWithCustomToken(this.auth, this.initialAuthToken);
      } else {
        await signInAnonymously(this.auth);
      }
      this.userId = this.auth.currentUser?.uid || crypto.randomUUID();
      console.log("Firebase authenticated. User ID:", this.userId);
    } catch (error) {
      console.error("Firebase authentication failed:", error);
      // Continue without Firebase - use local storage only
      this.userId = crypto.randomUUID();
      console.log("Continuing with local storage only. User ID:", this.userId);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get("view");

    if (viewId) {
      this.isViewOnlyMode = true;
      await this.loadViewOnlyBook(viewId);
    } else {
      this.isViewOnlyMode = false;
      // If not in view-only mode, always start on the main landing page
      this.showMainLandingPage();
      // No longer calling loadBookData() here, as that was causing the automatic navigation
      // to the customize page if a book was previously saved in local storage.
      // The user explicitly wants to start with the search page.
    }

    // Load saved note and stickers (only in customization mode)
    // This call needs to be outside the if/else for viewId,
    // but its effects should only apply when the customization page is active.
    // The current `loadSavedData` already checks `!this.isViewOnlyMode` within itself,
    // so it's fine where it is.
    if (!this.isViewOnlyMode) {
      this.loadSavedData();
    }
  }

  // --- Sub-menu toggle logic ---
  toggleSubMenu(targetSubMenu) {
    // Close all other sub-menus
    [this.fontSubMenu, this.stickerSubMenu].forEach((menu) => {
      // Only close font and sticker menus
      if (menu !== targetSubMenu && menu.classList.contains("visible")) {
        menu.classList.remove("visible");
      }
    });
    // Toggle visibility of the target sub-menu
    targetSubMenu.classList.toggle("visible");
  }

  // --- Search and Book Display Logic ---
  handleSearchInput() {
    clearTimeout(this.searchTimeout); // Clear previous timeout
    const query = this.searchInput.value.trim();
    if (query.length > 0) {
      if (this.clearSearchBtn) this.clearSearchBtn.style.display = "block"; // Show clear button
      this.searchTimeout = setTimeout(() => {
        this.performSearch(query);
      }, 500); // Debounce for 500ms
    } else {
      if (this.clearSearchBtn) this.clearSearchBtn.style.display = "none"; // Hide clear button
      this.clearSearch(); // Clear results and show top books if input is empty
    }
  }

  clearSearch() {
    if (this.searchInput) this.searchInput.value = "";
    if (this.clearSearchBtn) this.clearSearchBtn.style.display = "none";
    if (this.bookListTitle)
      this.bookListTitle.textContent = "Top Recommended Books";
    this.fetchTopBooks(); // Reload top books
  }

  async performSearch(query) {
    if (this.bookListTitle) this.bookListTitle.textContent = "Searching...";
    if (this.bookDisplayGrid)
      this.bookDisplayGrid.innerHTML = `<p class="loading-indicator">Searching for books...</p>`;
    const apiKey = "";
    const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query
    )}&maxResults=20&key=${apiKey}`; // Fetch more results for search

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const items = data.items || [];
      this.displayBooks(items);
      if (this.bookListTitle)
        this.bookListTitle.textContent = `${items.length} results found`;
    } catch (error) {
      console.error("Error fetching books:", error);
      if (this.bookDisplayGrid)
        this.bookDisplayGrid.innerHTML = `<p class="text-red-500 p-4 text-center">Failed to load search results. Please try again.</p>`;
      if (this.bookListTitle) this.bookListTitle.textContent = "Search Failed";
    }
  }

  async fetchTopBooks() {
    if (this.bookListTitle)
      this.bookListTitle.textContent = "Top Recommended Books";
    if (this.bookDisplayGrid)
      this.bookDisplayGrid.innerHTML = `<p class="loading-indicator">Loading top books...</p>`;
    // Using a general query to simulate "top rated" or "bestsellers"
    const apiKey = "";
    const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=bestsellers fiction&maxResults=12&key=${apiKey}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const items = data.items || [];
      this.displayBooks(items);
    } catch (error) {
      console.error("Error fetching top books:", error);
      if (this.bookDisplayGrid)
        this.bookDisplayGrid.innerHTML = `<p class="text-red-500 p-4 text-center">Failed to load top books. Please try again.</p>`;
    }
  }

  displayBooks(items) {
    if (this.bookDisplayGrid) this.bookDisplayGrid.innerHTML = ""; // Clear existing content
    if (items.length > 0) {
      items.forEach((item) => {
        const volumeInfo = item.volumeInfo;
        const title = volumeInfo.title || "No Title";
        const authors = volumeInfo.authors
          ? volumeInfo.authors.join(", ")
          : "Unknown Author";
        // Prioritize extraLarge, then large, then medium, then thumbnail for higher resolution
        const coverUrl = volumeInfo.imageLinks
          ? volumeInfo.imageLinks.extraLarge ||
            volumeInfo.imageLinks.large ||
            volumeInfo.imageLinks.medium ||
            volumeInfo.imageLinks.thumbnail
          : "https://placehold.co/120x180/cccccc/ffffff?text=No+Cover";

        const book = {
          id: item.id,
          title: title,
          author: authors,
          coverUrl: coverUrl,
        };

        const bookItem = document.createElement("div");
        bookItem.className = "search-result-item"; // Reusing existing styling for grid items

        bookItem.innerHTML = `
                    <img src="${book.coverUrl}" alt="${book.title} cover" onerror="this.onerror=null;this.src='https://placehold.co/120x180/cccccc/ffffff?text=No+Cover';">
                    <div class="search-result-info">
                        <h4>${book.title}</h4>
                        <p>by ${book.author}</p>
                    </div>
                `;
        bookItem.addEventListener("click", () => this.selectBook(book));
        if (this.bookDisplayGrid) this.bookDisplayGrid.appendChild(bookItem);
      });
    } else {
      if (this.bookDisplayGrid)
        this.bookDisplayGrid.innerHTML = `<p class="text-gray-600 p-4 text-center">No books found.</p>`;
      // If no search results, restore "Top Recommended Books" title
      if (this.searchInput && this.searchInput.value.trim() !== "") {
        if (this.bookListTitle)
          this.bookListTitle.textContent = "0 results found";
      } else {
        if (this.bookListTitle)
          this.bookListTitle.textContent = "Top Recommended Books";
      }
    }
  }

  selectBook(book) {
    this.selectedBook = book;
    localStorage.setItem("selectedBook", JSON.stringify(book)); // Save selected book
    this.displayBook(this.bookCoverFront, this.bookCoverInside); // Display on customization page
    this.showBookDisplayArea(); // Show the book customization area
    // Auto-open the book once selected, after a slight delay for visual transition
    setTimeout(() => {
      this.openBook();
    }, 300);
  }

  loadBookData() {
    const bookData = localStorage.getItem("selectedBook");
    if (bookData) {
      this.selectedBook = JSON.parse(bookData);
      this.displayBook(this.bookCoverFront, this.bookCoverInside); // Display on customization page
      this.showBookDisplayArea(); // Show book if one is already selected
      // Auto-open if a book is already loaded, after a slight delay
      setTimeout(() => {
        this.openBook();
      }, 300);
    } else {
      this.showMainLandingPage(); // Show the main landing page if no book is selected
    }
  }

  // Reusable function to display book cover on a given element
  displayBook(frontCoverElement, insideCoverElement) {
    if (!frontCoverElement) {
      console.warn("frontCoverElement is null or undefined.");
      return;
    }

    // Define a default placeholder URL
    const defaultPlaceholderUrl =
      "https://placehold.co/300x450/8B7355/ffffff?text=No+Cover";
    let imageUrl = defaultPlaceholderUrl; // Start with the default
    let imageAlt = "No Cover Available";

    // If a book is selected and it.selectedBook has a coverUrl, use it
    if (this.selectedBook && this.selectedBook.coverUrl) {
      imageUrl = this.selectedBook.coverUrl;
      imageAlt = `${this.selectedBook.title} cover`;
    }

    // Log the URL being set for debugging
    console.log(
      `Attempting to load cover image: ${imageUrl} for element:`,
      frontCoverElement.id
    );

    // Set the front cover using the determined imageUrl
    frontCoverElement.innerHTML = `
            <img src="${imageUrl}" alt="${imageAlt}" onerror="this.onerror=null;this.src='${defaultPlaceholderUrl}';">
        `;

    // Set the background image for the inside cover
    if (insideCoverElement) {
      insideCoverElement.style.backgroundImage = `url('${imageUrl}')`;
      // No need to clear innerHTML, as we are using background-image
    }
  }

  // New methods to toggle visibility of main landing page, book display area, and share page
  showMainLandingPage() {
    if (this.mainLandingPage) this.mainLandingPage.style.display = "flex";
    if (this.bookDisplayArea) this.bookDisplayArea.style.display = "none";
    if (this.sharePage) this.sharePage.style.display = "none";
    // Hide CTA when showing main landing page
    if (this.createYourOwnCta) this.createYourOwnCta.style.display = "none";
    this.fetchTopBooks(); // Ensure top books are fetched when returning to landing page
  }

  showBookDisplayArea() {
    if (this.mainLandingPage) this.mainLandingPage.style.display = "none";
    if (this.bookDisplayArea) this.bookDisplayArea.style.display = "flex";
    if (this.sharePage) this.sharePage.style.display = "none";
    // Hide CTA when showing book display area
    if (this.createYourOwnCta) this.createYourOwnCta.style.display = "none";
    this.closeShareBook(); // Ensure share page book is closed when returning
  }

  showSharePage() {
    if (this.mainLandingPage) this.mainLandingPage.style.display = "none";
    if (this.bookDisplayArea) this.bookDisplayArea.style.display = "none";
    if (this.sharePage) this.sharePage.style.display = "flex";

    // Reset share page visibility elements
    if (this.viewOnlyHeading) this.viewOnlyHeading.style.display = "none";
    if (this.sharePageOriginalHeading)
      this.sharePageOriginalHeading.style.display = "block";
    if (this.shareDetailsWrapper)
      this.shareDetailsWrapper.classList.remove("view-only-hidden");
    if (this.createYourOwnCta) this.createYourOwnCta.style.display = "none";

    // Explicitly hide the first page of the share book initially
    if (this.shareBookFirstPage) {
      this.shareBookFirstPage.style.opacity = "0";
      this.shareBookFirstPage.style.pointerEvents = "none";
      // Also ensure the 'open' class is removed from the wrapper and model
      if (this.shareBookCoverWrapper)
        this.shareBookCoverWrapper.classList.remove("open");
      const shareBookModel = document.querySelector("#sharePage .book-model");
      if (shareBookModel) shareBookModel.classList.remove("open");
      this.isShareBookOpen = false; // Reset state
    }

    // Update book preview on share page with current customization
    this.displayBook(this.shareBookCoverFront, this.shareBookCoverInside);

    // Get the current note content - always use noteInput.value to preserve original formatting
    let currentNoteContent = "";
    if (this.noteInput) {
      currentNoteContent = this.noteInput.value;
    }

    // Debug logging
    console.log(
      "Share page - noteDisplay visible:",
      this.noteDisplay?.classList.contains("visible")
    );
    console.log(
      "Share page - noteDisplay content:",
      this.noteDisplay?.textContent
    );
    console.log("Share page - noteInput value:", this.noteInput?.value);
    console.log("Share page - final content:", currentNoteContent);

    const currentNoteFont = this.noteInput.style.fontFamily || "Caveat";

    // Preserve formatting in share display
    const formattedNote = currentNoteContent
      .replace(/\n/g, "<br>") // Convert newlines to <br> tags
      .replace(/\s{2,}/g, (match) => "&nbsp;".repeat(match.length)); // Preserve multiple spaces
    this.shareNoteDisplay.innerHTML = formattedNote;
    this.shareNoteDisplay.style.fontFamily = currentNoteFont;
    this.shareNoteDisplay.style.fontSize = this.noteInput.style.fontSize;
    this.shareNoteDisplay.classList.add("visible"); // Ensure it's visible

    // Open the book on share page if there's note content
    if (currentNoteContent.trim() !== "" && this.shareBookCoverWrapper) {
      this.shareBookCoverWrapper.classList.add("open");
      const shareBookModel = document.querySelector("#sharePage .book-model");
      if (shareBookModel) {
        shareBookModel.classList.add("open");
      }
      this.isShareBookOpen = true;

      // Force the first page to be visible
      if (this.shareBookFirstPage) {
        this.shareBookFirstPage.style.opacity = "1";
        this.shareBookFirstPage.style.pointerEvents = "auto";
      }
    }

    // Clear existing stickers on the share book preview
    const currentShareStickers =
      this.shareBookFirstPage.querySelectorAll(".sticker");
    currentShareStickers.forEach((sticker) => sticker.remove());

    // Re-add stickers to the share book preview
    this.stickers.forEach((sData) => {
      const sticker = document.createElement("div");
      sticker.className = "sticker";
      sticker.style.position = "absolute";
      sticker.innerHTML = `
                <span class="sticker-emoji" style="font-size: ${sData.fontSize}px;">${sData.emoji}</span>
            `;
      sticker.style.left = sData.left + "px"; // Ensure 'px' unit
      sticker.style.top = sData.top + "px"; // Ensure 'px' unit
      this.shareBookFirstPage.appendChild(sticker);
    });

    // Close any open sub-menus from the customization page
    this.fontSubMenu.classList.remove("visible");
    this.stickerSubMenu.classList.remove("visible");
  }

  openBook() {
    if (!this.isBookOpen && this.bookCoverWrapper) {
      this.bookCoverWrapper.classList.add("open");
      // Get the book-model element within bookDisplayArea
      const bookModel = document.querySelector("#bookDisplayArea .book-model");
      if (bookModel) {
        bookModel.classList.add("open");
      }
      this.isBookOpen = true;
    }
  }

  closeBook() {
    if (this.isBookOpen && this.bookCoverWrapper) {
      this.bookCoverWrapper.classList.remove("open");
      // Get the book-model element within bookDisplayArea
      const bookModel = document.querySelector("#bookDisplayArea .book-model");
      if (bookModel) {
        bookModel.classList.remove("open");
      }
      this.isBookOpen = false;
    }
  }

  toggleShareBook() {
    if (this.shareBookCoverWrapper) {
      // Check if we're on the share page and if there's note content
      const isOnSharePage =
        this.sharePage && this.sharePage.style.display === "flex";
      const hasNoteContent =
        this.shareNoteDisplay &&
        this.shareNoteDisplay.textContent.trim() !== "";

      // If on share page with note content, only allow opening, not closing
      if (isOnSharePage && hasNoteContent && this.isShareBookOpen) {
        // Don't allow closing - keep the book open
        return;
      }

      // Normal toggle behavior for other cases
      this.shareBookCoverWrapper.classList.toggle("open");
      // Get the book-model element within sharePage
      const shareBookModel = document.querySelector("#sharePage .book-model");
      if (shareBookModel) {
        shareBookModel.classList.toggle("open");
      }
      this.isShareBookOpen = !this.isShareBookOpen;
    }
  }

  closeShareBook() {
    if (this.isShareBookOpen && this.shareBookCoverWrapper) {
      this.shareBookCoverWrapper.classList.remove("open");
      // Get the book-model element within sharePage
      const shareBookModel = document.querySelector("#sharePage .book-model");
      if (shareBookModel) {
        shareBookModel.classList.remove("open");
      }
      this.isShareBookOpen = false;
    }
  }

  // Actual function to go back to search
  performBackToSearch() {
    console.log("performBackToSearch called.");
    // Clear selected book and note from local storage
    localStorage.removeItem("selectedBook");
    localStorage.removeItem("bookNote");
    this.selectedBook = null; // Also clear the instance
    console.log("Local storage and selectedBook cleared.");

    // Instantly hide the current book display area and show the main landing page
    if (this.bookDisplayArea) {
      this.bookDisplayArea.style.display = "none";
      console.log("bookDisplayArea display set to none.");
    }
    if (this.mainLandingPage) {
      this.mainLandingPage.style.display = "flex"; // Ensure it's flex for its internal layout
      console.log("mainLandingPage display set to flex.");
    }

    // Re-fetch top books for the landing page (showMainLandingPage already calls this)
    this.fetchTopBooks();
    console.log("fetchTopBooks called.");

    // Ensure the book on the customization page is closed visually (without animation)
    if (this.isBookOpen && this.bookCoverWrapper) {
      this.bookCoverWrapper.classList.remove("open");
      const bookModel = document.querySelector("#bookDisplayArea .book-model");
      if (bookModel) {
        bookModel.classList.remove("open");
      }
      this.isBookOpen = false;
      console.log("Book model closed.");
    }

    // Clear the note input and display
    if (this.noteInput) this.noteInput.value = "";
    if (this.noteDisplay) this.noteDisplay.textContent = "";
    if (this.noteDisplay) this.noteDisplay.classList.remove("visible");
    if (this.noteInput) this.noteInput.style.display = "block"; // Ensure input is visible for new notes
    console.log("Note and input cleared/reset.");

    // Clear all stickers from the customization page
    const currentStickersOnPage =
      this.bookFirstPage.querySelectorAll(".sticker");
    currentStickersOnPage.forEach((sticker) => sticker.remove());
    this.stickers = []; // Clear the stickers array
    console.log("Stickers cleared.");
  }

  // Notes and Stickers Functionality
  saveNote(note) {
    localStorage.setItem("bookNote", note);
    this.currentNoteContent = note; // Store in class property
    // Also update share page if we're on it
    if (this.sharePage && this.sharePage.style.display === "flex") {
      this.updateSharePageNote();
    }
  }

  showNoteDisplay(note) {
    if (this.noteDisplay && this.noteInput) {
      if (note.trim() === "") {
        // If note is empty, keep input visible
        this.noteInput.style.display = "block";
        this.noteDisplay.classList.remove("visible");
        this.noteDisplay.textContent = ""; // Clear display if no note
      } else {
        // If note has content, show display
        // Preserve formatting by using innerHTML with proper line break handling
        const formattedNote = note
          .replace(/\n/g, "<br>") // Convert newlines to <br> tags
          .replace(/\s{2,}/g, (match) => "&nbsp;".repeat(match.length)); // Preserve multiple spaces
        this.noteDisplay.innerHTML = formattedNote;
        this.noteDisplay.classList.add("visible");
        this.noteInput.style.display = "none";
      }

      // Update share page if we're on it
      if (this.sharePage && this.sharePage.style.display === "flex") {
        this.updateSharePageNote();
      }
    }
  }

  editNote() {
    if (this.noteInput) {
      // Convert HTML content back to plain text for the textarea
      if (this.noteDisplay && this.noteDisplay.classList.contains("visible")) {
        // Convert <br> tags back to newlines and &nbsp; back to spaces
        let plainText = this.noteDisplay.innerHTML
          .replace(/<br\s*\/?>/gi, "\n") // Convert <br> tags to newlines
          .replace(/&nbsp;/g, " ") // Convert &nbsp; back to spaces
          .replace(/<[^>]*>/g, ""); // Remove any other HTML tags
        this.noteInput.value = plainText;
      }
      this.noteInput.style.display = "block";
      this.noteInput.focus(); // Focus on input when editing
    }
    if (this.noteDisplay) this.noteDisplay.classList.remove("visible");
  }

  // New method to set font
  setFont(fontFamily) {
    if (this.noteInput) {
      this.noteInput.style.fontFamily = `'${fontFamily}'`;
    }
    if (this.noteDisplay) {
      this.noteDisplay.style.fontFamily = `'${fontFamily}'`;
    }
    if (this.shareNoteDisplay) {
      // Also update share page note display
      this.shareNoteDisplay.style.fontFamily = `'${fontFamily}'`;
    }

    // Update active state for font buttons
    this.fontButtons.forEach((button) => {
      if (button.dataset.font === fontFamily) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });
  }

  addSticker(emoji) {
    const sticker = document.createElement("div");
    sticker.className = "sticker";
    sticker.style.position = "absolute";
    sticker.innerHTML = `
            <span class="sticker-emoji">${emoji}</span>
            <button class="sticker-remove">✕</button>
            <button class="sticker-resize">⤢</button>
        `;

    // Append sticker first to get its rendered dimensions
    if (this.bookFirstPage) this.bookFirstPage.appendChild(sticker);

    // Calculate initial position to center it
    const parentRect = this.bookFirstPage.getBoundingClientRect();
    const stickerWidth = sticker.offsetWidth;
    const stickerHeight = sticker.offsetHeight;

    sticker.style.left = `${parentRect.width / 2 - stickerWidth / 2}px`;
    sticker.style.top = `${parentRect.height / 2 - stickerHeight / 2}px`;

    this.makeDraggable(sticker);
    this.makeResizable(sticker); // Directly call makeResizable here
    this.setupStickerControls(sticker); // This will only set up remove button now

    this.stickers.push({
      emoji: emoji,
      // Store position and size directly for persistence
      left: parseFloat(sticker.style.left),
      top: parseFloat(sticker.style.top),
      fontSize: parseFloat(
        window.getComputedStyle(sticker.querySelector(".sticker-emoji"))
          .fontSize
      ),
      element: sticker, // Keep reference to element for live manipulation
    });
    this.stickerSubMenu.classList.remove("visible"); // Close sticker menu after adding
  }

  makeDraggable(element) {
    let isDragging = false;
    let offsetX, offsetY; // Offset of mouse from element's top-left corner

    const dragHandler = (e) => {
      // Only prevent default if it's a drag, not a control click
      if (
        e.target.classList.contains("sticker-remove") ||
        e.target.classList.contains("sticker-resize")
      ) {
        return;
      }

      e.preventDefault();
      isDragging = true;
      element.classList.add("dragging");

      // Get the bounding rectangle of the sticker
      const rect = element.getBoundingClientRect();
      // Get the bounding rectangle of the parent (bookFirstPage)
      const parentRect = element.parentElement.getBoundingClientRect();

      let clientX, clientY;
      if (e.type === "mousedown") {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      // Calculate the offset of the mouse pointer relative to the sticker's current position
      // This ensures the sticker doesn't "jump" when dragging starts
      offsetX = clientX - rect.left;
      offsetY = clientY - rect.top;

      // Bind move and up events to document to handle dragging outside the element
      document.addEventListener("mousemove", moveHandler);
      document.addEventListener("touchmove", moveHandler);
      document.addEventListener("mouseup", stopHandler);
      document.addEventListener("touchend", stopHandler);
    };

    const moveHandler = (e) => {
      if (isDragging) {
        e.preventDefault();

        let clientX, clientY;
        if (e.type === "mousemove") {
          clientX = e.clientX;
          clientY = e.clientY;
        } else {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        }

        const parentRect = element.parentElement.getBoundingClientRect();
        const stickerWidth = element.offsetWidth;
        const stickerHeight = element.offsetHeight;

        // Calculate new position relative to the parent's top-left
        let newX = clientX - parentRect.left - offsetX;
        let newY = clientY - parentRect.top - offsetY;

        // Apply boundaries to keep sticker within parent
        newX = Math.max(0, Math.min(newX, parentRect.width - stickerWidth));
        newY = Math.max(0, Math.min(newY, parentRect.height - stickerHeight));

        element.style.left = `${newX}px`;
        element.style.top = `${newY}px`;

        // Update the stored position for persistence
        const stickerData = this.stickers.find((s) => s.element === element);
        if (stickerData) {
          stickerData.left = newX;
          stickerData.top = newY;
        }
      }
    };

    const stopHandler = () => {
      isDragging = false;
      element.classList.remove("dragging");
      document.removeEventListener("mousemove", moveHandler);
      document.removeEventListener("touchmove", moveHandler);
      document.removeEventListener("mouseup", stopHandler);
      document.removeEventListener("touchend", stopHandler);
    };

    element.addEventListener("mousedown", dragHandler);
    element.addEventListener("touchstart", dragHandler);
  }

  makeResizable(element) {
    const resizeBtn = element.querySelector(".sticker-resize");
    const stickerEmoji = element.querySelector(".sticker-emoji");
    let isResizing = false;
    let initialX, initialY; // Mouse/touch coordinates when resize starts
    let initialSize; // Initial font-size of the emoji

    if (!resizeBtn || !stickerEmoji) return;

    const resizeHandler = (e) => {
      e.stopPropagation(); // Prevent dragging the sticker itself
      e.preventDefault(); // Prevent default browser actions (e.g., text selection)

      isResizing = true;
      element.classList.add("resizing"); // Add a class for visual feedback if needed

      if (e.type === "mousedown") {
        initialX = e.clientX;
        initialY = e.clientY;
      } else {
        initialX = e.touches[0].clientX;
        initialY = e.touches[0].clientY;
      }

      initialSize = parseFloat(window.getComputedStyle(stickerEmoji).fontSize);

      document.addEventListener("mousemove", moveHandler);
      document.addEventListener("touchmove", moveHandler);
      document.addEventListener("mouseup", stopHandler);
      document.addEventListener("touchend", stopHandler);
    };

    const moveHandler = (e) => {
      if (!isResizing) return;
      e.preventDefault(); // Prevent scrolling on touch devices

      let clientX, clientY;
      if (e.type === "mousemove") {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      // Calculate change in position from initial point
      // We want to scale based on distance from the sticker's center or its top-left,
      // but for a bottom-right handle, it's simpler to use delta from initial mouse position.
      // The resize direction is diagonal (nwse-resize cursor).
      // Dragging right/down increases, dragging left/up decreases.

      const deltaX = clientX - initialX;
      const deltaY = clientY - initialY;

      // Combine deltas for diagonal resizing. A simple sum or average works for scaling.
      // Adjust sensitivity with a multiplier.
      const scaleFactor = (deltaX + deltaY) * 0.2;

      let newSize = initialSize + scaleFactor;

      // Apply minimum and maximum size constraints
      const minSize = 20; // Minimum font size
      const maxSize = 70; // Maximum font size
      newSize = Math.max(minSize, Math.min(newSize, maxSize));

      stickerEmoji.style.fontSize = `${newSize}px`;

      // Update the stored font size for persistence
      const stickerData = this.stickers.find((s) => s.element === element);
      if (stickerData) {
        stickerData.fontSize = newSize;
      }
    };

    const stopHandler = () => {
      isResizing = false;
      element.classList.remove("resizing");
      document.removeEventListener("mousemove", moveHandler);
      document.removeEventListener("touchmove", moveHandler);
      document.removeEventListener("mouseup", stopHandler);
      document.removeEventListener("touchend", stopHandler);
    };

    resizeBtn.addEventListener("mousedown", resizeHandler);
    resizeBtn.addEventListener("touchstart", resizeHandler);
  }

  setupStickerControls(sticker) {
    const removeBtn = sticker.querySelector(".sticker-remove");
    // The resizeBtn is now handled by makeResizable directly
    // const resizeBtn = sticker.querySelector('.sticker-resize');

    if (removeBtn)
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent drag from starting
        sticker.remove();
        this.stickers = this.stickers.filter((s) => s.element !== sticker);
      });
  }

  loadSavedData() {
    // Don't load saved note on page refresh - start with blank slate
    // Only load saved data if we're in view-only mode (shared link)
    if (this.isViewOnlyMode) {
      const savedNote = localStorage.getItem("bookNote");
      this.showNoteDisplay(savedNote || "");
    } else {
      // Clear any existing note data for fresh start
      this.clearNoteData();
    }
    // Set initial font to Caveat (or default)
    this.setFont("Caveat");
  }

  clearNoteData() {
    // Clear note from localStorage
    localStorage.removeItem("bookNote");
    // Clear note input and display
    if (this.noteInput) this.noteInput.value = "";
    if (this.noteDisplay) this.noteDisplay.textContent = "";
    if (this.noteDisplay) this.noteDisplay.classList.remove("visible");
    if (this.noteInput) this.noteInput.style.display = "block";
    // Clear class property
    this.currentNoteContent = "";

    // Clear stickers from the page
    if (this.bookFirstPage) {
      const currentStickers = this.bookFirstPage.querySelectorAll(".sticker");
      currentStickers.forEach((sticker) => sticker.remove());
    }
    this.stickers = []; // Clear the stickers array

    // Clear selected book from localStorage
    localStorage.removeItem("selectedBook");
    this.selectedBook = null;

    console.log("Note, sticker, and book data cleared for fresh start");
  }

  // Share functions (dummy implementations for email/social)
  sendEmail() {
    const subject = encodeURIComponent("Check out this book gift!");
    const body = encodeURIComponent(
      "I found a great book for you! Here is the link: " + window.location.href
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  shareSocial() {
    if (navigator.share) {
      navigator.share({
        title: "Book Gift",
        text: "Check out this personalized book gift!",
        url: window.location.href,
      });
    } else {
      console.log("Sharing not supported on this browser");
    }
  }

  async copyShareableLink() {
    if (!this.selectedBook) {
      console.error("No book selected to share.");
      alert("Please select a book first!");
      return;
    }

    const senderName = this.senderNameInput.value.trim();

    // Get the current note content with multiple fallbacks
    let noteContent = "";

    // First priority: input value (preserves original formatting)
    if (this.noteInput && this.noteInput.value.trim() !== "") {
      noteContent = this.noteInput.value;
    } else if (
      this.currentNoteContent &&
      this.currentNoteContent.trim() !== ""
    ) {
      // Second priority: class property
      noteContent = this.currentNoteContent;
    } else {
      // Last resort: localStorage
      noteContent = localStorage.getItem("bookNote") || "";
    }

    const noteFont = this.noteInput.style.fontFamily || "Caveat";

    // Debug logging for shareable link creation
    console.log(
      "Creating shareable link - class property content:",
      this.currentNoteContent
    );
    console.log(
      "Creating shareable link - noteDisplay visible:",
      this.noteDisplay?.classList.contains("visible")
    );
    console.log(
      "Creating shareable link - noteDisplay content:",
      this.noteDisplay?.textContent
    );
    console.log(
      "Creating shareable link - noteInput value:",
      this.noteInput?.value
    );
    console.log(
      "Creating shareable link - localStorage content:",
      localStorage.getItem("bookNote")
    );
    console.log("Creating shareable link - final note content:", noteContent);
    console.log(
      "Creating shareable link - note content length:",
      noteContent.length
    );

    // Prepare sticker data for saving (only necessary properties)
    const stickersToSave = this.stickers.map((s) => ({
      emoji: s.emoji,
      left: s.left,
      top: s.top,
      fontSize: s.fontSize,
    }));

    const customizationData = {
      book: this.selectedBook,
      note: noteContent,
      font: noteFont,
      stickers: stickersToSave, // Save simplified sticker data
      senderName: senderName,
      timestamp: new Date().toISOString(), // Save as ISO string for consistent sorting/parsing
    };

    try {
      // Check if Firebase is available and authenticated
      if (!this.auth.currentUser) {
        throw new Error("Firebase not authenticated");
      }

      // Save to Firestore
      // Collection path: /artifacts/{appId}/public/data/bookCustomizations
      const docRef = await addDoc(
        collection(
          this.db,
          `artifacts/${appId}/public/data/bookCustomizations`
        ),
        customizationData
      );
      const shareableLink = `${window.location.origin}${window.location.pathname}?view=${docRef.id}`;

      // Copy to clipboard using modern API
      try {
        await navigator.clipboard.writeText(shareableLink);
      } catch (err) {
        // Fallback for older browsers
        const dummyElement = document.createElement("textarea");
        dummyElement.value = shareableLink;
        document.body.appendChild(dummyElement);
        dummyElement.select();
        document.execCommand("copy");
        document.body.removeChild(dummyElement);
      }

      // Show tooltip
      if (this.copyTooltip) {
        this.copyTooltip.classList.add("show");
        setTimeout(() => {
          this.copyTooltip.classList.remove("show");
        }, 2000); // Show for 2 seconds
      }

      console.log("Shareable link copied to clipboard:", shareableLink);

      // Clear note data after successful sharing
      this.clearNoteData();
    } catch (error) {
      console.error("Error saving customization or copying link:", error);

      // Fallback: Save to localStorage and create a local shareable link
      try {
        const localId = crypto.randomUUID();
        const localData = {
          ...customizationData,
          id: localId,
          local: true,
        };
        localStorage.setItem(
          `bookCustomization_${localId}`,
          JSON.stringify(localData)
        );

        const localShareableLink = `${window.location.origin}${window.location.pathname}?view=${localId}&local=true`;

        // Copy local link to clipboard
        try {
          await navigator.clipboard.writeText(localShareableLink);
        } catch (err) {
          const dummyElement = document.createElement("textarea");
          dummyElement.value = localShareableLink;
          document.body.appendChild(dummyElement);
          dummyElement.select();
          document.execCommand("copy");
          document.body.removeChild(dummyElement);
        }

        console.log(
          "Local shareable link copied to clipboard:",
          localShareableLink
        );

        // Show tooltip for local link too
        if (this.copyTooltip) {
          this.copyTooltip.classList.add("show");
          setTimeout(() => {
            this.copyTooltip.classList.remove("show");
          }, 2000); // Show for 2 seconds
        }

        // Clear note data after successful local sharing
        this.clearNoteData();

        // Tooltip is already shown above, no need for additional notification
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        // Just log the error, tooltip already shows success when it works
      }
    }
  }

  async loadViewOnlyBook(viewId) {
    // Hide all other pages
    this.mainLandingPage.style.display = "none";
    this.bookDisplayArea.style.display = "none";
    this.sharePage.style.display = "flex"; // Show the share page for view-only

    // Hide original share page heading and controls
    if (this.sharePageOriginalHeading)
      this.sharePageOriginalHeading.style.display = "none";
    if (this.shareDetailsWrapper)
      this.shareDetailsWrapper.style.display = "none";
    // Hide back to editing link in view-only mode since users shouldn't be able to edit shared content
    if (this.backToEditingLink) this.backToEditingLink.style.display = "none";

    // Show view-only heading and CTA
    if (this.viewOnlyHeading) this.viewOnlyHeading.style.display = "block";
    if (this.createYourOwnCta) this.createYourOwnCta.style.display = "flex";

    // Check if this is a local view (from localStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const isLocal = urlParams.get("local") === "true";

    let data = null;

    if (isLocal) {
      // Load from localStorage
      try {
        const localData = localStorage.getItem(`bookCustomization_${viewId}`);
        if (localData) {
          data = JSON.parse(localData);
          console.log("Loaded from localStorage:", data);
        } else {
          throw new Error("Local data not found");
        }
      } catch (error) {
        console.error("Error loading local data:", error);
        this.showErrorPage("Book not found in local storage.");
        return;
      }
    } else {
      // Try to load from Firebase
      try {
        if (!this.auth.currentUser) {
          throw new Error("Firebase not authenticated");
        }

        const docRef = doc(
          this.db,
          `artifacts/${appId}/public/data/bookCustomizations`,
          viewId
        );
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          data = docSnap.data();
          console.log("Loaded from Firebase:", data);
        } else {
          throw new Error("Document not found in Firebase");
        }
      } catch (error) {
        console.error("Error loading from Firebase:", error);
        this.showErrorPage("Book not found or Firebase unavailable.");
        return;
      }
    }

    if (data) {
      this.selectedBook = data.book;
      const noteContent = data.note;
      const noteFont = data.font;
      const stickersData = data.stickers || [];
      const senderName = data.senderName || "Someone";

      // Set the view-only heading
      if (this.viewOnlyHeading) {
        this.viewOnlyHeading.innerHTML = `
                        <span style="color: #A0522D;">${senderName}</span> has sent you a book recommendation, <br>
                        tap to see what's inside!
                    `;
      }

      // Display the book cover on the share page preview
      this.displayBook(this.shareBookCoverFront, this.shareBookCoverInside);

      // Set note content and font
      if (this.shareNoteDisplay) {
        // Preserve formatting in view-only display
        const formattedNote = noteContent
          .replace(/\n/g, "<br>") // Convert newlines to <br> tags
          .replace(/\s{2,}/g, (match) => "&nbsp;".repeat(match.length)); // Preserve multiple spaces
        this.shareNoteDisplay.innerHTML = formattedNote;
        this.shareNoteDisplay.style.fontFamily = noteFont;
        this.shareNoteDisplay.classList.add("visible");
      }

      // Clear any existing stickers from previous views
      const currentShareStickers =
        this.shareBookFirstPage.querySelectorAll(".sticker");
      currentShareStickers.forEach((sticker) => sticker.remove());

      // Recreate stickers for view-only display
      stickersData.forEach((sData) => {
        const sticker = document.createElement("div");
        sticker.className = "sticker";
        sticker.style.position = "absolute";
        sticker.innerHTML = `
                        <span class="sticker-emoji" style="font-size: ${sData.fontSize}px;">${sData.emoji}</span>
                    `;
        sticker.style.left = `${sData.left}px`;
        sticker.style.top = `${sData.top}px`;
        // No drag/resize for view-only stickers
        this.shareBookFirstPage.appendChild(sticker);
      });

      // Automatically open the book
      setTimeout(() => {
        this.toggleShareBook(); // Open the book on the share page
      }, 500);
    } else {
      console.error("No such document for view ID:", viewId);
      if (this.viewOnlyHeading)
        this.viewOnlyHeading.textContent =
          "Oops! This book recommendation could not be found.";
    }
  }

  // Error page display method
  showErrorPage(message) {
    // Hide all other pages
    this.mainLandingPage.style.display = "none";
    this.bookDisplayArea.style.display = "none";
    this.sharePage.style.display = "flex";

    // Show error message
    if (this.viewOnlyHeading) {
      this.viewOnlyHeading.innerHTML = `
        <div style="text-align: center; color: #666; padding: 20px;">
          <h3>Oops!</h3>
          <p>${message}</p>
          <button onclick="window.history.back()" style="margin-top: 20px; padding: 10px 20px; background: #A0522D; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Go Back
          </button>
        </div>
      `;
    }
  }

  // Update share page note content
  updateSharePageNote() {
    if (this.shareNoteDisplay) {
      let currentNoteContent = "";
      // Always use noteInput.value to preserve original formatting
      if (this.noteInput) {
        currentNoteContent = this.noteInput.value;
      }

      // Preserve formatting in share display as well
      const formattedNote = currentNoteContent
        .replace(/\n/g, "<br>") // Convert newlines to <br> tags
        .replace(/\s{2,}/g, (match) => "&nbsp;".repeat(match.length)); // Preserve multiple spaces
      this.shareNoteDisplay.innerHTML = formattedNote;
      this.shareNoteDisplay.style.fontFamily =
        this.noteInput.style.fontFamily || "Caveat";
      this.shareNoteDisplay.classList.add("visible");

      // Force visibility with inline styles as backup
      this.shareNoteDisplay.style.display = "block";
      this.shareNoteDisplay.style.color = "#5d4e37";
      this.shareNoteDisplay.style.fontSize = "20px";
      this.shareNoteDisplay.style.lineHeight = "1.6";

      // Debug logging for share page note display
      console.log(
        "Share page note display - text content:",
        this.shareNoteDisplay.textContent
      );
      console.log(
        "Share page note display - has visible class:",
        this.shareNoteDisplay.classList.contains("visible")
      );
      console.log(
        "Share page note display - computed display:",
        window.getComputedStyle(this.shareNoteDisplay).display
      );

      // Ensure the share page book is opened to show the note content
      if (this.shareBookCoverWrapper && currentNoteContent.trim() !== "") {
        this.shareBookCoverWrapper.classList.add("open");
        const shareBookModel = document.querySelector("#sharePage .book-model");
        if (shareBookModel) {
          shareBookModel.classList.add("open");
        }
        this.isShareBookOpen = true;

        // Force the first page to be visible
        if (this.shareBookFirstPage) {
          this.shareBookFirstPage.style.opacity = "1";
          this.shareBookFirstPage.style.pointerEvents = "auto";
        }
      }
    }
  }

  // Event Listeners Setup
  setupEventListeners() {
    // Helper to safely add event listeners
    const addListener = (element, event, handler) => {
      if (element) {
        element.addEventListener(event, handler);
      }
    };

    // Search functionality
    addListener(this.searchInput, "input", () => this.handleSearchInput()); // Use 'input' for dynamic search
    addListener(this.clearSearchBtn, "click", () => this.clearSearch());

    // Book interaction (Customization Page)
    addListener(this.bookCoverFront, "click", () => this.openBook());

    // Note input (auto-save/display)
    addListener(this.noteInput, "input", () =>
      this.saveNote(this.noteInput.value)
    );
    addListener(this.noteInput, "blur", () =>
      this.showNoteDisplay(this.noteInput.value)
    ); // Show display on blur
    addListener(this.noteDisplay, "click", () => this.editNote()); // Click display to edit

    // Floating Menu Main Buttons (hidden in view-only mode)
    if (!this.isViewOnlyMode) {
      addListener(this.fontMenuBtn, "click", (e) => {
        e.stopPropagation(); // Prevent document click from immediately closing
        this.toggleSubMenu(this.fontSubMenu);
      });
      addListener(this.stickerMenuBtn, "click", (e) => {
        e.stopPropagation(); // Prevent document click from immediately closing
        this.toggleSubMenu(this.stickerSubMenu);
      });
      addListener(this.shareMenuBtn, "click", (e) => {
        e.stopPropagation(); // Prevent document click from immediately closing
        this.showSharePage(); // Direct to share page
      });

      // Sticker buttons
      this.stickerButtons.forEach((btn) => {
        addListener(btn, "click", () => this.addSticker(btn.dataset.sticker));
      });

      // Font selection buttons
      this.fontButtons.forEach((button) => {
        addListener(button, "click", (e) => {
          this.setFont(e.target.dataset.font);
          this.fontSubMenu.classList.remove("visible"); // Close font menu after selection
        });
      });
    } else {
      // Hide customization controls if in view-only mode
      document
        .querySelectorAll(
          ".floating-menu, .customization-heading, .customization-subheading, .back-to-selection-nav"
        )
        .forEach((el) => {
          if (el) el.classList.add("view-only-hidden");
        });
      // Hide sender name input and copy button on share page in view-only mode
      if (this.shareDetailsWrapper)
        this.shareDetailsWrapper.classList.add("view-only-hidden");
      if (this.sharePageOriginalHeading)
        this.sharePageOriginalHeading.classList.add("view-only-hidden");
    }

    // Back to Book Selection navigation button
    addListener(this.backToSelectionLink, "click", (e) => {
      e.preventDefault();
      this.performBackToSearch();
    });

    // Share Page Navigation (back to editing)
    addListener(this.backToEditingLink, "click", (e) => {
      e.preventDefault();
      this.showBookDisplayArea();
    });

    // Create Your Own CTA Button (only in view-only mode)
    addListener(this.createYourOwnBtn, "click", (e) => {
      e.preventDefault();
      // Clear any URL parameters to go to the home page
      window.history.replaceState({}, document.title, window.location.pathname);
      // Show the main landing page
      this.showMainLandingPage();
      // Reset view-only mode
      this.isViewOnlyMode = false;
    });

    // Share Page Book Interaction - disabled to prevent closing
    // The book should stay open on share page to show note content
    // addListener(this.shareBookCoverFront, "click", () => this.toggleShareBook());
    // addListener(this.shareBookCoverInside, "click", () => this.toggleShareBook());
    // addListener(this.shareBookFirstPage, "click", () => this.toggleShareBook());

    // Close sub-menus when clicking outside (only relevant in customization mode)
    if (!this.isViewOnlyMode) {
      addListener(document, "click", (e) => {
        // Check if the click target is NOT one of the main menu buttons
        const isMainMenuButton = e.target.closest(".main-menu-btn");
        // Check if the click target is NOT inside any of the sub-menus
        const isInsideSubMenu = e.target.closest(".sub-menu");

        if (!isMainMenuButton && !isInsideSubMenu) {
          this.fontSubMenu.classList.remove("visible");
          this.stickerSubMenu.classList.remove("visible");
        }
      });
    }

    // Load saved note and stickers (only in customization mode)
    if (!this.isViewOnlyMode) {
      this.loadSavedData();
    }
  }
}

export { BookApp };
