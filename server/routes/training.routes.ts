// This file will contain training-related routes.

import { Router, Response } from "express";
import { db } from "../db";
import {
  trainingPrograms,
  trainingModules,
  trainingEnrollments,
  trainingProgress,
  trainingCourses,
  trainingQuizzes,
  trainingContests,
  trainingMedia,
  certificateTemplates,
  userResponses,
  users,
  settings // Assuming settings schema is in shared/schema
} from "../../shared/schema";
import { authenticateToken, AuthenticatedRequest } from "../lib/auth";
import { and, eq, not, isNull, sql } from "drizzle-orm"; // Added sql import
import { getCompletionCertificate } from "../lib/certificate-service";
import { GeminiService } from '../lib/gemini-service.ts'; // Using GeminiService
import { TrainingService } from "../lib/training-service";
import { upload } from '../storage';

const router = Router();

// Helper function/object for AI services that need API key access via settings
const aiStorage = {
  getSettingByKey: async (keyName: string) => {
    try {
      const setting = await db.select({ value: settings.value })
                                .from(settings)
                                .where(eq(settings.key, keyName))
                                .limit(1);
      return setting.length > 0 ? { value: setting[0].value } : null;
    } catch (dbError) {
      console.error(`Error fetching setting ${keyName}:`, dbError);
      return null;
    }
  }
};

// API Key Check on startup
(async () => {
  try {
    const apiKeySetting = await aiStorage.getSettingByKey('gemini_api_key');
    if (!apiKeySetting || !apiKeySetting.value) {
      console.warn("***************************************************************************");
      console.warn("WARNING: Gemini API key is not configured in settings.");
      console.warn("AI features relying on Gemini Service may not work correctly.");
      console.warn("Please check the 'settings' table for the 'gemini_api_key' entry.");
      console.warn("***************************************************************************");
    }
  } catch (error) {
    console.error("Error checking for Gemini API key on startup:", error);
  }
})();

// Enhanced Training Platform Routes

// Learning Path
router.get("/learning-path/:userId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.params.userId;
        const userRole = 'Observer';
        const currentLevel = 'beginner';
        const learningPath = await TrainingService.getPersonalizedLearningPath(userId, userRole, currentLevel);
        res.status(200).json(learningPath);
    } catch (error) {
        console.error(`Failed to get learning path for user ${req.params.userId}:`, error);
        res.status(500).json({ error: "Failed to retrieve learning path" });
    }
});

// Certificate Templates
router.get("/templates", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const templates = await db.select().from(certificateTemplates);
        res.status(200).json(templates);
    } catch (error) {
        console.error("Failed to fetch certificate templates:", error);
        res.status(500).json({ error: "Failed to fetch certificate templates" });
    }
});

// Courses
router.get("/courses", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const allCourses = await db.select().from(trainingCourses);
        res.json(allCourses);
    } catch (error) {
        console.error("Failed to fetch courses:", error);
        res.status(500).json({ error: "Failed to fetch courses" });
    }
});
router.get("/courses/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const courseId = parseInt(req.params.id);
        const course = await db.select().from(trainingCourses).where(eq(trainingCourses.id, courseId));
        if (course.length > 0) {
            res.json(course[0]);
        } else {
            res.status(404).json({ error: "Course not found" });
        }
    } catch (error) {
        console.error("Failed to fetch course:", error);
        res.status(500).json({ error: "Failed to fetch course" });
    }
});
router.post("/courses", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const newCourse = await db.insert(trainingCourses).values(req.body).returning();
        res.status(201).json(newCourse[0]);
    } catch (error) {
        console.error("Failed to create course:", error);
        res.status(500).json({ error: "Failed to create course" });
    }
});
router.put("/courses/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const courseId = parseInt(req.params.id);
        const updatedCourse = await db.update(trainingCourses).set(req.body).where(eq(trainingCourses.id, courseId)).returning();
        res.json(updatedCourse[0]);
    } catch (error) {
        console.error("Failed to update course:", error);
        res.status(500).json({ error: "Failed to update course" });
    }
});
router.delete("/courses/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const courseId = parseInt(req.params.id);
        await db.delete(trainingCourses).where(eq(trainingCourses.id, courseId));
        res.status(204).send();
    } catch (error) {
        console.error("Failed to delete course:", error);
        res.status(500).json({ error: "Failed to delete course" });
    }
});

