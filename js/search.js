// Search and Book Display Logic
export function setupSearchFunctionality(bookApp) {
    // --- Sub-menu toggle logic ---
    bookApp.toggleSubMenu = function(targetSubMenu) {
        // Close all other sub-menus
        [this.fontSubMenu, this.stickerSubMenu].forEach(menu => { // Only close font and sticker menus
            if (menu !== targetSubMenu && menu.classList.contains('visible')) {
                menu.classList.remove('visible');
            }
        });
        // Toggle visibility of the target sub-menu
        targetSubMenu.classList.toggle('visible');
    };

    // --- Search and Book Display Logic ---
    bookApp.handleSearchInput = function() {
        clearTimeout(this.searchTimeout); // Clear previous timeout
        const query = this.searchInput.value.trim();
        if (query.length > 0) {
            if (this.clearSearchBtn) this.clearSearchBtn.style.display = 'block'; // Show clear button
            this.searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 500); // Debounce for 500ms
        } else {
            if (this.clearSearchBtn) this.clearSearchBtn.style.display = 'none'; // Hide clear button
            this.clearSearch(); // Clear results and show top books if input is empty
        }
    };

    bookApp.clearSearch = function() {
        if (this.searchInput) this.searchInput.value = '';
        if (this.clearSearchBtn) this.clearSearchBtn.style.display = 'none';
        if (this.bookListTitle) this.bookListTitle.textContent = 'Top Recommended Books';
        this.fetchTopBooks(); // Reload top books
    };

    bookApp.performSearch = async function(query) {
        if (this.bookListTitle) this.bookListTitle.textContent = 'Searching...';
        if (this.bookDisplayGrid) this.bookDisplayGrid.innerHTML = `<p class="loading-indicator">Searching for books...</p>`;
        const apiKey = "";
        const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&key=${apiKey}`; // Fetch more results for search

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const items = data.items || [];
            this.displayBooks(items);
            if (this.bookListTitle) this.bookListTitle.textContent = `${items.length} results found`;
        } catch (error) {
            console.error("Error fetching books:", error);
            if (this.bookDisplayGrid) this.bookDisplayGrid.innerHTML = `<p class="text-red-500 p-4 text-center">Failed to load search results. Please try again.</p>`;
            if (this.bookListTitle) this.bookListTitle.textContent = 'Search Failed';
        }
    };

    bookApp.fetchTopBooks = async function() {
        if (this.bookListTitle) this.bookListTitle.textContent = 'Top Recommended Books';
        if (this.bookDisplayGrid) this.bookDisplayGrid.innerHTML = `<p class="loading-indicator">Loading top books...</p>`;
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
            if (this.bookDisplayGrid) this.bookDisplayGrid.innerHTML = `<p class="text-red-500 p-4 text-center">Failed to load top books. Please try again.</p>`;
        }
    };

    bookApp.displayBooks = function(items) {
        if (this.bookDisplayGrid) this.bookDisplayGrid.innerHTML = ''; // Clear existing content
        if (items.length > 0) {
            items.forEach(item => {
                const volumeInfo = item.volumeInfo;
                const title = volumeInfo.title || 'No Title';
                const authors = volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author';
                // Prioritize extraLarge, then large, then medium, then thumbnail for higher resolution
                const coverUrl = volumeInfo.imageLinks ? (
                    volumeInfo.imageLinks.extraLarge ||
                    volumeInfo.imageLinks.large ||
                    volumeInfo.imageLinks.medium ||
                    volumeInfo.imageLinks.thumbnail
                ) : 'https://placehold.co/120x180/cccccc/ffffff?text=No+Cover';

                const book = {
                    id: item.id,
                    title: title,
                    author: authors,
                    coverUrl: coverUrl
                };

                const bookItem = document.createElement('div');
                bookItem.className = 'search-result-item'; // Reusing existing styling for grid items

                bookItem.innerHTML = `
                    <img src="${book.coverUrl}" alt="${book.title} cover" onerror="this.onerror=null;this.src='https://placehold.co/120x180/cccccc/ffffff?text=No+Cover';">
                    <div class="search-result-info">
                        <h4>${book.title}</h4>
                        <p>by ${book.author}</p>
                    </div>
                `;
                bookItem.addEventListener('click', () => this.selectBook(book));
                if (this.bookDisplayGrid) this.bookDisplayGrid.appendChild(bookItem);
            });
        } else {
            if (this.bookDisplayGrid) this.bookDisplayGrid.innerHTML = `<p class="text-gray-600 p-4 text-center">No books found.</p>`;
            // If no search results, restore "Top Recommended Books" title
            if (this.searchInput && this.searchInput.value.trim() !== '') {
                if (this.bookListTitle) this.bookListTitle.textContent = '0 results found';
            } else {
                if (this.bookListTitle) this.bookListTitle.textContent = 'Top Recommended Books';
            }
        }
    };

    bookApp.selectBook = function(book) {
        this.selectedBook = book;
        localStorage.setItem('selectedBook', JSON.stringify(book)); // Save selected book
        this.displayBook(this.bookCoverFront, this.bookCoverInside); // Display on customization page
        this.showBookDisplayArea(); // Show the book customization area
        // Auto-open the book once selected, after a slight delay for visual transition
        setTimeout(() => {
            this.openBook();
        }, 300);
    };

    bookApp.loadBookData = function() {
        const bookData = localStorage.getItem('selectedBook');
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
    };

    // Reusable function to display book cover on a given element
    bookApp.displayBook = function(frontCoverElement, insideCoverElement) {
        if (!frontCoverElement) {
            console.warn("frontCoverElement is null or undefined.");
            return;
        }

        // Define a default placeholder URL
        const defaultPlaceholderUrl = 'https://placehold.co/300x450/8B7355/ffffff?text=No+Cover';
        let imageUrl = defaultPlaceholderUrl; // Start with the default
        let imageAlt = 'No Cover Available';

        // If a book is selected and it.selectedBook has a coverUrl, use it
        if (this.selectedBook && this.selectedBook.coverUrl) {
            imageUrl = this.selectedBook.coverUrl;
            imageAlt = `${this.selectedBook.title} cover`;
        }

        // Log the URL being set for debugging
        console.log(`Attempting to load cover image: ${imageUrl} for element:`, frontCoverElement.id);

        // Set the front cover using the determined imageUrl
        frontCoverElement.innerHTML = `
            <img src="${imageUrl}" alt="${imageAlt}" onerror="this.onerror=null;this.src='${defaultPlaceholderUrl}';">
        `;

        // Set the background image for the inside cover
        if (insideCoverElement) {
            insideCoverElement.style.backgroundImage = `url('${imageUrl}')`;
            // No need to clear innerHTML, as we are using background-image
        }
    };
} 