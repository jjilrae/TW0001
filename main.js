document.addEventListener('DOMContentLoaded', () => {

  // --- Navbar scroll effect ---
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  });

  // --- Mobile nav toggle ---
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  // Close mobile nav on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
    });
  });

  // --- Scroll animations ---
  const animTargets = document.querySelectorAll(
    '.pain-card, .step-card, .feature-card, .review-card, .solution-visual, .cta-form'
  );

  animTargets.forEach(el => el.classList.add('fade-up'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  animTargets.forEach(el => observer.observe(el));

  // --- CTA Form (Formspree) ---
  const ctaForm = document.getElementById('cta-form');
  ctaForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('form-name').value.trim();
    const phone = document.getElementById('form-phone').value.trim();

    if (!name || !phone) {
      alert('이름과 연락처를 입력해주세요.');
      return;
    }

    const btn = ctaForm.querySelector('.btn');
    btn.textContent = '전송 중...';
    btn.disabled = true;

    fetch(ctaForm.action, {
      method: 'POST',
      body: new FormData(ctaForm),
      headers: { 'Accept': 'application/json' }
    })
    .then(response => {
      if (response.ok) {
        btn.textContent = '신청 완료!';
        btn.style.background = '#48BB78';
        btn.style.boxShadow = '0 4px 14px rgba(72,187,120,0.35)';
        ctaForm.reset();
        setTimeout(() => {
          btn.textContent = '무료 갈등 진단 신청하기';
          btn.style.background = '';
          btn.style.boxShadow = '';
          btn.disabled = false;
        }, 3000);
      } else {
        throw new Error('전송 실패');
      }
    })
    .catch(() => {
      btn.textContent = '전송 실패 - 다시 시도해주세요';
      btn.style.background = '#E53E3E';
      btn.disabled = false;
      setTimeout(() => {
        btn.textContent = '무료 갈등 진단 신청하기';
        btn.style.background = '';
      }, 3000);
    });
  });

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const navHeight = navbar.offsetHeight;
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
});
