const { db } = require('./server/db');
const { certificateTemplates } = require('./shared/schema');
const { sql } = require('drizzle-orm');

/**
 * Certificate Template Setup Script
 * 
 * This script:
 * 1. Creates the certificate_templates table if it doesn't exist
 * 2. Inserts default professional certificate templates
 * 3. Sets up the system for AI-powered template management
 */

// Default template configurations
const defaultTemplates = [
  {
    name: "Professional Blue",
    description: "Clean, professional certificate with blue color scheme",
    templateType: "professional",
    templateData: {
      layout: {
        width: 800,
        height: 600,
        orientation: "landscape",
        margins: { top: 50, right: 50, bottom: 50, left: 50 }
      },
      header: {
        organizationName: "Electoral Commission Training Center",
        logo: { position: "top-left", size: "medium" },
        title: "Certificate of Completion",
        titleFont: { family: "Arial", size: 28, weight: "bold" },
        titleColor: "#2c3e50"
      },
      body: {
        recipientSection: {
          prefix: "This certifies that",
          nameFont: { family: "Arial", size: 22, weight: "bold" },
          nameColor: "#34495e",
          nameUnderline: true
        },
        courseSection: {
          prefix: "has successfully completed the course",
          courseFont: { family: "Arial", size: 18, weight: "normal" },
          courseColor: "#2c3e50"
        },
        detailsSection: {
          completionDate: { show: true, format: "MMMM DD, YYYY" },
          certificateId: { show: true, prefix: "Certificate ID: " },
          score: { show: true, prefix: "Final Score: ", suffix: "%" }
        }
      },
      footer: {
        signature: {
          show: true,
          position: "bottom-right",
          text: "Authorized Signature",
          signatureFont: { family: "Arial", size: 12, style: "italic" }
        },
        seal: {
          show: true,
          position: "bottom-left",
          text: "Official Seal"
        }
      },
      styling: {
        backgroundColor: "#ffffff",
        borderColor: "#2c3e50",
        borderWidth: 3,
        borderStyle: "solid",
        backgroundPattern: "none",
        colors: {
          primary: "#2c3e50",
          secondary: "#34495e",
          accent: "#3498db"
        }
      },
      fields: [
        { name: "recipientName", type: "text", required: true, placeholder: "Recipient Name" },
        { name: "courseName", type: "text", required: true, placeholder: "Course Name" },
        { name: "completionDate", type: "date", required: true, placeholder: "Completion Date" },
        { name: "certificateId", type: "text", required: true, placeholder: "Certificate ID" },
        { name: "score", type: "number", required: false, placeholder: "Score" }
      ]
    },
    isDefault: true,
    isActive: true,
    createdBy: 1
  },
  {
    name: "Elegant Gold",
    description: "Elegant certificate with gold accents and serif typography",
    templateType: "elegant",
    templateData: {
      layout: {
        width: 800,
        height: 600,
        orientation: "landscape",
        margins: { top: 50, right: 50, bottom: 50, left: 50 }
      },
      header: {
        organizationName: "Electoral Commission Training Center",
        logo: { position: "top-center", size: "large" },
        title: "Certificate of Achievement",
        titleFont: { family: "Times New Roman", size: 32, weight: "bold" },
        titleColor: "#d4af37"
      },
      body: {
        recipientSection: {
          prefix: "This is to certify that",
          nameFont: { family: "Times New Roman", size: 24, weight: "bold" },
          nameColor: "#8b4513",
          nameUnderline: true
        },
        courseSection: {
          prefix: "has successfully completed the comprehensive course",
          courseFont: { family: "Times New Roman", size: 20, weight: "italic" },
          courseColor: "#8b4513"
        },
        detailsSection: {
          completionDate: { show: true, format: "DD MMMM YYYY" },
          certificateId: { show: true, prefix: "Certificate No: " },
          score: { show: true, prefix: "Excellence Score: ", suffix: "%" }
        }
      },
      footer: {
        signature: {
          show: true,
          position: "bottom-right",
          text: "Director's Signature",
          signatureFont: { family: "Times New Roman", size: 14, style: "italic" }
        },
        seal: {
          show: true,
          position: "bottom-left",
          text: "Official Commission Seal"
        }
      },
      styling: {
        backgroundColor: "#fefefe",
        borderColor: "#d4af37",
        borderWidth: 4,
        borderStyle: "double",
        backgroundPattern: "watermark",
        colors: {
          primary: "#d4af37",
          secondary: "#8b4513",
          accent: "#cd853f"
        }
      },
      fields: [
        { name: "recipientName", type: "text", required: true, placeholder: "Recipient Name" },
        { name: "courseName", type: "text", required: true, placeholder: "Course Name" },
        { name: "completionDate", type: "date", required: true, placeholder: "Completion Date" },
        { name: "certificateId", type: "text", required: true, placeholder: "Certificate ID" },
        { name: "score", type: "number", required: false, placeholder: "Score" }
      ]
    },
    isDefault: false,
    isActive: true,
    createdBy: 1
  },
  {
    name: "Modern Minimal",
    description: "Clean, modern certificate with minimal design elements",
    templateType: "minimal",
    templateData: {
      layout: {
        width: 800,
        height: 600,
        orientation: "landscape",
        margins: { top: 60, right: 60, bottom: 60, left: 60 }
      },
      header: {
        organizationName: "ECTC",
        logo: { position: "top-left", size: "small" },
        title: "Certificate",
        titleFont: { family: "Helvetica", size: 36, weight: "light" },
        titleColor: "#2c3e50"
      },
      body: {
        recipientSection: {
          prefix: "",
          nameFont: { family: "Helvetica", size: 28, weight: "bold" },
          nameColor: "#2c3e50",
          nameUnderline: false
        },
        courseSection: {
          prefix: "completed",
          courseFont: { family: "Helvetica", size: 18, weight: "normal" },
          courseColor: "#7f8c8d"
        },
        detailsSection: {
          completionDate: { show: true, format: "MM/DD/YYYY" },
          certificateId: { show: false },
          score: { show: false }
        }
      },
      footer: {
        signature: {
          show: false
        },
        seal: {
          show: false
        }
      },
      styling: {
        backgroundColor: "#ffffff",
        borderColor: "#ecf0f1",
        borderWidth: 1,
        borderStyle: "solid",
        backgroundPattern: "none",
        colors: {
          primary: "#2c3e50",
          secondary: "#7f8c8d",
          accent: "#3498db"
        }
      },
      fields: [
        { name: "recipientName", type: "text", required: true, placeholder: "Recipient Name" },
        { name: "courseName", type: "text", required: true, placeholder: "Course Name" },
        { name: "completionDate", type: "date", required: true, placeholder: "Completion Date" }
      ]
    },
    isDefault: false,
    isActive: true,
    createdBy: 1
  }
];

