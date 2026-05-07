# Plan de integracion Express + FAL + Decart Try On Realtime

## Objetivo

Montar una arquitectura nueva, separada de la integracion actual en cliente, para que:

1. Un servidor Express proteja la API key de FAL.
2. El frontend React + Three.js active y desactive el try-on al pulsar el cubo.
3. La entrada enviada a `decart/lucy2-vton/realtime` sea la vista visible de la experiencia, no una llamada directa autenticada desde el navegador.
4. El resultado vuelva en tiempo real y se superponga sobre la experiencia sin perder la interaccion del canvas 3D.

## Decision de arquitectura

La opcion recomendada es esta:

1. Express se encarga de autenticacion y emite un token efimero de FAL para realtime.
2. El navegador abre la conexion realtime con `fal.realtime.connect(...)` usando `tokenProvider`.
3. El navegador captura la vista compuesta de la experiencia y publica ese stream a FAL.
4. El stream devuelto por FAL se pinta en una capa de overlay por debajo del canvas 3D y por encima del fondo.

Motivo: el canvas y la composicion visual viven en el navegador. Si Express intentara relanzar todos los frames o relayer el video entero, la latencia subiria, el codigo seria bastante mas complejo y el usuario perderia inmediatez. Express debe ser la capa de seguridad y orquestacion, no el relay de cada frame.

## Flujo objetivo

```text
Usuario pulsa cubo
  -> Frontend activa modo try-on
  -> Frontend pide token corto a Express
  -> Frontend abre canal realtime a FAL/Decart
  -> Frontend captura la vista visible de la experiencia
  -> Frontend envia frames al endpoint realtime
  -> FAL/Decart devuelve stream editado
  -> Frontend lo pinta como overlay fullscreen
  -> Usuario pulsa cubo otra vez
  -> Frontend cierra conexion, detiene captura y limpia overlay
```

## Estado actual que se debe reemplazar

Hoy el repo ya tiene una base util, pero no cumple el objetivo final:

1. `src/hooks/useDecartStream.js` usa `VITE_FAL_KEY` en el navegador.
2. El flujo actual parte del stream de camara, no de una vista compuesta controlada de la experiencia.
3. No existe un servidor Express que intermedie la autenticacion.
4. La activacion ya esta conectada al cubo, pero la logica debe rehacerse alrededor del nuevo backend y la nueva captura.

## Alcance exacto de la nueva solucion

La entrada a Decart no debe ser un key exposed call desde el browser. Debe ser un flujo con backend + realtime token.

La imagen enviada debe representar la experiencia que ve el usuario. Para conseguir alineacion visual al volver, lo correcto es capturar el frame visible compuesto:

1. base visual del viewport (`video` de camara si existe, o el fondo renderizado si no existe camara),
2. canvas WebGL con el cubo y el resto de elementos 3D,
3. sin incluir el overlay de salida para evitar feedback infinito.

## Archivos previstos

### Nuevos archivos

1. `server/index.js`
2. `server/routes/fal.js`
3. `server/config/env.js`
4. `src/hooks/useFalRealtimeTryOn.js`
5. `src/hooks/useExperienceComposer.js`
6. `src/config/tryOnConfig.js`
7. `public/reference-tryon.png` o ruta local equivalente si se quiere dejar la referencia fija dentro del repo

### Archivos a tocar

1. `package.json`
2. `vite.config.js`
3. `src/App.jsx`
4. `src/Scene.jsx`
5. `src/components/FloatingSlab.jsx`
6. `src/hooks/useCameraStream.js`
7. `README.md` solo si se quiere documentar la ejecucion nueva

## Plan paso a paso

### 1. Crear la base del servidor Express

Objetivo: introducir un backend pequeno, claro y estable para desarrollo local y despliegue.

Tareas:

1. Instalar `express` y `cors` si hace falta permitir origen cruzado en desarrollo.
2. Crear `server/index.js` con:
   - carga de entorno,
   - `express.json()` para payloads pequenos,
   - `express.raw({ type: '*/*', limit: '50mb' })` solo si se deja tambien un proxy generico,
   - `GET /api/health` para comprobar que el backend vive.
