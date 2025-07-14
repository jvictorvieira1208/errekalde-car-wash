# 🚀 Despliegue en Render.com - Errekalde Car Wash

**Guía rápida para desplegar el backend con base de datos PostgreSQL centralizada**

## 🎯 Objetivo

Desplegar un backend público que permita sincronización de reservas desde **todos los dispositivos** usando la **misma base de datos centralizada**.

## 📋 Resumen del Despliegue

### **✅ Lo que conseguiremos:**
- Backend público en: `https://errekalde-car-wash-backend.onrender.com`
- Base de datos PostgreSQL centralizada en la nube
- Sincronización automática entre móviles, tablets y PCs
- API REST completa para reservas y espacios

### **🔧 Tecnologías:**
- **Backend**: Node.js + Express.js
- **Base de Datos**: PostgreSQL (Render)
- **Frontend**: JavaScript vanilla (ya desplegado en Surge)
- **Hosting**: Render.com (plan gratuito)

## 🚀 Pasos Rápidos

### **1. Preparar código**
```bash
git add .
git commit -m "Backend listo para producción"
git push origin main
```

### **2. Crear en Render.com**
1. **PostgreSQL Database** → `errekalde-car-wash-db`
2. **Web Service** → `errekalde-car-wash-backend`

### **3. Variables de entorno**
```
DATABASE_URL=postgresql://[URL-DE-RENDER]
DB_TYPE=postgresql
NODE_ENV=production
```

### **4. Ejecutar esquema SQL**
Ejecutar `schema-postgresql.sql` en la base de datos

### **5. Actualizar frontend**
Ya está configurado para usar el backend desplegado automáticamente.

## 📊 URLs Finales

- **Frontend**: https://errekalde-car-wash.surge.sh
- **Backend**: https://errekalde-car-wash-backend.onrender.com
- **Health Check**: https://errekalde-car-wash-backend.onrender.com/api/health

## 📖 Documentación Completa

Ver `DEPLOY-BACKEND.md` para instrucciones paso a paso detalladas.

## ✅ Resultado

Después del despliegue:
- ✅ Todos los dispositivos usan la misma base de datos
- ✅ Sincronización en tiempo real (2-3 segundos)
- ✅ Reservas centralizadas y universales
- ✅ Sistema escalable y profesional 