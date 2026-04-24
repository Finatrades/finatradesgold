import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Section {
  id: string;
  icon: string;
  iconLib?: "ion" | "mat";
  title: string;
  subtitle: string;
  accentColor: string;
  content: ContentBlock[];
}

type ContentBlock =
  | { type: "para"; text: string }
  | { type: "stat"; label: string; value: string; sub?: string }
  | { type: "bullet"; items: string[] }
  | { type: "compare"; headers: string[]; rows: string[][] }
  | { type: "steps"; steps: { title: string; desc: string }[] }
  | { type: "kv"; pairs: { k: string; v: string }[] }
  | { type: "divider" };

const SECTIONS: Section[] = [
  {
    id: "what",
    icon: "cube-outline",
    title: "What is GODE?",
    subtitle: "Gold-Backed Digital Asset",
    accentColor: "#D4AF37",
    content: [
      {
        type: "para",
        text: "GODE (Gold and Code) is a digital token where 1 GODE = exactly 1 troy ounce of LBMA-certified physical gold. It combines 5,000 years of gold's proven value with the speed and accessibility of blockchain technology.",
      },
      { type: "divider" },
      {
        type: "stat",
        label: "1 GODE Token",
        value: "1 Troy Ounce",
        sub: "≈ 31.1035 grams of LBMA Gold PM (99.5%+ purity)",
      },
      {
        type: "stat",
        label: "Gold Backing",
        value: "100%",
        sub: "No fractional reserve. No leverage. Ever.",
      },
      {
        type: "stat",
        label: "Transaction Fee",
        value: "0.15%",
        sub: "Significantly lower than gold ETFs (0.4–0.5%)",
      },
      { type: "divider" },
      {
        type: "bullet",
        items: [
          "Start investing with as little as $10 (0.005 GODE)",
          "Trade 24/7 — no market hour restrictions",
          "Option to redeem for physical gold delivery",
          "Fractional ownership down to 0.000001 troy oz",
          "Instant settlement via blockchain",
        ],
      },
    ],
  },
  {
    id: "token",
    icon: "diamond-outline",
    title: "Token Specifications",
    subtitle: "Technical Details",
    accentColor: "#8A2BE2",
    content: [
      {
        type: "kv",
        pairs: [
          { k: "Symbol",      v: "GODE" },
          { k: "Standard",    v: "ERC-20 (Multi-chain)" },
          { k: "Decimals",    v: "18" },
          { k: "Supply",      v: "Elastic — minted on demand" },
          { k: "Max Supply",  v: "Limited by physical gold reserves" },
          { k: "Peg",         v: "1 GODE = 1 troy oz LBMA Gold PM" },
        ],
      },
      { type: "divider" },
      {
        type: "para",
        text: "GODE is deployed on multiple blockchains for maximum accessibility and low fees:",
      },
      {
        type: "steps",
        steps: [
          { title: "Phase 1 — Live", desc: "Polygon (65,000 TPS) + Binance Smart Chain (BEP-20)" },
          { title: "Phase 2 — 2024", desc: "Ethereum mainnet, Arbitrum, Optimism" },
          { title: "Phase 3 — 2024", desc: "Solana, Avalanche, Cosmos" },
          { title: "Phase 4 — 2025", desc: "Bitcoin (via wrapped tokens)" },
        ],
      },
      { type: "divider" },
      {
        type: "bullet",
        items: [
          "Gas fees on Polygon: < $0.01 per transaction",
          "Smart contracts audited by 3 independent firms",
          "Chainlink price feed oracles (tamper-proof)",
          "Multi-signature governance for critical operations",
          "Upgradeable proxy pattern for future enhancements",
        ],
      },
    ],
  },
  {
    id: "mint",
    icon: "add-circle-outline",
    title: "How to Buy (Mint GODE)",
    subtitle: "Step-by-step process",
    accentColor: "#10b981",
    content: [
      {
        type: "para",
        text: "Minting is the process of converting USD (or stablecoins) into GODE tokens. Physical gold is purchased from authorized LBMA dealers and stored in the vault on your behalf.",
      },
      { type: "divider" },
      {
        type: "steps",
        steps: [
          { title: "1. Complete KYC",      desc: "Submit government ID, selfie, proof of address, and source of funds questionnaire." },
          { title: "2. Deposit Funds",     desc: "Transfer USD via bank wire or deposit USDC/USDT stablecoin to your account." },
          { title: "3. Confirm Purchase",  desc: "System calculates GODE amount based on live XAU/USD LBMA spot price + 0.15% fee." },
          { title: "4. Gold Purchased",    desc: "Finatrades buys LBMA Good Delivery gold bars from approved refiners." },
          { title: "5. Tokens Minted",     desc: "GODE tokens are minted to your wallet and transaction is recorded on blockchain." },
        ],
      },
      { type: "divider" },
      {
        type: "kv",
        pairs: [
          { k: "Minimum Mint",     v: "0.01 GODE (~$20)" },
          { k: "Maximum per Tx",   v: "1,000 GODE" },
          { k: "Daily Limit",      v: "10,000 GODE" },
          { k: "Minting Fee",      v: "0.15%" },
          { k: "Network Fee",      v: "~$0.01 (Polygon)" },
        ],
      },
    ],
  },
  {
    id: "redeem",
    icon: "cash-outline",
    title: "How to Redeem",
    subtitle: "3 redemption options",
    accentColor: "#f59e0b",
    content: [
      {
        type: "para",
        text: "Redeeming converts your GODE tokens back to value. You have three options depending on your preference:",
      },
      { type: "divider" },
      {
        type: "steps",
        steps: [
          {
            title: "💵 USD Redemption",
            desc: "Convert GODE to USD at live LBMA spot price. Fee: 0.15%. Settled in 1–2 business days.",
          },
          {
            title: "🏅 Physical Delivery",
            desc: "Receive actual gold bars or coins delivered to your door. Fee: 0.25% + shipping & insurance. 180+ countries. 5–10 business days.",
          },
          {
            title: "🏦 Vault Transfer",
            desc: "Transfer gold ownership within the vault to another account. Same-day settlement. Fee: 0.10%.",
          },
        ],
      },
      { type: "divider" },
      {
        type: "para",
        text: "Physical gold is shipped via Brink's and Malca-Amit armored logistics, fully insured by Lloyd's of London for 110% of gold value.",
      },
    ],
  },
  {
    id: "vault",
    icon: "business-outline",
    title: "Gold Reserve & Vault",
    subtitle: "Where your gold is stored",
    accentColor: "#D4AF37",
    content: [
      {
        type: "para",
        text: "Your physical gold is held in world-class, fully audited vault facilities with 24/7 armed security. Primary storage is at DMCC Dubai — one of the world's most secure precious metals storage facilities.",
      },
      { type: "divider" },
      {
        type: "kv",
        pairs: [
          { k: "Primary Vault",     v: "DMCC Dubai (Dubai Multi Commodities Centre)" },
          { k: "Gold Standard",     v: "LBMA Good Delivery Bars, 99.5%+ purity" },
          { k: "Custody Partners",  v: "Brink's · Malca-Amit · Loomis International" },
          { k: "Insurance",         v: "Lloyd's of London — 110% of gold value" },
          { k: "Tracking",          v: "Serial number per bar, photographic record, blockchain entry" },
          { k: "Gold Sourcing",     v: "Valcambi · PAMP · Perth Mint · Royal Canadian Mint" },
        ],
      },
      { type: "divider" },
      {
        type: "bullet",
        items: [
          "100% backing maintained at all times — no exceptions",
          "Daily internal reconciliation of all holdings",
          "Monthly independent third-party audit",
          "Quarterly full physical inventory count",
          "Annual Big 4 accounting firm review",
          "Real-time cryptographic Proof of Reserves published",
          "Conflict-free, responsibly sourced gold only",
        ],
      },
    ],
  },
  {
    id: "fees",
    icon: "pricetag-outline",
    title: "Fee Structure",
    subtitle: "Transparent, low-cost pricing",
    accentColor: "#10b981",
    content: [
      {
        type: "para",
        text: "GODE charges one of the lowest fee structures in the gold market — significantly below traditional gold ETFs, dealers, and competing tokenized gold products.",
      },
      { type: "divider" },
      {
        type: "kv",
        pairs: [
          { k: "Minting (Buy)",         v: "0.15%" },
          { k: "USD Redemption (Sell)",  v: "0.15%" },
          { k: "Physical Delivery",      v: "0.25% + shipping" },
          { k: "Vault Transfer",         v: "0.10%" },
          { k: "Storage Fees",           v: "None" },
          { k: "Transfer / Send",        v: "Network gas only (~$0.01)" },
        ],
      },
      { type: "divider" },
      {
        type: "para",
        text: "Revenue from fees is distributed as: 40% operations · 30% reserve fund · 20% technology · 10% growth.",
      },
      { type: "divider" },
      {
        type: "compare",
        headers: ["Product", "Annual Fee", "24/7", "Physical"],
        rows: [
          ["GODE",          "0.15%",  "✓", "✓"],
          ["PAX Gold (PAXG)","0.50%", "✓", "✓"],
          ["Gold ETF (GLD)", "0.40%", "✗", "✗"],
          ["Physical Gold",  "0.5–2%","✗", "✓"],
        ],
      },
    ],
  },
  {
    id: "kyc",
    icon: "shield-checkmark-outline",
    title: "KYC / AML Compliance",
    subtitle: "Regulatory requirements",
    accentColor: "#10b981",
    content: [
      {
        type: "para",
        text: "GODE is fully regulated under FINMA (Swiss Financial Market Supervisory Authority) and implements strict KYC/AML procedures to comply with international financial regulations.",
      },
      { type: "divider" },
      {
        type: "steps",
        steps: [
          { title: "1. Identity Verification",  desc: "Government-issued ID (passport/national ID) + live selfie verification via Jumio." },
          { title: "2. Proof of Address",        desc: "Recent utility bill, bank statement, or official document (< 3 months old)." },
          { title: "3. Source of Funds",         desc: "Brief questionnaire about the origin of funds being invested." },
          { title: "4. PEP & Sanctions Check",   desc: "Screening against OFAC, UN, EU, and HM Treasury sanctions databases via ComplyAdvantage." },
          { title: "5. Risk Scoring",            desc: "Automated risk categorization. High-risk users require Enhanced Due Diligence (EDD)." },
        ],
      },
      { type: "divider" },
      {
        type: "kv",
        pairs: [
          { k: "KYC Provider",    v: "Jumio (identity)" },
          { k: "AML Screening",   v: "ComplyAdvantage" },
          { k: "Blockchain Intel",v: "Chainalysis" },
          { k: "Tx Monitoring",   v: "Elliptic" },
          { k: "Reporting",       v: "Suspicious Activity Reports (SARs) filed as required" },
        ],
      },
    ],
  },
  {
    id: "security",
    icon: "lock-closed-outline",
    title: "Security Framework",
    subtitle: "Multi-layer protection",
    accentColor: "#8A2BE2",
    content: [
      {
        type: "para",
        text: "GODE employs a defence-in-depth security strategy across four independent layers, protecting both digital assets and physical gold reserves.",
      },
      { type: "divider" },
      {
        type: "steps",
        steps: [
          {
            title: "Layer 1 — Smart Contract",
            desc: "Formally verified code, audited by 3 independent firms, $1M bug bounty, real-time monitoring via Forta & OpenZeppelin Defender.",
          },
          {
            title: "Layer 2 — Operational",
            desc: "Hardware Security Modules (HSMs), Multi-Party Computation (MPC) for treasury, air-gapped cold storage for admin keys.",
          },
          {
            title: "Layer 3 — Infrastructure",
            desc: "Cloudflare Enterprise DDoS (100 Gbps), Web Application Firewall, quarterly penetration testing, 24/7 Security Operations Center.",
          },
          {
            title: "Layer 4 — Physical (Vault)",
            desc: "24/7 armed guards, biometric access controls, motion detection, seismic sensors, time-delay locks at all custodian facilities.",
          },
        ],
      },
      { type: "divider" },
      {
        type: "kv",
        pairs: [
          { k: "Total Insurance",    v: "$500 million" },
          { k: "Reserve Fund",       v: "5% of AUM" },
          { k: "System Uptime SLA",  v: "99.99%" },
          { k: "Recovery Time",      v: "< 4 hours (RTO)" },
          { k: "2FA",                v: "Mandatory for all users" },
        ],
      },
    ],
  },
  {
    id: "compare",
    icon: "stats-chart-outline",
    title: "Why GODE vs Alternatives",
    subtitle: "Competitive comparison",
    accentColor: "#D4AF37",
    content: [
      {
        type: "compare",
        headers: ["Feature", "GODE", "PAXG", "ETF"],
        rows: [
          ["24/7 Trading",       "✓", "✓", "✗"],
          ["Physical Delivery",  "✓", "✓", "✗"],
          ["Low Fees (<0.2%)",   "✓", "✗", "✗"],
          ["Multi-Chain",        "✓", "✗", "—"],
          ["DeFi Integration",   "✓", "Ltd", "✗"],
          ["Storage Costs",      "None","None","0.4%"],
          ["Fractional",         "✓", "✓", "✓"],
          ["Instant Settlement", "✓", "✓", "✗"],
        ],
      },
      { type: "divider" },
      {
        type: "para",
        text: "Vs PAX Gold (PAXG): GODE charges 0.15% vs PAXG's 0.50%. GODE supports multiple blockchains natively vs Ethereum-only for PAXG.",
      },
      {
        type: "para",
        text: "Vs Gold ETFs (GLD/IAU): ETFs trade only during market hours, carry 0.40% annual management fees, and offer no physical delivery. GODE has none of these limitations.",
      },
      {
        type: "para",
        text: "Vs Physical Gold: Physical gold requires costly storage, insurance, and verification. GODE eliminates these entirely while preserving the option for physical delivery.",
      },
    ],
  },
  {
    id: "roadmap",
    icon: "map-outline",
    title: "Roadmap",
    subtitle: "Platform development timeline",
    accentColor: "#8A2BE2",
    content: [
      {
        type: "steps",
        steps: [
          {
            title: "✅ Q1–Q2 2024 — Foundation & Launch",
            desc: "Smart contracts deployed on Polygon & BSC. Security audits completed. Initial custody partnerships with DMCC Dubai signed.",
          },
          {
            title: "🔄 Q3–Q4 2024 — Growth",
            desc: "Mobile app launch (iOS/Android). Ethereum integration. $100M gold reserves target. Physical delivery service launched.",
          },
          {
            title: "🎯 2025 — Expansion",
            desc: "10,000+ active users. $500M in gold reserves. EU MiCA compliance. Singapore MAS license. Dubai VARA registration. UK FCA authorization.",
          },
          {
            title: "🚀 2026 — Scale",
            desc: "$1 billion gold reserves. 100,000+ users. DAO governance implementation. Gold-backed lending protocol.",
          },
          {
            title: "🌍 2027–2028 — Global Leader",
            desc: "$10 billion gold reserves. Full decentralization. Central bank partnerships. Native GODE payment cards. CBDC integration.",
          },
        ],
      },
      { type: "divider" },
      {
        type: "kv",
        pairs: [
          { k: "Year 1 Target",  v: "$100M TVL, 10K users" },
          { k: "Year 2 Target",  v: "$500M TVL, 50K users" },
          { k: "Year 3 Target",  v: "$2B TVL, 200K users" },
          { k: "Year 5 Target",  v: "$10B TVL, 1M users" },
        ],
      },
    ],
  },
  {
    id: "glossary",
    icon: "book-outline",
    title: "Glossary",
    subtitle: "Key terms explained",
    accentColor: "#6b7280",
    content: [
      {
        type: "kv",
        pairs: [
          { k: "LBMA",         v: "London Bullion Market Association — sets global gold trading standards" },
          { k: "Troy Ounce",   v: "Standard unit for precious metals = 31.1035 grams" },
          { k: "Good Delivery",v: "LBMA spec: gold bars 350–430 oz, 99.5%+ purity, from approved refiners" },
          { k: "DMCC",         v: "Dubai Multi Commodities Centre — world's largest free trade zone for commodities" },
          { k: "FINMA",        v: "Swiss Financial Market Supervisory Authority — Finatrades' primary regulator" },
          { k: "ERC-20",       v: "Ethereum token standard used by GODE on Polygon & BSC" },
          { k: "DeFi",         v: "Decentralized Finance — financial services via blockchain smart contracts" },
          { k: "Minting",      v: "Creating new GODE tokens when physical gold is purchased and deposited" },
          { k: "Redemption",   v: "Burning GODE tokens to receive USD, physical gold, or vault transfer" },
          { k: "TVL",          v: "Total Value Locked — total USD value of gold backed by GODE tokens" },
          { k: "Oracle",       v: "Chainlink service that feeds live XAU/USD gold price to smart contracts" },
          { k: "Multi-sig",    v: "Wallet requiring multiple approvals before any transaction executes" },
          { k: "KYC/AML",      v: "Know Your Customer / Anti-Money Laundering — regulatory compliance checks" },
        ],
      },
    ],
  },
];

