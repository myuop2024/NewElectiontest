export interface TrainingModule {
  id: number;
  title: string;
  description: string;
  content: any;
  moduleType: 'video' | 'interactive' | 'document' | 'quiz';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  prerequisites: number[];
  learningObjectives: string[];
  isRequired: boolean;
  certificationPoints: number;
}

export interface UserProgress {
  userId: number;
  moduleId: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  score?: number;
  timeSpent: number;
  attempts: number;
}

export interface CertificationRequirement {
  level: 'basic' | 'advanced' | 'expert';
  requiredModules: number[];
  minimumScore: number;
  validityPeriod: number; // days
  renewalRequired: boolean;
}

export class TrainingService {
  
  // Get personalized learning path
  static async getPersonalizedLearningPath(userId: number, userRole: string, currentLevel: string) {
    const learningPath = {
      userId,
      currentLevel,
      recommendedModules: [],
      priorityModules: [],
      estimatedCompletionTime: 0,
      certificationGoal: this.determineCertificationGoal(userRole, currentLevel)
    };

    // AI-powered content recommendation based on user profile
    const modules = await this.getRecommendedModules(userId, userRole, currentLevel);
    learningPath.recommendedModules = modules;
    learningPath.estimatedCompletionTime = modules.reduce((total, module) => total + module.estimatedDuration, 0);

    return learningPath;
  }

  // Generate interactive content
  static generateInteractiveContent(topic: string, difficulty: string) {
    const scenarios = {
      'polling_station_setup': {
        beginner: {
          scenario: 'Setting up your first polling station',
          challenges: [
            'Verify equipment functionality',
            'Arrange seating for accessibility',
            'Set up observation position'
          ],
          interactions: [
            {
              type: 'drag_and_drop',
              question: 'Arrange the polling station layout',
              items: ['Voting booth', 'Ballot box', 'Observer chair', 'Exit']
            }
          ]
        },
        intermediate: {
          scenario: 'Managing complex polling station issues',
          challenges: [
            'Handle equipment malfunctions',
            'Manage voter disputes',
            'Document irregularities'
          ],
          interactions: [
            {
              type: 'decision_tree',
              question: 'A voter claims their name is missing from the list. What do you do?',
              options: [
                'Direct them to election official',
                'Document the incident immediately',
                'Both A and B',
                'Ignore the complaint'
              ]
            }
          ]
        }
      }
    };

    return scenarios[topic]?.[difficulty] || this.generateGenericContent(topic, difficulty);
  }

  // Create adaptive assessments
  static generateAdaptiveAssessment(moduleId: number, userHistory: UserProgress[]) {
    const baseQuestions = this.getModuleQuestions(moduleId);
    const userPerformance = this.analyzeUserPerformance(userHistory);
    
    // Adjust difficulty based on performance
    let adaptedQuestions = baseQuestions;
    
    if (userPerformance.averageScore < 70) {
      adaptedQuestions = baseQuestions.filter(q => q.difficulty === 'easy');
    } else if (userPerformance.averageScore > 85) {
      adaptedQuestions = baseQuestions.filter(q => q.difficulty === 'hard');
    }

    return {
      moduleId,
      questions: adaptedQuestions,
      timeLimit: this.calculateTimeLimit(adaptedQuestions.length),
      passingScore: 80,
      maxAttempts: 3
    };
  }

  // Track detailed learning analytics
  static async trackLearningAnalytics(userId: number, moduleId: number, eventData: any) {
    const analytics = {
      userId,
      moduleId,
      eventType: eventData.type,
      timestamp: new Date(),
      data: {
        timeOnPage: eventData.timeOnPage,
        interactionsCount: eventData.interactions,
        completionRate: eventData.progress,
        difficultyRating: eventData.userRating,
        helpRequestsCount: eventData.helpRequests
      }
    };

    // Store analytics for AI learning optimization
    return analytics;
  }

  // Generate micro-learning modules
  static generateMicroLearning(topic: string, duration: number = 5) {
    const microModules = {
      'quick_reporting': {
        title: '5-Minute Quick Reporting',
        content: [
          {
            type: 'tip',
            text: 'Always verify location before submitting reports'
          },
          {
            type: 'interactive',
            component: 'photo_practice',
            instruction: 'Practice taking clear documentation photos'
          },
          {
            type: 'checklist',
            items: ['Time stamp', 'Location verified', 'Clear photo', 'Description added']
          }
        ],
        assessment: {
          type: 'quick_quiz',
          questions: 2,
          timeLimit: 60
        }
      }
    };

    return microModules[topic] || this.generateGenericMicroModule(topic, duration);
  }

