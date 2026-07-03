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
        if (e.target.classList.contains('conv-filter')) {
            document.querySelectorAll('.conv-filter').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderOportunidades(e.target.dataset.filter);
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

        const listEl = document.getElementById('pg-list');

        if (!data.posts || data.posts.length === 0) {
            listEl.innerHTML = '<p class="agenda-empty-msg">No hay panoramas nuevos. ¡Volvé pronto!</p>';
            return;
        }

        listEl.innerHTML = data.posts.map((post, i) => {
            // Split caption into header (first line) and body
            const lines = post.caption.split('\\n').filter(l => l.trim());
            const header = lines[0] || 'Sin título';
            const body = lines.slice(1, 8).join(' | '); // first 7 lines as preview

            // Extract a short preview
            const preview = body.substring(0, 250) + (body.length > 250 ? '...' : '');

            return '<div class="pg-card">'
                + '<div class="pg-header">'
                + '<span class="pg-date">' + escapeHTML(post.date || '') + '</span>'
                + '<a href="' + escapeHTML(post.url) + '" target="_blank" class="pg-link">Ver en Instagram →</a>'
                + '</div>'
                + '<h3 class="pg-title">' + escapeHTML(header) + '</h3>'
                + '<p class="pg-preview">' + escapeHTML(preview) + '</p>'
                + '</div>';
        }).join('');

    } catch (err) {
        console.warn('Panoramas Gratis no disponible:', err.message);
        statusEl.innerHTML = '<div class="empty-state"><p>📡 Cargando panoramas desde Instagram...</p><p class="empty-hint">@panoramasgratis — se actualiza automáticamente.</p></div>';
    }
}
