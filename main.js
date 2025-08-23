// Configuración de datos
const API_BASE_URL = 'http://localhost:5000/api';

const dataConfig = {
    movimientos: {
        file: 'fact_movimientos.csv',
        endpoint: '/movimientos',
        title: 'Movimientos',
        description: 'Tabla principal con todos los movimientos financieros'
    },
    cuentas: {
        file: 'dim_cuentas.csv',
        endpoint: '/cuentas',
        title: 'Cuentas',
        description: 'Dimensión de cuentas contables'
    },
    categorias: {
        file: 'dim_categorias.csv',
        endpoint: '/categorias',
        title: 'Categorías',
        description: 'Dimensión de categorías de movimientos'
    },
    contrapartes: {
        file: 'dim_contrapartes.csv',
        endpoint: '/contrapartes',
        title: 'Contrapartes',
        description: 'Dimensión de contrapartes involucradas'
    },
    instrumentos: {
        file: 'dim_instrumentos.csv',
        endpoint: '/instrumentos',
        title: 'Instrumentos',
        description: 'Dimensión de instrumentos financieros'
    }
};

// Variables globales
let currentData = [];
let filteredData = [];
let currentTable = 'dashboard';
let currentPage = 1;
let rowsPerPage = 10;
let editingIndex = -1;
let monthlyChart = null;
let dimensionCache = {};
let selectedYear = 2025;

// Variables para dashboard
let movimientosData = [];
let categoriasData = [];

// Variables para selector de dimensiones
let selectorData = [];
let filteredSelectorData = [];
let currentSelectorField = '';
let dimensionDataCache = {};

// Configuración de campos obligatorios por tabla
const requiredFields = {
    movimientos: ['fecha', 'descripcion', 'monto', 'moneda'],
    cuentas: ['cuenta_nombre', 'tipo_cuenta', 'banco', 'moneda_base', 'activa (si/no)'],
    categorias: ['tipo_flujo', 'categoria_nombre'],
    contrapartes: ['contraparte_nombre', 'tipo', 'subtipo', 'activa (si/no)'],
    instrumentos: ['instrumento_nombre', 'tipo', 'emisor', 'moneda']
};

// Campos que deben ser listas desplegables
const selectFields = {
    'activa (si/no)': ['SI', 'NO'],
    'tipo_flujo': ['Ingreso', 'Gasto', 'Ajuste']
};

// Configuración de prefijos de ID para cada dimensión
const idPrefixes = {
    cuentas: 'CTA_',
    categorias: 'CAT_',
    contrapartes: 'CTR_',
    instrumentos: 'INS_',
    movimientos: '' // Los movimientos usan formato YYYYMMDD-###
};

// Elementos del DOM
const elements = {
    loading: document.getElementById('loading'),
    errorMessage: document.getElementById('error-message'),
    tableContainer: document.getElementById('table-container'),
    tableHeader: document.getElementById('table-header'),
    tableBody: document.getElementById('table-body'),
    tableTitle: document.getElementById('table-title'),
    tableDescription: document.getElementById('table-description'),
    totalRows: document.getElementById('total-rows'),
    filteredRows: document.getElementById('filtered-rows'),
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    pagination: document.getElementById('pagination'),
    pageInfo: document.getElementById('page-info'),
    prevPage: document.getElementById('prev-page'),
    nextPage: document.getElementById('next-page'),
    addRecord: document.getElementById('add-record'),
    modalOverlay: document.getElementById('modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    recordForm: document.getElementById('record-form'),
    formFields: document.getElementById('form-fields'),
    closeModal: document.getElementById('close-modal'),
    cancelBtn: document.getElementById('cancel-btn'),
    saveBtn: document.getElementById('save-btn'),
    deleteModal: document.getElementById('delete-modal'),
    yearFilter: document.getElementById('year-filter'),
    nuevaTransaccionBtn: document.getElementById('nueva-transaccion-btn'),
    nuevaTransaccionModal: document.getElementById('nueva-transaccion-modal'),
    nuevaTransaccionForm: document.getElementById('nueva-transaccion-form'),
    nuevaTransaccionFields: document.getElementById('nueva-transaccion-fields'),
    closeNuevaTransaccion: document.getElementById('close-nueva-transaccion'),
    cancelarNuevaTransaccion: document.getElementById('cancelar-nueva-transaccion'),
    successModal: document.getElementById('success-modal'),
    closeSuccessModal: document.getElementById('close-success-modal'),
    totalIngresosDetail: document.getElementById('total-ingresos-detail'),
    totalGastosDetail: document.getElementById('total-gastos-detail'),
    totalPatrimonioDetail: document.getElementById('total-patrimonio-detail'),
    cancelDelete: document.getElementById('cancel-delete'),
    confirmDelete: document.getElementById('confirm-delete'),
    
    // Selector de dimensiones
    dimensionSelectorModal: document.getElementById('dimension-selector-modal'),
    selectorTitle: document.getElementById('selector-title'),
    selectorSearch: document.getElementById('selector-search'),
    selectorTable: document.getElementById('selector-table'),
    selectorHeader: document.getElementById('selector-header'),
    selectorBody: document.getElementById('selector-body'),
    closeSelector: document.getElementById('close-selector'),
    cancelSelector: document.getElementById('cancel-selector')
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadDashboard();
});

