import fetch from 'node-fetch';

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

export class GeminiService {
  static async getApiKey(storage: any) {
    // Assumes 'gemini_api_key' is stored in settings
    const setting = await storage.getSettingByKey('gemini_api_key');
    return setting?.value;
  }

  static async getRecommendations(userProfile: any, storage: any) {
    const apiKey = await this.getApiKey(storage);
    if (!apiKey) throw new Error('Gemini API key not set');
    const prompt = `Recommend personalized election training modules for this user: ${JSON.stringify(userProfile)}`;
    return this.callGemini(prompt, apiKey);
  }

  static async generateQuiz(module: any, userHistory: any, storage: any) {
    const apiKey = await this.getApiKey(storage);
    if (!apiKey) throw new Error('Gemini API key not set');
    const prompt = `Generate a quiz for the following module: ${JSON.stringify(module)}. User history: ${JSON.stringify(userHistory)}`;
    return this.callGemini(prompt, apiKey);
  }

  static async getFeedback(progress: any, storage: any) {
    const apiKey = await this.getApiKey(storage);
    if (!apiKey) throw new Error('Gemini API key not set');
    const prompt = `Provide smart feedback for this user progress: ${JSON.stringify(progress)}`;
    return this.callGemini(prompt, apiKey);
  }

  static async callGemini(prompt: string, apiKey: string) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey;
    const body = {
      contents: [{ parts: [{ text: prompt }] }]
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('Gemini API error');
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || data;
  }

  static async generateCourse(params: { topic: string, role: string, difficulty: string, targetDuration: number }, storage: any) {
    const apiKey = await this.getApiKey(storage);
    if (!apiKey) throw new Error('Gemini API key not set');
    
    const prompt = `Create a comprehensive training course for electoral observers with the following specifications:

Topic: ${params.topic}
Role: ${params.role} 
Difficulty: ${params.difficulty}
Target Duration: ${params.targetDuration} minutes

Please generate a complete course structure in the following JSON format:
{
  "title": "Course Title",
  "description": "Detailed course description (2-3 sentences)",
  "role": "${params.role}",
  "duration": ${params.targetDuration},
  "passingScore": 80,
  "content": {
    "modules": [
      {
        "title": "Module 1 Title",
        "duration": 30,
        "objectives": ["Learning objective 1", "Learning objective 2"],
        "content": "Brief module description"
      }
    ]
  }
}

Requirements:
- Create 4-8 modules that add up to approximately ${params.targetDuration} minutes
- Each module should be 10-45 minutes long
- Include realistic learning objectives for each module
- Focus on practical skills for ${params.role} in electoral observation
- Adjust complexity based on ${params.difficulty} level
- Ensure content is relevant to Jamaica's electoral context
- Set appropriate passing score (70-90% based on difficulty)

Return ONLY the JSON structure, no additional text.`;

    const result = await this.callGemini(prompt, apiKey);
    
    try {
      // Try to parse the JSON response
      const courseData = JSON.parse(result);
      return courseData;
    } catch (error) {
      // If parsing fails, return a structured error
      throw new Error('Failed to generate course structure. Please try again.');
    }
  }

  static async editCourse(courseData: any, editRequest: string, storage: any) {
    const apiKey = await this.getApiKey(storage);
    if (!apiKey) throw new Error('Gemini API key not set');
    
    const prompt = `You are an expert course designer. Please edit the following course based on the request:

CURRENT COURSE:
${JSON.stringify(courseData, null, 2)}

EDIT REQUEST: ${editRequest}

Please return the updated course in the same JSON format, incorporating the requested changes while maintaining educational quality and structure. Only modify what was requested and keep the rest intact.

Return ONLY the JSON structure, no additional text.`;

    const result = await this.callGemini(prompt, apiKey);
    
    try {
      return JSON.parse(result);
    } catch (error) {
      throw new Error('Failed to edit course. Please try again.');
    }
  }

  static async generateQuestionBank(params: { topic: string, difficulty: string, questionTypes: string[], count: number }, storage: any) {
    const apiKey = await this.getApiKey(storage);
    if (!apiKey) throw new Error('Gemini API key not set');
    
    const prompt = `Generate a comprehensive question bank for electoral observation training with the following specifications:

Topic: ${params.topic}
Difficulty: ${params.difficulty}
Question Types: ${params.questionTypes.join(', ')}
Number of Questions: ${params.count}

Create questions in the following JSON format:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Why this answer is correct",
      "difficulty": "${params.difficulty}",
      "topic": "${params.topic}"
    },
    {
      "id": 2,
      "type": "true_false",
      "question": "Statement to evaluate",
      "correct": true,
      "explanation": "Explanation of the answer"
    },
    {
      "id": 3,
      "type": "scenario",
      "question": "Scenario description followed by question",
      "options": ["Action A", "Action B", "Action C"],
      "correct": 0,
      "explanation": "Why this action is appropriate"
    }
  ]
}

Requirements:
- Mix question types: ${params.questionTypes.join(', ')}
- Focus on practical electoral observation scenarios
- Include challenging but fair questions for ${params.difficulty} level
- Provide clear explanations for each answer
- Ensure questions test real-world application, not just memorization

Return ONLY the JSON structure, no additional text.`;

    const result = await this.callGemini(prompt, apiKey);
    
    try {
      return JSON.parse(result);
    } catch (error) {
      throw new Error('Failed to generate question bank. Please try again.');
    }
  }

  static async generateGraphicsPrompt(params: { content: string, style: string, context: string }, storage: any) {
    const apiKey = await this.getApiKey(storage);
    if (!apiKey) throw new Error('Gemini API key not set');
    
    const prompt = `Create a detailed prompt for AI image generation (DALL-E, Midjourney, etc.) based on these requirements:

Content: ${params.content}
Style: ${params.style}
Context: ${params.context}

Generate a comprehensive image generation prompt that would create educational graphics suitable for electoral observer training materials. The prompt should be specific, detailed, and optimized for AI image generation.

Focus on:
- Professional, educational appearance
- Clear visual communication
- Appropriate for training materials
- Culturally relevant to Jamaica if applicable
- ${params.style} aesthetic

Return just the image generation prompt text, optimized for AI image generators.`;

    return await this.callGemini(prompt, apiKey);
  }

  static async enhanceModule(moduleData: any, enhancementType: string, storage: any) {
    const apiKey = await this.getApiKey(storage);
    if (!apiKey) throw new Error('Gemini API key not set');
    
    const prompt = `Enhance the following training module:

CURRENT MODULE:
${JSON.stringify(moduleData, null, 2)}

ENHANCEMENT TYPE: ${enhancementType}

Please improve the module by:
- Adding more detailed content if requested
- Improving learning objectives
- Suggesting interactive elements
- Adding practical exercises
- Enhancing engagement factors
- Including real-world examples from Jamaica's electoral context

Return the enhanced module in the same JSON format with improvements incorporated.

Return ONLY the JSON structure, no additional text.`;

    const result = await this.callGemini(prompt, apiKey);
    
    try {
      return JSON.parse(result);
    } catch (error) {
      throw new Error('Failed to enhance module. Please try again.');
    }
  }
}