import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log request details
  console.log('\n🔍 [REQUEST DETAILS]');
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.originalUrl}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Params:', JSON.stringify(req.params, null, 2));

  // Capture response
  const originalSend = res.send;
  res.send = function (body) {
    const responseTime = Date.now() - start;
    
    // Log response details
    console.log('\n📤 [RESPONSE DETAILS]');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response Time: ${responseTime}ms`);
    console.log('Response Body:', JSON.stringify(body, null, 2));
    
    return originalSend.call(this, body);
  };

  next();
}; 