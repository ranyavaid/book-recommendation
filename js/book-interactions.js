// Book Interactions and Navigation
export function setupBookInteractions(bookApp) {
  // New methods to toggle visibility of main landing page, book display area, and share page
  bookApp.showMainLandingPage = function () {
    if (this.mainLandingPage) this.mainLandingPage.style.display = "flex";
    if (this.bookDisplayArea) this.bookDisplayArea.style.display = "none";
    if (this.sharePage) this.sharePage.style.display = "none";
    this.fetchTopBooks(); // Ensure top books are fetched when returning to landing page
  };

  bookApp.showBookDisplayArea = function () {
    if (this.mainLandingPage) this.mainLandingPage.style.display = "none";
    if (this.bookDisplayArea) this.bookDisplayArea.style.display = "flex";
    if (this.sharePage) this.sharePage.style.display = "none";
    this.closeShareBook(); // Ensure share page book is closed when returning
  };

  bookApp.showSharePage = function () {
    if (this.mainLandingPage) this.mainLandingPage.style.display = "none";
    if (this.bookDisplayArea) this.bookDisplayArea.style.display = "none";
    if (this.sharePage) this.sharePage.style.display = "flex";

    // Reset share page visibility elements
    if (this.viewOnlyHeading) this.viewOnlyHeading.style.display = "none";
    if (this.sharePageOriginalHeading)
      this.sharePageOriginalHeading.style.display = "block";
    if (this.shareDetailsWrapper)
      this.shareDetailsWrapper.classList.remove("view-only-hidden");

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
    // Preserve formatting in share display - always use noteInput.value
    const formattedNote = this.noteInput.value
      .replace(/\n/g, "<br>") // Convert newlines to <br> tags
      .replace(/\s{2,}/g, (match) => "&nbsp;".repeat(match.length)); // Preserve multiple spaces
    this.shareNoteDisplay.innerHTML = formattedNote;
    this.shareNoteDisplay.style.fontFamily = this.noteInput.style.fontFamily;
    this.shareNoteDisplay.style.fontSize = this.noteInput.style.fontSize;
    this.shareNoteDisplay.classList.add("visible"); // Ensure it's visible

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
  };

  bookApp.openBook = function () {
    if (!this.isBookOpen && this.bookCoverWrapper) {
      this.bookCoverWrapper.classList.add("open");
      // Get the book-model element within bookDisplayArea
      const bookModel = document.querySelector("#bookDisplayArea .book-model");
      if (bookModel) {
        bookModel.classList.add("open");
      }
      this.isBookOpen = true;
    }
  };

  bookApp.closeBook = function () {
    if (this.isBookOpen && this.bookCoverWrapper) {
      this.bookCoverWrapper.classList.remove("open");
      // Get the book-model element within bookDisplayArea
      const bookModel = document.querySelector("#bookDisplayArea .book-model");
      if (bookModel) {
        bookModel.classList.remove("open");
      }
      this.isBookOpen = false;
    }
  };

  bookApp.toggleShareBook = function () {
    if (this.shareBookCoverWrapper) {
      this.shareBookCoverWrapper.classList.toggle("open");
      // Get the book-model element within sharePage
      const shareBookModel = document.querySelector("#sharePage .book-model");
      if (shareBookModel) {
        shareBookModel.classList.toggle("open");
      }
      this.isShareBookOpen = !this.isShareBookOpen;
    }
  };

  bookApp.closeShareBook = function () {
    if (this.isShareBookOpen && this.shareBookCoverWrapper) {
      this.shareBookCoverWrapper.classList.remove("open");
      // Get the book-model element within sharePage
      const shareBookModel = document.querySelector("#sharePage .book-model");
      if (shareBookModel) {
        shareBookModel.classList.remove("open");
      }
      this.isShareBookOpen = false;
    }
  };

  // Actual function to go back to search
  bookApp.performBackToSearch = function () {
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
  };
}
