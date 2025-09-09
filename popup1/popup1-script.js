document.addEventListener('DOMContentLoaded', () => {
    const loadSection = (id, file) => {
        fetch(file)
            .then(res => {
                if (!res.ok) {
                    console.error(`Failed to load ${file}`);
                    throw new Error(`Failed to load ${file}`);
                }
                return res.text();
            })
            .then(html => {
                const placeholder = document.getElementById(id);
                if (placeholder) {
                    placeholder.innerHTML = html;
                } else {
                    console.error(`No placeholder with id ${id}`);
                }
            })
            .catch(err => console.error(err));
    };

    loadSection('header-placeholder', 'popup1-header.html');
    loadSection('profile-placeholder', 'popup1-profile.html');
    loadSection('name-business-title-placeholder', 'popup1-name-business-title.html');
    loadSection('contact-placeholder', 'popup1-contact.html');
    loadSection('buttons-placeholder', 'popup1-buttons.html');
    loadSection('moreinfo-placeholder', 'popup1-moreinfo.html');

    document.addEventListener('click', e => {
        // Phone dropdown toggle
        if (e.target.classList.contains('phone-expand-btn')) {
            const contactBox = e.target.closest('.contact-box');
            if (contactBox) {
                const extraList = contactBox.querySelector('.contact-extra-list');
                if (extraList) {
                    extraList.classList.toggle('open');
                }
            }
        }

        // Email dropdown toggle
        if (e.target.classList.contains('email-expand-btn')) {
            const contactBox = e.target.closest('.contact-box');
            if (contactBox) {
                const extraList = contactBox.querySelector('.email-extra-list');
                if (extraList) {
                    extraList.classList.toggle('open');
                }
            }
        }

        // More Info button
        if (e.target.classList.contains('more-info-btn')) {
            e.preventDefault();
            const popupContainer = document.querySelector('.popup-container');
            if (popupContainer) {
                popupContainer.style.transition = 'opacity 0.5s ease';
                popupContainer.style.opacity = '0';
                setTimeout(() => {
                    window.location.href = '../popup2/popup2.html';
                }, 500);
            } else {
                // fallback if container not found
                window.location.href = '../popup2/popup2.html';
            }
        }
    });
});
