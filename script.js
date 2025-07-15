// Configuración de precios
const PRICES = {
    small: {
        interior: 20,
        exterior: 18,
        complete: 35,
        'complete-fabric': 75
    },
    medium: {
        interior: 23,
        exterior: 20,
        complete: 40,
        'complete-fabric': 85
    },
    large: {
        interior: 25,
        exterior: 23,
        complete: 45,
        'complete-fabric': 95
    },
    headlight: {
        'headlight-1': 35,
        'headlight-2': 60
    }
};

// Base de datos de vehículos para detección automática de tamaño
const VEHICLE_DATABASE = {
    // Coches pequeños
    small: {
        brands: ['fiat', 'smart', 'toyota', 'honda', 'hyundai', 'kia', 'volkswagen', 'seat', 'skoda', 'opel', 'peugeot', 'citroen', 'renault', 'dacia'],
        models: ['500', 'panda', 'fortwo', 'aygo', 'iq', 'c1', '107', '108', 'up', 'mii', 'citigo', 'ka', 'fiesta', 'corsa', '208', 'c3', 'clio', 'sandero'],
        keywords: ['mini', 'city', 'compact', 'small', 'pequeño', 'compacto']
    },
    // Coches medianos
    medium: {
        brands: ['bmw', 'audi', 'mercedes', 'volvo', 'ford', 'volkswagen', 'seat', 'skoda', 'opel', 'peugeot', 'citroen', 'renault', 'toyota', 'honda', 'hyundai', 'kia', 'mazda', 'nissan'],
        models: ['3 series', 'a3', 'a4', 'c-class', 's60', 'focus', 'golf', 'leon', 'octavia', 'astra', '308', 'c4', 'megane', 'corolla', 'civic', 'i30', 'ceed', '3', 'altima'],
        keywords: ['sedan', 'familiar', 'medium', 'mediano', 'berlina']
    },
    // Coches grandes
    large: {
        brands: ['bmw', 'audi', 'mercedes', 'volvo', 'ford', 'volkswagen', 'opel', 'peugeot', 'citroen', 'renault', 'toyota', 'honda', 'hyundai', 'kia', 'mazda', 'nissan', 'land rover', 'jeep', 'range rover'],
        models: ['5 series', '7 series', 'a6', 'a8', 'e-class', 's-class', 's90', 'mondeo', 'passat', 'insignia', '508', 'c5', 'talisman', 'camry', 'accord', 'sonata', 'optima', '6', 'maxima', 'discovery', 'grand cherokee'],
        keywords: ['suv', '4x4', 'large', 'grande', 'familiar grande', 'todoterreno']
    }
};

// Configuración de n8n
const N8N_WEBHOOK_URL = 'https://n8nserver.swapenergia.com/webhook/errekaldecarwash';

// CONFIGURACIÓN DE SINCRONIZACIÓN EN TIEMPO REAL (AGRESIVA)
const SYNC_CONFIG = {
    INTERVAL_FAST: 5000,   // 5 segundos cuando hay actividad reciente
    INTERVAL_NORMAL: 15000, // 15 segundos normal  
    INTERVAL_SLOW: 30000,   // 30 segundos cuando está inactivo
    MAX_SYNC_ATTEMPTS: 3
};

// Variables de sincronización (usando las existentes)
let lastUserActivity = Date.now();
let currentSyncMode = 'normal';
const N8N_VALIDATION_URL = 'https://n8nserver.swapenergia.com/webhook/validarNúmero';
const N8N_SYNC_URL = 'https://n8nserver.swapenergia.com/webhook/errekaldecarwash-sync';
const N8N_SPACES_URL = 'https://n8nserver.swapenergia.com/webhook/errekaldecarwash'; // USAR EL QUE FUNCIONA

// Detección automática de entorno - Backend centralizado + N8N fallback
function getServerUrl() {
    // Para desarrollo local, usar servidor local
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }
    // Para producción, usar backend desplegado en Render
    // IMPORTANTE: Cambiar esta URL cuando despliegues tu backend
    return 'https://errekalde-car-wash-backend.onrender.com';
}

// Variables globales
let currentPage = 1;
let selectedDate = null;
let availableSpaces = 8;
let verificationCode = '';
let isVerified = false;
let espaciosGlobales = {}; // Para sincronización global
let lastSyncTime = null; // Tiempo de última sincronización
let syncStatus = 'conectado'; // Estado de sincronización: 'conectado', 'desconectado', 'sincronizando'
let reservationData = {
    date: null,
    name: '',
    phone: '',
    carBrand: '',
    carModel: '',
    carSize: '',
    services: [], // Array para múltiples servicios
    serviceNames: [], // Array para nombres de servicios
    price: 0,
    notas: '' // Campo para notas adicionales
};

// Configuración del servidor con detección automática
const SERVER_URL = getServerUrl();
const IS_PRODUCTION = !window.location.hostname.includes('localhost');

// Cache buster para forzar actualizaciones
const CACHE_BUSTER = 'REALTIMESYNC2024';

// Elementos del DOM
const pages = document.querySelectorAll('.page');
const navSteps = document.querySelectorAll('.nav-step');
const calendarDays = document.getElementById('calendarDays');
const currentMonthElement = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const selectedDateElement = document.getElementById('selectedDate');
const availableSpacesElement = document.getElementById('availableSpaces');
const availableSpacesInfoElement = document.getElementById('availableSpacesInfo');

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar información de debug para dispositivos móviles
    console.log('🔧 DEBUG INFO - Dispositivo:', {
        hostname: window.location.hostname,
        isProduction: IS_PRODUCTION,
        serverUrl: SERVER_URL,
        userAgent: navigator.userAgent.substr(0, 50) + '...',
        screenSize: `${screen.width}x${screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`
    });
    
    if (IS_PRODUCTION) {
        console.log('📱 MODO PRODUCCIÓN MÓVIL ACTIVADO');
        console.log('   🔄 Sincronización: localStorage');
        console.log('   📡 Webhooks: directo a N8N');
        console.log('   💾 Reservas: localStorage');
    } else {
        console.log('💻 MODO DESARROLLO ACTIVADO');
        console.log('   🔄 Sincronización: servidor backend');
        console.log('   📡 Webhooks: a través de proxy');
        console.log('   💾 Reservas: servidor backend');
    }
    
    setupEventListeners();
    initializeCalendar();
    updateNavigation();
    
    // ARREGLADO: Inicializar sincronización SIEMPRE
    setTimeout(async () => {
        console.log('🔍 Verificando sincronización entre dispositivos...');
        
        // SIEMPRE inicializar la sincronización, independientemente del estado inicial
        console.log('🚀 Iniciando sincronización automática FORZADA...');
        inicializarSincronizacionAutomatica();
        inicializarEspaciosEnServidor();
        
        // Detectar si hay desincronización para reporte (no bloquea inicialización)
        try {
            const hayDesincronizacion = await detectarDesincronizacion();
            if (hayDesincronizacion) {
                console.log('⚠️ Desincronización detectada, pero sincronización ya iniciada');
            } else {
                console.log('✅ Dispositivos sincronizados correctamente');
            }
        } catch (error) {
            console.log('ℹ️ No se pudo verificar desincronización inicial, pero sincronización ya iniciada');
        }
        
        // Configurar detección automática cada 30 segundos
        setInterval(async () => {
            await detectarDesincronizacion();
        }, 30000);
        
    }, 500);
    
    // Añadir botón de emergencia al DOM para debugging
    if (window.location.hostname === 'localhost' || window.location.search.includes('debug=true')) {
        addEmergencyButton();
    }
});

// Función para añadir botón de emergencia (solo en desarrollo o con debug=true)
function addEmergencyButton() {
    const button = document.createElement('button');
    button.textContent = '🚨 Sync Emergencia';
    button.style.position = 'fixed';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.zIndex = '9999';
    button.style.background = '#ff4444';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.padding = '10px';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.onclick = () => forzarSincronizacionEmergencia();
    document.body.appendChild(button);
    console.log('🔧 Botón de emergencia añadido (esquina superior derecha)');
}

// Configurar event listeners
function setupEventListeners() {
    // Navegación de páginas
    document.querySelectorAll('[id^="nextToPage"], [id^="prevToPage"]').forEach(btn => {
        btn.addEventListener('click', handlePageNavigation);
    });

    // Navegación del calendario
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));

    // Navegación por pasos
    navSteps.forEach(step => {
        step.addEventListener('click', () => {
            const pageNum = parseInt(step.dataset.page);
            if (canNavigateToPage(pageNum)) {
                goToPage(pageNum);
            }
        });
    });

    // Formularios
    document.getElementById('sendCode').addEventListener('click', handleSendCode);
    document.getElementById('verifyCode').addEventListener('click', handleVerifyCode);
    document.getElementById('resendCode').addEventListener('click', handleResendCode);
    document.getElementById('confirmReservation').addEventListener('click', handleConfirmReservation);
    document.getElementById('newReservation').addEventListener('click', handleNewReservation);

    // Detección de tamaño de vehículo
    document.getElementById('car-brand').addEventListener('input', detectVehicleSize);
    document.getElementById('car-model').addEventListener('input', detectVehicleSize);
    
    // ELIMINAR MENSAJES AZULES al hacer clic en cualquier lugar - VERSIÓN CONSERVADORA
    document.addEventListener('click', () => {
        setTimeout(() => {
            // Solo buscar elementos específicos que contengan el texto prohibido
            document.querySelectorAll('p, div').forEach(element => {
                const text = element.textContent || '';
                if (text.includes('💡 Selecciona UN tipo de limpieza + OPCIONALMENTE UN pulido de faro')) {
                    console.log('🗑️ ELIMINANDO mensaje azul específico:', element);
                    element.remove();
                }
            });
        }, 10);
    });
}

// Sistema de navegación de páginas
function handlePageNavigation(e) {
    const buttonId = e.target.id;
    let targetPage;

    if (buttonId.includes('nextToPage')) {
        targetPage = parseInt(buttonId.replace('nextToPage', ''));
    } else if (buttonId.includes('prevToPage')) {
        targetPage = parseInt(buttonId.replace('prevToPage', ''));
    }

    if (targetPage && canNavigateToPage(targetPage)) {
        goToPage(targetPage);
    }
}

function canNavigateToPage(pageNum) {
    switch (pageNum) {
        case 1: return true;
        case 2: return selectedDate !== null;
        case 3: return true;
        case 4: return isVerified && reservationData.carSize;
        case 5: return reservationData.services.length > 0;
        default: return false;
    }
}