  // Gamification system
  static calculateUserAchievements(userId: number, completedModules: TrainingModule[], scores: number[]) {
    const achievements = [];
    const totalPoints = completedModules.reduce((sum, module) => sum + module.certificationPoints, 0);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Achievement badges
    if (completedModules.length >= 10) {
      achievements.push({
        id: 'dedicated_learner',
        title: 'Dedicated Learner',
        description: 'Completed 10 training modules',
        icon: '🎓',
        points: 100
      });
    }

    if (averageScore >= 95) {
      achievements.push({
        id: 'excellence',
        title: 'Excellence in Training',
        description: 'Maintained 95%+ average score',
        icon: '⭐',
        points: 200
      });
    }

    if (completedModules.some(m => m.difficulty === 'advanced')) {
      achievements.push({
        id: 'advanced_observer',
        title: 'Advanced Observer',
        description: 'Completed advanced training modules',
        icon: '🏆',
        points: 150
      });
    }

    return {
      achievements,
      totalPoints,
      currentLevel: this.calculateUserLevel(totalPoints),
      nextLevelRequirement: this.getNextLevelRequirement(totalPoints)
    };
  }

  private static async getRecommendedModules(userId: number, userRole: string, currentLevel: string): Promise<TrainingModule[]> {
    // AI-powered recommendation logic
    const baseModules = [
      {
        id: 1,
        title: 'Electoral Observer Fundamentals',
        description: 'Basic principles of electoral observation',
        content: {},
        moduleType: 'interactive' as const,
        difficulty: 'beginner' as const,
        estimatedDuration: 30,
        prerequisites: [],
        learningObjectives: ['Understand observer role', 'Learn reporting procedures'],
        isRequired: true,
        certificationPoints: 50
      }
    ];

    return baseModules;
  }

  private static determineCertificationGoal(userRole: string, currentLevel: string) {
    const goals = {
      'observer': currentLevel === 'beginner' ? 'basic' : 'advanced',
      'supervisor': 'advanced',
      'admin': 'expert'
    };

    return goals[userRole] || 'basic';
  }

  private static generateGenericContent(topic: string, difficulty: string) {
    return {
      scenario: `Learning about ${topic}`,
      challenges: [`Understanding ${topic} concepts`],
      interactions: [{
        type: 'multiple_choice',
        question: `What is the most important aspect of ${topic}?`,
        options: ['Accuracy', 'Speed', 'Documentation', 'Communication']
      }]
    };
  }

  private static getModuleQuestions(moduleId: number) {
    return [
      {
        id: 1,
        question: 'What is the primary role of an electoral observer?',
        options: ['Vote counting', 'Neutral monitoring', 'Candidate support', 'Equipment operation'],
        correct: 1,
        difficulty: 'easy'
      }
    ];
  }

  private static analyzeUserPerformance(userHistory: UserProgress[]) {
    const completedModules = userHistory.filter(p => p.status === 'completed');
    const averageScore = completedModules.reduce((sum, p) => sum + (p.score || 0), 0) / completedModules.length;
    
    return {
      averageScore: averageScore || 0,
      completionRate: completedModules.length / userHistory.length,
      averageAttempts: completedModules.reduce((sum, p) => sum + p.attempts, 0) / completedModules.length
    };
  }

  private static calculateTimeLimit(questionCount: number): number {
    return questionCount * 2; // 2 minutes per question
  }

  private static generateGenericMicroModule(topic: string, duration: number) {
    return {
      title: `${duration}-Minute ${topic} Overview`,
      content: [
        {
          type: 'overview',
          text: `Quick introduction to ${topic}`
        }
      ],
      assessment: {
        type: 'quick_quiz',
        questions: 1,
        timeLimit: 30
      }
    };
  }

  private static calculateUserLevel(totalPoints: number): string {
    if (totalPoints >= 1000) return 'Expert';
    if (totalPoints >= 500) return 'Advanced';
    if (totalPoints >= 200) return 'Intermediate';
    return 'Beginner';
  }

  private static getNextLevelRequirement(totalPoints: number): number {
    if (totalPoints < 200) return 200 - totalPoints;
    if (totalPoints < 500) return 500 - totalPoints;
    if (totalPoints < 1000) return 1000 - totalPoints;
    return 0;
  }
}