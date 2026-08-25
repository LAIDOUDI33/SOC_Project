#!/usr/bin/env python3
"""
CyberSOC Platform - Comprehensive Test Suite & Purple Team Validation Framework
Phase 4 of Go-Live Roadmap
Complete testing methodology, validation procedures, and security assessment frameworks
"""

import os
import sys
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem, KeepTogether, Preformatted
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus.flowables import HRFlowable

# Constants
FONT_DIR = '/usr/share/fonts'
OUTPUT_DIR = '/home/z/my-project/download'
pt = 1

# Register fonts
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))

# Cascade Palette for CyberSOC
PAGE_BG       = colors.HexColor('#f2f2f1')
SECTION_BG    = colors.HexColor('#ebeae8')
CARD_BG       = colors.HexColor('#f0efec')
TABLE_STRIPE  = colors.HexColor('#f5f5f3')
HEADER_FILL   = colors.HexColor('#5c543c')
COVER_BLOCK   = colors.HexColor('#595343')
BORDER        = colors.HexColor('#d7d3c7')
ICON          = colors.HexColor('#907b3a')
ACCENT        = colors.HexColor('#866f2c')
ACCENT_2      = colors.HexColor('#735bb9')
TEXT_PRIMARY  = colors.HexColor('#161614')
TEXT_MUTED    = colors.HexColor('#807e76')
SEM_SUCCESS   = colors.HexColor('#3c8956')
SEM_WARNING   = colors.HexColor('#b59048')
SEM_ERROR     = colors.HexColor('#8c504b')
SEM_INFO      = colors.HexColor('#42678d')


def create_styles():
    """Create custom paragraph styles for the document"""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='CyberSOCTitle',
        fontName='NotoSerifSC-Bold',
        fontSize=28,
        leading=34,
        alignment=TA_CENTER,
        textColor=HEADER_FILL,
        spaceAfter=20
    ))
    
    styles.add(ParagraphStyle(
        name='CyberSOCSubtitle',
        fontName='NotoSerifSC',
        fontSize=16,
        leading=22,
        alignment=TA_CENTER,
        textColor=TEXT_MUTED,
        spaceAfter=30
    ))
    
    styles.add(ParagraphStyle(
        name='CyberSOCH1',
        fontName='NotoSerifSC-Bold',
        fontSize=18,
        leading=24,
        textColor=HEADER_FILL,
        spaceBefore=20,
        spaceAfter=12
    ))
    
    styles.add(ParagraphStyle(
        name='CyberSOCH2',
        fontName='NotoSerifSC-Bold',
        fontSize=14,
        leading=19,
        textColor=ACCENT,
        spaceBefore=15,
        spaceAfter=8
    ))
    
    styles.add(ParagraphStyle(
        name='CyberSOCH3',
        fontName='NotoSerifSC-Bold',
        fontSize=12,
        leading=16,
        textColor=TEXT_PRIMARY,
        spaceBefore=12,
        spaceAfter=6
    ))
    
    styles.add(ParagraphStyle(
        name='CyberSOCBody',
        fontName='NotoSerifSC',
        fontSize=10,
        leading=15,
        alignment=TA_JUSTIFY,
        textColor=TEXT_PRIMARY,
        spaceBefore=4,
        spaceAfter=8,
        firstLineIndent=0
    ))
    
    styles.add(ParagraphStyle(
        name='CyberSOCBodyNoIndent',
        fontName='NotoSerifSC',
        fontSize=10,
        leading=15,
        alignment=TA_JUSTIFY,
        textColor=TEXT_PRIMARY,
        spaceBefore=4,
        spaceAfter=8
    ))
    
    styles.add(ParagraphStyle(
        name='CyberSOCCode',
        fontName='SarasaMonoSC',
        fontSize=8,
        leading=11,
        textColor=TEXT_PRIMARY,
        backColor=CARD_BG,
        borderColor=BORDER,
        borderWidth=1,
        borderPadding=8,
        spaceBefore=6,
        spaceAfter=6
    ))
    
    styles.add(ParagraphStyle(
        name='CyberSOCBullet',
        fontName='NotoSerifSC',
        fontSize=10,
        leading=14,
        textColor=TEXT_PRIMARY,
        leftIndent=20,
        spaceBefore=2,
        spaceAfter=2
    ))
    
    styles.add(ParagraphStyle(
        name='CyberSOCTableHeader',
        fontName='NotoSerifSC-Bold',
        fontSize=9,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.white
    ))
    
    styles.add(ParagraphStyle(
        name='CyberSOCTableCell',
        fontName='NotoSerifSC',
        fontSize=9,
        leading=12,
        textColor=TEXT_PRIMARY
    ))
    
    styles.add(ParagraphStyle(
        name='CyberSOCCaption',
        fontName='NotoSerifSC',
        fontSize=9,
        leading=12,
        alignment=TA_CENTER,
        textColor=TEXT_MUTED,
        spaceBefore=4,
        spaceAfter=12
    ))

    return styles


def create_section_table(data, col_widths, styles):
    """Create a styled table with CyberSOC theme"""
    table = Table(data, colWidths=col_widths, repeatRows=1)
    
    style_commands = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]
    
    table.setStyle(TableStyle(style_commands))
    return table