3. Crear `server/config/env.js` para centralizar lectura de `process.env.VITE_FAL_KEY`.
4. Validar al arrancar que la key existe y fallar rapido si no esta.

Resultado esperado:

1. Un backend arrancable por separado en `localhost:3333` o puerto equivalente.
2. La API key deja de depender del bundle del cliente.

### 2. Exponer un endpoint de token realtime para FAL

Objetivo: cumplir la recomendacion oficial de FAL para realtime sin exponer la key.

Tareas:

1. Crear `POST /api/fal/realtime-token` en `server/routes/fal.js`.
2. Este endpoint debe recibir `{ app }` desde el cliente.
3. Validar que `app` sea exactamente `decart/lucy2-vton/realtime` o su variante con path realtime si el SDK la envia asi.
4. Llamar desde Express a `https://rest.fal.ai/tokens/realtime` con:
   - `Authorization: Key ${process.env.VITE_FAL_KEY}`
   - `app`
   - `duration: 60` o `120` segundos
5. Devolver al cliente solo el token efimero.
6. No devolver nunca la key larga al navegador.

Resultado esperado:

1. El frontend puede abrir sesiones realtime seguras.
2. La sesion puede refrescar token automaticamente si se define `tokenExpirationSeconds`.

Nota:

Aunque la variable actual se llama `VITE_FAL_KEY`, el backend la puede leer sin problema. Mas adelante conviene migrarla a `FAL_KEY`, pero no es imprescindible para la primera version si se quiere respetar el `.env` actual.

### 3. Decidir si tambien hace falta un proxy FAL generico

Objetivo: cubrir uploads o endpoints HTTP auxiliares sin exponer credenciales.

Tareas:

1. Evaluar si la imagen de referencia sera una URL fija local o si se subira dinamicamente.
2. Si la referencia sera fija, no hace falta proxy adicional para esta fase.
3. Si se quieren futuras llamadas HTTP del cliente a FAL, anadir `ALL /api/fal/proxy/*` en Express siguiendo la cabecera `x-fal-target-url`.

Decision recomendada para esta tarea:

1. Implementar primero solo `realtime-token`.
2. Dejar `proxy` como extra opcional si aparece una necesidad real durante la integracion.

### 4. Conectar Vite con Express en desarrollo

Objetivo: que el frontend use `/api/...` sin preocuparse del puerto del backend.

Tareas:

1. Actualizar `vite.config.js` para proxyear `/api` a `http://localhost:3001`.
2. Ampliar `package.json` con scripts separados, por ejemplo:
   - `dev:client`
   - `dev:server`
   - `dev`
3. Anadir un runner concurrente si se necesita, por ejemplo `concurrently`, o documentar dos procesos separados.

Resultado esperado:

1. El cliente llama a `/api/fal/realtime-token` sin CORS manual.
2. La experiencia de desarrollo sigue siendo simple.

### 5. Extraer la configuracion fija de try-on

Objetivo: fijar el prompt y la referencia en un solo sitio, fuera del componente principal.

Tareas:

1. Crear `src/config/tryOnConfig.js`.
2. Mover ahi:
   - el prompt preestablecido,
   - la referencia de imagen preestablecida,
   - el `modelId` = `decart/lucy2-vton/realtime`,
   - parametros de rendimiento como fps, calidad jpeg, ancho maximo.
3. Cambiar la referencia remota actual por una imagen en `public/` si se quiere total control y evitar dependencias de terceros.

Resultado esperado:

1. El hook realtime no contiene strings largas ni configuracion repartida.
2. El contenido preestablecido queda facil de ajustar.

### 6. Construir una composicion de la vista real de la experiencia

Objetivo: enviar a Decart exactamente la vista relevante del usuario.

Tareas:

1. Crear `src/hooks/useExperienceComposer.js`.
2. Este hook debe gestionar un canvas 2D oculto de composicion.
3. En cada tick debe dibujar, en este orden:
   - `video` base de camara si existe,
   - canvas WebGL de React Three Fiber,
   - nunca el overlay de salida.