// Configurar event listeners
function setupEventListeners() {
    // Navegación entre tablas
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tableType = this.id.replace('btn-', '');
            switchTable(tableType);
        });
    });

    // Event listeners
    elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
    elements.clearSearch.addEventListener('click', clearSearch);
    elements.prevPage.addEventListener('click', () => changePage(-1));
    elements.nextPage.addEventListener('click', () => changePage(1));
    elements.addRecord.addEventListener('click', openModal);
    elements.closeModal.addEventListener('click', closeModal);
    elements.cancelBtn.addEventListener('click', closeModal);
    elements.recordForm.addEventListener('submit', handleSubmit);
    elements.cancelDelete.addEventListener('click', closeDeleteModal);
    elements.confirmDelete.addEventListener('click', confirmDelete);
    
    // Event listeners para nueva transacción
    if (elements.nuevaTransaccionBtn) {
        elements.nuevaTransaccionBtn.addEventListener('click', openNuevaTransaccionModal);
    }
    if (elements.closeNuevaTransaccion) {
        elements.closeNuevaTransaccion.addEventListener('click', closeNuevaTransaccionModal);
    }
    if (elements.cancelarNuevaTransaccion) {
        elements.cancelarNuevaTransaccion.addEventListener('click', closeNuevaTransaccionModal);
    }
    if (elements.nuevaTransaccionForm) {
        elements.nuevaTransaccionForm.addEventListener('submit', handleNuevaTransaccion);
    }
    if (elements.closeSuccessModal) {
        elements.closeSuccessModal.addEventListener('click', closeSuccessModal);
    }

    // Delete modal
    elements.cancelDelete.addEventListener('click', closeDeleteModal);
    elements.confirmDelete.addEventListener('click', confirmDelete);
    elements.deleteModal.addEventListener('click', (e) => {
        if (e.target === elements.deleteModal) closeDeleteModal();
    });
    
    // Selector de dimensiones
    elements.closeSelector.addEventListener('click', closeDimensionSelector);
    elements.cancelSelector.addEventListener('click', closeDimensionSelector);
    elements.selectorSearch.addEventListener('input', debounce(handleSelectorSearch, 300));
    elements.dimensionSelectorModal.addEventListener('click', (e) => {
        if (e.target === elements.dimensionSelectorModal) closeDimensionSelector();
    });
}

// Cambiar tabla activa
function switchTable(tableType) {
    if (tableType === currentTable) return;
    
    // Actualizar botones de navegación
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    
    document.getElementById(`btn-${tableType}`).classList.remove('bg-gray-200', 'text-gray-700');
    document.getElementById(`btn-${tableType}`).classList.add('bg-blue-500', 'text-white');
    
    currentTable = tableType;
    currentPage = 1;
    
    if (tableType === 'dashboard') {
        showDashboard();
    } else {
        showTable();
        elements.searchInput.value = '';
        // Mostrar botón de agregar para todas las tablas
        elements.addRecord.classList.remove('hidden');
        loadTable(tableType);
    }
}

// Cargar tabla
async function loadTable(tableType) {
    showLoading();
    
    try {
        const config = dataConfig[tableType];
        
        // Intentar cargar desde API primero, fallback a CSV
        let response;
        try {
            response = await fetch(`${API_BASE_URL}${config.endpoint}`);
            if (response.ok) {
                currentData = await response.json();
            } else {
                throw new Error('API no disponible');
            }
        } catch (apiError) {
            console.warn('API no disponible, cargando desde CSV:', apiError);
            response = await fetch(config.file);
            
            if (!response.ok) {
                throw new Error(`No se pudo cargar ${config.file}`);
            }
            
            const csvText = await response.text();
            const parsedData = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true
            });
            
            if (parsedData.errors.length > 0) {
                console.warn('Errores al parsear CSV:', parsedData.errors);
            }
            
            currentData = parsedData.data;
        }
        
        // Ordenar movimientos por MOV_ID descendente (más nuevos primero)
        if (tableType === 'movimientos') {
            currentData.sort((a, b) => {
                const idA = a.mov_id || '';
                const idB = b.mov_id || '';
                return idB.localeCompare(idA);
            });
        }
        
        filteredData = [...currentData];
        
        updateTableInfo(config);
        renderTable();
        hideLoading();
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showError();
    }
}

// Actualizar información de la tabla
function updateTableInfo(config) {
    elements.tableTitle.textContent = config.title;
    elements.tableDescription.textContent = config.description;
    elements.totalRows.textContent = `Total de registros: ${currentData.length}`;
    elements.filteredRows.textContent = `Mostrando: ${filteredData.length}`;
}

// Renderizar tabla
function renderTable() {
    if (filteredData.length === 0) {
        elements.tableContainer.classList.add('hidden');
        elements.pagination.classList.add('hidden');
        return;
    }
    
    const headers = Object.keys(filteredData[0]);
    renderHeaders(headers);
    renderRows();
    renderPagination();
    
    elements.tableContainer.classList.remove('hidden');
    elements.pagination.classList.remove('hidden');
}

// Renderizar headers
function renderHeaders(headers) {
    // Todas las tablas ahora tienen columna de acciones
    elements.tableHeader.innerHTML = `
        <tr>
            ${headers.map(header => `
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    ${header}
                </th>
            `).join('')}
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Acciones</th>
        </tr>
    `;
}

// Renderizar filas
function renderRows() {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        const headers = Object.keys(filteredData[0] || {});
        const colspan = headers.length + 1; // +1 para la columna de acciones
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="px-6 py-4 text-center text-gray-500">
                    No se encontraron datos
                </td>
            </tr>
        `;
        return;
    }
    
    const headers = Object.keys(pageData[0]);
    
    elements.tableBody.innerHTML = pageData.map((row, rowIndex) => {
        const actualIndex = startIndex + rowIndex;
        return `
        <tr class="${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors">
            ${headers.map(header => `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b">
                    ${formatCellValue(row[header])}
                </td>
            `).join('')}
            <td class="px-6 py-4 whitespace-nowrap text-sm border-b">
                <div class="flex gap-2">
                    <button onclick="editRecord(${actualIndex})" class="text-blue-600 hover:text-blue-800 font-medium">
                        Editar
                    </button>
                    <button onclick="deleteRecord(${actualIndex})" class="text-red-600 hover:text-red-800 font-medium">
                        Eliminar
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
}