// Modificar goToPage para animación
function goToPage(pageNum) {
    // Ocultar página actual con animación
    const currentPageEl = document.querySelector('.page.active');
    if (currentPageEl) {
        currentPageEl.classList.remove('active');
        // Forzar reflow para reiniciar animación si se vuelve a mostrar
        void currentPageEl.offsetWidth;
    }
    // Mostrar página objetivo con animación
    const nextPageEl = document.getElementById(`page-${pageNum}`);
    nextPageEl.classList.add('active');
    // Actualizar navegación
    currentPage = pageNum;
    updateNavigation();
    // Ejecutar acciones específicas de la página
    switch (pageNum) {
        case 4:
            loadPricingSection();
            break;
        case 5:
            generateReservationSummary();
            break;
    }
}

function updateNavigation() {
    navSteps.forEach((step, index) => {
        const pageNum = index + 1;
        step.classList.remove('active', 'completed');
        
        if (pageNum === currentPage) {
            step.classList.add('active');
        } else if (pageNum < currentPage) {
            step.classList.add('completed');
        }
    });
}

// Sistema de calendario
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

function initializeCalendar() {
    renderCalendar();
}

function changeMonth(delta) {
    currentMonth += delta;
    
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    
    renderCalendar();
}

// Modificar renderCalendar para mostrar espacios disponibles
function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // Calcular el primer día de la semana que contiene el primer día del mes
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lunes = 0, Domingo = 6
    startDate.setDate(startDate.getDate() - daysToSubtract);
    
    currentMonthElement.textContent = new Date(currentYear, currentMonth).toLocaleDateString('es-ES', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    calendarDays.innerHTML = '';
    
    // Generar 42 días (6 semanas x 7 días)
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dayElement = document.createElement('button');
        dayElement.type = 'button';
        dayElement.className = 'ios-calendar-day';
        
        // Verificar si es miércoles y está en el futuro
        const isWednesday = date.getDay() === 3; // 3 = Miércoles
        const isFuture = date > new Date();
        const isCurrentMonth = date.getMonth() === currentMonth;
        
        if (!isCurrentMonth) {
            dayElement.classList.add('other-month');
            dayElement.textContent = date.getDate();
        } else if (isWednesday && isFuture) {
            dayElement.classList.add('available');
            
            // Obtener espacios disponibles para esta fecha
            const fechaStr = date.toISOString().split('T')[0];
            const espaciosDisponibles = espaciosGlobales[fechaStr] || 8;
            
            // Crear contenido del día con espacios disponibles
            dayElement.innerHTML = `
                <span class="day-number">${date.getDate()}</span>
                <span class="spaces-available">${espaciosDisponibles}/8</span>
            `;
            
            // Deshabilitar si no hay espacios disponibles
            if (espaciosDisponibles <= 0) {
                dayElement.classList.add('no-spaces');
                dayElement.disabled = true;
            } else {
                dayElement.addEventListener('click', () => selectDate(date, dayElement));
            }
        } else {
            dayElement.classList.add('disabled');
            dayElement.textContent = date.getDate();
        }
        
        // Si es la fecha seleccionada
        if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
            dayElement.classList.add('selected');
        }
        
        calendarDays.appendChild(dayElement);
    }
}

// Modificar selectDate para usar sincronización global
async function selectDate(date, dayElement) {
    selectedDate = date;
    selectedDateElement.textContent = date.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Obtener espacios disponibles del servidor
    const fechaStr = date.toISOString().split('T')[0];
    availableSpaces = espaciosGlobales[fechaStr] || 8;
    availableSpacesElement.textContent = availableSpaces;
    
    // Mostrar información de espacios disponibles
    if (availableSpacesInfoElement) {
        availableSpacesInfoElement.style.display = 'block';
    }
    
    // Quitar selección anterior
    document.querySelectorAll('.ios-calendar-day.selected').forEach(el => el.classList.remove('selected'));
    
    // Agregar clase seleccionada y animación
    if (dayElement) {
        dayElement.classList.add('selected');
        dayElement.style.animation = 'none';
        void dayElement.offsetWidth;
        dayElement.style.animation = null;
    }
    
    // Habilitar botón de continuar
    document.getElementById('nextToPage2').disabled = false;
    
    // Actualizar navegación
    updateNavigation();
}

// Sistema de verificación
async function handleSendCode() {
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    if (!name || !phone) {
        showNotification('Por favor, completa todos los campos', 'error');
        return;
    }
    
    if (!isValidPhone(phone)) {
        showNotification('Por favor, introduce un número de teléfono válido', 'error');
        return;
    }
    
    reservationData.name = name;
    reservationData.phone = phone;
    
    try {
        verificationCode = generateVerificationCode();
        await sendVerificationCode(phone, verificationCode);
        
        document.getElementById('verification-section').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error enviando código:', error);
        showNotification('Error al enviar el código', 'error');
    }
}

async function handleVerifyCode() {
    const inputCode = document.getElementById('verification-code').value.trim();
    
    if (!inputCode) {
        showNotification('Por favor, introduce el código de verificación', 'error');
        return;
    }
    
    if (inputCode === verificationCode) {
        isVerified = true;
        document.getElementById('vehicle-section').classList.remove('hidden');
        document.getElementById('nextToPage4').disabled = false;
        showNotification('¡Verificación exitosa!', 'success');
    } else {
        showNotification('Código incorrecto', 'error');
        document.getElementById('verification-code').value = '';
    }
}

async function handleResendCode() {
    if (!reservationData.phone) {
        showNotification('No hay número de teléfono registrado', 'error');
        return;
    }
    
    try {
        verificationCode = generateVerificationCode();
        await sendVerificationCode(reservationData.phone, verificationCode);
    } catch (error) {
        showNotification('Error al reenviar el código', 'error');
    }
}

// Detección automática de tamaño de vehículo
function detectVehicleSize() {
    const brand = document.getElementById('car-brand').value.toLowerCase().trim();
    const model = document.getElementById('car-model').value.toLowerCase().trim();
    
    if (!brand || !model) return;
    
    let detectedSize = '';
    let maxScore = 0;
    
    // Evaluar cada categoría
    Object.entries(VEHICLE_DATABASE).forEach(([size, data]) => {
        let score = 0;
        
        // Verificar marca
        if (data.brands.includes(brand)) score += 3;
        
        // Verificar modelo
        if (data.models.some(m => model.includes(m))) score += 2;
        
        // Verificar palabras clave
        data.keywords.forEach(keyword => {
            if (brand.includes(keyword) || model.includes(keyword)) score += 1;
        });
        
        if (score > maxScore) {
            maxScore = score;
            detectedSize = size;
        }
    });
    
    if (detectedSize) {
        const sizeNames = {
            small: 'Pequeño',
            medium: 'Mediano',
            large: 'Grande'
        };
        
        document.getElementById('detectedSize').textContent = sizeNames[detectedSize];
        reservationData.carBrand = document.getElementById('car-brand').value;
        reservationData.carModel = document.getElementById('car-model').value;
        reservationData.carSize = detectedSize;
        
        // Habilitar navegación a la siguiente página
        if (isVerified) {
            document.getElementById('nextToPage4').disabled = false;
        }
    }
}

// Carga de precios según tamaño
function loadPricingSection() {
    const pricingSection = document.getElementById('pricing-section');
    const sizeNames = {
        small: 'Pequeño',
        medium: 'Mediano',
        large: 'Grande'
    };
    
    const sizeName = sizeNames[reservationData.carSize];
    const prices = PRICES[reservationData.carSize];
    
    pricingSection.innerHTML = `
        <h3>Precios para vehículos ${sizeName.toLowerCase()}s</h3>
        <div class="pricing-grid">
            <div class="pricing-card">
                <h3><i class="fas fa-car"></i> Servicios de Limpieza</h3>
                <ul>
                    <li data-service="interior" data-price="${prices.interior}">Limpieza interior <strong>${prices.interior}€</strong></li>
                    <li data-service="exterior" data-price="${prices.exterior}">Limpieza exterior <strong>${prices.exterior}€</strong></li>
                    <li data-service="complete" data-price="${prices.complete}">Limpieza completa <strong>${prices.complete}€</strong></li>
                    <li data-service="complete-fabric" data-price="${prices['complete-fabric']}">Limpieza completa con tapicería <strong>${prices['complete-fabric']}€</strong></li>
                </ul>
            </div>
            <div class="pricing-card farol-card">
                <h3><i class="fas fa-lightbulb"></i> Pulido de Faros (Opcional)</h3>
                <ul>
                    <li data-service="headlight-1" data-price="${PRICES.headlight['headlight-1']}">Un faro <strong>${PRICES.headlight['headlight-1']}€</strong></li>
                    <li data-service="headlight-2" data-price="${PRICES.headlight['headlight-2']}">Dos faros <strong>${PRICES.headlight['headlight-2']}€</strong></li>
                </ul>
            </div>
        </div>
        
        <div class="notes-section">
            <h3><i class="fas fa-sticky-note"></i> Notas</h3>
            <textarea 
                id="notasAdicionales" 
                placeholder="Ej: Coche muy sucio, mancha difícil en el asiento, etc."
                rows="3"
                maxlength="300"
            >${reservationData.notas}</textarea>
            <div class="char-counter">
                <span id="charCount">${reservationData.notas.length}</span>/300 caracteres
            </div>
        </div>
        
        <div class="selected-services-summary">
            <h4>Servicios Seleccionados:</h4>
            <div id="selectedServicesList">Ningún servicio seleccionado</div>
            <div class="total-price">
                <strong>Precio Total: <span id="totalPrice">0€</span></strong>
            </div>
        </div>
    `;
    
    // Limpieza conservadora de mensajes azules específicos
    setTimeout(() => {
        // Solo buscar el mensaje específico problemático
        document.querySelectorAll('p, div').forEach(element => {
            const text = element.textContent || '';
            if (text.includes('💡 Selecciona UN tipo de limpieza + OPCIONALMENTE UN pulido de faro')) {
                console.log('🗑️ ELIMINANDO mensaje azul específico en pricing:', element);
                element.remove();
            }
        });
    }, 100);
    
    // Agregar event listeners para selección de servicios
    pricingSection.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => selectService(li));
    });
    
    // Agregar event listener para las notas
    const notasTextarea = document.getElementById('notasAdicionales');
    const charCountElement = document.getElementById('charCount');
    
    notasTextarea.addEventListener('input', function() {
        reservationData.notas = this.value;
        charCountElement.textContent = this.value.length;
        
        if (this.value.length > 280) {
            charCountElement.style.color = '#dc2626';
        } else {
            charCountElement.style.color = '#6b7280';
        }
    });
}