// Enrollments & Progress
router.post("/enroll", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { courseId } = req.body;
        const userId = req.user!.id;
        const newEnrollment = await db.insert(trainingEnrollments).values({ userId, courseId, status: 'enrolled' }).returning();
        res.status(201).json(newEnrollment[0]);
    } catch (error) {
        console.error("Failed to enroll in course:", error);
        res.status(500).json({ error: "Failed to enroll in course" });
    }
});
router.get("/enrollments/my", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const myEnrollments = await db.select().from(trainingEnrollments).where(eq(trainingEnrollments.userId, userId));
        res.json(myEnrollments);
    } catch (error) {
        console.error("Failed to fetch enrollments:", error);
        res.status(500).json({ error: "Failed to fetch enrollments" });
    }
});
router.post("/progress", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { enrollmentId, moduleId, progress } = req.body;
        const updatedProgress = await db.insert(trainingProgress).values({ enrollmentId, moduleId, progress }).returning();
        res.status(201).json(updatedProgress[0]);
    } catch (error) {
        console.error("Failed to update progress:", error);
        res.status(500).json({ error: "Failed to update progress" });
    }
});

// Certificate
router.get("/certificate/:enrollmentId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const enrollmentId = parseInt(req.params.enrollmentId);
        const templateId = req.query.templateId as string;
        const enrollment = await db.query.trainingEnrollments.findFirst({
            where: eq(trainingEnrollments.id, enrollmentId),
            with: { user: true, course: true },
        });
        if (!enrollment || enrollment.userId !== req.user!.id) {
            return res.status(404).json({ error: "Enrollment not found or access denied" });
        }
        const pdfBuffer = await getCompletionCertificate(enrollment, templateId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=certificate-${enrollmentId}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Failed to generate certificate:", error);
        res.status(500).json({ error: "Failed to generate certificate" });
    }
});

// Analytics
router.get("/analytics", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const totalEnrollments = await db.select().from(trainingEnrollments).execute();
        const completedEnrollments = await db.select().from(trainingEnrollments).where(eq(trainingEnrollments.status, 'completed')).execute();
        const activeUsers = await db.select().from(users).where(and(eq(users.status, 'active'), not(isNull(users.lastLogin)))).execute();
        res.json({
            totalEnrollments: totalEnrollments.length,
            completedEnrollments: completedEnrollments.length,
            completionRate: totalEnrollments.length > 0 ? (completedEnrollments.length / totalEnrollments.length) * 100 : 0,
            activeUsers: activeUsers.length
        });
    } catch (error) {
        console.error("Failed to fetch analytics:", error);
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
});

// AI Features
router.post("/ai/recommendations", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userProfile = { userId: req.user!.id };
        const recommendations = await GeminiService.getRecommendations(userProfile, aiStorage);
        res.json(recommendations);
    } catch (error) {
        console.error("AI recommendations error:", error);
        if (error instanceof Error && error.message.includes("API key not found")) {
            return res.status(503).json({ error: "AI service unavailable: API key not configured." });
        }
        res.status(500).json({ error: "Failed to get AI recommendations" });
    }
});

router.post("/ai/quiz", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { courseId } = req.body;
        if (!courseId) {
            return res.status(400).json({ error: "courseId is required." });
        }
        const module = { id: courseId };
        const userHistory: any[] = [];
        const quiz = await GeminiService.generateQuiz(module, userHistory, aiStorage);
        res.json(quiz);
    } catch (error) {
        console.error("AI quiz generation error:", error);
        if (error instanceof Error && error.message.includes("API key not found")) {
            return res.status(503).json({ error: "AI service unavailable: API key not configured." });
        }
        res.status(500).json({ error: "Failed to generate AI quiz" });
    }
});

router.post("/ai/feedback", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { userResponses } = req.body;
        if (!userResponses) {
            return res.status(400).json({ error: "userResponses are required." });
        }
        const feedback = await GeminiService.getFeedback(userResponses, aiStorage);
        res.json(feedback);
    } catch (error) {
        console.error("AI feedback error:", error);
        if (error instanceof Error && error.message.includes("API key not found")) {
            return res.status(503).json({ error: "AI service unavailable: API key not configured." });
        }
        res.status(500).json({ error: "Failed to get AI feedback" });
    }
});

