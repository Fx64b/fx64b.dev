import type { OscpContent } from '@/types/oscp'

/**
 * Phase: enumeration. The entry point of every box. Source: my own lab notes -
 * the full-port SYN + version scan below ran on every lab I solved.
 */
const enumeration: OscpContent = {
    nodes: [
        {
            id: 'target-acquired',
            title: 'New in-scope target',
            type: 'state',
            phase: 'enumeration',
            os: 'agnostic',
            description:
                'You have an IP and nothing else. Everything starts here. The single most common OSCP mistake is under-enumerating - scan all ports, then enumerate every service before touching an exploit.',
            commands: [
                {
                    label: 'Workspace + reachability',
                    code: `mkdir -p ~/oscp/<target>/{nmap,loot,exploits} && cd ~/oscp/<target>
ping -c 2 <target>; ip -br a`,
                },
                {
                    label: 'Host discovery on the subnet',
                    code: `sudo nmap -sn <subnet>/24 -oG ping-sweep.txt
grep Up ping-sweep.txt | cut -d ' ' -f 2`,
                },
            ],
            tags: ['start', 'recon', 'begin'],
        },
        {
            id: 'nmap-full',
            title: 'Full-port nmap scan',
            type: 'technique',
            phase: 'enumeration',
            os: 'agnostic',
            description:
                'Full TCP port sweep with service + default-script detection. -Pn because many hosts drop ping. Always -p- : services hide on odd ports (6000, 8443, 13337, 44444) that a top-1000 scan misses.',
            commands: [
                {
                    label: 'Go-to first scan (ran on every lab)',
                    code: 'sudo nmap -sS -sC -sV -Pn -p- -T4 <target>',
                },
                {
                    label: 'Targeted deep scan once ports are known',
                    code: 'sudo nmap -sC -sV -p 22,80,445 -Pn <target> -oN nmap/deep.txt',
                    note: 'Save output. -oA writes all three formats (nmap/normal/grep).',
                },
                {
                    label: 'Save all formats',
                    code: 'sudo nmap -sS -sC -sV -Pn -p- -T4 -oA nmap/full <target>',
                },
            ],
            references: [
                {
                    label: 'nmap reference',
                    url: 'https://nmap.org/book/man.html',
                },
            ],
            tags: ['nmap', 'portscan', 'scan', 'ports'],
        },
        {
            id: 'nmap-udp',
            title: 'UDP top-ports sweep',
            type: 'technique',
            phase: 'enumeration',
            os: 'agnostic',
            description:
                'When TCP is thin, sweep UDP. SNMP (161), DNS (53), TFTP (69), IKE (500) and NTP live here and often unlock the box.',
            commands: [
                {
                    label: 'Fast UDP sweep',
                    code: 'sudo nmap -sU --top-ports 50 -Pn <target>',
                    note: 'UDP infers state from ICMP-unreachable; dropped ICMP -> false "open". Verify anything interesting.',
                },
                {
                    label: 'SNMP / IKE / TFTP focused',
                    code: `sudo nmap -sU -p 53,69,123,161,162,500,1900,4500 -sV -Pn <target>
# noisy UDP (123/137/138/1900/5353/5355) is often a false open - verify`,
                },
            ],
            tags: ['udp', 'snmp', 'nmap'],
        },
        {
            id: 'open-ports',
            title: 'Open ports + services identified',
            type: 'finding',
            phase: 'enumeration',
            os: 'agnostic',
            description:
                'Scan finished. You now have a port -> service -> version map. Branch to a per-service playbook for each one; do not fixate on port 80 alone.',
            commands: [
                {
                    label: 'Extract ports from nmap',
                    code: `grep -E '^[0-9]+/tcp\\s+open' nmap/*.nmap
nmap -p $(awk -F/ '/open/{print $1}' nmap/*.nmap | paste -sd,) -sC -sV -Pn <target>`,
                },
                {
                    label: 'Quick service map',
                    code: `nmap -p- --min-rate 2000 -T4 -Pn <target> -oA nmap/full
nmap -sC -sV -p <ports> -Pn <target> -oA nmap/svc`,
                },
            ],
            tags: ['ports', 'services', 'results'],
        },
        {
            id: 'web-port-open',
            title: 'HTTP(S) port open',
            type: 'finding',
            phase: 'enumeration',
            os: 'agnostic',
            description:
                'A web port is listening (80, 443, 8080, 8000, 8443, ...). Fingerprint the stack, then start content discovery.',
            commands: [
                {
                    label: 'Fingerprint the stack',
                    code: `whatweb http://<target>:<port>
curl -sI http://<target>:<port>
nikto -h http://<target>:<port>`,
                },
                {
                    label: 'Quick content + robots',
                    code: `curl -s http://<target>:<port>/robots.txt
curl -s http://<target>:<port>/sitemap.xml
feroxbuster -u http://<target>:<port> -w /usr/share/seclists/Discovery/Web-Content/common.txt`,
                },
            ],
            tags: ['http', 'https', 'web', '80', '443', '8080'],
        },
        {
            id: 'smb-port-open',
            title: 'SMB port open (139/445)',
            type: 'finding',
            phase: 'enumeration',
            os: 'windows',
            description:
                'SMB is listening. Check the version for ms17-010, then enumerate shares/users - anonymously first.',
            commands: [
                {
                    label: 'Version + null shares',
                    code: `nmap -p139,445 --script smb-os-discovery,smb-protocols,smb-vuln-ms17-010 <target>
smbclient -L //<target>/ -N
netexec smb <target> -u '' -p '' --shares`,
                },
                {
                    label: 'Users + RID cycle',
                    code: `netexec smb <target> -u '' -p '' --users --rid-brute
enum4linux-ng -A <target>
rpcclient -U '' -N <target> -c 'srvinfo; enumdomusers'`,
                },
            ],
            tags: ['smb', '445', '139', 'windows'],
        },
        {
            id: 'service-version-known',
            title: 'Service + exact version flagged',
            type: 'finding',
            phase: 'enumeration',
            os: 'agnostic',
            description:
                '-sV returned a precise product and version. This is your cue to hunt for a public exploit before manual work.',
            commands: [
                {
                    label: 'Match version to a PoC',
                    code: `searchsploit <product> <version>
searchsploit -x <id>          # read first
searchsploit -m <id>          # copy locally`,
                },
                {
                    label: 'CVE / nmap vuln scripts',
                    code: `searchsploit --cve <cve>
nmap -sV --script vuln -p <port> <target>`,
                },
            ],
            tags: ['version', 'banner', 'cve'],
        },
    ],
    edges: [
        { from: 'target-acquired', to: 'nmap-full', label: 'always run first' },
        { from: 'nmap-full', to: 'open-ports', label: 'scan finished' },
        { from: 'nmap-full', to: 'nmap-udp', label: 'few TCP ports? sweep UDP' },
        {
            from: 'open-ports',
            to: 'web-port-open',
            label: '80/443/8080/8000/8443',
        },
        { from: 'open-ports', to: 'smb-port-open', label: '139/445 open' },
        {
            from: 'open-ports',
            to: 'service-version-known',
            label: '-sV flagged a version',
        },
        {
            from: 'service-version-known',
            to: 'public-exploit-search',
            label: 'known product + version',
        },
        {
            from: 'web-port-open',
            to: 'web-dirbust',
            label: 'HTTP reachable',
        },
        { from: 'smb-port-open', to: 'smb-enum', label: 'enumerate SMB' },
        { from: 'open-ports', to: 'ftp-enum', label: '21 open' },
        { from: 'open-ports', to: 'ssh-enum', label: '22 open' },
        { from: 'open-ports', to: 'mssql-enum', label: '1433 open' },
        { from: 'nmap-udp', to: 'snmp-enum', label: '161/udp open' },
        {
            from: 'open-ports',
            to: 'ldap-enum',
            label: '389/636 open (likely a DC)',
        },
        { from: 'open-ports', to: 'redis-enum', label: '6379 open' },
    ],
}

export default enumeration
