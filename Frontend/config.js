BACKEND_URL = "https://backend-quick-pick-redesigned.onrender.com"
SOCKET_IO_URL = "https://backend-quick-pick-redesigned.onrender.com"

// Detect environment automatically
function getBasePath() {
    // Render production domain
    if (window.location.hostname.includes("onrender.com")) {
        return "";  // Frontend is served as root in Render
    }

    // Localhost environment
    return "/Frontend";  
}

// BACKEND_URL = "http://localhost:5001"
// SOCKET_IO_URL = 'http://localhost:5001';
// BACKEND_URL = 