export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'time' | 'file' | 'gps' | 'signature' | 'camera';
  label: string;
  placeholder?: string;
  required: boolean;
  validation: ValidationRule[];
  options?: FieldOption[];
  conditionalLogic?: ConditionalRule[];
  metadata: {
    description?: string;
    helpText?: string;
    maxLength?: number;
    minLength?: number;
    fileTypes?: string[];
    maxFileSize?: number;
  };
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  customValidator?: string;
}

export interface FieldOption {
  value: string;
  label: string;
  selected?: boolean;
  conditional?: ConditionalRule;
}

export interface ConditionalRule {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
  action: 'show' | 'hide' | 'require' | 'disable';
}

export interface DynamicForm {
  id: number;
  name: string;
  description: string;
  version: number;
  fields: FormField[];
  settings: FormSettings;
  permissions: FormPermission[];
  analytics: FormAnalytics;
}

export interface FormSettings {
  allowMultipleSubmissions: boolean;
  requireAuthentication: boolean;
  enableGeoLocation: boolean;
  enableFileUploads: boolean;
  autoSave: boolean;
  submitButtonText: string;
  successMessage: string;
  redirectUrl?: string;
  emailNotifications: EmailNotification[];
}

export interface FormPermission {
  userId: number;
  role: string;
  permissions: ('view' | 'edit' | 'submit' | 'admin')[];
}

export interface FormAnalytics {
  totalSubmissions: number;
  averageCompletionTime: number;
  abandonmentRate: number;
  fieldCompletionRates: Record<string, number>;
  popularTimeSlots: Record<string, number>;
}

export interface EmailNotification {
  trigger: 'submit' | 'daily_summary' | 'weekly_report';
  recipients: string[];
  template: string;
  enabled: boolean;
}

export class FormBuilderService {
  
  // Create dynamic form with drag-and-drop interface support
  static createDynamicForm(formData: Partial<DynamicForm>): DynamicForm {
    const defaultForm: DynamicForm = {
      id: 0,
      name: formData.name || 'Untitled Form',
      description: formData.description || '',
      version: 1,
      fields: formData.fields || [],
      settings: {
        allowMultipleSubmissions: false,
        requireAuthentication: true,
        enableGeoLocation: true,
        enableFileUploads: true,
        autoSave: true,
        submitButtonText: 'Submit Report',
        successMessage: 'Report submitted successfully',
        emailNotifications: []
      },
      permissions: formData.permissions || [],
      analytics: {
        totalSubmissions: 0,
        averageCompletionTime: 0,
        abandonmentRate: 0,
        fieldCompletionRates: {},
        popularTimeSlots: {}
      }
    };

    return { ...defaultForm, ...formData };
  }

