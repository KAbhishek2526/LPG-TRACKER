const axios = require('axios');

exports.getAddressFromCoords = async (lat, lng) => {
    try {
        if (!lat || !lng) return "Unknown location";

        const res = await axios.get(
            `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${process.env.OPENCAGE_API_KEY}`
        );

        return res.data.results[0]?.formatted || "Unknown location";
    } catch (err) {
        // Core Constraint: Do NOT block delivery if API fails => silently fallback cleanly
        console.error("[Geocode Failed]", err.message);
        return "Unknown location";
    }
};
