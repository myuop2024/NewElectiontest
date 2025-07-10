import { db } from '../db.js';
import { 
  googleClassroomTokens, 
  trainingCompletions, 
  certificates, 
  classroomProgress, 
  trainingAnalytics,
  users
} from '../../shared/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import { GoogleClassroomService } from './google-classroom-service.js';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import QRCode from 'qrcode';

interface ClassroomAssignment {
  id: string;
  title: string;
  dueDate?: { seconds: string };
  points?: number;
  state: string;
  submissionState?: string;
  assignedGrade?: number;
  draftGrade?: number;
}

interface CourseCompletion {
  courseId: string;
  courseName: string;
  totalAssignments: number;
  completedAssignments: number;
  averageGrade: number;
  completionDate: Date;
  competencyLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  skillsAcquired: string[];
}

export class TrainingAnalyticsService {
  private classroomService: GoogleClassroomService;

  constructor() {
    this.classroomService = new GoogleClassroomService();
  }

  /**
   * Sync user's Google Classroom progress and analyze completion status
   */
  async syncUserProgress(userId: number): Promise<void> {
    try {
      // Get user's Google Classroom tokens
      const tokenRecord = await db.select().from(googleClassroomTokens)
        .where(eq(googleClassroomTokens.userId, userId))
        .limit(1);

      if (!tokenRecord[0]) {
        throw new Error('Google Classroom not connected');
      }

      const tokens = {
        access_token: tokenRecord[0].accessToken,
        refresh_token: tokenRecord[0].refreshToken,
        token_type: tokenRecord[0].tokenType,
        expiry_date: tokenRecord[0].expiryDate?.getTime()
      };

      // Get user's courses from Google Classroom
      const courses = await this.classroomService.getCourses(tokens);
      
      // Process each course for completion analysis
      for (const course of courses) {
        await this.analyzeCourseCompletion(userId, course, tokens);
      }

      // Generate overall analytics
      await this.generateUserAnalytics(userId);

    } catch (error) {
      console.error('Error syncing user progress:', error);
      throw error;
    }
  }

  /**
   * Analyze individual course completion and generate certificates
   */
  private async analyzeCourseCompletion(userId: number, course: any, tokens: any): Promise<void> {
    try {
      // Get coursework for the course
      const coursework = await this.classroomService.getCoursework(course.id, tokens);
      
      let totalAssignments = coursework.length;
      let completedAssignments = 0;
      let totalGrade = 0;
      let gradedAssignments = 0;

      // Analyze each assignment
      for (const assignment of coursework) {
        const submission = await this.classroomService.getSubmissions(course.id, assignment.id, tokens);
        
        if (submission && submission.length > 0) {
          const userSubmission = submission.find((s: any) => s.userId === userId.toString());
          
          if (userSubmission) {
            // Update progress tracking
            await this.updateProgressTracking(userId, course.id, assignment, userSubmission);
            
            if (userSubmission.state === 'RETURNED' || userSubmission.state === 'TURNED_IN') {
              completedAssignments++;
              
              if (userSubmission.assignedGrade !== undefined) {
                totalGrade += userSubmission.assignedGrade;
                gradedAssignments++;
              }
            }
          }
        }
      }

      // Calculate completion percentage and average grade
      const completionPercentage = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;
      const averageGrade = gradedAssignments > 0 ? totalGrade / gradedAssignments : 0;
      
      // Check if course is completed (80% completion threshold)
      if (completionPercentage >= 80) {
        await this.markCourseCompleted(userId, course, {
          totalAssignments,
          completedAssignments,
          averageGrade,
          completionPercentage
        });
      }

    } catch (error) {
      console.error(`Error analyzing course ${course.id}:`, error);
    }
  }

  /**
   * Update real-time progress tracking
   */
  private async updateProgressTracking(userId: number, courseId: string, assignment: any, submission: any): Promise<void> {
    const progressData = {
      userId,
      classroomCourseId: courseId,
      assignmentId: assignment.id,
      progressType: submission.state === 'TURNED_IN' ? 'assignment_submitted' : 'assignment_graded',
      progressValue: submission.assignedGrade || 0,
      details: {
        assignmentTitle: assignment.title,
        submissionState: submission.state,
        grade: submission.assignedGrade,
        draftGrade: submission.draftGrade,
        submissionDate: submission.updateTime
      },
      lastSyncDate: new Date()
    };

    await db.insert(classroomProgress).values(progressData)
      .onConflictDoUpdate({
        target: [classroomProgress.userId, classroomProgress.classroomCourseId, classroomProgress.assignmentId],
        set: {
          progressValue: progressData.progressValue,
          details: progressData.details,
          lastSyncDate: progressData.lastSyncDate
        }
      });
  }

