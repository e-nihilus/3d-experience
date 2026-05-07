# 3D Experience — React + Three.js + WebXR

Experiencia 3D interactiva compatible con desktop, mobile y VR/AR. Un cubo flotante activa un canal realtime con Decart Lucy 2.1 VTON en fal.ai para transformar la vista compuesta de la experiencia y superponer el resultado como overlay.

## 🚀 Cómo ejecutar

```bash
npm install
npm run dev
```

Esto levanta:

- Frontend Vite en `https://localhost:5180`
- Backend Express en `http://localhost:3333`

Vite proxya `/api` al backend Express.

> El navegador mostrará un aviso de certificado — acepta con "Configuración avanzada" → "Acceder al sitio".

## ⚙️ Configuración

Crea un archivo `.env` en la raíz del proyecto:

```
VITE_FAL_KEY=tu-api-key-de-fal
```

La key se lee solo desde el servidor Express y se usa para emitir tokens realtime efimeros. El bundle del navegador no recibe la API key.

## 📱 Cómo funciona

### Mobile
1. La cámara trasera se activa automáticamente como fondo
2. El cubo 3D flota encima (canvas transparente)
3. **Toca el cubo** → Decart Try-On transforma la vista compuesta de la experiencia en tiempo real
4. **Toca de nuevo** → desactiva el efecto

### Desktop
1. Se muestra una panorámica 360° como fondo
2. Usa el ratón para rotar la cámara (OrbitControls)
3. Botón "📷 Cámara" para activar la webcam
4. **Click en el cubo** → activa el try-on realtime

### VR/AR (WebXR)
1. Pulsa **"Enter VR"** o **"Enter AR"**
2. El cubo es interactivo con controllers
3. El resultado de Decart se muestra como overlay realtime de la experiencia

> WebXR requiere HTTPS. Desde otro dispositivo en red, accede vía `https://<tu-ip>:5180`.

## 🏗️ Estructura del proyecto

```
src/
├── main.jsx                        # Entry point
├── App.jsx                         # Canvas, XR, cámara, FAL/Decart, UI
├── Scene.jsx                       # Luces, entorno, fondo 360°, cubo
├── components/
│   └── FloatingSlab.jsx            # Cubo flotante con animación y click
├── config/
│   └── tryOnConfig.js              # Prompt, referencia y parametros realtime
└── hooks/
    ├── useCameraStream.js          # Hook para captura de cámara
    ├── useExperienceComposer.js    # Captura la vista compuesta de la experiencia
    └── useFalRealtimeTryOn.js      # Hook realtime seguro con tokenProvider

server/
├── index.js                        # Express + static build
├── config/env.js                   # Entorno y validacion de FAL key
└── routes/fal.js                   # Token realtime de fal.ai
```

## 🛠️ Tecnologías

- **React 19** + **Vite**
- **Three.js** + **@react-three/fiber**
- **@react-three/drei** (Float, OrbitControls, Environment, Html)
- **@react-three/xr** (WebXR — VR/AR)
- **@fal-ai/client** + **Express** para Decart Lucy 2.1 VTON realtime sin exponer la API key

## 🌐 Deploy en Vercel

```bash
npm run build
npx vercel --prod
```

O conecta el repositorio a Vercel para deploy automático en cada push.

## 📝 Licencia

Proyecto privado.
