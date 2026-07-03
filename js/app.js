/**
 * ACERCARTE — Shared UI shell
 * Back-to-top, search, scroll animations
 */
(function() {
    'use strict';

    // ── Back to top ──
    if (!document.querySelector('.back-top')) {
        const btn = document.createElement('button');
        btn.className = 'back-top';
        btn.innerHTML = '↑';
        btn.setAttribute('aria-label', 'Volver arriba');
        document.body.appendChild(btn);

        let scrollTimer;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                btn.classList.toggle('visible', window.scrollY > 500);
            }, 50);
        }, {passive: true});

        btn.addEventListener('click', () => {
            window.scrollTo({top: 0, behavior: 'smooth'});
        });
    }

    // ── Search bar ──
    const searchContainer = document.querySelector('[data-search-container]');
    if (searchContainer && !document.querySelector('.search-bar')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'search-bar';
        wrapper.innerHTML = '<input type="text" class="search-input" placeholder="🔍 Buscar eventos...">'
            + '<button class="search-clear" style="display:none">✕</button>';
        searchContainer.appendChild(wrapper);

        const input = wrapper.querySelector('.search-input');
        const clearBtn = wrapper.querySelector('.search-clear');
        let debounce;

        input.addEventListener('input', () => {
            clearTimeout(debounce);
            clearBtn.style.display = input.value ? 'block' : 'none';
            debounce = setTimeout(() => {
                document.dispatchEvent(new CustomEvent('acercarte:search', {detail: input.value}));
            }, 200);
        });

        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.style.display = 'none';
            document.dispatchEvent(new CustomEvent('acercarte:search', {detail: ''}));
        });

        // Escape to clear
        input.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                input.value = '';
                clearBtn.style.display = 'none';
                document.dispatchEvent(new CustomEvent('acercarte:search', {detail: ''}));
                input.blur();
            }
        });
    }

    // ── Scroll animations (Intersection Observer) ──
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {threshold: 0.1, rootMargin: '0px 0px -30px 0px'});

        // Observe cards after they render
        const observeCards = () => {
            document.querySelectorAll('.expo-card-link, .pg-event-card, .category-card, .participacion-item').forEach(el => {
                if (!el.classList.contains('visible')) {
                    el.classList.add('fade-up');
                    observer.observe(el);
                }
            });
        };

        // Initial observe + MutationObserver for dynamic content
        observeCards();
        const mo = new MutationObserver(observeCards);
        mo.observe(document.body, {childList: true, subtree: true});
    }

    // ── Skeleton loading ──
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.loading').forEach(el => {
            el.innerHTML = '<div class="skeleton"><div class="sk-line w80"></div><div class="sk-line w60"></div><div class="sk-line w90"></div><div class="sk-line w50"></div></div>';
        });
    });

})();