router.post("/ai/create-course", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { topic } = req.body;
        if (!topic) {
            return res.status(400).json({ error: "Topic is required to generate a course." });
        }
        const params = {
            topic: topic,
            role: 'Observer',
            difficulty: 'beginner',
            targetDuration: 60
        };
        const newCourse = await GeminiService.generateCourse(params, aiStorage);
        res.status(201).json(newCourse);
    } catch (error) {
        console.error("AI course creation error:", error);
        if (error instanceof Error && error.message.includes("API key not found")) {
            return res.status(503).json({ error: "AI service unavailable: API key not configured." });
        }
        res.status(500).json({ error: "Failed to create AI course" });
    }
});

router.post("/ai/edit-course", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { courseId, instruction } = req.body;
        if (!courseId || !instruction) {
            return res.status(400).json({ error: "courseId and instruction are required." });
        }
        const courseResults = await db.select().from(trainingCourses).where(eq(trainingCourses.id, courseId)).limit(1);
        if (courseResults.length === 0) {
            return res.status(404).json({ error: `Course with ID ${courseId} not found.` });
        }
        const courseData = courseResults[0];
        const updatedCourse = await GeminiService.editCourse(courseData, instruction, aiStorage);
        res.json(updatedCourse);
    } catch (error) {
        console.error("AI course editing error:", error);
        if (error instanceof Error && error.message.includes("API key not found")) {
            return res.status(503).json({ error: "AI service unavailable: API key not configured." });
        }
        res.status(500).json({ error: "Failed to edit AI course" });
    }
});

router.post("/ai/question-bank", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { topic, numQuestions } = req.body;
        if (!topic) {
            return res.status(400).json({ error: "Topic is required." });
        }
        const params = {
            topic: topic,
            difficulty: 'medium',
            questionTypes: ['multiple_choice'],
            count: numQuestions || 10
        };
        const questionBank = await GeminiService.generateQuestionBank(params, aiStorage);
        res.json(questionBank);
    } catch (error) {
        console.error("AI question bank generation error:", error);
        if (error instanceof Error && error.message.includes("API key not found")) {
            return res.status(503).json({ error: "AI service unavailable: API key not configured." });
        }
        res.status(500).json({ error: "Failed to generate AI question bank" });
    }
});

router.post("/ai/graphics-prompt", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: "Content is required." });
        }
        const params = {
            content: content,
            style: 'educational',
            context: 'electoral training'
        };
        const prompt = await GeminiService.generateGraphicsPrompt(params, aiStorage);
        res.json(prompt);
    } catch (error) {
        console.error("AI graphics prompt generation error:", error);
        if (error instanceof Error && error.message.includes("API key not found")) {
            return res.status(503).json({ error: "AI service unavailable: API key not configured." });
        }
        res.status(500).json({ error: "Failed to generate AI graphics prompt" });
    }
});

router.post("/ai/enhance-module", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { moduleContent } = req.body;
        if (!moduleContent) {
            return res.status(400).json({ error: "moduleContent is required." });
        }
        const enhancementType = 'clarity and engagement';
        const enhancedContent = await GeminiService.enhanceModule(moduleContent, enhancementType, aiStorage);
        res.json(enhancedContent);
    } catch (error) {
        console.error("AI module enhancement error:", error);
        if (error instanceof Error && error.message.includes("API key not found")) {
            return res.status(503).json({ error: "AI service unavailable: API key not configured." });
        }
        res.status(500).json({ error: "Failed to enhance module with AI" });
    }
});

// Programs
router.get("/programs", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const programs = await db.select().from(trainingPrograms);
        res.json(programs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch training programs" });
    }
});

router.post("/programs", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { modules, ...programData } = req.body;
    const modulesData = modules as any[];

    try {
        const createdProgram = await db.transaction(async (tx) => {
            const [newProgram] = await tx.insert(trainingPrograms).values(programData).returning();

            if (newProgram && modulesData && Array.isArray(modulesData) && modulesData.length > 0) {
                for (let i = 0; i < modulesData.length; i++) {
                    const moduleObject = modulesData[i];
                    if (!moduleObject.title || typeof moduleObject.duration !== 'number') {
                        throw new Error(`Module at index ${i} is missing required fields (title, duration) or has invalid format.`);
                    }
                    await tx.insert(trainingModules).values({
                        courseId: newProgram.id,
                        title: moduleObject.title,
                        description: moduleObject.description || '',
                        content: moduleObject.content || '',
                        duration: moduleObject.duration,
                        moduleOrder: i,
                        isRequired: moduleObject.isRequired === undefined ? true : !!moduleObject.isRequired,
                        type: moduleObject.type || 'standard',
                        status: moduleObject.status || 'draft'
                    });
                }
            }
            return newProgram;
        });
        res.status(201).json(createdProgram);
    } catch (error) {
        console.error("Failed to create training program with modules:", error);
        if (error instanceof Error && error.message.startsWith("Module at index")) {
             return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to create training program" });
    }
});