  // Generate pre-built form templates
  static getFormTemplates() {
    return {
      incident_report: {
        name: 'Incident Report Form',
        description: 'Report security incidents or irregularities',
        fields: [
          {
            id: 'incident_type',
            type: 'select',
            label: 'Incident Type',
            required: true,
            validation: [{ type: 'required', message: 'Please select incident type' }],
            options: [
              { value: 'security_breach', label: 'Security Breach' },
              { value: 'equipment_failure', label: 'Equipment Failure' },
              { value: 'procedural_violation', label: 'Procedural Violation' },
              { value: 'other', label: 'Other' }
            ],
            metadata: {}
          },
          {
            id: 'description',
            type: 'textarea',
            label: 'Incident Description',
            required: true,
            validation: [
              { type: 'required', message: 'Description is required' },
              { type: 'minLength', value: 10, message: 'Description must be at least 10 characters' }
            ],
            metadata: {
              description: 'Provide detailed description of the incident'
            }
          },
          {
            id: 'location',
            type: 'gps',
            label: 'Incident Location',
            required: true,
            validation: [{ type: 'required', message: 'Location is required' }],
            metadata: {
              description: 'GPS coordinates of incident location'
            }
          },
          {
            id: 'evidence_photo',
            type: 'camera',
            label: 'Evidence Photo',
            required: false,
            validation: [],
            metadata: {
              description: 'Take photo evidence if safe to do so',
              fileTypes: ['image/jpeg', 'image/png'],
              maxFileSize: 5242880 // 5MB
            }
          },
          {
            id: 'severity',
            type: 'radio',
            label: 'Severity Level',
            required: true,
            validation: [{ type: 'required', message: 'Please select severity level' }],
            options: [
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' }
            ],
            metadata: {}
          }
        ]
      },
      
      polling_station_checklist: {
        name: 'Polling Station Setup Checklist',
        description: 'Verify polling station setup and readiness',
        fields: [
          {
            id: 'station_id',
            type: 'text',
            label: 'Station ID',
            required: true,
            validation: [
              { type: 'required', message: 'Station ID is required' },
              { type: 'pattern', value: '^PS[0-9]{4}$', message: 'Invalid station ID format' }
            ],
            metadata: {}
          },
          {
            id: 'setup_items',
            type: 'checkbox',
            label: 'Setup Items Verified',
            required: true,
            validation: [{ type: 'required', message: 'Please verify setup items' }],
            options: [
              { value: 'ballot_boxes', label: 'Ballot boxes sealed and secure' },
              { value: 'voting_booths', label: 'Voting booths properly positioned' },
              { value: 'accessibility', label: 'Accessibility provisions in place' },
              { value: 'signage', label: 'Proper signage displayed' },
              { value: 'lighting', label: 'Adequate lighting available' }
            ],
            metadata: {}
          },
          {
            id: 'staff_present',
            type: 'select',
            label: 'Staff Present',
            required: true,
            validation: [{ type: 'required', message: 'Please indicate staff presence' }],
            options: [
              { value: 'all_present', label: 'All staff present' },
              { value: 'partial', label: 'Some staff missing' },
              { value: 'none', label: 'No staff present' }
            ],
            metadata: {}
          }
        ]
      },

      observer_feedback: {
        name: 'Observer Feedback Form',
        description: 'Collect feedback from election observers',
        fields: [
          {
            id: 'observer_id',
            type: 'text',
            label: 'Observer ID',
            required: true,
            validation: [{ type: 'required', message: 'Observer ID is required' }],
            metadata: {}
          },
          {
            id: 'overall_rating',
            type: 'radio',
            label: 'Overall Process Rating',
            required: true,
            validation: [{ type: 'required', message: 'Please provide rating' }],
            options: [
              { value: '5', label: 'Excellent' },
              { value: '4', label: 'Good' },
              { value: '3', label: 'Fair' },
              { value: '2', label: 'Poor' },
              { value: '1', label: 'Very Poor' }
            ],
            metadata: {}
          },
          {
            id: 'improvements',
            type: 'textarea',
            label: 'Suggested Improvements',
            required: false,
            validation: [],
            metadata: {
              description: 'What improvements would you suggest for future elections?'
            }
          }
        ]
      }
    };
  }

