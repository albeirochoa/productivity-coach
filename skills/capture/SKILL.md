# Skill: Capture - Captura Rápida de Ideas

## Propósito
Capturar rápidamente ideas que surgen durante la semana SIN comprometerse a ellas inmediatamente. Van al inbox para revisarlas en el próximo check-in.

## Cuándo usar
- Cuando Albeiro ejecute: `claude code capture "descripción de la idea"`
- Para ideas que surgen pero no son compromisos inmediatos

## Comportamiento

### Tono
- Rápido y eficiente
- Sin conversación larga
- Solo captura y confirma
- **REGLA DE LOS 2 MINUTOS**: Si la idea toma < 2 minutos (ej: "Llamar a Juan"), el Coach debe decir: "Ey, eso toma menos de 2 minutos. ¿Por qué no lo haces YA en lugar de anotarlo?". Solo se captura si Albeiro insiste o no puede hacerlo ahora.

### Flujo

#### Uso básico
```bash
claude code capture "hacer dashboard de métricas para clientes"
```

#### Respuesta de Claude
```
📥 Capturado.

¿Trabajo o personal? (t/p)

> t

Ok, agregado al inbox de trabajo.
Lo revisamos en el próximo check-in.

Inbox trabajo: 3 ideas pendientes
```

#### Si se ejecuta sin argumento
```bash
claude code capture
```
```
¿Qué idea quieres capturar?

> [Albeiro escribe idea]

¿Trabajo o personal? (t/p)

> [Albeiro responde]

Listo, capturado.
```

## Reglas de negocio

### NO es compromiso automático
- Ideas capturadas van a `inbox`
- En el check-in del lunes, Claude las muestra
- Albeiro decide si se compromete o no

### Formato en inbox
```json
{
  "inbox": {
    "work": [
      {
        "id": "idea-001",
        "description": "hacer dashboard de métricas para clientes",
        "captured_date": "2026-02-04T16:30:00-05:00",
        "status": "pending"
      }
    ],
    "personal": []
  }
}
```

### Durante check-in del lunes
```
[Después de revisar semana anterior]

Tienes 3 ideas en el inbox de trabajo:
1. Hacer dashboard de métricas para clientes
2. Aprender sobre Firebase Auth
3. Actualizar blog con nuevos posts

¿Alguna de estas se convierte en compromiso esta semana?

> la 1

Ok, tu primer compromiso: Dashboard de métricas.
¿Cuál es el PRIMER paso pequeño? (para no abandonar)

> diseñar mockup en Figma

Perfecto. Compromiso:
[Trabajo] Diseñar mockup dashboard en Figma

Ideas 2 y 3 se quedan en inbox para después.
```

## Límite de inbox
- Máximo 10 ideas por categoría (trabajo/personal)
- Si se llena, Claude avisa:
```
  Inbox lleno (10/10).
  
  Antes de agregar más, limpiemos.
  ¿Cuáles de estas ya NO te interesan? (números separados por coma)
  
  1. [Idea vieja 1]
  2. [Idea vieja 2]
  ...
```

## Archivo que modificas
- Lee y escribe: `~/productivity-coach/coach-data.json`

## Ejemplo de interacción completa
```bash
$ claude code capture "crear video tutorial sobre Google Ads scripts"

📥 Capturado.

¿Trabajo o personal? (t/p)
> t

Ok, agregado al inbox de trabajo.
Lo revisamos en el próximo check-in.

Inbox trabajo: 4 ideas
Inbox personal: 1 idea
```

## Variante: Captura con contexto adicional
```bash
$ claude code capture

¿Qué idea quieres capturar?
> automatizar reporte semanal de clientes

¿Trabajo o personal? (t/p)
> t

¿Quieres agregar algún contexto? (enter para skip)
> usar n8n + google sheets + email

Listo, capturado con contexto.

[Trabajo] Automatizar reporte semanal
Contexto: usar n8n + google sheets + email

Lo revisamos el lunes.
```

## Notas importantes
- Capture es para NO perder ideas
- NO para comprometerse inmediatamente
- En check-in del lunes se decide qué hacer con inbox
- Inbox se limpia periódicamente (ideas >1 mes se preguntan si eliminar)
