import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import { sendEmail } from '../services/emailService';

interface FieldDefinition {
  name: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'checkbox';
  required: boolean;
  label?: string;
}

// ==========================================
// CONTROLLER HANDLERS (ADMIN FORM CREATION)
// ==========================================

export const createForm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, fields, validations, webhookUrl } = req.body;

    if (!name || name.trim().length === 0) {
      return next(new AppError('Form identifier name is required.', 400));
    }

    const collision = await prisma.form.findUnique({ where: { name } });
    if (collision) {
      return next(new AppError('A form configuration with this name already exists.', 409));
    }

    // Verify fields is a valid stringified JSON array
    let parsedFields: FieldDefinition[];
    try {
      parsedFields = typeof fields === 'string' ? JSON.parse(fields) : fields;
      if (!Array.isArray(parsedFields)) throw new Error();
    } catch {
      return next(new AppError('Fields must be a valid JSON array of field configurations.', 400));
    }

    const form = await prisma.form.create({
      data: {
        name,
        description,
        fields: JSON.stringify(parsedFields),
        validations: validations ? JSON.stringify(validations) : null,
        webhookUrl: webhookUrl || null,
      },
    });

    logger.info(`Dynamic Form configuration created: ${form.name}`);

    res.status(201).json({
      status: 'success',
      data: { form },
    });
  } catch (error) {
    next(error);
  }
};

export const getForms = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const forms = await prisma.form.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    // Parse stringified JSON fields on response
    const parsedForms = forms.map((form) => ({
      ...form,
      fields: JSON.parse(form.fields),
      validations: form.validations ? JSON.parse(form.validations) : null,
    }));

    res.status(200).json({
      status: 'success',
      results: parsedForms.length,
      data: { forms: parsedForms },
    });
  } catch (error) {
    next(error);
  }
};

export const getFormById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const form = await prisma.form.findUnique({ where: { id } });
    if (!form) return next(new AppError('Form configuration not found.', 404));

    res.status(200).json({
      status: 'success',
      data: {
        form: {
          ...form,
          fields: JSON.parse(form.fields),
          validations: form.validations ? JSON.parse(form.validations) : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CLIENT GUEST HANDLER (DYNAMIC SUBMISSION)
// ==========================================

export const submitFormResponse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { formId } = req.params;
    const submissionData = req.body;

    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form || !form.active) {
      return next(new AppError('This form is either disabled or does not exist.', 404));
    }

    const fieldsSchema: FieldDefinition[] = JSON.parse(form.fields);
    const errors: string[] = [];

    // Dynamically validate submission data matches design schema specifications
    fieldsSchema.forEach((field) => {
      const val = submissionData[field.name];

      if (field.required && (val === undefined || val === null || val === '')) {
        errors.push(`Field "${field.label || field.name}" is required.`);
        return;
      }

      if (val !== undefined && val !== null && val !== '') {
        if (field.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(val))) {
            errors.push(`Field "${field.label || field.name}" must be a valid email.`);
          }
        } else if (field.type === 'number') {
          if (isNaN(Number(val))) {
            errors.push(`Field "${field.label || field.name}" must be a valid number.`);
          }
        }
      }
    });

    if (errors.length > 0) {
      res.status(422).json({
        status: 'fail',
        message: 'Form validation failed.',
        errors,
      });
      return;
    }

    // Save submission to DB as raw JSON
    const submission = await prisma.formSubmission.create({
      data: {
        formId,
        data: JSON.stringify(submissionData),
        ipAddress: req.ip || '0.0.0.0',
      },
    });

    logger.info(`New submission written to Dynamic Form: ${form.name}`);

    // Trigger Outward webhook if configured
    if (form.webhookUrl) {
      fetch(form.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formName: form.name,
          submissionId: submission.id,
          timestamp: submission.createdAt,
          payload: submissionData,
        }),
      }).catch((err) => logger.error(`Form Webhook dispatch failed for ${form.name}:`, err.message));
    }

    // Trigger SMTP Notification Copy
    const notificationEmail = process.env.SMTP_FROM_EMAIL || 'admin@portfolio.dev';
    const emailSubject = `[Form Submission] New Submission for ${form.name}`;
    let emailHtml = `
      <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 10px; color: #1e293b;">
        <h2 style="color: #4f46e5;">Dynamic Form Submission</h2>
        <p>A new visitor has submitted data on your custom-built form "<strong>${form.name}</strong>".</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
    `;

    for (const [key, val] of Object.entries(submissionData)) {
      emailHtml += `
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 150px; border-b: 1px solid #f1f5f9;">${key}:</td>
          <td style="padding: 8px 0; color: #334155; border-b: 1px solid #f1f5f9;">${val}</td>
        </tr>
      `;
    }

    emailHtml += `
        </table>
        <p style="font-size: 11px; color: #64748b; margin-top: 25px;">IP Address logged: ${submission.ipAddress}</p>
      </div>
    `;

    sendEmail(notificationEmail, emailSubject, emailHtml)
      .catch((err) => logger.error('Async form notification mail failure:', err));

    res.status(201).json({
      status: 'success',
      message: 'Form response successfully captured.',
      data: { submissionId: submission.id },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SUBMISSIONS EXPORTER (CSV EXCEL DOWNLOAD)
// ==========================================

export const exportSubmissionsCSV = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { formId } = req.params;

    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form) return next(new AppError('Target form not found.', 404));

    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
    });

    if (submissions.length === 0) {
      res.status(200).send('No submissions exist for this form.');
      return;
    }

    // Extract dynamic headers from defined form fields schema
    const fieldsSchema: FieldDefinition[] = JSON.parse(form.fields);
    const headers = ['ID', 'Submission IP', 'Created At', ...fieldsSchema.map((f) => f.name)];

    // Generate CSV Rows safely escaping nested commas
    const rows = submissions.map((sub) => {
      const payload = JSON.parse(sub.data);
      const values = fieldsSchema.map((f) => {
        const val = payload[f.name];
        if (val === undefined || val === null) return '""';
        
        // Escape standard double quotes inside cells
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      });

      return [
        `"${sub.id}"`,
        `"${sub.ipAddress}"`,
        `"${sub.createdAt.toISOString()}"`,
        ...values,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    // Attach headers to force binary excel spreadsheet download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="form_${form.name}_submissions.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
