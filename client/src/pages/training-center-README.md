# Training Center Overhaul

## User Features
- Browse, enroll, and complete training courses
- Track progress and download certificates
- Get AI-powered recommendations, quizzes, and feedback

## Admin Features
- Access the Admin Training Dashboard at `/admin-training`
- Create, edit, and delete courses and modules
- View analytics: total courses, modules, enrollments, completions
- Only users with the `admin` role can access admin features

### Admin Dashboard Usage
1. **Create Course:** Fill in the course form, add modules, and click "Create Course".
2. **Edit Course:** Click "Edit" on a course, update details or modules, and save changes.
3. **Delete Course:** Click "Delete" to remove a course.
4. **View Analytics:** See widgets at the top for course/module/enrollment/completion stats.

## API Endpoints
- See the backend code for full endpoint details. Example usage:
  - `GET /api/training/courses` — List all courses
  - `POST /api/training/courses` — Create course (admin)
  - `PUT /api/training/courses/:id` — Update course (admin)
  - `DELETE /api/training/courses/:id` — Delete course (admin)
  - `POST /api/training/enroll` — Enroll in a course
  - `GET /api/training/enrollments/my` — Get my enrollments
  - `POST /api/training/progress` — Update progress
  - `GET /api/training/certificate/:enrollmentId` — Download certificate
  - `GET /api/training/analytics` — Get analytics (admin)
  - AI endpoints: `/api/training/ai/recommendations`, `/api/training/ai/quiz`, `/api/training/ai/feedback`

## Accessibility & Testing
- All interactive elements have ARIA labels and keyboard navigation
- Color contrast and responsive design are tested for accessibility
- Manual and automated tests recommended for all user/admin flows

## Feedback Mechanism
- Add a feedback form or link in the UI for users/admins to report issues or suggest improvements
- Example: link to a Google Form or GitHub Issues

## Screenshots
- ![User View](./screenshots/user-view.png)
- ![Admin Dashboard](./screenshots/admin-dashboard.png)

## Developer/Contributor Guide
- Fork the repo and create feature branches for changes
- Use TypeScript and React best practices
- Document new endpoints and UI features
- Submit pull requests with clear descriptions

---
For questions or contributions, open an issue or pull request on GitHub.

## Certificate Generation
- Certificates are generated as PDFs for completed courses.
- Endpoint: `/api/training/certificate/:enrollmentId`
- (Planned) Uses a Node.js PDF library to generate on-demand.

## Extensibility
- Courses and modules support rich content (video, docs, quizzes).
- Progress tracking, scoring, and certificate eligibility logic.
- Admin endpoints for course management and analytics.

## Next Steps
- Implement logic for each endpoint.
- Add PDF certificate generation.
- Integrate frontend with real data and certificate download.

## Certificate Download Endpoint

### GET /api/training/certificate/:enrollmentId
- Returns a PDF certificate for a completed course enrollment.
- Requirements:
  - The enrollment must belong to the requesting user.
  - The enrollment status must be 'completed'.
- PDF includes: user name, course name, completion date, and certificate ID.
- Example request: `GET /api/training/certificate/123`
- Response: PDF file (Content-Type: application/pdf)

### Customizing the Certificate
- The certificate template is generated using [pdfkit](https://pdfkit.org/).
- To customize, edit the PDF generation logic in `server/routes.ts` under the `/api/training/certificate/:enrollmentId` endpoint.

## AI-Powered Endpoints (Gemini)

### Setup
- Add your Gemini API key to the settings table with key `gemini_api_key`.
- The backend will use this key to call Google Cloud Gemini for AI features.

### POST /api/training/ai/recommendations
- Request body: `{ userProfile: { ... } }`
- Response: `{ recommendations: string }` (AI-generated recommendations)

### POST /api/training/ai/quiz
- Request body: `{ module: { ... }, userHistory: { ... } }`
- Response: `{ quiz: string }` (AI-generated quiz/questions)

### POST /api/training/ai/feedback
- Request body: `{ progress: { ... } }`
- Response: `{ feedback: string }` (AI-generated feedback)

See `server/routes.ts` and `server/lib/training-service.ts` for implementation details. 