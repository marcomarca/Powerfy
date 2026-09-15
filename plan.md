# PowerManager — Especificación maestra de producto y desarrollo

> **Estado:** especificación ejecutable v1.0  
> **Plataforma:** Windows 11 x64  
> **Tipo:** aplicación de escritorio residente en system tray  
> **Nombre técnico provisional:** `PowerManager`  
> **Nombre comercial:** por definir; no bloquea el desarrollo  
> **Fuente de verdad:** este documento. Si el código, una tarea o una decisión posterior contradice este documento, prevalece este documento salvo cambio explícito del propietario del proyecto.

---

## 0. Contrato para la IA que desarrolle el proyecto

La IA debe tratar este archivo como **especificación normativa** y volver a leerlo antes de iniciar cada fase o cuando exista duda de alcance.

### 0.1 Reglas no negociables

1. **Solo Windows 11.** No invertir tiempo en compatibilidad con Windows 10.
2. **Solo Power Schemes clásicos de Windows** —los planes/esquemas visibles en el Panel de control—. No implementar ni mezclar los “Power Modes” modernos de Windows 11.
3. Los esquemas deben obtenerse **dinámicamente del sistema por GUID**. No hardcodear `Balanced`, `High performance`, nombres personalizados ni GUID de esquemas creados por el usuario.
4. El núcleo de energía debe usar **APIs nativas de Windows**. `powercfg.exe`, PowerShell o `cmd.exe` no son la API principal y no deben usarse salvo herramienta diagnóstica explícita.
5. La aplicación normal **no debe requerir privilegios de administrador/UAC**.
6. La UI será **Electron + React + TypeScript + Vanilla CSS**. La integración Win32 estará aislada en un **NativeHost C#/.NET**.
7. No introducir microservicios, backend, nube, base de datos, servicio Windows, Kubernetes, Redis, sockets de red ni infraestructura que no sea necesaria.
8. Persistencia local en JSON con migraciones de esquema.
9. El scheduler debe soportar desde v1:
   - automatización por horario;
   - automatización por día de semana;
   - automatización por proceso/aplicación;
   - AC/batería;
   - porcentaje de batería;
   - cambio de esquema;
   - suspensión/reactivación;
   - prioridades;
   - restauración correcta;
   - override manual.
10. “Apagar pantalla” significa **apagar físicamente la salida de pantalla mediante el mecanismo de monitor power de Windows**, no suspender, hibernar, bloquear ni apagar el equipo.
11. Inicio con Windows debe ser silencioso y eficiente: **tray + procesos mínimos; no abrir el popup ni la ventana de ajustes**.
12. El Renderer no tendrá acceso directo a Node.js ni Win32.
13. No copiar código, assets, iconos, marcas, textos ni recursos de Battery Mode. La implementación es **clean-room**, basada en comportamiento observable, documentación pública y APIs documentadas.
14. No implementar una feature marcada `LATER` antes de completar todos los `MUST` de su fase salvo que sea requisito técnico real.
15. Si aparece una decisión reversible no definida, usar el default más simple. Si aparece una decisión difícil de revertir que contradiga esta arquitectura, detener esa parte y documentarla antes de cambiarla.

### 0.2 Convenciones de requisitos

- `[R]` requisito explícito del propietario.
- `[D]` decisión derivada de requisitos.
- `[A]` default asumido y reversible.
- `MUST` obligatorio para v1.
- `SHOULD` deseable tras completar MUST.
- `LATER` fuera de v1.
- `NO` explícitamente fuera del alcance.

### 0.3 Regla de cambio

Cualquier desviación arquitectónica debe quedar registrada en `docs/ADR/` con:

```text
Contexto
Decisión
Alternativas
Consecuencias
Compatibilidad con esta especificación
```

No crear ADR para detalles triviales.

---

# 1. Objetivo

Crear una aplicación de escritorio para Windows 11 que permita gestionar rápidamente los **Power Schemes clásicos de Windows**, brillo y pantalla desde la bandeja del sistema, y que añada un sistema de **automatizaciones avanzado**.

Flujo principal:

```text
system tray
   ↓
popup
   ├─ estado de batería
   ├─ esquema activo
   ├─ lista de esquemas disponibles
   ├─ brillo
   └─ apagar pantalla
         ↓
automatizaciones
   ├─ horario
   ├─ procesos/aplicaciones
   ├─ AC/batería
   ├─ porcentaje
   ├─ suspensión/resume
   └─ reglas combinadas
```

La prioridad del producto es:

```text
rapidez + comportamiento determinista + bajo consumo en idle + automatización fiable
```

No se intenta reproducir la estética antigua de Battery Mode. Se reproduce la funcionalidad útil y se mejora la UX con diseño propio.

---

# 2. Alcance

## 2.1 IN — v1

- Aplicación de system tray.
- Popup principal.
- Enumeración dinámica de Power Schemes clásicos.
- Detección del esquema activo.
- Cambio de esquema con un clic.
- Estado de batería y AC/DC.
- Slider de brillo para pantalla interna compatible.
- Mostrar porcentaje de brillo.
- Opción de brillo fijo.
- Acción real “Apagar pantalla”.
- Inicio con Windows.
- Hotkey global para recorrer esquemas.
- Iconos propios del tray.
- Color del icono basado en esquema.
- OSD al cambiar esquema.
- Ajustes de apariencia y OSD.
- Español e inglés.
- Scheduler/Automations.
- Reglas por horario.
- Reglas por procesos/aplicaciones.
- Reglas por AC/DC.
- Reglas por porcentaje de batería.
- Reglas por esquema activo.
- Reglas por suspensión/reactivación.
- Prioridades de reglas.
- Arbitraje de reglas simultáneas.
- Restauración automática.
- Override manual.
- Persistencia local JSON.
- Logs locales rotativos.
- Actualizaciones mediante GitHub Releases.
- Instalador NSIS per-user.
- Arquitectura preparada para ampliar triggers/actions.

## 2.2 OUT — v1

- Windows 10.
- ARM64.
- macOS/Linux.
- Power Modes modernos de Windows 11.
- Crear, clonar, modificar o borrar Power Schemes.
- Editor de parámetros avanzados de un Power Scheme.
- Servicio Windows.
- Backend/cloud.
- Login/cuentas.
- Telemetría.
- SQLite/PostgreSQL.
- Drivers kernel.
- Undervolting/overclocking.
- Ajustes directos de CPU/GPU.
- Scripts arbitrarios.
- PowerShell como dependencia.
- DDC/CI de monitores externos en v1.
- Microsoft Store/MSIX.
- Sincronización entre PCs.
- Acciones destructivas automáticas como shutdown/restart sin requisito posterior explícito.

---

# 3. Plataforma y compatibilidad

```text
OS objetivo: Windows 11 x64
Arquitectura inicial: x64
Instalación: por usuario
Privilegios: usuario estándar
Internet: solo necesario para actualizaciones
Uso offline: completo salvo actualización
```

No añadir código condicional específico para Windows 10 salvo que venga gratuitamente de una API compartida.

La aplicación debe detectar capacidades del equipo en runtime:

```ts
type SystemCapabilities = {
  hasBattery: boolean;
  supportsInternalBrightness: boolean;
  supportsLidState: boolean;
  supportsDisplayState: boolean;
  supportsPowerSchemeNotifications: boolean;
};
```

La UI debe ocultar o desactivar funciones no soportadas en vez de fallar.

---

# 4. Stack tecnológico

## 4.1 Desktop / UI

- **Electron** — shell de escritorio, tray, ventanas, lifecycle.
- **React 19** — interfaz.
- **TypeScript `strict`** — Main, Preload y Renderer.
- **Vanilla CSS** — sistema visual propio.
- **Vite** — build/dev server del Renderer.
- **Bun** — gestor de paquetes, scripts, tests TS y bundling Main/Preload.
- **Biome** — lint y formato.
- **Electron Builder** — instalador NSIS y empaquetado.
- **electron-updater** — GitHub Releases y actualización.

### Política de versiones

No congelar Electron en v34 si ya existe una versión estable superior al iniciar el proyecto.

Regla:

```text
Electron / Vite / Bun / Biome
→ versión estable compatible en el momento de bootstrap
→ fijada en lockfile
→ actualizaciones posteriores mediante PR controlada
```

React permanece en major 19 salvo necesidad real.

## 4.2 Native host

- **C#**
- **.NET 10**
- P/Invoke Win32.
- `System.Text.Json`.
- `System.Management` solo donde WMI sea la API adecuada.
- xUnit para tests.

Publicación:

```text
win-x64
SelfContained = true
PublishSingleFile = true
PublishTrimmed = false
```

No exigir que el usuario tenga .NET instalado.

## 4.3 Herramientas que NO son necesarias

- No Redux por defecto.
- No Tailwind.
- No Material UI.
- No database.
- No DI container pesado.
- No ASP.NET.
- No servidor HTTP local.
- No gRPC.
- No Named Pipe en v1 si stdio resuelve la comunicación.
- No native Node addons para PowrProf.

