/**
 * API Configuration
 * 
 * IMPORTANT: If you change your network or the IP address of your computer changes,
 * update the BASE_IP constant below with your new local IP address.
 * 
 * You can find your IP by running 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux).
 */

const BASE_IP = '10.22.140.80'; // Replace with your current local IP
const PORT = '3000';

export const API_BASE_URL = `http://${BASE_IP}:${PORT}/api/v1`;
export const SOCKET_URL = `http://${BASE_IP}:${PORT}`;
