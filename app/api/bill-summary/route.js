import { NextRequest, NextResponse } from 'next/server';
import { getIndex } from '../../../lib/vectordb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId');

    if (!billId) {
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    const index = getIndex();
    
    const searchResults = await index.query({
      vector: new Array(768).fill(0),
      topK: 1,
      filter: { billId: { "$eq": billId } },
      includeMetadata: true,
    });

    if (searchResults.matches && searchResults.matches.length > 0) {
      const summary = searchResults.matches[0].metadata.summary;
      const title = searchResults.matches[0].metadata.title;
      
      return NextResponse.json({
        billId,
        title,
        summary,
        hasData: true,
      });
    } else {
      return NextResponse.json({
        billId,
        summary: null,
        hasData: false,
        message: 'Bill not yet processed or no data available',
      });
    }

  } catch (error) {
    console.error('Error fetching bill summary:', error);
    return NextResponse.json(
      { error: `Failed to fetch summary: ${error.message}` },
      { status: 500 }
    );
  }
}