function selectService(serviceElement) {
    const serviceType = serviceElement.dataset.service;
    
    // Definir nombres limpios manualmente
    let serviceName = '';
    switch(serviceType) {
        case 'interior': serviceName = 'Limpieza interior'; break;
        case 'exterior': serviceName = 'Limpieza exterior'; break;
        case 'complete': serviceName = 'Limpieza completa'; break;
        case 'complete-fabric': serviceName = 'Limpieza completa con tapicería'; break;
        case 'headlight-1': serviceName = 'Un faro'; break;
        case 'headlight-2': serviceName = 'Dos faros'; break;
        default: serviceName = serviceElement.innerHTML.split('<strong>')[0].trim();
    }
    
    const price = parseInt(serviceElement.dataset.price);
    
    // Verificar si es un servicio de limpieza (solo uno permitido)
    const isCleaningService = ['interior', 'exterior', 'complete', 'complete-fabric'].includes(serviceType);
    
    if (isCleaningService) {
        // Deseleccionar otros servicios de limpieza
        document.querySelectorAll('.pricing-card li[data-service="interior"], .pricing-card li[data-service="exterior"], .pricing-card li[data-service="complete"], .pricing-card li[data-service="complete-fabric"]').forEach(li => {
            li.classList.remove('selected');
        });
        
        // Remover servicios de limpieza anteriores del array
        reservationData.services = reservationData.services.filter(s => !['interior', 'exterior', 'complete', 'complete-fabric'].includes(s));
        reservationData.serviceNames = reservationData.serviceNames.filter(name => !name.includes('Limpieza'));
        
        // Agregar el nuevo servicio de limpieza
        serviceElement.classList.add('selected');
        reservationData.services.push(serviceType);
        reservationData.serviceNames.push(serviceName);
    } else {
        // Para servicios de faros, solo uno puede estar seleccionado
        const isHeadlightService = ['headlight-1', 'headlight-2'].includes(serviceType);
        
        if (isHeadlightService) {
            // Si el elemento ya está seleccionado, deseleccionarlo
            if (serviceElement.classList.contains('selected')) {
                serviceElement.classList.remove('selected');
                reservationData.services = reservationData.services.filter(s => s !== serviceType);
                reservationData.serviceNames = reservationData.serviceNames.filter(name => !name.includes('faro'));
            } else {
                // Deseleccionar otros servicios de faros
                document.querySelectorAll('.pricing-card li[data-service="headlight-1"], .pricing-card li[data-service="headlight-2"]').forEach(li => {
                    li.classList.remove('selected');
                });
                
                // Remover servicios de faros anteriores del array
                reservationData.services = reservationData.services.filter(s => !['headlight-1', 'headlight-2'].includes(s));
                reservationData.serviceNames = reservationData.serviceNames.filter(name => !name.includes('faro'));
                
                // Seleccionar el nuevo servicio de faro
                serviceElement.classList.add('selected');
                reservationData.services.push(serviceType);
                reservationData.serviceNames.push(serviceName);
            }
        }
    }
    
    // Calcular precio total
    reservationData.price = reservationData.services.reduce((total, service) => {
        const serviceElement = document.querySelector(`[data-service="${service}"]`);
        return total + parseInt(serviceElement.dataset.price);
    }, 0);
    
    // Actualizar resumen de servicios seleccionados
    updateSelectedServicesSummary();
    
    // Habilitar botón de continuar si hay al menos un servicio seleccionado
    document.getElementById('nextToPage5').disabled = reservationData.services.length === 0;
}

function updateSelectedServicesSummary() {
    const selectedServicesList = document.getElementById('selectedServicesList');
    const totalPriceElement = document.getElementById('totalPrice');
    
    if (reservationData.services.length === 0) {
        selectedServicesList.textContent = 'Ningún servicio seleccionado';
    } else {
        selectedServicesList.innerHTML = reservationData.services.map(serviceType => {
            // Nombres completamente fijos - IMPOSIBLE duplicación
            const serviceNames = {
                'interior': 'Limpieza interior',
                'exterior': 'Limpieza exterior', 
                'complete': 'Limpieza completa',
                'complete-fabric': 'Limpieza completa con tapicería',
                'headlight-1': 'Un faro',
                'headlight-2': 'Dos faros'
            };
            
            const cleanName = serviceNames[serviceType] || serviceType;
            
            // OBTENER EL PRECIO REAL del elemento seleccionado en el DOM
            const serviceElement = document.querySelector(`[data-service="${serviceType}"]`);
            const realPrice = serviceElement ? parseInt(serviceElement.dataset.price) : 0;
            
            return `<div class="selected-service-item">• ${cleanName} ${realPrice}€</div>`;
        }).join('');
    }
    
    totalPriceElement.textContent = `${reservationData.price}€`;
}

// Generación de resumen de reserva
function generateReservationSummary() {
    const summary = document.getElementById('reservation-summary');
    
    let notasSection = '';
    if (reservationData.notas && reservationData.notas.trim()) {
        notasSection = `
        <div class="summary-item">
            <span class="summary-label">Notas adicionales:</span>
            <span class="summary-value">${reservationData.notas}</span>
        </div>`;
    }
    
    summary.innerHTML = `
        <h3>Resumen de tu Reserva</h3>
        <div class="summary-item">
            <span class="summary-label">Fecha:</span>
            <span class="summary-value">${selectedDate.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Nombre:</span>
            <span class="summary-value">${reservationData.name}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Teléfono:</span>
            <span class="summary-value">${reservationData.phone}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Vehículo:</span>
            <span class="summary-value">${reservationData.carBrand} ${reservationData.carModel} (${reservationData.carSize})</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Servicios:</span>
            <span class="summary-value">${reservationData.services.filter(serviceType => 
                !['headlight-1', 'headlight-2'].includes(serviceType)
            ).map(serviceType => {
                switch(serviceType) {
                    case 'interior': return 'Limpieza interior';
                    case 'exterior': return 'Limpieza exterior';
                    case 'complete': return 'Limpieza completa';
                    case 'complete-fabric': return 'Limpieza completa con tapicería';
                    default: return serviceType;
                }
            }).join(', ')}</span>
        </div>
        ${reservationData.services.some(serviceType => ['headlight-1', 'headlight-2'].includes(serviceType)) ? `
        <div class="summary-item">
            <span class="summary-label">Suplementos:</span>
            <span class="summary-value">${reservationData.services.filter(serviceType => 
                ['headlight-1', 'headlight-2'].includes(serviceType)
            ).map(serviceType => {
                switch(serviceType) {
                    case 'headlight-1': return 'Un faro';
                    case 'headlight-2': return 'Dos faros';
                    default: return serviceType;
                }
            }).join(', ')}</span>
        </div>` : ''}${notasSection}
        <div class="summary-item">
            <span class="summary-label">Precio total:</span>
            <span class="summary-value">${reservationData.price}€</span>
        </div>
    `;
}

// SISTEMA DE RESERVAS UNIVERSAL SINCRONIZADO
async function handleConfirmReservation() {
    console.log('🎯 INICIANDO RESERVA UNIVERSAL SINCRONIZADA');
    
    if (!selectedDate || !isVerified) {
        showNotification('❌ Fecha no seleccionada o teléfono no verificado', 'error');
        return;
    }
    
    isReservationInProgress = true;
    updateSyncStatus('sincronizando');
    
    try {
        // 1. Verificar espacios disponibles en tiempo real
        const fechaStr = selectedDate.toISOString().split('T')[0];
        let espaciosActuales = espaciosGlobales[fechaStr] || 8;
        
        console.log(`📊 Espacios disponibles para ${fechaStr}: ${espaciosActuales}`);
        
        if (espaciosActuales <= 0) {
            throw new Error('No hay espacios disponibles para esta fecha');
        }
        
        // 2. Generar ID único de reserva
        const reservationId = 'RES_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        
        // 3. Preparar datos completos de reserva
        const reservaCompleta = {
            // Identificación
            id: reservationId,
            timestamp: new Date().toISOString(),
            
            // Datos del cliente
            name: reservationData.name,
            phone: reservationData.phone,
            
            // Datos de la reserva
            fecha: fechaStr,
            vehicle: `${reservationData.carBrand} ${reservationData.carModel}`,
            carBrand: reservationData.carBrand,
            carModel: reservationData.carModel,
            carSize: reservationData.carSize,
            services: reservationData.services,
            serviceNames: reservationData.serviceNames,
            price: reservationData.price,
            notas: reservationData.notas || '',
            
            // Datos de espacios
            espaciosAntes: espaciosActuales,
            espaciosDespues: espaciosActuales - 1,
            
            // Metadatos
            device: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
            deviceId: generateDeviceId(),
            source: IS_PRODUCTION ? 'production' : 'development'
        };
        
        console.log('📋 Datos de reserva preparados:', reservaCompleta);
        
        // 4. ACTUALIZAR ESPACIOS INMEDIATAMENTE (Optimistic Update)
        espaciosGlobales[fechaStr] = espaciosActuales - 1;
        actualizarInterfazConEspacios();
        
        console.log(`🔄 Espacios actualizados localmente: ${fechaStr} = ${espaciosGlobales[fechaStr]}`);
        showNotification(`🔄 Procesando reserva... Espacios restantes: ${espaciosGlobales[fechaStr]}`, 'info');
        
        // 5. Enviar reserva al servidor
        try {
            const resultadoReserva = await hacerReservaEnServidor(reservaCompleta);
            
            if (resultadoReserva.success) {
                console.log('✅ Reserva confirmada en servidor');
                
                // 6. Mostrar página de éxito
                pages.forEach(page => page.classList.remove('active'));
                document.getElementById('success-page').classList.add('active');
                generateFinalSummary();
                
                // 7. Notificar éxito con espacios actualizados
                showNotification(`✅ Reserva confirmada! Espacios restantes: ${espaciosGlobales[fechaStr]}`, 'success');
                
                // 8. Forzar sincronización universal en todos los dispositivos
                setTimeout(async () => {
                    console.log('📢 Forzando sincronización universal post-reserva');
                    await sincronizarEspaciosUniversal();
                }, 1000);
                
                // 9. El backend ya envió automáticamente el WhatsApp via n8n
                console.log('📱 Backend envió confirmación WhatsApp automáticamente');
                showNotification('📱 Confirmación WhatsApp enviada automáticamente', 'success');
                
            } else {
                throw new Error(resultadoReserva.error || 'Error del servidor');
            }
            
        } catch (serverError) {
            console.error('❌ Error en servidor, manteniendo reserva local:', serverError);
            
            // Mantener la actualización local aunque falle el servidor
            showNotification('⚠️ Reserva guardada localmente. Se sincronizará cuando haya conexión.', 'warning');
            
            // Guardar en localStorage para sincronización posterior
            try {
                const reservasOffline = JSON.parse(localStorage.getItem('reservas_offline') || '[]');
                reservasOffline.push(reservaCompleta);
                localStorage.setItem('reservas_offline', JSON.stringify(reservasOffline));
                console.log('💾 Reserva guardada offline para sincronización posterior');
            } catch (e) {
                console.warn('⚠️ No se pudo guardar offline:', e);
            }
            
            // Mostrar página de éxito de todos modos
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById('success-page').classList.add('active');
            generateFinalSummary();
        }
        
    } catch (error) {
        console.error('❌ Error crítico en reserva:', error);
        
        // Revertir cambios si hay error crítico
        const fechaStr = selectedDate.toISOString().split('T')[0];
        if (espaciosGlobales[fechaStr] !== undefined) {
            espaciosGlobales[fechaStr] = Math.min((espaciosGlobales[fechaStr] || 0) + 1, 8);
            actualizarInterfazConEspacios();
        }
        
        showNotification(error.message || 'Error al confirmar la reserva', 'error');
        
    } finally {
        isReservationInProgress = false;
        updateSyncStatus('conectado');
    }
}