// Formatear valor de celda
function formatCellValue(value) {
    if (value === null || value === undefined || value === '') {
        return '<span class="text-gray-400">-</span>';
    }
    
    // Si es un número, formatearlo
    if (!isNaN(value) && !isNaN(parseFloat(value))) {
        const num = parseFloat(value);
        if (num % 1 === 0) {
            return num.toLocaleString('es-ES');
        } else {
            return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    }
    
    return String(value);
}

// Renderizar paginación
function renderPagination() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    
    elements.pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    elements.prevPage.disabled = currentPage === 1;
    elements.nextPage.disabled = currentPage === totalPages;
    
    if (totalPages <= 1) {
        elements.pagination.classList.add('hidden');
    } else {
        elements.pagination.classList.remove('hidden');
    }
}

// Cambiar página
function changePage(direction) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderRows();
        renderPagination();
        
        // Scroll al top de la tabla
        elements.tableContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

// Manejar búsqueda
function handleSearch() {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredData = [...currentData];
    } else {
        filteredData = currentData.filter(row => {
            return Object.values(row).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            );
        });
    }
    
    currentPage = 1;
    elements.filteredRows.textContent = `Mostrando: ${filteredData.length}`;
    renderTable();
}

// Limpiar búsqueda
function clearSearch() {
    elements.searchInput.value = '';
    filteredData = [...currentData];
    currentPage = 1;
    elements.filteredRows.textContent = `Mostrando: ${filteredData.length}`;
    renderTable();
}

// Mostrar loading
function showLoading() {
    elements.loading.classList.remove('hidden');
    elements.tableContainer.classList.add('hidden');
    elements.pagination.classList.add('hidden');
    elements.errorMessage.classList.add('hidden');
}

// Ocultar loading
function hideLoading() {
    elements.loading.classList.add('hidden');
}

// Mostrar error
function showError() {
    elements.loading.classList.add('hidden');
    elements.tableContainer.classList.add('hidden');
    elements.pagination.classList.add('hidden');
    elements.errorMessage.classList.remove('hidden');
}

// CRUD Operations

// Abrir modal para agregar nuevo registro
function openAddModal() {
    editingIndex = -1;
    elements.modalTitle.textContent = `Agregar ${dataConfig[currentTable].title}`;
    generateForm();
    elements.modalOverlay.classList.remove('hidden');
}

// Editar registro existente
function editRecord(index) {
    editingIndex = index;
    elements.modalTitle.textContent = `Editar ${dataConfig[currentTable].title}`;
    generateForm(filteredData[index]);
    elements.modalOverlay.classList.remove('hidden');
}

// Eliminar registro
function deleteRecord(index) {
    deleteIndex = index;
    elements.deleteModal.classList.remove('hidden');
}

// Generar próximo ID correlativo
function generateNextId() {
    const idField = Object.keys(currentData[0] || {})[0]; // Primer campo es el ID
    
    if (currentTable === 'movimientos') {
        // Para movimientos, generar ID con formato YYYYMMDD-###
        const today = new Date();
        const dateStr = today.getFullYear() + 
                       String(today.getMonth() + 1).padStart(2, '0') + 
                       String(today.getDate()).padStart(2, '0');
        
        // Encontrar el último número del día actual
        const todayIds = currentData
            .map(row => row[idField])
            .filter(id => id && id.startsWith(dateStr))
            .map(id => {
                const parts = id.split('-');
                return parts.length > 1 ? parseInt(parts[1], 10) : 0;
            })
            .filter(num => !isNaN(num));
        
        const maxNum = todayIds.length > 0 ? Math.max(...todayIds) : 0;
        const nextNumber = maxNum + 1;
        
        return dateStr + '-' + String(nextNumber).padStart(3, '0');
    } else {
        // Para dimensiones, usar el prefijo correspondiente
        const prefix = idPrefixes[currentTable];
        if (!prefix) return null;
        
        const existingIds = currentData
            .map(row => row[idField])
            .filter(id => id && id.startsWith(prefix))
            .map(id => {
                const numPart = id.replace(prefix, '');
                return parseInt(numPart, 10);
            })
            .filter(num => !isNaN(num));
        
        const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
        const nextNumber = maxId + 1;
        
        return prefix + String(nextNumber).padStart(3, '0');
    }
}

