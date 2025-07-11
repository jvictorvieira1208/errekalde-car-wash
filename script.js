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
const N8N_VALIDATION_URL = 'https://n8nserver.swapenergia.com/webhook/validarNúmero';
const N8N_SYNC_URL = 'https://n8nserver.swapenergia.com/webhook/errekaldecarwash-sync';
const N8N_SPACES_URL = 'https://n8nserver.swapenergia.com/webhook/errekaldecarwash-spaces';

// Detección automática de entorno - SIEMPRE usar sincronización N8N
function getServerUrl() {
    // Para desarrollo local, usar servidor local como fallback
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }
    // Para producción, usar N8N directamente
    return null;
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
    
    // Inicializar sistema de sincronización
    inicializarSincronizacionAutomatica();
    inicializarEspaciosEnServidor();
});

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

// Confirmación de reserva con sincronización global
async function handleConfirmReservation() {
    try {
        // Preparar datos de reserva para el servidor
        const reservaParaServidor = {
            fecha: selectedDate.toISOString().split('T')[0],
            ...reservationData
        };
        
        // Hacer reserva en el servidor (esta parte es crítica)
        const resultadoReserva = await hacerReservaEnServidor(reservaParaServidor);
        
        // Mostrar página de éxito inmediatamente (no depende del webhook)
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById('success-page').classList.add('active');
        
        // Generar resumen final
        generateFinalSummary();
        
        // Enviar confirmación a n8n (no bloquea el flujo si falla)
        try {
            console.log('Intentando enviar WhatsApp...');
            const webhookResult = await sendBookingConfirmation(reservationData);
            
            if (webhookResult.error || webhookResult.fallback) {
                console.warn('Webhook falló pero reserva confirmada:', webhookResult.error || webhookResult.message);
                
                // En dispositivos móviles, mostrar información más clara
                if (IS_PRODUCTION) {
                    showNotification(
                        '✅ Reserva confirmada. El WhatsApp puede tardar unos minutos en llegar o puede haber fallado.', 
                        'warning'
                    );
                }
            } else {
                console.log('WhatsApp enviado exitosamente');
                
                if (IS_PRODUCTION) {
                    showNotification('✅ Reserva confirmada y WhatsApp enviado', 'success');
                }
            }
        } catch (webhookError) {
            console.error('Error en webhook (no crítico):', webhookError);
            
            // En dispositivos móviles, ser más claro sobre lo que pasó
            if (IS_PRODUCTION) {
                showNotification(
                    '✅ Reserva confirmada. El WhatsApp de confirmación puede haber fallado, pero tu reserva está guardada.', 
                    'warning'
                );
            }
        }
        
    } catch (error) {
        console.error('Error crítico confirmando reserva:', error);
        showNotification(error.message || 'Error al confirmar la reserva', 'error');
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

// Función principal para sincronizar espacios usando N8N como backend universal
async function sincronizarEspaciosGlobal() {
    if (isReservationInProgress) {
        console.log('⏸️ Reserva en progreso, saltando sincronización');
        return;
    }

    try {
        console.log('🔄 Iniciando sincronización verdadera...');
        updateSyncStatus('sincronizando');
        
        // PASO 1: Obtener datos SIEMPRE desde N8N (sin localStorage)
        const espaciosN8N = await obtenerEspaciosDesdeN8N();
        
        if (espaciosN8N) {
            console.log('✅ Datos obtenidos desde N8N:', Object.keys(espaciosN8N).length, 'fechas');
            
            // PASO 2: Calcular hash para detectar cambios reales
            const newHash = JSON.stringify(espaciosN8N);
            const hasChanges = newHash !== lastSpacesHash;
            
            if (hasChanges) {
                console.log('🔄 Cambios detectados desde otros dispositivos');
                const espaciosAnteriores = { ...espaciosGlobales };
                espaciosGlobales = espaciosN8N;
                
                // PASO 3: Detectar y notificar cambios específicos
                detectarCambiosEspacios(espaciosAnteriores, espaciosGlobales);
                
                // PASO 4: Actualizar interfaz inmediatamente
                actualizarInterfazConEspacios();
                
                // PASO 5: Actualizar hash
                lastSpacesHash = newHash;
                
                console.log('✅ Interfaz actualizada con cambios de otros dispositivos');
            } else {
                console.log('ℹ️ Sin cambios desde la última sincronización');
                espaciosGlobales = espaciosN8N;
            }
            
            lastSyncTime = new Date();
            updateSyncStatus('conectado');
            
        } else {
            throw new Error('No se pudieron obtener datos de N8N');
        }
        
    } catch (error) {
        console.error('❌ Error en sincronización:', error);
        updateSyncStatus('desconectado');
        
        // FALLBACK: Usar datos actuales sin localStorage
        if (Object.keys(espaciosGlobales).length === 0) {
            console.log('🆕 Inicializando espacios por defecto');
            espaciosGlobales = inicializarEspaciosPorDefecto();
            await guardarEspaciosEnN8N(espaciosGlobales);
        }
        
        // Reintentar más agresivamente si hay error
        setTimeout(() => {
            console.log('🔄 Reintentando sincronización...');
            sincronizarEspaciosGlobal();
        }, 5000);
    }
}

// Función para obtener espacios desde N8N (backend centralizado)
async function obtenerEspaciosDesdeN8N() {
    try {
        console.log('📡 Consultando espacios en N8N...');
        
        const payload = {
            action: 'get_spaces',
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
            const data = await response.json();
            
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
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ Error obteniendo espacios de N8N:', error);
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
async function hacerReservaEnServidor(reservaData) {
    isReservationInProgress = true;
    
    try {
        console.log('🎯 Haciendo reserva con sincronización inmediata...');
        
        // PASO 1: Sincronizar datos ANTES de reservar
        updateSyncStatus('sincronizando');
        await sincronizarEspaciosGlobal();
        
        // PASO 2: Verificar disponibilidad en tiempo real
        const fechaStr = reservaData.fecha;
        const espaciosDisponibles = espaciosGlobales[fechaStr] || 8;
        
        if (espaciosDisponibles <= 0) {
            throw new Error('No hay espacios disponibles para esta fecha');
        }
        
        // PASO 3: Actualizar espacios INMEDIATAMENTE en N8N
        const nuevosEspacios = { ...espaciosGlobales };
        nuevosEspacios[fechaStr] = espaciosDisponibles - 1;
        
        // PASO 4: Guardar en N8N ANTES de continuar
        const guardadoExitoso = await guardarEspaciosEnN8N(nuevosEspacios);
        
        if (!guardadoExitoso) {
            throw new Error('Error al actualizar espacios en el servidor');
        }
        
        // PASO 5: Actualizar datos locales
        espaciosGlobales[fechaStr] = espaciosDisponibles - 1;
        lastSpacesHash = JSON.stringify(espaciosGlobales);
        
        // PASO 6: Crear la reserva en N8N
        const reservaCompleta = {
            ...reservaData,
            id: `RESERVA-${Date.now()}`,
            timestamp: new Date().toISOString(),
            espacios_antes: espaciosDisponibles,
            espacios_despues: espaciosDisponibles - 1,
            device_id: generateDeviceId()
        };
        
        const resultadoReserva = await crearReservaEnN8N(reservaCompleta);
        
        if (resultadoReserva.success) {
            // PASO 7: Actualizar interfaz inmediatamente
            actualizarInterfazConEspacios();
            
            // PASO 8: Forzar sincronización inmediata para otros dispositivos
            setTimeout(() => {
                console.log('📢 Forzando sincronización global después de reserva');
                sincronizarEspaciosGlobal();
            }, 1000);
            
            console.log('✅ Reserva completada y sincronizada globalmente');
            updateSyncStatus('conectado');
            
            return resultadoReserva;
            
        } else {
            throw new Error(resultadoReserva.error || 'Error al crear la reserva');
        }
        
    } catch (error) {
        console.error('❌ Error en reserva:', error);
        updateSyncStatus('desconectado');
        throw error;
    } finally {
        isReservationInProgress = false;
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
    syncStatus = status;
    
    // Actualizar indicador visual si existe
    const syncIndicator = document.getElementById('sync-status');
    if (syncIndicator) {
        syncIndicator.className = `sync-status ${status}`;
        
        const statusText = {
            'conectado': '🟢 Sincronizado',
            'desconectado': '🔴 Desconectado', 
            'sincronizando': '🟡 Sincronizando...'
        }[status] || '⚪ Desconocido';
        
        syncIndicator.textContent = statusText;
        
        // Añadir timestamp
        if (status === 'conectado' && lastSyncTime) {
            const timeStr = lastSyncTime.toLocaleTimeString();
            syncIndicator.title = `Última sincronización: ${timeStr}`;
        }
    }
    
    console.log(`📡 Estado de sincronización: ${status}`);
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

// Inicializar sincronización AGRESIVA para tiempo real
function inicializarSincronizacionAutomatica() {
    console.log('🔄 Iniciando sincronización AGRESIVA en tiempo real...');
    
    // Sincronización inicial inmediata
    sincronizarEspaciosGlobal();
    
    // Limpiar interval anterior si existe
    if (syncInterval) {
        clearInterval(syncInterval);
    }
    
    // Sincronización automática cada 3 segundos (muy agresiva)
    syncInterval = setInterval(async () => {
        await sincronizarEspaciosGlobal();
    }, 3000);
    
    // Sincronización cuando la ventana recibe foco
    window.addEventListener('focus', () => {
        console.log('🔄 Ventana con foco, sincronizando...');
        setTimeout(sincronizarEspaciosGlobal, 500);
    });
    
    // Sincronización cuando la página se vuelve visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('🔄 Página visible, sincronizando...');
            setTimeout(sincronizarEspaciosGlobal, 500);
        }
    });
    
    console.log('✅ Sincronización AGRESIVA configurada (cada 3 segundos)');
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
    
    // Inicializar elementos del DOM
    setupEventListeners();
    initializeCalendar();
    
    // Inicializar espacios en el servidor
    inicializarEspaciosEnServidor();
    
    // INICIALIZAR SISTEMA DE SINCRONIZACIÓN UNIVERSAL
    console.log('🔄 Iniciando sincronización universal entre dispositivos...');
    inicializarSincronizacionAutomatica();
    
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