def build_test_suite_purple_team_guide():
    """Build the Complete Test Suite & Purple Team Validation Guide"""
    
    output_path = os.path.join(OUTPUT_DIR, 'Cybersoc_Test_Suite_Purple_Team_Validation_Framework.pdf')
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2.5*cm,
        bottomMargin=2*cm
    )
    
    styles = create_styles()
    story = []
    
    # ==================== COVER PAGE ====================
    story.append(Spacer(1, 80))
    story.append(Paragraph("CyberSOC Platform", styles['CyberSOCTitle']))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Comprehensive Test Suite & Purple Team Validation Framework", styles['CyberSOCTitle']))
    story.append(Spacer(1, 30))
    story.append(Paragraph("Phase 4: Go-Live Roadmap Execution", styles['CyberSOCSubtitle']))
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="60%", thickness=2, color=ACCENT, spaceBefore=10, spaceAfter=10))
    story.append(Spacer(1, 30))
    
    meta_data = [
        ['Document Type', 'Technical Testing Framework'],
        ['Version', '1.0.0 - Production Ready'],
        ['Classification', 'Internal Technical / Security Sensitive'],
        ['Date', datetime.now().strftime('%Y-%m-%d')],
        ['Scope', 'Full Platform Quality Assurance Program'],
        ['Target Audience', 'QA Engineers, SRE, Security Teams, DevOps'],
    ]
    meta_table = Table(meta_data, colWidths=[150, 250])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), SECTION_BG),
        ('FONTNAME', (0, 0), (0, -1), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(meta_table)
    
    story.append(PageBreak())
    
    # ==================== TABLE OF CONTENTS ====================
    story.append(Paragraph("Table of Contents", styles['CyberSOCH1']))
    story.append(Spacer(1, 15))
    
    toc_items = [
        ("1. Testing Strategy Overview", "Quality assurance philosophy and approach"),
        ("2. Unit Testing Framework", "Component-level test specifications"),
        ("3. Integration Testing Procedures", "Service interaction validation"),
        ("4. End-to-End Testing Scenarios", "Complete user journey verification"),
        ("5. Performance and Load Testing", "Scalability and stress testing protocols"),
        ("6. Security Penetration Testing", "Vulnerability assessment methodology"),
        ("7. Purple Team Validation Exercises", "Adversary simulation and detection validation"),
        ("8. Chaos Engineering Tests", "Resilience and failure mode testing"),
        ("9. Test Automation & CI/CD Integration", "Automated pipeline quality gates"),
        ("10. Test Data Management", "Synthetic data generation and privacy"),
        ("11. Defect Tracking and Remediation", "Bug lifecycle management"),
        ("12. Release Readiness Checklist", "Go/No-Go decision criteria"),
    ]
    
    for item, desc in toc_items:
        story.append(Paragraph(f"<b>{item}</b> — {desc}", styles['CyberSOCBodyNoIndent']))
    
    story.append(PageBreak())
    
    # ==================== SECTION 1: TESTING STRATEGY OVERVIEW ====================
    story.append(Paragraph("1. Testing Strategy Overview", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    strategy_intro = """
The CyberSOC Platform testing strategy implements a comprehensive quality assurance program spanning multiple testing disciplines, execution environments, and maturity levels to ensure production readiness across functional correctness, security posture, performance characteristics, and operational resilience. The strategy follows the testing pyramid model with extensive unit test coverage forming the foundation, progressive integration testing validating component interactions, and targeted end-to-end scenarios confirming complete user workflows. Security testing receives dedicated emphasis given the platform's role as a security operations tool where trust depends on demonstrable security competence.
"""
    story.append(Paragraph(strategy_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("1.1 Testing Philosophy and Principles", styles['CyberSOCH2']))
    philosophy_text = """
The testing philosophy centers on shift-left principles integrating quality activities early in the development lifecycle when defect remediation costs remain lowest. Automated testing forms the backbone of the quality program with manual testing reserved for exploratory scenarios requiring human judgment, usability evaluation, and complex security assessments where automated tools provide incomplete coverage. Test-driven development (TDD) practices encourage writing failing tests before implementation code, ensuring comprehensive requirement coverage and serving as executable documentation that remains synchronized with implementation changes.
"""
    story.append(Paragraph(philosophy_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("1.2 Testing Pyramid and Coverage Targets", styles['CyberSOCH2']))
    
    pyramid_data = [
        ['Test Layer', 'Coverage Target', 'Automation %', 'Execution Frequency', 'Owner'],
        ['Unit Tests', '> 85% line coverage', '100%', 'Every commit (CI)', 'Developers'],
        ['Integration Tests', '> 75% service paths', '95%', 'Every PR + daily', 'DevOps/SRE'],
        ['E2E Tests', 'Critical paths only', '80%', 'Pre-merge + nightly', 'QA Team'],
        ['Performance Tests', 'Key transactions', '90%', 'Weekly + pre-release', 'Performance Eng'],
        ['Security Tests', 'OWASP Top 10 + Custom', '70%', 'Weekly + on release', 'AppSec/Red Team'],
        ['Chaos Tests', 'Failure modes', '60%', 'Monthly + on change', 'SRE/Platform'],
        ['Manual/Exploratory', 'Usability + Edge cases', '0%', 'Sprint cycles', 'QA Analysts'],
    ]
    story.append(create_section_table(pyramid_data, [80, 100, 65, 95, 80], styles))
    story.append(Paragraph("Table 1.1: Testing Pyramid Coverage Requirements", styles['CyberSOCCaption']))
    
    story.append(Paragraph("1.3 Test Environment Strategy", styles['CyberSOCH2']))
    env_strategy = """
Multiple test environments support different testing phases with appropriate data volumes, configuration states, and isolation guarantees. Development environments provide rapid feedback for individual developers running localized tests against mocked dependencies. Shared integration environments validate service interactions using containerized dependency stubs or shared instances with deterministic test data. Staging environments mirror production configuration including scaled-down infrastructure, real identity providers in test mode, and anonymized production data subsets enabling realistic performance characterization. Production-like performance environments execute load tests without affecting user-facing systems while maintaining representative network topology and data distributions.
"""
    story.append(Paragraph(env_strategy.strip(), styles['CyberSOCBodyNoIndent']))
    
    env_data = [
        ['Environment', 'Purpose', 'Data Source', 'Access', 'Refresh Cadence'],
        ['Local Dev', 'Unit + Component dev', 'Mocked/synthetic', 'Developer only', 'On-demand'],
        ['CI/CD Pipeline', 'Automated gate checks', 'Fixtures/seeds', 'Automated only', 'Per build'],
        ['Dev Integration', 'Cross-service testing', 'Test datasets', 'Dev team', 'Daily reset'],
        ['Staging', 'Pre-release validation', 'Anonymized prod subset', 'QA + Dev', 'Weekly refresh'],
        ['Perf Testing', 'Load/stress execution', 'Scaled synthetic', 'Perf team', 'Per test cycle'],
        ['Security Lab', 'Pen testing, vuln scan', 'Sensitive test data', 'Red team only', 'Isolated'],
    ]
    story.append(create_section_table(env_data, [80, 105, 95, 75, 75], styles))
    story.append(Paragraph("Table 1.2: Test Environment Matrix", styles['CyberSOCCaption']))
    
    # ==================== SECTION 2: UNIT TESTING FRAMEWORK ====================
    story.append(Paragraph("2. Unit Testing Framework", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    unit_intro = """
Unit testing validates individual functions, methods, and classes in isolation from external dependencies through mocking and stubbing techniques. The CyberSOC platform utilizes Jest for frontend React/Vue components, pytest for Python backend services including threat detection engines and SIEM correlation logic, and Go testing packages for infrastructure tools and Kubernetes operators. Unit test suites serve dual purposes as regression safety nets preventing unintended behavior changes and as living documentation expressing expected component behavior through concrete examples.
"""
    story.append(Paragraph(unit_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("2.1 Frontend Unit Testing (Jest + React Testing Library)", styles['CyberSOCH2']))
    fe_unit_text = """
Frontend unit tests focus on component rendering correctness, user interaction handling, state management integration, and accessibility compliance. React Testing Library encourages testing user behavior rather than implementation details, ensuring tests survive refactoring while catching meaningful regressions. Accessibility assertions verify ARIA attributes, keyboard navigation support, and screen reader compatibility essential for enterprise software serving diverse user populations including security analysts who may rely on assistive technologies during extended monitoring sessions.
"""
    story.append(Paragraph(fe_unit_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    fe_test_example = """// Example: Threat Intelligence Card Component Test
import { render, screen, fireEvent } from '@testing-library/react';
import { ThreatIntelCard } from './ThreatIntelCard';

describe('ThreatIntelCard Component', () => {
  const mockThreatData = {
    id: 'THREAT-001',
    title: 'APT29 Phishing Campaign',
    severity: 'critical',
    iocCount: 47,
    lastUpdated: '2024-11-15T10:30:00Z',
    tags: ['phishing', 'apt29', 'credential-theft']
  };

  it('renders threat title and severity badge correctly', () => {
    render(<ThreatIntelCard threat={mockThreatData} />);
    expect(screen.getByText('APT29 Phishing Campaign')).toBeInTheDocument();
    expect(screen.getByTestId('severity-badge')).toHaveClass('severity-critical');
  });

  it('displays IOC count with proper formatting', () => {
    render(<ThreatIntelCard threat={mockThreatData} />);
    expect(screen.getByText(/47 Indicators/i)).toBeInTheDocument();
  });

  it('calls onClick handler when card is clicked', () => {
    const mockOnClick = jest.fn();
    render(<ThreatIntelCard threat={mockThreatData} onClick={mockOnClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnClick).toHaveBeenCalledWith('THREAT-001');
  });

  it('applies accessible labels for screen readers', () => {
    render(<ThreatIntelCard threat={mockThreatData} />);
    expect(screen.getByLabelText(/threat intelligence card/i)).toBeInTheDocument();
  });
});"""
    story.append(Preformatted(fe_test_example, styles['CyberSOCCode']))
    story.append(Paragraph("Listing 2.1: Frontend Component Unit Test Example", styles['CyberSOCCaption']))
    
    story.append(Paragraph("2.2 Backend Unit Testing (pytest)", styles['CyberSOCH2']))
    be_unit_text = """
Backend unit tests validate business logic including threat scoring algorithms, SIEM event correlation rules, access control policy evaluation, and data transformation pipelines. Pytest fixtures provide reusable test context objects including mock database sessions, authenticated user representations, and sample event payloads covering diverse log formats. Parameterized tests efficiently validate algorithm behavior across input boundary conditions, edge cases, and representative samples drawn from production event distributions ensuring statistical coverage of real-world scenarios.
"""
    story.append(Paragraph(be_unit_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    be_test_example = """# Example: Threat Scoring Algorithm Unit Test
import pytest
from cybersoc.engine.threat_scorer import ThreatScorer, ThreatContext

@pytest.fixture
def scorer():
    return ThreatScorer(config_path='tests/fixtures/scorer_config.yaml')

class TestThreatScorer:
    def test_critical_score_for_known_apt_ioc(self, scorer):
        context = ThreatContext(
            ioc_source='known_apt_feed',
            target_matches=True,
            historical_attacks=5,
            time_decay_factor=0.9
        )
        score = scorer.calculate(context)
        assert score.severity == 'CRITICAL'
        assert score.numeric >= 9.0

    @pytest.mark.parametrize("ioc_count,expected_range", [
        (1, (1.0, 3.0)),
        (10, (3.0, 5.0)),
        (50, (5.0, 7.0)),
        (200, (7.0, 9.0)),
    ])
    def test_score_scales_with_ioc_count(self, scorer, ioc_count, expected_range):
        context = ThreatContext(ioc_count=ioc_count)
        score = scorer.calculate(context)
        assert expected_range[0] <= score.numeric <= expected_range[1]

    def test_time_decay_reduces_old_threat_scores(self, scorer):
        recent_context = ThreatContext(hours_since_seen=1)
        old_context = ThreatContext(hours_since_seen=720)  # 30 days
        
        recent_score = scorer.calculate(recent_context)
        old_score = scorer.calculate(old_context)
        
        assert recent_score.numeric > old_score.numeric

    def test_handles_empty_context_gracefully(self, scorer):
        empty_context = ThreatContext()
        score = scorer.calculate(empty_context)
        assert score.severity == 'LOW'
        assert score.numeric >= 0"""
    story.append(Preformatted(be_test_example, styles['CyberSOCCode']))
    story.append(Paragraph("Listing 2.2: Backend Business Logic Unit Test Example", styles['CyberSOCCaption']))
    
    # ==================== SECTION 3: INTEGRATION TESTING ====================
    story.append(Paragraph("3. Integration Testing Procedures", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    integ_intro = """
Integration testing validates correct interaction between CyberSOC platform components including API contracts between microservices, database query patterns producing expected results, message queue consumption and production flows, cache invalidation cascades, and external service integrations with identity providers, threat intelligence feeds, and notification systems. Unlike unit tests that isolate components through mocking, integration tests exercise real component connections against containerized or shared test infrastructure, revealing compatibility issues, protocol misunderstandings, and timing-dependent bugs invisible in isolated testing.
"""
    story.append(Paragraph(integ_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("3.1 API Contract Testing", styles['CyberSOCH2']))
    contract_text = """
API contract testing ensures service implementations conform to agreed-upon interfaces defined in OpenAPI/Swagger specifications, preventing breaking changes from propagating undetected through dependent services. Consumer-driven contract testing captures each consumer's expectations in contract files verified against provider implementations during CI/CD pipelines. Pact (for HTTP APIs) and AsyncAPI (for message-based integrations) provide mature tooling supporting contract generation, versioning, and verification with clear failure messages identifying specific specification violations requiring remediation.
"""
    story.append(Paragraph(contract_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    contract_data = [
        ['Service Pair', 'Contract Tool', 'Verification Point', 'Frequency', 'Owner'],
        ['Gateway -> Auth', 'Pact', 'Auth token format, error codes', 'PR + daily', 'Platform Team'],
        ['Gateway -> Threat Engine', 'OpenAPI', 'Request/response schemas', 'PR + daily', 'API Team'],
        ['SIEM -> PostgreSQL', 'SQL lint', 'Query syntax, index usage', 'PR only', 'DBA Team'],
        ['UI -> Gateway', 'MSW mocks', 'HTTP interface contract', 'PR only', 'Frontend Team'],
        ['Engine -> Redis', 'Redis-spec', 'Cache key patterns, TTL', 'PR only', 'Backend Team'],
        ['All -> Elasticsearch', 'ES schema', 'Index mappings, queries', 'Pre-release', 'Data Team'],
    ]
    story.append(create_section_table(contract_data, [95, 70, 115, 65, 70], styles))
    story.append(Paragraph("Table 3.1: API Contract Testing Matrix", styles['CyberSOCCaption']))
    
    story.append(Paragraph("3.2 Database Integration Testing", styles['CyberSOCH2']))
    db_integ_text = """
Database integration tests validate ORM/ODM layer functionality against real database instances ensuring query generation produces efficient SQL, migrations apply cleanly without data loss, transaction boundaries maintain consistency under concurrent access, and connection pooling handles load patterns without exhaustion. Testcontainers library provides ephemeral database instances spun up within test execution, enabling true integration testing without shared test database contention or stale data interference between parallel test runs. Each test method executes within transactional boundaries rolled back after assertion completion, maintaining test isolation while exercising full persistence stack including trigger execution and constraint enforcement.
"""
    story.append(Paragraph(db_integ_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    db_test_example = """# Example: Incident Repository Integration Test
import pytest
from testcontainers.postgresql import PostgresqlContainer
from sqlalchemy import create_engine
from cybersoc.db.repositories import IncidentRepository
from cybersoc.models.incident import Incident, IncidentStatus

@pytest.fixture(scope="class")
def pg_container():
    with PostgresqlContainer("postgres:16-alpine") as pg:
        yield pg

@pytest.mark.integration
class TestIncidentRepository:
    @pytest.fixture(autouse=True)
    def setup(self, pg_container):
        engine = create_engine(pg.get_connection_url())
        self.repo = IncidentRepository(engine)
        # Run migrations
        Base.metadata.create_all(engine)
        yield
        Base.metadata.drop_all(engine)

    def test_create_and_retrieve_incident(self):
        incident = Incident(
            title="Phishing campaign detected",
            severity="high",
            status=IncidentStatus.OPEN,
            description="User reported suspicious email"
        )
        created = self.repo.create(incident)
        
        retrieved = self.repo.get_by_id(created.id)
        assert retrieved.title == "Phishing campaign detected"
        assert retrieved.status == IncidentStatus.OPEN
        assert created.created_at is not None

    def test_query_by_status_with_pagination(self):
        # Create test data
        for i in range(25):
            status = IncidentStatus.OPEN if i < 15 else IncidentStatus.CLOSED
            self.repo.create(Incident(title=f"Incident-{i}", status=status))
        
        open_incidents = self.repo.query(status=IncidentStatus.OPEN, page=1, per_page=10)
        assert len(open_incidents.items) == 10
        assert open_incidents.total == 15
        assert open_incidents.pages == 2"""
    story.append(Preformatted(db_test_example, styles['CyberSOCCode']))
    story.append(Paragraph("Listing 3.1: Database Integration Test with Testcontainers", styles['CyberSOCCaption']))
    
    # ==================== SECTION 4: END-TO-END TESTING ====================
    story.append(Paragraph("4. End-to-End Testing Scenarios", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    e2e_intro = """
End-to-end (E2E) tests validate complete user journeys traversing multiple system components from initial user action through backend processing to final result presentation, simulating real usage patterns that expose integration issues invisible at lower testing levels. E2E test suites prioritize critical business paths including authentication flows, core workflow execution (threat investigation, incident response case lifecycle), reporting generation, and administrative operations. Playwright provides cross-browser E2E execution capabilities with automatic waiting, retry logic, and screenshot capture on failure enabling efficient debugging of flaky tests often plaguing UI automation efforts.
"""
    story.append(Paragraph(e2e_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("4.1 Critical User Journey Test Cases", styles['CyberSOCH2']))
    
    e2e_scenarios = [
        ['Scenario ID', 'User Journey', 'Components Tested', 'Priority', 'Execution'],
        ['E2E-001', 'Login -> Dashboard -> Logout', 'Auth, Gateway, UI, Session', 'P0', 'Every merge'],
        ['E2E-002', 'Create Incident -> Assign -> Resolve', 'Case Mgmt, Notifications', 'P0', 'Every merge'],
        ['E2E-003', 'Ingest Event -> Correlate -> Alert', 'SIEM, Rules Engine, Alerts', 'P0', 'Nightly'],
        ['E2E-004', 'Run Investigation Report -> Export PDF', 'Reporting, File Gen, Storage', 'P1', 'Pre-release'],
        ['E2E-005', 'Admin: Add User -> Configure RBAC', 'Admin API, IAM, IdP Sync', 'P1', 'Pre-release'],
        ['E2E-006', 'Configure Threat Feed -> Validate IOCs', 'TI Module, Parser, DB', 'P1', 'Weekly'],
        ['E2E-007', 'Search Historical Events -> Drill Down', 'ES Query, UI Pagination', 'P2', 'Weekly'],
        ['E2E-008', 'Mobile Responsive: View Alerts', 'Responsive UI, API', 'P2', 'Bi-weekly'],
    ]
    story.append(create_section_table(e2e_scenarios, [55, 155, 120, 50, 70], styles))
    story.append(Paragraph("Table 4.1: Critical E2E Test Scenario Inventory", styles['CyberSOCCaption']))
    
    story.append(Paragraph("4.2 Playwright E2E Test Implementation", styles['CyberSOCH2']))
    playwright_example = """// Example: Incident Management E2E Test
import { test, expect } from '@playwright/test';

test.describe('Incident Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate via API token
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'analyst@cybersoc.test');
    await page.fill('[data-testid="password"]', 'test-password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should create new incident and verify in list', async ({ page }) => {
    // Navigate to incidents
    await page.click('[data-testid="nav-incidents"]');
    await expect(page).toHaveURL(/\\/incidents/);
    
    // Click create button
    await page.click('[data-testid="create-incident"]');
    await expect(page.locator('.modal')).toBeVisible();
    
    // Fill incident form
    await page.fill('[name="title"]', 'Test E2E Incident');
    await page.selectOption('[name="severity"]', 'high');
    await page.fill('[name="description"]', 'Automated E2E test incident');
    
    // Submit form
    await page.click('[data-testid="submit-incident"]');
    
    // Verify success
    await expect(page.locator('.toast-success')).toContainText('created');
    
    // Verify incident appears in list
    await expect(page.locator('text=Test E2E Incident')).toBeVisible({ timeout: 5000 });
  });

  test('should assign incident and update status', async ({ page }) => {
    // Find existing incident
    await page.goto('/incidents');
    const incidentRow = page.locator(`tr[data-severity="high"]`).first();
    await incidentRow.click();
    
    // Assign to analyst
    await page.click('[data-testid="assign-button"]');
    await page.selectOption('[name="assignee"]', 'analyst-user-id');
    await page.click('[data-testid="confirm-assign"]');
    
    // Update status to In Progress
    await page.selectOption('[name="status"]', 'in_progress');
    await page.click('[data-testid="update-status"]');
    
    // Verify updates
    await expect(page.locator('[data-testid="current-status"]')).toHaveText('In Progress');
    await expect(page.locator('[data-testid="assignee-name"]')).toHaveText('Analyst User');
  });
});"""
    story.append(Preformatted(playwright_example, styles['CyberSOCCode']))
    story.append(Paragraph("Listing 4.1: Playwright E2E Test Implementation", styles['CyberSOCCaption']))
    
    # ==================== SECTION 5: PERFORMANCE TESTING ====================
    story.append(Paragraph("5. Performance and Load Testing", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    perf_intro = """
Performance testing validates system responsiveness, throughput capacity, and resource utilization under various load conditions from normal operation through peak demand spikes to stress conditions exceeding design limits. The performance testing program establishes baseline metrics for comparison during regression testing, identifies bottlenecks limiting scalability, validates auto-scaling configurations, and provides confidence that production infrastructure sizing adequately supports projected customer workloads. K6 provides modern load testing capabilities with JavaScript test scripts, cloud execution for distributed load generation, and result visualization integrated with Grafana dashboards for trend analysis.
"""
    story.append(Paragraph(perf_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("5.1 Performance Test Types and Objectives", styles['CyberSOCH2']))
    
    perf_types = [
        ['Test Type', 'Objective', 'Load Profile', 'Duration', 'Success Criteria'],
        ['Baseline', 'Establish reference metrics', '10% of expected peak', '1 hour', 'Record response times'],
        ['Load Test', 'Validate SLA compliance', 'Expected peak load', '2-4 hours', 'P99 < 2000ms, 0% errors'],
        ['Stress Test', 'Find breaking point', 'Incremental to failure', 'Gradual ramp', 'Identify max capacity'],
        ['Soak Test', 'Detect memory leaks', 'Sustained 80% load', '24-72 hours', 'No degradation over time'],
        ['Spike Test', 'Handle sudden bursts', '5-10x normal, short', '15-30 min bursts', 'Auto-scale recovers'],
        ['Scale Test', 'Validate horizontal scaling', 'Trigger HPA thresholds', 'Until stable', 'New pods serve traffic'],
    ]
    story.append(create_section_table(perf_types, [70, 110, 100, 70, 110], styles))
    story.append(Paragraph("Table 5.1: Performance Test Type Definitions", styles['CyberSOCCaption']))
    
    story.append(Paragraph("5.2 Key Performance Indicators and Thresholds", styles['CyberSOCH2']))
    
    kpi_data = [
        ['Metric', 'Component', 'Baseline Target', 'Warning Threshold', 'Critical Threshold'],
        ['API Response P50', 'Gateway', '< 100ms', '> 150ms', '> 300ms'],
        ['API Response P99', 'Gateway', '< 500ms', '> 1000ms', '> 2000ms'],
        ['Event Ingestion Rate', 'SIEM Ingest', '10,000 eps', '< 8000 eps sustained', '< 5000 eps'],
        ['Correlation Latency', 'SIEM Engine', '< 5 seconds', '> 10 seconds', '> 30 seconds'],
        ['Search Response Time', 'Elasticsearch', '< 2 seconds', '> 5 seconds', '> 10 seconds'],
        ['Auth Token Issuance', 'Auth Service', '< 200ms', '> 500ms', '> 1000ms'],
        ['Dashboard Load', 'Frontend', '< 3 seconds', '> 5 seconds', '> 8 seconds'],
        ['Report Generation', 'Reporting Service', '< 30 seconds', '> 60 seconds', '> 120 seconds'],
        ['Concurrent Users', 'System', '500 active', 'CPU > 80%', 'Memory > 90%'],
        ['Error Rate', 'All Components', '< 0.1%', '> 0.5%', '> 2%'],
    ]
    story.append(create_section_table(kpi_data, [95, 80, 85, 85, 85], styles))
    story.append(Paragraph("Table 5.2: Performance KPI Thresholds by Component", styles['CyberSOCCaption']))
    
    story.append(Paragraph("5.3 K6 Load Test Script Example", styles['CyberSOCH2']))
    k6_example = """// k6 Load Test Script: CyberSOC API Gateway
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp-up
    { duration: '10m', target: 500 },   // Sustained load (normal peak)
    { duration: '5m', target: 1000 },   // Stress phase
    { duration: '2m', target: 0 },      // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'],  // P99 < 2 seconds
    errors: ['rate<0.01'],               // < 1% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api.cybersoc.test';

export default function () {
  // Authentication flow
  const loginPayload = JSON.stringify({
    email: `loaduser_${__VU}-test@cybersoc.io`,
    password: 'load-test-password',
  });
  
  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => r.json('accessToken') !== undefined,
  });
  
  const authToken = loginRes.json('accessToken');
  
  // Dashboard fetch (authenticated request)
  const dashboardRes = http.get(`${BASE_URL}/dashboard/metrics`, {
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Accept': 'application/json',
    },
  });
  
  errorRate.add(dashboardRes.status !== 200);
  apiResponseTime.add(dashboardRes.timings.duration);
  
  check(dashboardRes, {
    'dashboard loaded': (r) => r.status === 200,
    'response time acceptable': (r) => r.timings.duration < 2000,
    'metrics present': (r) => r.json('threatCount') !== undefined,
  });
  
  // Simulate think time between requests
  sleep(Math.random() * 3 + 1);  // 1-4 seconds
}

export function handleSummary(data) {
  console.log('\\n=== Load Test Summary ===');
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Error Rate: ${(data.metrics.errors.rate * 100).toFixed(2)}%`);
  console.log(`P95 Response: ${data.metrics.http_req_duration.values['p(95)']}ms`);
  console.log(`P99 Response: ${data.metrics.http_req_duration.values['p(99)']}ms`);
}"""
    story.append(Preformatted(k6_example, styles['CyberSOCCode']))
    story.append(Paragraph("Listing 5.1: K6 Load Test Script for API Gateway", styles['CyberSOCCaption']))
    
    # ==================== SECTION 6: SECURITY PENETRATION TESTING ====================
    story.append(Paragraph("6. Security Penetration Testing", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    pentest_intro = """
Security penetration testing employs adversarial techniques to identify exploitable vulnerabilities before malicious actors discover them in production environments. The CyberSOC platform undergoes regular penetration testing combining automated vulnerability scanning with manual exploitation attempts by qualified security professionals. Testing scope encompasses the application layer (web API, web application, mobile interfaces if applicable), infrastructure layer (container images, Kubernetes configuration, cloud resources), and human factors (social engineering targeting personnel with platform access). Findings are classified by severity following CVSS v3.1 scoring with remediation timelines aligned to organizational vulnerability management policies.
"""
    story.append(Paragraph(pentest_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("6.1 Penetration Testing Methodology", styles['CyberSOCH2']))
    methodology_text = """
The penetration testing methodology follows industry-standard approaches adapted for cloud-native security operations platforms. Reconnaissance phase maps attack surface including discovered endpoints, technology fingerprinting, and information leakage assessment. Vulnerability analysis combines automated scanning (OWASP ZAP, Burp Suite, Nessus) with manual review focusing on business logic flaws escaping automated detection. Exploitation phase demonstrates impact of confirmed vulnerabilities, progressing from unauthenticated through authenticated access to privilege escalation paths. Post-exploitation assesses lateral movement potential, data exfiltration feasibility, and persistence mechanism establishment providing realistic risk characterization for remediation prioritization decisions.
"""
    story.append(Paragraph(methodology_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    pentest_phases = [
        ['Phase', 'Activities', 'Tools', 'Deliverables', 'Duration'],
        ['Reconnaissance', 'OSINT, endpoint discovery, footprinting', 'Recon-ng, Nmap, Amass', 'Attack surface map', '2-3 days'],
        ['Vulnerability Discovery', 'Auto-scan + manual analysis', 'ZAP, Burp, Semgrep', 'Finding list', '5-7 days'],
        ['Exploitation', 'Proof-of-concept exploits', 'Metasploit, Custom', 'POC demos', '3-5 days'],
        ['Post-Exploitation', 'Lateral move, data access', 'Cobalt Strike, Empire', 'Impact assessment', '2-3 days'],
        ['Reporting', 'Executive + technical reports', 'Dradis, Custom templates', 'Final report', '3-5 days'],
        ['Remediation Support', 'Retesting, guidance', 'Same as above', 'Verified closure', '2-3 days'],
    ]
    story.append(create_section_table(pentest_phases, [80, 130, 95, 80, 55], styles))
    story.append(Paragraph("Table 6.1: Penetration Testing Phase Breakdown", styles['CyberSOCCaption']))
    
    story.append(Paragraph("6.2 OWASP Top 10 Coverage Matrix", styles['CyberSOCH2']))
    
    owasp_coverage = [
        ['OWASP Category', 'Test Cases', 'Automated', 'Last Test Date', 'Findings'],
        ['A01: Broken Access Control', '12 test cases', 'Partial', '2024-Q3', '1 Low'],
        ['A02: Cryptographic Failures', '8 test cases', 'Yes', '2024-Q3', '0'],
        ['A03: Injection', '15 test cases', 'Yes', '2024-Q3', '0'],
        ['A04: Insecure Design', '6 test cases', 'No', '2024-Q2', '2 Medium'],
        ['A05: Security Misconfiguration', '20 test cases', 'Yes', '2024-Q3', '3 Low'],
        ['A06: Vulnerable Components', '10 test cases', 'Yes', '2024-Q3', '1 Medium'],
        ['A07: Auth Failures', '14 test cases', 'Partial', '2024-Q3', '0'],
        ['A08: Software/Data Integrity', '8 test cases', 'Partial', '2024-Q2', '1 Low'],
        ['A09: Logging/Monitoring Failures', '7 test cases', 'No', '2024-Q2', '2 Low'],
        ['A10: SSRF', '9 test cases', 'Partial', '2024-Q3', '0'],
    ]
    story.append(create_section_table(owasp_coverage, [125, 75, 60, 70, 60], styles))
    story.append(Paragraph("Table 6.2: OWASP Top 10 Testing Coverage Status", styles['CyberSOCCaption']))
    
    # ==================== SECTION 7: PURPLE TEAM VALIDATION ====================
    story.append(Paragraph("7. Purple Team Validation Exercises", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    purple_intro = """
Purple team exercises represent collaborative security assessments where offensive security professionals (red team) and defensive security teams (blue team) work together to validate detection and response capabilities against simulated adversary techniques. Unlike traditional penetration testing focused on breach demonstration, purple team exercises emphasize measurable improvement of defensive controls through controlled scenario execution with real-time visibility into how attacks manifest in logging, alerting, and analyst detection workflows. Each exercise maps to MITRE ATT&CK techniques enabling systematic coverage of adversary tactics relevant to security operations platform threats.
"""
    story.append(Paragraph(purple_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("7.1 ATT&CK Technique Coverage Plan", styles['CyberSOCH2']))
    attck_text = """
The MITRE ATT&CK framework provides a structured knowledge base of adversary tactics, techniques, and procedures (TTPs) observed in real-world attacks. Purple team exercises systematically validate detection coverage for techniques most likely targeting security operations platforms including initial access vectors, credential theft mechanisms, lateral movement paths, defense evasion tactics, and data exfiltration methods. Each technique receives a detection coverage rating (Detected, Partially Detected, Not Detected) based on exercise outcomes, informing investment priorities for security control enhancement.
"""
    story.append(Paragraph(attck_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    attck_matrix = [
        ['Tactic', 'Technique ID', 'Technique Name', 'Detection Status', 'Last Validated'],
        ['Initial Access', 'T1078', 'Valid Accounts', 'DETECTED', '2024-Q3'],
        ['Initial Access', 'T1190', 'Exploit Public-Facing App', 'DETECTED', '2024-Q3'],
        ['Credential Access', 'T1110.001', 'Brute Force - Password Guessing', 'DETECTED', '2024-Q3'],
        ['Credential Access', 'T1528', 'Steal Application Token', 'PARTIAL', '2024-Q2'],
        ['Discovery', 'T1082', 'System Information Discovery', 'DETECTED', '2024-Q3'],
        ['Discovery', 'T1046', 'Network Service Discovery', 'PARTIAL', '2024-Q2'],
        ['Lateral Movement', 'T1021.004', 'Remote Services - SSH', 'DETECTED', '2024-Q3'],
        ['Lateral Movement', 'T1570', 'Lateral Tool Transfer', 'NOT DETECTED', '2024-Q2'],
        ['Collection', 'T1005', 'Data from Local System', 'DETECTED', '2024-Q3'],
        ['Exfiltration', 'T1048', 'Exfiltration Over Alternative Protocol', 'PARTIAL', '2024-Q2'],
        ['Impact', 'T1486', 'Data Encrypted for Impact', 'DETECTED', '2024-Q3'],
    ]
    story.append(create_section_table(attck_matrix, [75, 60, 145, 80, 70], styles))
    story.append(Paragraph("Table 7.1: MITRE ATT&CK Detection Coverage Matrix", styles['CyberSOCCaption']))
    
    story.append(Paragraph("7.2 Purple Team Exercise Scenarios", styles['CyberSOCH2']))
    
    scenario_data = [
        ['Exercise ID', 'Scenario Name', 'ATT&CK Techniques', 'Objective', 'Duration'],
        ['PT-001', 'Credential Stuffing Attack', 'T1110, T1110.004', 'Validate brute force detection', '4 hours'],
        ['PT-002', 'Insider Threat - Data Exfil', 'T1005, T1048, T1567', 'DLP effectiveness test', '6 hours'],
        ['PT-003', 'Supply Chain Compromise', 'T1195, T1078', 'Third-party risk validation', '8 hours'],
        ['PT-004', 'Ransomware Simulation', 'T1486, T1490', 'IR playbook validation', '4 hours'],
        ['PT-005', 'Privilege Escalation Path', 'T1068, T1548', 'PAM control verification', '4 hours'],
        ['PT-006', 'API Abuse & Rate Limit Bypass', 'T1119, T1499', 'WAF/gateway testing', '3 hours'],
        ['PT-007', 'Session Hijacking', 'T1563, T1550', 'Session security validation', '3 hours'],
        ['PT-008', 'Persistence Mechanism', 'T1543, T1546', 'Detection of persistence', '4 hours'],
    ]
    story.append(create_section_table(scenario_data, [55, 135, 95, 105, 60], styles))
    story.append(Paragraph("Table 7.2: Purple Team Exercise Scenario Catalog", styles['CyberSOCCaption']))
    
    story.append(Paragraph("7.3 Exercise Execution Template", styles['CyberSOCH2']))
    exercise_template = """
Each purple team exercise follows a standardized execution template ensuring consistent documentation, reproducible results, and actionable findings. Pre-exercise preparation includes scenario briefing to all participants, environment backup for clean recovery, and alert suppression coordination to prevent automated responses interfering with controlled execution. During exercise execution, red team actions are logged with timestamps, blue team detection observations are recorded with alert IDs and investigation notes, and command-and-control communication maintains scenario scope boundaries preventing unintended production impact. Post-exercise analysis compares red team action timeline against blue team detection timeline calculating mean time to detect (MTTD) and mean time to respond (MTTR) metrics feeding continuous improvement initiatives.
"""
    story.append(Paragraph(exercise_template.strip(), styles['CyberSOCBodyNoIndent']))
    
    # ==================== SECTION 8: CHAOS ENGINEERING ====================
    story.append(Paragraph("8. Chaos Engineering Tests", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    chaos_intro = """
Chaos engineering proactively validates system resilience by injecting controlled failures into production-like environments, measuring how gracefully the system degrades and recovers. For the CyberSOC platform, chaos experiments validate high availability architecture assumptions, auto-scaling responsiveness, failover mechanism correctness, and operational runbook effectiveness. Experiments follow the steady-state hypothesis approach defining normal operating conditions, injecting specific failure modes, and verifying the system returns to acceptable steady-state within defined recovery time objectives. All experiments require explicit approval, include blast radius limitations preventing customer impact, and feature immediate abort capabilities if unexpected degradation occurs.
"""
    story.append(Paragraph(chaos_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("8.1 Chaos Experiment Categories", styles['CyberSOCH2']))
    
    chaos_categories = [
        ['Category', 'Experiment Examples', 'Tools', 'Risk Level', 'Frequency'],
        ['Infrastructure', 'Node termination, AZ failure', 'Chaos Monkey, AWS FIS', 'Medium', 'Monthly'],
        ['Network', 'Latency injection, packet loss', 'Toxiproxy, Istio Fault Injection', 'Low', 'Bi-weekly'],
        ['Resource', 'CPU starvation, memory pressure', 'stress-ng, Linux tc', 'Low', 'Monthly'],
        ['Application', 'Pod kill, process crash', 'Chaos Mesh, Litmus', 'Medium', 'Monthly'],
        ['State', 'Disk fill, corruption simulation', 'Custom scripts', 'High', 'Quarterly'],
        ['Dependency', 'DB connection drop, DNS failure', 'Gremlin, Custom', 'Medium', 'Quarterly'],
        ['Time', 'Clock skew, certificate expiry', 'Libfaketime, Custom', 'Low', 'Quarterly'],
    ]
    story.append(create_section_table(chaos_categories, [70, 140, 100, 55, 65], styles))
    story.append(Paragraph("Table 8.1: Chaos Experiment Categories", styles['CyberSOCCaption']))
    
    story.append(Paragraph("8.2 Steady-State Hypotheses and Validation", styles['CyberSOCH2']))
    hypotheses_text = """
Each chaos experiment defines a steady-state hypothesis representing the expected normal behavior that should persist despite injected failures. Hypotheses must be measurable through existing observability metrics (Prometheus queries, log patterns, synthetic checks) enabling automated validation during experiment execution. Failed hypotheses indicate resilience gaps requiring architectural improvements, enhanced monitoring, or updated runbooks. Hypothesis formulation involves collaboration between SRE teams understanding system behavior, development teams knowing implementation details, and product teams defining acceptable degradation boundaries from customer experience perspective.
"""
    story.append(Paragraph(hypotheses_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    hypothesis_data = [
        ['Experiment', 'Steady-State Hypothesis', 'Validation Metric', 'Min Success Rate'],
        ['Random Pod Termination', 'API availability remains > 99%', 'Success rate from LB health checks', '95%'],
        ['AZ Failure Simulation', 'RTO < 5 minutes, zero data loss', 'Recovery time, RPO measurement', '90%'],
        ['Network Latency (+200ms)', 'P99 latency increase < 300%', 'Apdex score degradation', '85%'],
        ['Memory Pressure (85%)', 'No OOM kills, graceful degradation', 'OOM count, error rate', '100%'],
        ['DB Primary Failure', 'Failover < 30s, zero lost writes', 'Failover time, WAL position', '95%'],
        ['DNS Resolution Failure', 'Circuit breaker opens, cached responses', 'Error rate, fallback success', '90%'],
        ['Certificate Expiry Imminent', 'Auto-renewal completes before expiry', 'Cert validity, renewal logs', '100%'],
    ]
    story.append(create_section_table(hypothesis_data, [105, 145, 110, 75], styles))
    story.append(Paragraph("Table 8.2: Experiment Hypotheses and Validation Criteria", styles['CyberSOCCaption']))
    
    # ==================== SECTION 9: TEST AUTOMATION & CI/CD ====================
    story.append(Paragraph("9. Test Automation and CI/CD Integration", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    cicd_intro = """
Test automation embedded within CI/CD pipelines provides rapid feedback on code quality changes, preventing defect introduction and maintaining cumulative quality standards as the codebase evolves. The pipeline implements quality gates at multiple stages with escalating test breadth and execution time, balancing fast feedback for developer productivity with thorough validation protecting production deployments. Pipeline stages progress from quick unit test execution through integration testing against containerized services to comprehensive end-to-end validation against staging environments, with each stage gating promotion to subsequent stages upon passing defined threshold criteria.
"""
    story.append(Paragraph(cicd_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("9.1 Pipeline Stage Definitions", styles['CyberSOCH2']))
    
    pipeline_stages = [
        ['Stage', 'Trigger', 'Tests Executed', 'Duration', 'Gate Criteria'],
        ['Pre-commit', 'Git hook', 'Lint, format, unit subset', '< 2 minutes', 'Zero failures'],
        ['CI Build', 'Push to main/PR', 'Full unit suite, SAST', '< 10 minutes', '> 85% coverage, 0 crit/high'],
        ['Integration', 'CI passes', 'Integration tests, contract', '< 20 minutes', '> 90% pass rate'],
        ['Staging Deploy', 'Merge to release', 'E2E smoke, perf baseline', '< 30 minutes', 'P0 scenarios pass'],
        ['Pre-production', 'Release candidate', 'Full E2E, security scan', '< 60 minutes', 'All P0/P1 pass'],
        ['Production Gate', 'Manual approval', 'Final validation checklist', '< 15 minutes', 'Sign-off obtained'],
    ]
    story.append(create_section_table(pipeline_stages, [80, 80, 115, 65, 110], styles))
    story.append(Paragraph("Table 9.1: CI/CD Pipeline Stage Configuration", styles['CyberSOCCaption']))
    
    story.append(Paragraph("9.2 Quality Gate Metrics and Thresholds", styles['CyberSOCH2']))
    gate_metrics = """
Quality gates define objective criteria determining pipeline progression, removing subjective judgment from deployment decisions while establishing documented quality floors for production-bound code. Metrics combine absolute thresholds (minimum coverage percentages, maximum allowed vulnerabilities) with trend analysis (regression detection comparing current values against historical baselines) identifying gradual quality erosion before it crosses critical thresholds. Gate violations produce clear diagnostic information pinpointing specific test failures, coverage gaps, or metric deviations requiring remediation before pipeline continuation.
"""
    story.append(Paragraph(gate_metrics.strip(), styles['CyberSOCBodyNoIndent']))
    
    gate_data = [
        ['Metric', 'Unit Test Gate', 'Integration Gate', 'E2E Gate', 'Production Gate'],
        ['Line Coverage', '> 85%', '> 80%', 'N/A', 'N/A'],
        ['Branch Coverage', '> 75%', '> 70%', 'N/A', 'N/A'],
        ['New Code Coverage', '> 90%', '> 85%', 'N/A', 'N/A'],
        ['Test Pass Rate', '100%', '> 98%', '> 95%', '100% (P0/P1)'],
        ['Critical Vulns', '0', '0', '0', '0'],
        ['High Vulns', '0', '< 2 known', '< 1 new', '0'],
        ['Flaky Test Rate', '< 2%', '< 3%', '< 5%', 'N/A'],
        ['Test Execution Time', '< 10 min', '< 20 min', '< 45 min', '< 15 min'],
        ['Performance Regression', 'N/A', '< 10% degrade', '< 5% degrade', '< 2% degrade'],
    ]
    story.append(create_section_table(gate_data, [100, 80, 80, 80, 90], styles))
    story.append(Paragraph("Table 9.2: Quality Gate Thresholds by Pipeline Stage", styles['CyberSOCCaption']))
    
    # ==================== SECTION 10: TEST DATA MANAGEMENT ====================
    story.append(Paragraph("10. Test Data Management", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    testdata_intro = """
Test data management addresses the challenge of providing realistic, varied, and privacy-compliant data for testing purposes without risking exposure of sensitive production information or introducing test data contamination into production environments. The strategy combines synthetic data generation algorithms producing statistically representative datasets with anonymization techniques enabling safe use of production-derived data shapes for performance characterization. Data freshness maintenance ensures test data remains representative of current production distributions, preventing test blind spots emerging from stale synthetic profiles diverging from evolving real-world patterns.
"""
    story.append(Paragraph(testdata_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("10.1 Synthetic Data Generation Strategies", styles['CyberSOCH2']))
    synth_data_text = """
Synthetic data generation creates artificial test data preserving statistical properties of real data without containing actual sensitive information. Generation strategies range from simple random value substitution within valid format constraints through sophisticated machine learning models capturing complex correlations and distribution patterns observed in production data. Domain-specific generators produce realistic security event data including properly formatted IP addresses, domain names, file hashes, and timestamp sequences respecting chronological ordering and inter-field relationships expected by parsing and correlation logic under test.
"""
    story.append(Paragraph(synth_data_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    synth_strategies = [
        ['Data Type', 'Generation Method', 'Tool/Library', 'Volume', 'Realism Level'],
        ['User Records', 'Faker library templates', 'Faker (Python/JS)', '10K records', 'High'],
        ['Security Events', 'Template + randomization', 'Custom generator', '100K events/day', 'Very High'],
        ['Network Logs', 'PCAP synthesis', 'tcpreplay, Custom', '1 GB/hour', 'Very High'],
        ['Authentication Logs', 'Pattern-based generation', 'Custom scripts', '50K entries', 'High'],
        ['Threat Intel', 'STIX template population', 'python-stix2', '5K IOCs', 'High'],
        ['Case Data', 'Workflow state machines', 'Factory pattern', '2K cases', 'Medium-High'],
        ['Performance Data', 'Statistical distribution fit', 'NumPy, pandas', 'Variable', 'Very High'],
    ]
    story.append(create_section_table(synth_strategies, [85, 115, 95, 70, 75], styles))
    story.append(Paragraph("Table 10.1: Synthetic Data Generation Strategies", styles['CyberSOCCaption']))
    
    # ==================== SECTION 11: DEFECT TRACKING ====================
    story.append(Paragraph("11. Defect Tracking and Remediation", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    defect_intro = """
Defect tracking manages the complete lifecycle from bug discovery through resolution verification, providing visibility into quality trends, enabling root cause analysis for systemic issues, and documenting evidence of remediation for audit and compliance requirements. The defect management process classifies findings by severity driving response priorities, assigns ownership accountable for resolution delivery, tracks aging to prevent indefinite postponement of difficult fixes, and measures defect escape rates indicating testing effectiveness at catching issues before production deployment.
"""
    story.append(Paragraph(defect_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("11.1 Severity Classification and SLAs", styles['CyberSOCH2']))
    
    severity_slas = [
        ['Severity', 'Definition', 'Response SLA', 'Resolution SLA', 'Escalation'],
        ['Critical (P0)', 'Production down, data loss, security breach', '1 hour', '24 hours', 'Immediate: CTO'],
        ['Major (P1)', 'Core feature broken, significant workaround', '4 hours', '3 days', '4 hours: VP Eng'],
        ['Moderate (P2)', 'Feature impaired, easy workaround exists', '1 business day', '2 sprints', '3 days: Director'],
        ['Minor (P3)', 'Cosmetic issue, edge case, enhancement', '1 week', 'Backlog priority', 'Sprint planning'],
        ['Trivial (P4)', 'Documentation, typos, nice-to-have', 'Next available', 'When convenient', 'None required'],
    ]
    story.append(create_section_table(severity_slas, [70, 145, 65, 70, 80], styles))
    story.append(Paragraph("Table 11.1: Defect Severity Classification and SLAs", styles['CyberSOCCaption']))
    
    # ==================== SECTION 12: RELEASE READINESS CHECKLIST ====================
    story.append(Paragraph("12. Release Readiness Checklist", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    rr_intro = """
The release readiness checklist provides a comprehensive go/no-go decision framework ensuring all quality, security, operational, and business criteria are satisfied before promoting software to production environments. Checklist items span functional completeness verification, quality metric threshold validation, security assessment clearance, operational readiness confirmation, and stakeholder sign-off collection. Each item requires explicit acknowledgment with evidence references supporting affirmative responses, creating auditable documentation of release due diligence.
"""
    story.append(Paragraph(rr_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("12.1 Complete Release Readiness Checklist", styles['CyberSOCH2']))
    
    checklist_data = [
        ['#', 'Checklist Item', 'Category', 'Owner', 'Status', 'Evidence'],
        ['1', 'All P0/P1 defects resolved or deferred with approval', 'Quality', 'QA Lead', '[ ]', 'Jira query'],
        ['2', 'Unit test coverage > 85% (new code > 90%)', 'Quality', 'Tech Lead', '[ ]', 'Codecov report'],
        ['3', 'Integration tests passing (> 98% pass rate)', 'Quality', 'DevOps', '[ ]', 'CI pipeline'],
        ['4', 'E2E critical paths validated in staging', 'Quality', 'QA Lead', '[ ]', 'Playwright'],
        ['5', 'Performance benchmarks meet SLA targets', 'Performance', 'Perf Eng', '[ ]', 'K6 report'],
        ['6', 'No CRITICAL/HIGH security vulnerabilities', 'Security', 'AppSec', '[ ]', 'Scan results'],
        ['7', 'Penetration test completed (annual/major release)', 'Security', 'Sec Ops', '[ ]', 'Pentest report'],
        ['8', 'Dependencies scanned, no known exploitable CVEs', 'Security', 'AppSec', '[ ]', 'Snyk report'],
        ['9', 'Infrastructure Terraform reviewed and applied', 'Operations', 'SRE', '[ ]', 'Plan output'],
        ['10', 'Database migrations tested and backward compatible', 'Operations', 'DBA', '[ ]', 'Migration script'],
        ['11', 'Runbooks updated for new features', 'Operations', 'SRE', '[ ]', 'Confluence'],
        ['12', 'On-call team briefed on release changes', 'Operations', 'Team Lead', '[ ]', 'Meeting notes'],
        ['13', 'Rollback procedure tested and documented', 'Operations', 'SRE', '[ ]', 'Runbook'],
        ['14', 'Feature flags ready for gradual rollout', 'Release', 'PM', '[ ]', 'Config'],
        ['15', 'Customer-facing documentation updated', 'Documentation', 'Tech Writer', '[ ]', 'Docs site'],
        ['16', 'Legal/compliance review completed (if required)', 'Compliance', 'GRC', '[ ]', 'Approval email'],
        ['17', 'Executive sign-off obtained for GA release', 'Business', 'VP Product', '[ ]', 'Email/thread'],
    ]
    story.append(create_section_table(checklist_data, [25, 195, 55, 55, 35, 65], styles))
    story.append(Paragraph("Table 12.1: Production Release Readiness Checklist", styles['CyberSOCCaption']))
    
    # Build PDF
    doc.build(story)
    print(f"Successfully generated: {output_path}")
    return output_path


if __name__ == "__main__":
    output_file = build_test_suite_purple_team_guide()
    print(f"\nComprehensive Test Suite & Purple Team Validation Framework generated successfully!")
    print(f"Output: {output_file}")