router.put("/programs/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const updatedProgram = await db.update(trainingPrograms).set(req.body).where(eq(trainingPrograms.id, id)).returning();
        res.json(updatedProgram[0]);
    } catch (error) {
        res.status(500).json({ error: "Failed to update training program" });
    }
});
router.delete("/programs/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        await db.delete(trainingPrograms).where(eq(trainingPrograms.id, id));
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: "Failed to delete training program" });
    }
});
router.get("/programs/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const program = await db.select().from(trainingPrograms).where(eq(trainingPrograms.id, id));
        res.json(program[0]);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch training program" });
    }
});

// Media
router.post("/media/upload", authenticateToken, upload.single('media'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }
        const { title, description } = req.body;
        const uploaderId = req.user!.id;
        const { filename: fileName, path: filePath, mimetype: mimeType, size } = req.file;
        const newMedia = await db.insert(trainingMedia).values({
            title, description, fileName, filePath, mimeType, size, uploaderId,
            status: 'uploaded',
        }).returning();
        res.status(201).json(newMedia[0]);
    } catch (error) {
        console.error("Failed to upload media:", error);
        res.status(500).json({ error: "Failed to upload media" });
    }
});
router.get("/media", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const media = await db.select().from(trainingMedia);
        res.json(media);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch media" });
    }
});
router.delete("/media/:mediaId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
     try {
        const mediaId = parseInt(req.params.mediaId);
        await db.delete(trainingMedia).where(eq(trainingMedia.id, mediaId));
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: "Failed to delete media" });
    }
});

// Modules
router.get("/courses/:courseId/modules", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const courseId = parseInt(req.params.courseId);
        const modules = await db.select().from(trainingModules).where(eq(trainingModules.courseId, courseId));
        res.json(modules);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch modules" });
    }
});

router.post("/courses/:courseId/modules", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const courseId = parseInt(req.params.courseId);
        if (isNaN(courseId)) {
            return res.status(400).json({ error: "Invalid course ID." });
        }

        const {
            title,
            description,
            content,
            duration,
            moduleType: reqModuleType,
            moduleOrder: reqModuleOrder,
            isRequired: reqIsRequired,
            status: reqStatus
        } = req.body;

        const moduleType = reqModuleType || 'lesson';

        if (moduleType === 'lesson') {
            if (typeof content !== 'object' || content === null || !Array.isArray(content.blocks)) {
                return res.status(400).json({ error: "Invalid rich content structure for module type 'lesson'. Expected { blocks: [] }." });
            }
        }

        let newModuleOrder = reqModuleOrder;
        if (typeof newModuleOrder !== 'number') {
            const existingModulesCountResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(trainingModules)
                .where(eq(trainingModules.courseId, courseId));
            newModuleOrder = existingModulesCountResult[0].count;
        }

        const moduleDataToInsert = {
            courseId,
            title,
            description: description || '',
            content: content || {},
            duration: typeof duration === 'number' ? duration : 0,
            type: moduleType,
            status: reqStatus || 'draft',
            moduleOrder: newModuleOrder,
            isRequired: reqIsRequired === undefined ? true : !!reqIsRequired,
        };

        const [newModule] = await db.insert(trainingModules).values(moduleDataToInsert).returning();
        res.status(201).json(newModule);
    } catch (error) {
        console.error("Failed to create module:", error);
        if (error instanceof Error && 'code' in error && error.code === '23503') {
             return res.status(404).json({ error: `Course with ID ${req.params.courseId} not found or other FK violation.` });
        }
        res.status(500).json({ error: "Failed to create module" });
    }
});