  // Validate form submission with advanced rules
  static validateFormSubmission(form: DynamicForm, submissionData: Record<string, any>) {
    const errors: Record<string, string[]> = {};
    const warnings: string[] = [];

    for (const field of form.fields) {
      const value = submissionData[field.id];
      const fieldErrors: string[] = [];

      // Required field validation
      if (field.required && (!value || value === '')) {
        fieldErrors.push(`${field.label} is required`);
      }

      // Type-specific validation
      if (value && value !== '') {
        fieldErrors.push(...this.validateFieldType(field, value));
      }

      // Custom validation rules
      for (const rule of field.validation) {
        const validationError = this.validateRule(rule, value, field.label);
        if (validationError) {
          fieldErrors.push(validationError);
        }
      }

      // Conditional logic validation
      if (field.conditionalLogic) {
        const conditionalErrors = this.validateConditionalLogic(field, submissionData);
        fieldErrors.push(...conditionalErrors);
      }

      if (fieldErrors.length > 0) {
        errors[field.id] = fieldErrors;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }

  // Advanced conditional logic processing
  static processConditionalLogic(form: DynamicForm, submissionData: Record<string, any>) {
    const processedFields = form.fields.map(field => {
      if (!field.conditionalLogic) return field;

      const updatedField = { ...field };
      
      for (const rule of field.conditionalLogic) {
        const conditionMet = this.evaluateCondition(rule, submissionData);
        
        switch (rule.action) {
          case 'show':
            updatedField.metadata = { ...updatedField.metadata, visible: conditionMet };
            break;
          case 'hide':
            updatedField.metadata = { ...updatedField.metadata, visible: !conditionMet };
            break;
          case 'require':
            updatedField.required = conditionMet;
            break;
          case 'disable':
            updatedField.metadata = { ...updatedField.metadata, disabled: conditionMet };
            break;
        }
      }

      return updatedField;
    });

    return { ...form, fields: processedFields };
  }

  // Generate form analytics and insights
  static generateFormAnalytics(formId: number, submissions: any[]) {
    const analytics: FormAnalytics = {
      totalSubmissions: submissions.length,
      averageCompletionTime: 0,
      abandonmentRate: 0,
      fieldCompletionRates: {},
      popularTimeSlots: {}
    };

    if (submissions.length === 0) return analytics;

    // Calculate completion times
    const completionTimes = submissions
      .filter(s => s.completedAt && s.startedAt)
      .map(s => new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime());
    
    analytics.averageCompletionTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;

    // Calculate field completion rates
    const fieldCounts: Record<string, number> = {};
    submissions.forEach(submission => {
      Object.keys(submission.data || {}).forEach(fieldId => {
        fieldCounts[fieldId] = (fieldCounts[fieldId] || 0) + 1;
      });
    });

    Object.keys(fieldCounts).forEach(fieldId => {
      analytics.fieldCompletionRates[fieldId] = fieldCounts[fieldId] / submissions.length;
    });

    // Popular time slots
    const timeSlots: Record<string, number> = {};
    submissions.forEach(submission => {
      if (submission.submittedAt) {
        const hour = new Date(submission.submittedAt).getHours();
        const slot = `${hour}:00-${hour + 1}:00`;
        timeSlots[slot] = (timeSlots[slot] || 0) + 1;
      }
    });
    analytics.popularTimeSlots = timeSlots;

    return analytics;
  }

  private static validateFieldType(field: FormField, value: any): string[] {
    const errors: string[] = [];

    switch (field.type) {
      case 'text':
        if (typeof value !== 'string') {
          errors.push(`${field.label} must be text`);
        }
        break;
      
      case 'date':
        if (!this.isValidDate(value)) {
          errors.push(`${field.label} must be a valid date`);
        }
        break;
      
      case 'file':
        if (field.metadata.fileTypes && !field.metadata.fileTypes.includes(value.type)) {
          errors.push(`${field.label} must be one of: ${field.metadata.fileTypes.join(', ')}`);
        }
        if (field.metadata.maxFileSize && value.size > field.metadata.maxFileSize) {
          errors.push(`${field.label} file size exceeds maximum allowed`);
        }
        break;
    }

    return errors;
  }

  private static validateRule(rule: ValidationRule, value: any, fieldLabel: string): string | null {
    switch (rule.type) {
      case 'required':
        return (!value || value === '') ? rule.message : null;
      
      case 'minLength':
        return (value && value.length < rule.value) ? rule.message : null;
      
      case 'maxLength':
        return (value && value.length > rule.value) ? rule.message : null;
      
      case 'pattern':
        const regex = new RegExp(rule.value);
        return (value && !regex.test(value)) ? rule.message : null;
      
      case 'custom':
        // Custom validation would be implemented here
        return null;
      
      default:
        return null;
    }
  }

  private static validateConditionalLogic(field: FormField, submissionData: Record<string, any>): string[] {
    const errors: string[] = [];
    
    if (field.conditionalLogic) {
      for (const rule of field.conditionalLogic) {
        const conditionMet = this.evaluateCondition(rule, submissionData);
        
        if (rule.action === 'require' && conditionMet && !submissionData[field.id]) {
          errors.push(`${field.label} is required based on your previous answers`);
        }
      }
    }

    return errors;
  }

  private static evaluateCondition(rule: ConditionalRule, data: Record<string, any>): boolean {
    const fieldValue = data[rule.fieldId];
    
    switch (rule.operator) {
      case 'equals':
        return fieldValue === rule.value;
      case 'not_equals':
        return fieldValue !== rule.value;
      case 'contains':
        return fieldValue && fieldValue.includes(rule.value);
      case 'greater_than':
        return parseFloat(fieldValue) > parseFloat(rule.value);
      case 'less_than':
        return parseFloat(fieldValue) < parseFloat(rule.value);
      default:
        return false;
    }
  }

  private static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}