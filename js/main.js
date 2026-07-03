/**
 * ACERCARTE — main.js
 * Carga dinámica de agenda cultural y oportunidades desde JSON
 */

document.addEventListener('DOMContentLoaded', () => {
    loadPanoramas();
    loadAgenda();
    loadOportunidades();
    setupFilters();
});

/* ══════════════════════════════════════════════
   AGENDA CULTURAL (agenda.json)
   ══════════════════════════════════════════════ */
async function loadAgenda() {
    const statusEl = document.getElementById('agenda-status');
    const contentEl = document.getElementById('agenda-content');

    try {
        const resp = await fetch('datos/agenda.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        // Mostrar contenido, ocultar loading
        statusEl.style.display = 'none';
        contentEl.style.display = 'block';

        // Actualizar fecha
        document.getElementById('agenda-date').textContent = data.fecha;

        // ── MNBA ──
        if (data.mnba && data.mnba.length > 0) {
            const mnbaBlock = document.getElementById('agenda-mnba');
            const mnbaList = document.getElementById('agenda-mnba-list');
            mnbaBlock.style.display = 'block';
            mnbaList.innerHTML = data.mnba
                .map(ex => {
                    const nombre = ex.nombre || ex;
                    const link = ex.link || '#';
                    const lugar = ex.lugar || '';
                    const horario = ex.horario || '';
                    const entrada = ex.entrada || '';
                    return '<div class="expo-card">'
                        + '🖼️ <a href="' + escapeHTML(link) + '" target="_blank" rel="noopener" class="expo-link">' + escapeHTML(nombre) + '</a>'
                        + (lugar ? '<div class="expo-meta">📍 ' + escapeHTML(lugar) + '</div>' : '')
                        + (horario ? '<div class="expo-meta">🕐 ' + escapeHTML(horario) + '</div>' : '')
                        + (entrada ? '<div class="expo-meta">🎫 ' + escapeHTML(entrada) + '</div>' : '')
                        + '</div>';
                })
                .join('');
        }

        // ── Categorías ──
        const catContainer = document.getElementById('agenda-categories');
        const iconMap = {
            teatro: '🎭', museos: '🏛️', galerias: '🖼️',
            diseno: '🎨', arte: '🌎'
        };

        if (data.categorias && data.categorias.length > 0) {
            catContainer.innerHTML = data.categorias.map(cat => {
                const icon = iconMap[cat.icono] || '📌';
                const items = cat.items.slice(0, 6).map(item => `
                    <li class="agenda-item">
                        <a href="${escapeHTML(item.link)}" target="_blank" rel="noopener">${escapeHTML(item.title)}</a>
                        ${item.source ? `<span class="agenda-source">— ${escapeHTML(item.source)}</span>` : ''}
                    </li>
                `).join('');

                return `
                    <div class="agenda-cat">
                        <h3>${icon} ${escapeHTML(cat.nombre)}</h3>
                        <ul class="agenda-list">${items || '<li class="agenda-empty">Sin resultados</li>'}</ul>
                    </div>
                `;
            }).join('');
        } else {
            catContainer.innerHTML = '<p class="agenda-empty-msg">No hay eventos en este momento. ¡Volvé pronto!</p>';
        }

    } catch (err) {
        console.warn('Agenda no disponible:', err.message);
        statusEl.innerHTML = `
            <div class="empty-state">
                <p>📡 La agenda se está generando...</p>
                <p class="empty-hint">Los datos se actualizan cada sábado automáticamente.</p>
            </div>
        `;
    }
}

/* ══════════════════════════════════════════════
   OPORTUNIDADES (oportunidades.json)
   ══════════════════════════════════════════════ */
let todasOportunidades = [];

async function loadOportunidades() {
    const statusEl = document.getElementById('conv-status');
    const contentEl = document.getElementById('conv-content');
    const filterBar = document.getElementById('conv-filters');

    try {
        const resp = await fetch('datos/oportunidades.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        statusEl.style.display = 'none';
        contentEl.style.display = 'block';

        document.getElementById('conv-date').textContent = data.fecha;

        todasOportunidades = data.oportunidades || [];

        if (todasOportunidades.length === 0) {
            document.getElementById('conv-list').innerHTML =
                '<p class="agenda-empty-msg">No hay oportunidades nuevas hoy. ¡Volvé mañana!</p>';
            return;
        }

        // Mostrar filtros si hay variedad
        const categorias = new Set(todasOportunidades.map(o => o.categoria));
        if (categorias.size > 1) {
            filterBar.style.display = 'flex';
        }

        renderOportunidades('todas');

    } catch (err) {
        console.warn('Oportunidades no disponibles:', err.message);
        statusEl.innerHTML = `
            <div class="empty-state">
                <p>📡 Buscando oportunidades...</p>
                <p class="empty-hint">Se actualizan de lunes a viernes automáticamente.</p>
            </div>
        `;
    }
}

function renderOportunidades(filtro) {
    const listEl = document.getElementById('conv-list');
    let items = todasOportunidades;
    if (filtro !== 'todas') {
        items = todasOportunidades.filter(o => o.categoria === filtro);
    }

    if (items.length === 0) {
        listEl.innerHTML = '<p class="agenda-empty-msg">Sin resultados para este filtro.</p>';
        return;
    }

    const catLabels = {
        fondos: '💰 Fondos', residencia: '🏠 Residencia', beca: '🎓 Beca',
        concurso: '🏆 Concurso', feria: '🎪 Feria', premio: '🥇 Premio',
        convocatoria: '📋 Convocatoria'
    };

    listEl.innerHTML = items.map(op => `
        <div class="participacion-item">
            <div class="participacion-header">
                <span class="participacion-fecha">${escapeHTML(op.deadline || 'Consultar')}</span>
                <span class="participacion-estado estado-postulado">${catLabels[op.categoria] || op.categoria}</span>
            </div>
            <h3>${escapeHTML(op.titulo)}</h3>
            <p>${escapeHTML(op.descripcion || '')}</p>
            <p class="participacion-meta">
                ${op.fuente ? escapeHTML(op.fuente) + ' · ' : ''}
                ${op.link ? `<a href="${escapeHTML(op.link)}" target="_blank" rel="noopener">Ver más →</a>` : ''}
                ${op.monto ? ' · Monto: ' + escapeHTML(op.monto) : ''}
            </p>
        </div>
    `).join('');
}

function setupFilters() {
    document.addEventListener('click', (e) => {
        // Convocatorias filters
        if (e.target.classList.contains('conv-filter')) {
            document.querySelectorAll('.conv-filter').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderOportunidades(e.target.dataset.filter);
        }
        // Panorama category filters
        if (e.target.classList.contains('pg-cat-filter')) {
            document.querySelectorAll('.pg-cat-filter').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentPgFilter = e.target.dataset.cat;
            renderPanoramas();
        }
        // Panorama sort buttons
        if (e.target.classList.contains('pg-sort')) {
            document.querySelectorAll('.pg-sort').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentPgSort = e.target.dataset.sort;
            renderPanoramas();
        }
    });
}

/* ══════════════════════════════════════════════
   UTILS
   ══════════════════════════════════════════════ */
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ══════════════════════════════════════════════
   PANORAMAS GRATIS (panoramas-gratis.json)
   ══════════════════════════════════════════════ */
let allPanoramaEvents = [];
let currentPgFilter = 'todas';
let currentPgSort = 'default';

async function loadPanoramas() {
    const statusEl = document.getElementById('pg-status');
    const contentEl = document.getElementById('pg-content');

    try {
        const resp = await fetch('datos/panoramas-gratis.json');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();

        statusEl.style.display = 'none';
        contentEl.style.display = 'block';
        document.getElementById('pg-date').textContent = data.fecha;

        // Build flat list of all events
        allPanoramaEvents = [];
        data.posts.forEach(post => {
            (post.events || []).forEach(ev => {
                allPanoramaEvents.push({
                    ...ev,
                    postHeader: post.header,
                    postUrl: post.url,
                    postDate: post.date,
                });
            });
        });

        if (allPanoramaEvents.length === 0) {
            document.getElementById('pg-list').innerHTML =
                '<p class="agenda-empty-msg">No hay panoramas nuevos. ¡Volvé pronto!</p>';
            return;
        }

        // Build category filters from data
        const catAvail = data.categorias_disponibles || [];
        const filterBar = document.getElementById('pg-filters');
        const catContainer = document.getElementById('pg-cat-filters');

        if (catAvail.length > 1) {
            filterBar.style.display = 'block';
            catContainer.innerHTML = '<button class="pg-cat-filter active" data-cat="todas">Todas</button>' +
                catAvail.map(cat =>
                    '<button class="pg-cat-filter" data-cat="' + escapeHTML(cat) + '">' + escapeHTML(cat) + '</button>'
                ).join('');
        }

        renderPanoramas();

    } catch (err) {
        console.warn('Panoramas Gratis no disponible:', err.message);
        statusEl.innerHTML = '<div class="empty-state"><p>📡 Cargando panoramas desde Instagram...</p><p class="empty-hint">@panoramasgratis — se actualiza automáticamente.</p></div>';
    }
}

function renderPanoramas() {
    const listEl = document.getElementById('pg-list');
    let events = [...allPanoramaEvents];

    // Filter by category
    if (currentPgFilter !== 'todas') {
        events = events.filter(ev => {
            return (ev.categories || []).some(c => c[1] === currentPgFilter);
        });
    }

    // Sort
    const now = new Date();
    if (currentPgSort === 'soonest') {
        events.sort((a, b) => {
            const da = a.date_start ? new Date(a.date_start) : null;
            const db = b.date_start ? new Date(b.date_start) : null;
            if (da && db) return da - db;
            if (da) return -1; if (db) return 1;
            return 0;
        });
    } else if (currentPgSort === 'ending') {
        events.sort((a, b) => {
            const da = a.date_end ? new Date(a.date_end) : null;
            const db = b.date_end ? new Date(b.date_end) : null;
            if (da && db) return da - db;
            if (da) return -1; if (db) return 1;
            return 0;
        });
    }
    // default: keep original order (from Instagram)

    // Update count
    document.getElementById('pg-count').textContent =
        events.length + ' de ' + allPanoramaEvents.length + ' eventos';

    if (events.length === 0) {
        listEl.innerHTML = '<p class="agenda-empty-msg">Sin eventos para esta categoría.</p>';
        return;
    }

    // Group by post header
    const grouped = {};
    events.forEach(ev => {
        const key = ev.postHeader || 'Sin categoría';
        if (!grouped[key]) grouped[key] = { header: key, url: ev.postUrl, date: ev.postDate, events: [] };
        grouped[key].events.push(ev);
    });

    listEl.innerHTML = Object.values(grouped).map(post => {
        let html = '<div class="pg-post">';
        if (post.header) {
            html += '<h3 class="pg-post-header">' + escapeHTML(post.header) + '</h3>';
        }
        html += '<div class="pg-header">'
            + '<span class="pg-date">📅 ' + escapeHTML(post.date || '') + '</span>'
            + '<a href="' + escapeHTML(post.url) + '" target="_blank" class="pg-link">Ver post original →</a>'
            + '</div>';
        html += '<div class="pg-events">';
        post.events.forEach(ev => {
            html += '<div class="pg-event-card">';
            // Category tags
            if (ev.categories && ev.categories.length > 0) {
                html += '<div class="pg-ev-tags">';
                ev.categories.forEach(c => {
                    html += '<span class="pg-ev-tag">' + c[0] + ' ' + escapeHTML(c[1]) + '</span>';
                });
                html += '</div>';
            }
            // Time + Date
            if (ev.time || ev.date) {
                html += '<div class="pg-event-when">';
                if (ev.time) html += '<span class="pg-ev-time">🕐 ' + escapeHTML(ev.time) + '</span>';
                if (ev.date) html += '<span class="pg-ev-date">📆 ' + escapeHTML(ev.date) + '</span>';
                html += '</div>';
            }
            if (ev.description) {
                html += '<p class="pg-ev-desc">' + escapeHTML(ev.description) + '</p>';
            }
            if (ev.location || ev.extra) {
                html += '<div class="pg-ev-meta">';
                if (ev.location) html += '<span class="pg-ev-loc">📍 ' + escapeHTML(ev.location) + '</span>';
                if (ev.extra) html += '<span class="pg-ev-extra">ℹ️ ' + escapeHTML(ev.extra) + '</span>';
                html += '</div>';
            }
            html += '</div>';
        });
        html += '</div></div>';
        return html;
    }).join('');
}
