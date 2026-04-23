          updatedAt: new Date(),
        })
        .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, sessionUserId)))
        .returning();



      res.json({ alert: updated });
    } catch (error: any) {
      console.error("Update price alert error:", error);
      res.status(500).json({ message: error.message || "Failed to update price alert" });
    }
  });

  // DELETE /api/price-alerts/:id - Delete price alert
  app.delete("/api/price-alerts/:id", async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;

      // Verify ownership and delete
      const [deleted] = await db
        .delete(priceAlerts)
        .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, sessionUserId)))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Price alert not found" });
      }



      res.json({ message: "Price alert deleted successfully", alert: deleted });
    } catch (error: any) {
      console.error("Delete price alert error:", error);
      res.status(500).json({ message: error.message || "Failed to delete price alert" });
    }
  });



  // ============================================================================
  // DCA (Dollar Cost Averaging) AUTO-BUY ENDPOINTS
  // ============================================================================

  // GET /api/dca-plans - List user's DCA plans
  app.get("/api/dca-plans", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const plans = await db
        .select()
        .from(dcaPlans)
        .where(eq(dcaPlans.userId, sessionUserId))
        .orderBy(desc(dcaPlans.createdAt));



      res.json({ plans });
    } catch (error: any) {
      console.error("Get DCA plans error:", error);
      res.status(500).json({ message: error.message || "Failed to fetch DCA plans" });
    }
  });

  // POST /api/dca-plans - Create new DCA plan
  app.post("/api/dca-plans", ensureAuthenticated, checkMaintenanceMode, idempotencyMiddleware, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const createSchema = z.object({
        name: z.string().nullable().optional(),
        amountUsd: z.string().refine((val) => parseFloat(val) >= 1, { message: "Minimum amount is $1" }),
        frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]),
        dayOfWeek: z.number().min(0).max(6).nullable().optional(),
        dayOfMonth: z.number().min(1).max(31).nullable().optional(),
      });

      const validated = createSchema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validated.error.flatten().fieldErrors,
        });
      }

      const { name, amountUsd, frequency, dayOfWeek, dayOfMonth } = validated.data;

      // Calculate next run time based on frequency
      const now = new Date();
      let nextRunAt = new Date();

      switch (frequency) {
        case "daily":
          nextRunAt.setDate(nextRunAt.getDate() + 1);
          nextRunAt.setHours(9, 0, 0, 0); // 9 AM next day
          break;
        case "weekly":
          const targetDay = dayOfWeek ?? 1; // Monday by default
          const daysUntilTarget = (targetDay - now.getDay() + 7) % 7 || 7;
          nextRunAt.setDate(nextRunAt.getDate() + daysUntilTarget);
          nextRunAt.setHours(9, 0, 0, 0);
          break;
        case "biweekly":
          const biweeklyDay = dayOfWeek ?? 1;
          const daysUntilBiweekly = (biweeklyDay - now.getDay() + 7) % 7 || 7;
          nextRunAt.setDate(nextRunAt.getDate() + daysUntilBiweekly);
          nextRunAt.setHours(9, 0, 0, 0);
          break;
        case "monthly":
          const targetDate = dayOfMonth ?? 1;
          nextRunAt.setMonth(nextRunAt.getMonth() + 1);
          nextRunAt.setDate(Math.min(targetDate, new Date(nextRunAt.getFullYear(), nextRunAt.getMonth() + 1, 0).getDate()));
          nextRunAt.setHours(9, 0, 0, 0);
          break;
      }

      const [plan] = await db
        .insert(dcaPlans)
        .values({
          userId: sessionUserId,
          name: name || null,
          amountUsd,
          frequency,
          dayOfWeek: dayOfWeek ?? null,
          dayOfMonth: dayOfMonth ?? null,
          nextRunAt,
          status: "active",
        })
        .returning();

      // Create audit log
      await storage.createAuditLog({
        userId: sessionUserId,
        action: "dca_plan_created",
        details: { planId: plan.id, amountUsd, frequency },
      });

      res.status(201).json({ plan });
    } catch (error: any) {
      console.error("Create DCA plan error:", error);
      res.status(500).json({ message: error.message || "Failed to create DCA plan" });
    }
  });

  // PATCH /api/dca-plans/:id - Update DCA plan (including pause/resume)
  app.patch("/api/dca-plans/:id", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;

      // Verify ownership
      const [existing] = await db
        .select()
        .from(dcaPlans)
        .where(and(eq(dcaPlans.id, id), eq(dcaPlans.userId, sessionUserId)));

      if (!existing) {
        return res.status(404).json({ message: "DCA plan not found" });
      }

      const updateSchema = z.object({
        name: z.string().nullable().optional(),
        amountUsd: z.string().optional(),
        frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]).optional(),
        dayOfWeek: z.number().min(0).max(6).nullable().optional(),
        dayOfMonth: z.number().min(1).max(31).nullable().optional(),
        status: z.enum(["active", "paused", "cancelled"]).optional(),
      });

      const validated = updateSchema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validated.error.flatten().fieldErrors,
        });
      }

      const updates: Record<string, any> = { ...validated.data, updatedAt: new Date() };

      // If resuming from paused, recalculate next run time
      if (validated.data.status === "active" && existing.status === "paused") {
        const now = new Date();
        let nextRunAt = new Date();
        const frequency = validated.data.frequency || existing.frequency;
        const dayOfWeek = validated.data.dayOfWeek ?? existing.dayOfWeek;
        const dayOfMonth = validated.data.dayOfMonth ?? existing.dayOfMonth;

        switch (frequency) {
          case "daily":
            nextRunAt.setDate(nextRunAt.getDate() + 1);
            nextRunAt.setHours(9, 0, 0, 0);
            break;
          case "weekly":
          case "biweekly":
            const targetDay = dayOfWeek ?? 1;
            const daysUntilTarget = (targetDay - now.getDay() + 7) % 7 || 7;
            nextRunAt.setDate(nextRunAt.getDate() + daysUntilTarget);
            nextRunAt.setHours(9, 0, 0, 0);
            break;
          case "monthly":
            const targetDate = dayOfMonth ?? 1;
            nextRunAt.setMonth(nextRunAt.getMonth() + 1);
            nextRunAt.setDate(Math.min(targetDate, new Date(nextRunAt.getFullYear(), nextRunAt.getMonth() + 1, 0).getDate()));
            nextRunAt.setHours(9, 0, 0, 0);
            break;
        }
        updates.nextRunAt = nextRunAt;
      }

      const [updated] = await db
        .update(dcaPlans)
        .set(updates)
        .where(and(eq(dcaPlans.id, id), eq(dcaPlans.userId, sessionUserId)))
        .returning();

      // Create audit log for status changes
      if (validated.data.status) {
        await storage.createAuditLog({
          userId: sessionUserId,
          action: "dca_plan_updated",
          details: { planId: id, status: validated.data.status },
        });
      }



      res.json({ plan: updated });
    } catch (error: any) {
      console.error("Update DCA plan error:", error);
      res.status(500).json({ message: error.message || "Failed to update DCA plan" });
    }
  });

  // DELETE /api/dca-plans/:id - Cancel DCA plan
  app.delete("/api/dca-plans/:id", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;

      // Verify ownership
      const [existing] = await db
        .select()
        .from(dcaPlans)
        .where(and(eq(dcaPlans.id, id), eq(dcaPlans.userId, sessionUserId)));

      if (!existing) {
        return res.status(404).json({ message: "DCA plan not found" });
      }

      // Soft delete - mark as cancelled instead of hard delete
      const [cancelled] = await db
        .update(dcaPlans)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(and(eq(dcaPlans.id, id), eq(dcaPlans.userId, sessionUserId)))
        .returning();

      await storage.createAuditLog({
        userId: sessionUserId,
        action: "dca_plan_cancelled",
        details: { planId: id },
      });



      res.json({ message: "DCA plan cancelled successfully", plan: cancelled });
    } catch (error: any) {
      console.error("Cancel DCA plan error:", error);
      res.status(500).json({ message: error.message || "Failed to cancel DCA plan" });
    }
  });

  // GET /api/dca-plans/:id/executions - Get execution history for a plan
  app.get("/api/dca-plans/:id/executions", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const { limit = "50", offset = "0" } = req.query;

      // Verify plan ownership
      const [plan] = await db
        .select()
        .from(dcaPlans)
        .where(and(eq(dcaPlans.id, id), eq(dcaPlans.userId, sessionUserId)));

      if (!plan) {
        return res.status(404).json({ message: "DCA plan not found" });
      }

      const executions = await db
        .select()
        .from(dcaExecutions)
        .where(eq(dcaExecutions.planId, id))
        .orderBy(desc(dcaExecutions.scheduledAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(dcaExecutions)
        .where(eq(dcaExecutions.planId, id));



      res.json({ executions, total: count, plan });
    } catch (error: any) {
      console.error("Get DCA executions error:", error);
      res.status(500).json({ message: error.message || "Failed to fetch DCA executions" });
    }
  });



  // ============================================================================
  // REPORT EXPORT API ENDPOINTS
  // ============================================================================

  // GET /api/reports - List user's report exports with pagination
  app.get("/api/reports", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
      const offset = (page - 1) * limit;

      const reports = await db
        .select()
        .from(reportExports)
        .where(eq(reportExports.userId, sessionUserId))
        .orderBy(desc(reportExports.createdAt))
        .limit(limit)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(reportExports)
        .where(eq(reportExports.userId, sessionUserId));

      const total = Number(countResult?.count || 0);

      res.json({
        reports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("List reports error:", error);
      res.status(500).json({ message: error.message || "Failed to list reports" });
    }
  });

  // POST /api/reports/generate - Create a new report export request
  app.post("/api/reports/generate", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const schema = z.object({
        reportType: z.enum(['transaction_history', 'tax_report', 'portfolio_summary', 'vault_statement', 'bnsl_statement']),
        format: z.enum(['pdf', 'csv', 'xlsx']),
        dateFrom: z.string().nullable().optional(),
        dateTo: z.string().nullable().optional(),
        filters: z.record(z.unknown()).nullable().optional(),
      });

      const validated = schema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({ message: "Invalid request data", errors: validated.error.errors });
      }

      const { reportType, format, dateFrom, dateTo, filters } = validated.data;

      const [report] = await db
        .insert(reportExports)
        .values({
          userId: sessionUserId,
          reportType,
          format,
          status: 'pending',
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          filters: filters || null,
        })
        .returning();

      await storage.createAuditLog({
        userId: sessionUserId,
        action: "report_requested",
        details: { reportId: report.id, reportType, format },
      });

      res.status(201).json({ report });
    } catch (error: any) {
      console.error("Generate report error:", error);
      res.status(500).json({ message: error.message || "Failed to create report" });
    }
  });

  // GET /api/reports/:id - Get status of a specific report
  app.get("/api/reports/:id", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;

      const [report] = await db
        .select()
        .from(reportExports)
        .where(and(eq(reportExports.id, id), eq(reportExports.userId, sessionUserId)));

      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      res.json({ report });
    } catch (error: any) {
      console.error("Get report error:", error);
      res.status(500).json({ message: error.message || "Failed to get report" });
    }
  });

  // GET /api/reports/:id/download - Download the generated report file
  app.get("/api/reports/:id/download", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;

      const [report] = await db
        .select()
        .from(reportExports)
        .where(and(eq(reportExports.id, id), eq(reportExports.userId, sessionUserId)));

      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      if (report.status !== 'completed') {
        return res.status(400).json({ message: `Report is not ready. Status: ${report.status}` });
      }

      if (!report.fileUrl) {
        return res.status(400).json({ message: "Report file not available" });
      }

      const filePath = report.fileUrl;
      const fs = await import("fs");
      const path = await import("path");

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Report file not found on disk" });
      }

      const fileName = path.basename(filePath);
      const ext = path.extname(fileName).toLowerCase();
      
      const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.csv': 'text/csv',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      console.error("Download report error:", error);
      res.status(500).json({ message: error.message || "Failed to download report" });
    }
  });


  // ===========================================================================
  // User Bank Accounts (Payment Methods)
  // ===========================================================================
  
  app.get("/api/user/bank-accounts", ensureAuthenticated, async (req, res) => {
    try {
      const accounts = await storage.getUserBankAccounts(req.session.userId!);
      res.json(accounts);
    } catch (error: any) {
      console.error("Get bank accounts error:", error);
      res.status(500).json({ message: "Failed to retrieve bank accounts" });
    }
  });

  app.post("/api/user/bank-accounts", ensureAuthenticated, async (req, res) => {
    try {
      const account = await storage.createUserBankAccount({
        ...req.body,
        userId: req.session.userId!
      });
      res.status(201).json(account);
    } catch (error: any) {
      console.error("Create bank account error:", error);
      res.status(500).json({ message: "Failed to create bank account" });
    }
  });

  app.put("/api/user/bank-accounts/:id", ensureAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getUserBankAccount(id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      const updated = await storage.updateUserBankAccount(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Update bank account error:", error);
      res.status(500).json({ message: "Failed to update bank account" });
    }
  });

  app.delete("/api/user/bank-accounts/:id", ensureAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getUserBankAccount(id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      await storage.deleteUserBankAccount(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete bank account error:", error);
      res.status(500).json({ message: "Failed to delete bank account" });
    }
  });

  // ===========================================================================
  // User Crypto Wallets (Payment Methods)
  // ===========================================================================
  
  app.get("/api/user/crypto-wallets", ensureAuthenticated, async (req, res) => {
    try {
      const wallets = await storage.getUserCryptoWallets(req.session.userId!);
      res.json(wallets);
    } catch (error: any) {
      console.error("Get crypto wallets error:", error);
      res.status(500).json({ message: "Failed to retrieve crypto wallets" });
    }
  });

  app.post("/api/user/crypto-wallets", ensureAuthenticated, async (req, res) => {
    try {
      const wallet = await storage.createUserCryptoWallet({
        ...req.body,
        userId: req.session.userId!
      });
      res.status(201).json(wallet);
    } catch (error: any) {
      console.error("Create crypto wallet error:", error);
      res.status(500).json({ message: "Failed to create crypto wallet" });
    }
  });

  app.put("/api/user/crypto-wallets/:id", ensureAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getUserCryptoWallet(id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ message: "Crypto wallet not found" });
      }
      const updated = await storage.updateUserCryptoWallet(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Update crypto wallet error:", error);
      res.status(500).json({ message: "Failed to update crypto wallet" });
    }
  });

  app.delete("/api/user/crypto-wallets/:id", ensureAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getUserCryptoWallet(id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ message: "Crypto wallet not found" });
      }
      await storage.deleteUserCryptoWallet(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete crypto wallet error:", error);
      res.status(500).json({ message: "Failed to delete crypto wallet" });
    }
  });

  // ===========================================================================
  // Organizational Chart
  // ===========================================================================
  
  app.get("/api/admin/org-chart", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const positions = await db.select().from(schema.orgPositions).orderBy(schema.orgPositions.level, schema.orgPositions.order);
      res.json(positions);
    } catch (error: any) {
      console.error("Get org chart error:", error);
      res.status(500).json({ message: "Failed to retrieve org chart" });
    }
  });

  app.post("/api/admin/org-chart", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const [position] = await db.insert(schema.orgPositions).values(req.body).returning();
      res.status(201).json(position);
    } catch (error: any) {
      console.error("Create org position error:", error);
      res.status(500).json({ message: "Failed to create position" });
    }
  });

  app.post("/api/admin/org-chart/seed", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const defaultPositions = [
        { name: 'CEO', title: 'Chief Executive Officer', department: 'Executive', level: 0, order: 0 },
        { name: 'COO', title: 'Chief Operating Officer', department: 'Operations', level: 1, order: 0 },
        { name: 'CFO', title: 'Chief Financial Officer', department: 'Finance', level: 1, order: 1 },
        { name: 'CTO', title: 'Chief Technology Officer', department: 'Technology', level: 1, order: 2 },
        { name: 'CCO', title: 'Chief Compliance Officer', department: 'Compliance', level: 1, order: 3 },
        { name: 'Head of Support', title: 'Customer Service Manager', department: 'Customer Service', level: 2, order: 0 },
        { name: 'Lead Developer', title: 'Senior Software Engineer', department: 'Technology', level: 2, order: 1 },
        { name: 'Finance Manager', title: 'Senior Accountant', department: 'Finance', level: 2, order: 2 },
      ];
      const positions = await db.insert(schema.orgPositions).values(defaultPositions).returning();
      res.status(201).json(positions);
    } catch (error: any) {
      console.error("Seed org chart error:", error);
      res.status(500).json({ message: "Failed to seed org chart" });
    }
  });

  app.put("/api/admin/org-chart/:id", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { id } = req.params;
      const [updated] = await db.update(schema.orgPositions)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(schema.orgPositions.id, id))
        .returning();
      if (!updated) return res.status(404).json({ message: "Position not found" });
      res.json(updated);
    } catch (error: any) {
      console.error("Update org position error:", error);
      res.status(500).json({ message: "Failed to update position" });
    }
  });

  app.delete("/api/admin/org-chart/:id", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(schema.orgPositions).where(eq(schema.orgPositions.id, id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete org position error:", error);
      res.status(500).json({ message: "Failed to delete position" });
    }
  });


  // PDF Download endpoint for Clawd Integration Guide
  app.get("/api/docs/clawd-guide/download", async (req, res) => {
    try {
      const puppeteer = await import('puppeteer');
      const pathModule = await import('path');
      const fsModule = await import('fs');
      
      const htmlPath = pathModule.default.join(process.cwd(), 'public', 'clawd-integration-guide.html');
      
      if (!fsModule.default.existsSync(htmlPath)) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      const htmlContent = fsModule.default.readFileSync(htmlPath, 'utf-8');
      
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      
      const htmlWithAbsoluteUrls = htmlContent
        .replace(/src="\//g, `src="${baseUrl}/`)
        .replace(/href="\//g, `href="${baseUrl}/`);
      
      await page.setContent(htmlWithAbsoluteUrls, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });
      
      await browser.close();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Finatrades-Clawd-Integration-Guide.pdf"');
      res.send(pdfBuffer);
      
    } catch (error: any) {
      console.error("PDF generation error:", error);
      res.status(500).json({ message: "Failed to generate PDF", error: error.message });
    }
  });

  // Email Clawd Integration Guide as PDF
  app.post("/api/docs/clawd-guide/email", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { recipientEmail, recipientName, customMessage } = req.body;
      
      if (!recipientEmail) {
        return res.status(400).json({ message: "Recipient email is required" });
      }
      
      const puppeteer = await import('puppeteer');
      const pathModule = await import('path');
      const fsModule = await import('fs');
      const { sendEmailWithAttachment } = await import('./email');
      
      const htmlPath = pathModule.default.join(process.cwd(), 'public', 'clawd-integration-guide.html');
      
      if (!fsModule.default.existsSync(htmlPath)) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // Generate PDF
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      const htmlContent = fsModule.default.readFileSync(htmlPath, 'utf-8');
      
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      
      const htmlWithAbsoluteUrls = htmlContent
        .replace(/src="\//g, `src="${baseUrl}/`)
        .replace(/href="\//g, `href="${baseUrl}/`);
      
      await page.setContent(htmlWithAbsoluteUrls, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });
      
      await browser.close();
      
      // Create professional email HTML
      const greeting = recipientName ? `Dear ${recipientName}` : 'Dear Partner';
      const message = customMessage || 'We are pleased to share our comprehensive AI Integration Guide for your review.';
      
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); padding: 40px 30px; text-align: center; }
    .header img { height: 50px; margin-bottom: 15px; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; }
    .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px; }
    .content { padding: 40px 30px; }
    .content h2 { color: #8B5CF6; margin-top: 0; }
    .highlight-box { background: linear-gradient(135deg, #f5f3ff 0%, #fdf2f8 100%); border-left: 4px solid #8B5CF6; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0; }
    .features { margin: 25px 0; }
    .feature { display: flex; align-items: center; margin: 12px 0; }
    .feature-icon { width: 24px; height: 24px; background: #8B5CF6; color: white; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { background: #1a1a2e; color: #888; padding: 30px; text-align: center; font-size: 12px; }
    .footer a { color: #8B5CF6; }
    .divider { height: 1px; background: #eee; margin: 25px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FINATRADES</h1>
      <p>Gold-Backed Digital Financial Platform</p>
    </div>
    
    <div class="content">
      <h2>Clawd.bot AI Integration Guide</h2>
      
      <p>${greeting},</p>
      
      <p>${message}</p>
      
      <div class="highlight-box">
        <strong>📎 Attached Document:</strong><br>
        <span style="color: #666;">Finatrades-Clawd-Integration-Guide.pdf</span><br>
        <small style="color: #999;">Comprehensive 12-page technical blueprint</small>
      </div>
      
      <p>This guide covers:</p>
      
      <div class="features">
        <div class="feature">
          <span class="feature-icon">✓</span>
          <span>System Architecture & Integration Overview</span>
        </div>
        <div class="feature">
          <span class="feature-icon">✓</span>
          <span>Product Integration Matrix (FinaVault, FinaPay, FinaBridge, BNSL)</span>
        </div>
        <div class="feature">
          <span class="feature-icon">✓</span>
          <span>Step-by-Step Setup & Configuration</span>
        </div>
        <div class="feature">
          <span class="feature-icon">✓</span>
          <span>Automated Workflows & Scheduling</span>
        </div>
        <div class="feature">
          <span class="feature-icon">✓</span>
          <span>Security & Compliance Considerations</span>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <p>If you have any questions about the integration or would like to schedule a technical discussion, please don't hesitate to reach out.</p>
      
      <p>Best regards,<br>
      <strong>Finatrades Technology Team</strong></p>
    </div>
    
    <div class="footer">
      <p>© 2026 Finatrades. All rights reserved.</p>
      <p>This email contains confidential information intended for the recipient only.</p>
    </div>
  </div>
</body>
</html>`;
      
      // Send email with PDF attachment
      const result = await sendEmailWithAttachment(
        recipientEmail,
        'Finatrades AI Integration Guide - Clawd.bot Implementation Blueprint',
        emailHtml,
        [{
          filename: 'Finatrades-Clawd-Integration-Guide.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      );
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: `Guide sent successfully to ${recipientEmail}`,
          messageId: result.messageId 
        });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
      
    } catch (error: any) {
      console.error("Email guide error:", error);
      res.status(500).json({ message: "Failed to send guide", error: error.message });
    }
  });

  // ============================================
  // EMAIL UNSUBSCRIBE (public, no auth required)
  // ============================================
  app.get("/api/unsubscribe", async (req: Request, res: Response) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const result = verifyUnsubscribeToken(token);

    const successHtml = (email: string) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribed — FinaTrades</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f0720;color:#e2e8f0;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.card{background:#1a0d3a;border:1px solid #4B0082;border-radius:16px;padding:48px 40px;max-width:480px;text-align:center;}
.logo{font-size:22px;font-weight:700;color:#8A2BE2;letter-spacing:-0.5px;margin-bottom:32px;}
h1{font-size:24px;font-weight:600;color:#fff;margin:0 0 12px;}
p{color:#A78BFA;font-size:15px;line-height:1.6;margin:0 0 24px;}
.email{font-size:13px;color:#6b7280;word-break:break-all;}
a{color:#8A2BE2;text-decoration:none;}a:hover{text-decoration:underline;}
</style></head><body><div class="card">
<div class="logo">FinaTrades</div>
<h1>You have been unsubscribed</h1>
<p>You will no longer receive marketing emails from FinaTrades Finance SA.</p>
<p class="email">${email}</p>
<p style="font-size:13px;">You can re-enable marketing emails at any time in your <a href="/settings">account settings</a>.</p>
</div></body></html>`;

    const errorHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invalid Link — FinaTrades</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f0720;color:#e2e8f0;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.card{background:#1a0d3a;border:1px solid #4B0082;border-radius:16px;padding:48px 40px;max-width:480px;text-align:center;}
.logo{font-size:22px;font-weight:700;color:#8A2BE2;letter-spacing:-0.5px;margin-bottom:32px;}
h1{font-size:24px;font-weight:600;color:#fff;margin:0 0 12px;}
p{color:#A78BFA;font-size:15px;line-height:1.6;margin:0;}
a{color:#8A2BE2;text-decoration:none;}a:hover{text-decoration:underline;}
</style></head><body><div class="card">
<div class="logo">FinaTrades</div>
<h1>Invalid or expired link</h1>
<p>This unsubscribe link is invalid or has expired. Please <a href="/settings">visit your settings</a> to manage email preferences.</p>
</div></body></html>`;

    if (!result.valid || !result.email) {
      return res.status(400).send(errorHtml);
    }

    try {
      const user = await storage.getUserByEmail(result.email);
      if (user) {
        await storage.getOrCreateUserPreferences(user.id);
        await storage.updateUserPreferences(user.id, { marketingEmails: false });
      }
      return res.status(200).send(successHtml(result.email));
    } catch (err) {
      console.error('[Unsubscribe] Failed to process unsubscribe:', err);
      return res.status(500).send(errorHtml);
    }
  });

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const userId = req.session?.userId;
    const route = `${req.method} ${req.originalUrl}`;

    console.error(`[API Error] ${route}:`, errorMessage);

    notifyError({
      error: err instanceof Error ? err : new Error(errorMessage),
      context: 'Unhandled API Error',
      route,
      userId: userId || undefined,
      requestData: {
        method: req.method,
        path: req.originalUrl,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      },
    });

    if (!res.headersSent) {
      res.status(500).json({ message: 'Something went wrong. Our team has been notified.' });
    }
  });

  return httpServer;
}