4. El hook debe exponer:
   - una forma de capturar frame como `data:image/jpeg;base64,...`,
   - y/o `captureStream(fps)` si el transporte final usa WebRTC.
5. El canvas de composicion debe reescalar a una resolucion moderada, por ejemplo 768 px de ancho, para reducir latencia.
6. La calidad JPEG inicial recomendada es 0.65-0.75.
7. El envio debe limitarse a un framerate realista, por ejemplo 6-10 fps, no a 60 fps.

Resultado esperado:

1. La IA recibe la vista visible compuesta.
2. El retorno queda visualmente alineado al overlay final.

### 7. Rehacer el hook realtime para usar Express + FAL seguro

Objetivo: sustituir el hook actual por uno nuevo centrado en tokenProvider y captura del viewport.

Tareas:

1. Crear `src/hooks/useFalRealtimeTryOn.js`.
2. Configurar `fal.realtime.connect('decart/lucy2-vton/realtime', { tokenProvider, ... })`.
3. Implementar `tokenProvider` para llamar a `/api/fal/realtime-token`.
4. Mover aqui los estados:
   - `idle`
   - `connecting`
   - `connected`
   - `stopping`
   - `error`
5. En la fase de handshake, confirmar el transporte real del modelo:
   - si FAL devuelve `iceservers`, usar `RTCPeerConnection` y publicar el `captureStream()` del canvas de composicion,
   - si devuelve resultados de imagen por websocket, usar el frame capturado como `image_url` y pintar respuestas base64.
6. Enviar una sola vez al inicio el prompt y la referencia fija, y luego solo frames o stream segun el protocolo resultante.
7. Gestionar cierre limpio de:
   - websocket,
   - peer connection,
   - timers,
   - tracks locales de captura,
   - overlay remoto.

Resultado esperado:

1. La integracion ya no depende de credenciales en cliente.
2. El flujo realtime queda encapsulado en un hook reutilizable.

### 8. Integrar el toggle en el cubo 3D

Objetivo: hacer que el cubo sea el unico disparador de activar/desactivar el try-on.

Tareas:

1. Mantener `FloatingSlab.jsx` como punto de interaccion o renombrarlo a algo mas alineado con "cubo" si se quiere claridad.
2. En `App.jsx`, reemplazar la logica actual de `handleSlabClick` por:
   - si `tryOn.active` es `false`, arrancar captura + conexion,
   - si `tryOn.active` es `true`, parar y limpiar todo.
3. Asegurar que el cubo sigue siendo clickable mientras el overlay esta activo dejando el canvas 3D por encima del video devuelto.
4. Cambiar el copy visual para reflejar el nuevo modo try-on, no el flujo anterior.

Resultado esperado:

1. Primer click activa.
2. Segundo click desactiva.
3. El usuario no necesita botones extra para el modo try-on.

### 9. Dibujar el resultado como overlay sin romper la experiencia

Objetivo: superponer el resultado de IA manteniendo la escena y la interaccion.

Tareas:

1. Mantener tres capas visuales claras en `App.jsx`:
   - capa base: video de camara o fondo,
   - capa media: overlay del resultado de Decart,
   - capa superior: canvas 3D interactivo y UI.
2. El overlay debe ocupar toda la pantalla con `object-fit: cover`.
3. El overlay debe aparecer solo cuando hay stream remoto o primer frame valido.
4. Al desactivar, limpiar `srcObject` o `src` del overlay para que no queden frames congelados.
5. Si el retorno de FAL tiene latencia inicial, mantener visible la escena original mientras llega el primer frame.

Resultado esperado:

1. La experiencia no se queda en negro durante el arranque.
2. El usuario sigue viendo y pulsando el cubo.

### 10. Afinar rendimiento y evitar feedback visual

Objetivo: que el loop realtime sea estable y utilizable.

Tareas:

1. Confirmar que el overlay de salida no entra nunca en la composicion de entrada.
2. Pausar el envio de frames si la pestana queda oculta o si la sesion entra en error.
3. Limitar resolucion y fps para controlar coste y latencia.
4. Reintentar solo una vez en fallos transitorios; evitar loops infinitos silenciosos.
5. Medir tiempo a primer frame y estabilidad de la sesion.

