feather.replace();

// Hamburger Menu Toggle
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close menu when a link is clicked
navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

const contactForm = document.querySelector('.contact-form');

contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if(validateForm()){
        contactForm.submit();
        alert("Message sent! Thank you for reaching out to us.");
        contactForm.reset();
    } else{
        console.log("validation failed");
    }
});

const showError = (input, message) => {
    const error = document.createElement("span");
    error.className = "error-message";
    error.textContent = message;
    error.style.display = "block";
    error.setAttribute("role", "alert");
    
    input.insertAdjacentElement("afterend", error);
}

const clearError = () => {
    const errorDisplay = document.querySelectorAll(".error-message");
    errorDisplay.forEach(el => el.remove());

    const inputs = document.querySelectorAll(".error");
    inputs.forEach(input => {
        input.classList.remove("error");
        input.removeAttribute("aria-invalid");
    });
};

const validateForm = () => {
    let isValid = true;

    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const messageInput = document.getElementById("message");
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
    clearError();

    const inputs = [nameInput, emailInput, messageInput];
    inputs.forEach(input => {
        input.addEventListener("focus", () => {
            clearError();
        });
    });
    if (nameInput.value.trim() === "") {
        showError(nameInput, "Please enter your name.");
        isValid = false;
    }

    if (emailInput.value.trim() === "") {
        showError(emailInput, "Please enter your email address.");
        isValid = false;
    } else if (!emailRegex.test(emailInput.value)) {
        showError(emailInput, "Please enter a valid email address.");
        isValid = false;
    }

    if (messageInput.value.trim() === "") {
        showError(messageInput, "Please enter your message.");
        isValid = false;
    }

    return isValid;
}


const API_KEY = "AIzaSyDOEjTu1SolFhCr8H1Cb0wCIwXeiCO0TzU";
const CHANNEL_ID = "UCf0JhNnjrVgqMMkDYPF-Gfw";
const MAX_RESULTS = 3;

/**
 * Fetches the latest sermons from the specified YouTube channel and displays them in the sermons grid.
 * Each sermon is displayed as a card with a thumbnail, title, series name, and publication date.
 * Clicking on a sermon card will open the video in a new tab on YouTube.
 */
async function loadSermons() {
    const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet&order=date&type=video&maxResults=${MAX_RESULTS}`;

    const response = await fetch(url);
    const data = await response.json();

    const grid = document.getElementById('sermons-grid');

    data.items.forEach(video => {
        const videoId = video.id.videoId;
        const title = video.snippet.title;
        const date = new Date(video.snippet.publishedAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        const thumbnail = video.snippet.thumbnails.medium.url;

        // Create elements
        const card = document.createElement('div');
        card.className = 'sermon-card';

        const link = document.createElement('a');
        link.href = `https://www.youtube.com/watch?v=${videoId}`;
        link.target = '_blank';

        const thumb = document.createElement('div');
        thumb.className = 'sermon-thumb';
        thumb.style.backgroundImage = `url('${thumbnail}')`;
        thumb.style.backgroundSize = 'cover';
        thumb.style.backgroundPosition = 'center';

        const playBtn = document.createElement('div');
        playBtn.className = 'play-btn';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M8 5v14l11-7z');
        svg.appendChild(path);

        const info = document.createElement('div');
        info.className = 'sermon-info';

        const series = document.createElement('div');
        series.className = 'sermon-series';
        series.textContent = 'Latest Sermon';

        const titleEl = document.createElement('div');
        titleEl.className = 'sermon-title';
        titleEl.textContent = title;

        const meta = document.createElement('div');
        meta.className = 'sermon-meta';
        meta.textContent = date;

        // Assemble
        playBtn.appendChild(svg);
        thumb.appendChild(playBtn);
        link.appendChild(thumb);
        info.appendChild(series);
        info.appendChild(titleEl);
        info.appendChild(meta);
        card.appendChild(link);
        card.appendChild(info);
        grid.appendChild(card);
    });
}

loadSermons();