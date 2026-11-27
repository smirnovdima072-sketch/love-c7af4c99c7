/* =========================================================
   ДЛЯ ТЕБЯ — вся интерактивность
   ========================================================= */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const cfg = window.CONFIG || {};
  const content = window.CONTENT || {};
  const media = window.MEDIA_DATA || { photos: [], videos: [] };
  const giftsData = window.GIFT_DATA || { groups: [], gifts: [] };

  const tgName = String(cfg.telegram || "").replace(/^@/, "").trim();
  function tgLink(text) {
    return `https://t.me/${tgName}?text=${encodeURIComponent(text)}`;
  }

  const photoMap = new Map((media.photos || []).map((p) => [p.orig, p]));
  const videoMap = new Map((media.videos || []).map((v) => [v.orig, v]));

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const MONTHS_NOM = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  const WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

  const esc = (str) => String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const pad = (n) => String(n).padStart(2, "0");
  const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const addDays = (d, days) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + days);
    return x;
  };
  const startOfToday = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };
  const fmtLong = (d) => `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
  const fmtShort = (d) => `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
  const initials = () => (cfg.herName || "любимая");

  function collapse(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  let toastTimer = null;
  function toast(message) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = message;
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-visible"), 2800);
  }

  /* ---------------- preloader ---------------- */
  function hidePreloader() {
    const p = $("#preloader");
    if (p) p.classList.add("is-hidden");
  }
  window.addEventListener("load", () => setTimeout(hidePreloader, 500));
  setTimeout(hidePreloader, 1400);

  /* ---------------- petals ---------------- */
  function makePetals() {
    const holder = $("#petals");
    if (!holder || reducedMotion) return;
    const count = window.innerWidth < 700 ? 11 : 19;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "petal";
      p.style.setProperty("--x", `${Math.random() * 100}%`);
      p.style.setProperty("--s", `${7 + Math.random() * 12}px`);
      p.style.setProperty("--dur", `${9 + Math.random() * 11}s`);
      p.style.setProperty("--delay", `${-Math.random() * 18}s`);
      holder.appendChild(p);
    }
  }

  /* ---------------- reveal ---------------- */
  let revealObserver = null;
  function initReveals(root = document) {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal", root).forEach((el) => el.classList.add("is-visible"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    }
    $$(".reveal", root).forEach((el, index) => {
      if (!el.style.getPropertyValue("--delay")) {
        el.style.setProperty("--delay", `${Math.min(index * 0.045, 0.35)}s`);
      }
      revealObserver.observe(el);
    });
  }

  /* ---------------- title / names ---------------- */
  const herName = initials();
  $$("[data-her-name]").forEach((el) => { el.textContent = herName; });

  /* ---------------- promises ---------------- */
  function renderPromises() {
    const grid = $("#promisesGrid");
    if (!grid) return;
    grid.innerHTML = (content.promises || []).map((p, i) => `
      <article class="promise reveal">
        <span class="promise__num">0${i + 1}</span>
        <span class="promise__icon" aria-hidden="true">${esc(p.icon)}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.text)}</p>
      </article>
    `).join("");
    initReveals(grid);
  }

  /* ---------------- captions ---------------- */
  const genericCaptions = [
    "Обычный день, который я храню.",
    "Здесь мы просто мы.",
    "Мой любимый человек.",
    "Я бы повторил этот день.",
    "Ты даже не представляешь, как красиво.",
    "Тихий момент. Самый ценный.",
    "Всё, что нужно для счастья, уже в кадре.",
    "мы",
    "Наш момент, который остался со мной.",
    "Я смотрю и улыбаюсь."
  ];

  function captionFor(orig, seed = 0) {
    const captions = content.captions || {};
    if (captions[orig]) return captions[orig];
    return genericCaptions[Math.abs(seed) % genericCaptions.length];
  }

  /* ---------------- timeline ---------------- */
  const chapterVideos = {
    "создания ёлочки для неё.mp4": "Как я собирал ёлочку для тебя",
    "с чего все началась аххахахха.mp4": "С этого всё началось",
    "первые видео вместе.mp4": "Наши первые видео вместе",
    "поздравления её на день рождения 2 день рождения.mp4": "Твой день рождения. Я старался."
  };

  function renderTimeline() {
    const holder = $("#timeline");
    if (!holder) return;
    holder.innerHTML = (content.timeline || []).map((ch, i) => {
      const photos = (ch.photos || []).map((orig) => photoMap.get(orig)).filter(Boolean);
      const video = ch.video ? videoMap.get(ch.video) : null;
      const mediaClass = video ? "chapter__media chapter__media--video" : (photos.length <= 1 ? "chapter__media chapter__media--single" : "chapter__media");
      let mediaHtml = "";

      if (video) {
        const vCaption = chapterVideos[ch.video] || "Наше видео";
        mediaHtml += `
          <button class="chapter-video" type="button" data-video-src="${esc(video.src)}" data-caption="${esc(vCaption)}">
            <video src="${esc(video.src)}#t=0.1" preload="metadata" muted playsinline aria-hidden="true"></video>
            <span class="play-badge" aria-hidden="true">▶</span>
          </button>`;
      }

      photos.forEach((p, idx) => {
        mediaHtml += `
          <button class="chapter-photo" type="button" data-photo-src="${esc(p.src)}" data-caption="${esc(captionFor(p.orig, i + idx))}">
            <img src="${esc(p.src)}" alt="${esc(captionFor(p.orig, i + idx))}" loading="lazy" decoding="async">
          </button>`;
      });

      return `
        <article class="chapter reveal" style="--delay:${Math.min(i * 0.05, 0.2)}s">
          <span class="chapter__marker" aria-hidden="true">${esc(ch.num)}</span>
          <div class="${mediaClass}">${mediaHtml}</div>
          <div class="chapter__body">
            <p class="chapter__kicker">${esc(ch.kicker)}</p>
            <h3>${esc(ch.title)}</h3>
            <p>${esc(ch.text)}</p>
            <span class="chapter__num" aria-hidden="true">${esc(ch.num)}</span>
          </div>
        </article>`;
    }).join("");

    $$(".chapter-video", holder).forEach((btn) => {
      const v = btn.querySelector("video");
      if (!v) return;
      const prepare = () => {
        if (v.videoHeight > v.videoWidth) {
          btn.classList.add("chapter-video--portrait");
          btn.closest(".chapter__media")?.classList.add("chapter__media--portrait");
        }
        try { v.currentTime = Math.min(0.8, (v.duration || 2) / 2); } catch (e) { /* ignore */ }
      };
      if (v.readyState >= 1) prepare();
      else v.addEventListener("loadedmetadata", prepare, { once: true });
    });

    initReveals(holder);
  }

  /* ---------------- gallery ---------------- */
  const galleryState = { filter: "all", shown: 12, items: [], filtered: [] };

  function buildGalleryItems() {
    const photos = (media.photos || [])
      .filter((p) => p.tag !== "little")
      .map((p) => ({
        type: "photo",
        src: p.src,
        orig: p.orig,
        tag: p.tag || "moments",
        caption: captionFor(p.orig, media.photos.indexOf(p))
      }));

    const skipVideos = new Set([
      "перые видео вместе.mp4",
      "поздравления ей на день рождения 2 день рождения.mp4"
    ]);
    const videoCaptions = {
      "Кот с которым я по сей день сплю.mp4": "Кот, с которым я до сих пор сплю.",
      "милое видео.mp4": "Просто мы.",
      "милое видео (2).mp4": "Момент, который я пересматриваю.",
      "милое видео (3).mp4": "Смеёмся. Снова.",
      "милое видео (4).mp4": "Наш тихий вечер.",
      "милое видео (5).mp4": "Ещё один день вместе.",
      "наши угарные моменты.mp4": "Наши угарные моменты.",
      "первые видео вместе.mp4": "Первые видео вместе.",
      "первый раз на конке.mp4": "Первый раз на коньках. Главное — вместе.",
      "поздравления её на день рождения 2 день рождения.mp4": "Твой день рождения. Я старался.",
      "с чего все началась аххахахха.mp4": "С этого всё началось.",
      "создания ёлочки для неё.mp4": "Как я собирал ёлочку для тебя."
    };

    const videos = (media.videos || [])
      .filter((v) => !skipVideos.has(v.orig))
      .map((v) => ({
        type: "video",
        src: v.src,
        orig: v.orig,
        tag: "video",
        caption: videoCaptions[v.orig] || "Наше видео"
      }));

    const order = { moments: 0, travel: 1, dates: 2, pets: 3, games: 4, gifts: 5 };
    photos.sort((a, b) => (order[a.tag] ?? 9) - (order[b.tag] ?? 9));

    const mixed = [];
    let nextVideo = 0;
    photos.forEach((photo, i) => {
      mixed.push(photo);
      if ((i + 1) % 4 === 0 && nextVideo < videos.length) mixed.push(videos[nextVideo++]);
    });
    while (nextVideo < videos.length) mixed.push(videos[nextVideo++]);
    galleryState.items = mixed;
  }

  function filteredGallery() {
    if (galleryState.filter === "all") return galleryState.items;
    return galleryState.items.filter((item) => item.tag === galleryState.filter);
  }

  function renderGalleryFilters() {
    const holder = $("#galleryFilters");
    if (!holder) return;
    const tags = (content.galleryTags || []).concat([{ id: "video", label: "Видео" }]);
    const counts = {};
    galleryState.items.forEach((i) => {
      counts.all = (counts.all || 0) + 1;
      counts[i.tag] = (counts[i.tag] || 0) + 1;
    });
    holder.innerHTML = tags.map((t) => `
      <button type="button" data-gallery-filter="${esc(t.id)}" class="${galleryState.filter === t.id ? "is-active" : ""}">
        ${esc(t.label)} <small>${counts[t.id] || 0}</small>
      </button>
    `).join("");
  }

  function videoLabel(item, index) {
    return item.caption || "Наше видео";
  }

  function renderGallery() {
    const grid = $("#galleryGrid");
    const more = $("#galleryMore");
    const count = $("#galleryCount");
    if (!grid) return;
    const list = filteredGallery();
    galleryState.filtered = list;
    const slice = list.slice(0, galleryState.shown);

    grid.innerHTML = slice.map((item, idx) => {
      const ratio = item.type === "video" ? "4 / 5" : ["4 / 5", "1 / 1", "3 / 4", "4 / 3", "1 / 1", "5 / 7", "4 / 5"][idx % 7];
      if (item.type === "video") {
        return `
          <button class="tile tile--video" type="button" data-gallery-index="${idx}" style="--ratio:${ratio}" aria-label="${esc(videoLabel(item, idx))}">
            <video class="tile__video" src="${esc(item.src)}#t=0.8" preload="metadata" muted playsinline loop aria-hidden="true"></video>
            <span class="tile__play" aria-hidden="true">▶</span>
            <span class="tile__label">${esc(videoLabel(item, idx))}</span>
          </button>`;
      }
      return `
        <button class="tile" type="button" data-gallery-index="${idx}" style="--ratio:${ratio}" aria-label="${esc(item.caption)}">
          <img src="${esc(item.src)}" alt="${esc(item.caption)}" loading="lazy" decoding="async">
          <span class="tile__heart" aria-hidden="true">♥</span>
          <span class="tile__caption">${esc(item.caption)}</span>
        </button>`;
    }).join("");

    initVideoTiles(grid);
    if (more) more.hidden = list.length <= galleryState.shown;
    if (count) count.textContent = `Показано ${Math.min(galleryState.shown, list.length)} из ${list.length}`;
    initReveals(grid);
  }

  function initVideoTiles(root) {
    $$(".tile--video", root).forEach((tile) => {
      const v = tile.querySelector("video");
      if (!v) return;
      const frame = () => {
        try { v.currentTime = Math.min(1, v.duration || 1); } catch (e) { /* ignore */ }
      };
      if (v.readyState >= 1) frame();
      else v.addEventListener("loadedmetadata", frame, { once: true });

      tile.addEventListener("mouseenter", () => {
        if (reducedMotion) return;
        v.play().catch(() => {});
      });
      tile.addEventListener("mouseleave", () => {
        v.pause();
        frame();
      });
    });
  }

  function setGalleryFilter(id) {
    galleryState.filter = id;
    galleryState.shown = 12;
    renderGalleryFilters();
    renderGallery();
    if (id === "pets") toast("котики мы 🐾♥");
  }

  function initGallery() {
    buildGalleryItems();
    renderGalleryFilters();
    renderGallery();

    $("#galleryFilters")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-gallery-filter]");
      if (btn) setGalleryFilter(btn.dataset.galleryFilter);
    });

    $("#galleryMore")?.addEventListener("click", () => {
      galleryState.shown += 12;
      renderGallery();
    });

    $("#galleryGrid")?.addEventListener("click", (e) => {
      const tile = e.target.closest("[data-gallery-index]");
      if (!tile) return;
      const idx = Number(tile.dataset.galleryIndex);
      openLightbox(galleryState.filtered, idx);
    });
  }

  /* ---------------- little things ---------------- */
  let littleItems = [];

  function renderLittle() {
    const rail = $("#littleRail");
    if (!rail) return;
    littleItems = (content.little || []).map((item) => {
      const p = photoMap.get(item.orig);
      if (!p) return null;
      return {
        type: "photo",
        src: p.src,
        caption: item.caption,
        private: !!item.private,
        orig: p.orig
      };
    }).filter(Boolean);

    rail.innerHTML = littleItems.map((item, idx) => `
      <button class="little-card ${item.private ? "little-card--private" : ""}" type="button" data-little-index="${idx}" aria-label="${esc(item.caption)}">
        <span class="little-card__img">
          <img src="${esc(item.src)}" alt="${esc(item.caption)}" loading="lazy" decoding="async">
          ${item.private ? '<span class="little-card__lock" aria-hidden="true">♥</span>' : ""}
        </span>
        <span class="little-card__caption">${esc(item.caption)}</span>
      </button>
    `).join("");

    rail.addEventListener("click", (e) => {
      const card = e.target.closest("[data-little-index]");
      if (!card) return;
      openLightbox(littleItems, Number(card.dataset.littleIndex));
    });
  }

  /* ---------------- gifts ---------------- */
  const giftState = { group: "all", shown: 12, filtered: [] };

  /* ---------------- wishlist cart ---------------- */
  const WANT_BUDGET = 3000;
  const CART_STORAGE = "loveWishCart_v1";
  const wantItemMap = new Map();
  (giftsData.gifts || []).forEach((g) => {
    if (g.group !== "want") return;
    if (g.bundle && g.choices) {
      g.choices.forEach((c) => {
        if (c.nm) wantItemMap.set(c.nm, { ...c, bundleName: g.name });
      });
    } else if (g.nm) {
      wantItemMap.set(g.nm, g);
    }
  });

  function normalizeCartEntry(entry) {
    if (typeof entry === "string") {
      return wantItemMap.has(String(entry)) ? { nm: String(entry), qty: 1 } : null;
    }
    if (entry && wantItemMap.has(String(entry.nm))) {
      return { nm: String(entry.nm), qty: Math.max(1, Math.min(20, Math.round(Number(entry.qty) || 1))) };
    }
    return null;
  }

  function loadCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_STORAGE) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.map(normalizeCartEntry).filter(Boolean);
    } catch (_) { return []; }
  }
  let cart = loadCart();
  const cartItems = () => cart.map((entry) => {
    const base = wantItemMap.get(entry.nm);
    return base ? { ...base, nm: entry.nm, qty: entry.qty } : null;
  }).filter(Boolean);
  const cartTotal = () => cartItems().reduce((sum, item) => sum + Number(item.price || 0) * item.qty, 0);
  const cartCount = () => cart.reduce((sum, entry) => sum + entry.qty, 0);
  const inCart = (nm) => Boolean(nm) && cart.some((entry) => entry.nm === String(nm));

  function saveCart() {
    try { localStorage.setItem(CART_STORAGE, JSON.stringify(cart)); } catch (_) { /* private mode */ }
  }
  const giftGroups = giftsData.groups || [];
  const gifts = giftsData.gifts || [];

  function giftGroupTitle(id) {
    const g = giftGroups.find((x) => x.id === id);
    return g ? g.title : "Подарок";
  }

  function shortGroup(id) {
    return (content.giftGroupShort || {})[id] || giftGroupTitle(id);
  }

  function renderGiftFilters() {
    const holder = $("#giftFilters");
    if (!holder) return;
    const counts = { all: gifts.length };
    gifts.forEach((g) => { counts[g.group] = (counts[g.group] || 0) + 1; });
    const all = `<button type="button" data-gift-filter="all" class="${giftState.group === "all" ? "is-active" : ""}">Все <small>${gifts.length}</small></button>`;
    const rest = giftGroups.map((g) => `
      <button type="button" data-gift-filter="${esc(g.id)}" class="${giftState.group === g.id ? "is-active" : ""}">
        ${esc(g.emoji)} ${esc(g.title)} <small>${counts[g.id] || 0}</small>
      </button>`).join("");
    holder.innerHTML = all + rest;
  }

  function filteredGifts() {
    return giftState.group === "all" ? gifts : gifts.filter((g) => g.group === giftState.group);
  }

  function updateWantBanner() {
    const banner = $("#wantBanner");
    if (banner) banner.hidden = giftState.group !== "want";
    const total = cartTotal();
    const left = WANT_BUDGET - total;
    const leftEl = $("#wantBudgetLeft");
    if (leftEl) leftEl.textContent = `${left < 0 ? "+" : ""}${Math.abs(left).toLocaleString("ru-RU")} ₽`;
    const labelEl = $("#wantBudgetLabel");
    if (labelEl) labelEl.textContent = left < 0 ? "сверх бюджета" : "осталось";
    const spentEl = $("#wantBudgetSpent");
    if (spentEl) spentEl.textContent = total ? `из ${WANT_BUDGET.toLocaleString("ru-RU")} ₽ · выбрано ${total.toLocaleString("ru-RU")} ₽` : `из ${WANT_BUDGET.toLocaleString("ru-RU")} ₽`;
    const box = leftEl?.closest(".want-banner__budget");
    if (box) box.classList.toggle("is-over", left < 0);
    const bar = $("#wantBudgetBar");
    if (bar) bar.style.width = `${Math.min(100, (total / WANT_BUDGET) * 100)}%`;
    const count = $("#wantCartCount");
    if (count) count.textContent = String(cartCount());
  }

  function renderGifts() {
    const grid = $("#giftGrid");
    const more = $("#giftsMore");
    const count = $("#giftsCount");
    if (!grid) return;
    const list = filteredGifts();
    giftState.filtered = list;
    const slice = list.slice(0, giftState.shown);

    grid.innerHTML = slice.map((g, idx) => {
      const isWant = g.group === "want";
      const canCart = isWant && !g.bundle && Boolean(g.nm);
      const selected = inCart(g.nm);
      const inner = `
        <span class="gift-card__media">
          <span class="gift-card__badge">${g.deleted ? "товар удалён" : esc(shortGroup(g.group))}</span>
          ${g.img
            ? `<img src="${esc(g.img)}" alt="${esc(g.name)}" loading="lazy" decoding="async">`
            : `<span aria-hidden="true">${esc(g.emoji || "🎁")}</span>`}
        </span>
        <span class="gift-card__body">
          <span class="gift-card__brand">${esc(g.brand || (g.deleted ? "остался в памяти" : "Wildberries"))}</span>
          <span class="gift-card__name">${esc(g.name || "Подарок с Wildberries")}</span>
          <span class="gift-card__article">${g.bundle ? `выбрать из ${g.choices.length}` : g.nm ? `арт. ${esc(g.nm)}` : "товар удалён с Wildberries"}</span>
          ${canCart && g.price ? `<span class="gift-card__price">${Number(g.price).toLocaleString("ru-RU")} ₽</span>` : ""}
        </span>`;
      if (isWant) {
        return `
          <article class="gift-card gift-card--want ${selected ? "is-in-cart" : ""}">
            <button class="gift-card__main" type="button" data-gift-index="${idx}" aria-label="${esc(g.name)}">${inner}</button>
            ${canCart ? `<button class="gift-card__cart ${selected ? "is-in-cart" : ""}" type="button" data-cart-toggle="${esc(g.nm)}" aria-label="${selected ? "Удалить из корзины" : "Добавить в корзину"}">${selected ? "✓ в корзине" : "+ в корзину"}</button>` : ""}
          </article>`;
      }
      return `<button class="gift-card ${g.deleted ? "gift-card--deleted" : ""}" type="button" data-gift-index="${idx}" aria-label="${esc(g.name)}">${inner}</button>`;
    }).join("");

    if (more) more.hidden = list.length <= giftState.shown;
    if (count) count.textContent = `Показано ${Math.min(giftState.shown, list.length)} из ${list.length}`;
    updateWantBanner();
    initReveals(grid);
  }

  function setGiftFilter(id) {
    giftState.group = id;
    giftState.shown = 12;
    renderGiftFilters();
    renderGifts();
  }

  function initGifts() {
    const countEl = $("#giftCount");
    if (countEl) countEl.textContent = String(gifts.length);
    renderGiftFilters();
    renderGifts();

    $("#giftFilters")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-gift-filter]");
      if (btn) setGiftFilter(btn.dataset.giftFilter);
    });

    $("#giftsMore")?.addEventListener("click", () => {
      giftState.shown += 12;
      renderGifts();
    });

    $("#giftGrid")?.addEventListener("click", (e) => {
      const cartBtn = e.target.closest("[data-cart-toggle]");
      if (cartBtn) {
        e.stopPropagation();
        toggleCart(cartBtn.dataset.cartToggle);
        return;
      }
      const card = e.target.closest("[data-gift-index]");
      if (!card) return;
      openGift(giftState.filtered[Number(card.dataset.giftIndex)]);
    });

    $("#wantCartBtn")?.addEventListener("click", openCart);

    $("#giftModalMedia")?.addEventListener("click", (e) => {
      const nav = e.target.closest("[data-choice-move]");
      if (nav) moveBundle(Number(nav.dataset.choiceMove));
    });

    $("#giftChoiceDots")?.addEventListener("click", (e) => {
      const dot = e.target.closest("[data-choice-dot]");
      if (dot) setBundleIndex(Number(dot.dataset.choiceDot));
    });

    $("#giftModalBack")?.addEventListener("click", () => {
      if (currentBundle) renderBundle();
    });

    $("#giftModalCartBtn")?.addEventListener("click", () => {
      const item = currentBundle ? currentBundle.choices[bundleState.index] : currentGift;
      if (!item || !item.nm) return;
      if (currentBundle?.allowQuantity) setCartQty(item.nm, inCart(item.nm) ? 0 : bundleState.qty);
      else toggleCart(item.nm);
    });

    $("#giftQtyMinus")?.addEventListener("click", () => {
      bundleState.qty = Math.max(1, bundleState.qty - 1);
      renderBundle();
    });

    $("#giftQtyPlus")?.addEventListener("click", () => {
      bundleState.qty = Math.min(20, bundleState.qty + 1);
      renderBundle();
    });

    $("#giftModalVideoBtn")?.addEventListener("click", () => {
      openLightbox([
        { type: "video", src: "assets/videos/v16.mp4", caption: "Как пришел подарок ♥" }
      ], 0);
    });

    $$("[data-gift-jump]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setGiftFilter(btn.dataset.giftJump);
        document.getElementById("gifts")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      });
    });
  }

  let currentGift = null;
  let currentBundle = null;
  const bundleState = { index: 0, qty: 1 };

  function setGiftMedia(src, name, emoji, carousel) {
    const mediaEl = $("#giftModalMedia");
    if (!mediaEl) return;
    mediaEl.classList.toggle("is-carousel", Boolean(carousel));
    const nav = carousel ? `
      <button class="gift-carousel__nav gift-carousel__nav--prev" type="button" data-choice-move="-1" aria-label="Предыдущий вариант">←</button>
      <button class="gift-carousel__nav gift-carousel__nav--next" type="button" data-choice-move="1" aria-label="Следующий вариант">→</button>` : "";
    mediaEl.innerHTML = (src
      ? `<img src="${esc(src)}" alt="${esc(name)}">`
      : `<span class="gift-modal__emoji" aria-hidden="true">${esc(emoji || "🎁")}</span>`) + nav;
  }

  function syncCartButton(item) {
    const btn = $("#giftModalCartBtn");
    if (!btn) return;
    const canCart = Boolean(item && item.nm && wantItemMap.has(String(item.nm)));
    btn.hidden = !canCart;
    if (!canCart) return;
    const selected = inCart(item.nm);
    const qty = currentBundle?.allowQuantity ? bundleState.qty : 1;
    btn.classList.toggle("is-in-cart", selected);
    btn.textContent = selected
      ? "✓ убрать из корзины"
      : qty > 1 ? `добавить ${qty} ${packWord(qty)} в корзину ♥` : "в корзину";
    btn.setAttribute("aria-pressed", String(selected));
  }

  function fillGiftFields(item, noteOverride) {
    $("#giftModalBrand").textContent = item.brand || "Wildberries";
    $("#giftModalName").textContent = item.name || "Подарок";
    $("#giftModalSubject").textContent = item.subject || "";
    const desc = $("#giftModalDesc");
    if (desc) {
      desc.textContent = item.desc || "";
      desc.hidden = !item.desc;
    }
    const notes = [noteOverride, item.note].filter(Boolean);
    $("#giftModalNote").textContent = notes.join(" ");
    const article = $("#giftModalArticle");
    if (article) {
      const chipMatch = String(item.nm || "").match(/^ЧИПСЫ-(\d+)$/);
      const articleText = chipMatch
        ? `Вкус ${chipMatch[1]} из 20 — около 130 ₽ за пачку`
        : item.nm ? `Артикул Wildberries: ${item.nm}` : "";
      article.textContent = articleText;
      article.hidden = !articleText;
    }
    const price = $("#giftModalPrice");
    if (price) {
      const showPrice = item.priceNote || (item.price ? `${Number(item.price).toLocaleString("ru-RU")} ₽` : "");
      price.textContent = showPrice;
      price.hidden = !showPrice;
    }
    const link = $("#giftModalLink");
    if (link) {
      if (item.url) {
        link.href = item.url;
        link.hidden = false;
      } else {
        link.removeAttribute("href");
        link.hidden = true;
      }
    }
    const videoBtn = $("#giftModalVideoBtn");
    if (videoBtn) videoBtn.hidden = item.nm !== "519150168";
    syncCartButton(item);
  }

  function renderGiftDetail(g) {
    if (!g) return;
    setGiftMedia(g.img, g.name, g.emoji || "🎁");
    $("#giftCarousel").hidden = true;
    const qtyBox = $("#giftQuantityBox");
    if (qtyBox) qtyBox.hidden = true;
    const back = $("#giftModalBack");
    if (back) back.hidden = !currentBundle;
    fillGiftFields(g);
  }

  function renderBundle() {
    const g = currentBundle;
    if (!g || !g.choices || !g.choices.length) return;
    bundleState.index = Math.max(0, Math.min(bundleState.index, g.choices.length - 1));
    const item = g.choices[bundleState.index];
    setGiftMedia(item.img, item.name, g.emoji || "🎁", true);
    fillGiftFields(item, g.note || "");
    $("#giftModalSubject").textContent = `${item.brand ? item.brand + " · " : ""}вариант ${bundleState.index + 1} из ${g.choices.length} — листай стрелками ♥`;
    const carousel = $("#giftCarousel");
    if (carousel) {
      carousel.hidden = false;
      const counter = $("#giftChoiceCounter");
      if (counter) counter.textContent = `${bundleState.index + 1} из ${g.choices.length}`;
      const dots = $("#giftChoiceDots");
      if (dots) dots.innerHTML = g.choices.map((c, i) => `
        <button type="button" data-choice-dot="${i}" class="${i === bundleState.index ? "is-active" : ""}" aria-label="Вариант ${i + 1}" aria-pressed="${i === bundleState.index}"></button>`).join("");
    }
    const qtyBox = $("#giftQuantityBox");
    if (qtyBox) qtyBox.hidden = !g.allowQuantity;
    const qtyOut = $("#giftQuantity");
    if (qtyOut) qtyOut.textContent = String(bundleState.qty);
    const back = $("#giftModalBack");
    if (back) back.hidden = true;
  }

  function setBundleIndex(index) {
    if (!currentBundle) return;
    bundleState.index = index;
    renderBundle();
  }

  function moveBundle(dir) {
    if (!currentBundle || !currentBundle.choices.length) return;
    const n = currentBundle.choices.length;
    bundleState.index = (bundleState.index + dir + n) % n;
    renderBundle();
  }

  function openGift(g) {
    if (!g) return;
    const modal = $("#giftModal");
    if (!modal) return;
    currentGift = g;
    currentBundle = g.bundle && g.choices && g.choices.length ? g : null;
    bundleState.index = 0;
    bundleState.qty = 1;
    if (currentBundle) renderBundle();
    else renderGiftDetail(g);
    openModal(modal);
  }

  /* ---------------- cart actions ---------------- */
  function packWord(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "пачку";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "пачки";
    return "пачек";
  }

  function afterCartChange(nm) {
    saveCart();
    renderGifts();
    const activeItem = currentBundle ? currentBundle.choices[bundleState.index] : currentGift;
    if (activeItem && String(activeItem.nm) === nm) syncCartButton(activeItem);
    if ($("#cartModal")?.classList.contains("is-open")) renderCart();
  }

  function toggleCart(nm) {
    nm = String(nm || "");
    if (!wantItemMap.has(nm)) return;
    const i = cart.findIndex((entry) => entry.nm === nm);
    if (i >= 0) {
      cart.splice(i, 1);
      toast("Убрала из корзины");
    } else {
      cart.push({ nm, qty: 1 });
      toast("Добавила в корзину ♥");
    }
    afterCartChange(nm);
  }

  function removeFromCart(nm) {
    nm = String(nm || "");
    const before = cart.length;
    cart = cart.filter((entry) => entry.nm !== nm);
    if (before !== cart.length) toast("Убрала из корзины");
    afterCartChange(nm);
  }

  function setCartQty(nm, qty) {
    nm = String(nm || "");
    if (!wantItemMap.has(nm)) return;
    qty = Math.max(0, Math.min(20, Math.round(Number(qty) || 0)));
    const i = cart.findIndex((entry) => entry.nm === nm);
    if (qty === 0) {
      if (i >= 0) cart.splice(i, 1);
      toast("Убрала из корзины");
    } else if (i >= 0) {
      cart[i].qty = qty;
      toast(`Теперь ${qty} ${packWord(qty)} в корзине ♥`);
    } else {
      cart.push({ nm, qty });
      toast(`Добавила ${qty} ${packWord(qty)} в корзину ♥`);
    }
    afterCartChange(nm);
  }

  function renderCart() {
    const holder = $("#cartItems");
    if (!holder) return;
    const items = cartItems();
    holder.innerHTML = items.length ? items.map((item) => `
      <div class="cart-item">
        ${item.img ? `<img src="${esc(item.img)}" alt="">` : `<span aria-hidden="true">🎁</span>`}
        <span class="cart-item__text">
          <b>${esc(item.name)}</b>
          <small>арт. ${esc(item.nm)}${item.bundleName ? ` · ${esc(item.bundleName)}` : ""}${item.qty > 1 ? ` · ${item.qty} шт.` : ""}</small>
          <em>${(Number(item.price || 0) * item.qty).toLocaleString("ru-RU")} ₽</em>
        </span>
        <span class="cart-item__qty">
          <button type="button" data-cart-qty="-1" data-cart-nm="${esc(item.nm)}" aria-label="Уменьшить количество">−</button>
          <span>${item.qty}</span>
          <button type="button" data-cart-qty="1" data-cart-nm="${esc(item.nm)}" aria-label="Увеличить количество">+</button>
        </span>
        <button class="cart-item__remove" type="button" data-cart-remove="${esc(item.nm)}" aria-label="Удалить из корзины">×</button>
      </div>`).join("") : `<p class="cart-empty">Пока пусто. Добавь то, что хочется ♥</p>`;

    const total = cartTotal();
    const left = WANT_BUDGET - total;
    const totalEl = $("#cartTotal");
    if (totalEl) totalEl.textContent = items.length ? `Итого: ${total.toLocaleString("ru-RU")} ₽ · ${cartCount()} шт.` : "Пока пусто ♥";
    const leftEl = $("#cartLeft");
    if (leftEl) leftEl.textContent = items.length
      ? (left >= 0
        ? `Осталось из ${WANT_BUDGET.toLocaleString("ru-RU")} ₽: ${left.toLocaleString("ru-RU")} ₽`
        : `Чуть больше бюджета на ${Math.abs(left).toLocaleString("ru-RU")} ₽ — ничего страшно, мне для тебя ничего не жалко ♥`)
      : "";

    const tg = $("#cartTelegram");
    if (tg) {
      if (items.length && tgName) {
        const lines = items.map((it, i) => `${i + 1}. ${it.name}${it.qty > 1 ? ` × ${it.qty}` : ""} — арт. ${it.nm}, ${(Number(it.price || 0) * it.qty).toLocaleString("ru-RU")} ₽`);
        const text = `Привет! Я посмотрела «что ты хочешь» и выбрала ♥\n\n${lines.join("\n")}\n\nИтого: ${total.toLocaleString("ru-RU")} ₽\nНе раньше 10 декабря 🥺`;
        tg.href = tgLink(text);
        tg.hidden = false;
      } else {
        tg.removeAttribute("href");
        tg.hidden = true;
      }
    }
    updateWantBanner();
  }

  function openCart() {
    renderCart();
    openModal($("#cartModal"));
  }

  function initCart() {
    $$("[data-close-cart]").forEach((el) => el.addEventListener("click", () => closeModal($("#cartModal"))));
    $("#cartItems")?.addEventListener("click", (e) => {
      const qtyBtn = e.target.closest("[data-cart-qty]");
      if (qtyBtn) {
        const nm = qtyBtn.dataset.cartNm;
        const entry = cart.find((item) => item.nm === nm);
        if (entry) setCartQty(nm, entry.qty + Number(qtyBtn.dataset.cartQty));
        return;
      }
      const btn = e.target.closest("[data-cart-remove]");
      if (btn) removeFromCart(btn.dataset.cartRemove);
    });
    $("#cartClear")?.addEventListener("click", () => {
      if (!cart.length) return;
      cart = [];
      saveCart();
      renderCart();
      renderGifts();
      toast("Корзина очищена");
    });
    updateWantBanner();
  }

  /* ---------------- coupons ---------------- */
  const couponKey = "loveCoupons_v1";
  let activeCoupons = new Set();
  try {
    const raw = localStorage.getItem(couponKey);
    if (raw) activeCoupons = new Set(JSON.parse(raw));
  } catch (e) { /* ignore */ }

  function saveCoupons() {
    try { localStorage.setItem(couponKey, JSON.stringify(Array.from(activeCoupons))); } catch (e) { /* ignore */ }
  }

  function renderCoupons() {
    const grid = $("#couponGrid");
    if (!grid) return;
    grid.innerHTML = (content.coupons || []).map((c, i) => {
      const active = activeCoupons.has(i);
      return `
        <button class="coupon ${active ? "is-active" : ""}" type="button" data-coupon="${i}" aria-pressed="${active}">
          <span class="coupon__icon" aria-hidden="true">${esc(c.icon)}</span>
          <h3>${esc(c.title)}</h3>
          <p>${esc(c.text)}</p>
          <span class="coupon__stamp">активирован</span>
        </button>`;
    }).join("");
    updateCouponCounter();
    initReveals(grid);
  }

  function updateCouponCounter() {
    const el = $("#couponCounter");
    if (el) {
      const total = (content.coupons || []).length;
      if (activeCoupons.size === total && total > 0) {
        el.textContent = "Ты активировала все. Я в опасности. Самой лучшей опасности в моей жизни.";
      } else {
        el.textContent = `Активировано ${activeCoupons.size} из ${total}. Осталось только предъявить.`;
      }
    }
    updateCouponTg();
  }

  function updateCouponTg() {
    const link = $("#couponTg");
    if (!link) return;
    if (!tgName || activeCoupons.size === 0) {
      link.hidden = true;
      return;
    }
    const chosen = Array.from(activeCoupons)
      .sort((a, b) => a - b)
      .map((i) => (content.coupons || [])[i]?.title)
      .filter(Boolean);
    const text = "Я выбрала купоны любви:\n" + chosen.map((title, i) => `${i + 1}) ${title}`).join("\n") + "\n♥";
    link.href = tgLink(text);
    link.hidden = false;
  }

  function initCoupons() {
    renderCoupons();
    $("#couponGrid")?.addEventListener("click", (e) => {
      const card = e.target.closest("[data-coupon]");
      if (!card) return;
      const i = Number(card.dataset.coupon);
      if (activeCoupons.has(i)) {
        activeCoupons.delete(i);
        card.classList.remove("is-active");
        card.setAttribute("aria-pressed", "false");
        toast("Купон снова спрятан в кармашек");
      } else {
        activeCoupons.add(i);
        card.classList.add("is-active");
        card.setAttribute("aria-pressed", "true");
        spawnHearts(card, 10, 0.7);
        toast("Купон активирован. Отправь мне выбор в Telegram ♥");
      }
      saveCoupons();
      updateCouponCounter();
    });
  }

  /* ---------------- planner ---------------- */
  const TODAY = startOfToday();
  const MAX_DATE = addDays(TODAY, 120);

  const planner = {
    step: 1,
    activity: null,
    custom: "",
    date: null,
    time: "",
    view: new Date(TODAY.getFullYear(), TODAY.getMonth(), 1),
    accepted: false,
    invite: null
  };

  function renderActivities() {
    const grid = $("#activityGrid");
    if (!grid) return;
    grid.innerHTML = (content.activities || []).map((a) => `
      <button class="activity" type="button" data-activity="${esc(a.id)}" aria-pressed="false">
        <span class="activity__check" aria-hidden="true">✓</span>
        <span class="activity__emoji" aria-hidden="true">${esc(a.emoji)}</span>
        <span class="activity__title">${esc(a.title)}</span>
        <span class="activity__desc">${esc(a.desc)}</span>
      </button>
    `).join("");
  }

  function activityLabel() {
    if (!planner.activity) return "—";
    if (planner.activity === "her") return collapse(planner.custom) || "Твой выбор";
    const a = (content.activities || []).find((x) => x.id === planner.activity);
    return a ? a.title : "Свидание";
  }

  function updateStep1() {
    const btn = $("#toStep2");
    const hint = $("#step1Hint");
    const customWrap = $("#customActivityWrap");
    if (customWrap) customWrap.hidden = planner.activity !== "her";
    const valid = !!planner.activity && (planner.activity !== "her" || collapse(planner.custom).length > 0);
    if (btn) btn.disabled = !valid;
    if (hint) {
      if (!planner.activity) hint.textContent = "выбери, и мы продолжим";
      else if (!valid) hint.textContent = "напиши, куда хочешь — я всё организую";
      else hint.textContent = "отличный выбор. теперь дата ♥";
    }
  }

  function selectActivity(id) {
    planner.activity = id;
    $$(".activity").forEach((el) => {
      const on = el.dataset.activity === id;
      el.classList.toggle("is-selected", on);
      el.setAttribute("aria-pressed", String(on));
    });
    updateStep1();
    markPlannerChanged();
  }

  function renderTimes() {
    const holder = $("#timeSlots");
    if (!holder) return;
    holder.innerHTML = (content.times || []).map((t) => `
      <button class="time-slot" type="button" data-time="${esc(t)}">${esc(t)}</button>
    `).join("");
  }

  function selectTime(time, fromSlots = true) {
    planner.time = time;
    $$(".time-slot").forEach((el) => {
      const on = fromSlots && el.dataset.time === time;
      el.classList.toggle("is-selected", on);
    });
    if (fromSlots) {
      const custom = $("#customTime");
      if (custom) custom.value = "";
    }
    updateSelectedLine();
    markPlannerChanged();
  }

  function updateSelectedLine() {
    const el = $("#selectedDateTime");
    const btn = $("#toStep3");
    if (!el) return;
    if (planner.date && planner.time) el.textContent = `${fmtLong(planner.date)}, ${planner.time}`;
    else if (planner.date) el.textContent = `${fmtLong(planner.date)} — осталось выбрать время`;
    else if (planner.time) el.textContent = `${planner.time} — осталось выбрать день`;
    else el.textContent = "пока ничего";
    if (btn) btn.disabled = !(planner.date && planner.time);
  }

  function renderCalendar() {
    const days = $("#calDays");
    const month = $("#calMonth");
    const prev = $("#calPrev");
    const next = $("#calNext");
    if (!days || !month) return;

    const y = planner.view.getFullYear();
    const m = planner.view.getMonth();
    month.textContent = `${MONTHS_NOM[m]} ${y}`;

    const first = new Date(y, m, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const count = new Date(y, m + 1, 0).getDate();
    const todayKey = dateKey(TODAY);

    let html = "";
    for (let i = 0; i < startOffset; i++) {
      html += `<span class="calendar__day is-empty" aria-hidden="true"></span>`;
    }
    for (let d = 1; d <= count; d++) {
      const date = new Date(y, m, d);
      const key = dateKey(date);
      const disabled = date < TODAY || date > MAX_DATE;
      const classes = ["calendar__day"];
      if ([0, 6].includes(date.getDay())) classes.push("is-weekend");
      if (key === todayKey) classes.push("is-today");
      if (planner.date && sameDay(date, planner.date)) classes.push("is-selected");
      html += `<button class="${classes.join(" ")}" type="button" data-date="${key}" ${disabled ? "disabled" : ""}>${d}</button>`;
    }
    days.innerHTML = html;

    const currentView = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1).getTime();
    const maxView = new Date(MAX_DATE.getFullYear(), MAX_DATE.getMonth(), 1).getTime();
    if (prev) prev.disabled = new Date(y, m, 1).getTime() <= currentView;
    if (next) next.disabled = new Date(y, m, 1).getTime() >= maxView;
  }

  function renderQuickDates() {
    const holder = $("#calQuick");
    if (!holder) return;
    const sat = nextWeekday(6);
    const sun = nextWeekday(0);
    const week = addDays(TODAY, 7);
    const quick = [
      { label: `ближайшая суббота · ${fmtShort(sat)}`, date: sat },
      { label: `ближайшее воскресенье · ${fmtShort(sun)}`, date: sun },
      { label: `через неделю · ${fmtShort(week)}`, date: week }
    ];
    holder.innerHTML = quick.map((q, i) => `<button type="button" data-quick-date="${i}">${esc(q.label)}</button>`).join("");
    holder._quick = quick.map((q) => q.date);
  }

  function nextWeekday(target) {
    const d = new Date(TODAY);
    const diff = (target - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function selectDate(date) {
    if (!date) return;
    planner.date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    planner.view = new Date(date.getFullYear(), date.getMonth(), 1);
    renderCalendar();
    updateSelectedLine();
    markPlannerChanged();
  }

  function goStep(step, scroll = true) {
    planner.step = step;
    $$(".planner-step").forEach((el) => el.classList.toggle("is-active", Number(el.dataset.step) === step));
    $$(".stepper__item").forEach((el) => {
      const n = Number(el.dataset.stepDot);
      el.classList.toggle("is-active", n === step);
      el.classList.toggle("is-done", n < step);
    });
    if (step === 3) updateTicket();
    if (scroll && window.innerWidth < 900) {
      $("#planner")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    }
  }

  function makeCode(date, time) {
    const seed = `${dateKey(date)}${time}${planner.activity}${planner.custom}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return `LOVE-${pad(date.getMonth() + 1)}${pad(date.getDate())}-${String(h % 10000).padStart(4, "0")}`;
  }

  function updateTicket() {
    if (!planner.date) return;
    $("#ticketActivity").textContent = activityLabel();
    $("#ticketDate").textContent = `${fmtLong(planner.date)}`;
    $("#ticketTime").textContent = planner.time || "—";
    $("#ticketCode").textContent = makeCode(planner.date, planner.time || "00:00");
    const comment = collapse($("#inviteComment")?.value);
    $("#ticketNote").textContent = comment || "С тобой — куда угодно.";
  }

  function markPlannerChanged() {
    if (planner.accepted) {
      planner.accepted = false;
      const ticket = $("#ticket");
      if (ticket) ticket.classList.remove("is-accepted");
      const success = $("#inviteSuccess");
      if (success) success.hidden = true;
      const actions = $("#inviteActions");
      if (actions) actions.hidden = false;
    }
    if (planner.step === 3) updateTicket();
  }

  function buildInvite() {
    return {
      activityId: planner.activity,
      activity: activityLabel(),
      custom: planner.custom,
      dateISO: dateKey(planner.date),
      dateLabel: fmtLong(planner.date),
      time: planner.time,
      comment: collapse($("#inviteComment")?.value),
      code: $("#ticketCode")?.textContent || "",
      createdAt: new Date().toISOString()
    };
  }

  function countdownTarget(invite) {
    if (!invite) return null;
    const parts = invite.dateISO.split("-").map(Number);
    const time = (invite.time || "00:00").split(":").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], time[0] || 0, time[1] || 0, 0);
  }

  let countdownTimer = null;

  function startCountdown(invite) {
    const target = countdownTarget(invite);
    if (!target) return;
    clearInterval(countdownTimer);
    const update = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        $("#cdDays").textContent = "00";
        $("#cdHours").textContent = "00";
        $("#cdMinutes").textContent = "00";
        $("#cdSeconds").textContent = "00";
        clearInterval(countdownTimer);
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      $("#cdDays").textContent = pad(days);
      $("#cdHours").textContent = pad(hours);
      $("#cdMinutes").textContent = pad(mins);
      $("#cdSeconds").textContent = pad(secs);
    };
    update();
    countdownTimer = setInterval(update, 1000);
  }

  function inviteText(invite) {
    return [
      "Я выбираю: " + invite.activity + ".",
      "Дата: " + invite.dateLabel + ", " + invite.time + ".",
      invite.comment ? "Комментарий: " + invite.comment : ""
    ].filter(Boolean).join("\n");
  }

  function showAccepted(invite, animate) {
    planner.accepted = true;
    planner.invite = invite;
    const ticket = $("#ticket");
    if (ticket) ticket.classList.add("is-accepted");
    const actions = $("#inviteActions");
    if (actions) actions.hidden = true;
    const success = $("#inviteSuccess");
    if (success) success.hidden = false;
    startCountdown(invite);

    const text = inviteText(invite) + (invite.code ? `\nКод: ${invite.code}` : "");
    const share = $("#shareTg");
    if (share) {
      share.href = tgName ? tgLink(text) : "#";
      share.hidden = !tgName;
    }

    if (animate) {
      spawnConfetti(150);
      setTimeout(() => success?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" }), 200);
    }
  }

  function acceptInvite() {
    if (!planner.date || !planner.time) {
      toast("Сначала выбери дату и время");
      return;
    }
    updateTicket();
    const invite = buildInvite();
    try { localStorage.setItem("ourDateInvite_v1", JSON.stringify(invite)); } catch (e) { /* ignore */ }
    showAccepted(invite, true);
    toast("Приглашение принято. Я уже придумываю детали ♥");
  }

  function restoreInvite() {
    let invite = null;
    try {
      const raw = localStorage.getItem("ourDateInvite_v1");
      if (raw) invite = JSON.parse(raw);
    } catch (e) { /* ignore */ }
    if (!invite || !invite.dateISO) return;

    const parts = invite.dateISO.split("-").map(Number);
    planner.date = new Date(parts[0], parts[1] - 1, parts[2]);
    planner.time = invite.time || "";
    planner.activity = invite.activityId || null;
    planner.custom = invite.custom || "";
    planner.view = new Date(planner.date.getFullYear(), planner.date.getMonth(), 1);

    const customInput = $("#customActivity");
    if (customInput) customInput.value = planner.custom;
    const comment = $("#inviteComment");
    if (comment) comment.value = invite.comment || "";

    selectActivity(planner.activity);
    selectTime(planner.time, (content.times || []).includes(planner.time));
    updateSelectedLine();
    renderCalendar();
    updateTicket();
  }

  function initPlanner() {
    renderActivities();
    renderTimes();
    renderQuickDates();
    renderCalendar();
    updateStep1();
    updateSelectedLine();

    $("#activityGrid")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-activity]");
      if (btn) selectActivity(btn.dataset.activity);
    });

    $("#customActivity")?.addEventListener("input", (e) => {
      planner.custom = e.target.value;
      updateStep1();
      markPlannerChanged();
    });

    $("#toStep2")?.addEventListener("click", () => {
      if (planner.activity === "her" && !collapse(planner.custom)) {
        toast("Напиши, куда ты хочешь — я всё организую");
        return;
      }
      goStep(2);
    });

    $("#backTo1")?.addEventListener("click", () => goStep(1));
    $("#backTo2")?.addEventListener("click", () => goStep(2));

    $("#toStep3")?.addEventListener("click", () => {
      if (!planner.date || !planner.time) {
        toast("Выбери дату и время");
        return;
      }
      goStep(3);
    });

    $("#calPrev")?.addEventListener("click", () => {
      planner.view = new Date(planner.view.getFullYear(), planner.view.getMonth() - 1, 1);
      renderCalendar();
    });

    $("#calNext")?.addEventListener("click", () => {
      planner.view = new Date(planner.view.getFullYear(), planner.view.getMonth() + 1, 1);
      renderCalendar();
    });

    $("#calDays")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-date]");
      if (!btn || btn.disabled) return;
      const [y, m, d] = btn.dataset.date.split("-").map(Number);
      selectDate(new Date(y, m - 1, d));
    });

    $("#calQuick")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-quick-date]");
      if (!btn) return;
      const quick = $("#calQuick")._quick || [];
      selectDate(quick[Number(btn.dataset.quickDate)]);
    });

    $("#timeSlots")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-time]");
      if (btn) selectTime(btn.dataset.time, true);
    });

    $("#customTime")?.addEventListener("input", (e) => {
      if (e.target.value) selectTime(e.target.value, false);
    });

    $("#inviteComment")?.addEventListener("input", () => {
      updateTicket();
      markPlannerChanged();
    });

    $("#acceptInvite")?.addEventListener("click", acceptInvite);

    $("#changeInvite")?.addEventListener("click", () => {
      showActionsAgain();
    });

    $("#copyInvite")?.addEventListener("click", async () => {
      if (!planner.invite) return;
      const text = inviteText(planner.invite);
      try {
        await navigator.clipboard.writeText(text);
        toast("Скопировано. Отправь мне ♥");
      } catch (e) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); toast("Скопировано. Отправь мне ♥"); }
        catch (err) { toast("Не получилось скопировать — выдели текст в билете"); }
        ta.remove();
      }
    });

    restoreInvite();
  }

  function showActionsAgain() {
    planner.accepted = false;
    const ticket = $("#ticket");
    if (ticket) ticket.classList.remove("is-accepted");
    const success = $("#inviteSuccess");
    if (success) success.hidden = true;
    const actions = $("#inviteActions");
    if (actions) actions.hidden = false;
  }

  /* ---------------- modal / lightbox ---------------- */
  let lastFocused = null;

  function openModal(modal) {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    const close = modal.querySelector(".modal__close");
    setTimeout(() => close?.focus(), 50);
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".modal.is-open") && !document.querySelector(".lightbox.is-open")) {
      document.body.classList.remove("no-scroll");
    }
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function initModals() {
    $$("[data-close-gift]").forEach((el) => el.addEventListener("click", () => closeModal($("#giftModal"))));
    $$("[data-close-time]").forEach((el) => el.addEventListener("click", () => closeModal($("#timeModal"))));

    $("#needTime")?.addEventListener("click", () => openModal($("#timeModal")));
    $("#needTimeFinal")?.addEventListener("click", () => openModal($("#timeModal")));

    if (tgName) {
      const link = $("#timeModalTg");
      if (link) {
        link.href = tgLink("Мне нужно время. Я напишу, когда буду готова ♥");
        link.hidden = false;
      }
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if ($("#lightbox")?.classList.contains("is-open")) closeLightbox();
        else if ($("#cartModal")?.classList.contains("is-open")) closeModal($("#cartModal"));
        else if ($("#giftModal")?.classList.contains("is-open")) closeModal($("#giftModal"));
        else if ($("#timeModal")?.classList.contains("is-open")) closeModal($("#timeModal"));
      }
    });
  }

  const lb = { items: [], index: 0 };

  function openLightbox(items, index) {
    lb.items = items || [];
    lb.index = index || 0;
    const box = $("#lightbox");
    if (!box) return;
    box.classList.add("is-open");
    box.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    renderLightbox();
  }

  function renderLightbox() {
    const stage = $("#lightboxStage");
    const caption = $("#lightboxCaption");
    const prev = $("#lightboxPrev");
    const next = $("#lightboxNext");
    const item = lb.items[lb.index];
    if (!stage || !item) return;
    stage.innerHTML = "";
    if (item.type === "video") {
      const v = document.createElement("video");
      v.src = item.src;
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      stage.appendChild(v);
    } else {
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.caption || "";
      stage.appendChild(img);
    }
    if (caption) caption.textContent = item.caption || "";
    const multi = lb.items.length > 1;
    if (prev) prev.hidden = !multi;
    if (next) next.hidden = !multi;
  }

  function closeLightbox() {
    const box = $("#lightbox");
    if (!box || !box.classList.contains("is-open")) return;
    box.classList.remove("is-open");
    box.setAttribute("aria-hidden", "true");
    const stage = $("#lightboxStage");
    if (stage) {
      stage.querySelector("video")?.pause();
      stage.innerHTML = "";
    }
    lb.items = [];
    lb.index = 0;
    if (!document.querySelector(".modal.is-open")) document.body.classList.remove("no-scroll");
  }

  function moveLightbox(dir) {
    if (!lb.items.length) return;
    lb.index = (lb.index + dir + lb.items.length) % lb.items.length;
    renderLightbox();
  }

  function initLightbox() {
    const box = $("#lightbox");
    box?.addEventListener("click", (e) => {
      if (e.target.closest?.("[data-close-lightbox], #lightboxClose")) {
        e.preventDefault();
        closeLightbox();
        return;
      }
      if (e.target === box || e.target.id === "lightboxStage") closeLightbox();
    });

    $("#lightboxPrev")?.addEventListener("click", () => moveLightbox(-1));
    $("#lightboxNext")?.addEventListener("click", () => moveLightbox(1));

    document.addEventListener("keydown", (e) => {
      if (!$("#lightbox")?.classList.contains("is-open")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeLightbox();
        return;
      }
      if (e.key === "ArrowLeft") moveLightbox(-1);
      if (e.key === "ArrowRight") moveLightbox(1);
    });

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-photo-src], [data-video-src]");
      if (!btn) return;
      const caption = btn.dataset.caption || "";
      if (btn.dataset.photoSrc) {
        openLightbox([{ type: "photo", src: btn.dataset.photoSrc, caption }], 0);
      } else if (btn.dataset.videoSrc) {
        openLightbox([{ type: "video", src: btn.dataset.videoSrc, caption }], 0);
      }
    });
  }

  /* ---------------- FX: hearts & confetti ---------------- */
  const canvas = $("#fxCanvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  let particles = [];
  let fxRunning = false;
  let dpr = 1;

  function resizeCanvas() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function heartPath(c, x, y, size, rotate) {
    c.save();
    c.translate(x, y);
    c.rotate(rotate);
    c.beginPath();
    const s = size;
    c.moveTo(0, s * 0.3);
    c.bezierCurveTo(0, -s * 0.1, -s * 0.5, -s * 0.25, -s * 0.5, -s * 0.6);
    c.bezierCurveTo(-s * 0.5, -s * 1.1, 0, -s * 1.05, 0, -s * 0.65);
    c.bezierCurveTo(0, -s * 1.05, s * 0.5, -s * 1.1, s * 0.5, -s * 0.6);
    c.bezierCurveTo(s * 0.5, -s * 0.25, 0, -s * 0.1, 0, s * 0.3);
    c.closePath();
    c.restore();
  }

  function addParticles(x, y, count, mode) {
    const colors = ["#d95d78", "#f7c8d3", "#b8405d", "#c49a5a", "#ffdfe5", "#ff9db3"];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = mode === "confetti" ? 3 + Math.random() * 9 : 1 + Math.random() * 4;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (mode === "confetti" ? 3 : 1),
        g: mode === "confetti" ? 0.16 : -0.015,
        drag: mode === "confetti" ? 0.994 : 0.985,
        size: mode === "confetti" ? 4 + Math.random() * 7 : 7 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.18,
        life: 1,
        decay: mode === "confetti" ? 0.006 + Math.random() * 0.006 : 0.008 + Math.random() * 0.008,
        heart: mode !== "confetti" || Math.random() > 0.45,
        wobble: Math.random() * 10
      });
    }
    if (!fxRunning) {
      fxRunning = true;
      requestAnimationFrame(fxLoop);
    }
  }

  function fxLoop() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += p.g;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= p.decay;
      if (p.life <= 0 || p.y > window.innerHeight + 80) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      if (p.heart) {
        heartPath(ctx, p.x, p.y, p.size, p.rot);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
    }
    ctx.restore();
    if (particles.length) {
      requestAnimationFrame(fxLoop);
    } else {
      fxRunning = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function spawnHearts(el, count = 22, spread = 1) {
    if (reducedMotion) return;
    const rect = el?.getBoundingClientRect ? el.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    addParticles(x, y, count, "hearts");
    if (spread > 0.8) {
      setTimeout(() => addParticles(x + (Math.random() - 0.5) * 60, y, Math.round(count * 0.4), "hearts"), 90);
    }
  }

  function spawnConfetti(count = 140) {
    if (reducedMotion) return;
    addParticles(window.innerWidth / 2, window.innerHeight * 0.32, count, "confetti");
    setTimeout(() => addParticles(window.innerWidth * 0.2, window.innerHeight * 0.3, Math.round(count * 0.35), "confetti"), 180);
    setTimeout(() => addParticles(window.innerWidth * 0.8, window.innerHeight * 0.3, Math.round(count * 0.35), "confetti"), 320);
  }

  /* ---------------- music ---------------- */
  let audioCtx = null;
  let masterGain = null;
  let musicTimer = null;
  let musicOn = false;
  let stepIndex = 0;
  let musicMood = "tender";
  let musicLevel = 1;
  let musicFilter = null;
  let musicDelay = null;
  let musicFeedback = null;
  let musicWet = null;

  const musicModes = {
    tender: {
      label: "Нежно",
      melody: [523.25, 587.33, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 523.25, 659.25, 783.99, 880, 1046.5, 880, 783.99, 659.25],
      bass: [130.81, 146.83, 174.61, 196],
      step: 520, noteDur: 1.1, bassDur: 2.2, volume: 1.0,
      filter: 1800, delay: 0.34, feedback: 0.22, wet: 0.25, lead: "triangle"
    },
    night: {
      label: "Ночь",
      melody: [392, 440, 523.25, 493.88, 392, 349.23, 392, 440, 329.63, 392, 440, 523.25, 493.88, 440, 392, 349.23],
      bass: [98, 110, 130.81, 87.31],
      step: 720, noteDur: 1.7, bassDur: 3.2, volume: 0.9,
      filter: 1100, delay: 0.48, feedback: 0.3, wet: 0.32, lead: "sine"
    },
    morning: {
      label: "Тёплое утро",
      melody: [659.25, 783.99, 880, 987.77, 880, 783.99, 659.25, 587.33, 659.25, 783.99, 1046.5, 987.77, 880, 783.99, 659.25, 587.33],
      bass: [164.81, 196, 220, 174.61],
      step: 440, noteDur: 0.9, bassDur: 1.8, volume: 0.95,
      filter: 2600, delay: 0.24, feedback: 0.16, wet: 0.2, lead: "triangle"
    },
    home: {
      label: "Мы дома",
      melody: [440, 493.88, 587.33, 523.25, 440, 392, 440, 493.88, 349.23, 392, 440, 523.25, 493.88, 440, 392, 349.23],
      bass: [110, 130.81, 146.83, 98],
      step: 600, noteDur: 1.4, bassDur: 2.8, volume: 0.95,
      filter: 1500, delay: 0.4, feedback: 0.26, wet: 0.28, lead: "sine"
    }
  };

  function currentMode() {
    return musicModes[musicMood] || musicModes.tender;
  }

  function masterTarget() {
    return currentMode().volume * musicLevel;
  }

  function rampMaster(value, seconds = 1) {
    if (!audioCtx || !masterGain) return;
    const t = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(value, t + seconds);
  }

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      audioCtx = new AC();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0;
      musicFilter = audioCtx.createBiquadFilter();
      musicFilter.type = "lowpass";
      musicDelay = audioCtx.createDelay();
      musicFeedback = audioCtx.createGain();
      musicWet = audioCtx.createGain();
      masterGain.connect(musicFilter);
      musicFilter.connect(audioCtx.destination);
      musicFilter.connect(musicDelay);
      musicDelay.connect(musicFeedback);
      musicFeedback.connect(musicDelay);
      musicDelay.connect(musicWet);
      musicWet.connect(audioCtx.destination);
      applyMoodAudio();
    }
    return true;
  }

  function applyMoodAudio() {
    if (!audioCtx) return;
    const m = currentMode();
    const t = audioCtx.currentTime;
    const ramp = (node, param, value) => {
      if (!node) return;
      node[param].cancelScheduledValues(t);
      node[param].setValueAtTime(node[param].value, t);
      node[param].linearRampToValueAtTime(value, t + 1);
    };
    ramp(musicFilter, "frequency", m.filter);
    ramp(musicDelay, "delayTime", m.delay);
    ramp(musicFeedback, "gain", m.feedback);
    ramp(musicWet, "gain", m.wet);
  }

  function playNote(freq, time, dur, gainValue, type) {
    if (!audioCtx || !masterGain) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type || "triangle";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gainValue, time + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  function musicTick() {
    if (!audioCtx) return;
    const m = currentMode();
    const now = audioCtx.currentTime + 0.02;
    const n = m.melody[stepIndex % m.melody.length];
    playNote(n, now, m.noteDur, 0.035, m.lead);
    if (stepIndex % 2 === 0) playNote(n * 2, now + 0.12, m.noteDur * 0.7, 0.012, "sine");
    if (stepIndex % 4 === 0) playNote(m.bass[Math.floor(stepIndex / 4) % m.bass.length], now, m.bassDur, 0.028, "sine");
    stepIndex++;
  }

  function scheduleMusicTick() {
    clearInterval(musicTimer);
    musicTimer = setInterval(musicTick, currentMode().step);
  }

  function updateMoodUI() {
    $$("[data-mood]").forEach((card) => {
      const active = card.dataset.mood === musicMood;
      card.classList.toggle("is-active", active);
      card.setAttribute("aria-pressed", String(active));
    });
  }

  function setMusicUI(on) {
    const btn = $("#musicBtn");
    if (btn) {
      btn.classList.toggle("is-playing", on);
      btn.setAttribute("aria-pressed", String(on));
      btn.setAttribute("aria-label", on ? "Выключить музыку" : "Включить музыку");
      const txt = btn.querySelector(".music-btn__text");
      if (txt) txt.textContent = on ? "пауза" : "музыка";
    }
    const play = $("#musicPlay");
    if (play) play.textContent = on ? "Выключить звук ♥" : "Включить звук ♥";
  }

  function startMusic() {
    if (!ensureAudio()) {
      toast("В этом браузере музыка не поддерживается");
      return;
    }
    audioCtx.resume();
    applyMoodAudio();
    rampMaster(masterTarget(), 2);
    musicOn = true;
    stepIndex = 0;
    musicTick();
    scheduleMusicTick();
    setMusicUI(true);
    toast(`${currentMode().label}: музыка для тебя ♥`);
  }

  function stopMusic() {
    musicOn = false;
    clearInterval(musicTimer);
    musicTimer = null;
    rampMaster(0, 0.8);
    setMusicUI(false);
  }

  function initMusic() {
    updateMoodUI();

    const volume = $("#musicVolume");
    const volumeValue = $("#musicVolumeValue");
    const levelKey = "loveMusicLevel_v1";
    try {
      const saved = Number(localStorage.getItem(levelKey));
      if (Number.isFinite(saved) && saved >= 0.3 && saved <= 2) musicLevel = saved;
    } catch (e) { /* ignore */ }
    const paintVolume = () => {
      const percent = Math.round(musicLevel * 100);
      if (volume) volume.value = String(percent);
      if (volumeValue) volumeValue.textContent = `${percent}%`;
    };
    paintVolume();
    volume?.addEventListener("input", () => {
      musicLevel = Math.min(2, Math.max(0.3, Number(volume.value) / 100 || 1));
      paintVolume();
      try { localStorage.setItem(levelKey, String(musicLevel)); } catch (e) { /* ignore */ }
      if (musicOn) rampMaster(masterTarget(), 0.25);
    });

    $("#musicBtn")?.addEventListener("click", () => {
      if (musicOn) stopMusic();
      else startMusic();
    });
    $("#musicPlay")?.addEventListener("click", () => {
      if (musicOn) stopMusic();
      else startMusic();
    });
    $$("[data-mood]").forEach((card) => {
      card.addEventListener("click", () => {
        const mood = card.dataset.mood;
        if (!musicModes[mood]) return;
        musicMood = mood;
        stepIndex = 0;
        updateMoodUI();
        applyMoodAudio();
        if (musicOn) {
          rampMaster(masterTarget(), 0.6);
          scheduleMusicTick();
          musicTick();
        } else {
          startMusic();
          return;
        }
        toast(`${currentMode().label} — так и буду звучать рядом ♥`);
      });
    });
  }

  /* ---------------- nav & scroll ---------------- */
  function initNav() {
    const nav = $("#nav");
    const toggle = $("#navToggle");
    const links = $("#navLinks");
    const progress = $("#scrollProgress");
    const sections = ["letter", "story", "moments", "gifts", "date", "music"].map((id) => document.getElementById(id)).filter(Boolean);

    function onScroll() {
      const y = window.scrollY;
      nav?.classList.toggle("is-scrolled", y > 30);
      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = `${max > 0 ? Math.min(100, (y / max) * 100) : 0}%`;
      }
      let activeId = "";
      const mid = y + window.innerHeight * 0.38;
      sections.forEach((s) => {
        if (s.offsetTop <= mid) activeId = s.id;
      });
      $$("#navLinks a").forEach((a) => {
        a.classList.toggle("is-active", a.getAttribute("href") === `#${activeId}`);
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    toggle?.addEventListener("click", () => {
      const open = !nav?.classList.contains("is-open");
      nav?.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      document.body.classList.toggle("no-scroll", open);
    });

    links?.addEventListener("click", (e) => {
      if (e.target.closest("a")) {
        nav?.classList.remove("is-open");
        toggle?.setAttribute("aria-expanded", "false");
        toggle?.setAttribute("aria-label", "Открыть меню");
        document.body.classList.remove("no-scroll");
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900 && nav?.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle?.setAttribute("aria-expanded", "false");
        document.body.classList.remove("no-scroll");
      }
    });
  }

  /* ---------------- hearts buttons ---------------- */
  function initHeartButtons() {
    $$("[data-hearts]").forEach((btn) => {
      btn.addEventListener("click", () => {
        spawnHearts(btn, 26, 1.2);
        toast("И я тебя люблю ❤️‍🔥");
      });
    });
  }

  /* ---------------- password gate ---------------- */
  function initGate() {
    const gate = $("#gate");
    if (!gate) return;

    const form = $("#gateForm");
    const input = $("#gateInput");
    const error = $("#gateError");
    const success = $("#gateSuccess");
    const canvas = $("#fxCanvas");
    const answer = "29082025";
    let finishing = false;

    const blockScroll = (e) => e.preventDefault();
    const stopBlocking = () => {
      gate.removeEventListener("wheel", blockScroll);
      gate.removeEventListener("touchmove", blockScroll);
    };
    const finish = () => {
      gate.classList.add("is-hidden");
      gate.setAttribute("aria-hidden", "true");
      document.body.classList.remove("no-scroll");
      stopBlocking();
      try { localStorage.removeItem("loveGate_v1"); } catch (e) { /* ignore */ }
      setTimeout(() => canvas?.classList.remove("is-top"), 1600);
    };
    const celebrate = () => {
      if (finishing) return;
      finishing = true;
      gate.classList.add("is-success");
      if (success) success.hidden = false;
      canvas?.classList.add("is-top");
      spawnConfetti(130);
      spawnHearts(success || gate, 26, 1);
      setTimeout(finish, 2300);
    };

    document.body.classList.add("no-scroll");
    try { localStorage.removeItem("loveGate_v1"); } catch (e) { /* ignore */ }
    gate.addEventListener("wheel", blockScroll, { passive: false });
    gate.addEventListener("touchmove", blockScroll, { passive: false });
    setTimeout(() => input?.focus(), 250);

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const digits = (input?.value || "").replace(/\D/g, "");
      if (digits === answer) {
        celebrate();
        return;
      }
      if (error) error.textContent = "Не совсем. Попробуй ещё раз ♥";
      input?.select();
    });

    input?.addEventListener("input", () => {
      if (error) error.textContent = "";
    });
  }

  /* ---------------- start ---------------- */
  function init() {
    initGate();
    makePetals();
    renderPromises();
    renderTimeline();
    initGallery();
    renderLittle();
    initGifts();
    initCart();
    initCoupons();
    initPlanner();
    initLightbox();
    initModals();
    initMusic();
    initNav();
    initHeartButtons();
    initReveals();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