// Generar formulario dinámico
function generateForm(data = null) {
    if (filteredData.length === 0) return;
    
    const headers = Object.keys(filteredData[0]);
    const isEditing = data !== null;
    
    elements.formFields.innerHTML = headers.map((header, index) => {
        const isIdField = index === 0; // Primer campo es siempre el ID
        let value = '';
        
        if (isEditing) {
            value = data[header] || '';
        } else if (isIdField) {
            value = generateNextId() || '';
        }
        
        const fieldId = `field-${header}`;
        const isReadonly = isIdField && !isEditing;
        
        // Determinar el tipo de input según el campo
        let inputType = 'text';
        let inputAttributes = '';
        const isDimensionField = header.includes('_id') && !isIdField;
        const isRequired = requiredFields[currentTable]?.includes(header);
        const isSelectField = selectFields[header];
        
        if (header.toLowerCase().includes('fecha')) {
            inputType = 'date';
        } else if (header.toLowerCase().includes('monto') || header.toLowerCase().includes('tasa')) {
            inputType = 'number';
            inputAttributes = 'step="0.01"';
        }
        
        if (isDimensionField) {
            // Campo con selector de dimensión
            return `
                <div>
                    <label for="${fieldId}" class="block text-sm font-medium text-gray-700 mb-1">
                        ${header}${isRequired ? ' *' : ''}
                    </label>
                    <div class="flex gap-2">
                        <input
                            type="text"
                            id="${fieldId}"
                            name="${header}"
                            value="${value}"
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ingresa ${header.toLowerCase()} o selecciona"
                        >
                        <button
                            type="button"
                            onclick="openDimensionSelector('${header}')"
                            class="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center"
                            title="Seleccionar ${header}"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        } else if (isSelectField) {
            // Campo con lista desplegable
            return `
                <div>
                    <label for="${fieldId}" class="block text-sm font-medium text-gray-700 mb-1">
                        ${header}${isRequired ? ' *' : ''}
                    </label>
                    <select
                        id="${fieldId}"
                        name="${header}"
                        ${isReadonly ? 'disabled' : ''}
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''}"
                    >
                        <option value="">Selecciona una opción</option>
                        ${isSelectField.map(option => `
                            <option value="${option}" ${value === option ? 'selected' : ''}>${option}</option>
                        `).join('')}
                    </select>
                </div>
            `;
        } else {
            // Campo normal
            return `
                <div>
                    <label for="${fieldId}" class="block text-sm font-medium text-gray-700 mb-1">
                        ${header}${isRequired ? ' *' : ''} ${isIdField ? '(generado automáticamente)' : ''}
                    </label>
                    <input
                        type="${inputType}"
                        id="${fieldId}"
                        name="${header}"
                        value="${value}"
                        ${inputAttributes}
                        ${isReadonly ? 'readonly' : ''}
                        ${header === 'fecha' ? 'onchange="updateMonthYear()"' : ''}
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''}"
                        placeholder="${isReadonly ? 'ID generado automáticamente' : `Ingresa ${header.toLowerCase()}`}"
                    >
                </div>
            `;
        }
    }).join('');
}

// Guardar registro
async function saveRecord(e) {
    e.preventDefault();
    
    const formData = new FormData(elements.recordForm);
    const newRecord = {};
    
    // Construir objeto con datos del formulario
    for (let [key, value] of formData.entries()) {
        newRecord[key] = value.trim();
    }
    
    // Validación personalizada según el tipo de tabla
    const validationResult = validateRecord(newRecord);
    if (!validationResult.isValid) {
        showNotification(validationResult.message, 'error');
        return;
    }
    
    try {
        const config = dataConfig[currentTable];
        let response;
        
        if (editingIndex === -1) {
            // Crear nuevo registro
            response = await fetch(`${API_BASE_URL}${config.endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newRecord)
            });
            
            if (response.ok) {
                const result = await response.json();
                showNotification(result.message || 'Registro creado exitosamente', 'success');
                
                // Recargar datos desde el servidor
                await loadTable(currentTable);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error al crear el registro');
            }
        } else {
            // Actualizar registro existente
            const recordToUpdate = filteredData[editingIndex];
            const headers = Object.keys(recordToUpdate);
            const idField = headers[0]; // Primer campo es el ID
            const recordId = recordToUpdate[idField];
            
            response = await fetch(`${API_BASE_URL}${config.endpoint}/${recordId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newRecord)
            });
            
            if (response.ok) {
                const result = await response.json();
                showNotification(result.message || 'Registro actualizado exitosamente', 'success');
                
                // Recargar datos desde el servidor
                await loadTable(currentTable);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error al actualizar el registro');
            }
        }
        
        closeModal();
        
    } catch (error) {
        console.error('Error en saveRecord:', error);
        showNotification(`Error: ${error.message}`, 'error');
        
        // Fallback: actualizar localmente si la API falla
        if (editingIndex === -1) {
            // Para nuevos registros, generar ID automáticamente si está vacío
            const headers = Object.keys(filteredData[0] || {});
            const idField = headers[0];
            
            if (!newRecord[idField] || newRecord[idField] === '') {
                newRecord[idField] = generateNextId();
            }
            
            currentData.push(newRecord);
            showNotification('Registro agregado localmente (sin sincronizar)', 'success');
        } else {
            // Actualizar registro existente localmente
            const originalIndex = currentData.findIndex(item => 
                JSON.stringify(item) === JSON.stringify(filteredData[editingIndex])
            );
            if (originalIndex !== -1) {
                currentData[originalIndex] = newRecord;
                showNotification('Registro actualizado localmente (sin sincronizar)', 'success');
            }
        }
        
        // Re-ordenar movimientos si es necesario
        if (currentTable === 'movimientos') {
            currentData.sort((a, b) => {
                const idA = a.mov_id || '';
                const idB = b.mov_id || '';
                return idB.localeCompare(idA);
            });
        }
        
        // Actualizar datos filtrados y re-renderizar
        applyCurrentFilter();
        updateTableInfo(dataConfig[currentTable]);
        renderTable();
        closeModal();
    }
}

// Confirmar eliminación
async function confirmDelete() {
    if (deleteIndex === -1) return;
    
    const recordToDelete = filteredData[deleteIndex];
    const headers = Object.keys(recordToDelete);
    const idField = headers[0]; // Primer campo es el ID
    const recordId = recordToDelete[idField];
    
    try {
        const config = dataConfig[currentTable];
        const response = await fetch(`${API_BASE_URL}${config.endpoint}/${recordId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification(result.message || 'Registro eliminado exitosamente', 'success');
            
            // Recargar datos desde el servidor
            await loadTable(currentTable);
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar el registro');
        }
        
    } catch (error) {
        console.error('Error en confirmDelete:', error);
        showNotification(`Error: ${error.message}`, 'error');
        
        // Fallback: eliminar localmente si la API falla
        const originalIndex = currentData.findIndex(item => 
            JSON.stringify(item) === JSON.stringify(recordToDelete)
        );
        
        if (originalIndex !== -1) {
            currentData.splice(originalIndex, 1);
            
            // Re-ordenar movimientos si es necesario
            if (currentTable === 'movimientos') {
                currentData.sort((a, b) => {
                    const idA = a.mov_id || '';
                    const idB = b.mov_id || '';
                    return idB.localeCompare(idA);
                });
            }
            
            showNotification('Registro eliminado localmente (sin sincronizar)', 'success');
            
            // Actualizar datos filtrados y re-renderizar
            applyCurrentFilter();
            updateTableInfo(dataConfig[currentTable]);
            renderTable();
        }
    }
    
    closeDeleteModal();
}

