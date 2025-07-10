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

// Configuración del servidor
const SERVER_URL = 'http://localhost:3001';

// Elementos del DOM
const pages = document.querySelectorAll('.page');
const navSteps = document.querySelectorAll('.nav-step');
const calendarDays = document.getElementById('calendarDays');
const currentMonthElement = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const selectedDateElement = document.getElementById('selectedDate');
const availableSpacesElement = document.getElementById('availableSpaces');

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    initializeCalendar();
    updateNavigation();
    
    // Inicializar sistema de sincronización
    inicializarSincronizacion();
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
                <p class="card-subtitle">Elige un tipo de limpieza:</p>
                <ul>
                    <li data-service="interior" data-price="${prices.interior}">Limpieza interior <strong>${prices.interior}€</strong></li>
                    <li data-service="exterior" data-price="${prices.exterior}">Limpieza exterior <strong>${prices.exterior}€</strong></li>
                    <li data-service="complete" data-price="${prices.complete}">Limpieza completa <strong>${prices.complete}€</strong></li>
                    <li data-service="complete-fabric" data-price="${prices['complete-fabric']}">Limpieza completa con tapicería <strong>${prices['complete-fabric']}€</strong></li>
                </ul>
            </div>
            <div class="pricing-card farol-card">
                <h3><i class="fas fa-lightbulb"></i> Pulido de Faros (Opcional)</h3>
                <p class="card-subtitle">✅ Elige solo UNO (se puede combinar con limpieza):</p>
                <ul>
                    <li data-service="headlight-1" data-price="${PRICES.headlight['headlight-1']}">Un faro <strong>${PRICES.headlight['headlight-1']}€</strong></li>
                    <li data-service="headlight-2" data-price="${PRICES.headlight['headlight-2']}">Dos faros <strong>${PRICES.headlight['headlight-2']}€</strong></li>
                </ul>
            </div>
        </div>
        
        <div class="notes-section">
            <h3><i class="fas fa-sticky-note"></i> Notas</h3>
            <p class="notes-subtitle">¿Alguna información adicional sobre tu vehículo? (Opcional)</p>
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
        // Crear un mapa de precios directo para evitar cualquier problema con DOM
        const servicePrices = {
            'interior': reservationData.carSize === 'small' ? 23 : reservationData.carSize === 'medium' ? 25 : 28,
            'exterior': reservationData.carSize === 'small' ? 20 : reservationData.carSize === 'medium' ? 22 : 25,
            'complete': reservationData.carSize === 'small' ? 40 : reservationData.carSize === 'medium' ? 45 : 50,
            'complete-fabric': reservationData.carSize === 'small' ? 85 : reservationData.carSize === 'medium' ? 95 : 105,
            'headlight-1': 35,
            'headlight-2': 60
        };
        
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
            const price = servicePrices[serviceType] || 0;
            
            return `<div class="selected-service-item">• ${cleanName} ${price}€</div>`;
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
            if (webhookResult.error) {
                console.warn('Webhook falló pero reserva confirmada:', webhookResult.error);
            } else {
                console.log('WhatsApp enviado exitosamente');
            }
        } catch (webhookError) {
            console.error('Error en webhook (no crítico):', webhookError);
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
    
    const response = await fetch(N8N_VALIDATION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        throw new Error('Error en la comunicación con n8n');
    }
    
    return response.json();
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
    
    // Enviar a través del servidor backend (evita problemas CORS)
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

// ===== SISTEMA DE SINCRONIZACIÓN GLOBAL MEJORADO =====

// Función para sincronizar espacios disponibles con indicadores visuales
async function sincronizarEspaciosGlobal() {
    try {
        // Actualizar estado a sincronizando
        updateSyncStatus('sincronizando');
        
        const response = await fetch(`${SERVER_URL}/api/sync-espacios`);
        if (response.ok) {
            const data = await response.json();
            const espaciosAnteriores = { ...espaciosGlobales };
            espaciosGlobales = data.espacios;
            lastSyncTime = new Date();
            
            // Detectar cambios y notificar
            detectarCambiosEspacios(espaciosAnteriores, espaciosGlobales);
            
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
                    }
                }
            }
            
            // Actualizar visualización del calendario
            actualizarCalendarioConEspacios();
            
            // Estado exitoso
            updateSyncStatus('conectado');
            
        } else {
            throw new Error(`Error HTTP: ${response.status}`);
        }
    } catch (error) {
        console.error('Error en sincronización:', error);
        updateSyncStatus('desconectado');
        
        // Reintentar después de 10 segundos si hay error
        setTimeout(() => {
            console.log('🔄 Reintentando sincronización...');
            sincronizarEspaciosGlobal();
        }, 10000);
    }
}

