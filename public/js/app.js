let state = {
  userCtx: null,
  folders: [],
  navStack: [],
  photos: [],
  selectedFiles: [],
  currentPhoto: null,
  searchTimer: null,
  currentFolderId: null,
  currentOffset: 0,
  hasMore: false,
  isLoadingMore: false,
  scrollObserver: null
};

let googleUser = null;

document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  initGoogleAuth();
  loadAlbums();
}

function initGoogleAuth() {
  const stored = localStorage.getItem('googleUser');
  if (stored) {
    try {
      googleUser = JSON.parse(stored);
      checkUserStatus(googleUser.email);
    } catch (e) {
      checkUserStatus('');
    }
  } else {
    checkUserStatus('');
  }

  if (window.google && google.accounts) {
    setupGoogleButton();
  } else {
    window.addEventListener('load', () => {
      setTimeout(setupGoogleButton, 500);
    });
  }
}

function setupGoogleButton() {
  if (!window.google || !google.accounts) return;
  const clientId = '681425643119-rljc3o9g3ln0vcd14s1fg6kno903mv5s.apps.googleusercontent.com';
  try {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse
    });
    const container = document.getElementById('gsiLoginContainer');
    if (container) {
      google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'medium',
        text: 'signin_with',
        shape: 'pill'
      });
    }
  } catch (err) {
    console.warn('GSI Init error:', err);
  }
}

function handleCredentialResponse(response) {
  try {
    const payload = parseJwt(response.credential);
    googleUser = {
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture || '',
      token: response.credential
    };
    localStorage.setItem('googleUser', JSON.stringify(googleUser));
    checkUserStatus(googleUser.email, true);
  } catch (err) {
    showToast('เข้าสู่ระบบล้มเหลว: ' + err.message, 'error');
  }
}

function parseJwt(token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

function logoutGoogle() {
  googleUser = null;
  localStorage.removeItem('googleUser');
  if (window.google && google.accounts) {
    try { google.accounts.id.disableAutoSelect(); } catch(e){}
  }
  showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
  setTimeout(() => window.location.reload(), 500);
}

async function checkUserStatus(emailOverride, isLoginAttempt = false) {
  const email = emailOverride !== undefined ? emailOverride : (googleUser ? googleUser.email : '');
  if (!email) {
    renderUserNavbar(null);
    return;
  }

  try {
    const res = await fetch(`/api/auth?userEmail=${encodeURIComponent(email)}`);
    if (res.ok) {
      const ctx = await res.json();
      
      // If user is not an admin/uploader
      if (!ctx.isCanUpload) {
        googleUser = null;
        localStorage.removeItem('googleUser');
        renderUserNavbar(null);
        if (isLoginAttempt) {
          openModal('accessDeniedModal');
        } else {
          showToast('คุณไม่ได้อยู่ในฐานะ admin', 'error');
        }
        return;
      }

      state.userCtx = ctx;
      renderUserNavbar(ctx);

      // ตรวจว่า profile ครบหรือยัง — ถ้ายังไม่ครบ บังคับกรอก
      if (ctx.profileComplete === false) {
        openProfileSetupModal(ctx.email);
        return;
      }

      if (isLoginAttempt) {
        showToast(`ยินดีต้อนรับ ${googleUser ? googleUser.name : 'Admin'}!`, 'success');
      }
    }
  } catch (err) {
    console.warn('Auth check skipped:', err);
  }
}

function renderUserNavbar(ctx) {
  const userSection = document.getElementById('userSection');
  const userEmailText = document.getElementById('userEmailText');
  const rolePill = document.getElementById('rolePill');
  const btnLogout = document.getElementById('btnLogout');
  const gsiWrapper = document.getElementById('gsiWrapper');

  if (ctx && ctx.email) {
    userSection.style.display = 'inline-flex';
    userEmailText.textContent = ctx.email;
    rolePill.className = 'role-pill';
    if (ctx.role === 'SUPER_ADMIN') {
      rolePill.textContent = 'Super Admin';
      rolePill.classList.add('role-super');
    } else if (ctx.role === 'ADMIN') {
      rolePill.textContent = 'Admin';
      rolePill.classList.add('role-admin');
    } else if (ctx.role === 'ASSISTANT_ADMIN') {
      rolePill.textContent = 'ผู้ช่วย Admin';
      rolePill.classList.add('role-assistant');
    } else {
      rolePill.textContent = 'บุคคลทั่วไป';
    }
    if (btnLogout) btnLogout.style.display = 'inline-flex';
    if (gsiWrapper) gsiWrapper.style.display = 'none';
  } else {
    userSection.style.display = 'none';
    if (btnLogout) btnLogout.style.display = 'none';
    if (gsiWrapper) gsiWrapper.style.display = 'inline-block';
  }

  const showDriveConfig = (ctx && ctx.isSuperAdmin);
  const showAdminPanel = (ctx && ctx.isSuperAdmin);
  const showManageAlbums = (ctx && ctx.isSuperAdmin);

  const btnDriveConfig = document.getElementById('btnDriveConfig');
  const btnAdminPanel = document.getElementById('btnAdminPanel');
  const btnManageAlbums = document.getElementById('btnManageAlbums');
  const settingsDropdown = document.getElementById('settingsDropdown');

  if (btnDriveConfig) btnDriveConfig.style.display = showDriveConfig ? 'flex' : 'none';
  if (btnAdminPanel) btnAdminPanel.style.display = showAdminPanel ? 'flex' : 'none';
  if (btnManageAlbums) btnManageAlbums.style.display = showManageAlbums ? 'flex' : 'none';

  if (settingsDropdown) {
    settingsDropdown.style.display = (showDriveConfig || showAdminPanel || showManageAlbums) ? 'inline-block' : 'none';
  }

  document.querySelectorAll('.btn-upload-photo, #btnUpload').forEach(el => {
    if (el) el.style.display = (ctx && ctx.isCanUpload) ? 'inline-flex' : 'none';
  });
  document.querySelectorAll('.btn-create-folder').forEach(el => {
    el.style.display = (ctx && ctx.canCreateAlbum) ? 'inline-flex' : 'none';
  });
}

function toggleSettingsDropdown(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('settingsMenu');
  if (menu) {
    menu.classList.toggle('show');
  }
}

function closeSettingsDropdown() {
  const menu = document.getElementById('settingsMenu');
  if (menu) {
    menu.classList.remove('show');
  }
}

window.addEventListener('click', function(e) {
  const dropdown = document.getElementById('settingsDropdown');
  if (dropdown && !dropdown.contains(e.target)) {
    closeSettingsDropdown();
  }
  if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
    if (e.target.id === 'profileSetupModal') return;
    closeModal(e.target.id);
  }
});

