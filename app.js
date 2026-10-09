// Estado Inicial da Aplicação
const DEFAULT_STATE = {
  theme: 'light',
  activeTabIndex: 0,
  tabs: [
    { name: 'Quadro 1', content: '' },
    { name: 'Quadro 2', content: '' },
    { name: 'Quadro 3', content: '' },
    { name: 'Quadro 4', content: '' },
    { name: 'Quadro 5', content: '' }
  ]
};

let appState = JSON.parse(localStorage.getItem('scriba_state')) || DEFAULT_STATE;
let historyStack = []; // Para a funcionalidade de Desfazer
let toastTimeout = null;

// Elementos do DOM
const tabsBar = document.getElementById('tabsBar');
const editor = document.getElementById('editor');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const copyCleanBtn = document.getElementById('copyCleanBtn');
const cleanFormattingBtn = document.getElementById('cleanFormattingBtn');
const highlightPhonesBtn = document.getElementById('highlightPhonesBtn');
const clearBoardBtn = document.getElementById('clearBoardBtn');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const undoBtn = document.getElementById('undoBtn');

// Salva o estado no LocalStorage
function saveState() {
  localStorage.setItem('scriba_state', JSON.stringify(appState));
}

// Renderiza o tema
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeIcon = themeToggleBtn.querySelector('.theme-icon');
  const themeText = themeToggleBtn.querySelector('.theme-text');
  
  if (theme === 'dark') {
    themeIcon.textContent = '☀️';
    themeText.textContent = 'Modo Claro';
  } else {
    themeIcon.textContent = '🌙';
    themeText.textContent = 'Modo Escuro';
  }
}

// Renderiza as Abas
function renderTabs() {
  tabsBar.innerHTML = '';
  appState.tabs.forEach((tab, index) => {
    const tabEl = document.createElement('div');
    tabEl.className = `tab-item ${index === appState.activeTabIndex ? 'active' : ''}`;
    tabEl.textContent = tab.name;

    // Troca de Aba
    tabEl.addEventListener('click', () => switchTab(index));

    // Duplo clique para renomear
    tabEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      renameTab(index);
    });

    tabsBar.appendChild(tabEl);
  });
}

// Alternar Aba
function switchTab(index) {
  appState.activeTabIndex = index;
  editor.value = appState.tabs[index].content;
  renderTabs();
  saveState();
  editor.focus();
}

// Renomear Aba
function renameTab(index) {
  const currentName = appState.tabs[index].name;
  const newName = prompt('Digite o novo nome para a aba:', currentName);
  if (newName && newName.trim() !== '') {
    appState.tabs[index].name = newName.trim();
    renderTabs();
    saveState();
  }
}

// Exibir Notificação Toast
function showToast(msg, canUndo = false) {
  clearTimeout(toastTimeout);
  toastMessage.textContent = msg;

  if (canUndo) {
    undoBtn.classList.remove('hidden');
  } else {
    undoBtn.classList.add('hidden');
  }

  toast.classList.remove('hidden');
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// Guardar Histórico para Desfazer
function pushHistory() {
  historyStack.push(JSON.stringify(appState.tabs[appState.activeTabIndex].content));
}

// Limpar Formatação do Texto
function cleanFormatting(text) {
  return text
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''))
    .join('\n')
    .trim();
}

// Ações dos Botões
copyCleanBtn.addEventListener('click', () => {
  const cleanText = cleanFormatting(editor.value);
  navigator.clipboard.writeText(cleanText).then(() => {
    showToast('Texto limpo copiado para a área de transferência!');
  });
});

cleanFormattingBtn.addEventListener('click', () => {
  pushHistory();
  editor.value = cleanFormatting(editor.value);
  appState.tabs[appState.activeTabIndex].content = editor.value;
  saveState();
  showToast('Formatação limpa!', true);
});

highlightPhonesBtn.addEventListener('click', () => {
  const text = editor.value;
  // Regex para detectar telefones no formato brasileiro/internacional
  const phoneRegex = /(?:(?:\+|00)?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4}[-\s]?\d{4})/g;
  const matches = text.match(phoneRegex);

  if (matches && matches.length > 0) {
    pushHistory();
    const uniquePhones = [...new Set(matches.map(p => p.trim()))];
    const phoneList = `\n\n--- 📞 LISTA DE TELEFONES DESTA CADA ---\n` + uniquePhones.join('\n');
    
    editor.value = text + phoneList;
    appState.tabs[appState.activeTabIndex].content = editor.value;
    saveState();
    showToast('Telefones destacados ao final do texto!', true);
  } else {
    showToast('Nenhum número de telefone encontrado.');
  }
});

clearBoardBtn.addEventListener('click', () => {
  if (!editor.value) return;
  pushHistory();
  editor.value = '';
  appState.tabs[appState.activeTabIndex].content = '';
  saveState();
  showToast('Quadro limpo!', true);
});

// Desfazer última ação
undoBtn.addEventListener('click', () => {
  if (historyStack.length > 0) {
    const previousContent = JSON.parse(historyStack.pop());
    editor.value = previousContent;
    appState.tabs[appState.activeTabIndex].content = previousContent;
    saveState();
    toast.classList.add('hidden');
  }
});

// Atualização de conteúdo em tempo real
editor.addEventListener('input', () => {
  appState.tabs[appState.activeTabIndex].content = editor.value;
  saveState();
});

// Alternar Tema
themeToggleBtn.addEventListener('click', () => {
  appState.theme = appState.theme === 'light' ? 'dark' : 'light';
  applyTheme(appState.theme);
  saveState();
});

// Atalhos de Teclado
document.addEventListener('keydown', (e) => {
  // Ctrl + Shift + C (ou Cmd + Shift + C)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyC') {
    e.preventDefault();
    copyCleanBtn.click();
  }

  // Tecla Esc limpa o quadro (quando no editor)
  if (e.key === 'Escape' && document.activeElement === editor) {
    e.preventDefault();
    clearBoardBtn.click();
  }
});

// Registrar Service Worker para Funcionalidade PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.log('Falha ao registrar ServiceWorker:', err);
    });
  });
}

// Inicialização
applyTheme(appState.theme);
renderTabs();
editor.value = appState.tabs[appState.activeTabIndex].content;
