'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Language = 'en' | 'es'

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, params?: Record<string, any>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Translation files
const translations = {
  en: {
    // Dashboard
    'nav.dashboard': 'Dashboard',
    'nav.modules': 'Life Hacks',
    'nav.profile': 'Profile',
    'nav.signOut': 'Sign Out',
    'welcome.title': 'Welcome back',
    'welcome.subtitle': 'Ready to tackle your goals today?',

    // Dashboard sections
    'section.priorities': 'Priorities',
    'section.goals': 'Goals',
    'section.projects': 'Projects',
    'section.habits': 'Habits',
    'section.tasks': 'Tasks',
    'section.aiAdvisor': 'AI Advisor',
    'section.categoryProgress': 'Category Progress',
    'section.recentAccomplishments': 'Recent Accomplishments',
    'section.education': 'Education',

    // Priorities
    'priorities.title': 'What needs your attention right now',
    'priorities.addManual': 'Add Manual Priority',
    'priorities.addPriority': 'Add Priority',
    'priorities.aiRecommend': 'AI Recommend',
    'priorities.completed': 'Completed',

    // Goals
    'goals.title': 'Long-term objectives and aspirations',
    'goals.addGoal': 'Add Goal',
    'goals.completed': 'Completed',
    'goals.noGoals': 'No goals set yet. Create your first goal to get started!',
    'goals.priority': 'Priority',
    'goals.priorityLevel': 'Priority Level (1-5)',
    'goals.priorityScore': 'Priority Score (0-100)',

    // Projects
    'projects.title': 'Measurable things I really need to achieve in my life right now',
    'projects.addProject': 'Add Project',
    'projects.completed': 'Completed',
    'projects.categorize': 'Categorize',
    'projects.viewDetails': 'View Details',
    'projects.pointsRemaining': 'points remaining',
    'projects.noProjects': 'No projects yet. Create your first project to get started!',

    // Habits
    'habits.title': 'Daily routines and behaviors',
    'habits.addHabit': 'Add Habit',
    'habits.ideas': 'Ideas',
    'habits.completed': 'Completed',
    'habits.noHabits': 'No habits set yet. Create your first habit to get started!',

    // Tasks
    'tasks.title': 'Daily tasks and to-dos',
    'tasks.addTask': 'Add Task',
    'tasks.completed': 'Completed',
    'tasks.noTasks': 'No tasks yet. Create your first task to get started!',

    // AI Advisor
    'aiAdvisor.title': 'AI Advisor',
    'aiAdvisor.description': 'help me organize my life and get things done',
    'aiAdvisor.ready': 'Ready to help!',
    'aiAdvisor.prompt': 'Ask me anything about your strategy for the day',
    'aiAdvisor.startChat': 'Start Chat',

    // Task Advisor
    'taskAdvisor.title': 'Task Advisor',
    'taskAdvisor.loading': 'Loading recommendations...',
    'taskAdvisor.basedOn': 'Based on highest priority projects',
    'taskAdvisor.refresh': 'Refresh recommendations',
    'taskAdvisor.quickWin': 'Quick Win',
    'taskAdvisor.highImpact': 'High Impact',
    'taskAdvisor.strategic': 'Strategic',
    'taskAdvisor.general': 'General',
    'taskAdvisor.addToTasks': 'Add to Tasks',
    'taskAdvisor.noRecommendations': 'No recommendations available',

    // Category Progress
    'categoryProgress.title': 'Track your progress across different life areas',
    'categoryProgress.category': 'Category',
    'categoryProgress.quickMoney': 'Quick Money',
    'categoryProgress.health': 'Health',
    'categoryProgress.relationships': 'Relationships',
    'categoryProgress.career': 'Career',
    'categoryProgress.education': 'Education',
    'categoryProgress.innovation': 'Innovation',
    'categoryProgress.other': 'Other',

    // Recent Accomplishments
    'accomplishments.title': 'Recent Accomplishments',
    'accomplishments.description': 'Celebrate your recent wins and achievements',

    // Education
    'education.title': 'Education',
    'education.description': 'Learning and certifications',

    // Radial cards
    'radial.todayPoints': "Today's Points",
    'radial.weeklyProgress': 'Weekly Progress',
    'radial.habitStreak': 'Habit Streak',
    'radial.strategicInsights': 'Strategic Insights',
    'radial.motivational.incredible':
      "🔥 INCREDIBLE! You're crushing it today! Keep this momentum going and push even higher! 🚀",
    'radial.totalPoints': 'Total Points',

    // Chat Interface
    'chat.title': 'AI Life Coach',
    'chat.subtitle': 'Your personal AI assistant for productivity and growth',
    'chat.inputPlaceholder': 'Ask me anything about your goals, habits, or productivity...',
    'chat.quickActions.wakeUp': 'Wake Up',
    'chat.quickActions.happyDay': 'Happy Day',
    'chat.quickActions.checkIn': 'Check-In',
    'chat.quickActions.wellnessUpdate': 'Wellness Update',

    // Homepage
    'home.dashboard': 'Dashboard',
    'home.signIn': 'Sign In',
    'home.createAccount': 'Create Account',
    'home.goToDashboard': 'Go to Dashboard',
    'home.tagline': 'Stack your life, powered by AI.',
    'home.subtitle': 'Your goals, habits, and life hacks — stacked.',

    // Trial
    'trial.expired': 'Trial Expired',
    'trial.expiredMessage': 'Your free trial has ended. Upgrade to continue using Life Stacks.',
    'trial.upgradeNow': 'Upgrade Now',
    'trial.expiresToday': 'Trial Expires Today!',
    'trial.expiresTomorrow': 'Trial Expires Tomorrow!',
    'trial.expiresInDays': 'Trial Expires in {days} Days',
    'trial.upgradeMessage': 'Upgrade to Standard Plan to keep your access and data.',
    'trial.upgradePrice': 'Upgrade - $20.00/month',
    'trial.active': 'Free Trial Active',
    'trial.daysRemaining': '{days} days remaining in your free trial.',

    // Points
    'points.daily': 'Daily Points',
    'points.weekly': 'Weekly Points',
    'points.dailyBreakdown': 'Daily Breakdown',
    'points.noData': 'No data available',

    // AI Messages
    'ai.readyToMakeTodayCount':
      '🎯 Ready to make today count? Pick a project and start building momentum!',
    'ai.noInsightsAvailable': 'No insights available',

    // Navigation
    'nav.import': 'Import',
    'nav.privacyPolicy': 'Privacy Policy',

    // Empty States
    'empty.noPriorities': 'No priorities set, generate AI recommendations...',
    'empty.generateAI': 'Generate AI',
    'empty.viewDeleted': 'View Deleted',
    'empty.noCategories': 'No categories yet... add your first category to get started!',
    'empty.noHabits': 'No habits yet... add your first habit to get started!',
    'empty.importDefaultHabits': 'Import Default Habits',
    'empty.noEducation': 'No education items yet... add your first education item to get started!',
    'empty.importDefaultEducation': 'Import Default Education Items',

    // Actions
    'actions.doubleClickToCascade': 'Double click to cascade',
    'actions.addGoal': 'Add Goal',

    // Modules/Life Hacks
    'modules.title': 'Life Hacks & Business Tools',
    'modules.subtitle': 'Powerful productivity and improvement tools',
    'modules.searchPlaceholder': 'Search modules...',
    'modules.complexityFilter': 'Filter by complexity',
    'modules.complexity.all': 'All',
    'modules.complexity.beginner': 'Beginner',
    'modules.complexity.intermediate': 'Intermediate',
    'modules.complexity.advanced': 'Advanced',

    // Profile
    'profile.title': 'Your Profile',
    'profile.subtitle': 'Manage your account and view your productivity statistics',
    'profile.accountInfo': 'Account Information',
    'profile.productivityStats': 'Your Productivity Stats',
    'profile.statsSubtitle': 'Track your progress and achievements',
    'profile.totalGoals': 'Total Goals',
    'profile.totalTasks': 'Total Tasks',
    'profile.completed': 'Completed',
    'profile.totalPoints': 'Total Points',
    'profile.quickActions': 'Quick Actions',
    'profile.quickActionsSubtitle': 'Manage your productivity system',
    'profile.goToDashboard': 'Go to Dashboard',
    'profile.lifeHacks': 'Life Hacks',
    'profile.signOut': 'Sign Out',

    // Rewards & Self-Care
    'rewards.title': 'Rewards & Self-Care',
    'rewards.subtitle': 'Exchange your points for rewards and track your progress',
    'rewards.availablePoints': 'Available Points',
    'rewards.totalEarned': 'Total Earned',
    'rewards.redeemed': 'Redeemed',
    'rewards.availableRewards': 'Available Rewards',
    'rewards.partnerRewards': 'Partner Rewards',
    'rewards.redeemedRewards': 'Redeemed Rewards',
    'rewards.redeem': 'Redeem',
    'rewards.add': 'Add',
    'rewards.edit': 'Edit',
    'rewards.delete': 'Delete',
    'rewards.createCustom': 'Create Custom Reward',
    'rewards.noRewards': 'No redeemed rewards yet',
    'rewards.noRewardsSubtitle': 'Redeem rewards from the Available Rewards tab to see them here',

    // Trophies
    'trophies.dailySelfAwareness': 'Daily Self-Awareness',
    'trophies.dailySelfAwarenessSubtitle': 'Trophies Earned for Daily Login and Review',
    'trophies.habitMastery': 'Habit Mastery',
    'trophies.habitMasterySubtitle': 'Trophies earned for cumulative habit completions',
    'trophies.currentStreak': 'Current Streak',
    'trophies.longestStreak': 'Longest Streak',
    'trophies.totalSignIns': 'Total Sign-Ins',
    'trophies.totalCompletions': 'Total Habit Completions',
    'trophies.nextTrophy': 'Next:',
    'trophies.earnedTrophies': 'Earned Trophies',
    'trophies.upcomingTrophies': 'Upcoming Trophies',
    'trophies.earnedAt': 'Earned at',
    'trophies.completions': 'completions',

    // Form fields
    'form.email': 'Email',
    'form.password': 'Password',
    'form.fullName': 'Full Name',
    'form.enterEmail': 'Enter your email',
    'form.enterPassword': 'Enter your password',
    'form.enterName': 'Enter your full name',
    'form.signIn': 'Sign In',
    'form.subscribe': 'Subscribe - $19.99/month',
    'form.signingIn': 'Signing In...',
    'form.processing': 'Processing...',
    'form.explorePlans': 'Or explore other plans →',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.view': 'View',
    'common.stacks': 'Stacks',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.active': 'Active',
    'common.hideStacks': 'Hide stacks',
    'common.all': 'All',
    'common.item': 'Item',
  },
  es: {
    // Dashboard
    'nav.dashboard': 'Panel',
    'nav.modules': 'Trucos de Vida',
    'nav.profile': 'Perfil',
    'nav.signOut': 'Cerrar Sesión',
    'welcome.title': 'Bienvenido de vuelta',
    'welcome.subtitle': '¿Listo para abordar tus objetivos hoy?',

    // Dashboard sections
    'section.priorities': 'Prioridades',
    'section.goals': 'Objetivos',
    'section.projects': 'Proyectos',
    'section.habits': 'Hábitos',
    'section.tasks': 'Tareas',
    'section.aiAdvisor': 'Asesor IA',
    'section.categoryProgress': 'Progreso por Categoría',
    'section.recentAccomplishments': 'Logros Recientes',
    'section.education': 'Educación',

    // Priorities
    'priorities.title': 'Qué necesita tu atención ahora mismo',
    'priorities.addManual': 'Agregar Prioridad Manual',
    'priorities.addPriority': 'Agregar Prioridad',
    'priorities.aiRecommend': 'Recomendación IA',
    'priorities.completed': 'Completado',

    // Goals
    'goals.title': 'Objetivos y aspiraciones a largo plazo',
    'goals.addGoal': 'Agregar Objetivo',
    'goals.completed': 'Completado',
    'goals.noGoals': 'Aún no hay objetivos establecidos. ¡Crea tu primer objetivo para comenzar!',
    'goals.priority': 'Prioridad',
    'goals.priorityLevel': 'Nivel de Prioridad (1-5)',
    'goals.priorityScore': 'Puntuación de Prioridad (0-100)',

    // Projects
    'projects.title': 'Cosas medibles que realmente necesito lograr en mi vida ahora mismo',
    'projects.addProject': 'Agregar Proyecto',
    'projects.completed': 'Completado',
    'projects.categorize': 'Categorizar',
    'projects.viewDetails': 'Ver Detalles',
    'projects.pointsRemaining': 'puntos restantes',
    'projects.noProjects': 'Aún no hay proyectos. ¡Crea tu primer proyecto para comenzar!',

    // Habits
    'habits.title': 'Rutinas y comportamientos diarios',
    'habits.addHabit': 'Agregar Hábito',
    'habits.ideas': 'Ideas',
    'habits.completed': 'Completado',
    'habits.noHabits': 'Aún no hay hábitos establecidos. ¡Crea tu primer hábito para comenzar!',

    // Tasks
    'tasks.title': 'Tareas diarias y pendientes',
    'tasks.addTask': 'Agregar Tarea',
    'tasks.completed': 'Completado',
    'tasks.noTasks': 'Aún no hay tareas. ¡Crea tu primera tarea para comenzar!',

    // AI Advisor
    'aiAdvisor.title': 'Asesor IA',
    'aiAdvisor.description': 'ayúdame a organizar mi vida y hacer las cosas',
    'aiAdvisor.ready': '¡Listo para ayudar!',
    'aiAdvisor.prompt': 'Pregúntame cualquier cosa sobre tu estrategia para el día',
    'aiAdvisor.startChat': 'Iniciar Chat',

    // Task Advisor
    'taskAdvisor.title': 'Asesor de Tareas',
    'taskAdvisor.loading': 'Cargando recomendaciones...',
    'taskAdvisor.basedOn': 'Basado en proyectos de mayor prioridad',
    'taskAdvisor.refresh': 'Actualizar recomendaciones',
    'taskAdvisor.quickWin': 'Victoria Rápida',
    'taskAdvisor.highImpact': 'Alto Impacto',
    'taskAdvisor.strategic': 'Estratégico',
    'taskAdvisor.general': 'General',
    'taskAdvisor.addToTasks': 'Agregar a Tareas',
    'taskAdvisor.noRecommendations': 'No hay recomendaciones disponibles',

    // Category Progress
    'categoryProgress.title': 'Rastrea tu progreso en diferentes áreas de vida',
    'categoryProgress.category': 'Categoría',
    'categoryProgress.quickMoney': 'Dinero Rápido',
    'categoryProgress.health': 'Salud',
    'categoryProgress.relationships': 'Relaciones',
    'categoryProgress.career': 'Carrera',
    'categoryProgress.education': 'Educación',
    'categoryProgress.innovation': 'Innovación',
    'categoryProgress.other': 'Otro',

    // Recent Accomplishments
    'accomplishments.title': 'Logros Recientes',
    'accomplishments.description': 'Celebra tus victorias y logros recientes',

    // Education
    'education.title': 'Educación',
    'education.description': 'Aprendizaje y certificaciones',

    // Radial cards
    'radial.todayPoints': 'Puntos de Hoy',
    'radial.weeklyProgress': 'Progreso Semanal',
    'radial.habitStreak': 'Racha de Hábitos',
    'radial.strategicInsights': 'Insights Estratégicos',
    'radial.motivational.incredible':
      '🔥 ¡INCREÍBLE! ¡Estás arrasando hoy! ¡Mantén este impulso y empuja aún más alto! 🚀',
    'radial.totalPoints': 'Total de Puntos',

    // Chat Interface
    'chat.title': 'Coach de Vida IA',
    'chat.subtitle': 'Tu asistente personal de IA para productividad y crecimiento',
    'chat.inputPlaceholder':
      'Pregúntame cualquier cosa sobre tus objetivos, hábitos o productividad...',
    'chat.quickActions.wakeUp': 'Despertar',
    'chat.quickActions.happyDay': 'Día Feliz',
    'chat.quickActions.checkIn': 'Registro',
    'chat.quickActions.wellnessUpdate': 'Actualización de Bienestar',

    // Homepage
    'home.dashboard': 'Panel de Control',
    'home.signIn': 'Iniciar Sesión',
    'home.createAccount': 'Crear Cuenta',
    'home.goToDashboard': 'Ir al Panel',
    'home.tagline': 'Organiza tu vida, impulsado por IA.',
    'home.subtitle': 'Tus objetivos, hábitos y trucos de vida — organizados.',

    // Trial
    'trial.expired': 'Prueba Expirada',
    'trial.expiredMessage':
      'Tu prueba gratuita ha terminado. Actualiza para continuar usando Life Stacks.',
    'trial.upgradeNow': 'Actualizar Ahora',
    'trial.expiresToday': '¡La Prueba Expira Hoy!',
    'trial.expiresTomorrow': '¡La Prueba Expira Mañana!',
    'trial.expiresInDays': 'La Prueba Expira en {days} Días',
    'trial.upgradeMessage': 'Actualiza al Plan Estándar para mantener tu acceso y datos.',
    'trial.upgradePrice': 'Actualizar - $20.00/mes',
    'trial.active': 'Prueba Gratuita Activa',
    'trial.daysRemaining': 'Te quedan {days} días en tu prueba gratuita.',

    // Points
    'points.daily': 'Puntos Diarios',
    'points.weekly': 'Puntos Semanales',
    'points.dailyBreakdown': 'Desglose Diario',
    'points.noData': 'No hay datos disponibles',

    // AI Messages
    'ai.readyToMakeTodayCount':
      '🎯 ¿Listo para hacer que hoy cuente? ¡Elige un proyecto y comienza a generar impulso!',
    'ai.noInsightsAvailable': 'No hay perspectivas disponibles',

    // Navigation
    'nav.import': 'Importar',
    'nav.privacyPolicy': 'Política de Privacidad',

    // Empty States
    'empty.noPriorities': 'No hay prioridades establecidas, genera recomendaciones de IA...',
    'empty.generateAI': 'Generar IA',
    'empty.viewDeleted': 'Ver Eliminados',
    'empty.noCategories': 'Aún no hay categorías... ¡agrega tu primera categoría para comenzar!',
    'empty.noHabits': 'Aún no hay hábitos... ¡agrega tu primer hábito para comenzar!',
    'empty.importDefaultHabits': 'Importar Hábitos Predeterminados',
    'empty.noEducation':
      'Aún no hay elementos de educación... ¡agrega tu primer elemento de educación para comenzar!',
    'empty.importDefaultEducation': 'Importar Elementos de Educación Predeterminados',

    // Actions
    'actions.doubleClickToCascade': 'Doble clic para cascada',
    'actions.addGoal': 'Agregar Objetivo',

    // Modules/Life Hacks
    'modules.title': 'Trucos de Vida y Herramientas de Negocio',
    'modules.subtitle': 'Herramientas poderosas de productividad y utilidades de negocio',
    'modules.searchPlaceholder': 'Buscar módulos...',
    'modules.complexityFilter': 'Filtrar por complejidad',
    'modules.complexity.all': 'Todos',
    'modules.complexity.beginner': 'Principiante',
    'modules.complexity.intermediate': 'Intermedio',
    'modules.complexity.advanced': 'Avanzado',

    // Profile
    'profile.title': 'Tu Perfil',
    'profile.subtitle': 'Administra tu cuenta y ve tus estadísticas de productividad',
    'profile.accountInfo': 'Información de Cuenta',
    'profile.productivityStats': 'Tus Estadísticas de Productividad',
    'profile.statsSubtitle': 'Rastrea tu progreso y logros',
    'profile.totalGoals': 'Total de Objetivos',
    'profile.totalTasks': 'Total de Tareas',
    'profile.completed': 'Completado',
    'profile.totalPoints': 'Total de Puntos',
    'profile.quickActions': 'Acciones Rápidas',
    'profile.quickActionsSubtitle': 'Administra tu sistema de productividad',
    'profile.goToDashboard': 'Ir al Panel',
    'profile.lifeHacks': 'Trucos de Vida',
    'profile.signOut': 'Cerrar Sesión',

    // Rewards & Self-Care
    'rewards.title': 'Recompensas y Autocuidado',
    'rewards.subtitle': 'Intercambia tus puntos por recompensas y rastrea tu progreso',
    'rewards.availablePoints': 'Puntos Disponibles',
    'rewards.totalEarned': 'Total Ganado',
    'rewards.redeemed': 'Canjeado',
    'rewards.availableRewards': 'Recompensas Disponibles',
    'rewards.partnerRewards': 'Recompensas de Socios',
    'rewards.redeemedRewards': 'Recompensas Canjeadas',
    'rewards.redeem': 'Canjear',
    'rewards.add': 'Agregar',
    'rewards.edit': 'Editar',
    'rewards.delete': 'Eliminar',
    'rewards.createCustom': 'Crear Recompensa Personalizada',
    'rewards.noRewards': 'Aún no hay recompensas canjeadas',
    'rewards.noRewardsSubtitle':
      'Canjea recompensas de la pestaña Recompensas Disponibles para verlas aquí',

    // Trophies
    'trophies.dailySelfAwareness': 'Autoconciencia Diaria',
    'trophies.dailySelfAwarenessSubtitle': 'Trofeos Ganados por Inicio de Sesión y Revisión Diaria',
    'trophies.habitMastery': 'Maestría de Hábitos',
    'trophies.habitMasterySubtitle': 'Trofeos ganados por completaciones acumulativas de hábitos',
    'trophies.currentStreak': 'Racha Actual',
    'trophies.longestStreak': 'Racha Más Larga',
    'trophies.totalSignIns': 'Total de Inicios de Sesión',
    'trophies.totalCompletions': 'Total de Completaciones de Hábitos',
    'trophies.nextTrophy': 'Siguiente:',
    'trophies.earnedTrophies': 'Trofeos Ganados',
    'trophies.upcomingTrophies': 'Trofeos Próximos',
    'trophies.earnedAt': 'Ganado en',
    'trophies.completions': 'completaciones',

    // Form fields
    'form.email': 'Correo Electrónico',
    'form.password': 'Contraseña',
    'form.fullName': 'Nombre Completo',
    'form.enterEmail': 'Ingresa tu correo electrónico',
    'form.enterPassword': 'Ingresa tu contraseña',
    'form.enterName': 'Ingresa tu nombre completo',
    'form.signIn': 'Iniciar Sesión',
    'form.subscribe': 'Suscribirse - $19.99/mes',
    'form.signingIn': 'Iniciando Sesión...',
    'form.processing': 'Procesando...',
    'form.explorePlans': 'O explorar otros planes →',

    // Common
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.add': 'Agregar',
    'common.view': 'Ver',
    'common.stacks': 'Pilas',
    'common.close': 'Cerrar',
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.previous': 'Anterior',
    'common.yes': 'Sí',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.active': 'Activo',
    'common.hideStacks': 'Ocultar pilas',
    'common.all': 'Todo',
    'common.item': 'Elemento',
  },
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'es')) {
      setLanguage(savedLanguage)
    }
  }, [])

  // Save language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  const t = (key: string, params?: Record<string, any>): string => {
    let translation =
      translations[language][key as keyof (typeof translations)[typeof language]] || key

    if (params) {
      Object.keys(params).forEach((paramKey) => {
        translation = translation.replace(`{${paramKey}}`, params[paramKey])
      })
    }

    return translation
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