window.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const activeModals = document.querySelectorAll('.modal.active');
    activeModals.forEach(m => {
      if (m.id === 'profileSetupModal') return;
      closeModal(m.id);
    });
  }
});

async function loadAlbums() {
  const albumGrid = document.getElementById('albumGrid');
  albumGrid.innerHTML = `
    <div class="album-card-skeleton skeleton" style="height: 75px;"></div>
    <div class="album-card-skeleton skeleton" style="height: 75px;"></div>
    <div class="album-card-skeleton skeleton" style="height: 75px;"></div>
    <div class="album-card-skeleton skeleton" style="height: 75px;"></div>`;

  try {
    const res = await fetch('/api/folders');
    const folders = await res.json();
    renderAlbumGrid(folders);
  } catch (err) {
    showToast('ไม่สามารถโหลดอัลบั้มได้: ' + err.message, 'error');
  }
}

function renderAlbumGrid(folders) {
  const rawList = Array.isArray(folders) ? folders : [];
  const cleanFolders = rawList.filter(f => !f.isRoot && !(f.name && f.name.indexOf('รูปภาพทั้งหมด') !== -1) && !f.isHidden);
  state.folders = rawList; // keep rawList in state so modal can see hidden ones
  const albumGrid = document.getElementById('albumGrid');
  albumGrid.innerHTML = '';

  if (!Array.isArray(folders)) {
    albumGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">⚠️</div>
        <h3>ไม่สามารถดึงข้อมูลอัลบั้มได้</h3>
        <p>${escapeHtml(folders && folders.error ? folders.error : 'กรุณาตรวจสอบการตั้งค่าแชร์ใน Google Drive ให้เป็น "ทุกคนที่มีลิงก์มีสิทธิ์ดู"')}</p>
      </div>`;
    return;
  }

  if (cleanFolders.length === 0) {
    albumGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">📁</div>
        <h3>ยังไม่มีอัลบั้มภาพ</h3>
        <p>Super Admin สามารถตั้งค่าโฟลเดอร์ Google Drive หรือ Admin สามารถสร้างอัลบั้มใหม่ได้</p>
      </div>`;
    return;
  }

  cleanFolders.forEach(f => {
    albumGrid.appendChild(buildAlbumCard(f, () => openFolder(f.id, f.name)));
  });
}

function buildAlbumCard(f, onClick) {
  const card = document.createElement('div');
  card.className = 'album-card folder-card';
  card.onclick = onClick;

  const icon = f.isRoot ? '🖼️' : '📁';
  card.innerHTML = `
    <div class="folder-card-body">
      <div class="folder-icon">${icon}</div>
      <div class="folder-info">
        <div class="folder-name">${escapeHtml(f.name)}</div>
        <div class="folder-subtext">${f.isRoot ? 'แสดงภาพทั้งหมดในระบบ' : 'คลิกเพื่อเปิดดูอัลบั้ม'}</div>
      </div>
      <div class="album-arrow">›</div>
    </div>`;
  return card;
}

