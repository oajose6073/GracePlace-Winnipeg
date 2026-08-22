import { CONFIG } from '../config.js';

feather.replace();

// Hamburger menu toggle lives in nav.js (shared across all pages)

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


const API_KEY = CONFIG.API_KEY;
const CHANNEL_ID = CONFIG.CHANNEL_ID;
const MAX_RESULTS = CONFIG.MAX_RESULTS;

let currentSlide = 0;
let totalSlides = 0;
let totalGroups = 0;
let autoSlideInterval = null;


/**
 * Fetches the latest sermons from the specified YouTube channel and displays them in the sermons grid.
 * Each sermon is displayed as a card with a thumbnail, title, series name, and publication date.
 * Clicking on a sermon card will open the video in a new tab on YouTube.
 */
async function loadSermons() {
     try {
        const grid = document.getElementById('sermons-grid');
        const dotsContainer = document.getElementById('slider-dots');
        
        // Check if we already have cached sermons
        const cached = sessionStorage.getItem('sermons');
        let items;

        if (cached) {
            items = JSON.parse(cached);
        } else {
            console.log('4. Fetching from YouTube API');
            const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet&order=date&type=video&maxResults=${MAX_RESULTS}`;

            const response = await fetch(url);
            const data = await response.json();

            
            if (data.error) {
                console.error('YouTube API error:', data.error.message);
                return;
            }

        // Check if items exist
            if (!data.items || data.items.length === 0) {
                console.error('No videos found');
                return;
            }

            // Save to cache
            items = data.items;
            sessionStorage.setItem('sermons', JSON.stringify(items));
        }
        

        items.forEach((video, index) => {
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

        totalSlides = items.length;

        // Clone first group and append to end for infinite loop illusion
        const allCards = grid.querySelectorAll('.sermon-card');
        allCards.forEach(card => {
                const clone = card.cloneNode(true);
                clone.setAttribute('aria-hidden', 'true');
                grid.appendChild(clone);
        });

    } catch (error) {
        console.error('Failed to load sermons:', error);
    } 
};

loadSermons();

// ── HERO BACKGROUND SLIDESHOW ──
const heroSlideshow = document.getElementById('hero-slideshow');
let heroIndex = 0;
let heroTimer = null;
let heroSlides = [];

async function loadHeroSlideshow() {
    console.log('hero slideshow container:', document.getElementById('hero-slideshow'));
    const response = await fetch('../images/Slide_photos/slides.json');
    const files = await response.json();

    files.forEach((file, i) => {
        const ext = file.split('.').pop().toLowerCase();
        const slide = document.createElement('div');
        slide.className = i === 0 ? 'hero-slide active' : 'hero-slide';

        if (ext === 'mp4') {
            const video = document.createElement('video');
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            const source = document.createElement('source');
            source.src = `../images/Slide_photos/${file}`;
            source.type = 'video/mp4';
            video.appendChild(source);
            slide.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = `../images/Slide_photos/${file}`;
            img.alt = 'GracePlace Winnipeg';
            img.loading = i === 0 ? 'eager' : 'lazy';
            slide.appendChild(img);
        }

        heroSlideshow.appendChild(slide);
        heroSlides.push(slide);
    });

    startHeroSlideshow();
}

function goToHeroSlide(index) {
    if (index >= heroSlides.length) heroIndex = 0;
    if (index < 0) heroIndex = heroSlides.length - 1;
    heroSlides.forEach(s => s.classList.remove('active'));
    heroSlides[heroIndex].classList.add('active');
}

function startHeroSlideshow() {
    // Respect users who've asked for reduced motion: show the first slide, don't auto-advance.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    heroTimer = setInterval(() => {
        heroIndex++;
        goToHeroSlide(heroIndex);
    }, 5000);
}

loadHeroSlideshow();