function generateFinalSummary() {
    const finalSummary = document.getElementById('final-summary');
    
    finalSummary.innerHTML = `
        <h4>Detalles de la Reserva</h4>
        <p><strong>Fecha:</strong> ${selectedDate.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })}</p>
        <p><strong>Servicios:</strong> ${reservationData.services.filter(serviceType => 
            !['headlight-1', 'headlight-2'].includes(serviceType)
        ).map(serviceType => {
            switch(serviceType) {
                case 'interior': return 'Limpieza interior';
                case 'exterior': return 'Limpieza exterior';
                case 'complete': return 'Limpieza completa';
                case 'complete-fabric': return 'Limpieza completa con tapicería';
                default: return serviceType;
            }
        }).join(', ')}</p>
        ${reservationData.services.some(serviceType => ['headlight-1', 'headlight-2'].includes(serviceType)) ? `
        <p><strong>Suplementos:</strong> ${reservationData.services.filter(serviceType => 
            ['headlight-1', 'headlight-2'].includes(serviceType)
        ).map(serviceType => {
            switch(serviceType) {
                case 'headlight-1': return 'Un faro';
                case 'headlight-2': return 'Dos faros';
                default: return serviceType;
            }
        }).join(', ')}</p>` : ''}
        <p><strong>Precio:</strong> ${reservationData.price}€</p>
        <p><strong>Vehículo:</strong> ${reservationData.carBrand} ${reservationData.carModel}</p>
        <hr>
        <p><em>Recibirás una confirmación por WhatsApp con todos los detalles.</em></p>
    `;
}

// Nueva reserva
function handleNewReservation() {
    // Resetear todos los datos
    selectedDate = null;
    availableSpaces = 8;
    verificationCode = '';
    isVerified = false;
    reservationData = {
        date: null,
        name: '',
        phone: '',
        carBrand: '',
        carModel: '',
        carSize: '',
        services: [],
        serviceNames: [],
        price: 0,
        notas: ''
    };
    
    // Resetear elementos de fecha
    selectedDateElement.textContent = 'Ninguna';
    if (availableSpacesInfoElement) {
        availableSpacesInfoElement.style.display = 'none';
    }
    
    // Limpiar formularios
    document.getElementById('personal-form').reset();
    document.getElementById('verification-section').classList.add('hidden');
    document.getElementById('vehicle-section').classList.add('hidden');
    
    // Resetear navegación
    document.getElementById('nextToPage2').disabled = true;
    document.getElementById('nextToPage4').disabled = true;
    document.getElementById('nextToPage5').disabled = true;
    
    // Volver a la página 1
    goToPage(1);
}

// Funciones auxiliares
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function isValidPhone(phone) {
    const phoneRegex = /^(\+34|34)?[6789]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Funciones de comunicación con n8n
async function sendVerificationCode(phone, code) {
    const message = `🔐 Código de verificación Errekalde Car Wash\n\nTu código de verificación es: ${code}\n\nEste código es válido para acceder al sistema de reservas de SWAP ENERGIA.`;
    
    const payload = {
        phone: phone,
        message: message,
        type: 'verification',
        code: code
    };
    
    try {
        console.log('📱 Enviando código de verificación desde dispositivo...');
        
        const response = await fetch(N8N_VALIDATION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
            mode: 'cors' // Permitir CORS para móviles
        });
        
        console.log('📡 Respuesta de verificación N8N:', response.status, response.statusText);
        
        if (response.status >= 200 && response.status < 400) {
            console.log('✅ Código de verificación enviado correctamente');
            
            try {
                const result = await response.json();
                return result;
            } catch (e) {
                // Si no hay JSON válido, devolver éxito básico
                return { success: true, status: response.status };
            }
        } else {
            console.warn('⚠️ Status no estándar en verificación:', response.status);
            // En algunos casos N8N puede devolver códigos diferentes pero aún funcionar
            return { success: true, status: response.status, warning: 'Status no estándar' };
        }
    } catch (error) {
        console.error('❌ Error en verificación:', error);
        
        // En lugar de fallar completamente, permitir continuar
        // ya que el código se genera localmente
        console.log('💡 Continuando con verificación local (código visible en pantalla)');
        throw new Error('No se pudo enviar el código por WhatsApp, pero puedes continuar con la verificación');
    }
}

