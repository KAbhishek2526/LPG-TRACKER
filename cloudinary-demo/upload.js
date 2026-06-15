const cloudinary = require('cloudinary').v2;

// 1. Configure Cloudinary
cloudinary.config({ 
  cloud_name: 'dq0kfbnrx', 
  api_key: '888223784266723', 
  api_secret: '0VVlOe9x5cGkOvdPs3zh37YuQrs' 
});

async function run() {
  try {
    // 2. Upload an image
    console.log("Uploading image...");
    const uploadResult = await cloudinary.uploader.upload('https://res.cloudinary.com/demo/image/upload/sample.jpg');
    console.log("Upload successful!");
    console.log("Secure URL:", uploadResult.secure_url);
    console.log("Public ID:", uploadResult.public_id);
    
    // 3. Get image details
    console.log("\nFetching image details...");
    const details = await cloudinary.api.resource(uploadResult.public_id);
    console.log("Width:", details.width);
    console.log("Height:", details.height);
    console.log("Format:", details.format);
    console.log("Size in bytes:", details.bytes);
    
    // 4. Transform the image
    // f_auto: Automatically formats the image into the most efficient web format based on the browser
    // q_auto: Automatically adjusts the compression quality to optimize file size without visible degradation
    console.log("\nGenerating transformed image URL...");
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      fetch_format: 'auto',
      quality: 'auto'
    });
    
    console.log("Done! Click link below to see optimized version of the image. Check the size and the format.");
    console.log("Transformed URL:", transformedUrl);
    
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

run();