---

# 5. Arquitectura

```text
┌────────────────────────────────────────────────────────────┐
│                     Electron Application                   │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Main Process                                         │  │
│  │                                                      │  │
│  │ Tray                                                 │  │
│  │ App lifecycle                                        │  │
│  │ State store                                          │  │
│  │ Scheduler / Rule Engine                              │  │
│  │ Policy arbiters                                      │  │
│  │ Settings repository                                  │  │
│  │ Update service                                       │  │
│  │ NativeHost client                                    │  │
│  │ Global shortcut                                      │  │
│  └───────────┬──────────────────────────┬───────────────┘  │
│              │                          │                  │
│         Preload IPC                 stdio NDJSON           │
│              │                          │                  │
│  ┌───────────▼────────────────┐         │                  │
│  │ React Renderer             │         │                  │
│  │ popup/settings/automation  │         │                  │
│  │ OSD                        │         │                  │
│  └────────────────────────────┘         │                  │
└─────────────────────────────────────────┼──────────────────┘
                                          │
                               ┌──────────▼───────────┐
                               │ NativeHost .NET     │
                               │                     │
                               │ Power schemes       │
                               │ Power notifications │
                               │ Battery             │
                               │ Brightness          │
                               │ Display power       │
                               │ Process watcher     │
                               │ Sleep/resume        │
                               └──────────┬───────────┘
                                          │
                                     Win32 / WMI
                                          │
                                      Windows 11
```

## 5.1 Responsabilidades

### Electron Main

Posee:

- tray;
- creación/destrucción de ventanas;
- configuración;
- scheduler;
- decisiones de producto;
- prioridades;
- estado deseado;
- updater;
- hotkeys;
- comunicación con NativeHost.

No contiene P/Invoke.

### Preload

Expone al Renderer una API mínima y tipada.

Ejemplo conceptual:

```ts
window.powerManager = {
  state: {
    getSnapshot(),
    subscribe(callback),
  },
  power: {
    setScheme(id),
  },
  brightness: {
    set(displayId, value),
  },
  display: {
    turnOff(),
  },
  settings: {
    get(),
    patch(),
  },
  automations: {
    list(),
    save(rule),
    remove(id),
  },
};
```

No exponer `ipcRenderer` crudo.

### Renderer

Solo UI.

No:

- `fs`;
- `child_process`;
- `process`;
- PowerShell;
- Win32;
- acceso directo a settings file.

### NativeHost

Traduce contratos internos a APIs de Windows.

No contiene lógica visual.
No decide prioridades del scheduler.
No persiste reglas.
No descarga actualizaciones.

---

# 6. Estructura del repositorio

```text
power-manager/
├─ package.json
├─ bun.lock
├─ biome.json
├─ tsconfig.json
├─ README.md
├─ SPEC.md                     ← este documento
│
├─ apps/
│  └─ desktop/
│     ├─ src/
│     │  ├─ main/
│     │  │  ├─ app/
│     │  │  ├─ tray/
│     │  │  ├─ windows/
│     │  │  ├─ native-host/
│     │  │  ├─ state/
│     │  │  ├─ settings/
│     │  │  ├─ scheduler/
│     │  │  ├─ shortcuts/
│     │  │  ├─ updater/
│     │  │  └─ logging/
│     │  │
│     │  ├─ preload/
│     │  │  ├─ index.ts
│     │  │  └─ api.ts
│     │  │
│     │  └─ renderer/
│     │     ├─ popup/
│     │     ├─ settings/
│     │     ├─ automations/
│     │     ├─ osd/
│     │     ├─ components/
│     │     ├─ hooks/
│     │     ├─ styles/
│     │     └─ locales/
│     │
│     └─ resources/
│        ├─ app/
│        ├─ tray/
│        └─ sounds/
│
├─ packages/
│  ├─ contracts/
│  ├─ rule-engine/
│  └─ shared/
│
├─ native/
│  ├─ PowerManager.NativeHost/
│  │  ├─ Program.cs
│  │  ├─ Protocol/
│  │  ├─ Power/
│  │  ├─ Battery/
│  │  ├─ Brightness/
│  │  ├─ Display/
│  │  ├─ Processes/
│  │  ├─ Notifications/
│  │  └─ Diagnostics/
│  │
│  └─ PowerManager.NativeHost.Tests/
│
├─ tests/
│  ├─ rule-engine/
│  ├─ settings/
│  └─ integration/
│
├─ docs/
│  └─ ADR/
│
└─ .github/
   └─ workflows/
      ├─ ci.yml
      └─ release.yml
```

---

# 7. Dominio: Power Schemes

## 7.1 Modelo

```ts
type PowerScheme = {
  id: string;          // GUID canónico
  name: string;        // friendly name entregado por Windows
  isActive: boolean;
};
```

El `id` es la identidad real. El nombre es presentación.

Nunca:

```text
name === "Balanced"
→ asumir GUID
```

Sí:

```text
GUID
→ identidad persistente
→ nombre solo visual
```

## 7.2 APIs nativas

NativeHost usa:

- `PowerEnumerate`
- `PowerReadFriendlyName`
- `PowerGetActiveScheme`
- `PowerSetActiveScheme`

Cambio:

```text
UI click
→ Main command
→ NativeHost power.setActiveScheme
→ PowerSetActiveScheme
→ PowerGetActiveScheme
→ verificar GUID
→ response
→ state update
→ tray/OSD/UI
```

Si Windows rechaza el cambio:

- no actualizar el estado optimistamente como definitivo;
- mostrar error breve;
- registrar código Win32;
- conservar estado real.

## 7.3 Cambio externo

NativeHost debe registrarse para cambio del esquema activo usando la notificación correspondiente de Windows (`GUID_ACTIVE_POWERSCHEME`), y después **releer el GUID real**.

Flujo:

```text
Windows cambia esquema fuera de la app
→ power setting notification
→ PowerGetActiveScheme
→ event power.activeSchemeChanged
→ Main
→ RuleEngine/State
→ UI/tray
```

No hacer polling permanente del esquema.

## 7.4 Enumeración

Reenumerar:

- al arrancar;
- al abrir el popup si han pasado >30 s desde la última enumeración;
- tras error `scheme not found`;
- tras una señal relevante de cambio de energía si se detecta inconsistencia.

Esto permite detectar esquemas creados/eliminados externamente.

---

# 8. Batería y alimentación

## 8.1 Estado

```ts
type BatteryState = {
  present: boolean;
  percentage: number | null;
  isCharging: boolean;
  isOnAc: boolean;
  isFullyCharged: boolean;
  secondsRemaining: number | null;
};
```

Fuente primaria: `GetSystemPowerStatus`.

Notificaciones:

- `GUID_ACDC_POWER_SOURCE`;
- `GUID_BATTERY_PERCENTAGE_REMAINING`.

Al recibir una notificación, releer estado completo.

## 8.2 UI

Ejemplos:

```text
100% · Cargando
84% · Batería
Sin batería
```

Si no existe batería:

- no mostrar una batería falsa;
- seguir permitiendo esquemas, brillo y automatizaciones no relacionadas.

---

# 9. Brillo

## 9.1 v1

MUST:

- pantalla interna compatible;
- obtener valor;
- establecer valor;
- porcentaje visible;
- control slider;
- fixed brightness.

Backend principal:

- `WmiMonitorBrightness`;
- `WmiMonitorBrightnessMethods.WmiSetBrightness`.

Modelo:

```ts
type BrightnessDisplay = {
  id: string;
  name: string;
  kind: "internal";
  supportedLevels: number[];
  current: number;
  isPrimary: boolean;
};
```

Si el hardware expone niveles discretos:

```text
slider requested 47
supported: 0, 10, 20, 30, 40, 50...
→ establecer nivel soportado más cercano
```

No asumir incrementos de 1%.

## 9.2 Selección de display

Si existe un único display interno compatible, usarlo.

Si hay más de uno:

- ajustes permite seleccionar el display controlado por el popup;
- guardar `displayId`.

## 9.3 Fixed brightness

Semántica:

> mantener el brillo elegido por el usuario aunque Windows/OEM intente cambiarlo al cambiar AC/DC o Power Scheme.

Estado:

```ts
type FixedBrightnessSettings = {
  enabled: boolean;
  displayId: string | null;
  value: number | null;
};
```

Flujo:

```text
usuario establece 70%
→ desiredBrightness = 70

power source cambia
o esquema cambia
o resume
→ debounce 750 ms
→ leer brillo
→ si != 70, aplicar 70
→ verificar
→ si OEM lo volvió a cambiar, segundo intento ~2000 ms
→ detener
```

No crear loops infinitos.

Máximo 2 reintentos por evento.

## 9.4 Monitores externos

`LATER`.

La arquitectura debe permitir otro backend:

```text
IBrightnessBackend
├─ InternalWmiBrightnessBackend
└─ DdcCiBrightnessBackend       ← futuro
```