router.put("/modules/:moduleId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const moduleIdParam = req.params.moduleId;
    const moduleId = parseInt(moduleIdParam);

    if (isNaN(moduleId)) {
        return res.status(400).json({ error: "Invalid module ID." });
    }

    const { title, description, content, duration, moduleType, moduleOrder, isRequired, status: reqStatus } = req.body;

    try {
        let effectiveModuleType = moduleType;
        if (content !== undefined && moduleType === undefined) {
            const [existingModule] = await db.select({ type: trainingModules.type })
                                             .from(trainingModules)
                                             .where(eq(trainingModules.id, moduleId))
                                             .limit(1);
            if (!existingModule) {
                return res.status(404).json({ error: "Module not found." });
            }
            effectiveModuleType = existingModule.type;
        }

        if (content !== undefined && effectiveModuleType === 'lesson') {
            if (typeof content !== 'object' || content === null || !Array.isArray(content.blocks)) {
                return res.status(400).json({ error: "Invalid rich content structure for module type 'lesson'. Expected { blocks: [] }." });
            }
        }

        const updateData: { [key: string]: any } = {};

        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (content !== undefined) updateData.content = content;
        if (duration !== undefined) updateData.duration = duration;
        if (moduleType !== undefined) updateData.type = moduleType;
        if (moduleOrder !== undefined) updateData.moduleOrder = moduleOrder;
        if (isRequired !== undefined) updateData.isRequired = isRequired;
        if (reqStatus !== undefined) updateData.status = reqStatus;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No update fields provided." });
        }

        const [updatedModule] = await db.update(trainingModules)
                                        .set(updateData)
                                        .where(eq(trainingModules.id, moduleId))
                                        .returning();

        if (!updatedModule) {
            return res.status(404).json({ error: "Module not found or update failed." });
        }

        res.status(200).json(updatedModule);
    } catch (error) {
        console.error(`Failed to update module ${moduleId}:`, error);
        res.status(500).json({ error: "Failed to update module" });
    }
});

router.delete("/modules/:moduleId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const moduleId = parseInt(req.params.moduleId);
        if (isNaN(moduleId)) {
            return res.status(400).json({ error: "Invalid module ID." });
        }
        await db.delete(trainingModules).where(eq(trainingModules.id, moduleId));
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: "Failed to delete module" });
    }
});

// GET quizzes for a specific module
router.get("/modules/:moduleId/quizzes", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const moduleIdParam = req.params.moduleId;
    const moduleId = parseInt(moduleIdParam);

    if (isNaN(moduleId)) {
        return res.status(400).json({ error: "Invalid module ID." });
    }

    try {
        const [parentModule] = await db.select({ id: trainingModules.id })
                                       .from(trainingModules)
                                       .where(eq(trainingModules.id, moduleId))
                                       .limit(1);

        if (!parentModule) {
            return res.status(404).json({ error: "Parent module not found." });
        }

        const quizzesForModule = await db.select()
                                        .from(trainingQuizzes)
                                        .where(eq(trainingQuizzes.moduleId, moduleId));

        res.status(200).json(quizzesForModule);
    } catch (error) {
        console.error(`Failed to fetch quizzes for module ${moduleId}:`, error);
        res.status(500).json({ error: "Failed to fetch quizzes for module" });
    }
});

