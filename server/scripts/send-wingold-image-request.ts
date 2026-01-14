import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS || process.env.SMTP_KEY,
  },
});

const recipients = [
  'blockchain@finatrades.com',
  'chairman@winvestnet.com',
  'legal@finatrades.com'
];

const emailHtml = `
<div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 100%); padding: 30px; text-align: center;">
    <h1 style="color: #D4A574; margin: 0; font-size: 28px;">Finatrades</h1>
    <p style="color: #ffffff; margin-top: 10px; font-size: 14px;">Technical Integration Team</p>
  </div>
  
  <div style="padding: 30px;">
    <h2 style="color: #1a1a2e; border-bottom: 2px solid #D4A574; padding-bottom: 10px;">
      API Enhancement Request - Add imageUrl to ALL Products
    </h2>
    
    <p style="color: #333; line-height: 1.6;">Dear Wingold & Metals Team,</p>
    
    <p style="color: #333; line-height: 1.6;">
      We are integrating your B2B API into the Finatrades platform to display your complete product catalog to our customers.
    </p>
    
    <h3 style="color: #1a1a2e; margin-top: 25px;">Request:</h3>
    <p style="color: #333; line-height: 1.6;">
      Please add an <code style="background: #f4f4f4; padding: 2px 6px; border-radius: 3px;">imageUrl</code> field to <strong>ALL products</strong> in the <code style="background: #f4f4f4; padding: 2px 6px; border-radius: 3px;">/api/b2b/products</code> API response.
    </p>
    
    <h3 style="color: #1a1a2e; margin-top: 25px;">Products That Need Images:</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <tr style="background: #f8f8f8;">
        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Category</th>
        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Items</th>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #ddd;"><strong>Gold Bars</strong></td>
        <td style="padding: 12px; border: 1px solid #ddd;">1g, 2.5g, 5g, 10g, 20g, 50g, 100g, 250g, 500g, 1kg</td>
      </tr>
      <tr style="background: #f8f8f8;">
        <td style="padding: 12px; border: 1px solid #ddd;"><strong>Gold Coins</strong></td>
        <td style="padding: 12px; border: 1px solid #ddd;">All sovereign coins, commemorative coins, bullion coins</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #ddd;"><strong>Silver Products</strong></td>
        <td style="padding: 12px; border: 1px solid #ddd;">All bars and coins if available</td>
      </tr>
      <tr style="background: #f8f8f8;">
        <td style="padding: 12px; border: 1px solid #ddd;"><strong>Platinum/Palladium</strong></td>
        <td style="padding: 12px; border: 1px solid #ddd;">All products if available</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #ddd;"><strong>Gift Items</strong></td>
        <td style="padding: 12px; border: 1px solid #ddd;">Special packaging, gift sets</td>
      </tr>
      <tr style="background: #f8f8f8;">
        <td style="padding: 12px; border: 1px solid #ddd;"><strong>Collectibles</strong></td>
        <td style="padding: 12px; border: 1px solid #ddd;">Limited editions, special series</td>
      </tr>
    </table>
    
    <h3 style="color: #1a1a2e; margin-top: 25px;">Required API Response Format:</h3>
    <pre style="background: #1a1a2e; color: #00ff88; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px;">{
  "products": [
    {
      "productId": "WG-1G-BAR",
      "name": "1g Gold Bar",
      "weight": "1g",
      "category": "bars",
      "imageUrl": "https://wingoldandmetals.com/images/products/1g-gold-bar.jpg",
      "thumbnailUrl": "https://wingoldandmetals.com/images/products/1g-gold-bar-thumb.jpg"
    },
    {
      "productId": "WG-COIN-SOVEREIGN",
      "name": "Gold Sovereign Coin",
      "category": "coins",
      "imageUrl": "https://wingoldandmetals.com/images/products/gold-sovereign.jpg"
    }
  ]
}</pre>
    
    <h3 style="color: #1a1a2e; margin-top: 25px;">Image Requirements:</h3>
    <ul style="color: #333; line-height: 1.8;">
      <li><strong>High resolution:</strong> Minimum 800x800 pixels for main image</li>
      <li><strong>Thumbnail:</strong> 200x200 pixels for grid views (optional)</li>
      <li><strong>Format:</strong> PNG or JPG with white/transparent background</li>
      <li><strong>Style:</strong> Professional product photography</li>
    </ul>
    
    <h3 style="color: #1a1a2e; margin-top: 25px;">Additional Fields (Optional but Helpful):</h3>
    <ul style="color: #333; line-height: 1.8;">
      <li><code style="background: #f4f4f4; padding: 2px 6px; border-radius: 3px;">thumbnailUrl</code> - For faster loading in grids</li>
      <li><code style="background: #f4f4f4; padding: 2px 6px; border-radius: 3px;">galleryUrls[]</code> - Multiple angles if available</li>
      <li><code style="background: #f4f4f4; padding: 2px 6px; border-radius: 3px;">certificationImageUrl</code> - Image of the assay certificate</li>
    </ul>
    
    <div style="background: #f0f7ff; border-left: 4px solid #007bff; padding: 15px; margin: 25px 0;">
      <h4 style="color: #007bff; margin: 0 0 10px 0;">Why This Matters:</h4>
      <ul style="color: #333; margin: 0; line-height: 1.8;">
        <li>Customers trust products more when they see real images</li>
        <li>Reduces returns and customer inquiries</li>
        <li>Increases conversion rates by 30-40%</li>
        <li>Ensures brand consistency across partner platforms</li>
      </ul>
    </div>
    
    <h3 style="color: #1a1a2e; margin-top: 25px;">Alternative Option:</h3>
    <p style="color: #333; line-height: 1.6;">
      If adding to the API is not immediately feasible, please provide us with direct URLs to high-resolution product images for all your products, and we can manually configure these in our system.
    </p>
    
    <p style="color: #333; line-height: 1.6; margin-top: 25px;">
      Please let us know your timeline for implementing this enhancement.
    </p>
    
    <p style="color: #333; line-height: 1.6; margin-top: 25px;">
      Best regards,<br/>
      <strong>Finatrades Finance SA</strong><br/>
      Technical Integration Team
    </p>
  </div>
  
  <div style="background: #f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
    <p style="color: #666; font-size: 12px; margin: 0;">
      Finatrades Finance SA | Gold-Backed Digital Finance Platform<br/>
      <a href="https://finatrades.com" style="color: #D4A574;">www.finatrades.com</a>
    </p>
  </div>
</div>
`;

async function sendEmails() {
  console.log('Sending API Enhancement Request emails...\n');
  console.log('Recipients:', recipients.join(', '));
  console.log('');
  
  for (const email of recipients) {
    try {
      const info = await transporter.sendMail({
        from: '"Finatrades Technical Team" <system@finatrades.com>',
        to: email,
        subject: 'API Enhancement Request - Add imageUrl to ALL Products in /api/b2b/products',
        html: emailHtml,
      });
      console.log(`✓ Email sent to ${email}: ${info.messageId}`);
    } catch (error: any) {
      console.error(`✗ Failed to send to ${email}: ${error.message}`);
    }
  }
  
  console.log('\nDone!');
}

sendEmails();
