import PptxGenJS from 'pptxgenjs';

const PURPLE_PRIMARY = '#8A2BE2';
const PURPLE_DARK = '#6B21A8';
const PURPLE_LIGHT = '#A855F7';
const WHITE = '#FFFFFF';
const DARK_TEXT = '#1F2937';

export async function generateFinatradesPresentation(): Promise<Buffer> {
  const pptx = new PptxGenJS();
  
  pptx.author = 'Finatrades';
  pptx.title = 'Finatrades - Gold-Backed Digital Financial Platform';
  pptx.subject = 'Government Partnership Proposal';
  pptx.company = 'Finatrades';

  // Slide 1: Title Slide
  const slide1 = pptx.addSlide();
  slide1.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: PURPLE_PRIMARY } });
  slide1.addText('FINATRADES', {
    x: 0.5, y: 2, w: '90%', h: 1.5,
    fontSize: 54, bold: true, color: WHITE, align: 'center',
    fontFace: 'Arial'
  });
  slide1.addText('Gold-Backed Digital Financial Platform', {
    x: 0.5, y: 3.5, w: '90%', h: 0.8,
    fontSize: 28, color: WHITE, align: 'center', fontFace: 'Arial'
  });
  slide1.addText('Partnership Proposal & Platform Overview', {
    x: 0.5, y: 4.5, w: '90%', h: 0.5,
    fontSize: 18, color: WHITE, align: 'center', fontFace: 'Arial', italic: true
  });
  slide1.addText('Confidential | Government Ministry Presentation', {
    x: 0.5, y: 5.3, w: '90%', h: 0.4,
    fontSize: 12, color: WHITE, align: 'center', fontFace: 'Arial'
  });

  // Slide 2: Executive Summary
  const slide2 = pptx.addSlide();
  addHeader(slide2, 'Executive Summary');
  slide2.addText([
    { text: 'Finatrades', options: { bold: true, color: PURPLE_PRIMARY } },
    { text: ' is a comprehensive gold-backed digital financial platform designed to modernize and democratize gold ownership and trading.' }
  ], { x: 0.5, y: 1.5, w: 9, h: 0.8, fontSize: 16, color: DARK_TEXT, fontFace: 'Arial' });
  
  const summaryPoints = [
    'Enable secure digital gold transactions with physical backing',
    'Provide transparent, regulated financial services',
    'Support economic diversification through gold-based assets',
    'Offer enterprise-grade security and compliance',
    'Create employment opportunities in fintech sector'
  ];
  
  summaryPoints.forEach((point, idx) => {
    slide2.addText(`• ${point}`, {
      x: 0.7, y: 2.5 + (idx * 0.5), w: 8.5, h: 0.5,
      fontSize: 14, color: DARK_TEXT, fontFace: 'Arial'
    });
  });

  // Slide 3: Platform Services
  const slide3 = pptx.addSlide();
  addHeader(slide3, 'Platform Services');
  
  const services = [
    { name: 'FinaPay', desc: 'Digital gold wallet for buying, selling, and transferring gold' },
    { name: 'FinaVault', desc: 'Secure physical gold storage with insurance coverage' },
    { name: 'FinaBridge', desc: 'Trade finance solutions for businesses' },
    { name: 'FinaCard', desc: 'Gold-backed debit card (Coming Soon)' },
    { name: 'BNSL', desc: 'Buy Now, Sell Later - Deferred gold sales program' },
    { name: 'DCA Plans', desc: 'Dollar-Cost Averaging for systematic gold investment' }
  ];
  
  services.forEach((service, idx) => {
    const row = Math.floor(idx / 2);
    const col = idx % 2;
    const xPos = 0.5 + (col * 4.8);
    const yPos = 1.5 + (row * 1.3);
    
    slide3.addShape('rect', { 
      x: xPos, y: yPos, w: 4.5, h: 1.1, 
      fill: { color: 'F3E8FF' }, 
      line: { color: PURPLE_PRIMARY, width: 1 } 
    });
    slide3.addText(service.name, {
      x: xPos + 0.1, y: yPos + 0.1, w: 4.3, h: 0.4,
      fontSize: 14, bold: true, color: PURPLE_DARK, fontFace: 'Arial'
    });
    slide3.addText(service.desc, {
      x: xPos + 0.1, y: yPos + 0.5, w: 4.3, h: 0.5,
      fontSize: 11, color: DARK_TEXT, fontFace: 'Arial'
    });
  });

  // Slide 4: Security & Compliance
  const slide4 = pptx.addSlide();
  addHeader(slide4, 'Security & Compliance');
  
  const securityFeatures = [
    { title: 'Enterprise Security', items: ['HTTPS encryption', 'Rate limiting', 'CSRF protection', 'Session management'] },
    { title: 'KYC/AML Compliance', items: ['Multi-tier verification', 'Document validation', 'Liveness detection', 'Ongoing monitoring'] },
    { title: 'Data Protection', items: ['Argon2id hashing', 'PostgreSQL encryption', 'Audit logging', 'Access controls'] },
    { title: 'Regulatory Readiness', items: ['W3C Verifiable Credentials', 'SAR reporting', 'Compliance dashboards', 'Regulatory reports'] }
  ];
  
  securityFeatures.forEach((feature, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const xPos = 0.5 + (col * 4.8);
    const yPos = 1.4 + (row * 2);
    
    slide4.addText(feature.title, {
      x: xPos, y: yPos, w: 4.5, h: 0.4,
      fontSize: 14, bold: true, color: PURPLE_PRIMARY, fontFace: 'Arial'
    });
    feature.items.forEach((item, i) => {
      slide4.addText(`✓ ${item}`, {
        x: xPos + 0.2, y: yPos + 0.45 + (i * 0.35), w: 4.3, h: 0.35,
        fontSize: 11, color: DARK_TEXT, fontFace: 'Arial'
      });
    });
  });

  // Slide 5: Technology Architecture
  const slide5 = pptx.addSlide();
  addHeader(slide5, 'Technology Architecture');
  
  slide5.addText('Modern, Scalable Infrastructure', {
    x: 0.5, y: 1.4, w: 9, h: 0.4,
    fontSize: 16, bold: true, color: PURPLE_DARK, fontFace: 'Arial'
  });
  
  const techStack = [
    { category: 'Frontend', tech: 'React 18, TypeScript, Tailwind CSS' },
    { category: 'Backend', tech: 'Node.js, Express, TypeScript' },
    { category: 'Database', tech: 'PostgreSQL with Drizzle ORM' },
    { category: 'Real-time', tech: 'Socket.IO for live updates' },
    { category: 'Security', tech: 'Helmet.js, PASETO tokens, Redis caching' },
    { category: 'Payments', tech: 'Binance Pay, Bank transfers, Card processing' }
  ];
  
  techStack.forEach((item, idx) => {
    slide5.addText(`${item.category}:`, {
      x: 0.7, y: 1.9 + (idx * 0.55), w: 2, h: 0.45,
      fontSize: 13, bold: true, color: PURPLE_PRIMARY, fontFace: 'Arial'
    });
    slide5.addText(item.tech, {
      x: 2.8, y: 1.9 + (idx * 0.55), w: 6.5, h: 0.45,
      fontSize: 13, color: DARK_TEXT, fontFace: 'Arial'
    });
  });

  // Slide 6: Partnership Benefits
  const slide6 = pptx.addSlide();
  addHeader(slide6, 'Partnership Benefits');
  
  const benefits = [
    { title: 'Economic Growth', desc: 'Stimulate fintech sector development and attract investment' },
    { title: 'Financial Inclusion', desc: 'Enable broader access to gold-backed savings for citizens' },
    { title: 'Regulatory Framework', desc: 'Pioneer digital asset regulations with proven platform' },
    { title: 'Job Creation', desc: 'Create skilled employment in technology and finance sectors' },
    { title: 'Revenue Generation', desc: 'Transaction fees and licensing contribute to economy' },
    { title: 'Innovation Leadership', desc: 'Position the ministry as a leader in digital finance' }
  ];
  
  benefits.forEach((benefit, idx) => {
    const row = Math.floor(idx / 2);
    const col = idx % 2;
    const xPos = 0.5 + (col * 4.8);
    const yPos = 1.4 + (row * 1.4);
    
    slide6.addShape('rect', { 
      x: xPos, y: yPos, w: 4.5, h: 1.2, 
      fill: { color: PURPLE_PRIMARY }
    });
    slide6.addText(benefit.title, {
      x: xPos + 0.15, y: yPos + 0.1, w: 4.2, h: 0.4,
      fontSize: 13, bold: true, color: WHITE, fontFace: 'Arial'
    });
    slide6.addText(benefit.desc, {
      x: xPos + 0.15, y: yPos + 0.55, w: 4.2, h: 0.6,
      fontSize: 11, color: WHITE, fontFace: 'Arial'
    });
  });

  // Slide 7: Gold Flow & Treasury
  const slide7 = pptx.addSlide();
  addHeader(slide7, 'Gold Flow & Treasury Management');
  
  slide7.addText('Complete Chain of Custody', {
    x: 0.5, y: 1.4, w: 9, h: 0.4,
    fontSize: 16, bold: true, color: PURPLE_DARK, fontFace: 'Arial'
  });
  
  const flowSteps = [
    'User Deposit → Cash Vault (USD)',
    'Gold Purchase → Gold Vault (Physical Gold)',
    'Digital Recording → User Wallet (Gold Grams)',
    'Withdrawal → Physical Delivery or Sale'
  ];
  
  flowSteps.forEach((step, idx) => {
    slide7.addShape('rect', { 
      x: 1.5, y: 1.9 + (idx * 0.9), w: 7, h: 0.7, 
      fill: { color: idx % 2 === 0 ? 'F3E8FF' : PURPLE_LIGHT },
      line: { color: PURPLE_PRIMARY, width: 1 }
    });
    slide7.addText(step, {
      x: 1.7, y: 2.05 + (idx * 0.9), w: 6.6, h: 0.5,
      fontSize: 14, color: idx % 2 === 0 ? DARK_TEXT : WHITE, fontFace: 'Arial', align: 'center'
    });
    if (idx < flowSteps.length - 1) {
      slide7.addText('↓', {
        x: 4.5, y: 2.55 + (idx * 0.9), w: 1, h: 0.35,
        fontSize: 18, color: PURPLE_PRIMARY, fontFace: 'Arial', align: 'center'
      });
    }
  });

  // Slide 8: Roadmap
  const slide8 = pptx.addSlide();
  addHeader(slide8, 'Roadmap & Future Development');
  
  const roadmapItems = [
    { phase: 'Q1 2026', items: ['FinaCard launch', 'Mobile app release', 'Additional payment gateways'] },
    { phase: 'Q2 2026', items: ['International expansion', 'Multi-currency support', 'Partner API expansion'] },
    { phase: 'Q3 2026', items: ['Institutional services', 'Advanced analytics', 'White-label solutions'] },
    { phase: 'Q4 2026', items: ['Gold-backed lending', 'Staking rewards', 'Additional vault locations'] }
  ];
  
  roadmapItems.forEach((item, idx) => {
    const xPos = 0.4 + (idx * 2.4);
    
    slide8.addShape('rect', { 
      x: xPos, y: 1.5, w: 2.2, h: 0.5, 
      fill: { color: PURPLE_PRIMARY }
    });
    slide8.addText(item.phase, {
      x: xPos, y: 1.5, w: 2.2, h: 0.5,
      fontSize: 12, bold: true, color: WHITE, fontFace: 'Arial', align: 'center', valign: 'middle'
    });
    
    item.items.forEach((subItem, i) => {
      slide8.addText(`• ${subItem}`, {
        x: xPos, y: 2.1 + (i * 0.4), w: 2.2, h: 0.4,
        fontSize: 10, color: DARK_TEXT, fontFace: 'Arial'
      });
    });
  });

  // Slide 9: Contact & Next Steps
  const slide9 = pptx.addSlide();
  slide9.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: PURPLE_PRIMARY } });
  
  slide9.addText('Next Steps', {
    x: 0.5, y: 1.2, w: 9, h: 0.8,
    fontSize: 36, bold: true, color: WHITE, align: 'center', fontFace: 'Arial'
  });
  
  const nextSteps = [
    '1. Schedule detailed technical demonstration',
    '2. Review regulatory requirements and compliance framework',
    '3. Define partnership structure and responsibilities',
    '4. Establish pilot program parameters',
    '5. Sign memorandum of understanding'
  ];
  
  nextSteps.forEach((step, idx) => {
    slide9.addText(step, {
      x: 1.5, y: 2.2 + (idx * 0.55), w: 7, h: 0.5,
      fontSize: 16, color: WHITE, fontFace: 'Arial'
    });
  });
  
  slide9.addText('Contact: System@finatrades.com', {
    x: 0.5, y: 5, w: 9, h: 0.4,
    fontSize: 14, color: WHITE, align: 'center', fontFace: 'Arial'
  });
  slide9.addText('www.finatrades.com', {
    x: 0.5, y: 5.4, w: 9, h: 0.4,
    fontSize: 14, color: WHITE, align: 'center', fontFace: 'Arial', bold: true
  });

  // Generate the presentation as a buffer
  const output = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
  return output;
}

function addHeader(slide: PptxGenJS.Slide, title: string) {
  slide.addShape('rect', { 
    x: 0, y: 0, w: '100%', h: 1.2, 
    fill: { color: PURPLE_PRIMARY } 
  });
  slide.addText(title, {
    x: 0.5, y: 0.35, w: 9, h: 0.6,
    fontSize: 28, bold: true, color: WHITE, fontFace: 'Arial'
  });
}
