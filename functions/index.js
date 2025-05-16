const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({origin: true});

admin.initializeApp();

exports.setServiceProviderClaim = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'User must be authenticated'
    );
  }

  const uid = context.auth.uid;
  
  try {
    // Verify the user exists
    const user = await admin.auth().getUser(uid);
    if (!user) {
      throw new functions.https.HttpsError(
        'not-found',
        'User not found'
      );
    }

    // Set the custom claim
    await admin.auth().setCustomUserClaims(uid, {
      serviceProvider: true
    });

    // Log success for debugging
    functions.logger.info('Successfully set service provider claim', {uid: uid});
    
    return { 
      success: true,
      message: 'Service provider claim set successfully'
    };
  } catch (error) {
    // Log the error for debugging
    functions.logger.error('Error setting service provider claim', {
      uid: uid,
      error: error.message,
      stack: error.stack
    });

    throw new functions.https.HttpsError(
      'internal',
      `Failed to set service provider claim: ${error.message}`
    );
  }
});


