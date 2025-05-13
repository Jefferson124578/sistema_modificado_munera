(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const mockUsers = [
    { username: 'admin', password: 'admin123', role: 'admin', name: 'Administrador' },
    { username: 'user', password: 'user123', role: 'user', name: 'Usuário Comum' },
  ];

  class SistemaEstoque {
    constructor() {
      this.users = JSON.parse(localStorage.getItem('users')) || [...mockUsers];
      this.currentUser = null;

      this.stock = JSON.parse(localStorage.getItem('stock')) || [];
      this.history = JSON.parse(localStorage.getItem('history')) || [];
      this.categories = JSON.parse(localStorage.getItem('categories')) || ['Eletrônicos', 'Vestuário', 'Alimentos', 'Outros'];

      this.editingProductId = null;
      this.modalProductId = null;
      this.modalMovementType = null;
      this.confirmCallback = null;

      this.historyPage = 1;
      this.historyPerPage = 10;

      this.elements = {
        loginPage: $('#loginPage'),
        loginForm: $('#loginForm'),
        loginError: $('#loginError'),
        usernameInput: $('#username'),
        passwordInput: $('#password'),

        system: $('#system'),
        tabs: $$('.tab'),
        tabDashboardBtn: $('#tab-dashboard-btn'),
        tabStockBtn: $('#tab-stock-btn'),
        tabHistoryBtn: $('#tab-history-btn'),
        tabReportBtn: $('#tab-report-btn'),
        tabCategoriesBtn: $('#tab-categories-btn'),
        tabUsersBtn: $('#tab-users-btn'),
        btnLogout: $('#btnLogout'),

        dashboardSection: $('#tab-dashboard'),
        stockSection: $('#tab-stock'),
        historySection: $('#tab-history'),
        reportSection: $('#tab-report'),
        categoriesSection: $('#tab-categories'),
        usersSection: $('#tab-users'),

        darkModeToggle: $('#darkModeToggle'),

        chartStockLevels: $('#chartStockLevels'),
        chartMovements: $('#chartMovements'),

        productForm: $('#productForm'),
        productName: $('#productName'),
        productQuantity: $('#productQuantity'),
        productCategory: $('#productCategory'),
        btnAddUpdate: $('#btnAddUpdate'),
        stockBody: $('#stockBody'),
        searchInput: $('#searchInput'),
        totalProducts: $('#totalProducts'),
        totalQuantity: $('#totalQuantity'),
        categoriesCount: $('#categoriesCount'),

        historyBody: $('#historyBody'),
        filterType: $('#filterType'),
        filterCategory: $('#filterCategory'),
        filterSearch: $('#filterSearch'),
        historyPagination: $('#historyPagination'),

        btnExportCSV: $('#btnExportCSV'),
        btnExportPDF: $('#btnExportPDF'),

        categoryForm: $('#categoryForm'),
        categoryName: $('#categoryName'),
        categoryBody: $('#categoryBody'),
        btnAddCategory: $('#btnAddCategory'),

        userForm: $('#userForm'),
        userName: $('#userName'),
        userRole: $('#userRole'),
        userPassword: $('#userPassword'),
        userBody: $('#userBody'),
        btnAddUser: $('#btnAddUser'),

        modalOverlay: $('#modalOverlay'),
        modalTitle: $('#modalTitle'),
        modalDesc: $('#modalDesc'),
        movementQuantity: $('#movementQuantity'),
        confirmEntryBtn: $('#confirmEntryBtn'),
        confirmExitBtn: $('#confirmExitBtn'),
        cancelMovementBtn: $('#cancelMovementBtn'),
        closeModalBtn: $('#closeModalBtn'),

        confirmModalOverlay: $('#confirmModalOverlay'),
        confirmModalTitle: $('#confirmModalTitle'),
        confirmModalDesc: $('#confirmModalDesc'),
        confirmYesBtn: $('#confirmYesBtn'),
        confirmNoBtn: $('#confirmNoBtn'),

        alertMessage: $('#alertMessage'),
      };

      this.chartStock = null;
      this.chartMovements = null;

      this.init();
    }

    init() {
      this.checkDarkMode();
      this.bindEvents();
      this.loadCategories();
      this.loadFilters();
      this.renderUsersTable();
      this.showLogin();
    }

    showLogin() {
      this.elements.loginPage.hidden = false;
      this.elements.system.hidden = true;
      this.elements.loginError.textContent = '';
      this.elements.loginForm.reset();
      this.elements.usernameInput.focus();
    }

    login(username, password) {
      const user = this.users.find(u => u.username === username && u.password === password);
      if (!user) {
        this.elements.loginError.textContent = 'Usuário ou senha inválidos.';
        return false;
      }
      this.currentUser = user;
      this.elements.loginPage.hidden = true;
      this.elements.system.hidden = false;
      this.postLoginSetup();
      return true;
    }

    logout() {
      if (confirm('Deseja realmente sair do sistema?')) {
        this.currentUser = null;
        this.showLogin();
      }
    }

    postLoginSetup() {
      if(this.currentUser.role === 'admin') {
        this.elements.tabUsersBtn.hidden = false;
      } else {
        this.elements.tabUsersBtn.hidden = true;
      }
      this.switchTab('dashboard');
      this.renderDashboard();
      this.renderStock();
      this.updateSummary();
      this.renderHistory();
      this.loadCategoryOptions();
      this.loadFilterCategoryOptions();
      this.renderCategoriesTable();
      this.renderUsersTable();
    }

    checkDarkMode() {
      const dark = localStorage.getItem('darkMode') === 'true';
      if(dark) document.body.classList.add('dark');
      else document.body.classList.remove('dark');
    }
    toggleDarkMode() {
      document.body.classList.toggle('dark');
      localStorage.setItem('darkMode', document.body.classList.contains('dark'));
    }

    bindEvents() {
      this.elements.loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const username = this.elements.usernameInput.value.trim();
        const password = this.elements.passwordInput.value.trim();
        if(!this.login(username, password)) {
          this.elements.loginError.textContent = 'Usuário ou senha inválidos.';
        }
      });
      this.elements.btnLogout.addEventListener('click', () => this.logout());
      this.elements.darkModeToggle.addEventListener('click', () => this.toggleDarkMode());
      this.elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          if(tab.id === 'btnLogout') return;
          const tabName = tab.id.replace('tab-', '').replace('-btn','');
          this.switchTab(tabName);
        });
      });
      this.elements.productForm.addEventListener('submit', e => {
        e.preventDefault();
        this.handleAddOrUpdateProduct();
      });
      this.elements.searchInput.addEventListener('input', () => this.handleSearchStock());
      this.elements.filterType.addEventListener('change', () => this.renderHistory());
      this.elements.filterCategory.addEventListener('change', () => this.renderHistory());
      this.elements.filterSearch.addEventListener('input', () => this.renderHistory());
      this.elements.btnExportCSV.addEventListener('click', () => this.exportCSV());
      this.elements.btnExportPDF.addEventListener('click', () => this.exportPDF());
      this.elements.categoryForm.addEventListener('submit', e => {
        e.preventDefault();
        this.handleAddOrUpdateCategory();
      });
      this.elements.userForm.addEventListener('submit', e => {
        e.preventDefault();
        this.handleAddUser();
      });
      this.elements.confirmEntryBtn.addEventListener('click', () => this.handleConfirmMovement('entrada'));
      this.elements.confirmExitBtn.addEventListener('click', () => this.handleConfirmMovement('saida'));
      this.elements.cancelMovementBtn.addEventListener('click', () => this.closeModal());
      this.elements.closeModalBtn.addEventListener('click', () => this.closeModal());
      this.elements.movementQuantity.addEventListener('keydown', e => {
        if(e.key === 'Enter') {
          if(this.modalMovementType === 'entrada') this.handleConfirmMovement('entrada');
          else if(this.modalMovementType === 'saida') this.handleConfirmMovement('saida');
        }
        if(e.key === 'Escape') this.closeModal();
      });
      this.elements.confirmYesBtn.addEventListener('click', () => {
        if(this.confirmCallback) this.confirmCallback();
        this.closeConfirmModal();
      });
      this.elements.confirmNoBtn.addEventListener('click', () => this.closeConfirmModal());
    }

    switchTab(tab) {
      const tabs = ['dashboard','stock','history','report','categories','users'];
      tabs.forEach(t => {
        const section = this.elements[`${t}Section`];
        const btn = this.elements[`tab${t.charAt(0).toUpperCase() + t.slice(1)}Btn`];
        if(t === tab){
          section.hidden = false;
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
        } else {
          section.hidden = true;
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        }
      });
      if(tab === 'dashboard') this.renderDashboard();
    }

    showAlert(message, type='success') {
      const alert = this.elements.alertMessage;
      alert.textContent = message;
      alert.className = `alert alert-${type} alert-show`;
      clearTimeout(this.alertTimeout);
      this.alertTimeout = setTimeout(() => {
        alert.classList.remove('alert-show');
      }, 4000);
    }

    validateProduct(name, quantity, category) {
      if(!name) {
        this.showAlert('Informe o nome do produto.', 'error');
        return false;
      }
      if(isNaN(quantity) || quantity < 0) {
        this.showAlert('Quantidade inválida.', 'error');
        return false;
      }
      if(!category) {
        this.showAlert('Selecione uma categoria.', 'error');
        return false;
      }
      return true;
    }

    handleAddOrUpdateProduct() {
      const name = this.elements.productName.value.trim();
      const quantity = parseInt(this.elements.productQuantity.value);
      const category = this.elements.productCategory.value;

      if(!this.validateProduct(name, quantity, category)) return;

      if(this.editingProductId){
        const index = this.stock.findIndex(p => p.id === this.editingProductId);
        if(index !== -1){
          this.stock[index].name = name;
          this.stock[index].quantity = quantity;
          this.stock[index].category = category;
          this.showAlert('Produto atualizado com sucesso!');
        }
      } else {
        const existsIndex = this.stock.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
        if(existsIndex !== -1){
          this.stock[existsIndex].quantity += quantity;
          this.addHistoryEntry(this.stock[existsIndex].id, 'entrada', quantity);
          this.showAlert('Quantidade adicionada ao produto existente!');
        } else {
          const newProduct = {
            id: this.generateId(),
            name,
            quantity,
            category,
          };
          this.stock.push(newProduct);
          this.addHistoryEntry(newProduct.id, 'entrada', quantity);
          this.showAlert('Produto adicionado com sucesso!');
        }
      }
      this.saveStock();
      this.renderStock();
      this.updateSummary();
      this.clearProductForm();
      this.renderHistory();
    }

    renderStock(filtered=null){
      const data = filtered || this.stock;
      const tbody = this.elements.stockBody;
      if(data.length === 0){
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">Nenhum produto no estoque</td></tr>';
        return;
      }
      tbody.innerHTML = data
        .map(product => {
          const percent = Math.min((product.quantity / 100) * 100, 100);
          let color = 'var(--success)';
          if(product.quantity <= 10) color = 'var(--danger)';
          else if(product.quantity <= 30) color = 'var(--warning)';
          return `
            <tr data-id="${product.id}">
              <td>${product.name}</td>
              <td>${product.category || 'N/A'}</td>
              <td>
                <div class="stock-progress" aria-label="Nível de estoque">
                  <div class="progress-bar" style="width:${percent}%; background:${color};"></div>
                </div>
                <span aria-live="polite">${product.quantity} unidade${product.quantity !== 1 ? 's' : ''}</span>
              </td>
              <td>
                ${product.quantity > 0 ? `<span style="color: var(--success); font-weight: 600;">Disponível</span>` : `<span style="color: var(--danger); font-weight: 600;">Esgotado</span>`}
              </td>
              <td>
                <div class="actions" role="group" aria-label="Ações do produto ${product.name}">
                  <button class="btn-action btn-entry" title="Registrar entrada" aria-label="Registrar entrada do produto ${product.name}" data-action="entrada"></button>
                  <button class="btn-action btn-exit" title="Registrar saída" aria-label="Registrar saída do produto ${product.name}" data-action="saida"></button>
                  <button class="btn-action btn-edit" title="Editar produto" aria-label="Editar produto ${product.name}" data-action="editar"></button>
                  <button class="btn-action btn-delete" title="Excluir produto" aria-label="Excluir produto ${product.name}" data-action="excluir"></button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');

      // Adiciona listeners para as ações
      tbody.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', e => {
          const action = btn.getAttribute('data-action');
          const tr = btn.closest('tr');
          const id = tr.getAttribute('data-id');
          switch(action){
            case 'entrada':
              this.openMovementModal(id, 'entrada');
              break;
            case 'saida':
              this.openMovementModal(id, 'saida');
              break;
            case 'editar':
              this.editProduct(id);
              break;
            case 'excluir':
              this.confirmDeleteProduct(id);
              break;
          }
        });
      });
    }

    editProduct(id){
      const product = this.stock.find(p => p.id === id);
      if(!product) return;
      this.elements.productName.value = product.name;
      this.elements.productQuantity.value = product.quantity;
      this.elements.productCategory.value = product.category;
      this.editingProductId = id;
      this.elements.btnAddUpdate.innerHTML = '<i class="fas fa-pen"></i> Atualizar Produto';
      this.elements.btnAddUpdate.setAttribute('aria-label', 'Atualizar produto');
      this.elements.productName.focus();
      window.scrollTo({top:0, behavior:'smooth'});
    }

    confirmDeleteProduct(id){
      const product = this.stock.find(p => p.id === id);
      if(!product) return;
      this.showConfirmModal(`Tem certeza que deseja excluir o produto "${product.name}"? Esta ação não pode ser desfeita.`, () => this.deleteProduct(id));
    }

    deleteProduct(id){
      this.stock = this.stock.filter(p => p.id !== id);
      this.saveStock();
      this.renderStock();
      this.updateSummary();
      this.showAlert('Produto removido com sucesso!', 'success');
      if(this.editingProductId === id) this.clearProductForm();
    }

    clearProductForm(){
      this.elements.productForm.reset();
      this.editingProductId = null;
      this.elements.btnAddUpdate.innerHTML = '<i class="fas fa-plus"></i> Adicionar Produto';
      this.elements.btnAddUpdate.setAttribute('aria-label', 'Adicionar produto');
    }

    handleSearchStock(){
      const term = this.elements.searchInput.value.trim().toLowerCase();
      if(!term){
        this.renderStock();
        return;
      }
      const filtered = this.stock.filter(p => p.name.toLowerCase().includes(term));
      this.renderStock(filtered);
    }

    updateSummary(){
      const totalProducts = this.stock.length;
      const totalQuantity = this.stock.reduce((acc,p) => acc + p.quantity, 0);
      const categories = new Set(this.stock.map(p => p.category).filter(Boolean));
      this.elements.totalProducts.textContent = `Produtos cadastrados: ${totalProducts}`;
      this.elements.totalQuantity.textContent = `Quantidade total em estoque: ${totalQuantity}`;
      this.elements.categoriesCount.textContent = `Categorias: ${categories.size}`;

      const lowStock = this.stock.filter(p => p.quantity <= 5 && p.quantity > 0);
      if(lowStock.length > 0){
        this.showAlert(`Atenção: ${lowStock.length} produto(s) com estoque baixo!`, 'warning');
      }
    }

    openMovementModal(productId, type){
      this.modalProductId = productId;
      this.modalMovementType = type;
      this.elements.movementQuantity.value = '';
      this.elements.modalOverlay.classList.add('show');
      this.elements.confirmEntryBtn.style.display = type === 'entrada' ? 'inline-flex' : 'none';
      this.elements.confirmExitBtn.style.display = type === 'saida' ? 'inline-flex' : 'none';
      this.elements.modalTitle.textContent = type === 'entrada' ? 'Registrar entrada de produto' : 'Registrar saída de produto';
      this.elements.modalDesc.textContent = type === 'entrada' ? 'Informe a quantidade a adicionar ao estoque:' : 'Informe a quantidade a retirar do estoque:';
      this.elements.movementQuantity.focus();
    }

    closeModal(){
      this.modalProductId = null;
      this.modalMovementType = null;
      this.elements.modalOverlay.classList.remove('show');
    }

    handleConfirmMovement(type){
      const qty = parseInt(this.elements.movementQuantity.value);
      if(isNaN(qty) || qty <= 0){
        this.showAlert('Informe uma quantidade válida para movimentação.', 'error');
        this.elements.movementQuantity.focus();
        return;
      }
      const product = this.stock.find(p => p.id === this.modalProductId);
      if(!product){
        this.showAlert('Produto não encontrado.', 'error');
        this.closeModal();
        return;
      }
      if(type === 'saida' && qty > product.quantity){
        this.showAlert('Quantidade para saída maior que o estoque disponível.', 'error');
        this.elements.movementQuantity.focus();
        return;
      }
      if(type === 'entrada'){
        product.quantity += qty;
        this.addHistoryEntry(product.id, 'entrada', qty);
        this.showAlert(`Entrada de ${qty} unidade${qty !== 1 ? 's' : ''} registrada para "${product.name}".`);
      } else if(type === 'saida'){
        product.quantity -= qty;
        this.addHistoryEntry(product.id, 'saida', qty);
        this.showAlert(`Saída de ${qty} unidade${qty !== 1 ? 's' : ''} registrada para "${product.name}".`);
      }
      this.saveStock();
      this.renderStock();
      this.updateSummary();
      this.renderHistory();
      this.closeModal();
      if(this.editingProductId === product.id){
        this.elements.productQuantity.value = product.quantity;
      }
    }

    addHistoryEntry(productId, type, quantity){
      const product = this.stock.find(p => p.id === productId);
      if(!product) return;
      this.history.unshift({
        id: this.generateId(),
        productId,
        productName: product.name,
        category: product.category,
        type,
        quantity,
        date: new Date().toISOString(),
      });
      this.saveHistory();
    }

    renderHistory(){
      const tbody = this.elements.historyBody;
      const filterType = this.elements.filterType.value;
      const filterCategory = this.elements.filterCategory.value;
      const filterSearch = this.elements.filterSearch.value.trim().toLowerCase();

      let filtered = [...this.history];
      if(filterType !== 'all'){
        filtered = filtered.filter(h => h.type === filterType);
      }
      if(filterCategory !== 'all'){
        filtered = filtered.filter(h => h.category === filterCategory);
      }
      if(filterSearch){
        filtered = filtered.filter(h => h.productName.toLowerCase().includes(filterSearch));
      }

      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / this.historyPerPage);
      if(this.historyPage > totalPages) this.historyPage = totalPages || 1;
      const start = (this.historyPage - 1) * this.historyPerPage;
      const pagedData = filtered.slice(start, start + this.historyPerPage);

      if(pagedData.length === 0){
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">Nenhuma movimentação encontrada</td></tr>';
      } else {
        tbody.innerHTML = pagedData.map(entry => {
          const date = new Date(entry.date);
          const formattedDate = date.toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' });
          const typeLabel = entry.type === 'entrada' ? 'Entrada' : 'Saída';
          const typeColor = entry.type === 'entrada' ? 'var(--success)' : 'var(--danger)';
          return `
            <tr>
              <td>${formattedDate}</td>
              <td>${entry.productName}</td>
              <td>${entry.category || 'N/A'}</td>
              <td style="color:${typeColor}; font-weight:600;">${typeLabel}</td>
              <td>${entry.quantity}</td>
            </tr>
          `;
        }).join('');
      }
      this.renderPagination(totalPages);
    }

    renderPagination(totalPages){
      const container = this.elements.historyPagination;
      container.innerHTML = '';
      if(totalPages <= 1) return;

      const createBtn = (text, disabled, active, onClick) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.disabled = disabled;
        if(active) btn.classList.add('active');
        btn.addEventListener('click', onClick);
        return btn;
      };

      container.appendChild(createBtn('«', this.historyPage === 1, false, () => {
        if(this.historyPage > 1){
          this.historyPage--;
          this.renderHistory();
        }
      }));

      let startPage = Math.max(1, this.historyPage - 3);
      let endPage = Math.min(totalPages, startPage + 6);
      if(endPage - startPage < 6) startPage = Math.max(1, endPage - 6);

      for(let i = startPage; i <= endPage; i++){
        container.appendChild(createBtn(i, false, i === this.historyPage, () => {
          this.historyPage = i;
          this.renderHistory();
        }));
      }

      container.appendChild(createBtn('»', this.historyPage === totalPages, false, () => {
        if(this.historyPage < totalPages){
          this.historyPage++;
          this.renderHistory();
        }
      }));
    }

    loadCategories(){
      if(!this.categories.length){
        this.categories = ['Eletrônicos', 'Vestuário', 'Alimentos', 'Outros'];
        this.saveCategories();
      }
    }
    saveCategories(){
      localStorage.setItem('categories', JSON.stringify(this.categories));
    }
    loadCategoryOptions(){
      const select = this.elements.productCategory;
      select.innerHTML = '<option value="" disabled selected>Selecione a categoria</option>';
      this.categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
      });
    }
    loadFilterCategoryOptions(){
      const select = this.elements.filterCategory;
      select.innerHTML = '<option value="all" selected>Todos</option>';
      this.categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
      });
    }
    renderCategoriesTable(){
      const tbody = this.elements.categoryBody;
      if(this.categories.length === 0){
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#888;">Nenhuma categoria cadastrada</td></tr>';
        return;
      }
      tbody.innerHTML = this.categories.map(cat => `
        <tr data-cat="${cat}">
          <td>${cat}</td>
          <td>
            <button class="btn-action btn-delete" title="Excluir categoria ${cat}" aria-label="Excluir categoria ${cat}" data-action="excluir"></button>
          </td>
        </tr>
      `).join('');
      tbody.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const tr = btn.closest('tr');
          const cat = tr.getAttribute('data-cat');
          this.confirmDeleteCategory(cat);
        });
      });
    }
    handleAddOrUpdateCategory(){
      const name = this.elements.categoryName.value.trim();
      if(!name){
        this.showAlert('Informe o nome da categoria.', 'error');
        return;
      }
      if(this.categories.includes(name)){
        this.showAlert('Categoria já existe.', 'error');
        return;
      }
      this.categories.push(name);
      this.saveCategories();
      this.loadCategoryOptions();
      this.loadFilterCategoryOptions();
      this.renderCategoriesTable();
      this.elements.categoryForm.reset();
      this.showAlert('Categoria adicionada com sucesso!');
    }
    confirmDeleteCategory(cat){
      const used = this.stock.some(p => p.category === cat);
      if(used){
        this.showAlert('Não é possível excluir categoria em uso.', 'error');
        return;
      }
      this.showConfirmModal(`Tem certeza que deseja excluir a categoria "${cat}"?`, () => {
        this.categories = this.categories.filter(c => c !== cat);
        this.saveCategories();
        this.loadCategoryOptions();
        this.loadFilterCategoryOptions();
        this.renderCategoriesTable();
        this.showAlert('Categoria excluída com sucesso!');
      });
    }

    handleAddUser() {
      if(this.currentUser.role !== 'admin'){
        this.showAlert('Apenas administradores podem adicionar usuários.', 'error');
        return;
      }
      const name = this.elements.userName.value.trim();
      const role = this.elements.userRole.value;
      const password = this.elements.userPassword.value.trim();
      if(!name || !role || !password){
        this.showAlert('Preencha todos os campos do usuário.', 'error');
        return;
      }
      if(this.users.some(u => u.username === name)){
        this.showAlert('Usuário já existe.', 'error');
        return;
      }
      this.users.push({ username: name, password, role, name });
      this.saveUsers();
      this.renderUsersTable();
      this.elements.userForm.reset();
      this.showAlert('Usuário adicionado com sucesso!');
    }
    renderUsersTable() {
      if(this.currentUser.role !== 'admin'){
        this.elements.usersSection.hidden = true;
        return;
      }
      this.elements.usersSection.hidden = false;
      const tbody = this.elements.userBody;
      if(this.users.length === 0){
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#888;">Nenhum usuário cadastrado</td></tr>';
        return;
      }
      tbody.innerHTML = this.users.map((user, idx) => `
        <tr data-idx="${idx}">
          <td>${user.name || user.username}</td>
          <td>${user.role === 'admin' ? 'Administrador' : 'Usuário'}</td>
          <td>
            ${user.username === this.currentUser.username ? '<em>Você</em>' : `
            <button class="btn-action btn-delete" title="Excluir usuário ${user.username}" aria-label="Excluir usuário ${user.username}" data-action="excluir"></button>
            `}
          </td>
        </tr>
      `).join('');
      tbody.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const tr = btn.closest('tr');
          const idx = parseInt(tr.getAttribute('data-idx'));
          this.confirmDeleteUser(idx);
        });
      });
    }
    confirmDeleteUser(idx){
      const user = this.users[idx];
      if(!user) return;
      if(user.username === this.currentUser.username){
        this.showAlert('Você não pode excluir seu próprio usuário.', 'error');
        return;
      }
      this.showConfirmModal(`Tem certeza que deseja excluir o usuário "${user.username}"?`, () => {
        this.users.splice(idx,1);
        this.saveUsers();
        this.renderUsersTable();
        this.showAlert('Usuário excluído com sucesso!');
      });
    }

    showConfirmModal(message, callback){
      this.elements.confirmModalDesc.textContent = message;
      this.elements.confirmModalOverlay.classList.add('show');
      this.confirmCallback = callback;
    }
    closeConfirmModal(){
      this.elements.confirmModalOverlay.classList.remove('show');
      this.confirmCallback = null;
    }

    exportCSV(){
      if(this.stock.length === 0){
        this.showAlert('Não há produtos para exportar.', 'error');
        return;
      }
      const headers = ['Produto','Categoria','Quantidade'];
      const rows = this.stock.map(p => [p.name, p.category || 'N/A', p.quantity]);
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += headers.join(';') + '\r\n';
      rows.forEach(row => {
        csvContent += row.join(';') + '\r\n';
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      const dateStr = new Date().toISOString().slice(0,10);
      link.setAttribute('download', `relatorio_estoque_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showAlert('Relatório CSV exportado com sucesso!');
    }
    exportPDF(){
      if(this.stock.length === 0){
        this.showAlert('Não há produtos para exportar.', 'error');
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Relatório de Estoque', 14, 22);
      doc.setFontSize(12);
      const headers = [['Produto','Categoria','Quantidade']];
      const rows = this.stock.map(p => [p.name, p.category || 'N/A', p.quantity.toString()]);
      doc.autoTable({
        startY: 30,
        head: headers,
        body: rows,
        theme: 'striped',
        headStyles: {fillColor: [52, 152, 219]},
      });
      const dateStr = new Date().toISOString().slice(0,10);
      doc.save(`relatorio_estoque_${dateStr}.pdf`);
      this.showAlert('Relatório PDF exportado com sucesso!');
    }

    renderDashboard(){
      this.renderChartStockLevels();
      this.renderChartMovements();
    }
    renderChartStockLevels(){
      if(this.chartStock) this.chartStock.destroy();
      const ctx = this.elements.chartStockLevels.getContext('2d');
      const labels = this.categories;
      const data = labels.map(cat => {
        return this.stock.filter(p => p.category === cat).reduce((sum,p) => sum + p.quantity, 0);
      });
      this.chartStock = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Quantidade em Estoque',
            data,
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderRadius: 6,
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {display: false},
            tooltip: {mode: 'index', intersect: false}
          },
          scales: {
            y: {beginAtZero: true}
          }
        }
      });
    }
    renderChartMovements(){
      if(this.chartMovements) this.chartMovements.destroy();
      const ctx = this.elements.chartMovements.getContext('2d');
      const days = [];
      const entradaData = [];
      const saidaData = [];
      for(let i=6; i>=0; i--){
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toLocaleDateString('pt-BR', {weekday:'short', day:'numeric', month:'numeric'}));
        entradaData.push(0);
        saidaData.push(0);
      }
      this.history.forEach(h => {
        const d = new Date(h.date);
        const idx = days.findIndex(day => {
          const dayDate = new Date();
          dayDate.setDate(dayDate.getDate() - (6 - days.indexOf(day)));
          return d.toDateString() === dayDate.toDateString();
        });
        if(idx >= 0){
          if(h.type === 'entrada') entradaData[idx] += h.quantity;
          else if(h.type === 'saida') saidaData[idx] += h.quantity;
        }
      });
      this.chartMovements = new Chart(ctx, {
        type: 'line',
        data: {
          labels: days,
          datasets: [
            {
              label: 'Entradas',
              data: entradaData,
              borderColor: 'rgba(16, 185, 129, 0.9)',
              backgroundColor: 'rgba(16, 185, 129, 0.3)',
              fill: true,
              tension: 0.3,
              pointRadius: 5,
            },
            {
              label: 'Saídas',
              data: saidaData,
              borderColor: 'rgba(239, 68, 68, 0.9)',
              backgroundColor: 'rgba(239, 68, 68, 0.3)',
              fill: true,
              tension: 0.3,
              pointRadius: 5,
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {mode: 'index', intersect: false}
          },
          scales: {
            y: {beginAtZero: true}
          }
        }
      });
    }

    generateId(){
      return Date.now().toString(36) + Math.random().toString(36).substring(2,8);
    }

    saveStock(){
      localStorage.setItem('stock', JSON.stringify(this.stock));
    }
    saveHistory(){
      localStorage.setItem('history', JSON.stringify(this.history));
    }
    saveCategories(){
      localStorage.setItem('categories', JSON.stringify(this.categories));
    }
    saveUsers(){
      localStorage.setItem('users', JSON.stringify(this.users));
    }
  }

  window.stockManager = new SistemaEstoque();
})();