// Aplicar filtro actual
function applyCurrentFilter() {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredData = [...currentData];
    } else {
        filteredData = currentData.filter(row => {
            return Object.values(row).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            );
        });
    }
    
    // Ajustar página actual si es necesario
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    } else if (currentPage < 1) {
        currentPage = 1;
    }
}

// Cerrar modal
function closeModal() {
    elements.modalOverlay.classList.add('hidden');
    elements.recordForm.reset();
    editingIndex = -1;
}

// Cerrar modal de eliminación
function closeDeleteModal() {
    elements.deleteModal.classList.add('hidden');
    deleteIndex = -1;
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white transition-all duration-300 transform translate-x-full`;
    
    // Aplicar color según tipo
    switch (type) {
        case 'success':
            notification.classList.add('bg-green-500');
            break;
        case 'error':
            notification.classList.add('bg-red-500');
            break;
        default:
            notification.classList.add('bg-blue-500');
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Selector de dimensiones

// Mapeo de campos a tipos de dimensión
const fieldToDimension = {
    'cuenta_id': 'cuentas',
    'contraparte_id': 'contrapartes', 
    'categoria_id': 'categorias',
    'instrumento_id': 'instrumentos'
};

// Abrir selector de dimensión
async function openDimensionSelector(fieldName) {
    currentSelectorField = fieldName;
    const dimensionType = fieldToDimension[fieldName];
    
    if (!dimensionType) {
        console.error('Tipo de dimensión no encontrado para:', fieldName);
        return;
    }
    
    // Actualizar título del modal
    const dimensionNames = {
        'cuentas': 'Cuenta',
        'contrapartes': 'Contraparte',
        'categorias': 'Categoría', 
        'instrumentos': 'Instrumento'
    };
    
    elements.selectorTitle.textContent = `Seleccionar ${dimensionNames[dimensionType]}`;
    
    // Cargar datos si no están en caché
    if (!dimensionDataCache[dimensionType]) {
        await loadDimensionData(dimensionType);
    }
    
    selectorData = dimensionDataCache[dimensionType] || [];
    filteredSelectorData = [...selectorData];
    
    renderSelectorTable();
    elements.dimensionSelectorModal.classList.remove('hidden');
    elements.selectorSearch.value = '';
    elements.selectorSearch.focus();
}

// Cargar datos de dimensión
async function loadDimensionData(dimensionType) {
    try {
        const config = dataConfig[dimensionType];
        
        // Intentar cargar desde API primero, fallback a CSV
        try {
            const response = await fetch(`${API_BASE_URL}${config.endpoint}`);
            if (response.ok) {
                dimensionDataCache[dimensionType] = await response.json();
                return;
            } else {
                throw new Error('API no disponible');
            }
        } catch (apiError) {
            console.warn('API no disponible para dimensión, cargando desde CSV:', apiError);
            
            const response = await fetch(config.file);
            
            if (!response.ok) {
                throw new Error(`No se pudo cargar ${config.file}`);
            }
            
            const csvText = await response.text();
            const parsedData = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true
            });
            
            dimensionDataCache[dimensionType] = parsedData.data;
        }
        
    } catch (error) {
        console.error('Error cargando datos de dimensión:', error);
        showNotification('Error al cargar datos de dimensión', 'error');
    }
}

// Renderizar tabla del selector
function renderSelectorTable() {
    if (filteredSelectorData.length === 0) {
        elements.selectorBody.innerHTML = `
            <tr>
                <td colspan="100%" class="px-6 py-4 text-center text-gray-500">
                    No se encontraron datos
                </td>
            </tr>
        `;
        return;
    }
    
    const headers = Object.keys(filteredSelectorData[0]);
    
    // Renderizar headers
    elements.selectorHeader.innerHTML = `
        <tr>
            ${headers.map(header => `
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ${header}
                </th>
            `).join('')}
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acción
            </th>
        </tr>
    `;
    
    // Renderizar filas
    elements.selectorBody.innerHTML = filteredSelectorData.map((row, index) => {
        const idValue = row[headers[0]] || ''; // Primer campo es el ID
        return `
            <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors cursor-pointer">
                ${headers.map(header => `
                    <td class="px-4 py-2 text-sm text-gray-900 border-b" onclick="selectDimensionItem('${idValue}')">
                        ${formatCellValue(row[header])}
                    </td>
                `).join('')}
                <td class="px-4 py-2 text-sm border-b">
                    <button 
                        onclick="selectDimensionItem('${idValue}')"
                        class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-xs"
                    >
                        Seleccionar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Seleccionar item de dimensión
function selectDimensionItem(idValue) {
    const fieldInput = document.getElementById(`field-${currentSelectorField}`);
    if (fieldInput) {
        fieldInput.value = idValue;
        closeDimensionSelector();
        showNotification(`${currentSelectorField} seleccionado: ${idValue}`, 'success');
    }
}

// Búsqueda en selector
function handleSelectorSearch() {
    const searchTerm = elements.selectorSearch.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredSelectorData = [...selectorData];
    } else {
        filteredSelectorData = selectorData.filter(row => {
            return Object.values(row).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            );
        });
    }
    
    renderSelectorTable();
}

// Cerrar selector de dimensión
function closeDimensionSelector() {
    elements.dimensionSelectorModal.classList.add('hidden');
    currentSelectorField = '';
    elements.selectorSearch.value = '';
}