No implementar DDC/CI en v1.

---

# 10. “Apagar pantalla”

## 10.1 Semántica exacta

El botón:

```text
MUST:
apagar el display

MUST NOT:
suspender
hibernar
bloquear sesión
cerrar sesión
apagar PC
```

Implementación nativa:

```text
WM_SYSCOMMAND
SC_MONITORPOWER
lParam = 2
```

Usar `SendMessageTimeout` en vez de una llamada que pueda quedar bloqueada indefinidamente.

Resultado esperado:

```text
clic
→ display se apaga
→ PC sigue ejecutándose
→ input normal del usuario puede volver a encenderlo
```

No mantener una ejecución requerida permanente para evitar sleep. Después de apagar el display, Windows conserva su política normal de suspensión.

Si un OEM concreto entra inmediatamente en sleep por una política externa, no convertir por defecto esta función en un hack de inhibición permanente. Tratarlo como compatibilidad específica.

---

# 11. System tray

## 11.1 Comportamiento

```text
left click
→ toggle popup

right click
→ context menu

double click
→ no comportamiento especial en v1
```

## 11.2 Menú contextual

MUST:

```text
Abrir
Automatizaciones
Ajustes
────────────────
✓ Iniciar con Windows
Apagar pantalla
Opciones de energía de Windows
────────────────
Acerca de
Salir
```

Puede añadirse `Idioma` si aporta acceso rápido, pero el idioma principal se gestiona en Ajustes.

`Opciones de energía de Windows` abre el Panel de control de energía; no reimplementa su editor.

## 11.3 Single instance

Usar `app.requestSingleInstanceLock()`.

Segunda ejecución:

```text
instancia ya activa
→ enviar intención
→ enfocar/abrir popup
→ finalizar segunda instancia
```

Nunca permitir dos schedulers simultáneos.

---

# 12. Iconos propios

No usar assets de Battery Mode ni iconos propietarios.

## 12.1 Estado visual

```ts
type TrayIconSettings = {
  style: "outline" | "solid";
  colorMode: "system" | "scheme";
  showBatteryPercentage: boolean;
  schemeColors: Record<string, string>; // GUID -> color
};
```

## 12.2 Color por esquema

Persistir por GUID.

Si aparece un esquema nuevo sin color:

```text
hash estable del GUID
→ seleccionar color de paleta interna
→ guardar solo si usuario lo personaliza
```

Renombrar el esquema no cambia su color.

## 12.3 Renderizado

Implementar `TrayIconRenderer` desacoplado.

Input:

```ts
type TrayIconState = {
  schemeId: string;
  color: string;
  batteryPercent: number | null;
  charging: boolean;
  style: "outline" | "solid";
  showPercentage: boolean;
};
```

Output:

```text
NativeImage compatible con Windows tray
```

El método exacto de rasterizado es detalle reversible. No introducir un renderer Chromium permanente únicamente para producir iconos. Preferir renderizado/caché en Main o assets parametrizados.

Cache key:

```text
style + color + batteryBucket + charging + percentageMode
```

---

# 13. Popup principal

## 13.1 Objetivo

Ventana compacta, moderna, propia, inspirada en Windows 11, no clon pixel-perfect de Battery Mode.

Referencia conceptual:

```text
╭──────────────────────────────────────╮
│  🔋 84%                   Conectado  │
│                                      │
│  PLAN DE ENERGÍA                     │
│  ● OFF TURBO OFF                     │
│  ○ Balanced                          │
│  ○ Extreme                           │
│                                      │
│  BRILLO                       72%     │
│  ☀ ─────────────────●──────          │
│                                      │
│          Apagar pantalla             │
╰──────────────────────────────────────╯
```

## 13.2 Comportamiento

Al abrir:

```text
obtener state snapshot
→ reenumerar esquemas si cache vieja
→ refrescar batería
→ refrescar brillo
→ posicionar junto al área del tray
→ mostrar
```

Cerrar/ocultar:

- clic fuera;
- `Esc`;
- segundo clic en tray.

No cerrar la aplicación.

## 13.3 BrowserWindow

Propiedades conceptuales:

```text
frame = false
resizable = false
skipTaskbar = true
show = false al crear
contextIsolation = true
nodeIntegration = false
sandbox = true
```

La ventana puede mantenerse viva mientras se usa con frecuencia, pero debe poder destruirse después de un periodo de inactividad para reducir memoria.

Default:

```text
oculta > 5 min
→ destruir Renderer del popup
→ Main y NativeHost continúan
```

Este timeout es reversible.

## 13.4 UX

- tamaño aproximado inicial: 360–400 px de ancho;
- rounded corners;
- tema claro/oscuro/sistema;
- keyboard navigation;
- foco visible;
- soporte `prefers-reduced-motion`;
- nada de animaciones largas.

---

# 14. OSD al cambiar esquema

## 14.1 Función

Pequeño overlay temporal al cambiar de esquema.

Debe ser:

- no interactivo;
- no tomar foco;
- no aparecer en taskbar;
- always-on-top;
- click-through;
- duración corta.

## 14.2 Ajustes

```ts
type OsdSettings = {
  enabled: boolean;
  showIcon: boolean;
  showSchemeName: boolean;
  durationMs: number;    // default 2000
  opacity: number;       // 0..1
  monitor: "primary" | "cursor";
};
```

Rango UI sugerido:

```text
Duración: 1000–5000 ms
Opacidad: 20–100%
```

Default:

```text
enabled = true
showIcon = true
showSchemeName = true
durationMs = 2000
opacity = 0.9
monitor = primary
```

## 14.3 Cuándo aparece

Sí:

- cambio manual desde popup;
- hotkey;
- scheduler;
- cambio externo si settings lo permite.

Default para cambio externo: sí.

No mostrar durante startup simplemente porque se leyó el esquema actual.

---

# 15. Inicio con Windows

## 15.1 Implementación

Electron:

```text
app.setLoginItemSettings({
  openAtLogin: true,
  args: ["--startup"]
})
```

Al consultar estado usar los mismos `path/args` aplicables.

Instalación per-user.

## 15.2 Startup mode

Con `--startup`:

```text
Electron Main
→ acquire single instance
→ settings
→ NativeHost
→ scheduler
→ tray
→ NO popup
→ NO settings window
→ NO OSD de inicialización
```

El Renderer se crea solo cuando haga falta.

## 15.3 Objetivo de eficiencia

No crear una BrowserWindow solo para mantener la app viva.

Idle:

```text
Electron Main
+ NativeHost
+ procesos internos inevitables de Electron
```

Scheduler event-driven; no intervalos de polling de 1 s.

---

# 16. Hotkey global

MUST.

Implementar con Electron `globalShortcut` salvo incompatibilidad demostrada.

Default inicial:

```text
Alt+Pause
```

El usuario puede cambiarlo.

Acción:

```text
hotkey
→ lista ordenada de esquemas
→ active index
→ next
→ set scheme
→ OSD
```

Orden:

- mismo orden entregado por el servicio de enumeración;
- en el futuro podrá permitirse orden personalizado, pero no v1.

Si el hotkey está ocupado:

- no fallar silenciosamente;
- mostrar “atajo no disponible” en ajustes;
- conservar el anterior si sigue válido.

---

# 17. Ajustes

Ventana propia, no copia de tabs antiguas.

Secciones:

```text
General
Apariencia
Energía
Brillo
Notificaciones
Automatizaciones
Actualizaciones
Acerca de
```

## 17.1 General

- idioma: `Español | English`;
- iniciar con Windows;
- iniciar minimizado/tray — implícito; no abrir UI;
- tema: `system | light | dark`.

## 17.2 Apariencia

- estilo de icono;
- color mode;
- colores por esquema;
- mostrar porcentaje en tray.

## 17.3 Energía

- hotkey;
- comportamiento de override manual;
- acceso a opciones de energía de Windows.

No añadir Power Modes.

## 17.4 Brillo

- display principal;
- mostrar porcentaje;
- fixed brightness;
- valor fijo.

## 17.5 Notificaciones

- OSD enabled;
- icono;
- nombre del esquema;
- opacidad;
- duración;
- monitor.

## 17.6 Automatizaciones

- master enable;
- lista de reglas;
- crear;
- editar;
- duplicar;
- activar/desactivar;
- borrar.

## 17.7 Actualizaciones

- comprobar automáticamente;
- descargar automáticamente;
- canal estable;
- comprobar ahora;
- versión instalada.

No implementar canal beta en v1.

---

# 18. Localización

Idiomas iniciales:

```text
es
en
```

No añadir framework pesado solo para traducciones.

Archivos:

```text
renderer/locales/es.json
renderer/locales/en.json
```

Todas las cadenas visibles deben usar key de idioma; no dispersar strings fijos por componentes.

Fallback: inglés.

Los nombres de esquemas provienen de Windows y no se traducen por la aplicación.

---

# 19. Scheduler / Automations — concepto central

Este módulo es el principal diferenciador del producto.

