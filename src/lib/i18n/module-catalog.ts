import type { Language } from '@/contexts/language-context'

export type ModuleCatalogEntry = {
  title: string
  description: string
  features: string[]
}

const catalog: Record<string, Record<Language, ModuleCatalogEntry>> = {
  'day-trader': {
    en: {
      title: 'Market Advisor',
      description:
        'Advanced stock analysis and trading pattern detection with AI-powered insights.',
      features: ['Stock Analysis', 'Pattern Detection', 'AI Predictions', 'Risk Management'],
    },
    es: {
      title: 'Asesor de Mercado',
      description:
        'Análisis avanzado de acciones y detección de patrones de trading con insights impulsados por IA.',
      features: [
        'Análisis de acciones',
        'Detección de patrones',
        'Predicciones con IA',
        'Gestión de riesgo',
      ],
    },
  },
  'budget-optimizer': {
    en: {
      title: 'Budget Master',
      description:
        'Budget, income, and spending visibility, analysis, optimization, and recommendations',
      features: ['Expense Tracking', 'Budget Analysis', 'Savings Goals', 'Investment Advice'],
    },
    es: {
      title: 'Maestro de Presupuesto',
      description:
        'Visibilidad, análisis, optimización y recomendaciones de presupuesto, ingresos y gastos',
      features: [
        'Seguimiento de gastos',
        'Análisis de presupuesto',
        'Metas de ahorro',
        'Asesoría de inversión',
      ],
    },
  },
  'grocery-optimizer': {
    en: {
      title: 'Grocery Store Optimizer',
      description: 'AI-powered grocery receipt analysis and cost optimization recommendations.',
      features: [
        'Receipt Analysis',
        'Cost Comparison',
        'Store Recommendations',
        'Savings Optimization',
      ],
    },
    es: {
      title: 'Optimizador de Supermercado',
      description:
        'Análisis de recibos de compras y recomendaciones de optimización de costos con IA.',
      features: [
        'Análisis de recibos',
        'Comparación de costos',
        'Recomendaciones de tiendas',
        'Optimización de ahorro',
      ],
    },
  },
  'ai-coach': {
    en: {
      title: 'Life Coach',
      description: 'Personal AI coach for goal setting, motivation, and life optimization.',
      features: ['Goal Setting', 'Motivation', 'Habit Tracking', 'Progress Analysis'],
    },
    es: {
      title: 'Coach de Vida',
      description: 'Coach personal con IA para metas, motivación y optimización de vida.',
      features: [
        'Establecimiento de metas',
        'Motivación',
        'Seguimiento de hábitos',
        'Análisis de progreso',
      ],
    },
  },
  'fitness-tracker': {
    en: {
      title: 'Fitness Tracker',
      description:
        'Comprehensive fitness tracking with recommended workout and nutrition plan based on your daily biometrics, energy level, and stress level',
      features: ['Workout Plans', 'Progress Tracking', 'Nutrition Analysis', 'Recovery Monitoring'],
    },
    es: {
      title: 'Rastreador de Fitness',
      description:
        'Seguimiento integral de fitness con planes de entrenamiento y nutrición según tus biométricos diarios, energía y estrés',
      features: [
        'Planes de entrenamiento',
        'Seguimiento de progreso',
        'Análisis nutricional',
        'Monitoreo de recuperación',
      ],
    },
  },
  'relationship-manager': {
    en: {
      title: 'Relationship Manager',
      description:
        'Consider how current friendships align with your goals, projects, tasks, and gain ideas for greater outreach and connection into your relationships',
      features: [
        'Contact Management',
        'Interaction Tracking',
        'Reminder System',
        'Relationship Insights',
      ],
    },
    es: {
      title: 'Gestor de Relaciones',
      description:
        'Evalúa cómo tus amistades se alinean con tus metas, proyectos y tareas, y obtén ideas para fortalecer tus conexiones',
      features: [
        'Gestión de contactos',
        'Seguimiento de interacciones',
        'Sistema de recordatorios',
        'Insights de relaciones',
      ],
    },
  },
  'dating-manager': {
    en: {
      title: 'Dating Management',
      description:
        'Evaluate potential partners based on the life you are stacking and building — comparative analysis and date ideas to support your relationship alignment',
      features: [
        'Partner Criteria from Your Goals',
        'Prospect Cards & AI Evaluation',
        'Photo & Connection Analysis',
        'Date Idea Recommendations',
      ],
    },
    es: {
      title: 'Gestión de Citas',
      description:
        'Evalúa posibles parejas según la vida que estás construyendo — análisis comparativo e ideas de citas alineadas con tus metas',
      features: [
        'Criterios de pareja según tus metas',
        'Tarjetas de prospectos y evaluación con IA',
        'Análisis de fotos y conexión',
        'Recomendaciones de citas',
      ],
    },
  },
  'calendar-ai': {
    en: {
      title: 'Lifestacks Calendar',
      description:
        'Connect Google Calendar and give LifeStacks a slot to schedule critical tasks and habits you select',
      features: [
        'Google Calendar sync',
        'AI scheduling',
        'Editable time slots',
        'Recurring habits',
      ],
    },
    es: {
      title: 'Calendario Lifestacks',
      description:
        'Conecta Google Calendar y deja que LifeStacks programe tareas críticas y hábitos que elijas',
      features: [
        'Sincronización con Google Calendar',
        'Programación con IA',
        'Horarios editables',
        'Hábitos recurrentes',
      ],
    },
  },
  'analytics-dashboard': {
    en: {
      title: 'Productivity Analyst',
      description: 'Comprehensive view of your LifeStacks metrics.',
      features: ['Data Visualization', 'Trend Analysis', 'Predictive Insights', 'Custom Reports'],
    },
    es: {
      title: 'Analista de Productividad',
      description: 'Vista integral de tus métricas de LifeStacks.',
      features: [
        'Visualización de datos',
        'Análisis de tendencias',
        'Insights predictivos',
        'Informes personalizados',
      ],
    },
  },
  'focus-enhancer': {
    en: {
      title: 'Focus Enhancer',
      description:
        'Accountability and therapeutic conversations to advise how your phone app time matches up with your life goals',
      features: [
        'Screen Time Analysis',
        'Therapeutic Conversations',
        'Digital Wellness',
        'Habit Building',
      ],
    },
    es: {
      title: 'Mejora de Enfoque',
      description:
        'Conversaciones terapéuticas y de responsabilidad sobre cómo el tiempo en apps coincide con tus metas de vida',
      features: [
        'Análisis de tiempo en pantalla',
        'Conversaciones terapéuticas',
        'Bienestar digital',
        'Construcción de hábitos',
      ],
    },
  },
  'dream-catcher': {
    en: {
      title: 'Dream Catcher',
      description:
        'A conversational, personal assessment to discover your desires, dreams, create your vision, and generate actionable goals you can move towards.',
      features: [
        'Personality Assessment',
        'Personal Discovery',
        'Dream Identification',
        'Vision Creation',
        'Goal Generation',
      ],
    },
    es: {
      title: 'Atrapador de Sueños',
      description:
        'Evaluación personal conversacional para descubrir deseos, sueños, crear tu visión y generar metas accionables.',
      features: [
        'Evaluación de personalidad',
        'Descubrimiento personal',
        'Identificación de sueños',
        'Creación de visión',
        'Generación de metas',
      ],
    },
  },
  'narrative-integration': {
    en: {
      title: 'I Am Present',
      description: 'Make peace with the past and reduce blocks to your productivity and wellbeing',
      features: [
        'State Check',
        'Safety Gate',
        'Event Inventory',
        'Rumination Detection',
        'Meaning-making',
        'Present Grounding',
        'Future Reorientation',
        'Closure Summary',
      ],
    },
    es: {
      title: 'Estoy Presente',
      description: 'Haz las paces con el pasado y reduce bloqueos a tu productividad y bienestar',
      features: [
        'Chequeo de estado',
        'Puerta de seguridad',
        'Inventario de eventos',
        'Detección de rumiación',
        'Creación de significado',
        'Anclaje al presente',
        'Reorientación futura',
        'Resumen de cierre',
      ],
    },
  },
  'rewards-self-care': {
    en: {
      title: 'Rewards & Self-Care',
      description:
        'Trade your points in for the personal rewards you determine that enhance your enjoyment and self-care',
      features: [
        'Points balance',
        'Available rewards',
        'Partner rewards',
        'Redeemed history',
        'Custom milestones',
      ],
    },
    es: {
      title: 'Recompensas y Autocuidado',
      description:
        'Canjea tus puntos por recompensas personales que mejoren tu disfrute y autocuidado',
      features: [
        'Saldo de puntos',
        'Recompensas disponibles',
        'Recompensas de socios',
        'Historial canjeado',
        'Hitos personalizados',
      ],
    },
  },
  'gratitude-journal': {
    en: {
      title: 'Gratitude Journal',
      description:
        'Nightly challenge to write 3 things you are thankful for. Build a gratitude habit, track streaks, and earn points.',
      features: [
        'Nightly Challenge',
        'Streak Tracking',
        'Mood Rating',
        'Reflections',
        'Points Rewards',
        'AI Context Integration',
      ],
    },
    es: {
      title: 'Diario de Gratitud',
      description:
        'Reto nocturno para escribir 3 cosas por las que estás agradecido. Construye el hábito, rastrea rachas y gana puntos.',
      features: [
        'Reto nocturno',
        'Seguimiento de rachas',
        'Calificación de ánimo',
        'Reflexiones',
        'Recompensas de puntos',
        'Integración con contexto de IA',
      ],
    },
  },
  'sobriety-tracker': {
    en: {
      title: 'Sobriety Tracker',
      description:
        'Log drinking honestly, reinforce the 12 steps, calculate money saved, and see how the days after drinking show up in Fitness Stats and Budget Master.',
      features: [
        'Daily sober check-in',
        '12 Step principles',
        'Savings calculator',
        'After-drink fitness stats',
        'Decision journal',
        'Badges and points',
        'Budget Master bar scan',
        'I Am Present rumination link',
      ],
    },
    es: {
      title: 'Seguimiento de Sobriedad',
      description:
        'Registra el consumo con honestidad, refuerza los 12 pasos, calcula el dinero ahorrado y mira cómo los días posteriores aparecen en Fitness y Presupuesto.',
      features: [
        'Check-in diario de sobriedad',
        'Principios de los 12 pasos',
        'Calculadora de ahorro',
        'Estadísticas de fitness después de beber',
        'Diario de decisiones',
        'Insignias y puntos',
        'Análisis de bares en Presupuesto',
        'Enlace a Estoy Presente',
      ],
    },
  },
}

export function getModuleCatalogEntry(
  moduleId: string,
  language: Language
): ModuleCatalogEntry | null {
  const entry = catalog[moduleId]
  if (!entry) return null
  return entry[language] ?? entry.en
}

export function localizeModule<
  T extends { id: string; title: string; description: string; features: string[] },
>(module: T, language: Language): T {
  const localized = getModuleCatalogEntry(module.id, language)
  if (!localized) return module
  return { ...module, ...localized }
}
