/**
 * ============================================================================
 * School Photo Management Web App - Client JS for Vercel & Web Standard
 * ============================================================================
 */

// Global State
let state = {
  userCtx: null,
  folders: [],
  navStack: [],
  photos: [],
  selectedFiles: [],
  currentPhoto: null,
  searchTimer: null
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  checkUserStatus();
  loadAlbums();
}

async function checkUserStatus() {
  try {
    const res = await fetch('/api/auth');
    if (res.ok) {
      const ctx = await res.json();
      state.userCtx = ctx;
      renderUserNavbar(ctx);
    }
  } catch (err) {
    console.warn('Auth check skipped:', err);
  }
}

function renderUserNavbar(ctx) {
  const userSection = document.getElementById('userSection');
  const userEmailText = document.getElementById('userEmailText');
  const rolePill = document.getElementById('rolePill');

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
  } else {
    userSection.style.display = 'none';
  }

  document.getElementById('btnDriveConfig').style.display = (ctx && ctx.isSuperAdmin) ? 'inline-flex' : 'none';
  document.getElementById('btnAdminPanel').style.display = (ctx && ctx.isSuperAdmin) ? 'inline-flex' : 'none';
  document.getElementById('btnUpload').style.display = (ctx && ctx.isCanUpload) ? 'inline-flex' : 'none';
  document.getElementById('btnCreateFolder').style.display = (ctx && ctx.isAdminOrHigher) ? 'inline-flex' : 'none';
}

// ALBUM CARDS (View 1)
async function loadAlbums() {
  const albumGrid = document.getElementById('albumGrid');
  albumGrid.innerHTML = `
    <div class="album-card-skeleton skeleton"></div>
    <div class="album-card-skeleton skeleton"></div>
    <div class="album-card-skeleton skeleton"></div>
    <div class="album-card-skeleton skeleton"></div>`;

  try {
    const res = await fetch('/api/folders');
    const folders = await res.json();
    renderAlbumGrid(folders);
  } catch (err) {
    showToast('ไม่สามารถโหลดอัลบั้มได้: ' + err.message, 'error');
  }
}

function renderAlbumGrid(folders) {
  state.folders = folders;
  const albumGrid = document.getElementById('albumGrid');
  const uploadSelect = document.getElementById('uploadFolderSelect');
  albumGrid.innerHTML = '';
  uploadSelect.innerHTML = '';

  if (!folders || folders.length === 0) {
    albumGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">📁</div>
        <h3>ยังไม่มีอัลบั้มภาพ</h3>
        <p>Super Admin สามารถตั้งค่าโฟลเดอร์ Google Drive หรือ Admin สามารถสร้างอัลบั้มใหม่ได้</p>
      </div>`;
    return;
  }

  folders.forEach(f => {
    albumGrid.appendChild(buildAlbumCard(f, () => openFolder(f.id, f.name)));

    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    uploadSelect.appendChild(opt);
  });
}

function buildAlbumCard(f, onClick) {
  const card = document.createElement('div');
  card.className = 'album-card';
  card.onclick = onClick;

  const coverHtml = f.coverUrl
    ? `<img class="album-cover-img" src="${f.coverUrl}" alt="${escapeHtml(f.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'album-cover-placeholder\\'>📷<span>ไม่มีรูปภาพ</span></div>'">`
    : `<div class="album-cover-placeholder">📷<span>ไม่มีรูปภาพ</span></div>`;

  card.innerHTML = `
    <div class="album-cover">
      ${coverHtml}
      <div class="album-cover-gradient"></div>
    </div>
    <div class="album-info">
      <div class="album-name">${f.isRoot ? '🖼️' : '📁'} ${escapeHtml(f.name)}</div>
      <div class="album-arrow">›</div>
    </div>`;
  return card;
}

// OPEN FOLDER & NAVIGATION (View 2)
async function openFolder(folderId, folderName) {
  state.navStack.push({ id: folderId, name: folderName });

  document.getElementById('viewAlbums').style.display = 'none';
  document.getElementById('viewPhotos').style.display = 'block';
  document.getElementById('galleryTitle').innerHTML = `<span>📸</span> ${escapeHtml(folderName)}`;
  document.getElementById('searchInput').value = '';

  renderBreadcrumb();
  showPhotoSkeletons();

  try {
    const res = await fetch(`/api/photos?folderId=${encodeURIComponent(folderId)}`);
    const contents = await res.json();
    if (contents.type === 'subfolders' && contents.subfolders.length > 0) {
      renderSubfolderView(contents.subfolders, contents.directPhotos || []);
    } else {
      renderGalleryGrid(contents.items || contents.directPhotos || []);
    }
  } catch (err) {
    showToast('ไม่สามารถโหลดรูปภาพในโฟลเดอร์ได้', 'error');
  }
}

function renderSubfolderView(subfolders, directPhotos) {
  state.photos = directPhotos;
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = '';

  const subGrid = document.createElement('div');
  subGrid.className = 'album-grid';
  subGrid.style.cssText = 'margin-bottom: 1.5rem; grid-column: 1/-1;';
  subfolders.forEach(sub => {
    subGrid.appendChild(buildAlbumCard(sub, () => openFolder(sub.id, sub.name)));
  });
  grid.appendChild(subGrid);

  if (directPhotos && directPhotos.length > 0) {
    const divider = document.createElement('div');
    divider.style.cssText = 'grid-column: 1/-1; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem; margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--text-muted);';
    divider.innerHTML = `<span>📷 รูปภาพในโฟลเดอร์นี้ (${directPhotos.length} รูป)</span>`;
    grid.appendChild(divider);

    directPhotos.forEach(photo => {
      grid.appendChild(buildPhotoCard(photo));
    });
  }

  document.getElementById('photoCountBadge').textContent = `${subfolders.length} โฟลเดอร์${directPhotos.length > 0 ? ' + ' + directPhotos.length + ' รูป' : ''}`;
}

function showPhotoSkeletons() {
  document.getElementById('galleryGrid').innerHTML = `
    <div class="photo-card skeleton" style="height:220px;"></div>
    <div class="photo-card skeleton" style="height:220px;"></div>
    <div class="photo-card skeleton" style="height:220px;"></div>
    <div class="photo-card skeleton" style="height:220px;"></div>`;
}

function renderGalleryGrid(photos) {
  state.photos = photos;
  const grid = document.getElementById('galleryGrid');
  document.getElementById('photoCountBadge').textContent = `${photos.length} รูปภาพ`;

  if (!photos || photos.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📷</div>
        <h3>ไม่พบรูปภาพในโฟลเดอร์นี้</h3>
        <p>ยังไม่มีการอัปโหลดรูปภาพ หรือไม่พบไฟล์ตรงตามคำค้นหา</p>
      </div>`;
    return;
  }

  grid.innerHTML = '';
  photos.forEach(photo => grid.appendChild(buildPhotoCard(photo)));
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

// BREADCRUMB
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
  document.getElementById('searchInput').value = '';
}

// SEARCH
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

// LIGHTBOX & MODALS
function openLightbox(photoId) {
  const photo = state.photos.find(p => p.id === photoId);
  if (!photo) return;
  state.currentPhoto = photo;
  document.getElementById('lightboxTitle').textContent = photo.name;
  document.getElementById('lightboxImage').src = photo.viewLink;
  document.getElementById('lightboxMeta').textContent = `วันที่อัปโหลด: ${photo.created || '-'} | ขนาด: ${photo.size || '-'}`;
  document.getElementById('lightboxDownloadBtn').href = photo.downloadLink;
  openModal('lightboxModal');
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

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
