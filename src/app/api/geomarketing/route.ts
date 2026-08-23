import { NextRequest, NextResponse } from 'next/server'
import { geoMarketingEngine, ALGERIAN_WILAYAS } from '@/lib/geomarketing/geo-engine'

// GET /api/geomarketing - Get all geo-marketing data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'overview'
    const wilayaCode = searchParams.get('wilaya')

    switch (type) {
      case 'wilayas':
        return NextResponse.json({
          success: true,
          data: ALGERIAN_WILAYAS.map(w => ({
            code: w.code,
            name: w.name,
            center: w.center,
            population: w.population
          }))
        })

      case 'threat-hotspots': {
        // Generate mock geo events for demonstration
        const mockEvents = generateMockGeoEvents(500)
        const hotspots = geoMarketingEngine.identifyThreatHotspots(mockEvents)
        return NextResponse.json({ success: true, data: hotspots })
      }

      case 'regional-summary': {
        const mockEvents = generateMockGeoEvents(1000)
        const summary = geoMarketingEngine.generateRegionalSummary(mockEvents)
        
        if (wilayaCode) {
          const filtered = summary.find(s => s.wilayaCode === parseInt(wilayaCode))
          return NextResponse.json({ success: true, data: filtered || null })
        }
        
        return NextResponse.json({ success: true, data: summary })
      }

      case 'heatmap': {
        const mockEvents = generateMockGeoEvents(200)
        const heatmapData = geoMarketingEngine.generateHeatmapData(mockEvents)
        return NextResponse.json({ success: true, data: heatmapData })
      }

      case 'insights': {
        const mockEvents = generateMockGeoEvents(800)
        const regionalData = geoMarketingEngine.generateRegionalSummary(mockEvents)
        const insights = await geoMarketingEngine.generateGeoMarketingInsights(regionalData)
        return NextResponse.json({ success: true, data: insights })
      }

      case 'subscriber-density': {
        const mockSubscribers = generateMockSubscribers(2000)
        const densityMap = geoMarketingEngine.getSubscriberDensityMap(mockSubscribers)
        return NextResponse.json({ success: true, data: densityMap.slice(0, 100) })
      }

      case 'movement-analysis': {
        const subscriberId = searchParams.get('subscriber')
        if (!subscriberId) {
          return NextResponse.json(
            { success: false, error: 'Subscriber ID required' },
            { status: 400 }
          )
        }
        
        const mockLocations = generateMockLocations(subscriberId)
        const analysis = geoMarketingEngine.analyzeMovementPattern(mockLocations)
        return NextResponse.json({ 
          success: true, 
          data: { subscriberId, locations: mockLocations.length, ...analysis }
        })
      }

      case 'geofences':
        return NextResponse.json({ 
          success: true, 
          data: [] // Would return active geofences from database
        })

      case 'coverage': {
        const coverageData = generateMockCoverageData()
        return NextResponse.json({ success: true, data: coverageData })
      }

      default:
        // Return overview with all key metrics
        const mockEvents = generateMockGeoEvents(500)
        const regionalData = geoMarketingEngine.generateRegionalSummary(mockEvents)
        const hotspots = geoMarketingEngine.identifyThreatHotspots(mockEvents)
        const insights = await geoMarketingEngine.generateGeoMarketingInsights(regionalData)

        return NextResponse.json({
          success: true,
          data: {
            totalWilayas: ALGERIAN_WILAYAS.length,
            activeHotspots: hotspots.length,
            criticalHotspots: hotspots.filter(h => h.threatScore > 70).length,
            regionsAtRisk: regionalData.filter(r => r.threatScore > 50).length,
            topThreatenedRegion: regionalData[0]?.wilaya || 'N/A',
            avgThreatScore: Math.round(
              regionalData.reduce((sum, r) => sum + r.threatScore, 0) / regionalData.length
            ),
            insightsCount: insights.length,
            recentEvents: mockEvents.slice(0, 10),
            topHotspots: hotspots.slice(0, 5)
          }
        })
    }
  } catch (error) {
    console.error('Geomarketing API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/geomarketing - Create geofence or analyze location
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action

    switch (action) {
      case 'create-geofence': {
        const geofence = geoMarketingEngine.createGeofence(body.geofence)
        return NextResponse.json({ success: true, data: geofence })
      }

      case 'check-location': {
        const { latitude, longitude } = body.location || {}
        if (!latitude || !longitude) {
          return NextResponse.json(
            { success: false, error: 'Location coordinates required' },
            { status: 400 }
          )
        }
        
        // Would check against active geofences
        return NextResponse.json({
          success: true,
          data: {
            location: { latitude, longitude },
            nearestWilaya: geoMarketingEngine.findNearestWilaya({ latitude, longitude }),
            withinGeofence: [] // Would contain matching geofences
          }
        })
      }

      case 'analyze-events': {
        const { events } = body
        if (!events || !Array.isArray(events)) {
          return NextResponse.json(
            { success: false, error: 'Events array required' },
            { status: 400 }
          )
        }

        const hotspots = geoMarketingEngine.identifyThreatHotspots(events)
        const regionalSummary = geoMarketingEngine.generateRegionalSummary(events)
        const heatmapData = geoMarketingEngine.generateHeatmapData(events)

        return NextResponse.json({
          success: true,
          data: {
            hotspots,
            regionalSummary,
            heatmapData,
            eventCount: events.length
          }
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Geomarketing POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions to generate mock data for demonstration
function generateMockGeoEvents(count: number): any[] {
  const events: Array<{
    id: string;
    timestamp: Date;
    location: { latitude: number; longitude: number };
    eventType: string;
    severity: string;
    source: string;
    description: string;
    wilaya: string;
    affectedAssets: string[];
    iocs: string[];
  }> = []
  const eventTypes = [
    'malware_c2', 'ddos', 'phishing', 'ss7_attack', 'sim_swap_fraud',
    'irsf', 'unauthorized_access', 'data_exfiltration', 'port_scan',
    'signaling_storm', 'roaming_fraud', 'premium_rate_abuse'
  ]
  const severities = ['info', 'low', 'medium', 'high', 'critical']
  const sources = ['wazuh', 'suricata', 'zeek', 'grr', 'misp', 'thehive']

  for (let i = 0; i < count; i++) {
    const wilaya = ALGERIAN_WILAYAS[Math.floor(Math.random() * ALGERIAN_WILAYAS.length)]
    
    events.push({
      id: `event-${Date.now()}-${i}`,
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 7), // Last 7 days
      location: {
        latitude: wilaya.center.latitude + (Math.random() - 0.5) * 2,
        longitude: wilaya.center.longitude + (Math.random() - 0.5) * 2
      },
      eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      description: `Security event detected in ${wilaya.name}`,
      wilaya: wilaya.name,
      affectedAssets: [`asset-${Math.floor(Math.random() * 100)}`],
      iocs: Math.random() > 0.8 ? [`ioc-${Math.random().toString(36).substr(2, 8)}`] : []
    })
  }

  return events
}

function generateMockSubscribers(count: number): any[] {
  const subscribers: Array<{
    imsi: string;
    msisdn: string;
    currentLocation: { latitude: number; longitude: number };
    lastUpdate: Date;
    riskScore: number;
    status: string;
    connectedCellTower: string;
    signalStrength: number;
  }> = []
  const statuses = ['active', 'roaming', 'suspicious', 'blocked']

  for (let i = 0; i < count; i++) {
    const wilaya = ALGERIAN_WILAYAS[Math.floor(Math.random() * ALGERIAN_WILAYAS.length)]
    
    subscribers.push({
      imsi: `21301${Math.random().toString().substr(2, 13)}${i.toString().padStart(4, '0')}`,
      msisdn: `213${Math.floor(Math.random() * 900000000 + 100000000)}`,
      currentLocation: {
        latitude: wilaya.center.latitude + (Math.random() - 0.5) * 1,
        longitude: wilaya.center.longitude + (Math.random() - 0.5) * 1
      },
      lastUpdate: new Date(Date.now() - Math.random() * 3600000),
      riskScore: Math.floor(Math.random() * 100),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      connectedCellTower: `tower-${wilaya.code}-${Math.floor(Math.random() * 50)}`,
      signalStrength: Math.floor(Math.random() * 31) + 70 // -120 to -90 dBm
    })
  }

  return subscribers
}

function generateMockLocations(subscriberId: string): any[] {
  const locations: Array<{
    imsi: string;
    msisdn: string;
    currentLocation: { latitude: number; longitude: number };
    lastUpdate: Date;
    riskScore: number;
    status: string;
    connectedCellTower: string;
    signalStrength: number;
  }> = []
  let currentTime = new Date()
  let currentWilaya = ALGERIAN_WILAYAS[Math.floor(Math.random() * ALGERIAN_WILAYAS.length)]

  for (let i = 0; i < Math.floor(Math.random() * 20) + 5; i++) {
    // Occasionally change wilaya to simulate movement
    if (Math.random() > 0.7) {
      currentWilaya = ALGERIAN_WILAYAS[Math.floor(Math.random() * ALGERIAN_WILAYAS.length)]
    }

    locations.push({
      imsi: subscriberId,
      msisdn: `213${Math.floor(Math.random() * 900000000 + 100000000)}`,
      currentLocation: {
        latitude: currentWilaya.center.latitude + (Math.random() - 0.5) * 0.5,
        longitude: currentWilaya.center.longitude + (Math.random() - 0.5) * 0.5
      },
      lastUpdate: new Date(currentTime.getTime() - Math.random() * 7200000), // Last 2 hours
      riskScore: Math.floor(Math.random() * 100),
      status: 'active',
      connectedCellTower: `tower-${currentWilaya.code}-${Math.floor(Math.random() * 50)}`,
      signalStrength: Math.floor(Math.random() * 31) + 70
    })

    currentTime = new Date(currentTime.getTime() - Math.random() * 3600000)
  }

  return locations.sort((a, b) => a.lastUpdate.getTime() - b.lastUpdate.getTime())
}

function generateMockCoverageData(): any[] {
  const technologies: Array<'2G' | '3G' | '4G' | '5G'> = ['2G', '3G', '4G', '5G']
  const qualities: Array<'excellent' | 'good' | 'fair' | 'poor'> = ['excellent', 'good', 'fair', 'poor']
  const securityStatuses: Array<'secure' | 'monitored' | 'compromised' | 'unknown'> = ['secure', 'monitored', 'compromised', 'unknown']

  return ALGERIAN_WILAYAS.map(wilaya => ({
    id: `coverage-${wilaya.code}`,
    location: wilaya.center,
    cellTowerId: `tower-${wilaya.code}-main`,
    technology: technologies[Math.floor(Math.random() * technologies.length)],
    coverageQuality: qualities[Math.floor(Math.random() * qualities.length)],
    securityStatus: securityStatuses[Math.floor(Math.random() * securityStatuses.length)],
    throughput: Math.floor(Math.random() * 900) + 100, // 100-1000 Mbps
    latency: Math.floor(Math.random() * 40) + 5, // 5-45 ms
    activeConnections: Math.floor(Math.random() * 10000) + 1000,
    threatIndicators: Math.floor(Math.random() * 10)
  }))
}
