import type { RestConfig } from '../configs'

export class RestClients {
    public readonly config: RestConfig
    private readonly pipewaveIDPromise: Promise<string>

    constructor(config: RestConfig, pipewaveIDPromise: Promise<string>) {
        this.config = config
        this.pipewaveIDPromise = pipewaveIDPromise
    }

    async getAuthHeaders(): Promise<Record<string, string>> {
        const [token, pipewaveID] = await Promise.all([
            this.config.getAccessToken(),
            this.pipewaveIDPromise,
        ])
        return {
            'Authorization': `Bearer ${token}`,
            'X-Pipewave-ID': pipewaveID,
        }
    }

    get httpBaseUrl(): string {
        const scheme = this.config.insecure ? 'http' : 'https'
        return `${scheme}://${this.config.endpoint}`
    }

    get wsBaseUrl(): string {
        const scheme = this.config.insecure ? 'ws' : 'wss'
        return `${scheme}://${this.config.endpoint}`
    }
}
