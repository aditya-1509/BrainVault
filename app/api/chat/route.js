import { NextRequest, NextResponse } from 'next/server';
import { searchSimilarContent, generateResponse } from '../../../lib/vectordb';

export async function POST(request) {
  try {
    const { message, billId } = await request.json();

    if (!message || !billId) {
      return NextResponse.json(
        { error: 'Message and bill ID are required' },
        { status: 400 }
      );
    }

    console.log(`Searching for content related to: ${message}`);
    const similarContent = await searchSimilarContent(message, billId, 5);

    const context = similarContent
      .map(match => match.metadata.content)
      .join('\n\n');

    console.log('Generating response...');
    const response = await generateResponse(message, context);

    const sources = similarContent.map(match => ({
      score: match.score,
      chunkIndex: match.metadata.chunkIndex,
      content: match.metadata.content.substring(0, 200) + '...',
    }));

    return NextResponse.json({
      response,
      sources,
      billId,
    });

  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: `Failed to process chat: ${error.message}` },
      { status: 500 }
    );
  }
}
