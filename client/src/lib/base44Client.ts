// Mock client
export const base44 = {
  auth: {
    currentUser: null,
    signIn: async () => {},
    signOut: async () => {},
  },
  integrations: {
    Core: {
      InvokeLLM: async () => {},
      SendEmail: async () => {},
      UploadFile: async () => {},
      GenerateImage: async () => {},
      ExtractDataFromUploadedFile: async () => {},
      CreateFileSignedUrl: async () => {},
      UploadPrivateFile: async () => {},
    }
  }
};
