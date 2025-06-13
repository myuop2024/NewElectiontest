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
  settings,
  courseAssignments,
  assignmentSubmissions
} from "../../shared/schema";
import { authenticateToken, AuthenticatedRequest } from "../lib/auth";
import { and, eq, not, isNull, sql } from "drizzle-orm";
import { getCompletionCertificate } from "../lib/certificate-service";
import { GeminiService } from '../lib/gemini-service.ts';
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

router.post("/courses/:courseId/reorder-modules", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    if (req.user!.role !== 'admin' && req.user!.role !== 'coordinator') {
        return res.status(403).json({ error: "Forbidden: Insufficient privileges." });
    }

    const courseIdParam = req.params.courseId;
    const courseId = parseInt(courseIdParam);

    if (isNaN(courseId)) {
        return res.status(400).json({ error: "Invalid course ID." });
    }

    const { moduleIds } = req.body;

    if (!Array.isArray(moduleIds) || !moduleIds.every(id => typeof id === 'number')) {
        return res.status(400).json({ error: "moduleIds must be an array of numbers." });
    }
    if (moduleIds.length === 0 && req.body.allowEmptyOrder){ // Allow explicit empty order only if a flag is set
        // Handle empty order - e.g. set all moduleOrder to null or 0 for this course
    } else if (moduleIds.length === 0) {
        return res.status(400).json({ error: "moduleIds array cannot be empty unless explicitly allowed." });
    }


    try {
        const [course] = await db.select({ id: trainingCourses.id })
            .from(trainingCourses)
            .where(eq(trainingCourses.id, courseId)).limit(1);

        if (!course) {
            return res.status(404).json({ error: "Course not found." });
        }

        const existingModules = await db.select({ id: trainingModules.id })
            .from(trainingModules)
            .where(eq(trainingModules.courseId, courseId));

        const existingModuleIds = new Set(existingModules.map(m => m.id));
        const providedModuleIds = new Set(moduleIds);

        if (existingModuleIds.size !== providedModuleIds.size) {
            return res.status(400).json({ error: "Module list mismatch: The number of provided module IDs does not match the number of existing modules for this course." });
        }

        for (const id of moduleIds) {
            if (!existingModuleIds.has(id)) {
                return res.status(400).json({ error: `Module list mismatch: Module ID ${id} does not belong to course ${courseId} or is duplicated.` });
            }
        }

        await db.transaction(async (tx) => {
            for (let i = 0; i < moduleIds.length; i++) {
                const moduleId = moduleIds[i];
                await tx.update(trainingModules)
                    .set({ moduleOrder: i, updatedAt: new Date() })
                    .where(and(eq(trainingModules.id, moduleId), eq(trainingModules.courseId, courseId)));
            }
        });

        res.status(200).json({ message: "Modules reordered successfully." });
    } catch (error) {
        console.error(`Failed to reorder modules for course ${courseId}:`, error);
        res.status(500).json({ error: "Failed to reorder modules" });
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
// ... (AI routes remain unchanged)

// Programs
// ... (Program routes remain unchanged)

// Media
// ... (Media routes remain unchanged)

// Modules
// ... (Module GET, POST, PUT, DELETE routes remain unchanged, but new assignment submission routes will be added after these)
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
            status: reqStatus,
            resources
        } = req.body;

        const moduleType = reqModuleType || 'lesson';

        if (moduleType === 'lesson' || moduleType === 'assignment') {
            if (content && (typeof content !== 'object' || content === null || !Array.isArray(content.blocks))) {
                return res.status(400).json({ error: `Invalid rich content structure for module type '${moduleType}'. Expected { blocks: [] } or null/undefined.` });
            }
        }

        if (resources !== undefined) {
            if (!Array.isArray(resources)) {
                return res.status(400).json({ error: "'resources' must be an array." });
            }
            for (const resource of resources) {
                if (!resource.id || typeof resource.id !== 'string' ||
                    !resource.type || typeof resource.type !== 'string' ||
                    !resource.title || typeof resource.title !== 'string') {
                    return res.status(400).json({ error: "Each resource must have id (string), type (string), and title (string)." });
                }
                if (resource.type === 'media') {
                    if (!resource.data || typeof resource.data !== 'object' || typeof resource.data.mediaId !== 'number') {
                        return res.status(400).json({ error: "Resource of type 'media' must have data object with mediaId (number)." });
                    }
                } else if (resource.type === 'url') {
                    if (!resource.data || typeof resource.data !== 'object' || typeof resource.data.url !== 'string' ||
                        !(resource.data.url.startsWith('http://') || resource.data.url.startsWith('https://'))) {
                        return res.status(400).json({ error: "Resource of type 'url' must have data object with a valid url (string starting with http/https)." });
                    }
                     if (resource.data.openInNewTab !== undefined && typeof resource.data.openInNewTab !== 'boolean') {
                        return res.status(400).json({ error: "Resource 'openInNewTab' must be a boolean if provided." });
                    }
                } else {
                    return res.status(400).json({ error: `Invalid resource type: '${resource.type}'. Must be 'media' or 'url'.` });
                }
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

        const moduleDataToInsert: typeof trainingModules.$inferInsert = {
            courseId,
            title,
            description: description || '',
            content: content || {},
            duration: typeof duration === 'number' ? duration : 0,
            type: moduleType,
            status: reqStatus || 'draft',
            moduleOrder: newModuleOrder,
            isRequired: reqIsRequired === undefined ? true : !!reqIsRequired,
            resources: resources || []
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

    const { title, description, content, duration, moduleType, moduleOrder, isRequired, status: reqStatus, resources } = req.body;

    try {
        let effectiveModuleType = moduleType;
        if (moduleType === undefined && content !== undefined) {
            const [existingModule] = await db.select({ type: trainingModules.type })
                                             .from(trainingModules)
                                             .where(eq(trainingModules.id, moduleId))
                                             .limit(1);
            if (!existingModule) {
                return res.status(404).json({ error: "Module not found." });
            }
            effectiveModuleType = existingModule.type;
        } else if (moduleType === undefined && content === undefined) {
            effectiveModuleType = undefined;
        }

        if (content !== undefined && (effectiveModuleType === 'lesson' || effectiveModuleType === 'assignment')) {
            if (typeof content !== 'object' || content === null || !Array.isArray(content.blocks)) {
                return res.status(400).json({ error: `Invalid rich content structure for module type '${effectiveModuleType}'. Expected { blocks: [] }.` });
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

        if (resources !== undefined) {
            if (!Array.isArray(resources)) {
                return res.status(400).json({ error: "'resources' must be an array." });
            }
            for (const resource of resources) {
                if (!resource.id || typeof resource.id !== 'string' ||
                    !resource.type || typeof resource.type !== 'string' ||
                    !resource.title || typeof resource.title !== 'string') {
                    return res.status(400).json({ error: "Each resource must have id (string), type (string), and title (string)." });
                }
                if (resource.type === 'media') {
                    if (!resource.data || typeof resource.data !== 'object' || typeof resource.data.mediaId !== 'number') {
                        return res.status(400).json({ error: "Resource of type 'media' must have data object with mediaId (number)." });
                    }
                } else if (resource.type === 'url') {
                    if (!resource.data || typeof resource.data !== 'object' || typeof resource.data.url !== 'string' ||
                        !(resource.data.url.startsWith('http://') || resource.data.url.startsWith('https://'))) {
                        return res.status(400).json({ error: "Resource of type 'url' must have data object with a valid url (string starting with http/https)." });
                    }
                     if (resource.data.openInNewTab !== undefined && typeof resource.data.openInNewTab !== 'boolean') {
                        return res.status(400).json({ error: "Resource 'openInNewTab' must be a boolean if provided." });
                    }
                } else {
                    return res.status(400).json({ error: `Invalid resource type: '${resource.type}'. Must be 'media' or 'url'.` });
                }
            }
            updateData.resources = resources;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No update fields provided." });
        }
        updateData.updatedAt = new Date(); // Ensure updatedAt is set on any update

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
        if (error instanceof Error && (error.message.includes("resource") || error.message.includes("Invalid module ID") || error.message.includes("No update fields"))) {
            return res.status(400).json({ error: error.message });
        }
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

// Assignments (module-specific item)
router.post("/modules/:moduleId/assignments", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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

        if (parentModule.type !== 'assignment') {
            return res.status(400).json({ error: "Assignments can only be created for modules of type 'assignment'." });
        }

        const {
            title,
            description,
            submissionTypes,
            dueDate,
            pointsPossible,
            config
        } = req.body;

        if (!title || typeof title !== 'string' || title.trim() === '') {
            return res.status(400).json({ error: "Assignment title is required and must be a non-empty string." });
        }
        if (!submissionTypes || !Array.isArray(submissionTypes) || submissionTypes.length === 0 || !submissionTypes.every(st => typeof st === 'string')) {
            return res.status(400).json({ error: "submissionTypes is required and must be a non-empty array of strings." });
        }
        if (dueDate !== undefined && dueDate !== null && isNaN(new Date(dueDate).getTime())) { // Allow null for dueDate
            return res.status(400).json({ error: "Invalid dueDate format." });
        }
        if (pointsPossible !== undefined && pointsPossible !== null && typeof pointsPossible !== 'number') { // Allow null
            return res.status(400).json({ error: "pointsPossible must be a number or null." });
        }
        if (config !== undefined && config !== null && (typeof config !== 'object')) { // Allow null
            return res.status(400).json({ error: "config must be an object or null." });
        }

        const assignmentDataToInsert = {
            moduleId,
            courseId: parentModule.courseId,
            title,
            description: description || '',
            submissionTypes,
            dueDate: dueDate ? new Date(dueDate) : null,
            pointsPossible: pointsPossible === undefined ? null : pointsPossible,
            config: config || {},
        };

        const [newAssignment] = await db.insert(courseAssignments).values(assignmentDataToInsert).returning();
        res.status(201).json(newAssignment);

    } catch (error) {
        console.error(`Failed to create assignment for module ${moduleId}:`, error);
         if (error instanceof Error && (error.message.includes("required") || error.message.includes("Invalid") || error.message.includes("must be"))) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to create assignment" });
    }
});

router.get("/assignments/:assignmentId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const assignmentIdParam = req.params.assignmentId;
    const assignmentId = parseInt(assignmentIdParam);

    if (isNaN(assignmentId)) {
        return res.status(400).json({ error: "Invalid assignment ID." });
    }

    try {
        const [assignment] = await db.select()
                                   .from(courseAssignments)
                                   .where(eq(courseAssignments.id, assignmentId))
                                   .limit(1);

        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found." });
        }
        res.status(200).json(assignment);
    } catch (error) {
        console.error(`Failed to fetch assignment ${assignmentId}:`, error);
        res.status(500).json({ error: "Failed to fetch assignment" });
    }
});

router.put("/assignments/:assignmentId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const assignmentIdParam = req.params.assignmentId;
    const assignmentId = parseInt(assignmentIdParam);

    if (isNaN(assignmentId)) {
        return res.status(400).json({ error: "Invalid assignment ID." });
    }

    const { title, description, submissionTypes, dueDate, pointsPossible, config } = req.body;
    const updateData: { [key: string]: any } = {};

    if (title !== undefined) {
        if (typeof title !== 'string' || title.trim() === '') {
            return res.status(400).json({ error: "Title must be a non-empty string." });
        }
        updateData.title = title;
    }
    if (description !== undefined) updateData.description = description;

    if (submissionTypes !== undefined) {
        if (!Array.isArray(submissionTypes) || submissionTypes.length === 0 || !submissionTypes.every(st => typeof st === 'string')) {
            return res.status(400).json({ error: "submissionTypes must be a non-empty array of strings." });
        }
        updateData.submissionTypes = submissionTypes;
    }
    if (dueDate !== undefined) {
        if (dueDate === null) {
            updateData.dueDate = null;
        } else if (isNaN(new Date(dueDate).getTime())) {
            return res.status(400).json({ error: "Invalid dueDate format." });
        } else {
            updateData.dueDate = new Date(dueDate);
        }
    }
    if (pointsPossible !== undefined) {
         if (pointsPossible === null) {
            updateData.pointsPossible = null;
        } else if (typeof pointsPossible !== 'number') {
            return res.status(400).json({ error: "pointsPossible must be a number or null." });
        } else {
            updateData.pointsPossible = pointsPossible;
        }
    }
    if (config !== undefined) {
        if (config !== null && typeof config !== 'object') {
            return res.status(400).json({ error: "config must be an object or null." });
        }
        updateData.config = config; // Allow null or object
    }

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields provided for update." });
    }
    updateData.updatedAt = new Date();

    try {
        const [updatedAssignment] = await db.update(courseAssignments)
                                          .set(updateData)
                                          .where(eq(courseAssignments.id, assignmentId))
                                          .returning();

        if (!updatedAssignment) {
            return res.status(404).json({ error: "Assignment not found or no changes made." });
        }
        res.status(200).json(updatedAssignment);
    } catch (error) {
        console.error(`Failed to update assignment ${assignmentId}:`, error);
        if (error instanceof Error && (error.message.includes("must be") || error.message.includes("Invalid"))) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to update assignment" });
    }
});

router.delete("/assignments/:assignmentId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const assignmentIdParam = req.params.assignmentId;
    const assignmentId = parseInt(assignmentIdParam);

    if (isNaN(assignmentId)) {
        return res.status(400).json({ error: "Invalid assignment ID." });
    }

    try {
        const result = await db.delete(courseAssignments)
                               .where(eq(courseAssignments.id, assignmentId))
                               .returning({ id: courseAssignments.id });

        if (result.length === 0) {
            return res.status(404).json({ error: "Assignment not found." });
        }
        res.status(204).send();
    } catch (error) {
        console.error(`Failed to delete assignment ${assignmentId}:`, error);
        res.status(500).json({ error: "Failed to delete assignment" });
    }
});

