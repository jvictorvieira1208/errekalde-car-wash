const fs = require('fs').promises;

async function inicializarEspacios() {
    try {
        console.log('🚗 Inicializando espacios para Errekalde Car Wash...');
        
        // Leer datos actuales
        let data;
        try {
            const fileContent = await fs.readFile('reservas.json', 'utf8');
            data = JSON.parse(fileContent);
        } catch (error) {
            data = { espacios: {}, reservas: [] };
        }
        
        const hoy = new Date();
        const espacios = {};
        
        // Generar fechas de los próximos 12 miércoles
        for (let i = 0; i < 12; i++) {
            const fecha = new Date(hoy);
            const daysUntilWednesday = (3 - fecha.getDay() + 7) % 7;
            fecha.setDate(fecha.getDate() + daysUntilWednesday + (i * 7));
            
            if (fecha > hoy) {
                const fechaStr = fecha.toISOString().split('T')[0];
                espacios[fechaStr] = 8;
                console.log(`   📅 ${fechaStr} (miércoles): 8 espacios`);
            }
        }
        
        // Actualizar datos
        data.espacios = { ...data.espacios, ...espacios };
        
        // Guardar archivo
        await fs.writeFile('reservas.json', JSON.stringify(data, null, 2));
        
        console.log(`\n✅ Espacios inicializados correctamente!`);
        console.log(`📊 Total de fechas configuradas: ${Object.keys(espacios).length}`);
        console.log(`📅 Próximas fechas disponibles:`);
        
        Object.keys(espacios).slice(0, 5).forEach(fecha => {
            const date = new Date(fecha);
            const diaSemana = date.toLocaleDateString('es-ES', { weekday: 'long' });
            console.log(`   - ${fecha} (${diaSemana}): 8 espacios`);
        });
        
        console.log(`\n🎯 Sistema listo para sincronización global!`);
        
    } catch (error) {
        console.error('❌ Error inicializando espacios:', error);
    }
}

// Ejecutar inicialización
inicializarEspacios(); 