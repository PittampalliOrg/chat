import { createDataStream } from 'ai';

export const runtime = 'edge';

export async function GET() {
  console.log('Test stream endpoint called');
  
  const stream = createDataStream({
    execute: async (dataStream) => {
      dataStream.writeData('Starting test stream...\n');
      
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        dataStream.writeData(`Message ${i + 1}\n`);
      }
      
      dataStream.writeData('Stream complete!\n');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}