// Wires up the header dark/light switch. The actual theme is already applied
// before this runs — see the inline script in <head> of each page, which sets
// data-theme on <html> synchronously so there's no flash of the wrong theme.
(function () {
    var STORAGE_KEY = 'gp-theme';
    var toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    toggle.setAttribute('aria-checked', String(isDark));

    function applyTheme(dark) {
        isDark = dark;
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        toggle.setAttribute('aria-checked', String(dark));
    }

    toggle.addEventListener('click', function () {
        applyTheme(!isDark);
        try { localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light'); } catch (e) { /* private mode etc. */ }
    });

    // Stay in sync if the theme is changed in another tab.
    window.addEventListener('storage', function (e) {
        if (e.key === STORAGE_KEY && e.newValue) applyTheme(e.newValue === 'dark');
    });
})();
