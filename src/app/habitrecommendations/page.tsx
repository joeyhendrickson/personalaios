'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  Lightbulb,
  Clock,
  Target,
  TrendingUp,
  Zap,
  BookOpen,
  Heart,
  DollarSign,
  Users,
  Home,
  ShoppingCart,
  Moon,
  Sun,
  Apple,
  Droplets,
  Utensils,
  PiggyBank,
  CreditCard,
  Calculator,
  Shield,
  Smile,
  Activity,
  Leaf,
  Wind,
  Scale,
} from 'lucide-react'
import Link from 'next/link'

interface Module {
  id: string
  title: string
  description: string
  detailedDescription: string
  benefits: string[]
  improvements: {
    health?: string
    productivity?: string
    finance?: string
    mental?: string
    relationships?: string
  }
  category: string
  timeToImplement: string
  impact: 'low' | 'medium' | 'high'
  icon: React.ReactNode
}

const modules: Module[] = [
  {
    id: '1',
    title: 'Two-Minute Rule',
    description:
      'If a task takes less than 2 minutes, do it immediately instead of adding it to your to-do list.',
    detailedDescription:
      'The Two-Minute Rule is a powerful productivity principle that helps eliminate procrastination and reduces mental clutter. By immediately completing small tasks, you prevent them from accumulating and creating overwhelm.',
    benefits: [
      'Reduces mental overhead and decision fatigue',
      'Prevents small tasks from becoming big problems',
      'Builds momentum for larger tasks',
      'Creates a sense of accomplishment throughout the day',
    ],
    improvements: {
      productivity: 'Significantly reduces task accumulation and improves workflow efficiency',
      mental: 'Reduces stress and anxiety from pending tasks',
      finance: 'Prevents small issues from becoming costly problems',
    },
    category: 'Productivity',
    timeToImplement: 'Immediate',
    impact: 'high',
    icon: <Clock className="h-6 w-6" />,
  },
  {
    id: '2',
    title: 'Pomodoro Technique',
    description:
      'Work in 25-minute focused intervals followed by 5-minute breaks to maintain concentration.',
    detailedDescription:
      'The Pomodoro Technique uses timed work sessions to maximize focus and prevent burnout. This method trains your brain to work in concentrated bursts while ensuring regular rest periods.',
    benefits: [
      'Improves focus and concentration',
      'Prevents mental fatigue and burnout',
      'Creates a sense of urgency and momentum',
      'Provides regular breaks for mental recovery',
    ],
    improvements: {
      productivity: 'Increases work output and quality through focused sessions',
      mental: 'Reduces mental fatigue and improves cognitive performance',
      health: 'Prevents eye strain and physical tension from prolonged work',
    },
    category: 'Productivity',
    timeToImplement: '5 minutes',
    impact: 'high',
    icon: <Target className="h-6 w-6" />,
  },
  {
    id: '3',
    title: 'Morning Pages',
    description:
      'Write 3 pages of stream-of-consciousness thoughts first thing in the morning to clear your mind.',
    detailedDescription:
      'Morning Pages is a practice of writing three pages of stream-of-consciousness thoughts first thing in the morning to clear mental clutter and enhance creativity.',
    benefits: [
      'Clears mental clutter and racing thoughts',
      'Enhances creativity and problem-solving',
      'Reduces anxiety and stress',
      'Improves self-awareness and emotional processing',
    ],
    improvements: {
      mental: 'Significantly improves mental clarity and reduces anxiety',
      productivity: 'Enhances creativity and problem-solving abilities',
      health: 'Reduces stress-related health issues',
    },
    category: 'Mental Health',
    timeToImplement: '15 minutes',
    impact: 'medium',
    icon: <BookOpen className="h-6 w-6" />,
  },
  {
    id: '4',
    title: 'Gratitude Journal',
    description:
      "Write down 3 things you're grateful for each day to improve mental well-being and perspective.",
    detailedDescription:
      "Gratitude journaling involves writing down three things you're grateful for each day, which has been scientifically proven to improve mental health and overall life satisfaction.",
    benefits: [
      'Improves mood and life satisfaction',
      'Reduces depression and anxiety symptoms',
      'Enhances sleep quality',
      'Strengthens relationships and social connections',
    ],
    improvements: {
      mental: 'Significantly improves mental health and reduces depression',
      health: 'Improves sleep quality and overall well-being',
      relationships: 'Strengthens social connections and empathy',
    },
    category: 'Mental Health',
    timeToImplement: '5 minutes',
    impact: 'high',
    icon: <Heart className="h-6 w-6" />,
  },
  {
    id: '5',
    title: 'Automated Savings',
    description:
      'Set up automatic transfers to savings accounts on payday to build wealth without thinking about it.',
    detailedDescription:
      'Automated savings transfers money to your savings account on payday before you have a chance to spend it, building wealth effortlessly.',
    benefits: [
      'Builds wealth without conscious effort',
      'Prevents lifestyle inflation',
      'Creates emergency fund automatically',
      'Supports long-term financial goals',
    ],
    improvements: {
      finance: 'Significantly builds wealth and financial security over time',
      mental: 'Reduces financial stress through consistent saving',
      productivity: 'Eliminates decision fatigue around saving',
    },
    category: 'Finance',
    timeToImplement: '10 minutes',
    impact: 'high',
    icon: <DollarSign className="h-6 w-6" />,
  },
  {
    id: '6',
    title: 'Meal Prep Sundays',
    description:
      'Prepare meals for the week on Sunday to save time, money, and make healthier choices.',
    detailedDescription:
      'Meal prepping involves preparing healthy meals for the entire week on Sunday, ensuring consistent nutrition and saving time during busy weekdays.',
    benefits: [
      'Saves time during busy weekdays',
      'Reduces food waste and saves money',
      'Ensures consistent healthy eating',
      'Reduces stress around meal decisions',
    ],
    improvements: {
      health: 'Promotes consistent healthy eating and portion control',
      finance: 'Reduces food waste and dining out expenses',
      productivity: 'Saves time and reduces daily decision fatigue',
    },
    category: 'Health',
    timeToImplement: '2 hours',
    impact: 'high',
    icon: <Home className="h-6 w-6" />,
  },
  {
    id: '7',
    title: 'No Phone First Hour',
    description:
      'Avoid checking your phone for the first hour after waking up to start your day with intention.',
    detailedDescription:
      'Starting your day without immediately checking your phone helps set a positive, intentional tone and reduces stress from digital overwhelm.',
    benefits: [
      'Reduces morning stress and anxiety',
      'Improves focus and mental clarity',
      'Creates intentional morning routine',
      'Reduces digital dependency',
    ],
    improvements: {
      mental: 'Reduces stress and improves morning mood',
      productivity: 'Enhances focus and intentionality throughout the day',
      health: 'Reduces digital eye strain and improves sleep patterns',
    },
    category: 'Digital Wellness',
    timeToImplement: 'Immediate',
    impact: 'medium',
    icon: <Sun className="h-6 w-6" />,
  },
  {
    id: '8',
    title: 'Power Poses',
    description:
      'Stand in confident poses for 2 minutes before important meetings to boost confidence.',
    detailedDescription:
      'Power poses are confident body positions that can increase testosterone, decrease cortisol, and boost confidence before important events.',
    benefits: [
      'Increases confidence and self-assurance',
      'Reduces stress hormones',
      'Improves performance in high-pressure situations',
      'Enhances body language and presence',
    ],
    improvements: {
      mental: 'Reduces stress and increases confidence',
      productivity: 'Improves performance in meetings and presentations',
      relationships: 'Enhances professional presence and communication',
    },
    category: 'Confidence',
    timeToImplement: '2 minutes',
    impact: 'medium',
    icon: <TrendingUp className="h-6 w-6" />,
  },
  {
    id: '9',
    title: 'Cold Shower Finish',
    description: 'End your shower with 30 seconds of cold water to boost energy and immune system.',
    detailedDescription:
      'Cold water exposure at the end of a shower can boost circulation, improve immune function, and increase energy levels.',
    benefits: [
      'Boosts immune system function',
      'Increases energy and alertness',
      'Improves circulation and skin health',
      'Builds mental resilience and discipline',
    ],
    improvements: {
      health: 'Strengthens immune system and improves circulation',
      mental: 'Builds mental toughness and resilience',
      productivity: 'Increases energy levels and alertness',
    },
    category: 'Health',
    timeToImplement: '30 seconds',
    impact: 'medium',
    icon: <Zap className="h-6 w-6" />,
  },
  {
    id: '10',
    title: 'Digital Sunset',
    description: 'Stop using screens 1 hour before bedtime to improve sleep quality.',
    detailedDescription:
      'Avoiding screens before bed helps regulate your circadian rhythm and improves sleep quality by reducing blue light exposure.',
    benefits: [
      'Improves sleep quality and duration',
      'Reduces eye strain and headaches',
      'Enhances melatonin production',
      'Creates better bedtime routine',
    ],
    improvements: {
      health: 'Improves sleep quality and overall health',
      mental: 'Reduces stress and improves mood through better sleep',
      productivity: 'Increases energy and focus during the day',
    },
    category: 'Sleep',
    timeToImplement: 'Immediate',
    impact: 'high',
    icon: <Moon className="h-6 w-6" />,
  },
  {
    id: '11',
    title: 'One-Touch Rule',
    description:
      'Handle emails, messages, and papers only once - either act on them, file them, or delete them.',
    detailedDescription:
      'The One-Touch Rule prevents items from accumulating by requiring you to take action on each item the first time you encounter it.',
    benefits: [
      'Prevents task and email accumulation',
      'Reduces mental overhead and stress',
      'Improves productivity and efficiency',
      'Creates better organizational habits',
    ],
    improvements: {
      productivity: 'Significantly improves efficiency and reduces task accumulation',
      mental: 'Reduces stress and mental clutter',
    },
    category: 'Organization',
    timeToImplement: 'Immediate',
    impact: 'high',
    icon: <Target className="h-6 w-6" />,
  },
  {
    id: '12',
    title: 'Walking Meetings',
    description:
      'Conduct one-on-one meetings while walking to boost creativity and physical activity.',
    detailedDescription:
      'Walking meetings combine physical activity with productive conversations, leading to better ideas and improved health.',
    benefits: [
      'Increases physical activity during work hours',
      'Boosts creativity and problem-solving',
      'Reduces sedentary behavior',
      'Improves focus and engagement',
    ],
    improvements: {
      health: 'Increases daily step count and reduces sitting time',
      productivity: 'Enhances creative thinking and meeting engagement',
      mental: 'Reduces stress and improves mood through movement',
    },
    category: 'Health',
    timeToImplement: 'Immediate',
    impact: 'medium',
    icon: <Users className="h-6 w-6" />,
  },
  // Health & Wellness Habits
  {
    id: '13',
    title: 'Drink Water First Thing',
    description: 'Start each day by drinking a full glass of water before anything else.',
    detailedDescription:
      'Hydrating first thing in the morning kickstarts your metabolism, improves brain function, and sets a healthy tone for the day.',
    benefits: [
      'Rehydrates after overnight fasting',
      'Boosts metabolism and energy levels',
      'Improves cognitive function and focus',
      'Supports healthy skin and digestion',
    ],
    improvements: {
      health: 'Improves hydration, metabolism, and overall bodily functions',
      mental: 'Enhances focus and cognitive performance',
      productivity: 'Increases energy levels for better daily performance',
    },
    category: 'Health',
    timeToImplement: 'Immediate',
    impact: 'high',
    icon: <Droplets className="h-6 w-6" />,
  },
  {
    id: '14',
    title: '10-Minute Morning Stretch',
    description:
      'Spend 10 minutes stretching every morning to improve flexibility and reduce stiffness.',
    detailedDescription:
      'Morning stretching improves circulation, reduces muscle tension, and prepares your body for the day ahead.',
    benefits: [
      'Improves flexibility and range of motion',
      'Reduces muscle tension and stiffness',
      'Enhances blood circulation',
      'Promotes relaxation and stress relief',
    ],
    improvements: {
      health: 'Improves flexibility, reduces injury risk, and enhances mobility',
      mental: 'Reduces stress and promotes relaxation',
      productivity: 'Increases energy and prepares body for daily activities',
    },
    category: 'Health',
    timeToImplement: '10 minutes',
    impact: 'medium',
    icon: <Activity className="h-6 w-6" />,
  },
  {
    id: '15',
    title: 'Daily Step Goal',
    description:
      'Set and track a daily step goal (8,000-10,000 steps) to maintain consistent activity.',
    detailedDescription:
      'Regular walking improves cardiovascular health, strengthens muscles, and supports mental well-being.',
    benefits: [
      'Improves cardiovascular health',
      'Strengthens muscles and bones',
      'Boosts mood and mental clarity',
      'Helps maintain healthy weight',
    ],
    improvements: {
      health: 'Enhances cardiovascular fitness and overall physical health',
      mental: 'Reduces stress and improves mood through regular movement',
      productivity: 'Increases energy levels and mental clarity',
    },
    category: 'Health',
    timeToImplement: 'Throughout day',
    impact: 'high',
    icon: <Target className="h-6 w-6" />,
  },
  {
    id: '17',
    title: 'Daily Vitamin D',
    description: 'Spend 15-20 minutes in sunlight daily or take vitamin D supplements.',
    detailedDescription:
      'Vitamin D is essential for bone health, immune function, and mood regulation.',
    benefits: [
      'Strengthens bones and immune system',
      'Improves mood and reduces depression risk',
      'Supports muscle function',
      'Enhances sleep quality',
    ],
    improvements: {
      health: 'Strengthens immune system and bone health',
      mental: 'Improves mood and reduces seasonal depression',
      productivity: 'Increases energy levels and overall well-being',
    },
    category: 'Health',
    timeToImplement: '15 minutes',
    impact: 'medium',
    icon: <Sun className="h-6 w-6" />,
  },
  // Financial Hygiene Habits
  {
    id: '18',
    title: 'Daily Expense Tracking',
    description: 'Record every expense at the end of each day to build financial awareness.',
    detailedDescription:
      'Tracking expenses helps identify spending patterns, reduce unnecessary purchases, and build better financial habits.',
    benefits: [
      'Increases awareness of spending habits',
      'Identifies areas for cost reduction',
      'Helps stick to budgets',
      'Builds financial discipline',
    ],
    improvements: {
      finance: 'Improves spending awareness and helps build wealth',
      mental: 'Reduces financial stress through better control',
      productivity: 'Creates better decision-making around purchases',
    },
    category: 'Finance',
    timeToImplement: '5 minutes daily',
    impact: 'high',
    icon: <Calculator className="h-6 w-6" />,
  },
  {
    id: '19',
    title: 'Weekly Budget Review',
    description: 'Review your budget and spending every Sunday to stay on track.',
    detailedDescription:
      'Regular budget reviews help you stay accountable, adjust spending, and achieve financial goals.',
    benefits: [
      'Maintains financial accountability',
      'Helps identify overspending early',
      'Supports financial goal achievement',
      'Reduces financial stress',
    ],
    improvements: {
      finance: 'Improves financial control and goal achievement',
      mental: 'Reduces anxiety about money through better management',
      productivity: 'Creates better financial decision-making habits',
    },
    category: 'Finance',
    timeToImplement: '15 minutes weekly',
    impact: 'high',
    icon: <PiggyBank className="h-6 w-6" />,
  },
  {
    id: '20',
    title: '24-Hour Purchase Rule',
    description: 'Wait 24 hours before making any non-essential purchase over $50.',
    detailedDescription:
      'This cooling-off period helps distinguish between wants and needs, reducing impulse purchases.',
    benefits: [
      'Reduces impulse buying',
      'Saves money on unnecessary purchases',
      'Improves financial decision-making',
      'Builds better spending habits',
    ],
    improvements: {
      finance: 'Significantly reduces unnecessary spending and builds wealth',
      mental: "Reduces buyer's remorse and financial stress",
      productivity: 'Improves decision-making skills',
    },
    category: 'Finance',
    timeToImplement: 'Immediate',
    impact: 'high',
    icon: <Clock className="h-6 w-6" />,
  },
  {
    id: '21',
    title: 'Automatic Savings Transfer',
    description: 'Set up automatic transfers to savings on payday before spending anything.',
    detailedDescription:
      'Pay yourself first by automatically saving a percentage of income before other expenses.',
    benefits: [
      'Builds savings without thinking about it',
      'Prevents lifestyle inflation',
      'Creates emergency fund',
      'Supports long-term financial goals',
    ],
    improvements: {
      finance: 'Builds wealth and financial security over time',
      mental: 'Reduces financial stress through consistent saving',
      productivity: 'Eliminates decision fatigue around saving',
    },
    category: 'Finance',
    timeToImplement: '10 minutes setup',
    impact: 'high',
    icon: <DollarSign className="h-6 w-6" />,
  },
  {
    id: '22',
    title: 'Monthly Credit Score Check',
    description: 'Check your credit score monthly to monitor financial health.',
    detailedDescription:
      'Regular credit monitoring helps catch errors early and maintain good financial standing.',
    benefits: [
      'Identifies credit report errors early',
      'Monitors financial health',
      'Helps maintain good credit',
      'Supports better loan rates',
    ],
    improvements: {
      finance: 'Maintains and improves credit score for better rates',
      mental: 'Reduces anxiety about financial standing',
      productivity: 'Prevents time-consuming credit repair later',
    },
    category: 'Finance',
    timeToImplement: '5 minutes monthly',
    impact: 'medium',
    icon: <CreditCard className="h-6 w-6" />,
  },
  // Stress Management Habits
  {
    id: '23',
    title: '5-Minute Breathing Exercise',
    description: 'Practice deep breathing for 5 minutes daily to reduce stress and anxiety.',
    detailedDescription:
      'Deep breathing activates the parasympathetic nervous system, promoting relaxation and stress relief.',
    benefits: [
      'Reduces stress and anxiety levels',
      'Improves focus and concentration',
      'Lowers blood pressure',
      'Enhances emotional regulation',
    ],
    improvements: {
      mental: 'Significantly reduces stress and improves emotional well-being',
      health: 'Lowers blood pressure and improves cardiovascular health',
      productivity: 'Enhances focus and decision-making under pressure',
    },
    category: 'Mental Health',
    timeToImplement: '5 minutes daily',
    impact: 'high',
    icon: <Wind className="h-6 w-6" />,
  },
  {
    id: '25',
    title: 'Weekly Nature Time',
    description: 'Spend at least 2 hours in nature each week to reduce stress and improve mood.',
    detailedDescription:
      'Nature exposure has proven benefits for mental health, reducing stress hormones and improving well-being.',
    benefits: [
      'Reduces cortisol and stress hormones',
      'Improves mood and mental clarity',
      'Boosts immune system function',
      'Enhances creativity and focus',
    ],
    improvements: {
      mental: 'Significantly reduces stress and improves mental health',
      health: 'Boosts immune system and overall well-being',
      productivity: 'Enhances creativity and problem-solving abilities',
    },
    category: 'Mental Health',
    timeToImplement: '2 hours weekly',
    impact: 'high',
    icon: <Leaf className="h-6 w-6" />,
  },
  {
    id: '26',
    title: 'Daily Laughter',
    description: 'Intentionally seek out or create moments of laughter each day.',
    detailedDescription:
      'Laughter releases endorphins, reduces stress hormones, and strengthens the immune system.',
    benefits: [
      'Releases endorphins and reduces stress',
      'Strengthens immune system',
      'Improves mood and social connections',
      'Reduces pain and tension',
    ],
    improvements: {
      mental: 'Improves mood and reduces stress significantly',
      health: 'Boosts immune system and reduces pain',
      relationships: 'Strengthens social bonds and connections',
    },
    category: 'Mental Health',
    timeToImplement: 'Throughout day',
    impact: 'medium',
    icon: <Smile className="h-6 w-6" />,
  },
  {
    id: '27',
    title: 'Weekly Digital Detox',
    description: 'Take a 4-hour break from all digital devices every Sunday.',
    detailedDescription:
      'Regular digital breaks reduce screen fatigue, improve focus, and enhance real-world connections.',
    benefits: [
      'Reduces digital fatigue and eye strain',
      'Improves focus and attention span',
      'Enhances real-world relationships',
      'Promotes mindfulness and presence',
    ],
    improvements: {
      mental: 'Reduces stress and improves focus',
      relationships: 'Enhances real-world social connections',
      productivity: 'Improves attention span and focus when returning to work',
    },
    category: 'Digital Wellness',
    timeToImplement: '4 hours weekly',
    impact: 'medium',
    icon: <Shield className="h-6 w-6" />,
  },
  // Dietary Health Habits
  {
    id: '28',
    title: 'Eat the Rainbow',
    description: 'Include at least 3 different colored vegetables in every meal.',
    detailedDescription:
      'Different colored vegetables provide various nutrients, antioxidants, and phytochemicals essential for health.',
    benefits: [
      'Provides diverse nutrients and antioxidants',
      'Supports immune system function',
      'Reduces inflammation',
      'Improves digestive health',
    ],
    improvements: {
      health: 'Significantly improves nutrient intake and overall health',
      mental: 'Supports brain health and cognitive function',
      productivity: 'Increases energy levels and mental clarity',
    },
    category: 'Health',
    timeToImplement: 'Immediate',
    impact: 'high',
    icon: <Apple className="h-6 w-6" />,
  },
  {
    id: '29',
    title: 'Mindful Eating',
    description: 'Eat without distractions, focusing on taste, texture, and hunger cues.',
    detailedDescription:
      'Mindful eating improves digestion, prevents overeating, and enhances enjoyment of food.',
    benefits: [
      'Improves digestion and nutrient absorption',
      'Prevents overeating and weight gain',
      'Enhances food enjoyment',
      'Builds better relationship with food',
    ],
    improvements: {
      health: 'Improves digestion and helps maintain healthy weight',
      mental: 'Reduces stress eating and improves food relationship',
      productivity: 'Increases energy and focus through better nutrition',
    },
    category: 'Health',
    timeToImplement: 'During meals',
    impact: 'medium',
    icon: <Utensils className="h-6 w-6" />,
  },
  {
    id: '30',
    title: 'Weekly Grocery Planning',
    description: 'Plan your weekly grocery list based on healthy meals to avoid impulse purchases.',
    detailedDescription:
      'Planning grocery shopping helps stick to healthy choices, save money, and reduce food waste.',
    benefits: [
      'Ensures healthy food choices',
      'Saves money on groceries',
      'Reduces food waste',
      'Saves time shopping',
    ],
    improvements: {
      health: 'Promotes consistent healthy eating habits',
      finance: 'Reduces grocery costs and food waste',
      productivity: 'Saves time and reduces decision fatigue',
    },
    category: 'Health',
    timeToImplement: '30 minutes weekly',
    impact: 'high',
    icon: <ShoppingCart className="h-6 w-6" />,
  },
  {
    id: '31',
    title: 'Hydration Tracking',
    description: 'Track daily water intake to ensure you drink 8-10 glasses of water.',
    detailedDescription:
      'Proper hydration supports all bodily functions, improves energy, and enhances cognitive performance.',
    benefits: [
      'Improves energy and cognitive function',
      'Supports healthy skin and digestion',
      'Prevents headaches and fatigue',
      'Enhances physical performance',
    ],
    improvements: {
      health: 'Improves overall bodily functions and energy levels',
      mental: 'Enhances focus and cognitive performance',
      productivity: 'Increases energy and reduces fatigue',
    },
    category: 'Health',
    timeToImplement: 'Throughout day',
    impact: 'high',
    icon: <Droplets className="h-6 w-6" />,
  },
  {
    id: '32',
    title: 'Weekly Weight Check',
    description: 'Weigh yourself once a week to monitor health trends without daily obsession.',
    detailedDescription:
      'Weekly weight monitoring helps track health trends without the stress of daily fluctuations.',
    benefits: [
      'Tracks health trends over time',
      'Prevents weight-related health issues',
      'Maintains accountability',
      'Reduces stress from daily fluctuations',
    ],
    improvements: {
      health: 'Helps maintain healthy weight and prevent health issues',
      mental: 'Reduces anxiety about weight through consistent monitoring',
      productivity: 'Maintains energy and focus through better health',
    },
    category: 'Health',
    timeToImplement: '2 minutes weekly',
    impact: 'medium',
    icon: <Scale className="h-6 w-6" />,
  },
  // Diet & Nutrition Habits
  {
    id: '33',
    title: 'Intermittent Fasting',
    description:
      'Follow a 16:8 eating window (16 hours fasting, 8 hours eating) to improve metabolism.',
    detailedDescription:
      'Intermittent fasting can improve insulin sensitivity, promote weight loss, and enhance cellular repair processes.',
    benefits: [
      'Improves insulin sensitivity and blood sugar control',
      'Promotes weight loss and fat burning',
      'Enhances cellular repair and longevity',
      'Simplifies meal planning and reduces food costs',
    ],
    improvements: {
      health: 'Improves metabolic health and may extend lifespan',
      finance: 'Reduces food costs and meal planning complexity',
      productivity: 'Simplifies daily eating decisions',
    },
    category: 'Health',
    timeToImplement: 'Immediate',
    impact: 'high',
    icon: <Clock className="h-6 w-6" />,
  },
  {
    id: '34',
    title: 'Mediterranean Diet',
    description:
      'Focus on whole foods, olive oil, fish, and vegetables following Mediterranean eating patterns.',
    detailedDescription:
      'The Mediterranean diet emphasizes plant-based foods, healthy fats, and lean proteins, proven to reduce heart disease risk.',
    benefits: [
      'Reduces risk of heart disease and stroke',
      'Improves brain health and cognitive function',
      'Supports healthy weight management',
      'Reduces inflammation throughout the body',
    ],
    improvements: {
      health: 'Significantly reduces cardiovascular disease risk and improves longevity',
      mental: 'Supports brain health and may reduce dementia risk',
      productivity: 'Increases energy levels and mental clarity',
    },
    category: 'Health',
    timeToImplement: 'Gradual transition',
    impact: 'high',
    icon: <Leaf className="h-6 w-6" />,
  },
  {
    id: '35',
    title: 'Plant-Based Meals',
    description:
      'Replace 2-3 meals per week with plant-based alternatives to reduce environmental impact.',
    detailedDescription:
      'Plant-based eating reduces environmental footprint while providing essential nutrients and fiber for better health.',
    benefits: [
      'Reduces environmental impact and carbon footprint',
      'Increases fiber and nutrient intake',
      'May reduce risk of chronic diseases',
      'Supports sustainable food systems',
    ],
    improvements: {
      health: 'Improves nutrient density and reduces disease risk',
      finance: 'Often more cost-effective than meat-based meals',
      productivity: 'Increases energy through better nutrition',
    },
    category: 'Health',
    timeToImplement: '2-3 meals weekly',
    impact: 'medium',
    icon: <Apple className="h-6 w-6" />,
  },
  {
    id: '36',
    title: 'Meal Timing',
    description:
      'Eat your largest meal earlier in the day and finish eating 3 hours before bedtime.',
    detailedDescription:
      'Proper meal timing aligns with circadian rhythms and can improve digestion, sleep, and metabolic health.',
    benefits: [
      'Improves digestion and sleep quality',
      'Aligns with natural circadian rhythms',
      'May enhance weight management',
      'Reduces nighttime acid reflux',
    ],
    improvements: {
      health: 'Improves digestive health and sleep quality',
      mental: 'Better sleep leads to improved mood and focus',
      productivity: 'Enhanced energy levels throughout the day',
    },
    category: 'Health',
    timeToImplement: 'Immediate',
    impact: 'medium',
    icon: <Sun className="h-6 w-6" />,
  },
  {
    id: '37',
    title: 'Portion Control',
    description:
      'Use smaller plates and measure portions to prevent overeating and maintain healthy weight.',
    detailedDescription:
      'Portion control helps maintain calorie balance and prevents overeating while still enjoying favorite foods.',
    benefits: [
      'Prevents overeating and supports weight management',
      'Allows enjoyment of favorite foods in moderation',
      'Improves awareness of hunger and satiety cues',
      'Reduces food waste and saves money',
    ],
    improvements: {
      health: 'Supports healthy weight management and prevents overeating',
      finance: 'Reduces food waste and grocery costs',
      mental: 'Improves relationship with food and eating habits',
    },
    category: 'Health',
    timeToImplement: 'Immediate',
    impact: 'medium',
    icon: <Scale className="h-6 w-6" />,
  },
  {
    id: '38',
    title: 'Sugar Reduction',
    description:
      'Limit added sugars to less than 25g per day to improve energy and reduce inflammation.',
    detailedDescription:
      'Reducing added sugars can stabilize blood sugar, improve energy levels, and reduce inflammation throughout the body.',
    benefits: [
      'Stabilizes blood sugar and energy levels',
      'Reduces inflammation and disease risk',
      'Improves dental health',
      'Enhances taste sensitivity to natural foods',
    ],
    improvements: {
      health: 'Reduces diabetes risk and improves overall metabolic health',
      mental: 'Stabilizes mood and energy levels',
      productivity: 'Prevents energy crashes and improves focus',
    },
    category: 'Health',
    timeToImplement: 'Gradual reduction',
    impact: 'high',
    icon: <Apple className="h-6 w-6" />,
  },
  {
    id: '39',
    title: 'Probiotic Foods',
    description:
      'Include fermented foods like yogurt, kimchi, or sauerkraut daily to support gut health.',
    detailedDescription:
      'Probiotic foods support a healthy gut microbiome, which is linked to improved immunity, mood, and overall health.',
    benefits: [
      'Supports healthy gut microbiome',
      'Improves immune system function',
      'May enhance mood and mental health',
      'Aids in digestion and nutrient absorption',
    ],
    improvements: {
      health: 'Strengthens immune system and improves digestive health',
      mental: 'May improve mood through gut-brain connection',
      productivity: 'Better digestion leads to increased energy',
    },
    category: 'Health',
    timeToImplement: 'Daily',
    impact: 'medium',
    icon: <Utensils className="h-6 w-6" />,
  },
  // Reading & Learning Habits
  {
    id: '40',
    title: 'Daily Reading',
    description: 'Read for 30 minutes daily to expand knowledge, improve focus, and reduce stress.',
    detailedDescription:
      'Regular reading improves vocabulary, critical thinking, empathy, and provides a healthy escape from daily stress.',
    benefits: [
      'Expands vocabulary and knowledge base',
      'Improves focus and concentration',
      'Reduces stress and promotes relaxation',
      'Enhances empathy and emotional intelligence',
    ],
    improvements: {
      mental: 'Improves cognitive function and reduces stress',
      productivity: 'Enhances focus and critical thinking skills',
      relationships: 'Increases empathy and communication skills',
    },
    category: 'Mental Health',
    timeToImplement: '30 minutes daily',
    impact: 'high',
    icon: <BookOpen className="h-6 w-6" />,
  },
  // Recovery & Support Habits
  {
    id: '41',
    title: 'Sobriety Meeting',
    description:
      'Attend weekly sobriety support meetings to maintain recovery and build community.',
    detailedDescription:
      'Regular attendance at sobriety meetings provides accountability, support, and tools for maintaining long-term recovery.',
    benefits: [
      'Provides accountability and support system',
      'Offers tools and strategies for recovery',
      'Builds meaningful connections with others',
      'Reduces risk of relapse',
    ],
    improvements: {
      mental: 'Provides crucial support for mental health and recovery',
      relationships: 'Builds strong, supportive community connections',
      health: 'Supports overall physical and mental well-being',
    },
    category: 'Mental Health',
    timeToImplement: '1-2 hours weekly',
    impact: 'high',
    icon: <Users className="h-6 w-6" />,
  },
  {
    id: '42',
    title: 'Gambling Recovery Meeting',
    description:
      'Attend weekly gambling addiction recovery meetings to maintain sobriety from gambling.',
    detailedDescription:
      'Regular attendance at gambling recovery meetings provides support, accountability, and tools for overcoming gambling addiction.',
    benefits: [
      'Provides specialized support for gambling addiction',
      'Offers accountability and relapse prevention',
      'Connects with others facing similar challenges',
      'Provides financial recovery strategies',
    ],
    improvements: {
      mental: 'Crucial support for mental health and addiction recovery',
      finance: 'Helps rebuild financial stability and healthy money habits',
      relationships: 'Repairs relationships damaged by gambling addiction',
    },
    category: 'Mental Health',
    timeToImplement: '1-2 hours weekly',
    impact: 'high',
    icon: <Shield className="h-6 w-6" />,
  },
  // AI & Technology Habits
  {
    id: '43',
    title: 'Daily AI Check-in',
    description:
      'Spend 10 minutes daily checking in with your Personal AI OS for insights and planning.',
    detailedDescription:
      'Regular check-ins with your AI assistant help track progress, get personalized insights, and optimize your daily routine.',
    benefits: [
      'Provides personalized insights and recommendations',
      'Tracks progress toward goals and habits',
      'Offers data-driven decision making support',
      'Helps optimize daily routines and productivity',
    ],
    improvements: {
      productivity: 'Significantly improves daily planning and decision-making',
      mental: 'Provides objective feedback and reduces decision fatigue',
      health: 'Helps track and optimize health-related habits and goals',
    },
    category: 'Productivity',
    timeToImplement: '10 minutes daily',
    impact: 'high',
    icon: <Activity className="h-6 w-6" />,
  },
  // Exercise Habits
  {
    id: '44',
    title: 'Daily Push-ups',
    description: 'Complete a set of push-ups every day to build upper body strength and endurance.',
    detailedDescription:
      'Push-ups are a foundational bodyweight exercise that strengthens the chest, shoulders, triceps, and core. Daily practice builds strength and improves overall fitness.',
    benefits: [
      'Builds upper body strength and muscle',
      'Improves core stability and balance',
      'Requires no equipment',
      'Can be done anywhere, anytime',
    ],
    improvements: {
      health: 'Builds muscle strength and improves cardiovascular fitness',
      mental: 'Boosts confidence and discipline through consistent practice',
      productivity: 'Increases energy levels and physical capability',
    },
    category: 'Health',
    timeToImplement: '5 minutes daily',
    impact: 'high',
    icon: <Activity className="h-6 w-6" />,
  },
  {
    id: '45',
    title: 'Daily Sit-ups',
    description: 'Perform sit-ups daily to strengthen your core and improve posture.',
    detailedDescription:
      'Sit-ups target your abdominal muscles and help build a strong core, which is essential for balance, stability, and preventing back pain.',
    benefits: [
      'Strengthens core and abdominal muscles',
      'Improves posture and balance',
      'Reduces lower back pain risk',
      'Enhances athletic performance',
    ],
    improvements: {
      health: 'Builds core strength and improves overall fitness',
      mental: 'Builds discipline and mental toughness',
      productivity: 'Better posture leads to more energy throughout the day',
    },
    category: 'Health',
    timeToImplement: '5 minutes daily',
    impact: 'high',
    icon: <Activity className="h-6 w-6" />,
  },
  {
    id: '46',
    title: 'Daily Squats',
    description: 'Do a set of squats every day to strengthen your legs, glutes, and core.',
    detailedDescription:
      'Squats are one of the most effective exercises for building lower body strength and improving mobility. They work multiple muscle groups simultaneously.',
    benefits: [
      'Strengthens legs, glutes, and core',
      'Improves balance and mobility',
      'Boosts metabolism and burns calories',
      'Supports functional movement in daily life',
    ],
    improvements: {
      health: 'Builds lower body strength and improves joint health',
      mental: 'Increases mental resilience through challenging exercise',
      productivity: 'Increased leg strength supports active lifestyle',
    },
    category: 'Health',
    timeToImplement: '5 minutes daily',
    impact: 'high',
    icon: <Activity className="h-6 w-6" />,
  },
  {
    id: '47',
    title: 'Daily Planks',
    description: 'Hold a plank position daily to build core strength and stability.',
    detailedDescription:
      'Planks are an isometric exercise that engages your entire core, shoulders, and back. They improve posture and prevent back pain.',
    benefits: [
      'Builds core strength and endurance',
      'Improves posture and spinal alignment',
      'Reduces risk of back injuries',
      'Enhances overall body stability',
    ],
    improvements: {
      health: 'Strengthens core and improves posture significantly',
      mental: 'Builds mental endurance and focus',
      productivity: 'Better posture reduces fatigue during work',
    },
    category: 'Health',
    timeToImplement: '2-5 minutes daily',
    impact: 'high',
    icon: <Activity className="h-6 w-6" />,
  },
  // Personal Care & Safety Habits
  {
    id: '48',
    title: 'Daily Flossing',
    description:
      'Floss your teeth every day to maintain optimal oral health and prevent gum disease.',
    detailedDescription:
      "Daily flossing removes plaque and food particles between teeth where your toothbrush can't reach, preventing cavities and gum disease.",
    benefits: [
      'Prevents gum disease and tooth decay',
      'Reduces risk of heart disease',
      'Eliminates bad breath',
      'Saves money on dental procedures',
    ],
    improvements: {
      health: 'Significantly improves oral and cardiovascular health',
      finance: 'Prevents costly dental procedures and treatments',
      mental: 'Reduces anxiety about dental health',
    },
    category: 'Health',
    timeToImplement: '2 minutes daily',
    impact: 'high',
    icon: <Smile className="h-6 w-6" />,
  },
  {
    id: '49',
    title: 'Drive Speed Limit',
    description:
      'Always drive at or below the speed limit to ensure safety and save money on tickets and fuel.',
    detailedDescription:
      'Driving at the speed limit reduces accident risk, saves fuel, prevents costly tickets, and promotes defensive driving habits.',
    benefits: [
      'Reduces risk of accidents and injuries',
      'Saves money on speeding tickets',
      'Improves fuel efficiency',
      'Sets a good example for others',
    ],
    improvements: {
      health: 'Reduces accident risk and stress while driving',
      finance: 'Saves money on tickets, insurance, and fuel costs',
      mental: 'Reduces driving stress and promotes calm mindset',
    },
    category: 'Safety',
    timeToImplement: 'During driving',
    impact: 'high',
    icon: <Shield className="h-6 w-6" />,
  },
  {
    id: '50',
    title: 'No Phone While Driving',
    description:
      'Never text or use your phone while driving to prevent accidents and stay focused on the road.',
    detailedDescription:
      'Using a phone while driving is one of the leading causes of accidents. Committing to hands-free driving can save lives and prevent serious injuries.',
    benefits: [
      'Dramatically reduces accident risk',
      'Prevents potentially life-threatening situations',
      'Avoids costly tickets and legal issues',
      'Sets positive example for passengers',
    ],
    improvements: {
      health: 'Prevents accidents and protects life and safety',
      finance: 'Avoids tickets, higher insurance rates, and accident costs',
      mental: 'Reduces stress and anxiety while driving',
      relationships: 'Protects loved ones and other drivers',
    },
    category: 'Safety',
    timeToImplement: 'During driving',
    impact: 'high',
    icon: <Shield className="h-6 w-6" />,
  },
  {
    id: '51',
    title: 'Daily Protein Intake Tracking',
    description:
      "Track your daily protein intake to ensure you're meeting your fitness and health goals.",
    detailedDescription:
      "Protein is essential for muscle growth, repair, and overall health. Tracking intake ensures you meet your body's needs based on your activity level and goals.",
    benefits: [
      'Supports muscle growth and repair',
      'Maintains healthy metabolism',
      'Improves satiety and reduces cravings',
      'Helps with weight management',
    ],
    improvements: {
      health: 'Optimizes muscle development and metabolic health',
      productivity: 'Maintains energy levels throughout the day',
      mental: 'Reduces decision fatigue around meal choices',
    },
    category: 'Health',
    timeToImplement: '5 minutes daily',
    impact: 'high',
    icon: <Utensils className="h-6 w-6" />,
  },
  {
    id: '52',
    title: 'Phone-Free Meals',
    description:
      'Keep your phone away during all meals to practice mindful eating and improve digestion.',
    detailedDescription:
      'Eating without phone distractions allows you to focus on your food, recognize fullness cues, and enjoy meals more fully while improving digestion.',
    benefits: [
      'Improves digestion and nutrient absorption',
      'Enhances meal enjoyment and satisfaction',
      'Strengthens family and social connections',
      'Reduces screen time and digital dependency',
    ],
    improvements: {
      health: 'Improves digestion and prevents overeating',
      mental: 'Reduces stress and promotes mindfulness',
      relationships: 'Strengthens connections during shared meals',
      productivity: 'Provides mental breaks from constant connectivity',
    },
    category: 'Digital Wellness',
    timeToImplement: 'During meals',
    impact: 'high',
    icon: <Utensils className="h-6 w-6" />,
  },
  {
    id: '53',
    title: 'Daily Skin Care Routine',
    description:
      'Follow a consistent morning and evening skincare routine to maintain healthy skin.',
    detailedDescription:
      'A consistent skincare routine protects your skin from environmental damage, slows aging, and maintains skin health through cleansing, moisturizing, and protection.',
    benefits: [
      'Prevents premature aging and wrinkles',
      'Protects skin from environmental damage',
      'Builds consistent self-care habits',
      'Boosts confidence and self-esteem',
    ],
    improvements: {
      health: 'Maintains skin health and prevents damage',
      mental: 'Builds self-care routine and boosts confidence',
      productivity: 'Prevents skin issues that can affect daily comfort',
    },
    category: 'Health',
    timeToImplement: '10 minutes daily',
    impact: 'medium',
    icon: <Smile className="h-6 w-6" />,
  },
  {
    id: '54',
    title: 'Daily Sunscreen Application',
    description: 'Apply SPF 30+ sunscreen every morning to protect your skin from UV damage.',
    detailedDescription:
      'Daily sunscreen use is one of the most effective ways to prevent skin cancer, premature aging, and sun damage, even on cloudy days.',
    benefits: [
      'Prevents skin cancer and melanoma',
      'Slows premature aging and wrinkles',
      'Protects against sun damage and dark spots',
      'Maintains even skin tone',
    ],
    improvements: {
      health: 'Dramatically reduces skin cancer risk and prevents aging',
      mental: 'Reduces anxiety about sun exposure and skin health',
      productivity: 'Prevents painful sunburns that affect daily activities',
    },
    category: 'Health',
    timeToImplement: '2 minutes daily',
    impact: 'high',
    icon: <Sun className="h-6 w-6" />,
  },
  {
    id: '55',
    title: 'Evening Walk',
    description: 'Take a 15-20 minute walk after dinner to aid digestion and improve sleep.',
    detailedDescription:
      'An evening walk helps digest your meal, regulates blood sugar, reduces stress, and prepares your body for better sleep quality.',
    benefits: [
      'Aids digestion and regulates blood sugar',
      'Improves sleep quality and duration',
      'Reduces stress and anxiety',
      'Increases daily step count and activity',
    ],
    improvements: {
      health: 'Improves digestion, sleep, and overall fitness',
      mental: 'Reduces stress and promotes relaxation',
      productivity: 'Better sleep leads to more energy next day',
    },
    category: 'Health',
    timeToImplement: '20 minutes daily',
    impact: 'medium',
    icon: <Activity className="h-6 w-6" />,
  },
  {
    id: '56',
    title: 'Daily Posture Check',
    description: 'Set hourly reminders to check and correct your posture throughout the day.',
    detailedDescription:
      'Regular posture checks prevent chronic pain from prolonged sitting or standing, improve breathing, and boost energy levels throughout the day.',
    benefits: [
      'Prevents back and neck pain',
      'Improves breathing and oxygen intake',
      'Increases energy and reduces fatigue',
      'Enhances confidence and presence',
    ],
    improvements: {
      health: 'Prevents chronic pain and musculoskeletal issues',
      mental: 'Boosts confidence through better body language',
      productivity: 'Better posture increases energy and focus',
    },
    category: 'Health',
    timeToImplement: '1 minute per hour',
    impact: 'medium',
    icon: <Activity className="h-6 w-6" />,
  },
  {
    id: '57',
    title: 'Weekly Financial Review',
    description: 'Review your bank accounts, credit cards, and investments every Sunday.',
    detailedDescription:
      'A weekly financial review helps you catch fraudulent charges early, maintain budget awareness, and stay on track with your financial goals.',
    benefits: [
      'Catches fraudulent charges and errors early',
      'Maintains awareness of spending patterns',
      'Supports budgeting and financial goals',
      'Prevents overspending and financial stress',
    ],
    improvements: {
      finance: 'Improves financial control and prevents costly errors',
      mental: 'Reduces anxiety about money through awareness',
      productivity: 'Better financial planning reduces stress and distractions',
    },
    category: 'Finance',
    timeToImplement: '30 minutes weekly',
    impact: 'high',
    icon: <DollarSign className="h-6 w-6" />,
  },
  {
    id: '58',
    title: 'Daily Affirmations',
    description:
      'Spend 5 minutes each morning saying positive affirmations to build confidence and positive mindset.',
    detailedDescription:
      'Daily affirmations reprogram your subconscious mind, reduce negative self-talk, and build self-confidence through consistent positive messaging.',
    benefits: [
      'Builds self-confidence and self-esteem',
      'Reduces negative self-talk and limiting beliefs',
      'Improves mood and outlook on life',
      'Promotes positive thinking patterns',
    ],
    improvements: {
      mental: 'Significantly improves self-confidence and reduces anxiety',
      productivity: 'Positive mindset enhances performance and motivation',
      relationships: 'Better self-image improves social interactions',
    },
    category: 'Mental Health',
    timeToImplement: '5 minutes daily',
    impact: 'medium',
    icon: <Heart className="h-6 w-6" />,
  },
]

