import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleClassroomService {
  private oauth2Client: OAuth2Client;
  private classroom: any;

  constructor() {
    // Use proper redirect URI for current environment
    const getRedirectUri = () => {
      // Priority: Deployed domain > Custom domain > Dev domain > localhost
      if (process.env.REPLIT_URL) {
        return `${process.env.REPLIT_URL}/api/auth/google/callback`;
      }
      if (process.env.REPLIT_DOMAIN) {
        return `https://${process.env.REPLIT_DOMAIN}/api/auth/google/callback`;
      }
      if (process.env.REPLIT_DOMAINS) {
        const domains = process.env.REPLIT_DOMAINS.split(',');
        const customDomain = domains.find(d => !d.includes('.replit.dev'));
        if (customDomain) {
          return `https://${customDomain}/api/auth/google/callback`;
        }
        // Check for .replit.app deployment domain
        const deployDomain = domains.find(d => d.includes('.replit.app'));
        if (deployDomain) {
          return `https://${deployDomain}/api/auth/google/callback`;
        }
      }
      if (process.env.REPLIT_DEV_DOMAIN) {
        return `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
      }
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
    // Use more basic scopes to avoid 403 issues with unverified apps
    const scopes = [
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
      'https://www.googleapis.com/auth/classroom.rosters.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId.toString(),
      prompt: 'consent',
      include_granted_scopes: true
    });
  }

  // Exchange authorization code for tokens
  async getTokens(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
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

  // Create a new course
  async createCourse(courseData: any, tokens: any) {
    this.setCredentials(tokens);
    
    try {
      const response = await this.classroom.courses.create({
        requestBody: {
          name: courseData.name,
          description: courseData.description,
          section: courseData.section || 'Electoral Observer Training',
          room: courseData.room,
          courseState: 'ACTIVE'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  }

  // Get user profile
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

  // Get course students
  async getCourseStudents(courseId: string, tokens: any) {
    this.setCredentials(tokens);
    
    try {
      const response = await this.classroom.courses.students.list({
        courseId: courseId,
        pageSize: 100
      });

      return response.data.students || [];
    } catch (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
  }

  // Get course teachers
  async getCourseTeachers(courseId: string, tokens: any) {
    this.setCredentials(tokens);
    
    try {
      const response = await this.classroom.courses.teachers.list({
        courseId: courseId,
        pageSize: 100
      });

      return response.data.teachers || [];
    } catch (error) {
      console.error('Error fetching teachers:', error);
      throw error;
    }
  }
}

export const classroomService = new GoogleClassroomService();