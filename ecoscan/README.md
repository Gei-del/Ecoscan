# EcoScan 🌿

**Aplicación móvil web para identificar y clasificar residuos**
Proyecto académico: GA3-220501101-AA1-EV01

---

## Estructura del proyecto

```
ecoscan/
├── index.html          # Aplicación principal
├── manifest.json       # PWA manifest
├── .htaccess           # Headers de seguridad (Apache)
├── _headers            # Headers de seguridad (Netlify)
├── vercel.json         # Configuración Vercel
├── css/
│   └── styles.css      # Estilos completos
├── js/
│   ├── data.js         # Base de datos de materiales
│   ├── storage.js      # Persistencia local (localStorage)
│   ├── scanner.js      # Módulo de cámara y análisis
│   ├── ui.js           # Renderizado y navegación
│   └── app.js          # Controlador principal
└── assets/
    ├── icon-192.png    # Ícono PWA (por generar)
    └── icon-512.png    # Ícono PWA (por generar)
```

---

## Despliegue rápido

### Netlify (recomendado — gratis)
1. Crea una cuenta en [netlify.com](https://netlify.com)
2. Arrastra la carpeta `ecoscan/` al panel de Netlify
3. ¡Listo! Obtienes una URL pública con HTTPS automático

### Vercel (alternativa — gratis)
```bash
npm i -g vercel
cd ecoscan
vercel
```

### GitHub Pages (alternativa — gratis)
1. Sube el contenido a un repositorio GitHub
2. En Settings → Pages → selecciona la rama `main`
3. Accede en `https://[usuario].github.io/[repo]`

### Servidor propio (Apache)
1. Copia los archivos al directorio raíz del servidor
2. El archivo `.htaccess` aplica los headers de seguridad automáticamente
3. Asegúrate de que `mod_headers` y `mod_deflate` estén activos

---

## Seguridad implementada

| Medida | Descripción |
|--------|-------------|
| CSP | Content Security Policy estricta — bloquea scripts externos no autorizados |
| X-Frame-Options: DENY | Previene ataques de clickjacking |
| X-Content-Type-Options | Previene sniffing de tipos MIME |
| Permissions-Policy | Desactiva APIs del navegador no necesarias |
| Referrer-Policy | Controla información de origen en peticiones |
| Sin APIs externas | Toda la lógica corre localmente en el navegador |
| Sin cookies | Sin tracking, sin sesiones en servidor |
| localStorage seguro | Datos locales solo en el dispositivo del usuario |

---

## Funcionalidades

- **4 pantallas**: Splash, Inicio, Escaneo, Resultado, Historial
- **Cámara real**: Accede a la cámara del dispositivo via `getUserMedia`
- **Galería**: Analiza imágenes subidas desde el dispositivo
- **Cámara frontal/trasera**: Flip de cámara
- **Linterna**: Control de flash/torch (donde disponible)
- **8 materiales**: Plástico, Vidrio, Papel, Cartón, Metal, Orgánico, Electrónico, Peligroso
- **Historial local**: Guarda hasta 50 escaneos en localStorage
- **Estadísticas**: Contador de escaneos y racha de días
- **PWA**: Instalable como app en Android/iOS
- **Accesible**: ARIA labels, roles, navegación por teclado
- **Responsive**: Mobile-first, funciona en escritorio como demo

---

## Para el video académico

1. Abre la app en el celular o en Chrome DevTools (modo móvil)
2. Ve a Escanear → presiona el botón de captura
3. La app simula el análisis con un resultado aleatorio realista
4. Muestra el resultado con el material, contenedor y pasos
5. Guarda en historial y muestra las estadísticas

---

*Desarrollado por el equipo EcoScan · SENA · 2024*