// Assignment Submissions
router.post("/assignments/:assignmentId/submissions", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const assignmentIdParam = req.params.assignmentId;
    const assignmentId = parseInt(assignmentIdParam);

    if (isNaN(assignmentId)) {
        return res.status(400).json({ error: "Invalid assignment ID." });
    }

    try {
        const [assignment] = await db.select({
                                        id: courseAssignments.id,
                                        submissionTypes: courseAssignments.submissionTypes,
                                        dueDate: courseAssignments.dueDate
                                    })
                                    .from(courseAssignments)
                                    .where(eq(courseAssignments.id, assignmentId))
                                    .limit(1);

        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found." });
        }

        const { content, submittedFiles } = req.body;
        let submissionContent = content;
        let submissionFilesData = submittedFiles;

        const allowedTypes = Array.isArray(assignment.submissionTypes) ? assignment.submissionTypes : [];
        let isValidSubmission = false;
        let providedSubmissionTypeCount = 0;

        if (allowedTypes.includes('online_text')) {
            if (submissionContent) {
                if (typeof submissionContent !== 'object' || submissionContent === null || !Array.isArray(submissionContent.blocks)) {
                    return res.status(400).json({ error: "Invalid rich content structure for 'online_text' submission. Expected { blocks: [] }." });
                }
                isValidSubmission = true;
                providedSubmissionTypeCount++;
            }
        } else {
             submissionContent = undefined;
        }

        if (allowedTypes.includes('file')) {
            if (submissionFilesData) {
                if (!Array.isArray(submissionFilesData)) {
                     return res.status(400).json({ error: "'submittedFiles' must be an array." });
                }
                for (const file of submissionFilesData) {
                    if (!file.fileName || !file.filePath || !file.size || !file.type) {
                        return res.status(400).json({ error: "Each submitted file must have fileName, filePath, size, and type." });
                    }
                }
                isValidSubmission = true;
                providedSubmissionTypeCount++;
            }
        } else {
            submissionFilesData = undefined;
        }

        if (!isValidSubmission && allowedTypes.length > 0) { // No data provided for any allowed type
             return res.status(400).json({ error: `No submission data provided for allowed types: ${allowedTypes.join(', ')}.` });
        }
        // If multiple types are allowed, but only one is provided, it's fine.
        // If specific types are *required* (e.g. BOTH online_text AND file), this logic would need enhancement.
        // Current logic: if AT LEAST ONE of the allowed types is fulfilled by provided data.

        let submissionStatus = 'submitted';
        if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
            submissionStatus = 'late';
        }

        const submissionData = {
            assignmentId,
            userId: req.user!.id,
            submissionDate: new Date(),
            content: submissionContent, // Will be null if not allowed or not provided
            submittedFiles: submissionFilesData, // Will be null if not allowed or not provided
            status: submissionStatus,
        };

        const [newSubmission] = await db.insert(assignmentSubmissions).values(submissionData).returning();
        res.status(201).json(newSubmission);

    } catch (error) {
        console.error(`Failed to create submission for assignment ${assignmentId}:`, error);
        if (error instanceof Error && (error.message.includes("required") || error.message.includes("Invalid") || error.message.includes("must be"))) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to create submission" });
    }
});

