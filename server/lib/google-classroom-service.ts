import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleClassroomService {
  private oauth2Client: OAuth2Client;
  private classroom: any;

  constructor() {
    // Get the correct redirect URI for the current Replit environment
    const getRedirectUri = () => {
      if (process.env.REPLIT_DEV_DOMAIN) {
        return `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
      }
      // For development
      return 'http://localhost:5000/api/auth/google/callback';
    };

    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLASSROOM_CLIENT_ID,
      process.env.GOOGLE_CLASSROOM_CLIENT_SECRET,
      getRedirectUri()
    );

    this.classroom = google.classroom({ version: 'v1', auth: this.oauth2Client });
  }

  // Generate OAuth URL for user authentication
  getAuthUrl(userId: string) {
    const scopes = [
      'https://www.googleapis.com/auth/classroom.courses',
      'https://www.googleapis.com/auth/classroom.coursework.students',
      'https://www.googleapis.com/auth/classroom.rosters',
      'https://www.googleapis.com/auth/classroom.profile.emails',
      'https://www.googleapis.com/auth/classroom.profile.photos'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId.toString(), // Pass user ID in state
      prompt: 'consent'
    });
  }

  // Exchange authorization code for tokens
  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getAccessToken(code);
    return tokens;
  }

  // Set credentials for authenticated requests
  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens);
  }

  // Get user's Classroom courses
  async getCourses(tokens: any) {
    this.setCredentials(tokens);
    
    try {
      const response = await this.classroom.courses.list({
        courseStates: ['ACTIVE'],
        pageSize: 100
      });

      return response.data.courses || [];
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  }

  // Get course details
  async getCourse(courseId: string, tokens: any) {
    this.setCredentials(tokens);
    
    try {
      const response = await this.classroom.courses.get({
        id: courseId
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching course details:', error);
      throw error;
    }
  }

  // Get course assignments/coursework
  async getCourseWork(courseId: string, tokens: any) {
    this.setCredentials(tokens);
    
    try {
      const response = await this.classroom.courses.courseWork.list({
        courseId: courseId,
        pageSize: 100
      });

      return response.data.courseWork || [];
    } catch (error) {
      console.error('Error fetching coursework:', error);
      throw error;
    }
  }

  // Get student submissions for a course
  async getStudentSubmissions(courseId: string, courseWorkId: string, tokens: any) {
    this.setCredentials(tokens);
    
    try {
      const response = await this.classroom.courses.courseWork.studentSubmissions.list({
        courseId: courseId,
        courseWorkId: courseWorkId
      });

      return response.data.studentSubmissions || [];
    } catch (error) {
      console.error('Error fetching submissions:', error);
      throw error;
    }
  }

  // Create a new course (for admin/teacher users)
  async createCourse(courseData: any, tokens: any) {
    this.setCredentials(tokens);
    
    try {
      const response = await this.classroom.courses.create({
        requestBody: {
          name: courseData.name,
          description: courseData.description,
          section: courseData.section || 'Electoral Observer Training',
          ownerId: 'me',
          courseState: 'ACTIVE'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  }

  // Add coursework/assignment to a course
  async addCourseWork(courseId: string, workData: any, tokens: any) {
    this.setCredentials(tokens);
    
    try {
      const response = await this.classroom.courses.courseWork.create({
        courseId: courseId,
        requestBody: {
          title: workData.title,
          description: workData.description,
          materials: workData.materials || [],
          workType: workData.workType || 'ASSIGNMENT',
          state: 'PUBLISHED',
          maxPoints: workData.maxPoints || 100
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error adding coursework:', error);
      throw error;
    }
  }

  // Invite students to a course
  async inviteStudent(courseId: string, studentEmail: string, tokens: any) {
    this.setCredentials(tokens);
    
    try {
      const response = await this.classroom.invitations.create({
        requestBody: {
          courseId: courseId,
          userId: studentEmail,
          role: 'STUDENT'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error inviting student:', error);
      throw error;
    }
  }

  // Get user profile information
  async getUserProfile(tokens: any) {
    this.setCredentials(tokens);
    
    try {
      const response = await this.classroom.userProfiles.get({
        userId: 'me'
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Get course roster
  async getCourseStudents(courseId: string, tokens: any) {
    this.setCredentials(tokens);
    
    try {
      const response = await this.classroom.courses.students.list({
        courseId: courseId
      });

      return response.data.students || [];
    } catch (error) {
      console.error('Error fetching course students:', error);
      throw error;
    }
  }

  // Get course teachers
  async getCourseTeachers(courseId: string, tokens: any) {
    this.setCredentials(tokens);
    
    try {
      const response = await this.classroom.courses.teachers.list({
        courseId: courseId
      });

      return response.data.teachers || [];
    } catch (error) {
      console.error('Error fetching course teachers:', error);
      throw error;
    }
  }
}

export const classroomService = new GoogleClassroomService();