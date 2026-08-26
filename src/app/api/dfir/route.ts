/**
 * National SOC Platform - DFIR (Digital Forensics & Incident Response) API Routes
 * 
 * RESTful API endpoints for DFIR operations:
 * - Evidence management
 * - Incident response
 * - Forensic analysis
 * - Malware analysis
 * 
 * @version 3.0.0 (Phase 9 Enhancement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { evidenceManager, EvidenceItem, CustodyReportData } from '@/lib/dfir/evidence-management';
import { forensicAnalyzer, ForensicCase } from '@/lib/dfir/forensic-analysis';
import { playbookEngine, PlaybookExecution } from '@/lib/dfir/incident-response-playbooks';
import { malwareAnalyzer, MalwareSample } from '@/lib/dfir/malware-analysis';

// ============================================================
// EVIDENCE MANAGEMENT API
// ============================================================

// GET /api/dfir/evidence - List and query evidence
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'by_case': {
        const caseId = searchParams.get('caseId');
        if (!caseId) {
          return NextResponse.json({ success: false, error: 'caseId required' }, { status: 400 });
        }
        const evidence = evidenceManager.getEvidenceByCase(caseId);
        return NextResponse.json({ success: true, data: evidence, count: evidence.length });
      }

      case 'chain_of_custody': {
        const evidenceId = searchParams.get('evidenceId');
        if (!evidenceId) {
          return NextResponse.json({ success: false, error: 'evidenceId required' }, { status: 400 });
        }
        const report = evidenceManager.getChainOfCustody(evidenceId);
        return NextResponse.json({ success: true, data: report });
      }

      case 'custody_report': {
        const evidenceId = searchParams.get('evidenceId');
        if (!evidenceId) {
          return NextResponse.json({ success: false, error: 'evidenceId required' }, { status: 400 });
        }
        const reportData = evidenceManager.generateCustodyReport(evidenceId);
        return NextResponse.json({ success: true, data: reportData });
      }

      case 'expired': {
        const expired = evidenceManager.getExpiredEvidence();
        return NextResponse.json({ success: true, data: expired, count: expired.length });
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Specify action: by_case, chain_of_custody, custody_report, expired',
          availableActions: ['by_case', 'chain_of_custody', 'custody_report', 'expired'],
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[DFIR Evidence API] GET error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: error instanceof Error && message.includes('not found') ? 404 : 500 }
    );
  }
}

// POST /api/dfir/evidence - Register and manage evidence
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'register': {
        const evidence = await evidenceManager.registerEvidence({
          caseId: body.caseId,
          title: body.title,
          description: body.description,
          category: body.category,
          type: body.type,
          sourceSystem: body.sourceSystem,
          sourceType: body.sourceType,
          collectedBy: body.collectedBy,
          collectionMethod: body.collectionMethod,
          filePath: body.filePath,
          metadata: body.metadata,
          incidentId: body.incidentId,
        });
        return NextResponse.json({ success: true, data: evidence });
      }

      case 'transfer_custody': {
        const result = await evidenceManager.transferCustody(
          body.evidenceId,
          body.to,
          body.reason,
          body.authorizedBy,
          body.location
        );
        return NextResponse.json({ success: true, data: result });
      }

      case 'log_access': {
        const result = await evidenceManager.logAccess(
          body.evidenceId,
          body.accessedBy,
          body.reason
        );
        return NextResponse.json({ success: true, data: result });
      }

      case 'verify_integrity': {
        const evidenceId = body.evidenceId;
        
        if (body.batch === true && body.caseId) {
          // Batch verify all evidence in a case
          const results = await evidenceManager.batchVerifyCaseEvidence(body.caseId);
          return NextResponse.json({ 
            success: true, 
            data: results,
            summary: {
              total: results.length,
              valid: results.filter(r => r.isValid).length,
              corrupted: results.filter(r => !r.isValid).length,
            },
          });
        }
        
        const result = await evidenceManager.verifyIntegrity(evidenceId);
        return NextResponse.json({ success: true, data: result });
      }

      case 'place_legal_hold': {
        const result = await evidenceManager.placeLegalHold(
          body.evidenceIds,
          {
            id: `LHD_${Date.now()}`,
            caseName: body.caseName || 'Untitled Case',
            issuedBy: body.issuedBy,
            issuedAt: new Date(),
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
            description: body.description || 'Legal hold placed',
            authorizedBy: body.authorizedBy,
          }
        );
        return NextResponse.json({ success: true, data: result });
      }

      case 'release_legal_hold': {
        const result = await evidenceManager.releaseLegalHold(body.holdId, body.releasedBy);
        return NextResponse.json({ success: true, data: result });
      }

      case 'create_collection': {
        const collection = await evidenceManager.createCollection(body.caseId, body.name);
        return NextResponse.json({ success: true, data: collection });
      }

      case 'add_to_collection': {
        await evidenceManager.addToCollection(body.collectionId, body.evidenceId);
        return NextResponse.json({ success: true, message: 'Evidence added to collection' });
      }

      case 'export': {
        const exportPkg = await evidenceManager.exportForExternal(
          body.evidenceId,
          body.destination,
          body.authorizedBy,
          body.purpose
        );
        return NextResponse.json({ success: true, data: exportPkg });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[DFIR Evidence API] POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================
// FORENSIC ANALYSIS API
// ============================================================

// GET /api/dfir/forensics - Forensic cases and analysis
export async function forensicsGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'cases_by_status': {
        const status = searchParams.get('status') as ForensicCase['status'];
        if (!status) {
          return NextResponse.json({ success: false, error: 'status required' }, { status: 400 });
        }
        const cases = forensicAnalyzer.getCasesByStatus(status);
        return NextResponse.json({ success: true, data: cases, count: cases.length });
      }

      case 'get_case': {
        const caseId = searchParams.get('caseId');
        if (!caseId) {
          return NextResponse.json({ success: false, error: 'caseId required' }, { status: 400 });
        }
        const forensicCase = forensicAnalyzer.getCase(caseId);
        return NextResponse.json({ success: true, data: forensicCase });
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Specify action: cases_by_status, get_case',
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[DFIR Forensics API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/dfir/forensics - Create forensic cases and analyze
export async function forensicsPOST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'create_case': {
        const forensicCase = forensicAnalyzer.createCase({
          name: body.name,
          description: body.description,
          type: body.type,
          severity: body.severity,
          leadAnalyst: body.leadAnalyst,
          tags: body.tags,
        });
        return NextResponse.json({ success: true, data: forensicCase });
      }

      case 'add_timeline_events': {
        const events = forensicAnalyzer.addTimelineEvents(body.caseId, body.events);
        return NextResponse.json({ success: true, data: events, count: events.length });
      }

      case 'analyze_prefetch': {
        const result = forensicAnalyzer.analyzePrefetch(body.data);
        return NextResponse.json({ success: true, data: result });
      }

      case 'analyze_registry': {
        const result = forensicAnalyzer.analyzeRegistry(body.data);
        return NextResponse.json({ success: true, data: result });
      }

      case 'analyze_browser_history': {
        const result = forensicAnalyzer.analyzeBrowserHistory(body.data);
        return NextResponse.json({ success: true, data: result });
      }

      case 'analyze_network_connections': {
        const result = forensicAnalyzer.analyzeNetworkConnections(body.connections);
        return NextResponse.json({ success: true, data: result });
      }

      case 'build_super_timeline': {
        const superTimeline = forensicAnalyzer.buildSuperTimeline(body.events);
        return NextResponse.json({ success: true, data: superTimeline });
      }

      case 'extract_iocs': {
        const iocs = forensicAnalyzer.extractIOCs(body.events);
        return NextResponse.json({ success: true, data: iocs, count: iocs.length });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[DFIR Forensics API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================
// INCIDENT RESPONSE PLAYBOOKS API
// ============================================================

// GET /api/dfir/playbooks - Get playbooks and executions
export async function playbooksGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'for_incident': {
        const category = searchParams.get('category');
        const severity = searchParams.get('severity') as PlaybookExecution['severity'];
        if (!category || !severity) {
          return NextResponse.json(
            { success: false, error: 'category and severity required' },
            { status: 400 }
          );
        }
        const playbooks = playbookEngine.getPlaybooksForIncident(category, severity);
        return NextResponse.json({ success: true, data: playbooks });
      }

      case 'execution': {
        const executionId = searchParams.get('executionId');
        if (!executionId) {
          return NextResponse.json({ success: false, error: 'executionId required' }, { status: 400 });
        }
        // Would get execution from engine storage
        return NextResponse.json({ success: true, data: { id: executionId, status: 'running' } });
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Specify action: for_incident, execution',
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[DFIR Playbooks API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/dfir/playbooks - Execute playbooks
export async function playbooksPOST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'execute': {
        const execution = await playbookEngine.executePlaybook(
          body.playbookId,
          body.incidentId,
          body.context,
          body.executor
        );
        return NextResponse.json({ success: true, data: execution });
      }

      case 'auto_match': {
        const matches = await playbookEngine.autoMatchPlaybook(body.alerts);
        return NextResponse.json({ success: true, data: matches });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[DFIR Playbooks API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================
// MALWARE ANALYSIS API
// ============================================================

// GET /api/dfir/malware - Get samples and analysis results
export async function malwareGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'samples_by_status': {
        const status = searchParams.get('status') as MalwareSample['status'];
        if (!status) {
          return NextResponse.json({ success: false, error: 'status required' }, { status: 400 });
        }
        const samples = malwareAnalyzer.getSamplesByStatus(status);
        return NextResponse.json({ success: true, data: samples, count: samples.length });
      }

      case 'samples_by_family': {
        const family = searchParams.get('family');
        if (!family) {
          return NextResponse.json({ success: false, error: 'family required' }, { status: 400 });
        }
        const samples = malwareAnalyzer.getSamplesByFamily(family);
        return NextResponse.json({ success: true, data: samples, count: samples.length });
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Specify action: samples_by_status, samples_by_family',
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[DFIR Malware API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/dfir/malware - Submit and analyze samples
export async function malwarePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'submit_sample': {
        // In production, would receive multipart/form-data with file
        const sample = await malwareAnalyzer.submitSample({
          file: Buffer.from(body.fileData || '', 'base64'),
          filename: body.filename,
          source: body.source || 'manual_upload',
          submittedBy: body.submittedBy,
          incidentId: body.incidentId,
          priority: body.priority,
          tags: body.tags,
        });
        return NextResponse.json({ success: true, data: sample });
      }

      case 'start_analysis': {
        const result = await malwareAnalyzer.startAnalysis(body.sampleId);
        return NextResponse.json({ success: true, data: result });
      }

      case 'scan_yara': {
        const matches = await malwareAnalyzer.scanWithYara(body.sampleId);
        return NextResponse.json({ success: true, data: matches, count: matches.length });
      }

      case 'lookup_threat_intel': {
        const result = await malwareAnalyzer.lookupThreatIntel(body.sampleId);
        return NextResponse.json({ success: true, data: result });
      }

      case 'release_sample': {
        await malwareAnalyzer.releaseSample(body.sampleId, body.reason, body.authorizedBy);
        return NextResponse.json({ success: true, message: 'Sample released from quarantine' });
      }

      case 'destroy_sample': {
        await malwareAnalyzer.destroySample(body.sampleId, body.reason, body.authorizedBy);
        return NextResponse.json({ success: true, message: 'Sample destroyed' });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[DFIR Malware API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
