const LOCAL_API_BASE_URL = "http://127.0.0.1:8000";

const PRODUCTION_API_BASE_URL = "https://plazoclaro-back.onrender.com";

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? LOCAL_API_BASE_URL
    : PRODUCTION_API_BASE_URL;