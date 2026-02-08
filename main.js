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

  // ===== Airtable Comments System =====
  const AIRTABLE_BASE_ID = 'appWWMgw7OWgsVMFc';
  const AIRTABLE_PAT = 'patXi7Suau75nDx60.a7d566579ed2ba4405080e9508e04e0d4a2bab71dd28766bbc45fdd0dd65fbb2';
  const AIRTABLE_TABLE = 'Comments';
  const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`;

  const commentForm = document.getElementById('comment-form');
  const commentList = document.getElementById('comment-list');
  const commentLoading = document.getElementById('comment-loading');
  const commentNickname = document.getElementById('comment-nickname');
  const commentContent = document.getElementById('comment-content');
  const commentCharCount = document.getElementById('comment-char-count');

  // Character count
  commentContent.addEventListener('input', () => {
    commentCharCount.textContent = `${commentContent.value.length} / 500`;
  });

  // Liked comments tracking via localStorage
  function getLikedComments() {
    try {
      return JSON.parse(localStorage.getItem('likedComments') || '[]');
    } catch { return []; }
  }

  function setLiked(recordId) {
    const liked = getLikedComments();
    if (!liked.includes(recordId)) {
      liked.push(recordId);
      localStorage.setItem('likedComments', JSON.stringify(liked));
    }
  }

  function isLiked(recordId) {
    return getLikedComments().includes(recordId);
  }

  // Save last used nickname
  function saveNickname(name) {
    localStorage.setItem('commentNickname', name);
  }

  function loadNickname() {
    return localStorage.getItem('commentNickname') || '';
  }

  commentNickname.value = loadNickname();

  // --- Airtable API functions ---
  async function loadComments() {
    try {
      const res = await fetch(
        `${AIRTABLE_URL}?sort%5B0%5D%5Bfield%5D=created_at&sort%5B0%5D%5Bdirection%5D=desc`,
        { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } }
      );
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      renderComments(data.records || []);
    } catch (err) {
      commentLoading.textContent = '댓글을 불러오지 못했습니다.';
    }
  }

  async function postComment(nickname, content, parentId) {
    const fields = {
      nickname,
      content,
      created_at: new Date().toISOString(),
      likes: 0
    };
    if (parentId) fields.parent_id = parentId;

    const res = await fetch(AIRTABLE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) throw new Error('Failed to post');
    return res.json();
  }

  async function likeComment(recordId, currentLikes) {
    const res = await fetch(`${AIRTABLE_URL}/${recordId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: { likes: (currentLikes || 0) + 1 } })
    });
    if (!res.ok) throw new Error('Failed to like');
    return res.json();
  }

  // --- Time formatting ---
  function timeAgo(dateStr) {
    const now = Date.now();
    const past = new Date(dateStr).getTime();
    const diff = Math.floor((now - past) / 1000);

    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}일 전`;
    return new Date(dateStr).toLocaleDateString('ko-KR');
  }

  // --- Render comments ---
  function renderComments(records) {
    // Build tree: top-level and replies
    const topLevel = [];
    const replies = {};

    records.forEach(r => {
      const parentId = r.fields.parent_id;
      if (parentId) {
        if (!replies[parentId]) replies[parentId] = [];
        replies[parentId].push(r);
      } else {
        topLevel.push(r);
      }
    });

    // Sort top-level newest first (already sorted by API, but ensure)
    topLevel.sort((a, b) => new Date(b.fields.created_at) - new Date(a.fields.created_at));

    // Sort replies oldest first within each parent
    Object.values(replies).forEach(arr => {
      arr.sort((a, b) => new Date(a.fields.created_at) - new Date(b.fields.created_at));
    });

    if (topLevel.length === 0) {
      commentList.innerHTML = '<div class="comment-empty">아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!</div>';
      return;
    }

    commentList.innerHTML = '';
    topLevel.forEach(record => {
      commentList.appendChild(createCommentCard(record, replies[record.id]));
    });

    // Animate comment cards
    const cards = commentList.querySelectorAll('.comment-card');
    cards.forEach(el => {
      el.classList.add('fade-up');
      observer.observe(el);
    });
  }

  function createCommentCard(record, childReplies) {
    const { nickname, content, created_at, likes } = record.fields;
    const liked = isLiked(record.id);

    const card = document.createElement('div');
    card.className = 'comment-card';
    card.dataset.id = record.id;

    card.innerHTML = `
      <div class="comment-header">
        <span class="comment-nickname">${escapeHtml(nickname || '익명')}</span>
        <span class="comment-time">${timeAgo(created_at)}</span>
      </div>
      <div class="comment-body">${escapeHtml(content || '')}</div>
      <div class="comment-actions">
        <button class="comment-like-btn${liked ? ' liked' : ''}" data-id="${record.id}" data-likes="${likes || 0}">
          ${liked ? '&#9829;' : '&#9825;'} <span>${likes || 0}</span>
        </button>
        <button class="comment-reply-btn" data-id="${record.id}">&#128172; 답글달기</button>
      </div>
    `;

    // Like button handler
    const likeBtn = card.querySelector('.comment-like-btn');
    likeBtn.addEventListener('click', async () => {
      if (isLiked(record.id)) return;
      const currentLikes = parseInt(likeBtn.dataset.likes) || 0;
      likeBtn.disabled = true;
      try {
        await likeComment(record.id, currentLikes);
        setLiked(record.id);
        likeBtn.classList.add('liked');
        likeBtn.innerHTML = `&#9829; <span>${currentLikes + 1}</span>`;
        likeBtn.dataset.likes = currentLikes + 1;
      } catch {
        alert('좋아요 처리에 실패했습니다.');
      }
      likeBtn.disabled = false;
    });

    // Reply button handler
    const replyBtn = card.querySelector('.comment-reply-btn');
    replyBtn.addEventListener('click', () => {
      // Toggle reply form
      let existing = card.querySelector('.reply-form-wrap');
      if (existing) {
        existing.remove();
        return;
      }
      const wrap = document.createElement('div');
      wrap.className = 'reply-form-wrap';
      wrap.innerHTML = `
        <form class="reply-form">
          <input type="text" class="comment-input" placeholder="닉네임" maxlength="20" value="${escapeHtml(loadNickname())}" required>
          <textarea class="comment-textarea" placeholder="답글을 작성하세요..." maxlength="300" required></textarea>
          <button type="submit" class="btn btn-primary btn-comment">답글</button>
        </form>
      `;
      const form = wrap.querySelector('.reply-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nick = form.querySelector('.comment-input').value.trim();
        const text = form.querySelector('.comment-textarea').value.trim();
        if (!nick || !text) return;
        const btn = form.querySelector('.btn-comment');
        btn.textContent = '등록 중...';
        btn.disabled = true;
        try {
          saveNickname(nick);
          await postComment(nick, text, record.id);
          wrap.remove();
          await loadComments();
        } catch {
          alert('답글 작성에 실패했습니다.');
          btn.textContent = '답글';
          btn.disabled = false;
        }
      });
      card.appendChild(wrap);
      wrap.querySelector('.comment-textarea').focus();
    });

    // Render replies
    if (childReplies && childReplies.length > 0) {
      const repliesWrap = document.createElement('div');
      repliesWrap.className = 'comment-replies';
      childReplies.forEach(reply => {
        const replyLiked = isLiked(reply.id);
        const replyCard = document.createElement('div');
        replyCard.className = 'comment-card';
        replyCard.dataset.id = reply.id;
        replyCard.innerHTML = `
          <div class="comment-header">
            <span class="comment-nickname">${escapeHtml(reply.fields.nickname || '익명')}</span>
            <span class="comment-time">${timeAgo(reply.fields.created_at)}</span>
          </div>
          <div class="comment-body">${escapeHtml(reply.fields.content || '')}</div>
          <div class="comment-actions">
            <button class="comment-like-btn${replyLiked ? ' liked' : ''}" data-id="${reply.id}" data-likes="${reply.fields.likes || 0}">
              ${replyLiked ? '&#9829;' : '&#9825;'} <span>${reply.fields.likes || 0}</span>
            </button>
          </div>
        `;
        const rLikeBtn = replyCard.querySelector('.comment-like-btn');
        rLikeBtn.addEventListener('click', async () => {
          if (isLiked(reply.id)) return;
          const cur = parseInt(rLikeBtn.dataset.likes) || 0;
          rLikeBtn.disabled = true;
          try {
            await likeComment(reply.id, cur);
            setLiked(reply.id);
            rLikeBtn.classList.add('liked');
            rLikeBtn.innerHTML = `&#9829; <span>${cur + 1}</span>`;
            rLikeBtn.dataset.likes = cur + 1;
          } catch {
            alert('좋아요 처리에 실패했습니다.');
          }
          rLikeBtn.disabled = false;
        });
        repliesWrap.appendChild(replyCard);
      });
      card.appendChild(repliesWrap);
    }

    return card;
  }

  // HTML escape
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Comment form submit ---
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nick = commentNickname.value.trim();
    const text = commentContent.value.trim();
    if (!nick || !text) {
      alert('닉네임과 댓글 내용을 입력해주세요.');
      return;
    }
    const btn = commentForm.querySelector('.btn-comment');
    btn.textContent = '등록 중...';
    btn.disabled = true;
    try {
      saveNickname(nick);
      await postComment(nick, text, null);
      commentContent.value = '';
      commentCharCount.textContent = '0 / 500';
      await loadComments();
    } catch {
      alert('댓글 작성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
    btn.textContent = '댓글 작성';
    btn.disabled = false;
  });

  // Load comments on page load
  loadComments();
});
