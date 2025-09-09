document.addEventListener('DOMContentLoaded', () => {
    const loadSection = (id, file) => {
        fetch(file)
            .then(res => {
                if (!res.ok) {
                    console.error(`❌ Failed to load ${file}: ${res.status}`);
                    throw new Error(`Failed to load ${file}`);
                }
                return res.text();
            })
            .then(html => {
                const placeholder = document.getElementById(id);
                if (placeholder) {
                    placeholder.innerHTML = html;
                } else {
                    console.error(`❌ No placeholder found with id ${id}`);
                }
            })
            .catch(err => console.error(err));
    };

    // ✅ Use correct relative paths since popup2.html is in the same folder as these files
    loadSection('header-placeholder', 'popup2-header.html');
    loadSection('bio-placeholder', 'popup2-bio.html');
    loadSection('buttons-placeholder', 'popup2-buttons.html');
    loadSection('morebuttons-placeholder', 'popup2-morebuttons.html');
    loadSection('footer-placeholder', 'popup2-footer.html');

    console.log('✅ popup2-script.js loaded and attempting to fetch modular sections');
});
