export const handler = async (event: any) => {
  console.log('Event: ', JSON.stringify(event));

  try {
    const authHeader = event.authorizationToken;

    if (!authHeader) {
      throw new Error('Unauthorized error: authorization header is missing');
    }

    const [authType, authToken] = authHeader.split(' ');
    
    if (!authToken || authType !== 'Basic') {
      throw new Error('Unauthorized error: invalid authorization type');
    }

    const envUsername = process.env.USERNAME;
    const envPassword = process.env.PASSWORD;

    const bufferData = Buffer.from(authToken, 'base64');
    const [username, password] = bufferData.toString('utf-8').split('=');

    console.log(`Username. auth: ${username}, env: ${envUsername}`);
    console.log(`Password. auth: ${password}, env: ${envPassword}`);

    if (username !== envUsername || password !== envPassword) {
      return generatePolicy('user', 'Deny', event.methodArn);
    }

    return generatePolicy('user', 'Allow', event.methodArn);

  } catch (error: any) {
    console.error('Error: ', error);
    
    if (error.message.includes('No token provided')) {
      throw new Error('Unauthorized error: No token provided');
    } else {
      return generatePolicy('user', 'Deny', event.methodArn);
    }
  }
};

const generatePolicy = (principalId: string, effect: 'Allow' | 'Deny', resource: string) => {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource
        }
      ]
    },
    context: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
    }
  };
};

//localStorage.setItem('authorization_token', 'VGFueWFTYW1hbD1URVNUX1BBU1NXT1JE');