const categories = [
  'All',
  'Productivity',
  'Mental Health',
  'Finance',
  'Health',
  'Safety',
  'Digital Wellness',
  'Confidence',
  'Sleep',
  'Organization',
]

export default function LifeHacksPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [addingHabits, setAddingHabits] = useState<Set<string>>(new Set())
  const [addedHabits, setAddedHabits] = useState<Set<string>>(new Set())

  const filteredModules = modules.filter((module) => {
    const matchesCategory = selectedCategory === 'All' || module.category === selectedCategory
    const matchesSearch =
      module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleAddHabit = async (module: Module) => {
    setAddingHabits((prev) => new Set(prev).add(module.id))

    try {
      const response = await fetch('/api/habits/from-recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: module.title,
          description: module.description,
          category: module.category,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAddedHabits((prev) => new Set(prev).add(module.id))
        alert(
          `✅ "${module.title}" habit added successfully! (${data.points_per_completion} points per completion)`
        )
      } else {
        const errorData = await response.json()
        console.error('Error adding habit:', errorData)
        const errorDetails = errorData.details ? ` (${errorData.details})` : ''
        const errorHint = errorData.hint ? ` Hint: ${errorData.hint}` : ''
        alert(
          `❌ Failed to add habit: ${errorData.error || 'Unknown error'}${errorDetails}${errorHint}`
        )
      }
    } catch (error) {
      console.error('Error adding habit:', error)
      alert('❌ Failed to add habit. Please try again.')
    } finally {
      setAddingHabits((prev) => {
        const newSet = new Set(prev)
        newSet.delete(module.id)
        return newSet
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link href="/dashboard">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 rounded-md px-3 hover:bg-gray-100">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-black flex items-center">
                  <Lightbulb className="h-8 w-8 mr-3 text-green-600" />
                  Habit Recommendations
                </h1>
                <p className="text-sm text-gray-600">
                  Discover new habits and productivity ideas to enhance your daily routine
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Search and Filter */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search modules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((module) => (
            <div
              key={module.id}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200 hover:border-green-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg text-green-600">{module.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                    <span className="text-sm text-gray-500">{module.category}</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium border ${getImpactColor(module.impact)}`}
                >
                  {module.impact} impact
                </span>
              </div>

              <p className="text-gray-600 mb-4 leading-relaxed">{module.description}</p>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {module.timeToImplement}
                </span>
                <button
                  onClick={() => handleAddHabit(module)}
                  disabled={addingHabits.has(module.id) || addedHabits.has(module.id)}
                  className={`text-sm font-medium transition-colors ${
                    addedHabits.has(module.id)
                      ? 'text-green-600 cursor-default'
                      : addingHabits.has(module.id)
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-green-600 hover:text-green-700 cursor-pointer'
                  }`}
                >
                  {addedHabits.has(module.id)
                    ? '✅ Added!'
                    : addingHabits.has(module.id)
                      ? 'Adding...'
                      : 'Add Habit →'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredModules.length === 0 && (
          <div className="text-center py-12">
            <Lightbulb className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No modules found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}
