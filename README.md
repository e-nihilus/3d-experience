# 3D Experience — React + Three.js + WebXR

Experiencia 3D interactiva compatible con desktop, mobile y VR/AR. Una losa flotante que al tocarla transforma en tiempo real lo que ve la cámara con estilo **Antoni Gaudí**, usando la API de [Decart AI (Lucy Edit)](https://platform.decart.ai/models/lucy-edit-live).

## 🚀 Cómo ejecutar

```bash
npm install
npm run dev
```

Se abrirá en `https://localhost:5180` (HTTPS con certificado autofirmado para WebXR).

> El navegador mostrará un aviso de certificado — acepta con "Configuración avanzada" → "Acceder al sitio".

## ⚙️ Configuración

Crea un archivo `.env.local` en la raíz del proyecto:

```
VITE_DECART_API_KEY=tu-api-key-de-decart
```

Obtén tu API key en [platform.decart.ai](https://platform.decart.ai).

## 📱 Cómo funciona

### Mobile
1. La cámara trasera se activa automáticamente como fondo
2. La losa 3D flota encima (canvas transparente)
3. **Toca la losa** → Decart transforma el feed de la cámara con estilo Gaudí en tiempo real
4. **Toca de nuevo** → desactiva el efecto

### Desktop
1. Se muestra una panorámica 360° como fondo
2. Usa el ratón para rotar la cámara (OrbitControls)
3. Botón "📷 Cámara" para activar la webcam
4. **Click en la losa** → activa el efecto Gaudí

### VR/AR (WebXR)
1. Pulsa **"Enter VR"** o **"Enter AR"**
2. La losa es interactiva con controllers
3. El efecto Gaudí se renderiza como skybox 3D dentro de la sesión XR

> WebXR requiere HTTPS. Desde otro dispositivo en red, accede vía `https://<tu-ip>:5180`.

## 🏗️ Estructura del proyecto

```
src/
├── main.jsx                        # Entry point
├── App.jsx                         # Canvas, XR, cámara, Decart, UI
├── Scene.jsx                       # Luces, entorno, fondo 360°, losa
├── components/
│   ├── FloatingSlab.jsx            # Losa flotante con animación y click
│   └── DecartSkybox.jsx            # Skybox 3D con stream de Decart (para VR/AR)
└── hooks/
    ├── useCameraStream.js          # Hook para captura de cámara
    └── useDecartStream.js          # Hook para conexión con Decart AI
```

## 🛠️ Tecnologías

- **React 19** + **Vite**
- **Three.js** + **@react-three/fiber**
- **@react-three/drei** (Float, OrbitControls, Environment, Html)
- **@react-three/xr** (WebXR — VR/AR)
- **@decartai/sdk** (Lucy Edit — video editing en tiempo real)

## 🌐 Deploy en Vercel

```bash
npm run build
npx vercel --prod
```

O conecta el repositorio a Vercel para deploy automático en cada push.

## 📝 Licencia

Proyecto privado.
