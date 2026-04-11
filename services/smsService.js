const axios = require('axios');

exports.sendOTP = async (phone, otpCode) => {
    try {
        if (!phone) throw new Error("Destination phone number is null or invalid.");

        // Fast2SMS Route configuration exclusively mapped to POST structural paradigm
        const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', 
            {
                variables_values: otpCode,
                route: 'otp',
                numbers: phone.replace(/\D/g, '') // Sanitize phone format natively
            },
            {
                headers: {
                    authorization: process.env.FAST2SMS_API_KEY,
                    "Content-Type": "application/json"
                }
            }
        );
        
        console.log(`[SYS ADMIN] Fast2SMS OTP POST payload dispatched securely to endpoint: ${phone}`);
        return true;
    } catch (error) {
        // Project Constraint: "Handle SMS failure gracefully (log only)"
        console.error(`[AUDIT WARNING] Fast2SMS OTP payload failed for ${phone}:`, error.message);
        throw error; // Let the caller catch it per constraint modifications
    }
};
