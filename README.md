# Sistema Entrenador de Productividad - Albeiro

## 🎯 ¿Qué es esto?

Un entrenador digital que te hace rendir cuentas semanalmente, te obliga a comprometerte solo a 2 cosas, celebra tus rachas y elimina agresivamente lo que no haces.

## 📁 Estructura del Proyecto

```
productivity-coach/
├── coach-data.json          # Tu base de datos (única fuente de verdad)
├── coach-memory.json        # Cerebro del coach (patrones, insights, memoria)
├── profile.json             # Tu perfil (quién eres, tus áreas de vida)
├── backlog/                 # 🆕 Mega-proyectos (cursos, apps, productos)
│   └── *.json              # Archivos de proyectos largos
├── skills/                  # Skills del entrenador
│   ├── checkin/            # Check-in semanal (lunes)
│   ├── check/              # Revisión mid-week (miércoles)
│   ├── review/             # Cierre de semana (viernes)
│   ├── stats/              # Ver estadísticas
│   ├── capture/            # Capturar ideas rápidas
│   ├── analyze/            # 🆕 Detección automática de patrones
│   ├── reflect/            # 🆕 Reflexión mensual profunda
│   ├── daily-checkin/      # 🆕 Check-in diario opcional
│   ├── health-check/       # 🆕 Alertas de burnout y balance
│   ├── project-manager/    # 🆕 Desglose de tareas elefante
│   ├── roadmap/            # 🆕 Visualización de mega-proyectos
│   └── sprint/             # 🆕 Estrategia de ejecución (goteo/batching)
├── HOW_TO_USE.md           # Guía de persistencia
└── README.md               # Este archivo
```

## 🚀 Comandos Disponibles

### Rutina semanal

**Lunes 9am:**
```bash
claude code checkin
```
- Revisas semana pasada
- Te comprometes a hasta 6 cosas (1 por área)

**Miércoles 2pm:**
```bash
claude code check
```
- Revisión rápida de progreso
- Ajustas si es necesario

**Viernes 5pm:**
```bash
claude code review
```
- Cierras la semana
- Ves stats y racha

### Cuando necesites

**Capturar idea rápida:**
```bash
claude code capture "tu idea aquí"
```

**Ver estadísticas:**
```bash
claude code stats
```

**🆕 Análisis de patrones:**
```bash
claude code analyze
```
- Detecta patrones automáticamente
- Identifica procrastinación
- Alerta de burnout

**🆕 Reflexión mensual:**
```bash
claude code reflect
```
- Sesión profunda de introspección
- Identificar qué cambiar

**🆕 Check-in diario (opcional):**
```bash
claude code daily
```
- Revisión rápida matutina
- Mantener momentum

**🆕 Chequeo de salud:**
```bash
claude code health-check
```
- Detecta desbalance
- Previene burnout

**🏔️ Ver mega-proyectos:**
```bash
claude code roadmap
```
- Progreso de proyectos largos
- Visualización de hitos

**🎯 Definir estrategia:**
```bash
claude code sprint "proyecto"
```
- Goteo vs Batching
- Ajustar ritmo de trabajo

## 💡 Filosofía del Sistema

### ✅ Qué SÍ es
- Entrenador que te hace rendir cuentas
- Sistema para CUMPLIR (no para acumular)
- Organizar 6 áreas de vida (trabajo, clientes, contenido, salud, familia, aprender)
- Ver progreso a largo plazo
- Evitar abandono de proyectos
- **🆕 Detectar patrones y prevenir burnout**

### ❌ Qué NO es
- Sistema de tareas diarias
- Planificación de proyectos grandes
- Listas de TODO infinitas
- Algo rígido que te juzga

## 🎮 Reglas del Juego

### Límites duros
- ⚠️ **Máximo 6 compromisos por semana** (1 por área de vida)
- 🗑️ Si algo lleva >2 semanas sin tocar → se elimina
- 🚫 No agregar cosas a media semana (excepto emergencias)
- 📥 Máximo 10 ideas en inbox
- **🆕 Balance obligatorio**: Si alerta de burnout, se fuerzan compromisos familia/salud

### Cálculo de racha
- **Racha** = semanas consecutivas completando 100% de compromisos
- Si completas 6/6 → racha continúa 🔥
- Si completas 5/6 o menos → racha se rompe
- **🆕 Excepción**: Si `health-check` fuerza compromisos por burnout, solo esos cuentan para racha esa semana

### Métricas que importan
- % de cumplimiento (no cantidad de tareas)
- Racha actual vs mejor racha
- **Terminar > Planear**

## 🔄 Flujo Semanal Típico

```
LUNES 9am
└─> claude code checkin
    ├─ Revisas semana anterior
    └─ Te comprometes a 2 cosas

DURANTE LA SEMANA
└─> claude code capture "idea que se me ocurrió"
    └─ Queda guardada para revisar el lunes

MIÉRCOLES 2pm
└─> claude code check
    ├─ ¿Cómo vas?
    └─ Ajustas si algo no es prioridad

VIERNES 5pm
└─> claude code review
    ├─ Marcas qué cumpliste
    ├─ Ves stats y racha
    └─ Celebras o analizas

CUANDO QUIERAS
└─> claude code stats
    └─ Ves tu progreso histórico
```

## 📊 Objetivos Esperados

### A corto plazo (primeras 4 semanas)
- ✅ Hábito de accountability - Reportar semanalmente
- ✅ Completar MÁS - Aunque sean menos tareas, terminarlas
- ✅ Listas vacías - No acumular tareas fantasma
- ✅ Consciencia - Saber qué abandonas y por qué

### A mediano plazo (2-3 meses)
- 🔥 Racha consistente - 4+ semanas seguidas cumpliendo
- 📈 Patrones claros - Entender qué tipo de tareas sí terminas
- ⏱️ Mejor estimación - Saber cuánto tiempo te toman las cosas
- ⚖️ Separación trabajo/personal - Balancear mejor

### A largo plazo (6+ meses)
- 🎯 70%+ de cumplimiento mensual
- 📦 Menos abandono de proyectos - Por dividir en pasos pequeños
- 🧠 Sistema internalizado - No necesitas pensar "qué hago"
- 📚 Historial valioso - Datos reales de tu productividad

## 🔧 Componentes Técnicos

### coach-data.json
Tu única fuente de verdad. Contiene:
- **config**: Configuración (nombre, zona horaria, idioma)
- **current_week**: Compromisos de la semana actual
- **inbox**: Ideas capturadas (trabajo/personal)
- **history**: Semanas anteriores
- **stats**: Métricas (racha, cumplimiento, etc)

### Skills
Cada skill es una carpeta con `SKILL.md` que define:
- **Propósito**: Qué hace el skill
- **Comportamiento**: Cómo habla el entrenador
- **Reglas de negocio**: Lógica y límites
- **Ejemplos**: Interacciones de ejemplo

## ⚠️ Importante

Este sistema **NO** es para:
- Planear proyectos grandes
- Gestión de tareas diarias
- Listas de TODO infinitas

Este sistema **SÍ** es para:
- Accountability semanal
- Completar cosas importantes
- Ver progreso a largo plazo
- Evitar abandono

## 🎉 Primer Uso

```bash
# Ejecuta tu primer check-in
claude code checkin
```

¡Y comienza tu racha! 💪