// Actualizar mes y año automáticamente desde la fecha
function updateMonthYear() {
    const fechaInput = document.getElementById('field-fecha');
    const mesInput = document.getElementById('field-mes');
    const anioInput = document.getElementById('field-anio');
    
    if (fechaInput && fechaInput.value) {
        const fecha = new Date(fechaInput.value);
        if (mesInput) mesInput.value = fecha.getMonth() + 1;
        if (anioInput) anioInput.value = fecha.getFullYear();
    }
}

// Validación personalizada de registros
function validateRecord(record) {
    if (currentTable === 'movimientos') {
        // Validar campos obligatorios
        const required = ['fecha', 'descripcion', 'monto', 'moneda'];
        for (let field of required) {
            if (!record[field] || record[field].trim() === '') {
                return { isValid: false, message: `El campo ${field} es obligatorio` };
            }
        }
        
        // Validar que solo una entre cuenta, contraparte e instrumento esté llena
        const dimensionFields = ['cuenta_id', 'contraparte_id', 'instrumento_id'];
        const filledFields = dimensionFields.filter(field => record[field] && record[field].trim() !== '');
        
        if (filledFields.length !== 1) {
            return { isValid: false, message: 'Debe completar exactamente uno entre: cuenta_id, contraparte_id o instrumento_id' };
        }
    } else {
        // Validar campos obligatorios para dimensiones
        const required = requiredFields[currentTable] || [];
        for (let field of required) {
            if (!record[field] || record[field].trim() === '') {
                return { isValid: false, message: `El campo ${field} es obligatorio` };
            }
        }
    }
    
    return { isValid: true };
}

// Función auxiliar para cargar archivos CSV
async function loadCSV(filename) {
    const response = await fetch(filename);
    if (!response.ok) {
        throw new Error(`No se pudo cargar ${filename}`);
    }
    const csvText = await response.text();
    const parsedData = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true
    });
    
    if (parsedData.errors.length > 0) {
        console.warn('Errores al parsear CSV:', parsedData.errors);
    }
    
    return parsedData.data;
}