router.get("/assignments/:assignmentId/submissions", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const assignmentIdParam = req.params.assignmentId;
    const assignmentId = parseInt(assignmentIdParam);

    if (isNaN(assignmentId)) {
        return res.status(400).json({ error: "Invalid assignment ID." });
    }

    try {
        const [assignmentExists] = await db.select({ id: courseAssignments.id })
                                         .from(courseAssignments)
                                         .where(eq(courseAssignments.id, assignmentId))
                                         .limit(1);
        if (!assignmentExists) {
            return res.status(404).json({ error: "Parent assignment not found." });
        }

        const submissions = await db.query.assignmentSubmissions.findMany({
            where: eq(assignmentSubmissions.assignmentId, assignmentId),
            with: {
                user: {
                    columns: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        observerId: true,
                    }
                }
            }
            // Consider adding orderBy: desc(assignmentSubmissions.submissionDate)
        });
        res.status(200).json(submissions);
    } catch (error) {
        console.error(`Failed to fetch submissions for assignment ${assignmentId}:`, error);
        res.status(500).json({ error: "Failed to fetch submissions" });
    }
});

router.get("/submissions/:submissionId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const submissionIdParam = req.params.submissionId;
    const submissionId = parseInt(submissionIdParam);

    if (isNaN(submissionId)) {
        return res.status(400).json({ error: "Invalid submission ID." });
    }

    try {
        const submission = await db.query.assignmentSubmissions.findFirst({
            where: eq(assignmentSubmissions.id, submissionId),
            with: {
                user: { columns: { id: true, firstName: true, lastName: true, observerId: true } },
                assignment: { columns: { title: true, pointsPossible: true } }
            }
        });

        if (!submission) {
            return res.status(404).json({ error: "Submission not found." });
        }

        const isAdminOrCoordinator = req.user!.role === 'admin' || req.user!.role === 'coordinator';
        const isOwner = req.user!.id === submission.userId;

        if (!isAdminOrCoordinator && !isOwner) {
            return res.status(403).json({ error: "Forbidden: You do not have permission to view this submission." });
        }

        res.status(200).json(submission);
    } catch (error) {
        console.error(`Failed to fetch submission ${submissionId}:`, error);
        res.status(500).json({ error: "Failed to fetch submission" });
    }
});

