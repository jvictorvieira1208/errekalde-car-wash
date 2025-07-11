/**
 * Errekalde Car Wash - Sistema de Reservas con Sincronización en Tiempo Real
 * Symfony 6.4 + MariaDB + Mercure WebSockets
 */

class CarWashApp {
    constructor() {
        this.currentPage = 1;
        this.selectedDate = null;
        this.availableSpaces = 8;
        this.verificationCode = '';
        this.isVerified = false;
        this.reservationData = {
            date: null,
            clientName: '',
            phone: '',
            carBrand: '',
            carModel: '',
            carSize: '',
            services: [],
            serviceNames: [],
            price: 0,
            notes: ''
        };

        // Configuración desde Symfony
        this.config = window.APP_CONFIG || {};
        this.apiBaseUrl = this.config.apiBaseUrl || '/api';
        this.mercureConfig = this.config.mercureConfig || {};
        
        // Estado de sincronización
        this.syncStatus = 'disconnected';
        this.espaciosGlobales = {};
        this.lastSyncTime = null;
        this.mercureEventSource = null;
        this.deviceId = this.generateDeviceId();
        
        this.init();
    }

    init() {
        console.log('🚗 Iniciando Errekalde Car Wash - Symfony Edition');
        
        this.setupEventListeners();
        this.initializeCalendar();
        this.updateNavigation();
        this.loadAvailableSpaces();
        this.initializeMercureConnection();
        
        console.log('✅ Sistema iniciado correctamente');
    }

    setupEventListeners() {
        // Navegación de páginas
        document.querySelectorAll('[id^="nextToPage"], [id^="prevToPage"]').forEach(btn => {
            btn.addEventListener('click', (e) => this.handlePageNavigation(e));
        });

        // Navegación del calendario
        document.getElementById('prevMonth')?.addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth')?.addEventListener('click', () => this.changeMonth(1));

        // Navegación por pasos
        document.querySelectorAll('.nav-step').forEach(step => {
            step.addEventListener('click', () => {
                const pageNum = parseInt(step.dataset.page);
                if (this.canNavigateToPage(pageNum)) {
                    this.goToPage(pageNum);
                }
            });
        });

        // Formularios
        document.getElementById('sendCode')?.addEventListener('click', () => this.handleSendCode());
        document.getElementById('verifyCode')?.addEventListener('click', () => this.handleVerifyCode());
        document.getElementById('resendCode')?.addEventListener('click', () => this.handleResendCode());
        document.getElementById('confirmReservation')?.addEventListener('click', () => this.handleConfirmReservation());
        document.getElementById('newReservation')?.addEventListener('click', () => this.handleNewReservation());

        // Detección de tamaño de vehículo
        document.getElementById('carBrand')?.addEventListener('input', () => this.detectVehicleSize());
        document.getElementById('carModel')?.addEventListener('input', () => this.detectVehicleSize());
        
        // Validación de teléfono
        document.getElementById('phone')?.addEventListener('input', () => this.validatePhone());
        document.getElementById('clientName')?.addEventListener('input', () => this.validateClientName());
    }

    handlePageNavigation(e) {
        const buttonId = e.target.id;
        let targetPage;

        if (buttonId.includes('nextToPage')) {
            targetPage = parseInt(buttonId.replace('nextToPage', ''));
        } else if (buttonId.includes('prevToPage')) {
            targetPage = parseInt(buttonId.replace('prevToPage', ''));
        }

        if (targetPage && this.canNavigateToPage(targetPage)) {
            this.goToPage(targetPage);
        }
    }

    canNavigateToPage(pageNum) {
        switch (pageNum) {
            case 1: return true;
            case 2: return this.selectedDate !== null;
            case 3: return true;
            case 4: return this.isVerified && this.reservationData.carSize;
            case 5: return this.reservationData.services.length > 0;
            default: return false;
        }
    }

    goToPage(pageNum) {
        // Ocultar página actual
        const currentPageEl = document.querySelector('.page.active');
        if (currentPageEl) {
            currentPageEl.classList.remove('active');
        }

        // Mostrar página objetivo
        const nextPageEl = document.getElementById(`page-${pageNum}`);
        if (nextPageEl) {
            nextPageEl.classList.add('active');
        }

        this.currentPage = pageNum;
        this.updateNavigation();

        // Ejecutar acciones específicas de la página
        switch (pageNum) {
            case 4:
                this.loadPricingSection();
                break;
            case 5:
                this.generateReservationSummary();
                break;
        }
    }

