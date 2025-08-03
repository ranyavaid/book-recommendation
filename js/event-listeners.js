// Event Listeners Setup
export function setupEventListeners(bookApp) {
    // Helper to safely add event listeners
    const addListener = (element, event, handler) => {
        if (element) {
            element.addEventListener(event, handler);
        }
    };

    // Search functionality
    addListener(bookApp.searchInput, 'input', () => bookApp.handleSearchInput()); // Use 'input' for dynamic search
    addListener(bookApp.clearSearchBtn, 'click', () => bookApp.clearSearch());

    // Book interaction (Customization Page)
    addListener(bookApp.bookCoverFront, 'click', () => bookApp.openBook());

    // Note input (auto-save/display)
    addListener(bookApp.noteInput, 'input', () => bookApp.saveNote(bookApp.noteInput.value));
    addListener(bookApp.noteInput, 'blur', () => bookApp.showNoteDisplay(bookApp.noteInput.value)); // Show display on blur
    addListener(bookApp.noteDisplay, 'click', () => bookApp.editNote()); // Click display to edit

    // Floating Menu Main Buttons (hidden in view-only mode)
    if (!bookApp.isViewOnlyMode) {
        addListener(bookApp.fontMenuBtn, 'click', (e) => {
            e.stopPropagation(); // Prevent document click from immediately closing
            bookApp.toggleSubMenu(bookApp.fontSubMenu);
        });
        addListener(bookApp.stickerMenuBtn, 'click', (e) => {
            e.stopPropagation(); // Prevent document click from immediately closing
            bookApp.toggleSubMenu(bookApp.stickerSubMenu);
        });
        addListener(bookApp.shareMenuBtn, 'click', (e) => {
            e.stopPropagation(); // Prevent document click from immediately closing
            bookApp.showSharePage(); // Direct to share page
        });

        // Sticker buttons
        bookApp.stickerButtons.forEach(btn => {
            addListener(btn, 'click', () => bookApp.addSticker(btn.dataset.sticker));
        });

        // Font selection buttons
        bookApp.fontButtons.forEach(button => {
            addListener(button, 'click', (e) => {
                bookApp.setFont(e.target.dataset.font);
                bookApp.fontSubMenu.classList.remove('visible'); // Close font menu after selection
            });
        });
    } else {
        // Hide customization controls if in view-only mode
        document.querySelectorAll('.floating-menu, .customization-heading, .customization-subheading, .back-to-selection-nav').forEach(el => {
            if (el) el.classList.add('view-only-hidden');
        });
        // Hide sender name input and copy button on share page in view-only mode
        if (bookApp.shareDetailsWrapper) bookApp.shareDetailsWrapper.classList.add('view-only-hidden');
        if (bookApp.sharePageOriginalHeading) bookApp.sharePageOriginalHeading.classList.add('view-only-hidden');
    }

    // Back to Book Selection navigation button
    addListener(bookApp.backToSelectionLink, 'click', (e) => {
        e.preventDefault();
        bookApp.performBackToSearch();
    });

    // Share Page Navigation (back to editing)
    addListener(bookApp.backToEditingLink, 'click', (e) => {
        e.preventDefault();
        bookApp.showBookDisplayArea();
    });

    // Share Page Book Interaction (always active)
    addListener(bookApp.shareBookCoverFront, 'click', () => bookApp.toggleShareBook()); // This correctly maps to the share page book
    addListener(bookApp.shareBookCoverInside, 'click', () => bookApp.toggleShareBook()); // Also allow tapping inside cover
    addListener(bookApp.shareBookFirstPage, 'click', () => bookApp.toggleShareBook()); // Added tap for first page

    // Close sub-menus when clicking outside (only relevant in customization mode)
    if (!bookApp.isViewOnlyMode) {
        addListener(document, 'click', (e) => {
            // Check if the click target is NOT one of the main menu buttons
            const isMainMenuButton = e.target.closest('.main-menu-btn');
            // Check if the click target is NOT inside any of the sub-menus
            const isInsideSubMenu = e.target.closest('.sub-menu');

            if (!isMainMenuButton && !isInsideSubMenu) {
                bookApp.fontSubMenu.classList.remove('visible');
                bookApp.stickerSubMenu.classList.remove('visible');
            }
        });
    }

    // Load saved note and stickers (only in customization mode)
    if (!bookApp.isViewOnlyMode) {
        bookApp.loadSavedData();
    }
} 