async function setupCertificateTemplates() {
  try {
    console.log('🎨 Setting up Certificate Template Management System...');

    // Check if table exists and create if not
    console.log('📋 Checking certificate_templates table...');
    
    try {
      // Try to select from the table to see if it exists
      await db.select().from(certificateTemplates).limit(1);
      console.log('✅ certificate_templates table already exists');
    } catch (error) {
      // Table doesn't exist, create it
      console.log('🔧 Creating certificate_templates table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS certificate_templates (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          template_type TEXT NOT NULL DEFAULT 'basic',
          template_data JSON NOT NULL,
          is_default BOOLEAN NOT NULL DEFAULT false,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_by INTEGER NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log('✅ certificate_templates table created');
    }

    // Check if we already have templates
    const existingTemplates = await db.select().from(certificateTemplates);
    
    if (existingTemplates.length > 0) {
      console.log(`📄 Found ${existingTemplates.length} existing templates`);
      console.log('💡 Tip: Use the admin interface to manage templates or delete existing ones first');
      return;
    }

    console.log('📝 Inserting default certificate templates...');

    // Insert default templates
    for (const template of defaultTemplates) {
      await db.insert(certificateTemplates).values(template);
      console.log(`  ✓ Added template: ${template.name}`);
    }

    console.log('\n🎉 Certificate Template Management System setup complete!');
    console.log('\n📋 Available features:');
    console.log('  • AI-powered template generation');
    console.log('  • Template editing with AI assistance');
    console.log('  • Template improvement suggestions');
    console.log('  • Generate template variations');
    console.log('  • Visual template editor');
    console.log('  • Professional PDF certificate generation');
    
    console.log('\n🔗 Access points:');
    console.log('  • Admin Dashboard: /admin/certificate-templates');
    console.log('  • API Endpoints: /api/certificate-templates/*');
    console.log('  • Certificate Download: /api/training/certificate/:id?templateId=X');

    console.log('\n🚀 Ready to create stunning certificates with AI!');

  } catch (error) {
    console.error('❌ Error setting up certificate templates:', error);
    throw error;
  }
}

// Run setup if called directly
if (require.main === module) {
  setupCertificateTemplates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupCertificateTemplates, defaultTemplates }; 