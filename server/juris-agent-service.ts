import type { ChatAgent, ChatAgentWorkflow, User } from "@shared/schema";

// Juris AI Agent - Specialized for user registration and KYC guidance

interface JurisResponse {
  message: string;
  nextStep?: string;
  actions?: string[];
  collectData?: {
    field: string;
    type: 'text' | 'email' | 'phone' | 'select' | 'file';
    options?: string[];
    required?: boolean;
  };
  workflowUpdate?: {
    currentStep: string;
    completedSteps: number;
    stepData?: Record<string, any>;
  };
}

// Registration workflow steps
const REGISTRATION_STEPS = {
  welcome: {
    order: 1,
    message: "Welcome to Finatrades! I'm Juris, your registration assistant. I'll help you create your account.\n\nFirst, what type of account would you like to create?",
    collectData: { field: 'accountType', type: 'select' as const, options: ['Personal Account', 'Business Account'], required: true }
  },
  email: {
    order: 2,
    message: "Great choice! Now, please provide your email address. This will be your login credential.",
    collectData: { field: 'email', type: 'email' as const, required: true }
  },
  name: {
    order: 3,
    message: "Perfect! What is your full name?",
    collectData: { field: 'fullName', type: 'text' as const, required: true }
  },
  phone: {
    order: 4,
    message: "Thank you! Please provide your phone number with country code (e.g., +971 xxx xxx xxxx).",
    collectData: { field: 'phone', type: 'phone' as const, required: true }
  },
  password: {
    order: 5,
    message: "Almost done! Please create a secure password (at least 8 characters with numbers and special characters).",
    collectData: { field: 'password', type: 'text' as const, required: true }
  },
  confirm: {
    order: 6,
    message: "Excellent! Here's a summary of your registration:\n\n**Account Type:** {accountType}\n**Email:** {email}\n**Name:** {fullName}\n**Phone:** {phone}\n\nShall I create your account now?",
    collectData: { field: 'confirmation', type: 'select' as const, options: ['Yes, create my account', 'No, I need to make changes'], required: true }
  },
  complete: {
    order: 7,
    message: "Congratulations! Your Finatrades account has been created successfully!\n\nNext Steps:\n1. Check your email for verification link\n2. Complete your KYC verification to unlock all features\n3. Start trading gold!\n\nWould you like me to help you with KYC verification now?"
  }
};

// KYC workflow steps
const KYC_STEPS = {
  start: {
    order: 1,
    message: "I'll help you complete your KYC (Know Your Customer) verification. This is required to unlock higher transaction limits and full platform access.\n\n**Which verification level do you need?**",
    collectData: { field: 'kycLevel', type: 'select' as const, options: ['Basic (Tier 1) - Quick verification', 'Enhanced (Tier 2) - Full access', 'Corporate (Tier 3) - Business accounts'], required: true }
  },
  personalInfo: {
    order: 2,
    message: "Let's start with your personal information. Please provide your date of birth (DD/MM/YYYY).",
    collectData: { field: 'dateOfBirth', type: 'text' as const, required: true }
  },
  nationality: {
    order: 3,
    message: "What is your nationality/country of citizenship?",
    collectData: { field: 'nationality', type: 'text' as const, required: true }
  },
  address: {
    order: 4,
    message: "Please provide your current residential address (Street, City, Country, Postal Code).",
    collectData: { field: 'address', type: 'text' as const, required: true }
  },
  idDocument: {
    order: 5,
    message: "Now I need to verify your identity. Please upload one of the following:\n\n• Passport (recommended)\n• National ID Card\n• Driver's License\n\nMake sure the document is clear and all details are visible.",
    collectData: { field: 'idDocument', type: 'file' as const, required: true }
  },
  proofOfAddress: {
    order: 6,
    message: "Please upload a proof of address document (issued within last 3 months):\n\n• Utility bill\n• Bank statement\n• Government letter",
    collectData: { field: 'proofOfAddress', type: 'file' as const, required: true }
  },
  selfie: {
    order: 7,
    message: "Finally, please take a selfie holding your ID document. This helps us verify that you are the document owner.\n\n**Tips:**\n• Good lighting\n• Face and ID clearly visible\n• No filters or edits",
    collectData: { field: 'selfie', type: 'file' as const, required: true }
  },
  review: {
    order: 8,
    message: "Thank you! Your KYC documents have been submitted for review.\n\n**Processing Time:**\n• Basic verification: 1-2 hours\n• Enhanced verification: 1-2 business days\n• Corporate verification: 3-5 business days\n\nYou'll receive an email notification once your verification is complete.\n\nIs there anything else I can help you with?"
  }
};

