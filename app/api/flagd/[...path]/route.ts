import { NextRequest } from 'next/server';

const FLAGD_HOST = process.env.FLAGD_HOST || 'localhost';
const FLAGD_PORT = process.env.FLAGD_PORT || '8013';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const url = `http://${FLAGD_HOST}:${FLAGD_PORT}/${path}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        // Add CORS headers for browser access
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Connect-Protocol-Version',
      },
    });
  } catch (error) {
    console.error('[Flagd Proxy] Error:', error);
    return new Response(JSON.stringify({ error: 'Proxy error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = `http://${FLAGD_HOST}:${FLAGD_PORT}/${path}`;
  
  try {
    // Get the raw body as ArrayBuffer for binary data
    const bodyBuffer = await request.arrayBuffer();
    
    // Forward relevant headers
    const headers: HeadersInit = {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
    };
    
    // Forward Connect protocol headers if present
    const connectVersion = request.headers.get('Connect-Protocol-Version');
    if (connectVersion) {
      headers['Connect-Protocol-Version'] = connectVersion;
    }
    
    // Handle EventStream endpoint specially
    if (path.includes('EventStream')) {
      // For streaming endpoints, we need to handle differently
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: bodyBuffer,
      });
      
      // Check if it's a streaming response
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('application/connect+') || response.headers.get('Transfer-Encoding') === 'chunked') {
        // Return the response with streaming support
        return new Response(response.body, {
          status: response.status,
          headers: {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Connect-Protocol-Version',
            'Access-Control-Expose-Headers': 'Content-Type',
            // Preserve streaming headers
            'Transfer-Encoding': response.headers.get('Transfer-Encoding') || '',
            'Cache-Control': 'no-cache',
          },
        });
      }
    }
    
    // For non-streaming endpoints, handle normally
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: bodyBuffer,
    });
    
    const data = await response.arrayBuffer();
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Connect-Protocol-Version',
      },
    });
  } catch (error) {
    console.error('[Flagd Proxy] POST Error:', error);
    return new Response(JSON.stringify({ error: 'Proxy error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Connect-Protocol-Version, X-Grpc-Web, X-User-Agent',
      'Access-Control-Expose-Headers': 'Content-Type, Grpc-Status, Grpc-Message',
      'Access-Control-Max-Age': '86400',
    },
  });
}