  /**
   * Mark course as completed and generate certificate
   */
  private async markCourseCompleted(userId: number, course: any, completionData: any): Promise<void> {
    const completionDate = new Date();
    
    // Determine competency level based on grade
    let competencyLevel: string;
    if (completionData.averageGrade >= 90) competencyLevel = 'expert';
    else if (completionData.averageGrade >= 80) competencyLevel = 'advanced';
    else if (completionData.averageGrade >= 70) competencyLevel = 'intermediate';
    else competencyLevel = 'basic';

    // Skills acquired based on course content (this could be enhanced with AI analysis)
    const skillsAcquired = [
      'Electoral Observation Principles',
      'Field Reporting Techniques',
      'Digital Documentation',
      'Incident Analysis',
      'Stakeholder Communication'
    ];

    // Check if completion already exists
    const existingCompletion = await db.select().from(trainingCompletions)
      .where(and(
        eq(trainingCompletions.userId, userId),
        eq(trainingCompletions.classroomCourseId, course.id)
      ))
      .limit(1);

    if (!existingCompletion[0]) {
      // Create training completion record
      const certificateNumber = `CAFFE-${Date.now()}-${nanoid(8).toUpperCase()}`;
      
      const completion = await db.insert(trainingCompletions).values({
        userId,
        classroomCourseId: course.id,
        courseName: course.name,
        completionDate,
        finalGrade: completionData.averageGrade,
        totalAssignments: completionData.totalAssignments,
        completedAssignments: completionData.completedAssignments,
        submissionQuality: this.determineSubmissionQuality(completionData.averageGrade),
        certificateGenerated: false,
        certificateNumber,
        competencyLevel,
        skillsAcquired,
        instructorNotes: `Course completed with ${completionData.completionPercentage.toFixed(1)}% completion rate`
      }).returning();

      // Generate digital certificate
      if (completion[0]) {
        await this.generateCertificate(userId, completion[0]);
      }
    }
  }

  /**
   * Generate digital certificate with QR verification
   */
  async generateCertificate(userId: number, completion: any): Promise<string> {
    try {
      // Get user information
      const user = await db.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user[0]) {
        throw new Error('User not found');
      }

      const certificateData = {
        certificateNumber: completion.certificateNumber,
        recipientName: `${user[0].firstName} ${user[0].lastName}`,
        courseName: completion.courseName,
        completionDate: completion.completionDate,
        grade: completion.finalGrade,
        competencyLevel: completion.competencyLevel,
        skillsAcquired: completion.skillsAcquired,
        observerId: user[0].observerId
      };

      // Generate verification hash
      const verificationHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(certificateData))
        .digest('hex');