// Intent detection for Juris
function detectJurisIntent(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Registration intents
  if (/\b(register|sign up|create account|new account|join|get started)\b/i.test(lowerMessage)) {
    return 'registration';
  }
  
  // KYC intents
  if (/\b(kyc|verify|verification|identity|document|upload|tier|limit)\b/i.test(lowerMessage)) {
    return 'kyc';
  }
  
  // Account type selection
  if (/\b(personal|individual|business|corporate|company)\b/i.test(lowerMessage)) {
    return 'account_type';
  }
  
  // Confirmation responses
  if (/\b(yes|confirm|proceed|create|submit|ok|okay|sure)\b/i.test(lowerMessage)) {
    return 'confirm';
  }
  
  if (/\b(no|cancel|change|edit|modify|back)\b/i.test(lowerMessage)) {
    return 'reject';
  }
  
  // Help
  if (/\b(help|what|how|explain|guide)\b/i.test(lowerMessage)) {
    return 'help';
  }
  
  return 'unknown';
}

// Process message with workflow context
export function processJurisMessage(
  message: string,
  workflow?: ChatAgentWorkflow,
  userData?: Partial<User>
): JurisResponse {
  const intent = detectJurisIntent(message);
  
  // If no active workflow, check what they want to do
  if (!workflow) {
    return handleNoWorkflow(message, intent, userData);
  }
  
  // Handle based on workflow type
  if (workflow.workflowType === 'registration') {
    return handleRegistrationWorkflow(message, intent, workflow);
  }
  
  if (workflow.workflowType === 'kyc') {
    return handleKycWorkflow(message, intent, workflow);
  }
  
  return {
    message: "I'm here to help with registration and KYC verification. What would you like to do?\n\n• Create a new account\n• Complete KYC verification\n• Check verification status",
    actions: ['Create Account', 'Start KYC', 'Check Status']
  };
}

function handleNoWorkflow(message: string, intent: string, userData?: Partial<User>): JurisResponse {
  // Check if user is logged in
  if (userData?.id) {
    // Existing user - offer KYC or account help
    const kycStatus = userData.kycStatus || 'not_started';
    
    if (intent === 'kyc' || intent === 'registration') {
      if (kycStatus === 'approved') {
        return {
          message: `Hello ${userData.firstName || 'there'}! Your KYC verification is already complete. You have full access to all platform features.\n\nIs there anything else I can help you with?`,
          actions: ['Check Limits', 'Account Settings', 'Talk to Support']
        };
      }
      
      return {
        message: `Hello ${userData.firstName || 'there'}! I can help you complete your KYC verification to unlock higher transaction limits.\n\nYour current status: **${formatKycStatus(kycStatus)}**\n\nWould you like to start or continue your verification?`,
        actions: ['Start KYC', 'Check Requirements', 'Talk to Support'],
        nextStep: 'start'
      };
    }
    
    return {
      message: `Hello ${userData.firstName || 'there'}! I'm Juris, your account assistant. How can I help you today?\n\n• Complete KYC verification\n• Check account status\n• Update account details`,
      actions: ['Start KYC', 'Account Status', 'Talk to Support']
    };
  }
  
  // New/guest user
  if (intent === 'registration') {
    const step = REGISTRATION_STEPS.welcome;
    return {
      message: step.message,
      collectData: step.collectData,
      nextStep: 'welcome',
      workflowUpdate: {
        currentStep: 'welcome',
        completedSteps: 0
      }
    };
  }
  
  if (intent === 'kyc') {
    return {
      message: "To complete KYC verification, you need to have an account first. Would you like me to help you create one?",
      actions: ['Create Account', 'I have an account (Login)']
    };
  }
  
  // Default greeting for guests
  return {
    message: "Hello! I'm Juris, your registration and verification assistant at Finatrades.\n\nI can help you with:\n• Creating a new account (Personal or Business)\n• KYC verification process\n• Account requirements and documents\n\nWhat would you like to do today?",
    actions: ['Create Account', 'Learn About KYC', 'Talk to General Support']
  };
}