router.put("/submissions/:submissionId/grade", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    if (req.user!.role !== 'admin' && req.user!.role !== 'coordinator') {
        return res.status(403).json({ error: "Forbidden: Insufficient privileges to grade submissions." });
    }

    const submissionIdParam = req.params.submissionId;
    const submissionId = parseInt(submissionIdParam);

    if (isNaN(submissionId)) {
        return res.status(400).json({ error: "Invalid submission ID." });
    }

    const { grade, graderFeedback } = req.body;

    if (typeof grade !== 'number') {
        return res.status(400).json({ error: "Grade must be a number." });
    }
    if (graderFeedback !== undefined && typeof graderFeedback !== 'string') {
        return res.status(400).json({ error: "Grader feedback must be a string if provided." });
    }

    try {
        const updateData = {
            grade,
            graderFeedback: graderFeedback || null,
            gradedDate: new Date(),
            status: 'graded',
            updatedAt: new Date()
        };

        const [updatedSubmission] = await db.update(assignmentSubmissions)
                                          .set(updateData)
                                          .where(eq(assignmentSubmissions.id, submissionId))
                                          .returning();

        if (!updatedSubmission) {
            return res.status(404).json({ error: "Submission not found." });
        }

        res.status(200).json(updatedSubmission);
    } catch (error) {
        console.error(`Failed to grade submission ${submissionId}:`, error);
        if (error instanceof Error && (error.message.includes("must be a number") || error.message.includes("must be a string"))) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to grade submission" });
    }
});


// Quizzes (general routes)
// ... (rest of the file)

export default router;
