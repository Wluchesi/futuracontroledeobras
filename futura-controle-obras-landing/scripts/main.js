/**
 * FUTURA CONTROLE DE OBRAS - Client Logic & Interactions
 * Pure Vanilla JavaScript (Zero external libraries, ultra-fast execution)
 */

document.addEventListener('DOMContentLoaded', () => {
  const config = window.FUTURA_CONFIG || {};

  // 1. Vinculação Dinâmica de URLs nos botões e links
  const bindCtaLinks = () => {
    document.querySelectorAll('[data-cta]').forEach(el => {
      const type = el.getAttribute('data-cta');
      if (type === 'signup') {
        el.href = config.SIGNUP_URL || '#';
      } else if (type === 'demo') {
        el.href = config.DEMO_URL || '#';
      } else if (type === 'pricing') {
        el.href = config.PRICING_URL || '#planos';
      } else if (type === 'whatsapp') {
        el.href = config.WHATSAPP_URL || '#';
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      } else if (type === 'login') {
        el.href = config.APP_URL || '#';
      }
    });
  };
  bindCtaLinks();

  // 2. Renderização / Hidratação Dinâmica da Tabela de Planos (config.js)
  const hydratePricing = () => {
    if (!config.PRICING) return;
    const grid = document.getElementById('pricingGrid');
    if (!grid) return;

    grid.innerHTML = '';

    Object.keys(config.PRICING).forEach(key => {
      const plan = config.PRICING[key];
      const isFeatured = Boolean(plan.isRecommended);

      const card = document.createElement('div');
      card.className = `pricing-card ${isFeatured ? 'featured' : ''}`;

      let ribbonHtml = isFeatured ? `<div class="featured-ribbon">${plan.badge || 'Recomendado'}</div>` : '';

      const featuresHtml = (plan.features || []).map(f => `
        <li class="pricing-feature-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>${f}</span>
        </li>
      `).join('');

      card.innerHTML = `
        ${ribbonHtml}
        <h3 class="pricing-plan-name">${key.toUpperCase()}</h3>
        <p class="pricing-plan-desc">${plan.description || ''}</p>
        <div class="pricing-price-box">
          <div class="pricing-price">${plan.price}</div>
          <div class="pricing-period">${plan.period}</div>
        </div>
        <ul class="pricing-features">
          ${featuresHtml}
        </ul>
        <a href="#" data-cta="${plan.action || 'signup'}" class="${isFeatured ? 'btn-primary' : 'btn-secondary'} btn-lg" style="width: 100%; text-align: center;">
          ${plan.ctaText || 'Escolher Plano'}
        </a>
      `;

      grid.appendChild(card);
    });

    bindCtaLinks();
  };
  hydratePricing();

  // 3. Navbar Compacta no Scroll
  const navbar = document.getElementById('mainNavbar');
  const mobileStickyCta = document.getElementById('mobileStickyCta');

  const onScroll = () => {
    const scrollY = window.scrollY;

    if (navbar) {
      if (scrollY > 30) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }

    if (mobileStickyCta) {
      if (scrollY > 450) {
        mobileStickyCta.classList.add('visible');
      } else {
        mobileStickyCta.classList.remove('visible');
      }
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 4. Menu Mobile Hamburger
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const navMenu = document.getElementById('navMenu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', isOpen);
      mobileToggle.innerHTML = isOpen ? `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      ` : `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      `;
    });

    // Fecha ao clicar em qualquer link
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // 5. Accordion Interativo de FAQ
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        // Fecha todos os outros para manter leitura limpa
        faqItems.forEach(other => other.classList.remove('active'));
        if (!isActive) {
          item.classList.add('active');
          trigger.setAttribute('aria-expanded', 'true');
        } else {
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    }
  });

  // 6. Demonstração Interativa do Mapa Comparativo de Cotações
  const compRows = document.querySelectorAll('.comp-row:not(.head)');
  compRows.forEach(row => {
    row.addEventListener('mouseenter', () => {
      compRows.forEach(r => r.style.opacity = '0.7');
      row.style.opacity = '1';
    });
    row.addEventListener('mouseleave', () => {
      compRows.forEach(r => r.style.opacity = '1');
    });
  });

  // 7. Carregamento de Analytics Opcional (apenas se IDs forem informados)
  const initAnalytics = () => {
    const gaId = config.ANALYTICS?.GA_ID;
    if (gaId) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      function gtag(){ window.dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', gaId);
    }

    const metaPixelId = config.ANALYTICS?.META_PIXEL_ID;
    if (metaPixelId) {
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', metaPixelId);
      fbq('track', 'PageView');
    }
  };
  initAnalytics();
});
