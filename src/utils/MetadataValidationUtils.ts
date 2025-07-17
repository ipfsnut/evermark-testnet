// src/utils/MetadataValidationUtils.ts - Debug and testing tools for metadata consistency
import type { EvermarkRow } from '../lib/supabase';
import { 
  MetadataTransformer, 
  type StandardizedEvermark, 
  TimestampProcessor,
  ImageResolver 
} from './MetadataTransformer';

export interface MetadataIssue {
  evermarkId: string;
  issueType: 'timestamp' | 'image' | 'attribution' | 'content_type' | 'validation';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  details: any;
  suggestedFix?: string;
}

export interface MetadataReport {
  summary: {
    totalEvermarks: number;
    issuesFound: number;
    criticalIssues: number;
    warningIssues: number;
    healthScore: number; // 0-100
  };
  issues: MetadataIssue[];
  statistics: {
    timestampIssues: number;
    imageIssues: number;
    attributionIssues: number;
    contentTypeIssues: number;
    validationIssues: number;
  };
  recommendations: string[];
}

export class MetadataValidator {
  private issues: MetadataIssue[] = [];

  /**
   * 🚨 CRITICAL: Validate timestamp consistency across all content types
   */
  validateTimestamps(evermarks: StandardizedEvermark[]): MetadataIssue[] {
    const timestampIssues: MetadataIssue[] = [];
    const now = Math.floor(Date.now() / 1000);
    const year2020 = 1577836800; // Jan 1, 2020
    const year2030 = 1893456000; // Jan 1, 2030

    evermarks.forEach(evermark => {
      // Check for impossible dates
      if (evermark.creationTime < year2020) {
        timestampIssues.push({
          evermarkId: evermark.id,
          issueType: 'timestamp',
          severity: 'critical',
          description: 'Creation time is before 2020 (likely 1970 epoch issue)',
          details: {
            creationTime: evermark.creationTime,
            createdAt: evermark.createdAt,
            readableDate: new Date(evermark.creationTime * 1000).toISOString()
          },
          suggestedFix: 'Use current timestamp or extract from source data'
        });
      }

      if (evermark.creationTime > year2030) {
        timestampIssues.push({
          evermarkId: evermark.id,
          issueType: 'timestamp',
          severity: 'critical',
          description: 'Creation time is in the far future (likely millisecond conversion issue)',
          details: {
            creationTime: evermark.creationTime,
            possibleMs: evermark.creationTime * 1000,
            readableDate: new Date(evermark.creationTime * 1000).toISOString()
          },
          suggestedFix: 'Convert from milliseconds to seconds'
        });
      }

      // Check for inconsistent timestamp formats
      try {
        const parsedDate = new Date(evermark.createdAt);
        const derivedTimestamp = Math.floor(parsedDate.getTime() / 1000);
        
        if (Math.abs(derivedTimestamp - evermark.creationTime) > 60) { // Allow 1 minute difference
          timestampIssues.push({
            evermarkId: evermark.id,
            issueType: 'timestamp',
            severity: 'warning',
            description: 'Inconsistency between creationTime and createdAt',
            details: {
              creationTime: evermark.creationTime,
              createdAt: evermark.createdAt,
              derivedTimestamp,
              difference: Math.abs(derivedTimestamp - evermark.creationTime)
            },
            suggestedFix: 'Ensure both fields derive from same source'
          });
        }
      } catch (error) {
        timestampIssues.push({
          evermarkId: evermark.id,
          issueType: 'timestamp',
          severity: 'critical',
          description: 'Invalid createdAt date format',
          details: {
            createdAt: evermark.createdAt,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          suggestedFix: 'Use ISO 8601 format for createdAt'
        });
      }
    });

    return timestampIssues;
  }

  /**
   * 🔥 HIGH: Validate image resolution consistency
   */
  validateImages(evermarks: StandardizedEvermark[]): MetadataIssue[] {
    const imageIssues: MetadataIssue[] = [];

    evermarks.forEach(evermark => {
      // Check for failed image status
      if (evermark.imageStatus === 'failed') {
        imageIssues.push({
          evermarkId: evermark.id,
          issueType: 'image',
          severity: 'warning',
          description: 'Image processing failed',
          details: {
            imageStatus: evermark.imageStatus,
            imageUrl: evermark.image,
            processingDetails: evermark.extendedMetadata.imageProcessing
          },
          suggestedFix: 'Retry image processing or provide fallback'
        });
      }

      // Check for missing images when expected
      if (!evermark.image || evermark.image.includes('placeholder')) {
        imageIssues.push({
          evermarkId: evermark.id,
          issueType: 'image',
          severity: 'info',
          description: 'Using placeholder image',
          details: {
            imageUrl: evermark.image,
            imageStatus: evermark.imageStatus
          },
          suggestedFix: 'Add proper image or mark as intentionally text-only'
        });
      }

      // Check for invalid URLs
      if (evermark.image && !this.isValidImageUrl(evermark.image)) {
        imageIssues.push({
          evermarkId: evermark.id,
          issueType: 'image',
          severity: 'critical',
          description: 'Invalid image URL format',
          details: {
            imageUrl: evermark.image,
            imageStatus: evermark.imageStatus
          },
          suggestedFix: 'Validate and correct image URL format'
        });
      }
    });

    return imageIssues;
  }

  /**
   * ⚠️ MEDIUM: Validate author/creator attribution
   */
  validateAttribution(evermarks: StandardizedEvermark[]): MetadataIssue[] {
    const attributionIssues: MetadataIssue[] = [];

    evermarks.forEach(evermark => {
      // Check for missing author
      if (!evermark.author || evermark.author === 'Unknown Author') {
        attributionIssues.push({
          evermarkId: evermark.id,
          issueType: 'attribution',
          severity: 'warning',
          description: 'Missing or unknown author',
          details: {
            author: evermark.author,
            creator: evermark.creator
          },
          suggestedFix: 'Extract author from source metadata or user input'
        });
      }

      // Check for missing creator
      if (!evermark.creator || evermark.creator === 'Unknown Creator') {
        attributionIssues.push({
          evermarkId: evermark.id,
          issueType: 'attribution',
          severity: 'info',
          description: 'Missing creator information',
          details: {
            author: evermark.author,
            creator: evermark.creator
          },
          suggestedFix: 'Link to wallet address or verified identity'
        });
      }

      // Check for potential confusion between author and creator
      if (evermark.author === evermark.creator && evermark.author !== 'Unknown Author') {
        attributionIssues.push({
          evermarkId: evermark.id,
          issueType: 'attribution',
          severity: 'info',
          description: 'Author and creator are identical - verify this is correct',
          details: {
            author: evermark.author,
            creator: evermark.creator,
            contentType: evermark.contentType
          },
          suggestedFix: 'Ensure distinction between content author and Evermark creator'
        });
      }
    });

    return attributionIssues;
  }

  /**
   * 📋 LOW: Validate content type consistency
   */
  validateContentTypes(evermarks: StandardizedEvermark[]): MetadataIssue[] {
    const contentTypeIssues: MetadataIssue[] = [];

    evermarks.forEach(evermark => {
      // Validate content type matches metadata
      switch (evermark.contentType) {
        case 'DOI':
          if (!evermark.extendedMetadata.doi) {
            contentTypeIssues.push({
              evermarkId: evermark.id,
              issueType: 'content_type',
              severity: 'warning',
              description: 'Content type is DOI but no DOI found in metadata',
              details: {
                contentType: evermark.contentType,
                hasDoiMetadata: !!evermark.extendedMetadata.doi
              },
              suggestedFix: 'Add DOI to metadata or change content type'
            });
          }
          break;

        case 'ISBN':
          if (!evermark.extendedMetadata.isbn) {
            contentTypeIssues.push({
              evermarkId: evermark.id,
              issueType: 'content_type',
              severity: 'warning',
              description: 'Content type is ISBN but no ISBN found in metadata',
              details: {
                contentType: evermark.contentType,
                hasIsbnMetadata: !!evermark.extendedMetadata.isbn
              },
              suggestedFix: 'Add ISBN to metadata or change content type'
            });
          }
          break;

        case 'Cast':
          if (!evermark.extendedMetadata.castData) {
            contentTypeIssues.push({
              evermarkId: evermark.id,
              issueType: 'content_type',
              severity: 'warning',
              description: 'Content type is Cast but no Farcaster data found',
              details: {
                contentType: evermark.contentType,
                hasCastData: !!evermark.extendedMetadata.castData
              },
              suggestedFix: 'Add Farcaster cast data or change content type'
            });
          }
          break;

        case 'URL':
          if (!evermark.sourceUrl) {
            contentTypeIssues.push({
              evermarkId: evermark.id,
              issueType: 'content_type',
              severity: 'warning',
              description: 'Content type is URL but no source URL provided',
              details: {
                contentType: evermark.contentType,
                sourceUrl: evermark.sourceUrl
              },
              suggestedFix: 'Add source URL or change content type'
            });
          }
          break;
      }

      // Check for missing source URL when expected
      if (!evermark.sourceUrl && evermark.contentType !== 'Custom') {
        contentTypeIssues.push({
          evermarkId: evermark.id,
          issueType: 'content_type',
          severity: 'info',
          description: 'Missing source URL for non-custom content',
          details: {
            contentType: evermark.contentType,
            sourceUrl: evermark.sourceUrl
          },
          suggestedFix: 'Add source URL or mark as custom content'
        });
      }
    });

    return contentTypeIssues;
  }

  /**
   * Generate comprehensive validation report
   */
  generateReport(evermarks: StandardizedEvermark[]): MetadataReport {
    const timestampIssues = this.validateTimestamps(evermarks);
    const imageIssues = this.validateImages(evermarks);
    const attributionIssues = this.validateAttribution(evermarks);
    const contentTypeIssues = this.validateContentTypes(evermarks);

    const allIssues = [
      ...timestampIssues,
      ...imageIssues,
      ...attributionIssues,
      ...contentTypeIssues
    ];

    const criticalIssues = allIssues.filter(issue => issue.severity === 'critical').length;
    const warningIssues = allIssues.filter(issue => issue.severity === 'warning').length;
    const infoIssues = allIssues.filter(issue => issue.severity === 'info').length;

    // Calculate health score (0-100)
    const totalPossibleIssues = evermarks.length * 4; // 4 categories
    const actualIssues = criticalIssues * 3 + warningIssues * 2 + infoIssues * 1;
    const healthScore = Math.max(0, 100 - (actualIssues / totalPossibleIssues) * 100);

    const recommendations = this.generateRecommendations({
      timestampIssues: timestampIssues.length,
      imageIssues: imageIssues.length,
      attributionIssues: attributionIssues.length,
      contentTypeIssues: contentTypeIssues.length,
      criticalIssues,
      warningIssues
    });

    return {
      summary: {
        totalEvermarks: evermarks.length,
        issuesFound: allIssues.length,
        criticalIssues,
        warningIssues,
        healthScore: Math.round(healthScore)
      },
      issues: allIssues,
      statistics: {
        timestampIssues: timestampIssues.length,
        imageIssues: imageIssues.length,
        attributionIssues: attributionIssues.length,
        contentTypeIssues: contentTypeIssues.length,
        validationIssues: allIssues.length
      },
      recommendations
    };
  }

  /**
   * Helper methods
   */
  private isValidImageUrl(url: string): boolean {
    if (!url) return false;
    
    try {
      // Check for valid URL formats
      if (url.startsWith('http://') || url.startsWith('https://')) {
        new URL(url);
        return true;
      }
      
      // Check for valid relative URLs
      if (url.startsWith('/')) {
        return true;
      }
      
      // Check for IPFS URLs
      if (url.startsWith('ipfs://')) {
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }

  private generateRecommendations(stats: {
    timestampIssues: number;
    imageIssues: number;
    attributionIssues: number;
    contentTypeIssues: number;
    criticalIssues: number;
    warningIssues: number;
  }): string[] {
    const recommendations: string[] = [];

    if (stats.criticalIssues > 0) {
      recommendations.push('🚨 Address critical issues immediately - they may break functionality');
    }

    if (stats.timestampIssues > stats.timestampIssues * 0.1) {
      recommendations.push('🕐 Review timestamp handling logic - implement TimestampProcessor consistently');
    }

    if (stats.imageIssues > 0) {
      recommendations.push('🖼️ Implement robust image processing pipeline with proper fallbacks');
    }

    if (stats.attributionIssues > 0) {
      recommendations.push('👤 Improve author/creator attribution by extracting from source metadata');
    }

    if (stats.contentTypeIssues > 0) {
      recommendations.push('📄 Validate content type detection logic and metadata consistency');
    }

    if (stats.warningIssues > 10) {
      recommendations.push('⚠️ Consider batch processing to fix warning-level issues');
    }

    return recommendations;
  }
}

// 🔧 Debug utilities for development
export class MetadataDebugger {
  /**
   * Log detailed metadata transformation for debugging
   */
  static debugTransformation(originalRow: EvermarkRow, transformed: StandardizedEvermark) {
    if (process.env.NODE_ENV !== 'development') return;

    console.group(`🔍 Metadata Debug: ${transformed.id}`);
    
    console.log('📥 Original Row:', {
      id: originalRow.id,
      title: originalRow.title,
      author: originalRow.author,
      created_at: originalRow.created_at,
      metadata: originalRow.metadata,
      processed_image_url: originalRow.processed_image_url,
      image_processing_status: originalRow.image_processing_status
    });

    console.log('📤 Transformed:', {
      id: transformed.id,
      title: transformed.title,
      author: transformed.author,
      creator: transformed.creator,
      creationTime: transformed.creationTime,
      createdAt: transformed.createdAt,
      image: transformed.image,
      imageStatus: transformed.imageStatus,
      contentType: transformed.contentType,
      sourceUrl: transformed.sourceUrl
    });

    // Highlight potential issues
    const issues: string[] = [];
    
    if (transformed.creationTime < 1577836800) {
      issues.push('⚠️ Suspicious creation time (before 2020)');
    }
    
    if (transformed.image.includes('placeholder')) {
      issues.push('ℹ️ Using placeholder image');
    }
    
    if (transformed.author === 'Unknown Author') {
      issues.push('⚠️ Unknown author');
    }

    if (issues.length > 0) {
      console.log('🚨 Issues found:', issues);
    }

    console.groupEnd();
  }

  /**
   * Test timestamp processing with various inputs
   */
  static testTimestampProcessing() {
    if (process.env.NODE_ENV !== 'development') return;

    const testCases = [
      { input: 1609459200, expected: 'Unix timestamp (seconds)' },
      { input: 1609459200000, expected: 'Unix timestamp (milliseconds)' },
      { input: '2021-01-01T00:00:00.000Z', expected: 'ISO string' },
      { input: new Date().toISOString(), expected: 'Current ISO string' },
      { input: 0, expected: 'Zero timestamp' },
      { input: null, expected: 'Null input' },
      { input: undefined, expected: 'Undefined input' },
      { input: 'invalid', expected: 'Invalid string' }
    ];

    console.group('🧪 Timestamp Processing Tests');
    
    testCases.forEach(test => {
      try {
        const result = TimestampProcessor.toUnixTimestamp(test.input);
        const readable = new Date(result * 1000).toISOString();
        console.log(`✅ ${test.expected}:`, {
          input: test.input,
          output: result,
          readable
        });
      } catch (error) {
        console.error(`❌ ${test.expected}:`, error);
      }
    });

    console.groupEnd();
  }

  /**
   * Test image resolution with various inputs
   */
  static testImageResolution() {
    if (process.env.NODE_ENV !== 'development') return;

    const testCases = [
      { processed_image_url: 'https://example.com/processed.jpg' },
      { metadata: { originalMetadata: { image: 'ipfs://QmTest123' } } },
      { metadata: { image: 'https://example.com/original.png' } },
      { metadata: { imageUrl: '/relative/path.jpg' } },
      {} // Empty case
    ];

    console.group('🧪 Image Resolution Tests');
    
    testCases.forEach((testRow, index) => {
      try {
        const result = ImageResolver.resolveImageUrl(testRow as Partial<EvermarkRow>);
        console.log(`✅ Test case ${index + 1}:`, {
          input: testRow,
          resolved: result
        });
      } catch (error) {
        console.error(`❌ Test case ${index + 1}:`, error);
      }
    });

    console.groupEnd();
  }
}

export default MetadataValidator;