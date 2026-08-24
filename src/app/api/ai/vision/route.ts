/**
 * AI Vision & Document Analysis API Endpoint
 * 
 * Provides computer vision capabilities:
 * - Document analysis (ID cards, passports, etc.)
 * - OCR text extraction
 * - Forgery detection
 * - Image quality assessment
 * 
 * POST /api/ai/vision/analyze - Analyze document image
 * POST /api/ai/vision/ocr - Extract text from image
 * POST /api/ai/vision/verify-id - Verify identity document
 * POST /api/ai/vision/detect-forgery - Detect image manipulation
 * 
 * @version 1.0.0
 * @route /api/ai/vision
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVisionEngine } from '@/lib/ai/internal/vision-engine';

// Initialize vision engine on first request
let engineInitialized = false;

async function ensureEngine() {
  if (!engineInitialized) {
    try {
      const engine = getVisionEngine();
      if (!engine.isReady()) {
        await engine.initialize();
      }
      engineInitialized = true;
    } catch (error) {
      console.error('[AI Vision] Failed to initialize engine:', error);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureEngine();
    
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data') && !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data or application/json' },
        { status: 400 }
      );
    }

    let analysisType: string;
    let imageData: Buffer;
    let mimeType: string;
    let options: any;

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('image') as File;
      
      if (!file) {
        return NextResponse.json(
          { error: 'Image file is required (field name: "image")' },
          { status: 400 }
        );
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Image file too large (max 10MB)' },
          { status: 400 }
        );
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'image/bmp', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Unsupported image type: ${file.type}. Allowed: ${allowedTypes.join(', ')}` },
          { status: 400 }
        );
      }

      imageData = Buffer.from(await file.arrayBuffer());
      mimeType = file.type;
      analysisType = formData.get('analysisType') as string || 'analyze';
      
      // Parse additional options from form data
      options = {};
      for (const [key, value] of formData.entries()) {
        if (key !== 'image' && key !== 'analysisType') {
          options[key] = value;
        }
      }

    } else {
      // Handle JSON with base64 or URL
      const body = await request.json();
      
      analysisType = body.analysisType || 'analyze';
      options = body.options || {};

      if (body.imageBase64) {
        const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        imageData = Buffer.from(base64Data, 'base64');
        mimeType = body.mimeType || 'image/png';
      } else if (body.imageUrl) {
        // Would fetch from URL in production
        return NextResponse.json(
          { error: 'URL-based image upload not yet supported' },
          { status: 501 }
        );
      } else {
        return NextResponse.json(
          { error: 'Image data required (imageBase64 or multipart file)' },
          { status: 400 }
        );
      }
    }

    const engine = getVisionEngine();

    if (!engine.isReady()) {
      return NextResponse.json(
        { error: 'Vision service not available' },
        { status: 503 }
      );
    }

    // Create image input object
    const imageInput = {
      buffer: imageData,
      mimeType,
      filename: options.filename || `upload_${Date.now()}`,
      metadata: options.metadata || {}
    };

    // Route to appropriate analysis function
    switch (analysisType) {
      case 'analyze':
        return await analyzeDocument(engine, imageInput);
      
      case 'ocr':
        return await extractText(engine, imageInput, options);
      
      case 'verify-id':
        return await verifyID(engine, imageInput);
      
      case 'detect-forgery':
        return await detectForgery(engine, imageInput);
      
      case 'quality':
        return await assessQuality(engine, imageInput);
      
      default:
        return NextResponse.json(
          { error: `Unknown analysis type: ${analysisType}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[AI Vision] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Vision analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Full document analysis
 */
async function analyzeDocument(engine: any, imageInput: any) {
  const result = await engine.analyzeDocument(imageInput);

  return NextResponse.json({
    success: true,
    analysisType: 'document-analysis',
    data: result,
    metadata: {
      processedAt: new Date().toISOString(),
      aiModelsUsed: ['Vision Engine']
    }
  });
}

/**
 * OCR text extraction
 */
async function extractText(engine: any, imageInput: any, options?: any) {
  const ocrResult = await engine.extractText(imageInput, {
    language: options?.language,
    preprocess: options?.preprocess !== false
  });

  return NextResponse.json({
    success: true,
    analysisType: 'ocr',
    data: ocrResult,
    metadata: {
      language: options?.language || 'auto-detected',
      processedAt: new Date().toISOString(),
      aiModelsUsed: ['Tesseract OCR']
    }
  });
}

/**
 * ID document verification
 */
async function verifyID(engine: any, imageInput: any) {
  const verificationResult = await engine.verifyID(imageInput);

  return NextResponse.json({
    success: true,
    analysisType: 'id-verification',
    data: verificationResult,
    metadata: {
      processedAt: new Date().toISOString(),
      aiModelsUsed: ['Vision Engine', 'Face Detection', 'OCR']
    }
  });
}

/**
 * Forgery/tampering detection
 */
async function detectForgery(engine: any, imageInput: any) {
  const forgeryResult = await engine.detectForgery(imageInput);

  return NextResponse.json({
    success: true,
    analysisType: 'forgery-detection',
    data: forgeryResult,
    metadata: {
      processedAt: new Date().toISOString(),
      aiModelsUsed: ['ELA', 'Noise Analysis', 'Copy-Move Detection']
    }
  });
}

/**
 * Image quality assessment
 */
async function assessQuality(engine: any, imageInput: any) {
  const qualityResult = await engine.assessImageQuality(imageInput);

  return NextResponse.json({
    success: true,
    analysisType: 'quality-assessment',
    data: qualityResult,
    metadata: {
      processedAt: new Date().toISOString(),
      aiModelsUsed: ['Image Quality Analyzer']
    }
  });
}