// POST a new quiz for a specific module
router.post("/modules/:moduleId/quizzes", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const moduleIdParam = req.params.moduleId;
    const moduleId = parseInt(moduleIdParam);

    if (isNaN(moduleId)) {
        return res.status(400).json({ error: "Invalid module ID." });
    }

    try {
        const [parentModule] = await db.select({ id: trainingModules.id, courseId: trainingModules.courseId, type: trainingModules.type })
                                     .from(trainingModules)
                                     .where(eq(trainingModules.id, moduleId))
                                     .limit(1);

        if (!parentModule) {
            return res.status(404).json({ error: "Parent module not found." });
        }

        const {
            title,
            description,
            passingScore,
            timeLimit,
            maxAttempts,
            quizType,
            isActive,
            questions
        } = req.body;

        if (!title) {
            return res.status(400).json({ error: "Quiz title is required." });
        }
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ error: "Quiz questions are required and must be a non-empty array." });
        }

        for (const q of questions) {
            if (!q.questionText || !q.type || typeof q.points !== 'number') {
                return res.status(400).json({ error: `Question '${q.questionText || 'index ' + questions.indexOf(q)}' must have questionText, type, and points.` });
            }
            if ((q.type === 'multiple-choice' || q.type === 'multiple-select')) {
                if(!Array.isArray(q.options) || q.options.length === 0) {
                    return res.status(400).json({ error: `Question '${q.questionText}' of type '${q.type}' must have options.`});
                }
                for(const opt of q.options){
                    if(opt.text === undefined || typeof opt.isCorrect !== 'boolean'){
                         return res.status(400).json({ error: `Option '${opt.text || JSON.stringify(opt)}' for question '${q.questionText}' is not structured correctly (requires text and isCorrect).`});
                    }
                }
                if(q.type === 'multiple-choice' && q.options.filter((opt:any) => opt.isCorrect).length !== 1){
                    return res.status(400).json({ error: `Question '${q.questionText}' of type 'multiple-choice' must have exactly one correct option.`});
                }
            } else if (q.type === 'true-false' && typeof q.correctAnswer !== 'boolean') {
                 return res.status(400).json({ error: `Question '${q.questionText}' of type 'true-false' must have a boolean correctAnswer.`});
            }
        }

        const quizDataToInsert = {
            moduleId,
            courseId: parentModule.courseId,
            title,
            description: description || '',
            questions,
            passingScore: passingScore === undefined ? 70 : passingScore,
            timeLimit: timeLimit === undefined ? 60 : timeLimit,
            maxAttempts: maxAttempts === undefined ? null : maxAttempts,
            quizType: quizType || 'standard',
            isActive: isActive === undefined ? true : isActive,
            status: 'draft',
        };

        const newQuiz = await db.transaction(async (tx) => {
            const [insertedQuiz] = await tx.insert(trainingQuizzes).values(quizDataToInsert).returning();

            if (parentModule.type !== 'quiz') {
                await tx.update(trainingModules)
                          .set({ type: 'quiz' })
                          .where(eq(trainingModules.id, moduleId));
            }
            return insertedQuiz;
        });

        res.status(201).json(newQuiz);

    } catch (error) {
        console.error(`Failed to create quiz for module ${moduleId}:`, error);
        if (error instanceof Error && (error.message.includes("must have") || error.message.includes("is not structured correctly") || error.message.includes("is required"))) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to create quiz" });
    }
});


// Quizzes (general routes)
router.get("/courses/:courseId/quizzes", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const courseId = parseInt(req.params.courseId);
        if (isNaN(courseId)) { return res.status(400).json({ error: "Invalid course ID."}); }
        const quizzes = await db.select().from(trainingQuizzes).where(eq(trainingQuizzes.courseId, courseId));
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch quizzes" });
    }
});

// This route might be for quizzes not directly tied to a specific module (e.g. course-wide final exam)
// or could be deprecated if all quizzes must be under a module.
router.post("/courses/:courseId/quizzes", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const courseId = parseInt(req.params.courseId);
        if (isNaN(courseId)) { return res.status(400).json({ error: "Invalid course ID."}); }
        // Ensure course exists
        const [parentCourse] = await db.select({id: trainingCourses.id}).from(trainingCourses).where(eq(trainingCourses.id, courseId)).limit(1);
        if(!parentCourse) { return res.status(404).json({ error: "Parent course not found."}); }

        // Similar validation as /modules/:moduleId/quizzes should be here
        const { title, questions } = req.body;
        if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ error: "Quiz title and non-empty questions array are required." });
        }
        // Add question validation loop here if this route is to be fully supported

        const newQuiz = await db.insert(trainingQuizzes).values({ ...req.body, courseId }).returning();
        res.status(201).json(newQuiz[0]);
    } catch (error) {
        res.status(500).json({ error: "Failed to create quiz for course" });
    }
});

router.get("/quizzes/:quizId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const quizIdParam = req.params.quizId;
    const quizId = parseInt(quizIdParam);

    if (isNaN(quizId)) {
        return res.status(400).json({ error: "Invalid quiz ID." });
    }

    try {
        const [quiz] = await db.select()
                               .from(trainingQuizzes)
                               .where(eq(trainingQuizzes.id, quizId))
                               .limit(1);

        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found." });
        }
        res.status(200).json(quiz);
    } catch (error) {
        console.error(`Failed to fetch quiz ${quizId}:`, error);
        res.status(500).json({ error: "Failed to fetch quiz" });
    }
});

