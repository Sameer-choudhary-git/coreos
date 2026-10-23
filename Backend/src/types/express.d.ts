export {};

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        email: string;
        name: string;
        role: "APPLICANT" | "KYC_OFFICER" | "COMPLIANCE_OFFICER";
      };
    }
  }
}