async function sendBookingConfirmation(reservationData) {
    // Generar ID de reserva único
    const reservationId = `RESERVA-${Date.now()}`;
    
    // Formatear solo servicios principales (sin faros/suplementos)
    let serviciosTexto = reservationData.services.filter(serviceType => 
        !['headlight-1', 'headlight-2'].includes(serviceType)
    ).map(serviceType => {
        switch(serviceType) {
            case 'interior': return 'Limpieza interior';
            case 'exterior': return 'Limpieza exterior';
            case 'complete': return 'Limpieza completa';
            case 'complete-fabric': return 'Limpieza completa con tapicería';
            default: return serviceType;
        }
    }).join(' + ');
    
    // Detectar suplementos
    let suplementos = "Ninguno";
    if (reservationData.services.some(service => service.includes('headlight'))) {
        suplementos = reservationData.services
            .filter(service => service.includes('headlight'))
            .map(service => service === 'headlight-1' ? 'Un faro' : 'Dos faros')
            .join(', ');
    }
    
    // Agregar notas si existen
    let notasTexto = '';
    if (reservationData.notas && reservationData.notas.trim()) {
        notasTexto = `📝 *Notas adicionales:* ${reservationData.notas}

`;
    }
    
    // Mensaje con el formato exacto solicitado
    const mensajeWhatsApp = `🚗 *RESERVA CONFIRMADA - Errekalde Car Wash* 🚗

✅ Hola ${reservationData.name}, tu reserva está confirmada

📅 *Fecha:* ${selectedDate.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    })}
🕐 *Entrega de llaves:* Entre las 8:00-9:00 en el pabellón

👤 *Cliente:* ${reservationData.name}
📞 *Teléfono:* ${reservationData.phone}
🚗 *Vehículo:* ${reservationData.carBrand} ${reservationData.carModel} (${reservationData.carSize === 'small' ? 'pequeño' : reservationData.carSize === 'medium' ? 'mediano' : 'grande'})
🧽 *Servicio:* ${serviciosTexto}
✨ *Suplementos:* ${suplementos}
💰 *Precio Total:* ${reservationData.price}€
🆔 *ID Reserva:* ${reservationId}

${notasTexto}📍 *IMPORTANTE - SOLO TRABAJADORES SWAP ENERGIA*
🏢 *Ubicación:* Pabellón SWAP ENERGIA
🔑 *Llaves:* Dejar en el pabellón entre 8:00-9:00
🕐 *No hay horario específico de lavado*

*¡Gracias por usar nuestro servicio!* 🤝

_Servicio exclusivo para empleados SWAP ENERGIA_ ✨`;
    
    const payload = {
        phone: reservationData.phone,
        message: mensajeWhatsApp,
        type: 'booking',
        reservationId: reservationId,
        reservationData: {
            name: reservationData.name,
            phone: reservationData.phone,
            date: selectedDate.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            vehicle: `${reservationData.carBrand} ${reservationData.carModel}`,
            services: serviciosTexto,
            supplements: suplementos,
            price: reservationData.price,
            vehicleSize: reservationData.carSize,
            notes: reservationData.notas || ''
        }
    };
    
    console.log('🔍 DEBUG - Payload enviado a N8N:', JSON.stringify(payload, null, 2));
    
    if (SERVER_URL) {
        // Modo desarrollo - usar servidor backend como proxy
        const response = await fetch(`${SERVER_URL}/api/send-webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        console.log('🔍 DEBUG - Respuesta del servidor:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ ERROR - Respuesta del servidor:', errorData);
            throw new Error(errorData.error || 'Error en la comunicación con n8n');
        }
        
        const responseData = await response.json();
        console.log('✅ DEBUG - Datos de respuesta completos:', responseData);
        
        return responseData;
    } else {
        // Modo producción - petición directa a N8N
        try {
            console.log('📡 Enviando directamente a N8N desde dispositivo móvil...');
            
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
                mode: 'cors' // Permitir CORS
            });
            
            console.log('📡 Respuesta directa de N8N:', response.status, response.statusText);
            
            // N8N puede devolver diferentes códigos de estado
            if (response.status >= 200 && response.status < 400) {
                console.log('✅ Webhook enviado correctamente a N8N desde móvil');
                
                // Intentar parsear la respuesta JSON si existe
                try {
                    const result = await response.text();
                    console.log('📄 Respuesta de N8N:', result);
                    return { 
                        success: true, 
                        status: response.status, 
                        response: result,
                        source: 'direct-mobile'
                    };
                } catch (e) {
                    // Si no hay contenido válido, devolver éxito
                    return { 
                        success: true, 
                        status: response.status,
                        source: 'direct-mobile' 
                    };
                }
            } else {
                console.warn('⚠️ N8N devolvió status no estándar:', response.status);
                // Incluso si N8N devuelve un status diferente, puede que haya funcionado
                return { 
                    success: true, 
                    status: response.status, 
                    warning: 'Status no estándar pero posiblemente exitoso',
                    source: 'direct-mobile'
                };
            }
        } catch (error) {
            console.error('❌ Error directo con N8N desde móvil:', error);
            
            // En producción móvil, si falla el webhook no es crítico
            // La reserva ya está confirmada localmente
            console.log('💡 La reserva está confirmada aunque el WhatsApp puede haber fallado');
            return { 
                success: false, 
                error: error.message,
                fallback: true,
                message: 'Reserva confirmada pero notificación WhatsApp puede haber fallado',
                source: 'direct-mobile-failed'
            };
        }
    }
}




// Sistema de notificaciones
function showNotification(message, type = 'info') {
    const notifications = document.getElementById('notifications');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    notifications.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

// ===== SISTEMA DE SINCRONIZACIÓN VERDADERA CON N8N =====

// Variables para sincronización agresiva
let syncInterval = null;
let lastSpacesHash = '';
let isReservationInProgress = false;
let syncRetryCount = 0;
const MAX_SYNC_RETRIES = 3;

// Función principal para sincronizar espacios usando N8N como backend universal
async function sincronizarEspaciosGlobal() {
    if (isReservationInProgress) {
        console.log('⏸️ Reserva en progreso, saltando sincronización');
        return;
    }

    try {
        console.log(`🔄 Iniciando sincronización (intento ${syncRetryCount + 1}/${MAX_SYNC_RETRIES + 1})...`);
        updateSyncStatus('sincronizando');
        
        // PASO 1: Obtener datos SIEMPRE desde N8N (sin localStorage)
        const espaciosN8N = await obtenerEspaciosDesdeN8N();
        
        if (espaciosN8N) {
            console.log('✅ Datos obtenidos desde N8N:', Object.keys(espaciosN8N).length, 'fechas');
            console.log('📊 Ejemplo de datos N8N:', Object.entries(espaciosN8N).slice(0, 2));
            
            // PASO 2: Calcular hash para detectar cambios reales
            const newHash = JSON.stringify(espaciosN8N);
            const hasChanges = newHash !== lastSpacesHash;
            
            if (hasChanges || Object.keys(espaciosGlobales).length === 0) {
                console.log('🔄 Cambios detectados o primera sincronización');
                const espaciosAnteriores = { ...espaciosGlobales };
                espaciosGlobales = espaciosN8N;
                
                // PASO 3: Detectar y notificar cambios específicos
                if (Object.keys(espaciosAnteriores).length > 0) {
                    detectarCambiosEspacios(espaciosAnteriores, espaciosGlobales);
                    showNotification('🔄 Sincronizado con otros dispositivos', 'success');
                } else {
                    console.log('🆕 Primera carga de datos');
                }
                
                // PASO 4: Actualizar interfaz inmediatamente
                actualizarInterfazConEspacios();
                
                // PASO 5: Actualizar hash
                lastSpacesHash = newHash;
                
                console.log('✅ Interfaz actualizada con cambios');
                
                // PASO 6: Guardar en localStorage para cache local (solo en producción)
                if (IS_PRODUCTION) {
                    try {
                        localStorage.setItem('espaciosGlobales', JSON.stringify(espaciosGlobales));
                        localStorage.setItem('lastSyncTime', new Date().toISOString());
                        console.log('💾 Datos guardados en localStorage');
                    } catch (e) {
                        console.warn('⚠️ No se pudo guardar en localStorage:', e);
                    }
                }
                
            } else {
                console.log('ℹ️ Sin cambios desde la última sincronización');
                espaciosGlobales = espaciosN8N;
            }
            
            lastSyncTime = new Date();
            updateSyncStatus('conectado');
            syncRetryCount = 0; // Reset retry counter on success
            
            // VERIFICACIÓN ADICIONAL: Asegurar que la interfaz muestra datos correctos
            const currentAvailableSpaces = document.getElementById('availableSpaces');
            if (currentAvailableSpaces && selectedDate) {
                const fechaStr = selectedDate.toISOString().split('T')[0];
                const espaciosParaFecha = espaciosGlobales[fechaStr] || 8;
                if (parseInt(currentAvailableSpaces.textContent) !== espaciosParaFecha) {
                    console.log(`🔧 Corrigiendo espacios mostrados: ${currentAvailableSpaces.textContent} → ${espaciosParaFecha}`);
                    currentAvailableSpaces.textContent = espaciosParaFecha;
                }
            }
            
        } else {
            throw new Error('No se pudieron obtener datos de N8N');
        }
        
    } catch (error) {
        console.error('❌ Error en sincronización:', error);
        syncRetryCount++;
        
        if (syncRetryCount <= MAX_SYNC_RETRIES) {
            updateSyncStatus('reintentando');
            showNotification(`⚠️ Error de sincronización, reintentando... (${syncRetryCount}/${MAX_SYNC_RETRIES})`, 'warning');
            
            // Retry with exponential backoff
            const retryDelay = Math.min(5000 * Math.pow(2, syncRetryCount - 1), 30000);
            setTimeout(() => {
                console.log(`🔄 Reintentando sincronización en ${retryDelay/1000}s...`);
                sincronizarEspaciosGlobal();
            }, retryDelay);
        } else {
            updateSyncStatus('desconectado');
            showNotification('❌ Error de sincronización. Activando modo de emergencia...', 'error');
            
            // ACTIVAR SINCRONIZACIÓN DE EMERGENCIA AUTOMÁTICAMENTE
            console.log('🚨 Activando sincronización de emergencia por fallos consecutivos');
            setTimeout(async () => {
                await forzarSincronizacionEmergencia();
            }, 2000);
            
            // Reset retry count after some time
            setTimeout(() => {
                syncRetryCount = 0;
                console.log('🔄 Reiniciando contador de reintentos');
            }, 60000); // Reset after 1 minute
        }
    }
}

// Función para obtener espacios desde N8N (backend centralizado)
async function obtenerEspaciosDesdeN8N() {
    try {
        console.log('📡 Consultando espacios en N8N...');
        console.log('🔍 URL N8N:', N8N_SPACES_URL);
        
        const payload = {
            action: 'get_spaces',
            timestamp: Date.now(),
            cache_buster: CACHE_BUSTER + '_' + Date.now(),
            source: IS_PRODUCTION ? 'mobile' : 'desktop',
            device_id: generateDeviceId()
        };
        
        console.log('📤 Enviando payload a N8N:', payload);
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: N8N no respondió en 10 segundos')), 10000);
        });
        
        // Create the fetch promise
        const fetchPromise = fetch(N8N_SPACES_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            body: JSON.stringify(payload)
        });
        
        // Race between fetch and timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        console.log('📥 Respuesta de N8N:', {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers ? Array.from(response.headers.entries()) : 'No headers'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('📦 Datos recibidos de N8N:', data);
            
            // Si N8N devuelve datos válidos, usarlos
            if (data && data.espacios && typeof data.espacios === 'object') {
                console.log('✅ Espacios obtenidos de N8N:', Object.keys(data.espacios).length);
                return data.espacios;
            }
            
            // Si N8N no tiene datos, inicializar con espacios por defecto
            console.log('⚠️ N8N sin datos, inicializando espacios...');
            const espaciosIniciales = inicializarEspaciosPorDefecto();
            await guardarEspaciosEnN8N(espaciosIniciales);
            return espaciosIniciales;
            
        } else {
            const errorText = await response.text().catch(() => 'Sin texto de error');
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
    } catch (error) {
        console.error('❌ Error obteniendo espacios de N8N:', error);
        console.error('🔍 Detalles del error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // Si es un error de red, proporcionar más información
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.error('🌐 Error de red: Verifica la conectividad a internet y que N8N esté disponible');
        }
        
        return null;
    }
}

// Función para guardar espacios en N8N (backend centralizado)
async function guardarEspaciosEnN8N(espacios) {
    try {
        console.log('💾 Guardando espacios en N8N...', Object.keys(espacios).length, 'fechas');
        
        const payload = {
            action: 'save_spaces',
            espacios: espacios,
            timestamp: Date.now(),
            cache_buster: CACHE_BUSTER + '_' + Date.now(),
            source: IS_PRODUCTION ? 'mobile' : 'desktop',
            device_id: generateDeviceId()
        };
        
        const response = await fetch(N8N_SPACES_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            console.log('✅ Espacios guardados en N8N exitosamente');
            return true;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ Error guardando espacios en N8N:', error);
        return false;
    }
}

// Función CRÍTICA: hacer reserva con sincronización inmediata
// FUNCIÓN MEJORADA DE RESERVA UNIVERSAL
async function hacerReservaEnServidor(reservaData) {
    console.log('🎯 Procesando reserva universal con sincronización...');
    console.log('📋 Datos recibidos:', reservaData);
    
    try {
        // Usar el nuevo endpoint /api/reservas que maneja todo automáticamente
        console.log('🌐 Enviando reserva al backend:', SERVER_URL || 'LOCAL');
        
        const endpoint = SERVER_URL ? `${SERVER_URL}/api/reservas` : '/api/reservas';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
                fecha: reservaData.fecha,
                nombre: reservaData.name,
                telefono: reservaData.phone,
                marca_vehiculo: reservaData.carBrand,
                modelo_vehiculo: reservaData.carModel,
                tamano_vehiculo: reservaData.carSize,
                servicios: reservaData.services,
                precio_total: reservaData.price,
                notas: reservaData.notas || ''
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                console.log('✅ Reserva creada exitosamente - Backend maneja BD + N8N automáticamente');
                
                // 🔥 SINCRONIZACIÓN AUTOMÁTICA: Usar datos del backend
                if (data.espaciosRestantes !== undefined) {
                    const fechaStr = reservaData.fecha;
                    const espaciosAnteriores = espaciosGlobales[fechaStr] || 8;
                    espaciosGlobales[fechaStr] = data.espaciosRestantes;
                    
                    console.log(`📊 SINCRONIZACIÓN AUTOMÁTICA: ${fechaStr}`);
                    console.log(`   • Espacios anteriores: ${espaciosAnteriores}`);
                    console.log(`   • Espacios actuales: ${data.espaciosRestantes}`);
                    console.log(`   • Estado espaciosGlobales:`, espaciosGlobales);
                    
                    // Actualizar interfaz inmediatamente
                    actualizarInterfazConEspacios();
                    
                    // Actualizar también localStorage para persistencia
                    localStorage.setItem('espaciosGlobales', JSON.stringify(espaciosGlobales));
                    
                    showNotification(`🔄 Espacios actualizados: ${data.espaciosRestantes} disponibles para ${fechaStr}`, 'success');
                }
                
                // Información de sincronización para otros dispositivos
                if (data.sync) {
                    console.log('📡 Datos de sincronización:', data.sync);
                    
                    // Forzar sincronización en otros dispositivos después de un breve delay
                    setTimeout(async () => {
                        console.log('📢 Activando sincronización en red...');
                        await sincronizarEspaciosUniversal();
                    }, 2000);
                }
                
                return {
                    success: true,
                    message: 'Reserva creada exitosamente',
                    reservationId: data.reservationId,
                    data: data.data,
                    espaciosRestantes: data.espaciosRestantes,
                    sync: data.sync
                };
            } else {
                throw new Error(data.message || 'Error en la reserva');
            }
        } else {
            throw new Error(`Error HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ Error en reserva:', error.message);
        
        // Fallback: mostrar error y permitir reintento
        throw new Error(`Error al procesar reserva: ${error.message}`);
    }
}

// Función para crear reserva en N8N
async function crearReservaEnN8N(reservaData) {
    try {
        console.log('📝 Creando reserva en N8N...');
        
        const payload = {
            action: 'create_reservation',
            reserva: reservaData,
            timestamp: Date.now(),
            cache_buster: CACHE_BUSTER + '_' + Date.now(),
            source: IS_PRODUCTION ? 'mobile' : 'desktop'
        };
        
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            console.log('✅ Reserva creada en N8N');
            return { success: true };
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ Error creando reserva en N8N:', error);
        return { success: false, error: error.message };
    }
}

// Generar ID único del dispositivo
function generateDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = 'DEV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
}

