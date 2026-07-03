/**
 * ACERCARTE — Shared UI shell
 * Animations, search, back-to-top, effects
 */
(function() {
    'use strict';

    // ── Ripple effect on clickable elements ──
    document.addEventListener('click', function(e) {
        const target = e.target.closest('.nav-btn, .pg-cat-filter, .conv-filter, .pg-sort, .category-card, .btn');
        if (!target) return;

        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        target.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });

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
                btn.classList.toggle('visible', window.scrollY > 400);
            }, 60);
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
        wrapper.innerHTML = '<input type="text" class="search-input" placeholder="🔍 Buscar eventos, museos, obras...">'
            + '<button class="search-clear" style="display:none" aria-label="Limpiar búsqueda">✕</button>';
        searchContainer.appendChild(wrapper);

        const input = wrapper.querySelector('.search-input');
        const clearBtn = wrapper.querySelector('.search-clear');
        let debounce;

        input.addEventListener('input', () => {
            clearTimeout(debounce);
            clearBtn.style.display = input.value ? 'flex' : 'none';
            debounce = setTimeout(() => {
                document.dispatchEvent(new CustomEvent('acercarte:search', {detail: input.value.trim()}));
            }, 200);
        });

        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.style.display = 'none';
            document.dispatchEvent(new CustomEvent('acercarte:search', {detail: ''}));
            input.focus();
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                input.value = '';
                clearBtn.style.display = 'none';
                document.dispatchEvent(new CustomEvent('acercarte:search', {detail: ''}));
                input.blur();
            }
        });

        // Show search on Ctrl+K or /
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !e.target.closest('input,textarea,[contenteditable]'))) {
                e.preventDefault();
                input.focus();
                input.select();
            }
        });
    }

    // ── Scroll reveal (Intersection Observer) ──
    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {threshold: 0.08, rootMargin: '0px 0px -40px 0px'});

        const observeCards = () => {
            document.querySelectorAll(
                '.expo-card-link, .pg-event-card, .category-card, .participacion-item, .pg-post'
            ).forEach(el => {
                if (!el.classList.contains('reveal-tracked')) {
                    el.classList.add('fade-up', 'reveal-tracked');
                    revealObserver.observe(el);
                }
            });
        };

        observeCards();
        const mo = new MutationObserver(observeCards);
        mo.observe(document.body, {childList: true, subtree: true});

        // Also add stagger class to lists
        const staggerLists = () => {
            document.querySelectorAll('.expo-list, .pg-events, .participaciones-list, .category-grid').forEach(list => {
                if (!list.classList.contains('stagger-children') && list.children.length > 1) {
                    list.classList.add('stagger-children');
                }
            });
        };
        staggerLists();
        const mo2 = new MutationObserver(staggerLists);
        mo2.observe(document.body, {childList: true, subtree: true});
    }

    // ── Skeleton loading ──
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.loading').forEach(el => {
            if (!el.querySelector('.skeleton')) {
                el.innerHTML = '<div class="skeleton"><div class="sk-line w80"></div><div class="sk-line w60"></div><div class="sk-line w90"></div><div class="sk-line w50"></div></div>';
            }
        });
    });

    // ── Active nav sync ──
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const href = btn.getAttribute('href');
        if (href === currentPath || (currentPath === '' && href === 'index.html')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // ── Smooth number animation for counters ──
    function animateCounter(el, target) {
        if (!el || el.dataset.animated === 'true') return;
        el.dataset.animated = 'true';
        const num = parseInt(target) || 0;
        if (num === 0) { el.textContent = '0 eventos'; return; }
        const duration = 800;
        const start = performance.now();
        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out
            const current = Math.round(eased * num);
            el.textContent = current + (el.textContent.includes('oportunidades') ? ' oportunidades' : ' eventos');
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    // Listen for counter updates
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            document.querySelectorAll('.cat-count').forEach(el => {
                const text = el.textContent || '';
                const match = text.match(/(\d+)/);
                if (match) animateCounter(el, match[1]);
            });
        }, 800);
    });

})();
