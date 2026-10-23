# Running Night Upetecista Neón 2026 · Resultados y diplomas

Aplicación web responsiva para consultar los resultados oficiales de la carrera **5K Abierta** y ver el **diploma** de cada participante.

Funciona sin internet, sin instalación y sin servidor: solo abre `index.html` en el navegador.

## En línea

- **Sitio publicado:** https://running-night-uptc-sogamoso-2026.netlify.app
- **Repositorio:** https://github.com/vijumolo/RunningNigthUptcSogamoso2026

---

## Cómo abrirla

### Opción 1 · Directa (recomendada)
Haz doble clic en **`Abrir App.bat`** o directamente en **`index.html`**.

### Opción 2 · Servidor local (si el navegador bloquea descargas)
Haz doble clic en **`Abrir con servidor.bat`**. Se abrirá:

```
http://localhost:8123/
```

Para detener el servidor, cierra la ventana de la consola o presiona `Ctrl + C`.

---

## Qué incluye

- **94 participantes** (41 damas y 53 hombres) de la categoría **5K Abierta**.
- Buscador por **nombre, dorsal o municipio** (no distingue mayúsculas ni tildes).
- Filtros por **género**, **municipio** y **solo podio (Top 3)**.
- Orden por posición de género, posición general 5K, posición global, tiempo, dorsal o nombre.
- Tarjetas con tiempo, ritmo, velocidad, diferencia con el líder, posiciones oficiales y **miniatura del diploma**.
- **Modal del diploma** con imagen en alta calidad, descarga en JPG y enlace al PDF oficial en la página exacta.
- **Podio oficial** de damas y hombres.
- **Exportación a CSV** de los resultados filtrados (compatible con Excel).
- Diseño responsivo con paleta **nogal y amarillo**, accesible con teclado y lector de pantalla.
- Manifiesto PWA para instalarla como aplicación si se publica en un servidor.

---

## Estructura de la carpeta

```
AppResultados/
├─ index.html                  Página principal
├─ Abrir App.bat               Abre la app directamente
├─ Abrir con servidor.bat      Inicia un servidor local opcional
├─ servir.ps1                  Servidor local (PowerShell)
├─ manifest.webmanifest        Manifiesto PWA
├─ css/
│  └─ styles.css               Estilos (nogal + amarillo)
├─ js/
│  └─ app.js                   Filtros, tarjetas, modal, CSV
├─ data/
│  ├─ participantes.js         Datos incrustados (carga directa sin servidor)
│  └─ participants.json        Los mismos datos en JSON
└─ assets/
   ├─ diplomas/
   │  ├─ full/                 94 diplomas en JPG de alta calidad
   │  └─ thumb/                94 miniaturas para las tarjetas
   ├─ documentos/
   │  ├─ FINAL POR GENERO.pdf  Resultados oficiales originales
   │  └─ DIPLOMAS.pdf          PDF oficial con los 94 diplomas
   └─ img/                     Íconos y favicon
```

---

## Origen de los datos

- Los resultados se extrajeron de **`FINAL POR GENERO.pdf`**: puesto por género, dorsal, nombre, municipio, tiempo, diferencia, velocidad y ritmo.
- Los diplomas se extrajeron de **`DIPLOMAS.pdf`**, que contiene una página por participante. Cada página se emparejó con su resultado mediante el **número de dorsal**.
- Verificación: **94 resultados ↔ 94 diplomas**, sin diferencias de dorsal, tiempo ni posición de género.
- Las posiciones **general 5K** y **global** que se muestran son las impresas en el diploma oficial.

---

## Publicar en internet (opcional)

Sube el contenido de `AppResultados/` a cualquier hosting estático:

- Netlify (arrastrar la carpeta)
- GitHub Pages
- Vercel
- Un servidor Apache/Nginx

Al publicarla con HTTPS, la opción de instalar como PWA y las descargas funcionarán de forma nativa.

---

## Notas

- El enlace **Abrir PDF** usa el visor del navegador y salta a la página del diploma (`#page=N`). En algunos visores muy antiguos puede abrir la primera página.
- Si usas la app con `file://` y el navegador bloquea la descarga del JPG, usa **`Abrir con servidor.bat`** o abre la imagen y guárdala con clic derecho.
- La app no modifica ni recorta los diplomas: muestra la página oficial tal como fue emitida por **TCT**.
