const BASE = 'https://api.openf1.org/v1';
export class OpenF1 {
    static async get(endpoint, params = {}) {
        const query = new URLSearchParams(params).toString();
        const resp = await fetch(`${BASE}/${endpoint}?${query}`);
        return resp.ok ? await resp.json() : [];
    }
    static async getSession() {
        const sessions = await this.get('sessions', { date_start: '2024-01-01' });
        return sessions[sessions.length - 1];
    }
    static async getDrivers(session_key) { return await this.get('drivers', { session_key }); }
    static async getLocations(session_key, time) { 
        return await this.get('location', { session_key, date: `>${time}` }); 
    }
    static async getIntervals(session_key) { return await this.get('intervals', { session_key }); }
    static async getRaceControl(session_key) { return await this.get('race_control', { session_key }); }
}