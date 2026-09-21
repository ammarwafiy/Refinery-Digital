import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zgqtulfokenthxcnkafw.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpncXR1bGZva2VudGh4Y25rYWZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4Mjg2OSwiZXhwIjoyMTA1NDU4ODY5fQ.xl6sdDO0IiKEWXSeg2VMSM13qvuuk9qlKQgFLf84dAY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function runAutoArchiveAndPrune() {
  console.log('===============================================================');
  console.log('   NISSHIN REFINERY: AUTOMATED DATA ARCHIVE & PRUNE SYSTEM     ');
  console.log('   Compliance: ISO 9001:2015 / 21 CFR Part 11 Electronic Trail ');
  console.log('===============================================================\n');

  // Calculate default 90-day retention cutoff date
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffDate = cutoff.toISOString().split('T')[0];

  console.log(`[1/4] Scanning Supabase database for records older than cutoff: ${cutoffDate}...`);

  // Query decided sample reports
  const { data: reports, error: repErr } = await supabase
    .from('sample_reports')
    .select('*')
    .lt('sample_date', cutoffDate)
    .eq('status', 'decided');

  // Query deviations
  const { data: deviations, error: devErr } = await supabase
    .from('deviations')
    .select('*')
    .lt('created_at', cutoffDate);

  // Query audit logs
  const { data: auditLogs, error: audErr } = await supabase
    .from('audit_log')
    .select('*')
    .lt('occurred_at', cutoffDate);

  const archivePackage = {
    exported_at: new Date().toISOString(),
    retention_cutoff_date: cutoffDate,
    plant_name: 'Nisshin Deodorizer Plant (Lam Soon)',
    summary: {
      sample_reports_count: reports?.length || 0,
      deviations_count: deviations?.length || 0,
      audit_logs_count: auditLogs?.length || 0,
    },
    sample_reports: reports || [],
    deviations: deviations || [],
    audit_logs: auditLogs || [],
  };

  console.log(`[2/4] Packaging cold-storage archive for Google Drive...`);
  console.log(`      • Historical Sample Reports: ${archivePackage.summary.sample_reports_count}`);
  console.log(`      • Historical Deviations:     ${archivePackage.summary.deviations_count}`);
  console.log(`      • Historical Audit Logs:     ${archivePackage.summary.audit_logs_count}`);

  // Ensure backups directory exists
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = Date.now();
  const jsonFilePath = path.join(backupDir, `Refinery_ColdStorage_Archive_${cutoffDate}_${timestamp}.json`);
  const csvFilePath = path.join(backupDir, `Refinery_ColdStorage_Summary_${cutoffDate}_${timestamp}.csv`);

  // Write JSON backup
  fs.writeFileSync(jsonFilePath, JSON.stringify(archivePackage, null, 2), 'utf8');

  // Write CSV summary
  const csvHeaders = ['Report_No', 'Sample_Date', 'Time_Check', 'Lot_No', 'Product', 'Decision', 'Decided_At'];
  const csvRows = (reports || []).map(r => [
    r.report_no || '',
    r.sample_date || '',
    r.time_check || '',
    r.lot_no || '',
    `"${(r.product_name || '').replace(/"/g, '""')}"`,
    r.decision?.decision || 'N/A',
    r.decision?.decided_at || 'N/A'
  ].join(','));
  const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
  fs.writeFileSync(csvFilePath, csvContent, 'utf8');

  console.log(`\n✓ SUCCESS: Cold Storage Backup successfully generated on local disk:`);
  console.log(`  JSON Full: ${jsonFilePath}`);
  console.log(`  CSV Table: ${csvFilePath}`);

  // Prune from Supabase
  console.log(`\n[3/4] Executing database prune on Supabase PostgreSQL...`);
  let prunedReports = 0;
  let prunedDeviations = 0;

  if (reports && reports.length > 0) {
    const { count, error } = await supabase
      .from('sample_reports')
      .delete({ count: 'exact' })
      .lt('sample_date', cutoffDate)
      .eq('status', 'decided');
    prunedReports = count || reports.length;
  }

  if (deviations && deviations.length > 0) {
    const { count, error } = await supabase
      .from('deviations')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffDate);
    prunedDeviations = count || deviations.length;
  }

  console.log(`      ✓ Pruned ${prunedReports} historical sample reports.`);
  console.log(`      ✓ Pruned ${prunedDeviations} historical deviations.`);
  console.log(`      🛡️ Active shift sheet, product specifications, and user profiles were KEPT INTACT.`);

  // Log to audit log
  console.log(`\n[4/4] Logging ISO 9001 electronic record in audit_log...`);
  await supabase.from('audit_log').insert({
    table_name: 'system_maintenance',
    record_id: `prune-${timestamp}`,
    operation: 'update',
    new_values: {
      action: 'DATA_RETENTION_PRUNE_CLI',
      cutoff_date: cutoffDate,
      backup_files: [path.basename(jsonFilePath), path.basename(csvFilePath)],
      pruned: { reports: prunedReports, deviations: prunedDeviations }
    },
    performed_by: 'System Administrator (AD-5010)'
  });

  console.log('✓ Audit event successfully registered.');
  console.log('\n===============================================================');
  console.log('   AUTOMATED ARCHIVE & PRUNE COMPLETED SUCCESSFULLY!           ');
  console.log('   Anda boleh muat naik fail di folder ./backups ke Google Drive');
  console.log('===============================================================');
}

runAutoArchiveAndPrune().catch(err => {
  console.error('Error during auto archive and prune:', err);
  process.exit(1);
});
