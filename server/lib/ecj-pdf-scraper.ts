/**
 * ECJ PDF Scraper - Real PDF Document Extraction
 * Downloads and extracts data from actual ECJ election result PDFs using OCR
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Use dynamic import for pdf-parse to avoid initialization issues
let pdfParse: any = null;

interface ECJDocument {
  title: string;
  url: string;
  year: string;
  type: string;
  fileSize?: string;
}

interface ExtractedElectionData {
  election: {
    title: string;
    year: string;
    date: string;
    type: string;
  };
  parishes: Array<{
    name: string;
    registeredVoters: number;
    totalVotesCast: number;
    validVotes: number;
    rejectedBallots: number;
    spoiltBallots: number;
    turnout: number;
    pollingStations: number;
    candidates?: Array<{
      name: string;
      party: string;
      votes: number;
    }>;
  }>;
  summary: {
    totalRegisteredVoters: number;
    totalVotesCast: number;
    totalValidVotes: number;
    totalRejectedBallots: number;
    totalSpoiltBallots: number;
    overallTurnout: number;
    totalPollingStations: number;
  };
  rawText: string;
}

class ECJPDFScraper {
  private genAI: GoogleGenerativeAI | null = null;
  private baseUrl = 'https://ecj.com.jm';

  constructor() {
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY!);
    }
  }

  /**
   * Initialize PDF parser
   */
  private async initPDFParser(): Promise<void> {
    if (!pdfParse) {
      try {
        pdfParse = require('pdf-parse');
      } catch (error) {
        console.error('[ECJ PDF SCRAPER] Error loading pdf-parse:', error);
        throw new Error('PDF parsing library not available');
      }
    }
  }

  /**
   * Scrape ECJ website to find all election result PDFs
   */
  async findAllECJDocuments(): Promise<ECJDocument[]> {
    console.log('[ECJ PDF SCRAPER] Scanning ECJ website for election result PDFs...');
    
    const documents: ECJDocument[] = [];
    
    // Known ECJ election result pages to scrape
    const ecjPages = [
      '/elections/election-results/parish-council-elections/',
      '/elections/election-results/general-elections/',
      '/elections/election-results/by-elections/',
      '/elections/election-results/municipal-elections/'
    ];

    for (const page of ecjPages) {
      try {
        console.log(`[ECJ PDF SCRAPER] Scanning ${this.baseUrl + page}...`);
        
        const response = await axios.get(this.baseUrl + page, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        });

        const $ = cheerio.load(response.data);
        
        // Look for PDF links
        $('a[href*=".pdf"]').each((index, element) => {
          const href = $(element).attr('href');
          const text = $(element).text().trim();
          
          if (href && text) {
            const fullUrl = href.startsWith('http') ? href : this.baseUrl + href;
            
            // Extract year from filename or text
            const yearMatch = text.match(/20\d{2}|19\d{2}/);
            const year = yearMatch ? yearMatch[0] : 'unknown';
            
            // Determine election type
            let type = 'Parish Council';
            if (text.toLowerCase().includes('general')) type = 'General Election';
            if (text.toLowerCase().includes('by-election')) type = 'By-Election';
            if (text.toLowerCase().includes('municipal')) type = 'Municipal';

            documents.push({
              title: text,
              url: fullUrl,
              year: year,
              type: type,
              fileSize: $(element).siblings().text().match(/\d+\s?(KB|MB)/)?.[0]
            });
          }
        });

        // Also check for embedded PDFs or iframes
        $('iframe[src*=".pdf"], embed[src*=".pdf"]').each((index, element) => {
          const src = $(element).attr('src');
          if (src) {
            const fullUrl = src.startsWith('http') ? src : this.baseUrl + src;
            documents.push({
              title: `Election Results PDF ${index + 1}`,
              url: fullUrl,
              year: 'unknown',
              type: 'Parish Council'
            });
          }
        });
        
      } catch (error) {
        console.error(`[ECJ PDF SCRAPER] Error scanning ${page}:`, error.message);
      }
    }

    // Add known ECJ documents directly if available
    const knownDocuments = [
      {
        title: '2024 Local Government Summary Results',
        url: 'https://ecj.com.jm/wp-content/uploads/2024/05/2024LocalGovernmentSummaryResults.pdf',
        year: '2024',
        type: 'Parish Council'
      },
      {
        title: 'Portmore City Municipality Election 2024 Summary',
        url: 'https://ecj.com.jm/wp-content/uploads/2024/03/PortmoreCityMunicipalityElection2024-Summary.pdf',
        year: '2024',
        type: 'Municipal'
      }
    ];

    documents.push(...knownDocuments);
    
    console.log(`[ECJ PDF SCRAPER] Found ${documents.length} PDF documents`);
    return documents;
  }

  /**
   * Download and extract text from a PDF document
   */
  async downloadAndExtractPDF(document: ECJDocument): Promise<string> {
    console.log(`[ECJ PDF SCRAPER] Downloading ${document.title}...`);
    
    try {
      const response = await axios.get(document.url, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/pdf,application/octet-stream,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://ecj.com.jm/',
          'Connection': 'keep-alive'
        }
      });

      console.log(`[ECJ PDF SCRAPER] Extracting text from ${document.title}...`);
      
      await this.initPDFParser();
      const data = await pdfParse(response.data);
      const extractedText = data.text;
      
      console.log(`[ECJ PDF SCRAPER] Extracted ${extractedText.length} characters from ${document.title}`);
      
      return extractedText;
      
    } catch (error) {
      console.error(`[ECJ PDF SCRAPER] Error downloading ${document.title}:`, error.message);
      throw error;
    }
  }

  /**
   * Use AI to parse extracted PDF text into structured election data
   */
  async parseElectionDataWithAI(rawText: string, documentInfo: ECJDocument): Promise<ExtractedElectionData> {
    if (!this.genAI) {
      throw new Error('Google AI API key not configured for text parsing');
    }

    console.log(`[ECJ PDF SCRAPER] Parsing election data from ${documentInfo.title} using AI...`);

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `Parse this ECJ election results document and extract structured data for all Jamaica parishes.

Document: ${documentInfo.title} (${documentInfo.year})
Type: ${documentInfo.type}

Raw PDF Text:
${rawText.substring(0, 8000)} ${rawText.length > 8000 ? '...(truncated)' : ''}

Extract and structure the following data for each parish mentioned:
- Parish name
- Registered voters
- Total votes cast
- Valid votes
- Rejected ballots
- Spoilt ballots
- Turnout percentage
- Number of polling stations
- Candidate results (if available)

Format as JSON:
{
  "election": {
    "title": "${documentInfo.title}",
    "year": "${documentInfo.year}",
    "date": "YYYY-MM-DD",
    "type": "${documentInfo.type}"
  },
  "parishes": [
    {
      "name": "Parish Name",
      "registeredVoters": number,
      "totalVotesCast": number,
      "validVotes": number,
      "rejectedBallots": number,
      "spoiltBallots": number,
      "turnout": decimal,
      "pollingStations": number,
      "candidates": [optional array of candidate results]
    }
  ],
  "summary": {
    "totalRegisteredVoters": number,
    "totalVotesCast": number,
    "totalValidVotes": number,
    "totalRejectedBallots": number,
    "totalSpoiltBallots": number,
    "overallTurnout": decimal,
    "totalPollingStations": number
  }
}

Extract ONLY the data that is clearly visible in the PDF text. If specific numbers are not available, use null. Focus on the actual election results data, not headers or administrative text.`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]) as ExtractedElectionData;
        parsedData.rawText = rawText;
        
        console.log(`[ECJ PDF SCRAPER] Successfully parsed data for ${parsedData.parishes.length} parishes`);
        return parsedData;
      }
      
      throw new Error('Could not extract JSON from AI parsing response');
      
    } catch (error) {
      console.error(`[ECJ PDF SCRAPER] Error parsing with AI:`, error);
      throw error;
    }
  }

  /**
   * Process all ECJ documents and extract election data
   */
  async processAllECJDocuments(): Promise<ExtractedElectionData[]> {
    console.log('[ECJ PDF SCRAPER] Starting comprehensive PDF extraction...');
    
    const documents = await this.findAllECJDocuments();
    const extractedData: ExtractedElectionData[] = [];
    
    // Process up to 24 documents as specified
    const documentsToProcess = documents.slice(0, 24);
    
    for (const document of documentsToProcess) {
      try {
        console.log(`[ECJ PDF SCRAPER] Processing ${document.title}...`);
        
        // Download and extract PDF text
        const rawText = await this.downloadAndExtractPDF(document);
        
        // Parse with AI
        const electionData = await this.parseElectionDataWithAI(rawText, document);
        
        extractedData.push(electionData);
        
        // Delay to avoid overwhelming servers
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`[ECJ PDF SCRAPER] Failed to process ${document.title}:`, error.message);
        // Continue with other documents
      }
    }
    
    console.log(`[ECJ PDF SCRAPER] Successfully processed ${extractedData.length}/${documentsToProcess.length} documents`);
    return extractedData;
  }

  /**
   * Save raw PDF text for debugging
   */
  async savePDFText(text: string, filename: string): Promise<void> {
    try {
      const dir = path.join(process.cwd(), 'server', 'data', 'extracted-pdfs');
      await fs.mkdir(dir, { recursive: true });
      
      const filepath = path.join(dir, `${filename}.txt`);
      await fs.writeFile(filepath, text, 'utf8');
      
      console.log(`[ECJ PDF SCRAPER] Saved extracted text to ${filepath}`);
    } catch (error) {
      console.error('[ECJ PDF SCRAPER] Error saving PDF text:', error);
    }
  }
}

export const ecjPDFScraper = new ECJPDFScraper();