router.put("/quizzes/:quizId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const quizId = parseInt(req.params.quizId);
        if (isNaN(quizId)) { return res.status(400).json({ error: "Invalid quiz ID."}); }

        // Add similar question validation as in POST /modules/:moduleId/quizzes if req.body.questions is present
        const { questions, title } = req.body;
        if (title !== undefined && !title) { // if title is provided, it cannot be empty
             return res.status(400).json({ error: "Quiz title cannot be empty." });
        }
        if (questions && (!Array.isArray(questions) || questions.length === 0)) {
            return res.status(400).json({ error: "Quiz questions must be a non-empty array." });
        }
        if (questions) {
            for (const q of questions) {
                 if (!q.questionText || !q.type || typeof q.points !== 'number') {
                    return res.status(400).json({ error: `Question '${q.questionText || 'index ' + questions.indexOf(q)}' must have questionText, type, and points.` });
                }
                // Add more type-specific validation
            }
        }

        const [updatedQuiz] = await db.update(trainingQuizzes).set(req.body).where(eq(trainingQuizzes.id, quizId)).returning();
        if (!updatedQuiz) {
            return res.status(404).json({ error: "Quiz not found or no changes made." });
        }
        res.json(updatedQuiz);
    } catch (error) {
        res.status(500).json({ error: "Failed to update quiz" });
    }
});

router.delete("/quizzes/:quizId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const quizId = parseInt(req.params.quizId);
        if (isNaN(quizId)) { return res.status(400).json({ error: "Invalid quiz ID."}); }
        const result = await db.delete(trainingQuizzes).where(eq(trainingQuizzes.id, quizId)).returning({ id: trainingQuizzes.id });
        if (result.length === 0) {
            return res.status(404).json({ error: "Quiz not found." });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: "Failed to delete quiz" });
    }
});

// Contests
// ... (rest of the file remains the same)
router.get("/courses/:courseId/contests", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const courseId = parseInt(req.params.courseId);
        const contests = await db.select().from(trainingContests).where(eq(trainingContests.courseId, courseId));
        res.json(contests);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch contests" });
    }
});
router.post("/courses/:courseId/contests", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const courseId = parseInt(req.params.courseId);
        const newContest = await db.insert(trainingContests).values({ ...req.body, courseId, createdBy: req.user!.id }).returning();
        res.status(201).json(newContest[0]);
    } catch (error) {
        res.status(500).json({ error: "Failed to create contest" });
    }
});
router.put("/contests/:contestId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const contestId = parseInt(req.params.contestId);
        const updatedContest = await db.update(trainingContests).set(req.body).where(eq(trainingContests.id, contestId)).returning();
        res.json(updatedContest[0]);
    } catch (error) {
        res.status(500).json({ error: "Failed to update contest" });
    }
});
router.delete("/contests/:contestId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const contestId = parseInt(req.params.contestId);
        await db.delete(trainingContests).where(eq(trainingContests.id, contestId));
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: "Failed to delete contest" });
    }
});

// Course Media
router.get("/courses/:courseId/media", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const courseId = parseInt(req.params.courseId);
        const media = await db.select().from(trainingMedia).where(eq(trainingMedia.courseId, courseId));
        res.json(media);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch media" });
    }
});
router.post("/courses/:courseId/media", authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const courseIdParam = req.params.courseId;
        const courseId = parseInt(courseIdParam);
        if (isNaN(courseId)) {
            return res.status(400).json({ error: "Invalid course ID." });
        }
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded. Please select a file." });
        }
        const { title, description } = req.body;
        const uploaderId = req.user!.id;
        const { filename: fileName, path: filePath, mimetype: mimeType, size } = req.file;
        const newMedia = await db.insert(trainingMedia).values({
            title, description, fileName, filePath, mimeType, size, uploaderId, courseId,
            status: 'uploaded',
        }).returning();
        res.status(201).json(newMedia[0]);
    } catch (error) {
        console.error(`Failed to upload media for course ${req.params.courseId}:`, error);
        if (error instanceof Error && 'code' in error && error.code === '23503') {
             return res.status(404).json({ error: `Course with ID ${req.params.courseId} not found.` });
        }
        res.status(500).json({ error: "Failed to upload media for course" });
    }
});

export default router;
