// gallery-layout.js

document.addEventListener("DOMContentLoaded", function () {
    const galleryContainer = document.querySelector('.photo-grid');
    const photos = Array.from(galleryContainer.querySelectorAll('.photo'));

    // Adjustable Parameters
    const targetRowHeight = 400; // Desired height for rows in pixels
    const margin = 10; // Space between photos in pixels

    // Function to preload images and get their natural dimensions
    function preloadImages(photos) {
        const promises = photos.map(photo => {
            return new Promise((resolve) => {
                const img = photo.querySelector('img');
                if (!img.complete) {
                    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
                    img.onerror = () => {
                        console.error(`Failed to load image: ${img.src}`);
                        // Assign default dimensions if image fails to load
                        resolve({ width: 1, height: 1 });
                    };
                } else {
                    resolve({ width: img.naturalWidth, height: img.naturalHeight });
                }
            });
        });
        return Promise.all(promises);
    }

    // Function to calculate the layout rows
    function calculateLayout(photoDimensions, containerWidth, targetRowHeight, margin) {
        const rows = [];
        let currentRow = [];
        let currentRowWidth = 0;

        photoDimensions.forEach((dim, index) => {
            const aspectRatio = dim.width / dim.height;
            const scaledWidth = aspectRatio * targetRowHeight;
            currentRow.push({ ...dim, aspectRatio, element: photos[index] });
            currentRowWidth += scaledWidth + margin;

            if (currentRowWidth >= containerWidth) {
                rows.push(currentRow);
                currentRow = [];
                currentRowWidth = 0;
            }
        });

        // Add the last row
        if (currentRow.length > 0) {
            rows.push(currentRow);
        }

        return rows;
    }

    // Function to render the layout
    function renderLayout(rows, containerWidth, margin, targetRowHeight) {
        rows.forEach((row, rowIndex) => {
            // Calculate total aspect ratio of the row
            const totalAspectRatio = row.reduce((sum, photo) => sum + photo.aspectRatio, 0);

            // Calculate the row height to fill the container width
            let rowHeight = (containerWidth - ((row.length - 1) * margin)) / totalAspectRatio;

            // For the last row, use the target row height without stretching
            if (rowIndex === rows.length - 1) {
                rowHeight = targetRowHeight;
            }

            row.forEach((photo, imgIndex) => {
                const photoWidth = rowHeight * photo.aspectRatio;

                // Set the dimensions of the .photo div
                photo.element.style.width = `${photoWidth}px`;
                photo.element.style.height = `${rowHeight}px`;
                photo.element.style.marginRight = `${margin}px`;
                photo.element.style.marginBottom = `${margin}px`;
            });

            // Remove the margin from the last photo in the row
            if (row.length > 0) {
                row[row.length - 1].element.style.marginRight = `0px`;
            }
        });
    }

    // Function to ensure each row has at least two images
    function ensureMinimumImages(rows) {
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].length < 2 && i < rows.length - 1) {
                if (rows[i + 1] && rows[i + 1].length > 1) {
                    const movedPhoto = rows[i + 1].shift();
                    rows[i].push(movedPhoto);

                    // Recalculate row height for the current row
                    const totalAspectRatio = rows[i].reduce((sum, photo) => sum + photo.aspectRatio, 0);
                    const rowHeight = (galleryContainer.clientWidth - ((rows[i].length - 1) * margin)) / totalAspectRatio;

                    rows[i].forEach(photo => {
                        const photoWidth = rowHeight * photo.aspectRatio;
                        photo.element.style.width = `${photoWidth}px`;
                        photo.element.style.height = `${rowHeight}px`;
                    });

                    // Remove the margin from the last photo in the row
                    if (rows[i].length > 0) {
                        rows[i][rows[i].length - 1].element.style.marginRight = `0px`;
                    }
                }
            }
        }
        return rows;
    }

    // Function to create the hover overlay for each photo
    function addHoverOverlay() {
        photos.forEach(photo => {
            // Create a new div for the overlay
            const overlay = document.createElement('div');
            overlay.classList.add('photo-overlay');
            // Use the data attributes for the title and timestamp
            overlay.innerHTML = `
                <div class="overlay-title">${photo.dataset.title || ''}</div>
                <div class="overlay-timestamp">${photo.dataset.timestamp || ''}</div>
            `;
            // Append the overlay inside the .photo div
            photo.appendChild(overlay);
        });
    }

    // Main function to initialize and layout the gallery
    function layoutGallery() {
        const containerWidth = galleryContainer.clientWidth;
        console.log(`Gallery Container Width: ${containerWidth}px`); // Debugging line

        preloadImages(photos).then(dimensions => {
            let rows = calculateLayout(dimensions, containerWidth, targetRowHeight, margin);
            rows = ensureMinimumImages(rows);
            renderLayout(rows, containerWidth, margin, targetRowHeight);
            // Remove the invisible class only after layout is complete.
            galleryContainer.classList.remove('invisible');
        });
    }

    // Debounce function to limit the rate of function calls
    function debounce(func, wait) {
        let timeout;
        return function () {
            const context = this,
                args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Add the hover overlay to each photo using its data attributes.
    addHoverOverlay();

    // Initial layout
    layoutGallery();

    // Re-layout the gallery on window resize with debounce
    window.addEventListener('resize', debounce(layoutGallery, 0));
});