## 19.1 Filosofía

No implementar el scheduler como:

```text
evento
→ set scheme
→ al terminar “volver al anterior”
```

Ese enfoque falla con reglas simultáneas.

Implementar:

```text
eventos Windows
→ RuntimeFacts
→ RuleEngine
→ reglas activas
→ ResourceArbiters
→ DesiredState
→ aplicar solo diferencias
```

El scheduler es **declarativo y orientado a estado**.

## 19.2 Terminología UX

UI:

```text
CUANDO
MIENTRAS
ENTONCES
AL TERMINAR
```

Internamente:

```text
when      = activadores
conditions = condiciones
actions    = efectos
```

---

# 20. Modelo de AutomationRule

```ts
type AutomationRule = {
  id: string;
  name: string;
  enabled: boolean;

  priority: number;         // 0..100
  order: number;            // desempate estable
  exclusive: boolean;       // avanzado, default false

  when: TriggerGroup;
  conditions: ConditionGroup;

  actions: AutomationAction[];

  cooldownMs: number;       // default 0
  createdAt: string;
  updatedAt: string;
};
```

## 20.1 Grupos

```ts
type TriggerGroup = {
  operator: "any";
  items: Trigger[];
};

type ConditionGroup = {
  operator: "all";
  items: Condition[];
};
```

v1 fija:

```text
WHEN = OR
WHILE/conditions = AND
```

No crear expression-tree arbitrario en v1.

Si una futura versión necesita nested AND/OR, migrar schema.

---

# 21. RuntimeFacts

Estado canónico que consume el RuleEngine:

```ts
type RuntimeFacts = {
  now: string;
  powerSource: "ac" | "battery" | "unknown";
  batteryPercentage: number | null;
  activeSchemeId: string | null;

  runningProcesses: Record<string, ProcessMatchState>;

  displayState: "on" | "dimmed" | "off" | "unknown";
  lidState: "open" | "closed" | "unknown";

  sessionGeneration: number;
  automationGeneration: number;
};
```

Nunca hacer que los componentes React consulten procesos o batería directamente. El estado viene de Main.

---

# 22. Triggers v1

## 22.1 MUST

### Estado persistente

```text
processRunning
timeWindow
dayOfWeek + timeWindow
acConnected
onBattery
batteryBelow
batteryAbove
activeSchemeIs
lidClosed        si hardware/API disponible
displayOff       si API disponible
```

### Eventos/edges

```text
processStarted
processStopped
atTime
schemeChanged
suspend
resume
appStarted
acChanged
batteryThresholdCrossed
lidChanged
displayChanged
```

## 22.2 SHOULD posterior

```text
foregroundProcessIs
sessionLock
sessionUnlock
```

`foregroundProcessIs` es de alto valor, pero no bloquea v1 inicial.

---

# 23. Procesos/aplicaciones

## 23.1 Requisito

El usuario debe poder definir:

```text
cuando C:\...\game.exe esté ejecutándose
→ usar Extreme
```

y:

```text
cuando termine
→ dejar de imponer Extreme
→ arbiter determina el esquema correcto restante
```

## 23.2 Match modes

```ts
type ProcessTarget = {
  match: "path" | "name";
  value: string;
};
```

Default al crear desde “Examinar”:

```text
match = path
```

`path` es más seguro y exacto.

`name` se ofrece como opción avanzada.

## 23.3 Native monitoring

NativeHost debe observar inicio/finalización sin polling agresivo.

Implementación prevista:

- WMI `Win32_ProcessStartTrace`;
- WMI `Win32_ProcessStopTrace`;
- para ruta exacta:
  - PID;
  - `OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION)`;
  - `QueryFullProcessImageNameW`.

Al iniciar NativeHost o modificar targets:

```text
reconciliation
→ buscar procesos ya ejecutándose
→ reconstruir estados
```

Al reanudar desde sleep:

```text
reconciliation
```

## 23.4 Multi-instance

`processRunning` es true si existe **>= 1 PID** que coincida.

Al cerrar una instancia:

```text
si quedan otros PIDs
→ sigue true
```

## 23.5 Fallos de acceso

Si una regla es `match:path` y Windows no permite conocer la ruta del proceso:

```text
NO hacer fallback silencioso a nombre
```

Registrar diagnóstico y no activar la regla hasta confirmar la ruta.

Para `match:name`, comparar case-insensitive.

---

# 24. Horarios

## 24.1 Time window

Ejemplo:

```text
Lun–Vie
08:00–18:00
→ Balanced
```

Modelo:

```ts
type TimeWindowTrigger = {
  type: "timeWindow";
  days: number[];       // 1=lunes ... 7=domingo
  start: string;        // HH:mm
  end: string;          // HH:mm
};
```

Usa **hora local del sistema**.

## 24.2 Cruce de medianoche

```text
Lunes 22:00–02:00
```

significa:

```text
lunes 22:00
→ martes 02:00
```

La pertenencia al día se decide por el día donde comienza la ventana.

## 24.3 Cambio de reloj / resume

No depender de un `setTimeout` de muchas horas como única fuente de verdad.

Recalcular scheduler al:

- resume;
- cambio de zona/hora;
- inicio;
- modificación de reglas;
- llegada al siguiente boundary.

Mantener un único timer hacia el próximo boundary relevante, no un timer por regla.

---

# 25. Batería y umbrales

Ejemplo:

```text
battery <= 20%
→ plan ahorro
```

Para evitar flapping:

```text
threshold = 20
hysteresis default = 2

activate <= 20
deactivate >= 22
```

Para `batteryAbove` aplicar lógica inversa.

No evaluar reglas de batería si `BatteryState.present == false`.

---

# 26. Acciones v1

## 26.1 MUST

```text
setPowerScheme
setBrightness
turnOffDisplay
showOsd
showNotification
```

`setPowerScheme` es la acción central.

## 26.2 SHOULD

```text
launchProgram
```

Implementación segura:

```text
executable path + args array
shell = false
```

No aceptar una cadena shell arbitraria.

## 26.3 LATER

```text
playSound
```

Puede añadirse después de completar MUST.

## 26.4 NO en v1

```text
shutdown
restart
logoff
arbitrary shell command
PowerShell script
registry script
```

La fila genérica “Power” observada en la aplicación de referencia no se replica de forma ambigua. Solo se implementan acciones con semántica definida en este documento.

---

# 27. Reglas stateful vs event

Cada trigger tiene naturaleza:

```text
stateful
edge
```

### Stateful

Mientras el trigger/condición sea true, la regla puede mantener una **lease**.

Ejemplos:

- processRunning;
- timeWindow;
- batteryBelow;
- acConnected.

### Edge

Solo ocurre una vez.

Ejemplos:

- processStarted;
- resume;
- atTime.

## 27.1 Acción `setPowerScheme`

Con trigger stateful:

```text
crear PowerSchemeLease
→ activa mientras la regla esté activa
```

Con trigger edge:

```text
actualizar baseline scheme si la regla gana el batch
```

Así una regla “a las 08:00 → Balanced” establece un nuevo baseline, mientras una regla “mientras game.exe corre → Extreme” lo sobrescribe temporalmente.

---

# 28. Baseline y leases

## 28.1 Baseline

`baselineSchemeId` = esquema que debería estar activo cuando no existe ninguna lease de mayor prioridad.

Se actualiza cuando:

- usuario cambia esquema sin reglas persistentes que deban dominar;
- una regla edge `setPowerScheme` se ejecuta;
- al arrancar si no hay baseline persistido válido: usar esquema activo real.

## 28.2 PowerSchemeLease

```ts
type PowerSchemeLease = {
  sourceId: string;
  schemeId: string;
  priority: number;
  order: number;
  activatedAt: number;
};
```

Arbiter:

```text
leases activas
→ filtrar válidas
→ priority DESC
→ order ASC
→ winner
→ desiredScheme
```

Si no hay leases:

```text
desiredScheme = baselineSchemeId
```

## 28.3 Exclusive

`exclusive = true`:

- mientras la regla esté activa;
- bloquea reglas de **menor prioridad**;
- no bloquea reglas de mayor prioridad;
- no bloquea manual override.

Default `false`.

Mostrar como opción avanzada:

```text
“Mientras esta regla esté activa, ignorar reglas de menor prioridad”
```

---

# 29. Manual override

Problema que se debe evitar:

```text
scheduler impone Extreme
usuario elige Balanced
100 ms después scheduler vuelve a Extreme
```

## 29.1 Default

Un cambio manual crea:

```ts
ManualOverrideLease {
  priority: 1000; // reservado interno
  schemeId;
  policy: "untilAutomationStateChanges";
}
```

Las prioridades visibles del usuario siguen en `0..100`.

## 29.2 Políticas configurables

```text
untilAutomationStateChanges   ← default
for15Minutes
for30Minutes
for60Minutes
untilAppRestart
untilCancelled
disabled
```

`disabled` significa que un cambio manual no crea override y las reglas pueden reaplicar inmediatamente.

