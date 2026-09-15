# Powerfy ⚡

> **Gestor de energía inteligente y de alto rendimiento para Windows 11 / 10**
> *Control de esquemas de energía clásicos, sincronización de brillo por eventos de hardware ACPI/WMI sin consumo en reposo y automatización avanzada de perfiles por procesos, batería y horarios.*

[![GitHub Release](https://img.shields.io/github/v/release/marcomarca/Powerfy?color=blue&logo=github)](https://github.com/marcomarca/Powerfy/releases)
[![Build & Release](https://github.com/marcomarca/Powerfy/actions/workflows/release.yml/badge.svg)](https://github.com/marcomarca/Powerfy/actions/workflows/release.yml)
[![.NET 10 LTS](https://img.shields.io/badge/.NET-10.0%20LTS-512bd4?logo=dotnet)](https://dotnet.microsoft.com/)
[![Electron](https://img.shields.io/badge/Electron-34-47848F?logo=electron)](https://www.electronjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🚀 Descarga y Opciones de Uso

Descarga la última versión desde la sección de **[Releases](https://github.com/marcomarca/Powerfy/releases)**:

| Formato | Archivo | Descripción |
| :--- | :--- | :--- |
| **Instalador Oficial** | `Powerfy-Setup-x.y.z.exe` | Instalación por usuario (sin requerir elevación UAC), accesos directos e integración con inicio de Windows. |
| **Ejecutable Portable** | `Powerfy-Portable-x.y.z.exe` | Archivo ejecutable único y autónomo. No requiere instalación ni permisos de administrador. |
| **Paquete Comprimido** | `Powerfy-x.y.z-win-x64.zip` | Carpeta completa con binarios listos para descomprimir y ejecutar en cualquier equipo. |

---

## ✨ Características Principales

### ⚡ Control Total de Esquemas de Energía Clásicos
- Detección y conmutación instantánea de esquemas nativos de Windows (`Equilibrado`, `Alto rendimiento`, `Economizador`, `Rendimiento máximo`, y perfiles personalizados OEM).
- Conmutación limpia sin requerir elevación de permisos (UAC `asInvoker`) mediante llamadas Win32 `Powrprof.dll`.
- Colores representativos por GUID para identificación rápida en el área de notificación (System Tray).

### ☀️ Sincronización de Brillo en Tiempo Real (0% CPU en Reposo)
- **Cero sondeo / Zero-polling**: En lugar de consultar continuamente el estado del hardware, utiliza un sumidero de eventos ACPI/WMI (`WmiMonitorBrightnessEvent`) y broadcasts de energía Win32 (`GUID_DEVICE_POWER_POLICY_VIDEO_BRIGHTNESS`).
- Cualquier ajuste realizado externamente (teclas Fn del teclado, Centro de Control de Windows o aplicaciones OEM) se refleja inmediatamente en la interfaz de Powerfy con cero impacto en la batería.

### 🤖 Motor de Automatización y Reglas Declarativas
- **Disparador por Procesos**: Conmuta a perfiles de alto rendimiento al abrir juegos (ej. `Cyberpunk2077.exe`, `valorant.exe`) o herramientas de diseño (ej. `Premiere.exe`, `Blender.exe`), y restaura el perfil base al cerrarlos.
- **Disparador por Batería**: Aplica esquemas de ahorro ante porcentajes críticos con **histéresis configurable** para evitar oscilaciones rápidas.
- **Disparador por Horario**: Soporta ventanas de tiempo con cruce de medianoche (ej. 23:00 a 06:00).
- **Sobrescrituras Manuales Inteligentes**: Conmutación manual temporal con expiración automática ante el siguiente cambio de estado o por temporizador.

### ⌨️ Atajo Global de Teclado y Notificaciones OSD
- Presiona `Alt+P` en cualquier momento para ciclar entre tus esquemas de energía disponibles.
- **Notificación en Pantalla (OSD)**: Visualización no intrusiva con el nombre y color distintivo del esquema activado.

### 🎨 Interfaz Moderna y Eficiente
- Menú emergente flotante en bandeja del sistema estilo Windows 11.
- Panel de configuración completo con 8 pestañas organizadas.
- Soporte multilingüe completo (Español / English) y temas automáticos Claro / Oscuro.

---

## 🏛️ Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────┐
│               Electron / React 19 Frontend             │
│        (System Tray · Popup UI · Settings Dashboard)   │
└───────────────────────────▲────────────────────────────┘
                            │ NDJSON bidireccional (stdio)
┌───────────────────────────▼────────────────────────────┐
│         PowerManager.NativeHost (.NET 10 LTS C#)       │
│  ┌──────────────────┬─────────────────┬──────────────┐ │
│  │ Powrprof P/Invoke│ WMI Event Sinks │ Win32 Kernel │ │
│  │ (Power Schemes)  │ (Brightness ACPI│ (Battery /   │ │
│  │                  │  Process Watch) │  Lid State)  │ │
│  └──────────────────┴─────────────────┴──────────────┘ │
└────────────────────────────────────────────────────────┘
```

1. **Aislamiento de Privilegios y Seguridad**: La interfaz de usuario opera bajo contexto aislado (`contextIsolation: true`, `sandbox: false`) comunicándose únicamente a través de la API expuesta en el `preload`.
2. **Host Nativo C# .NET 10**: Ejecutable autónomo (*self-contained single-file*) que ejecuta las llamadas nativas de Windows y transmite eventos y respuestas en formato NDJSON estructurado.

---

## 🛠️ Compilación desde el Código Fuente

### Requisitos Previos
- **Windows 10 / 11 x64**
- **[.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)**
- **[Bun](https://bun.sh/)** (v1.2+)

### Instrucciones de Construcción

```bash
# 1. Clonar el repositorio
git clone https://github.com/marcomarca/Powerfy.git
cd Powerfy

# 2. Instalar dependencias del monorepo
bun install

# 3. Ejecutar pruebas unitarias (TypeScript y C# .NET)
bun test
bun run test:native

# 4. Iniciar en modo desarrollo
bun start

# 5. Compilar instaladores y versión portable
bun run package
```

Los ejecutables generados quedarán disponibles en `apps/desktop/dist-package/`:
- `Powerfy-Setup-1.0.0.exe` (Instalador NSIS)
- `Powerfy-Portable-1.0.0.exe` (Portable ejecutable)
- `Powerfy-1.0.0-win-x64.zip` (Archivo Zip)

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.