Objetivos iniciales razonables:

1. Primer frame visible por debajo de 3-5 segundos en caliente.
2. Flujo sostenido entre 6 y 10 fps.
3. Sin crecimiento de memoria tras varios toggles on/off.

### 11. Ajustar mensajes de estado y errores

Objetivo: que el usuario entienda que esta pasando sin sobrecargar la interfaz.

Tareas:

1. Reemplazar mensajes actuales por estados mas concretos:
   - "Preparando try-on..."
   - "Conectando con Decart..."
   - "Try-on activo. Pulsa el cubo para salir"
   - errores con texto corto y accionable
2. Mostrar error claro si falta `VITE_FAL_KEY` en backend.
3. Mostrar error claro si no hay camara cuando la experiencia depende de ella.

Resultado esperado:

1. El usuario entiende el ciclo de activacion.
2. El modo realtime es mas facil de depurar.

### 12. Validacion manual final

Objetivo: cerrar la integracion con una lista concreta de pruebas.

Checklist:

1. `npm run dev` levanta frontend y backend sin errores.
2. `GET /api/health` responde correctamente.
3. Primer click en el cubo arranca el modo try-on.
4. El frontend obtiene token desde Express, no desde `import.meta.env`.
5. La entrada enviada a FAL corresponde a la vista compuesta de la experiencia.
6. El resultado vuelve y se superpone correctamente.
7. Segundo click en el cubo cierra sesion y limpia overlay.
8. Repetir activar/desactivar varias veces no rompe el estado.
9. Mobile y desktop mantienen el mismo comportamiento de toggle.
10. La key larga no aparece en el bundle cliente ni en logs del navegador.

## Orden de implementacion recomendado

Para reducir riesgo, ejecutar en este orden exacto:

1. Express + `/api/health`
2. `POST /api/fal/realtime-token`
3. Vite proxy y scripts de desarrollo
4. Config fija de prompt/referencia
5. Hook de composicion de experiencia
6. Hook realtime nuevo con tokenProvider
7. Toggle del cubo
8. Overlay final
9. Ajuste de rendimiento
10. Validacion manual y limpieza

## Riesgos tecnicos y mitigacion

### Riesgo 1: el endpoint realtime usa un handshake distinto al esperado

Mitigacion:

1. Hacer una prueba corta del handshake al integrar el nuevo hook.
2. Mantener la capa de captura y overlay separadas del transporte para poder cambiar entre websocket frame-based y WebRTC sin rehacer toda la UI.

### Riesgo 2: capturar solo el canvas 3D no represente la experiencia completa

Mitigacion:

1. Capturar el viewport compuesto, no solo el canvas WebGL aislado.
2. Excluir el overlay de salida para evitar realimentacion.

### Riesgo 3: latencia alta o coste excesivo

Mitigacion:

1. Downscale de entrada.
2. FPS cap.
3. JPEG comprimido o stream moderado.
4. No enviar frames cuando el usuario ha desactivado el modo.

### Riesgo 4: el cubo deja de ser clickable con el overlay activo

Mitigacion:

1. Mantener el canvas 3D por encima del overlay.
2. No capturar eventos de puntero en la capa de video si no hace falta.

## Criterios de aceptacion

La tarea puede darse por cerrada cuando se cumplan estos puntos:

1. Existe un servidor Express dentro del repo y forma parte del flujo de ejecucion.
2. La key de FAL ya no se usa directamente en el navegador.
3. El cubo activa y desactiva el modo try-on con un toggle real.
4. La vista compuesta de la experiencia se envia a `decart/lucy2-vton/realtime`.
5. El resultado se superpone en tiempo real sobre la experiencia.
6. El flujo se puede repetir varias veces sin recargar la pagina.

## Entregables finales esperados tras la implementacion

1. Backend Express operativo.
2. Frontend conectado por tokenProvider o proxy seguro.
3. Captura compuesta de la experiencia.
4. Overlay realtime de Decart.
5. Toggle desde el cubo.
6. README actualizado con arranque y variables necesarias si se decide documentarlo.