## 29.3 Expiración default

Guardar `automationGeneration` al crear override.

Cada vez que cambia la aplicabilidad real de alguna regla stateful:

```text
automationGeneration++
```

Si:

```text
currentGeneration != overrideGeneration
```

→ override expira → reevaluar arbitraje.

Cambios irrelevantes de UI no incrementan generación.

---

# 30. Ejemplos obligatorios del RuleEngine

Estos casos deben existir como tests.

## 30.1 Gaming + horario

```text
Baseline: Balanced

Regla A:
Lun–Vie 08:00–18:00
priority 40
→ Balanced

Regla B:
game.exe running
priority 80
→ Extreme
```

Resultado:

```text
10:00 A activa       → Balanced
10:30 game inicia    → Extreme
11:30 game termina   → Balanced
18:00 A termina      → baseline
```

## 30.2 Dos procesos

```text
Game    priority 80 → Extreme
Discord priority 30 → Balanced
```

```text
Game abre      → Extreme
Discord abre   → Extreme
Game cierra    → Balanced
Discord cierra → baseline
```

## 30.3 Manual

```text
Game activo → Extreme
usuario selecciona Balanced
→ Balanced manual override

Game termina
→ automationGeneration cambia
→ override expira
→ baseline
```

## 30.4 Batería

```text
Battery <=20
priority 90
→ esquema ahorro

Game
priority 80
→ Extreme
```

Cuando batería <=20:

```text
ahorro gana por prioridad
```

Las prioridades son configurables; no hardcodear una política moral sobre “batería siempre gana”.

---

# 31. Eventos del sistema

NativeHost mantiene una ventana/message loop nativa para notificaciones donde corresponda.

Registrar:

- esquema activo;
- AC/DC;
- porcentaje de batería;
- display state;
- lid state cuando sea soportado;
- suspend/resume.

No crear un loop de polling de energía.

Al recibir eventos:

```text
native event
→ Main
→ update RuntimeFacts
→ RuleEngine recompute
→ DesiredState
→ apply diff
```

---

# 32. Protocolo Electron Main ↔ NativeHost

## 32.1 Transporte

```text
child_process.spawn(NativeHost.exe)
stdin  → requests
stdout → protocol responses/events
stderr → logs
```

Formato: **NDJSON** — un objeto JSON por línea UTF-8.

`stdout` queda reservado exclusivamente al protocolo.

## 32.2 Handshake

Main:

```json
{"type":"request","id":"1","method":"system.hello","params":{"protocolVersion":1}}
```

NativeHost:

```json
{"type":"response","id":"1","ok":true,"result":{"protocolVersion":1,"hostVersion":"1.0.0"}}
```

Si versión incompatible:

```text
no continuar silenciosamente
→ log
→ estado degradado
→ informar al usuario
```

## 32.3 Envelope

Request:

```ts
type NativeRequest = {
  type: "request";
  id: string;
  method: string;
  params?: unknown;
};
```

Response:

```ts
type NativeResponse =
  | {
      type: "response";
      id: string;
      ok: true;
      result?: unknown;
    }
  | {
      type: "response";
      id: string;
      ok: false;
      error: {
        code: string;
        message: string;
        nativeCode?: number;
      };
    };
```

Event:

```ts
type NativeEvent = {
  type: "event";
  event: string;
  data: unknown;
};
```

## 32.4 Métodos mínimos

```text
system.hello
system.getCapabilities

power.listSchemes
power.getActiveScheme
power.setActiveScheme

battery.getState

brightness.listDisplays
brightness.get
brightness.set

display.turnOff

process.setWatchTargets
process.reconcile

diagnostics.ping
```

## 32.5 Eventos mínimos

```text
power.activeSchemeChanged
power.sourceChanged
battery.changed
system.suspend
system.resume
display.stateChanged
lid.stateChanged
process.started
process.stopped
process.runningStateChanged
```

## 32.6 Timeouts

Default request timeout:

```text
3000 ms
```

Operaciones que puedan tardar más deben declararlo explícitamente.

Al timeout:

```text
reject request
→ log
→ health check
→ reiniciar host si está muerto
```

## 32.7 Restart

Si NativeHost termina inesperadamente:

```text
1. marcar native status = unavailable
2. no crashear Electron
3. reintentar:
   500 ms
   1500 ms
   5000 ms
4. máximo 3 reinicios rápidos
5. si sigue fallando → mostrar estado degradado
```

Al recuperar:

```text
handshake
→ capabilities
→ schemes
→ battery
→ brightness
→ process targets
→ reconcile
→ scheduler full recompute
```

NativeHost no debe quedar huérfano al terminar Electron.

---

# 33. Estado principal de la aplicación

```ts
type AppState = {
  nativeStatus: "starting" | "ready" | "degraded";

  schemes: PowerScheme[];
  activeSchemeId: string | null;
  baselineSchemeId: string | null;

  battery: BatteryState;
  brightnessDisplays: BrightnessDisplay[];
  capabilities: SystemCapabilities;

  runtimeFacts: RuntimeFacts;

  automation: {
    enabled: boolean;
    rules: AutomationRule[];
    activeRuleIds: string[];
    winningPowerRuleId: string | null;
    manualOverride: ManualOverride | null;
  };

  settings: AppSettings;
};
```

Main es dueño de este estado.

Renderer recibe snapshots/deltas.

---

# 34. Persistencia

Ruta:

```text
%APPDATA%\<ProductName>\
├─ settings.json
├─ settings.backup.json
└─ logs\
```

## 34.1 Escritura

Atomic write:

```text
serialize
→ write settings.tmp
→ flush
→ replace settings.json
→ conservar backup conocido bueno
```

No escribir en cada movimiento del slider.

Slider:

```text
UI updates live
→ native brightness
→ persist debounce 500–1000 ms
```

## 34.2 Settings schema

```ts
type AppSettings = {
  schemaVersion: 1;

  language: "es" | "en";
  theme: "system" | "light" | "dark";

  startup: {
    enabled: boolean;
  };

  tray: TrayIconSettings;

  power: {
    hotkey: string;
    manualOverridePolicy:
      | "untilAutomationStateChanges"
      | "for15Minutes"
      | "for30Minutes"
      | "for60Minutes"
      | "untilAppRestart"
      | "untilCancelled"
      | "disabled";
  };

  brightness: {
    selectedDisplayId: string | null;
    showPercentage: boolean;
    fixed: FixedBrightnessSettings;
  };

  osd: OsdSettings;

  automation: {
    enabled: boolean;
    baselineSchemeId: string | null;
    rules: AutomationRule[];
  };

  updates: {
    autoCheck: boolean;
    autoDownload: boolean;
  };
};
```

## 34.3 Migraciones

Toda lectura:

```text
read JSON
→ validate
→ schemaVersion
→ migrate sequentially
→ validate final
→ use
```

Nunca borrar settings antiguas por “incompatibilidad” sin intento de migración.

---

# 35. Validación

No confiar solo en TypeScript; JSON es runtime.

Crear validadores explícitos para:

- settings;
- NativeHost responses;
- IPC arguments;
- AutomationRule.

No es obligatorio añadir Zod. Preferir type guards internos si el modelo sigue manejable.

Reglas de validación:

```text
priority 0..100
opacity 0..1
duration 1000..5000
brightness 0..100
time HH:mm válido
rule id UUID/string no vacío
schemeId GUID válido
process path absoluto para match:path
```

---

# 36. Seguridad Electron

BrowserWindows:

```text
nodeIntegration = false
contextIsolation = true
sandbox = true
```

Preload:

- API explícita;
- no exponer `ipcRenderer`;
- no exponer filesystem;
- validar argumentos.

Renderer:

- CSP estricta;
- no remote content en BrowserWindow principal;
- links externos mediante handler controlado;
- `window.open` denegado por defecto.

No cargar páginas web dentro de una ventana privilegiada.

---

# 37. Ejecución de programas desde automation

`launchProgram` SHOULD, pero si se implementa:

```ts
type LaunchProgramAction = {
  type: "launchProgram";
  executable: string;
  args: string[];
};
```

Main/Native layer:

```text
shell = false
```

No:

```text
"cmd.exe /c ..."
```

a menos que el usuario seleccione explícitamente `cmd.exe` como ejecutable, lo cual sigue siendo una acción avanzada responsabilidad del usuario.

No aceptar scripts descargados desde internet.

---

# 38. OSD y notificaciones

Separar:

```text
OSD = overlay visual interno
System notification = Windows notification
```

`showOsd` usa ventana Electron ligera.

`showNotification` puede usar API `Notification` de Electron.

Evitar spam:

- cooldown por regla;
- no notificar por re-aplicaciones idempotentes;
- no mostrar OSD si desired scheme == active scheme.

---

# 39. Idempotencia

Regla crítica:

```text
desired == current
→ NO llamar API
```

Aplica a:

- power scheme;
- brillo;
- startup settings;
- hotkeys cuando no cambian.

