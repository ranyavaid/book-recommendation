// Notes and Stickers Functionality
export function setupNotesAndStickers(bookApp) {
  bookApp.saveNote = function (note) {
    localStorage.setItem("bookNote", note);
  };

  bookApp.showNoteDisplay = function (note) {
    if (this.noteDisplay && this.noteInput) {
      if (note.trim() === "") {
        // If note is empty, keep input visible
        this.noteInput.style.display = "block";
        this.noteDisplay.classList.remove("visible");
        this.noteDisplay.textContent = ""; // Clear display if no note
      } else {
        // If note has content, show display
        this.noteDisplay.textContent = note;
        this.noteDisplay.classList.add("visible");
        this.noteInput.style.display = "none";
      }
    }
  };

  bookApp.editNote = function () {
    if (this.noteInput) {
      this.noteInput.style.display = "block";
      this.noteInput.focus(); // Focus on input when editing
    }
    if (this.noteDisplay) this.noteDisplay.classList.remove("visible");
  };

  // New method to set font
  bookApp.setFont = function (fontFamily) {
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
  };

  bookApp.addSticker = function (emoji) {
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
  };

  bookApp.makeDraggable = function (element) {
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
  };

  bookApp.makeResizable = function (element) {
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
  };

  bookApp.setupStickerControls = function (sticker) {
    const removeBtn = sticker.querySelector(".sticker-remove");
    // The resizeBtn is now handled by makeResizable directly
    // const resizeBtn = sticker.querySelector('.sticker-resize');

    if (removeBtn)
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent drag from starting
        sticker.remove();
        this.stickers = this.stickers.filter((s) => s.element !== sticker);
      });
  };

  bookApp.loadSavedData = function () {
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
  };

  bookApp.clearNoteData = function () {
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
  };
}
