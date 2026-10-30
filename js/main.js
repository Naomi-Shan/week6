/* ============================================
   Shanshan Qiu — Personal Website
   Shared interactions: mobile nav, footer year,
   copy-to-clipboard, scroll reveal
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('navLinks');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Auto-close after clicking a nav link (mobile)
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Copy email to clipboard ---------- */
  var copyBtn = document.getElementById('copyEmail');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var email = copyBtn.getAttribute('data-email') || copyBtn.dataset.email || '';
      var toast = document.getElementById('toast');
      var show = function () { if (toast) { toast.classList.add('show'); setTimeout(function () { toast.classList.remove('show'); }, 1800); } };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(show).catch(function () { fallbackCopy(email); show(); });
      } else {
        fallbackCopy(email);
        show();
      }
    });
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

});