    updateNavigation() {
        document.querySelectorAll('.nav-step').forEach((step, index) => {
            const pageNum = index + 1;
            step.classList.remove('active', 'completed');
            
            if (pageNum === this.currentPage) {
                step.classList.add('active');
            } else if (pageNum < this.currentPage) {
                step.classList.add('completed');
            }
        });
    }

    initializeCalendar() {
        const today = new Date();
        this.currentMonth = today.getMonth();
        this.currentYear = today.getFullYear();
        this.renderCalendar();
    }

    renderCalendar() {
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay() + 1); // Comenzar en lunes

        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        document.getElementById('currentMonth').textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;

        const calendarDays = document.getElementById('calendarDays');
        calendarDays.innerHTML = '';

        for (let week = 0; week < 6; week++) {
            const weekRow = document.createElement('div');
            weekRow.className = 'row text-center mb-1';

            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + (week * 7) + day);

                const dayCol = document.createElement('div');
                dayCol.className = 'col';

                const dayButton = document.createElement('button');
                dayButton.className = 'calendar-day btn btn-sm';
                dayButton.textContent = currentDate.getDate();

                // Verificar si es miércoles y está en el mes actual
                const isWednesday = currentDate.getDay() === 3;
                const isCurrentMonth = currentDate.getMonth() === this.currentMonth;
                const isFuture = currentDate > new Date();
                const dateStr = currentDate.toISOString().split('T')[0];
                const hasSpaces = this.espaciosGlobales[dateStr] > 0;

                if (isWednesday && isCurrentMonth && isFuture && hasSpaces) {
                    dayButton.classList.add('available');
                    dayButton.addEventListener('click', () => this.selectDate(currentDate, dayButton));
                }

