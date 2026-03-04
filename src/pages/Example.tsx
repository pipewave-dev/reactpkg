import { useMemo, useState } from 'react'
import { PipewaveProvider } from '@/context'
import { usePipewave, type OnMessage } from '@/hooks/usePipewave'
import { PipewaveModuleConfig } from '@/context'
import type { WebsocketEventHandler } from '@/external/pipewave'

const accessToken = { value: "default" }
// --- Config placeholder ---
const config = new PipewaveModuleConfig(
    {
        backendEndpoint: 'localhost:8080/websocket',
        insecure: true,
        debugMode: true,
        getAccessToken: async () => accessToken.value,
    }
)


const eventHandler: WebsocketEventHandler = {}

// --- Message type (for example, you can change it to your own) ---
const MSG_TYPE = 'ECHO'
const ECHO_RESPONSE = 'ECHO_RESPONSE'

const decoder = new TextDecoder()
const encoder = new TextEncoder()

// --- Main component using websocket ---
function Chat() {
    const [messages, setMessages] = useState<{ id: string; text: string }[]>([])
    const [input, setInput] = useState('')

    const onMessage: OnMessage = useMemo(() => ({
        [ECHO_RESPONSE]: async (data: Uint8Array, id: string) => {
            const text = decoder.decode(data)
            setMessages(prev => [...prev, { id, text }])
        },
    }), [])

    const { status, send, resetRetryCount } = usePipewave(onMessage)

    const handleSend = () => {
        if (!input.trim()) return
        send({
            id: crypto.randomUUID(),
            msgType: MSG_TYPE,
            data: encoder.encode(input),
        })
        setInput('')
    }

    return (
        <div style={{ padding: 24, maxWidth: 480 }}>
            <h2>WebSocket Example</h2>
            <p>Status: <strong>{status}</strong></p>
            {status === 'SUSPEND' && <button onClick={resetRetryCount}>Reset attemp connect</button>}

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: 8 }}
                />
                <button onClick={handleSend} disabled={status !== 'READY'}>Send</button>
            </div>

            <div>
                <h3>Received Messages</h3>
                {messages.length === 0 && <p>No messages yet.</p>}
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {messages.map((msg, i) => (
                        <li key={i} style={{ padding: '4px 0', borderBottom: '1px solid #eee' }}>
                            <small style={{ color: '#888' }}>[{msg.id}]</small>{' '}
                            {msg.text}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

// --- Page wrapper: should wrap your app with PipewaveProvider ---
export default function ExamplePage() {
    return (
        <PipewaveProvider config={config} eventHandler={eventHandler}>
            <AccessTokenInput />
            <Chat />
        </PipewaveProvider>
    )
}

function AccessTokenInput() {
    const [inputValue, setInputValue] = useState(accessToken.value)
    const [committed, setCommitted] = useState(accessToken.value)
    const { reconnect } = usePipewave()

    const isDirty = inputValue !== committed

    const handleReconnect = () => {
        accessToken.value = inputValue
        setCommitted(inputValue)
        reconnect()
    }

    return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Access Token"
                style={{ flex: 1, padding: 8 }}
            />
            {isDirty && (
                <button onClick={handleReconnect}>Reconnect</button>
            )}
        </div>
    )
}