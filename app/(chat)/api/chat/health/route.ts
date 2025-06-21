import { myProvider } from '@/lib/ai/providers';

export async function GET() {
  try {
    // Check if XAI_API_KEY is set
    const hasApiKey = !!process.env.XAI_API_KEY;
    
    // Try to get the model
    let modelAvailable = false;
    try {
      const model = myProvider.languageModel('chat-model');
      modelAvailable = !!model;
    } catch (error) {
      console.error('Model check error:', error);
    }
    
    return Response.json({
      status: 'ok',
      hasApiKey,
      modelAvailable,
      apiKeyLength: process.env.XAI_API_KEY?.length || 0,
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}