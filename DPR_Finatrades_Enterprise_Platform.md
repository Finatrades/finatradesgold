# FINATRADES — ENTERPRISE PLATFORM
## Detailed Project Report (DPR)
### Version 2.0 | Africa's Institutional Commodity Trade Infrastructure
### Prepared: May 2026 | Confidential

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Platform Vision & Strategic Objectives](#2-platform-vision--strategic-objectives)
3. [Market Context & Opportunity](#3-market-context--opportunity)
4. [User Roles & Personas](#4-user-roles--personas)
5. [9-Step Platform Workflow — Master Blueprint](#5-9-step-platform-workflow--master-blueprint)
6. [Module Specifications](#6-module-specifications)
7. [Technical Architecture (CTO View)](#7-technical-architecture-cto-view)
8. [Database Schema Plan](#8-database-schema-plan)
9. [Partner Ecosystem & Integrations](#9-partner-ecosystem--integrations)
10. [Compliance & Regulatory Framework](#10-compliance--regulatory-framework)
11. [FUSD Reference System](#11-fusd-reference-system)
12. [Gap Analysis — Existing vs. Required](#12-gap-analysis--existing-vs-required)
13. [Development Roadmap](#13-development-roadmap)
14. [Risk Assessment](#14-risk-assessment)
15. [KPIs & Success Metrics](#15-kpis--success-metrics)

---

## 1. EXECUTIVE SUMMARY

### CEO View

Finatrades is Africa's institutional-grade commodity trade infrastructure platform. It connects verified exporters, importers, financiers, logistics operators, and government entities across 14 strategic African trade hubs — enabling secure, compliant, escrow-backed B2B commodity trade from consignment creation to final settlement.

The platform solves the #1 problem in African cross-border trade: **trust and settlement risk**. Today, African commodity traders lose billions annually to counterparty default, opaque pricing, unverified inventory, and informal financing. Finatrades eliminates all four by creating a structured, document-verified, escrow-protected deal flow — powered by the **FUSD Reference System** for fair valuation, and **WINVESTNET** for secure B2B payment processing.

### What This Platform Does

```
Exporter lists verified goods → Warehouse confirms receipt → 
Buyer discovers via marketplace → RFQ/negotiation in Deal Room → 
Trade Finance arranged → Payment escrowed → 
Goods delivered → Seller paid → Deal closed with audit trail
```

### Scale of Ambition

| Metric | Target (Year 1) | Target (Year 3) |
|--------|----------------|----------------|
| Active Trade Hubs | 5 (Ghana, Nigeria, Kenya, Senegal, S. Africa) | 14 across Africa |
| Verified Sellers | 500 | 3,800+ |
| Active Buyers | 200 | 1,250+ |
| RFQs Created | 2,000 | 12,500+ |
| Deals Closed | 800 | 8,600+ |
| Transaction Volume | $50M | $500M+ |

---

## 2. PLATFORM VISION & STRATEGIC OBJECTIVES

### Vision
> "To become the default institutional infrastructure for African commodity trade — where every deal is verified, every fund is protected, and every participant is compliant."

### Core Strategic Pillars

**1. TRUST INFRASTRUCTURE**
- Every seller is KYC/KYB verified before listing
- Every inventory item is physically inspected & quality-certified
- Every deal has a digital audit trail from listing to payout

**2. VERIFIED INVENTORY**
- No unverified inventory enters the marketplace
- Warehouse partner (WinLogistics) confirms physical receipt
- SGS/third-party inspection validates quality & quantity
- Digital warehouse receipts with QR-code verification

**3. ESCROW-BACKED SETTLEMENT**
- Buyer funds locked in escrow before inventory is reserved
- Seller payout only upon delivery confirmation
- FUSD reference valuation ensures price transparency
- No funds move without platform authorization

**4. COMPLIANT COUNTERPARTIES**
- AML/Sanctions screening on all participants
- KYC Tier 1/2/3 based on transaction volume
- PEP (Politically Exposed Persons) check
- Country risk & industry risk scoring

**5. STRUCTURED FINANCING**
- Trade finance via vetted financier network (FinaCredit Partners)
- LC (Letter of Credit) support
- PO (Purchase Order) financing
- Invoice discounting

### Platform USPs vs. Competition

| Feature | Finatrades | Traditional Trade | Other Platforms |
|---------|-----------|------------------|----------------|
| Verified inventory pre-listing | ✅ | ❌ | Partial |
| Escrow-backed settlement | ✅ | ❌ | Partial |
| 14-hub African network | ✅ | ❌ | ❌ |
| Government barter support | ✅ | Manual | ❌ |
| FUSD reference pricing | ✅ | N/A | ❌ |
| End-to-end audit trail | ✅ | Paper-based | Partial |
| AML/KYC built-in | ✅ | Manual | Partial |
| Mobile-native | ✅ | ❌ | Partial |

---

## 3. MARKET CONTEXT & OPPORTUNITY

### African Commodity Trade — Size & Pain Points

- **Total African intra-continental trade**: ~$192 billion/year
- **Africa's share of global commodity exports**: 30% of raw materials globally
- **Trade finance gap in Africa**: $120 billion/year (IFC estimate)
- **Ghana alone**: $15B+ in agricultural commodity exports annually
- **Top traded commodities**: Cocoa, Maize, Wheat, Crude Oil, Fertilizer, Gold, Coffee, Cotton

### Why Current System Fails

1. **No trust layer** — Buyers don't know if seller inventory is real
2. **No escrow** — Sellers ship, buyers don't pay (or vice versa)
3. **No pricing transparency** — Commodity prices are opaque & manipulable
4. **Limited trade finance** — Banks reject 60% of SME trade finance applications
5. **Logistics opacity** — No real-time tracking of cross-border shipments
6. **Paper documents** — Fraud via fake certificates is rampant
7. **Government inefficiency** — Barter deals take months via manual processes

### Finatrades' Answer

A single platform with:
- Digital onboarding (not weeks, days)
- Physical warehouse verification (not self-reported)
- Escrow protection (not on faith)
- Integrated financing (not separate bank process)
- Real-time tracking (not phone calls)
- Blockchain-level audit trail (not paper folders)

---

## 4. USER ROLES & PERSONAS

### 4.1 Exporter / Seller
**Who**: Agricultural traders, commodity producers, export companies, brokers
**What they do**:
- Create consignment requests for their goods
- Upload shipping & ownership documents
- Submit goods to verified WinLogistics warehouses
- List verified inventory on marketplace
- Respond to RFQs from buyers
- Negotiate deal terms in Deal Room
- Receive payment via WINVESTNET after delivery confirmation

**Pain solved**: "I can't find verified buyers willing to pay fair price without counterparty risk"

**Key journey**: Register → KYB → Consignment → Warehouse Submission → Marketplace Listing → Deal Room → Payout

### 4.2 Importer / Buyer
**Who**: Food processors, manufacturers, trading companies, government procurement agencies
**What they do**:
- Browse verified inventory across 14 hubs
- Create RFQs (Request for Quote) for specific commodities
- Negotiate terms in Deal Room
- Arrange financing (self-funded or trade finance)
- Make payment to WINVESTNET B2B Wallet
- Confirm delivery and release escrow

**Pain solved**: "I can't trust that the commodity exists at the claimed quality, and I risk losing payment to fraud"

**Key journey**: Register → KYC → Browse Marketplace → RFQ → Deal Room → Finance → Pay Escrow → Receive Goods → Release Funds

### 4.3 Government / Sovereign Entity
**Who**: Ministries of Trade, national food security agencies, central banks, sovereign wealth funds
**What they do**:
- Execute strategic commodity barter (oil-for-wheat, etc.)
- Define offered commodity + required commodity
- Valuation in FUSD reference terms
- Structured negotiation with counterpart sovereign/commercial entity
- Settlement with fiat support option for value gaps

**Pain solved**: "Cross-border barter arrangements take 6-18 months and involve massive fraud risk"

**Key journey**: Government Onboarding → Sovereign Verification → Barter Request → Counterparty Matching → FUSD Valuation → Negotiation → Settlement

### 4.4 Logistics Partner (WinLogistics)
**Who**: WinLogistics warehouse operators, inspection agents, transport coordinators
**What they do**:
- Receive consignment arrival notifications
- Conduct physical inspection (quality, quantity, moisture, damage)
- Issue digital warehouse receipts
- Manage inventory status (Available/Reserved/Pledged/Released/Sold)
- Execute warehouse release instructions upon deal confirmation
- Provide real-time tracking data to platform

**Key APIs used**: Consignment webhook, inventory status update, release instruction, inspection report upload

### 4.5 Financier / Trade Finance Partner
**Who**: FinaCredit Partners, licensed trade finance institutions
**What they do**:
- Review buyer credit & KYC
- Approve/reject trade finance facility
- Arrange LC (Letter of Credit), PO Finance, Invoice Discounting
- Disburse funds to WINVESTNET escrow
- Receive repayment upon deal settlement

### 4.6 Inspector / Quality Surveyor
**Who**: SGS Ghana Ltd., third-party inspection agencies
**What they do**:
- Conduct quantity & quality checks at warehouse
- Issue inspection certificates (SGS Report)
- Upload inspection reports to platform
- Verify moisture levels, damage, sampling results

### 4.7 Broker / Agent
**Who**: Commodity brokers facilitating deals between buyers and sellers
**What they do**:
- Act on behalf of buyer or seller
- Access Deal Room under principal's account
- Cannot initiate payments — view-only on financials

### 4.8 Platform Admin (Finatrades Team)
**Who**: Finatrades compliance team, operations, customer success
**What they do**:
- KYC/KYB review and approval
- AML case management
- Trade dispute resolution
- Platform configuration
- Financier onboarding
- Audit & reporting

---

## 5. 9-STEP PLATFORM WORKFLOW — MASTER BLUEPRINT

### WORKFLOW OVERVIEW

```
┌────────────────────────────────────────────────────────────────┐
│                    FINATRADES WORKFLOW                         │
├──────┬─────────────────────────────────────────────────────────┤
│ S1   │ USER REGISTRATION, KYC/KYB & COMPLIANCE ONBOARDING     │
│ S2   │ SELLER CONSIGNMENT CREATION & WAREHOUSE SUBMISSION      │
│ S3   │ PRE-ARRIVAL LOGISTICS, WAREHOUSE RECEPTION              │
│ S4   │ WAREHOUSE CONSIGNMENT INVENTORY MODULE                  │
│ S5   │ 14-HUB MARKETPLACE DISCOVERY, RFQ & MATCHING            │
│ S6   │ BUYER FLOW, ORDER PLACEMENT & PAYMENT TO WINVESTNET     │
│ S7   │ GOVERNMENT COMMODITIES BARTER (OPTIONAL PARALLEL)       │
│ S8   │ TRADE FINANCE, ESCROW, SETTLEMENT & DEAL COMPLETION     │
│ S9   │ COMPLETE BACKEND FLOW & SYSTEM ARCHITECTURE             │
└──────┴─────────────────────────────────────────────────────────┘
```

---

### STEP 1 — User Registration, KYC/KYB & Compliance Onboarding

**Tagline**: *Secure onboarding for Exporters, Importers and Government users before platform access*

#### Sub-Steps

| # | Action | Actor | Output |
|---|--------|-------|--------|
| 1 | Account Creation | User | Account created with basic details |
| 2 | Role Selection | User | Role set: Exporter / Importer / Government |
| 3 | Email/OTP Verification | System | Email confirmed, account activated |
| 4 | Company Profile Setup | User | Entity details, address, logo uploaded |
| 5 | KYC/KYB Document Upload | User | Documents uploaded to secure vault |
| 6 | AML/Sanctions Screening | System (Auto) | Screening result returned |
| 7 | Risk Review & Compliance Checks | System + Compliance Team | Risk score assigned |
| 8 | Admin Approval | Admin | Account approved/rejected |
| 9 | Wallet & Module Activation | System | B2B wallet created, modules unlocked |
| 10 | Dashboard Access | User | Full platform access granted |

#### Document Requirements

**Individual/Exporter:**
- Government ID / Passport
- Proof of Address
- Business Registration Certificate
- Tax Identification Number (TIN)
- Bank Statement / Reference
- Shareholder / Director Details
- Beneficial Ownership Declaration

**Corporate (KYB):**
- Certificate of Incorporation
- Memorandum & Articles of Association
- Board Resolution
- Director/UBO ID documents
- Company financials

#### KYC Tiers

| Tier | Transaction Limit | Required Docs | Review Time |
|------|------------------|--------------|-------------|
| Tier 1 Basic | Up to $50,000 | ID + Address + TIN | 1-2 days |
| Tier 2 Enhanced | Up to $500,000 | Tier 1 + Business docs + Financials | 2-5 days |
| Tier 3 Corporate | Unlimited | Tier 2 + Full KYB + AML Deep Dive | 5-10 days |

#### Compliance Checks Performed
- AML screening (automated via compliance database)
- Sanctions & watchlist verification (OFAC, UN, EU lists)
- PEP (Politically Exposed Persons) check
- Adverse media screening
- Country risk assessment
- Industry risk assessment (embargoed commodities)

#### Access Modules After Approval
- **B2B Wallet** — Manage funds & transactions
- **Trade Finance** — Apply & manage trade finance
- **Marketplace** — Buy & sell commodities
- **Warehouse Consignments** — Store, track & manage inventory
- **Government Barter** — For government-verified entities only

---

### STEP 2 — Seller Consignment Creation & Warehouse Submission

**Tagline**: *Sellers send goods on consignment basis to the warehouse network for verification, storage and trade readiness*

#### Sub-Steps

| # | Action | Actor | Output |
|---|--------|-------|--------|
| 1 | Create Consignment Request | Seller | Consignment ID generated |
| 2 | Select Commodity & Quantity | Seller | Commodity spec defined |
| 3 | Choose Destination Warehouse | Seller | Warehouse slot reserved |
| 4 | Upload Shipping & Ownership Documents | Seller | Docs uploaded & verified |
| 5 | Submit Pre-Arrival Details | Seller | Incoterms, ETA, transport mode logged |
| 6 | Warehouse Pre-Check | WinLogistics | Capacity confirmed, slot reserved |
| 7 | Compliance Validation | System | Export/import compliance verified |
| 8 | Booking Confirmation | System | Booking confirmed, Consignment ID issued |
| 9 | Transport Scheduling | Seller + WinLogistics | Carrier selected, tracking enabled |
| 10 | Consignment Accepted for Arrival | WinLogistics | System updated, arrival expected |

#### Consignment Data Fields
- **Seller Info**: Name, Account ID, KYC Status
- **Commodity**: Type, HS Code, Grade/Specification
- **Quantity**: Amount, Unit (MT/KG/Units), Packaging
- **Origin**: Country, Port of Loading
- **Destination**: Warehouse Hub, Operator (WinLogistics)
- **Transport**: Mode (Sea/Air/Road/Rail), Carrier, Container No.
- **Incoterms**: CFR / FOB / CIF / EXW / DDP
- **Expected Arrival Date**

#### Required Documents at Submission
- Commercial Invoice
- Packing List
- Certificate of Origin
- Certificate of Quality
- Insurance Certificate
- Export Permit
- Warehouse Request Form

#### Warehouse Network (14 Hubs)
| Hub | Country | Operator |
|-----|---------|----------|
| Tema Hub | Ghana | WinLogistics Ghana |
| Lagos Hub | Nigeria | WinLogistics Nigeria |
| Nairobi Hub | Kenya | WinLogistics Kenya |
| Dakar Hub | Senegal | WinLogistics Senegal |
| Cape Town Hub | South Africa | WinLogistics SA |
| Mombasa Hub | Tanzania | WinLogistics Tanzania |
| Djibouti Hub | Djibouti | WinLogistics East Africa |
| Douala Hub | Cameroon | WinLogistics Cameroon |
| Abidjan Hub | Ivory Coast | WinLogistics CI |
| Casablanca Hub | Morocco | WinLogistics Morocco |
| Cairo Hub | Egypt | WinLogistics Egypt |
| Lomé Hub | Togo | WinLogistics Togo |
| Luanda Hub | Angola | WinLogistics Angola |
| Brazzaville Hub | Congo | WinLogistics Congo |

---

### STEP 3 — Pre-Arrival Logistics, Warehouse Reception & Inventory Hub

**Tagline**: *Track commodities from origin to warehouse. Prepare before arrival. Control every step.*

#### Sub-Steps

| # | Action | Actor | Output |
|---|--------|-------|--------|
| 1 | Shipment Creation | Buyer/System | Shipment record with destination |
| 2 | Pre-Arrival Document Management | System | All docs uploaded, verified, shared |
| 3 | Transport & Logistics Tracking | System + WinLogistics | Real-time location, ETA updates |
| 4 | Destination Warehouse Booking | System | Confirmed slot at warehouse |
| 5 | ETA Alerts & Preparation | System | Warehouse, inspector, customs notified |
| 6 | Goods Arrival | WinLogistics | Gate entry & container verification |
| 7 | Inspection & Receiving | Inspector + WinLogistics | Physical inspection completed |
| 8 | Inventory Registration | System | Inventory ID (INV-XXXXXXXX) created |
| 9 | Digital Warehouse Receipt | System | QR-code receipt issued |
| 10 | Inventory Management | System | Status set to Available |
| 11 | Ready for Trade/Finance/Settlement | System | Inventory enters marketplace |

#### Document Checklist at Arrival
- Bill of Lading (B/L)
- Commercial Invoice
- Packing List
- Certificate of Origin
- Certificate of Quality
- SGS / Inspection Report
- Phytosanitary Certificate
- Insurance Certificate
- Export Permit
- Customs Documents
- Fumigation Certificate
- Warehouse Booking Confirmation

#### Inspection Summary Data Points
- Inspector: SGS Ghana Ltd. (or equivalent per hub)
- Sampling Method: Random
- Moisture Level: Measured (e.g., 12.5%)
- Damage Assessment: None / Minor / Major
- Foreign Matter: %
- Overall Status: Passed / Failed / Conditional

#### Notifications Triggered
- **Warehouse**: Arrival incoming, prep required
- **Buyer** (if pre-sold): Goods arrived
- **Inspector**: Inspection appointment
- **Customs**: Pre-clearance notification
- **Logistics**: Handover confirmed

---

### STEP 4 — Warehouse Consignment Inventory Module

**Tagline**: *Verified warehouse inventory is recorded as consignments with quantity, status, documents and FUSD reference visibility*

#### Sub-Steps

| # | Action | Actor | Output |
|---|--------|-------|--------|
| 1 | Arrival Registered | WinLogistics | Arrival confirmed in system |
| 2 | Documents Matched | System | B/L, Invoice, Packing List matched |
| 3 | Inspection Scheduled | WinLogistics | Inspector notified |
| 4 | Quantity & Quality Check | Inspector | Physical count, grade verification |
| 5 | Moisture / Damage Review | Inspector | Detailed condition report |
| 6 | Inventory ID Generated | System | Unique INV-XXXXXXXX created |
| 7 | Owner Assignment | System | Owner/seller confirmed, linked |
| 8 | FUSD Reference Value Created | System | Market price × quantity = FUSD value |
| 9 | Digital Warehouse Receipt Issued | System | e-Warehouse Receipt with QR code |
| 10 | Inventory Status Updated | System | Status = Available, visible to parties |
| 11 | Ready for Marketplace / Finance / Escrow | System | Listed on marketplace, finance-eligible |

#### Inventory Status Lifecycle

```
RECEIVED → INSPECTED → VERIFIED → LISTED → LOCKED → DISPATCHED → COMPLETED
```

| Status | Meaning | Who Can See |
|--------|---------|-------------|
| Received | Arrived at warehouse, not inspected | Admin, Warehouse |
| Inspected | Inspection done, pending registration | Admin, Warehouse |
| Available | Listed, open to buyers | All |
| Reserved | Buyer placed order, stock held | Buyer, Seller, Admin |
| Pledged | Used as collateral for trade finance | Seller, Financier, Admin |
| Released | Released to buyer post-delivery | Buyer, Seller, Admin |
| Sold | Deal complete | All (audit view) |

#### Inventory Record Structure
```
Inventory ID: INV-0001258
Consignment ID: MSCU1234567
Owner: ABC Trading Ltd.
Warehouse: Ghana Hub – Tema | WinLogistics
Commodity: Wheat (Grade A | Variety: Hard Red)
HS Code: 1001.90 | Origin: Senegal
Gross Weight: 500.00 MT | Tare: 10.00 MT | Net: 490.00 MT
Moisture: 12.5% | Protein: 12.5% | Admixture: 0.8%
FUSD Reference Value: USD 282.50/MT → Total: USD 138,425.00
Digital Receipt: WR-2025-000458 (QR Code + Blockchain Hash)
Status: Available ✅
```

---

### STEP 5 — 14-Hub Marketplace Discovery, RFQ & Matching

**Tagline**: *Trade opportunities across Africa through the marketplace network*

#### Sub-Steps

| # | Action | Actor | Output |
|---|--------|-------|--------|
| 1 | Browse Commodity Listings | Buyer | View available consignments |
| 2 | Filter by Hub / Commodity | Buyer | Narrowed search results |
| 3 | View Verified Consignments | Buyer | Seller profile, docs, ratings |
| 4 | Create RFQ | Buyer | RFQ ID generated |
| 5 | Send Inquiry to Sellers | System | RFQ delivered to matched sellers |
| 6 | Receive Offers | Seller | Competitive offers submitted |
| 7 | Compare Terms | Buyer | Price, quality, logistics compared |
| 8 | Negotiate & Confirm Deal | Buyer + Seller | Terms agreed, deal locked |
| 9 | Convert to Order | System | Purchase Order (PO) generated |
| 10 | Send to Settlement / Finance | System | Routed to Step 6 or Step 8 |

#### Marketplace Filters
- **Commodity Type**: Wheat, Maize, Cocoa, Coffee, Oil, Fertilizer, etc.
- **Trade Hub**: Filter by 1 or multiple of 14 hubs
- **Quantity Range**: Minimum lot size, maximum available
- **Price Range**: FUSD reference price per MT/KG
- **Delivery Terms**: FOB / CFR / CIF / DDP
- **Delivery Date**: Expected delivery window
- **Seller Rating**: 1-5 stars, verified status
- **Incoterms**: Select specific terms

#### RFQ Structure
```
RFQ ID: RFQ-2025-001234
Buyer: ABC Trading Ltd.
Commodity: Maize | HS Code: 1005.90
Hub: Ghana Hub – Tema
Quantity Needed: 20,000 MT
Target Price: $285 / MT (FUSD reference)
Delivery Terms: CIF Tema Port
Required By: 30 June 2025
Attached: Purchase Intent Letter, Finance Pre-Approval
Status: Open → Offers Received → Negotiating → Confirmed
```

#### Buyer-Seller Matching Algorithm
- Commodity type match
- Hub proximity (multi-hub search)
- Quantity availability
- Price range compatibility
- Seller KYC status (must be Approved)
- Seller rating & past performance
- Incoterms compatibility

#### Marketplace Metrics (Year 1 Targets)
- Active Buyers: 200+
- Verified Sellers: 500+
- RFQs Created Monthly: 500
- Deals Matched Monthly: 100+
- Average Match Time: 24-48 hours
- Average Deal Size: $250,000

---

### STEP 6 — Buyer Flow, Order Placement & Payment to WINVESTNET

**Tagline**: *Buyers browse inventory, place orders, secure funds and move deals toward execution*

#### Sub-Steps

| # | Action | Actor | Output |
|---|--------|-------|--------|
| 1 | Buyer Registration | Buyer | KYC-verified account |
| 2 | Browse Inventory & Marketplace | Buyer | Shortlist of matching goods |
| 3 | Review Verified Stock | Buyer | Documents, warehouse certs viewed |
| 4 | Send RFQ / Inquiry | Buyer | RFQ sent to relevant sellers |
| 5 | Negotiate & Confirm Terms | Buyer + Seller | Mutual agreement locked |
| 6 | Place Order | Buyer | PO generated, signed |
| 7 | Choose Funding Method | Buyer | Finance source selected |
| 8 | Payment to WINVESTNET B2B Wallet | Buyer | Funds received & confirmed |
| 9 | FUSD Balance / Reference Created | System | Ring-fenced for this deal |
| 10 | Ready for Escrow & Deal Execution | System | Seller notified, Step 8 initiated |

#### Payment Method Options

| Method | Description | Timeline |
|--------|-------------|----------|
| Bank Transfer | Direct wire to WINVESTNET B2B Wallet | 1-3 banking days |
| Stablecoin (USDC/USDT) | Fast crypto transfer via blockchain | 15-30 minutes |
| Corporate Account | Pre-approved credit line | Instant (if approved) |
| Escrow Deposit | Partial/staged funding into escrow | Agreed schedule |
| Trade Finance | Via FinaCredit Partners | 3-5 days (approval) |

#### Order Status Tracker

```
Inquiry Submitted → Terms Agreed → Order Placed → 
Payment Completed → Escrow & Execution → 
Delivery in Progress → Deal Completed
```

#### WINVESTNET B2B Wallet
- Holds buyer funds pre-escrow
- Generates FUSD reference ID for each deal
- Ring-fences funds per order (cannot be used for other deals)
- Issues automated payment receipts
- Triggers escrow initiation once funds confirmed

---

### STEP 7 — Government Commodities Barter Workflow (Optional Parallel Branch)

**Tagline**: *Strategic commodity barter for government and sovereign users with marketplace support and structured settlement*

> **Note**: This is an **optional parallel workflow** for Government-role users only. It runs in parallel to Steps 2-8, with sovereign-level verification and policy compliance requirements.

#### Sub-Steps

| # | Action | Actor | Output |
|---|--------|-------|--------|
| 1 | Government Onboarding | Government Entity | Mandate & authority registered |
| 2 | Sovereign Verification | Admin + System | Mandate, authority & legal docs verified |
| 3 | Create Barter Request | Government Entity | Barter request with overview & objectives |
| 4 | Define Offered Commodity | Government Entity | Commodity, quantity, delivery terms |
| 5 | Define Required Commodity | Government Entity | Required commodity spec |
| 6 | Valuation in FUSD Reference Terms | System | Market price benchmarking, value parity |
| 7 | Counterparty Matching | System | Qualified counterparties identified |
| 8 | Negotiate Terms & Delivery | Both Parties | Terms Sheet / MOU signed |
| 9 | Settlement Difference Support | System + Admin | Gap identified, fiat/finance support arranged |
| 10 | Execution & Monitoring | System | Deliveries tracked, deal closed |

#### Strategic Commodities Eligible for Barter
- Oil & Crude (Bonny Light, etc.)
- Fuel Products (Jet Fuel, Diesel)
- Food Items (Maize, Rice, Wheat)
- Fertilizers (Urea, DAP, NPK)
- Gold & Precious Metals
- Minerals (Bauxite, Iron Ore, Copper)

#### Barter Request Form Fields
```
Government Entity: Ministry of Trade (Ghana)
Offered Commodity: Crude Oil (Bonny Light) — 50,000 MT
Counter Value (FUSD): USD 32,000,000
Required Commodity: Wheat (Milling Grade) — 40,000 MT
Counter Value (FUSD): USD 30,150,000
Settlement Gap: USD 1,850,000
Preferred Delivery: CIF Destination
Expected Settlement Date: 30 Jun 2025
Objectives: Ensure food security through strategic barter arrangement
```

#### Settlement Support Options
- Fiat top-up (buyer pays gap in USD/local currency)
- Additional commodity (add a third commodity to balance)
- Trade Finance Facility (for the gap amount only)

#### Compliance Requirements (Government)
- Mandate Letter
- Authority Approval from Ministry
- Commodity Schedule
- Terms Sheet
- Counterpart Details
- Logistics Terms & Delivery Schedule

---

### STEP 8 — Trade Finance, Escrow, Settlement & Deal Completion

**Tagline**: *From approved funding to inventory lock, warehouse release, delivery milestone and seller payout*

#### Sub-Steps

| # | Action | Actor | Output |
|---|--------|-------|--------|
| 1 | Deal Confirmation | Buyer + Seller | Final terms locked, Deal ID generated |
| 2 | Trade Finance Review / Funding | Financier | Credit verified, facility approved |
| 3 | Payment Confirmation | System + WINVESTNET | Funds received, receipt issued |
| 4 | FUSD Lock in Escrow | System | Funds in escrow, protected |
| 5 | Inventory Reserved | WinLogistics | Stock tagged with Deal ID |
| 6 | Order Confirmation | System | Sale contract + documents digitally signed |
| 7 | Warehouse Release Instruction | System | Release instruction sent to warehouse |
| 8 | Shipment / Delivery Milestone | WinLogistics | Goods dispatched, tracked |
| 9 | Condition Verification | Buyer/Inspector | Receipt verified against contract |
| 10 | Seller Payout via WINVESTNET | System | Payout transferred to seller |
| 11 | Deal Closed & Audit Trail Completed | System | All records archived, blockchain hash |

#### Escrow Details

```
Escrow Account: FinaTrades Escrow
Escrow ID: ESC-2025-000458
Funds Locked: USD 250,000
Lock Date: 17 May 2025
Release Condition: Delivery confirmed + Condition verified
Status: Locked → Released (upon conditions met)
```

#### Trade Finance Options

| Instrument | Description | Typical Terms |
|-----------|-------------|--------------|
| Letter of Credit (LC) | Bank guarantee for payment upon docs | 30-90 days |
| Purchase Order Finance | Finance against confirmed PO | 60-120 days |
| Invoice Discounting | Early payment against invoice | 30-60 days |
| Commodity Finance | Finance against warehouse inventory | 90-180 days |
| Supply Chain Finance | Multi-party payment optimization | 30-90 days |

#### FUSD Lifecycle

```
FUNDED (in WINVESTNET wallet) →
RESERVED (ring-fenced for deal) →
ESCROWED (locked in escrow) →
RELEASED (upon delivery confirmation) →
SETTLED (paid to seller via WINVESTNET)
```

#### Deal Lifecycle

```
LISTING → NEGOTIATION → CONFIRMATION → 
FINANCE → ESCROW → DELIVERY → SETTLEMENT → CLOSED
```

#### Audit Trail Contents
- All document uploads (timestamped)
- All status changes (with actor + timestamp)
- All payment movements (with FUSD references)
- All communication in Deal Room
- Delivery confirmations with GPS coordinates
- Inspection reports
- Blockchain hash for tamper-proof archiving

---

### STEP 9 — Complete Backend Flow & System Architecture

**Tagline**: *How registration, inventory, marketplace, payments, trade finance, escrow and reporting connect behind the scenes*

#### Backend Layer Architecture

| Layer | Component | Responsibilities |
|-------|-----------|-----------------|
| 1 | **User Access Layer** | Web Portal, Mobile App, Partner Portal, MFA, RBAC |
| 2 | **Identity & Compliance Layer** | KYC, KYB, AML Screening, Risk Scoring, Sanctions |
| 3 | **Document Service** | Upload, Validation, eSign, Vault, OCR, Version Control |
| 4 | **Inventory/Consignment Engine** | Creation, Grading, Tagging, Stock Allocation, Real-time Updates |
| 5 | **Marketplace Connector** | Listing Sync, Buyer Discovery, Offer/Negotiation, Confirmation |
| 6 | **Buyer Order Engine** | Order Validation, Inventory Lock, PO Generation, Status |
| 7 | **WINVESTNET Wallet Connector** | Balance Verification, Fund Reservation, Reconciliation |
| 8 | **Trade Finance Engine** | LC, PO Finance, Invoice Discounting, Credit Scoring, Workflow |
| 9 | **Escrow/Settlement Engine** | Escrow Hold, Condition Monitoring, Secure Release |
| 10 | **Audit Trail & Reporting** | Activity Logging, Analytics Dashboards, Export Reports |
| 11 | **Notifications & API Orchestration** | Event Triggers, Alerts, Email/SMS, API Gateway, Webhooks |

#### System Rules (Non-Negotiable)
```
✅ No verified inventory → No sale listing
✅ No funded buyer → No inventory lock
✅ No escrow → No warehouse release  
✅ No delivery confirmation → No seller payout
```

#### Infrastructure Layer
- **Cloud**: AWS / GCP (multi-region, Africa-optimized CDN)
- **Load Balancer**: Auto-scaling, health-check aware
- **Database**: PostgreSQL cluster (primary + read replicas)
- **File Storage**: Cloudflare R2 (documents, certificates, photos)
- **Message Queue**: BullMQ + Redis (async job processing)
- **Security**: End-to-end TLS, AES-256 encryption at rest
- **Backup**: Automated daily backup + disaster recovery
- **Monitoring**: Pino logging, health endpoints, alerting

---

## 6. MODULE SPECIFICATIONS

### Module 1: Auth & Compliance Module
**Routes**: `/auth/*`, `/kyc/*`, `/admin/kyc/*`
**Features**:
- Multi-step registration (10 substeps from PDF)
- Role-based account types (Exporter / Importer / Government)
- Email OTP verification
- MFA (TOTP + Email)
- Biometric login (mobile)
- KYC Tier 1/2/3 document upload
- AI-assisted document verification
- AML/Sanctions automated screening
- Admin approval workflow
- Geo-restriction middleware

### Module 2: Consignment Module
**Routes**: `/consignments/*`
**Features**:
- Consignment request creation
- Commodity & quantity specification
- Hub/warehouse selection
- Document upload (Commercial Invoice, Certificate of Origin, etc.)
- Pre-arrival details (Incoterms, ETA, transport mode)
- Compliance validation (export/import compliance check)
- Warehouse pre-check & booking confirmation
- Transport scheduling with carrier selection
- Consignment status tracking

### Module 3: Warehouse & Inventory Module
**Routes**: `/warehouse/*`, `/inventory/*`
**Features**:
- Goods arrival registration
- Document matching & verification
- Inspection scheduling (SGS integration)
- Quantity & quality check recording
- Moisture & damage review
- Inventory ID generation (INV-XXXXXXXX)
- FUSD reference value calculation & display
- Digital Warehouse Receipt (e-WR with QR code)
- Inventory status management (Available/Reserved/Pledged/Released/Sold)
- WinLogistics partner integration (webhooks)
- Real-time inventory dashboard

### Module 4: Marketplace Module
**Routes**: `/marketplace/*`, `/rfq/*`
**Features**:
- Commodity listing browser (14 hubs)
- Advanced filters (commodity, hub, price, quantity, incoterms)
- Verified consignment detail view
- RFQ creation & submission
- Seller notification of RFQs
- Offer submission by sellers
- Offer comparison view
- Deal negotiation (terms counter-offer)
- Deal confirmation & PO generation
- Buyer-seller matching algorithm

### Module 5: Deal Room Module
**Routes**: `/deal-rooms/*`
**Features**:
- Secure messaging between buyer & seller
- Document sharing within deal room
- LC (Letter of Credit) status tracking
- Milestone tracking
- Discrepancy management
- Deal terms review & sign-off
- PDF export of deal summary
- Admin oversight (escalation, internal notes)
- Counterparty risk display

### Module 6: Payment & Wallet Module (WINVESTNET Integration)
**Routes**: `/wallet/*`, `/payments/*`, `/winvestnet/*`
**Features**:
- WINVESTNET B2B Wallet connection
- Funding method selection (Bank Transfer / USDC/USDT / Corporate / Escrow)
- Payment confirmation & receipt
- FUSD reference ID generation per deal
- Ring-fencing of funds per order
- Wallet balance dashboard
- Transaction history

### Module 7: Trade Finance Module
**Routes**: `/trade-finance/*`, `/financing/*`
**Features**:
- Finance request initiation
- Credit assessment by FinaCredit Partners
- Facility type selection (LC / PO Finance / Invoice Discount / Commodity Finance)
- Approval workflow (multi-level sign-off)
- Disbursement instruction to WINVESTNET
- Repayment scheduling
- Financier partner portal

### Module 8: Escrow & Settlement Module
**Routes**: `/escrow/*`, `/settlement/*`
**Features**:
- Escrow creation with deal lock
- Condition monitoring engine
- Inventory reservation linked to escrow
- Warehouse release instruction (triggered by escrow)
- Delivery milestone tracking
- Condition verification (buyer confirms receipt)
- Seller payout authorization
- Escrow release & fund settlement

### Module 9: Government Barter Module
**Routes**: `/barter/*`, `/government/*`
**Features**:
- Government entity onboarding (separate flow)
- Sovereign verification workflow
- Barter request creation (offered + required commodity)
- FUSD valuation & parity calculation
- Counterparty matching (sovereign or commercial)
- Terms sheet generation
- Settlement gap calculation
- Fiat/finance support for gap
- Execution & delivery monitoring

### Module 10: Reporting & Analytics Module
**Routes**: `/reports/*`, `/analytics/*`, `/admin/analytics/*`
**Features**:
- CEO Dashboard (platform-level KPIs)
- Trade volume by hub, commodity, period
- KYC/Compliance funnel metrics
- Deal conversion rates
- Finance utilization metrics
- Audit trail explorer
- Exportable reports (PDF, CSV, Excel)
- Regulatory reports (AML, SAR)

---

## 7. TECHNICAL ARCHITECTURE (CTO VIEW)

### Technology Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend Web | React + Vite + TypeScript | Enterprise SPA, fast builds |
| Frontend Mobile | Expo (React Native) | iOS & Android from one codebase |
| Backend API | Express 5 + TypeScript | Battle-tested, extensive ecosystem |
| Database | PostgreSQL + Drizzle ORM | ACID compliance, relational integrity |
| Schema Validation | Zod v4 | Runtime type safety |
| Auth | Custom session + MFA + Biometric | Enterprise security standards |
| File Storage | Cloudflare R2 | Cost-effective, globally distributed |
| Email | Brevo (SMTP) | Transactional email reliability |
| Job Queue | BullMQ + Upstash Redis | Async processing, reliable retries |
| API Documentation | OpenAPI 3.0 + Orval codegen | Contract-first, auto-generated clients |
| Routing | Wouter (web) + React Navigation (mobile) | Lightweight, performant |
| State Management | React Query | Server state, caching, sync |
| UI Components | Radix UI + Tailwind CSS | Accessible, customizable |
| Logging | Pino | Structured JSON logs, fast |
| Build | esbuild | Sub-second builds |
| Monorepo | pnpm workspaces | Dependency isolation, shared libs |

### API Architecture

```
Frontend (React/Expo)
    ↓  OpenAPI-generated hooks (React Query)
API Server (Express 5)
    ↓  Route handlers → Service layer
PostgreSQL (Drizzle ORM)
    + Cloudflare R2 (file uploads)
    + BullMQ (async jobs)
    + Upstash Redis (sessions + cache)
```

### Security Architecture

```
HTTPS/TLS (all traffic)
    → CSRF protection (token-based)
    → Session management (PostgreSQL-backed, connect-pg-simple)
    → MFA (TOTP + Email OTP)
    → RBAC (Role-Based Access Control)
    → IP Geo-restriction middleware
    → AML/Sanctions screening (automated)
    → Rate limiting (auth endpoints)
    → Idempotency keys (payment endpoints)
    → Input validation (Zod schemas)
    → File scanning (upload verification)
```

### Notification Architecture

```
Platform Event
    → BullMQ Job (email/notification queue)
        → Brevo email (user notifications)
        → In-app notification (real-time)
        → Push notification (mobile - Expo Push)
        → SMS (critical alerts - future)
        → Webhook (partner integrations - WinLogistics, WINVESTNET)
```

### Partner Integration Points

| Partner | Integration Type | Data Exchanged |
|---------|-----------------|----------------|
| WinLogistics | REST API + Webhooks | Consignment status, inspection reports, inventory updates |
| WINVESTNET | REST API | Payment initiation, receipt confirmation, wallet balance |
| FinaCredit Partners | REST API | Finance request, approval status, disbursement |
| SGS / Inspection | Manual upload + API (future) | Inspection certificates, reports |
| Brevo | SMTP + API | Transactional emails, templates |
| Cloudflare R2 | S3-compatible API | Document storage, CDN delivery |
| Upstash Redis | Redis protocol | Session store, job queues |

---

## 8. DATABASE SCHEMA PLAN

### Core Tables Required (New for v2.0 Workflow)

#### consignments
```sql
id, seller_id, commodity_type, commodity_grade, hs_code,
quantity, unit, packaging, origin_country, origin_port,
destination_warehouse_id, incoterms, transport_mode,
carrier_name, container_no, expected_arrival_date,
status (draft|submitted|pre_check|compliance_check|
         booking_confirmed|in_transit|arrived|rejected),
consignment_reference, created_at, updated_at
```

#### consignment_documents
```sql
id, consignment_id, document_type, file_url, 
uploaded_at, verified, verified_by, verified_at
```

#### warehouse_hubs
```sql
id, name, country, city, operator (winlogistics),
total_capacity_mt, available_capacity_mt, storage_types,
coordinates, contact_info, active
```

#### inventory_items
```sql
id, consignment_id, warehouse_hub_id, owner_id,
commodity_type, hs_code, grade, variety,
gross_weight_mt, tare_weight_mt, net_weight_mt,
moisture_pct, protein_pct, admixture_pct,
fusd_price_per_unit, fusd_total_value,
digital_receipt_no, digital_receipt_qr_url,
status (received|inspected|available|reserved|pledged|released|sold),
inspection_passed, inspection_date, inspector_name,
created_at, updated_at
```

#### marketplace_listings
```sql
id, inventory_id, seller_id, commodity_type,
warehouse_hub_id, quantity_available_mt,
price_per_unit_fusd, min_order_quantity,
incoterms, delivery_terms, listing_status (active|paused|sold),
listing_date, expiry_date
```

#### rfqs
```sql
id, buyer_id, commodity_type, warehouse_hub_id,
quantity_needed_mt, target_price_fusd,
delivery_terms, incoterms, required_by_date,
notes, status (open|offers_received|negotiating|confirmed|cancelled),
created_at, updated_at
```

#### rfq_offers  
```sql
id, rfq_id, seller_id, inventory_id,
offered_price_per_unit_fusd, offered_quantity_mt,
delivery_terms, valid_until,
status (pending|accepted|rejected|counter),
notes, created_at
```

#### trade_orders
```sql
id, rfq_id, buyer_id, seller_id, inventory_id,
deal_room_id, commodity_type, quantity_mt,
agreed_price_per_unit_fusd, total_value_fusd,
payment_method, funding_status, escrow_id,
order_status (placed|funded|escrowed|in_delivery|delivered|completed),
po_number, po_document_url, signed_contract_url,
created_at, updated_at
```

#### escrow_holds
```sql
id, trade_order_id, buyer_id, seller_id,
amount_fusd, escrow_account_ref,
lock_date, release_conditions,
status (pending|locked|released|cancelled),
release_date, payout_ref, created_at
```

#### barter_requests (Government module)
```sql
id, government_entity_id, offered_commodity, offered_qty_mt,
offered_fusd_value, required_commodity, required_qty_mt,
required_fusd_value, settlement_gap_fusd,
settlement_support_type, counterparty_id,
status (draft|submitted|counterparty_matched|negotiating|agreed|executing|completed),
mandate_letter_url, terms_sheet_url, created_at, updated_at
```

#### delivery_milestones
```sql
id, trade_order_id, milestone_type, milestone_date,
location, confirmed_by, notes, status, created_at
```

### Existing Tables to Extend

| Existing Table | Extension Needed |
|---------------|-----------------|
| `users` | Add `hub_id`, `logistics_partner` flag, `government_entity` flag |
| `kyc_submissions` | Already has tiers — add `barter_eligible` flag |
| `transactions` | Add `fusd_reference_id`, `trade_order_id`, `escrow_id` |
| `wallets` | Add `winvestnet_wallet_ref`, `ring_fenced_balance` |

---

## 9. PARTNER ECOSYSTEM & INTEGRATIONS

### WinLogistics (Primary Warehouse Partner)
- **Role**: Warehouse reception, inspection, inventory management, delivery execution
- **Integration**: REST API + Webhook events
- **Events Received from WinLogistics**:
  - `consignment.arrived` — Triggers Step 3 reception flow
  - `inspection.completed` — Triggers Step 4 inventory creation
  - `inventory.status_updated` — Updates platform inventory in real-time
  - `delivery.dispatched` — Triggers Step 8 milestone tracking
  - `delivery.completed` — Triggers escrow release
- **Events Sent to WinLogistics**:
  - `warehouse_release_instruction` — Sent when escrow conditions met
  - `consignment_booking` — Sent when seller books slot (Step 2)

### WINVESTNET (B2B Payment Network)
- **Role**: Secure B2B payment processing, escrow holding, seller payout
- **Integration**: REST API
- **Flow**:
  1. Buyer initiates payment → WINVESTNET creates payment session
  2. Buyer transfers funds to WINVESTNET B2B Wallet
  3. WINVESTNET confirms receipt → Finatrades creates FUSD reference
  4. Finatrades instructs escrow lock → WINVESTNET locks funds
  5. Upon delivery confirmation → Finatrades instructs release
  6. WINVESTNET pays out to seller (minus platform fee)

### FinaCredit Partners (Trade Finance)
- **Role**: Trade finance facility (LC, PO Finance, Invoice Discounting)
- **Integration**: REST API + Manual approval workflow
- **Flow**:
  1. Buyer applies for finance via platform
  2. FinaCredit reviews credit + KYC
  3. Approval/rejection returned via webhook
  4. If approved, disbursement to WINVESTNET B2B Wallet
  5. Repayment schedule tracked on platform

### SGS / Inspection Agencies
- **Role**: Physical inspection, quality certification
- **Integration**: Upload-based (PDF reports), future API integration
- **Documents**: SGS Report, Certificate of Quality, Phytosanitary Certificate

### Wincommodities (Marketplace Provider)
- **Role**: Commodity listing syndication, buyer discovery
- **Integration**: API sync for listings and buyer data

---

## 10. COMPLIANCE & REGULATORY FRAMEWORK

### AML/KYC Standards
- **FATF Recommendations** (40 Recommendations for AML/CFT)
- **Basel III** counterparty risk framework
- **EU AMLD5/6** compliance for international parties
- **Ghana FIC Act** (Financial Intelligence Centre Act)
- **ECOWAS trade regulations**

### Screening Databases
- OFAC SDN List (US Treasury)
- UN Consolidated Sanctions List
- EU Consolidated Sanctions List
- UK HMT Sanctions
- Interpol Red Notices (via commercial provider)
- Adverse media (automated screening)

### Data Protection
- **GDPR** compliance for EU-linked entities
- **Ghana Data Protection Act 2012**
- **Document encryption**: AES-256 at rest
- **Transit encryption**: TLS 1.3
- **Data retention policy**: 7 years (regulatory minimum for trade finance)

### KYC Tier Thresholds
| Tier | Single Transaction | Annual Volume | Required Docs |
|------|------------------|--------------|--------------|
| Tier 1 | < $50K | < $200K | Basic ID + TIN |
| Tier 2 | $50K – $500K | $200K – $2M | Full KYB |
| Tier 3 | > $500K | > $2M | Enhanced Due Diligence |

### Audit Requirements
- All documents timestamped & immutable once uploaded
- All transactions with full audit trail
- All status changes recorded with actor & timestamp
- All communications archived in Deal Room
- Quarterly reconciliation reports
- Annual regulatory report generation

---

## 11. FUSD REFERENCE SYSTEM

### What is FUSD?
FUSD (Finatrades USD) is the **platform's reference valuation unit** — not a currency or cryptocurrency. It is a standardized pricing reference calculated as:

```
FUSD Value = Commodity Market Price (USD/MT) × Net Weight (MT) × Quality Factor
```

### Purpose
1. **Price Transparency**: All listings, RFQs, and deals reference FUSD — eliminating pricing opacity
2. **Escrow Lock**: Escrow is locked to FUSD reference value — protecting against price manipulation after deal confirmation
3. **Barter Valuation**: Government barter requests use FUSD to calculate parity between offered and required commodities
4. **Reporting**: All analytics and reports use FUSD for consistent cross-commodity comparison

### FUSD Calculation Example
```
Commodity: Wheat (Grade A, Hard Red)
Market Price: $282.50 / MT (sourced from international commodity index)
Net Weight: 490 MT (post-tare, post-moisture adjustment)
Quality Factor: 0.975 (small discount for 12.5% moisture vs. 12.0% standard)

FUSD Reference Value = $282.50 × 490 × 0.975 = $134,878.13
```

### FUSD Update Rules
- FUSD reference is **set at time of inventory registration** (Step 4)
- FUSD is **locked at deal confirmation** (Step 8) — cannot be changed after
- FUSD is **re-calculated** if inspection reveals quality deviation from initial submission
- Market price source: International commodity exchanges (CME, LME, ICE), updated daily

---

## 12. GAP ANALYSIS — EXISTING VS. REQUIRED

### What EXISTS in Current Codebase

| Module | Status | Notes |
|--------|--------|-------|
| User Auth (Register/Login/MFA) | ✅ Built | Solid foundation |
| KYC/KYB Tier 1/2/3 | ✅ Built | Full document upload + review |
| AML/Sanctions Screening | ✅ Built | Automated screening system |
| Admin Approval Workflow | ✅ Built | RBAC + approval queue |
| Wallet (basic) | ✅ Built | Gold/USD wallet exists |
| Deal Rooms | ✅ Partial | LC tracking, milestones, messages |
| Trade Cases (FinaBridge) | ✅ Partial | Needs mapping to new workflow |
| Trade Finance Engine | ✅ Partial | Needs consignment linking |
| Settlement Holds | ✅ Partial | Needs WINVESTNET escrow mapping |
| Notifications (Email + In-app) | ✅ Built | Full system |
| Document Upload (R2) | ✅ Built | Secure upload pipeline |
| Reporting (basic) | ✅ Partial | Needs commodity analytics |
| RBAC | ✅ Built | Full role & permission system |
| Mobile App (Expo) | ✅ Partial | Screens exist, needs new modules |

### What NEEDS TO BE BUILT (New in v2.0)

| Module | Priority | Complexity | Estimated Sprints |
|--------|----------|-----------|------------------|
| Consignment Module (Step 2) | 🔴 Critical | High | 3 sprints |
| Warehouse/Inventory Module (Steps 3-4) | 🔴 Critical | High | 4 sprints |
| Marketplace / Listing Module (Step 5) | 🔴 Critical | High | 3 sprints |
| RFQ System (Step 5) | 🔴 Critical | Medium | 2 sprints |
| Buyer Order Flow (Step 6) | 🔴 Critical | Medium | 2 sprints |
| WINVESTNET Wallet Integration (Step 6) | 🔴 Critical | High | 3 sprints |
| Escrow Engine v2 (Step 8) | 🔴 Critical | High | 3 sprints |
| FUSD Reference System (Steps 4-8) | 🟡 High | Medium | 2 sprints |
| Government Barter Module (Step 7) | 🟡 High | High | 4 sprints |
| WinLogistics Webhook Integration | 🟡 High | Medium | 2 sprints |
| Delivery Milestone Tracking | 🟡 High | Medium | 2 sprints |
| New Dashboard (Exporter/Buyer/Gov) | 🟡 High | High | 3 sprints |
| Commodity Analytics & Reporting | 🟢 Medium | Medium | 2 sprints |
| Trade Finance Partner Portal | 🟢 Medium | High | 3 sprints |
| Mobile Screens (new modules) | 🟢 Medium | High | 4 sprints |

### What NEEDS MODIFICATION

| Existing Module | Change Needed |
|----------------|--------------|
| User registration | Add role = Exporter/Importer/Government (currently binary) |
| Wallet system | Add WINVESTNET connector, ring-fencing |
| Dashboard | Replace gold-focus with trade-focus |
| Deal Rooms | Link to consignment + inventory + RFQ flow |
| Transactions | Add FUSD reference, trade order linkage |
| KYC | Add government entity verification track |

---

## 13. DEVELOPMENT ROADMAP

### Phase 0 — Foundation Cleanup (2 weeks)
**Objective**: Align existing codebase with new workflow
- Rebuild Auth + Registration (new roles: Exporter/Importer/Government) ✅ Started
- Rebuild Dashboard layout & sidebar (role-based) ✅ Started
- New design system (redbrick #C73B22, cream #FAFAF8, dark #1A1A1A) ✅ Applied
- Update user schema with new fields (`hub_id`, `logisticsPartner`, `governmentEntity`)
- Configure base API routes for new modules

### Phase 1 — Seller Onboarding & Consignment (Weeks 3-6)
**Objective**: Exporters can create & submit consignments
- Consignment creation UI (Step 2)
- Commodity & quantity specification forms
- Warehouse hub selection (14 hubs map)
- Document upload flow (7 document types)
- Pre-arrival form (Incoterms, ETA, transport mode)
- Consignment status dashboard
- WinLogistics booking confirmation (stub → real API)
- Compliance validation (export/import check)

**Deliverable**: Exporter can submit goods to warehouse end-to-end

### Phase 2 — Warehouse & Inventory (Weeks 7-12)
**Objective**: WinLogistics can receive, inspect, and register inventory
- Warehouse reception dashboard (admin/partner view)
- Inspection recording form (quantity, quality, moisture, damage)
- Inventory ID generation (INV-XXXXXXXX)
- FUSD reference value engine
- Digital Warehouse Receipt with QR code
- Inventory status management (Available/Reserved/Pledged/Released/Sold)
- WinLogistics webhook receiver endpoints
- Inventory owner dashboard

**Deliverable**: Verified inventory appears in system, ready for marketplace

### Phase 3 — Marketplace & RFQ (Weeks 13-18)
**Objective**: Buyers can discover and request quotes
- Marketplace listing page (14 hubs, all commodities)
- Advanced filter & search
- Seller profile & rating view
- Consignment document viewer
- RFQ creation form
- RFQ offer submission (seller side)
- Offer comparison view (buyer side)
- Deal negotiation UI
- Purchase Order generation (PDF)

**Deliverable**: Buyer can find goods and complete RFQ-to-order flow

### Phase 4 — Payment & Escrow (Weeks 19-24)
**Objective**: Buyer can pay, funds secured in escrow
- Buyer wallet & funding dashboard
- WINVESTNET B2B Wallet connection
- Payment method selection (Bank/Stablecoin/Corporate/Escrow)
- FUSD balance & reference ID generation
- Escrow lock engine (conditions, monitoring)
- Inventory reservation linked to deal
- Order status tracker (full lifecycle)
- Deal Room v2 (linked to RFQ → Order → Escrow flow)

**Deliverable**: Money safely moves from buyer to escrow; goods reserved

### Phase 5 — Settlement & Deal Completion (Weeks 25-28)
**Objective**: Delivery confirmed, seller paid, deal closed
- Warehouse release instruction system
- Delivery milestone tracker
- Condition verification (buyer receipt confirmation)
- Seller payout via WINVESTNET
- Deal closure with audit trail
- Deal report PDF generation
- Audit log explorer (for compliance)

**Deliverable**: Full end-to-end deal cycle works from Step 1 to Step 8

### Phase 6 — Government Barter Module (Weeks 29-34)
**Objective**: Government entities can execute barter
- Government entity onboarding (separate KYC track)
- Sovereign verification workflow
- Barter request creation
- FUSD parity calculator
- Counterparty matching engine
- Terms sheet generator
- Settlement gap handling
- Execution & delivery monitoring (adapted from Phase 5)

**Deliverable**: Government users can execute end-to-end barter deals

### Phase 7 — Analytics, Reporting & Mobile (Weeks 35-40)
**Objective**: Full visibility, reporting, and mobile parity
- CEO/CTO analytics dashboard
- Trade volume by hub, commodity, period
- KPI dashboards per user role
- Exportable reports (PDF, CSV)
- AML/Regulatory reports
- Mobile app: new screens for all modules
- Mobile push notifications
- Performance optimization & scaling

**Deliverable**: Platform ready for investor demos & first institutional customers

---

## 14. RISK ASSESSMENT

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| WINVESTNET API delay/change | Medium | High | Build adapter layer, mock in dev |
| WinLogistics webhook reliability | Medium | High | Retry logic, manual fallback in admin |
| Data volume scaling (14 hubs) | Low | High | PostgreSQL read replicas, Redis caching |
| Document storage costs (R2) | Low | Medium | Compression + lifecycle policies |
| Real-time tracking latency | Medium | Medium | WebSocket or polling with 30s interval |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Partner non-delivery (WinLogistics) | Low | Critical | SLA contracts, backup warehouse partners |
| Regulatory change (Ghana/Nigeria) | Medium | High | Legal counsel on-call, modular compliance |
| Seller inventory fraud | Medium | High | Mandatory physical inspection (SGS) |
| Buyer payment default | Medium | High | Escrow-first, no inventory release without funds |
| Government barter political risk | High | Medium | Optional module, separate risk profile |
| AML false positives blocking users | Medium | Medium | Manual override in admin + appeal flow |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Slow KYC approval killing conversions | High | High | Streamlined 2-day tier 1, fast lane |
| Poor mobile experience in low-bandwidth | Medium | Medium | Progressive Web App fallback, lazy loading |
| Multi-currency complexity | Medium | Medium | USD primary, FUSD as reference unit |
| Inspection bottleneck (SGS) | Medium | High | Multiple approved inspectors per hub |

---

## 15. KPIs & SUCCESS METRICS

### Platform KPIs (CEO Dashboard)

| KPI | Formula | Target Year 1 |
|-----|---------|--------------|
| Gross Merchandise Value (GMV) | Sum of all deal values | $50M |
| Active Buyers | Unique buyers placing orders | 200 |
| Active Sellers | Unique sellers with listed inventory | 500 |
| RFQ-to-Deal Conversion Rate | Deals / RFQs × 100 | 40% |
| Average Deal Size | GMV / Deals Closed | $250K |
| Average Time-to-Deal | Days from RFQ to deal confirmation | 7 days |
| Average Onboarding Time | Days from registration to KYC approval | 3 days |
| Escrow Dispute Rate | Disputed deals / Total deals × 100 | < 2% |
| Platform Revenue | Platform fees collected | $1.5M (3% avg) |
| Net Revenue Retention | Repeat buyer GMV / Total GMV × 100 | > 65% |

### Operational KPIs (Operations Dashboard)

| KPI | Target |
|-----|--------|
| KYC approval time (Tier 1) | < 2 days |
| KYC approval time (Tier 2) | < 5 days |
| Consignment-to-listing time | < 3 days |
| Inspection turnaround | < 24 hours |
| Payment confirmation time | < 1 business day |
| Warehouse release time (after instruction) | < 4 hours |
| Support ticket resolution | < 24 hours |

### Compliance KPIs

| KPI | Target |
|-----|--------|
| AML screening accuracy | > 98% (minimize false positives) |
| Fraudulent listings detected | 100% (via inspection requirement) |
| SAR filings completed on time | 100% |
| KYC document rejection rate | < 10% (improve guidance) |
| Regulatory audit findings | Zero critical findings |

### Technical KPIs (CTO Dashboard)

| KPI | Target |
|-----|--------|
| API response time (P95) | < 200ms |
| Uptime | > 99.9% |
| File upload success rate | > 99.5% |
| Email delivery rate | > 99% |
| Job queue failure rate | < 0.1% |
| Mobile app crash rate | < 0.5% |

---

## APPENDIX

### Commodity Codes (Most Common)
| Commodity | HS Code | Unit |
|-----------|---------|------|
| Wheat | 1001.90 | MT |
| Maize | 1005.90 | MT |
| Rice | 1006.30 | MT |
| Cocoa Beans | 1801.00 | MT |
| Coffee | 0901.11 | MT |
| Crude Oil | 2709.00 | BBL |
| Urea Fertilizer | 3102.10 | MT |
| Gold | 7108.12 | KG |

### Hub Codes
| Code | Hub Name | Country |
|------|----------|---------|
| GH-TEM | Ghana Hub – Tema | Ghana |
| NG-LAG | Nigeria Hub – Lagos | Nigeria |
| KE-NBI | Kenya Hub – Nairobi | Kenya |
| SN-DAK | Senegal Hub – Dakar | Senegal |
| ZA-CPT | South Africa Hub – Cape Town | South Africa |
| TZ-DAR | Tanzania Hub – Dar es Salaam | Tanzania |
| DJ-DJI | Djibouti Hub | Djibouti |
| CM-DLA | Cameroon Hub – Douala | Cameroon |
| CI-ABJ | Ivory Coast Hub – Abidjan | Ivory Coast |
| MA-CAS | Morocco Hub – Casablanca | Morocco |
| EG-CAI | Egypt Hub – Cairo | Egypt |
| TG-LOM | Togo Hub – Lomé | Togo |
| AO-LUA | Angola Hub – Luanda | Angola |
| CG-BZV | Congo Hub – Brazzaville | Congo |

### Deal Lifecycle Status Codes
```
DRAFT → INQUIRY_SENT → OFFERS_RECEIVED → NEGOTIATING → 
DEAL_CONFIRMED → FINANCE_ARRANGED → FUNDED → 
ESCROWED → INVENTORY_RESERVED → IN_TRANSIT → 
DELIVERED → VERIFIED → SETTLED → CLOSED
```

### FUSD Reference Formula
```
FUSD = International_Market_Price_USD × Net_Weight × Quality_Factor × Hub_Adjustment

Where:
- International_Market_Price_USD = CME/ICE/LME closing price (daily update)
- Net_Weight = Gross Weight − Tare Weight − Moisture_Adjusted_Loss
- Quality_Factor = 1.0 (Grade A) | 0.975 (Grade B) | 0.95 (Grade C)
- Hub_Adjustment = 0.98-1.02 (freight cost differential per hub)
```

---

*This document is Confidential — For internal planning and development use only.*
*Finatrades Platform v2.0 | Africa's Institutional Commodity Trade Infrastructure*
*www.finatrades.com*
