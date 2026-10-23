(() => {
  'use strict';

  /* =========================================================
     Datos y utilidades
     ========================================================= */

  const DATA = window.EVENT_DATA;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const normalize = (value) =>
    String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));

  const slugify = (value) =>
    String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const debounce = (fn, wait = 120) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  };

  const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;

  const formatSpeed = (speed) => {
    if (typeof speed !== 'number' || Number.isNaN(speed)) return '—';
    return `${speed.toFixed(2).replace('.', ',')} km/h`;
  };

  const diffLabel = (diff) => {
    if (!diff || diff === '-') return '—';
    const lap = diff.match(/-(\d+)\s*LAP/i);
    if (lap) return `−${lap[1]} ${lap[1] === '1' ? 'vuelta' : 'vueltas'}`;
    return diff;
  };

  const hasLap = (participant) => /LAP/i.test(participant.diff || '');

  /* =========================================================
     Estado
     ========================================================= */

  const state = {
    search: '',
    gender: 'all',
    city: 'all',
    sort: 'gender',
    podiumOnly: false,
    filtered: [],
    modalList: [],
    modalIndex: -1,
    lastFocused: null
  };

  const els = {
    heroStats: $('#heroStats'),
    podiumGroups: $('#podiumGroups'),
    resultsGrid: $('#resultsGrid'),
    emptyState: $('#emptyState'),
    resultCount: $('#resultCount'),
    activeFilter: $('#activeFilter'),
    resetBtn: $('#resetBtn'),
    emptyResetBtn: $('#emptyResetBtn'),
    exportBtn: $('#exportBtn'),
    search: $('#search'),
    city: $('#city'),
    sort: $('#sort'),
    podiumOnly: $('#podiumOnly'),
    genderGroup: $('#genderGroup'),
    heroSearchBtn: $('#heroSearchBtn'),
    modal: $('#diplomaModal'),
    modalDialog: $('#diplomaModal .modal-dialog'),
    modalImage: $('#modalImage'),
    modalImageLink: $('#modalImageLink'),
    modalDownload: $('#modalDownload'),
    modalPdf: $('#modalPdf'),
    modalEyebrow: $('#modalEyebrow'),
    modalTitle: $('#modalTitle'),
    modalSubtitle: $('#modalSubtitle'),
    modalTime: $('#modalTime'),
    modalPositions: $('#modalPositions'),
    modalMeta: $('#modalMeta'),
    modalPage: $('#modalPage'),
    modalNav: $('#diplomaModal .modal-nav'),
    prevBtn: $('#prevBtn'),
    nextBtn: $('#nextBtn'),
    navIndex: $('#navIndex'),
    toast: $('#toast')
  };

  let toastTimer;
  const showToast = (message) => {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2800);
  };

  /* =========================================================
     Cabecera y podio
     ========================================================= */

  function renderHeroStats() {
    if (!els.heroStats) return;
    const stats = [
      { value: DATA.stats.total, label: 'Participantes', small: 'en los 5K' },
      { value: DATA.stats.damas, label: 'Damas', small: 'en competencia' },
      { value: DATA.stats.hombres, label: 'Hombres', small: 'en competencia' },
      { value: DATA.stats.cities, label: 'Municipios', small: 'representados' }
    ];
    els.heroStats.innerHTML = stats.map((item) => `
      <div>
        <dt>${item.label}</dt>
        <dd>${item.value} <small>${item.small}</small></dd>
      </div>
    `).join('');
  }

  function podiumCard(participant) {
    const place = participant.posGender;
    return `
      <article class="podium-card podium-card--${place}">
        <span class="podium-medal" aria-hidden="true">${place}º</span>
        <h4 class="podium-name">${escapeHtml(participant.name)}</h4>
        <p class="podium-city">${icon('pin')} ${escapeHtml(participant.city)}</p>
        <p class="podium-time">${escapeHtml(participant.time)}</p>
        <button class="podium-link" type="button" data-podium-id="${participant.id}" aria-haspopup="dialog">
          Ver diploma ${icon('arrow')}
        </button>
      </article>
    `;
  }

  function renderPodium() {
    if (!els.podiumGroups) return;
    const groups = [
      { gender: 'Damas', title: 'Damas', mark: 'D' },
      { gender: 'Hombres', title: 'Hombres', mark: 'H' }
    ];

    els.podiumGroups.innerHTML = groups.map((group) => {
      const list = DATA.participants
        .filter((p) => p.gender === group.gender && p.posGender <= 3)
        .sort((a, b) => a.posGender - b.posGender);

      return `
        <section class="podium-group" aria-label="Podio de ${group.title.toLowerCase()}">
          <div class="podium-group-head">
            <h3 class="podium-group-title">
              <span class="gender-mark" data-gender="${group.gender}" aria-hidden="true">${group.mark}</span>
              ${group.title}
            </h3>
            <span class="podium-group-count">Top 3</span>
          </div>
          <div class="podium-cards">
            ${list.map(podiumCard).join('')}
          </div>
        </section>
      `;
    }).join('');
  }

  /* =========================================================
     Filtros y resultados
     ========================================================= */

  function populateCities() {
    if (!els.city) return;
    const counts = new Map();
    DATA.participants.forEach((p) => counts.set(p.city, (counts.get(p.city) || 0) + 1));
    const cities = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b, 'es'));

    els.city.innerHTML = '<option value="all">Todos los municipios</option>' + cities.map((city) => `
      <option value="${escapeHtml(city)}">${escapeHtml(city)} (${counts.get(city)})</option>
    `).join('');
  }

  function getFiltered() {
    const terms = normalize(state.search).split(/\s+/).filter(Boolean);

    const list = DATA.participants.filter((p) => {
      if (state.gender !== 'all' && p.gender !== state.gender) return false;
      if (state.city !== 'all' && p.city !== state.city) return false;
      if (state.podiumOnly && p.posGender > 3) return false;

      if (terms.length) {
        const haystack = normalize([
          p.name,
          p.diplomaName,
          p.bib,
          String(p.bib).padStart(3, '0'),
          p.city,
          p.gender,
          p.category
        ].join(' '));
        if (!terms.every((term) => haystack.includes(term))) return false;
      }

      return true;
    });

    const sorters = {
      gender: (a, b) => {
        const order = { Damas: 0, Hombres: 1 };
        return (order[a.gender] - order[b.gender]) || (a.posGender - b.posGender);
      },
      pos5k: (a, b) => a.pos5k - b.pos5k,
      posGlobal: (a, b) => a.posGlobal - b.posGlobal,
      time: (a, b) => (Number(hasLap(a)) - Number(hasLap(b))) || (a.timeSeconds - b.timeSeconds) || (a.posGender - b.posGender),
      bib: (a, b) => a.bib - b.bib,
      name: (a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    };

    return list.sort(sorters[state.sort] || sorters.gender);
  }

  function runnerCard(participant, index) {
    const place = participant.posGender;
    const isPodium = place <= 3;
    const lap = hasLap(participant);

    return `
      <article class="runner-card${isPodium ? ' is-podium' : ''}" aria-labelledby="name-${participant.bib}" style="animation-delay:${Math.min(index, 12) * 28}ms">
        <div class="card-top">
          <span class="rank${isPodium ? ` rank--${place}` : ''}">
            ${isPodium ? icon('medal') : ''} #${place}
          </span>
          <span class="chip-gender" data-gender="${participant.gender}">${participant.gender}</span>
          <span class="bib">Dorsal <b>${participant.bib}</b></span>
        </div>

        <div class="card-body">
          <div class="card-info">
            <h3 class="runner-name" id="name-${participant.bib}">${escapeHtml(participant.name)}</h3>
            <p class="runner-city">${icon('pin')} ${escapeHtml(participant.city)}</p>
            <div class="card-time">
              <span class="time-label">Tiempo</span>
              <strong>${escapeHtml(participant.time)}</strong>
              ${participant.diff === '-'
                ? ''
                : `<span class="diff-badge${lap ? ' diff-badge--lap' : ''}" title="Diferencia con el primer lugar de su género">${escapeHtml(diffLabel(participant.diff))}</span>`}
            </div>
            <dl class="mini-stats">
              <dt>Ritmo</dt>
              <dd>${escapeHtml(participant.pace)} min/km</dd>
              <dt>Velocidad</dt>
              <dd>${formatSpeed(participant.speed)}</dd>
            </dl>
          </div>

          <button class="diploma-thumb" type="button" data-open-id="${participant.id}" aria-label="Ver el diploma de ${escapeHtml(participant.name)}" aria-haspopup="dialog">
            <img src="${escapeHtml(participant.diplomaThumb)}" alt="Diploma oficial de ${escapeHtml(participant.name)}" width="462" height="357" loading="lazy" decoding="async" data-diploma-img>
            <span class="diploma-thumb-label">${icon('expand')} Ver diploma</span>
          </button>
        </div>

        <div class="card-foot">
          <span>Pos. género <b>#${participant.posGender}</b> / ${participant.posGenderOf}</span>
          <span>Pos. 5K <b>#${participant.pos5k}</b> / ${participant.pos5kOf}</span>
          <span>Global <b>#${participant.posGlobal}</b> / ${participant.posGlobalOf}</span>
        </div>
      </article>
    `;
  }

  function renderResults(list) {
    if (!els.resultsGrid) return;
    els.resultsGrid.innerHTML = list.map(runnerCard).join('');

    els.resultsGrid.querySelectorAll('img[data-diploma-img]').forEach((img) => {
      img.addEventListener('error', () => {
        const button = img.closest('.diploma-thumb');
        if (button) button.classList.add('is-missing');
        img.remove();
      }, { once: true });
    });
  }

  function renderToolbar(list) {
    if (!els.resultCount) return;
    const total = DATA.participants.length;
    const parts = [];

    if (state.gender !== 'all') parts.push(state.gender);
    if (state.city !== 'all') parts.push(state.city);
    if (state.podiumOnly) parts.push('Solo podio');
    if (state.search.trim()) parts.push(`“${state.search.trim()}”`);

    els.resultCount.innerHTML = `Mostrando <strong>${list.length}</strong> de ${total} participantes`;
    if (els.activeFilter) {
      els.activeFilter.textContent = parts.length ? parts.join(' · ') : '';
      els.activeFilter.hidden = parts.length === 0;
    }
    if (els.resetBtn) els.resetBtn.disabled = parts.length === 0;
  }

  function applyFilters() {
    const list = getFiltered();
    state.filtered = list;
    renderResults(list);
    renderToolbar(list);
    if (els.emptyState) els.emptyState.hidden = list.length !== 0;
    if (els.resultsGrid) els.resultsGrid.hidden = list.length === 0;
  }

  function setGender(gender) {
    state.gender = gender;
    $$('#genderGroup button').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.gender === gender));
    });
  }

  function resetFilters(notify = true) {
    state.search = '';
    state.gender = 'all';
    state.city = 'all';
    state.sort = 'gender';
    state.podiumOnly = false;

    if (els.search) els.search.value = '';
    if (els.city) els.city.value = 'all';
    if (els.sort) els.sort.value = 'gender';
    if (els.podiumOnly) els.podiumOnly.checked = false;
    setGender('all');
    applyFilters();
    if (notify) showToast('Filtros restablecidos');
  }

  /* =========================================================
     Modal del diploma
     ========================================================= */

  function fillModal(participant) {
    if (!participant) return;

    const page = participant.diplomaPage;
    const pdfHref = `${participant.diplomaPdf}#page=${page}`;

    els.modalImage.classList.add('is-loading');
    els.modalImage.src = participant.diplomaFull;
    els.modalImage.alt = `Diploma oficial de ${participant.name}, ${participant.category}, ${participant.time}`;
    els.modalImageLink.href = participant.diplomaFull;

    els.modalDownload.href = participant.diplomaFull;
    els.modalDownload.download = `Diploma-${slugify(participant.name)}-${participant.bib}.jpg`;
    els.modalPdf.href = pdfHref;

    els.modalEyebrow.textContent = `Diploma oficial · ${participant.gender}`;
    els.modalTitle.textContent = participant.name;
    els.modalSubtitle.innerHTML = `${icon('pin')} ${escapeHtml(participant.city)} · ${escapeHtml(participant.category)}`;
    els.modalTime.textContent = participant.time;

    els.modalPositions.innerHTML = `
      <div><dt>Posición género</dt><dd>#${participant.posGender} <span>de ${participant.posGenderOf}</span></dd></div>
      <div><dt>Posición general 5K</dt><dd>#${participant.pos5k} <span>de ${participant.pos5kOf}</span></dd></div>
      <div><dt>Posición general global</dt><dd>#${participant.posGlobal} <span>de ${participant.posGlobalOf}</span></dd></div>
    `;

    els.modalMeta.innerHTML = `
      <span>Dorsal <b>${participant.bib}</b></span>
      <span>Categoría <b>${escapeHtml(participant.category)}</b></span>
      <span>Ritmo <b>${escapeHtml(participant.pace)} min/km</b></span>
      <span>Velocidad <b>${formatSpeed(participant.speed)}</b></span>
    `;

    els.modalPage.textContent = `${page}`;

    const single = state.modalList.length < 2;
    if (els.modalNav) els.modalNav.hidden = single;
    if (els.prevBtn) els.prevBtn.disabled = single || state.modalIndex <= 0;
    if (els.nextBtn) els.nextBtn.disabled = single || state.modalIndex >= state.modalList.length - 1;
    if (els.navIndex) {
      els.navIndex.textContent = single
        ? 'Diploma individual'
        : `${state.modalIndex + 1} de ${state.modalList.length}`;
    }
  }

  function preloadNeighbours() {
    [state.modalIndex - 1, state.modalIndex + 1].forEach((index) => {
      const participant = state.modalList[index];
      if (!participant) return;
      const img = new Image();
      img.src = participant.diplomaFull;
    });
  }

  function openModal(participant, list, index) {
    if (!participant) return;
    state.modalList = list;
    state.modalIndex = index;

    const isOpen = !els.modal.hidden;
    fillModal(participant);
    preloadNeighbours();

    if (!isOpen) {
      state.lastFocused = document.activeElement;
      els.modal.hidden = false;
      document.body.classList.add('modal-open');
      if (els.modalDialog) els.modalDialog.scrollTop = 0;
      if (els.modal) els.modal.querySelector('.modal-close')?.focus({ preventScroll: true });
    }
  }

  function openById(id) {
    const index = state.filtered.findIndex((participant) => participant.id === id);
    if (index === -1) return;
    openModal(state.filtered[index], state.filtered, index);
  }

  function openPodiumById(id) {
    const participant = DATA.participants.find((item) => item.id === id);
    if (!participant) return;
    openModal(participant, [participant], 0);
  }

  function closeModal() {
    if (els.modal.hidden) return;
    els.modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (state.lastFocused && typeof state.lastFocused.focus === 'function') {
      state.lastFocused.focus({ preventScroll: true });
    }
  }

  function navigateModal(step) {
    const nextIndex = state.modalIndex + step;
    if (nextIndex < 0 || nextIndex >= state.modalList.length) return;
    state.modalIndex = nextIndex;
    fillModal(state.modalList[nextIndex]);
    preloadNeighbours();
  }

  function trapFocus(event) {
    if (event.key !== 'Tab' || els.modal.hidden) return;
    const focusables = $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', els.modalDialog)
      .filter((element) => element.offsetParent !== null);
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* =========================================================
     Exportación CSV
     ========================================================= */

  function csvCell(value) {
    const text = value == null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    const list = state.filtered;
    if (!list.length) {
      showToast('No hay resultados para exportar');
      return;
    }

    const headers = [
      'Posición género', 'Dorsal', 'Nombre', 'Género', 'Municipio', 'Tiempo',
      'Ritmo', 'Velocidad', 'Diferencia', 'Posición 5K', 'Posición global', 'Página diploma'
    ];

    const rows = list.map((p) => [
      p.posGender,
      p.bib,
      p.name,
      p.gender,
      p.city,
      p.time,
      `${p.pace} min/km`,
      formatSpeed(p.speed),
      p.diff === '-' ? '' : p.diff,
      p.pos5k,
      p.posGlobal,
      p.diplomaPage
    ]);

    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'resultados-running-night-uptc-2026.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast(`${list.length} resultados exportados a CSV`);
  }

  /* =========================================================
     Eventos
     ========================================================= */

  function bindEvents() {
    const applySearch = debounce(() => {
      state.search = els.search ? els.search.value : '';
      applyFilters();
    }, 130);

    if (els.search) els.search.addEventListener('input', applySearch);
    if ($('#filters')) $('#filters').addEventListener('submit', (event) => event.preventDefault());

    if (els.genderGroup) {
      els.genderGroup.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-gender]');
        if (!button) return;
        setGender(button.dataset.gender);
        applyFilters();
      });
    }

    if (els.city) {
      els.city.addEventListener('change', () => {
        state.city = els.city.value;
        applyFilters();
      });
    }

    if (els.sort) {
      els.sort.addEventListener('change', () => {
        state.sort = els.sort.value;
        applyFilters();
      });
    }

    if (els.podiumOnly) {
      els.podiumOnly.addEventListener('change', () => {
        state.podiumOnly = els.podiumOnly.checked;
        applyFilters();
      });
    }

    if (els.resetBtn) els.resetBtn.addEventListener('click', () => resetFilters());
    if (els.emptyResetBtn) els.emptyResetBtn.addEventListener('click', () => resetFilters(false));
    if (els.exportBtn) els.exportBtn.addEventListener('click', exportCsv);

    if (els.heroSearchBtn) {
      els.heroSearchBtn.addEventListener('click', () => {
        $('#resultados')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => els.search?.focus({ preventScroll: true }), 550);
      });
    }

    if (els.resultsGrid) {
      els.resultsGrid.addEventListener('click', (event) => {
        const button = event.target.closest('[data-open-id]');
        if (button) openById(button.dataset.openId);
      });
    }

    if (els.podiumGroups) {
      els.podiumGroups.addEventListener('click', (event) => {
        const button = event.target.closest('[data-podium-id]');
        if (button) openPodiumById(button.dataset.podiumId);
      });
    }

    if (els.modal) {
      els.modal.addEventListener('click', (event) => {
        if (event.target.closest('[data-close]')) closeModal();
      });
    }

    if (els.prevBtn) els.prevBtn.addEventListener('click', () => navigateModal(-1));
    if (els.nextBtn) els.nextBtn.addEventListener('click', () => navigateModal(1));

    if (els.modalImage) {
      els.modalImage.addEventListener('load', () => els.modalImage.classList.remove('is-loading'));
      els.modalImage.addEventListener('error', () => {
        els.modalImage.classList.remove('is-loading');
        els.modalImage.alt = 'No se pudo cargar la imagen del diploma. Usa el enlace al PDF.';
        showToast('No se pudo cargar la imagen. Abre el PDF del diploma.');
      });
    }

    document.addEventListener('keydown', (event) => {
      if (els.modal.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
      } else if (event.key === 'ArrowLeft') {
        navigateModal(-1);
      } else if (event.key === 'ArrowRight') {
        navigateModal(1);
      } else if (event.key === 'Tab') {
        trapFocus(event);
      }
    });
  }

  /* =========================================================
     Inicio
     ========================================================= */

  function init() {
    if (!DATA || !Array.isArray(DATA.participants) || !DATA.participants.length) {
      if (els.resultsGrid) {
        els.resultsGrid.innerHTML = '<p class="empty-state">No se pudieron cargar los datos de resultados. Verifica que el archivo <code>data/participantes.js</code> esté junto a la aplicación.</p>';
      }
      return;
    }

    renderHeroStats();
    populateCities();
    renderPodium();
    bindEvents();
    applyFilters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
