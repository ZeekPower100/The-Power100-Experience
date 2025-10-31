import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from './jsonHelpers';

interface PartnerData {
  company_name: string;
  contact_email: string;
  contact_phone?: string;
  website?: string;
  current_powerconfidence_score: number;
  score_trend: string;
  service_categories: string;
  total_contractor_engagements: number;
  avg_contractor_satisfaction: number;
  recent_feedback_count: number;
  status?: string;
}

interface ExportData {
  partner: PartnerData;
  scoreHistory?: Array<{
    quarter: string;
    score: number;
    feedback_count: number;
  }>;
  categoryBreakdown?: Array<{
    category: string;
    score: number;
    weight: number;
  }>;
  insights?: Array<{
    type: string;
    message: string;
  }>;
}

export const exportToPDF = async (data: ExportData, elementId?: string) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Add Power100 branding
  pdf.setFillColor(251, 4, 1); // Power100 red
  pdf.rect(0, 0, pageWidth, 30, 'F');
  
  // Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.text('PowerConfidence Report', pageWidth / 2, 15, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text(data.partner.company_name, pageWidth / 2, 23, { align: 'center' });
  
  // Reset text color
  pdf.setTextColor(0, 0, 0);
  yPosition = 40;

  // Partner Information Section
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  pdf.text('Partner Information', 20, yPosition);
  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(10);
  yPosition += 10;

  const partnerInfo = [
    ['Company', data.partner.company_name],
    ['Email', data.partner.contact_email],
    ['Phone', data.partner.contact_phone || 'N/A'],
    ['Website', data.partner.website || 'N/A'],
    ['Status', data.partner.status || 'Active'],
    ['Service Categories', parseServiceCategories(data.partner.service_categories)]
  ];

  partnerInfo.forEach(([label, value]) => {
    pdf.setFont(undefined, 'bold');
    pdf.text(`${label}:`, 20, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.text(String(value), 80, yPosition); // Increased from 50 to 80 to prevent overlap
    yPosition += 7;
  });

  // PowerConfidence Score Section
  yPosition += 10;
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  pdf.text('PowerConfidence Score', 20, yPosition);
  yPosition += 10;

  // Score box
  pdf.setFillColor(240, 240, 240);
  pdf.rect(20, yPosition - 8, pageWidth - 40, 25, 'F');
  
  pdf.setFontSize(24);
  pdf.setTextColor(251, 4, 1);
  pdf.text(`${data.partner.current_powerconfidence_score}/100`, pageWidth / 2, yPosition + 5, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  const trendText = data.partner.score_trend === 'up' ? 'Trending Up' :
                   data.partner.score_trend === 'down' ? 'Trending Down' :
                   'Stable';
  pdf.text(trendText, pageWidth / 2, yPosition + 12, { align: 'center' });
  
  yPosition += 30;

  // Performance Metrics
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  pdf.text('Performance Metrics', 20, yPosition);
  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(10);
  yPosition += 10;

  const metrics = [
    ['Total Engagements', String(data.partner.total_contractor_engagements)],
    ['Average Satisfaction', `${data.partner.avg_contractor_satisfaction.toFixed(1)}/5.0`],
    ['Recent Feedback Count', String(data.partner.recent_feedback_count)]
  ];

  metrics.forEach(([label, value]) => {
    pdf.setFont(undefined, 'bold');
    pdf.text(`${label}:`, 20, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.text(value, 70, yPosition);
    yPosition += 7;
  });

  // Category Breakdown (if available)
  if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
    yPosition += 10;
    
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Category Breakdown', 20, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(10);
    yPosition += 10;

    data.categoryBreakdown.forEach(category => {
      pdf.text(`${category.category}: ${category.score}/100 (Weight: ${category.weight}%)`, 20, yPosition);
      
      // Draw progress bar
      pdf.setFillColor(230, 230, 230);
      pdf.rect(20, yPosition + 2, 100, 3, 'F');
      pdf.setFillColor(251, 4, 1);
      pdf.rect(20, yPosition + 2, category.score, 3, 'F');
      
      yPosition += 10;
    });
  }

  // Score History (if available)
  if (data.scoreHistory && data.scoreHistory.length > 0) {
    yPosition += 10;
    
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Score History', 20, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(10);
    yPosition += 10;

    data.scoreHistory.forEach(quarter => {
      pdf.text(`${quarter.quarter}: Score ${quarter.score}/100 (${quarter.feedback_count} responses)`, 20, yPosition);
      yPosition += 7;
    });
  }

  // Insights (if available)
  if (data.insights && data.insights.length > 0) {
    yPosition += 10;
    
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Key Insights', 20, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(10);
    yPosition += 10;

    data.insights.forEach(insight => {
      const icon = insight.type === 'success' ? '✓' : 
                  insight.type === 'warning' ? '!' : 
                  '•';
      const lines = pdf.splitTextToSize(`${icon} ${insight.message}`, pageWidth - 40);
      lines.forEach(line => {
        pdf.text(line, 20, yPosition);
        yPosition += 5;
      });
      yPosition += 2;
    });
  }

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Generated on ${new Date().toLocaleDateString()} | The Power100 Experience`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save the PDF
  pdf.save(`PowerConfidence_${data.partner.company_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToExcel = async (data: ExportData | ExportData[]) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'The Power100 Experience';
  workbook.created = new Date();

  if (Array.isArray(data)) {
    // Multiple partners export
    const worksheet = workbook.addWorksheet('Partners Overview');

    // Define columns with widths
    worksheet.columns = [
      { header: 'Company Name', key: 'company_name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Website', key: 'website', width: 30 },
      { header: 'PowerConfidence Score', key: 'score', width: 20 },
      { header: 'Trend', key: 'trend', width: 10 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Service Categories', key: 'categories', width: 40 },
      { header: 'Total Engagements', key: 'engagements', width: 15 },
      { header: 'Avg Satisfaction', key: 'satisfaction', width: 15 },
      { header: 'Recent Feedback', key: 'feedback', width: 15 }
    ];

    // Add rows
    data.forEach(item => {
      worksheet.addRow({
        company_name: item.partner.company_name,
        email: item.partner.contact_email,
        phone: item.partner.contact_phone || 'N/A',
        website: item.partner.website || 'N/A',
        score: item.partner.current_powerconfidence_score,
        trend: item.partner.score_trend,
        status: item.partner.status || 'Active',
        categories: parseServiceCategories(item.partner.service_categories),
        engagements: item.partner.total_contractor_engagements,
        satisfaction: item.partner.avg_contractor_satisfaction,
        feedback: item.partner.recent_feedback_count
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  } else {
    // Single partner detailed export
    const partner = data.partner;

    // Partner Info Sheet
    const partnerSheet = workbook.addWorksheet('Partner Info');
    partnerSheet.columns = [
      { header: 'Field', key: 'field', width: 30 },
      { header: 'Value', key: 'value', width: 50 }
    ];

    partnerSheet.addRows([
      { field: 'Company Name', value: partner.company_name },
      { field: 'Email', value: partner.contact_email },
      { field: 'Phone', value: partner.contact_phone || 'N/A' },
      { field: 'Website', value: partner.website || 'N/A' },
      { field: 'PowerConfidence Score', value: partner.current_powerconfidence_score },
      { field: 'Trend', value: partner.score_trend },
      { field: 'Status', value: partner.status || 'Active' },
      { field: 'Service Categories', value: parseServiceCategories(partner.service_categories) },
      { field: 'Total Engagements', value: partner.total_contractor_engagements },
      { field: 'Avg Satisfaction', value: partner.avg_contractor_satisfaction },
      { field: 'Recent Feedback', value: partner.recent_feedback_count }
    ]);

    partnerSheet.getRow(1).font = { bold: true };

    // Category Breakdown Sheet
    if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
      const categorySheet = workbook.addWorksheet('Category Scores');
      categorySheet.columns = [
        { header: 'Category', key: 'category', width: 30 },
        { header: 'Score', key: 'score', width: 15 },
        { header: 'Weight (%)', key: 'weight', width: 15 }
      ];

      data.categoryBreakdown.forEach(cat => {
        categorySheet.addRow({
          category: cat.category,
          score: cat.score,
          weight: cat.weight
        });
      });

      categorySheet.getRow(1).font = { bold: true };
    }

    // Score History Sheet
    if (data.scoreHistory && data.scoreHistory.length > 0) {
      const historySheet = workbook.addWorksheet('Score History');
      historySheet.columns = [
        { header: 'Quarter', key: 'quarter', width: 20 },
        { header: 'Score', key: 'score', width: 15 },
        { header: 'Feedback Count', key: 'feedback_count', width: 20 }
      ];

      data.scoreHistory.forEach(quarter => {
        historySheet.addRow({
          quarter: quarter.quarter,
          score: quarter.score,
          feedback_count: quarter.feedback_count
        });
      });

      historySheet.getRow(1).font = { bold: true };
    }

    // Insights Sheet
    if (data.insights && data.insights.length > 0) {
      const insightsSheet = workbook.addWorksheet('Insights');
      insightsSheet.columns = [
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Insight', key: 'insight', width: 80 }
      ];

      data.insights.forEach(insight => {
        insightsSheet.addRow({
          type: insight.type,
          insight: insight.message
        });
      });

      insightsSheet.getRow(1).font = { bold: true };
    }
  }

  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const fileName = Array.isArray(data)
    ? `PowerConfidence_All_Partners_${new Date().toISOString().split('T')[0]}.xlsx`
    : `PowerConfidence_${data.partner.company_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

  saveAs(blob, fileName);
};

export const exportToCSV = (data: ExportData | ExportData[]) => {
  let csvContent = '';
  
  if (Array.isArray(data)) {
    // Headers
    csvContent = 'Company Name,Email,Phone,Website,PowerConfidence Score,Trend,Status,Service Categories,Total Engagements,Avg Satisfaction,Recent Feedback\n';
    
    // Data rows
    data.forEach(item => {
      const partner = item.partner;
      csvContent += `"${partner.company_name}","${partner.contact_email}","${partner.contact_phone || 'N/A'}","${partner.website || 'N/A'}",${partner.current_powerconfidence_score},"${partner.score_trend}","${partner.status || 'Active'}","${parseServiceCategories(partner.service_categories)}",${partner.total_contractor_engagements},${partner.avg_contractor_satisfaction},${partner.recent_feedback_count}\n`;
    });
  } else {
    const partner = data.partner;
    csvContent = 'Field,Value\n';
    csvContent += `"Company Name","${partner.company_name}"\n`;
    csvContent += `"Email","${partner.contact_email}"\n`;
    csvContent += `"Phone","${partner.contact_phone || 'N/A'}"\n`;
    csvContent += `"Website","${partner.website || 'N/A'}"\n`;
    csvContent += `"PowerConfidence Score",${partner.current_powerconfidence_score}\n`;
    csvContent += `"Trend","${partner.score_trend}"\n`;
    csvContent += `"Status","${partner.status || 'Active'}"\n`;
    csvContent += `"Service Categories","${parseServiceCategories(partner.service_categories)}"\n`;
    csvContent += `"Total Engagements",${partner.total_contractor_engagements}\n`;
    csvContent += `"Avg Satisfaction",${partner.avg_contractor_satisfaction}\n`;
    csvContent += `"Recent Feedback",${partner.recent_feedback_count}\n`;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const fileName = Array.isArray(data)
    ? `PowerConfidence_All_Partners_${new Date().toISOString().split('T')[0]}.csv`
    : `PowerConfidence_${data.partner.company_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  
  saveAs(blob, fileName);
};

// Helper function to parse service categories
function parseServiceCategories(categories: string): string {
  try {
    const parsed = safeJsonParse(categories);
    return Array.isArray(parsed) ? parsed.join(', ') : categories;
  } catch {
    return categories || 'N/A';
  }
}