Esto reduce flicker, logs y operaciones innecesarias.

---

# 40. Scheduler master toggle

Ajuste:

```text
Automatizaciones: ON/OFF
```

OFF:

```text
- no ejecutar reglas
- eliminar leases de reglas
- cancelar timers scheduler
- process watcher puede desregistrar targets
- conservar reglas en disco
- conservar baseline
- no cambiar esquema automáticamente
```

No debe borrar nada.

Al volver ON:

```text
reconcile facts
→ evaluar todas las reglas
→ aplicar winner
```

---

# 41. Editor de automatizaciones

## 41.1 Lista

Ejemplo:

```text
AUTOMATIZACIONES                           [ON]

[✓] Gaming
    game.exe está ejecutándose
    → Extreme
    Prioridad 80                           [Editar]

[✓] Trabajo
    Lun–Vie · 08:00–18:00
    → Balanced
    Prioridad 40                           [Editar]

[✓] Batería baja
    Batería ≤ 20%
    → Power Saver
    Prioridad 90                           [Editar]

                                [+ Nueva]
```

Acciones por regla:

```text
activar/desactivar
editar
duplicar
borrar
```

Borrar requiere confirmación si hay cambios persistentes.

## 41.2 Editor

```text
Nombre
Estado
Prioridad

CUANDO
[ selector trigger ]
[ parámetros ]

MIENTRAS
[ + condición ]

ENTONCES
[ + acción ]

AVANZADO
[ ] Ignorar reglas de menor prioridad mientras esté activa
Cooldown

[Cancelar] [Guardar]
```

No obligar a comprender leases.

## 41.3 Plantillas opcionales

SHOULD:

```text
Gaming
Trabajo
Batería baja
Con cargador
```

Plantilla solo rellena el formulario; no crea reglas sin confirmación.

---

# 42. Triggers UI mínimos

Selector `CUANDO`:

```text
Aplicación está ejecutándose
Aplicación se inicia
Aplicación se cierra
Horario
Hora exacta
Cargador conectado
Cargador desconectado
Batería por debajo de...
Batería por encima de...
Plan de energía cambia
Plan de energía es...
Al suspender
Al reanudar
Al iniciar PowerManager
Tapa del portátil
Pantalla
```

Ocultar Tapa/Pantalla si capability no soportada.

---

# 43. Conditions UI mínimos

```text
Cargador conectado
Usando batería
Batería > / >= / < / <= X
Dentro de horario
Día de semana
Aplicación ejecutándose
Aplicación no ejecutándose
Plan activo es
Tapa abierta/cerrada
Pantalla on/off
```

Todas las condiciones de una regla son AND en v1.

---

# 44. Actions UI mínimos

```text
Establecer plan de energía
Establecer brillo
Apagar pantalla
Mostrar OSD
Mostrar notificación
```

`Iniciar un programa` se añade tras completar MUST, sin cambiar el modelo.

---

# 45. Orden y prioridad

UI priority:

```text
0 ───────── 50 ───────── 100
Baja          Normal          Alta
```

Default nueva regla:

```text
50
```

No asignar automáticamente “Gaming = 80” salvo plantilla.

Tie-break:

```text
priority DESC
order ASC
```

`order` es estable y se asigna al crear; si en el futuro hay drag/drop, se actualiza.

---

# 46. Integración con cambios manuales y externos

Distinguir origen:

```ts
type SchemeChangeOrigin =
  | "user"
  | "automation"
  | "hotkey"
  | "external"
  | "startup";
```

Para comandos propios, Main conoce el origen.

Para eventos del SO posteriores a una orden propia:

```text
guardar pendingSetScheme(guid, timestamp)
→ evento coincide dentro de ventana corta
→ atribuir al comando propio
```

Si no coincide:

```text
origin = external
```

Cambio externo puede crear manual override según setting.

Default:

```text
cambio externo deliberado del esquema
→ tratar igual que cambio manual
→ manual override
```

Esto evita “pelear” con el usuario si cambia desde Panel de control.

---

# 47. Actualizaciones

## 47.1 Distribución

Destino:

```text
GitHub public repository
GitHub Releases
```

Build:

```text
Git tag vX.Y.Z
→ GitHub Actions Windows runner
→ bun install --frozen-lockfile
→ tests
→ build NativeHost
→ build Main/Preload/Renderer
→ electron-builder NSIS
→ GitHub Release
→ publish metadata
```

## 47.2 electron-updater

Provider:

```text
github
```

Configurar `owner` y `repo` explícitamente en build cuando existan. No depender permanentemente de inferencia desde `.git/config`.

Artefactos Windows esperados:

```text
Setup.exe
latest.yml
archivos requeridos por electron-builder
```

## 47.3 Política UX

Startup normal:

```text
si autoCheck
→ comprobar en background después de 15–30 s
```

No retrasar tray por update check.

Si update disponible:

```text
autoDownload=true
→ descargar background
→ informar cuando esté listo

autoDownload=false
→ mostrar opción descargar
```

Instalación default:

```text
al salir / próximo arranque controlado
```

No forzar reinicio inmediato.

## 47.4 Seguridad

Antes de distribución amplia:

`SHOULD` firma Authenticode.

No desactivar comprobaciones de firma/checksum del updater para “hacerlo funcionar”.

---

# 48. Instalador

Electron Builder:

```text
target = nsis
perMachine = false
oneClick = configurable; default false para UX clara
allowToChangeInstallationDirectory = true
```

No pedir admin para instalación per-user.

NativeHost se empaqueta como `extraResources` y se localiza mediante `process.resourcesPath` en producción.

En dev usar ruta de build local.

---

# 49. Lifecycle del NativeHost

Inicio:

```text
app ready
→ spawn host
→ handshake
→ capabilities
→ initial snapshot
→ watchers
→ scheduler
→ tray ready
```

Shutdown:

```text
scheduler stop
→ unregister shortcut
→ tray destroy
→ send graceful host shutdown si existe
→ stdin close
→ wait breve
→ kill si no sale
→ app quit
```

No dejar proceso huérfano.

---

# 50. Logging

Sin telemetría.

## 50.1 Main

Archivo:

```text
%APPDATA%\<Product>\logs\main.log
```

## 50.2 NativeHost

Escribir logs a stderr; Main los captura y guarda en:

```text
native.log
```

## 50.3 Rotación

Default:

```text
máx 1 MB por archivo
5 archivos
```

## 50.4 Privacidad

No registrar por defecto:

- contenido completo de archivos;
- command lines sensibles de procesos ajenos;
- datos personales innecesarios.

Para reglas por app, preferir basename en logs normales.

Full path solo en modo diagnóstico explícito.

---

# 51. Diagnóstico

Pantalla `Acerca de > Diagnóstico` SHOULD mostrar/copiar:

```text
app version
Electron version
NativeHost version
Windows version
active scheme GUID/name
battery capability
brightness capability
scheduler enabled
active rule IDs
native status
log folder
```

Botón:

```text
“Copiar diagnóstico”
```

No incluir settings completas ni rutas privadas sin indicarlo.

---

# 52. Rendimiento

Electron no será tan liviano como una app Win32 pura; el objetivo es **eficiencia dentro del stack elegido**.

## 52.1 Principios

- renderer lazy;
- scheduler event-driven;
- un único timer para próximos boundaries;
- no polling 1 s;
- no reenumerar procesos continuamente;
- no re-render React por eventos irrelevantes;
- cache de iconos;
- NativeHost pequeño.

## 52.2 Objetivos orientativos

En hardware moderno Windows 11:

```text
idle CPU promedio: ideal <0.5%
NativeHost idle CPU: ~0%
process automation reaction: <1 s
manual scheme change feedback: <500 ms
popup visible usable: <500 ms tras clic una vez caliente
```

Memoria se medirá y optimizará, pero no aceptar leaks crecientes.

Test de estabilidad:

```text
8 h en tray
→ working set no debe crecer continuamente
→ handles no deben crecer continuamente
→ watchers no se duplican
```

---

# 53. Accesibilidad

MUST:

- navegación por teclado;
- controles semánticos;
- focus visible;
- contraste adecuado;
- labels;
- `Esc` cierra popup/dialog;
- no depender solo del color para indicar esquema activo;
- reduced motion.

No sacrificar accesibilidad por una UI “bonita”.

---

# 54. Diseño visual

Dirección:

```text
Windows 11
minimal
clean
compact
rounded
dark/light
propio
```

Tokens CSS:

```css
:root {
  --radius-sm: 8px;
  --radius-md: 12px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
}
```

Los colores finales son reversibles y no bloquean arquitectura.

No clonar:

- icono de rayo de Battery Mode;
- disposición pixel-perfect;
- logos;
- assets.

---

# 55. Errores de UX

Errores transitorios:

```text
toast breve + log
```

Ejemplos:

- no se pudo cambiar esquema;
- brightness backend no disponible;
- hotkey ocupado;
- NativeHost reiniciándose.

Errores persistentes:

```text
banner en Settings / state degraded
```