function handleRegistrationWorkflow(message: string, intent: string, workflow: ChatAgentWorkflow): JurisResponse {
  const stepData = workflow.stepData ? JSON.parse(workflow.stepData) : {};
  const currentStep = workflow.currentStep;
  
  // Get step order
  const stepKeys = Object.keys(REGISTRATION_STEPS) as (keyof typeof REGISTRATION_STEPS)[];
  const currentIndex = stepKeys.indexOf(currentStep as keyof typeof REGISTRATION_STEPS);
  
  // Store user input for current step
  if (currentStep === 'welcome') {
    stepData.accountType = message.includes('Business') ? 'Business' : 'Personal';
  } else if (currentStep === 'email') {
    stepData.email = message.trim();
  } else if (currentStep === 'name') {
    stepData.fullName = message.trim();
  } else if (currentStep === 'phone') {
    stepData.phone = message.trim();
  } else if (currentStep === 'password') {
    stepData.password = '********'; // Don't store actual password in step data
  } else if (currentStep === 'confirm') {
    if (intent === 'reject') {
      return {
        message: "No problem! Which information would you like to change?\n\n1. Account Type: " + stepData.accountType + "\n2. Email: " + stepData.email + "\n3. Name: " + stepData.fullName + "\n4. Phone: " + stepData.phone,
        actions: ['Change Account Type', 'Change Email', 'Change Name', 'Change Phone', 'Continue Registration']
      };
    }
  }
  
  // Move to next step
  const nextIndex = currentIndex + 1;
  if (nextIndex >= stepKeys.length) {
    // Registration complete
    return {
      message: REGISTRATION_STEPS.complete.message,
      actions: ['Start KYC Now', 'Maybe Later'],
      workflowUpdate: {
        currentStep: 'complete',
        completedSteps: stepKeys.length,
        stepData
      }
    };
  }
  
  const nextStepKey = stepKeys[nextIndex];
  const nextStep = REGISTRATION_STEPS[nextStepKey];
  
  // Format message with collected data
  let responseMessage = nextStep.message;
  Object.keys(stepData).forEach(key => {
    responseMessage = responseMessage.replace(`{${key}}`, stepData[key]);
  });
  
  return {
    message: responseMessage,
    collectData: nextStep.collectData,
    nextStep: nextStepKey,
    workflowUpdate: {
      currentStep: nextStepKey,
      completedSteps: nextIndex,
      stepData
    }
  };
}

function handleKycWorkflow(message: string, intent: string, workflow: ChatAgentWorkflow): JurisResponse {
  const stepData = workflow.stepData ? JSON.parse(workflow.stepData) : {};
  const currentStep = workflow.currentStep;
  
  const stepKeys = Object.keys(KYC_STEPS) as (keyof typeof KYC_STEPS)[];
  const currentIndex = stepKeys.indexOf(currentStep as keyof typeof KYC_STEPS);
  
  // Store user input based on current step
  if (currentStep === 'start') {
    if (message.includes('Basic')) stepData.kycLevel = 'tier1';
    else if (message.includes('Enhanced')) stepData.kycLevel = 'tier2';
    else if (message.includes('Corporate')) stepData.kycLevel = 'tier3';
    else stepData.kycLevel = 'tier1';
  } else if (currentStep === 'personalInfo') {
    stepData.dateOfBirth = message.trim();
  } else if (currentStep === 'nationality') {
    stepData.nationality = message.trim();
  } else if (currentStep === 'address') {
    stepData.address = message.trim();
  }
  // File uploads would be handled separately
  
  // Move to next step
  const nextIndex = currentIndex + 1;
  if (nextIndex >= stepKeys.length) {
    return {
      message: KYC_STEPS.review.message,
      actions: ['Check Status', 'Contact Support'],
      workflowUpdate: {
        currentStep: 'review',
        completedSteps: stepKeys.length,
        stepData
      }
    };
  }
  
  const nextStepKey = stepKeys[nextIndex];
  const nextStep = KYC_STEPS[nextStepKey];
  
  return {
    message: nextStep.message,
    collectData: nextStep.collectData,
    nextStep: nextStepKey,
    workflowUpdate: {
      currentStep: nextStepKey,
      completedSteps: nextIndex,
      stepData
    }
  };
}

function formatKycStatus(status: string): string {
  switch (status) {
    case 'not_started': return 'Not Started';
    case 'pending': return 'Pending Review';
    case 'in_progress': return 'In Progress';
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    default: return status;
  }
}

export function getJurisGreeting(userName?: string, isLoggedIn?: boolean): string {
  if (isLoggedIn && userName) {
    return `Hello ${userName}! I'm Juris, your account and verification assistant. I can help you with:\n\n• KYC verification\n• Account status\n• Document requirements\n\nHow can I assist you today?`;
  }
  
  return "Hello! I'm Juris, your registration and verification assistant at Finatrades.\n\nI can help you:\n• Create a new account\n• Complete KYC verification\n• Understand document requirements\n\nWhat would you like to do?";
}