// Función para actualizar la interfaz con los espacios
function actualizarInterfazConEspacios() {
    // Actualizar espacios en el calendario si hay una fecha seleccionada
    if (selectedDate) {
        const fechaStr = selectedDate.toISOString().split('T')[0];
        const espaciosDisponibles = espaciosGlobales[fechaStr] || 8;
        const espaciosAnteriores = availableSpaces;
        availableSpaces = espaciosDisponibles;
        
        if (availableSpacesElement) {
            availableSpacesElement.textContent = espaciosDisponibles;
            
            // Animar si hay cambios
            if (espaciosAnteriores !== espaciosDisponibles) {
                availableSpacesElement.style.animation = 'none';
                void availableSpacesElement.offsetWidth;
                availableSpacesElement.style.animation = 'pulse 0.5s ease-in-out';
                
                // Mostrar notificación de cambio
                if (espaciosAnteriores > espaciosDisponibles) {
                    showNotification(`📉 Espacio reservado: ${espaciosDisponibles} disponibles`, 'info');
                } else if (espaciosAnteriores < espaciosDisponibles) {
                    showNotification(`📈 Espacio liberado: ${espaciosDisponibles} disponibles`, 'success');
                }
            }
        }
    }
    
    // Actualizar visualización del calendario
    actualizarCalendarioConEspacios();
}

// Función para detectar cambios en espacios
function detectarCambiosEspacios(espaciosAnteriores, espaciosNuevos) {
    let cambiosDetectados = 0;
    
    for (const fecha in espaciosNuevos) {
        const espaciosAntes = espaciosAnteriores[fecha];
        const espaciosAhora = espaciosNuevos[fecha];
        
        if (espaciosAntes !== undefined && espaciosAntes !== espaciosAhora) {
            console.log(`🔄 Cambio detectado en ${fecha}: ${espaciosAntes} → ${espaciosAhora}`);
            cambiosDetectados++;
        }
    }
    
    if (cambiosDetectados > 0) {
        console.log(`✨ ${cambiosDetectados} cambios sincronizados desde otros dispositivos`);
        showNotification(`🔄 ${cambiosDetectados} cambios sincronizados`, 'info');
    }
}

// Función para actualizar estado de sincronización
function updateSyncStatus(status) {
    const syncStatusElement = document.getElementById('sync-status');
    if (!syncStatusElement) return;
    
    // Actualizar texto y clase
    const statusInfo = {
        'conectado': { 
            text: '🟢 Sincronizado', 
            class: 'conectado',
            title: `Última sincronización: ${lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Nunca'}`
        },
        'desconectado': { 
            text: '🔴 Sin conexión', 
            class: 'desconectado',
            title: 'No se puede conectar con el servidor. Usando datos locales.'
        },
        'sincronizando': { 
            text: '🟡 Sincronizando...', 
            class: 'sincronizando',
            title: 'Obteniendo últimos datos del servidor...'
        },
        'reintentando': { 
            text: `🔄 Reintentando (${syncRetryCount}/${MAX_SYNC_RETRIES})`, 
            class: 'reintentando',
            title: `Reintentando conexión. Intento ${syncRetryCount} de ${MAX_SYNC_RETRIES}`
        }
    };
    
    const info = statusInfo[status] || { text: '⚪ Desconocido', class: 'desconocido', title: 'Estado desconocido' };
    
    syncStatusElement.textContent = info.text;
    syncStatusElement.className = `sync-status ${info.class}`;
    syncStatusElement.title = info.title;
    
    // Guardar el estado global
    syncStatus = status;
    
    // Añadir clase de animación temporal para cambios importantes
    if (status === 'conectado' || status === 'desconectado') {
        syncStatusElement.style.animation = 'pulse 0.5s ease-in-out';
        setTimeout(() => {
            syncStatusElement.style.animation = '';
        }, 500);
    }
    
    console.log(`🔄 Estado de sincronización: ${info.text}`);
}

// Función para actualizar el calendario con espacios disponibles y animaciones
function actualizarCalendarioConEspacios() {
    const dayElements = document.querySelectorAll('.ios-calendar-day.available');
    
    dayElements.forEach(dayElement => {
        const dayNumberElement = dayElement.querySelector('.day-number');
        if (dayNumberElement) {
            const dayNumber = parseInt(dayNumberElement.textContent);
            const currentDate = new Date(currentYear, currentMonth, dayNumber);
            const fechaStr = currentDate.toISOString().split('T')[0];
            const espaciosDisponibles = espaciosGlobales[fechaStr] || 8;
            const espaciosAnteriores = dayElement.dataset.espacios;
            
            // Actualizar el texto del día con espacios disponibles
            dayElement.innerHTML = `
                <span class="day-number">${dayNumber}</span>
                <span class="spaces-available">${espaciosDisponibles}/8</span>
            `;
            
            // Animar si hay cambios
            if (espaciosAnteriores && parseInt(espaciosAnteriores) !== espaciosDisponibles) {
                dayElement.style.animation = 'none';
                void dayElement.offsetWidth;
                dayElement.style.animation = 'bounce 0.6s ease-in-out';
            }
            
            // Guardar espacios para detectar cambios futuros
            dayElement.dataset.espacios = espaciosDisponibles;
            
            // Cambiar estilo si no hay espacios disponibles
            if (espaciosDisponibles <= 0) {
                dayElement.classList.add('no-spaces');
                dayElement.classList.remove('available');
                dayElement.disabled = true;
            } else {
                dayElement.classList.remove('no-spaces');
                dayElement.classList.add('available');
                dayElement.disabled = false;
            }
        }
    });
}

// Función para inicializar espacios por defecto
function inicializarEspaciosPorDefecto() {
    const espacios = {};
    const hoy = new Date();
    
    // Generar espacios para los próximos 12 miércoles
    for (let i = 0; i < 12; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() + (3 - hoy.getDay() + 7 * i) % 7 + 7 * Math.floor(i / 1));
        
        // Ajustar para obtener el próximo miércoles si es antes del día actual
        while (fecha <= hoy) {
            fecha.setDate(fecha.getDate() + 7);
        }
        
        const fechaStr = fecha.toISOString().split('T')[0];
        espacios[fechaStr] = 8; // 8 espacios disponibles por defecto
    }
    
    console.log('📅 Espacios inicializados:', Object.keys(espacios).length, 'fechas');
    return espacios;
}

// Función de diagnóstico para problemas de sincronización
window.diagnosticarSincronizacion = async function() {
    console.log('🔧 === DIAGNÓSTICO DE SINCRONIZACIÓN ===');
    
    // 1. Verificar configuración
    console.log('1️⃣ Configuración:');
    console.log('   • Entorno:', IS_PRODUCTION ? 'PRODUCCIÓN' : 'DESARROLLO');
    console.log('   • Hostname:', window.location.hostname);
    console.log('   • URL N8N Spaces:', N8N_SPACES_URL);
    console.log('   • Server URL:', SERVER_URL);
    
    // 2. Verificar conectividad a N8N
    console.log('\n2️⃣ Probando conectividad a N8N...');
    try {
        const startTime = Date.now();
        const response = await fetch(N8N_SPACES_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'ping', timestamp: Date.now() })
        });
        const endTime = Date.now();
        
        console.log('   ✅ N8N responde');
        console.log('   • Status:', response.status);
        console.log('   • Tiempo respuesta:', endTime - startTime, 'ms');
        console.log('   • Headers:', Array.from(response.headers.entries()));
    } catch (error) {
        console.log('   ❌ Error conectividad N8N:', error.message);
    }
    
    // 3. Verificar estado actual
    console.log('\n3️⃣ Estado actual:');
    console.log('   • Espacios globales:', Object.keys(espaciosGlobales).length, 'fechas');
    console.log('   • Última sincronización:', lastSyncTime);
    console.log('   • Estado sync:', syncStatus);
    console.log('   • Reintentos fallidos:', syncRetryCount);
    console.log('   • Reserva en progreso:', isReservationInProgress);
    
    // 4. Probar sincronización manual
    console.log('\n4️⃣ Probando sincronización manual...');
    await sincronizarEspaciosGlobal();
    
    console.log('\n✅ Diagnóstico completado. Revisa los logs para detalles.');
};

// SISTEMA DE SINCRONIZACIÓN UNIVERSAL MEJORADO
function inicializarSincronizacionAutomatica() {
    console.log('🔄 Inicializando sistema de sincronización universal...');
    
    // Limpiar interval anterior si existe
    if (syncInterval) {
        clearInterval(syncInterval);
        console.log('🧹 Interval anterior limpiado');
    }
    
    // Sincronización inicial inmediata
    setTimeout(async () => {
        console.log('🚀 Ejecutando sincronización inicial...');
        await sincronizarEspaciosUniversal();
        
        // Configurar sincronización automática más agresiva para reservas
        syncInterval = setInterval(async () => {
            await sincronizarEspaciosUniversal();
        }, 2000); // Cada 2 segundos para mayor responsividad
        
        console.log('✅ Sincronización universal configurada (cada 2 segundos)');
    }, 1000);
    
    // Sincronización cuando la ventana recibe foco
    window.addEventListener('focus', () => {
        console.log('🔄 Ventana con foco, sincronizando...');
        setTimeout(sincronizarEspaciosUniversal, 300);
    });
    
    // Sincronización cuando la página se vuelve visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('🔄 Página visible, sincronizando...');
            setTimeout(sincronizarEspaciosUniversal, 300);
        }
    });
    
    // Sincronización cuando hay cambio de red
    window.addEventListener('online', () => {
        console.log('🌐 Conexión restaurada, sincronizando...');
        setTimeout(sincronizarEspaciosUniversal, 500);
        // También sincronizar reservas offline
        setTimeout(sincronizarReservasOffline, 1000);
    });
    
    // Añadir función de diagnóstico al objeto window
    if (typeof window !== 'undefined') {
        console.log('🔧 Función de diagnóstico disponible: diagnosticarSincronizacion()');
    }
    
    console.log('✅ Sistema de sincronización universal inicializado');
}

