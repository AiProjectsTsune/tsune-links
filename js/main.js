/**
 * tsune-links main.js
 * Vanilla JS - 外部ライブラリ不使用
 */
(function () {
  'use strict';

  /* ==========================================================
   * 0. Utility
   * ========================================================== */

  /**
   * デバウンス関数
   * @param {Function} fn
   * @param {number} ms
   * @returns {Function}
   */
  function debounce(fn, ms) {
    let timer = null;
    return function () {
      var ctx = this;
      var args = arguments;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, ms);
    };
  }

  /**
   * 文字列から数値を抽出する (例: "¥26,224" -> 26224, "(129件)" -> 129)
   * @param {string} str
   * @returns {number}
   */
  function parseNumber(str) {
    if (!str) return 0;
    var cleaned = str.replace(/[^0-9.]/g, '');
    var num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /* ==========================================================
   * 1. DOM キャッシュ
   * ========================================================== */

  var header = document.querySelector('.header');
  var searchInput = document.getElementById('search-input');
  var searchClear = document.getElementById('search-clear');
  var searchResult = document.getElementById('search-result');
  var resultCount = document.getElementById('result-count');
  var productGrid = document.getElementById('product-grid');
  var categoryTabs = document.querySelectorAll('.nav__tab');
  var navInner = document.querySelector('.nav__inner');
  var heroSection = document.querySelector('.hero');
  var pickupSections = document.querySelectorAll('.pickup-section');
  var catQuickNav = document.querySelector('.cat-quick');
  var scrollTopBtn = document.getElementById('scroll-top');

  /* ==========================================================
   * 2. 商品カードへ data 属性を付与 (初期化時)
   *    既存HTMLにdata-score等が無いため、DOM内容から生成
   * ========================================================== */

  function initCardDataAttributes() {
    if (!productGrid) return;
    var cards = productGrid.querySelectorAll('.card');
    cards.forEach(function (card) {
      // data-score: .card__score テキスト
      if (!card.hasAttribute('data-score')) {
        var scoreEl = card.querySelector('.card__score');
        card.setAttribute('data-score', scoreEl ? parseNumber(scoreEl.textContent) : 0);
      }

      // data-price: .card__price (最初の価格要素)
      if (!card.hasAttribute('data-price')) {
        var priceEl = card.querySelector('.card__price');
        card.setAttribute('data-price', priceEl ? parseNumber(priceEl.textContent) : 0);
      }

      // data-reviews: .review-count テキスト (例: "(129件)")
      if (!card.hasAttribute('data-reviews')) {
        var reviewEl = card.querySelector('.review-count');
        card.setAttribute('data-reviews', reviewEl ? parseNumber(reviewEl.textContent) : 0);
      }

      // data-rating: .review-stars テキスト (例: "★ 4.2")
      if (!card.hasAttribute('data-rating')) {
        var ratingEl = card.querySelector('.review-stars');
        card.setAttribute('data-rating', ratingEl ? parseNumber(ratingEl.textContent) : 0);
      }
    });
  }

  /* ==========================================================
   * 3. 状態管理
   * ========================================================== */

  var state = {
    activeCat: 'all',
    searchQuery: '',
    sortKey: 'score',
    sortDir: 'desc'
  };

  /* ==========================================================
   * 4. フィルタリング (カテゴリ + 検索)
   * ========================================================== */

  function applyFilters() {
    if (!productGrid) return;
    var cards = productGrid.querySelectorAll('.card');
    var q = state.searchQuery.toLowerCase();
    var visible = 0;

    cards.forEach(function (card) {
      var matchesCat = state.activeCat === 'all' || card.dataset.cat === state.activeCat;
      var matchesSearch = true;

      if (q) {
        var name = (card.dataset.name || '').toLowerCase();
        var subtitle = (card.dataset.subtitle || '').toLowerCase();
        var cat = (card.dataset.cat || '').toLowerCase();
        matchesSearch = name.includes(q) || subtitle.includes(q) || cat.includes(q);
      }

      if (matchesCat && matchesSearch) {
        card.classList.remove('hidden');
        visible++;
      } else {
        card.classList.add('hidden');
      }
    });

    // 件数表示更新
    if (resultCount) {
      resultCount.innerHTML = visible + '\u4EF6 <span>\u306E\u30A2\u30A4\u30C6\u30E0</span>';
    }

    // 検索時: Pick Up等を非表示にして商品グリッドにフォーカス
    if (q) {
      if (searchResult) {
        searchResult.innerHTML = '<strong>' + visible + '\u4EF6</strong>\u898B\u3064\u304B\u308A\u307E\u3057\u305F';
        searchResult.classList.add('header__search-result--visible');
      }
      if (heroSection) heroSection.style.display = 'none';
      pickupSections.forEach(function (s) { s.style.display = 'none'; });
      if (catQuickNav) catQuickNav.style.display = 'none';
      if (productGrid) {
        productGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      if (searchResult) {
        searchResult.classList.remove('header__search-result--visible');
      }
      if (heroSection) heroSection.style.display = '';
      pickupSections.forEach(function (s) { s.style.display = ''; });
      if (catQuickNav) catQuickNav.style.display = '';
    }
  }

  /* ==========================================================
   * 5. ソート機能 (DOM並び替え)
   * ========================================================== */

  /**
   * 商品カードをソートしてDOMを並び替える
   * @param {string} key   - data属性名 (score | price | reviews | rating)
   * @param {string} dir   - 'asc' | 'desc'
   */
  function sortCards(key, dir) {
    if (!productGrid) return;

    state.sortKey = key;
    state.sortDir = dir;

    var cards = Array.from(productGrid.querySelectorAll('.card'));
    var attr = 'data-' + key;

    cards.sort(function (a, b) {
      var va = parseFloat(a.getAttribute(attr)) || 0;
      var vb = parseFloat(b.getAttribute(attr)) || 0;
      return dir === 'asc' ? va - vb : vb - va;
    });

    // DocumentFragment でまとめて再挿入 (リフロー最小化)
    var fragment = document.createDocumentFragment();
    cards.forEach(function (card) {
      fragment.appendChild(card);
    });
    productGrid.appendChild(fragment);
  }

  /**
   * ソートボタンの初期化
   * ボタンには data-sort-key / data-sort-dir 属性を持たせる想定
   * 例: <button class="sort-btn active" data-sort-key="score" data-sort-dir="desc">人気順</button>
   */
  function initSortButtons() {
    var sortBtns = document.querySelectorAll('.sort-btn');
    if (!sortBtns.length) return;

    sortBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.dataset.sortKey;
        var dir = btn.dataset.sortDir || 'desc';

        // アクティブ状態の切替
        sortBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        sortCards(key, dir);
      });
    });
  }

  /* ==========================================================
   * 6. 商品検索 (デバウンス 300ms)
   * ========================================================== */

  function initSearch() {
    if (!searchInput) return;

    var onSearch = debounce(function () {
      state.searchQuery = searchInput.value.trim();

      // クリアボタン表示制御
      if (searchClear) {
        searchClear.classList.toggle(
          'header__search-clear--visible',
          state.searchQuery.length > 0
        );
      }

      applyFilters();
    }, 300);

    searchInput.addEventListener('input', onSearch);

    // クリアボタン
    if (searchClear) {
      searchClear.addEventListener('click', function () {
        searchInput.value = '';
        state.searchQuery = '';
        searchClear.classList.remove('header__search-clear--visible');
        applyFilters();
        searchInput.focus();
      });
    }
  }

  /* ==========================================================
   * 7. カテゴリナビ
   * ========================================================== */

  function initCategoryNav() {
    if (!categoryTabs.length) return;

    categoryTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        // アクティブ切替
        categoryTabs.forEach(function (t) {
          t.classList.remove('nav__tab--active');
        });
        tab.classList.add('nav__tab--active');
        state.activeCat = tab.dataset.cat;

        // アクティブタブを横スクロールで見える位置に
        scrollTabIntoView(tab);

        applyFilters();
      });
    });

    // カテゴリクイックナビ連動
    var quickBtns = document.querySelectorAll('.cat-quick-btn');
    quickBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var cat = btn.dataset.catQuick;

        // クイックナビのアクティブ切替
        quickBtns.forEach(function (b) {
          b.style.background = '#f1f1f1';
          b.style.color = '#333';
          b.classList.remove('cat-quick-btn--active');
        });
        btn.style.background = '#111';
        btn.style.color = '#fff';
        btn.classList.add('cat-quick-btn--active');

        // カテゴリタブと連動
        var targetCat = cat === 'ALL' ? 'all' : cat;
        categoryTabs.forEach(function (tab) {
          if (tab.dataset.cat === targetCat) {
            tab.click();
          }
        });

        // 商品一覧までスクロール
        var nav = document.querySelector('.nav');
        if (nav) {
          window.scrollTo({ top: nav.offsetTop - 10, behavior: 'smooth' });
        }
      });
    });

    // 「他の商品も見る」リンク
    document.querySelectorAll('.pickup-cat__more').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var cat = link.dataset.cat;
        categoryTabs.forEach(function (tab) {
          if (tab.dataset.cat === cat) {
            tab.click();
          }
        });
        var nav = document.querySelector('.nav');
        if (nav) {
          window.scrollTo({ top: nav.offsetTop - 10, behavior: 'smooth' });
        }
      });
    });
  }

  /**
   * アクティブなタブが横スクロールナビ内で見えるようにスクロール
   * @param {HTMLElement} tab
   */
  function scrollTabIntoView(tab) {
    if (!navInner) return;
    var navRect = navInner.getBoundingClientRect();
    var tabRect = tab.getBoundingClientRect();
    var offset = tabRect.left - navRect.left - (navRect.width / 2) + (tabRect.width / 2);
    navInner.scrollBy({ left: offset, behavior: 'smooth' });
  }

  /* ==========================================================
   * 8. 画像遅延読み込み (Intersection Observer)
   * ========================================================== */

  function initLazyLoad() {
    var lazyImages = document.querySelectorAll('img[data-src]');
    if (!lazyImages.length) return;

    // プレースホルダースタイル適用
    lazyImages.forEach(function (img) {
      if (!img.src || img.src === window.location.href) {
        img.style.backgroundColor = '#f0f0f0';
        img.style.minHeight = '120px';
      }
    });

    if (!('IntersectionObserver' in window)) {
      // フォールバック: 全画像を即時読み込み
      lazyImages.forEach(function (img) {
        loadImage(img);
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            loadImage(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '200px 0px',
        threshold: 0.01
      }
    );

    lazyImages.forEach(function (img) {
      observer.observe(img);
    });
  }

  /**
   * data-src を src に変換して画像を読み込む
   * @param {HTMLImageElement} img
   */
  function loadImage(img) {
    var src = img.getAttribute('data-src');
    if (!src) return;

    img.addEventListener('load', function () {
      img.style.backgroundColor = '';
      img.style.minHeight = '';
      img.classList.add('loaded');
    }, { once: true });

    img.addEventListener('error', function () {
      img.style.backgroundColor = '#f0f0f0';
      img.style.minHeight = '';
    }, { once: true });

    img.src = src;
    img.removeAttribute('data-src');
  }

  /* ==========================================================
   * 9. スクロールヘッダー (100px以上で縮小)
   * ========================================================== */

  function initScrollHeader() {
    if (!header) return;

    var scrollThreshold = 100;
    var ticking = false;

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          header.classList.toggle('scrolled', window.scrollY > scrollThreshold);
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ==========================================================
   * 10. スクロールトップボタン
   * ========================================================== */

  function initScrollTop() {
    if (!scrollTopBtn) return;

    var ticking = false;

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          scrollTopBtn.classList.toggle('scroll-top--visible', window.scrollY > 400);
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    scrollTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ==========================================================
   * 11. 初期化
   * ========================================================== */

  function init() {
    try {
      initCardDataAttributes();
      initSearch();
      initCategoryNav();
      initSortButtons();
      initLazyLoad();
      initScrollHeader();
      initScrollTop();
    } catch (err) {
      console.error('[tsune-links] Initialization error:', err);
    }
  }

  // DOMContentLoaded で初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
