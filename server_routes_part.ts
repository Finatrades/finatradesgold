  });
  
  // Create media asset (Admin)
  app.post("/api/admin/cms/media", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      const assetData = insertMediaAssetSchema.parse(req.body);
      const asset = await storage.createMediaAsset(assetData);
      res.json({ asset });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create media asset" });
    }
  });
  
  // Delete media asset (Admin)
  app.delete("/api/admin/cms/media/:id", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      await storage.deleteMediaAsset(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete media asset" });
    }
  });
  
  // === Branding Settings ===
  
  // Get branding settings (Public - for theming)
  app.get("/api/branding", async (req, res) => {
    try {
      const settings = await storage.getOrCreateBrandingSettings();
      res.json({ settings });
    } catch (error) {
      res.status(400).json({ message: "Failed to get branding settings" });
    }
  });
  
  // Update branding settings (Admin only)
  app.patch("/api/admin/branding", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const updates = req.body;
      const settings = await storage.updateBrandingSettings({
        ...updates,
        updatedBy: req.session.userId
      });
      res.json({ settings });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update branding settings" });
    }
  });

  // Upload logo file (Admin only)
  app.post("/api/admin/branding/logo", ensureAdminAsync, requirePermission('manage_settings'), upload.single('logo'), async (req: Request, res: Response) => {
    try {
      
      if (!req.file) {
        return res.status(400).json({ message: 'No logo file uploaded' });
      }
      
      let logoUrl: string;
      
      // Upload to R2 if configured, otherwise use local disk
      if (isR2Configured() && req.file.buffer) {
        const r2Key = generateR2Key('branding', `logo-${Date.now()}-${req.file.originalname}`);
        const result = await uploadToR2(r2Key, req.file.buffer, req.file.mimetype);
        logoUrl = result.url;
        console.log(`[R2] Logo uploaded: ${r2Key}`);
      } else {
        // Fallback to local disk storage
        logoUrl = `/uploads/${(req.file as any).filename}`;
      }
      
      res.json({ 
        url: logoUrl,
        filename: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      res.status(500).json({ message: 'Failed to upload logo' });
    }
  });
  
  // === Public Content API (for frontend consumption) ===
  
  // Get content by page slug (Public)
  app.get("/api/content/:slug", async (req, res) => {
    try {
      const page = await storage.getContentPageBySlug(req.params.slug);
      if (!page || !page.isActive) {
        return res.status(404).json({ message: "Content not found" });
      }
      const blocks = await storage.getPageContentBlocks(page.id);
      
      // Transform blocks into a structured object by section and key
      const content: Record<string, Record<string, string>> = {};
      for (const block of blocks) {
        if (block.status === 'published') {
          if (!content[block.section]) {
            content[block.section] = {};
          }
          content[block.section][block.key] = block.content || block.defaultContent || '';
        }
      }
      
      res.json({ page: { slug: page.slug, title: page.title }, content });
    } catch (error) {
      res.status(400).json({ message: "Failed to get content" });
    }
  });
  
  // Get terms and conditions content (Public - for modals)
  app.get("/api/terms/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const validTypes = ['deposit', 'buy_gold', 'withdrawal', 'transfer'];
      
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid terms type" });
      }
      
      // Check if terms are enabled for this type
      const enabledKey = `${type}_terms_enabled`;
      const enabledConfig = await storage.getPlatformConfig(enabledKey);
      const isEnabled = enabledConfig ? enabledConfig.configValue === 'true' : true;
      
      // Get from platform_config or return default
      const configKey = `${type}_terms`;
      const config = await storage.getPlatformConfig(configKey);
      
      if (config && config.configValue) {
        return res.json({ 
          terms: config.configValue,
          title: config.displayName || `${type.replace('_', ' ')} Terms`,
          enabled: isEnabled
        });
      }
      
      // Return default terms based on type
      const defaultTerms: Record<string, { title: string; terms: string }> = {
        deposit: {
          title: 'Deposit Terms & Conditions',
          terms: 'By proceeding with this deposit, you agree to the following terms:\n\n1. Gold price shown is tentative and subject to change upon fund verification.\n2. Deposits will be processed within 1-3 business days after verification.\n3. The final gold amount credited will be calculated at the confirmed rate at time of receipt.\n4. All deposits are subject to anti-money laundering (AML) verification.\n5. You confirm that the funds are from a legitimate source.'
        },
        buy_gold: {
          title: 'Gold Purchase Terms & Conditions',
          terms: 'By purchasing gold through Finatrades, you agree to the following:\n\n1. Gold prices are based on real-time market rates plus applicable spread.\n2. Once a purchase is confirmed, it cannot be cancelled or reversed.\n3. Purchased gold will be credited to your wallet within 24 hours.\n4. All purchases are subject to platform transaction limits.\n5. You understand that gold values may fluctuate after purchase.'
        },
        withdrawal: {
          title: 'Withdrawal Terms & Conditions',
          terms: 'By proceeding with this withdrawal, you agree to the following:\n\n1. Withdrawals are subject to verification and may take 1-5 business days.\n2. Withdrawal fees will be deducted from the amount.\n3. You confirm the receiving account details are correct.\n4. Finatrades is not responsible for incorrect account details provided.'
        },
        transfer: {
          title: 'Transfer Terms & Conditions',
          terms: 'By proceeding with this transfer, you agree to:\n\n1. Transfers are instant and cannot be reversed once completed.\n2. You confirm the recipient details are correct.\n3. Transfer limits apply based on your verification level.'
        }
      };
      
      const defaults = defaultTerms[type] || { title: 'Terms & Conditions', terms: 'Please review the terms and conditions before proceeding.' };
      res.json({ ...defaults, enabled: isEnabled });
    } catch (error) {
      res.status(400).json({ message: "Failed to get terms" });
    }
  });
  
  // Get template by slug (Public - for rendering)
  app.get("/api/templates/:slug", async (req, res) => {
    try {
      const template = await storage.getTemplateBySlug(req.params.slug);
      if (!template || template.status !== 'published') {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json({ template: { slug: template.slug, name: template.name, body: template.body, variables: template.variables } });
    } catch (error) {
      res.status(400).json({ message: "Failed to get template" });
    }
  });

  // ============================================================================
  // FINAPAY - PEER TRANSFERS (SEND/REQUEST MONEY)
  // ============================================================================

  // Search user by email or Finatrades ID - PROTECTED: requires authentication
  app.get("/api/finapay/search-user", ensureAuthenticated, async (req, res) => {
    try {
      const { identifier } = req.query;
      if (!identifier || typeof identifier !== 'string') {
        return res.status(400).json({ message: "Identifier required" });
      }
      
      const users = await storage.searchUsersByIdentifier(identifier);
      if (users.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return basic info only (not sensitive data)
      const user = users[0];
      res.json({ 
        user: { 
          id: user.id, 
          finatradesId: user.finatradesId,
          firstName: user.firstName, 
          lastName: user.lastName, 
          email: user.email,
          profilePhotoUrl: user.profilePhoto
        } 
      });
    } catch (error) {
      res.status(400).json({ message: "Search failed" });
    }
  });

  // Send gold to another user - PROTECTED: requires authentication + sender verification + PIN
  // NOTE: Platform is gold-only. All transfers are in gold grams, USD is display-only.
  app.post("/api/finapay/send", ensureAuthenticated, checkMaintenanceMode, idempotencyMiddleware, requirePinVerification('send_funds'), async (req, res) => {
    try {
      const { senderId, recipientIdentifier, amountGold, channel, memo, goldWalletType } = req.body;
      
      // SECURITY: Verify sender matches authenticated session
      if (req.session?.userId !== senderId) {
        return res.status(403).json({ message: "Not authorized to send from this account" });
      }
      // P2P RULE: FGPW transfers auto-unlock to LGPW first
      // Receiver ALWAYS gets LGPW at live price
      const sourceWalletType = goldWalletType || 'LGPW';
      
      // Import FGPW batch service for FGPW transfers
      const { previewFpgwBatches, getFpgwBalanceSummary } = await import('./fpgw-batch-service');
      // Validate gold amount is provided (platform is gold-only)
      if (!amountGold || parseFloat(amountGold) <= 0) {
        return res.status(400).json({ message: "Gold amount is required for transfers" });
      }
      
      // Get live gold price from API
      let goldPrice: number;
      try {
        goldPrice = await getGoldPricePerGram();
      } catch {
        goldPrice = 139.44; // Fallback price if API fails
      }
      
      // Find sender
      const sender = await storage.getUser(senderId);
      if (!sender) {
        return res.status(404).json({ message: "Sender not found" });
      }
      
      // Calculate USD equivalent for limit validation
      const goldAmount = parseFloat(amountGold);
      const usdEquivalentForLimits = goldAmount * goldPrice;
      
      // Validate P2P transfer limits
      const limitResult = await platformLimits.validateFullTransactionLimits(
        usdEquivalentForLimits,
        sender,
        "Send"
      );
      
      if (!limitResult.valid) {
        return res.status(400).json({ 
          message: limitResult.message,
          limit: limitResult.limit,
          current: limitResult.current
        });
      }
      
      // SECURITY: Check if gold is BNSL-locked before allowing transfer
      const bnslPlans = await storage.getUserBnslPlans(senderId);
      const activePlans = bnslPlans.filter((p: any) => p.status === 'Active' || p.status === 'Pending');
      const totalLockedGrams = activePlans.reduce((sum: number, p: any) => sum + parseFloat(p.goldGrams || '0'), 0);
      
      const senderWalletCheck = await storage.getWallet(senderId);
      const availableGold = parseFloat(senderWalletCheck?.goldGrams?.toString() || '0');
      const requestedGold = parseFloat(amountGold);
      
      // For FGPW transfers, check FGPW balance instead
      let fgpwConversionResult: any = null;
      let receiverGoldGrams = requestedGold; // Default for LGPW (1:1)
      let fgpwUsdValue = 0;
      
      if (sourceWalletType === 'FGPW') {
        // Get FGPW balance summary
        const balanceSummary = await getFpgwBalanceSummary(senderId);
        const fgpwAvailable = balanceSummary.availableGrams;
        
        if (fgpwAvailable < requestedGold) {
          return res.status(400).json({ 
            message: `Insufficient FGPW balance. You have ${fgpwAvailable.toFixed(4)}g available in FGPW.`,
            fgpwAvailable: fgpwAvailable.toFixed(4),
            requestedGrams: requestedGold.toFixed(4)
          });
        }
        
        // Preview FGPW consumption to calculate USD value and receiver's LGPW grams
        // This will be done again in the actual transfer, but we need to calculate now
        fgpwConversionResult = await previewFpgwBatches(senderId, requestedGold, 'Available');
        if (!fgpwConversionResult.success) {
          return res.status(400).json({ 
            message: fgpwConversionResult.error || 'Failed to process FGPW transfer'
          });
        }
        
        // Calculate receiver's LGPW grams: USD value / live price
        fgpwUsdValue = fgpwConversionResult.weightedValueUsd;
        receiverGoldGrams = fgpwUsdValue / goldPrice;
        
        console.log(`[P2P-FGPW] Sender sends ${requestedGold}g FGPW (USD ${fgpwUsdValue.toFixed(2)}) -> Receiver gets ${receiverGoldGrams.toFixed(6)}g LGPW at ${goldPrice.toFixed(2)}/g`);
      } else {
        // LGPW balance check
        if (availableGold - totalLockedGrams < requestedGold) {
          return res.status(400).json({ 
            message: `Insufficient available gold. ${totalLockedGrams.toFixed(4)}g is locked in BNSL plans.`,
            lockedGrams: totalLockedGrams.toFixed(4),
            availableGrams: (availableGold - totalLockedGrams).toFixed(4)
          });
        }
      }
      
      // Find recipient by email or Finatrades ID
      let recipient;
      if (channel === 'email') {
        recipient = await storage.getUserByEmail(recipientIdentifier);
      } else if (channel === 'finatrades_id') {
        recipient = await storage.getUserByFinatradesId(recipientIdentifier);
      } else if (channel === 'qr_code') {
        recipient = await storage.getUserByFinatradesId(recipientIdentifier);
      }
      
      // Check sender wallet first (needed for both registered and invitation transfers)
      const senderWallet = await storage.getWallet(sender.id);
      if (!senderWallet) {
        return res.status(400).json({ message: "Sender wallet not found" });
      }
      
      // Platform is gold-only - calculate USD equivalent
      // For FGPW: use the previewed USD value; For LGPW: use live price
      const usdEquivalent = sourceWalletType === 'FGPW' && fgpwConversionResult
        ? fgpwConversionResult.weightedValueUsd 
        : goldAmount * goldPrice;
      
      // Validate gold balance before creating pending transfer
      // Skip for FGPW - already validated in FGPW-specific block above
      const senderGoldBalance = parseFloat(senderWallet.goldGrams?.toString() || '0');
      if (sourceWalletType === 'LGPW' && senderGoldBalance < goldAmount) {
        return res.status(400).json({ message: `Insufficient gold balance. You have ${senderGoldBalance.toFixed(4)}g` });
      }
      
      const referenceNumber = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Handle invitation transfer for non-registered email recipients
      if (!recipient && channel === 'email') {
        // Generate invitation token
        const crypto = await import('crypto');
        const invitationToken = crypto.randomUUID();
        
        // Get sender's referral code if they have one
        let senderReferralCode: string | undefined;
        const senderReferrals = await storage.getUserReferrals(sender.id);
        if (senderReferrals.length > 0) {
          senderReferralCode = senderReferrals[0].referralCode;
        }
        
        // 24-hour expiry for invitation transfers
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        // Debit sender immediately (held until claimed or expired)
        await storage.updateWallet(senderWallet.id, {
          goldGrams: (senderGoldBalance - goldAmount).toFixed(6)
        });
        
        // Create sender transaction (pending)
        const senderTx = await storage.createTransaction({
          userId: sender.id,
          type: 'Send',
          status: 'Pending',
          amountGold: goldAmount.toFixed(6),
          amountUsd: usdEquivalent.toFixed(2),
          goldPriceUsdPerGram: goldPrice.toFixed(2),
          recipientEmail: recipientIdentifier,
          description: memo || `Invitation transfer to ${recipientIdentifier} (awaiting registration)`,
          referenceId: referenceNumber,
          sourceModule: 'finapay',
          goldWalletType: 'LGPW',
        });
        
        const { deductFromCerts: deductInvite } = await import('./cert-ledger-service');
        await deductInvite(storage, {
          userId: sender.id,
          gramsToDeduct: goldAmount,
          reason: 'P2P_SEND',
          transactionId: senderTx.id,
          notes: `P2P invitation send: ${goldAmount.toFixed(4)}g to ${recipientIdentifier}`,
        });
        
        // Record ledger entry
        const { vaultLedgerService } = await import('./vault-ledger-service');
        await vaultLedgerService.recordLedgerEntry({
          userId: sender.id,
          action: 'Transfer_Send',
          goldGrams: goldAmount,
          goldPriceUsdPerGram: goldPrice,
          fromWallet: 'FinaPay',
          toWallet: 'External',
          fromStatus: 'Available',
          toStatus: 'Pending_Deposit',
          transactionId: senderTx.id,
          notes: `Invitation transfer to ${recipientIdentifier} (awaiting registration - expires in 24h)`,
          createdBy: 'system',
        });
        
        // Create pending invite transfer (no recipientId)
        // Store invitation data in memo as JSON since AWS RDS may not have new columns yet
        const inviteMetadata = JSON.stringify({
          isInvite: true,
          invitationToken,
          senderReferralCode: senderReferralCode || null,
          originalMemo: memo || null,
        });
        
        // Use sender's ID as placeholder for recipientId (AWS RDS has NOT NULL constraint)
        // We detect invitation transfers by checking memo JSON for isInvite: true
        const inviteTransfer = await storage.createPeerTransfer({
          referenceNumber,
          senderId: sender.id,
          recipientId: sender.id, // Self-reference as placeholder for pending invite
          amountUsd: usdEquivalent.toFixed(2),
          amountGold: goldAmount.toFixed(6),
          goldPriceUsdPerGram: goldPrice.toFixed(2),
          channel,
          recipientIdentifier,
          memo: inviteMetadata,
          status: 'Pending',
          requiresApproval: true,
          expiresAt,
          senderTransactionId: senderTx.id,
        });
        
        // Emit real-time sync event
        emitLedgerEvent(sender.id, {
          type: 'balance_update',
          module: 'finapay',
          action: 'gold_pending_invite',
          data: { goldGrams: goldAmount, recipientEmail: recipientIdentifier },
        });
        
        // Build registration URL with referral code and invitation token
        const baseUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : 'https://finatrades.com';
        let registerUrl = `${baseUrl}/register?invite=${invitationToken}`;
        if (senderReferralCode) {
          registerUrl += `&ref=${encodeURIComponent(senderReferralCode)}`;
        }
        
        // Send invitation email
        const emailResult = await sendEmail(recipientIdentifier, EMAIL_TEMPLATES.INVITATION, {
          sender_name: `${sender.firstName} ${sender.lastName}`,
          amount: `${goldAmount.toFixed(4)}g`,
          register_url: registerUrl,
        });
        console.log(`[Email] Invitation email to ${recipientIdentifier}: ${emailResult.success ? 'sent' : 'failed'} - ${emailResult.messageId || emailResult.error}`);
        
        // Create bell notification for sender
        await storage.createNotification({
          userId: sender.id,
          title: 'Invitation Sent',
          message: `You sent ${goldAmount.toFixed(4)}g gold to ${recipientIdentifier}. They have 24 hours to register and claim it.`,
          type: 'transaction',
          link: '/finapay',
        });
        
        // Create audit log
        await storage.createAuditLog({
          entityType: 'peer_transfer',
          entityId: inviteTransfer.id,
          actionType: 'create',
          actor: sender.id,
          actorRole: 'user',
          details: `Invitation transfer created: ${goldAmount.toFixed(4)}g gold to ${recipientIdentifier}. Token: ${invitationToken.substring(0, 8)}...`,
        });
        
        // Send transfer_sent email to sender for invite transfer confirmation
        if (sender.email) {
          sendEmail(sender.email, EMAIL_TEMPLATES.TRANSFER_SENT, {
            user_name: `${sender.firstName} ${sender.lastName}`,
            recipient_name: recipientIdentifier,
            gold_amount: goldAmount.toFixed(4),
            usd_value: usdEquivalent.toFixed(2),
            reference_id: referenceNumber,
          }, { userId: sender.id, recipientName: sender.firstName || undefined }).catch(err => console.error('[Email] Invite transfer_sent failed:', err));
        }

        // Low balance alert for invite path
        if (sender.email) {
          const { checkAndSendLowBalanceAlert } = await import('./jobs/low-balance-alert');
          checkAndSendLowBalanceAlert(
            storage, sender.id, sender.email,
            sender.firstName, sender.lastName,
            getGoldPricePerGram,
          ).catch(err => console.error('[Email] Low balance check (invite) failed:', err));
        }

        return res.json({
          transfer: inviteTransfer,
          pending: true,
          isInvite: true,
          message: `Invitation sent! ${recipientIdentifier} has 24 hours to register and claim ${goldAmount.toFixed(4)}g gold.`,
          expiresAt: expiresAt.toISOString(),
        });
      }
      
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found. For email transfers to non-registered users, use the email channel." });
      }
      
      if (sender.id === recipient.id) {
        return res.status(400).json({ message: "Cannot send money to yourself" });
      }
      
      // Get recipient wallet
      const recipientWallet = await storage.getWallet(recipient.id);
      if (!recipientWallet) {
        return res.status(400).json({ message: "Recipient wallet not found" });
      }
      
      // Transfer approval is always required for security
      const recipientPreferences = await storage.getUserPreferences(recipient.id);
      const timeoutHours = recipientPreferences?.transferApprovalTimeout || 24;
      const expiresAt = timeoutHours > 0 ? new Date(Date.now() + timeoutHours * 60 * 60 * 1000) : null;
      
      // Debit sender immediately (held until accepted/rejected)
      // For FGPW: Don't debit wallet - FGPW batches will be consumed at approval time
      // For LGPW: Debit wallet now (funds held in escrow)
      if (sourceWalletType === 'LGPW') {
        await storage.updateWallet(senderWallet.id, {
          goldGrams: (senderGoldBalance - goldAmount).toFixed(6)
        });
      }
      // Note: For FGPW, we store the preview info and consume batches at approval time
      
      // Create sender transaction (pending)
      // For FGPW: amountGold = FGPW grams sent, description includes receiver LGPW grams
      const txDescription = sourceWalletType === 'FGPW' && fgpwConversionResult
        ? `Pending FGPW transfer to ${recipient!.firstName} ${recipient!.lastName} (${goldAmount.toFixed(4)}g FGPW @ ${(fgpwConversionResult.weightedValueUsd / goldAmount).toFixed(2)}/g = ${fgpwConversionResult.weightedValueUsd.toFixed(2)} -> ${receiverGoldGrams.toFixed(4)}g LGPW @ ${goldPrice.toFixed(2)}/g)`
        : memo || `Pending transfer to ${recipient!.firstName} ${recipient!.lastName}`;
      
      const senderTx = await storage.createTransaction({
        userId: sender.id,
        type: 'Send',
        status: 'Pending',
        amountGold: goldAmount.toFixed(6),
        amountUsd: usdEquivalent.toFixed(2),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        recipientEmail: recipient.email,
        recipientUserId: recipient.id,
        description: txDescription,
        referenceId: referenceNumber,
        sourceModule: 'finapay',
        goldWalletType: sourceWalletType,
      });
      
      // Record ledger entry
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: sender.id,
        action: 'Transfer_Send',
        goldGrams: goldAmount,
        goldPriceUsdPerGram: goldPrice,
        fromWallet: 'FinaPay',
        toWallet: 'External',
        fromStatus: 'Available',
        toStatus: 'Pending_Deposit',
        transactionId: senderTx.id,
        counterpartyUserId: recipient.id,
        notes: `Pending gold transfer to ${recipient!.firstName} ${recipient!.lastName} (awaiting acceptance)`,
        createdBy: 'system',
      });
      
      if (sourceWalletType === 'LGPW') {
        const { deductFromCerts: deductP2P } = await import('./cert-ledger-service');
        await deductP2P(storage, {
          userId: sender.id,
          gramsToDeduct: goldAmount,
          reason: 'P2P_SEND',
          transactionId: senderTx.id,
          notes: `P2P send: ${goldAmount.toFixed(4)}g to ${recipient!.firstName} ${recipient!.lastName}`,
        });
      }
      
      // Create pending peer transfer
      const pendingTransfer = await storage.createPeerTransfer({
        referenceNumber,
        senderId: sender.id,
        recipientId: recipient.id,
        amountUsd: usdEquivalent.toFixed(2),
        amountGold: goldAmount.toFixed(6),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        channel,
        recipientIdentifier,
        memo,
        status: 'Pending',
        requiresApproval: true,
        expiresAt,
        senderTransactionId: senderTx.id,
      });
      
      // Emit real-time sync event
      emitLedgerEvent(sender.id, {
        type: 'balance_update',
        module: 'finapay',
        action: 'gold_pending',
        data: { goldGrams: goldAmount, recipientId: recipient.id },
      });
      emitLedgerEvent(recipient.id, {
        type: 'pending_transfer',
        module: 'finapay',
        action: 'incoming_transfer',
        data: { goldGrams: goldAmount, senderId: sender.id, transferId: pendingTransfer.id },
      });
      
      // Create bell notification for recipient
      await storage.createNotification({
        userId: recipient.id,
        title: 'Incoming Gold Transfer',
        message: `${sender.firstName} ${sender.lastName} sent you ${goldAmount.toFixed(4)}g gold ($${usdEquivalent.toFixed(2)}). Please accept or decline.`,
        type: 'transaction',
        link: '/finapay',
      });
      
      // Send pending transfer email to recipient
      if (recipient.email) {
        sendEmail(recipient.email, EMAIL_TEMPLATES.TRANSFER_PENDING, {
          user_name: `${recipient.firstName} ${recipient.lastName}`,
          sender_name: `${sender.firstName} ${sender.lastName}`,
          amount: `${goldAmount.toFixed(4)}g gold`,
          amount_usd: usdEquivalent.toFixed(2),
          reference_number: referenceNumber,
          memo: memo || '',
          expires_at: expiresAt ? expiresAt.toLocaleDateString() : '',
        }, { userId: recipient.id, recipientName: recipient.firstName || undefined }).catch(err => console.error('[Email] Pending transfer notification failed:', err));
      }

      // Send transfer_sent confirmation to sender
      if (sender.email) {
        sendEmail(sender.email, EMAIL_TEMPLATES.TRANSFER_SENT, {
          user_name: `${sender.firstName} ${sender.lastName}`,
          recipient_name: `${recipient.firstName} ${recipient.lastName}`,
          gold_amount: goldAmount.toFixed(4),
          usd_value: usdEquivalent.toFixed(2),
          reference_id: referenceNumber,
        }, { userId: sender.id, recipientName: sender.firstName || undefined }).catch(err => console.error('[Email] Transfer sent confirmation failed:', err));
      }

      // Low balance alert for registered recipient P2P path
      if (sender.email) {
        const { checkAndSendLowBalanceAlert } = await import('./jobs/low-balance-alert');
        checkAndSendLowBalanceAlert(
          storage, sender.id, sender.email,
          sender.firstName, sender.lastName,
          getGoldPricePerGram,
        ).catch(err => console.error('[Email] Low balance check (P2P) failed:', err));
      }

      return res.json({
        transfer: pendingTransfer,
        pending: true,
        message: `Transfer of ${goldAmount.toFixed(4)}g gold sent to ${recipient.firstName} ${recipient.lastName}. Awaiting their approval.`
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Transfer failed" });
    }
  });

  // Get user's sent transfers - PROTECTED
  app.get("/api/finapay/transfers/sent/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const transfers = await storage.getUserSentTransfers(req.params.userId);
      res.json({ transfers });
    } catch (error) {
      res.status(400).json({ message: "Failed to get sent transfers" });
    }
  });

  // Get user's received transfers - PROTECTED
  app.get("/api/finapay/transfers/received/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const transfers = await storage.getUserReceivedTransfers(req.params.userId);
      res.json({ transfers });
    } catch (error) {
      res.status(400).json({ message: "Failed to get received transfers" });
    }
  });

  // Paginated P2P transfers endpoint for better performance
  app.get("/api/finapay/transfers/:userId/paginated", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { status, limit = '20', offset = '0' } = req.query;
      const result = await storage.getPeerTransfersPaginated(req.params.userId, {
        status: status as string | undefined,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Failed to get transfers" });
    }
  });

  // Create money request - PROTECTED
  app.post("/api/finapay/request", ensureAuthenticated, async (req, res) => {
    try {
      const { requesterId, targetIdentifier, amountUsd, channel, memo, attachmentData, attachmentName, attachmentMime, attachmentSize, goldWalletType } = req.body;
      
      const requester = await storage.getUser(requesterId);
      if (!requester) {
        return res.status(404).json({ message: "Requester not found" });
      }
      
      // Validate attachment if provided
      if (attachmentData) {
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (attachmentSize > MAX_SIZE) {
          return res.status(400).json({ message: "Attachment size must be less than 5MB" });
        }
        if (!allowedMimes.includes(attachmentMime)) {
          return res.status(400).json({ message: "Attachment must be PDF, PNG, or JPG" });
        }
      }
      
      // Fetch current gold price and calculate gold grams (Gold-First Principle)
      const goldPrice = await getGoldPricePerGram();
      if (!goldPrice || goldPrice <= 0) {
        return res.status(400).json({ message: "Unable to fetch current gold price" });
      }
      const parsedAmountUsd = parseFloat(amountUsd);
      const goldGrams = parsedAmountUsd / goldPrice;
      
      // Generate reference and QR payload
      const referenceNumber = `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const qrPayload = `FTREQ:${referenceNumber}:${amountUsd}:${requester.finatradesId}`;
      
      // Find target if identifier provided
      let targetId = null;
      let targetUser = null;
      if (targetIdentifier) {
        const targetUsers = await storage.searchUsersByIdentifier(targetIdentifier);
        if (targetUsers.length > 0) {
          targetId = targetUsers[0].id;
          targetUser = targetUsers[0];
        }
      }
      
      // Set expiry to 7 days
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const request = await storage.createPeerRequest({
        referenceNumber,
        requesterId,
        targetId,
        targetIdentifier,
        channel,
        amountUsd: parsedAmountUsd.toFixed(2),
        amountGold: goldGrams.toFixed(6),
        memo,
        qrPayload,
        status: 'Pending',
        expiresAt,
        attachmentUrl: attachmentData || null,
        attachmentName: attachmentName || null,
        attachmentMime: attachmentMime || null,
        attachmentSize: attachmentSize || null,
        goldWalletType: goldWalletType || 'LGPW',
      });
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);
      
      // Send email notification to target user if found
      if (targetUser && targetUser.email) {
        const requesterName = `${requester.firstName} ${requester.lastName}`;
        try {
          const emailSubject = `Payment Request from ${requesterName} - ${parseFloat(amountUsd).toFixed(2)}`;
          const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #8A2BE2 0%, #4B0082 100%); padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0;">Finatrades</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                  <h2 style="color: #1f2937;">You've Received a Payment Request</h2>
                  <p style="color: #4b5563; font-size: 16px;">
                    <strong>${requesterName}</strong> has requested a payment from you.
                  </p>
                  <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px 0; color: #6b7280;">Amount Requested:</p>
                    <p style="margin: 0; font-size: 28px; font-weight: bold; color: #8A2BE2;">${parseFloat(amountUsd).toFixed(2)}</p>
                    ${memo ? `<p style="margin: 15px 0 0 0; color: #6b7280; font-style: italic;">"${memo}"</p>` : ''}
                  </div>
                  <p style="color: #4b5563;">Reference: <strong>${referenceNumber}</strong></p>
                  <p style="color: #4b5563;">This request expires on: <strong>${expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></p>
                  <div style="margin-top: 25px; text-align: center;">
                    <a href="${process.env.PRODUCTION_DOMAIN ? 'https://' + process.env.PRODUCTION_DOMAIN : (process.env.REPLIT_DOMAINS?.split(',')[0] ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : 'https://finatrades.com')}/finapay" 
                       style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                      View Request in FinaPay
                    </a>
                  </div>
                  <p style="color: #9ca3af; font-size: 14px; margin-top: 25px;">
                    Log in to your Finatrades account to pay or decline this request.
                  </p>
                </div>
                <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
                  <p>&copy; ${new Date().getFullYear()} Finatrades. All rights reserved.</p>
                </div>
              </div>
            `;
          await sendEmailDirect(targetUser.email, emailSubject, emailHtml);
        } catch (emailError) {
          console.error('[PaymentRequest] Failed to send email notification:', emailError);
        }
      }
      
      res.json({ request, qrCodeDataUrl });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create request" });
    }
  });

  // Get user's money requests (created by user) - PROTECTED
  app.get("/api/finapay/requests/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const requests = await storage.getUserPeerRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get requests" });
    }
  });

  // Get money requests received by user - PROTECTED
  app.get("/api/finapay/requests/received/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      // Get user details to match by email or Finatrades ID as well
      const targetUser = await storage.getUser(req.params.userId);
      const userEmail = targetUser?.email;
      const userFinatradesId = targetUser?.finatradesId;
      
      const requests = await storage.getUserReceivedPeerRequests(req.params.userId, userEmail, userFinatradesId);
      
      // Map amountGold to goldGrams for frontend compatibility
      const mappedRequests = requests.map(r => ({
        ...r,
        goldGrams: r.amountGold,
      }));
      
      res.json({ requests: mappedRequests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get received requests" });
    }
  });

  // Download attachment for a payment request - PROTECTED
  app.get("/api/finapay/requests/:id/attachment", ensureAuthenticated, async (req, res) => {
    try {
      const request = await storage.getPeerRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // Only requester or recipient can download attachment
      const userId = req.session.userId;
      const currentUser = userId ? await storage.getUser(userId) : null;
      const userEmail = currentUser?.email;
      const userFinatradesId = currentUser?.finatradesId;
      
      // Check if user is the requester
      const isRequester = request.requesterId === userId;
      
      // Check if user is the target by ID
      const isTargetById = request.targetId && request.targetId === userId;
      
      // Check if user matches the target identifier (email or finatrades ID)
      const isTargetByIdentifier = request.targetIdentifier && (
        request.targetIdentifier.toLowerCase() === userEmail?.toLowerCase() ||
        request.targetIdentifier.toUpperCase() === userFinatradesId?.toUpperCase()
      );
      
      if (!isRequester && !isTargetById && !isTargetByIdentifier) {
        return res.status(403).json({ message: "Not authorized to download this attachment" });
      }
      
      if (!request.attachmentUrl) {
        return res.status(404).json({ message: "No attachment found" });
      }
      
        return res.json({
        attachmentUrl: request.attachmentUrl,
        attachmentName: request.attachmentName,
        attachmentMime: request.attachmentMime,
        attachmentSize: request.attachmentSize,
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to get attachment" });
    }
  });

  // Pay a money request - PROTECTED
  app.post("/api/finapay/requests/:id/pay", ensureAuthenticated, idempotencyMiddleware, async (req, res) => {
    try {
      const { payerId } = req.body;
      const request = await storage.getPeerRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      if (request.status !== 'Pending') {
        return res.status(400).json({ message: "Request is no longer pending" });
      }
      
      // Check if expired
      if (request.expiresAt && new Date(request.expiresAt) < new Date()) {
        await storage.updatePeerRequest(request.id, { status: 'Expired' });
        return res.status(400).json({ message: "Request has expired" });
      }
      
      // Get payer and requester
      const payer = await storage.getUser(payerId);
      const requester = await storage.getUser(request.requesterId);
      
      if (!payer || !requester) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (payer.id === requester.id) {
        return res.status(400).json({ message: "Cannot pay your own request" });
      }
      
      // Check payer balance - use gold balance as the underlying asset
      const payerWallet = await storage.getWallet(payer.id);
      if (!payerWallet) {
        return res.status(400).json({ message: "Wallet not found" });
      }
      
      // Get current gold price to convert USD to gold grams
      const pricePerGram = await getGoldPricePerGram();
      const amountUsd = parseFloat(request.amountUsd.toString());
      const goldGrams = amountUsd / pricePerGram;
      const payerGoldBalance = parseFloat(payerWallet.goldGrams.toString());
      
      if (payerGoldBalance < goldGrams) {
        return res.status(400).json({ message: "Insufficient gold balance" });
      }
      
      // Get requester wallet - auto-create if missing (safety net for legacy users)
      let requesterWallet = await storage.getWallet(requester.id);
      if (!requesterWallet) {
        console.log(`[FinaPay] Auto-creating wallet for requester ${requester.id} (legacy user without wallet)`);
        requesterWallet = await storage.createWallet({
          userId: requester.id,
          goldGrams: "0",
          usdBalance: "0",
          eurBalance: "0",
        });
      }
      
      // Generate reference
      const referenceNumber = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Debit payer gold from legacy wallet
      await storage.updateWallet(payerWallet.id, {
        goldGrams: (payerGoldBalance - goldGrams).toFixed(6),
      });
      
      // Credit requester gold to legacy wallet
      const requesterGoldBalance = parseFloat(requesterWallet.goldGrams.toString());
      await storage.updateWallet(requesterWallet.id, {
        goldGrams: (requesterGoldBalance + goldGrams).toFixed(6),
      });
      
      // Update dual-wallet LGPW balances (vaultOwnershipSummary) - ALWAYS LGPW for P2P
      const walletType = 'LGPW'; // P2P is always LGPW to LGPW
      
      // Debit payer's LGPW (create if missing)
      const [payerVaultSummary] = await db.select().from(vaultOwnershipSummary)
        .where(eq(vaultOwnershipSummary.userId, payer.id));
      if (payerVaultSummary) {
        const payerMpgw = parseFloat(payerVaultSummary.mpgwAvailableGrams || '0');
        await db.update(vaultOwnershipSummary)
          .set({ mpgwAvailableGrams: Math.max(0, payerMpgw - goldGrams).toFixed(6) })
          .where(eq(vaultOwnershipSummary.userId, payer.id));
      } else {
        // Payer should have vault summary - create with 0 balance (already debited from legacy)
        console.log(`[FinaPay] Auto-creating vault summary for payer ${payer.id}`);
        await db.insert(vaultOwnershipSummary).values({
          userId: payer.id,
          mpgwAvailableGrams: '0.000000',
        });
      }
      
      // Credit requester's LGPW (create if missing)
      const [requesterVaultSummary] = await db.select().from(vaultOwnershipSummary)
        .where(eq(vaultOwnershipSummary.userId, requester.id));
      if (requesterVaultSummary) {
        const requesterMpgw = parseFloat(requesterVaultSummary.mpgwAvailableGrams || '0');
        await db.update(vaultOwnershipSummary)
          .set({ mpgwAvailableGrams: (requesterMpgw + goldGrams).toFixed(6) })
          .where(eq(vaultOwnershipSummary.userId, requester.id));
      } else {
        // Create vault ownership summary for requester with credited gold
        console.log(`[FinaPay] Auto-creating vault summary for requester ${requester.id}`);
        await db.insert(vaultOwnershipSummary).values({
          userId: requester.id,
          mpgwAvailableGrams: goldGrams.toFixed(6),
        });
      }
      
      // Create transactions with gold grams
      const senderTx = await storage.createTransaction({
        userId: payer.id,
        type: 'Send',
        status: 'Completed',
        amountGold: goldGrams.toFixed(6),
        amountUsd: amountUsd.toFixed(2),
        goldPriceUsdPerGram: pricePerGram.toFixed(2),
        recipientEmail: requester.email,
        recipientUserId: requester.id,
        description: request.memo || `Paid request from ${requester.firstName} ${requester.lastName}`,
        referenceId: referenceNumber,
        sourceModule: 'finapay',
        goldWalletType: 'LGPW', // P2P always uses LGPW
        completedAt: new Date(),
      });
      
      const recipientTx = await storage.createTransaction({
        userId: requester.id,
        type: 'Receive',
        status: 'Completed',
        amountGold: goldGrams.toFixed(6),
        amountUsd: amountUsd.toFixed(2),
        goldPriceUsdPerGram: pricePerGram.toFixed(2),
        senderEmail: payer.email,
        description: request.memo || `Received payment from ${payer.firstName} ${payer.lastName}`,
        referenceId: referenceNumber,
        sourceModule: 'finapay',
        goldWalletType: 'LGPW', // P2P always uses LGPW
        completedAt: new Date(),
      });
      
      // Create transfer record
      const transfer = await storage.createPeerTransfer({
        referenceNumber,
        senderId: payer.id,
        recipientId: requester.id,
        amountUsd: amountUsd.toFixed(2),
        goldGrams: goldGrams.toFixed(6),
        channel: request.channel,
        recipientIdentifier: requester.email,
        memo: request.memo,
        status: 'Completed',
        senderTransactionId: senderTx.id,
        recipientTransactionId: recipientTx.id,
      });
      // Generate P2P certificates for both parties
      // walletType already declared above
      const generateWingoldRef = () => `WG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const wingoldRef = generateWingoldRef();
      
      // Helper to generate certificate number
      const genCertNum = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // 1. Digital Ownership Certificate for requester (gold recipient)
      await storage.createCertificate({
        certificateNumber: genCertNum('DOC'),
        userId: requester.id,
        transactionId: recipientTx.id,
        type: 'Digital Ownership',
        status: 'Active',
        goldGrams: goldGrams.toFixed(6),
        goldPriceUsdPerGram: pricePerGram.toFixed(2),
        totalValueUsd: (goldGrams * pricePerGram).toFixed(2),
        issuer: 'Finatrades Finance SA',
        vaultLocation: 'Dubai - Wingold & Metals DMCC',
        wingoldStorageRef: wingoldRef,
        goldWalletType: walletType,
      });
      
      // 2. Physical Storage Certificate for requester (gold recipient)
      await storage.createCertificate({
        certificateNumber: genCertNum('PSC'),
        userId: requester.id,
        transactionId: recipientTx.id,
        type: 'Physical Storage',
        status: 'Active',
        goldGrams: goldGrams.toFixed(6),
        goldPriceUsdPerGram: pricePerGram.toFixed(2),
        totalValueUsd: (goldGrams * pricePerGram).toFixed(2),
        issuer: 'Wingold and Metals DMCC',
        vaultLocation: 'Dubai - Wingold & Metals DMCC',
        wingoldStorageRef: wingoldRef,
        goldWalletType: 'LGPW', // Physical storage always LGPW
      });
      
      // 3. Transfer Certificate for payer (gold sender) - shows Finatrades ID transfer
      await storage.createCertificate({
        certificateNumber: genCertNum('TRC'),
        userId: payer.id,
        transactionId: senderTx.id,
        type: 'Transfer',
        status: 'Active',
        goldGrams: goldGrams.toFixed(6),
        goldPriceUsdPerGram: pricePerGram.toFixed(2),
        totalValueUsd: (goldGrams * pricePerGram).toFixed(2),
        issuer: 'Finatrades Finance SA',
        fromUserId: payer.id,
        toUserId: requester.id,
        fromUserName: `${payer.firstName} ${payer.lastName} (FT-${payer.finatradesId})`,
        toUserName: `${requester.firstName} ${requester.lastName} (FT-${requester.finatradesId})`,
        goldWalletType: walletType,
      });
      
      // 3a. Updated Digital Ownership Certificate for payer (showing reduced balance)
      const payerNewBalance = payerGoldBalance - goldGrams;
      if (payerNewBalance > 0) {
        await storage.createCertificate({
          certificateNumber: genCertNum('DOC'),
          userId: payer.id,
          transactionId: senderTx.id,
          type: 'Digital Ownership',
          status: 'Active',
          goldGrams: payerNewBalance.toFixed(6),
          goldPriceUsdPerGram: pricePerGram.toFixed(2),
          totalValueUsd: (payerNewBalance * pricePerGram).toFixed(2),
          issuer: 'Finatrades Finance SA',
          vaultLocation: 'Dubai - Wingold & Metals DMCC',
          wingoldStorageRef: wingoldRef,
          goldWalletType: walletType,
        });
        
        // 3b. Updated Physical Storage Certificate for payer
        await storage.createCertificate({
          certificateNumber: genCertNum('PSC'),
          userId: payer.id,
          transactionId: senderTx.id,
          type: 'Physical Storage',
          status: 'Active',
          goldGrams: payerNewBalance.toFixed(6),
          goldPriceUsdPerGram: pricePerGram.toFixed(2),
          totalValueUsd: (payerNewBalance * pricePerGram).toFixed(2),
          issuer: 'Wingold and Metals DMCC',
          vaultLocation: 'Dubai - Wingold & Metals DMCC',
          wingoldStorageRef: wingoldRef,
          goldWalletType: 'LGPW',
        });
      }
      
      // 4. Transfer Certificate for requester (gold recipient) - shows Finatrades ID transfer
      await storage.createCertificate({
        certificateNumber: genCertNum('TRC'),
        userId: requester.id,
        transactionId: recipientTx.id,
        type: 'Transfer',
        status: 'Active',
        goldGrams: goldGrams.toFixed(6),
        goldPriceUsdPerGram: pricePerGram.toFixed(2),
        totalValueUsd: (goldGrams * pricePerGram).toFixed(2),
        issuer: 'Finatrades Finance SA',
        fromUserId: payer.id,
        toUserId: requester.id,
        fromUserName: `${payer.firstName} ${payer.lastName} (FT-${payer.finatradesId})`,
        toUserName: `${requester.firstName} ${requester.lastName} (FT-${requester.finatradesId})`,
        goldWalletType: walletType,
      });
      
      // Record ledger entries
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: payer.id,
        action: 'Transfer_Send',
        goldGrams: goldGrams,
        goldPriceUsdPerGram: pricePerGram,
        fromWallet: 'FinaPay',
        toWallet: 'External',
        fromStatus: 'Available',
        toStatus: 'Available',
        transactionId: senderTx.id,
        counterpartyUserId: requester.id,
        notes: `Paid payment request to ${requester.firstName} ${requester.lastName}`,
        createdBy: 'system',
      });
      
      await vaultLedgerService.recordLedgerEntry({
        userId: requester.id,
        action: 'Transfer_Receive',
        goldGrams: goldGrams,
        goldPriceUsdPerGram: pricePerGram,
        fromWallet: 'FinaPay',
        toWallet: 'FinaPay',
        fromStatus: 'Available',
        toStatus: 'Available',
        transactionId: recipientTx.id,
        counterpartyUserId: payer.id,
        notes: `Received payment from ${payer.firstName} ${payer.lastName}`,
        createdBy: 'system',
      });

      await storage.updatePeerRequest(request.id, {
        status: 'Fulfilled',
        fulfilledTransferId: transfer.id,
        respondedAt: new Date(),
      });
      
      res.json({ transfer, message: "Payment successful" });

      // Low balance alert for payer (LGPW debit on QR payment)
      if (payer.email) {
        const { checkAndSendLowBalanceAlert } = await import('./jobs/low-balance-alert');
        checkAndSendLowBalanceAlert(
          storage, payer.id, payer.email,
          payer.firstName, payer.lastName,
          getGoldPricePerGram,
        ).catch(err => console.error('[Email] Low balance check (QR payment) failed:', err));
      }
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Payment failed" });
    }
  });

  // Decline a money request - PROTECTED: requires authentication + ownership check
  app.post("/api/finapay/requests/:id/decline", ensureAuthenticated, async (req, res) => {
    try {
      const request = await storage.getPeerRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // SECURITY: Only the target (person being asked to pay) can decline
      if (request.targetId !== req.session?.userId) {
        return res.status(403).json({ message: "Not authorized to decline this request" });
      }
      
      if (request.status !== 'Pending') {
        return res.status(400).json({ message: "Request is no longer pending" });
      }
      
      await storage.updatePeerRequest(request.id, {
        status: 'Declined',
        respondedAt: new Date(),
      });
      
      res.json({ message: "Request declined" });
    } catch (error) {
      res.status(400).json({ message: "Failed to decline request" });
    }
  });

  // Cancel a money request (by requester) - PROTECTED: requires authentication
  app.post("/api/finapay/requests/:id/cancel", ensureAuthenticated, async (req, res) => {
    try {
      const request = await storage.getPeerRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // SECURITY: Only the requester can cancel their own request (use session, not body)
      if (request.requesterId !== req.session?.userId) {
        return res.status(403).json({ message: "Not authorized to cancel this request" });
      }
      
      if (request.status !== 'Pending') {
        return res.status(400).json({ message: "Request is no longer pending" });
      }
      
      await storage.updatePeerRequest(request.id, {
        status: 'Cancelled',
        respondedAt: new Date(),
      });
      
      res.json({ message: "Request cancelled" });
    } catch (error) {
      res.status(400).json({ message: "Failed to cancel request" });
    }
  });

  // Get QR code for receiving money (user's profile QR) - PROTECTED: requires owner or admin
  app.get("/api/finapay/qr/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user || !user.finatradesId) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const qrPayload = `FTPAY:${user.finatradesId}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);
      
      const displayId = user.customFinatradesId || user.finatradesId;
      res.json({ qrCodeDataUrl, finatradesId: displayId });
    } catch (error) {
      res.status(400).json({ message: "Failed to generate QR code" });
    }
  });

  // Admin: Get all peer transfers
  app.get("/api/admin/finapay/peer-transfers", ensureAdminAsync, requirePermission('manage_deposits', 'manage_withdrawals', 'view_transactions', 'manage_transactions'), async (req, res) => {
    try {
      const transfers = await storage.getAllPeerTransfers().catch(() => []);
      res.json({ transfers });
    } catch (error) {
      console.error('Failed to get peer transfers:', error);
      res.json({ transfers: [] });
    }
  });

  // Admin: Get all peer requests
  app.get("/api/admin/finapay/peer-requests", ensureAdminAsync, requirePermission('manage_deposits', 'manage_withdrawals', 'view_transactions', 'manage_transactions'), async (req, res) => {
    try {
      const requests = await storage.getAllPeerRequests().catch(() => []);
      res.json({ requests });
    } catch (error) {
      console.error('Failed to get peer requests:', error);
      res.json({ requests: [] });
    }
  });

  // ============================================================================
  // FINAPAY - PENDING TRANSFERS (Accept/Reject incoming transfers)
  // ============================================================================

  // Get pending incoming transfers for a user - PROTECTED: requires owner or admin
  app.get("/api/finapay/pending/incoming/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const transfers = await storage.getPendingIncomingTransfers(req.params.userId);
      res.json({ transfers });
    } catch (error) {
      res.status(400).json({ message: "Failed to get pending transfers" });
    }
  });

  // Get pending outgoing transfers for a user - PROTECTED: requires owner or admin
  app.get("/api/finapay/pending/outgoing/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const transfers = await storage.getPendingOutgoingTransfers(req.params.userId);
      res.json({ transfers });
    } catch (error) {
      res.status(400).json({ message: "Failed to get pending transfers" });
    }
  });

  // Accept a pending transfer - PROTECTED: requires authentication
  app.post("/api/finapay/pending/:id/accept", ensureAuthenticated, idempotencyMiddleware, async (req, res) => {
    try {
      const transfer = await storage.getPeerTransfer(req.params.id);
      
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }
      
      // SECURITY: Only the recipient can accept
      if (transfer.recipientId !== req.session?.userId) {
        return res.status(403).json({ message: "Not authorized to accept this transfer" });
      }
      
      if (transfer.status !== 'Pending') {
        return res.status(400).json({ message: "Transfer is no longer pending" });
      }
      
      // Check if transfer has expired
      if (transfer.expiresAt && new Date() > new Date(transfer.expiresAt)) {
        await storage.updatePeerTransfer(transfer.id, {
          status: 'Expired',
          respondedAt: new Date(),
        });
        return res.status(400).json({ message: "Transfer has expired" });
      }
      
      // Get sender and recipient info
      const sender = await storage.getUser(transfer.senderId);
      const recipient = await storage.getUser(transfer.recipientId);
      if (!sender || !recipient) {
        return res.status(404).json({ message: "Users not found" });
      }
      
      // Get wallets
      const recipientWallet = await storage.getWallet(recipient.id);
      if (!recipientWallet) {
        return res.status(400).json({ message: "Recipient wallet not found" });
      }
      
      // Platform is gold-only - all transfers are gold
      const goldAmount = parseFloat(transfer.amountGold?.toString() || '0');
      let goldPrice = transfer.goldPriceUsdPerGram ? parseFloat(transfer.goldPriceUsdPerGram.toString()) : 139.44;
      
      if (goldAmount <= 0) {
        return res.status(400).json({ message: "Invalid transfer: no gold amount found" });
      }
      
      // Get the source wallet type from sender's transaction
      let senderTxInfo: any = null;
      if (transfer.senderTransactionId) {
        senderTxInfo = await storage.getTransaction(transfer.senderTransactionId);
      }
      const sourceWalletType = senderTxInfo?.goldWalletType || 'LGPW';
      
      // For FGPW transfers: Consume FGPW batches now and calculate receiver's LGPW grams
      let receiverGoldGrams = goldAmount; // Default for LGPW (1:1)
      let fgpwConversionResult: any = null;
      
      if (sourceWalletType === 'FGPW') {
        // Use STORED price from send time (auto-unlock guarantee per PDF documentation)
        // goldPrice is already set from transfer.goldPriceUsdPerGram above
        
        // Preview FGPW consumption to validate and calculate receiver grams
        // Actual consumption will happen inside the transaction block for atomicity
        const { previewFpgwBatches } = await import('./fpgw-batch-service');
        const fgpwPreview = await previewFpgwBatches(sender.id, goldAmount, 'Available');
        
        if (!fgpwPreview.success) {
          return res.status(400).json({ 
            message: fgpwPreview.error || 'Insufficient FGPW balance to complete transfer'
          });
        }
        
        // Calculate receiver's LGPW grams = USD value / stored price
        fgpwConversionResult = fgpwPreview;
        receiverGoldGrams = fgpwPreview.weightedValueUsd / goldPrice;
        
        console.log(`[P2P-FGPW Accept] Will convert ${goldAmount}g FGPW (USD ${fgpwPreview.weightedValueUsd.toFixed(2)}) -> ${receiverGoldGrams.toFixed(6)}g LGPW at ${goldPrice.toFixed(2)}/g`);
      }
      
      // Process gold transfer - Credit recipient
      const result = await storage.withTransaction(async (txStorage) => {
        const generatedCertificates: any[] = [];
        const generateWingoldRef = () => `WG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        // For FGPW transfers: Consume batches inside transaction for atomicity
        if (sourceWalletType === 'FGPW') {
          const { consumeFpgwBatches, updateFpgwOwnershipSummary } = await import('./fpgw-batch-service');
          const txDb = txStorage.getDbClient();
          const consumeResult = await consumeFpgwBatches(sender.id, goldAmount, 'Available', txDb);
          
          if (!consumeResult.success) {
            throw new Error(consumeResult.error || 'Failed to consume FGPW batches');
          }
          
          // Use actual consumption result for receiver grams (not preview)
          receiverGoldGrams = consumeResult.weightedValueUsd / goldPrice;
          fgpwConversionResult = consumeResult;
          
          // Update sender's FGPW ownership summary inside transaction
          await updateFpgwOwnershipSummary(sender.id, txDb);
          
          console.log(`[P2P-FGPW Accept TX] Consumed ${goldAmount}g FGPW (USD ${consumeResult.weightedValueUsd.toFixed(2)}) -> ${receiverGoldGrams.toFixed(6)}g LGPW from sender ${sender.id}`);
        }
          
          // Helper to issue certificates
          const issueCertificates = async (userId: string, txId: string, holdingId: string, wingoldRef: string, grams: number) => {
            if (!holdingId || grams <= 0) return null;
            
            const docCertNum = await txStorage.generateCertificateNumber('Digital Ownership');
            const digitalCert = await txStorage.createCertificate({
              certificateNumber: docCertNum,
              userId,
              transactionId: txId,
              vaultHoldingId: holdingId,
              type: 'Digital Ownership',
              status: 'Active',
              goldGrams: grams.toFixed(6),
              goldPriceUsdPerGram: goldPrice.toFixed(2),
              totalValueUsd: (grams * goldPrice).toFixed(2),
              issuer: 'Finatrades Finance SA',
              vaultLocation: 'Dubai - Wingold & Metals DMCC',
              wingoldStorageRef: wingoldRef
            });
            generatedCertificates.push(digitalCert);
            
            const pscCertNum = await txStorage.generateCertificateNumber('Physical Storage');
            const storageCert = await txStorage.createCertificate({
              certificateNumber: pscCertNum,
              userId,
              transactionId: txId,
              vaultHoldingId: holdingId,
              type: 'Physical Storage',
              status: 'Active',
              goldGrams: grams.toFixed(6),
              goldPriceUsdPerGram: goldPrice.toFixed(2),
              totalValueUsd: (grams * goldPrice).toFixed(2),
              issuer: 'Wingold and Metals DMCC',
              vaultLocation: 'Dubai - Wingold & Metals DMCC',
              wingoldStorageRef: wingoldRef
            });
            generatedCertificates.push(storageCert);
            
            return wingoldRef;
          };
          
          // 1. Credit recipient wallet gold
          // For FGPW transfers: use converted LGPW grams; For LGPW: use original amount
          const recipientGoldBalance = parseFloat(recipientWallet.goldGrams?.toString() || '0');
          const creditGrams = sourceWalletType === 'FGPW' ? receiverGoldGrams : goldAmount;
          await txStorage.updateWallet(recipientWallet.id, {
            goldGrams: (recipientGoldBalance + creditGrams).toFixed(6)
          });
          
          // 2. Create recipient transaction
          // For FGPW: receiver gets LGPW, so record the converted grams
          const recipientDescription = sourceWalletType === 'FGPW' && fgpwConversionResult
            ? `Received ${creditGrams.toFixed(4)}g gold from ${sender.firstName} ${sender.lastName} (converted from ${goldAmount.toFixed(4)}g FGPW at ${goldPrice.toFixed(2)}/g)`
            : transfer.memo || `Received ${creditGrams.toFixed(4)}g gold from ${sender.firstName} ${sender.lastName}`;
            
          const recipientTx = await txStorage.createTransaction({
            userId: recipient.id,
            type: 'Receive',
            status: 'Completed',
            amountGold: creditGrams.toFixed(6),
            amountUsd: (creditGrams * goldPrice).toFixed(2),
            goldPriceUsdPerGram: goldPrice.toFixed(2),
            senderEmail: sender.email,
            description: recipientDescription,
            referenceId: transfer.referenceNumber,
            sourceModule: 'finapay',
            goldWalletType: 'LGPW', // Receiver ALWAYS gets LGPW
            completedAt: new Date(),
          });
          
          // 3. Update or create recipient vault holding
          const recipientHoldings = await txStorage.getUserVaultHoldings(recipient.id);
          let recipientHoldingId: string;
          let recipientWingoldRef: string;
          
          if (recipientHoldings.length > 0) {
            const rHolding = recipientHoldings[0];
            const rGold = parseFloat(rHolding.goldGrams?.toString() || '0');
            recipientWingoldRef = generateWingoldRef();
            await txStorage.updateVaultHolding(rHolding.id, {
              goldGrams: (rGold + creditGrams).toFixed(6),
              wingoldStorageRef: recipientWingoldRef
            });
            recipientHoldingId = rHolding.id;
          } else {
            recipientWingoldRef = generateWingoldRef();
            const newHolding = await txStorage.createVaultHolding({
              userId: recipient.id,
              goldGrams: creditGrams.toFixed(6),
              vaultLocation: 'Dubai - Wingold & Metals DMCC',
              wingoldStorageRef: recipientWingoldRef,
              purchasePriceUsdPerGram: goldPrice.toFixed(2),
              isPhysicallyDeposited: false
            });
            recipientHoldingId = newHolding.id;
          }
          
          // 4. Issue certificates for recipient
          await issueCertificates(recipient.id, recipientTx.id, recipientHoldingId, recipientWingoldRef, creditGrams);
          
          // 5. Update transfer status
          await txStorage.updatePeerTransfer(transfer.id, {
            status: 'Completed',
            respondedAt: new Date(),
            recipientTransactionId: recipientTx.id,
          });
          
          // 5b. Update sender's transaction to Completed
          if (transfer.senderTransactionId) {
            await txStorage.updateTransaction(transfer.senderTransactionId, {
              status: 'Completed',
              description: `Sent ${goldAmount.toFixed(4)}g gold to ${recipient.firstName} ${recipient.lastName}`,
              completedAt: new Date(),
            });
            
            // 5c. Create Transfer Certificate for sender
            const senderCertNum = await txStorage.generateCertificateNumber('Transfer');
            await txStorage.createCertificate({
              certificateNumber: senderCertNum,
              userId: sender.id,
              transactionId: transfer.senderTransactionId,
              type: 'Transfer',
              status: 'Active',
              goldGrams: goldAmount.toFixed(6),
              goldPriceUsdPerGram: goldPrice.toFixed(2),
              totalValueUsd: (goldAmount * goldPrice).toFixed(2),
              issuer: 'Finatrades Finance SA',
              fromUserId: sender.id,
              toUserId: recipient.id,
              issuedAt: new Date(),
            });
          }
          
          // 5d. Create Transfer Certificate for recipient
          const recipientCertNum = await txStorage.generateCertificateNumber('Transfer');
          await txStorage.createCertificate({
            certificateNumber: recipientCertNum,
            userId: recipient.id,
            transactionId: recipientTx.id,
            type: 'Transfer',
            status: 'Active',
            goldGrams: goldAmount.toFixed(6),
            goldPriceUsdPerGram: goldPrice.toFixed(2),
            totalValueUsd: (goldAmount * goldPrice).toFixed(2),
            issuer: 'Finatrades Finance SA',
            fromUserId: sender.id,
            toUserId: recipient.id,
            issuedAt: new Date(),
          });
          
          // 6. Record ledger entry for recipient
          const { vaultLedgerService } = await import('./vault-ledger-service');
          await vaultLedgerService.recordLedgerEntry({
            userId: recipient.id,
            action: 'Transfer_Receive',
            goldGrams: goldAmount,
            goldPriceUsdPerGram: goldPrice,
            fromWallet: 'FinaPay',
            toWallet: 'FinaPay',
            fromStatus: 'Available',
            toStatus: 'Available',
            transactionId: recipientTx.id,
            counterpartyUserId: sender.id,
            notes: `Accepted ${goldAmount.toFixed(4)}g gold from ${sender.firstName} ${sender.lastName}`,
            createdBy: 'system',
          });
          
          return { recipientTx, certificates: generatedCertificates };
        });
        
        // Emit real-time sync event
        emitLedgerEvent(recipient.id, {
          type: 'balance_update',
          module: 'finapay',
          action: 'gold_received',
          data: { goldGrams: goldAmount, senderId: sender.id },
        });
        emitLedgerEvent(sender.id, {
          type: 'transfer_accepted',
          module: 'finapay',
          action: 'transfer_completed',
          data: { transferId: transfer.id, recipientId: recipient.id },
        });
        
      // Send transfer_completed email to sender (their gold was successfully delivered)
      if (sender.email) {
        sendEmail(sender.email, EMAIL_TEMPLATES.TRANSFER_COMPLETED, {
          user_name: `${sender.firstName} ${sender.lastName}`,
          recipient_name: `${recipient.firstName} ${recipient.lastName}`,
          gold_amount: goldAmount.toFixed(4),
        }, { userId: sender.id, recipientName: sender.firstName || undefined }).catch(err => console.error('[Email] Transfer completed (sender) failed:', err));
      }

      // Send transfer_completed email to recipient (they received gold)
      if (recipient.email) {
        sendEmail(recipient.email, EMAIL_TEMPLATES.TRANSFER_COMPLETED, {
          user_name: `${recipient.firstName} ${recipient.lastName}`,
          recipient_name: `${recipient.firstName} ${recipient.lastName}`,
          gold_amount: goldAmount.toFixed(4),
        }, { userId: recipient.id, recipientName: recipient.firstName || undefined }).catch(err => console.error('[Email] Transfer completed (recipient) failed:', err));
      }

      // Create bell notifications for both parties
      await storage.createNotification({
        userId: recipient.id,
        title: 'Transfer Received',
        message: `You received ${goldAmount.toFixed(4)}g gold from ${sender.firstName} ${sender.lastName}.`,
        type: 'transaction',
        link: '/finapay',
      });
      
      await storage.createNotification({
        userId: sender.id,
        title: 'Transfer Accepted',
        message: `${recipient.firstName} ${recipient.lastName} accepted your transfer of ${goldAmount.toFixed(4)}g gold.`,
        type: 'transaction',
        link: '/finapay',
      });
      
      res.json({ 
        message: `Accepted ${goldAmount.toFixed(4)}g gold from ${sender.firstName} ${sender.lastName}`,
        transaction: result.recipientTx,
        certificates: result.certificates
      });
      
    } catch (error) {
      console.error('[Routes] Error accepting transfer:', error);
      notifyError({ error: error instanceof Error ? error : new Error(String(error)), context: 'Transfer Accept Failed', route: req.originalUrl, userId: req.session?.userId || undefined });
      res.status(400).json({ message: "Failed to accept transfer" });
    }
  });

  // Reject a pending transfer - PROTECTED: requires authentication
  app.post("/api/finapay/pending/:id/reject", ensureAuthenticated, async (req, res) => {
    try {
      const { reason } = req.body;
      const transfer = await storage.getPeerTransfer(req.params.id);
      
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }
      
      // SECURITY: Only the recipient can reject
      if (transfer.recipientId !== req.session?.userId) {
        return res.status(403).json({ message: "Not authorized to reject this transfer" });
      }
      
      if (transfer.status !== 'Pending') {
        return res.status(400).json({ message: "Transfer is no longer pending" });
      }
      
      // Get sender and recipient info
      const sender = await storage.getUser(transfer.senderId);
      const recipient = await storage.getUser(transfer.recipientId);
      if (!sender) {
        return res.status(404).json({ message: "Sender not found" });
      }
      
      // Refund the sender
      const senderWallet = await storage.getWallet(sender.id);
      if (!senderWallet) {
        return res.status(400).json({ message: "Sender wallet not found" });
      }
      
      // Platform is gold-only - all transfers are gold
      const goldAmount = parseFloat(transfer.amountGold?.toString() || '0');
      const goldPrice = transfer.goldPriceUsdPerGram ? parseFloat(transfer.goldPriceUsdPerGram.toString()) : 139.44;
      
      if (goldAmount <= 0) {
        return res.status(400).json({ message: "Invalid transfer: no gold amount found" });
      }
      
      // Refund gold to sender's wallet only (Send deducted from wallet, not vault)
        const senderGoldBalance = parseFloat(senderWallet.goldGrams?.toString() || '0');
        await storage.updateWallet(senderWallet.id, {
          goldGrams: (senderGoldBalance + goldAmount).toFixed(6)
        });
        
        // NOTE: We do NOT update vault holding because Send only deducted from wallet
        // Updating vault would create a double credit (wallet + vault = 2x the gold)
        
        // Create refund transaction for sender
        await storage.createTransaction({
          userId: sender.id,
          type: 'Refund',
          status: 'Completed',
          amountGold: goldAmount.toFixed(6),
          amountUsd: (goldAmount * goldPrice).toFixed(2),
          goldPriceUsdPerGram: goldPrice.toFixed(2),
          description: `Transfer to ${recipient?.firstName || 'user'} was rejected${reason ? `: ${reason}` : ''}`,
          referenceId: transfer.referenceNumber,
          sourceModule: 'finapay',
            goldWalletType: 'LGPW',
          completedAt: new Date(),
        });
        
      // Record ledger entry
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: sender.id,
        action: 'Transfer_Refund',
        goldGrams: goldAmount,
        goldPriceUsdPerGram: goldPrice,
        fromWallet: 'External',
        toWallet: 'FinaPay',
        toStatus: 'Available',
        notes: `Transfer rejected by ${recipient?.firstName || 'recipient'}${reason ? `: ${reason}` : ''}`,
        createdBy: 'system',
      });

      try {
        const { restoreToCert } = await import('./cert-ledger-service');
        await restoreToCert(storage, sender.id, goldAmount, 'FINAPAY_REFUND', transfer.id, null, `Transfer rejected by ${recipient?.firstName || 'recipient'}`);
      } catch (certErr) {
        console.error('[CertLedger] Failed to restore certs on transfer rejection:', certErr);
      }
      
      // Update transfer status
      await storage.updatePeerTransfer(transfer.id, {
        status: 'Rejected',
        respondedAt: new Date(),
        rejectionReason: reason || null,
      });
      
      // Emit real-time sync events
      emitLedgerEvent(sender.id, {
        type: 'balance_update',
        module: 'finapay',
        action: 'transfer_rejected',
        data: { transferId: transfer.id, refunded: true },
      });
      
      // Send email notification to sender
      if (sender.email) {
        sendEmailDirect(
          sender.email,
          `Your transfer to ${recipient?.firstName || 'user'} was rejected`,
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Transfer Rejected</h1>
            </div>
            <div style="padding: 30px; background: #ffffff;">
              <p>Hello ${sender.firstName},</p>
              <p>${recipient?.firstName || 'The recipient'} has rejected your transfer. The funds have been returned to your wallet.</p>
              <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="font-size: 28px; font-weight: bold; color: #dc2626; margin: 0;">
                  ${goldAmount.toFixed(4)}g Gold Refunded
                </p>
                ${reason ? `<p style="color: #6b7280; margin: 10px 0; font-style: italic;">"${reason}"</p>` : ''}
              </div>
              <p style="text-align: center; margin-top: 30px;">
                <a href="https://finatrades.com/dashboard" style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Dashboard</a>
              </p>
            </div>
          </div>
          `
        ).catch(err => console.error('[Email] Failed to send transfer rejected notification:', err));
      }
      
      // Create bell notification for sender
      await storage.createNotification({
        userId: sender.id,
        title: 'Transfer Rejected',
        message: `${recipient?.firstName || 'Recipient'} rejected your transfer of ${goldAmount.toFixed(4)}g gold. Funds refunded to your wallet.`,
        type: 'transaction',
        link: '/finapay',
      });
      
      res.json({ message: "Transfer rejected. Funds have been returned to sender." });
    } catch (error) {
      console.error('[Routes] Error rejecting transfer:', error);
      res.status(400).json({ message: "Failed to reject transfer" });
    }
  });

  // Cancel a pending outgoing transfer (by sender) - PROTECTED: requires authentication
  app.post("/api/finapay/pending/:id/cancel", ensureAuthenticated, async (req, res) => {
    try {
      const { reason } = req.body;
      const transfer = await storage.getPeerTransfer(req.params.id);

      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }

      // SECURITY: Only the sender can cancel their own outgoing transfer
      if (transfer.senderId !== req.session?.userId) {
        return res.status(403).json({ message: "Not authorized to cancel this transfer" });
      }

      if (transfer.status !== 'Pending') {
        return res.status(400).json({ message: "Transfer is no longer pending and cannot be cancelled" });
      }

      const sender = await storage.getUser(transfer.senderId);
      if (!sender) {
        return res.status(404).json({ message: "Sender not found" });
      }

      // For registered P2P transfers: recipientId is the actual recipient user
      // For invitation (unregistered) transfers: recipientId may be a placeholder — use recipientIdentifier (email)
      const isInviteTransfer = !!(transfer.recipientIdentifier && transfer.recipientIdentifier.includes('@') && transfer.recipientId === transfer.senderId);
      const recipient = isInviteTransfer ? null : await storage.getUser(transfer.recipientId);
      // The display name for the cancelled transfer recipient
      const recipientDisplayName = recipient
        ? `${recipient.firstName} ${recipient.lastName}`.trim()
        : (transfer.recipientIdentifier || 'the intended recipient');

      const goldAmount = parseFloat(transfer.amountGold?.toString() || '0');
      const goldPrice = transfer.goldPriceUsdPerGram ? parseFloat(transfer.goldPriceUsdPerGram.toString()) : 139.44;

      // Determine which wallet type was used by inspecting the sender's transaction record
      // LGPW: deducted from wallet at send time — must be refunded on cancel
      // FGPW: NOT deducted at send time (batches consumed only at accept time) — no wallet refund needed
      let sourceWalletType: 'LGPW' | 'FGPW' = 'LGPW'; // default to LGPW (safe)
      if (transfer.senderTransactionId) {
        const senderTxRecord = await storage.getTransaction(transfer.senderTransactionId).catch(() => null);
        if (senderTxRecord?.goldWalletType === 'FGPW') {
          sourceWalletType = 'FGPW';
        }
      }

      if (sourceWalletType === 'LGPW') {
        // LGPW: refund gold to sender's LGPW wallet (it was debited at send time)
        const senderWallet = await storage.getWallet(sender.id);
        if (senderWallet) {
          const senderGoldBalance = parseFloat(senderWallet.goldGrams?.toString() || '0');
          await storage.updateWallet(senderWallet.id, {
            goldGrams: (senderGoldBalance + goldAmount).toFixed(6),
          });
          // Restore cert ledger
          try {
            const { restoreToCert } = await import('./cert-ledger-service');
            await restoreToCert(storage, sender.id, goldAmount, 'FINAPAY_REFUND', transfer.id, null, `Transfer cancelled by sender${reason ? `: ${reason}` : ''}`);
          } catch (certErr) {
            console.error('[CertLedger] Failed to restore certs on transfer cancellation:', certErr);
          }
        }

        // Create refund transaction for sender (LGPW only)
        await storage.createTransaction({
          userId: sender.id,
          type: 'Refund',
          status: 'Completed',
          amountGold: goldAmount.toFixed(6),
          amountUsd: (goldAmount * goldPrice).toFixed(2),
          goldPriceUsdPerGram: goldPrice.toFixed(2),
          description: `Transfer to ${recipientDisplayName} was cancelled${reason ? `: ${reason}` : ''}`,
          referenceId: transfer.referenceNumber,
          sourceModule: 'finapay',
          goldWalletType: 'LGPW',
          completedAt: new Date(),
        });
      } else {
        // FGPW: nothing was debited yet — just void the pending transaction record
        if (transfer.senderTransactionId) {
          await storage.updateTransaction(transfer.senderTransactionId, {
            status: 'Cancelled',
            description: `FGPW transfer to ${recipientDisplayName} was cancelled${reason ? `: ${reason}` : ''}`,
          }).catch(err => console.error('[Routes] Failed to void FGPW sender tx on cancel:', err));
        }
        console.log(`[Routes] FGPW pending transfer ${transfer.id} cancelled — no wallet refund needed (batches not yet consumed)`);
      }

      // Update transfer status
      await storage.updatePeerTransfer(transfer.id, {
        status: 'Cancelled',
        respondedAt: new Date(),
        rejectionReason: reason || 'Cancelled by sender',
      });

      // Emit real-time sync event
      emitLedgerEvent(sender.id, {
        type: 'balance_update',
        module: 'finapay',
        action: 'transfer_cancelled',
        data: { transferId: transfer.id, refunded: true },
      });

      // Send transfer_cancelled email to sender (confirming gold returned)
      if (sender.email) {
        sendEmail(sender.email, EMAIL_TEMPLATES.TRANSFER_CANCELLED, {
          user_name: `${sender.firstName} ${sender.lastName}`,
          recipient_name: recipientDisplayName,
          gold_amount: goldAmount.toFixed(4),
          cancellation_reason: reason || 'Cancelled by sender',
        }, { userId: sender.id, recipientName: sender.firstName || undefined }).catch(err => console.error('[Email] Transfer cancelled (sender) failed:', err));
      }

      // Send transfer_cancelled email to the intended recipient:
      // - Registered recipients: email them directly using their user record
      // - Unregistered (invitation) transfers: email the recipientIdentifier address directly
      if (recipient?.email) {
        sendEmail(recipient.email, EMAIL_TEMPLATES.TRANSFER_CANCELLED, {
          user_name: `${recipient.firstName} ${recipient.lastName}`,
          recipient_name: `${recipient.firstName} ${recipient.lastName}`,
          gold_amount: goldAmount.toFixed(4),
          cancellation_reason: reason || 'Transfer was cancelled by the sender',
        }, { userId: recipient.id, recipientName: recipient.firstName || undefined }).catch(err => console.error('[Email] Transfer cancelled (recipient) failed:', err));
      } else if (isInviteTransfer && transfer.recipientIdentifier && transfer.recipientIdentifier.includes('@')) {
        // Send to unregistered email — no userId tracking since they haven't registered yet
        sendEmail(transfer.recipientIdentifier, EMAIL_TEMPLATES.TRANSFER_CANCELLED, {
          user_name: transfer.recipientIdentifier,
          recipient_name: transfer.recipientIdentifier,
          gold_amount: goldAmount.toFixed(4),
          cancellation_reason: reason || 'The sender has cancelled this pending transfer',
        }).catch(err => console.error('[Email] Transfer cancelled (unregistered recipient) failed:', err));
      }

      // Bell notification for sender
      await storage.createNotification({
        userId: sender.id,
        title: 'Transfer Cancelled',
        message: `Your transfer of ${goldAmount.toFixed(4)}g gold has been cancelled. Funds returned to your wallet.`,
        type: 'transaction',
        link: '/finapay',
      }).catch(() => {});

      // Bell notification for recipient if they exist
      if (recipient) {
        await storage.createNotification({
          userId: recipient.id,
          title: 'Pending Transfer Cancelled',
          message: `A pending transfer of ${goldAmount.toFixed(4)}g gold from ${sender.firstName} ${sender.lastName} was cancelled.`,
          type: 'transaction',
          link: '/finapay',
        }).catch(() => {});
      }

      res.json({ message: "Transfer cancelled. Funds have been returned to your wallet." });
    } catch (error) {
      console.error('[Routes] Error cancelling transfer:', error);
      res.status(400).json({ message: "Failed to cancel transfer" });
    }
  });

  // Get user's transfer approval preference - PROTECTED: requires owner or admin
  // Note: requireTransferApproval is always true for security
  app.get("/api/finapay/preferences/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const preferences = await storage.getUserPreferences(req.params.userId);
      res.json({ 
        requireTransferApproval: true, // Always enabled for security
        transferApprovalTimeout: preferences?.transferApprovalTimeout || 24
      });
    } catch (error) {