export default function LearnScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<string | null>("what");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function toggle(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>GODE Whitepaper</Text>
        <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
          Gold and Code — v1.0 · Sep 2025
        </Text>
      </View>

      <LinearGradient
        colors={["#1A0933", "#0D0622"]}
        style={[styles.heroBanner, { borderColor: colors.purple + "40" }]}
      >
        <View style={styles.heroRow}>
          <View style={[styles.heroIcon, { backgroundColor: "#D4AF37" + "22" }]}>
            <MaterialCommunityIcons name="gold" size={28} color="#D4AF37" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>1 GODE = 1 Troy Ounce</Text>
            <Text style={styles.heroSub}>Physical LBMA Gold · DMCC Dubai Vault · FINMA Regulated</Text>
          </View>
        </View>
        <View style={styles.heroStats}>
          {[
            { v: "0.15%", l: "Fee" },
            { v: "100%", l: "Backed" },
            { v: "24/7", l: "Trading" },
            { v: "~$0.01", l: "Gas" },
          ].map((s) => (
            <View key={s.l} style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{s.v}</Text>
              <Text style={styles.heroStatLabel}>{s.l}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.sectionsContainer}>
        {SECTIONS.map((section) => (
          <AccordionSection
            key={section.id}
            section={section}
            isOpen={expanded === section.id}
            onToggle={() => toggle(section.id)}
            colors={colors}
          />
        ))}
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerTxt, { color: colors.mutedForeground }]}>
          © 2025 Finatrades Corporation · All rights reserved
        </Text>
        <Text style={[styles.footerTxt, { color: colors.mutedForeground }]}>
          GODE™ is a trademark of Finatrades Corporation
        </Text>
        <Text style={[styles.footerNote, { color: colors.mutedForeground }]}>
          This information is for educational purposes and does not constitute investment advice.
        </Text>
      </View>
    </ScrollView>
  );
}