// FUNCIÓN DE SINCRONIZACIÓN UNIVERSAL PARA RESERVAS
async function sincronizarEspaciosUniversal() {
    // ARREGLADO: Eliminar bloqueo que impedía sincronización
    // La sincronización debe funcionar SIEMPRE para mantener dispositivos actualizados
    
    try {
        console.log('🔄 SINCRONIZACIÓN SÚPER ROBUSTA ACTIVADA...');
        updateSyncStatus('sincronizando');
        
        // PASO 1: Intentar backend centralizado PRIMERO (NUEVO SISTEMA DE ESPACIOS)
        if (SERVER_URL) {
            try {
                console.log('🌐 Intentando backend centralizado con nuevos endpoints:', SERVER_URL);
                
                // Usar el nuevo endpoint de espacios mejorado
                const backendResponse = await fetch(`${SERVER_URL}/api/espacios`, {
                    method: 'GET',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'X-Sync-Type': 'universal'
                    }
                });
                
                if (backendResponse.ok) {
                    const backendData = await backendResponse.json();
                    
                    if (backendData.success && backendData.espacios) {
                        console.log('✅ Sincronización exitosa con backend centralizado (nuevos endpoints)');
                        
                        // Los espacios ya vienen en el formato correcto (fecha: número)
                        espaciosGlobales = backendData.espacios;
                        actualizarInterfazConEspacios();
                        updateSyncStatus('conectado');
                        lastSyncTime = Date.now();
                        
                        console.log(`📊 Espacios sincronizados: ${Object.keys(espaciosGlobales).length} fechas`);
                        console.log('📋 Detalle espacios:', espaciosGlobales);
                        
                        showNotification('🔄 Espacios sincronizados en tiempo real', 'success');
                        return;
                    }
                }
            } catch (backendError) {
                console.log('⚠️ Backend centralizado no disponible, intentando N8N...', backendError.message);
            }
        }
        
        // PASO 2: Fallback a N8N si backend no responde
        const payload = {
            action: 'get_universal_spaces',
            timestamp: Date.now(),
            cache_buster: 'UNIVERSAL_' + Date.now(),
            source: IS_PRODUCTION ? 'production' : 'development',
            device_id: generateDeviceId()
        };
        
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Sync-Type': 'universal'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('📦 Respuesta universal:', data);
            
            // PASO 2: Verificar si hay espacios actualizados en la respuesta
            let espaciosActualizados = null;
            
            // Buscar espacios en diferentes formatos de respuesta
            if (data && data.espacios && typeof data.espacios === 'object') {
                espaciosActualizados = data.espacios;
            } else if (data && data.spaces && typeof data.spaces === 'object') {
                espaciosActualizados = data.spaces;
            } else if (data && data.data && data.data.espacios) {
                espaciosActualizados = data.data.espacios;
            }
            
            // PASO 3: Si no hay datos de espacios en N8N, usar los datos locales actuales
            if (!espaciosActualizados) {
                console.log('ℹ️ N8N no devolvió espacios, manteniendo datos locales');
                espaciosActualizados = espaciosGlobales;
            }
            
            // PASO 4: Detectar y aplicar cambios
            const newHash = JSON.stringify(espaciosActualizados);
            const hasChanges = newHash !== lastSpacesHash;
            
            if (hasChanges) {
                console.log('🔄 Cambios detectados en espacios universales');
                
                // Detectar cambios específicos
                const espaciosAnteriores = { ...espaciosGlobales };
                espaciosGlobales = espaciosActualizados;
                
                // Mostrar qué cambió
                Object.keys(espaciosActualizados).forEach(fecha => {
                    if (espaciosAnteriores[fecha] !== espaciosActualizados[fecha]) {
                        console.log(`📅 ${fecha}: ${espaciosAnteriores[fecha] || 8} → ${espaciosActualizados[fecha]}`);
                    }
                });
                
                // Actualizar interfaz
                actualizarInterfazConEspacios();
                lastSpacesHash = newHash;
                
                showNotification('🔄 Espacios actualizados desde otro dispositivo', 'info');
            } else {
                console.log('ℹ️ Sin cambios en espacios universales');
            }
            
            lastSyncTime = new Date();
            updateSyncStatus('conectado');
            syncRetryCount = 0;
            
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ Error en sincronización universal:', error);
        syncRetryCount++;
        
        if (syncRetryCount <= MAX_SYNC_RETRIES) {
            updateSyncStatus('reintentando');
            
            const retryDelay = Math.min(3000 * Math.pow(2, syncRetryCount - 1), 15000);
            setTimeout(() => {
                console.log(`🔄 Reintentando sincronización en ${retryDelay/1000}s...`);
                sincronizarEspaciosUniversal();
            }, retryDelay);
        } else {
            updateSyncStatus('desconectado');
            
            // Reset después de 30 segundos en lugar de 60
            setTimeout(() => {
                syncRetryCount = 0;
                console.log('🔄 Reiniciando contador de reintentos');
            }, 30000);
        }
    }
}

// Inicializar espacios en el servidor
async function inicializarEspaciosEnServidor() {
    if (SERVER_URL) {
        // Modo desarrollo - inicializar en servidor backend
        try {
            const response = await fetch(`${SERVER_URL}/api/inicializar-espacios`, {
                method: 'POST'
            });
            if (response.ok) {
                console.log('✅ Espacios inicializados en el servidor');
            }
        } catch (error) {
            console.error('Error inicializando espacios:', error);
        }
    } else {
        // Modo producción - inicializar localmente
        console.log('📱 Inicializando espacios para dispositivo móvil...');
        
        // Verificar si ya existen espacios en localStorage
        const espaciosExistentes = localStorage.getItem('espaciosGlobales');
        if (!espaciosExistentes) {
            // Inicializar espacios por defecto
            const espaciosIniciales = inicializarEspaciosPorDefecto();
            localStorage.setItem('espaciosGlobales', JSON.stringify(espaciosIniciales));
            espaciosGlobales = espaciosIniciales;
            console.log('✅ Espacios inicializados localmente para móvil');
        } else {
            // Cargar espacios existentes
            espaciosGlobales = JSON.parse(espaciosExistentes);
            console.log('✅ Espacios cargados desde localStorage para móvil');
        }
    }
}

// LIMPIEZA CONSERVADORA de mensajes azules específicos
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando sistema Errekalde Car Wash...');
    
    // SOLO LIMPIEZA - NO DUPLICAR INICIALIZACIÓN
    // La inicialización principal ya se hizo en el primer DOMContentLoaded
    
    // Limpieza conservadora de mensajes azules específicos
    const cleanUpBlueMessages = () => {
        console.log('🧹 Limpieza conservadora de mensajes azules...');
        
        // Buscar solo el mensaje específico problemático
        document.querySelectorAll('p, div, span').forEach(element => {
            const text = element.textContent || '';
            
            // Solo eliminar el mensaje exacto que causa problemas
            if (text.includes('💡 Selecciona UN tipo de limpieza + OPCIONALMENTE UN pulido de faro') ||
                text.includes('Solo puedes elegir un faro a la vez')) {
                console.log('🗑️ ELIMINANDO mensaje azul específico:', element);
                element.remove();
            }
        });
    };
    
    // Ejecutar limpieza básica
    setTimeout(cleanUpBlueMessages, 100);
    setTimeout(cleanUpBlueMessages, 500);
    setTimeout(cleanUpBlueMessages, 1000);
    
    console.log('✅ Sistema iniciado correctamente con sincronización universal');
});

// FUNCIÓN PARA SINCRONIZAR RESERVAS OFFLINE
async function sincronizarReservasOffline() {
    try {
        const reservasOffline = JSON.parse(localStorage.getItem('reservas_offline') || '[]');
        
        if (reservasOffline.length === 0) {
            console.log('ℹ️ No hay reservas offline para sincronizar');
            return;
        }
        
        console.log(`🔄 Sincronizando ${reservasOffline.length} reservas offline...`);
        
        const reservasSincronizadas = [];
        const reservasFallidas = [];
        
        for (const reserva of reservasOffline) {
            try {
                console.log(`📤 Sincronizando reserva offline: ${reserva.id}`);
                
                const resultado = await hacerReservaEnServidor(reserva);
                
                if (resultado.success) {
                    reservasSincronizadas.push(reserva);
                    console.log(`✅ Reserva sincronizada: ${reserva.id}`);
                } else {
                    reservasFallidas.push(reserva);
                    console.warn(`⚠️ Falló sincronización: ${reserva.id}`);
                }
                
            } catch (error) {
                console.error(`❌ Error sincronizando reserva ${reserva.id}:`, error);
                reservasFallidas.push(reserva);
            }
        }
        
        // Actualizar localStorage solo con las reservas que fallaron
        localStorage.setItem('reservas_offline', JSON.stringify(reservasFallidas));
        
        if (reservasSincronizadas.length > 0) {
            showNotification(`✅ ${reservasSincronizadas.length} reservas offline sincronizadas`, 'success');
        }
        
        if (reservasFallidas.length > 0) {
            showNotification(`⚠️ ${reservasFallidas.length} reservas pendientes de sincronización`, 'warning');
        }
        
    } catch (error) {
        console.error('❌ Error en sincronización de reservas offline:', error);
    }
}

// FUNCIÓN PARA MOSTRAR ESTADÍSTICAS DE RESERVAS
window.mostrarEstadisticasReservas = function() {
    const reservasOffline = JSON.parse(localStorage.getItem('reservas_offline') || '[]');
    const totalEspacios = Object.keys(espaciosGlobales).length;
    const espaciosOcupados = Object.values(espaciosGlobales).reduce((total, espacios) => total + (8 - espacios), 0);
    
    console.log('📊 ESTADÍSTICAS DE RESERVAS');
    console.log('═'.repeat(50));
    console.log(`📅 Fechas disponibles: ${totalEspacios}`);
    console.log(`🚗 Espacios ocupados: ${espaciosOcupados}`);
    console.log(`💾 Reservas offline pendientes: ${reservasOffline.length}`);
    console.log(`🕐 Última sincronización: ${lastSyncTime ? lastSyncTime.toLocaleString() : 'Nunca'}`);
    console.log(`📡 Estado: ${syncStatus}`);
    console.log('═'.repeat(50));
    
    if (reservasOffline.length > 0) {
        console.log('📋 Reservas offline pendientes:');
        reservasOffline.forEach(reserva => {
            console.log(`   • ${reserva.id} - ${reserva.name} - ${reserva.fecha}`);
        });
    }
    
    return {
        fechasDisponibles: totalEspacios,
        espaciosOcupados: espaciosOcupados,
        reservasOffline: reservasOffline.length,
        ultimaSync: lastSyncTime,
        estado: syncStatus
    };
};

