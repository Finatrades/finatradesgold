import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, Upload, CheckCircle2, AlertCircle, Camera, FileText, User, Building, RefreshCw, Clock, Plus, Trash2, Landmark, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

interface BeneficialOwner {
  name: string;
  passportNumber: string;
  emailId: string;
  shareholdingPercentage: number;
}


const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' }, { code: 'AO', name: 'Angola' }, { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' }, { code: 'AM', name: 'Armenia' }, { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' }, { code: 'AZ', name: 'Azerbaijan' }, { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' }, { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' }, { code: 'BE', name: 'Belgium' }, { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' }, { code: 'BT', name: 'Bhutan' }, { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' }, { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgaria' }, { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' }, { code: 'KH', name: 'Cambodia' }, { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' }, { code: 'CV', name: 'Cape Verde' }, { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' }, { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' }, { code: 'KM', name: 'Comoros' }, { code: 'CG', name: 'Congo' },
  { code: 'CR', name: 'Costa Rica' }, { code: 'HR', name: 'Croatia' }, { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' }, { code: 'CZ', name: 'Czech Republic' }, { code: 'DK', name: 'Denmark' },
  { code: 'DJ', name: 'Djibouti' }, { code: 'DM', name: 'Dominica' }, { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' }, { code: 'EG', name: 'Egypt' }, { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea' }, { code: 'ER', name: 'Eritrea' }, { code: 'EE', name: 'Estonia' },
  { code: 'ET', name: 'Ethiopia' }, { code: 'FJ', name: 'Fiji' }, { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' }, { code: 'GA', name: 'Gabon' }, { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' }, { code: 'DE', name: 'Germany' }, { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' }, { code: 'GD', name: 'Grenada' }, { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' }, { code: 'GW', name: 'Guinea-Bissau' }, { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' }, { code: 'HN', name: 'Honduras' }, { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' }, { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' }, { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' }, { code: 'IT', name: 'Italy' }, { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' }, { code: 'JO', name: 'Jordan' }, { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' }, { code: 'KI', name: 'Kiribati' }, { code: 'KP', name: 'North Korea' },
  { code: 'KR', name: 'South Korea' }, { code: 'KW', name: 'Kuwait' }, { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' }, { code: 'LV', name: 'Latvia' }, { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' }, { code: 'LR', name: 'Liberia' }, { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' }, { code: 'LT', name: 'Lithuania' }, { code: 'LU', name: 'Luxembourg' },
  { code: 'MK', name: 'North Macedonia' }, { code: 'MG', name: 'Madagascar' }, { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' }, { code: 'MV', name: 'Maldives' }, { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' }, { code: 'MH', name: 'Marshall Islands' }, { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' }, { code: 'MX', name: 'Mexico' }, { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' }, { code: 'MC', name: 'Monaco' }, { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' }, { code: 'MA', name: 'Morocco' }, { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' }, { code: 'NA', name: 'Namibia' }, { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' }, { code: 'NL', name: 'Netherlands' }, { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' }, { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Norway' }, { code: 'OM', name: 'Oman' }, { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' }, { code: 'PA', name: 'Panama' }, { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Peru' }, { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' }, { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' }, { code: 'RU', name: 'Russia' }, { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' }, { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' }, { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' }, { code: 'ST', name: 'Sao Tome and Principe' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'SN', name: 'Senegal' }, { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' }, { code: 'SL', name: 'Sierra Leone' }, { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' }, { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' }, { code: 'ZA', name: 'South Africa' }, { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' }, { code: 'LK', name: 'Sri Lanka' }, { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' }, { code: 'SZ', name: 'Eswatini' }, { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' }, { code: 'SY', name: 'Syria' }, { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' }, { code: 'TZ', name: 'Tanzania' }, { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' }, { code: 'TG', name: 'Togo' }, { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' }, { code: 'TN', name: 'Tunisia' }, { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' }, { code: 'TV', name: 'Tuvalu' }, { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' }, { code: 'AE', name: 'United Arab Emirates' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' }, { code: 'UY', name: 'Uruguay' }, { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' }, { code: 'VA', name: 'Vatican City' }, { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' }, { code: 'YE', name: 'Yemen' }, { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' }
];

const SOURCE_OF_FUNDS_OPTIONS = [
  'Employment Income',
  'Business Income',
  'Investments',
  'Inheritance',
  'Savings',
  'Pension',
  'Sale of Property',
  'Gift',
  'Other'
];

const OCCUPATION_OPTIONS = [
  'Employed',
  'Self-Employed',
  'Business Owner',
  'Retired',
  'Student',
  'Homemaker',
  'Unemployed',
  'Other'
];

export default function KYC() {
  const { user, refreshUser } = useAuth();
  const { addNotification } = useNotifications();
  const [, setLocation] = useLocation();
  
  // Fetch KYC mode from server
  const { data: kycModeData, isLoading: modeLoading } = useQuery({
    queryKey: ['/api/kyc-mode'],
    queryFn: async () => {
      const res = await fetch('/api/kyc-mode');
      if (!res.ok) throw new Error('Failed to fetch KYC mode');
      return res.json();
    }
  });
  
  // Fetch existing KYC submission status
  const { data: existingKycData, isLoading: kycLoading } = useQuery({
    queryKey: ['/api/kyc-status', user?.id, user?.accountType],
    queryFn: async () => {
      if (!user?.id) return null;
      const endpoint = user.accountType === 'business' 
        ? `/api/finatrades-kyc/corporate/${user.id}`
        : `/api/finatrades-kyc/personal/${user.id}`;
      const res = await fetch(endpoint);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id
  });
  
  const existingSubmission = existingKycData?.submission;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Finatrades mode state - shared between personal and corporate
  const [finatradesStep, setFinatradesStep] = useState<'personal_info' | 'documents' | 'liveness' | 'complete'>('personal_info');
  
  // Personal Information (pre-filled from user where available)
  const [personalFullName, setPersonalFullName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');
  const [personalCountry, setPersonalCountry] = useState('');
  const [personalCity, setPersonalCity] = useState('');
  const [personalAddress, setPersonalAddress] = useState('');
  const [personalPostalCode, setPersonalPostalCode] = useState('');
  const [personalNationality, setPersonalNationality] = useState('');
  const [personalOccupation, setPersonalOccupation] = useState('');
  const [personalSourceOfFunds, setPersonalSourceOfFunds] = useState('');
  const [personalAccountType, setPersonalAccountType] = useState('personal');
  const [personalDateOfBirth, setPersonalDateOfBirth] = useState('');
  
  // Document uploads
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);
  
  // Document expiry dates (for notification reminders)
  const [passportExpiryDate, setPassportExpiryDate] = useState('');
  
  // Pre-fill data from user profile
  useEffect(() => {
    if (user) {
      setPersonalFullName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
      setPersonalEmail(user.email || '');
      setPersonalPhone(user.phoneNumber || '');
      setPersonalAddress(user.address || '');
      setPersonalCountry(user.country || '');
      setPersonalAccountType(user.accountType || 'personal');
    }
  }, [user]);
  
  // Get allowed countries from server settings
  const blockedCountries = kycModeData?.blockedCountries || [];
  const availableCountries = COUNTRIES.filter(c => !blockedCountries.includes(c.code));
  
  // Corporate questionnaire state
  const [corporateStep, setCorporateStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [corporateRegNumber, setCorporateRegNumber] = useState('');
  const [incorporationDate, setIncorporationDate] = useState('');
  const [countryOfIncorporation, setCountryOfIncorporation] = useState('');
  const [companyType, setCompanyType] = useState<'public' | 'private'>('private');
  const [natureOfBusiness, setNatureOfBusiness] = useState('');
  const [numberOfEmployees, setNumberOfEmployees] = useState('');
  const [headOfficeAddress, setHeadOfficeAddress] = useState('');
  const [telephoneNumber, setTelephoneNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [tradingContactName, setTradingContactName] = useState('');
  const [tradingContactEmail, setTradingContactEmail] = useState('');
  const [tradingContactPhone, setTradingContactPhone] = useState('');
  const [financeContactName, setFinanceContactName] = useState('');
  const [financeContactEmail, setFinanceContactEmail] = useState('');
  const [financeContactPhone, setFinanceContactPhone] = useState('');
  
  // Beneficial owners
  const [beneficialOwners, setBeneficialOwners] = useState<BeneficialOwner[]>([
    { name: '', passportNumber: '', emailId: '', shareholdingPercentage: 0 }
  ]);
  const [shareholderCompanyUbos, setShareholderCompanyUbos] = useState('');
  const [hasPepOwners, setHasPepOwners] = useState(false);
  const [pepDetails, setPepDetails] = useState('');
  
  // Corporate documents
  const [corpDocs, setCorpDocs] = useState<{
    certificateOfIncorporation?: File;
    tradeLicense?: File;
    memorandumArticles?: File;
    shareholderList?: File;
    uboPassports?: File;
    boardResolution?: File;
    authorizedSignatoryList?: File;
    bankAccountDetails?: File;
    financialStatements?: File;
    taxCertificate?: File;
    pepSelfDeclaration?: File;
  }>({});
  
  // Corporate document expiry dates (for notification reminders)
  const [tradeLicenseExpiryDate, setTradeLicenseExpiryDate] = useState('');
  const [directorPassportExpiryDate, setDirectorPassportExpiryDate] = useState('');
  
  // Pre-fill expiry dates from existing submission
  useEffect(() => {
    if (existingSubmission) {
      // Personal KYC expiry date
      if (existingSubmission.passportExpiryDate) {
        setPassportExpiryDate(existingSubmission.passportExpiryDate);
      }
      // Corporate KYC expiry dates
      if (existingSubmission.tradeLicenseExpiryDate) {
        setTradeLicenseExpiryDate(existingSubmission.tradeLicenseExpiryDate);
      }
      if (existingSubmission.directorPassportExpiryDate) {
        setDirectorPassportExpiryDate(existingSubmission.directorPassportExpiryDate);
      }
    }
  }, [existingSubmission]);
  
  // Liveness camera state (shared between modes)
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousFrameRef = useRef<ImageData | null>(null);
  const movementCountRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [livenessVerified, setLivenessVerified] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [movementProgress, setMovementProgress] = useState(0);
  const [instruction, setInstruction] = useState('Position your face in the circle');

  const startLivenessCamera = useCallback(async () => {
    setCameraError(null);
    setIsCameraReady(false);
    setLivenessVerified(false);
    setCapturedSelfie(null);
    setMovementProgress(0);
    movementCountRef.current = 0;
    previousFrameRef.current = null;
    setInstruction('Position your face in the circle');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      setCameraStream(stream);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(err.name === 'NotAllowedError' 
        ? 'Camera access denied. Please allow camera access.'
        : 'Unable to access camera. Please check your device settings.');
    }
  }, []);

  const stopLivenessCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsCameraReady(false);
  }, [cameraStream]);

  const captureSelfiPhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current && isCameraReady) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedSelfie(dataUrl);
        stopLivenessCamera();
        toast.success('Liveness verified! Photo captured.');
      }
    }
  }, [isCameraReady, stopLivenessCamera]);

  const detectMovement = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady || livenessVerified) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    if (previousFrameRef.current) {
      const prev = previousFrameRef.current.data;
      const curr = currentFrame.data;
      let diffSum = 0;
      const sampleStep = 16;
      
      for (let i = 0; i < curr.length; i += 4 * sampleStep) {
        diffSum += Math.abs(curr[i] - prev[i]);
        diffSum += Math.abs(curr[i + 1] - prev[i + 1]);
        diffSum += Math.abs(curr[i + 2] - prev[i + 2]);
      }
      
      const avgDiff = diffSum / (curr.length / (4 * sampleStep));
      
      if (avgDiff > 8) {
        movementCountRef.current += 1;
        const newProgress = Math.min((movementCountRef.current / 25) * 100, 100);
        setMovementProgress(newProgress);
        
        if (movementCountRef.current >= 10 && movementCountRef.current < 20) {
          setInstruction('Keep moving... Turn your head slowly');
        } else if (movementCountRef.current >= 20) {
          setInstruction('Perfect! Capturing...');
        }
        
        if (movementCountRef.current >= 25) {
          setLivenessVerified(true);
          captureSelfiPhoto();
          return;
        }
      }
    }
    
    previousFrameRef.current = currentFrame;
    animationFrameRef.current = requestAnimationFrame(detectMovement);
  }, [isCameraReady, livenessVerified, captureSelfiPhoto]);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
        setIsCameraReady(true);
        setInstruction('Now slowly turn your head left and right');
      };
    }
  }, [cameraStream]);

  useEffect(() => {
    if (isCameraReady && cameraStream && !livenessVerified) {
      const timeoutId = setTimeout(() => {
        detectMovement();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isCameraReady, cameraStream, livenessVerified, detectMovement]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraStream]);

  const retakeLiveness = useCallback(() => {
    setCapturedSelfie(null);
    setLivenessVerified(false);
    startLivenessCamera();
  }, [startLivenessCamera]);
  
  const handleCorpDocUpload = (e: React.ChangeEvent<HTMLInputElement>, type: keyof typeof corpDocs) => {
    if (e.target.files && e.target.files[0]) {
      setCorpDocs(prev => ({...prev, [type]: e.target.files![0]}));
      toast.success('Document uploaded successfully');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // === FINATRADES PERSONAL KYC SUBMISSION ===
  const handleFinatradesPersonalSubmit = async () => {
    if (!user) return;
    
    // Validate personal information
    if (!personalFullName || !personalEmail || !personalPhone || !personalCountry || 
        !personalCity || !personalAddress || !personalNationality || 
        !personalOccupation || !personalSourceOfFunds || !personalDateOfBirth) {
      toast.error("Please complete all personal information fields");
      return;
    }
    
    // Validate required documents
    if (!idFrontFile || !idBackFile || !addressProofFile) {
      toast.error("Please upload all required documents");
      return;
    }
    
    if (!capturedSelfie) {
      toast.error("Please complete liveness verification");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert documents to base64
      const idFrontBase64 = await fileToBase64(idFrontFile);
      const idBackBase64 = await fileToBase64(idBackFile);
      const addressProofBase64 = await fileToBase64(addressProofFile);
      const passportBase64 = passportFile ? await fileToBase64(passportFile) : null;
      
      const response = await fetch('/api/finatrades-kyc/personal', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          userId: user.id,
          personalInformation: {
            fullName: personalFullName,
            email: personalEmail,
            phone: personalPhone,
            dateOfBirth: personalDateOfBirth,
            nationality: personalNationality,
            country: personalCountry,
            city: personalCity,
            address: personalAddress,
            postalCode: personalPostalCode,
            occupation: personalOccupation,
            sourceOfFunds: personalSourceOfFunds,
            accountType: personalAccountType
          },
          documents: {
            idFront: { url: idFrontBase64, uploaded: true },
            idBack: { url: idBackBase64, uploaded: true },
            addressProof: { url: addressProofBase64, uploaded: true },
            passport: passportBase64 ? { url: passportBase64, uploaded: true } : null
          },
          passportExpiryDate: passportExpiryDate || null,
          livenessVerified: true,
          livenessCapture: capturedSelfie,
          status: 'In Progress'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit KYC');
      }
      
      await refreshUser();
      
      addNotification({
        title: 'KYC Submitted Successfully',
        message: 'Your KYC has been submitted and is under review.',
        type: 'info'
      });
      
      toast.success("KYC Submitted Successfully", {
        description: "Your verification is now under review."
      });
      
      setLocation('/kyc');
    } catch (error) {
      toast.error("Submission Failed", {
        description: "Please try again later."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // === FINATRADES CORPORATE KYC SUBMISSION ===
  const handleFinatradesCorporateSubmit = async () => {
    if (!user) return;
    
    if (!capturedSelfie) {
      toast.error("Please complete representative liveness verification");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const docsPayload: Record<string, { url: string; uploaded: boolean }> = {};
      
      for (const [key, file] of Object.entries(corpDocs)) {
        if (file) {
          const base64 = await fileToBase64(file);
          docsPayload[key] = { url: base64, uploaded: true };
        }
      }
      
      const response = await fetch('/api/finatrades-kyc/corporate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          userId: user.id,
          companyName,
          registrationNumber: corporateRegNumber,
          incorporationDate,
          countryOfIncorporation,
          companyType,
          natureOfBusiness,
          numberOfEmployees,
          headOfficeAddress,
          telephoneNumber,
          website,
          emailAddress,
          tradingContactName,
          tradingContactEmail,
          tradingContactPhone,
          financeContactName,
          financeContactEmail,
          financeContactPhone,
          beneficialOwners: beneficialOwners.filter(o => o.name.trim()),
          shareholderCompanyUbos,
          hasPepOwners,
          pepDetails: hasPepOwners ? pepDetails : null,
          documents: docsPayload,
          tradeLicenseExpiryDate: tradeLicenseExpiryDate || null,
          directorPassportExpiryDate: directorPassportExpiryDate || null,
          representativeLiveness: capturedSelfie,
          status: 'In Progress'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit KYC');
      }
      
      await refreshUser();
      
      addNotification({
        title: 'Corporate KYC Submitted Successfully',
        message: 'Your KYC has been submitted and is under review.',
        type: 'info'
      });
      
      toast.success("Corporate KYC Submitted Successfully", {
        description: "Your verification is now under review."
      });
      
      setLocation('/kyc');
    } catch (error) {
      toast.error("Submission Failed", {
        description: "Please try again later."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addBeneficialOwner = () => {
    setBeneficialOwners([...beneficialOwners, { name: '', passportNumber: '', emailId: '', shareholdingPercentage: 0 }]);
  };

  const removeBeneficialOwner = (index: number) => {
    if (beneficialOwners.length > 1) {
      setBeneficialOwners(beneficialOwners.filter((_, i) => i !== index));
    }
  };

  const updateBeneficialOwner = (index: number, field: keyof BeneficialOwner, value: string | number) => {
    const updated = [...beneficialOwners];
    updated[index] = { ...updated[index], [field]: value };
    setBeneficialOwners(updated);
  };

  if (!user) {
    setLocation('/login');
    return null;
  }
  
  if (modeLoading || kycLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading verification...</p>
        </div>
      </div>
    );
  }
  
  // Show status page if user has already submitted KYC
  if (existingSubmission && ['In Progress', 'Pending Review'].includes(existingSubmission.status)) {
    const isCorporate = user?.accountType === 'business';
    const expectedDays = isCorporate ? '5 business days' : '24 hours';
    
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="min-h-screen py-12 bg-background">
          <div className="container mx-auto px-6 max-w-2xl">
            <Card className="border-green-200 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                  <Clock className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl text-green-800">Verification In Progress</CardTitle>
                <CardDescription className="text-base">
                  Your {isCorporate ? 'Corporate' : 'Personal'} KYC verification has been submitted and is under review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">Submitted Successfully</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Your documents and information have been received. Our compliance team is reviewing your submission.
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">Expected Processing Time</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    {expectedDays} - You will be notified via email once your verification is complete.
                  </p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-purple-800">What Happens Next?</span>
                  </div>
                  <ul className="text-sm text-purple-700 space-y-1 ml-8 list-disc">
                    <li>Our team reviews your submitted documents</li>
                    <li>You'll receive an email notification with the result</li>
                    <li>Once approved, all platform features will be unlocked</li>
                  </ul>
                </div>
                
                {existingSubmission.createdAt && (
                  <div className="text-center text-sm text-muted-foreground">
                    Submitted on: {new Date(existingSubmission.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-center pt-4">
                <Button variant="outline" onClick={() => setLocation('/dashboard')}>
                  Return to Dashboard
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  // Show rejected status with option to resubmit
  if (existingSubmission && existingSubmission.status === 'Rejected') {
    const isCorporate = user?.accountType === 'business';
    
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="min-h-screen py-12 bg-background">
          <div className="container mx-auto px-6 max-w-2xl">
            <Card className="border-red-200 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl text-red-800">Verification Rejected</CardTitle>
                <CardDescription className="text-base">
                  Unfortunately, your {isCorporate ? 'Corporate' : 'Personal'} KYC verification was not approved.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {existingSubmission.rejectionReason && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-800">Reason for Rejection</span>
                    </div>
                    <p className="text-sm text-red-700">
                      {existingSubmission.rejectionReason}
                    </p>
                  </div>
                )}
                
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-3 mb-2">
                    <RefreshCw className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-amber-800">What Can You Do?</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    Please review the rejection reason above and contact our support team for assistance. 
                    You may need to provide additional or corrected documents.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center gap-4 pt-4">
                <Button variant="outline" onClick={() => setLocation('/dashboard')}>
                  Return to Dashboard
                </Button>
                <Button variant="default" onClick={() => setLocation('/help')}>
                  Contact Support
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  // Show approved status
  if (existingSubmission && existingSubmission.status === 'Approved') {
    const isCorporate = user?.accountType === 'business';
    
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="min-h-screen py-12 bg-background">
          <div className="container mx-auto px-6 max-w-2xl">
            <Card className="border-green-200 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl text-green-800">Verification Approved</CardTitle>
                <CardDescription className="text-base">
                  Your {isCorporate ? 'Corporate' : 'Personal'} KYC verification has been approved.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">Full Access Granted</span>
                  </div>
                  <p className="text-sm text-green-700">
                    All platform features have been unlocked. You can now access all trading and financial services.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center pt-4">
                <Button variant="default" onClick={() => setLocation('/dashboard')}>
                  Go to Dashboard
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const isBusiness = user.accountType === 'business';

  // === FINATRADES MODE: PERSONAL ACCOUNT KYC ===
  if (!isBusiness) {
    const stepOrder = ['personal_info', 'documents', 'liveness', 'complete'];
    const currentStepIdx = stepOrder.indexOf(finatradesStep);
    const finatradesProgress = Math.round(((currentStepIdx + 1) / stepOrder.length) * 100);
    
    const isPersonalInfoComplete = personalFullName && personalEmail && personalPhone && 
      personalCountry && personalCity && personalAddress && personalNationality && 
      personalOccupation && personalSourceOfFunds && personalDateOfBirth;
    
    const isDocumentsComplete = idFrontFile && idBackFile && passportFile && passportExpiryDate && addressProofFile;
    
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="min-h-screen py-12 bg-background">
          <div className="container mx-auto px-6 max-w-4xl">
            
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-foreground mb-2">Identity Verification</h1>
              <p className="text-muted-foreground">
                Complete your identity verification to access all features.
              </p>
            </div>

            <div className="mb-8">
              <div className="flex justify-between text-sm font-medium text-muted-foreground mb-2">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Expected processing: 24 hours
                </span>
                <span>{finatradesProgress}%</span>
              </div>
              <Progress value={finatradesProgress} className="h-2 bg-muted" />
            </div>

            <div className="grid md:grid-cols-12 gap-8">
              
              {/* Sidebar Steps */}
              <div className="md:col-span-4 space-y-4">
                <StepItem 
                  title="Personal Information"
                  description="Your basic details" 
                  icon={<User className="w-5 h-5" />} 
                  isActive={finatradesStep === 'personal_info'} 
                  isCompleted={currentStepIdx > 0}
                />
                <StepItem 
                  title="Document Upload"
                  description="ID and address proof" 
                  icon={<FileText className="w-5 h-5" />} 
                  isActive={finatradesStep === 'documents'} 
                  isCompleted={currentStepIdx > 1}
                />
                <StepItem 
                  title="Liveness Check"
                  description="Verify your identity" 
                  icon={<Camera className="w-5 h-5" />} 
                  isActive={finatradesStep === 'liveness'} 
                  isCompleted={!!capturedSelfie && currentStepIdx >= 2}
                />
                <StepItem 
                  title="Complete"
                  description="Submit for review" 
                  icon={<CheckCircle2 className="w-5 h-5" />} 
                  isActive={finatradesStep === 'complete'} 
                  isCompleted={false}
                />
              </div>

              {/* Main Content */}
              <div className="md:col-span-8">
                <Card className="border-border shadow-sm">
                  
                  {/* STEP 1: Personal Information */}
                  {finatradesStep === 'personal_info' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Personal Information
                        </CardTitle>
                        <CardDescription>Please provide your personal details. Some fields are pre-filled from your profile.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label>Full Name <span className="text-red-500">*</span></Label>
                            <Input
                              value={personalFullName}
                              onChange={(e) => setPersonalFullName(e.target.value)}
                              placeholder="Enter your full legal name"
                              data-testid="input-full-name"
                            />
                          </div>
                          
                          <div>
                            <Label>Email <span className="text-red-500">*</span></Label>
                            <Input
                              type="email"
                              value={personalEmail}
                              onChange={(e) => setPersonalEmail(e.target.value)}
                              placeholder="your@email.com"
                              data-testid="input-email"
                            />
                          </div>
                          
                          <div>
                            <Label>Phone <span className="text-red-500">*</span></Label>
                            <Input
                              value={personalPhone}
                              onChange={(e) => setPersonalPhone(e.target.value)}
                              placeholder="+1 234 567 8900"
                              data-testid="input-phone"
                            />
                          </div>
                          
                          <div>
                            <Label>Date of Birth <span className="text-red-500">*</span></Label>
                            <Input
                              type="date"
                              value={personalDateOfBirth}
                              onChange={(e) => setPersonalDateOfBirth(e.target.value)}
                              data-testid="input-dob"
                            />
                          </div>
                          
                          <div>
                            <Label>Nationality <span className="text-red-500">*</span></Label>
                            <Select value={personalNationality} onValueChange={setPersonalNationality}>
                              <SelectTrigger data-testid="select-nationality">
                                <SelectValue placeholder="Select nationality" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {availableCountries.map((country) => (
                                  <SelectItem key={country.code} value={country.name}>{country.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Country of Residence <span className="text-red-500">*</span></Label>
                            <Select value={personalCountry} onValueChange={setPersonalCountry}>
                              <SelectTrigger data-testid="select-country">
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {availableCountries.map((country) => (
                                  <SelectItem key={country.code} value={country.name}>{country.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>City <span className="text-red-500">*</span></Label>
                            <Input
                              value={personalCity}
                              onChange={(e) => setPersonalCity(e.target.value)}
                              placeholder="Your city"
                              data-testid="input-city"
                            />
                          </div>
                          
                          <div className="col-span-2">
                            <Label>Address <span className="text-red-500">*</span></Label>
                            <Textarea
                              value={personalAddress}
                              onChange={(e) => setPersonalAddress(e.target.value)}
                              placeholder="Your full residential address"
                              data-testid="input-address"
                              rows={2}
                            />
                          </div>
                          
                          <div>
                            <Label>Postal Code</Label>
                            <Input
                              value={personalPostalCode}
                              onChange={(e) => setPersonalPostalCode(e.target.value)}
                              placeholder="Postal/ZIP code"
                              data-testid="input-postal"
                            />
                          </div>
                          
                          <div>
                            <Label>Occupation <span className="text-red-500">*</span></Label>
                            <Select value={personalOccupation} onValueChange={setPersonalOccupation}>
                              <SelectTrigger data-testid="select-occupation">
                                <SelectValue placeholder="Select occupation" />
                              </SelectTrigger>
                              <SelectContent>
                                {OCCUPATION_OPTIONS.map((occ) => (
                                  <SelectItem key={occ} value={occ}>{occ}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Source of Funds <span className="text-red-500">*</span></Label>
                            <Select value={personalSourceOfFunds} onValueChange={setPersonalSourceOfFunds}>
                              <SelectTrigger data-testid="select-source-funds">
                                <SelectValue placeholder="Select source" />
                              </SelectTrigger>
                              <SelectContent>
                                {SOURCE_OF_FUNDS_OPTIONS.map((src) => (
                                  <SelectItem key={src} value={src}>{src}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end">
                        <Button 
                          onClick={() => setFinatradesStep('documents')}
                          disabled={!isPersonalInfoComplete}
                          className="bg-primary text-white hover:bg-primary/90"
                          data-testid="button-continue-documents"
                        >
                          Continue to Documents
                        </Button>
                      </CardFooter>
                    </div>
                  )}

                  {/* STEP 2: Document Upload */}
                  {finatradesStep === 'documents' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Document Upload
                        </CardTitle>
                        <CardDescription>Upload clear photos of your identification documents.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Format requirements notice */}
                        <div className="p-3 bg-gray-50 border rounded-lg">
                          <p className="text-sm font-medium text-gray-700">Accepted Formats:</p>
                          <p className="text-xs text-gray-500">JPG, JPEG, PNG, PDF - Max file size: 5MB</p>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="p-4 border-2 border-dashed rounded-lg">
                            <Label className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4" />
                              ID Document (Front) <span className="text-red-500">*</span>
                            </Label>
                            <p className="text-xs text-muted-foreground mb-2">Format: JPG, PNG, or PDF</p>
                            <Input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={(e) => setIdFrontFile(e.target.files?.[0] || null)}
                              data-testid="input-id-front"
                            />
                            {idFrontFile && (
                              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> {idFrontFile.name}
                              </p>
                            )}
                          </div>
                          
                          <div className="p-4 border-2 border-dashed rounded-lg">
                            <Label className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4" />
                              ID Document (Back) <span className="text-red-500">*</span>
                            </Label>
                            <p className="text-xs text-muted-foreground mb-2">Format: JPG, PNG, or PDF</p>
                            <Input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={(e) => setIdBackFile(e.target.files?.[0] || null)}
                              data-testid="input-id-back"
                            />
                            {idBackFile && (
                              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> {idBackFile.name}
                              </p>
                            )}
                          </div>
                          
                          <div className="p-4 border-2 border-dashed rounded-lg">
                            <Label className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4" />
                              Passport <span className="text-red-500">*</span>
                            </Label>
                            <p className="text-xs text-muted-foreground mb-2">Format: JPG, PNG, or PDF</p>
                            <Input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={(e) => setPassportFile(e.target.files?.[0] || null)}
                              data-testid="input-passport"
                            />
                            {passportFile && (
                              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> {passportFile.name}
                              </p>
                            )}
                            <div className="mt-3">
                              <Label className="text-sm">Passport Expiry Date <span className="text-red-500">*</span></Label>
                              <p className="text-xs text-muted-foreground mb-1">We'll send you reminders before it expires</p>
                              <Input
                                type="date"
                                value={passportExpiryDate}
                                onChange={(e) => setPassportExpiryDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                data-testid="input-passport-expiry"
                              />
                            </div>
                          </div>
                          
                          <div className="p-4 border-2 border-dashed rounded-lg">
                            <Label className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4" />
                              Proof of Address <span className="text-red-500">*</span>
                            </Label>
                            <p className="text-xs text-muted-foreground mb-2">Utility bill, bank statement, or government letter (dated within 3 months). Format: JPG, PNG, or PDF</p>
                            <Input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={(e) => setAddressProofFile(e.target.files?.[0] || null)}
                              data-testid="input-address-proof"
                            />
                            {addressProofFile && (
                              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> {addressProofFile.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => setFinatradesStep('personal_info')}>Back</Button>
                        <Button 
                          onClick={() => setFinatradesStep('liveness')}
                          disabled={!isDocumentsComplete}
                          className="bg-primary text-white hover:bg-primary/90"
                          data-testid="button-continue-liveness"
                        >
                          Continue to Liveness Check
                        </Button>
                      </CardFooter>
                    </div>
                  )}

                  {/* STEP 3: Liveness Check */}
                  {finatradesStep === 'liveness' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <CardHeader>
                        <CardTitle>Liveness Check</CardTitle>
                        <CardDescription>We need to verify you're a real person. Follow the instructions below.</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center py-6">
                         <canvas ref={canvasRef} className="hidden" />
                         
                         {capturedSelfie && (
                           <div className="text-center">
                             <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-green-500 mx-auto mb-4">
                               <img src={capturedSelfie} alt="Verified selfie" className="w-full h-full object-cover" />
                             </div>
                             <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
                               <CheckCircle2 className="w-5 h-5" />
                               <span className="font-medium">Liveness Verified!</span>
                             </div>
                             <Button 
                               type="button"
                               onClick={retakeLiveness}
                               variant="outline"
                               className="gap-2"
                               data-testid="button-retake-liveness"
                             >
                               <RefreshCw className="w-4 h-4" />
                               Retake Photo
                             </Button>
                           </div>
                         )}

                         {!cameraStream && !capturedSelfie && (
                           <div className="text-center">
                             <div className="w-48 h-48 rounded-full bg-muted border-4 border-dashed border-border flex items-center justify-center mb-6">
                               <Camera className="w-16 h-16 text-muted-foreground" />
                             </div>
                             <Button 
                               type="button"
                               onClick={startLivenessCamera}
                               variant="secondary"
                               className="gap-2 mb-4"
                               data-testid="button-start-liveness"
                             >
                               <Camera className="w-5 h-5" />
                               Start Liveness Check
                             </Button>
                             <p className="text-xs text-muted-foreground max-w-xs">
                               Please ensure your face is well-lit and centered. No glasses or hats.
                             </p>
                           </div>
                         )}

                         {cameraError && (
                           <div className="text-center text-red-500 py-4">
                             <p>{cameraError}</p>
                             <Button type="button" onClick={startLivenessCamera} variant="outline" className="mt-2">
                               Try Again
                             </Button>
                           </div>
                         )}

                         {cameraStream && !capturedSelfie && (
                           <div className="relative w-full max-w-xs">
                             <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-primary">
                               <video
                                 ref={videoRef}
                                 autoPlay
                                 playsInline
                                 muted
                                 className="w-full h-full object-cover"
                                 style={{ transform: 'scaleX(-1)' }}
                               />
                               {!isCameraReady && (
                                 <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                   <p className="text-white text-sm">Loading camera...</p>
                                 </div>
                               )}
                             </div>
                             
                             {isCameraReady && (
                               <div className="mt-4 w-full">
                                 <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                   <span>Movement Detection</span>
                                   <span>{Math.round(movementProgress)}%</span>
                                 </div>
                                 <Progress value={movementProgress} className="h-2" />
                               </div>
                             )}
                             
                             <div className="mt-4 text-center">
                               <p className="text-sm font-medium text-primary animate-pulse">
                                 {instruction}
                               </p>
                               <p className="text-xs text-muted-foreground mt-2">
                                 Slowly turn your head left and right to verify liveness
                               </p>
                             </div>
                             
                             <div className="mt-4 flex justify-center">
                               <Button 
                                 type="button"
                                 onClick={stopLivenessCamera}
                                 variant="outline"
                                 size="sm"
                               >
                                 Cancel
                               </Button>
                             </div>
                           </div>
                         )}
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => { stopLivenessCamera(); setFinatradesStep('documents'); }}>Back</Button>
                        <Button 
                          onClick={handleFinatradesPersonalSubmit}
                          disabled={!capturedSelfie || isSubmitting}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold"
                          data-testid="button-submit-kyc"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit Verification'}
                        </Button>
                      </CardFooter>
                    </div>
                  )}

                </Card>

                <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">Bank-Grade Security</h4>
                    <p className="text-xs text-blue-700 mt-1">
                      Your data is encrypted using AES-256 and stored in compliant data centers. We never share your personal information without consent.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === FINATRADES MODE: CORPORATE ACCOUNT KYC ===
  if (isBusiness) {
    const corpProgress = Math.round((corporateStep / 5) * 100);
    
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="min-h-screen py-12 bg-background">
          <div className="container mx-auto px-6 max-w-5xl">
            
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-foreground mb-2">Corporate KYC Verification</h1>
              <p className="text-muted-foreground">
                Complete your corporate verification questionnaire.
              </p>
            </div>

            <div className="mb-8">
              <div className="flex justify-between text-sm font-medium text-muted-foreground mb-2">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Expected processing: 5 business days
                </span>
                <span>Step {corporateStep} of 5</span>
              </div>
              <Progress value={corpProgress} className="h-2 bg-muted" />
            </div>

            {/* Horizontal Tab/Card Navigation */}
            <div className="mb-8">
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { step: 1, title: 'Corporate Details', icon: <Building className="w-6 h-6" /> },
                  { step: 2, title: 'Beneficial Owners', icon: <User className="w-6 h-6" /> },
                  { step: 3, title: 'Documents', icon: <FileText className="w-6 h-6" /> },
                  { step: 4, title: 'Representative', icon: <Camera className="w-6 h-6" /> },
                  { step: 5, title: 'Review & Submit', icon: <CheckCircle2 className="w-6 h-6" /> },
                ].map(({ step, title, icon }) => {
                  const isActive = corporateStep === step;
                  const isCompleted = corporateStep > step;
                  
                  return (
                    <button
                      key={step}
                      onClick={() => {
                        if (isCompleted) setCorporateStep(step);
                      }}
                      disabled={!isCompleted && !isActive}
                      className={`
                        relative p-4 rounded-xl border-2 transition-all duration-200 text-center
                        ${isActive 
                          ? 'bg-primary border-primary text-white shadow-lg scale-105' 
                          : isCompleted 
                            ? 'bg-card border-primary/30 text-foreground hover:border-primary/50 cursor-pointer hover:shadow-md' 
                            : 'bg-muted/50 border-border text-muted-foreground cursor-not-allowed opacity-60'
                        }
                      `}
                      aria-selected={isActive}
                      data-testid={`tab-step-${step}`}
                    >
                      <div className={`
                        w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center
                        ${isActive 
                          ? 'bg-white/20' 
                          : isCompleted 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-muted'
                        }
                      `}>
                        {isCompleted && !isActive ? (
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        ) : (
                          icon
                        )}
                      </div>
                      <span className="text-xs font-medium leading-tight block">{title}</span>
                      {isActive && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-white rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto">
                <Card className="border-border shadow-sm">
                  
                  {/* STEP 1: Corporate Details */}
                  {corporateStep === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <CardHeader>
                        <CardTitle>Corporate Details</CardTitle>
                        <CardDescription>Enter your company's registration and contact information.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Company Name <span className="text-red-500">*</span></Label>
                            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company legal name" data-testid="input-company-name" />
                          </div>
                          <div className="space-y-2">
                            <Label>Registration Number <span className="text-red-500">*</span></Label>
                            <Input value={corporateRegNumber} onChange={(e) => setCorporateRegNumber(e.target.value)} placeholder="Company registration number" data-testid="input-reg-number" />
                          </div>
                          <div className="space-y-2">
                            <Label>Date of Incorporation</Label>
                            <Input type="date" value={incorporationDate} onChange={(e) => setIncorporationDate(e.target.value)} data-testid="input-incorporation-date" />
                          </div>
                          <div className="space-y-2">
                            <Label>Country of Incorporation</Label>
                            <Input value={countryOfIncorporation} onChange={(e) => setCountryOfIncorporation(e.target.value)} placeholder="Country" data-testid="input-country" />
                          </div>
                          <div className="space-y-2">
                            <Label>Company Type</Label>
                            <Select value={companyType} onValueChange={(v: 'public' | 'private') => setCompanyType(v)}>
                              <SelectTrigger data-testid="select-company-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="private">Private Company</SelectItem>
                                <SelectItem value="public">Public Company</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Number of Employees</Label>
                            <Select value={numberOfEmployees} onValueChange={setNumberOfEmployees}>
                              <SelectTrigger data-testid="select-employees">
                                <SelectValue placeholder="Select range" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1-10">1-10</SelectItem>
                                <SelectItem value="11-50">11-50</SelectItem>
                                <SelectItem value="51-200">51-200</SelectItem>
                                <SelectItem value="201-500">201-500</SelectItem>
                                <SelectItem value="500+">500+</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Nature of Business</Label>
                          <Textarea value={natureOfBusiness} onChange={(e) => setNatureOfBusiness(e.target.value)} placeholder="Describe your company's primary business activities" data-testid="input-nature-business" />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Head Office Address</Label>
                          <Textarea value={headOfficeAddress} onChange={(e) => setHeadOfficeAddress(e.target.value)} placeholder="Full address including city, state, postal code" data-testid="input-head-office" />
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Telephone</Label>
                            <Input value={telephoneNumber} onChange={(e) => setTelephoneNumber(e.target.value)} placeholder="+1 234 567 8900" data-testid="input-telephone" />
                          </div>
                          <div className="space-y-2">
                            <Label>Website</Label>
                            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://www.example.com" data-testid="input-website" />
                          </div>
                          <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="info@company.com" data-testid="input-email" />
                          </div>
                        </div>
                        
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-4">Contact Persons</h4>
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <h5 className="text-sm font-medium text-muted-foreground">Trading Contact</h5>
                              <Input value={tradingContactName} onChange={(e) => setTradingContactName(e.target.value)} placeholder="Full Name" data-testid="input-trading-name" />
                              <Input value={tradingContactEmail} onChange={(e) => setTradingContactEmail(e.target.value)} placeholder="Email" data-testid="input-trading-email" />
                              <Input value={tradingContactPhone} onChange={(e) => setTradingContactPhone(e.target.value)} placeholder="Phone" data-testid="input-trading-phone" />
                            </div>
                            <div className="space-y-3">
                              <h5 className="text-sm font-medium text-muted-foreground">Finance Contact</h5>
                              <Input value={financeContactName} onChange={(e) => setFinanceContactName(e.target.value)} placeholder="Full Name" data-testid="input-finance-name" />
                              <Input value={financeContactEmail} onChange={(e) => setFinanceContactEmail(e.target.value)} placeholder="Email" data-testid="input-finance-email" />
                              <Input value={financeContactPhone} onChange={(e) => setFinanceContactPhone(e.target.value)} placeholder="Phone" data-testid="input-finance-phone" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => setLocation('/dashboard')} data-testid="button-back-dashboard">
                          Back
                        </Button>
                        <Button 
                          onClick={() => {
                            if (!companyName.trim() || !corporateRegNumber.trim()) {
                              toast.error("Company name and registration number are required");
                              return;
                            }
                            setCorporateStep(2);
                          }}
                          className="bg-primary text-white hover:bg-primary/90"
                          data-testid="button-continue-step-2"
                        >
                          Continue
                        </Button>
                      </CardFooter>
                    </div>
                  )}

                  {/* STEP 2: Beneficial Owners */}
                  {corporateStep === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <CardHeader>
                        <CardTitle>Beneficial Owners & Shareholding</CardTitle>
                        <CardDescription>List all persons with more than 25% ownership or control. Include passport details.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {beneficialOwners.map((owner, index) => (
                          <div key={index} className="p-4 border rounded-lg space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium">Beneficial Owner {index + 1}</h4>
                              {beneficialOwners.length > 1 && (
                                <Button variant="ghost" size="sm" onClick={() => removeBeneficialOwner(index)}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input 
                                  value={owner.name} 
                                  onChange={(e) => updateBeneficialOwner(index, 'name', e.target.value)}
                                  placeholder="Full legal name"
                                  data-testid={`input-ubo-name-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Passport Number</Label>
                                <Input 
                                  value={owner.passportNumber}
                                  onChange={(e) => updateBeneficialOwner(index, 'passportNumber', e.target.value)}
                                  placeholder="Passport number"
                                  data-testid={`input-ubo-passport-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Email</Label>
                                <Input 
                                  value={owner.emailId}
                                  onChange={(e) => updateBeneficialOwner(index, 'emailId', e.target.value)}
                                  placeholder="Email address"
                                  data-testid={`input-ubo-email-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Shareholding %</Label>
                                <Input 
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={owner.shareholdingPercentage || ''}
                                  onChange={(e) => updateBeneficialOwner(index, 'shareholdingPercentage', parseFloat(e.target.value) || 0)}
                                  placeholder="Percentage"
                                  data-testid={`input-ubo-percentage-${index}`}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <Button variant="outline" onClick={addBeneficialOwner} className="w-full" data-testid="button-add-ubo">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Another Beneficial Owner
                        </Button>
                        
                        <div className="space-y-2">
                          <Label>Shareholder Company UBOs</Label>
                          <Textarea 
                            value={shareholderCompanyUbos}
                            onChange={(e) => setShareholderCompanyUbos(e.target.value)}
                            placeholder="If any shareholder is a company, list the ultimate beneficial owners of that company"
                            data-testid="input-shareholder-ubos"
                          />
                        </div>
                        
                        <div className="border-t pt-4 space-y-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="pep"
                              checked={hasPepOwners}
                              onCheckedChange={(checked) => setHasPepOwners(checked as boolean)}
                              data-testid="checkbox-pep"
                            />
                            <Label htmlFor="pep" className="text-sm">
                              Any beneficial owner is a Politically Exposed Person (PEP) or related to a PEP
                            </Label>
                          </div>
                          
                          {hasPepOwners && (
                            <div className="space-y-2">
                              <Label>PEP Details</Label>
                              <Textarea 
                                value={pepDetails}
                                onChange={(e) => setPepDetails(e.target.value)}
                                placeholder="Provide details about the PEP status including name, position held, and relationship"
                                data-testid="input-pep-details"
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => setCorporateStep(1)}>Back</Button>
                        <Button 
                          onClick={() => setCorporateStep(3)}
                          className="bg-primary text-white hover:bg-primary/90"
                          data-testid="button-continue-step-3"
                        >
                          Continue
                        </Button>
                      </CardFooter>
                    </div>
                  )}

                  {/* STEP 3: Documents */}
                  {corporateStep === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <CardHeader>
                        <CardTitle>Corporate Documents</CardTitle>
                        <CardDescription>Upload required corporate documents. All documents should be certified copies or originals.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { key: 'certificateOfIncorporation', label: 'Certificate of Incorporation', required: true },
                          { key: 'tradeLicense', label: 'Trade License / Business License', required: false },
                          { key: 'memorandumArticles', label: 'Memorandum & Articles of Association', required: true },
                          { key: 'shareholderList', label: 'List of Shareholders', required: true },
                          { key: 'uboPassports', label: 'UBO Passports (all beneficial owners)', required: true },
                          { key: 'boardResolution', label: 'Board Resolution', required: false },
                          { key: 'authorizedSignatoryList', label: 'Authorized Signatory List', required: false },
                          { key: 'bankAccountDetails', label: 'Bank Account Details / Statement', required: false },
                          { key: 'financialStatements', label: 'Financial Statements (last 2 years)', required: false },
                          { key: 'taxCertificate', label: 'Tax Certificate / VAT Registration', required: false },
                          { key: 'pepSelfDeclaration', label: 'PEP Self-Declaration Form', required: hasPepOwners },
                        ].map((doc) => (
                          <div key={doc.key} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                corpDocs[doc.key as keyof typeof corpDocs] ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
                              }`}>
                                {corpDocs[doc.key as keyof typeof corpDocs] ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                              </div>
                              <div>
                                <span className="font-medium text-sm">{doc.label}</span>
                                {doc.required && <span className="text-red-500 ml-1">*</span>}
                                {corpDocs[doc.key as keyof typeof corpDocs] && (
                                  <p className="text-xs text-muted-foreground">{corpDocs[doc.key as keyof typeof corpDocs]?.name}</p>
                                )}
                              </div>
                            </div>
                            <div>
                              <input 
                                type="file" 
                                id={`doc-${doc.key}`} 
                                className="hidden" 
                                onChange={(e) => handleCorpDocUpload(e, doc.key as keyof typeof corpDocs)}
                              />
                              <label htmlFor={`doc-${doc.key}`}>
                                <Button variant="outline" size="sm" asChild>
                                  <span className="cursor-pointer">
                                    <Upload className="w-4 h-4 mr-1" />
                                    {corpDocs[doc.key as keyof typeof corpDocs] ? 'Replace' : 'Upload'}
                                  </span>
                                </Button>
                              </label>
                            </div>
                          </div>
                        ))}
                        
                        <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                          <h4 className="font-medium text-sm mb-3">Document Expiry Dates</h4>
                          <p className="text-xs text-muted-foreground mb-4">We'll send you reminders before your documents expire</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm">Trade License Expiry</Label>
                              <Input
                                type="date"
                                value={tradeLicenseExpiryDate}
                                onChange={(e) => setTradeLicenseExpiryDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                data-testid="input-trade-license-expiry"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Director Passport Expiry</Label>
                              <Input
                                type="date"
                                value={directorPassportExpiryDate}
                                onChange={(e) => setDirectorPassportExpiryDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                data-testid="input-director-passport-expiry"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => setCorporateStep(2)}>Back</Button>
                        <Button 
                          onClick={() => setCorporateStep(4)}
                          className="bg-primary text-white hover:bg-primary/90"
                          data-testid="button-continue-step-4"
                        >
                          Continue
                        </Button>
                      </CardFooter>
                    </div>
                  )}

                  {/* STEP 4: Representative Liveness */}
                  {corporateStep === 4 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <CardHeader>
                        <CardTitle>Authorized Representative Verification</CardTitle>
                        <CardDescription>The authorized representative must complete a liveness check to verify their identity.</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center py-6">
                         <canvas ref={canvasRef} className="hidden" />
                         
                         {capturedSelfie && (
                           <div className="text-center">
                             <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-green-500 mx-auto mb-4">
                               <img src={capturedSelfie} alt="Verified selfie" className="w-full h-full object-cover" />
                             </div>
                             <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
                               <CheckCircle2 className="w-5 h-5" />
                               <span className="font-medium">Liveness Verified!</span>
                             </div>
                             <Button 
                               type="button"
                               onClick={retakeLiveness}
                               variant="outline"
                               className="gap-2"
                               data-testid="button-retake-liveness"
                             >
                               <RefreshCw className="w-4 h-4" />
                               Retake Photo
                             </Button>
                           </div>
                         )}

                         {!cameraStream && !capturedSelfie && (
                           <div className="text-center">
                             <div className="w-48 h-48 rounded-full bg-muted border-4 border-dashed border-border flex items-center justify-center mb-6">
                               <Camera className="w-16 h-16 text-muted-foreground" />
                             </div>
                             <Button 
                               type="button"
                               onClick={startLivenessCamera}
                               variant="secondary"
                               className="gap-2 mb-4"
                               data-testid="button-start-liveness"
                             >
                               <Camera className="w-5 h-5" />
                               Start Liveness Check
                             </Button>
                             <p className="text-xs text-muted-foreground max-w-xs">
                               Please ensure your face is well-lit and centered. No glasses or hats.
                             </p>
                           </div>
                         )}

                         {cameraError && (
                           <div className="text-center text-red-500 py-4">
                             <p>{cameraError}</p>
                             <Button type="button" onClick={startLivenessCamera} variant="outline" className="mt-2">
                               Try Again
                             </Button>
                           </div>
                         )}

                         {cameraStream && !capturedSelfie && (
                           <div className="relative w-full max-w-xs">
                             <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-primary">
                               <video
                                 ref={videoRef}
                                 autoPlay
                                 playsInline
                                 muted
                                 className="w-full h-full object-cover"
                                 style={{ transform: 'scaleX(-1)' }}
                               />
                               {!isCameraReady && (
                                 <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                   <p className="text-white text-sm">Loading camera...</p>
                                 </div>
                               )}
                             </div>
                             
                             {isCameraReady && (
                               <div className="mt-4 w-full">
                                 <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                   <span>Movement Detection</span>
                                   <span>{Math.round(movementProgress)}%</span>
                                 </div>
                                 <Progress value={movementProgress} className="h-2" />
                               </div>
                             )}
                             
                             <div className="mt-4 text-center">
                               <p className="text-sm font-medium text-primary animate-pulse">
                                 {instruction}
                               </p>
                               <p className="text-xs text-muted-foreground mt-2">
                                 Slowly turn your head left and right to verify liveness
                               </p>
                             </div>
                             
                             <div className="mt-4 flex justify-center">
                               <Button 
                                 type="button"
                                 onClick={stopLivenessCamera}
                                 variant="outline"
                                 size="sm"
                               >
                                 Cancel
                               </Button>
                             </div>
                           </div>
                         )}
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => { stopLivenessCamera(); setCorporateStep(3); }}>Back</Button>
                        <Button 
                          onClick={() => setCorporateStep(5)}
                          disabled={!capturedSelfie}
                          className="bg-primary text-white hover:bg-primary/90"
                          data-testid="button-continue-step-5"
                        >
                          Continue
                        </Button>
                      </CardFooter>
                    </div>
                  )}

                  {/* STEP 5: Review & Submit */}
                  {corporateStep === 5 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <CardHeader>
                        <CardTitle>Review & Submit</CardTitle>
                        <CardDescription>Please review your submission before finalizing.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <h4 className="font-medium mb-2">Company Information</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <span className="text-muted-foreground">Company Name:</span>
                              <span>{companyName || '-'}</span>
                              <span className="text-muted-foreground">Registration Number:</span>
                              <span>{corporateRegNumber || '-'}</span>
                              <span className="text-muted-foreground">Country:</span>
                              <span>{countryOfIncorporation || '-'}</span>
                              <span className="text-muted-foreground">Company Type:</span>
                              <span className="capitalize">{companyType}</span>
                            </div>
                          </div>
                          
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <h4 className="font-medium mb-2">Beneficial Owners</h4>
                            <p className="text-sm text-muted-foreground">
                              {beneficialOwners.filter(o => o.name.trim()).length} beneficial owner(s) listed
                            </p>
                            {hasPepOwners && (
                              <p className="text-sm text-fuchsia-600 mt-1">PEP declaration included</p>
                            )}
                          </div>
                          
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <h4 className="font-medium mb-2">Documents Uploaded</h4>
                            <p className="text-sm text-muted-foreground">
                              {Object.keys(corpDocs).filter(k => corpDocs[k as keyof typeof corpDocs]).length} document(s) uploaded
                            </p>
                          </div>
                          
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <h4 className="font-medium mb-2">Representative Verification</h4>
                            <div className="flex items-center gap-2">
                              {capturedSelfie ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  <span className="text-sm text-green-600">Liveness verified</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                  <span className="text-sm text-red-500">Not verified</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
                          <p className="text-sm text-fuchsia-800">
                            By submitting this application, I confirm that all information provided is accurate and complete. 
                            I understand that providing false information may result in rejection or account termination.
                          </p>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => setCorporateStep(4)}>Back</Button>
                        <Button 
                          onClick={handleFinatradesCorporateSubmit}
                          disabled={isSubmitting || !capturedSelfie}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold"
                          data-testid="button-submit-corporate-kyc"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit Application'}
                        </Button>
                      </CardFooter>
                    </div>
                  )}

              </Card>

              <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-blue-900">Secure Processing</h4>
                  <p className="text-xs text-blue-700 mt-1">
                    Your corporate documents are encrypted and processed in compliance with international data protection regulations.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }


  // Fallback - should not reach here as all paths are covered above
  return null;
}

function StepItem({ title, description, icon, isActive, isCompleted }: { title: string, description: string, icon: React.ReactNode, isActive: boolean, isCompleted: boolean }) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
      isActive 
        ? 'bg-white border-primary shadow-sm ring-1 ring-primary/20' 
        : isCompleted 
          ? 'bg-muted/50 border-transparent opacity-80' 
          : 'bg-transparent border-transparent opacity-50'
    }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
        isActive ? 'bg-primary text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
      }`}>
        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : icon}
      </div>
      <div>
        <h3 className={`text-sm font-bold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