Popup no debe llenarse de stack traces.

---

# 56. Testing

## 56.1 Rule Engine — Bun tests

MUST cubrir:

- prioridad;
- empate;
- exclusive;
- baseline;
- leases;
- manual override;
- override expiry;
- processRunning;
- multi-process;
- time window;
- midnight crossover;
- day-of-week;
- battery hysteresis;
- scheduler disabled;
- rule enable/disable;
- conditions AND;
- event vs stateful;
- duplicate native events;
- idempotencia.

## 56.2 Settings

- validación;
- defaults;
- schema migration;
- corrupción;
- backup recovery;
- atomic write.

## 56.3 NativeHost xUnit

Separar API nativa detrás de interfaces para testear:

```text
IPowerSchemeApi
IBatteryApi
IBrightnessApi
IDisplayPowerApi
IProcessApi
```

Tests:

- GUID parsing;
- friendly names;
- error mapping;
- protocol serialization;
- process target matching;
- path normalization;
- state reconciliation.

## 56.4 Integration

Windows CI:

- build;
- start NativeHost;
- handshake;
- ping;
- capabilities.

No cambiar el plan real del runner de GitHub Actions en tests normales.

Power API integration destructiva/ambiental debe ser opt-in.

## 56.5 Manual hardware matrix

Antes de release:

```text
Laptop Windows 11 con batería
Laptop conectado/desconectado
Brillo interno
Sleep/resume
Dos o más esquemas
Esquema personalizado
Proceso automation
Horario
Startup login
Update from previous version
```

---

# 57. CI

`ci.yml` en PR/push:

```text
checkout
setup Bun
bun install frozen
Biome check
TS typecheck
Bun tests
setup .NET
dotnet restore
dotnet test
build NativeHost
build Electron
```

No publicar release en CI normal.

---

# 58. Release pipeline

`release.yml` trigger:

```text
tag v*
```

Orden:

```text
validate semver
→ test
→ publish NativeHost
→ build Electron
→ electron-builder
→ generate release artifacts
→ publish GitHub Release
```

Versión app y NativeHost deben proceder de una fuente coherente.

Recomendación:

```text
package.json version = producto
NativeHost recibe versión durante build
```

---

# 59. Versionado

SemVer:

```text
MAJOR.MINOR.PATCH
```

Antes de 1.0:

```text
0.x
```

No romper settings sin migración.

`protocolVersion` del NativeHost es independiente de app version.

Incrementar `protocolVersion` solo por breaking change del protocolo.

---

# 60. Plan de implementación

No saltar fases sin cumplir criterios.

---

## P0 — Bootstrap y contratos

### Implementar

- repo;
- Bun;
- Electron;
- React;
- TypeScript strict;
- Vite;
- Biome;
- .NET solution;
- contract definitions;
- NDJSON protocol;
- CI inicial.

### Resultado verificable

```text
Electron Main inicia
→ NativeHost inicia
→ system.hello
→ response correcta
→ app cierra limpiamente
```

### Acceptance

- no renderer privilegiado;
- CI verde;
- host self-contained.

---

## P1 — Native power core

### Implementar

- list schemes;
- friendly names;
- active scheme;
- set scheme;
- active scheme notifications;
- battery;
- AC/DC;
- suspend/resume;
- capabilities.

### Test harness temporal

Puede existir CLI/debug page:

```text
list schemes
get active
set <GUID>
battery
```

No construir UI compleja antes de validar esto.

### Acceptance

- cambia esquema real;
- detecta cambio externo;
- no usa powercfg;
- no UAC.

---

## P2 — Tray y popup mínimo

### Implementar

- single instance;
- tray;
- left/right click;
- popup;
- battery;
- scheme list;
- active scheme;
- scheme switching;
- exit.

### Acceptance

- usable como selector diario;
- popup refleja cambios externos;
- segunda instancia no duplica tray.

---

## P3 — Brillo, display off, hotkey, startup

### Implementar

- brightness detection;
- slider;
- percentage;
- fixed brightness;
- display.turnOff;
- global hotkey;
- login item;
- startup mode.

### Acceptance

- apagar pantalla no suspende;
- hotkey recorre planes;
- startup no abre UI;
- fixed brightness re-aplica sin loop.

---

## P4 — Apariencia y settings

### Implementar

- settings window;
- themes;
- tray icon styles;
- scheme colors;
- OSD;
- language;
- persistence/migrations;
- diagnostics.

### Acceptance

- settings sobreviven restart;
- icon color ligado a GUID;
- OSD no toma foco;
- español/inglés completos.

---

## P5 — Scheduler engine puro

### Implementar primero sin UI compleja

- RuntimeFacts;
- trigger evaluation;
- conditions;
- rule activation;
- leases;
- arbiter;
- baseline;
- manual override;
- timers;
- battery hysteresis;
- tests exhaustivos.

### Acceptance

Todos los casos de sección 30 pasan.

No continuar si restore/priority produce resultados no deterministas.

---

## P6 — Process automation

### Implementar

- WMI start/stop watcher;
- QueryFullProcessImageNameW;
- target registration;
- reconciliation;
- processRunning;
- processStarted/stopped;
- multi-instance.

### Acceptance

```text
seleccionar exe
→ abrir
→ regla activa <1 s normalmente
→ cerrar última instancia
→ regla se retira
→ esquema correcto restante
```

Sin polling de lista completa cada segundo.

---

## P7 — Scheduler UI

### Implementar

- master toggle;
- rule list;
- create/edit/duplicate/delete;
- trigger selector;
- conditions;
- actions;
- priority;
- advanced exclusive;
- validation.

### Acceptance

Usuario puede crear sin editar JSON:

```text
Lun–Vie 08–18 → Balanced
game.exe running → Extreme
battery <=20 → plan elegido
```

---

## P8 — GitHub updater y packaging

### Implementar

- NSIS per-user;
- `extraResources` NativeHost;
- GitHub provider;
- update checking;
- update download;
- install lifecycle;
- release workflow.

### Acceptance

Prueba real:

```text
instalar versión N
→ publicar N+1
→ detectar
→ descargar
→ actualizar
→ settings y reglas intactas
```

---

## P9 — Hardening y release candidate

### Implementar

- crash recovery;
- log rotation;
- native restart;
- accessibility;
- performance profiling;
- sleep/resume edge cases;
- corrupted settings;
- deleted power scheme referenced by rule;
- missing executable target;
- update failure.

### Acceptance

Checklist completa de sección 64.

---

# 61. Edge cases obligatorios

## 61.1 Esquema borrado

Una regla referencia GUID inexistente:

```text
rule = invalid target
→ no fallback a otro plan
→ mostrar warning en rule editor
→ log
→ no crash
```

## 61.2 Esquema renombrado

Mismo GUID:

```text
actualizar friendly name
→ regla sigue funcionando
```

## 61.3 Proceso movido

Path target ya no existe:

```text
rule permanece
→ warning
→ usuario puede re-seleccionar
```

## 61.4 NativeHost crash

Reinicio y reconciliation.

## 61.5 Sleep durante time window

Al resume:

```text
recompute now
→ no “reproducir” cientos de timers perdidos
→ determinar estado actual
```

## 61.6 Batería no presente

No ejecutar battery rules.

## 61.7 Popup abierto durante cambio automático

Actualizar selection sin cerrar popup.

## 61.8 Usuario cambia esquema desde Panel de control

Detectar y aplicar política de manual override.

## 61.9 Regla cambia al esquema ya activo

No llamar `PowerSetActiveScheme`.

## 61.10 Hotkey mientras scheduler activo

Hotkey es cambio manual → override.

---

# 62. Features por prioridad

| Feature | v1 | Decisión |
|---|---:|---|
| System tray | MUST | implementar |
| Popup | MUST | implementar |
| Power Schemes clásicos | MUST | implementar |
| Cambio con un clic | MUST | implementar |
| Detección cambios externos | MUST | implementar |
| Batería/AC | MUST | implementar |
| Brillo interno | MUST | implementar |
| Fixed brightness | MUST | implementar |
| Apagar display | MUST | implementar |
| Inicio Windows | MUST | implementar |
| Hotkey | MUST | implementar |
| Iconos propios | MUST | implementar |
| Color por GUID | MUST | implementar |
| OSD | MUST | implementar |
| Español/Inglés | MUST | implementar |
| Scheduler master toggle | MUST | implementar |
| Horarios | MUST | implementar |
| Procesos running/start/stop | MUST | implementar |
| Prioridades | MUST | implementar |
| Leases/restauración | MUST | implementar |
| Manual override | MUST | implementar |
| Battery hysteresis | MUST | implementar |
| GitHub updater | MUST | implementar |
| Launch program action | SHOULD | después de MUST |
| System notification action | MUST | implementar |
| Foreground app trigger | SHOULD | después de v1 core |
| Templates rules | SHOULD | después de editor |
| DDC/CI externo | LATER | no v1 |
| Play sound | LATER | no bloquear v1 |
| Power Modes Win11 | NO | no implementar |
| Windows 10 | NO | no implementar |
| Cloud | NO | no implementar |
| Windows Service | NO | no implementar |