// Exportar funciones para testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRICES,
        VEHICLE_DATABASE,
        generateVerificationCode,
        isValidPhone,
        detectVehicleSize
    };
} 

// ===== SISTEMA DE SINCRONIZACIÓN DE EMERGENCIA =====

// SISTEMA DE SINCRONIZACIÓN DE EMERGENCIA SIN N8N
window.forzarSincronizacionEmergencia = async function() {
    console.log('🚨 ACTIVANDO SINCRONIZACIÓN DE EMERGENCIA (SIN N8N) 🚨');
    
    // 1. Limpiar cache local completamente
    try {
        localStorage.removeItem('espaciosGlobales');
        localStorage.removeItem('lastSyncTime');
        localStorage.removeItem('reservas');
        console.log('🧹 Cache local limpiado completamente');
    } catch (e) {
        console.log('⚠️ No se pudo limpiar localStorage:', e);
    }
    
    // 2. Resetear variables globales
    espaciosGlobales = {};
    lastSpacesHash = '';
    lastSyncTime = null;
    syncRetryCount = 0;
    
    console.log('🔄 Variables globales reseteadas');
    
    // 3. Crear espacios unificados con timestamp único
    const timestampUnico = Date.now();
    const espaciosUnificados = {};
    
    // Generar fechas de los próximos 12 miércoles con timestamp
    const hoy = new Date();
    for (let i = 0; i < 12; i++) {
        const fecha = new Date(hoy);
        const daysUntilWednesday = (3 - fecha.getDay() + 7) % 7;
        fecha.setDate(fecha.getDate() + daysUntilWednesday + (i * 7));
        
        if (fecha > hoy) {
            const fechaStr = fecha.toISOString().split('T')[0];
            espaciosUnificados[fechaStr] = 8; // Resetear a 8 espacios
        }
    }
    
    console.log('📅 Espacios unificados creados:', Object.keys(espaciosUnificados).length, 'fechas');
    
    // 4. Guardar con timestamp único para sincronización
    try {
        const syncData = {
            espacios: espaciosUnificados,
            timestamp: timestampUnico,
            lastUpdate: new Date().toISOString(),
            syncId: Math.random().toString(36).substr(2, 9)
        };
        
        localStorage.setItem('espaciosGlobales_unified', JSON.stringify(syncData));
        localStorage.setItem('sync_timestamp', timestampUnico.toString());
        console.log('💾 Datos unificados guardados con timestamp:', timestampUnico);
    } catch (e) {
        console.warn('⚠️ No se pudo guardar en localStorage:', e);
    }
    
    // 5. Aplicar espacios unificados
    espaciosGlobales = espaciosUnificados;
    actualizarInterfazConEspacios();
    updateSyncStatus('conectado');
    
    console.log('✅ Sincronización de emergencia completada');
    showNotification('🚨 Sincronización de emergencia: Todos los dispositivos ahora tienen los mismos datos', 'success');
    
    // 6. Mostrar instrucciones al usuario
    const instrucciones = `
🔧 SINCRONIZACIÓN DE EMERGENCIA ACTIVADA

✅ Datos unificados aplicados
📱 Ejecuta este MISMO comando en todos tus dispositivos
⏰ Timestamp único: ${timestampUnico}

Para sincronizar otros dispositivos:
1. Abre la consola (F12) en cada dispositivo
2. Ejecuta: forzarSincronizacionEmergencia()
3. Verifica que todos muestren el mismo timestamp

🎯 Todos los dispositivos tendrán 8 espacios por miércoles
`;
    
    console.log(instrucciones);
    alert('✅ Sincronización completada!\n\nEjecuta este mismo comando en tus otros dispositivos.\n\nVer consola para más detalles.');
    
    return {
        success: true,
        timestamp: timestampUnico,
        espacios: Object.keys(espaciosUnificados).length,
        message: 'Ejecuta forzarSincronizacionEmergencia() en todos los dispositivos'
    };
};

// Función para detectar y corregir desincronización automáticamente
window.detectarDesincronizacion = async function() {
    console.log('🔍 Detectando posible desincronización...');
    
    // Obtener datos de múltiples fuentes para comparar
    const sources = [];
    
    // Source 1: N8N directo
    try {
        const n8nData = await obtenerEspaciosDesdeN8N();
        if (n8nData) {
            sources.push({ name: 'N8N', data: n8nData, hash: JSON.stringify(n8nData) });
        }
    } catch (e) {
        console.log('⚠️ No se pudo obtener datos de N8N:', e);
    }
    
    // Source 2: Datos actuales
    sources.push({ 
        name: 'Local', 
        data: espaciosGlobales, 
        hash: JSON.stringify(espaciosGlobales) 
    });
    
    // Source 3: localStorage si existe
    try {
        const localData = localStorage.getItem('espaciosGlobales');
        if (localData) {
            const parsed = JSON.parse(localData);
            sources.push({ name: 'LocalStorage', data: parsed, hash: JSON.stringify(parsed) });
        }
    } catch (e) {
        console.log('⚠️ No hay datos en localStorage válidos');
    }
    
    console.log('📊 Fuentes de datos encontradas:', sources.length);
    sources.forEach(source => {
        console.log(`   • ${source.name}: ${Object.keys(source.data).length} fechas`);
    });
    
    // Detectar diferencias
    const hashes = sources.map(s => s.hash);
    const uniqueHashes = [...new Set(hashes)];
    
    if (uniqueHashes.length > 1) {
        console.log('⚠️ DESINCRONIZACIÓN DETECTADA - múltiples versiones de datos');
        console.log('🚨 Activando sincronización de emergencia automática...');
        await forzarSincronizacionEmergencia();
        return true;
    } else {
        console.log('✅ Todas las fuentes están sincronizadas');
        return false;
    }
};

// ===== SISTEMA DE SINCRONIZACIÓN VERDADERA CON N8N =====

// ====== SISTEMA DE SINCRONIZACIÓN AUTOMÁTICA EN TIEMPO REAL ======

// Función para inicializar sincronización automática
function iniciarSincronizacionAutomatica() {
    console.log('🔄 Iniciando sincronización automática en tiempo real...');
    
    // Detectar actividad del usuario para ajustar frecuencia de sincronización
    ['click', 'keydown', 'touchstart', 'mousemove'].forEach(event => {
        document.addEventListener(event, () => {
            lastUserActivity = Date.now();
            ajustarFrecuenciaSincronizacion();
        }, { passive: true });
    });
    
    // Iniciar polling adaptativo
    ajustarFrecuenciaSincronizacion();
    
    // Sincronización cuando la ventana recupera el foco
    window.addEventListener('focus', () => {
        console.log('👁️ Ventana activa, sincronizando...');
        sincronizarEspaciosUniversal();
    });
    
    // Sincronización antes de que el usuario se vaya
    window.addEventListener('beforeunload', () => {
        if (syncInterval) {
            clearInterval(syncInterval);
        }
    });
}

// Ajustar frecuencia de sincronización según actividad
function ajustarFrecuenciaSincronizacion() {
    const tiempoInactivo = Date.now() - lastUserActivity;
    let nuevoIntervalo = SYNC_CONFIG.INTERVAL_NORMAL;
    let nuevoModo = 'normal';
    
    if (tiempoInactivo < 30000) { // Activo en últimos 30 segundos
        nuevoIntervalo = SYNC_CONFIG.INTERVAL_FAST;
        nuevoModo = 'fast';
    } else if (tiempoInactivo > 300000) { // Inactivo por más de 5 minutos
        nuevoIntervalo = SYNC_CONFIG.INTERVAL_SLOW;
        nuevoModo = 'slow';
    }
    
    // Solo cambiar si es diferente
    if (nuevoModo !== currentSyncMode) {
        if (syncInterval) {
            clearInterval(syncInterval);
        }
        
        currentSyncMode = nuevoModo;
        syncInterval = setInterval(sincronizarEspaciosAutomatico, nuevoIntervalo);
        
        console.log(`⏱️ Sincronización ajustada a modo: ${nuevoModo} (${nuevoIntervalo}ms)`);
    }
}

// Función de sincronización automática (mejorada)
async function sincronizarEspaciosAutomatico() {
    try {
        // Usar el endpoint principal de espacios para sincronización automática
        if (SERVER_URL) {
            const response = await fetch(`${SERVER_URL}/api/espacios`, {
                method: 'GET',
                headers: { 
                    'Cache-Control': 'no-cache',
                    'X-Sync-Auto': 'true'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.espacios) {
                    // Detectar si hay cambios comparando con el estado actual
                    const cambiosDetectados = [];
                    let hayDiferencias = false;
                    
                    Object.keys(data.espacios).forEach(fecha => {
                        const espaciosNuevos = data.espacios[fecha];
                        const espaciosActuales = espaciosGlobales[fecha];
                        
                        if (espaciosActuales !== espaciosNuevos) {
                            cambiosDetectados.push({
                                fecha,
                                anterior: espaciosActuales || 8,
                                nuevo: espaciosNuevos
                            });
                            hayDiferencias = true;
                        }
                    });
                    
                    if (hayDiferencias) {
                        console.log(`🔄 Cambios detectados automáticamente:`, cambiosDetectados);
                        
                        // Actualizar espacios globales
                        espaciosGlobales = { ...espaciosGlobales, ...data.espacios };
                        
                        // Actualizar interfaz
                        actualizarInterfazConEspacios();
                        
                        // Actualizar localStorage
                        localStorage.setItem('espaciosGlobales', JSON.stringify(espaciosGlobales));
                        
                        // Notificación discreta solo si hay muchos cambios
                        if (cambiosDetectados.length > 1) {
                            showNotification(`🔄 ${cambiosDetectados.length} espacios actualizados automáticamente`, 'info', 3000);
                        }
                    }
                } else {
                    console.warn('⚠️ Respuesta de sincronización sin datos válidos:', data);
                }
            } else {
                console.warn('⚠️ Error en sincronización automática:', response.status);
            }
        }
    } catch (error) {
        // Fallos silenciosos en sincronización automática
        console.warn('⚠️ Fallo silencioso en sincronización automática:', error.message);
    }
}

// Modificar la inicialización existente para incluir sincronización automática
const originalInicializarSistema = window.inicializarSistema;
if (typeof originalInicializarSistema === 'function') {
    window.inicializarSistema = async function() {
        await originalInicializarSistema();
        iniciarSincronizacionAutomatica();
    };
} else {
    // Si no existe, crear función de inicialización
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof inicializarSistema === 'function') {
            inicializarSistema();
        }
        iniciarSincronizacionAutomatica();
    });
}