      // Generate QR code data for verification
      const qrData = `https://caffe.org.jm/verify/${completion.certificateNumber}?hash=${verificationHash}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrData);

      // Create certificate record
      const certificate = await db.insert(certificates).values({
        userId,
        trainingCompletionId: completion.id,
        certificateNumber: completion.certificateNumber,
        certificateType: 'course_completion',
        title: `Electoral Observer Training Certificate`,
        description: `This certifies that ${certificateData.recipientName} has successfully completed the ${completion.courseName} training program`,
        issueDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
        verificationHash,
        qrCodeData: qrCodeDataUrl,
        certificateTemplate: 'standard_completion',
        metadata: certificateData,
        isActive: true
      }).returning();

      // Update completion record
      await db.update(trainingCompletions)
        .set({ certificateGenerated: true })
        .where(eq(trainingCompletions.id, completion.id));

      return certificate[0].certificateNumber;
    } catch (error) {
      console.error('Error generating certificate:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive user analytics
   */
  private async generateUserAnalytics(userId: number): Promise<void> {
    try {
      // Get all user completions
      const completions = await db.select().from(trainingCompletions)
        .where(eq(trainingCompletions.userId, userId));

      // Get all user progress entries
      const progressEntries = await db.select().from(classroomProgress)
        .where(eq(classroomProgress.userId, userId));

      // Calculate analytics
      const totalCoursesCompleted = completions.length;
      const averageGrade = completions.length > 0 
        ? completions.reduce((sum, c) => sum + (c.finalGrade || 0), 0) / completions.length 
        : 0;

      // Calculate competency score based on grades and completion rate
      const competencyScore = this.calculateCompetencyScore(completions, progressEntries);
      
      // Determine readiness level
      const readinessLevel = this.determineReadinessLevel(competencyScore, totalCoursesCompleted);

      // Generate recommendations
      const recommendedCourses = this.generateCourseRecommendations(completions);

      // Create analytics record
      await db.insert(trainingAnalytics).values({
        userId,
        analysisDate: new Date(),
        totalCoursesEnrolled: progressEntries.length,
        totalCoursesCompleted,
        averageGrade,
        totalStudyHours: this.estimateStudyHours(progressEntries),
        competencyScore,
        trainingEfficiency: this.calculateTrainingEfficiency(completions, progressEntries),
        strongAreas: this.identifyStrongAreas(completions),
        improvementAreas: this.identifyImprovementAreas(completions),
        recommendedCourses,
        readinessLevel
      }).onConflictDoUpdate({
        target: trainingAnalytics.userId,
        set: {
          analysisDate: new Date(),
          totalCoursesCompleted,
          averageGrade,
          competencyScore,
          readinessLevel,
          lastUpdated: new Date()
        }
      });

    } catch (error) {
      console.error('Error generating user analytics:', error);
      throw error;
    }
  }

  /**
   * Get user's training dashboard data
   */
  async getUserTrainingDashboard(userId: number): Promise<any> {
    try {
      // Get latest analytics
      const analytics = await db.select().from(trainingAnalytics)
        .where(eq(trainingAnalytics.userId, userId))
        .limit(1);

      // Get recent completions
      const recentCompletions = await db.select().from(trainingCompletions)
        .where(eq(trainingCompletions.userId, userId))
        .orderBy(desc(trainingCompletions.completionDate))
        .limit(5);

      // Get certificates
      const userCertificates = await db.select().from(certificates)
        .where(eq(certificates.userId, userId))
        .orderBy(desc(certificates.issueDate))
        .limit(10);

      // Get current progress
      const currentProgress = await db.select().from(classroomProgress)
        .where(eq(classroomProgress.userId, userId))
        .orderBy(desc(classroomProgress.lastSyncDate))
        .limit(10);

      return {
        analytics: analytics[0] || null,
        recentCompletions,
        certificates: userCertificates,
        currentProgress,
        summary: {
          coursesCompleted: recentCompletions.length,
          certificatesEarned: userCertificates.length,
          competencyLevel: analytics[0]?.competencyScore || 0,
          readinessStatus: analytics[0]?.readinessLevel || 'not_ready'
        }
      };
    } catch (error) {
      console.error('Error getting user dashboard:', error);
      throw error;
    }
  }

  /**
   * Get certificate verification data
   */
  async verifyCertificate(certificateNumber: string, hash?: string): Promise<any> {
    try {
      const certificate = await db.select().from(certificates)
        .where(eq(certificates.certificateNumber, certificateNumber))
        .limit(1);

      if (!certificate[0]) {
        return { valid: false, message: 'Certificate not found' };
      }

      if (!certificate[0].isActive) {
        return { valid: false, message: 'Certificate has been revoked' };
      }

      if (certificate[0].expiryDate && new Date() > certificate[0].expiryDate) {
        return { valid: false, message: 'Certificate has expired' };
      }

      if (hash && hash !== certificate[0].verificationHash) {
        return { valid: false, message: 'Invalid verification hash' };
      }

      // Increment download count
      await db.update(certificates)
        .set({ 
          downloadCount: certificate[0].downloadCount + 1,
          lastDownloaded: new Date()
        })
        .where(eq(certificates.id, certificate[0].id));

      return {
        valid: true,
        certificate: certificate[0],
        verificationDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error verifying certificate:', error);
      return { valid: false, message: 'Verification failed' };
    }
  }

  // Helper methods
  private determineSubmissionQuality(grade: number): string {
    if (grade >= 90) return 'excellent';
    if (grade >= 80) return 'good';
    if (grade >= 70) return 'satisfactory';
    return 'needs_improvement';
  }

  private calculateCompetencyScore(completions: any[], progressEntries: any[]): number {
    if (completions.length === 0) return 0;
    
    const avgGrade = completions.reduce((sum, c) => sum + (c.finalGrade || 0), 0) / completions.length;
    const completionRate = progressEntries.length > 0 ? (completions.length / progressEntries.length) * 100 : 0;
    
    return Math.min(100, (avgGrade * 0.7) + (completionRate * 0.3));
  }

  private determineReadinessLevel(competencyScore: number, coursesCompleted: number): string {
    if (competencyScore >= 85 && coursesCompleted >= 3) return 'expert_ready';
    if (competencyScore >= 75 && coursesCompleted >= 2) return 'field_ready';
    if (competencyScore >= 60 && coursesCompleted >= 1) return 'basic_ready';
    return 'not_ready';
  }

  private generateCourseRecommendations(completions: any[]): string[] {
    const recommendations = [
      'Advanced Incident Reporting',
      'Digital Evidence Collection',
      'Stakeholder Communication',
      'Emergency Response Protocols',
      'Data Analysis and Reporting'
    ];
    
    return recommendations.slice(0, 3); // Return top 3 recommendations
  }

  private estimateStudyHours(progressEntries: any[]): number {
    // Estimate 2 hours per assignment/activity
    return progressEntries.length * 2;
  }

  private calculateTrainingEfficiency(completions: any[], progressEntries: any[]): number {
    if (progressEntries.length === 0) return 0;
    return (completions.length / progressEntries.length) * 100;
  }

  private identifyStrongAreas(completions: any[]): string[] {
    // This could be enhanced with AI analysis of course content
    return ['Documentation', 'Field Observation', 'Reporting'];
  }

  private identifyImprovementAreas(completions: any[]): string[] {
    // This could be enhanced with AI analysis of grades and feedback
    return ['Time Management', 'Digital Tools', 'Communication'];
  }
}