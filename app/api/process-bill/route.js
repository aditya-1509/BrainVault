import { NextRequest, NextResponse } from 'next/server';
import { storeBillContentInChunks, generateBillSummary, checkBillExists, getIndex } from '../../../lib/vectordb';
import { pdfProcessor } from '../../../lib/pdfProcessor';

export async function POST(request) {
  try {
    console.log('Process bill API called');
    
    const { billId, pdfUrl, title } = await request.json();
    console.log('Request data:', { billId, pdfUrl: pdfUrl?.substring(0, 50) + '...', title });

    if (!billId || !pdfUrl) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Bill ID and PDF URL are required' },
        { status: 400 }
      );
    }

    const existenceCheck = await checkBillExists(billId);
    if (existenceCheck.exists) {
      // console.log(`Bill ${billId} already exists in database with ${existenceCheck.chunksCount} chunks`);
      
      try {
        // console.log('generating summary');
        
        const index = getIndex();
        const contentQuery = await index.query({
          vector: new Array(768).fill(0),
          topK: 5, 
          filter: { billId: { "$eq": billId.toString() } },
          includeMetadata: true,
        });
        
        if (contentQuery.matches && contentQuery.matches.length > 0) {
          const contextText = contentQuery.matches
            .map(match => match.metadata.content || match.metadata.text || '')
            .filter(content => content.length > 0)
            .join('\n\n');
          
          if (contextText) {
            const aiSummary = await generateBillSummary(contextText, title || existenceCheck.billTitle);
            
            return NextResponse.json({
              success: true,
              message: `Bill ${billId} already exists in database`,
              chunksStored: existenceCheck.chunksCount || 0,
              summary: aiSummary,
              vectorStorage: true,
              processingMethod: 'existing-data-with-summary',
              alreadyProcessed: true,
              billTitle: existenceCheck.billTitle,
              lastProcessed: existenceCheck.lastProcessed
            });
          }
        }
      } catch (summaryError) {
        console.error('Error generating summary from existing content:', summaryError);
        throw summaryError;
      }
      
      return NextResponse.json({
        success: true,
        message: `Bill ${billId} already exists in database`,
        chunksStored: existenceCheck.chunksCount || 0,
        summary: aiSummary,
        vectorStorage: true,
        processingMethod: 'existing-data-with-summary',
        alreadyProcessed: true,
        billTitle: existenceCheck.billTitle,
        lastProcessed: existenceCheck.lastProcessed
      });
    }

    console.log('Processing actual PDF content with chunking...');
    
    const processedData = await pdfProcessor.processPDFAndCreateChunks(pdfUrl, billId, title);
    console.log(`Successfully processed PDF into ${processedData.totalChunks} chunks`);

    console.log('Storing chunked bill content in vector database...');
    const result = await storeBillContentInChunks(processedData.chunks);
    
    console.log('Generating AI summary from actual content...');
    const contextText = processedData.chunks.slice(0, 3).map(chunk => chunk.content).join('\n\n');
    const aiSummary = await generateBillSummary(contextText, title);

    console.log(`Successfully processed bill ${billId} with ${result.chunksStored} chunks stored`);

    return NextResponse.json({
      success: true,
      message: `Successfully processed bill ${billId} with full content chunking`,
      chunksStored: result.chunksStored,
      totalChunks: processedData.totalChunks,
      originalLength: processedData.originalLength,
      summary: aiSummary,
      vectorStorage: true,
      processingMethod: 'full-pdf-chunking',
      pdfMetadata: processedData.pdfMetadata
    });

  } catch (error) {
    console.error('Error processing bill:', error);
    return NextResponse.json(
      { error: `Failed to process bill: ${error.message}` },
      { status: 500 }
    );
  }
}