// Función para cargar datos del dashboard
async function loadDashboard() {
    try {
        // Intentar cargar desde API primero, fallback a CSV
        let movimientos, categorias;
        
        try {
            const [movimientosResponse, categoriasResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/movimientos`),
                fetch(`${API_BASE_URL}/categorias`)
            ]);
            
            if (movimientosResponse.ok && categoriasResponse.ok) {
                movimientos = await movimientosResponse.json();
                categorias = await categoriasResponse.json();
            } else {
                throw new Error('API no disponible');
            }
        } catch (apiError) {
            console.warn('API no disponible, cargando desde CSV:', apiError);
            [movimientos, categorias] = await Promise.all([
                loadCSV('fact_movimientos.csv'),
                loadCSV('dim_categorias.csv')
            ]);
        }
        
        movimientosData = movimientos;
        categoriasData = categorias;
        
        // Configurar filtro de año
        setupYearFilter();
        
        // Renderizar dashboard
        renderDashboard();
        
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
        showError('Error al cargar los datos del dashboard');
    }
}

// Configurar filtro de año
function setupYearFilter() {
    const years = [...new Set(movimientosData.map(mov => {
        const fecha = new Date(mov.fecha);
        return fecha.getFullYear();
    }))].sort((a, b) => b - a);
    
    const yearFilter = elements.yearFilter;
    yearFilter.innerHTML = '';
    
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        option.selected = year === selectedYear;
        yearFilter.appendChild(option);
    });
    
    yearFilter.addEventListener('change', (e) => {
        selectedYear = parseInt(e.target.value);
        renderDashboard();
    });
}

// Función para renderizar el dashboard
function renderDashboard() {
    // Filtrar movimientos por año seleccionado
    const movimientosFiltrados = movimientosData.filter(mov => {
        const fecha = new Date(mov.fecha);
        return fecha.getFullYear() === selectedYear;
    });
    
    // Calcular métricas basadas en tipo_flujo de las categorías
    const ingresos = movimientosFiltrados
        .filter(mov => {
            const categoria = categoriasData.find(cat => cat.categoria_id === mov.categoria_id);
            return categoria && categoria.tipo_flujo === 'Ingreso';
        })
        .reduce((sum, mov) => sum + Math.abs(parseFloat(mov.monto)), 0);
    
    const gastos = movimientosFiltrados
        .filter(mov => {
            const categoria = categoriasData.find(cat => cat.categoria_id === mov.categoria_id);
            return categoria && categoria.tipo_flujo === 'Gasto';
        })
        .reduce((sum, mov) => sum + Math.abs(parseFloat(mov.monto)), 0);
    
    const patrimonio = movimientosFiltrados
        .filter(mov => mov.categoria_id === 'CAT_003')
        .reduce((sum, mov) => sum + Math.abs(parseFloat(mov.monto)), 0);
    
    const saldo = ingresos - gastos;
    
    // Actualizar métricas en el DOM
    document.getElementById('saldo-total').textContent = formatCurrency(saldo);
    document.getElementById('total-ingresos').textContent = formatCurrency(ingresos);
    document.getElementById('total-gastos').textContent = formatCurrency(gastos);
    document.getElementById('resultado-final').textContent = formatCurrency(saldo);
    
    // Actualizar detalles en saldo total
    if (elements.totalIngresosDetail) elements.totalIngresosDetail.textContent = formatCurrency(ingresos);
    if (elements.totalGastosDetail) elements.totalGastosDetail.textContent = formatCurrency(gastos);
    if (elements.totalPatrimonioDetail) elements.totalPatrimonioDetail.textContent = formatCurrency(patrimonio);
    
    // Renderizar gráfico mensual
    renderMonthlyChart(movimientosFiltrados);
    
    // Renderizar top categorías
    renderTopCategorias(movimientosFiltrados);
    
    // Renderizar movimientos recientes
    renderRecentMovements();
}

// Función para renderizar top categorías
function renderTopCategorias(movimientosFiltrados) {
    const topCategoriasContainer = document.getElementById('top-categorias');
    if (!topCategoriasContainer) return;
    
    // Calcular totales por categoría
    const categoriasTotales = {};
    
    movimientosFiltrados.forEach(mov => {
        if (mov.categoria_id) {
            const categoria = categoriasData.find(cat => cat.categoria_id === mov.categoria_id);
            const categoriaNombre = categoria ? categoria.categoria_nombre : mov.categoria_id;
            
            if (!categoriasTotales[categoriaNombre]) {
                categoriasTotales[categoriaNombre] = 0;
            }
            categoriasTotales[categoriaNombre] += Math.abs(parseFloat(mov.monto));
        }
    });
    
    // Ordenar y tomar top 5
    const topCategorias = Object.entries(categoriasTotales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    // Renderizar
    topCategoriasContainer.innerHTML = topCategorias.map(([categoria, total]) => `
        <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm font-medium text-gray-700">${categoria}</span>
            <span class="text-sm font-bold text-gray-900">${formatCurrency(total)}</span>
        </div>
    `).join('');
}

// Función para renderizar el gráfico mensual
function renderMonthlyChart(movimientosFiltrados) {
    const ctx = document.getElementById('monthly-chart');
    if (!ctx) return;
    
    // Preparar datos por mes para el año seleccionado
    const monthlyData = {};
    
    // Inicializar todos los meses del año
    for (let i = 1; i <= 12; i++) {
        const monthKey = `${selectedYear}-${String(i).padStart(2, '0')}`;
        monthlyData[monthKey] = { ingresos: 0, gastos: 0 };
    }
    
    movimientosFiltrados.forEach(mov => {
        const fecha = new Date(mov.fecha);
        const monthKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        const categoria = categoriasData.find(cat => cat.categoria_id === mov.categoria_id);
        const monto = Math.abs(parseFloat(mov.monto));
        
        if (categoria && categoria.tipo_flujo === 'Ingreso') {
            monthlyData[monthKey].ingresos += monto;
        } else if (categoria && categoria.tipo_flujo === 'Gasto') {
            monthlyData[monthKey].gastos += monto;
        }
    });
    
    // Ordenar por fecha
    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        const date = new Date(year, monthNum - 1);
        return date.toLocaleDateString('es-ES', { month: 'short' });
    });
    
    const ingresosData = sortedMonths.map(month => monthlyData[month].ingresos);
    const gastosData = sortedMonths.map(month => monthlyData[month].gastos);
    
    // Destruir gráfico anterior si existe
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    // Crear nuevo gráfico
    monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ingresos',
                data: ingresosData,
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.1,
                fill: false
            }, {
                label: 'Gastos',
                data: gastosData,
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

// Función para abrir modal de nueva transacción
function openNuevaTransaccionModal() {
    const modal = elements.nuevaTransaccionModal;
    const fieldsContainer = elements.nuevaTransaccionFields;
    
    // Generar campos del formulario para movimientos
    const movimientosFields = Object.keys(currentData.length > 0 ? currentData[0] : {
        'MOV_ID': '',
        'fecha': '',
        'mes': '',
        'anio': '',
        'descripcion': '',
        'monto': '',
        'moneda': '',
        'cuenta_id': '',
        'contraparte_id': '',
        'categoria_id': '',
        'instrumento_id': ''
    });
    
    fieldsContainer.innerHTML = '';
    
    movimientosFields.forEach(field => {
        const fieldContainer = document.createElement('div');
        fieldContainer.className = 'space-y-2';
        
        const label = document.createElement('label');
        label.className = 'block text-sm font-medium text-gray-700';
        label.textContent = field;
        
        // Marcar campos requeridos
        if (requiredFields.movimientos && requiredFields.movimientos.includes(field)) {
            label.innerHTML += ' <span class="text-red-500">*</span>';
        }
        
        let input;
        
        if (field === 'MOV_ID') {
            // Campo de ID auto-generado (solo lectura)
            input = document.createElement('input');
            input.type = 'text';
            input.name = field;
            input.className = 'w-full px-3 py-2 border border-gray-300 rounded bg-gray-100';
            input.readOnly = true;
            input.value = generateNextId();
        } else if (field === 'fecha') {
            input = document.createElement('input');
            input.type = 'date';
            input.name = field;
            input.className = 'w-full px-3 py-2 border border-gray-300 rounded';
            
            // Auto-completar mes y año cuando cambie la fecha
            input.addEventListener('change', (e) => {
                if (e.target.value) {
                    const fecha = new Date(e.target.value);
                    const mesInput = fieldsContainer.querySelector('input[name="mes"]');
                    const anioInput = fieldsContainer.querySelector('input[name="anio"]');
                    
                    if (mesInput) mesInput.value = fecha.getMonth() + 1;
                    if (anioInput) anioInput.value = fecha.getFullYear();
                }
            });
        } else if (field === 'mes' || field === 'anio') {
            input = document.createElement('input');
            input.type = 'number';
            input.name = field;
            input.className = 'w-full px-3 py-2 border border-gray-300 rounded bg-gray-100';
            input.readOnly = true;
        } else if (field === 'moneda') {
            input = document.createElement('select');
            input.name = field;
            input.className = 'w-full px-3 py-2 border border-gray-300 rounded';
            input.innerHTML = '<option value="">Seleccionar...</option><option value="CLP">CLP</option><option value="USD">USD</option><option value="EUR">EUR</option>';
        } else if (['cuenta_id', 'contraparte_id', 'categoria_id', 'instrumento_id'].includes(field)) {
            // Campos de dimensión con selector
            const inputGroup = document.createElement('div');
            inputGroup.className = 'flex gap-2';
            
            input = document.createElement('input');
            input.type = 'text';
            input.name = field;
            input.className = 'flex-1 px-3 py-2 border border-gray-300 rounded';
            input.readOnly = true;
            
            const selectBtn = document.createElement('button');
            selectBtn.type = 'button';
            selectBtn.className = 'px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700';
            selectBtn.textContent = 'Seleccionar';
            selectBtn.addEventListener('click', () => openDimensionSelector(field, input));
            
            inputGroup.appendChild(input);
            inputGroup.appendChild(selectBtn);
            fieldContainer.appendChild(label);
            fieldContainer.appendChild(inputGroup);
            fieldsContainer.appendChild(fieldContainer);
            return;
        } else {
            input = document.createElement('input');
            input.type = field === 'monto' ? 'number' : 'text';
            input.name = field;
            input.className = 'w-full px-3 py-2 border border-gray-300 rounded';
            if (field === 'monto') {
                input.step = '0.01';
            }
        }
        
        fieldContainer.appendChild(label);
        fieldContainer.appendChild(input);
        fieldsContainer.appendChild(fieldContainer);
    });
    
    modal.classList.remove('hidden');
}

// Función para cerrar modal de nueva transacción
function closeNuevaTransaccionModal() {
    elements.nuevaTransaccionModal.classList.add('hidden');
    elements.nuevaTransaccionForm.reset();
}

// Función para manejar el envío de nueva transacción
async function handleNuevaTransaccion(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const record = {};
    
    for (let [key, value] of formData.entries()) {
        record[key] = value;
    }
    
    // Validar el registro
    const validation = validateRecord(record);
    if (!validation.isValid) {
        showNotification(validation.message, 'error');
        return;
    }
    
    try {
        // Intentar crear la transacción a través de la API
        const response = await fetch(`${API_BASE_URL}/movimientos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(record)
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification(result.message || 'Transacción creada exitosamente', 'success');
            
            // Recargar datos de movimientos para el dashboard
            try {
                const movimientosResponse = await fetch(`${API_BASE_URL}/movimientos`);
                if (movimientosResponse.ok) {
                    movimientosData = await movimientosResponse.json();
                } else {
                    // Fallback a CSV
                    movimientosData = await loadCSV('fact_movimientos.csv');
                }
            } catch (loadError) {
                console.warn('Error recargando datos:', loadError);
                movimientosData = await loadCSV('fact_movimientos.csv');
            }
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear la transacción');
        }
        
    } catch (error) {
        console.error('Error al crear transacción:', error);
        showNotification(`Error: ${error.message}`, 'error');
        
        // Fallback: agregar localmente si la API falla
        try {
            currentData = await loadCSV('fact_movimientos.csv');
            
            // Generar ID si no existe
            if (!record.mov_id || record.mov_id === '') {
                record.mov_id = generateNextId();
            }
            
            currentData.push(record);
            movimientosData = currentData;
            
            showNotification('Transacción agregada localmente (sin sincronizar)', 'success');
        } catch (fallbackError) {
            console.error('Error en fallback:', fallbackError);
            showNotification('Error al crear la transacción', 'error');
            return;
        }
    }
    
    // Cerrar modal y mostrar confirmación
    closeNuevaTransaccionModal();
    showSuccessModal();
    
    // Actualizar dashboard si estamos en esa vista
    if (currentTable === 'dashboard') {
        renderDashboard();
    }
}

// Función para mostrar modal de éxito
function showSuccessModal() {
    elements.successModal.classList.remove('hidden');
}

// Función para cerrar modal de éxito
function closeSuccessModal() {
    elements.successModal.classList.add('hidden');
}

// Función para mostrar/ocultar dashboard
function showDashboard() {
    document.getElementById('dashboard-section').classList.remove('hidden');
    document.getElementById('table-controls').classList.add('hidden');
    document.getElementById('table-info').classList.add('hidden');
    elements.tableContainer.classList.add('hidden');
    elements.pagination.classList.add('hidden');
    elements.addRecord.classList.add('hidden');
}

// Función para mostrar tabla
function showTable() {
    document.getElementById('dashboard-section').classList.add('hidden');
    document.getElementById('table-controls').classList.remove('hidden');
    document.getElementById('table-info').classList.remove('hidden');
}

// Función para renderizar movimientos recientes
function renderRecentMovements() {
    const recentMovementsBody = document.getElementById('recent-movements-body');
    if (!recentMovementsBody || !movimientosData.length) return;
    
    // Tomar los 5 movimientos más recientes
    const recentMovements = movimientosData
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 5);
    
    recentMovementsBody.innerHTML = recentMovements.map(mov => {
        const categoria = categoriasData.find(cat => cat.categoria_id === mov.categoria_id);
        const categoriaNombre = categoria ? categoria.categoria_nombre : mov.categoria_id || '-';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 text-sm text-gray-900">${formatDate(mov.fecha)}</td>
                <td class="px-4 py-2 text-sm text-gray-900">${mov.descripcion || '-'}</td>
                <td class="px-4 py-2 text-sm font-medium ${
                    parseFloat(mov.monto) >= 0 ? 'text-green-600' : 'text-red-600'
                }">${formatCurrency(mov.monto)}</td>
                <td class="px-4 py-2 text-sm text-gray-500">${categoriaNombre}</td>
            </tr>
        `;
    }).join('');
}

// Función para formatear moneda
function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
}

// Función para formatear fecha
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL');
}

// Función para abrir modal (alias para openAddModal)
function openModal() {
    openAddModal();
}

// Función para manejar submit del formulario
function handleSubmit(e) {
    saveRecord(e);
}

// Utilidad: debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
