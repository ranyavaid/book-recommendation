// Sharing Functionality
export function setupSharing(bookApp) {
    // Share functions (dummy implementations for email/social)
    bookApp.sendEmail = function() {
        const subject = encodeURIComponent('Check out this book gift!');
        const body = encodeURIComponent('I found a great book for you! Here is the link: ' + window.location.href);
        window.open(`mailto:?subject=${subject}&body=${body}`);
    };

    bookApp.shareSocial = function() {
        if (navigator.share) {
            navigator.share({
                title: 'Book Gift',
                text: 'Check out this personalized book gift!',
                url: window.location.href
            });
        } else {
            console.log('Sharing not supported on this browser');
        }
    };

    bookApp.copyShareableLink = async function() {
        if (!this.selectedBook) {
            console.error("No book selected to share.");
            alert("Please select a book first!");
            return;
        }

        const senderName = this.senderNameInput.value.trim();
        const noteContent = this.noteInput.value;
        const noteFont = this.noteInput.style.fontFamily || 'Caveat';

        // Prepare sticker data for saving (only necessary properties)
        const stickersToSave = this.stickers.map(s => ({
            emoji: s.emoji,
            left: s.left,
            top: s.top,
            fontSize: s.fontSize
        }));

        const customizationData = {
            book: this.selectedBook,
            note: noteContent,
            font: noteFont,
            stickers: stickersToSave, // Save simplified sticker data
            senderName: senderName,
            timestamp: new Date().toISOString() // Save as ISO string for consistent sorting/parsing
        };

        try {
            // Save to Firestore
            // Collection path: /artifacts/{appId}/public/data/bookCustomizations
            const docRef = await addDoc(collection(this.db, `artifacts/${appId}/public/data/bookCustomizations`), customizationData);
            const shareableLink = `${window.location.origin}${window.location.pathname}?view=${docRef.id}`;

            // Copy to clipboard using modern API
            try {
                await navigator.clipboard.writeText(shareableLink);
            } catch (err) {
                // Fallback for older browsers
                const dummyElement = document.createElement('textarea');
                dummyElement.value = shareableLink;
                document.body.appendChild(dummyElement);
                dummyElement.select();
                document.execCommand('copy');
                document.body.removeChild(dummyElement);
            }

            // Show tooltip
            if (this.copyTooltip) {
                this.copyTooltip.classList.add('show');
                setTimeout(() => {
                    this.copyTooltip.classList.remove('show');
                }, 2000); // Show for 2 seconds
            }

            console.log('Shareable link copied to clipboard:', shareableLink);
        } catch (error) {
            console.error("Error saving customization or copying link:", error);
            alert("Failed to generate shareable link. Please try again.");
        }
    };

    bookApp.loadViewOnlyBook = async function(viewId) {
        // Hide all other pages
        this.mainLandingPage.style.display = 'none';
        this.bookDisplayArea.style.display = 'none';
        this.sharePage.style.display = 'flex'; // Show the share page for view-only

        // Hide original share page heading and controls
        if (this.sharePageOriginalHeading) this.sharePageOriginalHeading.style.display = 'none';
        if (this.shareDetailsWrapper) this.shareDetailsWrapper.style.display = 'none';
        // The back to editing link is still useful in view-only mode to go back to customization.
        // if (this.backToEditingLink) this.backToEditingLink.style.display = 'none'; // Hide back to editing

        // Show view-only heading
        if (this.viewOnlyHeading) this.viewOnlyHeading.style.display = 'block';

        try {
            const docRef = doc(this.db, `artifacts/${appId}/public/data/bookCustomizations`, viewId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                this.selectedBook = data.book;
                const noteContent = data.note;
                const noteFont = data.font;
                const stickersData = data.stickers || [];
                const senderName = data.senderName || 'Someone';

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
                    this.shareNoteDisplay.textContent = noteContent;
                    this.shareNoteDisplay.style.fontFamily = noteFont;
                    this.shareNoteDisplay.classList.add('visible');
                }

                // Clear any existing stickers from previous views
                const currentShareStickers = this.shareBookFirstPage.querySelectorAll('.sticker');
                currentShareStickers.forEach(sticker => sticker.remove());

                // Recreate stickers for view-only display
                stickersData.forEach(sData => {
                    const sticker = document.createElement('div');
                    sticker.className = 'sticker';
                    sticker.style.position = 'absolute';
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
                if (this.viewOnlyHeading) this.viewOnlyHeading.textContent = "Oops! This book recommendation could not be found.";
            }
        } catch (error) {
            console.error("Error fetching view-only book:", error);
            if (this.viewOnlyHeading) this.viewOnlyHeading.textContent = "Error loading book recommendation. Please try again later.";
        }
    };
} 