function extractPhotosList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (data.directPhotos) {
    if (Array.isArray(data.directPhotos)) return data.directPhotos;
    if (Array.isArray(data.directPhotos.items)) return data.directPhotos.items;
  }
  return [];
}

async function openFolder(folderId, folderName) {
  const lastIndex = state.navStack.length - 1;
  if (lastIndex >= 0 && state.navStack[lastIndex].id === folderId) {
    state.navStack[lastIndex].name = folderName;
  } else {
    const existingIndex = state.navStack.findIndex(item => item.id === folderId);
    if (existingIndex !== -1) {
      state.navStack = state.navStack.slice(0, existingIndex + 1);
    } else {
      state.navStack.push({ id: folderId, name: folderName });
    }
  }

  state.currentFolderId = folderId;
  state.currentOffset = 0;
  state.hasMore = false;
  state.isLoadingMore = false;
  state.photos = [];

  document.getElementById('viewAlbums').style.display = 'none';
  document.getElementById('viewPhotos').style.display = 'block';
  const searchInputEl = document.getElementById('searchInput');
  if (searchInputEl) searchInputEl.value = '';

  renderBreadcrumb();
  showPhotoSkeletons();

  try {
    const res = await fetch(`/api/photos?folderId=${encodeURIComponent(folderId)}&offset=0&limit=24`);
    const contents = await res.json();
    if (contents.type === 'subfolders' && Array.isArray(contents.subfolders) && contents.subfolders.length > 0) {
      renderSubfolderView(contents.subfolders, contents.directPhotos || contents);
    } else {
      renderGalleryGrid(contents.directPhotos || contents);
    }
  } catch (err) {
    console.error(err);
    showToast('ไม่สามารถโหลดรูปภาพในโฟลเดอร์ได้: ' + err.message, 'error');
  }
}

function renderSubfolderView(subfolders, directPhotosData) {
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = '';

  const photosList = extractPhotosList(directPhotosData);
  let hasMore = false;
  let nextOffset = 0;
  let total = 0;

  if (directPhotosData && directPhotosData.hasMore !== undefined) {
    hasMore = directPhotosData.hasMore;
    nextOffset = directPhotosData.nextOffset;
    total = directPhotosData.total;
  } else if (directPhotosData && directPhotosData.directPhotos && directPhotosData.directPhotos.hasMore !== undefined) {
    hasMore = directPhotosData.directPhotos.hasMore;
    nextOffset = directPhotosData.nextOffset;
    total = directPhotosData.total;
  }

  state.hasMore = hasMore;
  state.currentOffset = nextOffset;
  state.photos = photosList;

  const subGrid = document.createElement('div');
  subGrid.className = 'album-grid';
  subGrid.style.cssText = 'margin-bottom: 1.5rem; grid-column: 1/-1;';
  subfolders.forEach(sub => {
    subGrid.appendChild(buildAlbumCard(sub, () => openFolder(sub.id, sub.name)));
  });
  grid.appendChild(subGrid);

  if (photosList.length > 0) {
    const divider = document.createElement('div');
    divider.style.cssText = 'grid-column: 1/-1; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem; margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--text-muted);';
    divider.innerHTML = `<span>📷 รูปภาพในอัลบั้มนี้ (แสดง ${photosList.length}${total > 0 ? ' จากทั้งหมด ' + total : ''} รูป)</span>`;
    grid.appendChild(divider);

    photosList.forEach(photo => {
      grid.appendChild(buildPhotoCard(photo));
    });
  }

  const badgeText = `${subfolders.length} โฟลเดอร์ย่อย` + (total > 0 ? ` • ทั้งหมด ${total} รูปภาพ` : (photosList.length > 0 ? ` • ${photosList.length} รูปภาพ` : ''));
  document.getElementById('photoCountBadge').textContent = badgeText;

  setupInfiniteScroll();
}

function showPhotoSkeletons() {
  document.getElementById('galleryGrid').innerHTML = `
    <div class="photo-card skeleton" style="height:220px;"></div>
    <div class="photo-card skeleton" style="height:220px;"></div>
    <div class="photo-card skeleton" style="height:220px;"></div>
    <div class="photo-card skeleton" style="height:220px;"></div>`;
}

