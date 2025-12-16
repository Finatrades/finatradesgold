import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

type ReportType = 'transactions' | 'portfolio' | 'complete';
type DateRange = '7days' | '30days' | '90days' | 'all';

export default function ReportsSection() {
  const { user } = useAuth();
  const { wallet, vaultHoldings, transactions, bnslPlans, goldPrice, totals, isLoading } = useDashboardData();
  const [reportType, setReportType] = useState<ReportType>('complete');
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [generating, setGenerating] = useState(false);

  const dataReady = !isLoading && (wallet !== null || vaultHoldings.length > 0 || transactions.length > 0);

  const filterTransactionsByDate = () => {
    const now = new Date();
    let startDate: Date;
    
    switch (dateRange) {
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        return transactions;
    }
    
    return transactions.filter(tx => new Date(tx.createdAt) >= startDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const generatePDF = async () => {
    if (!user) return;
    
    setGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;
      const lineHeight = 7;
      const margin = 20;

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Finatrades Account Report', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Generated on ${formatDate(new Date())}`, margin, yPos);
      yPos += 15;

      doc.setDrawColor(200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('Account Information', margin, yPos);
      yPos += lineHeight;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Account Holder: ${user.firstName} ${user.lastName}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`Email: ${user.email}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`Account Status: ${user.kycStatus || 'Pending'}`, margin, yPos);
      yPos += 15;

      if (reportType === 'portfolio' || reportType === 'complete') {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Portfolio Summary', margin, yPos);
        yPos += lineHeight;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const portfolioData = [
          ['Vault Gold Holdings', `${formatNumber(totals.vaultGoldGrams, 4)} g`],
          ['Vault Value (USD)', `$${formatNumber(totals.vaultGoldValueUsd)}`],
          ['Vault Value (AED)', `د.إ ${formatNumber(totals.vaultGoldValueAed)}`],
          ['Wallet Gold Balance', `${formatNumber(totals.walletGoldGrams, 4)} g`],
          ['Wallet USD Balance', `$${formatNumber(totals.walletUsdBalance)}`],
          ['BNSL Locked Gold', `${formatNumber(totals.bnslLockedGrams, 4)} g`],
          ['BNSL Total Earnings', `$${formatNumber(totals.bnslTotalProfit)}`],
          ['Total Portfolio Value', `$${formatNumber(totals.totalPortfolioUsd)}`],
          ['Current Gold Price', `$${formatNumber(goldPrice, 2)}/g`],
        ];

        portfolioData.forEach(([label, value]) => {
          doc.text(label, margin, yPos);
          doc.text(value, pageWidth - margin - 50, yPos);
          yPos += lineHeight;
        });
        
        yPos += 10;
      }

      if (reportType === 'transactions' || reportType === 'complete') {
        const filteredTx = filterTransactionsByDate();
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Transaction History (${dateRange === 'all' ? 'All Time' : `Last ${dateRange.replace('days', ' Days')}`})`, margin, yPos);
        yPos += lineHeight;

        if (filteredTx.length === 0) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text('No transactions found for the selected period.', margin, yPos);
          yPos += lineHeight;
        } else {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          
          const colWidths = [25, 35, 35, 35, 40];
          const headers = ['Date', 'Type', 'Gold (g)', 'USD', 'Status'];
          let xPos = margin;
          
          headers.forEach((header, i) => {
            doc.text(header, xPos, yPos);
            xPos += colWidths[i];
          });
          yPos += lineHeight;

          doc.setDrawColor(200);
          doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);

          doc.setFont('helvetica', 'normal');
          
          filteredTx.slice(0, 30).forEach(tx => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            
            xPos = margin;
            const txDate = new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const goldAmt = tx.amountGold ? parseFloat(tx.amountGold).toFixed(4) : '-';
            const usdAmt = tx.amountUsd ? `$${parseFloat(tx.amountUsd).toFixed(2)}` : '-';
            
            const rowData = [txDate, tx.type, goldAmt, usdAmt, tx.status];
            
            rowData.forEach((cell, i) => {
              doc.text(cell.toString().substring(0, 15), xPos, yPos);
              xPos += colWidths[i];
            });
            yPos += lineHeight - 1;
          });

          if (filteredTx.length > 30) {
            yPos += 5;
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`... and ${filteredTx.length - 30} more transactions`, margin, yPos);
            doc.setTextColor(0);
          }
        }
      }

      yPos = 280;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('This report is generated by Finatrades for informational purposes.', margin, yPos);
      yPos += 4;
      doc.text('All values are based on current market rates and may change.', margin, yPos);

      const fileName = `finatrades-report-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-600" />
          Download Reports
        </CardTitle>
        <CardDescription>
          Generate PDF reports of your account activity and portfolio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger data-testid="select-report-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complete">Complete Report</SelectItem>
                <SelectItem value="portfolio">Portfolio Summary</SelectItem>
                <SelectItem value="transactions">Transactions Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger data-testid="select-date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button 
          onClick={generatePDF} 
          disabled={generating || isLoading}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          data-testid="button-download-report"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading data...
            </>
          ) : generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download PDF Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