---

# 63. Definition of Done por feature

Una feature no está terminada si solo existe UI.

Debe cumplir:

```text
1. comportamiento real;
2. error handling;
3. persistencia si aplica;
4. tests de lógica;
5. traducciones es/en;
6. keyboard/accessibility;
7. logs útiles;
8. no romper scheduler;
9. acceptance manual definida;
```

---

# 64. Criterios de aceptación v1

## Aplicación

- [ ] Inicia sin UAC.
- [ ] Solo una instancia.
- [ ] Tray aparece correctamente.
- [ ] Startup con Windows no abre ventana.
- [ ] Salir elimina tray, shortcut y host.
- [ ] No queda NativeHost huérfano.

## Power

- [ ] Lista todos los Power Schemes disponibles.
- [ ] Incluye esquemas personalizados.
- [ ] Muestra el activo.
- [ ] Cambia de esquema.
- [ ] Verifica el GUID tras el cambio.
- [ ] Detecta cambios externos.
- [ ] Renombrar un esquema no rompe reglas.
- [ ] Borrar esquema deja regla inválida, no la redirige.

## Battery

- [ ] AC/DC correcto.
- [ ] Porcentaje correcto.
- [ ] Sin batería no falla.
- [ ] Threshold rules tienen hysteresis.

## Brightness

- [ ] Detecta pantalla interna compatible.
- [ ] Slider refleja valor real.
- [ ] Respeta niveles soportados.
- [ ] Fixed brightness funciona tras AC/scheme change.
- [ ] No loop de reintentos.

## Display

- [ ] “Apagar pantalla” apaga monitor.
- [ ] No llama sleep.
- [ ] No llama hibernate.
- [ ] No bloquea sesión.

## Tray/UI

- [ ] Left click abre/cierra popup.
- [ ] Right click abre menú.
- [ ] UI funciona dark/light.
- [ ] Icono propio.
- [ ] Color por scheme GUID.
- [ ] Porcentaje opcional.
- [ ] Popup usable por teclado.

## OSD

- [ ] No toma foco.
- [ ] Click-through.
- [ ] Desaparece.
- [ ] Respeta opacidad/duración.
- [ ] Muestra nombre si está habilitado.

## Scheduler

- [ ] Master ON/OFF.
- [ ] Time windows.
- [ ] Weekdays.
- [ ] Process running.
- [ ] Process started.
- [ ] Process stopped.
- [ ] AC/DC.
- [ ] Battery thresholds.
- [ ] Scheme conditions.
- [ ] Suspend/resume.
- [ ] App start.
- [ ] Priority.
- [ ] Tie-break determinista.
- [ ] Exclusive.
- [ ] Baseline.
- [ ] Leases.
- [ ] Manual override.
- [ ] Restore correcto.
- [ ] Multi-instance process.
- [ ] Reconcile startup/resume.
- [ ] Scheduler no hace polling agresivo.

## Persistencia

- [ ] Atomic settings write.
- [ ] Backup recovery.
- [ ] schemaVersion.
- [ ] Migraciones.
- [ ] No se pierden reglas tras update.

## NativeHost

- [ ] NDJSON válido.
- [ ] stdout sin logs.
- [ ] stderr logs.
- [ ] handshake.
- [ ] restart automático.
- [ ] protocol version.
- [ ] no UAC.

## Update

- [ ] GitHub Release detectable.
- [ ] NSIS per-user.
- [ ] Descarga.
- [ ] Instalación.
- [ ] Settings conservados.
- [ ] Update failure no inutiliza app.

## Rendimiento

- [ ] Sin polling de 1 s.
- [ ] Sin crecimiento continuo de memoria/handles.
- [ ] Process automation reacciona normalmente <1 s.
- [ ] Popup caliente abre aproximadamente <500 ms.
- [ ] Idle CPU bajo y estable.

---

# 65. Decisiones cerradas

```text
[R] Windows 11 únicamente.
[R] Power Schemes clásicos únicamente.
[R] Electron + React + TypeScript para GUI.
[R] C#/.NET para integración Windows.
[R] Automatizaciones por hora.
[R] Automatizaciones por app/proceso.
[R] Inicio con Windows.
[R] Iconos propios y modernos.
[R] Color de icono basado en esquema.
[R] OSD temporal.
[R] Apagar pantalla real, no sleep.
[R] GitHub como distribución eventual.

[D] NativeHost separado.
[D] NDJSON stdio.
[D] RuleEngine declarativo.
[D] Leases + arbiter.
[D] Manual override.
[D] Renderer lazy.
[D] JSON local.
[D] NSIS per-user.
[D] electron-updater + GitHub Releases.
[D] clean-room respecto a Battery Mode.

[A] x64 inicial.
[A] .NET 10 self-contained.
[A] Español e inglés.
[A] Priority 0..100.
[A] Override interno priority 1000.
[A] OSD 2 s.
[A] Fixed brightness debounce 750 ms + un retry.
```

---

# 66. Decisiones que NO bloquean el desarrollo

Pueden decidirse posteriormente sin alterar arquitectura:

```text
nombre comercial
logo final
paleta exacta
tipografía final
tamaño exacto del popup
owner/repo GitHub
licencia del proyecto propio
code-signing certificate
foreground-app trigger
DDC/CI
ARM64
```

La IA no debe detener P0–P7 por estos puntos.

---

# 67. Prohibiciones de implementación

No hacer:

```text
powercfg /setactive ... como backend principal
PowerShell Get-CimInstance para todo
setInterval(..., 1000) para buscar procesos
setInterval(..., 1000) para esquema/batería
nodeIntegration=true
Renderer → child_process
Renderer → filesystem
Renderer → Win32
guardar reglas por nombre de scheme
restaurar simplemente “el scheme anterior”
un timer independiente infinito por cada regla
admin manifest general
copiar código/assets de Battery Mode
```

---

# 68. Referencias técnicas

Estas referencias son para entender APIs y comportamiento; no son permiso para copiar implementación de terceros.

Microsoft:

- Power Scheme Management  
  https://learn.microsoft.com/en-us/windows/win32/power/managing-power-schemes
- Power Setting GUIDs  
  https://learn.microsoft.com/en-us/windows/win32/power/power-setting-guids
- WM_SYSCOMMAND / SC_MONITORPOWER  
  https://learn.microsoft.com/en-us/windows/win32/menurc/wm-syscommand
- QueryFullProcessImageName  
  https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-queryfullprocessimagenamew
- WMI brightness APIs  
  https://learn.microsoft.com/en-us/windows/win32/wmicoreprov/wmimonitorbrightnessmethods

Electron:

- `app.setLoginItemSettings`  
  https://www.electronjs.org/docs/latest/api/app

Electron Builder:

- Auto Update  
  https://www.electron.build/docs/features/auto-update/
- Publish/GitHub  
  https://www.electron.build/publish/

Referencia conductual de Battery Mode:

- Producto/documentación pública  
  https://en.bmode.tarasovlabs.com/
- Scheduler  
  https://en.bmode.tarasovlabs.com/scheduler-help
- CLI/brightness public docs  
  https://en.bmode.tarasovlabs.com/help

Usar Battery Mode únicamente como referencia de UX/comportamiento observable. No reutilizar su código ni assets.

---

# 69. Primera instrucción para una IA implementadora

Al recibir este documento, la IA debe proceder así:

```text
1. Leer SPEC.md completo.
2. Crear checklist de P0.
3. Crear estructura del repo.
4. Configurar CI y tooling.
5. Implementar protocolo Main↔NativeHost.
6. Conseguir handshake funcional.
7. No empezar UI avanzada todavía.
8. Completar P1 y verificar APIs reales.
9. Continuar fases en orden.
10. Antes de cada fase:
    - releer su sección;
    - revisar criterios de aceptación;
    - no introducir features LATER.
```

Si algo falla en hardware real:

```text
observar
→ identificar capa responsable
→ corregir sin romper contratos
→ añadir test/regresión
→ actualizar ADR solo si cambia arquitectura
```

---

# 70. Resultado final esperado

El producto v1 debe sentirse así:

```text
Windows inicia
→ PowerManager aparece silenciosamente en tray

usuario hace clic
→ popup inmediato
→ ve batería, plan y brillo
→ cambia plan con un clic
→ puede apagar físicamente la pantalla

usuario configura:
“Lun–Vie 08:00–18:00 → Balanced”
“game.exe ejecutándose → Extreme”
“batería <=20% → plan de ahorro”

RuleEngine:
→ resuelve prioridades
→ no pelea con cambios manuales
→ restaura correctamente
→ sobrevive sleep/resume
→ no hace polling agresivo

GitHub publica nueva versión
→ app detecta update
→ descarga
→ actualiza
→ conserva toda la configuración
```

Ese comportamiento es el objetivo contractual de v1.
