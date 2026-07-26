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
  state.folders = Array.isArray(folders) ? folders : [];
  const albumGrid = document.getElementById('albumGrid');
  const uploadSelect = document.getElementById('uploadFolderSelect');
  albumGrid.innerHTML = '';
  uploadSelect.innerHTML = '';

  if (!Array.isArray(folders)) {
    albumGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">⚠️</div>
        <h3>ไม่สามารถดึงข้อมูลอัลบั้มได้</h3>
        <p>${escapeHtml(folders && folders.error ? folders.error : 'กรุณาตรวจสอบการตั้งค่าแชร์ใน Google Drive ให้เป็น "ทุกคนที่มีลิงก์มีสิทธิ์ดู"')}</p>
      </div>`;
    return;
  }

  if (folders.length === 0) {
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
  state.navStack.push({ id: folderId, name: folderName });
  state.currentFolderId = folderId;
  state.currentOffset = 0;
  state.hasMore = false;
  state.isLoadingMore = false;
  state.photos = [];

  document.getElementById('viewAlbums').style.display = 'none';
  document.getElementById('viewPhotos').style.display = 'block';
  document.getElementById('galleryTitle').innerHTML = `<span>📸</span> ${escapeHtml(folderName)}`;
  document.getElementById('searchInput').value = '';

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
    nextOffset = directPhotosData.directPhotos.nextOffset;
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
    nextOffset = photosData.directPhotos.nextOffset;
    total = photosData.directPhotos.total;
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
  document.getElementById('searchInput').value = '';
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
  try {
    const res = await fetch(`/api/photos?fileId=${encodeURIComponent(state.currentPhoto.id)}`, { method: 'DELETE' });
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
  state.selectedFiles = [];
  document.getElementById('selectedFilesList').innerHTML = '';
  document.getElementById('fileInput').value = '';
  document.getElementById('btnSubmitUpload').disabled = true;
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

  try {
    const filePayloads = await Promise.all(state.selectedFiles.map(async f => ({
      name: f.name, mimeType: f.type, base64Data: await readFileAsBase64(f)
    })));
    btnSubmit.innerHTML = '<span>🚀</span> กำลังอัปโหลด...';
    showToast(`กำลังอัปโหลด ${filePayloads.length} ไฟล์...`, 'info');

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId: targetFolderId, filePayloads })
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

  try {
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName: name })
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
  try {
    const res = await fetch('/api/users');
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

    const actions = u.isFixed
      ? `<em style="color:var(--accent);font-size:0.8rem;">ผู้ดูแลหลัก (Fixed)</em>`
      : `<button class="btn btn-primary"   style="padding:0.25rem 0.5rem;font-size:0.75rem;" onclick="changeUserRole('${u.email}','ADMIN')">อนุมัติ Admin</button>
         <button class="btn btn-secondary" style="padding:0.25rem 0.5rem;font-size:0.75rem;" onclick="changeUserRole('${u.email}','ASSISTANT_ADMIN')">อนุมัติ ผู้ช่วย Admin</button>
         <button class="btn btn-danger"    style="padding:0.25rem 0.5rem;font-size:0.75rem;" onclick="changeUserRole('${u.email}','REJECTED')">ยกเลิกสิทธิ์</button>`;

    tr.innerHTML = `
      <td><div style="font-weight:500;">${escapeHtml(u.displayName)}</div><div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(u.email)}</div></td>
      <td>${badge}</td>
      <td><div style="display:flex;gap:0.35rem;flex-wrap:wrap;">${actions}</div></td>`;
    tbody.appendChild(tr);
  });
}

async function changeUserRole(email, newRole) {
  showToast(`กำลังเปลี่ยนสิทธิ์ของ ${email}...`, 'info');
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEmail: email, newRole })
    });
    const data = await res.json();
    showToast(data.message || 'เปลี่ยนสิทธิ์สำเร็จ', 'success');
    loadUsersList();
  } catch (err) {
    showToast('เปลี่ยนสิทธิ์ล้มเหลว', 'error');
  }
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

function formatBytes(bytes) {
  if (!bytes) return '0 Bytes';
  const k = 1024, sizes = ['Bytes','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes)/Math.log(k));
  return parseFloat((bytes/Math.pow(k,i)).toFixed(2)) + ' ' + sizes[i];
}
