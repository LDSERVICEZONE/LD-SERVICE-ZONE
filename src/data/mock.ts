// Production-safe shared content only. No transaction, wallet, customer, KPI, admin,
// recharge-plan, support-ticket, or demo-user data belongs in this module.
export const BRAND = {
  name: "LD SERVICE ZONE",
  tagline: "Digital services, recharge & bill payments in one place.",
  supportPhone: "",
  supportEmail: "",
};

export const SERVICES_CATALOG = [
  { id: "S001", category: "Government", name: "Voter ID Card", processingTime: "7-15 days", customerPrice: 100, commission: 40, documents: ["Aadhaar", "DOB Proof"] },
  { id: "S002", category: "Government", name: "Driving Licence", processingTime: "15-30 days", customerPrice: 500, commission: 100, documents: ["Aadhaar", "Medical Cert", "Age Proof"] },
  { id: "S003", category: "Government", name: "RC Smart Card", processingTime: "10-20 days", customerPrice: 400, commission: 80, documents: ["RC Book", "Insurance", "PUC"] },
  { id: "S004", category: "Tax", name: "ITR-1 Filing", processingTime: "Same day", customerPrice: 299, commission: 120, documents: ["PAN", "Form 16", "Bank Statement"] },
  { id: "S005", category: "Tax", name: "GST Registration", processingTime: "3-7 days", customerPrice: 999, commission: 300, documents: ["PAN", "Aadhaar", "Business Proof"] },
  { id: "S007", category: "PAN", name: "New PAN Card", processingTime: "7-15 days", customerPrice: 107, commission: 32, documents: ["Aadhaar", "DOB Proof", "Photograph"] },
];
