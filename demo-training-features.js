#!/usr/bin/env node

/**
 * Demo Script: World-Class Training Analytics Features
 * 
 * This script demonstrates the comprehensive training management system
 * with Google Classroom integration, automated certificate generation,
 * progress tracking, and advanced analytics.
 */

import { db } from './server/db.js';
import { 
  users, 
  trainingCompletions, 
  certificates, 
  classroomProgress, 
  trainingAnalytics,
  googleClassroomTokens 
} from './shared/schema.js';
import crypto from 'crypto';
import { nanoid } from 'nanoid';

console.log('🎓 CAFFE Training Analytics Demo - World-Class Features Showcase');
console.log('=' .repeat(70));

async function createDemoData() {
  try {
    console.log('\n📚 Creating demo training data...');

    // Get demo user (assuming user ID 13 exists)
    const demoUserId = 13;
    
    // Simulate Google Classroom OAuth token (demo purposes)
    console.log('🔐 Setting up Google Classroom integration...');
    await db.insert(googleClassroomTokens).values({
      userId: demoUserId,
      accessToken: 'demo_access_token_' + nanoid(),
      refreshToken: 'demo_refresh_token_' + nanoid(),
      tokenType: 'Bearer',
      expiryDate: new Date(Date.now() + 3600000), // 1 hour from now
      scope: 'https://www.googleapis.com/auth/classroom.courses.readonly'
    }).onConflictDoNothing();

    // Create sample training completions with realistic data
    const trainingCourses = [
      {
        courseName: 'Electoral Observer Fundamentals',
        finalGrade: 92.5,
        totalAssignments: 8,
        completedAssignments: 8,
        competencyLevel: 'expert',
        skillsAcquired: ['Electoral Law', 'Observer Ethics', 'Field Documentation', 'Incident Reporting'],
        instructorNotes: 'Outstanding performance with exceptional attention to detail'
      },
      {
        courseName: 'Digital Documentation and Evidence Collection',
        finalGrade: 87.0,
        totalAssignments: 6,
        completedAssignments: 6,
        competencyLevel: 'advanced',
        skillsAcquired: ['Digital Photography', 'Evidence Chain of Custody', 'Mobile Documentation Apps'],
        instructorNotes: 'Strong technical skills and professional approach'
      },
      {
        courseName: 'Incident Analysis and Reporting',
        finalGrade: 95.2,
        totalAssignments: 10,
        completedAssignments: 10,
        competencyLevel: 'expert',
        skillsAcquired: ['Incident Classification', 'Risk Assessment', 'Report Writing', 'Data Analysis'],
        instructorNotes: 'Exceptional analytical skills and clear communication'
      },
      {
        courseName: 'Stakeholder Communication',
        finalGrade: 81.5,
        totalAssignments: 5,
        completedAssignments: 5,
        competencyLevel: 'advanced',
        skillsAcquired: ['Public Speaking', 'Media Relations', 'Conflict Resolution'],
        instructorNotes: 'Good progress in communication skills development'
      }
    ];

    console.log('📈 Creating training completions and certificates...');
    
    for (const [index, course] of trainingCourses.entries()) {
      const completionDate = new Date(Date.now() - (trainingCourses.length - index) * 7 * 24 * 60 * 60 * 1000);
      const certificateNumber = `CAFFE-${Date.now()}-${nanoid(8).toUpperCase()}`;
      
      // Create training completion
      const completion = await db.insert(trainingCompletions).values({
        userId: demoUserId,
        classroomCourseId: `course_${index + 1}`,
        courseName: course.courseName,
        completionDate,
        finalGrade: course.finalGrade,
        totalAssignments: course.totalAssignments,
        completedAssignments: course.completedAssignments,
        submissionQuality: course.finalGrade >= 90 ? 'excellent' : course.finalGrade >= 80 ? 'good' : 'satisfactory',
        certificateGenerated: true,
        certificateNumber,
        competencyLevel: course.competencyLevel,
        skillsAcquired: course.skillsAcquired,
        instructorNotes: course.instructorNotes
      }).returning();

      // Generate certificate with blockchain-style verification
      const certificateData = {
        certificateNumber,
        courseName: course.courseName,
        completionDate,
        grade: course.finalGrade,
        competencyLevel: course.competencyLevel,
        skillsAcquired: course.skillsAcquired
      };

      const verificationHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(certificateData))
        .digest('hex');

      const qrData = `https://caffe.org.jm/verify/${certificateNumber}?hash=${verificationHash}`;

      await db.insert(certificates).values({
        userId: demoUserId,
        trainingCompletionId: completion[0].id,
        certificateNumber,
        certificateType: 'course_completion',
        title: `Electoral Observer Training Certificate - ${course.courseName}`,
        description: `This certifies successful completion of the ${course.courseName} training program with a grade of ${course.finalGrade}%`,
        issueDate: completionDate,
        expiryDate: new Date(completionDate.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
        verificationHash,
        qrCodeData: qrData,
        certificateTemplate: 'standard_completion',
        metadata: certificateData,
        isActive: true,
        downloadCount: Math.floor(Math.random() * 5)
      });

      console.log(`   ✅ ${course.courseName} - Grade: ${course.finalGrade}% - Certificate: ${certificateNumber}`);
    }

    // Create classroom progress entries
    console.log('📊 Creating detailed progress tracking...');
    const progressEntries = [
      { assignmentId: 'assign_1', progressType: 'assignment_submitted', progressValue: 95 },
      { assignmentId: 'assign_2', progressType: 'assignment_graded', progressValue: 88 },
      { assignmentId: 'assign_3', progressType: 'assignment_submitted', progressValue: 92 },
      { assignmentId: 'assign_4', progressType: 'course_milestone', progressValue: 100 },
    ];

    for (const progress of progressEntries) {
      await db.insert(classroomProgress).values({
        userId: demoUserId,
        classroomCourseId: 'course_current',
        assignmentId: progress.assignmentId,
        progressType: progress.progressType,
        progressValue: progress.progressValue,
        details: {
          assignmentTitle: `Assignment ${progress.assignmentId.split('_')[1]}`,
          submissionState: 'TURNED_IN',
          grade: progress.progressValue
        },
        lastSyncDate: new Date()
      });
    }

    // Generate comprehensive analytics
    console.log('🧠 Generating AI-powered analytics...');
    await db.insert(trainingAnalytics).values({
      userId: demoUserId,
      analysisDate: new Date(),
      totalCoursesEnrolled: 5,
      totalCoursesCompleted: 4,
      averageGrade: 89.05,
      totalStudyHours: 42.5,
      competencyScore: 91.2,
      trainingEfficiency: 95.8,
      strongAreas: ['Documentation', 'Analysis', 'Technical Skills', 'Report Writing'],
      improvementAreas: ['Public Speaking', 'Time Management'],
      recommendedCourses: ['Advanced Election Security', 'International Observer Standards', 'Crisis Management'],
      readinessLevel: 'expert_ready'
    }).onConflictDoNothing();

    console.log('\n🎯 Demo Data Creation Complete!');
    console.log('=' .repeat(70));
    
    // Display what was created
    console.log('\n📋 SUMMARY OF WORLD-CLASS FEATURES DEMONSTRATED:');
    console.log('');
    console.log('🏆 CERTIFICATE SYSTEM:');
    console.log('   • 4 Digital certificates with blockchain-style verification');
    console.log('   • Unique certificate numbers and cryptographic hashes');
    console.log('   • QR codes for instant verification');
    console.log('   • Expiry dates and download tracking');
    console.log('');
    console.log('📊 ANALYTICS & TRACKING:');
    console.log('   • Real-time progress monitoring');
    console.log('   • Competency scoring (91.2% - Expert Level)');
    console.log('   • Training efficiency metrics (95.8%)');
    console.log('   • AI-powered skill assessment');
    console.log('   • Personalized course recommendations');
    console.log('');
    console.log('🎓 COMPLETION TRACKING:');
    console.log('   • 4 completed courses with detailed grades');
    console.log('   • Skills acquired tracking');
    console.log('   • Instructor feedback and notes');
    console.log('   • Competency level classification');
    console.log('');
    console.log('🔄 GOOGLE CLASSROOM INTEGRATION:');
    console.log('   • OAuth 2.0 authentication setup');
    console.log('   • Assignment progress synchronization');
    console.log('   • Grade import and analysis');
    console.log('   • Automatic certificate generation');
    console.log('');
    console.log('🌟 READINESS STATUS: EXPERT READY');
    console.log('   User is qualified for advanced field deployment');
    console.log('');
    console.log('=' .repeat(70));
    console.log('🚀 ACCESS YOUR TRAINING DASHBOARD:');
    console.log('   • Training Analytics: /training-analytics');
    console.log('   • Certificate Verification: /verify-certificate');
    console.log('   • Google Classroom: /training-center');
    console.log('');
    console.log('✨ Features demonstrate enterprise-grade training management');
    console.log('   with automated workflows and comprehensive tracking!');
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('❌ Error creating demo data:', error);
    throw error;
  }
}

// Run the demo
createDemoData()
  .then(() => {
    console.log('\n🎉 Demo completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Demo failed:', error);
    process.exit(1);
  });