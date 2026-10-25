/* ============================================================
   GRAND AZURE HOTEL & RESORT — main.js
   Interactive behaviors: navigation, sticky header, filters,
   price calculator, availability widget, toast notifications
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. STICKY HEADER ── */
  const header = document.getElementById('main-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  /* ── 2. ACCESSIBLE HAMBURGER MENU ── */
  const hamburger = document.querySelector('.hamburger');
  const navLinks  = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    const toggleMenu = () => {
      const isOpen = hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
    };

    hamburger.addEventListener('click', toggleMenu);

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on nav link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ── 3. ACTIVE NAV LINK ── */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* ── 4. ROOM FILTER (rooms.html) ── */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const roomCards  = document.querySelectorAll('.room-card[data-category]');
  if (filterBtns.length && roomCards.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.filter;
        roomCards.forEach(card => {
          const show = (cat === 'all' || card.dataset.category === cat);
          card.style.display = show ? 'block' : 'none';
          if (show) {
            card.style.animation = 'none';
            card.offsetHeight; // trigger reflow
            card.style.animation = 'fadeInUp 0.4s ease forwards';
          }
        });
      });
    });
  }

  /* ── 5. PRICE CALCULATOR (reservation.html) ── */
  const roomPrices = {
    deluxe: 8500,
    deluxe_garden: 7200,
    executive: 14000,
    suite: 22000,
    ocean: 28000,
    penthouse: 38000
  };

  const addOnPrices = {
    transfer: 1800,
    spa: 4500,
    breakfast: 1200, // per day
    latecheckout: 2000
  };

  function updatePrice() {
    const roomRadio     = document.querySelector('input[name="room_type"]:checked');
    const checkin       = document.getElementById('checkin');
    const checkout      = document.getElementById('checkout');
    const addOnChecks   = document.querySelectorAll('input[name="addons"]:checked');
    const displayRoom   = document.getElementById('price-room');
    const displayNights = document.getElementById('price-nights');
    const displayAddons = document.getElementById('price-addons');
    const displayTaxes  = document.getElementById('price-taxes');
    const displayTotal  = document.getElementById('price-total');
    if (!displayTotal) return;

    const roomKey   = roomRadio ? roomRadio.value : 'deluxe';
    const roomPrice = roomPrices[roomKey] || 8500;

    let nights = 1;
    if (checkin && checkout && checkin.value && checkout.value) {
      const d1 = new Date(checkin.value);
      const d2 = new Date(checkout.value);
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      if (diff > 0) nights = diff;
    }

    let addons = 0;
    addOnChecks.forEach(cb => {
      if (cb.value === 'breakfast') {
        // Breakfast is charged per day across the stay duration
        addons += (addOnPrices.breakfast || 1200) * nights;
      } else {
        addons += addOnPrices[cb.value] || 0;
      }
    });

    const subtotal = roomPrice * nights;
    const taxes    = Math.round((subtotal + addons) * 0.18); // 18% GST
    const total    = subtotal + addons + taxes;
    const advance  = Math.round(total * 0.20); // 20% advance payment

    if (displayRoom)   displayRoom.textContent   = '₹' + subtotal.toLocaleString('en-IN');
    if (displayNights) displayNights.textContent = nights + (nights === 1 ? ' Night' : ' Nights');
    if (displayAddons) displayAddons.textContent = '₹' + addons.toLocaleString('en-IN');
    if (displayTaxes)  displayTaxes.textContent  = '₹' + taxes.toLocaleString('en-IN');
    if (displayTotal)  displayTotal.textContent  = '₹' + total.toLocaleString('en-IN');

    // Sync Advance Payment (20%) in QR Modal & reservation form
    const advanceEl = document.getElementById('qr-advance-amount');
    if (advanceEl) {
      advanceEl.textContent = '₹' + advance.toLocaleString('en-IN');
    }
  }

  window.updateReservationPrice = updatePrice;

  // Attach price calculator events
  document.querySelectorAll('input[name="room_type"]').forEach(r => r.addEventListener('change', updatePrice));
  document.querySelectorAll('input[name="addons"]').forEach(c => c.addEventListener('change', updatePrice));
  ['checkin', 'checkout'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updatePrice);
  });
  updatePrice();

  /* ── 6. RANGE SLIDER LIVE OUTPUT ── */
  document.querySelectorAll('input[type="range"]').forEach(range => {
    const output = range.nextElementSibling?.tagName === 'OUTPUT'
      ? range.nextElementSibling
      : document.getElementById(range.dataset.output);
    if (output) {
      output.textContent = range.value + (range.dataset.unit || '');
      range.addEventListener('input', () => {
        output.textContent = range.value + (range.dataset.unit || '');
      });
    }
  });

  /* ── 7. FAQ ACCORDION ── */
  document.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.parentElement;
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('open');
        const btn = i.querySelector('.faq-question');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ── 8. TOAST NOTIFICATIONS ── */
  window.showToast = function(title, message, isError = false, duration = 4500) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-notification';
      toast.className = 'toast';
      toast.innerHTML = `<h4 style="margin:0 0 0.25rem; font-size:0.95rem;"></h4><p style="margin:0; font-size:0.85rem; color:#475569;"></p>`;
      document.body.appendChild(toast);
    }
    toast.style.borderColor = isError ? '#e53e3e' : '#d4af37';
    toast.querySelector('h4').textContent = title;
    toast.querySelector('h4').style.color = isError ? '#dc2626' : '#0a192f';
    toast.querySelector('p').textContent  = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
  };

  /* ── 9. AVAILABILITY WIDGET (homepage → reservation.html redirect) ── */
  const availabilityForm = document.getElementById('availability-form');
  if (availabilityForm) {
    const wCheckin  = document.getElementById('w-checkin');
    const wCheckout = document.getElementById('w-checkout');
    const today = new Date().toISOString().split('T')[0];

    // Restrict dates: no past dates allowed
    if (wCheckin)  wCheckin.min  = today;
    if (wCheckout) wCheckout.min = today;

    // Default to today and tomorrow if blank
    if (wCheckin && !wCheckin.value) {
      wCheckin.value = today;
    }
    if (wCheckin && wCheckout) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      wCheckout.min = tomorrowStr;
      if (!wCheckout.value) {
        wCheckout.value = tomorrowStr;
      }

      wCheckin.addEventListener('change', () => {
        if (wCheckin.value) {
          const next = new Date(wCheckin.value);
          next.setDate(next.getDate() + 1);
          const nextStr = next.toISOString().split('T')[0];
          wCheckout.min = nextStr;
          if (!wCheckout.value || wCheckout.value <= wCheckin.value) {
            wCheckout.value = nextStr;
          }
        }
      });
    }

    availabilityForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const checkinVal  = wCheckin  ? wCheckin.value  : '';
      const checkoutVal = wCheckout ? wCheckout.value : '';
      const guestsVal   = document.getElementById('w-guests')?.value || '2';
      const roomVal     = document.getElementById('w-room')?.value   || 'any';

      if (!checkinVal || !checkoutVal) {
        window.showToast('⚠️ Missing Dates', 'Please select both check-in and check-out dates.', true);
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      if (checkinVal < todayStr) {
        window.showToast('⚠️ Past Date Selected', 'Check-in date cannot be in the past.', true);
        return;
      }

      if (checkoutVal <= checkinVal) {
        window.showToast('⚠️ Invalid Dates', 'Check-out date must be later than check-in date.', true);
        return;
      }

      const guestsNum = parseInt(guestsVal, 10);
      if (isNaN(guestsNum) || guestsNum < 1 || guestsNum > 6) {
        window.showToast('⚠️ Invalid Guest Count', 'Guest count must be between 1 and 6.', true);
        return;
      }

      // Smoothly redirect guest to reservation page with query parameters
      const params = new URLSearchParams({
        checkin: checkinVal,
        checkout: checkoutVal,
        guests: guestsVal,
        room: roomVal
      });
      window.location.href = `reservation.html?${params.toString()}`;
    });
  }

  /* ── 10. SMOOTH SCROLL for anchor links ── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#' || href === '#!') return;
      try {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch {
        // ignore invalid selector
      }
    });
  });

  /* ── 11. Promo code search (reservation page) ── */
  const promoInput = document.getElementById('promo-code');
  if (promoInput) {
    promoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const code = promoInput.value.trim().toUpperCase();
        const validCodes = {
          'AZURE10': '10% discount applied to your stay!',
          'LUXURY20': '20% luxury loyalty discount applied!',
          'VIP50': '₹5,000 suite credit applied!'
        };
        if (validCodes[code]) {
          window.showToast('🏷️ Promo Applied', validCodes[code]);
        } else if (code) {
          window.showToast('❌ Invalid Promo Code', 'Please verify your code or contact concierge.', true);
        }
      }
    });
  }

  /* ── 12. DYNAMIC COPYRIGHT YEAR ── */
  const year = new Date().getFullYear();
  document.querySelectorAll('.footer-bottom p').forEach(p => {
    p.innerHTML = p.innerHTML.replace(/©\s*\d{4}/g, `© ${year}`);
  });

});
