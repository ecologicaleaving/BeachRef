/**
 * Netlify serverless function to proxy VIS API requests
 * Solves CORS issues when calling VIS API from browser
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const VIS_API_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  // Only allow requests from the same origin or Netlify domains
  const origin = event.headers.origin || '';
  const allowedOrigins = [
    'https://beachrefdev.netlify.app',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:8083',
    'http://localhost:8084',
    'http://localhost:8085',
    'http://localhost:8086',
    'http://localhost:8087',
    'http://localhost:8088',
    'http://localhost:8089',
    'http://localhost:8090',
    'http://localhost:8091',
    'http://localhost:8092',
    'http://localhost:8093',
    'http://localhost:8094',
    'http://localhost:8095',
    'http://localhost:8096',
    'http://localhost:8097',
    'http://localhost:8098',
  ];

  const isAllowedOrigin = allowedOrigins.includes(origin) || origin.includes('netlify.app');

  if (!isAllowedOrigin && origin !== '') {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Origin not allowed' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  try {
    // Parse the request body
    const body = event.body;

    if (!body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Request body is required' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin || '*',
        },
      };
    }

    // Forward the request to the VIS API
    const response = await fetch(VIS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
    });

    if (!response.ok) {
      console.error('VIS API returned error:', response.status, response.statusText);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: `VIS API error: ${response.status} ${response.statusText}`
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin || '*',
        },
      };
    }

    const responseText = await response.text();

    // Return the VIS API response with CORS headers
    return {
      statusCode: 200,
      body: responseText,
      headers: {
        'Content-Type': 'text/xml',
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  } catch (error) {
    console.error('Error proxying request to VIS API:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error while proxying request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || '*',
      },
    };
  }
};
