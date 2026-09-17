export const SERVICE_SEED = [
  // Government Identity & Transport
  { id: "S001", category: "Government", name: "Voter ID Card", processingTime: "7-15 days", customerPrice: 100, commission: 40, documents: ["Aadhaar", "DOB Proof"], color: "#4F46E5" },
  { id: "VOTER-NEW", category: "Government", name: "New Voter ID", processingTime: "7-15 days", customerPrice: 100, commission: 40, documents: ["Aadhaar", "DOB Proof", "Photograph"], color: "#4F46E5" },
  { id: "VOTER-CORRECTION", category: "Government", name: "Voter ID Correction", processingTime: "7-15 days", customerPrice: 100, commission: 35, documents: ["Voter ID", "Aadhaar", "Supporting Proof"], color: "#F59E0B" },
  { id: "VOTER-ADDRESS", category: "Government", name: "Voter ID Address Change", processingTime: "7-15 days", customerPrice: 100, commission: 35, documents: ["Voter ID", "Address Proof"], color: "#06B6D4" },
  { id: "VOTER-DOWNLOAD", category: "Government", name: "Voter ID Download", processingTime: "Instant", customerPrice: 30, commission: 10, documents: ["EPIC Number", "Mobile Number"], color: "#10B981" },

  { id: "S002", category: "Government", name: "Driving Licence", processingTime: "15-30 days", customerPrice: 500, commission: 100, documents: ["Aadhaar", "Medical Cert", "Age Proof"], color: "#1D56D8" },
  { id: "DL-NEW", category: "Government", name: "New Driving Licence", processingTime: "15-30 days", customerPrice: 500, commission: 100, documents: ["Aadhaar", "Medical Cert", "Age Proof"], color: "#1D56D8" },
  { id: "DL-LEARNER", category: "Government", name: "Learner Licence", processingTime: "7-15 days", customerPrice: 300, commission: 70, documents: ["Aadhaar", "Age Proof"], color: "#4F46E5" },
  { id: "DL-RENEWAL", category: "Government", name: "Driving Licence Renewal", processingTime: "7-15 days", customerPrice: 400, commission: 80, documents: ["Driving Licence", "Aadhaar"], color: "#10B981" },
  { id: "DL-CORRECTION", category: "Government", name: "Driving Licence Correction", processingTime: "7-15 days", customerPrice: 400, commission: 75, documents: ["Driving Licence", "Supporting Proof"], color: "#F59E0B" },
  { id: "DL-DUPLICATE", category: "Government", name: "Duplicate Driving Licence", processingTime: "7-15 days", customerPrice: 450, commission: 90, documents: ["Driving Licence", "Aadhaar"], color: "#7C3AED" },

  { id: "S003", category: "Government", name: "RC Smart Card", processingTime: "10-20 days", customerPrice: 400, commission: 80, documents: ["RC Book", "Insurance", "PUC"], color: "#06B6D4" },
  { id: "RC-NEW", category: "Government", name: "New RC Smart Card", processingTime: "10-20 days", customerPrice: 400, commission: 80, documents: ["RC Book", "Insurance", "PUC"], color: "#06B6D4" },
  { id: "RC-TRANSFER", category: "Government", name: "RC Transfer", processingTime: "10-20 days", customerPrice: 500, commission: 100, documents: ["RC Book", "Sale Agreement", "Insurance"], color: "#4F46E5" },
  { id: "RC-CORRECTION", category: "Government", name: "RC Correction", processingTime: "10-20 days", customerPrice: 350, commission: 70, documents: ["RC Book", "Supporting Proof"], color: "#F59E0B" },
  { id: "RC-DUPLICATE", category: "Government", name: "Duplicate RC", processingTime: "10-20 days", customerPrice: 400, commission: 80, documents: ["Vehicle Details", "Insurance", "PUC"], color: "#7C3AED" },

  // Tax & Business
  { id: "S004", category: "Tax", name: "ITR-1 Filing", processingTime: "Same day", customerPrice: 299, commission: 120, documents: ["PAN", "Form 16", "Bank Statement"], color: "#10B981" },
  { id: "ITR-1-REVISED", category: "Tax", name: "Revised ITR-1", processingTime: "Same day", customerPrice: 399, commission: 150, documents: ["PAN", "Form 16", "Original ITR"], color: "#F59E0B" },
  { id: "S005", category: "Tax", name: "GST Registration", processingTime: "3-7 days", customerPrice: 999, commission: 300, documents: ["PAN", "Aadhaar", "Business Proof"], color: "#F59E0B" },
  { id: "GST-REG", category: "Tax", name: "New GST Registration", processingTime: "3-7 days", customerPrice: 999, commission: 300, documents: ["PAN", "Aadhaar", "Business Proof"], color: "#F59E0B" },
  { id: "GST-CORRECTION", category: "Tax", name: "GST Amendment", processingTime: "3-7 days", customerPrice: 699, commission: 200, documents: ["GSTIN", "Supporting Proof"], color: "#4F46E5" },

  // Certificates
  { id: "INCOME-NEW", category: "Certificate", name: "New Income Certificate", processingTime: "7-10 days", customerPrice: 150, commission: 50, documents: ["Aadhaar", "Ration Card"], color: "#7C3AED" },
  { id: "INCOME-RENEW", category: "Certificate", name: "Income Certificate Renewal", processingTime: "7-10 days", customerPrice: 150, commission: 45, documents: ["Old Certificate", "Aadhaar"], color: "#10B981" },
  { id: "CASTE-NEW", category: "Certificate", name: "New Caste Certificate", processingTime: "10-15 days", customerPrice: 100, commission: 40, documents: ["Aadhaar", "Old Caste Cert"], color: "#06B6D4" },
  { id: "CASTE-CORRECTION", category: "Certificate", name: "Caste Certificate Correction", processingTime: "10-15 days", customerPrice: 100, commission: 35, documents: ["Certificate", "Supporting Proof"], color: "#F59E0B" },

  // PAN Services
  { id: "S007", category: "PAN", name: "New PAN Card", processingTime: "7-15 days", customerPrice: 107, commission: 32, documents: ["Aadhaar", "DOB Proof", "Photograph"], color: "#F87171" },
  { id: "PAN-NEW", category: "PAN", name: "New PAN", processingTime: "7-15 days", customerPrice: 107, commission: 32, documents: ["Aadhaar", "DOB Proof", "Photograph"], color: "#F87171" },
  { id: "PAN-CORRECTION", category: "PAN", name: "PAN Correction", processingTime: "7-15 days", customerPrice: 107, commission: 28, documents: ["PAN Card", "Aadhaar", "Supporting Proof"], color: "#F59E0B" },
  { id: "PAN-REPRINT", category: "PAN", name: "PAN Reprint", processingTime: "7-15 days", customerPrice: 50, commission: 20, documents: ["PAN Number", "Aadhaar"], color: "#06B6D4" },
  { id: "PAN-UTI", category: "PAN", name: "UTI PAN", processingTime: "Instant / 3-5 days", customerPrice: 107, commission: 10, documents: ["Aadhaar", "Biometric / OTP"], color: "#7C3AED" },
  { id: "PAN-FIND", category: "PAN", name: "PAN Find", processingTime: "Instant", customerPrice: 20, commission: 10, documents: ["Aadhaar"], color: "#4F46E5" },
  { id: "PAN-NSDL", category: "PAN", name: "NSDL PAN", processingTime: "Instant / 2 hours", customerPrice: 107, commission: 10, documents: ["Aadhaar", "Biometric / OTP"], color: "#1D56D8" },
  { id: "PAN-UTI-STATUS", category: "PAN", name: "UTI PAN Status", processingTime: "Instant", customerPrice: 0, commission: 0, documents: ["Application / Coupon No"], color: "#10B981" },
  { id: "PAN-NSDL-STATUS", category: "PAN", name: "NSDL PAN Status", processingTime: "Instant", customerPrice: 0, commission: 0, documents: ["15-Digit Ack No"], color: "#06B6D4" },
  { id: "PAN-UTI-COUPON", category: "PAN", name: "UTI Coupon Add", processingTime: "Instant", customerPrice: 107, commission: 5, documents: ["UTI VLE ID"], color: "#F59E0B" },
  { id: "PAN-STATUS", category: "PAN", name: "PAN Status", processingTime: "Instant", customerPrice: 0, commission: 0, documents: ["Acknowledgement Number"], color: "#10B981" },
];