function renderGalleryGrid(photosData, append = false) {
  const grid = document.getElementById('galleryGrid');
  const photosList = extractPhotosList(photosData);

  let hasMore = false;
  let nextOffset = 0;
  let total = 0;

  if (photosData && photosData.hasMore !== undefined) {
    hasMore = photosData.hasMore;
    nextOffset = photosData.nextOffset;
    total = photosData.total;
  } else if (photosData && photosData.directPhotos && photosData.directPhotos.hasMore !== undefined) {
    hasMore = photosData.directPhotos.hasMore;
    nextOffset = photosData.nextOffset;
    total = photosData.total;
  }

  state.hasMore = hasMore;
  state.currentOffset = nextOffset;

  if (append) {
    state.photos = state.photos.concat(photosList);
  } else {
    state.photos = photosList;
    grid.innerHTML = '';
  }

  const countBadgeText = total > 0 ? `กำลังแสดง ${state.photos.length} จากทั้งหมด ${total} รูปภาพ` : `${state.photos.length} รูปภาพ`;
  document.getElementById('photoCountBadge').textContent = countBadgeText;

  if (!append && state.photos.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📷</div>
        <h3>ไม่พบรูปภาพในโฟลเดอร์นี้</h3>
        <p>ยังไม่มีการอัปโหลดรูปภาพ หรือไม่พบไฟล์ตรงตามคำค้นหา</p>
      </div>`;
    removeInfiniteSentinel();
    return;
  }

  photosList.forEach(photo => grid.appendChild(buildPhotoCard(photo)));

  setupInfiniteScroll();
}

function setupInfiniteScroll() {
  removeInfiniteSentinel();

  if (!state.hasMore) return;

  const sentinel = document.createElement('div');
  sentinel.id = 'infiniteSentinel';
  sentinel.className = 'infinite-sentinel';
  sentinel.style.cssText = 'grid-column: 1/-1; text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.9rem; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 1rem;';
  sentinel.innerHTML = `<span style="display:inline-block;">⏳</span> กำลังโหลดรูป โปรดรอซักครู่`;
  
  document.getElementById('galleryGrid').appendChild(sentinel);

  if (state.scrollObserver) state.scrollObserver.disconnect();

  state.scrollObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && state.hasMore && !state.isLoadingMore) {
      loadNextPageOfPhotos();
    }
  }, { rootMargin: '300px' });

  state.scrollObserver.observe(sentinel);
}

function removeInfiniteSentinel() {
  const el = document.getElementById('infiniteSentinel');
  if (el) el.remove();
}

async function loadNextPageOfPhotos() {
  if (!state.hasMore || state.isLoadingMore || !state.currentFolderId) return;

  state.isLoadingMore = true;

  try {
    const res = await fetch(`/api/photos?folderId=${encodeURIComponent(state.currentFolderId)}&offset=${state.currentOffset}&limit=24`);
    const contents = await res.json();
    removeInfiniteSentinel();
    renderGalleryGrid(contents.directPhotos || contents, true);
  } catch (err) {
    console.error('Failed to load more photos:', err);
  } finally {
    state.isLoadingMore = false;
  }
}

function buildPhotoCard(photo) {
  const card = document.createElement('div');
  card.className = 'photo-card';
  card.innerHTML = `
    <div class="photo-img-wrapper" onclick="openLightbox('${photo.id}')">
      <img class="photo-img" src="${photo.thumbnailLink}" alt="${escapeHtml(photo.name)}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300?text=Error+Loading'">
      <div class="photo-overlay">
        <span style="font-size:0.8rem;color:#93c5fd;">🔍 คลิกเพื่อขยายใหญ่</span>
      </div>
    </div>
    <div class="photo-details">
      <div>
        <div class="photo-title" title="${escapeHtml(photo.name)}">${escapeHtml(photo.name)}</div>
        <div class="photo-meta">${photo.created || ''} • ${photo.size || ''}</div>
      </div>
    </div>`;
  return card;
}

function renderBreadcrumb() {
  const title = document.getElementById('galleryTitle');
  const stack = state.navStack;
  if (stack.length === 0) return;

  let html = '';
  for (let i = 0; i < stack.length - 1; i++) {
    const item = stack[i];
    html += `<span class="breadcrumb-link" onclick="navToStack(${i})">${escapeHtml(item.name)}</span> <span style="color:var(--text-dim)">›</span> `;
  }
  html += `<span>📸</span> <span>${escapeHtml(stack[stack.length - 1].name)}</span>`;
  title.innerHTML = html;
}

function navToStack(index) {
  if (index < 0 || index >= state.navStack.length - 1) return;
  const target = state.navStack[index];
  state.navStack = state.navStack.slice(0, index + 1);

  showPhotoSkeletons();
  renderBreadcrumb();
  openFolder(target.id, target.name);
}

function backToAlbums() {
  state.navStack = [];
  state.photos = [];
  document.getElementById('viewPhotos').style.display = 'none';
  document.getElementById('viewAlbums').style.display = 'block';
  const searchInputEl = document.getElementById('searchInput');
  if (searchInputEl) searchInputEl.value = '';
}

function handleSearchInput(e) {
  clearTimeout(state.searchTimer);
  const keyword = e.target.value;

  if (state.navStack.length > 0) {
    state.searchTimer = setTimeout(async () => {
      const currentId = state.navStack[state.navStack.length - 1].id;
      showPhotoSkeletons();
      try {
        const res = await fetch(`/api/photos?folderId=${encodeURIComponent(currentId)}&search=${encodeURIComponent(keyword)}`);
        const data = await res.json();
        renderGalleryGrid(data.items || []);
      } catch (err) {
        showToast('ค้นหาล้มเหลว', 'error');
      }
    }, 400);
  } else {
    const kw = keyword.toLowerCase();
    document.querySelectorAll('.album-card').forEach(card => {
      const name = card.querySelector('.album-name').textContent.toLowerCase();
      card.style.display = name.includes(kw) ? '' : 'none';
    });
  }
}

async function openLightbox(photoId) {
  const photo = state.photos.find(p => p.id === photoId);
  if (!photo) return;
  state.currentPhoto = photo;
  document.getElementById('lightboxTitle').textContent = photo.name;
  document.getElementById('lightboxImage').src = photo.viewLink;
  document.getElementById('lightboxDownloadBtn').href = photo.downloadLink;

  if (photo.created && photo.size) {
    document.getElementById('lightboxMeta').textContent = `วันที่อัปโหลด: ${photo.created} | ขนาด: ${photo.size}`;
  } else {
    document.getElementById('lightboxMeta').textContent = `วันที่อัปโหลด: กำลังดึงข้อมูล... | ขนาด: กำลังดึงข้อมูล...`;
    fetchPhotoMetadata(photoId);
  }

  openModal('lightboxModal');
}

async function fetchPhotoMetadata(photoId) {
  try {
    const res = await fetch(`/api/photos?action=getPhotoMetadata&fileId=${encodeURIComponent(photoId)}`);
    if (res.ok) {
      const data = await res.json();
      if (state.currentPhoto && state.currentPhoto.id === photoId) {
        state.currentPhoto.created = data.created || '-';
        state.currentPhoto.size = data.size || '-';
        document.getElementById('lightboxMeta').textContent = `วันที่อัปโหลด: ${data.created || '-'} | ขนาด: ${data.size || '-'}`;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch photo metadata:', e);
  }
}

async function deleteCurrentPhoto() {
  if (!state.currentPhoto) return;
  if (!confirm(`คุณต้องการลบรูปภาพ "${state.currentPhoto.name}" ใช่หรือไม่?`)) return;
  showToast('กำลังลบรูปภาพ...', 'info');
  const userEmail = googleUser ? googleUser.email : '';
  try {
    const res = await fetch(`/api/photos?fileId=${encodeURIComponent(state.currentPhoto.id)}&userEmail=${encodeURIComponent(userEmail)}`, { method: 'DELETE' });
    const data = await res.json();
    showToast(data.message || 'ลบรูปภาพสำเร็จ', 'success');
    closeModal('lightboxModal');
    if (state.navStack.length > 0) {
      const current = state.navStack[state.navStack.length - 1];
      openFolder(current.id, current.name);
    }
  } catch (err) {
    showToast('ลบรูปภาพล้มเหลว: ' + err.message, 'error');
  }
}

function openUploadModal() {
  const currentNav = state.navStack[state.navStack.length - 1];
  if (!currentNav || currentNav.id === 'root') {
    showToast('กรุณาเลือกหรือเปิดเข้าไปในอัลบั้มก่อนทำการอัปโหลดรูปภาพ', 'warning');
    return;
  }

  state.selectedFiles = [];
  document.getElementById('selectedFilesList').innerHTML = '';
  document.getElementById('fileInput').value = '';
  document.getElementById('btnSubmitUpload').disabled = true;

  const uploadSelect = document.getElementById('uploadFolderSelect');
  const targetNameEl = document.getElementById('uploadTargetFolderName');

  if (uploadSelect) uploadSelect.value = currentNav.id;
  if (targetNameEl) targetNameEl.textContent = currentNav.name;

  openModal('uploadModal');
}

function handleFileSelect(e) { addFiles(Array.from(e.target.files)); }

function addFiles(files) {
  const valid = files.filter(f => f.type.startsWith('image/'));
  state.selectedFiles = state.selectedFiles.concat(valid);
  const container = document.getElementById('selectedFilesList');
  container.innerHTML = `<strong>เลือกไฟล์ทั้งหมด ${state.selectedFiles.length} รายการ:</strong><br>`;
  state.selectedFiles.forEach(f => { container.innerHTML += `• ${escapeHtml(f.name)} (${formatBytes(f.size)})<br>`; });
  document.getElementById('btnSubmitUpload').disabled = state.selectedFiles.length === 0;
}

async function submitUpload() {
  if (!state.selectedFiles.length) return;
  const targetFolderId = document.getElementById('uploadFolderSelect').value;
  const btnSubmit = document.getElementById('btnSubmitUpload');
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<span>⏳</span> กำลังอ่านไฟล์...';
  const userEmail = googleUser ? googleUser.email : '';

  try {
    const filePayloads = await Promise.all(state.selectedFiles.map(async f => ({
      name: f.name, mimeType: f.type, base64Data: await readFileAsBase64(f)
    })));
    btnSubmit.innerHTML = '<span>🚀</span> กำลังอัปโหลด...';
    showToast(`กำลังอัปโหลด ${filePayloads.length} ไฟล์...`, 'info');

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId: targetFolderId, filePayloads, userEmail })
    });
    const data = await res.json();
    showToast(`อัปโหลดสำเร็จ ${data.uploadedCount || filePayloads.length} ไฟล์`, 'success');
    closeModal('uploadModal');
    loadAlbums();
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<span>🚀</span> เริ่มต้นอัปโหลด';
  } catch (err) {
    showToast('อัปโหลดล้มเหลว: ' + err.toString(), 'error');
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<span>🚀</span> เริ่มต้นอัปโหลด';
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function openCreateFolderModal() {
  document.getElementById('newFolderNameInput').value = '';
  openModal('createFolderModal');
}

async function submitCreateFolder() {
  const name = document.getElementById('newFolderNameInput').value;
  if (!name.trim()) { showToast('กรุณาระบุชื่ออัลบั้ม', 'error'); return; }
  showToast('กำลังสร้างอัลบั้มใหม่...', 'info');
  const userEmail = googleUser ? googleUser.email : '';

  try {
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName: name, userEmail })
    });
    const data = await res.json();
    showToast(`สร้างอัลบั้ม "${name}" เรียบร้อยแล้ว`, 'success');
    closeModal('createFolderModal');
    loadAlbums();
  } catch (err) {
    showToast('สร้างอัลบั้มล้มเหลว: ' + err.message, 'error');
  }
}

function openDriveConfigModal() {
  openModal('driveConfigModal');
  const infoDiv = document.getElementById('currentDriveInfo');
  infoDiv.innerHTML = 'กำลังดึงข้อมูลโฟลเดอร์ปัจจุบัน...';

  fetch('/api/config')
    .then(r => r.json())
    .then(info => {
      infoDiv.innerHTML = `<strong>📁 โฟลเดอร์ปัจจุบัน:</strong><br>• ชื่อ: <strong>${escapeHtml(info.name)}</strong><br>• ID: <code>${info.id}</code><br>• <a href="${info.url}" target="_blank" style="color:#60a5fa;text-decoration:underline;">เปิดใน Google Drive ↗</a>`;
      document.getElementById('driveUrlInput').value = info.url || '';
    })
    .catch(err => showToast('ดึงข้อมูลโฟลเดอร์ล้มเหลว', 'error'));
}

async function submitDriveConfig() {
  const urlOrId = document.getElementById('driveUrlInput').value;
  if (!urlOrId.trim()) { showToast('กรุณาระบุ Google Drive Folder URL หรือ Folder ID', 'error'); return; }
  showToast('กำลังเชื่อมต่อโฟลเดอร์...', 'info');

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urlOrId })
    });
    const data = await res.json();
    showToast(data.message || 'บันทึกเรียบร้อยแล้ว', 'success');
    closeModal('driveConfigModal');
    loadAlbums();
  } catch (err) {
    showToast('ตั้งค่าโฟลเดอร์ล้มเหลว', 'error');
  }
}

function openAdminUserModal() {
  openModal('adminUserModal');
  loadUsersList();
}

async function loadUsersList() {
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:2rem;">กำลังโหลด...</td></tr>';
  const userEmail = googleUser ? googleUser.email : '';
  try {
    const res = await fetch(`/api/users?userEmail=${encodeURIComponent(userEmail)}`);
    const users = await res.json();
    renderUserTable(users);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:2rem;color:red;">ไม่สามารถโหลดรายชื่อผู้ใช้ได้</td></tr>';
  }
}

function renderUserTable(users) {
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = '';
  if (!Array.isArray(users)) return;
  users.forEach(u => {
    const tr = document.createElement('tr');
    let badge = '';
    if      (u.role === 'SUPER_ADMIN')     badge = `<span class="role-pill role-super">Super Admin</span>`;
    else if (u.role === 'ADMIN')           badge = `<span class="role-pill role-admin">Admin</span>`;
    else if (u.role === 'ASSISTANT_ADMIN') badge = `<span class="role-pill role-assistant">ผู้ช่วย Admin</span>`;
    else if (u.role === 'PENDING')         badge = `<span class="role-pill role-pending">รออนุมัติ</span>`;
    else                                   badge = `<span class="role-pill">ปฏิเสธแล้ว</span>`;

    const roleSelectHtml = `
      <select class="form-input" style="padding:0.3rem 0.6rem;font-size:0.8rem;width:auto;min-width:140px;background:#0f172a;cursor:pointer;" onchange="changeUserRole('${u.email}', this.value)">
        <option value="" disabled ${!u.role || u.role === 'PENDING' ? 'selected' : ''}>-- เลือกกำหนดสิทธิ์ --</option>
        <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>Admin (ผู้ดูแล)</option>
        <option value="ASSISTANT_ADMIN" ${u.role === 'ASSISTANT_ADMIN' ? 'selected' : ''}>ผู้ช่วย Admin</option>
        <option value="REJECTED" ${u.role === 'REJECTED' ? 'selected' : ''}>ยกเลิกสิทธิ์ (ปฏิเสธ)</option>
      </select>`;

    const actions = u.isFixed
      ? `<em style="color:var(--accent);font-size:0.8rem;">ผู้ดูแลหลัก (Fixed)</em>`
      : `<div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
           ${roleSelectHtml}
           <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.8rem;" onclick="deleteUserAccount('${u.email}')">🗑️ ลบ</button>
         </div>`;

    const profileStatus = u.isFixed ? '' : (u.profileComplete ? '' : '<div style="font-size:0.7rem;color:#f59e0b;margin-top:2px;">🟡 รอกรอกข้อมูล</div>');
    const deptInfo = u.department ? `<div style="font-size:0.7rem;color:var(--text-dim);margin-top:2px;">📚 ${escapeHtml(u.department)}</div>` : '';
    const addedByInfo = u.addedBy ? `<div style="font-size:0.7rem;color:var(--text-dim);margin-top:2px;">เพิ่มโดย: ${escapeHtml(u.addedBy)}</div>` : '';

    tr.innerHTML = `
      <td><div style="font-weight:500;">${escapeHtml(u.displayName)}</div><div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(u.email)}</div>${deptInfo}${addedByInfo}${profileStatus}</td>
      <td>${badge}</td>
      <td><div style="display:flex;gap:0.35rem;flex-wrap:wrap;">${actions}</div></td>`;
    tbody.appendChild(tr);
  });
}

async function changeUserRole(email, newRole) {
  showToast(`กำลังเปลี่ยนสิทธิ์ของ ${email}...`, 'info');
  const userEmail = googleUser ? googleUser.email : '';
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEmail: email, newRole, userEmail })
    });
    const data = await res.json();
    showToast(data.message || 'เปลี่ยนสิทธิ์สำเร็จ', 'success');
    loadUsersList();
  } catch (err) {
    showToast('เปลี่ยนสิทธิ์ล้มเหลว', 'error');
  }
}

async function deleteUserAccount(email) {
  if (!confirm(`คุณต้องการลบผู้ใช้ "${email}" ออกจากระบบใช่หรือไม่?`)) return;
  showToast(`กำลังลบผู้ใช้ ${email}...`, 'info');
  const userEmail = googleUser ? googleUser.email : '';
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteUser', targetEmail: email, userEmail })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    showToast(data.message || 'ลบผู้ใช้สำเร็จ', 'success');
    loadUsersList();
  } catch (err) {
    showToast('ลบผู้ใช้ล้มเหลว: ' + err.message, 'error');
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
  }
  if (!document.querySelector('.modal.active')) {
    document.body.classList.remove('modal-open');
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function formatBytes(bytes) {
  if (!bytes) return '0 Bytes';
  const k = 1024, sizes = ['Bytes','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes)/Math.log(k));
  return parseFloat((bytes/Math.pow(k,i)).toFixed(2)) + ' ' + sizes[i];
}

function openManageAlbumsModal() {
  if (!state.folders) return;
  const tbody = document.getElementById('albumsTableBody');
  tbody.innerHTML = '';
  
  const albums = state.folders.filter(f => !f.isRoot && !(f.name && f.name.indexOf('รูปภาพทั้งหมด') !== -1));
  
  if (albums.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem;">ไม่พบอัลบั้ม</td></tr>';
  } else {
    albums.forEach(f => {
      const isHidden = !!f.isHidden;
      const statusText = isHidden 
        ? '<span style="color: #ef4444; font-weight: 600;">🚫 ซ่อนอยู่</span>' 
        : '<span style="color: #10b981; font-weight: 600;">👁️ แสดงปกติ</span>';
      
      const switchHtml = `
        <label class="toggle-switch" title="${isHidden ? 'คลิกเพื่อแสดงอัลบั้ม' : 'คลิกเพื่อซ่อนอัลบั้ม'}">
          <input type="checkbox" ${!isHidden ? 'checked' : ''} onchange="toggleAlbumVisibility('${f.id}', !this.checked, this)">
          <span class="toggle-slider"></span>
        </label>
      `;
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 500;">${escapeHtml(f.name)}</td>
        <td id="status-cell-${f.id}" style="text-align: center;">${statusText}</td>
        <td style="text-align: center; vertical-align: middle;">${switchHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  openModal('manageAlbumsModal');
}

async function toggleAlbumVisibility(albumId, isHidden, checkboxElem) {
  if (!googleUser) return;
  
  const folderItem = state.folders ? state.folders.find(f => f.id === albumId) : null;
  if (folderItem) {
    folderItem.isHidden = isHidden;
  }
  
  const statusCell = document.getElementById(`status-cell-${albumId}`);
  if (statusCell) {
    statusCell.innerHTML = isHidden 
      ? '<span style="color: #ef4444; font-weight: 600;">🚫 ซ่อนอยู่</span>' 
      : '<span style="color: #10b981; font-weight: 600;">👁️ แสดงปกติ</span>';
  }
  
  renderAlbumGrid(state.folders);

  try {
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggleVisibility', albumId, isHidden, userEmail: googleUser.email })
    });
    
    if (!res.ok) throw new Error('API Error ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    
    showToast(isHidden ? 'ซ่อนอัลบั้มเรียบร้อยแล้ว' : 'แสดงอัลบั้มเรียบร้อยแล้ว', 'success');
  } catch (err) {
    if (folderItem) folderItem.isHidden = !isHidden;
    if (checkboxElem) checkboxElem.checked = !isHidden;
    if (statusCell) {
      statusCell.innerHTML = !isHidden 
        ? '<span style="color: #ef4444; font-weight: 600;">🚫 ซ่อนอยู่</span>' 
        : '<span style="color: #10b981; font-weight: 600;">👁️ แสดงปกติ</span>';
    }
    renderAlbumGrid(state.folders);
    showToast('บันทึกล้มเหลว: ' + err.message, 'error');
  }
}

// ============================================================================
// ADD ADMIN & PROFILE SETUP
// ============================================================================

window.openAddAdminModal = function() {
  const emailInput = document.getElementById('addAdminEmail');
  if (emailInput) emailInput.value = '';
  const radioInput = document.querySelector('input[name="addAdminRole"][value="ADMIN"]');
  if (radioInput) radioInput.checked = true;
  openModal('addAdminModal');
}

async function submitAddAdmin() {
  const email = document.getElementById('addAdminEmail').value.trim();
  const role = document.querySelector('input[name="addAdminRole"]:checked').value;

  if (!email) { showToast('กรุณาระบุ Email', 'error'); return; }
  if (!email.includes('@')) { showToast('รูปแบบ Email ไม่ถูกต้อง', 'error'); return; }

  const btn = document.getElementById('btnSubmitAddAdmin');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> กำลังเพิ่ม...';

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addAdmin',
        targetEmail: email,
        newRole: role,
        userEmail: googleUser ? googleUser.email : ''
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    showToast(data.message || 'เพิ่ม Admin สำเร็จ', 'success');
    closeModal('addAdminModal');
    loadUsersList();
  } catch (err) {
    showToast('เพิ่ม Admin ล้มเหลว: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>✅</span> เพิ่ม Admin';
  }
}

function openProfileSetupModal(email) {
  document.getElementById('profileEmail').value = email;
  document.getElementById('profilePrefix').value = '';
  document.getElementById('profileFirstName').value = '';
  document.getElementById('profileLastName').value = '';
  document.getElementById('profileDepartment').value = '';
  openModal('profileSetupModal');
}

async function submitProfile() {
  const prefix = document.getElementById('profilePrefix').value;
  const firstName = document.getElementById('profileFirstName').value.trim();
  const lastName = document.getElementById('profileLastName').value.trim();
  const department = document.getElementById('profileDepartment').value;

  if (!prefix) { showToast('กรุณาเลือกคำนำหน้าชื่อ', 'error'); return; }
  if (!firstName) { showToast('กรุณาระบุชื่อ', 'error'); return; }
  if (!lastName) { showToast('กรุณาระบุนามสกุล', 'error'); return; }
  if (!department) { showToast('กรุณาเลือกกลุ่มสาระการเรียนรู้', 'error'); return; }

  const btn = document.getElementById('btnSubmitProfile');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> กำลังบันทึก...';

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateProfile',
        prefix, firstName, lastName, department,
        userEmail: googleUser ? googleUser.email : ''
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    showToast('บันทึกข้อมูลเรียบร้อย! ยินดีต้อนรับ', 'success');
    closeModal('profileSetupModal');
    checkUserStatus(googleUser.email, true);
  } catch (err) {
    showToast('บันทึกล้มเหลว: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>💾</span> บันทึกข้อมูลและเข้าใช้งาน';
  }
}
