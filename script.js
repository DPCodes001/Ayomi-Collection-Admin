/* ════════════════════════════════════════════════════════════
   script.js — Ikemhi Beauty Store Admin
   Combined: Login + Dashboard logic in one file
   Works on all browsers including iPhone Safari
════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════════════════
// ⚙️  CONFIGURATION
// ══════════════════════════════════════════════════════════
var SUPABASE_URL   = 'https://wwuncembltmshovnpblp.supabase.co';
var SUPABASE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dW5jZW1ibHRtc2hvdm5wYmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc2MTIsImV4cCI6MjA4ODY1MzYxMn0.j9C3OCbjxrkF7cU1zoFOIlUuyW77MWpoXjc8aiIO70M';
var STORAGE_BUCKET = 'product-images';

// ── Create Supabase client ─────────────────────────────────
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── App state ──────────────────────────────────────────────
var allProducts    = [];
var deleteTargetId = null;
var addImageFile   = null;
var editImageFile  = null;

// ══════════════════════════════════════════════════════════
// BOOT — decide which screen to show
// ══════════════════════════════════════════════════════════
function boot() {
  supabase.auth.getSession().then(function(res) {
    if (res.data.session) {
      showDashboard();
      initDashboard();
    } else {
      showLogin();
      initLogin();
    }
  });
}

// ══════════════════════════════════════════════════════════
// SCREEN SWITCHING
// ══════════════════════════════════════════════════════════
function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashScreen').style.display  = 'none';
  document.body.className = 'login-body';
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashScreen').style.display  = 'block';
  document.body.className = 'dash-body';
}

// ══════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════
function initLogin() {
  // Toggle password visibility
  document.getElementById('togglePass').addEventListener('click', function() {
    var pw = document.getElementById('password');
    pw.type = pw.type === 'password' ? 'text' : 'password';
  });

  // Sign in button
  document.getElementById('loginBtn').addEventListener('click', doLogin);

  // Enter key support
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && document.getElementById('loginScreen').style.display !== 'none') {
      doLogin();
    }
  });
}

function doLogin() {
  var email    = document.getElementById('email').value.trim();
  var password = document.getElementById('password').value;
  var errEl    = document.getElementById('login-error');

  errEl.style.display = 'none';

  if (!email || !password) {
    errEl.textContent   = 'Please enter both email and password.';
    errEl.style.display = 'block';
    return;
  }

  setLoading('loginBtn', 'loginBtnText', 'loginSpinner', true);

  supabase.auth.signInWithPassword({ email: email, password: password }).then(function(res) {
    if (res.error) {
      errEl.textContent   = res.error.message || 'Login failed. Please try again.';
      errEl.style.display = 'block';
      setLoading('loginBtn', 'loginBtnText', 'loginSpinner', false);
    } else {
      showDashboard();
      initDashboard();
    }
  });
}

// ══════════════════════════════════════════════════════════
// DASHBOARD INIT
// ══════════════════════════════════════════════════════════
function initDashboard() {
  loadUser();
  initNavigation();
  initSidebar();
  initAddProductForm();
  initEditModal();
  initDeleteModal();
  initSearch();
  navigateTo('dashboard');
}

function loadUser() {
  supabase.auth.getUser().then(function(res) {
    var user = res.data.user;
    if (user) {
      var email = user.email || 'Admin';
      document.getElementById('userEmail').textContent  = email;
      document.getElementById('userAvatar').textContent = email[0].toUpperCase();
    }
  });
}

// ══════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════
function initNavigation() {
  document.querySelectorAll('[data-page]').forEach(function(el) {
    el.addEventListener('click', function() {
      navigateTo(el.dataset.page);
      if (el.classList.contains('nav-item')) closeSidebar();
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', function() {
    supabase.auth.signOut().then(function() {
      showLogin();
      initLogin();
    });
  });
}

function navigateTo(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(function(p) { p.classList.add('hidden'); });

  // Show target
  var target = document.getElementById('page-' + pageId);
  if (target) target.classList.remove('hidden');

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });

  // Update topbar title
  var titles = {
    'dashboard':       'Dashboard',
    'add-product':     'Add Product',
    'manage-products': 'Manage Products'
  };
  document.getElementById('topbarTitle').textContent = titles[pageId] || 'Dashboard';

  // Load data
  if (pageId === 'dashboard')       loadDashboard();
  if (pageId === 'manage-products') loadManageProducts();
}

// ══════════════════════════════════════════════════════════
// SIDEBAR (mobile)
// ══════════════════════════════════════════════════════════
function initSidebar() {
  document.getElementById('menuToggle').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('visible');
  });
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('visible');
}

// ══════════════════════════════════════════════════════════
// DASHBOARD PAGE — stats + recent products
// ══════════════════════════════════════════════════════════
function loadDashboard() {
  supabase.from('products').select('*').order('created_at', { ascending: false }).then(function(res) {
    if (res.error) { console.error(res.error); return; }
    allProducts = res.data || [];

    var total   = allProducts.length;
    var withImg = allProducts.filter(function(p) { return p.image_url; }).length;
    var prices  = allProducts.map(function(p) { return Number(p.price); });
    var avg     = total > 0 ? (prices.reduce(function(a,b){return a+b;},0) / total).toFixed(2) : '0.00';
    var highest = total > 0 ? Math.max.apply(null, prices).toFixed(2) : '0.00';

    document.getElementById('statTotal').textContent      = total;
    document.getElementById('statWithImages').textContent = withImg;
    document.getElementById('statAvgPrice').textContent   = '₦' + avg;
    document.getElementById('statHighest').textContent    = '₦' + highest;

    var recent    = allProducts.slice(0, 6);
    var container = document.getElementById('recentProducts');
    container.innerHTML = recent.length === 0
      ? emptyState('No products yet', 'Add your first product to get started.', '📦')
      : recent.map(function(p) { return renderProductCard(p, false); }).join('');
  });
}

// ══════════════════════════════════════════════════════════
// MANAGE PRODUCTS PAGE
// ══════════════════════════════════════════════════════════
function loadManageProducts() {
  var grid = document.getElementById('productsGrid');
  grid.innerHTML = '<div class="empty-state">Loading products…</div>';

  supabase.from('products').select('*').order('created_at', { ascending: false }).then(function(res) {
    if (res.error) { showAlert('manage-alert', 'error', 'Failed to load: ' + res.error.message); return; }
    allProducts = res.data || [];
    renderManageGrid(allProducts);
  });
}

function renderManageGrid(products) {
  var grid = document.getElementById('productsGrid');
  if (products.length === 0) {
    grid.innerHTML = emptyState('No products found', 'Try a different search or add a new product.', '🔍');
    return;
  }
  grid.innerHTML = products.map(function(p) { return renderProductCard(p, true); }).join('');

  grid.querySelectorAll('.btn-edit').forEach(function(btn) {
    btn.addEventListener('click', function() { openEditModal(btn.dataset.id); });
  });
  grid.querySelectorAll('.btn-delete').forEach(function(btn) {
    btn.addEventListener('click', function() { openDeleteModal(btn.dataset.id, btn.dataset.name); });
  });
}

function renderProductCard(p, withActions) {
  var imgHtml = p.image_url
    ? '<img src="' + escHtml(p.image_url) + '" alt="' + escHtml(p.name) + '" loading="lazy" />'
    : '<div class="card-img-placeholder">📦</div>';

  var actions = withActions
    ? '<div class="card-actions">' +
        '<button class="btn btn-edit btn-sm" data-id="' + p.id + '" data-name="' + escHtml(p.name) + '">✏ Edit</button>' +
        '<button class="btn btn-delete btn-sm" data-id="' + p.id + '" data-name="' + escHtml(p.name) + '">🗑 Delete</button>' +
      '</div>'
    : '';

  return '<div class="product-card">' +
    '<div class="card-img-wrap">' + imgHtml + '</div>' +
    '<div class="card-body">' +
      '<div class="card-name">' + escHtml(p.name) + '</div>' +
      '<div class="card-price">₦' + Number(p.price).toFixed(2) + '</div>' +
      '<div class="card-desc">' + escHtml(p.description || '') + '</div>' +
    '</div>' + actions +
  '</div>';
}

// ══════════════════════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════════════════════
function initSearch() {
  document.getElementById('searchInput').addEventListener('input', function() {
    var q = this.value.toLowerCase().trim();
    renderManageGrid(allProducts.filter(function(p) {
      return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
    }));
  });
}

// ══════════════════════════════════════════════════════════
// ADD PRODUCT FORM
// ══════════════════════════════════════════════════════════
function initAddProductForm() {
  setupDropZone('addImageZone', 'pImage', 'addDropInner', 'addPreviewImg', function(f) { addImageFile = f; });
  document.getElementById('clearAddFormBtn').addEventListener('click', resetAddForm);

  document.getElementById('addProductBtn').addEventListener('click', function() {
    var name  = document.getElementById('pName').value.trim();
    var price = document.getElementById('pPrice').value.trim();
    var desc  = document.getElementById('pDesc').value.trim();

    if (!name || !price) { showAlert('add-product-alert', 'error', 'Product name and price are required.'); return; }
    if (isNaN(Number(price)) || Number(price) < 0) { showAlert('add-product-alert', 'error', 'Please enter a valid price.'); return; }

    setLoading('addProductBtn', 'addProductBtnText', 'addProductSpinner', true);

    var doInsert = function(image_url) {
      supabase.from('products').insert([{
        name: name, price: Number(price), description: desc, image_url: image_url
      }]).then(function(res) {
        if (res.error) showAlert('add-product-alert', 'error', 'Failed: ' + res.error.message);
        else { showAlert('add-product-alert', 'success', '✅ Product added successfully!'); resetAddForm(); }
        setLoading('addProductBtn', 'addProductBtnText', 'addProductSpinner', false);
      });
    };

    if (addImageFile) {
      uploadImage(addImageFile).then(doInsert).catch(function(e) {
        showAlert('add-product-alert', 'error', 'Image upload failed: ' + e.message);
        setLoading('addProductBtn', 'addProductBtnText', 'addProductSpinner', false);
      });
    } else {
      doInsert(null);
    }
  });
}

function resetAddForm() {
  document.getElementById('pName').value  = '';
  document.getElementById('pPrice').value = '';
  document.getElementById('pDesc').value  = '';
  addImageFile = null;
  resetDropZone('addImageZone', 'addDropInner', 'addPreviewImg');
}

// ══════════════════════════════════════════════════════════
// EDIT MODAL
// ══════════════════════════════════════════════════════════
function initEditModal() {
  setupDropZone('editImageZone', 'editImage', 'editDropInner', 'editPreviewImg', function(f) { editImageFile = f; });
  document.getElementById('closeModal').addEventListener('click', closeEditModal);
  document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
  document.getElementById('editModal').addEventListener('click', function(e) {
    if (e.target === e.currentTarget) closeEditModal();
  });
  document.getElementById('saveEditBtn').addEventListener('click', function() {
    var id    = document.getElementById('editId').value;
    var name  = document.getElementById('editName').value.trim();
    var price = document.getElementById('editPrice').value.trim();
    var desc  = document.getElementById('editDesc').value.trim();

    if (!name || !price) { showAlert('edit-product-alert', 'error', 'Name and price are required.'); return; }

    setLoading('saveEditBtn', 'saveEditBtnText', 'saveEditSpinner', true);

    var doUpdate = function(image_url) {
      var updateData = { name: name, price: Number(price), description: desc };
      if (image_url !== undefined) updateData.image_url = image_url;
      supabase.from('products').update(updateData).eq('id', id).then(function(res) {
        if (res.error) showAlert('edit-product-alert', 'error', 'Failed: ' + res.error.message);
        else { closeEditModal(); loadManageProducts(); }
        setLoading('saveEditBtn', 'saveEditBtnText', 'saveEditSpinner', false);
      });
    };

    if (editImageFile) {
      uploadImage(editImageFile).then(function(url) { doUpdate(url); }).catch(function(e) {
        showAlert('edit-product-alert', 'error', 'Image upload failed: ' + e.message);
        setLoading('saveEditBtn', 'saveEditBtnText', 'saveEditSpinner', false);
      });
    } else {
      doUpdate(undefined);
    }
  });
}

function openEditModal(id) {
  var product = allProducts.find(function(p) { return String(p.id) === String(id); });
  if (!product) return;

  editImageFile = null;
  document.getElementById('editId').value    = product.id;
  document.getElementById('editName').value  = product.name;
  document.getElementById('editPrice').value = product.price;
  document.getElementById('editDesc').value  = product.description || '';

  var previewImg = document.getElementById('editPreviewImg');
  var dropInner  = document.getElementById('editDropInner');
  if (product.image_url) {
    previewImg.src = product.image_url;
    previewImg.style.display = 'block';
    dropInner.style.display  = 'none';
  } else {
    resetDropZone('editImageZone', 'editDropInner', 'editPreviewImg');
  }

  document.getElementById('edit-product-alert').style.display = 'none';
  document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
  editImageFile = null;
}

// ══════════════════════════════════════════════════════════
// DELETE MODAL
// ══════════════════════════════════════════════════════════
function initDeleteModal() {
  document.getElementById('closeDeleteModal').addEventListener('click', closeDeleteModal);
  document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteModal').addEventListener('click', function(e) {
    if (e.target === e.currentTarget) closeDeleteModal();
  });
  document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
    if (!deleteTargetId) return;
    setLoading('confirmDeleteBtn', 'deleteBtnText', 'deleteSpinner', true);
    supabase.from('products').delete().eq('id', deleteTargetId).then(function(res) {
      if (res.error) showAlert('manage-alert', 'error', 'Failed to delete: ' + res.error.message);
      else { closeDeleteModal(); loadManageProducts(); }
      setLoading('confirmDeleteBtn', 'deleteBtnText', 'deleteSpinner', false);
    });
  });
}

function openDeleteModal(id, name) {
  deleteTargetId = id;
  document.getElementById('deleteProductName').textContent = name;
  document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.add('hidden');
  deleteTargetId = null;
}

// ══════════════════════════════════════════════════════════
// IMAGE UPLOAD (Supabase Storage)
// ══════════════════════════════════════════════════════════
function uploadImage(file) {
  var ext      = file.name.split('.').pop();
  var filename = 'product-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;

  return supabase.storage.from(STORAGE_BUCKET).upload(filename, file, { upsert: false }).then(function(res) {
    if (res.error) throw res.error;
    return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename).data.publicUrl;
  });
}

// ══════════════════════════════════════════════════════════
// IMAGE DROP ZONE
// ══════════════════════════════════════════════════════════
function setupDropZone(zoneId, inputId, innerId, previewId, onFilePicked) {
  var zone    = document.getElementById(zoneId);
  var input   = document.getElementById(inputId);
  var inner   = document.getElementById(innerId);
  var preview = document.getElementById(previewId);
  if (!zone || !input) return;

  zone.addEventListener('click',    function() { input.click(); });
  input.addEventListener('change',  function() { if (input.files[0]) handleFile(input.files[0]); });
  zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave',function() { zone.classList.remove('drag-over'); });
  zone.addEventListener('drop',     function(e) {
    e.preventDefault(); zone.classList.remove('drag-over');
    var f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  });

  function handleFile(file) {
    if (file.size > 5 * 1024 * 1024) { alert('Image too large. Max 5 MB.'); return; }
    onFilePicked(file);
    var reader = new FileReader();
    reader.onload = function(e) {
      preview.src = e.target.result;
      preview.style.display = 'block';
      inner.style.display   = 'none';
    };
    reader.readAsDataURL(file);
  }
}

function resetDropZone(zoneId, innerId, previewId) {
  var inner   = document.getElementById(innerId);
  var preview = document.getElementById(previewId);
  if (inner)   inner.style.display = 'flex';
  if (preview) { preview.style.display = 'none'; preview.src = ''; }
}

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════
function showAlert(containerId, type, message) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.className     = 'alert alert-' + type;
  el.textContent   = message;
  el.style.display = 'block';
  if (type === 'success') setTimeout(function() { el.style.display = 'none'; }, 4000);
}

function setLoading(btnId, textId, spinnerId, loading) {
  var btn     = document.getElementById(btnId);
  var text    = document.getElementById(textId);
  var spinner = document.getElementById(spinnerId);
  if (!btn) return;
  btn.disabled          = loading;
  text.style.display    = loading ? 'none'         : 'inline';
  spinner.style.display = loading ? 'inline-block' : 'none';
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function emptyState(title, subtitle, icon) {
  return '<div class="empty-state"><div class="empty-icon">' + (icon||'📦') + '</div><h4>' + title + '</h4><p>' + subtitle + '</p></div>';
}

// ✅ Start the app
boot();