                dayCol.appendChild(dayButton);
                weekRow.appendChild(dayCol);
            }

            calendarDays.appendChild(weekRow);
        }
    }

    async selectDate(date, dayElement) {
        // Desmarcar fecha anterior
        document.querySelectorAll('.calendar-day.selected').forEach(day => {
            day.classList.remove('selected');
        });

        // Marcar nueva fecha
        dayElement.classList.add('selected');
        this.selectedDate = date;

        // Actualizar información
        const dateStr = date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        document.getElementById('selectedDate').textContent = dateStr;
        
        // Obtener espacios disponibles para esta fecha
        const spaces = await this.getSpacesForDate(date);
        this.availableSpaces = spaces;
        document.getElementById('availableSpacesInfo').textContent = spaces;

        // Habilitar botón continuar
        document.getElementById('nextToPage2').disabled = false;
    }

    async getSpacesForDate(date) {
        try {
            const dateStr = date.toISOString().split('T')[0];
            const response = await fetch(`${this.apiBaseUrl}/espacios/${dateStr}`);
            
            if (response.ok) {
                const data = await response.json();
                return data.space?.availableSpaces || 0;
            }
            
            return this.espaciosGlobales[dateStr] || 0;
        } catch (error) {
            console.error('Error obteniendo espacios para fecha:', error);
            return 0;
        }
    }

    changeMonth(delta) {
        this.currentMonth += delta;
        
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        
        this.renderCalendar();
    }

    validatePhone() {
        const phoneInput = document.getElementById('phone');
        const phone = phoneInput.value.trim();
        const sendCodeBtn = document.getElementById('sendCode');
        
        const isValid = /^\+34[6789]\d{8}$/.test(phone);
        
        if (isValid) {
            phoneInput.classList.remove('is-invalid');
            phoneInput.classList.add('is-valid');
            sendCodeBtn.disabled = false;
        } else {
            phoneInput.classList.remove('is-valid');
            if (phone.length > 0) {
                phoneInput.classList.add('is-invalid');
            }
            sendCodeBtn.disabled = true;
        }
        
        return isValid;
    }

    validateClientName() {
        const nameInput = document.getElementById('clientName');
        const name = nameInput.value.trim();
        
        if (name.length >= 2) {
            nameInput.classList.remove('is-invalid');
            nameInput.classList.add('is-valid');
            this.reservationData.clientName = name;
            return true;
        } else {
            nameInput.classList.remove('is-valid');
            if (name.length > 0) {
                nameInput.classList.add('is-invalid');
            }
            return false;
        }
    }

    async handleSendCode() {
        const phone = document.getElementById('phone').value.trim();
        
        if (!this.validatePhone()) {
            this.showNotification('Formato de teléfono inválido', 'error');
            return;
        }

        try {
            this.showLoading(true);
            
            const code = this.generateVerificationCode();
            this.verificationCode = code;
            
            const response = await fetch(`${this.apiBaseUrl}/verificar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: phone,
                    action: 'send_code',
                    code: code
                })
            });

            this.showLoading(false);

            if (response.ok) {
                document.getElementById('verificationSection').style.display = 'block';
                document.getElementById('sendCode').disabled = true;
                this.showNotification(`Código enviado a ${phone}`, 'success');
                this.reservationData.phone = phone;
            } else {
                throw new Error('Error al enviar código');
            }

        } catch (error) {
            this.showLoading(false);
            console.error('Error enviando código:', error);
            this.showNotification('Error al enviar código. Inténtalo de nuevo.', 'error');
        }
    }

    async handleVerifyCode() {
        const phone = document.getElementById('phone').value.trim();
        const code = document.getElementById('verificationCode').value.trim();

        if (code.length !== 6) {
            this.showNotification('El código debe tener 6 dígitos', 'error');
            return;
        }

        try {
            this.showLoading(true);
            
            // Para esta demo, verificar contra el código generado localmente
            if (code === this.verificationCode) {
                this.isVerified = true;
                document.getElementById('verifyCode').textContent = '✓ Verificado';
                document.getElementById('verifyCode').classList.add('btn-success');
                document.getElementById('verifyCode').disabled = true;
                document.getElementById('verificationCode').disabled = true;
                
                this.showNotification('Teléfono verificado correctamente', 'success');
                this.updateContinueButton();
            } else {
                throw new Error('Código incorrecto');
            }

            this.showLoading(false);

        } catch (error) {
            this.showLoading(false);
            console.error('Error verificando código:', error);
            this.showNotification('Código incorrecto', 'error');
        }
    }

    detectVehicleSize() {
        const brand = document.getElementById('carBrand').value.toLowerCase();
        const model = document.getElementById('carModel').value.toLowerCase();
        
        let size = 'medium';
        let sizeText = 'Mediano';
        
        // Lógica de detección de tamaño
        const smallCars = ['mini', 'smart', 'fiat 500', 'toyota aygo', 'peugeot 108'];
        const largeCars = ['bmw x5', 'audi q7', 'mercedes ml', 'volkswagen touareg', 'range rover'];
        
        const carInfo = `${brand} ${model}`;
        
        if (smallCars.some(car => carInfo.includes(car))) {
            size = 'small';
            sizeText = 'Pequeño';
        } else if (largeCars.some(car => carInfo.includes(car))) {
            size = 'large';
            sizeText = 'Grande';
        }
        
        this.reservationData.carBrand = document.getElementById('carBrand').value;
        this.reservationData.carModel = document.getElementById('carModel').value;
        this.reservationData.carSize = size;
        
        document.getElementById('carSizeText').textContent = sizeText;
        this.updateContinueButton();
    }

    loadPricingSection() {
        const container = document.getElementById('servicesContainer');
        
        const services = [
            {
                id: 'complete',
                name: 'Lavado Completo',
                description: 'Lavado exterior, aspirado interior, llantas',
                price: 25,
                icon: 'fas fa-car-wash'
            },
            {
                id: 'exterior',
                name: 'Solo Exterior',
                description: 'Lavado exterior y llantas',
                price: 15,
                icon: 'fas fa-spray-can'
            },
            {
                id: 'premium',
                name: 'Premium',
                description: 'Lavado completo + encerado + aromatizante',
                price: 35,
                icon: 'fas fa-gem'
            }
        ];

        container.innerHTML = services.map(service => `
            <div class="service-card" data-service="${service.id}" data-price="${service.price}">
                <div class="row align-items-center">
                    <div class="col-2 text-center">
                        <i class="${service.icon} fa-2x text-primary"></i>
                    </div>
                    <div class="col-8">
                        <h5 class="mb-1">${service.name}</h5>
                        <p class="text-muted mb-0">${service.description}</p>
                    </div>
                    <div class="col-2 text-end">
                        <span class="h4 text-primary">${service.price}€</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Agregar eventos de selección
        container.querySelectorAll('.service-card').forEach(card => {
            card.addEventListener('click', () => this.selectService(card));
        });
    }

    selectService(serviceElement) {
        // Desmarcar otros servicios
        document.querySelectorAll('.service-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Marcar servicio seleccionado
        serviceElement.classList.add('selected');
        
        const serviceId = serviceElement.dataset.service;
        const price = parseInt(serviceElement.dataset.price);
        
        this.reservationData.services = [serviceId];
        this.reservationData.serviceNames = [serviceElement.querySelector('h5').textContent];
        this.reservationData.price = price;

        // Habilitar botón continuar
        document.getElementById('nextToPage5').disabled = false;
    }

    generateReservationSummary() {
        const summary = document.getElementById('reservationSummary');
        
        const dateFormatted = this.selectedDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        summary.innerHTML = `
            <h4 class="text-center mb-4">Resumen de tu Reserva</h4>
            <div class="row">
                <div class="col-md-6">
                    <h6><i class="fas fa-calendar me-2"></i>Fecha</h6>
                    <p>${dateFormatted}</p>
                    
                    <h6><i class="fas fa-user me-2"></i>Cliente</h6>
                    <p>${this.reservationData.clientName}</p>
                    
                    <h6><i class="fas fa-phone me-2"></i>Teléfono</h6>
                    <p>${this.reservationData.phone}</p>
                </div>
                <div class="col-md-6">
                    <h6><i class="fas fa-car me-2"></i>Vehículo</h6>
                    <p>${this.reservationData.carBrand} ${this.reservationData.carModel}</p>
                    
                    <h6><i class="fas fa-soap me-2"></i>Servicio</h6>
                    <p>${this.reservationData.serviceNames.join(', ')}</p>
                    
                    <h6><i class="fas fa-euro-sign me-2"></i>Precio Total</h6>
                    <p class="h4 text-primary">${this.reservationData.price}€</p>
                </div>
            </div>
        `;
    }

    async handleConfirmReservation() {
        try {
            this.showLoading(true);
            
            // Preparar datos de reserva
            const reservationPayload = {
                date: this.selectedDate.toISOString().split('T')[0],
                clientName: this.reservationData.clientName,
                phone: this.reservationData.phone,
                carBrand: this.reservationData.carBrand,
                carModel: this.reservationData.carModel,
                carSize: this.reservationData.carSize,
                services: this.reservationData.services,
                serviceNames: this.reservationData.serviceNames,
                price: this.reservationData.price,
                deviceId: this.deviceId,
                timestamp: new Date().toISOString()
            };

            const response = await fetch(`${this.apiBaseUrl}/reservar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reservationPayload)
            });

            const result = await response.json();
            this.showLoading(false);

            if (result.success) {
                // Mostrar página de confirmación
                this.goToPage(6);
                this.generateFinalSummary(result.reservation);
                this.showNotification('¡Reserva confirmada exitosamente!', 'success');
                
                // Actualizar espacios locales
                this.loadAvailableSpaces();
                
            } else {
                throw new Error(result.error || 'Error al confirmar reserva');
            }

        } catch (error) {
            this.showLoading(false);
            console.error('Error confirmando reserva:', error);
            this.showNotification(error.message, 'error');
        }
    }

    generateFinalSummary(reservation) {
        const summary = document.getElementById('finalSummary');
        
        summary.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title text-center">
                        <i class="fas fa-ticket-alt me-2"></i>
                        ID de Reserva: ${reservation.reservationId}
                    </h5>
                    <p class="text-center text-muted">
                        Conserva este número para cualquier consulta
                    </p>
                </div>
            </div>
        `;
    }

    handleNewReservation() {
        // Reiniciar aplicación
        this.currentPage = 1;
        this.selectedDate = null;
        this.isVerified = false;
        this.reservationData = {
            date: null,
            clientName: '',
            phone: '',
            carBrand: '',
            carModel: '',
            carSize: '',
            services: [],
            serviceNames: [],
            price: 0,
            notes: ''
        };

        // Limpiar formularios
        document.querySelectorAll('input').forEach(input => {
            input.value = '';
            input.classList.remove('is-valid', 'is-invalid');
            input.disabled = false;
        });

        document.getElementById('verificationSection').style.display = 'none';
        document.getElementById('sendCode').disabled = true;

        // Volver a página 1
        this.goToPage(1);
        this.renderCalendar();
    }

    updateContinueButton() {
        const nextBtn = document.getElementById('nextToPage4');
        if (nextBtn) {
            nextBtn.disabled = !(this.isVerified && 
                               this.reservationData.carBrand && 
                               this.reservationData.carModel && 
                               this.reservationData.carSize);
        }
    }

    // ===== SINCRONIZACIÓN EN TIEMPO REAL =====

    async loadAvailableSpaces() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/espacios`);
            
            if (response.ok) {
                const data = await response.json();
                this.espaciosGlobales = data.espacios || {};
                this.updateSyncStatus('connected');
                this.renderCalendar(); // Re-renderizar calendario con nuevos datos
                
                // Actualizar estadísticas en pantalla
                if (data.statistics) {
                    this.updateStatistics(data.statistics);
                }
            } else {
                throw new Error('Error cargando espacios');
            }
        } catch (error) {
            console.error('Error cargando espacios:', error);
            this.updateSyncStatus('disconnected');
        }
    }

    initializeMercureConnection() {
        if (!this.mercureConfig.mercure_url) {
            console.warn('Mercure no configurado');
            return;
        }

        try {
            const topics = Object.values(this.mercureConfig.topics || {});
            const url = new URL(this.mercureConfig.mercure_url);
            
            topics.forEach(topic => {
                url.searchParams.append('topic', topic);
            });

            this.mercureEventSource = new EventSource(url.toString());
            
            this.mercureEventSource.onopen = () => {
                console.log('✅ Conexión Mercure establecida');
                this.updateSyncStatus('connected');
            };

            this.mercureEventSource.onmessage = (event) => {
                this.handleMercureMessage(event);
            };

            this.mercureEventSource.onerror = (error) => {
                console.error('❌ Error en conexión Mercure:', error);
                this.updateSyncStatus('disconnected');
                
                // Reconectar después de 5 segundos
                setTimeout(() => {
                    if (this.mercureEventSource.readyState === EventSource.CLOSED) {
                        this.initializeMercureConnection();
                    }
                }, 5000);
            };

        } catch (error) {
            console.error('Error inicializando Mercure:', error);
        }
    }

    handleMercureMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'space_update':
                    this.handleSpaceUpdate(data.space);
                    break;
                case 'all_spaces_update':
                    this.handleAllSpacesUpdate(data.spaces);
                    break;
                case 'reservation_created':
                    this.handleReservationUpdate(data.reservation, 'created');
                    break;
                case 'sync_notification':
                    this.showNotification(data.message, data.notification_type);
                    break;
            }
        } catch (error) {
            console.error('Error procesando mensaje Mercure:', error);
        }
    }

    handleSpaceUpdate(space) {
        if (space && space.date) {
            this.espaciosGlobales[space.date] = space.availableSpaces;
            this.renderCalendar();
            
            console.log(`📊 Espacio actualizado: ${space.date} = ${space.availableSpaces}`);
        }
    }

    handleAllSpacesUpdate(spaces) {
        this.espaciosGlobales = spaces || {};
        this.renderCalendar();
        
        console.log('📊 Todos los espacios actualizados:', Object.keys(spaces).length, 'fechas');
    }

    handleReservationUpdate(reservation, action) {
        console.log(`🎫 Reserva ${action}:`, reservation.reservationId);
        
        if (action === 'created') {
            this.showNotification(`Nueva reserva para ${reservation.date}`, 'info');
        }
    }

    updateSyncStatus(status) {
        this.syncStatus = status;
        const indicator = document.getElementById('statusIndicator');
        const text = document.getElementById('statusText');
        const syncStatus = document.getElementById('syncStatus');
        
        if (!indicator || !text || !syncStatus) return;
        
        indicator.className = 'status-indicator';
        
        switch (status) {
            case 'connected':
                indicator.classList.add('status-connected');
                text.textContent = 'Conectado';
                syncStatus.style.display = 'block';
                setTimeout(() => syncStatus.style.display = 'none', 3000);
                break;
            case 'syncing':
                indicator.classList.add('status-syncing');
                text.textContent = 'Sincronizando...';
                syncStatus.style.display = 'block';
                break;
            case 'disconnected':
                indicator.classList.add('status-disconnected');
                text.textContent = 'Desconectado';
                syncStatus.style.display = 'block';
                break;
        }
    }

    updateStatistics(stats) {
        document.getElementById('totalDates').textContent = stats.totalDates || 0;
        document.getElementById('availableSpaces').textContent = stats.availableSpaces || 0;
    }

    // ===== UTILIDADES =====

    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    generateDeviceId() {
        let deviceId = localStorage.getItem('car_wash_device_id');
        if (!deviceId) {
            deviceId = 'WEB_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('car_wash_device_id', deviceId);
        }
        return deviceId;
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Mostrar con animación
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'block' : 'none';
        }
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.carWashApp = new CarWashApp();
}); 