function AccordionSection({
  section,
  isOpen,
  onToggle,
  colors,
}: {
  section: Section;
  isOpen: boolean;
  onToggle: () => void;
  colors: any;
}) {
  return (
    <View style={[styles.accordion, { backgroundColor: colors.card, borderColor: isOpen ? section.accentColor + "50" : colors.border }]}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.accordionHeader, { opacity: pressed ? 0.8 : 1 }]}
        testID={`accordion-${section.id}`}
      >
        <View style={[styles.accordionIconBox, { backgroundColor: section.accentColor + "18" }]}>
          <Ionicons name={section.icon as any} size={20} color={section.accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.accordionTitle, { color: colors.foreground }]}>{section.title}</Text>
          <Text style={[styles.accordionSub, { color: colors.mutedForeground }]}>{section.subtitle}</Text>
        </View>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color={isOpen ? section.accentColor : colors.mutedForeground}
        />
      </Pressable>

      {isOpen && (
        <View style={[styles.accordionBody, { borderTopColor: colors.border }]}>
          {section.content.map((block, i) => (
            <ContentBlockView key={i} block={block} accent={section.accentColor} colors={colors} />
          ))}
        </View>
      )}
    </View>
  );
}

function ContentBlockView({ block, accent, colors }: { block: ContentBlock; accent: string; colors: any }) {
  if (block.type === "divider") {
    return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
  }

  if (block.type === "para") {
    return <Text style={[styles.para, { color: colors.mutedForeground }]}>{block.text}</Text>;
  }

  if (block.type === "stat") {
    return (
      <View style={[styles.statBox, { backgroundColor: accent + "10", borderColor: accent + "30" }]}>
        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{block.label}</Text>
        <Text style={[styles.statValue, { color: accent }]}>{block.value}</Text>
        {block.sub && <Text style={[styles.statSub, { color: colors.mutedForeground }]}>{block.sub}</Text>}
      </View>
    );
  }

  if (block.type === "bullet") {
    return (
      <View style={styles.bulletList}>
        {block.items.map((item, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={[styles.bulletDot, { backgroundColor: accent }]} />
            <Text style={[styles.bulletText, { color: colors.foreground }]}>{item}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (block.type === "steps") {
    return (
      <View style={styles.stepsList}>
        {block.steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepLine}>
              <View style={[styles.stepDot, { backgroundColor: accent }]} />
              {i < block.steps.length - 1 && (
                <View style={[styles.stepConnector, { backgroundColor: accent + "30" }]} />
              )}
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
              <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (block.type === "kv") {
    return (
      <View style={[styles.kvTable, { borderColor: colors.border }]}>
        {block.pairs.map((pair, i) => (
          <View
            key={i}
            style={[
              styles.kvRow,
              { borderBottomColor: colors.border },
              i === block.pairs.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <Text style={[styles.kvKey, { color: colors.mutedForeground }]}>{pair.k}</Text>
            <Text style={[styles.kvVal, { color: colors.foreground }]}>{pair.v}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (block.type === "compare") {
    return (
      <View style={[styles.compareTable, { borderColor: colors.border }]}>
        <View style={[styles.compareHeaderRow, { backgroundColor: accent + "15" }]}>
          {block.headers.map((h, i) => (
            <Text key={i} style={[styles.compareHeader, { color: accent, flex: i === 0 ? 2 : 1 }]}>{h}</Text>
          ))}
        </View>
        {block.rows.map((row, ri) => (
          <View
            key={ri}
            style={[
              styles.compareRow,
              { borderTopColor: colors.border },
              ri % 2 === 0 && { backgroundColor: colors.background + "80" },
            ]}
          >
            {row.map((cell, ci) => (
              <Text
                key={ci}
                style={[
                  styles.compareCell,
                  {
                    flex: ci === 0 ? 2 : 1,
                    color: cell === "✓" ? "#10b981" : cell === "✗" ? "#ef4444" : ci === 1 ? accent : colors.foreground,
                    fontFamily: ci === 0 ? "Inter_500Medium" : "Inter_700Bold",
                  },
                ]}
              >
                {cell}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { paddingHorizontal: 20, marginBottom: 16 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  pageSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  heroBanner: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  heroIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  heroSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", marginTop: 3 },
  heroStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 14,
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatVal: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#D4AF37" },
  heroStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", marginTop: 3 },
  sectionsContainer: { paddingHorizontal: 20, gap: 8 },
  accordion: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  accordionIconBox: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  accordionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  accordionSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  accordionBody: { borderTopWidth: 1, padding: 16, gap: 12 },
  divider: { height: 1 },
  para: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  statBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  statLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  bulletList: { gap: 8 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  bulletText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  stepsList: { gap: 0 },
  stepRow: { flexDirection: "row", gap: 12 },
  stepLine: { alignItems: "center", width: 16 },
  stepDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  stepConnector: { width: 2, flex: 1, marginTop: 4 },
  stepContent: { flex: 1, paddingBottom: 14 },
  stepTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  stepDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 3 },
  kvTable: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  kvKey: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1.2 },
  kvVal: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1.8, textAlign: "right" },
  compareTable: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  compareHeaderRow: { flexDirection: "row", padding: 10 },
  compareHeader: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  compareRow: { flexDirection: "row", borderTopWidth: 1, padding: 10 },
  compareCell: { fontSize: 12, textAlign: "center" },
  footer: { margin: 20, paddingTop: 20, borderTopWidth: 1, gap: 4, alignItems: "center" },
  footerTxt: { fontSize: 11, fontFamily: "Inter_400Regular" },
  footerNote: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
});