// Función para detectar cambios en espacios (sin notificaciones)
function detectarCambiosEspacios(espaciosAnteriores, espaciosNuevos) {
    // Solo detectar cambios internamente, sin mostrar notificaciones
    for (const fecha in espaciosNuevos) {
        const espaciosAntes = espaciosAnteriores[fecha];
        const espaciosAhora = espaciosNuevos[fecha];
        
        if (espaciosAntes !== undefined && espaciosAntes !== espaciosAhora) {
            console.log(`Cambio detectado en ${fecha}: ${espaciosAntes} → ${espaciosAhora}`);
        }
    }
}

// Función para actualizar estado de sincronización (sin indicadores visuales)
function updateSyncStatus(status) {
    syncStatus = status;
    // Solo mantener el estado interno, sin mostrar indicadores visuales
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

// Función mejorada para hacer una reserva en el servidor
async function hacerReservaEnServidor(reservaData) {
    try {
        // Sincronización rápida antes de reservar
        updateSyncStatus('sincronizando');
        
        const response = await fetch(`${SERVER_URL}/api/reservar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reservaData)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Sincronización inmediata después de reserva exitosa
            await sincronizarEspaciosGlobal();
            
            // Sincronización adicional después de 2 segundos para asegurar propagación
            setTimeout(sincronizarEspaciosGlobal, 2000);
            
            console.log('✅ Reserva confirmada y sincronizada globalmente');
            return result;
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Error al hacer la reserva');
        }
    } catch (error) {
        updateSyncStatus('desconectado');
        throw error;
    }
}

// Función para obtener espacios disponibles para una fecha específica
async function obtenerEspaciosDisponibles(fecha) {
    try {
        const fechaStr = fecha.toISOString().split('T')[0];
        const response = await fetch(`${SERVER_URL}/api/espacios/${fechaStr}`);
        if (response.ok) {
            const data = await response.json();
            return data.espacios;
        }
    } catch (error) {
        console.error('Error obteniendo espacios:', error);
    }
    return 8; // Valor por defecto
}

// Inicializar sincronización automática mejorada
function inicializarSincronizacion() {
    console.log('🔄 Iniciando sistema de sincronización global mejorado...');
    
    // Sincronizar al cargar la página
    sincronizarEspaciosGlobal();
    
    // Sincronización regular cada 5 segundos
    setInterval(sincronizarEspaciosGlobal, 5000);
    
    // Sincronización cuando la página vuelve a tener foco
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('🔄 Página activa - Sincronización inmediata');
            sincronizarEspaciosGlobal();
        }
    });
    
    // Sincronización cuando se restaura la conexión
    window.addEventListener('online', function() {
        console.log('🌐 Conexión restaurada - Sincronización inmediata');
        sincronizarEspaciosGlobal();
    });
    
    // Detectar pérdida de conexión
    window.addEventListener('offline', function() {
        console.log('❌ Conexión perdida');
        updateSyncStatus('desconectado');
    });
}

// Inicializar espacios en el servidor
async function inicializarEspaciosEnServidor() {
    try {
        const response = await fetch(`${SERVER_URL}/api/inicializar-espacios`, {
            method: 'POST'
        });
        if (response.ok) {
            console.log('Espacios inicializados en el servidor');
        }
    } catch (error) {
        console.error('Error inicializando espacios:', error);
    }
}

// LIMPIEZA CONSERVADORA de mensajes azules específicos
document.addEventListener('DOMContentLoaded', function() {
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
    
    console.log('✅ Sistema de limpieza conservadora activado');
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