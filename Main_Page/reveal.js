// Shared scroll-reveal — fades/rises .reveal elements into view as they enter
// the viewport. Included on every page. Respects prefers-reduced-motion.
//
// Checked on every scroll/resize (rAF-throttled) rather than via
// IntersectionObserver alone: a large, fast scroll jump can leap clean over a
// short section between two of the observer's sampled frames and never
// report an intersection, leaving that section stuck invisible. Reading
// getBoundingClientRect() on each scroll tick can't skip a position like that.
(function () {
    let targets = [...document.querySelectorAll('.reveal')];
    if (!targets.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        targets.forEach(el => el.classList.add('in-view'));
        return;
    }

    let ticking = false;
    const revealVisible = () => {
        const cutoff = window.innerHeight * 0.92;
        targets = targets.filter(el => {
            if (el.getBoundingClientRect().top > cutoff) return true;
            el.classList.add('in-view');
            return false;
        });
        ticking = false;
        if (!targets.length) {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        }
    };
    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(revealVisible);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    revealVisible(); // catch anything already on-screen before the first scroll
})();
